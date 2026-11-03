import React, { useEffect, useState } from 'react';
import { MailWarning, Loader2, RefreshCw, Send } from 'lucide-react';
import { auth, onAuthStateChanged, resendVerificationEmail, refreshEmailVerified } from '../lib/firebase';

/**
 * Thanh nhắc xác minh email. Firestore chỉ cho đọc/ghi khi email đã xác minh,
 * nên khi chưa xác minh dữ liệu chỉ lưu trên máy này.
 */
export const EmailVerifyBanner: React.FC = () => {
  const [needsVerify, setNeedsVerify] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<'send' | 'check' | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      const pwdUser = !!u && u.providerData.some((p) => p.providerId === 'password');
      setNeedsVerify(!!u && pwdUser && !u.emailVerified);
      setEmail(u?.email || '');
    });
    return () => unsub();
  }, []);

  if (!needsVerify) return null;

  const handleResend = async () => {
    setBusy('send');
    setNote(null);
    try {
      await resendVerificationEmail();
      setNote('Đã gửi lại email xác minh. Kiểm tra cả mục Spam nhé.');
    } catch (e: any) {
      setNote(
        e?.code === 'auth/too-many-requests'
          ? 'Bạn gửi quá nhiều lần, đợi vài phút rồi thử lại.'
          : `Không gửi được: ${e?.message || 'lỗi không xác định'}`
      );
    } finally {
      setBusy(null);
    }
  };

  const handleCheck = async () => {
    setBusy('check');
    setNote(null);
    try {
      const ok = await refreshEmailVerified();
      if (ok) {
        setNote('Xác minh thành công! Đang tải lại để đồng bộ dữ liệu…');
        setTimeout(() => window.location.reload(), 700);
      } else {
        setNote('Email vẫn chưa được xác minh. Hãy bấm link trong email trước.');
      }
    } catch (e: any) {
      setNote(`Không kiểm tra được: ${e?.message || 'lỗi không xác định'}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="shrink-0 border-b border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 px-4 py-2.5 text-amber-900 dark:text-amber-200">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
        <MailWarning className="w-4 h-4 shrink-0" />
        <span className="flex-1 min-w-[200px] font-medium">
          Email <b>{email}</b> chưa được xác minh. Dữ liệu đang chỉ lưu trên máy này, bấm link trong email xác minh để đồng bộ lên đám mây.
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResend}
            disabled={!!busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-white/70 dark:bg-amber-900/30 px-2.5 py-1.5 font-bold hover:bg-white dark:hover:bg-amber-900/60 disabled:opacity-60 cursor-pointer"
          >
            {busy === 'send' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Gửi lại email
          </button>
          <button
            type="button"
            onClick={handleCheck}
            disabled={!!busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-2.5 py-1.5 font-bold text-white hover:bg-amber-700 disabled:opacity-60 cursor-pointer"
          >
            {busy === 'check' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Tôi đã xác minh
          </button>
        </div>
      </div>
      {note && <p className="mt-1.5 pl-7 text-[11px] font-semibold">{note}</p>}
    </div>
  );
};
