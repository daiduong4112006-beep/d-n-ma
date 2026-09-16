import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Question } from '../types/quiz';
import { ClickableText } from './ClickableText';
import { AiQuestionModal } from './AiQuestionModal';
import {
  RotateCw,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Keyboard,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { sound } from '../utils/audio';
import {
  getFlashcardProgress,
  saveFlashcardProgress,
  markQuestionMastered,
  getCurrentUserEmail,
} from '../utils/storage';
import { subscribeFlashcardProgress } from '../lib/firebase';
import { realtimeSync } from '../utils/realtimeSync';

interface FlashcardViewerProps {
  quizId?: string;
  quizTitle?: string;
  questions: Question[];
  onFinish: () => void;
}

export const FlashcardViewer: React.FC<FlashcardViewerProps> = ({ quizId, quizTitle, questions, onFinish }) => {
  const effectiveQuizId = quizId || (questions[0]?.id ? `quiz_${questions[0].id}` : 'default_quiz');

  // Load initial saved progress from localStorage
  const initialSaved = getFlashcardProgress(effectiveQuizId);
  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = initialSaved.currentIndex;
    return idx >= 0 && idx < questions.length ? idx : 0;
  });
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [knownQuestionIds, setKnownQuestionIds] = useState<Set<string>>(() => {
    const set = new Set(initialSaved.knownQuestionIds);
    questions.forEach((q) => {
      if (q.mastered) set.add(q.id);
    });
    return set;
  });

  const [aiModalConfig, setAiModalConfig] = useState<{
    question: Question;
    selectedAnswer: number | null;
    optionIndex: number | null;
  } | null>(null);

  const currentQ = questions[currentIndex];
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

  // Toggle full screen mode
  const handleToggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const isRemoteUpdateRef = useRef(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // Sync state if effectiveQuizId or questions change
  useEffect(() => {
    const saved = getFlashcardProgress(effectiveQuizId);
    if (saved.currentIndex >= 0 && saved.currentIndex < questions.length) {
      setCurrentIndex(saved.currentIndex);
    }
    const set = new Set(saved.knownQuestionIds);
    setKnownQuestionIds(set);
  }, [effectiveQuizId, questions.length]);

  // 1. Cross-Tab Real-time Sync via BroadcastChannel (< 5ms)
  useEffect(() => {
    if (!effectiveQuizId) return;

    const unsubscribe = realtimeSync.subscribeKey('MCQ_FLASHCARD', effectiveQuizId, (payload) => {
      if (typeof payload.currentIndex === 'number' && payload.currentIndex >= 0 && payload.currentIndex < questions.length) {
        isRemoteUpdateRef.current = true;
        setCurrentIndex(payload.currentIndex);
        setIsFlipped(false);
        if (payload.data?.knownQuestionIds && Array.isArray(payload.data.knownQuestionIds)) {
          setKnownQuestionIds(new Set(payload.data.knownQuestionIds));
        }
        setSyncStatusMsg(`⚡ Đã đồng bộ tức thì sang thẻ #${payload.currentIndex + 1}`);
        setTimeout(() => setSyncStatusMsg(null), 2500);
      }
    });

    return () => unsubscribe();
  }, [effectiveQuizId, questions.length]);

  // 2. Cross-Device Real-time Sync via Firebase Firestore onSnapshot (Phone <-> PC)
  useEffect(() => {
    if (!effectiveQuizId) return;
    const userEmail = getCurrentUserEmail();
    if (!userEmail) return;

    const unsubscribe = subscribeFlashcardProgress(userEmail, effectiveQuizId, (progress) => {
      if (typeof progress.currentIndex === 'number' && progress.currentIndex >= 0 && progress.currentIndex < questions.length) {
        setCurrentIndex((prevIdx) => {
          if (prevIdx !== progress.currentIndex) {
            isRemoteUpdateRef.current = true;
            setIsFlipped(false);
            setSyncStatusMsg(`📱 Đã đồng bộ từ thiết bị khác (Thẻ #${progress.currentIndex + 1})`);
            setTimeout(() => setSyncStatusMsg(null), 3000);
            return progress.currentIndex;
          }
          return prevIdx;
        });

        if (Array.isArray(progress.knownQuestionIds)) {
          setKnownQuestionIds(new Set(progress.knownQuestionIds));
        }
      }
    });

    return () => unsubscribe();
  }, [effectiveQuizId, questions.length]);

  // 3. Persist progress on index or known list change (skip broadcast if triggered by remote update)
  useEffect(() => {
    if (!effectiveQuizId) return;

    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }

    saveFlashcardProgress(effectiveQuizId, {
      currentIndex,
      knownQuestionIds: Array.from(knownQuestionIds),
    });
  }, [effectiveQuizId, currentIndex, knownQuestionIds]);

  const handleNext = useCallback(() => {
    setIsFlipped(false);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onFinish();
    }
  }, [currentIndex, questions.length, onFinish]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleMarkKnown = () => {
    sound.playCorrect();
    if (currentQ) {
      setKnownQuestionIds((prev) => {
        const next = new Set(prev);
        next.add(currentQ.id);
        return next;
      });
      markQuestionMastered(effectiveQuizId, currentQ.id, true);
    }
    handleNext();
  };

  const handleFlipCard = () => {
    sound.playFlip();
    setIsFlipped((prev) => !prev);
  };

  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  const handleResetProgress = () => {
    setShowResetConfirmModal(true);
  };

  const confirmResetProgress = (resetKnown: boolean) => {
    setCurrentIndex(0);
    setIsFlipped(false);
    if (resetKnown) {
      setKnownQuestionIds(new Set());
      saveFlashcardProgress(effectiveQuizId, { currentIndex: 0, knownQuestionIds: [] });
      questions.forEach((q) => {
        q.mastered = false;
        markQuestionMastered(effectiveQuizId, q.id, false);
      });
    } else {
      saveFlashcardProgress(effectiveQuizId, { currentIndex: 0, knownQuestionIds: Array.from(knownQuestionIds) });
    }
    sound.playFlip();
    setShowResetConfirmModal(false);
  };

  // Keyboard controls: Space to flip, Left/Right arrows to navigate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (aiModalConfig) return;
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable);

      if (isInput) return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        sound.playFlip();
        setIsFlipped((prev) => !prev);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext, aiModalConfig]);

  if (!currentQ) return null;

  return (
    <div
      ref={containerRef}
      className={`mx-auto transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-slate-900 overflow-y-auto p-4 sm:p-6 md:p-8 flex flex-col justify-between max-w-none'
          : 'max-w-2xl space-y-5'
      }`}
    >
      {/* Top Header & Progress Bar */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-500 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span>
            Thẻ {currentIndex + 1} / {questions.length}
          </span>
          <button
            type="button"
            onClick={handleResetProgress}
            title="Học lại từ thẻ đầu tiên"
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mr-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Đã thuộc: {knownQuestionIds.size} / {questions.length}
          </span>

          <button
            type="button"
            onClick={handleResetProgress}
            className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/80 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
            title="Khởi động lại từ thẻ số 1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Khởi động lại</span>
          </button>

          {/* Full Screen Toggle Button */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
            title={isFullscreen ? 'Thoát chế độ toàn màn hình (Esc)' : 'Mở toàn màn hình thẻ ghi nhớ'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Thu nhỏ</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Toàn màn hình</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
        <div
          className="bg-indigo-600 h-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Keyboard Shortcuts Hint & Realtime Sync Indicator */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 py-1 px-3 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 rounded-xl text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
        <div className="flex items-center gap-2">
          <Keyboard className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span>
            Bàn phím: <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border rounded shadow-2xs text-[10px] font-mono">Phím Cách</kbd> Lật thẻ • <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border rounded shadow-2xs text-[10px] font-mono">←</kbd> <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border rounded shadow-2xs text-[10px] font-mono">→</kbd> Chuyển thẻ
          </span>
        </div>
        {syncStatusMsg && (
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 animate-pulse bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
            {syncStatusMsg}
          </span>
        )}
      </div>

      {/* Flip Card Container */}
      <div
        onClick={handleFlipCard}
        className={`w-full min-h-[340px] p-6 md:p-8 bg-white dark:bg-slate-900 border-2 rounded-3xl shadow-lg cursor-pointer transition-all duration-300 transform flex flex-col justify-between select-none hover:shadow-xl relative ${
          isFlipped
            ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20'
            : 'border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
            {isFlipped ? 'Mặt Sau (Đáp Án & Ghi Chú)' : 'Mặt Trước (Câu Hỏi)'}
          </span>

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {/* Ask AI Button on top right of Card */}
            <button
              type="button"
              onClick={() =>
                setAiModalConfig({
                  question: currentQ,
                  selectedAnswer: isFlipped ? currentQ.correctAnswer : null,
                  optionIndex: isFlipped ? currentQ.correctAnswer : null,
                })
              }
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition-all cursor-pointer hover:scale-105"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Hỏi AI</span>
            </button>

            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
              <RotateCw className="w-3.5 h-3.5" />
              <span>{isFlipped ? 'Chạm để lật câu hỏi' : 'Chạm để lật xem đáp án'}</span>
            </span>
          </div>
        </div>

        {/* Card Content */}
        {!isFlipped ? (
          <div className="my-auto space-y-4 text-left animate-in fade-in duration-200 pt-3">
            <h3 className="text-lg md:text-xl font-extrabold text-slate-900 dark:text-slate-100 leading-snug">
              <ClickableText text={currentQ.question} isExamMode={false} quizId={quizId} quizTitle={quizTitle} />
            </h3>

            {currentQ.imageUrl && (
              <div className="rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 max-h-[220px] bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-2">
                <img
                  src={currentQ.imageUrl}
                  alt="Ảnh đính kèm"
                  referrerPolicy="no-referrer"
                  className="max-h-[200px] w-auto object-contain rounded-xl"
                />
              </div>
            )}

            {/* List of Answer Options on Front Side */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Các phương án lựa chọn:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {currentQ.options.map((opt, optIdx) => (
                  <div
                    key={optIdx}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 text-slate-700 dark:text-slate-300"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-md flex items-center justify-center font-bold text-[11px] shrink-0 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                        {letters[optIdx]}
                      </span>
                      <span className="leading-relaxed">
                        <ClickableText text={opt} isExamMode={false} quizId={quizId} quizTitle={quizTitle} />
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAiModalConfig({
                          question: currentQ,
                          selectedAnswer: null,
                          optionIndex: optIdx,
                        });
                      }}
                      className="px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded text-[10px] font-bold border border-indigo-200 dark:border-indigo-800 transition-all hover:scale-105 shrink-0"
                      title={`Hỏi AI về phương án ${letters[optIdx]}`}
                    >
                      <Sparkles className="w-2.5 h-2.5 inline mr-0.5 text-indigo-600" />
                      AI
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-center text-slate-400 pt-1">
              Bấm Phím Cách hoặc chạm vào thẻ để lật xem đáp án
            </p>
          </div>
        ) : (
          <div className="my-auto space-y-4 text-left animate-in fade-in duration-200 pt-3">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                  Đáp án đúng {currentQ.correctAnswers && currentQ.correctAnswers.length > 1 ? '(Nhiều đáp án)' : ''}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAiModalConfig({
                      question: currentQ,
                      selectedAnswer: currentQ.correctAnswer,
                      optionIndex: currentQ.correctAnswer,
                    });
                  }}
                  className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-lg text-[10px] font-bold border border-indigo-200 dark:border-indigo-800 transition-all hover:scale-105"
                >
                  <Sparkles className="w-3 h-3 inline mr-1 text-indigo-600" />
                  Hỏi AI vì sao đúng
                </button>
              </div>

              <p className="text-base font-bold text-emerald-900 dark:text-emerald-200 flex flex-wrap gap-2 pt-1">
                {(currentQ.correctAnswers && currentQ.correctAnswers.length > 0
                  ? currentQ.correctAnswers
                  : [currentQ.correctAnswer]
                ).map((idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 bg-white/80 dark:bg-emerald-900/60 px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-700">
                    [{letters[idx]}]{' '}
                    <ClickableText text={currentQ.options[idx]} isExamMode={false} quizId={quizId} quizTitle={quizTitle} />
                  </span>
                ))}
              </p>
            </div>

            {currentQ.explanation && (
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/50 space-y-1 text-xs text-indigo-950 dark:text-indigo-200">
                <span className="font-bold text-indigo-900 dark:text-indigo-300 block">
                  Giải thích chi tiết:
                </span>
                <p className="leading-relaxed whitespace-pre-line">
                  <ClickableText text={currentQ.explanation} isExamMode={false} quizId={quizId} quizTitle={quizTitle} />
                </p>
              </div>
            )}

            {currentQ.note && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 space-y-1 text-xs text-amber-950 dark:text-amber-200 font-mono">
                <span className="font-bold text-amber-900 dark:text-amber-300 block">
                  Ghi chú ghi nhớ:
                </span>
                <p className="leading-relaxed whitespace-pre-line">
                  <ClickableText text={currentQ.note} isExamMode={false} quizId={quizId} quizTitle={quizTitle} />
                </p>
              </div>
            )}
          </div>
        )}

        <div className="text-center text-[11px] text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
          Mẹo: Lật thẻ nhiều lần & dùng AI giải thích để khắc sâu trí nhớ dài hạn
        </div>
      </div>

      {/* Control Action Buttons */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 font-bold text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl disabled:opacity-40 transition-all cursor-pointer shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Thẻ trước (←)</span>
        </button>

        <button
          type="button"
          onClick={handleMarkKnown}
          className={`inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 font-extrabold text-xs rounded-xl transition-all shadow-xs cursor-pointer ${
            knownQuestionIds.has(currentQ.id)
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'text-emerald-950 bg-emerald-300 hover:bg-emerald-400'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{knownQuestionIds.has(currentQ.id) ? '✓ Đã thuộc' : 'Đã nhớ thẻ này (+1)'}</span>
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="inline-flex items-center gap-2 px-4 py-2.5 font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all cursor-pointer shadow-xs"
        >
          <span>{currentIndex === questions.length - 1 ? 'Hoàn thành' : 'Thẻ tiếp (→)'}</span>
          <ArrowRight className="w-4 h-4" />
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

      {/* Reset Confirmation Modal */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <RefreshCw className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                Học lại từ thẻ đầu tiên?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Bạn muốn quay về thẻ số 1 và giữ lại hay đặt lại danh sách thẻ đã thuộc?
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => confirmResetProgress(false)}
                className="w-full py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
              >
                Quay về thẻ 1 (Giữ danh sách đã thuộc)
              </button>

              <button
                type="button"
                onClick={() => confirmResetProgress(true)}
                className="w-full py-2.5 px-3 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 rounded-xl transition-all cursor-pointer"
              >
                Đặt lại toàn bộ từ đầu (Xóa đã thuộc)
              </button>

              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="w-full py-2 px-3 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all cursor-pointer text-center"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
