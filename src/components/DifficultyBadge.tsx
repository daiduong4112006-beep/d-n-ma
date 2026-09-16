import React from 'react';
import { Difficulty } from '../types/quiz';

interface DifficultyBadgeProps {
  difficulty: Difficulty;
  className?: string;
}

export const DifficultyBadge: React.FC<DifficultyBadgeProps> = ({ difficulty, className = '' }) => {
  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';

  if (difficulty === 'Easy') {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50';
  } else if (difficulty === 'Medium') {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50';
  } else if (difficulty === 'Hard') {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${colorClasses} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          difficulty === 'Easy' ? 'bg-emerald-500' : difficulty === 'Medium' ? 'bg-amber-500' : 'bg-rose-500'
        }`}
      />
      {difficulty === 'Easy' ? 'Dễ' : difficulty === 'Medium' ? 'Trung bình' : 'Khó'}
    </span>
  );
};
