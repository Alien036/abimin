'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import {
  Search,
  Check,
  CheckCircle2,
  Edit3,
  AlertTriangle,
  Play,
  RotateCcw,
  User,
  MessageSquare,
  Volume2,
  X,
  ArrowRight
} from 'lucide-react';
import { SubtitleSegment } from '../lib/initialData';
import { audioManager } from '../lib/audioManager';

interface SegmentCardProps {
  seg: SubtitleSegment;
  isActive: boolean;
  isEditing: boolean;
  showOriginal: boolean;
  editText: string;
  onSelectSegment: (segment: SubtitleSegment, playImmediately?: boolean) => void;
  onReplaySegment: (segment: SubtitleSegment) => void;
  onVerifyAndNext: (segment: SubtitleSegment) => void;
  onUpdateSegmentStatus: (id: number, status: SubtitleSegment['status']) => void;
  onRevertSegment: (id: number) => void;
  onHoverSegment: (id: number) => void;
  startEdit: (seg: SubtitleSegment) => void;
  saveEdit: (id: number) => void;
  cancelEdit: () => void;
  setEditText: (txt: string) => void;
  toggleShowOriginal: (id: number) => void;
  activeItemRef: React.RefObject<HTMLDivElement | null> | null;
}

const SegmentCard = memo(function SegmentCard({
  seg,
  isActive,
  isEditing,
  showOriginal,
  editText,
  onSelectSegment,
  onReplaySegment,
  onVerifyAndNext,
  onUpdateSegmentStatus,
  onRevertSegment,
  onHoverSegment,
  startEdit,
  saveEdit,
  cancelEdit,
  setEditText,
  toggleShowOriginal,
  activeItemRef
}: SegmentCardProps) {
  const isDanisman = seg.speaker === 'Danışman';
  const isDanisan = seg.speaker === 'Danışan';
  const isNote = !isDanisman && !isDanisan;
  const isEditedFromOriginal = seg.text !== seg.originalText;

  return (
    <div
      ref={isActive && activeItemRef ? activeItemRef : null}
      onMouseEnter={() => onHoverSegment(seg.id)}
      className={`group relative rounded-xl p-3 sm:p-4 transition-colors duration-150 border ${
        isActive
          ? 'bg-blue-950/40 border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/40 active-segment-glow'
          : 'bg-slate-900/60 hover:bg-slate-800/40 border-slate-800'
      }`}
    >
      {/* Top Row: Timestamp, Speaker, Status Pill, Snippet Play, Tekrar Dinle */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center flex-wrap gap-2">
          {/* Play snippet button */}
          <button
            onClick={() => onSelectSegment(seg, true)}
            title="Bu Cümleye Atla ve Oynat"
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition ${
              isActive
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'
            }`}
          >
            <Play className="w-3 h-3 fill-current" />
            <span>{seg.startStr} - {seg.endStr}</span>
            <span className="text-[10px] opacity-70">({seg.endTime - seg.startTime}s)</span>
          </button>

          {/* TEKRAR DİNLE BUTTON ON SEGMENT */}
          <button
            onClick={() => onReplaySegment(seg)}
            title="Bu Cümleyi Baştan Tekrar Dinle (Kısayol: R)"
            className="px-2 py-1 rounded-lg bg-indigo-950/70 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-medium transition flex items-center gap-1 active:scale-95"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Tekrar Dinle</span>
          </button>

          {/* Speaker Badge */}
          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
              isDanisman
                ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                : isDanisan
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
          >
            {isDanisman && <User className="w-3 h-3" />}
            {isDanisan && <MessageSquare className="w-3 h-3" />}
            {isNote && <Volume2 className="w-3 h-3" />}
            <span>{seg.speaker}</span>
          </span>

          <span className="text-[11px] font-mono text-slate-500">#{seg.id}</span>
        </div>

        {/* Right: Status Badges & Quick Action */}
        <div className="flex items-center gap-1.5">
          {seg.status === 'verified' && (
            <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3 h-3" />
              <span className="hidden sm:inline">Onaylandı</span>
            </span>
          )}

          {seg.status === 'edited' && (
            <span className="text-xs px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center gap-1 font-medium">
              <Edit3 className="w-3 h-3" />
              <span className="hidden sm:inline">Düzeltildi</span>
            </span>
          )}

          {seg.status === 'flagged' && (
            <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 font-medium">
              <AlertTriangle className="w-3 h-3" />
              <span className="hidden sm:inline">Şüpheli</span>
            </span>
          )}

          {seg.status === 'pending' && (
            <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/80 font-medium">
              Bekliyor
            </span>
          )}

          {/* Quick Verify & Next Button */}
          <button
            onClick={() => onVerifyAndNext(seg)}
            title="Onayla ve Sonraki Cümleye Geç"
            className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-medium transition flex items-center gap-1 active:scale-95"
          >
            <Check className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Onayla & İlerle</span>
            <ArrowRight className="w-3 h-3 hidden md:inline opacity-70" />
          </button>
        </div>
      </div>

      {/* Content Area: Text Display or Text Editor */}
      <div className="mt-1">
        {isEditing ? (
          <div className="space-y-2 mt-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
              className="w-full p-3 rounded-xl bg-slate-950 border border-blue-500/50 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition leading-relaxed resize-y font-sans"
              placeholder="Düzeltilmiş metni yazınız..."
              autoFocus
            />
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{editText.length} karakter • {editText.split(/\s+/).filter(Boolean).length} kelime</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={cancelEdit}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
                >
                  İptal
                </button>
                <button
                  onClick={() => saveEdit(seg.id)}
                  className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition"
                >
                  Değişikliği Kaydet
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            onDoubleClick={() => startEdit(seg)}
            className="text-slate-200 text-sm sm:text-base leading-relaxed cursor-text selection:bg-blue-500 selection:text-white"
          >
            {seg.text}
          </div>
        )}

        {/* Show original diff comparison if text was modified */}
        {isEditedFromOriginal && !isEditing && (
          <div className="mt-2 text-xs">
            <button
              onClick={() => toggleShowOriginal(seg.id)}
              className="text-slate-400 hover:text-slate-300 flex items-center gap-1 font-medium"
            >
              <span>Orijinal transkript metnini {showOriginal ? 'gizle' : 'göster'}</span>
            </button>

            {showOriginal && (
              <div className="mt-1.5 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-400 italic font-mono text-xs">
                {seg.originalText}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Row Actions */}
      <div className="mt-3 pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => (isEditing ? saveEdit(seg.id) : startEdit(seg))}
            className="text-slate-400 hover:text-blue-400 transition flex items-center gap-1 font-medium"
          >
            <Edit3 className="w-3 h-3" />
            <span>{isEditing ? 'Kaydet' : 'Metni Düzenle'}</span>
          </button>

          {isEditedFromOriginal && (
            <button
              onClick={() => onRevertSegment(seg.id)}
              className="text-slate-400 hover:text-amber-400 transition flex items-center gap-1 font-medium ml-2"
              title="Orijinal ilk metne döndür"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Orijinale Dön</span>
            </button>
          )}
        </div>

        {/* Status Change Selector */}
        <div className="flex items-center gap-1 text-[11px]">
          <span className="text-slate-500 mr-1 hidden sm:inline">Durum:</span>
          <button
            onClick={() => onUpdateSegmentStatus(seg.id, 'verified')}
            className={`px-2 py-0.5 rounded transition ${
              seg.status === 'verified'
                ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            ✓ Onayla
          </button>
          <button
            onClick={() => onUpdateSegmentStatus(seg.id, 'flagged')}
            className={`px-2 py-0.5 rounded transition ${
              seg.status === 'flagged'
                ? 'bg-amber-500/20 text-amber-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            ⚠️ Şüpheli
          </button>
          <button
            onClick={() => onUpdateSegmentStatus(seg.id, 'pending')}
            className={`px-2 py-0.5 rounded transition ${
              seg.status === 'pending'
                ? 'bg-slate-800 text-slate-300 font-semibold'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
            }`}
          >
            Beklet
          </button>
        </div>
      </div>
    </div>
  );
});

interface TranscriptListProps {
  segments: SubtitleSegment[];
  activeSegmentId: number | null;
  onSelectSegment: (segment: SubtitleSegment, playImmediately?: boolean) => void;
  onReplaySegment: (segment: SubtitleSegment) => void;
  onVerifyAndNext: (segment: SubtitleSegment) => void;
  onUpdateSegmentText: (id: number, newText: string) => void;
  onUpdateSegmentStatus: (id: number, status: SubtitleSegment['status']) => void;
  onRevertSegment: (id: number) => void;
  autoScroll: boolean;
  editingSegmentId?: number | null;
  onClearEditingSegmentId?: () => void;
}

const TranscriptList = memo(function TranscriptList({
  segments,
  activeSegmentId,
  onSelectSegment,
  onReplaySegment,
  onVerifyAndNext,
  onUpdateSegmentText,
  onUpdateSegmentStatus,
  onRevertSegment,
  autoScroll,
  editingSegmentId,
  onClearEditingSegmentId
}: TranscriptListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [speakerFilter, setSpeakerFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const editTextRef = useRef('');
  editTextRef.current = editText;

  const [showOriginalMap, setShowOriginalMap] = useState<Record<number, boolean>>({});

  const activeItemRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Sync external edit request from MediaPlayer panel
  useEffect(() => {
    if (editingSegmentId) {
      const seg = segments.find(s => s.id === editingSegmentId);
      if (seg) {
        setEditingId(seg.id);
        setEditText(seg.text);
      }
      if (onClearEditingSegmentId) onClearEditingSegmentId();
    }
  }, [editingSegmentId, segments, onClearEditingSegmentId]);

  // Auto-scroll to active segment
  useEffect(() => {
    if (autoScroll && activeSegmentId && activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [activeSegmentId, autoScroll]);

  // Memoized filtered segments so filtering only runs when segments or filters change
  const filteredSegments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return segments.filter((seg) => {
      if (q) {
        const inText = seg.text.toLowerCase().includes(q);
        const inSpeaker = seg.speaker.toLowerCase().includes(q);
        const inTime = `${seg.startStr} ${seg.endStr}`.includes(q);
        if (!inText && !inSpeaker && !inTime) return false;
      }

      if (speakerFilter !== 'all') {
        if (speakerFilter === 'Danışman' && seg.speaker !== 'Danışman') return false;
        if (speakerFilter === 'Danışan' && seg.speaker !== 'Danışan') return false;
        if (speakerFilter === 'Not / Efekt' && seg.speaker !== 'Not / Efekt' && seg.speaker !== 'Not') return false;
      }

      if (statusFilter !== 'all') {
        if (seg.status !== statusFilter) return false;
      }

      return true;
    });
  }, [segments, searchQuery, speakerFilter, statusFilter]);

  // Stable callbacks so React.memo(SegmentCard) is never invalidated across all 189 items
  const startEdit = useCallback((seg: SubtitleSegment) => {
    setEditingId(seg.id);
    setEditText(seg.text);
  }, []);

  const saveEdit = useCallback((id: number) => {
    onUpdateSegmentText(id, editTextRef.current);
    setEditingId(null);
  }, [onUpdateSegmentText]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditText('');
  }, []);

  const toggleShowOriginal = useCallback((id: number) => {
    setShowOriginalMap((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleHoverSegment = useCallback((id: number) => {
    audioManager.preloadHover(id);
  }, []);

  return (
    <div className="w-full flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
      
      {/* Top Controls: Search, Filters & Counters */}
      <div className="p-4 bg-slate-900/95 border-b border-slate-800 space-y-3">
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Transkriptte ara (kelime, konuşmacı veya dakika: 04:31)..."
            className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-950 border border-slate-700/80 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          
          {/* Speaker Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {[
              { id: 'all', label: 'Tüm Konuşmacılar' },
              { id: 'Danışman', label: 'Danışman' },
              { id: 'Danışan', label: 'Danışan' },
              { id: 'Not / Efekt', label: 'Not/Efekt' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSpeakerFilter(tab.id)}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  speakerFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {[
              { id: 'all', label: 'Tümü' },
              { id: 'pending', label: 'Bekleyenler' },
              { id: 'verified', label: 'Onaylı' },
              { id: 'edited', label: 'Düzeltilen' },
              { id: 'flagged', label: 'Şüpheli' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  statusFilter === tab.id
                    ? 'bg-slate-800 text-blue-400 border border-blue-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Results count */}
          <div className="text-slate-400 font-medium">
            Gösterilen: <span className="text-slate-200 font-semibold">{filteredSegments.length}</span> / {segments.length}
          </div>

        </div>

      </div>

      {/* Transcript Segments List */}
      <div
        ref={listContainerRef}
        className="divide-y divide-slate-800/60 max-h-[700px] overflow-y-auto p-2 sm:p-4 space-y-2.5"
      >
        {filteredSegments.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Aradığınız kriterlere uygun diyalog satırı bulunamadı.</p>
            <button
              onClick={() => { setSearchQuery(''); setSpeakerFilter('all'); setStatusFilter('all'); }}
              className="mt-3 text-xs text-blue-400 hover:underline font-semibold"
            >
              Filtreleri Temizle
            </button>
          </div>
        ) : (
          filteredSegments.map((seg) => {
            const isActive = activeSegmentId === seg.id;
            const isEditing = editingId === seg.id;
            return (
              <SegmentCard
                key={seg.id}
                seg={seg}
                isActive={isActive}
                isEditing={isEditing}
                showOriginal={!!showOriginalMap[seg.id]}
                editText={isEditing ? editText : ''}
                onSelectSegment={onSelectSegment}
                onReplaySegment={onReplaySegment}
                onVerifyAndNext={onVerifyAndNext}
                onUpdateSegmentStatus={onUpdateSegmentStatus}
                onRevertSegment={onRevertSegment}
                onHoverSegment={handleHoverSegment}
                startEdit={startEdit}
                saveEdit={saveEdit}
                cancelEdit={cancelEdit}
                setEditText={setEditText}
                toggleShowOriginal={toggleShowOriginal}
                activeItemRef={isActive ? activeItemRef : null}
              />
            );
          })
        )}
      </div>

    </div>
  );
});

export default TranscriptList;
