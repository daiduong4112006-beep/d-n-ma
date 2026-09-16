import React, { useState, useEffect, useMemo } from 'react';
import { Question } from '../types/quiz';
import { AnswerOption } from './AnswerOption';
import { ExplanationBox } from './ExplanationBox';
import { NoteBox } from './NoteBox';
import { DifficultyBadge } from './DifficultyBadge';
import { ClickableText } from './ClickableText';
import { AiQuestionModal } from './AiQuestionModal';
import { CheckCircle2, XCircle, ArrowRight, ArrowLeft, Sparkles, AlertCircle, Check, HelpCircle } from 'lucide-react';
import { sound } from '../utils/audio';

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  onAnswerSelected: (selectedIndex: number | number[]) => void;
  onNextQuestion: () => void;
  onPrevQuestion?: () => void;
  isLastQuestion: boolean;
  selectedAnswer: number | number[] | null;
  isAnswered: boolean;
  isExamMode?: boolean;
  instantFeedback?: boolean;
  quizId?: string;
  quizTitle?: string;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  questionNumber,
  totalQuestions,
  onAnswerSelected,
  onNextQuestion,
  onPrevQuestion,
  isLastQuestion,
  selectedAnswer,
  isAnswered,
  isExamMode = false,
  instantFeedback = true,
  quizId,
  quizTitle,
}) => {
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiTargetOptionIndex, setAiTargetOptionIndex] = useState<number | null>(null);

  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
  const correctList = useMemo(() => {
    return question.correctAnswers && question.correctAnswers.length > 0
      ? question.correctAnswers
      : [question.correctAnswer];
  }, [question]);

  const isMulti = correctList.length > 1;

  // Local selection state for multi-choice questions before confirming
  const [selectedMulti, setSelectedMulti] = useState<number[]>(() => {
    if (Array.isArray(selectedAnswer)) return selectedAnswer;
    if (typeof selectedAnswer === 'number') return [selectedAnswer];
    return [];
  });

  // Sync selectedMulti state on question change or selectedAnswer prop update
  useEffect(() => {
    if (Array.isArray(selectedAnswer)) {
      setSelectedMulti(selectedAnswer);
    } else if (typeof selectedAnswer === 'number') {
      setSelectedMulti([selectedAnswer]);
    } else {
      setSelectedMulti([]);
    }
  }, [question.id, selectedAnswer]);

  const selArr = useMemo(() => {
    if (Array.isArray(selectedAnswer)) return selectedAnswer;
    if (typeof selectedAnswer === 'number') return [selectedAnswer];
    return [];
  }, [selectedAnswer]);

  const isCorrect = useMemo(() => {
    if (selArr.length === 0) return false;
    return selArr.length === correctList.length && correctList.every((c) => selArr.includes(c));
  }, [selArr, correctList]);

  const handleOpenAiForOption = (optionIdx: number | null) => {
    setAiTargetOptionIndex(optionIdx);
    setIsAiModalOpen(true);
  };

  const handleDontKnow = () => {
    sound.playWrong();
    onAnswerSelected(-1);
  };

  const handleConfirmMultiAnswer = () => {
    if (selectedMulti.length === 0) return;
    onAnswerSelected(selectedMulti);

    if (instantFeedback && !isExamMode) {
      const isAllCorrect =
        selectedMulti.length === correctList.length &&
        correctList.every((c) => selectedMulti.includes(c));
      if (isAllCorrect) {
        sound.playCorrect();
      } else {
        sound.playWrong();
      }
    }
  };

  // Keyboard shortcut listener for Enter key to advance or confirm
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when user is typing in input or textarea or modal
      const activeElement = document.activeElement;
      const targetTag = activeElement?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || isAiModalOpen) return;

      if (e.key === 'Enter') {
        if (isAnswered) {
          e.preventDefault();
          onNextQuestion();
        } else if (isMulti && selectedMulti.length > 0) {
          e.preventDefault();
          handleConfirmMultiAnswer();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnswered, onNextQuestion, isMulti, selectedMulti, isAiModalOpen]);

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-xs space-y-6 transition-all">
      {/* Question Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Câu hỏi {questionNumber} / {totalQuestions}
          </span>
          {isMulti && (
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              {isAnswered
                ? `Đa đáp án (${correctList.map((i) => letters[i]).join(', ')})`
                : `Đa đáp án (${correctList.length} đáp án đúng)`}
            </span>
          )}
          {question.mastered && (
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              ✓ Thành thạo
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isExamMode && (
            <button
              type="button"
              onClick={() => handleOpenAiForOption(selArr.length > 0 ? selArr[0] : null)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Hỏi AI Giải thích</span>
            </button>
          )}

          <DifficultyBadge difficulty={question.difficulty} />
        </div>
      </div>

      {/* Multiple Answers Notice Annotation */}
      {isMulti && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-xl text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center gap-2.5 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            Chú thích: Câu hỏi này có <strong>CHỌN NHIỀU ĐÁP ÁN</strong> (Vui lòng chọn {correctList.length} đáp án đúng rồi bấm Xác nhận).
          </span>
        </div>
      )}

      {/* Question Text & Image */}
      <div className="space-y-4">
        <h3 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-slate-100 leading-snug">
          <ClickableText text={question.question} isExamMode={isExamMode} quizId={quizId} quizTitle={quizTitle} />
        </h3>

        {/* Attached Image */}
        {question.imageUrl && (
          <div className="rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 max-h-[350px] bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-2">
            <img
              src={question.imageUrl}
              alt="Hình ảnh đính kèm câu hỏi"
              referrerPolicy="no-referrer"
              className="max-h-[330px] w-auto object-contain rounded-xl"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
      </div>

      {/* Answer Options */}
      <div className="grid grid-cols-1 gap-3 pt-2">
        {question.options.map((optText, idx) => {
          const isSelected = isAnswered ? selArr.includes(idx) : (isMulti ? selectedMulti.includes(idx) : selArr.includes(idx));

          return (
            <AnswerOption
              key={idx}
              index={idx}
              letter={letters[idx] || `${idx + 1}`}
              optionText={optText}
              isSelected={isSelected}
              isCorrectOption={correctList.includes(idx)}
              isAnswered={instantFeedback ? isAnswered : false}
              userSelectedCorrect={isCorrect}
              isExamMode={isExamMode}
              quizId={quizId}
              quizTitle={quizTitle}
              onAskAi={!isExamMode ? () => handleOpenAiForOption(idx) : undefined}
              onSelect={() => {
                if (isAnswered) return;

                if (isMulti) {
                  // Toggle selection in multi-mode without instantly finishing question
                  setSelectedMulti((prev) =>
                    prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
                  );
                } else {
                  // Single choice mode: select & finish immediately
                  if (instantFeedback && !isExamMode) {
                    if (correctList.includes(idx)) {
                      sound.playCorrect();
                    } else {
                      sound.playWrong();
                    }
                  }
                  onAnswerSelected(idx);
                }
              }}
            />
          );
        })}
      </div>

      {/* "Tôi không biết" & "Câu trước" buttons when in practice mode and not yet answered */}
      {!isAnswered && instantFeedback && !isExamMode && (
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-wrap">
            {onPrevQuestion && questionNumber > 1 && (
              <button
                type="button"
                onClick={onPrevQuestion}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Câu trước</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDontKnow}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/80 text-amber-950 dark:text-amber-200 text-xs font-bold transition-all cursor-pointer shadow-2xs hover:scale-[1.01] active:scale-[0.99]"
              title="Bấm vào đây để xem ngay đáp án đúng và lời giải chi tiết"
            >
              <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Tôi không biết câu này (Xem đáp án & Lời giải)</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-400 font-medium">
            Mẹo: Nhấn phím <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">Enter</kbd> để sang câu tiếp theo
          </span>
        </div>
      )}

      {/* Confirm Button for Multi-Choice questions */}
      {isMulti && !isAnswered && (
        <div className="pt-2 flex flex-col items-center gap-2">
          <button
            type="button"
            disabled={selectedMulti.length === 0}
            onClick={handleConfirmMultiAnswer}
            className={`w-full py-3 px-6 rounded-xl font-extrabold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
              selectedMulti.length > 0
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md active:scale-98'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
            }`}
          >
            <Check className="w-5 h-5" />
            <span>
              Xác nhận trả lời ({selectedMulti.length} / {correctList.length} đáp án đã chọn)
            </span>
          </button>
          <span className="text-[11px] text-slate-500 font-medium">
            Mẹo: Bấm chọn các đáp án bạn cho là đúng rồi nhấn Xác nhận.
          </span>
        </div>
      )}

      {/* Exam Mode Navigation (when instantFeedback is disabled) */}
      {!instantFeedback && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onPrevQuestion}
            disabled={!onPrevQuestion || questionNumber <= 1}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl border transition-all ${
              onPrevQuestion && questionNumber > 1
                ? 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 cursor-pointer'
                : 'opacity-40 bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent cursor-not-allowed'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Câu trước</span>
          </button>

          <button
            type="button"
            onClick={onNextQuestion}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <span>{isLastQuestion ? 'Xem lại & Nộp bài' : 'Câu tiếp theo'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Instant Feedback Panel (if enabled) */}
      {instantFeedback && isAnswered && (
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Answer Banner */}
          <div
            className={`p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 border ${
              isCorrect
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : selArr.includes(-1)
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center gap-3 flex-1 min-w-[200px]">
              {isCorrect ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : selArr.includes(-1) ? (
                <HelpCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
              ) : (
                <XCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <div>
                <h4 className="font-bold text-base">
                  {isCorrect
                    ? 'Chính xác!'
                    : selArr.includes(-1)
                    ? 'Đã hiển thị đáp án đúng & lời giải'
                    : 'Chưa chính xác!'}
                </h4>
                {!isCorrect && (
                  <p className="text-xs font-medium mt-0.5 opacity-90">
                    Đáp án đúng là:{' '}
                    <strong className="font-bold">
                      {correctList
                        .map((i) => `[${letters[i] || String.fromCharCode(65 + i)}] ${question.options[i]}`)
                        .join('  •  ')}
                    </strong>
                  </p>
                )}
              </div>
            </div>

            {selArr.length > 0 && selArr[0] >= 0 && (
              <button
                type="button"
                onClick={() => handleOpenAiForOption(selArr[0])}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-extrabold hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-all shadow-xs cursor-pointer hover:scale-105"
              >
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Hỏi AI vì sao đáp án này {isCorrect ? 'ĐÚNG' : 'SAI'}</span>
              </button>
            )}
          </div>

          {/* Explanation & Note */}
          <div className="grid grid-cols-1 gap-3">
            <ExplanationBox explanation={question.explanation} />
            {question.note && <NoteBox note={question.note} />}
          </div>

          {/* Next & Previous Navigation Buttons */}
          <div className="flex items-center justify-between pt-2">
            {onPrevQuestion && questionNumber > 1 ? (
              <button
                type="button"
                onClick={onPrevQuestion}
                className="inline-flex items-center gap-1.5 px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Câu trước</span>
              </button>
            ) : <div />}

            <button
              type="button"
              onClick={onNextQuestion}
              className="inline-flex items-center gap-2 px-6 py-3 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
            >
              <span>{isLastQuestion ? 'Hoàn thành bài học' : 'Câu tiếp theo'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* AI Assistant Modal */}
      {isAiModalOpen && (
        <AiQuestionModal
          question={question}
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          selectedAnswer={selArr.length > 0 ? selArr[0] : null}
          initialOptionIndex={aiTargetOptionIndex}
        />
      )}
    </div>
  );
};

