import React, { useState, useEffect, useRef } from 'react';
import { WrongQuestionDetail, Question } from '../types/quiz';
import {
  updateSingleQuestionStat,
  getPracticeMistakesProgress,
  savePracticeMistakesProgress,
} from '../utils/storage';
import { realtimeSync } from '../utils/realtimeSync';
import { AnswerOption } from '../components/AnswerOption';
import { ExplanationBox } from '../components/ExplanationBox';
import { NoteBox } from '../components/NoteBox';
import { DifficultyBadge } from '../components/DifficultyBadge';
import { ClickableText } from '../components/ClickableText';
import { AiQuestionModal } from '../components/AiQuestionModal';
import { Flame, CheckCircle2, ArrowRight, ArrowLeft, RotateCcw, Award, Check, Sparkles, HelpCircle } from 'lucide-react';

interface PracticeMistakesProps {
  wrongQuestionsList: WrongQuestionDetail[];
  onRefreshList: () => void;
  onBackToDashboard: () => void;
}

export const PracticeMistakes: React.FC<PracticeMistakesProps> = ({
  wrongQuestionsList,
  onRefreshList,
  onBackToDashboard,
}) => {
  const initialSaved = getPracticeMistakesProgress();
  const inMemoryLatest = realtimeSync.getLatestState('MCQ_MISTAKES', 'global');
  const target = inMemoryLatest?.data || initialSaved;

  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = target?.currentIndex;
    return typeof idx === 'number' && idx >= 0 && idx < wrongQuestionsList.length ? idx : 0;
  });
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [masteredCount, setMasteredCount] = useState(() => {
    return typeof target?.masteredCount === 'number' ? target.masteredCount : 0;
  });
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const isRemoteUpdateRef = useRef(false);
  const isInitialMountRef = useRef(true);

  const [showAiModal, setShowAiModal] = useState(false);
  const [aiOptionIndex, setAiOptionIndex] = useState<number | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // 1. Cross-Tab & Cross-Device Real-time Sync (< 2ms)
  useEffect(() => {
    const unsubscribe = realtimeSync.subscribeKey('MCQ_MISTAKES', 'global', (payload) => {
      if (typeof payload.currentIndex === 'number' && payload.currentIndex >= 0 && payload.currentIndex < wrongQuestionsList.length) {
        isRemoteUpdateRef.current = true;
        setCurrentIndex(payload.currentIndex);
        setSelectedAnswer(null);
        setIsAnswered(false);
        if (typeof payload.data?.masteredCount === 'number') {
          setMasteredCount(payload.data.masteredCount);
        }
        const sourceName = payload.senderId === 'remote_cloud' ? '📱 điện thoại' : '⚡ tab khác';
        setSyncStatusMsg(`Đã đồng bộ từ ${sourceName} sang câu ${payload.currentIndex + 1}/${wrongQuestionsList.length}`);
        setTimeout(() => setSyncStatusMsg(null), 3000);
      }
    });

    return () => unsubscribe();
  }, [wrongQuestionsList.length]);

  // 2. Persist progress on user progress
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }
    savePracticeMistakesProgress(currentIndex, masteredCount);
  }, [currentIndex, masteredCount]);

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setMasteredCount(0);
    savePracticeMistakesProgress(0, 0);
    onRefreshList();
    setShowResetConfirm(false);
  };

  if (wrongQuestionsList.length === 0) {
    return (
      <div className="max-w-xl mx-auto p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-lg space-y-5 my-12 animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 rounded-3xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center justify-center mx-auto shadow-inner">
          <Award className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            Đã thuộc hết các câu hay sai!
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            Tuyệt vời! Bạn không còn câu hỏi trả lời sai nào chưa được làm chủ. Hãy tiếp tục làm thêm các bài Quiz mới!
          </p>
        </div>
        <button
          type="button"
          onClick={onBackToDashboard}
          className="px-6 py-3 font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all cursor-pointer"
        >
          Trở về Trang chủ
        </button>
      </div>
    );
  }

  const currentItem = wrongQuestionsList[currentIndex];
  if (!currentItem) {
    // Wrapped around or empty
    return (
      <div className="text-center py-12 space-y-4">
        <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
          Bạn đã hoàn thành bộ luyện tập này!
        </h3>
        <button
          type="button"
          onClick={() => {
            setCurrentIndex(0);
            setSelectedAnswer(null);
            setIsAnswered(false);
            onRefreshList();
          }}
          className="px-5 py-2.5 font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer"
        >
          Luyện tập lại
        </button>
      </div>
    );
  }

  const currentQ = currentItem.question;
  const correctList =
    currentQ.correctAnswers && currentQ.correctAnswers.length > 0
      ? currentQ.correctAnswers
      : [currentQ.correctAnswer ?? 0];

  const isCorrect = selectedAnswer !== null && correctList.includes(selectedAnswer);
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

  const handleSelectOption = (index: number) => {
    if (isAnswered) return;

    setSelectedAnswer(index);
    setIsAnswered(true);

    const userCorrect = correctList.includes(index);

    // Persist answer in storage
    updateSingleQuestionStat(currentItem.quizId, currentQ.id, userCorrect, 'practice_mistakes');

    if (userCorrect) {
      setMasteredCount((prev) => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    onRefreshList(); // Reload active wrong questions list
    if (currentIndex >= wrongQuestionsList.length - 1) {
      setCurrentIndex(0);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
    setSelectedAnswer(null);
    setIsAnswered(false);
  };

  const handleDontKnow = () => {
    handleSelectOption(-1);
  };

  // Keyboard shortcut listener for Enter key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const targetTag = activeElement?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || showAiModal) return;

      if (e.key === 'Enter' && isAnswered) {
        e.preventDefault();
        handleNextQuestion();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnswered, showAiModal, handleNextQuestion]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-linear-to-r from-rose-500 to-amber-500 text-white shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-white/20 text-white backdrop-blur-xs">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Chế độ luyện câu hay sai</h2>
            <p className="text-xs font-medium opacity-90">
              Luyện tập lại những câu hỏi bạn từng làm sai cho đến khi thuộc lòng.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white/20 px-4 py-2 rounded-xl backdrop-blur-xs text-xs font-bold">
          <span>Còn lại: {wrongQuestionsList.length}</span>
          <span>•</span>
          <span>Đã làm chủ phiên này: {masteredCount}</span>
          <span>•</span>
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all cursor-pointer flex items-center gap-1"
            title="Khởi động lại từ câu 1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Khởi động lại</span>
          </button>
        </div>
      </div>

      {syncStatusMsg && (
        <div className="py-1.5 px-4 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 text-center animate-pulse shadow-2xs">
          {syncStatusMsg}
        </div>
      )}

      {/* Current Question Card */}
      <div className="p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Bộ đề: {currentItem.quizTitle}
            </span>
            <p className="text-xs text-slate-400">
              Câu {currentIndex + 1} / {wrongQuestionsList.length}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAiModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Hỏi AI Giải thích</span>
            </button>
            <DifficultyBadge difficulty={currentQ.difficulty} />
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-slate-100 leading-snug">
            <ClickableText text={currentQ.question} quizId={currentItem.quizId} quizTitle={currentItem.quizTitle} />
          </h3>
          {currentQ.imageUrl && (
            <div className="rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 max-h-[300px] bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-2">
              <img
                src={currentQ.imageUrl}
                alt="Hình ảnh đính kèm"
                referrerPolicy="no-referrer"
                className="max-h-[280px] w-auto object-contain rounded-xl"
              />
            </div>
          )}
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 gap-3">
          {currentQ.options.map((optText, idx) => (
            <AnswerOption
              key={idx}
              index={idx}
              letter={letters[idx] || String.fromCharCode(65 + idx)}
              optionText={optText}
              isSelected={selectedAnswer === idx}
              isCorrectOption={correctList.includes(idx)}
              isAnswered={isAnswered}
              userSelectedCorrect={isCorrect}
              quizId={currentItem.quizId}
              quizTitle={currentItem.quizTitle}
              onAskAi={() => {
                setAiOptionIndex(idx);
                setShowAiModal(true);
              }}
              onSelect={() => handleSelectOption(idx)}
            />
          ))}
        </div>

        {/* "Tôi không biết" & "Câu trước" button when not answered */}
        {!isAnswered && (
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 flex-wrap">
              {currentIndex > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setCurrentIndex((prev) => prev - 1);
                    setSelectedAnswer(null);
                    setIsAnswered(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
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

        {/* Feedback area */}
        {isAnswered && (
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200">
            <div
              className={`p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 border ${
                isCorrect
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-900 dark:text-emerald-200'
                  : selectedAnswer === -1
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 text-amber-950 dark:text-amber-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-900 dark:text-rose-200'
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                {isCorrect ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : selectedAnswer === -1 ? (
                  <HelpCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
                ) : (
                  <Flame className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0" />
                )}
                <div>
                  <h4 className="font-bold text-sm">
                    {isCorrect
                      ? '✓ Marked as Mastered! Bạn đã trả lời đúng câu này.'
                      : selectedAnswer === -1
                      ? 'Đã hiển thị đáp án đúng & lời giải'
                      : 'X Vẫn chưa chính xác! Hãy đọc kỹ giải thích dưới đây.'}
                  </h4>
                  {!isCorrect && (
                    <p className="text-xs font-medium mt-0.5 opacity-90">
                      Đáp án đúng là:{' '}
                      <strong className="font-bold">
                        {correctList
                          .map((c) => `[${letters[c] || String.fromCharCode(65 + c)}] ${currentQ.options[c]}`)
                          .join('  •  ')}
                      </strong>
                    </p>
                  )}
                </div>
              </div>

              {selectedAnswer !== null && selectedAnswer >= 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAiOptionIndex(selectedAnswer);
                    setShowAiModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-extrabold hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-all cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Hỏi AI vì sao chọn [{letters[selectedAnswer]}] lại {isCorrect ? 'ĐÚNG' : 'SAI'}</span>
                </button>
              )}
            </div>

            <ExplanationBox explanation={currentQ.explanation} />
            {currentQ.note && <NoteBox note={currentQ.note} />}

            <div className="flex items-center justify-between pt-2">
              {currentIndex > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setCurrentIndex((prev) => prev - 1);
                    setSelectedAnswer(null);
                    setIsAnswered(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Câu trước</span>
                </button>
              ) : <div />}

              <button
                type="button"
                onClick={handleNextQuestion}
                className="inline-flex items-center gap-2 px-6 py-3 font-semibold text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all cursor-pointer"
              >
                <span>Câu tiếp theo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI Question Modal */}
      {showAiModal && (
        <AiQuestionModal
          question={currentQ}
          isOpen={showAiModal}
          onClose={() => {
            setShowAiModal(false);
            setAiOptionIndex(null);
          }}
          selectedAnswer={selectedAnswer}
          initialOptionIndex={aiOptionIndex}
        />
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <RotateCcw className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                Khởi động lại luyện câu sai?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Bạn có chắc chắn muốn quay về câu số 1 và làm mới danh sách câu hỏi đang luyện tập?
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleRestart}
                className="w-full py-2.5 px-3 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Đồng ý Khởi động lại
              </button>

              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="w-full py-2 px-3 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all cursor-pointer text-center"
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
