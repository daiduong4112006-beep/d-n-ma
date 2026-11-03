import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

const DISMISS_KEY = 'dun_install_dismissed_v1';

/** Thanh gợi ý "Cài DUN MASTER lên máy" (Chrome/Edge/Android). iPhone: Chia sẻ → Thêm vào MH chính. */
export const InstallAppBar: React.FC = () => {
  const [promptEvent, setPromptEvent] = useState<any>(null);
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e);
    };
    const onInstalled = () => setPromptEvent(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!promptEvent || hidden) return null;

  const dismiss = () => {
    setHidden(true);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch {}
  };

  const install = async () => {
    try {
      promptEvent.prompt();
      await promptEvent.userChoice;
    } catch {}
    setPromptEvent(null);
  };

  return (
    <div className="shrink-0 flex items-center gap-3 border-b border-indigo-100 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/40 px-4 py-2 text-xs text-indigo-900 dark:text-indigo-200">
      <Download className="w-4 h-4 shrink-0" />
      <span className="flex-1 font-medium">Cài DUN MASTER lên máy để mở nhanh như ứng dụng và ôn tập cả khi mất mạng.</span>
      <button
        type="button"
        onClick={install}
        className="rounded-lg bg-indigo-600 px-3 py-1.5 font-bold text-white hover:bg-indigo-700 cursor-pointer"
      >
        Cài đặt
      </button>
      <button type="button" onClick={dismiss} aria-label="Ẩn" className="rounded-lg p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 cursor-pointer">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
