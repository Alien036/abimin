'use client';

import React from 'react';
import { 
  CheckCircle2, 
  Edit3, 
  AlertTriangle, 
  Clock, 
  Download, 
  Upload, 
  RotateCcw, 
  Keyboard, 
  FileText,
  Video,
  Sparkles
} from 'lucide-react';
import { TranscriptMetadata, SubtitleSegment } from '../lib/initialData';

interface HeaderProps {
  metadata: TranscriptMetadata;
  segments: SubtitleSegment[];
  onOpenExport: () => void;
  onOpenShortcuts: () => void;
  onUploadMd: (file: File) => void;
  onResetAll: () => void;
}

export default function Header({
  metadata,
  segments,
  onOpenExport,
  onOpenShortcuts,
  onUploadMd,
  onResetAll
}: HeaderProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const total = segments.length;
  const verifiedCount = segments.filter(s => s.status === 'verified').length;
  const editedCount = segments.filter(s => s.status === 'edited').length;
  const flaggedCount = segments.filter(s => s.status === 'flagged').length;
  const pendingCount = segments.filter(s => s.status === 'pending').length;

  const progressPercent = total > 0 ? Math.round(((verifiedCount + editedCount) / total) * 100) : 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadMd(e.target.files[0]);
    }
  };

  return (
    <header className="w-full bg-slate-900/90 border-b border-slate-800 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Brand & File Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 ring-1 ring-white/20">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-100 tracking-tight flex items-center gap-1.5">
                PsikoSync
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Video & Alt Yazı Doğrulama
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-md" title={metadata.title}>
              {metadata.title} • <span className="text-slate-300 font-medium">{metadata.duration}</span>
            </p>
          </div>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Toplam: <strong className="text-white">{total}</strong> satır</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Onaylanan: <strong className="text-emerald-200">{verifiedCount}</strong></span>
          </div>

          {editedCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-950/40 border border-sky-500/30 text-sky-300">
              <Edit3 className="w-3.5 h-3.5 text-sky-400" />
              <span>Düzeltilen: <strong className="text-sky-200">{editedCount}</strong></span>
            </div>
          )}

          {flaggedCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Şüpheli: <strong className="text-amber-200">{flaggedCount}</strong></span>
            </div>
          )}

          {/* Progress Pill */}
          <div className="hidden sm:flex items-center gap-2 pl-2">
            <div className="w-24 h-2 rounded-full bg-slate-800 overflow-hidden ring-1 ring-slate-700">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-500" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-300">%{progressPercent}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".md,.txt"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            title="Yeni Markdown Yükle"
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">MD Yükle</span>
          </button>

          <button
            onClick={onOpenShortcuts}
            title="Klavye Kısayolları"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          <button
            onClick={onResetAll}
            title="Tüm Düzenlemeleri Sıfırla"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 border border-slate-700 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenExport}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 border border-blue-400/30 transition flex items-center gap-1.5 active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Dışa Aktar</span>
          </button>
        </div>

      </div>
    </header>
  );
}
