import { useEffect, useState } from 'react';

/*
 * Giữ sự kiện "beforeinstallprompt" của trình duyệt ngay từ lúc mở app,
 * để nút "Cài ứng dụng" trong Cài đặt dùng được dù người dùng vào Cài đặt lúc nào.
 */
let deferred: any = null;
let installedNow = false;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installedNow = true;
    emit();
  });
}

export const isStandaloneApp = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true);

export const isIOSDevice = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

export function useInstallPrompt() {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force((x) => x + 1);
    subs.add(f);
    return () => {
      subs.delete(f);
    };
  }, []);
  return {
    canInstall: !!deferred,
    installed: installedNow || isStandaloneApp(),
    install: async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
      if (!deferred) return 'unavailable';
      const ev = deferred;
      try {
        ev.prompt();
        const choice = await ev.userChoice;
        deferred = null;
        emit();
        return choice?.outcome === 'accepted' ? 'accepted' : 'dismissed';
      } catch {
        return 'dismissed';
      }
    },
  };
}
