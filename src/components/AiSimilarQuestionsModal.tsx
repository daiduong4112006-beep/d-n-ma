import React, { useState, useEffect } from 'react';
import { Sparkles, X, Loader2, CheckCircle2, XCircle, ArrowRight, Lightbulb, RefreshCw, HelpCircle } from 'lucide-react';
import { Question } from '../types/quiz';
import { DifficultyBadge } from './DifficultyBadge';

interface AiSimilarQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalQuestion: Question | null;
  onAddQuestionsToQuiz?: (newQuestions: Question[]) => void;
}

export const AiSimilarQuestionsModal: React.FC<AiSimilarQuestionsModalProps> = ({
  isOpen,
  onClose,
  originalQuestion,
  onAddQuestionsToQuiz,
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User interactive answering state for generated questions
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (isOpen && originalQuestion) {
      handleFetchSimilar();
    } else {
      setQuestions([]);
      setSelectedAnswers({});
      setSubmittedAnswers({});
      setError(null);
    }
  }, [isOpen, originalQuestion]);

  const handleFetchSimilar = async () => {
    if (!originalQuestion) return;
    setIsLoading(true);
    setError(null);
    setSelectedAnswers({});
    setSubmittedAnswers({});

    try {
      const res = await fetch('/api/ai/generate-similar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: originalQuestion.question,
          options: originalQuestion.options,
          correctAnswerText: originalQuestion.options[originalQuestion.correctAnswer] || '',
          explanation: originalQuestion.explanation,
          count: 2,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi khi tạo câu hỏi tương tự với AI');
      }

      if (data.questions && Array.isArray(data.questions)) {
        const formatted: Question[] = data.questions.map((q: any, idx: number) => ({
          id: `sim-q-${Date.now()}-${idx}`,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer ?? 0,
          correctAnswers: [q.correctAnswer ?? 0],
          explanation: q.explanation || '',
          note: q.note || '',
          difficulty: q.difficulty || originalQuestion.difficulty || 'Medium',
          timesAnswered: 0,
          timesCorrect: 0,
          timesWrong: 0,
          mastered: false,
        }));
        setQuestions(formatted);
      } else {
        throw new Error('AI không trả về danh sách câu hỏi phù hợp.');
      }
    } catch (err: any) {
      console.error('Error fetching similar questions:', err);
      setError(err.message || 'Không thể tạo câu hỏi tương tự');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !originalQuestion) return null;

  const handleSelectOption = (qIdx: number, optIdx: number) => {
    if (submittedAnswers[qIdx]) return;
    setSelectedAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  const handleCheckAnswer = (qIdx: number) => {
    if (selectedAnswers[qIdx] === undefined) return;
    setSubmittedAnswers((prev) => ({ ...prev, [qIdx]: true }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Luyện câu hỏi tương tự cùng AI
              </h2>
              <p className="text-xs text-slate-400">
                Tạo tự động 2 câu hỏi cùng dạng để củng cố vững chắc kiến thức
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Original Question Card Reference */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold uppercase tracking-wider text-[11px] text-slate-500 dark:text-slate-400">
                Câu hỏi gốc tham chiếu
              </span>
              <DifficultyBadge difficulty={originalQuestion.difficulty} />
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
              {originalQuestion.question}
            </p>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                AI đang phân tích dạng bài và soạn 2 câu hỏi mới...
              </p>
              <p className="text-[11px] text-slate-400">
                Vui lòng đợi vài giây
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={handleFetchSimilar}
                className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold cursor-pointer"
              >
                Thử lại
              </button>
            </div>
          )}

          {/* Generated Questions */}
          {!isLoading && questions.length > 0 && (
            <div className="space-y-6">
              {questions.map((q, qIdx) => {
                const isSubmitted = submittedAnswers[qIdx];
                const selectedOpt = selectedAnswers[qIdx];
                const isCorrect = selectedOpt === q.correctAnswer;

                return (
                  <div
                    key={q.id || qIdx}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900">
                        Câu thực hành #{qIdx + 1}
                      </span>
                      <DifficultyBadge difficulty={q.difficulty} />
                    </div>

                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {q.question}
                    </p>

                    {/* Options list */}
                    <div className="space-y-2">
                      {q.options.map((opt, optIdx) => {
                        let optStyle =
                          'bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-700';

                        if (selectedOpt === optIdx && !isSubmitted) {
                          optStyle =
                            'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-900 dark:text-indigo-200 font-bold';
                        }

                        if (isSubmitted) {
                          if (optIdx === q.correctAnswer) {
                            optStyle =
                              'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold';
                          } else if (selectedOpt === optIdx) {
                            optStyle =
                              'bg-rose-50 dark:bg-rose-950/50 border-rose-500 text-rose-900 dark:text-rose-200 font-bold';
                          } else {
                            optStyle = 'opacity-50 border-slate-200 dark:border-slate-800';
                          }
                        }

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => handleSelectOption(qIdx, optIdx)}
                            disabled={isSubmitted}
                            className={`w-full text-left p-3 rounded-xl border text-xs flex items-center justify-between transition-all cursor-pointer ${optStyle}`}
                          >
                            <span className="flex items-center gap-2.5">
                              <span className="w-5 h-5 rounded-lg bg-slate-200/80 dark:bg-slate-700 flex items-center justify-center font-bold text-[10px]">
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span>{opt}</span>
                            </span>
                            {isSubmitted && optIdx === q.correctAnswer && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            )}
                            {isSubmitted && selectedOpt === optIdx && optIdx !== q.correctAnswer && (
                              <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Action check button */}
                    {!isSubmitted && (
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleCheckAnswer(qIdx)}
                          disabled={selectedOpt === undefined}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-all cursor-pointer"
                        >
                          Kiểm tra đáp án
                        </button>
                      </div>
                    )}

                    {/* Explanation Reveal */}
                    {isSubmitted && (
                      <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 space-y-2 text-xs animate-in fade-in duration-200">
                        <div className="flex items-center gap-2 font-bold text-indigo-700 dark:text-indigo-300">
                          <Lightbulb className="w-4 h-4" />
                          <span>{isCorrect ? 'Chính xác!' : 'Giải thích đáp án đúng:'}</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                          {q.explanation || 'Không có giải thích chi tiết.'}
                        </p>
                        {q.note && (
                          <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium italic">
                            💡 Mẹo nhớ: {q.note}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/60">
          <button
            type="button"
            onClick={handleFetchSimilar}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Tạo 2 câu khác</span>
          </button>

          <div className="flex items-center gap-3">
            {onAddQuestionsToQuiz && questions.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onAddQuestionsToQuiz(questions);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60 hover:bg-emerald-200 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Lưu 2 câu này vào bộ đề</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 transition-all cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
