'use client';

import React, { useRef, useState, useEffect, useCallback, memo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Repeat,
  Upload,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Radio,
  FileAudio,
  Film,
  CheckCircle2,
  AlertTriangle,
  Headphones,
  Check,
  ShieldCheck,
  Edit3,
  Zap
} from 'lucide-react';
import { SubtitleSegment } from '../lib/initialData';
import { secondsToTimeStr } from '../lib/transcriptUtils';
import { audioManager } from '../lib/audioManager';

interface MediaPlayerProps {
  activeSegment: SubtitleSegment | null;
  totalSegmentsCount: number;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  replayNonce: number;
  onTimeUpdate: (time: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onPrevSegment: () => void;
  onNextSegment: () => void;
  onReplaySegment: (segment: SubtitleSegment) => void;
  onVerifyAndNext: (segment: SubtitleSegment) => void;
  onFlagSegment: (id: number) => void;
  onStartEditSegment: (segment: SubtitleSegment) => void;
  isLoopingSegment: boolean;
  onToggleLoopSegment: () => void;
  autoScroll: boolean;
  onToggleAutoScroll: () => void;
  isSticky: boolean;
  onToggleSticky: () => void;
  stepByStepMode: boolean;
  onToggleStepByStep: () => void;
}

const MediaPlayer = memo(function MediaPlayer({
  activeSegment,
  totalSegmentsCount,
  currentTime,
  duration,
  isPlaying,
  replayNonce,
  onTimeUpdate,
  onPlay,
  onPause,
  onSeek,
  onPrevSegment,
  onNextSegment,
  onReplaySegment,
  onVerifyAndNext,
  onFlagSegment,
  onStartEditSegment,
  isLoopingSegment,
  onToggleLoopSegment,
  autoScroll,
  onToggleAutoScroll,
  isSticky,
  onToggleSticky,
  stepByStepMode,
  onToggleStepByStep
}: MediaPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const continuousAudioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Playback mode: 'segment' (ultra-fast preloaded memory audio) vs 'continuous'
  const [engineMode, setEngineMode] = useState<'segment' | 'continuous'>('segment');
  const [customMediaSrc, setCustomMediaSrc] = useState<string | null>(null);
  const [customMediaType, setCustomMediaType] = useState<'video' | 'audio' | null>(null);
  const [mediaFileName, setMediaFileName] = useState<string>('Hızlı Cümle Modu (Ön-Yüklemeli)');

  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showSubtitleOverlay, setShowSubtitleOverlay] = useState<boolean>(true);
  const [segmentEnded, setSegmentEnded] = useState<boolean>(false);

  // Preload status state from audioManager
  const [cachedCount, setCachedCount] = useState<number>(0);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);

  // Keep latest mutable props/state in a ref so audio callbacks never become stale
  // and never cause useEffect to re-trigger playback on timeupdate/volume/speed changes!
  const latestRef = useRef({
    activeSegment,
    playbackRate,
    volume,
    isMuted,
    isLoopingSegment,
    stepByStepMode,
    onPause,
    onTimeUpdate,
    onVerifyAndNext
  });

  latestRef.current = {
    activeSegment,
    playbackRate,
    volume,
    isMuted,
    isLoopingSegment,
    stepByStepMode,
    onPause,
    onTimeUpdate,
    onVerifyAndNext
  };

  // Track which segment and replayNonce were last started to avoid duplicate play() calls
  const lastPlayedSegmentIdRef = useRef<number | null>(null);
  const lastReplayNonceRef = useRef<number>(replayNonce);
  const lastTimeEmitRef = useRef<number>(0);

  // Subscribe to RAM cache status
  useEffect(() => {
    return audioManager.subscribe((cached, _total, buffering) => {
      setCachedCount(cached);
      setIsBuffering(buffering);
    });
  }, []);

  // Stable function to play a segment via audioManager (never changes reference!)
  const playActiveSegmentAudio = useCallback((seg: SubtitleSegment) => {
    const { playbackRate: rate, volume: vol, isMuted: muted } = latestRef.current;
    setSegmentEnded(false);
    lastPlayedSegmentIdRef.current = seg.id;

    audioManager.playSegment(seg.id, {
      playbackRate: rate,
      volume: muted ? 0 : vol,
      onEnded: () => {
        const cur = latestRef.current;
        if (cur.isLoopingSegment) {
          setSegmentEnded(false);
          audioManager.replay();
        } else if (cur.stepByStepMode) {
          setSegmentEnded(true);
          cur.onPause();
          cur.onTimeUpdate(seg.endTime);
        } else {
          setSegmentEnded(true);
          cur.onVerifyAndNext(seg);
        }
      },
      onTimeUpdate: (curr) => {
        // Throttle parent timeupdate state to ~12fps (80ms) to avoid React re-render storms
        const now = performance.now();
        if (now - lastTimeEmitRef.current >= 80) {
          lastTimeEmitRef.current = now;
          latestRef.current.onTimeUpdate(seg.startTime + curr);
        }
      }
    });
  }, []);

  // Preload active segment and neighbors whenever activeSegment.id changes
  useEffect(() => {
    if (engineMode === 'segment' && activeSegment && !customMediaSrc) {
      audioManager.preloadAhead(activeSegment.id, 6);
    }
  }, [activeSegment?.id, engineMode, customMediaSrc]);

  // Handle segment transitions, play/pause state transitions, and explicit replay triggers
  useEffect(() => {
    if (engineMode !== 'segment' || !activeSegment || customMediaSrc) return;

    const replayTriggered = replayNonce !== lastReplayNonceRef.current;
    const segmentChanged = activeSegment.id !== lastPlayedSegmentIdRef.current;

    if (replayTriggered) {
      lastReplayNonceRef.current = replayNonce;
      playActiveSegmentAudio(activeSegment);
      return;
    }

    if (isPlaying) {
      if (segmentChanged || segmentEnded) {
        playActiveSegmentAudio(activeSegment);
      } else if (audioManager.getCurrentId() === activeSegment.id) {
        audioManager.resume();
      } else {
        playActiveSegmentAudio(activeSegment);
      }
    } else {
      audioManager.pause();
    }
  }, [activeSegment, engineMode, customMediaSrc, isPlaying, replayNonce, segmentEnded, playActiveSegmentAudio]);

  // Reset segmentEnded when switching to a different segment while paused
  useEffect(() => {
    setSegmentEnded(false);
  }, [activeSegment?.id]);

  // Optimized Canvas visualizer animation:
  // - Only runs 60fps loop when actively playing; draws 1 static frame and sleeps when paused!
  // - Reuses single gradient per frame instead of allocating 48 gradients per frame.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number | null = null;
    let phase = 0;
    const activelyAnimating = isPlaying && !segmentEnded;

    const drawFrame = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const bars = 48;
      const barWidth = width / bars - 2;
      const isDanisman = activeSegment?.speaker === 'Danışman';

      let fillStyle: string | CanvasGradient = 'rgba(100, 116, 139, 0.35)';
      if (activelyAnimating) {
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        if (isDanisman) {
          gradient.addColorStop(0, '#38bdf8');
          gradient.addColorStop(1, '#0284c7');
        } else {
          gradient.addColorStop(0, '#34d399');
          gradient.addColorStop(1, '#059669');
        }
        fillStyle = gradient;
      }
      ctx.fillStyle = fillStyle;

      for (let i = 0; i < bars; i++) {
        let barHeight = 8;
        if (activelyAnimating) {
          const factor = Math.sin(phase + i * 0.25) * 0.5 + 0.5;
          barHeight = Math.max(6, factor * (height * 0.75));
        }

        const x = i * (barWidth + 2);
        const y = (height - barHeight) / 2;

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 3);
        ctx.fill();
      }

      if (activelyAnimating) {
        phase += 0.12 * playbackRate;
        animationFrameId = requestAnimationFrame(drawFrame);
      }
    };

    drawFrame();

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying, playbackRate, activeSegment?.speaker, segmentEnded]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setCustomMediaSrc(url);
      setMediaFileName(file.name);

      const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi)$/i.test(file.name);
      setCustomMediaType(isVideo ? 'video' : 'audio');
      setEngineMode('continuous');
      handleSeek(0);
      handlePlay();
    }
  };

  const handlePlay = useCallback(() => {
    if (customMediaType === 'video' && videoRef.current) {
      videoRef.current.play().catch(() => {});
    } else if (engineMode === 'continuous' && continuousAudioRef.current) {
      continuousAudioRef.current.play().catch(() => {});
    } else if (engineMode === 'segment' && activeSegment) {
      if (segmentEnded || audioManager.getCurrentId() !== activeSegment.id) {
        playActiveSegmentAudio(activeSegment);
      } else {
        audioManager.resume();
      }
    }
    onPlay();
  }, [customMediaType, engineMode, activeSegment, segmentEnded, playActiveSegmentAudio, onPlay]);

  const handlePause = useCallback(() => {
    if (customMediaType === 'video' && videoRef.current) {
      videoRef.current.pause();
    } else if (engineMode === 'continuous' && continuousAudioRef.current) {
      continuousAudioRef.current.pause();
    } else if (engineMode === 'segment') {
      audioManager.pause();
    }
    onPause();
  }, [customMediaType, engineMode, onPause]);

  const handlePlayPause = () => {
    if (isPlaying && !segmentEnded) {
      handlePause();
    } else {
      handlePlay();
    }
  };

  const handleSeek = (time: number) => {
    const clamped = Math.max(0, Math.min(time, duration));
    onSeek(clamped);
    if (engineMode === 'continuous') {
      if (customMediaType === 'video' && videoRef.current) {
        videoRef.current.currentTime = clamped;
      } else if (continuousAudioRef.current) {
        continuousAudioRef.current.currentTime = clamped;
      }
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    audioManager.setPlaybackRate(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
    if (continuousAudioRef.current) continuousAudioRef.current.playbackRate = rate;
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    setIsMuted(newVol === 0);
    audioManager.setVolume(newVol);
    if (videoRef.current) videoRef.current.volume = newVol;
    if (continuousAudioRef.current) continuousAudioRef.current.volume = newVol;
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    const targetVol = next ? 0 : (volume || 1);
    audioManager.setVolume(targetVol);
    if (videoRef.current) videoRef.current.volume = targetVol;
    if (continuousAudioRef.current) continuousAudioRef.current.volume = targetVol;
  };

  // Instant zero-latency replay
  const handleInstantReplay = () => {
    if (engineMode === 'segment' && activeSegment) {
      playActiveSegmentAudio(activeSegment);
      onPlay();
    } else if (activeSegment) {
      onReplaySegment(activeSegment);
    }
  };

  const maxDuration = duration > 0 ? duration : 2583;
  const progressRatio = Math.min(1, Math.max(0, currentTime / maxDuration));
  const nextSegmentId = activeSegment ? Math.min(totalSegmentsCount, activeSegment.id + 1) : null;
  const isNextReady = nextSegmentId ? audioManager.isPreloaded(nextSegmentId) : false;

  return (
    <div
      className={`transition-all duration-300 ${
        isSticky
          ? 'sticky top-[68px] z-30 shadow-2xl ring-1 ring-blue-500/30'
          : 'relative'
      } rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl space-y-0`}
    >
      {/* Hidden File Input for uploading custom video/audio */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="video/*,audio/*,.mp4,.mov,.mkv,.webm,.mp3,.wav,.m4a"
        className="hidden"
      />

      {/* Screen Area (Video or Audio Visualizer) */}
      <div className="relative aspect-video sm:aspect-[21/9] lg:aspect-[16/7] w-full bg-slate-950 flex flex-col items-center justify-center overflow-hidden group">
        
        {/* Real Video Mode */}
        {customMediaType === 'video' && customMediaSrc && (
          <video
            ref={videoRef}
            src={customMediaSrc}
            onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
            onPlay={onPlay}
            onPause={onPause}
            className="w-full h-full object-contain"
            playsInline
          />
        )}

        {/* Audio Mode */}
        {customMediaType !== 'video' && (
          <div className="relative w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-900/60 via-slate-950 to-slate-900">
            
            {/* Fallback Continuous Audio Element */}
            {engineMode === 'continuous' && (
              <audio
                ref={continuousAudioRef}
                src={customMediaSrc || '/audio/gorusme.mp3'}
                onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
                onPlay={onPlay}
                onPause={onPause}
                preload="auto"
                className="hidden"
              />
            )}

            {/* Ambient Background Glow */}
            <div className={`absolute inset-0 opacity-20 blur-3xl transition-colors duration-700 pointer-events-none ${
              activeSegment?.speaker === 'Danışman' ? 'bg-sky-500' : 'bg-emerald-500'
            }`} />

            {/* Waveform Canvas */}
            <div className="w-full max-w-lg h-24 relative flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={500}
                height={90}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Speaker Tag & Preload Badge */}
            {activeSegment && (
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full border shadow-sm ${
                    activeSegment.speaker === 'Danışman'
                      ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                      : activeSegment.speaker === 'Danışan'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {activeSegment.speaker} ({activeSegment.startStr} - {activeSegment.endStr})
                </span>

                {engineMode === 'segment' && nextSegmentId && (
                  <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shadow-sm">
                    <Zap className="w-3 h-3 text-emerald-400" />
                    {isBuffering
                      ? 'Ses Hazırlanıyor...'
                      : isNextReady
                      ? `Sonraki Cümle (#${nextSegmentId}) RAM'de Hazır`
                      : `RAM Ön-Bellek: ${cachedCount}/${totalSegmentsCount}`}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Subtitle Overlay on Video / Visualizer */}
        {showSubtitleOverlay && activeSegment && (
          <div className="absolute bottom-4 left-4 right-4 text-center pointer-events-none z-10">
            <div className="inline-block max-w-3xl px-4 py-2 rounded-xl bg-black/85 backdrop-blur-md border border-white/10 text-white text-sm sm:text-base font-medium leading-relaxed shadow-2xl">
              <span
                className={`font-semibold mr-2 ${
                  activeSegment.speaker === 'Danışman'
                    ? 'text-sky-400'
                    : activeSegment.speaker === 'Danışan'
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {activeSegment.speaker !== 'Not / Efekt' && `${activeSegment.speaker}:`}
              </span>
              <span>{activeSegment.text}</span>
            </div>
          </div>
        )}

        {/* Top Floating Controls on Player */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between opacity-90 group-hover:opacity-100 transition-opacity z-20">
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/90 backdrop-blur-sm border border-white/15 text-slate-200 hover:text-white text-xs font-medium transition flex items-center gap-1.5 shadow"
              title="Farklı video/ses yüklemek için tıklayın"
            >
              {customMediaType === 'video' ? <Film className="w-3.5 h-3.5 text-blue-400" /> : <FileAudio className="w-3.5 h-3.5 text-emerald-400" />}
              <span className="truncate max-w-[180px] sm:max-w-xs">{mediaFileName}</span>
              <Upload className="w-3 h-3 ml-1 text-slate-400" />
            </button>

            {/* Switch between ultra-fast segment preloading and continuous full recording */}
            {!customMediaSrc && (
              <button
                onClick={() => setEngineMode(engineMode === 'segment' ? 'continuous' : 'segment')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border backdrop-blur-sm transition flex items-center gap-1 ${
                  engineMode === 'segment'
                    ? 'bg-emerald-600/30 border-emerald-500/50 text-emerald-300'
                    : 'bg-black/60 border-white/15 text-slate-400'
                }`}
                title="Hızlı Cümle Bazlı Ön-Yükleme Modu"
              >
                <Zap className="w-3 h-3" />
                <span className="hidden sm:inline">{engineMode === 'segment' ? 'Hızlı Mod (Aktif)' : 'Tam Kayıt Modu'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSubtitleOverlay(!showSubtitleOverlay)}
              title="Alt Yazı Katmanını Aç/Kapat"
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border backdrop-blur-sm transition ${
                showSubtitleOverlay
                  ? 'bg-blue-600/40 border-blue-500/50 text-blue-200'
                  : 'bg-black/60 border-white/15 text-slate-400'
              }`}
            >
              CC
            </button>
            <button
              onClick={onToggleSticky}
              title={isSticky ? 'Sabit Moddan Çık' : 'Oynatıcıyı Üste Sabitle'}
              className={`p-1.5 rounded-lg text-xs font-medium border backdrop-blur-sm transition ${
                isSticky
                  ? 'bg-blue-600/40 border-blue-500/50 text-blue-200'
                  : 'bg-black/60 border-white/15 text-slate-400 hover:text-white'
              }`}
            >
              {isSticky ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

      </div>

      {/* Scrubber Progress Bar */}
      <div className="px-4 pt-3 pb-1 bg-slate-900 border-t border-slate-800/80">
        <div className="relative group/scrubber cursor-pointer">
          <input
            type="range"
            min={0}
            max={maxDuration}
            step={0.1}
            value={currentTime}
            onChange={(e) => handleSeek(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 group-hover/scrubber:h-2.5 rounded-lg appearance-none cursor-pointer accent-blue-500 transition-all"
          />
          <div
            className="absolute left-0 top-0 h-1.5 group-hover/scrubber:h-2.5 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-lg pointer-events-none transition-all"
            style={{ width: `${progressRatio * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mt-1">
          <span>{secondsToTimeStr(currentTime)}</span>
          {activeSegment && (
            <span className="text-blue-400 font-medium">
              Cümle #{activeSegment.id} / {totalSegmentsCount}
            </span>
          )}
          <span className="text-slate-500">{secondsToTimeStr(maxDuration)}</span>
        </div>
      </div>

      {/* Main Playback Control Bar */}
      <div className="p-4 bg-slate-900/95 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800">
        
        {/* Left: Playback Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={onPrevSegment}
            title="Önceki Cümleye Git (Yukarı Ok)"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleSeek(currentTime - 5)}
            title="5 Saniye Geri (Sol Ok)"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Main Play/Pause */}
          <button
            onClick={handlePlayPause}
            title="Oynat / Duraklat (Boşluk Tuşu)"
            className="w-11 h-11 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 transition transform active:scale-95"
          >
            {isPlaying && !segmentEnded ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>

          <button
            onClick={() => handleSeek(currentTime + 5)}
            title="5 Saniye İleri (Sağ Ok)"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            onClick={onNextSegment}
            title="Sonraki Cümleye Git (Aşağı Ok)"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* INSTANT REPLAY BUTTON (Tekrar Dinle) */}
          <button
            onClick={handleInstantReplay}
            title="Bu Cümleyi Baştan Tekrar Dinle (Kısayol: R)"
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5 active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Tekrar Dinle</span>
          </button>

          <button
            onClick={onToggleLoopSegment}
            title="Aktif Cümleyi Sürekli Tekrarla (Kısayol: L)"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
              isLoopingSegment
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-sm shadow-blue-500/20 animate-pulse'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Döngüle</span>
          </button>
        </div>

        {/* Center: Playback Speed Chips */}
        <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
          {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
            <button
              key={rate}
              onClick={() => handleSpeedChange(rate)}
              className={`px-2 py-1 rounded-md text-xs font-medium transition ${
                playbackRate === rate
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>

        {/* Right: Mode Toggles & Volume */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleStepByStep}
            title="Cümle Bittiğinde Dur ve Onay Bekle Modu"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
              stepByStepMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Adım Adım</span>
          </button>

          <button
            onClick={onToggleAutoScroll}
            title="Listeyi Otomatik Takip Et"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 ${
              autoScroll
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${autoScroll ? 'text-emerald-400' : ''}`} />
            <span className="hidden md:inline">Oto-Kaydır</span>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleMute}
              className="p-1.5 text-slate-400 hover:text-white transition"
              title="Sesi Aç/Kapat"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>

      </div>

      {/* DEDICATED GUIDED REVIEW & REPLAY PANEL */}
      {activeSegment && (
        <div className={`p-4 border-t transition-all ${
          segmentEnded
            ? 'bg-blue-950/75 border-blue-500/70 shadow-inner'
            : 'bg-slate-950/80 border-slate-800'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2">
              <Headphones className={`w-4 h-4 ${segmentEnded ? 'text-blue-400 animate-bounce' : 'text-slate-400'}`} />
              <span className="text-xs font-bold tracking-wide uppercase text-slate-300">
                {segmentEnded ? (
                  <span className="text-blue-300">Cümle Tamamlandı — Onaylanmadan Yeni Yere Geçilmez</span>
                ) : (
                  <span>İncelenen Cümle #{activeSegment.id} / {totalSegmentsCount}</span>
                )}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-xs font-mono">
              {engineMode === 'segment' && nextSegmentId && (
                <span className="text-emerald-400 font-sans font-medium flex items-center gap-1 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-500/30">
                  <Zap className="w-3 h-3" /> Sonraki ses hazır
                </span>
              )}
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                {activeSegment.startStr} - {activeSegment.endStr}
              </span>
            </div>
          </div>

          {/* Sentence Content Box */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 mb-3">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  activeSegment.speaker === 'Danışman'
                    ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                    : activeSegment.speaker === 'Danışan'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}
              >
                {activeSegment.speaker}
              </span>
              {activeSegment.status === 'verified' && (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Onaylandı
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-slate-100 leading-relaxed">
              {activeSegment.text}
            </p>
          </div>

          {/* Action Buttons: TEKRAR DİNLE, ONAYLA & İLERLE, METNİ DÜZELT */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleInstantReplay}
              className="flex-1 min-w-[130px] px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition transform active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Tekrar Dinle</span>
            </button>

            <button
              onClick={() => onVerifyAndNext(activeSegment)}
              className="flex-1 min-w-[150px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition transform active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Onayla & Sonrakine Geç</span>
            </button>

            <button
              onClick={() => onStartEditSegment(activeSegment)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-400" />
              <span>Metni Düzelt</span>
            </button>

            <button
              onClick={() => onFlagSegment(activeSegment.id)}
              className="px-3 py-2.5 rounded-xl bg-amber-950/40 hover:bg-amber-600 hover:text-white text-amber-300 border border-amber-500/30 text-xs font-medium transition flex items-center gap-1.5"
              title="Şüpheli olarak işaretle"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Şüpheli</span>
            </button>
          </div>
        </div>
      )}

      {/* Preloaded Segments status footer banner */}
      <div className="px-4 py-2 bg-emerald-950/30 border-t border-emerald-900/30 flex items-center justify-between text-xs text-emerald-300">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            Hızlı Cümle Modu Aktif: Sesler RAM önbellekten ({cachedCount}/{totalSegmentsCount} hazır) 0ms gecikmeyle çalar.
          </span>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
        >
          Farklı Dosya Seç
        </button>
      </div>

    </div>
  );
});

export default MediaPlayer;
