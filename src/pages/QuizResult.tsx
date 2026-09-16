import React, { useState } from 'react';
import { QuizAttempt, Question } from '../types/quiz';
import { ClickableText } from '../components/ClickableText';
import { AiQuestionModal } from '../components/AiQuestionModal';
import { Trophy, CheckCircle2, XCircle, RotateCcw, Eye, ArrowLeft, Sparkles, BookOpen, FileText } from 'lucide-react';

interface QuizResultProps {
  attempt: QuizAttempt;
  onReviewAll: () => void;
  onReviewWrong: () => void;
  onRetry: () => void;
  onDashboard: () => void;
}

export const QuizResult: React.FC<QuizResultProps> = ({
  attempt,
  onReviewAll,
  onReviewWrong,
  onRetry,
  onDashboard,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'wrong' | 'correct'>('all');
  const [aiModalConfig, setAiModalConfig] = useState<{
    question: Question;
    selectedAnswer: number | null;
    optionIndex: number | null;
  } | null>(null);
  const isHighAccuracy = attempt.accuracy >= 80;
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

  const displayedResults = attempt.questionResults.filter((r) => {
    if (filterMode === 'wrong') return !r.isCorrect;
    if (filterMode === 'correct') return r.isCorrect;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6 animate-in zoom-in-95 duration-300 pb-12">
      {/* Celebration Header Card */}
      <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-lg relative overflow-hidden space-y-6">
        {/* Background glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-linear-to-tr from-indigo-500 to-amber-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/20">
            <Trophy className="w-10 h-10 animate-bounce" />
          </div>

          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              Kết quả làm bài thi
            </h2>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              {attempt.quizTitle}
            </p>
          </div>

          {/* Performance Message */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>
              {isHighAccuracy
                ? 'Xuất sắc! Bạn đã đạt điểm cao trong bài kiểm tra này.'
                : 'Hoàn thành bài tập! Hãy xem chi tiết các câu làm sai để ghi nhớ tốt hơn.'}
            </span>
          </div>
        </div>

        {/* Big Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Điểm số
            </span>
            <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1 block">
              {attempt.score} / {attempt.totalQuestions}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
              Tỷ lệ đúng
            </span>
            <span className="text-xl font-extrabold text-indigo-900 dark:text-indigo-200 mt-1 block">
              {attempt.accuracy}%
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Số câu đúng
            </span>
            <span className="text-xl font-extrabold text-emerald-900 dark:text-emerald-200 mt-1 block">
              {attempt.correctAnswers}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50">
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
              Số câu sai
            </span>
            <span className="text-xl font-extrabold text-rose-900 dark:text-rose-200 mt-1 block">
              {attempt.wrongAnswers}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center justify-center gap-2 py-3 px-4 font-extrabold text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Thi lại bài này</span>
          </button>

          <button
            type="button"
            onClick={onDashboard}
            className="flex items-center justify-center gap-2 py-3 px-4 font-bold text-xs text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Trở về danh sách</span>
          </button>

          {attempt.wrongAnswers > 0 && (
            <button
              type="button"
              onClick={onReviewWrong}
              className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 py-3 px-4 font-extrabold text-xs text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              <span>Luyện lại câu sai ({attempt.wrongAnswers})</span>
            </button>
          )}
        </div>
      </div>

      {/* DETAILED QUESTION BREAKDOWN (Chi tiết từng câu hỏi & giải thích) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Chi tiết câu hỏi & đáp án ({attempt.totalQuestions} câu)
            </h3>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              Tất cả ({attempt.totalQuestions})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('wrong')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                filterMode === 'wrong'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-400'
              }`}
            >
              Câu sai ({attempt.wrongAnswers})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('correct')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                filterMode === 'correct'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              Câu đúng ({attempt.correctAnswers})
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {displayedResults.map((res, idx) => (
            <div
              key={idx}
              className={`p-5 rounded-2xl border transition-all space-y-3 ${
                res.isCorrect
                  ? 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/40 dark:bg-emerald-950/10'
                  : 'border-rose-200 bg-rose-50/30 dark:border-rose-900/40 dark:bg-rose-950/10'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-extrabold text-xs uppercase tracking-wide text-slate-500">
                  Câu {idx + 1}. <ClickableText text={res.questionText} isExamMode={false} quizId={attempt.quizId} quizTitle={attempt.quizTitle} />
                </span>
                <div className="flex items-center gap-2 shrink-0">
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
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-lg text-[11px] font-bold transition-all cursor-pointer hover:scale-105"
                  >
                    <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    <span>Hỏi AI</span>
                  </button>
                  <span
                    className={`px-2.5 py-1 text-[11px] font-extrabold rounded-full flex items-center gap-1 ${
                      res.isCorrect
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {res.isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    {res.isCorrect ? 'Đúng' : 'Sai'}
                  </span>
                </div>
              </div>

              {res.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-800 max-h-[250px] bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-2">
                  <img
                    src={res.imageUrl}
                    alt="Ảnh đính kèm"
                    referrerPolicy="no-referrer"
                    className="max-h-[230px] w-auto object-contain rounded-lg"
                  />
                </div>
              )}

              {/* Options Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                {res.options.map((opt, optIdx) => {
                  const userPicks =
                    res.selectedAnswers && res.selectedAnswers.length > 0
                      ? res.selectedAnswers
                      : Array.isArray(res.selectedAnswer)
                      ? res.selectedAnswer
                      : typeof res.selectedAnswer === 'number' && res.selectedAnswer >= 0
                      ? [res.selectedAnswer]
                      : [];
                  const isUserPick = userPicks.includes(optIdx);
                  const correctList = res.correctAnswers && res.correctAnswers.length > 0 ? res.correctAnswers : [res.correctAnswer];
                  const isCorrectAnswer = correctList.includes(optIdx);

                  let optBg = 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800';
                  if (isCorrectAnswer) {
                    optBg = 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-300 text-emerald-950 dark:text-emerald-200 font-extrabold';
                  } else if (isUserPick && !isCorrectAnswer) {
                    optBg = 'bg-rose-100 dark:bg-rose-950/80 border-rose-300 text-rose-950 dark:text-rose-200 font-extrabold';
                  }

                  return (
                    <div
                      key={optIdx}
                      className={`p-2.5 rounded-xl border flex items-center gap-2 justify-between ${optBg}`}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <span className="w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 bg-white dark:bg-slate-900 border border-slate-300">
                          {letters[optIdx]}
                        </span>
                        <span className="leading-relaxed">
                          <ClickableText text={opt} isExamMode={false} quizId={attempt.quizId} quizTitle={attempt.quizTitle} />
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isUserPick && (
                          <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded-md bg-white/80 dark:bg-black/50">
                            (Bạn chọn)
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
                          className="px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded text-[10px] font-bold border border-indigo-200 dark:border-indigo-800 transition-all hover:scale-105"
                          title={`Hỏi AI về đáp án ${letters[optIdx]}`}
                        >
                          <Sparkles className="w-2.5 h-2.5 inline mr-0.5 text-indigo-600" />
                          Hỏi AI
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Explanation & Note */}
              {res.explanation && (
                <div className="p-3.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/50 text-xs text-indigo-950 dark:text-indigo-200 space-y-1">
                  <span className="font-extrabold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Giải thích chi tiết:</span>
                  </span>
                  <p className="pl-5 leading-relaxed whitespace-pre-line">
                    <ClickableText text={res.explanation} isExamMode={false} />
                  </p>
                </div>
              )}

              {res.note && (
                <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 text-xs text-amber-950 dark:text-amber-200 space-y-1 font-mono">
                  <span className="font-extrabold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                    <span>Ghi chú ghi nhớ:</span>
                  </span>
                  <p className="pl-5 leading-relaxed whitespace-pre-line">
                    <ClickableText text={res.note} isExamMode={false} />
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
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
