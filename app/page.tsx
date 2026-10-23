'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Header from '../components/Header';
import MediaPlayer from '../components/MediaPlayer';
import TranscriptList from '../components/TranscriptList';
import ExportModal from '../components/ExportModal';
import KeyboardShortcutsModal from '../components/KeyboardShortcutsModal';
import { DEFAULT_TRANSCRIPT_DATA, SubtitleSegment, TranscriptMetadata } from '../lib/initialData';
import { parseMarkdownTranscript } from '../lib/transcriptUtils';
import { Info, Sparkles, CheckCircle2, ShieldCheck, HeartHandshake, Film } from 'lucide-react';

export default function Home() {
  const [metadata, setMetadata] = useState<TranscriptMetadata>(DEFAULT_TRANSCRIPT_DATA);
  const [segments, setSegments] = useState<SubtitleSegment[]>(DEFAULT_TRANSCRIPT_DATA.segments);
  const [isClient, setIsClient] = useState(false);

  // Playback state
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(DEFAULT_TRANSCRIPT_DATA.totalSeconds);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoopingSegment, setIsLoopingSegment] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [isSticky, setIsSticky] = useState<boolean>(false);

  // Modals
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load saved state from localStorage after mount
  useEffect(() => {
    setIsClient(true);
    try {
      const savedSegments = localStorage.getItem('psiko_sync_segments_v2');
      const savedMeta = localStorage.getItem('psiko_sync_meta_v2');
      if (savedSegments) {
        setSegments(JSON.parse(savedSegments));
      }
      if (savedMeta) {
        setMetadata(JSON.parse(savedMeta));
      }
    } catch (e) {
      console.error('Failed to load saved state:', e);
    }
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    if (isClient) {
      try {
        localStorage.setItem('psiko_sync_segments_v2', JSON.stringify(segments));
        localStorage.setItem('psiko_sync_meta_v2', JSON.stringify(metadata));
      } catch (e) {
        console.error('Failed to save state:', e);
      }
    }
  }, [segments, metadata, isClient]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Find active segment based on current playback time
  const activeSegment = useMemo(() => {
    // 1. Direct hit inside interval
    const match = segments.find(
      (s) => currentTime >= s.startTime && currentTime <= s.endTime
    );
    if (match) return match;

    // 2. Fallback: closest previous segment
    for (let i = segments.length - 1; i >= 0; i--) {
      if (currentTime >= segments[i].startTime) {
        return segments[i];
      }
    }
    return segments[0] || null;
  }, [segments, currentTime]);

  const activeSegmentId = activeSegment ? activeSegment.id : null;

  // Segment Selection / Jump
  const handleSelectSegment = useCallback((segment: SubtitleSegment, playImmediately = true) => {
    setCurrentTime(segment.startTime);
    if (playImmediately) {
      setIsPlaying(true);
    }
  }, []);

  // Previous & Next Segment navigation
  const handlePrevSegment = useCallback(() => {
    if (!activeSegmentId) return;
    const currentIndex = segments.findIndex((s) => s.id === activeSegmentId);
    if (currentIndex > 0) {
      handleSelectSegment(segments[currentIndex - 1], isPlaying);
    }
  }, [activeSegmentId, segments, handleSelectSegment, isPlaying]);

  const handleNextSegment = useCallback(() => {
    if (!activeSegmentId) return;
    const currentIndex = segments.findIndex((s) => s.id === activeSegmentId);
    if (currentIndex < segments.length - 1) {
      handleSelectSegment(segments[currentIndex + 1], isPlaying);
    }
  }, [activeSegmentId, segments, handleSelectSegment, isPlaying]);

  // Updating text
  const handleUpdateSegmentText = useCallback((id: number, newText: string) => {
    setSegments((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              text: newText,
              status: newText !== s.originalText ? 'edited' : s.status
            }
          : s
      )
    );
    showToast('Değişiklik kaydedildi');
  }, []);

  // Updating status
  const handleUpdateSegmentStatus = useCallback((id: number, status: SubtitleSegment['status']) => {
    setSegments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
  }, []);

  // Revert single segment
  const handleRevertSegment = useCallback((id: number) => {
    setSegments((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              text: s.originalText,
              status: 'pending'
            }
          : s
      )
    );
    showToast('Satır orijinal metne döndürüldü');
  }, []);

  // Reset all segments
  const handleResetAll = useCallback(() => {
    if (window.confirm('Tüm transkript düzenlemeleri sıfırlansın ve orijinal dosyaya dönülsün mü?')) {
      setSegments(DEFAULT_TRANSCRIPT_DATA.segments);
      setMetadata(DEFAULT_TRANSCRIPT_DATA);
      try {
        localStorage.removeItem('psiko_sync_segments_v2');
        localStorage.removeItem('psiko_sync_meta_v2');
      } catch (e) {}
      showToast('Transkript başarıyla sıfırlandı');
    }
  }, []);

  // Custom Markdown Upload
  const handleUploadMd = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        try {
          const parsed = parseMarkdownTranscript(content);
          if (parsed.segments.length > 0) {
            setMetadata(parsed);
            setSegments(parsed.segments);
            setDuration(parsed.totalSeconds || 2583);
            setCurrentTime(0);
            showToast(`${parsed.segments.length} segment başarıyla yüklendi!`);
          } else {
            alert('Yüklenen dosyada zaman damgalı segment bulunamadı.');
          }
        } catch (err) {
          alert('Markdown dosyası işlenirken hata oluştu.');
        }
      }
    };
    reader.readAsText(file, 'utf-8');
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setCurrentTime((prev) => Math.max(0, prev - 5));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setCurrentTime((prev) => Math.min(duration, prev + 5));
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        handlePrevSegment();
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        handleNextSegment();
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        setIsLoopingSegment((prev) => !prev);
      } else if (e.code === 'Escape') {
        setIsExportOpen(false);
        setIsShortcutsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [duration, handlePrevSegment, handleNextSegment]);

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100">
      
      {/* Top Header */}
      <Header
        metadata={metadata}
        segments={segments}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onUploadMd={handleUploadMd}
        onResetAll={handleResetAll}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Project Meta Card Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900/90 to-indigo-950/40 border border-blue-900/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <h2 className="text-sm sm:text-base font-bold text-slate-100">
                Görüşme Detayları & Doğrulama Akışı
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Dosya: <code className="text-blue-300 bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-800/40">{metadata.fileName}</code> • Toplam Süre: <span className="text-slate-200 font-semibold">{metadata.duration}</span> • Katılımcılar: <span className="text-slate-300">{metadata.speakers}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Videoyu oynatın; her diyalog senkronize akar. Metinleri çift tıklayarak düzeltebilirsiniz.</span>
          </div>
        </div>

        {/* Dynamic Responsive Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Media Player (Sticky capable) */}
          <div className="lg:col-span-5 xl:col-span-5 space-y-4">
            <MediaPlayer
              activeSegment={activeSegment}
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              onTimeUpdate={(t) => setCurrentTime(t)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onSeek={(t) => setCurrentTime(t)}
              onPrevSegment={handlePrevSegment}
              onNextSegment={handleNextSegment}
              isLoopingSegment={isLoopingSegment}
              onToggleLoopSegment={() => setIsLoopingSegment(!isLoopingSegment)}
              autoScroll={autoScroll}
              onToggleAutoScroll={() => setAutoScroll(!autoScroll)}
              isSticky={isSticky}
              onToggleSticky={() => setIsSticky(!isSticky)}
            />

            {/* Quick Tips & Workflow Guide */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs space-y-2.5 text-slate-400">
              <h4 className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Hızlı Doğrulama İpuçları
              </h4>
              <ul className="space-y-1.5 list-disc list-inside">
                <li>
                  <strong className="text-slate-200">Video Yükleme:</strong> Oynatıcıdaki <span className="text-blue-400 font-medium">&quot;Dosya Seç&quot;</span> butonuyla bilgisayarınızdaki videoyu veya ses kaydını seçebilirsiniz. Dosya sunucuya yüklenmez, tarayıcınızda doğrudan şifresiz ve anında çalışır.
                </li>
                <li>
                  <strong className="text-slate-200">Zaman Damgalarına Tıklama:</strong> Herhangi bir cümlenin saatine tıkladığınızda video tam o saniyeye atlar.
                </li>
                <li>
                  <strong className="text-slate-200">Cümleyi Döngüle:</strong> Anlaşılması zor kısımlarda <span className="text-blue-400 font-medium">&quot;Cümleyi Döngüle (L)&quot;</span> butonuna basarak aynı cümleyi tekrar tekrar dinleyebilirsiniz.
                </li>
                <li>
                  <strong className="text-slate-200">Onayla & İlerle:</strong> Yeşil onay butonuna bastığınızda cümle onaylanır ve otomatik olarak bir sonraki cümleye geçer.
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column: Interactive Transcript List */}
          <div className="lg:col-span-7 xl:col-span-7">
            <TranscriptList
              segments={segments}
              activeSegmentId={activeSegmentId}
              onSelectSegment={handleSelectSegment}
              onUpdateSegmentText={handleUpdateSegmentText}
              onUpdateSegmentStatus={handleUpdateSegmentStatus}
              onRevertSegment={handleRevertSegment}
              autoScroll={autoScroll}
            />
          </div>

        </div>

      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modals */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        metadata={metadata}
        segments={segments}
      />

      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>PsikoSync — Psikolojik Danışma Görüşmesi Senkronizasyon & Doğrulama Sistemi</span>
          <span className="font-mono text-slate-400">GitHub: Alien036/abimin</span>
        </div>
      </footer>

    </div>
  );
}
