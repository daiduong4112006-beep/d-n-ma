import React from 'react';
import { RotateCcw, Download, Trash2, Database, Sun, Moon, Volume2, VolumeX, Sliders } from 'lucide-react';

interface SettingsProps {
  onResetDemoData: () => void;
  onExportAllBackup: () => void;
  onClearAllData: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
}

export const SettingsPage: React.FC<SettingsProps> = ({
  onResetDemoData,
  onExportAllBackup,
  onClearAllData,
  isDarkMode,
  onToggleDarkMode,
  soundEnabled,
  onToggleSound,
}) => {
  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Cài đặt ứng dụng & Tùy chỉnh
        </h2>
        <p className="text-xs text-slate-400">
          Tùy chỉnh giao diện Sáng / Tối, bật tắt âm thanh hiệu ứng và quản lý bộ nhớ dữ liệu.
        </p>
      </div>

      {/* Section 1: Appearance & Sound Customization */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <Sliders className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 uppercase tracking-wider">
            Giao diện & Âm thanh
          </h3>
        </div>

        {/* Setting 1: Light / Dark Mode Toggle */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Giao diện màn hình
              </h4>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                isDarkMode ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
              }`}>
                {isDarkMode ? 'Chế độ Tối (Dark)' : 'Chế độ Sáng (Light)'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chuyển đổi linh hoạt giữa giao diện nền sáng rạng rỡ và giao diện nền tối dịu mắt.
            </p>
          </div>
          {onToggleDarkMode && (
            <button
              type="button"
              onClick={onToggleDarkMode}
              className={`inline-flex items-center gap-2 px-4 py-2.5 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0 ${
                isDarkMode
                  ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Đổi sang Chế độ Sáng</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-white" />
                  <span>Đổi sang Chế độ Tối</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Setting 2: Sound Effects Toggle */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Âm thanh hiệu ứng
              </h4>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                soundEnabled ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-300 dark:border-emerald-800' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
              }`}>
                {soundEnabled ? 'Đang BẬT' : 'Đang TẮT'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Phát âm thanh thông báo sinh động khi trả lời đúng, trả lời sai và hoàn thành bài thi.
            </p>
          </div>
          {onToggleSound && (
            <button
              type="button"
              onClick={onToggleSound}
              className={`inline-flex items-center gap-2 px-4 py-2.5 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0 border ${
                soundEnabled
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-600" />
                  <span>Âm thanh: BẬT</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-slate-400" />
                  <span>Âm thanh: TẮT</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Section 2: Storage & Backup */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <Database className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 uppercase tracking-wider">
            Quản lý bộ nhớ LocalStorage
          </h3>
        </div>

        {/* Option 1: Reset Demo Data */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Khôi phục dữ liệu mẫu
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Khôi phục lại bộ 10 câu hỏi Cấu trúc dữ liệu & Giải thuật mẫu ban đầu.
            </p>
          </div>
          <button
            type="button"
            onClick={onResetDemoData}
            className="inline-flex items-center gap-2 px-4 py-2.5 font-semibold text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
          >
            <RotateCcw className="w-4 h-4 text-indigo-600" />
            <span>Khôi phục dữ liệu mẫu</span>
          </button>
        </div>

        {/* Option 2: Export Full App Backup */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Sao lưu toàn bộ dữ liệu
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tải xuống toàn bộ bộ đề, câu hỏi và lịch sử câu trả lời dưới dạng file JSON.
            </p>
          </div>
          <button
            type="button"
            onClick={onExportAllBackup}
            className="inline-flex items-center gap-2 px-4 py-2.5 font-semibold text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Xuất file sao lưu JSON</span>
          </button>
        </div>

        {/* Option 3: Danger Zone */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/50">
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-rose-900 dark:text-rose-200">
              Xóa toàn bộ tài khoản & dữ liệu hệ thống
            </h4>
            <p className="text-xs text-rose-700/80 dark:text-rose-300/80">
              Xóa sạch tất cả tài khoản đã đăng ký, đăng xuất người dùng hiện tại và xóa toàn bộ bộ đề trắc nghiệm khỏi trình duyệt. Thao tác này không thể hoàn tác.
            </p>
          </div>
          <button
            type="button"
            onClick={onClearAllData}
            className="inline-flex items-center gap-2 px-4 py-2.5 font-semibold text-xs text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            <span>Xóa tài khoản & dữ liệu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
