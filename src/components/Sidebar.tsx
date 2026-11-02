import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  BookOpen,
  FileSpreadsheet,
  Settings,
  LogIn,
  ShieldCheck,
  Volume2,
  VolumeX,
  Star,
  Languages,
  Sun,
  Moon,
  ChevronLeft,
  Search,
  Filter,
  Plus,
  Menu,
  X,
} from 'lucide-react';
import { sound } from '../utils/audio';

interface SidebarProps {
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

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onCreateNewQuiz,
  currentUser,
  onOpenAuthModal,
  isDarkMode,
  onToggleDarkMode,
  soundEnabled,
  onToggleSound,
}) => {
  const [internalSoundOn, setInternalSoundOn] = useState(sound.isEnabled());
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved === 'true';
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);

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

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('sidebar_collapsed', String(next));
  };

  // Close mobile menu on tab change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [activeTab]);

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setIsMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Bộ đề của tôi', icon: BookOpen, color: 'indigo' },
    { id: 'saved-vocabulary', label: 'Từ cần ghi nhớ', icon: Star, color: 'amber' },
    { id: 'japanese', label: 'Học Tiếng Nhật', icon: Languages, color: 'rose' },
    { id: 'import-export', label: 'Nhập / Xuất đề', icon: FileSpreadsheet, color: 'cyan' },
  ];

  const systemItems = [
    { id: 'settings', label: 'Cài đặt hệ thống', icon: Settings, color: 'slate' },
  ];

  const colorMap: Record<string, { bg: string; text: string; activeBg: string; activeText: string }> = {
    indigo: { bg: 'bg-indigo-500/15', text: 'text-indigo-400', activeBg: 'bg-indigo-500/15', activeText: 'text-indigo-300' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', activeBg: 'bg-amber-500/10', activeText: 'text-amber-300' },
    rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', activeBg: 'bg-rose-500/10', activeText: 'text-rose-300' },
    cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', activeBg: 'bg-cyan-500/10', activeText: 'text-cyan-300' },
    slate: { bg: 'bg-slate-500/10', text: 'text-slate-400', activeBg: 'bg-slate-500/10', activeText: 'text-slate-300' },
  };

  const isActive = (id: string) =>
    activeTab === id || (id === 'dashboard' && activeTab === 'my-quizzes');

  const handleNavClick = (id: string) => {
    if (id === 'import-export' && !currentUser) {
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }
    setActiveTab(id);
  };

  const renderNavItem = (item: { id: string; label: string; icon: React.ElementType; color: string }) => {
    const Icon = item.icon;
    const active = isActive(item.id);
    const colors = colorMap[item.color] || colorMap.slate;

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleNavClick(item.id)}
        title={isCollapsed ? item.label : undefined}
        className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer border ${
          active
            ? 'bg-gradient-to-r from-indigo-500/10 to-violet-500/5 border-indigo-500/30 dark:border-indigo-500/40'
            : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/50'
        }`}
      >
        <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-4 h-4 ${colors.text}`} />
        </div>
        {!isCollapsed && (
          <span className={`truncate transition-colors ${
            active ? colors.activeText + ' font-bold' : 'text-slate-600 dark:text-slate-400'
          }`}>
            {item.label}
          </span>
        )}

        {/* Tooltip for collapsed state */}
        {isCollapsed && (
          <span className="absolute left-full ml-3 px-3 py-1.5 rounded-lg bg-slate-800 dark:bg-slate-700 text-slate-100 text-xs font-semibold whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl border border-slate-700 dark:border-slate-600 pointer-events-none">
            {item.label}
          </span>
        )}
      </button>
    );
  };

  // Desktop Sidebar
  const sidebarContent = (
    <>
      {/* Logo Section */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-200/60 dark:border-slate-800/60 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-2.5 text-left group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 tracking-tight leading-none truncate">
                DUN MASTER
              </h1>
              <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">
                Ôn luyện trắc nghiệm MCQ
              </p>
            </div>
          )}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {!isCollapsed && (
          <div className="px-2 mb-3">
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">
              Menu chính
            </span>
          </div>
        )}

        {navItems.map(renderNavItem)}

        {!isCollapsed && (
          <div className="px-2 mt-6 mb-3">
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">
              Hệ thống
            </span>
          </div>
        )}
        {isCollapsed && <div className="my-4 mx-2 h-px bg-slate-200 dark:bg-slate-800" />}

        {systemItems.map(renderNavItem)}
      </nav>

      {/* Bottom Section: Controls + User */}
      <div className="border-t border-slate-200/60 dark:border-slate-800/60 px-3 py-3 space-y-2 shrink-0">
        {/* Theme & Sound toggles */}
        {!isCollapsed ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleDarkMode}
              className={`flex-1 py-2 px-2.5 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                isDarkMode
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
              }`}
              title={isDarkMode ? 'Chuyển sang chế độ Sáng' : 'Chuyển sang chế độ Tối'}
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              {isDarkMode ? 'Tối' : 'Sáng'}
            </button>
            <button
              type="button"
              onClick={toggleSound}
              className={`flex-1 py-2 px-2.5 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                soundOn
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-500'
              }`}
              title={soundOn ? 'Âm thanh: BẬT' : 'Âm thanh: TẮT'}
            >
              {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              {soundOn ? 'Âm thanh' : 'Tắt âm'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onToggleDarkMode}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer transition-all ${
                isDarkMode
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
              }`}
              title={isDarkMode ? 'Chuyển sang Sáng' : 'Chuyển sang Tối'}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={toggleSound}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer transition-all ${
                soundOn
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
              }`}
              title={soundOn ? 'Âm thanh: BẬT' : 'Âm thanh: TẮT'}
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        )}

        {!isCollapsed && <div className="h-px bg-slate-200/60 dark:bg-slate-800/60 my-1" />}

        {/* User Profile */}
        {onOpenAuthModal && (
          <button
            type="button"
            onClick={onOpenAuthModal}
            title={currentUser ? `Tài khoản: ${currentUser.email}` : 'Đăng nhập'}
            className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all cursor-pointer group"
          >
            {currentUser ? (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-black shrink-0 shadow-md">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center shrink-0">
                <LogIn className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
            )}
            {!isCollapsed && (
              <div className="text-left min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {currentUser ? currentUser.name : 'Đăng nhập'}
                </p>
                {currentUser && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                    {currentUser.email}
                  </p>
                )}
              </div>
            )}
          </button>
        )}
      </div>

      {/* Collapse/Expand Toggle (desktop only) */}
      <button
        type="button"
        onClick={toggleCollapse}
        className="hidden md:flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 items-center justify-center cursor-pointer hover:bg-indigo-600 hover:border-indigo-500 hover:text-white transition-all z-50 shadow-lg text-slate-400"
        title={isCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
      >
        <ChevronLeft
          className={`w-3.5 h-3.5 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
        />
      </button>
    </>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden sticky top-0 z-40 h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between px-4 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md">
            <GraduationCap className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">DUN MASTER</span>
        </button>
        <button
          type="button"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Slide-out Sidebar */}
      <aside
        className={`md:hidden fixed top-14 left-0 bottom-0 z-50 w-[280px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-2 mb-3">
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">
              Menu chính
            </span>
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.id);
            const colors = colorMap[item.color] || colorMap.slate;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer border ${
                  active
                    ? 'bg-gradient-to-r from-indigo-500/10 to-violet-500/5 border-indigo-500/30 dark:border-indigo-500/40'
                    : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4 h-4 ${colors.text}`} />
                </div>
                <span className={active ? `${colors.activeText} font-bold` : 'text-slate-600 dark:text-slate-400'}>
                  {item.label}
                </span>
              </button>
            );
          })}

          <div className="px-2 mt-6 mb-3">
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">
              Hệ thống
            </span>
          </div>
          {systemItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.id);
            const colors = colorMap[item.color] || colorMap.slate;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer border ${
                  active
                    ? 'bg-gradient-to-r from-indigo-500/10 to-violet-500/5 border-indigo-500/30'
                    : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4 h-4 ${colors.text}`} />
                </div>
                <span className={active ? `${colors.activeText} font-bold` : 'text-slate-600 dark:text-slate-400'}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Mobile bottom controls */}
        <div className="border-t border-slate-200/60 dark:border-slate-800/60 px-3 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleDarkMode}
              className={`flex-1 py-2 px-2.5 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                isDarkMode
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-600'
              }`}
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              {isDarkMode ? 'Chế độ Sáng' : 'Chế độ Tối'}
            </button>
            <button
              type="button"
              onClick={toggleSound}
              className={`flex-1 py-2 px-2.5 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                soundOn
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
              }`}
            >
              {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              {soundOn ? 'Âm thanh' : 'Tắt âm'}
            </button>
          </div>

          {onOpenAuthModal && (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all cursor-pointer"
            >
              {currentUser ? (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-black shrink-0 shadow-md">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center shrink-0">
                  <LogIn className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
              )}
              <div className="text-left min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {currentUser ? currentUser.name : 'Đăng nhập'}
                </p>
                {currentUser && (
                  <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
                )}
              </div>
            </button>
          )}
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col relative shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-r border-slate-200/80 dark:border-slate-800 h-screen transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
};

// ContentHeader: replaces the old sub-header, now sits at the top of the main content area
interface ContentHeaderProps {
  title: string;
  subtitle?: string;
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
  selectedSubject?: string;
  onSubjectChange?: (val: string) => void;
  subjectsList?: string[];
  onCreateNewQuiz?: () => void;
}

export const ContentHeader: React.FC<ContentHeaderProps> = ({
  title,
  subtitle,
  searchTerm,
  onSearchChange,
  selectedSubject,
  onSubjectChange,
  subjectsList = [],
  onCreateNewQuiz,
}) => {
  return (
    <header className="border-b border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/50 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3 sticky top-0 md:top-0 z-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Page Title */}
        <div>
          <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2.5">
          {onSearchChange && (
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm bộ đề..."
                value={searchTerm || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
          )}

          {onSubjectChange && (
            <div className="relative shrink-0">
              <select
                value={selectedSubject || 'All'}
                onChange={(e) => onSubjectChange(e.target.value)}
                className="pl-8 pr-7 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none"
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

          {onCreateNewQuiz && (
            <button
              type="button"
              onClick={onCreateNewQuiz}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-lg shadow-indigo-500/20 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Tạo đề mới</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
