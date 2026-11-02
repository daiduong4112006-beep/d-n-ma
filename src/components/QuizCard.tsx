import React from 'react';
import { Quiz } from '../types/quiz';
import { Play, Edit3, Trash2, Sliders, AlertTriangle, Layers } from 'lucide-react';

interface QuizCardProps {
  quiz: Quiz;
  onStart: (quizId: string) => void;
  onSelectQuizDetails: (quiz: Quiz) => void;
  onEdit: (quizId: string) => void;
  onDelete: (quizId: string) => void;
  onPracticeQuizMistakes?: (quizId: string) => void;
}

export const QuizCard: React.FC<QuizCardProps> = ({
  quiz,
  onStart,
  onSelectQuizDetails,
  onEdit,
  onDelete,
  onPracticeQuizMistakes,
}) => {
  const totalQuestions = quiz.questions.length;
  let totalAnsweredInQuiz = 0;
  let totalCorrectInQuiz = 0;
  let wrongCountInQuiz = 0;

  quiz.questions.forEach((q) => {
    totalAnsweredInQuiz += q.timesAnswered;
    totalCorrectInQuiz += q.timesCorrect;
    if (q.timesAnswered > 0 && q.timesCorrect / q.timesAnswered < 0.8) {
      wrongCountInQuiz++;
    }
  });

  const accuracyRate =
    totalAnsweredInQuiz > 0 ? Math.round((totalCorrectInQuiz / totalAnsweredInQuiz) * 100) : null;

  // Determine color accent based on subject
  const subjectColors: Record<string, { badge: string; progress: string; hover: string }> = {
    default: {
      badge: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
      progress: 'from-indigo-500 to-violet-500',
      hover: 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400',
    },
  };
  const colors = subjectColors.default;

  return (
    <div
      className="group relative bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-lg dark:hover:shadow-slate-900/50 transition-all duration-200 flex flex-col justify-between gap-3 hover:-translate-y-0.5"
    >
      {/* Header: Subject + Actions */}
      <div className="flex items-start justify-between gap-3">
        <div
          className="space-y-1.5 cursor-pointer flex-1"
          onClick={() => onSelectQuizDetails(quiz)}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-lg ${colors.badge}`}>
              {quiz.subject || 'Tổng hợp'}
            </span>
            {quiz.topic && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate max-w-[140px]">
                • {quiz.topic}
              </span>
            )}
          </div>
          <h3 className={`text-sm font-extrabold text-slate-900 dark:text-slate-100 ${colors.hover} transition-colors line-clamp-1`}>
            {quiz.title}
          </h3>
        </div>

        {/* Edit & Delete (visible on hover) */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            type="button"
            onClick={() => onEdit(quiz.id)}
            title="Sửa bộ đề"
            className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(quiz.id)}
            title="Xóa bộ đề"
            className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Description */}
      <p
        className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed cursor-pointer"
        onClick={() => onSelectQuizDetails(quiz)}
      >
        {quiz.description || 'Chưa có mô tả cho bộ câu hỏi này.'}
      </p>

      {/* Mini Stats Grid */}
      <div
        onClick={() => onSelectQuizDetails(quiz)}
        className="grid grid-cols-3 gap-2 cursor-pointer"
      >
        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-center">
          <span className="text-[10px] font-medium text-slate-400 block">Câu hỏi</span>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
            {totalQuestions}
          </span>
        </div>

        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-center">
          <span className="text-[10px] font-medium text-slate-400 block">Điểm</span>
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">
            {quiz.lastScore !== undefined ? `${quiz.lastScore}/${quiz.lastTotal || totalQuestions}` : '---'}
          </span>
        </div>

        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-center">
          <span className="text-[10px] font-medium text-slate-400 block">Chính xác</span>
          <span className={`text-xs font-bold mt-0.5 block ${
            accuracyRate !== null
              ? accuracyRate >= 80 ? 'text-emerald-600 dark:text-emerald-400'
                : accuracyRate >= 50 ? 'text-amber-600 dark:text-amber-400'
                : 'text-rose-600 dark:text-rose-400'
              : 'text-slate-400'
          }`}>
            {accuracyRate !== null ? `${accuracyRate}%` : '---'}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      {accuracyRate !== null && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${colors.progress} rounded-full transition-all duration-500`}
              style={{ width: `${accuracyRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onSelectQuizDetails(quiz)}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 rounded-xl transition-all cursor-pointer"
        >
          <Sliders className="w-4 h-4" />
          <span>Xem chi tiết & Ôn tập</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onStart(quiz.id)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Vào Thi</span>
          </button>

          {onPracticeQuizMistakes && (
            <button
              type="button"
              onClick={() => onPracticeQuizMistakes(quiz.id)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl transition-all cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Câu hay sai</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
