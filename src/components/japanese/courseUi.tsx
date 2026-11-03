import React from 'react';

/* ----------------------------------------------------------------------------
 * Bộ khung giao diện dùng chung cho 5 mục của khóa học tiếng Nhật
 * (Từ vựng · Chữ Hán · Ngữ pháp · Ôn SPK · Source FE) để mọi mục cùng một kiểu.
 * ------------------------------------------------------------------------- */

export type CourseTone = 'orange' | 'rose' | 'indigo' | 'emerald' | 'sky';

/** Lớp màu theo từng mục (viết đầy đủ để Tailwind nhận diện được) */
export const TONE: Record<
  CourseTone,
  { text: string; soft: string; solid: string; ring: string; bar: string; chip: string; dot: string }
> = {
  orange: {
    text: 'text-orange-500 dark:text-orange-400',
    soft: 'bg-orange-50 dark:bg-orange-500/10',
    solid: 'bg-orange-500 hover:bg-orange-400 text-white shadow-orange-500/30',
    ring: 'ring-orange-500/40',
    bar: 'bg-orange-500',
    chip: 'bg-orange-500 text-white shadow-orange-500/25',
    dot: 'bg-orange-500',
  },
  rose: {
    text: 'text-rose-500 dark:text-rose-400',
    soft: 'bg-rose-50 dark:bg-rose-500/10',
    solid: 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/30',
    ring: 'ring-rose-500/40',
    bar: 'bg-rose-500',
    chip: 'bg-rose-500 text-white shadow-rose-500/25',
    dot: 'bg-rose-500',
  },
  indigo: {
    text: 'text-indigo-500 dark:text-indigo-400',
    soft: 'bg-indigo-50 dark:bg-indigo-500/10',
    solid: 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-indigo-500/30',
    ring: 'ring-indigo-500/40',
    bar: 'bg-indigo-500',
    chip: 'bg-indigo-500 text-white shadow-indigo-500/25',
    dot: 'bg-indigo-500',
  },
  emerald: {
    text: 'text-emerald-500 dark:text-emerald-400',
    soft: 'bg-emerald-50 dark:bg-emerald-500/10',
    solid: 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30',
    ring: 'ring-emerald-500/40',
    bar: 'bg-emerald-500',
    chip: 'bg-emerald-500 text-white shadow-emerald-500/25',
    dot: 'bg-emerald-500',
  },
  sky: {
    text: 'text-sky-500 dark:text-sky-400',
    soft: 'bg-sky-50 dark:bg-sky-500/10',
    solid: 'bg-sky-500 hover:bg-sky-400 text-white shadow-sky-500/30',
    ring: 'ring-sky-500/40',
    bar: 'bg-sky-500',
    chip: 'bg-sky-500 text-white shadow-sky-500/25',
    dot: 'bg-sky-500',
  },
};

/** Tiêu đề chung cho mỗi mục: nhãn nhỏ, tiêu đề, mô tả, nút thao tác bên phải */
export const SectionHeader: React.FC<{
  tone: CourseTone;
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  desc?: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ tone, icon, eyebrow, title, desc, actions }) => (
  <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800/80">
    <div className="flex items-start gap-4 min-w-0">
      <div
        className={`w-12 h-12 rounded-2xl ${TONE[tone].soft} ${TONE[tone].text} flex items-center justify-center shrink-0 text-xl font-black`}
      >
        {icon}
      </div>
      <div className="min-w-0 space-y-1">
        <span className={`text-[11px] font-black uppercase tracking-[0.14em] ${TONE[tone].text}`}>{eyebrow}</span>
        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{title}</h2>
        {desc && <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">{desc}</p>}
      </div>
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
  </div>
);

/** Nút lọc dạng viên thuốc, dùng chung cho Bài 4–7, dạng câu hỏi… */
export const FilterChip: React.FC<{
  tone: CourseTone;
  active: boolean;
  onClick: () => void;
  label: React.ReactNode;
  count?: number;
}> = ({ tone, active, onClick, label, count }) => (
  <button
    type="button"
    onClick={onClick}
    className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
      active
        ? `${TONE[tone].chip} shadow-md`
        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
    }`}
  >
    <span>{label}</span>
    {count !== undefined && (
      <span
        className={`min-w-5 px-1.5 rounded-md text-[10px] font-black ${
          active ? 'bg-black/15 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
        }`}
      >
        {count}
      </span>
    )}
  </button>
);

/** Nút chính / phụ dùng chung */
export const ToneButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { tone: CourseTone; variant?: 'solid' | 'ghost' }
> = ({ tone, variant = 'solid', className = '', children, ...rest }) => (
  <button
    type="button"
    {...rest}
    className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95 disabled:opacity-40 ${
      variant === 'solid'
        ? `${TONE[tone].solid} shadow-md`
        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
    } ${className}`}
  >
    {children}
  </button>
);

/** Vòng tiến độ nhỏ */
export const ProgressRing: React.FC<{ value: number; size?: number; stroke?: number; className?: string; children?: React.ReactNode }> = ({
  value,
  size = 64,
  stroke = 6,
  className = 'text-orange-500',
  children,
}) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="stroke-slate-200 dark:stroke-slate-800" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          stroke="currentColor"
          className={`${className} transition-all duration-500`}
          strokeDasharray={c}
          strokeDashoffset={c - (v / 100) * c}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
};
