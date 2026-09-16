import React from 'react';
import { ClickableText } from './ClickableText';
import { CheckCircle2, XCircle, Sparkles } from 'lucide-react';

interface AnswerOptionProps {
  index: number;
  letter: string;
  optionText: string;
  isSelected: boolean;
  isCorrectOption: boolean;
  isAnswered: boolean;
  userSelectedCorrect: boolean;
  isExamMode?: boolean;
  onSelect: () => void;
  onAskAi?: (e: React.MouseEvent) => void;
  quizId?: string;
  quizTitle?: string;
}

export const AnswerOption: React.FC<AnswerOptionProps> = ({
  index,
  letter,
  optionText,
  isSelected,
  isCorrectOption,
  isAnswered,
  isExamMode = false,
  onSelect,
  onAskAi,
  quizId,
  quizTitle,
}) => {
  let containerClasses =
    'relative flex items-center justify-between w-full p-4 text-left rounded-xl border-2 transition-all duration-200 cursor-pointer shadow-xs group ';
  let badgeClasses =
    'flex items-center justify-center w-8 h-8 text-xs font-bold rounded-lg border transition-all shrink-0 ';

  if (!isAnswered) {
    // Idle state
    if (isSelected) {
      containerClasses += 'border-indigo-600 bg-indigo-50/50 text-indigo-950 dark:bg-indigo-950/40 dark:text-indigo-100';
      badgeClasses += 'bg-indigo-600 text-white border-indigo-600';
    } else {
      containerClasses +=
        'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50 dark:hover:bg-slate-800/60';
      badgeClasses +=
        'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
  } else {
    // Answered / Locked state (only shown if instantFeedback is enabled or in review)
    if (isCorrectOption) {
      containerClasses +=
        'border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-100 font-medium shadow-sm';
      badgeClasses += 'bg-emerald-600 text-white border-emerald-600';
    } else if (isSelected && !isCorrectOption) {
      containerClasses +=
        'border-rose-500 bg-rose-50/90 dark:bg-rose-950/50 text-rose-950 dark:text-rose-100 font-medium';
      badgeClasses += 'bg-rose-600 text-white border-rose-600';
    } else {
      containerClasses +=
        'border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-600 opacity-80 hover:opacity-100 cursor-default';
      badgeClasses += 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200';
    }
  }

  const displayLetter = letter || String.fromCharCode(65 + index);

  return (
    <div className={containerClasses} onClick={() => !isAnswered && onSelect()}>
      <div className="flex items-center gap-3.5 pr-2 flex-1">
        <span className={badgeClasses}>[{displayLetter}]</span>
        <span className="text-sm font-medium leading-relaxed">
          <ClickableText text={optionText} isExamMode={isExamMode} quizId={quizId} quizTitle={quizTitle} />
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-2">
        {!isAnswered && isSelected && (
          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 animate-in zoom-in-75 duration-150 shadow-xs">
            ✓
          </div>
        )}

        {onAskAi && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAskAi(e);
            }}
            title={`Hỏi AI giải thích cụ thể phương án [${displayLetter}] này`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/80 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">Hỏi AI [{displayLetter}]</span>
          </button>
        )}

        {isAnswered && (
          <>
            {isCorrectOption && (
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wide bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-4 h-4" />
                <span>Đúng</span>
              </div>
            )}
            {isSelected && !isCorrectOption && (
              <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold text-xs uppercase tracking-wide bg-rose-100 dark:bg-rose-900/60 px-2.5 py-1 rounded-full">
                <XCircle className="w-4 h-4" />
                <span>Sai</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
