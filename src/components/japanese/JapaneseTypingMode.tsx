import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  Volume1,
  ArrowRight,
  RotateCcw,
  Award,
  CheckCircle2,
  AlertCircle,
  Shuffle,
  Sparkles,
  SlidersHorizontal,
  ArrowLeftRight,
} from 'lucide-react';
import { JapaneseLesson, JapaneseVocabCard } from '../../types/japanese';
import {
  convertRomajiToKana,
  speakJapanese,
  checkJapaneseAnswer,
  checkVietnameseAnswer,
} from '../../utils/japaneseKana';
import { sound } from '../../utils/audio';
import { getTypingProgress, saveTypingProgress, clearTypingProgress } from '../../utils/studyProgressStorage';
import { shuffleArray } from '../../utils/shuffle';
import { realtimeSync } from '../../utils/realtimeSync';

export type TypingDirection = 'kanji-to-reading' | 'vi-to-jp' | 'jp-to-vi';

interface JapaneseTypingModeProps {
  lesson: JapaneseLesson;
  initialFilter?: 'original' | 'mastered' | 'all';
  isKanjiSection?: boolean;
  initialDirection?: TypingDirection;
  onExit: () => void;
  onCardMastered?: (cardId: string, mastered: boolean) => void;
}

export const JapaneseTypingMode: React.FC<JapaneseTypingModeProps> = ({
  lesson,
  initialFilter = 'original',
  isKanjiSection = false,
  initialDirection,
  onExit,
  onCardMastered,
}) => {
  // Source cards representing full list from outer view
  const [cardsSource, setCardsSource] = useState<JapaneseVocabCard[]>(lesson.cards);

  // Sync if lesson.cards prop changes
  useEffect(() => {
    setCardsSource(lesson.cards);
  }, [lesson.cards]);

  // Compute counts from cardsSource (outer list data)
  const unmasteredCount = cardsSource.filter((c) => !c.mastered).length;
  const masteredCount = cardsSource.filter((c) => !!c.mastered).length;
  const totalCount = cardsSource.length;

  const getCardsByTab = (tab: 'original' | 'mastered' | 'all', source: JapaneseVocabCard[]) => {
    if (tab === 'original') return source.filter((c) => !c.mastered);
    if (tab === 'mastered') return source.filter((c) => !!c.mastered);
    return source;
  };

  // Filter tab: 'original' | 'mastered' | 'all'
  const [filterTab, setFilterTab] = useState<'original' | 'mastered' | 'all'>(() => {
    if (initialFilter === 'original' && unmasteredCount === 0 && totalCount > 0) {
      return 'all';
    }
    if (initialFilter === 'mastered' && masteredCount === 0 && unmasteredCount > 0) {
      return 'original';
    }
    return initialFilter || 'original';
  });

  const [isShuffleEnabled, setIsShuffleEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('typing_shuffle_enabled');
    return saved !== null ? saved === 'true' : true; // Default ON
  });

  const [cards, setCards] = useState<JapaneseVocabCard[]>(() => {
    const tab =
      initialFilter === 'original' && unmasteredCount === 0 && totalCount > 0
        ? 'all'
        : initialFilter === 'mastered' && masteredCount === 0 && unmasteredCount > 0
        ? 'original'
        : initialFilter || 'original';
    const baseList = getCardsByTab(tab, lesson.cards);
    const saved = localStorage.getItem('typing_shuffle_enabled');
    const shouldShuffle = saved !== null ? saved === 'true' : true;
    return shouldShuffle ? shuffleArray(baseList) : [...baseList];
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputVal, setInputVal] = useState('');
  const [imeMode, setImeMode] = useState<'hiragana' | 'katakana' | 'off'>('hiragana');
  const [seconds, setSeconds] = useState(0);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [wrongCardIds, setWrongCardIds] = useState<Set<string>>(new Set());
  const [isCompleted, setIsCompleted] = useState(false);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [showAudioHintFeedback, setShowAudioHintFeedback] = useState(false);

  // Options modal & audio settings
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(() => sound.isEnabled());
  const [autoSpeechEnabled, setAutoSpeechEnabled] = useState(() => {
    return localStorage.getItem('typing_auto_speech') === 'true';
  });
  const [direction, setDirection] = useState<TypingDirection>(() => {
    if (initialDirection) {
      return initialDirection;
    }
    if (isKanjiSection) {
      const saved = localStorage.getItem('typing_direction_kanji');
      return (saved as TypingDirection) || 'kanji-to-reading';
    }
    const saved = localStorage.getItem('typing_direction_vocab_user');
    return (saved as TypingDirection) || 'vi-to-jp';
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | null>(null);

  const currentCard = cards[currentIndex];
  const storageId = `lesson_${lesson.id}_${filterTab}`;

  // Switch category tab ('original' | 'mastered' | 'all')
  const handleChangeFilterTab = (newTab: 'original' | 'mastered' | 'all') => {
    if (newTab === filterTab) return;
    setFilterTab(newTab);
    const filtered = getCardsByTab(newTab, cardsSource);
    setCards(isShuffleEnabled ? shuffleArray(filtered) : [...filtered]);
    setCurrentIndex(0);
    setInputVal('');
    setIsAnswerChecked(false);
    setIsCorrect(null);
    setScore(0);
    setSeconds(0);
    setIsCompleted(false);
    setWrongCardIds(new Set());
    setShowResumeBanner(false);
    sound.playClick();
  };

  // Toggle card mastery and sync directly to outer list
  const handleToggleCurrentCardMastery = () => {
    if (!currentCard) return;
    const nextMastered = !currentCard.mastered;
    if (onCardMastered) {
      onCardMastered(currentCard.id, nextMastered);
    }
    setCardsSource((prev) =>
      prev.map((c) => (c.id === currentCard.id ? { ...c, mastered: nextMastered } : c))
    );
    setCards((prev) =>
      prev.map((c) => (c.id === currentCard.id ? { ...c, mastered: nextMastered } : c))
    );
    if (nextMastered) {
      sound.playCorrect();
    } else {
      sound.playClick();
    }
  };

  // Toggle question direction
  const toggleDirection = (newDir?: TypingDirection) => {
    let next: TypingDirection;
    if (newDir) {
      next = newDir;
    } else if (isKanjiSection) {
      if (direction === 'kanji-to-reading') next = 'jp-to-vi';
      else if (direction === 'jp-to-vi') next = 'vi-to-jp';
      else next = 'kanji-to-reading';
    } else {
      next = direction === 'vi-to-jp' ? 'jp-to-vi' : 'vi-to-jp';
    }
    setDirection(next);
    if (isKanjiSection) {
      localStorage.setItem('typing_direction_kanji', next);
    } else {
      localStorage.setItem('typing_direction_vocab_user', next);
      localStorage.setItem('typing_direction', next);
    }
    setInputVal('');
    setIsAnswerChecked(false);
    setIsCorrect(null);
    setCurrentIndex(0);
    setScore(0);
    sound.playClick();
  };

  // 1. Restore previous session progress on mount or filter change
  useEffect(() => {
    const saved = getTypingProgress(storageId);
    if (saved && typeof saved.currentIndex === 'number' && saved.currentIndex > 0 && saved.currentIndex < cards.length) {
      if (saved.cardIds && saved.cardIds.length === cards.length) {
        const idMap = new Map<string, JapaneseVocabCard>(cards.map((c) => [c.id, c] as [string, JapaneseVocabCard]));
        const reordered = saved.cardIds.map((id) => idMap.get(id)).filter(Boolean) as JapaneseVocabCard[];
        if (reordered.length === cards.length) {
          setCards(reordered);
        }
      }
      setCurrentIndex(saved.currentIndex);
      setScore(saved.score || 0);
      setSeconds(saved.seconds || 0);
      if (saved.wrongCardIds) setWrongCardIds(new Set(saved.wrongCardIds));
      if (saved.inputVal) setInputVal(saved.inputVal);
      setShowResumeBanner(true);
    }
  }, [storageId, cards.length]);

  const isRemoteUpdateRef = useRef(false);
  const isInitialMountRef = useRef(true);

  // Cross-Tab & Cross-Device Real-time Sync (< 2ms)
  useEffect(() => {
    if (!storageId) return;

    const unsubscribe = realtimeSync.subscribeKey('JP_TYPING', storageId, (payload) => {
      if (typeof payload.currentIndex === 'number' && payload.currentIndex >= 0 && payload.currentIndex < cards.length) {
        isRemoteUpdateRef.current = true;
        setCurrentIndex(payload.currentIndex);
        if (typeof payload.data?.score === 'number') setScore(payload.data.score);
        if (typeof payload.data?.seconds === 'number') setSeconds(payload.data.seconds);
        if (payload.data?.wrongCardIds && Array.isArray(payload.data.wrongCardIds)) {
          setWrongCardIds(new Set(payload.data.wrongCardIds));
        }
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

    saveTypingProgress(storageId, {
      currentIndex,
      cardIds: cards.map((c) => c.id),
      score,
      wrongCardIds: Array.from(wrongCardIds),
      seconds,
      inputVal,
    });
  }, [currentIndex, cards, score, wrongCardIds, seconds, inputVal, isCompleted, storageId]);

  // Timer counter
  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Format MM:SS
  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Focus input automatically on card change
  useEffect(() => {
    setInputVal('');
    setIsAnswerChecked(false);
    setIsCorrect(null);
    setShowAudioHintFeedback(false);
    
    // Auto focus into input on every card transition
    const focusTimer1 = setTimeout(() => {
      inputRef.current?.focus();
    }, 20);
    const focusTimer2 = setTimeout(() => {
      inputRef.current?.focus();
    }, 80);

    return () => {
      clearTimeout(focusTimer1);
      clearTimeout(focusTimer2);
    };
  }, [currentIndex]);

  const handlePlayHintAudio = () => {
    if (!currentCard) return;
    const targetText = currentCard.reading || currentCard.term;
    speakJapanese(targetText);
    setShowAudioHintFeedback(true);
    sound.playClick();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Auto speech for Japanese word when moving to card in jp-to-vi mode
  useEffect(() => {
    if (autoSpeechEnabled && currentCard && direction === 'jp-to-vi' && !isCompleted) {
      speakJapanese(currentCard.reading || currentCard.term);
    }
  }, [currentIndex, autoSpeechEnabled, direction, isCompleted, currentCard]);

  // Handle typing with Romaji -> Kana conversion if IME mode is enabled (in vi-to-jp mode)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (direction === 'jp-to-vi' || imeMode === 'off') {
      setInputVal(raw);
    } else {
      const converted = convertRomajiToKana(raw, imeMode);
      setInputVal(converted);
    }
  };

  const checkAnswer = () => {
    if (!currentCard || !inputVal.trim()) return;

    let matched = false;
    if (direction === 'kanji-to-reading' || direction === 'vi-to-jp') {
      matched = checkJapaneseAnswer(inputVal, currentCard);
    } else {
      matched = checkVietnameseAnswer(inputVal, currentCard.definition);
    }

    setIsAnswerChecked(true);
    setIsCorrect(matched);

    if (matched) {
      sound.playCorrect();
      setScore((s) => s + 1);
      if (autoSpeechEnabled) {
        speakJapanese(currentCard.reading || currentCard.term);
      }

      // Advance automatically after a short delay
      setTimeout(() => {
        handleNextCard();
      }, 1200);
    } else {
      sound.playWrong();
      if (autoSpeechEnabled) {
        speakJapanese(currentCard.reading || currentCard.term);
      }
      setWrongCardIds((prev) => new Set(prev).add(currentCard.id));
    }
  };

  const handleNextCard = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((i) => i + 1);
      setInputVal('');
      setIsAnswerChecked(false);
      setIsCorrect(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 30);
    } else {
      sound.playFinish();
      setIsCompleted(true);
      clearTypingProgress(storageId);
    }
  };

  const handleRetrySame = () => {
    setIsAnswerChecked(false);
    setIsCorrect(null);
    setInputVal('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 20);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!isAnswerChecked) {
        checkAnswer();
      } else {
        handleNextCard();
      }
    }
  };

  // SHUFFLE TOGGLE ACTION (Bật/tắt trộn câu)
  const handleToggleShuffle = () => {
    const next = !isShuffleEnabled;
    setIsShuffleEnabled(next);
    localStorage.setItem('typing_shuffle_enabled', String(next));
    const baseCards = getCardsByTab(filterTab, cardsSource);
    if (next) {
      setCards(shuffleArray(baseCards));
    } else {
      setCards([...baseCards]);
    }
    setCurrentIndex(0);
    setScore(0);
    setSeconds(0);
    setIsCompleted(false);
    setIsAnswerChecked(false);
    setIsCorrect(null);
    setInputVal('');
    setShowResumeBanner(false);
    sound.playClick();
  };

  // SHUFFLE ACTION (Trộn lại câu)
  const handleShuffle = () => {
    const shuffled = shuffleArray(cards);
    setCards(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setSeconds(0);
    setIsCompleted(false);
    setIsAnswerChecked(false);
    setIsCorrect(null);
    setInputVal('');
    setShowResumeBanner(false);
    sound.playClick();
  };

  // RESTORE ACTION (Khôi phục / Bắt đầu lại)
  const handleRestore = (onlyMistakes: boolean = false) => {
    if (onlyMistakes) {
      const mistakeCards = cards.filter((c) => wrongCardIds.has(c.id));
      if (mistakeCards.length > 0) {
        setCards(isShuffleEnabled ? shuffleArray(mistakeCards) : [...mistakeCards]);
      }
    } else {
      const baseCards = getCardsByTab(filterTab, cardsSource);
      setCards(isShuffleEnabled ? shuffleArray(baseCards) : [...baseCards]);
      setWrongCardIds(new Set());
      clearTypingProgress(storageId);
    }
    setCurrentIndex(0);
    setScore(0);
    setSeconds(0);
    setIsCompleted(false);
    setIsAnswerChecked(false);
    setIsCorrect(null);
    setInputVal('');
    setShowResumeBanner(false);
    sound.playClick();
  };

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 flex flex-col justify-between p-4 sm:p-8 select-none">
      {/* Top Bar matching image.png: Left (Viet->Nhat / Nhat->Viet + 1/27), Center (THỜI GIAN + 00:00), Right (Tùy chọn + ✕ Thoát) */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between py-3 border-b border-slate-800/80">
        {/* Left Side: Mode & Count */}
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => toggleDirection()}
            className="flex items-center gap-1.5 text-left group cursor-pointer"
            title="Nhấn để đảo thuật ngữ và nghĩa"
          >
            <span className="text-[11px] font-black uppercase text-cyan-400 tracking-wider">
              {direction === 'kanji-to-reading'
                ? 'HÁN TỰ → CÁCH ĐỌC NHẬT'
                : direction === 'vi-to-jp'
                ? 'VIỆT → NHẬT'
                : 'NHẬT → VIỆT'}
            </span>
            <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-180 transition-transform" />
          </button>
          <span className="text-xl sm:text-2xl font-black text-white leading-tight">
            {cards.length > 0 ? currentIndex + 1 : 0}/{cards.length}
          </span>
        </div>

        {/* Center: Thời gian */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
            THỜI GIAN
          </span>
          <span className="text-xl sm:text-2xl font-black text-white font-mono leading-tight">
            {formatTime(seconds)}
          </span>
        </div>

        {/* Right Side: Tùy chọn & Thoát */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Nút Tùy chọn (Gộp Trộn câu, Khôi phục, Âm thanh hiệu ứng, Âm thanh nói) */}
          <button
            type="button"
            onClick={() => {
              setShowOptionsModal(true);
              sound.playClick();
            }}
            className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-xs"
            title="Tùy chọn luyện gõ"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tùy chọn</span>
          </button>

          {/* Nút ✕ Thoát (Pill shape matching image.png) */}
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

      {/* Category Tabs: Mục gốc • Đã nhớ • Tất cả (Đồng bộ dữ liệu từ danh sách ngoài) */}
      <div className="max-w-4xl mx-auto w-full pt-3 pb-1 flex items-center justify-between flex-wrap gap-2.5">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/90 border border-slate-800">
          <button
            type="button"
            onClick={() => handleChangeFilterTab('original')}
            className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              filterTab === 'original'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <span>Mục gốc</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                filterTab === 'original'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {unmasteredCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleChangeFilterTab('mastered')}
            className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              filterTab === 'mastered'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Đã nhớ</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                filterTab === 'mastered'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-800 text-emerald-400'
              }`}
            >
              {masteredCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleChangeFilterTab('all')}
            className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              filterTab === 'all'
                ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <span>Tất cả</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                filterTab === 'all'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {totalCount}
            </span>
          </button>
        </div>

        {/* Quick toggle mastery for current card (Syncs directly with outer list) */}
        {currentCard && !isCompleted && cards.length > 0 && (
          <button
            type="button"
            onClick={handleToggleCurrentCardMastery}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 ${
              currentCard.mastered
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900/60'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title={
              currentCard.mastered
                ? 'Từ này đang ở mục "Đã nhớ". Bấm để đưa về "Mục gốc" (đồng bộ danh sách ngoài)'
                : 'Bấm để đánh dấu "Đã nhớ" (đồng bộ danh sách ngoài)'
            }
          >
            <CheckCircle2
              className={`w-3.5 h-3.5 ${
                currentCard.mastered ? 'text-emerald-400' : 'text-slate-500'
              }`}
            />
            <span>{currentCard.mastered ? 'Đã nhớ (✓)' : 'Mục gốc'}</span>
          </button>
        )}
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
                  <h3 className="text-base font-black">Tùy chọn luyện gõ</h3>
                  <p className="text-[11px] text-slate-400">Cài đặt mục luyện gõ, hướng gõ, bộ gõ và âm thanh</p>
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
              {/* Chọn mục luyện gõ: Mục gốc / Đã nhớ / Tất cả */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  Dữ liệu từ danh sách ngoài
                </label>
                <div className="grid grid-cols-3 gap-2 bg-slate-800/80 p-1 rounded-2xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      handleChangeFilterTab('original');
                      setShowOptionsModal(false);
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                      filterTab === 'original'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Mục gốc ({unmasteredCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleChangeFilterTab('mastered');
                      setShowOptionsModal(false);
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                      filterTab === 'mastered'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Đã nhớ ({masteredCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleChangeFilterTab('all');
                      setShowOptionsModal(false);
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                      filterTab === 'all'
                        ? 'bg-orange-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Tất cả ({totalCount})
                  </button>
                </div>
              </div>

              {/* Hướng luyện gõ */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  Hướng luyện gõ
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      toggleDirection('kanji-to-reading');
                      setShowOptionsModal(false);
                    }}
                    className={`px-3.5 py-2 rounded-xl border flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                      direction === 'kanji-to-reading'
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                        : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🈲</span>
                      <span>Đề: Chữ Hán → Gõ: Tiếng Nhật (Hiragana)</span>
                    </div>
                    {direction === 'kanji-to-reading' && <span className="text-xs font-black">✓</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      toggleDirection('vi-to-jp');
                      setShowOptionsModal(false);
                    }}
                    className={`px-3.5 py-2 rounded-xl border flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                      direction === 'vi-to-jp'
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                        : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🇻🇳</span>
                      <span>Đề: Nghĩa tiếng Việt → Gõ: Tiếng Nhật</span>
                    </div>
                    {direction === 'vi-to-jp' && <span className="text-xs font-black">✓</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      toggleDirection('jp-to-vi');
                      setShowOptionsModal(false);
                    }}
                    className={`px-3.5 py-2 rounded-xl border flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                      direction === 'jp-to-vi'
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                        : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🇯🇵</span>
                      <span>Đề: Tiếng Nhật → Gõ: Nghĩa tiếng Việt</span>
                    </div>
                    {direction === 'jp-to-vi' && <span className="text-xs font-black">✓</span>}
                  </button>
                </div>
              </div>

              {/* Thứ tự câu hỏi & Trộn ngẫu nhiên */}
              <div className="space-y-2.5">
                <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  Thứ tự câu hỏi
                </label>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/60 border border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <Shuffle className={`w-4 h-4 ${isShuffleEnabled ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <div>
                      <div className="text-xs font-bold">Trộn ngẫu nhiên câu hỏi</div>
                      <div className="text-[10px] text-slate-400">
                        {isShuffleEnabled ? 'Đang bật (câu hỏi được đảo ngẫu nhiên)' : 'Đang tắt (theo thứ tự gốc)'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleShuffle}
                    className={`w-11 h-6 rounded-full transition-colors cursor-pointer relative p-0.5 ${
                      isShuffleEnabled ? 'bg-indigo-600' : 'bg-slate-700'
                    }`}
                    aria-label="Bật/tắt trộn câu hỏi"
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        isShuffleEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {isShuffleEnabled && (
                    <button
                      type="button"
                      onClick={() => {
                        handleShuffle();
                        setShowOptionsModal(false);
                      }}
                      className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white border border-slate-700 flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer"
                    >
                      <Shuffle className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Trộn lại lượt mới</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      handleRestore(false);
                      setShowOptionsModal(false);
                    }}
                    className={`px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-amber-600 text-slate-200 hover:text-white border border-slate-700 flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                      !isShuffleEnabled ? 'col-span-2' : ''
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Khôi phục / Bắt đầu lại</span>
                  </button>
                </div>
              </div>

              {/* IME Mode Switcher */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  Bộ gõ tiếng Nhật
                </label>
                <div className="grid grid-cols-3 gap-2 bg-slate-800/80 p-1 rounded-2xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setImeMode('hiragana')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                      imeMode === 'hiragana'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    あ (Hiragana)
                  </button>
                  <button
                    type="button"
                    onClick={() => setImeMode('katakana')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                      imeMode === 'katakana'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ア (Katakana)
                  </button>
                  <button
                    type="button"
                    onClick={() => setImeMode('off')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                      imeMode === 'off' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Tắt
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
                      <div className="text-[10px] text-slate-400">Tiếng gõ đúng, sai và hoàn thành</div>
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
                      <div className="text-[10px] text-slate-400">Tự động đọc từ tiếng Nhật khi kiểm tra</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !autoSpeechEnabled;
                      setAutoSpeechEnabled(next);
                      localStorage.setItem('typing_auto_speech', next ? 'true' : 'false');
                      if (next && currentCard) {
                        speakJapanese(currentCard.reading || currentCard.term);
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
            <span>Đang tiếp tục câu #{currentIndex + 1} bạn đang gõ dở.</span>
          </div>
          <button
            type="button"
            onClick={() => handleRestore(false)}
            className="text-amber-300 hover:text-white font-bold ml-2 underline cursor-pointer"
          >
            Bắt đầu lại
          </button>
        </div>
      )}

      {/* Center Typing Area Matching image.png */}
      {cards.length === 0 ? (
        <div className="max-w-md mx-auto w-full my-auto text-center space-y-4 p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-amber-400 mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-black text-white">
              {filterTab === 'mastered'
                ? 'Chưa có từ nào trong "Đã nhớ"'
                : filterTab === 'original'
                ? 'Đã nhớ toàn bộ "Mục gốc"!'
                : 'Bài học chưa có từ vựng'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
              {filterTab === 'mastered'
                ? 'Bạn chưa đánh dấu từ nào là "Đã nhớ". Hãy chọn "Mục gốc" hoặc "Tất cả" để bắt đầu luyện gõ.'
                : filterTab === 'original'
                ? 'Tất cả các từ trong bài học đã được ghi nhớ. Bạn có thể chọn ôn lại ở mục "Đã nhớ" hoặc "Tất cả".'
                : 'Học phần này hiện chưa có thẻ từ vựng nào.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {filterTab === 'mastered' && unmasteredCount > 0 && (
              <button
                type="button"
                onClick={() => handleChangeFilterTab('original')}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs cursor-pointer shadow-md shadow-indigo-600/30 active:scale-95 transition-all"
              >
                Gõ Mục gốc ({unmasteredCount} từ)
              </button>
            )}
            {totalCount > 0 && filterTab !== 'all' && (
              <button
                type="button"
                onClick={() => handleChangeFilterTab('all')}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-white font-bold text-xs cursor-pointer active:scale-95 transition-all"
              >
                Gõ Tất cả ({totalCount} từ)
              </button>
            )}
            {filterTab === 'original' && masteredCount > 0 && (
              <button
                type="button"
                onClick={() => handleChangeFilterTab('mastered')}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer shadow-md shadow-emerald-600/30 active:scale-95 transition-all"
              >
                Ôn lại Đã nhớ ({masteredCount} từ)
              </button>
            )}
            <button
              type="button"
              onClick={onExit}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-400 hover:text-slate-200 border border-slate-700/60 font-bold text-xs cursor-pointer active:scale-95 transition-all"
            >
              Quay lại danh sách
            </button>
          </div>
        </div>
      ) : !isCompleted ? (
        <div className="max-w-xl mx-auto w-full my-auto py-6 space-y-6">
          {/* Top Prompt Area */}
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 tracking-[0.25em] uppercase">
                {direction === 'kanji-to-reading'
                  ? 'ĐỀ BÀI: CHỮ HÁN (KANJI)'
                  : direction === 'vi-to-jp'
                  ? 'ĐỀ BÀI: NGHĨA TIẾNG VIỆT'
                  : 'THUẬT NGỮ TIẾNG NHẬT'}
              </span>
              {(direction === 'jp-to-vi' || direction === 'kanji-to-reading') && (
                <button
                  type="button"
                  onClick={() => speakJapanese(currentCard.reading || currentCard.term)}
                  className="p-1 rounded-full text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Nghe phát âm"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {direction === 'kanji-to-reading' ? (
              <div className="space-y-2">
                <h2 className="text-5xl sm:text-6xl md:text-7xl font-black font-serif text-white tracking-tight leading-tight select-none">
                  {currentCard.term}
                </h2>
                {currentCard.definition && (
                  <p className="text-xs sm:text-sm text-slate-400 font-medium">
                    (Nghĩa: {currentCard.definition})
                  </p>
                )}
              </div>
            ) : direction === 'vi-to-jp' ? (
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight">
                {currentCard.definition}
              </h2>
            ) : (
              <div className="space-y-1">
                <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight">
                  {currentCard.reading || currentCard.term}
                </h2>
                <div className="flex items-center justify-center gap-2 text-sm sm:text-base text-slate-300 font-medium">
                  {currentCard.term && currentCard.reading && currentCard.term !== currentCard.reading && (
                    <span className="text-amber-400 font-bold">{currentCard.term}</span>
                  )}
                  {currentCard.romaji && (
                    <span className="text-slate-400 font-mono">[{currentCard.romaji}]</span>
                  )}
                </div>
              </div>
            )}

            {direction !== 'kanji-to-reading' && currentCard.example && (
              <p className="text-sm sm:text-base text-slate-300 font-medium">
                {currentCard.example}
              </p>
            )}
          </div>

          {/* Input Section (exact match to image.png) */}
          <div className="space-y-4 pt-2">
            {/* Header above input: BỘ GÕ TRONG APP & Switcher (for vi-to-jp or kanji-to-reading) */}
            {direction === 'kanji-to-reading' || direction === 'vi-to-jp' ? (
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  {direction === 'kanji-to-reading'
                    ? 'GÕ CÁCH ĐỌC TIẾNG NHẬT (HIRAGANA)'
                    : 'GÕ TIẾNG NHẬT (HIRAGANA / KATAKANA)'}
                </span>

                {/* Pill Switcher for IME [ あ  ア ] */}
                <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl p-0.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setImeMode('hiragana')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      imeMode === 'hiragana'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    あ
                  </button>
                  <button
                    type="button"
                    onClick={() => setImeMode('katakana')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      imeMode === 'katakana'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ア
                  </button>
                  <button
                    type="button"
                    onClick={() => setImeMode((m) => (m === 'off' ? 'hiragana' : 'off'))}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-[11px] ${
                      imeMode === 'off' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white'
                    }`}
                    title="Tắt bộ gõ tự động nếu dùng bàn phím tiếng Nhật trên máy"
                  >
                    Tắt
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  NHẬP NGHĨA TIẾNG VIỆT
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Chấp nhận có hoặc không dấu
                </span>
              </div>
            )}

            {/* Glowing Input Box + Audio Hint Speaker Button */}
            <div className="flex items-stretch gap-2 sm:gap-3">
              <div
                className={`flex-1 rounded-3xl transition-all shadow-2xl p-1.5 sm:p-2 bg-white ${
                  isAnswerChecked
                    ? isCorrect
                      ? 'border-2 border-emerald-500 ring-4 ring-emerald-500/30'
                      : 'border-2 border-rose-500 ring-4 ring-rose-500/30'
                    : 'border-2 border-cyan-400 ring-4 ring-cyan-400/20'
                }`}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputVal}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  readOnly={isAnswerChecked && isCorrect === true}
                  placeholder={
                    direction === 'kanji-to-reading'
                      ? imeMode === 'off'
                        ? 'Gõ cách đọc tiếng Nhật (vd: ひらがな)...'
                        : 'Gõ tiếng Nhật (vd: ひらがな)...'
                      : direction === 'vi-to-jp'
                      ? imeMode === 'off'
                        ? 'Nhập từ tiếng Nhật...'
                        : 'ひらがな | カタカナ'
                      : 'Nhập nghĩa tiếng Việt...'
                  }
                  className="w-full text-center text-2xl sm:text-3xl font-black py-3 sm:py-4 px-4 bg-transparent outline-none text-slate-900 placeholder:text-slate-300"
                  autoFocus
                />
              </div>

              {/* Nút Loa Gợi Ý khi không biết từ */}
              <button
                type="button"
                onClick={handlePlayHintAudio}
                className="px-3.5 sm:px-5 rounded-3xl bg-indigo-600/25 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 hover:border-indigo-400 transition-all cursor-pointer flex flex-col items-center justify-center shrink-0 shadow-lg active:scale-95 group"
                title="Không biết từ? Bấm vào đây để nghe gợi ý phát âm"
              >
                <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400 group-hover:text-white group-hover:scale-110 transition-transform" />
                <span className="text-[10px] sm:text-[11px] font-black mt-0.5 whitespace-nowrap">
                  Gợi ý
                </span>
              </button>
            </div>

            {/* Audio Hint Feedback Banner */}
            {showAudioHintFeedback && !isAnswerChecked && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-indigo-950/70 border border-indigo-500/40 text-indigo-200 text-xs animate-in fade-in slide-in-from-top-1 duration-150 shadow-md">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-indigo-400 animate-pulse shrink-0" />
                  <span>
                    🔊 Đang phát âm gợi ý! {(direction === 'vi-to-jp' || direction === 'kanji-to-reading') && (
                      <span className="text-amber-300 font-bold ml-1">
                        Từ này bắt đầu bằng &quot;{(currentCard.reading || currentCard.term).replace(/^[~～〜⁓〰\s(（]+/, '').charAt(0)}...&quot;
                      </span>
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handlePlayHintAudio}
                  className="text-amber-300 hover:text-white font-bold underline text-[11px] cursor-pointer ml-2"
                >
                  Nghe lại
                </button>
              </div>
            )}

            {/* Feedback when checked */}
            {isAnswerChecked && (
              <div
                className={`p-4 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-sm animate-in fade-in zoom-in-95 duration-150 ${
                  isCorrect
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                    : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isCorrect ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-rose-400 shrink-0" />
                  )}
                  <div className="text-left">
                    <span className="font-black text-base block">
                      {isCorrect ? 'Chính xác! 🎉' : 'Chưa chính xác!'}
                    </span>
                    <div className="text-xs text-slate-200 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>Đáp án đúng:</span>
                      {direction === 'kanji-to-reading' ? (
                        <>
                          <b className="text-white text-base">
                            {currentCard.reading || currentCard.term}
                          </b>
                          {currentCard.romaji && (
                            <span className="text-slate-400 font-mono">[{currentCard.romaji}]</span>
                          )}
                          {currentCard.term && (
                            <span className="text-amber-400 font-bold">({currentCard.term})</span>
                          )}
                        </>
                      ) : direction === 'vi-to-jp' ? (
                        <>
                          <b className="text-white text-base">
                            {currentCard.reading || currentCard.term}
                          </b>
                          {currentCard.term && currentCard.reading && currentCard.term !== currentCard.reading && (
                            <span className="text-amber-400 font-bold">({currentCard.term})</span>
                          )}
                          {currentCard.romaji && (
                            <span className="text-slate-400 font-mono">[{currentCard.romaji}]</span>
                          )}
                        </>
                      ) : (
                        <b className="text-white text-base">{currentCard.definition}</b>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => speakJapanese(currentCard.reading || currentCard.term)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Phát âm từ này"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>

                  {!isCorrect && (
                    <button
                      type="button"
                      onClick={handleRetrySame}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
                    >
                      Gõ lại
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleNextCard}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white flex items-center gap-1 cursor-pointer shadow-md"
                  >
                    <span>Tiếp (Enter)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Button matching image.png (ĐÃ GÕ XONG TỪ) */}
            {!isAnswerChecked && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={checkAnswer}
                  disabled={!inputVal.trim()}
                  className="w-full py-3.5 rounded-full bg-[#1e293b] hover:bg-[#334155] disabled:opacity-30 text-slate-300 hover:text-white text-xs font-bold uppercase tracking-wider text-center cursor-pointer shadow-md transition-all active:scale-[0.99] border border-slate-700/60"
                >
                  ĐÃ GÕ XONG TỪ
                </button>
                <p className="text-xs text-slate-400 text-center mt-2.5">
                  Nhấn Enter để kiểm tra từ đã gõ.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Results View */
        <div className="max-w-md mx-auto w-full my-auto text-center space-y-6 p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-xl">
            <Award className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white">Hoàn thành bài luyện gõ!</h2>
            <p className="text-xs text-slate-400">Bạn đã hoàn tất bài tập gõ chữ Nhật.</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-around">
            <div>
              <span className="text-2xl font-black text-emerald-400 block">{score}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Đúng</span>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div>
              <span className="text-2xl font-black text-rose-400 block">{wrongCardIds.size}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Chưa đúng</span>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div>
              <span className="text-2xl font-black text-cyan-400 block font-mono">
                {formatTime(seconds)}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Thời gian</span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            {wrongCardIds.size > 0 && (
              <button
                type="button"
                onClick={() => handleRestore(true)}
                className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs cursor-pointer transition-colors shadow-md"
              >
                Luyện lại các từ chưa đúng ({wrongCardIds.size})
              </button>
            )}

            <button
              type="button"
              onClick={() => handleRestore(false)}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer transition-colors shadow-md"
            >
              Luyện lại toàn bộ bài
            </button>

            <button
              type="button"
              onClick={onExit}
              className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-colors"
            >
              Quay lại học phần
            </button>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="max-w-4xl mx-auto w-full pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
        <span>Gõ romaji (vd: &quot;kita&quot; → &quot;きた&quot;) hoặc dùng phím ảo</span>
        <span>Phím tắt: Enter (kiểm tra / tiếp theo)</span>
      </div>
    </div>
  );
};
