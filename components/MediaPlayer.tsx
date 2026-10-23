'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Repeat,
  Upload,
  Sparkles,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Radio,
  FileAudio,
  Film
} from 'lucide-react';
import { SubtitleSegment } from '../lib/initialData';
import { secondsToTimeStr } from '../lib/transcriptUtils';

interface MediaPlayerProps {
  activeSegment: SubtitleSegment | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onPrevSegment: () => void;
  onNextSegment: () => void;
  isLoopingSegment: boolean;
  onToggleLoopSegment: () => void;
  autoScroll: boolean;
  onToggleAutoScroll: () => void;
  isSticky: boolean;
  onToggleSticky: () => void;
}

export default function MediaPlayer({
  activeSegment,
  currentTime,
  duration,
  isPlaying,
  onTimeUpdate,
  onPlay,
  onPause,
  onSeek,
  onPrevSegment,
  onNextSegment,
  isLoopingSegment,
  onToggleLoopSegment,
  autoScroll,
  onToggleAutoScroll,
  isSticky,
  onToggleSticky
}: MediaPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [mediaSrc, setMediaSrc] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'video' | 'audio' | 'simulated'>('simulated');
  const [mediaFileName, setMediaFileName] = useState<string>('Simüle Edilmiş Test Oynatıcısı (Ses/Video Bekleniyor)');
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showSubtitleOverlay, setShowSubtitleOverlay] = useState<boolean>(true);

  // Fallback simulation timer if no media file loaded
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (mediaType === 'simulated' && isPlaying) {
      interval = setInterval(() => {
        onTimeUpdate(currentTime + 0.25 * playbackRate);
      }, 250);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [mediaType, isPlaying, currentTime, playbackRate, onTimeUpdate]);

  // Audio Visualizer effect for audio or simulated mode
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const bars = 48;
      const barWidth = width / bars - 2;

      for (let i = 0; i < bars; i++) {
        let barHeight = 8;
        if (isPlaying) {
          const factor = Math.sin(phase + i * 0.25) * 0.5 + 0.5;
          barHeight = Math.max(6, factor * (height * 0.75));
        }

        const x = i * (barWidth + 2);
        const y = (height - barHeight) / 2;

        const isDanisman = activeSegment?.speaker === 'Danışman';
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        if (isDanisman) {
          gradient.addColorStop(0, '#38bdf8');
          gradient.addColorStop(1, '#0284c7');
        } else {
          gradient.addColorStop(0, '#34d399');
          gradient.addColorStop(1, '#059669');
        }

        ctx.fillStyle = isPlaying ? gradient : 'rgba(100, 116, 139, 0.4)';
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 3);
        ctx.fill();
      }

      if (isPlaying) {
        phase += 0.12 * playbackRate;
      }
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, playbackRate, activeSegment]);

  // Handle segment looping logic
  useEffect(() => {
    if (isLoopingSegment && activeSegment && isPlaying) {
      if (currentTime >= activeSegment.endTime || currentTime < activeSegment.startTime) {
        handleSeek(activeSegment.startTime);
      }
    }
  }, [currentTime, isLoopingSegment, activeSegment, isPlaying]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setMediaSrc(url);
      setMediaFileName(file.name);

      const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi)$/i.test(file.name);
      setMediaType(isVideo ? 'video' : 'audio');
      handleSeek(0);
      onPlay();
    }
  };

  const handlePlayPause = () => {
    if (mediaType === 'video' && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        onPause();
      } else {
        videoRef.current.play().catch(() => {});
        onPlay();
      }
    } else if (mediaType === 'audio' && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        onPause();
      } else {
        audioRef.current.play().catch(() => {});
        onPlay();
      }
    } else {
      if (isPlaying) {
        onPause();
      } else {
        onPlay();
      }
    }
  };

  const handleSeek = (time: number) => {
    const clamped = Math.max(0, Math.min(time, duration));
    onSeek(clamped);
    if (mediaType === 'video' && videoRef.current) {
      videoRef.current.currentTime = clamped;
    } else if (mediaType === 'audio' && audioRef.current) {
      audioRef.current.currentTime = clamped;
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
    if (audioRef.current) audioRef.current.playbackRate = rate;
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (videoRef.current) videoRef.current.volume = newVol;
    if (audioRef.current) audioRef.current.volume = newVol;
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    const targetVol = next ? 0 : (volume || 1);
    if (videoRef.current) videoRef.current.volume = targetVol;
    if (audioRef.current) audioRef.current.volume = targetVol;
  };

  // Sync external seek actions with media elements
  useEffect(() => {
    if (mediaType === 'video' && videoRef.current) {
      if (Math.abs(videoRef.current.currentTime - currentTime) > 0.5) {
        videoRef.current.currentTime = currentTime;
      }
    } else if (mediaType === 'audio' && audioRef.current) {
      if (Math.abs(audioRef.current.currentTime - currentTime) > 0.5) {
        audioRef.current.currentTime = currentTime;
      }
    }
  }, [currentTime, mediaType]);

  const maxDuration = duration > 0 ? duration : 2583;
  const progressRatio = Math.min(1, Math.max(0, currentTime / maxDuration));

  return (
    <div
      className={`transition-all duration-300 ${
        isSticky
          ? 'sticky top-[68px] z-30 shadow-2xl ring-1 ring-blue-500/30'
          : 'relative'
      } rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl`}
    >
      {/* Hidden File Input */}
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
        {mediaType === 'video' && mediaSrc && (
          <video
            ref={videoRef}
            src={mediaSrc}
            onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
            onPlay={onPlay}
            onPause={onPause}
            className="w-full h-full object-contain"
            playsInline
          />
        )}

        {/* Audio Mode or Simulated Mode with Dynamic Waves */}
        {mediaType !== 'video' && (
          <div className="relative w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-900/60 via-slate-950 to-slate-900">
            {mediaType === 'audio' && mediaSrc && (
              <audio
                ref={audioRef}
                src={mediaSrc}
                onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
                onPlay={onPlay}
                onPause={onPause}
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

            {/* Speaker Tag Pill */}
            {activeSegment && (
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full border shadow-sm ${
                    activeSegment.speaker === 'Danışman'
                      ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                      : activeSegment.speaker === 'Danışan'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {activeSegment.speaker} Konuşuyor ({activeSegment.startStr} - {activeSegment.endStr})
                </span>
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

        {/* Top Floating Controls on Video */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between opacity-90 group-hover:opacity-100 transition-opacity z-20">
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/90 backdrop-blur-sm border border-white/15 text-slate-200 hover:text-white text-xs font-medium transition flex items-center gap-1.5 shadow"
            >
              {mediaType === 'video' ? <Film className="w-3.5 h-3.5 text-blue-400" /> : <FileAudio className="w-3.5 h-3.5 text-emerald-400" />}
              <span className="truncate max-w-[180px] sm:max-w-xs">{mediaFileName}</span>
              <Upload className="w-3 h-3 ml-1 text-slate-400" />
            </button>
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
          <span className="text-slate-500">{secondsToTimeStr(maxDuration)}</span>
        </div>
      </div>

      {/* Main Playback Control Bar */}
      <div className="p-4 bg-slate-900/95 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800">
        
        {/* Left: Playback Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Prev Segment */}
          <button
            onClick={onPrevSegment}
            title="Önceki Cümleye Git (Yukarı Ok)"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Jump -5s */}
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
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>

          {/* Jump +5s */}
          <button
            onClick={() => handleSeek(currentTime + 5)}
            title="5 Saniye İleri (Sağ Ok)"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Next Segment */}
          <button
            onClick={onNextSegment}
            title="Sonraki Cümleye Git (Aşağı Ok)"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Loop Current Segment */}
          <button
            onClick={onToggleLoopSegment}
            title="Aktif Cümleyi Sürekli Tekrarla / Döngüye Al"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
              isLoopingSegment
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-sm shadow-blue-500/20 animate-pulse'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cümleyi Döngüle</span>
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

        {/* Right: Volume & Options */}
        <div className="flex items-center gap-3">
          {/* Auto-scroll Toggle */}
          <button
            onClick={onToggleAutoScroll}
            title="Listeyi Otomatik Takip Et (Aktif Cümleye Kaydır)"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 ${
              autoScroll
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${autoScroll ? 'text-emerald-400 animate-spin' : ''}`} />
            <span className="hidden md:inline">Oto-Kaydır</span>
          </button>

          {/* Volume Control */}
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

      {/* Helpful Hint banner when media not loaded */}
      {mediaType === 'simulated' && (
        <div className="px-4 py-2 bg-blue-950/40 border-t border-blue-900/30 flex items-center justify-between text-xs text-blue-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>
              Kendi videonuzu/ses kaydınızı yükleyerek senkronize çalışabilirsiniz (.mp4, .mp3 vs.)
            </span>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 underline underline-offset-2"
          >
            Dosya Seç
          </button>
        </div>
      )}
    </div>
  );
}
