'use client';

import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsModal({
  isOpen,
  onClose
}: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Boşluk (Space)', desc: 'Videoyu / Sesi Oynat veya Duraklat' },
    { key: 'Sol Ok (←)', desc: '5 Saniye Geri Sar' },
    { key: 'Sağ Ok (→)', desc: '5 Saniye İleri Sar' },
    { key: 'Yukarı Ok (↑)', desc: 'Önceki Cümleye / Segmente Atla' },
    { key: 'Aşağı Ok (↓)', desc: 'Sonraki Cümleye / Segmente Atla' },
    { key: 'L Tuşu', desc: 'Aktif Cümleyi Sürekli Tekrarla (Döngü Modu)' },
    { key: 'Çift Tıklama', desc: 'Herhangi bir cümlenin metnini anında düzenle' },
    { key: 'Esc', desc: 'Pencereleri veya Düzenleme Modunu Kapat' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-blue-400" />
            Klavye Kısayolları
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="p-5 space-y-2.5">
          {shortcuts.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs"
            >
              <span className="text-slate-300 font-medium">{s.desc}</span>
              <kbd className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-blue-300 font-mono font-semibold shadow-sm">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition"
          >
            Anladım
          </button>
        </div>

      </div>
    </div>
  );
}
