import React from 'react';
import { Check, X, Award } from 'lucide-react';

interface ProgressBarProps {
  currentIndex: number;
  totalQuestions: number;
  score: number;
  answeredCount: number;
  correctCount: number;
  wrongCount: number;
  isExamMode?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentIndex,
  totalQuestions,
  answeredCount,
  correctCount,
  wrongCount,
  isExamMode = false,
}) => {
  const percentage = totalQuestions > 0 ? Math.round(((currentIndex + 1) / totalQuestions) * 100) : 0;

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
      {/* Upper header */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900 dark:text-slate-100 text-base">
            Câu {currentIndex + 1}
          </span>
          <span className="text-slate-400 font-medium">/ {totalQuestions}</span>
          <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
            Đã hoàn thành {percentage}%
          </span>
        </div>

        {/* Live Metrics: Hide during Exam Mode to prevent revealing right/wrong status */}
        <div className="flex items-center gap-3">
          {isExamMode ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-100 dark:border-indigo-900/50">
              <span>Đã trả lời: {answeredCount} / {totalQuestions} câu</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                <Award className="w-3.5 h-3.5 text-indigo-500" />
                <span>Điểm: {correctCount} / {answeredCount}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 text-xs font-bold border border-emerald-200/60 dark:border-emerald-800/50">
                  <Check className="w-3.5 h-3.5" />
                  Đúng: {correctCount}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 text-xs font-bold border border-rose-200/60 dark:border-rose-800/50">
                  <X className="w-3.5 h-3.5" />
                  Sai: {wrongCount}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bar indicator */}
      <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
        <div
          className="h-full bg-linear-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
