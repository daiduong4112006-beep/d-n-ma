import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Download,
  Trash2,
  Database,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Sliders,
  Shield,
  ShieldCheck,
  UserPlus,
  Mail,
  CheckCircle2,
  AlertCircle,
  Lock,
  X,
  Users,
} from 'lucide-react';
import {
  getAllowedJpd123Emails,
  addJpd123AccessEmail,
  removeJpd123AccessEmail,
  restoreDefaultJpd123Course,
} from '../utils/japaneseStorage';
import {
  saveJpd123AccessListToFirestore,
  subscribeJpd123AccessList,
} from '../lib/firebase';
import { sound } from '../utils/audio';

interface SettingsProps {
  currentUser?: { email: string; name: string } | null;
  onResetDemoData: () => void;
  onExportAllBackup: () => void;
  onClearAllData: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
}

const SUPER_ADMIN_EMAIL = 'daiduong4112006@gmail.com';

export const SettingsPage: React.FC<SettingsProps> = ({
  currentUser,
  onResetDemoData,
  onExportAllBackup,
  onClearAllData,
  isDarkMode,
  onToggleDarkMode,
  soundEnabled,
  onToggleSound,
}) => {
  const isSuperAdmin = currentUser?.email?.toLowerCase().trim() === SUPER_ADMIN_EMAIL;

  // JPD123 Access Control State
  const [newEmail, setNewEmail] = useState('');
  const [allowedEmails, setAllowedEmails] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setAllowedEmails(getAllowedJpd123Emails());
    const unSub = subscribeJpd123AccessList((emails) => {
      if (Array.isArray(emails)) {
        setAllowedEmails(emails);
      }
    });
    return () => {
      if (unSub) unSub();
    };
  }, []);

  const handleAddEmail = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail) return;

    const res = addJpd123AccessEmail(cleanEmail);
    if (res.success) {
      sound.playSuccess();
      const updated = getAllowedJpd123Emails();
      setAllowedEmails(updated);
      setNewEmail('');
      setFeedback({ type: 'success', text: res.message });
      // Ensure Firestore receives the whitelist immediately
      saveJpd123AccessListToFirestore(updated).catch(() => {});
    } else {
      sound.playMistake();
      setFeedback({ type: 'error', text: res.message });
    }

    setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

  const handleRemoveEmail = (email: string) => {
    if (window.confirm(`Xác nhận thu hồi quyền xem JPD123 của tài khoản: ${email}?`)) {
      removeJpd123AccessEmail(email);
      const updated = getAllowedJpd123Emails();
      setAllowedEmails(updated);
      saveJpd123AccessListToFirestore(updated).catch(() => {});
      sound.playClick();
      setFeedback({ type: 'success', text: `Đã thu hồi quyền xem của ${email}` });
      setTimeout(() => {
        setFeedback(null);
      }, 3500);
    }
  };

  const handleRestoreJpd123 = () => {
    if (
      window.confirm(
        'Khôi phục lại toàn bộ khóa học JPD123 gốc (Từ vựng Bài 4-7, Chữ Hán, Ngữ pháp, Tài liệu PDF) và đồng bộ lên đám mây?'
      )
    ) {
      restoreDefaultJpd123Course(currentUser?.email);
      sound.playSuccess();
      setFeedback({
        type: 'success',
        text: 'Đã khôi phục thành công toàn bộ khóa học JPD123 gốc và đồng bộ lên server!',
      });
      setTimeout(() => setFeedback(null), 4500);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Section 1: Appearance & Sound */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/60">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Giao diện
          </h3>
        </div>
        <div className="p-6 space-y-5">
          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Chế độ tối</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sử dụng giao diện tối cho toàn bộ ứng dụng
              </p>
            </div>
            {onToggleDarkMode && (
              <button
                type="button"
                onClick={onToggleDarkMode}
                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${
                  isDarkMode ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${
                  isDarkMode ? 'right-0.5' : 'left-0.5'
                }`} />
              </button>
            )}
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800/40" />

          {/* Sound Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Âm thanh hiệu ứng</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bật/tắt âm thanh khi trả lời đúng, sai và hoàn thành bài thi
              </p>
            </div>
            {onToggleSound && (
              <button
                type="button"
                onClick={onToggleSound}
                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${
                  soundEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${
                  soundEnabled ? 'right-0.5' : 'left-0.5'
                }`} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: Super Admin Security & Access Delegation (ONLY for daiduong4112006@gmail.com) */}
      {isSuperAdmin && (
        <div className="p-6 bg-linear-to-br from-indigo-900/10 via-purple-900/5 to-slate-900/10 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-slate-900 border-2 border-indigo-500/30 rounded-2xl shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-indigo-200/50 dark:border-indigo-900/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-indigo-950 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-2">
                  Phân Quyền Xem Thư Mục JPD123
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-600 text-white">
                    SUPER ADMIN
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Thư mục JPD123 mặc định ở chế độ riêng tư. Cấp quyền xem cho các Gmail khác tại đây.
                </p>
              </div>
            </div>
          </div>

          {/* Form to Add Gmail */}
          <form onSubmit={handleAddEmail} className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Thêm Gmail người dùng được phép xem thư mục JPD123:
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Ví dụ: student_japanese@gmail.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                onClick={(e) => handleAddEmail(e)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 font-bold text-xs rounded-xl shadow-xs bg-indigo-600 hover:bg-indigo-700 text-white transition-all cursor-pointer active:scale-95 shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Cấp Quyền Xem</span>
              </button>
            </div>

            {/* Action to restore deleted JPD123 */}
            <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h5 className="font-black text-xs text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                  Khôi phục khóa học JPD123 gốc:
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Nếu bạn từng lỡ tay xóa mất khóa học JPD123, bấm nút này để phục hồi lại đầy đủ Từ vựng Bài 4-7, Kanji, Ngữ pháp và đồng bộ lên server.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRestoreJpd123}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2 font-black text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Khôi phục JPD123 gốc</span>
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{feedback.text}</span>
              </div>
            )}
          </form>

          {/* List of Allowed Emails */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-500" />
                Danh sách tài khoản đã được cấp quyền ({allowedEmails.length}):
              </span>
              <span className="text-[11px] text-slate-400 italic">
                (Tài khoản của bạn {SUPER_ADMIN_EMAIL} luôn có quyền mặc định)
              </span>
            </div>

            {allowedEmails.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                Chưa có tài khoản ngoài nào được cấp quyền. Chỉ một mình Super Admin mới xem được thư mục JPD123.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                {allowedEmails.map((email) => (
                  <div
                    key={email}
                    className="flex items-center justify-between px-4 py-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                      <div className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-black">
                        ✓
                      </div>
                      <span>{email}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                        Được xem JPD123
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(email)}
                      className="px-2.5 py-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer text-[11px] font-bold inline-flex items-center gap-1"
                      title="Thu hồi quyền xem"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Thu hồi</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section 3: Storage & Backup */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/60">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Dữ liệu
          </h3>
        </div>
        <div className="p-6 space-y-5">
          {/* Export Backup */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Xuất bản sao lưu</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tải file backup toàn bộ dữ liệu dưới dạng JSON
              </p>
            </div>
            <button
              type="button"
              onClick={onExportAllBackup}
              className="inline-flex items-center gap-2 px-4 py-2 font-bold text-xs bg-indigo-500/10 dark:bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-500/20 transition-all cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Xuất backup</span>
            </button>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800/40" />

          {/* Reset Demo */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Khôi phục dữ liệu mẫu</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tải lại bộ đề demo mặc định
              </p>
            </div>
            <button
              type="button"
              onClick={onResetDemoData}
              className="inline-flex items-center gap-2 px-4 py-2 font-bold text-xs bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-xl hover:bg-amber-500/20 transition-all cursor-pointer shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Khôi phục</span>
            </button>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800/40" />

          {/* Danger Zone */}
          {isSuperAdmin ? (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-rose-600 dark:text-rose-300">Xóa toàn bộ dữ liệu</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Không thể hoàn tác sau khi xóa
                </p>
              </div>
              <button
                type="button"
                onClick={onClearAllData}
                className="inline-flex items-center gap-2 px-4 py-2 font-bold text-xs bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-500/20 transition-all cursor-pointer shrink-0"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa tất cả</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <Lock className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                Tính năng xóa dữ liệu hệ thống đã được khóa bảo mật. Chỉ Super Admin mới có quyền truy cập.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
