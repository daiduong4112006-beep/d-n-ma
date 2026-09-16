import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Quiz, QuestionResult, QuizAttempt, StudyOptions } from '../types/quiz';
import { QuestionCard } from '../components/QuestionCard';
import { ProgressBar } from '../components/ProgressBar';
import { FlashcardViewer } from '../components/FlashcardViewer';
import { ClickableText } from '../components/ClickableText';
import { ArrowLeft, Clock, Send, Grid, CheckCircle2, AlertCircle, Sliders, X, Shuffle, RotateCw, Zap, Volume2, RotateCcw } from 'lucide-react';
import { sound } from '../utils/audio';
import {
  updateSingleQuestionStat,
  saveQuizLearningProgress,
  getQuizLearningProgress,
  clearQuizLearningProgress,
  getCurrentUserEmail,
} from '../utils/storage';
import { subscribeQuizLearningProgress } from '../lib/firebase';
import { realtimeSync } from '../utils/realtimeSync';

interface QuizPageProps {
  quiz: Quiz;
  mode?: 'normal' | 'practice_mistakes' | 'single_question';
  studyOptions?: StudyOptions;
  onQuizCompleted: (attempt: QuizAttempt) => void;
  onExit: () => void;
}

export const QuizPage: React.FC<QuizPageProps> = ({
  quiz,
  mode: quizMode = 'normal',
  studyOptions: initialStudyOptions,
  onQuizCompleted,
  onExit,
}) => {
  // Helper to load global study options saved previously
  const getSavedStudyOptions = (): Partial<StudyOptions> | null => {
    try {
      const saved = localStorage.getItem('mcq_saved_study_options');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  const savedOptions = getSavedStudyOptions();

  const isWrongQuestionsQuiz =
    quizMode === 'practice_mistakes' ||
    quiz.title.toLowerCase().includes('luyện câu') ||
    quiz.title.toLowerCase().includes('hay sai');

  // Configurable study options inside QuizPage
  const [currentOptions, setCurrentOptions] = useState<StudyOptions>(() => {
    return {
      shuffleQuestions: initialStudyOptions?.shuffleQuestions ?? false,
      shuffleOptions: initialStudyOptions?.shuffleOptions ?? false,
      instantFeedback: isWrongQuestionsQuiz ? true : (initialStudyOptions?.instantFeedback ?? true),
      mode: initialStudyOptions?.mode ?? 'mcq',
      timeLimitMinutes: isWrongQuestionsQuiz ? 0 : (initialStudyOptions?.timeLimitMinutes ?? 0),
      questionLimit: initialStudyOptions?.questionLimit ?? 0,
    };
  });

  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Save options whenever currentOptions changes
  useEffect(() => {
    try {
      localStorage.setItem('mcq_saved_study_options', JSON.stringify(currentOptions));
    } catch (e) {
      console.error('Failed to save study options', e);
    }
  }, [currentOptions]);

  // Process questions based on currentOptions (shuffle, limit, shuffle options)
  const preparedQuestions = useMemo(() => {
    let list = [...quiz.questions];

    // Shuffle questions if requested
    if (currentOptions.shuffleQuestions) {
      list.sort(() => Math.random() - 0.5);
    }

    // Limit questions count if requested
    if (currentOptions.questionLimit && currentOptions.questionLimit > 0) {
      list = list.slice(0, currentOptions.questionLimit);
    }

    // Shuffle options if requested
    if (currentOptions.shuffleOptions) {
      list = list.map((q) => {
        const correctList = q.correctAnswers && q.correctAnswers.length > 0 ? q.correctAnswers : [q.correctAnswer];
        const indexedOpts = q.options.map((optText, origIdx) => ({
          text: optText,
          isCorrect: correctList.includes(origIdx),
        }));

        indexedOpts.sort(() => Math.random() - 0.5);

        const newOptions = indexedOpts.map((o) => o.text);
        const newCorrectAnswers = indexedOpts
          .map((o, idx) => (o.isCorrect ? idx : -1))
          .filter((idx) => idx !== -1);
        const newCorrectAnswer = newCorrectAnswers[0] ?? 0;

        return {
          ...q,
          options: newOptions,
          correctAnswer: newCorrectAnswer,
          correctAnswers: newCorrectAnswers,
        };
      });
    }

    return list;
  }, [quiz, currentOptions]);

  const [currentIndex, setCurrentIndex] = useState(0);
  // Map question ID to user selected option index (single or array for multi-choice)
  const [userAnswers, setUserAnswers] = useState<Record<string, number | number[]>>({});
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [restoredMessage, setRestoredMessage] = useState<string | null>(null);
  const [flashcardResetKey, setFlashcardResetKey] = useState(0);
  const isRemoteUpdateRef = useRef(false);
  const isInitialMountRef = useRef(true);

  const isExamMode =
    !isWrongQuestionsQuiz &&
    (currentOptions.instantFeedback === false ||
      Boolean(currentOptions.timeLimitMinutes && currentOptions.timeLimitMinutes > 0));

  // Storage key for keeping track of active learning progress
  const progressKey = isWrongQuestionsQuiz
    ? `mcq_learning_progress_${quiz.id}_wrong`
    : `mcq_learning_progress_${quiz.id}`;

  // Restore active learning progress on mount (only for normal MCQ practice mode, skip in flashcard mode)
  useEffect(() => {
    if (isExamMode || initialStudyOptions?.mode === 'flashcard' || currentOptions.mode === 'flashcard') {
      return;
    }
    const saved = getQuizLearningProgress(quiz.id, isWrongQuestionsQuiz);
    const inMemoryLatest = realtimeSync.getLatestState('MCQ_PRACTICE', quiz.id);
    const target = inMemoryLatest?.data || saved;

    if (target) {
      if (typeof target.currentIndex === 'number' && target.currentIndex < quiz.questions.length) {
        setCurrentIndex(target.currentIndex);
      }
      if (target.userAnswers && typeof target.userAnswers === 'object') {
        setUserAnswers(target.userAnswers);
      }
      if (target.currentOptions && typeof target.currentOptions === 'object') {
        setCurrentOptions((prev) => ({
          ...prev,
          ...target.currentOptions,
          mode: initialStudyOptions?.mode ?? prev.mode ?? 'mcq',
        }));
      }
      if (target.currentIndex > 0 || (target.userAnswers && Object.keys(target.userAnswers).length > 0)) {
        setRestoredMessage(`Đã khôi phục tiến độ học từ trước (Câu ${target.currentIndex + 1}/${quiz.questions.length})`);
        setTimeout(() => setRestoredMessage(null), 4000);
      }
    }
  }, [quiz.id, isWrongQuestionsQuiz, quiz.questions.length, isExamMode, initialStudyOptions?.mode, currentOptions.mode]);

  // 1. Cross-Tab Real-time Sync via BroadcastChannel (< 2ms)
  useEffect(() => {
    if (isExamMode || currentOptions.mode === 'flashcard') return;

    const unsubscribe = realtimeSync.subscribeKey('MCQ_PRACTICE', quiz.id, (payload) => {
      if (typeof payload.currentIndex === 'number' && payload.currentIndex >= 0 && payload.currentIndex < quiz.questions.length) {
        isRemoteUpdateRef.current = true;
        setCurrentIndex(payload.currentIndex);
        if (payload.data?.userAnswers && typeof payload.data.userAnswers === 'object') {
          setUserAnswers(payload.data.userAnswers);
        }
        const sourceName = payload.senderId === 'remote_cloud' ? '📱 điện thoại' : '⚡ tab khác';
        setRestoredMessage(`Đã đồng bộ từ ${sourceName} sang câu ${payload.currentIndex + 1}/${quiz.questions.length}`);
        setTimeout(() => setRestoredMessage(null), 3000);
      }
    });

    return () => unsubscribe();
  }, [quiz.id, quiz.questions.length, isExamMode, currentOptions.mode]);

  // 2. Cross-Device Real-time Sync via Firebase Firestore onSnapshot (Phone <-> PC)
  useEffect(() => {
    if (isExamMode || currentOptions.mode === 'flashcard' || isWrongQuestionsQuiz) return;
    const userEmail = getCurrentUserEmail();
    if (!userEmail) return;

    const unsubscribe = subscribeQuizLearningProgress(userEmail, quiz.id, (cloudProgress) => {
      if (typeof cloudProgress.currentIndex === 'number' && cloudProgress.currentIndex >= 0 && cloudProgress.currentIndex < quiz.questions.length) {
        setCurrentIndex((prevIdx) => {
          if (prevIdx !== cloudProgress.currentIndex) {
            isRemoteUpdateRef.current = true;
            setRestoredMessage(`📱 Đã đồng bộ từ điện thoại/thiết bị khác (Câu ${cloudProgress.currentIndex + 1}/${quiz.questions.length})`);
            setTimeout(() => setRestoredMessage(null), 3000);
            return cloudProgress.currentIndex;
          }
          return prevIdx;
        });

        if (cloudProgress.userAnswers && typeof cloudProgress.userAnswers === 'object') {
          setUserAnswers(cloudProgress.userAnswers);
        }
      }
    });

    return () => unsubscribe();
  }, [quiz.id, quiz.questions.length, isExamMode, currentOptions.mode, isWrongQuestionsQuiz]);

  // 3. Re-check latest progress when tab regains focus or visibility
  useEffect(() => {
    const handleRecheck = () => {
      if (document.visibilityState === 'visible' && !isExamMode && currentOptions.mode !== 'flashcard') {
        const latest = getQuizLearningProgress(quiz.id, isWrongQuestionsQuiz);
        if (latest && typeof latest.currentIndex === 'number' && latest.currentIndex < quiz.questions.length) {
          setCurrentIndex((prev) => {
            if (prev !== latest.currentIndex) {
              isRemoteUpdateRef.current = true;
              setRestoredMessage(`⚡ Đã đồng bộ tức thì sang câu ${latest.currentIndex + 1}/${quiz.questions.length}`);
              setTimeout(() => setRestoredMessage(null), 2500);
              return latest.currentIndex;
            }
            return prev;
          });
          if (latest.userAnswers && typeof latest.userAnswers === 'object') {
            setUserAnswers(latest.userAnswers);
          }
        }
      }
    };

    window.addEventListener('focus', handleRecheck);
    document.addEventListener('visibilitychange', handleRecheck);
    return () => {
      window.removeEventListener('focus', handleRecheck);
      document.removeEventListener('visibilitychange', handleRecheck);
    };
  }, [quiz.id, isWrongQuestionsQuiz, quiz.questions.length, isExamMode, currentOptions.mode]);

  // 4. Persist learning progress on answer or question index change (guarded against initial mount and remote updates)
  useEffect(() => {
    if (isExamMode || currentOptions.mode === 'flashcard') {
      return;
    }

    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }

    if (Object.keys(userAnswers).length > 0 || currentIndex > 0) {
      saveQuizLearningProgress(
        quiz.id,
        {
          currentIndex,
          userAnswers,
          currentOptions,
          updatedAt: Date.now(),
        },
        isWrongQuestionsQuiz
      );
    }
  }, [currentIndex, userAnswers, currentOptions, quiz.id, isWrongQuestionsQuiz, isExamMode]);

  // Time limit state (disabled in wrong questions practice mode)
  const timeLimitSeconds =
    !isWrongQuestionsQuiz &&
    currentOptions.timeLimitMinutes &&
    currentOptions.timeLimitMinutes > 0
      ? currentOptions.timeLimitMinutes * 60
      : null;
  const [timeLeft, setTimeLeft] = useState<number | null>(timeLimitSeconds);

  const currentQuestion = preparedQuestions[currentIndex];

  const submitExam = useCallback(() => {
    // Clear saved progress on completion
    try {
      localStorage.removeItem(progressKey);
    } catch (e) {
      console.error(e);
    }

    const currentResults: QuestionResult[] = preparedQuestions.map((q) => {
      const selected = userAnswers[q.id];
      const correctList = q.correctAnswers && q.correctAnswers.length > 0 ? q.correctAnswers : [q.correctAnswer];

      let isCorrect = false;
      let selVal: number = -1;
      let selArr: number[] = [];

      if (selected !== undefined) {
        if (Array.isArray(selected)) {
          selArr = selected;
          selVal = selected.length > 0 ? selected[0] : -1;
          isCorrect = selected.length === correctList.length && correctList.every((c) => selected.includes(c));
        } else {
          selVal = selected;
          selArr = [selected];
          isCorrect = correctList.length === 1 && correctList.includes(selected);
        }
      }

      return {
        questionId: q.id,
        questionText: q.question,
        options: q.options,
        selectedAnswer: selVal,
        selectedAnswers: selArr,
        correctAnswer: q.correctAnswer,
        correctAnswers: correctList,
        isCorrect,
        explanation: q.explanation,
        note: q.note,
        difficulty: q.difficulty,
      };
    });

    const correctCount = currentResults.filter((r) => r.isCorrect).length;
    const wrongCount = currentResults.length - correctCount;
    const totalQuestions = preparedQuestions.length;
    const score = correctCount;
    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    const attempt: QuizAttempt = {
      id: `att-${Date.now()}`,
      quizId: quiz.id,
      quizTitle: quiz.title,
      score,
      totalQuestions,
      correctAnswers: correctCount,
      wrongAnswers: wrongCount,
      accuracy,
      date: new Date().toISOString(),
      questionResults: currentResults,
      mode: quizMode as 'normal' | 'practice_mistakes' | 'single_question',
    };

    if (soundEnabled) {
      sound.playFinish();
    }
    onQuizCompleted(attempt);
  }, [preparedQuestions, userAnswers, quiz.id, quiz.title, quizMode, onQuizCompleted, progressKey, soundEnabled]);

  const handleExit = () => {
    onExit();
  };

  const [isRestartConfirming, setIsRestartConfirming] = useState(false);

  const modeDisplayName =
    currentOptions.mode === 'flashcard'
      ? 'Thẻ ghi nhớ'
      : isWrongQuestionsQuiz
      ? 'Luyện câu hay sai'
      : 'Học';

  // Restart learning progress from beginning
  const executeRestartStudy = () => {
    setCurrentIndex(0);
    setUserAnswers({});
    try {
      clearQuizLearningProgress(quiz.id, isWrongQuestionsQuiz);
      if (currentOptions.mode === 'flashcard') {
        localStorage.removeItem(`flashcard_progress_${quiz.id}`);
        setFlashcardResetKey((k) => k + 1);
      }
    } catch (e) {
      console.error(e);
    }
    if (timeLimitSeconds) {
      setTimeLeft(timeLimitSeconds);
    }
    if (soundEnabled) {
      sound.playFlip();
    }
    setIsRestartConfirming(false);
    setShowOptionsModal(false);
  };

  const handleRestartStudy = () => {
    setIsRestartConfirming(true);
  };

  // Timer countdown hook
  useEffect(() => {
    if (timeLeft === null || currentOptions.mode === 'flashcard') return;

    if (timeLeft <= 0) {
      alert('Đã hết giờ làm bài thi! Hệ thống sẽ tự động nộp bài.');
      submitExam();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, currentOptions.mode, submitExam]);

  const handleAnswerSelect = (selectedIndex: number | number[]) => {
    if (!currentQuestion) return;
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: selectedIndex,
    }));

    if (isPracticeMode) {
      const correctList = currentQuestion.correctAnswers && currentQuestion.correctAnswers.length > 0
        ? currentQuestion.correctAnswers
        : [currentQuestion.correctAnswer];

      let isCorrect = false;
      if (Array.isArray(selectedIndex)) {
        isCorrect = selectedIndex.length === correctList.length && correctList.every((c) => selectedIndex.includes(c));
      } else {
        isCorrect = correctList.length === 1 && correctList.includes(selectedIndex);
      }

      updateSingleQuestionStat(quiz.id, currentQuestion.id, isCorrect, 'practice');
    }
  };

  const handleNext = () => {
    if (currentIndex < preparedQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      if (isPracticeMode) {
        submitExam();
      } else {
        setShowSubmitConfirm(true);
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(userAnswers).length;

  const correctCount = useMemo(() => {
    return preparedQuestions.filter((q) => {
      const ans = userAnswers[q.id];
      if (ans === undefined) return false;
      const correctList = q.correctAnswers && q.correctAnswers.length > 0 ? q.correctAnswers : [q.correctAnswer];
      if (Array.isArray(ans)) {
        return ans.length === correctList.length && correctList.every((c) => ans.includes(c));
      }
      return correctList.length === 1 && correctList.includes(ans);
    }).length;
  }, [preparedQuestions, userAnswers]);

  const wrongCount = useMemo(() => {
    return preparedQuestions.filter((q) => {
      const ans = userAnswers[q.id];
      if (ans === undefined) return false;
      const correctList = q.correctAnswers && q.correctAnswers.length > 0 ? q.correctAnswers : [q.correctAnswer];
      if (Array.isArray(ans)) {
        return !(ans.length === correctList.length && correctList.every((c) => ans.includes(c)));
      }
      return !(correctList.length === 1 && correctList.includes(ans));
    }).length;
  }, [preparedQuestions, userAnswers]);

  const isPracticeMode = currentOptions.instantFeedback !== false;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Restored notification toast */}
      {restoredMessage && (
        <div className="p-3.5 bg-indigo-600 text-white font-bold text-xs rounded-2xl shadow-md flex items-center justify-between animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>{restoredMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setRestoredMessage(null)}
            className="text-white/80 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Navigation Control */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExit}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Thoát</span>
          </button>

          {/* Button Tùy Chọn - Hide in exam/test mode */}
          {isPracticeMode && (
            <button
              type="button"
              onClick={() => setShowOptionsModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800 rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Tùy chọn</span>
            </button>
          )}
        </div>

        {/* Timer display */}
        {timeLeft !== null && currentOptions.mode !== 'flashcard' && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl shadow-xs font-mono font-extrabold text-xs sm:text-sm animate-pulse">
            <Clock className="w-4 h-4" />
            <span>Thời gian còn lại: {formatTime(timeLeft)}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block">
              {quiz.title}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              Đã làm: {answeredCount} / {preparedQuestions.length} câu
            </span>
          </div>

          {!isPracticeMode && (
            <button
              type="button"
              onClick={() => setShowSubmitConfirm(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Nộp bài thi</span>
            </button>
          )}
        </div>
      </div>

      {currentOptions.mode === 'flashcard' ? (
        <FlashcardViewer
          key={`flashcard_${quiz.id}_${flashcardResetKey}`}
          quizId={quiz.id}
          quizTitle={quiz.title}
          questions={preparedQuestions}
          onFinish={handleExit}
        />
      ) : (
        <div className="space-y-6">
          {/* Thanh tiến độ ở trên cùng */}
          <ProgressBar
            currentIndex={currentIndex}
            totalQuestions={preparedQuestions.length}
            score={correctCount}
            answeredCount={answeredCount}
            correctCount={correctCount}
            wrongCount={wrongCount}
            isExamMode={!isPracticeMode}
          />

          {/* Practice / Quiz layout */}
          {isPracticeMode ? (
            /* ÔN TẬP: Không có bảng chọn câu, chỉ đi tiếp tuần tự (Next) */
            <div className="max-w-4xl mx-auto space-y-4">
              {currentQuestion && (
                <QuestionCard
                  question={currentQuestion}
                  questionNumber={currentIndex + 1}
                  totalQuestions={preparedQuestions.length}
                  onAnswerSelected={handleAnswerSelect}
                  onNextQuestion={handleNext}
                  onPrevQuestion={() => {
                    if (currentIndex > 0) {
                      setCurrentIndex((prev) => prev - 1);
                    }
                  }}
                  isLastQuestion={currentIndex === preparedQuestions.length - 1}
                  selectedAnswer={userAnswers[currentQuestion.id] ?? null}
                  isAnswered={userAnswers[currentQuestion.id] !== undefined}
                  isExamMode={false}
                  instantFeedback={true}
                  quizId={quiz.id}
                  quizTitle={quiz.title}
                />
              )}
            </div>
          ) : (
            /* KIỂM TRA MODE (Exam): Bảng ma trận bên cạnh để theo dõi số câu đã làm */
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
              {/* LEFT SIDEBAR: Question Palette Matrix */}
              <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 lg:sticky lg:top-24">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Grid className="w-4 h-4 text-indigo-600" />
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100">
                      Danh sách câu
                    </h4>
                  </div>
                  <span className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400">
                    {answeredCount}/{preparedQuestions.length}
                  </span>
                </div>

                <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-4 gap-2 max-h-[380px] overflow-y-auto pr-1">
                  {preparedQuestions.map((q, idx) => {
                    const isAnswered = userAnswers[q.id] !== undefined;
                    const isCurrent = currentIndex === idx;

                    let btnStyle = 'border-slate-200/80 text-slate-600 dark:border-slate-800 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40';
                    if (isAnswered) {
                      btnStyle = 'bg-indigo-600 text-white border-indigo-600 font-extrabold shadow-2xs';
                    }
                    if (isCurrent) {
                      btnStyle += ' ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 font-extrabold';
                    }

                    return (
                      <button
                        key={q.id || idx}
                        type="button"
                        onClick={() => setCurrentIndex(idx)}
                        className={`h-9 text-xs rounded-xl border flex items-center justify-center transition-all cursor-pointer ${btnStyle}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setShowSubmitConfirm(true)}
                  className="w-full py-3 px-4 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Nộp Bài Thi Ngay</span>
                </button>
              </div>

              {/* MAIN QUESTION CARD */}
              <div className="lg:col-span-3 space-y-4">
                {currentQuestion && (
                  <QuestionCard
                    question={currentQuestion}
                    questionNumber={currentIndex + 1}
                    totalQuestions={preparedQuestions.length}
                    onAnswerSelected={handleAnswerSelect}
                    onNextQuestion={handleNext}
                    onPrevQuestion={() => {
                      if (currentIndex > 0) {
                        setCurrentIndex((prev) => prev - 1);
                      }
                    }}
                    isLastQuestion={currentIndex === preparedQuestions.length - 1}
                    selectedAnswer={userAnswers[currentQuestion.id] ?? null}
                    isAnswered={userAnswers[currentQuestion.id] !== undefined}
                    isExamMode={true}
                    instantFeedback={false}
                    quizId={quiz.id}
                    quizTitle={quiz.title}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* OPTIONS MODAL INSIDE QUIZPAGE */}
      {showOptionsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl text-white space-y-6 animate-in zoom-in-95 duration-200 relative">
            <button
              type="button"
              onClick={() => setShowOptionsModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white">Tùy chọn bài học</h3>
                <p className="text-xs text-slate-400">
                  Điều chỉnh cài đặt trộn câu, đáp án, và hiển thị
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Option 1: Shuffle questions */}
              <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Shuffle className="w-4 h-4 text-indigo-400" />
                  <div>
                    <span className="font-bold text-xs text-slate-100 block">Trộn thẻ / câu hỏi</span>
                    <span className="text-[11px] text-slate-400 block">Xáo trộn ngẫu nhiên thứ tự câu hỏi</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={currentOptions.shuffleQuestions}
                  onChange={(e) =>
                    setCurrentOptions((prev) => ({ ...prev, shuffleQuestions: e.target.checked }))
                  }
                  className="w-5 h-5 text-indigo-600 rounded-md focus:ring-indigo-500 cursor-pointer"
                />
              </label>

              {/* Option 2: Shuffle options */}
              <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 cursor-pointer">
                <div className="flex items-center gap-3">
                  <RotateCw className="w-4 h-4 text-indigo-400" />
                  <div>
                    <span className="font-bold text-xs text-slate-100 block">Trộn phương án A B C D</span>
                    <span className="text-[11px] text-slate-400 block">Xáo trộn vị trí lựa chọn đáp án</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={currentOptions.shuffleOptions}
                  onChange={(e) =>
                    setCurrentOptions((prev) => ({ ...prev, shuffleOptions: e.target.checked }))
                  }
                  className="w-5 h-5 text-indigo-600 rounded-md focus:ring-indigo-500 cursor-pointer"
                />
              </label>

              {/* Option 3: Instant feedback */}
              <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="font-bold text-xs text-slate-100 block">Hiện đáp án ngay khi chọn</span>
                    <span className="text-[11px] text-slate-400 block">Giải thích & phản hồi tức thì</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={currentOptions.instantFeedback !== false}
                  onChange={(e) =>
                    setCurrentOptions((prev) => ({ ...prev, instantFeedback: e.target.checked }))
                  }
                  className="w-5 h-5 text-indigo-600 rounded-md focus:ring-indigo-500 cursor-pointer"
                />
              </label>

              {/* Option 4: Sound effects */}
              <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="font-bold text-xs text-slate-100 block">Hiệu ứng âm thanh</span>
                    <span className="text-[11px] text-slate-400 block">Âm thanh khi trả lời đúng / sai</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="w-5 h-5 text-indigo-600 rounded-md focus:ring-indigo-500 cursor-pointer"
                />
              </label>
            </div>

            {/* Restart section */}
            {isRestartConfirming ? (
              <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800/80 space-y-2.5 animate-in fade-in duration-150">
                <div className="text-xs font-bold text-rose-200 flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Xác nhận khởi động lại {modeDisplayName} từ câu 1?</span>
                </div>
                <p className="text-[11px] text-rose-300/80 leading-relaxed">
                  Toàn bộ tiến độ và câu trả lời tạm thời của phần {modeDisplayName} sẽ được xóa để bắt đầu lại từ đầu.
                </p>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsRestartConfirming(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-all cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={executeRestartStudy}
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-all cursor-pointer shadow-xs"
                  >
                    Đồng ý Khởi động lại
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleRestartStudy}
                  className="px-4 py-2.5 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Khởi động lại {modeDisplayName}</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRestartConfirming(false);
                      setShowOptionsModal(false);
                    }}
                    className="px-4 py-2.5 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Send className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                Xác nhận nộp bài thi
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Bạn đã hoàn thành <strong className="font-bold text-indigo-600">{answeredCount}</strong> / <strong className="font-bold">{preparedQuestions.length}</strong> câu hỏi.
                {answeredCount < preparedQuestions.length && (
                  <span className="block text-rose-500 font-bold mt-1">
                    Chú ý: Còn {preparedQuestions.length - answeredCount} câu chưa có câu trả lời!
                  </span>
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                className="py-3 px-4 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
              >
                Làm tiếp
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSubmitConfirm(false);
                  submitExam();
                }}
                className="py-3 px-4 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Đồng ý Nộp bài
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

