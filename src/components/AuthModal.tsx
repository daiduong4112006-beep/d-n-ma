import React, { useState } from 'react';
import { User, Lock, Mail, ShieldCheck, LogIn, UserPlus, X, CheckCircle, Loader2 } from 'lucide-react';
import { sound } from '../utils/audio';
import {
  registerUser,
  loginUser,
  loginWithGoogle,
  logoutUser,
  deleteCurrentUserAccount,
  saveUserToFirestore,
  getUserFromFirestore,
  deleteUserFromFirestore,
} from '../lib/firebase';
import { clearAllUserData, transferGuestDataToUser } from '../utils/storage';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { email: string; name: string } | null;
  onLoginSuccess: (user: { email: string; name: string }) => void;
  onLogout: () => void;
}

const isFirebaseUnconfiguredError = (err: any) => {
  if (!err) return true;
  const code = String(err.code || '');
  const msg = String(err.message || '');
  return (
    code.includes('api-key') ||
    msg.includes('api-key') ||
    code === 'auth/operation-not-allowed' ||
    code === 'auth/network-request-failed' ||
    code === 'auth/internal-error' ||
    code === 'auth/invalid-api-key' ||
    code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.'
  );
};

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onLogout,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setMessage('Vui lòng điền đầy đủ email và mật khẩu.');
      return;
    }

    if (password.length < 6) {
      setMessage('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setLoading(true);
    setMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const displayName = name.trim() || email.split('@')[0];

    try {
      if (mode === 'register') {
        let userObj = {
          email: email.trim(),
          name: displayName,
        };

        // Check if user already exists in Firestore globally
        const existingFirestoreUser = await getUserFromFirestore(cleanEmail);
        if (existingFirestoreUser) {
          throw { code: 'auth/email-already-in-use' };
        }

        try {
          const u = await registerUser(email.trim(), password, displayName);
          userObj = {
            email: u.email || email.trim(),
            name: u.displayName || displayName,
          };
        } catch (firebaseErr: any) {
          if (firebaseErr?.code === 'auth/email-already-in-use') {
            throw firebaseErr;
          }
          // Fallback to local dictionary for offline/timeout/unconfigured Firebase
          const accounts = JSON.parse(localStorage.getItem('mcq_registered_users') || '{}');
          if (accounts[cleanEmail]) {
            throw { code: 'auth/email-already-in-use' };
          }
          accounts[cleanEmail] = {
            email: email.trim(),
            password,
            name: displayName,
          };
          localStorage.setItem('mcq_registered_users', JSON.stringify(accounts));
        }

        // Save account record to Firestore so other browsers can authenticate
        await saveUserToFirestore(cleanEmail, displayName, password);

        sound.playCorrect();
        localStorage.setItem('mcq_user', JSON.stringify(userObj));
        transferGuestDataToUser(userObj.email);
        onLoginSuccess(userObj);
        onClose();
      } else {
        let userObj = {
          email: email.trim(),
          name: displayName,
        };

        let loggedIn = false;

        try {
          const u = await loginUser(email.trim(), password);
          userObj = {
            email: u.email || email.trim(),
            name: u.displayName || displayName,
          };
          loggedIn = true;
        } catch (firebaseErr: any) {
          // If Firebase Auth fails, check global Firestore user records
          const firestoreUser = await getUserFromFirestore(cleanEmail);
          if (firestoreUser) {
            if (firestoreUser.password && firestoreUser.password !== password) {
              throw { code: 'auth/wrong-password' };
            }
            userObj = {
              email: firestoreUser.email,
              name: firestoreUser.name || displayName,
            };
            loggedIn = true;
          } else {
            // Check local registered accounts fallback
            const accounts = JSON.parse(localStorage.getItem('mcq_registered_users') || '{}');
            const localAcc = accounts[cleanEmail];
            if (localAcc) {
              if (localAcc.password !== password) {
                throw { code: 'auth/wrong-password' };
              }
              userObj.name = localAcc.name || userObj.name;
              loggedIn = true;
            } else {
              // Account does NOT exist!
              throw { code: 'auth/user-not-found' };
            }
          }
        }

        if (loggedIn) {
          saveUserToFirestore(cleanEmail, userObj.name, password).catch(() => {});
          sound.playCorrect();
          localStorage.setItem('mcq_user', JSON.stringify(userObj));
          transferGuestDataToUser(userObj.email);
          onLoginSuccess(userObj);
          onClose();
        }
      }
    } catch (err: any) {
      sound.playWrong();
      console.error('Auth error detail:', err);
      let errMsg = 'Đã xảy ra lỗi khi đăng nhập / đăng ký.';
      if (err.code === 'auth/user-not-found') {
        errMsg = 'Tài khoản này chưa tồn tại hoặc đã bị xóa. Vui lòng chuyển sang tab "Đăng ký"!';
      } else if (
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        errMsg = 'Email hoặc mật khẩu không chính xác!';
      } else if (err.code === 'auth/email-already-in-use') {
        errMsg = 'Email này đã được sử dụng. Vui lòng chuyển sang tab "Đăng nhập".';
      } else if (err.code === 'auth/weak-password') {
        errMsg = 'Mật khẩu quá ngắn, phải có ít nhất 6 ký tự.';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = 'Định dạng Email không hợp lệ.';
      } else if (err.message) {
        errMsg = `Lỗi: ${err.message}`;
      }
      setMessage(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const u = await loginWithGoogle();
      if (!u || !u.email) {
        throw new Error('Không thể lấy thông tin tài khoản Google.');
      }
      const userObj = {
        email: u.email.trim(),
        name: u.displayName || u.email.split('@')[0],
      };
      await saveUserToFirestore(userObj.email, userObj.name, 'google_auth').catch(() => {});
      sound.playCorrect();
      localStorage.setItem('mcq_user', JSON.stringify(userObj));
      transferGuestDataToUser(userObj.email);
      onLoginSuccess(userObj);
      onClose();
    } catch (err: any) {
      sound.playWrong();
      console.error('Google Auth error detail:', err);
      if (err?.code === 'auth/popup-closed-by-user') {
        setMessage('Cửa sổ đăng nhập Google đã bị đóng.');
      } else if (err?.code === 'auth/popup-blocked') {
        setMessage('Trình duyệt đã chặn cửa sổ bật lên (popup). Vui lòng cho phép popup để đăng nhập Google.');
      } else {
        setMessage(`Đăng nhập Google không thành công: ${err?.message || 'Có lỗi xảy ra'}. Bạn có thể đăng nhập bằng Email/Mật khẩu bên trên!`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutClick = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.error('Logout error:', e);
    }
    sound.playWrong();
    localStorage.removeItem('mcq_user');
    onLogout();
    onClose();
  };

  const handleDeleteAccountClick = async () => {
    if (
      window.confirm(
        'XÁC NHẬN XÓA TÀI KHOẢN:\n\nBạn có chắc chắn muốn xóa vĩnh viễn tài khoản này không? Mọi dữ liệu bộ đề và lịch sử làm bài sẽ bị xóa khỏi hệ thống và bạn sẽ không thể đăng nhập bằng tài khoản này trừ khi đăng ký lại.'
      )
    ) {
      setLoading(true);
      try {
        const targetEmail = (currentUser?.email || '').trim().toLowerCase();
        
        // Delete user record & all data from Firestore
        if (targetEmail) {
          await deleteUserFromFirestore(targetEmail);
        }

        try {
          await deleteCurrentUserAccount();
        } catch (e) {
          console.warn('Firebase user delete note:', e);
        }
        try {
          await logoutUser();
        } catch (e) {
          console.error('Logout error:', e);
        }

        // Remove from registered users dictionary and clear all local storage
        clearAllUserData(targetEmail);

        sound.playWrong();
        onLogout();
        onClose();
        alert('Đã xóa tài khoản vĩnh viễn thành công!');
      } catch (err: any) {
        console.error('Error deleting account:', err);
        setMessage('Không thể xóa tài khoản tự động. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden relative">
        {/* Header decoration */}
        <div className="bg-linear-to-r from-indigo-600 via-violet-600 to-purple-600 p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-3">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>

          <h3 className="text-xl font-extrabold tracking-tight">
            {currentUser ? 'Tài khoản cá nhân' : mode === 'login' ? 'Đăng nhập tài khoản' : 'Đăng ký tài khoản mới'}
          </h3>
          <p className="text-xs text-indigo-100 mt-1 leading-relaxed">
            Quyền riêng tư tuyệt đối cho bộ đề, tiến độ học tập & danh sách câu sai của bạn.
          </p>
        </div>

        {/* Content body */}
        <div className="p-6 space-y-5">
          {currentUser ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500 text-white font-black flex items-center justify-center text-base shrink-0">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Đã đăng nhập bảo mật</span>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                    {currentUser.name}
                  </h4>
                  <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <p className="font-bold text-indigo-600 dark:text-indigo-400"> Chế độ riêng tư cá nhân:</p>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Tất cả bộ đề thi, ghi chú và lịch sử thi trắc nghiệm được liên kết riêng với tài khoản <b>{currentUser.email}</b>.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:flex-1 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl transition-all cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-extrabold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-xl transition-all cursor-pointer shrink-0"
                >
                  Đăng xuất
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccountClick}
                  disabled={loading}
                  className="w-full sm:w-auto px-3.5 py-2.5 text-xs font-extrabold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-xl transition-all cursor-pointer shrink-0"
                >
                  Xóa tài khoản
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Tab Selector */}
              <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    mode === 'login'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Đăng nhập</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    mode === 'register'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Đăng ký</span>
                </button>
              </div>

              {message && (
                <p className="text-xs text-rose-500 font-bold bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200">
                  {message}
                </p>
              )}

              {/* Form inputs */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {mode === 'register' && (
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                      Họ và tên
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Nhập tên của bạn"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                    Địa chỉ Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 font-extrabold text-xs text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-xl shadow-md shadow-indigo-500/20 transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{mode === 'login' ? 'Xác nhận Đăng nhập' : 'Tạo tài khoản cá nhân'}</span>
                </button>
              </form>

              {/* Quick Google Sign-In Option */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center space-y-2">
                <span className="text-[11px] text-slate-400 font-medium">Hoặc đăng nhập nhanh bằng tài khoản Google:</span>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGoogleLogin}
                  className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-sm disabled:opacity-60 active:scale-[0.98]"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                  ) : (
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  )}
                  <span>Đăng nhập nhanh bằng Google</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
