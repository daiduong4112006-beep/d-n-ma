import React, { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal, ChevronDown, Check, X } from 'lucide-react';

interface Group {
  bai: string;
  subs: string[];
}

interface Props {
  groups: Group[];
  picks: string[];
  /** Nhãn ngắn của lựa chọn hiện tại, vd "4–6" */
  summary: string;
  onApply: (next: string[]) => void;
}

/** Nút "Bộ lọc bài" mở bảng chọn bài / mục (4.1, 4.2…) cho bài tổng hợp từ vựng. */
export const LessonPickerFilter: React.FC<Props> = ({ groups, picks, summary, onApply }) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(picks);
  const boxRef = useRef<HTMLDivElement>(null);
  const all = groups.flatMap((g) => g.subs);

  useEffect(() => {
    if (open) setDraft(picks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const has = (k: string) => draft.includes(k);
  const toggleSub = (k: string) => setDraft((d) => (d.includes(k) ? d.filter((x) => x !== k) : [...d, k]));
  const toggleBai = (g: Group) => {
    const allOn = g.subs.every(has);
    setDraft((d) => (allOn ? d.filter((k) => !g.subs.includes(k)) : [...new Set([...d, ...g.subs])]));
  };
  const changed = draft.length !== picks.length || draft.some((k) => !picks.includes(k));

  return (
    <div ref={boxRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`inline-flex items-center gap-2 pl-3 pr-2.5 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
          open
            ? 'border-orange-400 bg-orange-500/10 text-orange-600 dark:text-orange-400'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-orange-300'
        }`}
      >
        <SlidersHorizontal className="w-4 h-4" />
        Bộ lọc bài
        <span className="px-2 py-0.5 rounded-lg bg-orange-500 text-white text-[11px] font-black">Bài {summary}</span>
        <span className="text-[11px] font-semibold text-slate-400">
          {picks.length}/{all.length} mục
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-40 w-[min(380px,calc(100vw-2rem))] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div>
              <div className="text-sm font-black text-slate-900 dark:text-white">Chọn bài đã học</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Chỉ học và luyện các từ của mục được chọn.</div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" aria-label="Đóng">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3 px-4 pb-2 text-[11px] font-bold">
            <button type="button" onClick={() => setDraft(all)} className="text-orange-600 dark:text-orange-400 hover:underline cursor-pointer">
              Chọn tất cả
            </button>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <button type="button" onClick={() => setDraft([])} className="text-slate-500 hover:underline cursor-pointer">
              Bỏ chọn hết
            </button>
          </div>

          <div className="max-h-[50vh] overflow-y-auto px-2 pb-2">
            {groups.map((g) => {
              const on = g.subs.filter(has).length;
              const full = on === g.subs.length;
              return (
                <div key={g.bai} className="rounded-xl px-2 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="accent-orange-500 w-4 h-4"
                      checked={full}
                      ref={(el) => {
                        if (el) el.indeterminate = on > 0 && !full;
                      }}
                      onChange={() => toggleBai(g)}
                    />
                    <span className="flex-1 text-sm font-black text-slate-800 dark:text-slate-100">Bài {g.bai}</span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {on}/{g.subs.length}
                    </span>
                  </label>
                  <div className="mt-2 ml-6 flex flex-wrap gap-1.5">
                    {g.subs.map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => toggleSub(k)}
                        aria-pressed={has(k)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-black transition-colors cursor-pointer ${
                          has(k)
                            ? 'border-orange-400 bg-orange-500/10 text-orange-600 dark:text-orange-400'
                            : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        {has(k) && <Check className="w-3 h-3" />}
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 dark:border-slate-800">
            <span className={`text-[11px] font-semibold ${draft.length ? 'text-slate-500' : 'text-rose-500'}`}>
              {draft.length ? `Đã chọn ${draft.length}/${all.length} mục` : 'Chọn ít nhất 1 mục'}
            </span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                Hủy
              </button>
              <button
                type="button"
                disabled={!draft.length || !changed}
                onClick={() => {
                  onApply(draft);
                  setOpen(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-black text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
