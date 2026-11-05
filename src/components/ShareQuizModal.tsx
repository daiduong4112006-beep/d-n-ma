import React, { useEffect, useState } from 'react';
import { Share2, Copy, Check, X, Link as LinkIcon, Download, Loader2, AlertTriangle, Send, Eye, Users, Clock, RefreshCw } from 'lucide-react';
import { Quiz } from '../types/quiz';
import { createOrUpdateSharedQuiz, getSharedQuizMeta, getSharedResults, SharedQuizDoc, SharedResult } from '../lib/cloud';

interface ShareQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: Quiz | null;
  ownerName?: string;
}

/**
 * Chia sẻ bộ đề cho người khác:
 * - Tạo link công khai (#shared?id=...) – người nhận mở trên máy / tài khoản khác vẫn xem được
 *   và bấm "Lưu vào bộ đề của tôi".
 * - Mã QR, nút chia sẻ của điện thoại, tải file .json (nhập lại ở mục Nhập / Xuất đề).
 */
export const ShareQuizModal: React.FC<ShareQuizModalProps> = ({ isOpen, onClose, quiz, ownerName }) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [meta, setMeta] = useState<SharedQuizDoc | null>(null);
  const [results, setResults] = useState<SharedResult[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [optionError, setOptionError] = useState('');

  const loadMeta = async (id: string) => {
    try {
      const m = await getSharedQuizMeta(id);
      setMeta(m);
      if (m?.classMode) setResults(await getSharedResults(id).catch(() => []));
      else setResults(null);
    } catch {}
  };

  const updateOptions = async (opts: { expiresAtMs?: number | null; classMode?: boolean }) => {
    if (!quiz) return;
    setSaving(true);
    setOptionError('');
    try {
      const id = await createOrUpdateSharedQuiz(quiz, ownerName, opts);
      await loadMeta(id);
    } catch { setOptionError('Chưa lưu được tùy chọn. Vui lòng thử lại.'); }
    setSaving(false);
  };

  useEffect(() => {
    if (!isOpen || !quiz) return;
    let alive = true;
    setStatus('loading');
    setShareId(null);
    setMeta(null);
    setResults(null);
    setOptionError('');
    createOrUpdateSharedQuiz(quiz, ownerName)
      .then((id) => {
        if (!alive) return;
        setShareId(id);
        setStatus('ready');
        loadMeta(id);
      })
      .catch((err) => {
        if (!alive) return;
        const m = String(err?.message || err);
        setErrorMsg(
          m === 'too-large'
            ? 'Bộ đề quá lớn (thường do có nhiều ảnh) nên không tạo được link. Hãy gửi file .json bên dưới, người nhận vào mục "Nhập / Xuất đề" để mở.'
            : m === 'offline'
            ? 'Chưa kết nối được máy chủ nên không tạo được link. Hãy gửi file .json bên dưới, người nhận vào mục "Nhập / Xuất đề" để mở.'
            : 'Không tạo được link chia sẻ (lỗi mạng hoặc máy chủ). Thử lại sau, hoặc gửi file .json bên dưới.'
        );
        setStatus('error');
      });
    return () => {
      alive = false;
    };
  }, [isOpen, quiz?.id]);

  if (!isOpen || !quiz) return null;

  const base = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
  const shareableUrl = shareId ? `${base}#shared?id=${shareId}` : '';
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(shareableUrl)}`;
  const canNativeShare = typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function';

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Trình duyệt chặn clipboard (http, iframe) → chọn sẵn để người dùng tự chép
      window.prompt('Sao chép nội dung bên dưới:', text);
      return false;
    }
  };

  const handleCopyLink = async () => {
    if (!shareableUrl) return;
    if (!await copy(shareableUrl)) return;
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleNativeShare = async () => {
    try {
      await (navigator as any).share({ title: quiz.title, text: `Bộ đề "${quiz.title}" trên DUN MASTER`, url: shareableUrl });
    } catch {}
  };

  const handleCopyJson = async () => {
    if (!await copy(JSON.stringify(quiz, null, 2))) return;
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(quiz, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${quiz.title.replace(/[\\/:*?"<>|]+/g, '').trim() || 'bo-de'}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain shadow-2xl p-5 space-y-3"
        role="dialog" aria-modal="true" aria-labelledby="share-quiz-heading"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 id="share-quiz-heading" className="text-base font-bold text-slate-900 dark:text-slate-100">Chia sẻ bộ đề thi</h2>
              <p className="text-xs text-slate-400 truncate">
                {quiz.title} · {quiz.questions.length} câu
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng chia sẻ"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            Đang tạo link chia sẻ…
          </div>
        )}

        {status === 'error' && (
          <div className="flex gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-sm text-amber-800 dark:text-amber-200">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{errorMsg}</p>
          </div>
        )}

        {status === 'ready' && (
          <>
            {/* QR */}
            <div className="flex flex-col items-center justify-center p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-2">
              <div className="p-2 bg-white rounded-2xl shadow-xs border border-slate-200">
                <img src={qrApiUrl} alt="Mã QR bộ đề" className="w-28 h-28 object-contain rounded-lg" loading="lazy" />
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">
                Quét mã để mở bộ đề
              </p>
            </div>

            {/* Link */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-indigo-500" />
                Link chia sẻ
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareableUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 min-w-0 px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300"
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
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Ai có link đều xem và lưu được bộ đề. Điểm và tiến độ của bạn được giữ riêng.
              </p>
              <div className="flex items-center gap-4 text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{meta?.views || 0} lượt mở</span>
                <span className="inline-flex items-center gap-1"><Download className="w-3.5 h-3.5" />{meta?.saves || 0} lượt lưu</span>
              </div>
              <details className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                <summary className="cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-200">Tùy chọn link & lớp học</summary>
                <div className="pt-3 space-y-3">
                <label className="flex items-center justify-between gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" /> Hạn dùng link
                  </span>
                  <select
                    disabled={saving}
                    value={(() => {
                      const ms = meta?.expiresAtMs;
                      if (!ms) return '0';
                      return 'custom';
                    })()}
                    onChange={(e) => {
                      const d = Number(e.target.value);
                      updateOptions({ expiresAtMs: d > 0 ? Date.now() + d * 86400000 : null });
                    }}
                    className="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer"
                  >
                    <option value="0">Không hạn</option>
                    {meta?.expiresAtMs ? (
                      <option value="custom">
                        {meta.expiresAtMs < Date.now() ? 'Đã hết hạn' : `Đến ${new Date(meta.expiresAtMs).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}`}
                      </option>
                    ) : null}
                    <option value="1">1 ngày kể từ bây giờ</option>
                    <option value="3">3 ngày</option>
                    <option value="7">7 ngày</option>
                    <option value="30">30 ngày</option>
                  </select>
                </label>
                <label className="flex items-start justify-between gap-3 text-xs cursor-pointer">
                  <span>
                    <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                      <Users className="w-3.5 h-3.5 text-indigo-500" /> Chế độ lớp học
                    </span>
                    <span className="block text-[11px] text-slate-400">Người làm bài (đã đăng nhập) gửi điểm về cho bạn xem.</span>
                  </span>
                  <input
                    type="checkbox"
                    disabled={saving}
                    checked={!!meta?.classMode}
                    onChange={(e) => updateOptions({ classMode: e.target.checked })}
                    className="mt-1 w-4 h-4 accent-indigo-600 cursor-pointer"
                  />
                </label>
                {meta?.classMode && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-400">
                      <span>Điểm của lớp ({results?.length || 0})</span>
                      <button type="button" onClick={() => shareId && loadMeta(shareId)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" title="Tải lại">
                        <RefreshCw className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                    {results && results.length ? (
                      <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                        {results.map((r) => (
                          <div key={r.email} className="flex items-center gap-2 py-1.5 text-xs">
                            <span className="flex-1 min-w-0 truncate font-bold text-slate-700 dark:text-slate-200" title={r.email}>
                              {r.name}
                            </span>
                            <span className="text-slate-400">{r.attempts} lần</span>
                            <span className={`w-12 text-right font-black ${r.bestPercent >= 80 ? 'text-emerald-500' : r.bestPercent >= 50 ? 'text-sky-500' : 'text-rose-500'}`}>
                              {r.bestPercent}%
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400">Chưa có ai nộp bài.</p>
                    )}
                  </div>
                )}
                </div>
              </details>
              {optionError && <p role="alert" className="text-xs text-rose-500">{optionError}</p>}
              {canNativeShare && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="w-full mt-1 px-4 py-2.5 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" /> Gửi qua Zalo, Messenger…
                </button>
              )}
            </div>
          </>
        )}

        {/* File JSON */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-slate-400">File .json</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleDownloadJson}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Tải file
            </button>
            <button
              type="button"
              onClick={handleCopyJson}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedJson ? 'Đã chép' : 'Chép JSON'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
