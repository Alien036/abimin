/**
 * Ultra-Fast Zero-Latency Audio Engine for Subtitle Verification
 *
 * Architecture:
 * 1. RAM Blob Cache (all 189 segments fetched into memory via priority queue, ~20MB total)
 *    - Eliminates network latency & disk stalls completely once buffered.
 * 2. Bounded Hot HTMLAudioElement Pool (LRU of max 16 pre-decoded media elements)
 *    - Prevents Chromium's ~32-64 WebMediaPlayer hardware decoder limit (which caused
 *      "ses bazen geç açılıyor" after verifying/jumping across many segments).
 *    - Explicitly calls `audio.load()` with `preload = 'auto'` before setting `src`.
 * 3. OS Audio Driver Keep-Alive (Web Audio API silent channel)
 *    - Prevents Windows/macOS audio hardware from entering power-saving sleep during
 *      step-by-step review pauses (eliminates 200-500ms driver wake-up lag).
 * 4. Race-condition-free playback token (`playRequestId`)
 *    - Ensures rapid next/prev/replay clicks never overlap or abort the wrong stream.
 */

const TOTAL_SEGMENTS = 189;
const MAX_AUDIO_POOL_SIZE = 16;
const MAX_CONCURRENT_FETCHES = 4;

type StatusListener = (cachedCount: number, totalCount: number, isBufferingCurrent: boolean) => void;

class AudioPreloadManager {
  // In-memory Blob URLs for all segments (no WebMediaPlayer limit!)
  private blobUrlCache = new Map<number, string>();
  private inFlightFetches = new Map<number, Promise<string | null>>();

  // Bounded LRU pool of active, pre-decoded HTMLAudioElements
  private audioPool = new Map<number, HTMLAudioElement>();

  // Priority fetch queue for background & lookahead preloading
  private priorityQueue: number[] = [];
  private activeFetchCount = 0;
  private warmupStarted = false;

  // Current playback state
  private currentAudio: HTMLAudioElement | null = null;
  private currentId: number | null = null;
  private playRequestId = 0;
  private isBufferingCurrent = false;

  // Persisted audio settings
  private playbackRate = 1.0;
  private volume = 1.0;

  // Web Audio API Keep-Alive to prevent OS audio driver sleep lag
  private audioCtx: AudioContext | null = null;
  private keepAliveInitialized = false;

  // Status listeners for UI feedback
  private listeners = new Set<StatusListener>();

  constructor() {
    if (typeof window !== 'undefined') {
      this.setupInteractionUnlock();
    }
  }

  /**
   * Unlocks and keeps the OS audio output pipeline warm on first user interaction.
   */
  private setupInteractionUnlock() {
    const unlock = () => {
      this.ensureAudioDriverAwake();
      this.startBackgroundWarmup(1);
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    };

    window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
    window.addEventListener('keydown', unlock, { capture: true, passive: true });

    // Start preloading the first window immediately after load
    if (document.readyState === 'complete') {
      setTimeout(() => this.startBackgroundWarmup(1), 100);
    } else {
      window.addEventListener('load', () => {
        setTimeout(() => this.startBackgroundWarmup(1), 100);
      }, { once: true });
    }
  }

  /**
   * Keeps the OS audio mixer awake with an inaudible sub-threshold signal
   * so pausing for 10+ seconds to edit text never incurs a 300ms hardware wake delay.
   */
  private ensureAudioDriverAwake() {
    if (typeof window === 'undefined') return;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass({ latencyHint: 'interactive' });
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      if (this.audioCtx && !this.keepAliveInitialized && this.audioCtx.state === 'running') {
        this.keepAliveInitialized = true;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        // Virtually zero gain (-100dB) keeps hardware stream open with complete silence
        gain.gain.value = 0.00001;
        osc.frequency.value = 1;
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
      }
    } catch {
      // Ignore Web Audio API restrictions
    }
  }

  private getSegmentUrl(id: number): string {
    return `/audio/segments/${id}.mp3`;
  }

  /**
   * Subscribe to preload cache progress & buffering status.
   */
  subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    listener(this.blobUrlCache.size, TOTAL_SEGMENTS, this.isBufferingCurrent);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const count = this.blobUrlCache.size;
    this.listeners.forEach((fn) => fn(count, TOTAL_SEGMENTS, this.isBufferingCurrent));
  }

  private setBufferingState(buffering: boolean) {
    if (this.isBufferingCurrent !== buffering) {
      this.isBufferingCurrent = buffering;
      this.notifyListeners();
    }
  }

  /**
   * Fetch a segment into RAM as a Blob URL so subsequent playback has 0ms network overhead.
   */
  private fetchSegmentBlob(id: number): Promise<string | null> {
    if (id < 1 || id > TOTAL_SEGMENTS || typeof window === 'undefined') {
      return Promise.resolve(null);
    }
    if (this.blobUrlCache.has(id)) {
      return Promise.resolve(this.blobUrlCache.get(id)!);
    }
    if (this.inFlightFetches.has(id)) {
      return this.inFlightFetches.get(id)!;
    }

    const promise = fetch(this.getSegmentUrl(id), {
      priority: 'high' as RequestPriority,
      cache: 'force-cache'
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        this.blobUrlCache.set(id, blobUrl);
        this.inFlightFetches.delete(id);

        // If an HTMLAudioElement in the pool is idle and still pointing to network URL, upgrade it to RAM blobUrl
        const existingAudio = this.audioPool.get(id);
        if (existingAudio && this.currentId !== id && existingAudio.paused && !existingAudio.src.startsWith('blob:')) {
          existingAudio.src = blobUrl;
          existingAudio.load();
        }

        this.notifyListeners();
        return blobUrl;
      })
      .catch(() => {
        this.inFlightFetches.delete(id);
        return null;
      });

    this.inFlightFetches.set(id, promise);
    return promise;
  }

  /**
   * Enqueue segment IDs for RAM pre-fetching, prioritizing the front of the queue.
   */
  private enqueueFetch(ids: number[], highPriority = false) {
    for (let i = ids.length - 1; i >= 0; i--) {
      const id = ids[i];
      if (id < 1 || id > TOTAL_SEGMENTS) continue;
      if (this.blobUrlCache.has(id) || this.inFlightFetches.has(id)) continue;

      const existingIdx = this.priorityQueue.indexOf(id);
      if (existingIdx !== -1) {
        if (highPriority) {
          this.priorityQueue.splice(existingIdx, 1);
          this.priorityQueue.unshift(id);
        }
      } else if (highPriority) {
        this.priorityQueue.unshift(id);
      } else {
        this.priorityQueue.push(id);
      }
    }
    this.drainFetchQueue();
  }

  private drainFetchQueue() {
    while (this.activeFetchCount < MAX_CONCURRENT_FETCHES && this.priorityQueue.length > 0) {
      const nextId = this.priorityQueue.shift()!;
      if (this.blobUrlCache.has(nextId) || this.inFlightFetches.has(nextId)) {
        continue;
      }
      this.activeFetchCount++;
      this.fetchSegmentBlob(nextId).finally(() => {
        this.activeFetchCount--;
        this.drainFetchQueue();
      });
    }
  }

  /**
   * Starts progressive background warm-up of all 189 segments starting from `startId`.
   */
  startBackgroundWarmup(startId = 1) {
    if (typeof window === 'undefined') return;
    // Immediately warm up the active window with high priority
    this.preloadAhead(startId, 8);

    if (this.warmupStarted) return;
    this.warmupStarted = true;

    const allIds: number[] = [];
    for (let i = startId; i <= TOTAL_SEGMENTS; i++) allIds.push(i);
    for (let i = 1; i < startId; i++) allIds.push(i);
    this.enqueueFetch(allIds, false);
  }

  /**
   * Evicts oldest unused HTMLAudioElement decoders when the pool exceeds MAX_AUDIO_POOL_SIZE
   * so the browser never hits the hardware WebMediaPlayer limit.
   */
  private pruneAudioPool(protectedId: number) {
    if (this.audioPool.size <= MAX_AUDIO_POOL_SIZE) return;

    for (const [id, audio] of this.audioPool.entries()) {
      if (this.audioPool.size <= MAX_AUDIO_POOL_SIZE) break;
      // Do not evict currently playing or immediate neighbor segments
      if (id === this.currentId || id === protectedId || Math.abs(id - protectedId) <= 3) {
        continue;
      }
      this.destroyAudioElement(audio);
      this.audioPool.delete(id);
    }
  }

  private destroyAudioElement(audio: HTMLAudioElement) {
    try {
      audio.onended = null;
      audio.ontimeupdate = null;
      audio.oncanplay = null;
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute('src');
      audio.load(); // Forces Blink/WebKit to release the underlying WebMediaPlayer decoder immediately
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Preload a specific segment into a hot, pre-decoded HTMLAudioElement in the bounded pool.
   */
  preload(id: number): HTMLAudioElement | null {
    if (id < 1 || id > TOTAL_SEGMENTS || typeof window === 'undefined') return null;

    // Refresh LRU order if already in pool
    if (this.audioPool.has(id)) {
      const existing = this.audioPool.get(id)!;
      this.audioPool.delete(id);
      this.audioPool.set(id, existing);

      // If blobUrl became available while idle, ensure element uses it
      const blobUrl = this.blobUrlCache.get(id);
      if (blobUrl && this.currentId !== id && existing.paused && !existing.src.startsWith('blob:')) {
        existing.src = blobUrl;
        existing.load();
      }
      return existing;
    }

    this.pruneAudioPool(id);

    const audio = new Audio();
    // Set preload BEFORE src and explicitly call load() so browsers buffer & decode immediately
    audio.preload = 'auto';
    audio.preservesPitch = true;
    audio.playbackRate = this.playbackRate;
    audio.volume = this.volume;

    const blobUrl = this.blobUrlCache.get(id);
    audio.src = blobUrl || this.getSegmentUrl(id);
    audio.load();

    this.audioPool.set(id, audio);

    // Ensure its Blob is also fetched into RAM with high priority
    if (!blobUrl) {
      this.enqueueFetch([id], true);
    }

    return audio;
  }

  /**
   * Preload bidirectional window around `currentId`:
   * - Decodes immediate neighbors into hot HTMLAudioElement pool
   * - Prioritizes upcoming N segments in the RAM Blob fetch queue
   */
  preloadAhead(currentId: number, count = 6) {
    if (typeof window === 'undefined') return;

    const highPriorityIds: number[] = [currentId];
    for (let i = 1; i <= count; i++) {
      if (currentId + i <= TOTAL_SEGMENTS) highPriorityIds.push(currentId + i);
    }
    if (currentId - 1 >= 1) highPriorityIds.push(currentId - 1);
    if (currentId - 2 >= 1) highPriorityIds.push(currentId - 2);

    // Put all in high-priority RAM fetch queue
    this.enqueueFetch(highPriorityIds, true);

    // Keep the closest segments decoded in the HTMLAudioElement pool
    const hotDecoderIds = [
      currentId,
      currentId + 1,
      currentId + 2,
      currentId + 3,
      currentId - 1
    ];
    for (const id of hotDecoderIds) {
      if (id >= 1 && id <= TOTAL_SEGMENTS) {
        this.preload(id);
      }
    }
  }

  /**
   * Called on mouse hover over a transcript row to pre-decode before the user clicks.
   */
  preloadHover(id: number) {
    if (id < 1 || id > TOTAL_SEGMENTS) return;
    this.preload(id);
    if (id + 1 <= TOTAL_SEGMENTS) {
      this.enqueueFetch([id, id + 1], true);
    }
  }

  /**
   * Play a segment with zero latency and race-condition protection.
   */
  playSegment(
    id: number,
    options?: {
      onEnded?: () => void;
      onTimeUpdate?: (currentTime: number, duration: number) => void;
      playbackRate?: number;
      volume?: number;
    }
  ): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;

    this.ensureAudioDriverAwake();
    const requestId = ++this.playRequestId;

    // Detach and stop previous audio if different or already playing
    if (this.currentAudio) {
      this.currentAudio.onended = null;
      this.currentAudio.ontimeupdate = null;
      this.currentAudio.oncanplay = null;
      this.currentAudio.pause();
      if (this.currentId !== id) {
        try {
          this.currentAudio.currentTime = 0;
        } catch {
          // Ignore if metadata not loaded yet
        }
      }
    }

    if (options?.playbackRate !== undefined) {
      this.playbackRate = options.playbackRate;
    }
    if (options?.volume !== undefined) {
      this.volume = options.volume;
    }

    const audio = this.preload(id);
    if (!audio) return null;

    this.currentAudio = audio;
    this.currentId = id;

    audio.playbackRate = this.playbackRate;
    audio.volume = this.volume;

    if (options?.onEnded) {
      const onEndedCallback = options.onEnded;
      audio.onended = () => {
        if (this.playRequestId === requestId) {
          onEndedCallback();
        }
      };
    }

    if (options?.onTimeUpdate) {
      const onTimeUpdateCallback = options.onTimeUpdate;
      audio.ontimeupdate = () => {
        if (this.playRequestId === requestId) {
          onTimeUpdateCallback(audio.currentTime, audio.duration || 1);
        }
      };
    }

    const startPlayback = () => {
      if (this.playRequestId !== requestId) return;
      this.setBufferingState(false);

      try {
        if (audio.currentTime !== 0) {
          audio.currentTime = 0;
        }
      } catch {
        // Ignore if not seekable yet
      }

      audio.playbackRate = this.playbackRate;
      audio.volume = this.volume;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (this.playRequestId !== requestId) return;
          // If play failed because buffer wasn't ready yet, wait for canplay
          if (err.name === 'AbortError' && audio.readyState < 2) {
            this.setBufferingState(true);
            audio.oncanplay = () => {
              audio.oncanplay = null;
              if (this.playRequestId === requestId) {
                this.setBufferingState(false);
                audio.play().catch(() => {});
              }
            };
          }
        });
      }
    };

    // If audio data is already decoded in memory (HAVE_CURRENT_DATA = 2 or higher), play immediately!
    if (audio.readyState >= 2) {
      startPlayback();
    } else {
      this.setBufferingState(true);
      audio.oncanplay = () => {
        audio.oncanplay = null;
        startPlayback();
      };
      // Also attempt immediate play in case browser resolves it synchronously while streaming
      audio.play().then(() => {
        if (this.playRequestId === requestId) {
          audio.oncanplay = null;
          this.setBufferingState(false);
        }
      }).catch(() => {
        // Handled by oncanplay above
      });
    }

    // Preload surrounding window in background
    this.preloadAhead(id, 6);

    return audio;
  }

  /**
   * Instant Replay of the currently loaded segment without re-fetching.
   */
  replay(): boolean {
    this.ensureAudioDriverAwake();
    if (this.currentAudio) {
      try {
        this.currentAudio.currentTime = 0;
      } catch {}
      this.currentAudio.playbackRate = this.playbackRate;
      this.currentAudio.volume = this.volume;
      this.currentAudio.play().catch(() => {});
      return true;
    }
    return false;
  }

  pause() {
    this.playRequestId++; // Cancel any pending async play
    this.setBufferingState(false);
    if (this.currentAudio) {
      this.currentAudio.oncanplay = null;
      this.currentAudio.pause();
    }
  }

  resume() {
    this.ensureAudioDriverAwake();
    if (this.currentAudio) {
      this.currentAudio.playbackRate = this.playbackRate;
      this.currentAudio.volume = this.volume;
      this.currentAudio.play().catch(() => {});
    }
  }

  setPlaybackRate(rate: number) {
    this.playbackRate = rate;
    if (this.currentAudio) {
      this.currentAudio.playbackRate = rate;
    }
    this.audioPool.forEach((audio) => {
      audio.playbackRate = rate;
    });
  }

  setVolume(vol: number) {
    this.volume = vol;
    if (this.currentAudio) {
      this.currentAudio.volume = vol;
    }
    this.audioPool.forEach((audio) => {
      audio.volume = vol;
    });
  }

  getCurrentId(): number | null {
    return this.currentId;
  }

  isPreloaded(id: number): boolean {
    return this.blobUrlCache.has(id) || (this.audioPool.get(id)?.readyState ?? 0) >= 2;
  }

  getCachedCount(): number {
    return this.blobUrlCache.size;
  }
}

// Export singleton instance
export const audioManager = new AudioPreloadManager();
