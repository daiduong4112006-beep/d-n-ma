import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  Volume1,
  CheckCircle2,
  AlertCircle,
  Award,
  RotateCcw,
  ArrowRight,
  Shuffle,
  Sparkles,
  SlidersHorizontal,
  ArrowLeftRight,
} from 'lucide-react';
import { JapaneseLesson, JapaneseVocabCard } from '../../types/japanese';
import { speakJapanese } from '../../utils/japaneseKana';
import { sound } from '../../utils/audio';
import { getMultiChoiceProgress, saveMultiChoiceProgress, clearMultiChoiceProgress } from '../../utils/studyProgressStorage';
import { shuffleArray } from '../../utils/shuffle';
import { realtimeSync } from '../../utils/realtimeSync';

interface JapaneseMultiChoiceModeProps {
  lesson: JapaneseLesson;
  onExit: () => void;
  onCardMastered?: (cardId: string, mastered: boolean) => void;
}

interface QuestionItem {
  card: JapaneseVocabCard;
  questionText: string;
  subText?: string;
  correctAnswerText: string;
  options: string[];
  correctOptionIndex: number;
}

export const JapaneseMultiChoiceMode: React.FC<JapaneseMultiChoiceModeProps> = ({
  lesson,
  onExit,
  onCardMastered,
}) => {
  const [cards, setCards] = useState<JapaneseVocabCard[]>(lesson.cards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [missedQuestions, setMissedQuestions] = useState<QuestionItem[]>([]);
  const [showResumeBanner, setShowResumeBanner] = useState(false);

  // Options & Audio Settings
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(() => sound.isEnabled());
  const [autoSpeechEnabled, setAutoSpeechEnabled] = useState(() => {
    return localStorage.getItem('multichoice_auto_speech') === 'true';
  });
  const [direction, setDirection] = useState<'vi-to-jp' | 'jp-to-vi'>(() => {
    const saved = localStorage.getItem('multichoice_direction');
    return saved === 'jp-to-vi' ? 'jp-to-vi' : 'vi-to-jp';
  });

  const storageId = `lesson_${lesson.id}`;

  // Generate 4-option multiple choice questions depending on direction
  const questions: QuestionItem[] = useMemo(() => {
    if (cards.length === 0) return [];

    return cards.map((targetCard) => {
      let questionText = '';
      let subText = targetCard.example;
      let correctAnswerText = '';
      let distractors: string[] = [];

      if (direction === 'vi-to-jp') {
        // Nghĩa -> Thuật ngữ (Việt -> Nhật)
        questionText = targetCard.definition;
        correctAnswerText = targetCard.reading && targetCard.reading !== targetCard.term
          ? `${targetCard.reading} (${targetCard.term})`
          : (targetCard.reading || targetCard.term);

        const otherCards = cards.filter((c) => c.id !== targetCard.id);
        const shuffledOthers = shuffleArray(otherCards);
        distractors = shuffledOthers.slice(0, 3).map((c) =>
          c.reading && c.reading !== c.term ? `${c.reading} (${c.term})` : (c.reading || c.term)
        );

        const fallbackDistractors = ['学生 (がくせい)', '先生 (せんせい)', '学校 (がっこう)', '本 (ほん)'];
        while (distractors.length < 3) {
          const fb = fallbackDistractors.find((d) => d !== correctAnswerText && !distractors.includes(d));
          if (fb) distractors.push(fb);
          else distractors.push(`Từ vựng ${distractors.length + 1}`);
        }
      } else {
        // Thuật ngữ -> Nghĩa (Nhật -> Việt)
        const mainWord = targetCard.reading && targetCard.reading !== targetCard.term
          ? targetCard.reading
          : targetCard.term;
        const subKanji = targetCard.reading && targetCard.reading !== targetCard.term
          ? targetCard.term
          : '';
        const romaji = targetCard.romaji ? `[${targetCard.romaji}]` : '';

        questionText = mainWord;
        subText = [subKanji, romaji].filter(Boolean).join(' ') || targetCard.example;
        correctAnswerText = targetCard.definition;

        const otherCards = cards.filter((c) => c.id !== targetCard.id);
        const shuffledOthers = shuffleArray(otherCards);
        distractors = shuffledOthers.slice(0, 3).map((c) => c.definition);

        const fallbackDistractors = ['Học sinh, sinh viên', 'Giáo viên, thầy cô', 'Trường học', 'Quyển sách'];
        while (distractors.length < 3) {
          const fb = fallbackDistractors.find((d) => d !== correctAnswerText && !distractors.includes(d));
          if (fb) distractors.push(fb);
          else distractors.push(`Ý nghĩa ${distractors.length + 1}`);
        }
      }

      // Merge and shuffle options
      const allOptions = shuffleArray([correctAnswerText, ...distractors]);
      const correctOptionIndex = allOptions.indexOf(correctAnswerText);

      return {
        card: targetCard,
        questionText,
        subText,
        correctAnswerText,
        options: allOptions,
        correctOptionIndex,
      };
    });
  }, [cards, direction]);

  // Toggle question direction
  const toggleDirection = (newDir?: 'vi-to-jp' | 'jp-to-vi') => {
    const next = newDir || (direction === 'vi-to-jp' ? 'jp-to-vi' : 'vi-to-jp');
    setDirection(next);
    localStorage.setItem('multichoice_direction', next);
    setSelectedOption(null);
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    sound.playClick();
  };

  // 1. Restore previous session progress on mount
  useEffect(() => {
    const saved = getMultiChoiceProgress(storageId);
    if (saved && typeof saved.currentIndex === 'number' && saved.currentIndex > 0 && saved.currentIndex < lesson.cards.length) {
      if (saved.cardIds && saved.cardIds.length === lesson.cards.length) {
        const idMap = new Map<string, JapaneseVocabCard>(lesson.cards.map((c) => [c.id, c] as [string, JapaneseVocabCard]));
        const reordered = saved.cardIds.map((id) => idMap.get(id)).filter(Boolean) as JapaneseVocabCard[];
        if (reordered.length === lesson.cards.length) {
          setCards(reordered);
        }
      }
      setCurrentIndex(saved.currentIndex);
      setScore(saved.score || 0);
      setStreak(saved.streak || 0);
      setSeconds(saved.seconds || 0);
      setShowResumeBanner(true);
    }
  }, [storageId, lesson.cards]);

  const isRemoteUpdateRef = useRef(false);
  const isInitialMountRef = useRef(true);

  // Cross-Tab & Cross-Device Real-time Sync (< 2ms)
  useEffect(() => {
    if (!storageId) return;

    const unsubscribe = realtimeSync.subscribeKey('JP_MULTICHOICE', storageId, (payload) => {
      if (typeof payload.currentIndex === 'number' && payload.currentIndex >= 0 && payload.currentIndex < cards.length) {
        isRemoteUpdateRef.current = true;
        setCurrentIndex(payload.currentIndex);
        setSelectedOption(null);
        setIsAnswerChecked(false);
        if (typeof payload.data?.score === 'number') setScore(payload.data.score);
        if (typeof payload.data?.streak === 'number') setStreak(payload.data.streak);
      }
    });

    return () => unsubscribe();
  }, [storageId, cards.length]);

  // 2. Save progress on change
  useEffect(() => {
    if (cards.length === 0 || isCompleted) return;

    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }

    saveMultiChoiceProgress(storageId, {
      currentIndex,
      cardIds: cards.map((c) => c.id),
      score,
      streak,
      seconds,
      missedCardIds: missedQuestions.map((q) => q.card.id),
    });
  }, [currentIndex, cards, score, streak, seconds, missedQuestions, isCompleted, storageId]);

  const currentQ = questions[currentIndex];

  // Auto speech for new question in jp-to-vi mode
  useEffect(() => {
    if (autoSpeechEnabled && currentQ && direction === 'jp-to-vi' && !isCompleted) {
      speakJapanese(currentQ.card.reading || currentQ.card.term);
    }
  }, [currentIndex, autoSpeechEnabled, direction, isCompleted, currentQ]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (index: number) => {
    if (selectedOption !== null || !currentQ) return;

    setSelectedOption(index);
    const isCorrect = index === currentQ.correctOptionIndex;

    if (isCorrect) {
      sound.playCorrect();
      setScore((s) => s + 1);
      setStreak((st) => st + 1);
      if (autoSpeechEnabled) {
        speakJapanese(currentQ.card.reading || currentQ.card.term);
      }
      if (onCardMastered) onCardMastered(currentQ.card.id, true);

      // Auto advance
      setTimeout(() => {
        handleNextQuestion();
      }, 1000);
    } else {
      sound.playWrong();
      setStreak(0);
      if (autoSpeechEnabled) {
        speakJapanese(currentQ.card.reading || currentQ.card.term);
      }
      setMissedQuestions((prev) => [...prev, currentQ]);
      // Do not demote card from mastered on incorrect guess in multichoice
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
    } else {
      sound.playFinish();
      setIsCompleted(true);
      clearMultiChoiceProgress(storageId);
    }
  };

  // SHUFFLE ACTION (Trộn câu)
  const handleShuffle = () => {
    const shuffled = shuffleArray(cards);
    setCards(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setSeconds(0);
    setSelectedOption(null);
    setIsCompleted(false);
    setShowResumeBanner(false);
    sound.playClick();
  };

  // RESTORE ACTION (Khôi phục / Bắt đầu lại)
  const handleRestore = () => {
    setCards(lesson.cards);
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setSeconds(0);
    setSelectedOption(null);
    setIsCompleted(false);
    setMissedQuestions([]);
    setShowResumeBanner(false);
    clearMultiChoiceProgress(storageId);
    sound.playClick();
  };

  if (cards.length === 0 || !currentQ) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center text-slate-100">
        <p className="text-sm text-slate-400">Không đủ thẻ từ vựng để tạo bài trắc nghiệm.</p>
        <button
          type="button"
          onClick={onExit}
          className="mt-4 px-4 py-2 bg-indigo-600 rounded-xl text-xs font-bold text-white cursor-pointer"
        >
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 flex flex-col justify-between p-4 sm:p-8 select-none">
      {/* Top Bar matching design */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between py-3 border-b border-slate-800/80">
        {/* Left Side: Direction toggle & Count */}
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => toggleDirection()}
            className="flex items-center gap-1.5 text-left group cursor-pointer"
            title="Nhấn để đổi chiều: Thuật ngữ ↔ Định nghĩa"
          >
            <span className="text-[11px] font-black uppercase text-cyan-400 tracking-wider">
              {direction === 'vi-to-jp' ? 'VIỆT → NHẬT' : 'NHẬT → VIỆT'}
            </span>
            <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-180 transition-transform" />
          </button>
          <span className="text-xl sm:text-2xl font-black text-white leading-tight">
            {currentIndex + 1}/{questions.length}
          </span>
        </div>

        {/* Center: Thời gian & Streak */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
            THỜI GIAN
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-black text-white font-mono leading-tight">
              {formatTime(seconds)}
            </span>
            {streak > 1 && (
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold items-center gap-1 border border-amber-500/30">
                <Sparkles className="w-2.5 h-2.5" />
                {streak}x
              </span>
            )}
          </div>
        </div>

        {/* Right Side: Tùy chọn & Thoát */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Nút Tùy chọn */}
          <button
            type="button"
            onClick={() => {
              setShowOptionsModal(true);
              sound.playClick();
            }}
            className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-xs"
            title="Tùy chọn bài trắc nghiệm"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tùy chọn</span>
          </button>

          {/* Nút ✕ Thoát */}
          <button
            type="button"
            onClick={onExit}
            className="px-4 py-1.5 rounded-full border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>Thoát</span>
          </button>
        </div>
      </div>

      {/* Options Modal */}
      {showOptionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 rounded-3xl border border-slate-700 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black">Tùy chọn trắc nghiệm</h3>
                  <p className="text-[11px] text-slate-400">Cài đặt hướng câu hỏi, âm thanh và thứ tự câu</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOptionsModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Đảo thuật ngữ và nghĩa */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  Đảo thuật ngữ và nghĩa
                </label>
                <button
                  type="button"
                  onClick={() => toggleDirection()}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 flex items-center justify-between text-xs font-bold transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <ArrowLeftRight className="w-4 h-4 text-indigo-400" />
                    <span>
                      {direction === 'vi-to-jp'
                        ? '🇻🇳 Nghĩa → 🇯🇵 Thuật ngữ'
                        : '🇯🇵 Thuật ngữ → 🇻🇳 Nghĩa'}
                    </span>
                  </div>
                  <span className="text-[11px] text-indigo-400 font-bold">Chạm để đổi</span>
                </button>
              </div>

              {/* Actions: Trộn câu & Khôi phục */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  Thứ tự câu hỏi
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleShuffle();
                      setShowOptionsModal(false);
                    }}
                    className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white border border-slate-700 flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer"
                  >
                    <Shuffle className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Trộn câu</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleRestore();
                      setShowOptionsModal(false);
                    }}
                    className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-amber-600 text-slate-200 hover:text-white border border-slate-700 flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Khôi phục</span>
                  </button>
                </div>
              </div>

              {/* Audio Settings: Âm thanh hiệu ứng & Âm thanh nói */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  Cài đặt âm thanh
                </label>

                {/* Âm thanh hiệu ứng */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/60 border border-slate-800">
                  <div className="flex items-center gap-2.5">
                    {soundEffectsEnabled ? (
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-slate-500" />
                    )}
                    <div>
                      <div className="text-xs font-bold">Âm thanh hiệu ứng</div>
                      <div className="text-[10px] text-slate-400">Tiếng chọn đúng, sai và hoàn thành</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !soundEffectsEnabled;
                      setSoundEffectsEnabled(next);
                      sound.setEnabled(next);
                    }}
                    className={`w-11 h-6 rounded-full transition-colors cursor-pointer relative p-0.5 ${
                      soundEffectsEnabled ? 'bg-emerald-600' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        soundEffectsEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Âm thanh nói (Tự động đọc) */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/60 border border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <Volume1 className={`w-4 h-4 ${autoSpeechEnabled ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <div>
                      <div className="text-xs font-bold">Âm thanh nói (Tự động)</div>
                      <div className="text-[10px] text-slate-400">Tự động đọc từ tiếng Nhật khi làm bài</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !autoSpeechEnabled;
                      setAutoSpeechEnabled(next);
                      localStorage.setItem('multichoice_auto_speech', next ? 'true' : 'false');
                      if (next && currentQ) {
                        speakJapanese(currentQ.card.reading || currentQ.card.term);
                      }
                    }}
                    className={`w-11 h-6 rounded-full transition-colors cursor-pointer relative p-0.5 ${
                      autoSpeechEnabled ? 'bg-indigo-600' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        autoSpeechEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowOptionsModal(false)}
                className="w-full py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black cursor-pointer shadow-md shadow-indigo-600/30"
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resume Banner */}
      {showResumeBanner && (
        <div className="max-w-xl mx-auto w-full mt-3 p-2.5 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-between text-xs text-indigo-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Đang tiếp tục câu #{currentIndex + 1} bạn đang làm dở.</span>
          </div>
          <button
            type="button"
            onClick={handleRestore}
            className="text-amber-300 hover:text-white font-bold ml-2 underline cursor-pointer"
          >
            Bắt đầu lại
          </button>
        </div>
      )}

      {/* Center Multiple Choice Area */}
      {!isCompleted ? (
        <div className="max-w-xl mx-auto w-full my-auto py-6 space-y-6">
          {/* Question Card */}
          <div className="p-8 sm:p-10 rounded-3xl bg-slate-900 border-2 border-slate-800 text-center relative shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => speakJapanese(currentQ.card.reading || currentQ.card.term)}
              className="absolute top-4 right-4 p-2.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Nghe phát âm"
            >
              <Volume2 className="w-4 h-4" />
            </button>

            <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-400 block">
              {direction === 'vi-to-jp' ? 'CHỌN TỪ VỰNG TIẾNG NHẬT' : 'CHỌN NGHĨA TIẾNG VIỆT'}
            </span>

            <div className="py-2">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight">
                {currentQ.questionText}
              </h2>
              {currentQ.subText && (
                <p className="text-sm sm:text-base text-slate-300 font-medium mt-2">
                  {currentQ.subText}
                </p>
              )}
            </div>
          </div>

          {/* 4 Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentQ.options.map((option, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrect = idx === currentQ.correctOptionIndex;

              let btnStyle = 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-700 text-slate-200';

              if (selectedOption !== null) {
                if (isCorrect) {
                  btnStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/50';
                } else if (isSelected) {
                  btnStyle = 'bg-rose-950/80 border-rose-500 text-rose-200 ring-2 ring-rose-500/50';
                } else {
                  btnStyle = 'bg-slate-900/40 border-slate-800/40 text-slate-600 opacity-40';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectOption(idx)}
                  disabled={selectedOption !== null}
                  className={`p-4 rounded-2xl border-2 text-left font-bold text-base transition-all duration-150 cursor-pointer flex items-center justify-between min-h-[72px] active:scale-[0.98] ${btnStyle}`}
                >
                  <span className="leading-snug">{option}</span>
                  {selectedOption !== null && isCorrect && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 ml-2" />
                  )}
                  {selectedOption !== null && isSelected && !isCorrect && (
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>

          {/* If answered wrong, show Next button */}
          {selectedOption !== null && selectedOption !== currentQ.correctOptionIndex && (
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleNextQuestion}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
              >
                <span>Câu tiếp theo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Results View */
        <div className="max-w-md mx-auto w-full my-auto text-center space-y-6 p-8 rounded-3xl bg-slate-900 border border-slate-800">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-xl">
            <Award className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white">Hoàn thành bài trắc nghiệm!</h2>
            <p className="text-xs text-slate-400">Bạn đã hoàn tất bài kiểm tra trắc nghiệm.</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-around">
            <div>
              <span className="text-2xl font-black text-emerald-400 block">{score}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Đúng</span>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div>
              <span className="text-2xl font-black text-rose-400 block">{missedQuestions.length}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Sai</span>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div>
              <span className="text-2xl font-black text-indigo-400 block">
                {Math.round((score / questions.length) * 100)}%
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Chính xác</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleRestore}
              className="flex-1 py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-700"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>Làm lại</span>
            </button>
            <button
              type="button"
              onClick={onExit}
              className="flex-1 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs cursor-pointer transition-all shadow-md"
            >
              Quay lại bài học
            </button>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="max-w-4xl mx-auto w-full">
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-indigo-500 to-cyan-400 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
