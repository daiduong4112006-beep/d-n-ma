import React, { useState } from 'react';
import { QuizAttempt, QuestionResult, Question } from '../types/quiz';
import { ExplanationBox } from '../components/ExplanationBox';
import { NoteBox } from '../components/NoteBox';
import { DifficultyBadge } from '../components/DifficultyBadge';
import { AiQuestionModal } from '../components/AiQuestionModal';
import { CheckCircle2, XCircle, ArrowLeft, RotateCcw, Filter, Sparkles } from 'lucide-react';

interface ReviewPageProps {
  attempt: QuizAttempt;
  initialFilter?: 'all' | 'wrong';
  onBackToDashboard: () => void;
  onRetry: () => void;
}

export const ReviewPage: React.FC<ReviewPageProps> = ({
  attempt,
  initialFilter = 'all',
  onBackToDashboard,
  onRetry,
}) => {
  const [filter, setFilter] = useState<'all' | 'wrong'>(initialFilter);
  const [aiModalConfig, setAiModalConfig] = useState<{
    question: Question;
    selectedAnswer: number | null;
    optionIndex: number | null;
  } | null>(null);

  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

  const displayedResults =
    filter === 'wrong'
      ? attempt.questionResults.filter((r) => !r.isCorrect)
      : attempt.questionResults;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Xem lại bài thi: {attempt.quizTitle}
            </h2>
            <p className="text-xs text-slate-400">
              Xem lại chi tiết từng câu hỏi, lựa chọn của bạn và đáp án đúng kèm giải thích.
            </p>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Tất cả ({attempt.totalQuestions} câu)
          </button>
          <button
            type="button"
            onClick={() => setFilter('wrong')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filter === 'wrong'
                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Các câu sai ({attempt.wrongAnswers} câu)
          </button>
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-6">
        {displayedResults.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
              Không có câu trả lời sai nào!
            </h3>
            <p className="text-xs text-slate-400">
              Bạn đã trả lời đúng tất cả các câu hỏi này. Rất tuyệt vời!
            </p>
          </div>
        ) : (
          displayedResults.map((res, idx) => {
            return (
              <div
                key={res.questionId || idx}
                className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs space-y-5"
              >
                {/* Question Header */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Câu {idx + 1}
                    </span>
                    <DifficultyBadge difficulty={res.difficulty} />
                    {((res.correctAnswers && res.correctAnswers.length > 1) || (Array.isArray(res.correctAnswer) && res.correctAnswer.length > 1)) && (
                      <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                        Đa đáp án ({(res.correctAnswers || [res.correctAnswer]).map((i) => letters[i] || String.fromCharCode(65 + i)).join(', ')})
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setAiModalConfig({
                          question: {
                            id: res.questionId,
                            question: res.questionText,
                            options: res.options,
                            correctAnswer: res.correctAnswer,
                            correctAnswers: res.correctAnswers,
                            explanation: res.explanation,
                            note: res.note,
                            difficulty: res.difficulty,
                            imageUrl: res.imageUrl,
                            timesAnswered: 0,
                            timesCorrect: 0,
                            timesWrong: 0,
                            mastered: false,
                          },
                          selectedAnswer: Array.isArray(res.selectedAnswer) ? res.selectedAnswer[0] ?? 0 : res.selectedAnswer,
                          optionIndex: Array.isArray(res.selectedAnswer) ? res.selectedAnswer[0] ?? 0 : res.selectedAnswer,
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs hover:scale-105"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Hỏi AI Giải thích</span>
                    </button>
                  </div>

                  <div className="shrink-0">
                    {res.isCorrect ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 rounded-full border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Chính xác
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/50 rounded-full border border-rose-200 dark:border-rose-800">
                        <XCircle className="w-3.5 h-3.5" /> Chưa đúng
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Text & Image */}
                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {res.questionText}
                  </h3>
                  {res.imageUrl && (
                    <div className="rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 max-h-[300px] bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-2">
                      <img
                        src={res.imageUrl}
                        alt="Hình ảnh đính kèm"
                        referrerPolicy="no-referrer"
                        className="max-h-[280px] w-auto object-contain rounded-xl"
                      />
                    </div>
                  )}
                </div>

                {/* Options List with status & AI buttons */}
                <div className="grid grid-cols-1 gap-2.5">
                  {(() => {
                    const correctList =
                      res.correctAnswers && res.correctAnswers.length > 0
                        ? res.correctAnswers
                        : typeof res.correctAnswer === 'number'
                        ? [res.correctAnswer]
                        : [];

                    const userSelection =
                      res.selectedAnswers && res.selectedAnswers.length > 0
                        ? res.selectedAnswers
                        : Array.isArray(res.selectedAnswer)
                        ? res.selectedAnswer
                        : typeof res.selectedAnswer === 'number' && res.selectedAnswer >= 0
                        ? [res.selectedAnswer]
                        : [];

                    return res.options.map((optText, optIdx) => {
                      const isUserChoice = userSelection.includes(optIdx);
                      const isCorrectOpt = correctList.includes(optIdx);

                      let rowStyle =
                        'p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-3 ';

                      if (isCorrectOpt) {
                        rowStyle +=
                          'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-950 dark:text-emerald-100 font-bold';
                      } else if (isUserChoice && !isCorrectOpt) {
                        rowStyle +=
                          'bg-rose-50 dark:bg-rose-950/40 border-rose-400 text-rose-950 dark:text-rose-100 font-bold';
                      } else {
                        rowStyle +=
                          'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 opacity-80';
                      }

                      return (
                        <div key={optIdx} className={rowStyle}>
                          <div className="flex items-center gap-2.5 flex-1">
                            <span className="font-bold opacity-70">
                              [{letters[optIdx] || String.fromCharCode(65 + optIdx)}]
                            </span>
                            <span>{optText}</span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isCorrectOpt && (
                              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                                Đáp án đúng
                              </span>
                            )}
                            {isUserChoice && !isCorrectOpt && (
                              <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">
                                Lựa chọn của bạn
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                setAiModalConfig({
                                  question: {
                                    id: res.questionId,
                                    question: res.questionText,
                                    options: res.options,
                                    correctAnswer: res.correctAnswer,
                                    correctAnswers: res.correctAnswers,
                                    explanation: res.explanation,
                                    note: res.note,
                                    difficulty: res.difficulty,
                                    imageUrl: res.imageUrl,
                                    timesAnswered: 0,
                                    timesCorrect: 0,
                                    timesWrong: 0,
                                    mastered: false,
                                  },
                                  selectedAnswer: Array.isArray(res.selectedAnswer) ? res.selectedAnswer[0] ?? 0 : res.selectedAnswer,
                                  optionIndex: optIdx,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer hover:scale-105"
                            >
                              <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                              <span>Hỏi AI</span>
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Explanation and Note */}
                <div className="space-y-3 pt-2">
                  <ExplanationBox explanation={res.explanation} />
                  {res.note && <NoteBox note={res.note} />}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Sticky Action */}
      <div className="flex justify-between items-center gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={onBackToDashboard}
          className="px-5 py-2.5 font-bold text-xs text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-xl transition-all cursor-pointer"
        >
          Trở về Trang chủ
        </button>

        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-6 py-2.5 font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Làm lại bài thi</span>
        </button>
      </div>
      {/* AI Question Modal */}
      {aiModalConfig && (
        <AiQuestionModal
          question={aiModalConfig.question}
          isOpen={!!aiModalConfig}
          onClose={() => setAiModalConfig(null)}
          selectedAnswer={aiModalConfig.selectedAnswer}
          initialOptionIndex={aiModalConfig.optionIndex}
        />
      )}
    </div>
  );
};
