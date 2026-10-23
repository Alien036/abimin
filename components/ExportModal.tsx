'use client';

import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  FileText, 
  Film, 
  Code,
  Sparkles,
  FileCode
} from 'lucide-react';
import { SubtitleSegment, TranscriptMetadata } from '../lib/initialData';
import { exportToMarkdown, exportToSrt, exportToVtt } from '../lib/transcriptUtils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: TranscriptMetadata;
  segments: SubtitleSegment[];
}

export default function ExportModal({
  isOpen,
  onClose,
  metadata,
  segments
}: ExportModalProps) {
  const [activeFormat, setActiveFormat] = useState<'md' | 'srt' | 'vtt' | 'json'>('md');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const getContent = () => {
    switch (activeFormat) {
      case 'md':
        return exportToMarkdown(metadata, segments);
      case 'srt':
        return exportToSrt(segments);
      case 'vtt':
        return exportToVtt(segments);
      case 'json':
        return JSON.stringify({ metadata, segments }, null, 2);
    }
  };

  const content = getContent();

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const extension = activeFormat;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `danisan_gorusmesi_duzeltilmis.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-400" />
              Doğrulanmış Transkripti Dışa Aktar
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Yaptığınız tüm düzeltmeler ve güncellemeler seçtiğiniz formatta hazırlandı.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector Tabs */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveFormat('md')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeFormat === 'md'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Markdown (.md)</span>
            </button>

            <button
              onClick={() => setActiveFormat('srt')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeFormat === 'srt'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>SubRip (.srt)</span>
            </button>

            <button
              onClick={() => setActiveFormat('vtt')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeFormat === 'vtt'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>WebVTT (.vtt)</span>
            </button>

            <button
              onClick={() => setActiveFormat('json')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeFormat === 'json'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>JSON (.json)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Kopyalandı!' : 'Metni Kopyala'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Dosyayı İndir</span>
            </button>
          </div>
        </div>

        {/* Content Preview */}
        <div className="p-4 flex-1 overflow-hidden flex flex-col">
          <label className="text-xs font-semibold text-slate-400 mb-2 flex items-center justify-between">
            <span>Önizleme ({activeFormat.toUpperCase()}):</span>
            <span className="text-[11px] text-slate-500">{segments.length} segment</span>
          </label>
          <pre className="flex-1 overflow-auto p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs leading-relaxed max-h-[380px] select-all">
            {content}
          </pre>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <span>İndirilen dosya doğrudan video düzenleme programlarında (Premiere, DaVinci, YouTube vs.) kullanılabilir.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
          >
            Kapat
          </button>
        </div>

      </div>
    </div>
  );
}
