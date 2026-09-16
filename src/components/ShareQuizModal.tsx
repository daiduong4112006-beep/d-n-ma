import React, { useState } from 'react';
import { Share2, Copy, Check, QrCode, X, Link as LinkIcon, Download } from 'lucide-react';
import { Quiz } from '../types/quiz';

interface ShareQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: Quiz | null;
}

export const ShareQuizModal: React.FC<ShareQuizModalProps> = ({
  isOpen,
  onClose,
  quiz,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  if (!isOpen || !quiz) return null;

  // Generate shareable URL
  const currentUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
  const shareableUrl = `${currentUrl}#quiz-detail?id=${quiz.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(quiz, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  // QR Code Image API generator (public QR standard)
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    shareableUrl
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Chia sẻ bộ đề thi
              </h2>
              <p className="text-xs text-slate-400 truncate max-w-[200px]">{quiz.title}</p>
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

        {/* QR Code Preview */}
        <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-3">
          <div className="p-3 bg-white rounded-2xl shadow-xs border border-slate-200">
            <img
              src={qrApiUrl}
              alt="Quiz QR Code"
              className="w-44 h-44 object-contain rounded-lg"
              loading="lazy"
            />
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">
            Quét mã QR bằng điện thoại để mở ngay bộ đề
          </p>
        </div>

        {/* Share Link Input */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <LinkIcon className="w-3.5 h-3.5 text-indigo-500" />
            Liên kết trực tiếp
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareableUrl}
              className="flex-1 px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 select-all"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Đã chép' : 'Sao chép'}</span>
            </button>
          </div>
        </div>

        {/* Quick JSON copy */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">Xuất dữ liệu câu hỏi (JSON):</span>
          <button
            type="button"
            onClick={handleCopyJson}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedJson ? 'Đã chép JSON' : 'Sao chép JSON'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
