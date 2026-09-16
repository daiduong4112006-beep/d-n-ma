import React from 'react';
import { Keyboard, X, Sparkles, Check } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '1, 2, 3, 4', desc: 'Chọn phương án A, B, C, D khi làm bài thi' },
    { key: 'A, B, C, D', desc: 'Chọn đáp án tương ứng bằng phím chữ cái' },
    { key: 'Space (Phím cách)', desc: 'Lật thẻ ghi nhớ (Flashcard) hoặc Bật/Tắt phát Audio' },
    { key: '→ hoặc Enter', desc: 'Chuyển sang câu hỏi tiếp theo' },
    { key: '← (Mũi tên trái)', desc: 'Quay lại câu hỏi trước đó' },
    { key: 'Z', desc: 'Bật / Tắt chế độ Zen Focus Mode (tập trung không phân tâm)' },
    { key: 'S', desc: 'Đánh dấu / Bỏ dấu sao từ vựng hoặc câu hỏi quan trọng' },
    { key: '?', desc: 'Mở bảng phím tắt trợ giúp này' },
    { key: 'Esc', desc: 'Đóng cửa sổ hoặc thoát chế độ toàn màn hình' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Phím tắt thao tác nhanh
              </h2>
              <p className="text-xs text-slate-400">Tăng tốc độ ôn luyện và làm bài thi</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of shortcuts */}
        <div className="space-y-2.5">
          {shortcuts.map((sc, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-xs"
            >
              <span className="text-slate-600 dark:text-slate-300 font-medium">{sc.desc}</span>
              <kbd className="px-2 py-1 rounded-lg bg-white dark:bg-slate-700 font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-300 shadow-xs border border-slate-200 dark:border-slate-600 shrink-0 ml-3">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all cursor-pointer"
        >
          Đã hiểu & Tiếp tục
        </button>
      </div>
    </div>
  );
};
