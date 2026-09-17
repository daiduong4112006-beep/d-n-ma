import React, { useState, useEffect } from 'react';
import { Key, Check, AlertTriangle, ExternalLink, X, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { getCustomGeminiApiKey, setCustomGeminiApiKey, clearCustomGeminiApiKey } from '../utils/aiClient';

interface AiApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const AiApiKeyModal: React.FC<AiApiKeyModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiKey(getCustomGeminiApiKey());
      setTestResult(null);
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    const keyToTest = apiKey.trim();
    if (!keyToTest) {
      setTestResult({ success: false, message: 'Vui lòng nhập API Key để kiểm tra.' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${keyToTest}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Ping' }] }],
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const msg = errJson?.error?.message || `Lỗi HTTP ${res.status}`;
        if (res.status === 400 || msg.includes('API_KEY_INVALID')) {
          throw new Error('Khóa API không hợp lệ hoặc đã hết hạn.');
        } else if (res.status === 403 || msg.includes('PERMISSION_DENIED')) {
          throw new Error('Khóa API bị giới hạn quyền hoặc chưa kích hoạt Generative Language API.');
        } else if (res.status === 429) {
          throw new Error('Khóa API tạm thời vượt mức giới hạn (429 Rate Limit). Vui lòng thử lại sau giây lát.');
        }
        throw new Error(msg);
      }

      setTestResult({
        success: true,
        message: 'Kết nối thành công! Khóa Gemini API hoạt động rất tốt 🎉',
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Không thể xác thực khóa API.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const keyToSave = apiKey.trim();
    setCustomGeminiApiKey(keyToSave);
    setSavedSuccess(true);
    setTimeout(() => {
      if (onSaved) onSaved();
      onClose();
    }, 600);
  };

  const handleClear = () => {
    clearCustomGeminiApiKey();
    setApiKey('');
    setTestResult(null);
    setSavedSuccess(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-100 relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Cấu hình Google Gemini AI</h3>
              <p className="text-[11px] text-slate-400">Khóa API cá nhân giúp AI luôn hoạt động ổn định</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 leading-relaxed space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-indigo-300">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Tại sao cần nhập API Key?</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Khi hệ thống dùng chung bị hết hạn mức (429) hoặc quá tải, nhập API Key cá nhân (hoàn toàn miễn phí) sẽ giúp bạn sử dụng AI mượt mà và không bao giờ bị gián đoạn.
            </p>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-bold text-amber-400 hover:underline pt-0.5"
            >
              <span>Lấy API Key miễn phí tại Google AI Studio</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
              Google Gemini API Key
            </label>
            <div className="relative">
              <input
                type="text"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestResult(null);
                  setSavedSuccess(false);
                }}
                placeholder="AIzaSy..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Test Status Feedback */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                testResult.success
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
              }`}
            >
              {testResult.success ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span className="leading-snug">{testResult.message}</span>
            </div>
          )}

          {savedSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-center font-bold flex items-center justify-center gap-1.5">
              <Check className="w-4 h-4" />
              <span>Đã lưu thành công!</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 gap-2">
          {apiKey ? (
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 transition-colors text-xs font-bold cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa khóa</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestKey}
              disabled={testing || !apiKey.trim()}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              )}
              <span>Kiểm tra</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Lưu & Sử dụng</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
