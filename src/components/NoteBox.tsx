import React from 'react';
import { Bookmark } from 'lucide-react';

interface NoteBoxProps {
  note?: string;
  className?: string;
}

export const NoteBox: React.FC<NoteBoxProps> = ({ note, className = '' }) => {
  if (!note) return null;

  return (
    <div
      className={`p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 text-amber-950 dark:text-amber-200 transition-all ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <div className="p-1 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
          <Bookmark className="w-3.5 h-3.5" />
        </div>
        <div className="space-y-0.5">
          <h5 className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Ghi chú ghi nhớ
          </h5>
          <p className="text-xs text-amber-900 dark:text-amber-200 leading-normal">{note}</p>
        </div>
      </div>
    </div>
  );
};
