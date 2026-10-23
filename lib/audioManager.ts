/**
 * Ultra-Fast Preloading Audio Manager for Subtitle Verification
 * Keeps current and upcoming segments pre-buffered in browser memory.
 */

class AudioPreloadManager {
  private cache = new Map<number, HTMLAudioElement>();
  private currentAudio: HTMLAudioElement | null = null;
  private currentId: number | null = null;

  /**
   * Preload a specific segment audio file into memory.
   */
  preload(id: number): HTMLAudioElement | null {
    if (id < 1 || id > 189) return null;
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }
    if (typeof window === 'undefined') return null;

    const audio = new Audio(`/audio/segments/${id}.mp3`);
    audio.preload = 'auto';
    this.cache.set(id, audio);
    return audio;
  }

  /**
   * Preload upcoming N segments in background.
   */
  preloadAhead(currentId: number, count = 4) {
    for (let i = 1; i <= count; i++) {
      const nextId = currentId + i;
      this.preload(nextId);
    }
  }

  /**
   * Play a segment instantly with zero latency.
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

    // Stop and detach previous audio listeners
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio.onended = null;
      this.currentAudio.ontimeupdate = null;
    }

    const audio = this.preload(id);
    if (!audio) return null;

    this.currentAudio = audio;
    this.currentId = id;

    if (options?.playbackRate) {
      audio.playbackRate = options.playbackRate;
    }
    if (options?.volume !== undefined) {
      audio.volume = options.volume;
    }

    if (options?.onEnded) {
      audio.onended = () => options.onEnded!();
    }

    if (options?.onTimeUpdate) {
      audio.ontimeupdate = () => {
        options.onTimeUpdate!(audio.currentTime, audio.duration || 1);
      };
    }

    audio.currentTime = 0;
    audio.play().catch((err) => {
      console.warn('Audio play request interrupted or prevented:', err);
    });

    // Automatically buffer the next 4 segments in parallel
    this.preloadAhead(id, 4);

    return audio;
  }

  /**
   * Instant Replay without reloading
   */
  replay(): boolean {
    if (this.currentAudio) {
      this.currentAudio.currentTime = 0;
      this.currentAudio.play().catch(() => {});
      return true;
    }
    return false;
  }

  pause() {
    if (this.currentAudio) {
      this.currentAudio.pause();
    }
  }

  resume() {
    if (this.currentAudio) {
      this.currentAudio.play().catch(() => {});
    }
  }

  setPlaybackRate(rate: number) {
    if (this.currentAudio) {
      this.currentAudio.playbackRate = rate;
    }
    // Also apply to cached items
    this.cache.forEach((audio) => {
      audio.playbackRate = rate;
    });
  }

  setVolume(vol: number) {
    if (this.currentAudio) {
      this.currentAudio.volume = vol;
    }
    this.cache.forEach((audio) => {
      audio.volume = vol;
    });
  }

  getCurrentId(): number | null {
    return this.currentId;
  }

  isPreloaded(id: number): boolean {
    return this.cache.has(id);
  }
}

// Export singleton instance
export const audioManager = new AudioPreloadManager();
