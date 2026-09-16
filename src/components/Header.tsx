import React, { useState } from 'react';
import {
  GraduationCap,
  BookOpen,
  FileSpreadsheet,
  Settings,
  Plus,
  LogIn,
  ShieldCheck,
  Volume2,
  VolumeX,
  Search,
  Filter,
  Menu,
  X,
  Sun,
  Moon,
  Star,
  Languages,
} from 'lucide-react';
import { sound } from '../utils/audio';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onCreateNewQuiz: () => void;
  title: string;
  subtitle?: string;
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
  selectedSubject?: string;
  onSubjectChange?: (val: string) => void;
  subjectsList?: string[];
  currentUser?: { email: string; name: string } | null;
  onOpenAuthModal?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onCreateNewQuiz,
  title,
  subtitle,
  searchTerm,
  onSearchChange,
  selectedSubject,
  onSubjectChange,
  subjectsList = [],
  currentUser,
  onOpenAuthModal,
  isDarkMode,
  onToggleDarkMode,
  soundEnabled,
  onToggleSound,
}) => {
  const [internalSoundOn, setInternalSoundOn] = useState(sound.isEnabled());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const soundOn = soundEnabled !== undefined ? soundEnabled : internalSoundOn;

  const toggleSound = () => {
    if (onToggleSound) {
      onToggleSound();
    } else {
      const next = !internalSoundOn;
      sound.setEnabled(next);
      setInternalSoundOn(next);
      if (next) sound.playCorrect();
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Bộ đề của tôi', icon: BookOpen },
    { id: 'saved-vocabulary', label: 'Từ cần lưu ý ghi nhớ', icon: Star },
    { id: 'japanese', label: 'Học Tiếng Nhật', icon: Languages },
    { id: 'import-export', label: 'Nhập / Xuất đề thi', icon: FileSpreadsheet },
    { id: 'settings', label: 'Cài đặt hệ thống', icon: Settings },
  ];

  const handleCreateQuizClick = () => {
    if (!currentUser) {
      if (onOpenAuthModal) onOpenAuthModal();
    } else {
      onCreateNewQuiz();
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-all shadow-2xs">
      {/* Top Primary Horizontal Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 md:gap-6">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab('dashboard');
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-extrabold text-base text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                  DUN MASTER
                </h1>
                <p className="text-[10px] font-medium text-slate-400 mt-0.5 hidden sm:block">
                  Ôn luyện trắc nghiệm MCQ
                </p>
              </div>
            </button>
          </div>

          {/* Center Navigation Tabs (Desktop) */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                activeTab === item.id ||
                (item.id === 'dashboard' && activeTab === 'my-quizzes');

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === 'import-export' && !currentUser) {
                      if (onOpenAuthModal) onOpenAuthModal();
                      return;
                    }
                    setActiveTab(item.id);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* User Auth Button */}
            {onOpenAuthModal && (
              <button
                type="button"
                onClick={onOpenAuthModal}
                title={currentUser ? `Tài khoản: ${currentUser.email}` : 'Đăng nhập'}
                className={`px-3 py-2 text-xs font-extrabold rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-2xs ${
                  currentUser
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                    : 'bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                }`}
              >
                {currentUser ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <LogIn className="w-4 h-4 text-indigo-600" />
                )}
                <span className="max-w-[90px] sm:max-w-[140px] truncate">
                  {currentUser ? currentUser.name : 'Đăng nhập'}
                </span>
              </button>
            )}

            {/* Dark/Light Theme Toggle Button */}
            <button
              type="button"
              onClick={onToggleDarkMode}
              title={isDarkMode ? 'Chế độ tối (Bấm để chuyển Sáng)' : 'Chế độ sáng (Bấm để chuyển Tối)'}
              className={`hidden sm:flex px-2.5 py-2 text-xs font-extrabold rounded-xl border items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                isDarkMode
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
              }`}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
              <span className="hidden sm:inline text-[11px] font-bold">
                {isDarkMode ? 'Tối' : 'Sáng'}
              </span>
            </button>

            {/* Sound Toggle Button */}
            <button
              type="button"
              onClick={toggleSound}
              title={soundOn ? 'Âm thanh: Đang BẬT' : 'Âm thanh: Đang TẮT'}
              className={`hidden sm:flex px-2.5 py-2 text-xs font-extrabold rounded-xl border items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                soundOn
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
              }`}
            >
              {soundOn ? <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline text-[11px] font-bold">
                {soundOn ? 'Âm thanh' : 'Tắt âm'}
              </span>
            </button>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden cursor-pointer"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-slate-200/80 dark:border-slate-800 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                activeTab === item.id ||
                (item.id === 'dashboard' && activeTab === 'my-quizzes');

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === 'import-export' && !currentUser) {
                      if (onOpenAuthModal) onOpenAuthModal();
                      setIsMobileMenuOpen(false);
                      return;
                    }
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center gap-2 px-1">
              {/* Mobile Theme Toggle */}
              <button
                type="button"
                onClick={onToggleDarkMode}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-2 transition-all ${
                  isDarkMode
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-600'
                }`}
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
                <span>{isDarkMode ? 'Chế độ Sáng' : 'Chế độ Tối'}</span>
              </button>

              {/* Mobile Sound Toggle */}
              <button
                type="button"
                onClick={toggleSound}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-2 transition-all ${
                  soundOn
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                {soundOn ? <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
                <span>{soundOn ? 'Âm thanh: BẬT' : 'Âm thanh: TẮT'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sub-Header context bar (Page Title + Search / Filter) */}
      <div className="bg-slate-50/60 dark:bg-slate-950/40 border-t border-slate-200/60 dark:border-slate-800/60 px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Active Page Title & Subtitle */}
          <div>
            <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {subtitle}
              </p>
            )}
          </div>

          {/* Search & Subject Filter (If provided) */}
          {onSearchChange && (
            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm bộ đề..."
                  value={searchTerm || ''}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>

              {onSubjectChange && (
                <div className="relative shrink-0">
                  <select
                    value={selectedSubject || 'All'}
                    onChange={(e) => onSubjectChange(e.target.value)}
                    className="pl-8 pr-7 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none"
                  >
                    <option value="All">Tất cả môn học</option>
                    {subjectsList.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                  <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
