import { firstAttemptAccuracy } from '../../utils/typingScore';
import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  RotateCcw,
  Award,
  CheckCircle2,
  AlertCircle,
  Shuffle,
  Sparkles,
  Check,
  ArrowRight,
  CornerDownLeft,
  Star,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { JapaneseKanjiCard, JapaneseVocabCard } from '../../types/japanese';
import {
  convertRomajiToKana,
  toCanonicalKana,
  speakJapanese,
  checkJapaneseAnswer,
} from '../../utils/japaneseKana';
import { sound } from '../../utils/audio';
import { shuffleArray } from '../../utils/shuffle';

export interface JapaneseKanjiTypingModeProps {
  mode: 'core' | 'vocab';
  kanjiCards?: JapaneseKanjiCard[];
  vocabCards?: JapaneseVocabCard[];
  title?: string;
  onExit: () => void;
  onCardMastered?: (cardId: string) => void;
}

/**
 * Checks if user's typed Kana reading matches the target Onyomi or Kunyomi string.
 * Supports multiple readings separated by comma, handles okurigana dots (・, .) and hyphens.
 */
export function matchKanjiReading(userInput: string, targetStr: string | undefined): boolean {
  if (!targetStr || targetStr.trim() === '' || targetStr.trim() === '-') {
    return true; // No reading required
  }
  const user = userInput.trim().replace(/n(?=[^a-z]|$)/gi, 'ん');
  if (!user) return false;

  const userCanon = toCanonicalKana(user).replace(/[\s,、・.\-]/g, '');
  if (!userCanon) return false;

  // Split target by comma / slash / newline
  const parts = targetStr.split(/[,、/;\n]+/).map((p) => p.trim()).filter(Boolean);

  // 1. Full string match (in case user entered all readings or exact target)
  const fullTargetCanon = toCanonicalKana(targetStr).replace(/[\s,、・.\-]/g, '');
  if (userCanon === fullTargetCanon) return true;

  // 2. Any single part match
  for (const part of parts) {
    if (!part || part === '-') continue;
    const partCanon = toCanonicalKana(part).replace(/[\s,、・.\-]/g, '');
    if (userCanon === partCanon) return true;

    // Parentheses handling: e.g. "ちい(さい)" or "(お)しろ"
    const withoutParens = toCanonicalKana(part.replace(/[\(（][^\)）]*[\)）]/g, '')).replace(
      /[\s,、・.\-]/g,
      ''
    );
    if (withoutParens && userCanon === withoutParens) return true;

    const insideParens = toCanonicalKana(part.replace(/[\(（\)）]/g, '')).replace(
      /[\s,、・.\-]/g,
      ''
    );
    if (insideParens && userCanon === insideParens) return true;
  }

  return false;
}

/**
 * Tách chuỗi cách đọc thành từng cách đọc riêng (mỗi cách đọc = 1 ô gõ).
 * VD: "キョウ、ケイ" → ["キョウ", "ケイ"]; "-" hoặc rỗng → [].
 */
export function splitKanjiReadings(targetStr: string | undefined): string[] {
  if (!targetStr) return [];
  const t = targetStr.trim();
  if (!t || t === '-') return [];
  return t
    .split(/[,、/;\n]+/)
    .map((p) => p.trim())
    .filter((p) => p && p !== '-');
}

/**
 * Chấm một nhóm ô (Kun hoặc On) không phụ thuộc thứ tự:
 * mỗi ô phải khớp một cách đọc khác nhau trong nhóm.
 */
function matchReadingGroup(inputs: string[], parts: string[]): boolean[] {
  const used = new Set<number>();
  return parts.map((_, i) => {
    const input = inputs[i] || '';
    const j = parts.findIndex((p, k) => !used.has(k) && matchKanjiReading(input, p));
    if (j >= 0) {
      used.add(j);
      return true;
    }
    return false;
  });
}

/**
 * Đọc tiếng Nhật rồi đọc nghĩa tiếng Việt nối tiếp nhau; gọi onDone khi đọc xong
 * (hoặc khi trình duyệt không hỗ trợ / bị lỗi, có hẹn giờ dự phòng).
 */
function speakJaThenVi(ja: string, vi: string, onDone: () => void): void {
  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
    onDone();
  };
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    setTimeout(done, 2500);
    return;
  }
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const clean = (t: string) =>
      t
        .replace(/[\(（].*?[\)）]/g, '')
        .replace(/[~～〜^]/g, '')
        .replace(/[/／]+/g, '、 ')
        .trim();
    const voices = synth.getVoices();
    const jaText = clean(ja);
    const viText = clean(vi);

    const jaU = new SpeechSynthesisUtterance(jaText);
    jaU.lang = 'ja-JP';
    jaU.rate = 0.9;
    const jaVoice = voices.find((v) => v.lang.toLowerCase().startsWith('ja'));
    if (jaVoice) jaU.voice = jaVoice;

    const viU = new SpeechSynthesisUtterance(viText);
    viU.lang = 'vi-VN';
    viU.rate = 1;
    const viVoice = voices.find((v) => v.lang.toLowerCase().startsWith('vi'));
    if (viVoice) viU.voice = viVoice;
    viU.onend = done;
    viU.onerror = done;

    if (jaText) synth.speak(jaU);
    if (viText) synth.speak(viU);
    else jaU.onend = done;
    // Dự phòng: một số trình duyệt không bắn sự kiện onend
    setTimeout(done, 9000);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
    setTimeout(done, 2500);
  }
}

export const JapaneseKanjiTypingMode: React.FC<JapaneseKanjiTypingModeProps> = ({
  mode,
  kanjiCards = [],
  vocabCards = [],
  title,
  onExit,
  onCardMastered,
}) => {
  // Determine source list based on mode
  const rawList = mode === 'core' ? kanjiCards : vocabCards;
  const [sourceList, setSourceList] = useState<any[]>(rawList);

  useEffect(() => {
    setSourceList(mode === 'core' ? kanjiCards : vocabCards);
  }, [mode, kanjiCards, vocabCards]);

  // Counts
  const unmasteredCount = sourceList.filter((c) => !c.mastered).length;
  const masteredCount = sourceList.filter((c) => !!c.mastered).length;
  const totalCount = sourceList.length;

  // Filter tab: 'original' | 'mastered' | 'all'
  const [filterTab, setFilterTab] = useState<'original' | 'mastered' | 'all'>(() => {
    if (unmasteredCount === 0 && totalCount > 0) return 'all';
    return 'original';
  });

  const getCardsByTab = (tab: 'original' | 'mastered' | 'all', list: any[]) => {
    if (tab === 'original') return list.filter((c) => !c.mastered);
    if (tab === 'mastered') return list.filter((c) => !!c.mastered);
    return list;
  };

  const [isShuffleEnabled, setIsShuffleEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('kanji_typing_shuffle');
    return saved !== null ? saved === 'true' : true;
  });

  const [cards, setCards] = useState<any[]>(() => {
    const base = getCardsByTab(filterTab, rawList);
    const saved = localStorage.getItem('kanji_typing_shuffle');
    const shouldShuffle = saved !== null ? saved === 'true' : true;
    return shouldShuffle ? shuffleArray(base) : [...base];
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [score, setScore] = useState(0);
  // An accepted card can only schedule one advance and earn one first-attempt point.
  const acceptedAnswersRef = useRef(new Set<string>());
  const [wrongCardIds, setWrongCardIds] = useState<Set<string>>(new Set());
  const [isCompleted, setIsCompleted] = useState(false);

  // Sound & speech settings
  const [soundEnabled, setSoundEnabled] = useState(() => sound.isEnabled());
  const [autoSpeechEnabled, setAutoSpeechEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('typing_auto_speech_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  // Inputs for Core Mode (Kanji): mỗi cách đọc Kun / On là một ô riêng
  const [kunInputs, setKunInputs] = useState<string[]>([]);
  const [onInputs, setOnInputs] = useState<string[]>([]);
  const [kunResults, setKunResults] = useState<boolean[]>([]);
  const [onResults, setOnResults] = useState<boolean[]>([]);

  // Input for Vocab Mode: 1 Kana box
  const [vocabInput, setVocabInput] = useState('');
  const [vocabImeMode, setVocabImeMode] = useState<'hiragana' | 'katakana' | 'off'>('hiragana');

  // Answer validation status
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [isOverallCorrect, setIsOverallCorrect] = useState<boolean | null>(null);

  // Refs
  const kunInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const onInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const vocabInputRef = useRef<HTMLInputElement>(null);
  const advanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentCard = cards[currentIndex];
  // Tăng mỗi lần chuyển thẻ / kết thúc, để bỏ các lượt đọc & tự chuyển đã lỗi thời
  const stepTokenRef = useRef(0);

  // Dừng đọc khi rời màn luyện gõ
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      stepTokenRef.current += 1;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Helper properties for current card in core mode
  const currentKanji = mode === 'core' ? (currentCard as JapaneseKanjiCard | undefined) : undefined;
  const currentVocab = mode === 'vocab' ? (currentCard as JapaneseVocabCard | undefined) : undefined;

  const kunParts = mode === 'core' ? splitKanjiReadings(currentKanji?.kunyomi) : [];
  const onParts = mode === 'core' ? splitKanjiReadings(currentKanji?.onyomi) : [];
  const hasKunyomi = kunParts.length > 0;
  const hasOnyomi = onParts.length > 0;
  const kunCorrect = kunResults.length > 0 && kunResults.every(Boolean);
  const onCorrect = onResults.length > 0 && onResults.every(Boolean);

  // Thứ tự các ô để di chuyển bằng Enter: Kun 1..n rồi On 1..m
  const getReadingSlots = () => [
    ...kunParts.map((_, i) => ({ group: 'kun' as const, index: i })),
    ...onParts.map((_, i) => ({ group: 'on' as const, index: i })),
  ];
  const focusSlot = (group: 'kun' | 'on', index: number) => {
    (group === 'kun' ? kunInputRefs : onInputRefs).current[index]?.focus();
  };

  // Timer
  useEffect(() => {
    if (isCompleted || cards.length === 0) return;
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isCompleted, cards.length]);

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Card switch reset & focus
  useEffect(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }

    setKunInputs(kunParts.map(() => ''));
    setOnInputs(onParts.map(() => ''));
    setVocabInput('');
    setKunResults([]);
    setOnResults([]);
    setIsAnswerChecked(false);
    setIsOverallCorrect(null);

    // Auto focus
    const timer = setTimeout(() => {
      if (mode === 'core') {
        if (hasKunyomi) {
          focusSlot('kun', 0);
        } else if (hasOnyomi) {
          focusSlot('on', 0);
        }
      } else {
        vocabInputRef.current?.focus();
      }
    }, 40);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, mode, kunParts.length, onParts.length, currentCard?.id]);

  // Handle Tab Switch (Original / Mastered / All)
  const handleFilterChange = (newTab: 'original' | 'mastered' | 'all') => {
    setFilterTab(newTab);
    const filtered = getCardsByTab(newTab, sourceList);
    setCards(isShuffleEnabled ? shuffleArray(filtered) : [...filtered]);
    setCurrentIndex(0);
    setScore(0);
    setWrongCardIds(new Set());
    setIsAnswerChecked(false);
    setIsOverallCorrect(null);
    setVocabInput('');
    setKunInputs([]);
    setOnInputs([]);
    setKunResults([]);
    setOnResults([]);
    acceptedAnswersRef.current.clear();
    stepTokenRef.current += 1;
    if (advanceTimerRef.current) { clearTimeout(advanceTimerRef.current); advanceTimerRef.current = null; }
    setSeconds(0);
    setIsCompleted(false);
    sound.playClick();
  };
  // Toggle Shuffle
  const handleToggleShuffle = () => {
    const nextState = !isShuffleEnabled;
    setIsShuffleEnabled(nextState);
    localStorage.setItem('kanji_typing_shuffle', String(nextState));
    if (nextState) {
      setCards(shuffleArray([...cards]));
    }
    sound.playClick();
  };

  // Toggle Sound FX
  const handleToggleSound = () => {
    const next = !sound.isEnabled();
    sound.setEnabled(next);
    setSoundEnabled(next);
  };

  // Toggle Auto Speech
  const handleToggleSpeech = () => {
    const next = !autoSpeechEnabled;
    setAutoSpeechEnabled(next);
    localStorage.setItem('typing_auto_speech_enabled', String(next));
    sound.playClick();
  };

  // Play audio for current card
  const handleSpeakCard = () => {
    if (!currentCard) return;
    if (mode === 'core' && currentKanji) {
      speakJapanese(currentKanji.kanji);
    } else if (mode === 'vocab' && currentVocab) {
      speakJapanese(currentVocab.reading || currentVocab.term);
    }
  };

  // Dismiss error feedback when user starts editing
  const handleClearErrorOnEdit = () => {
    if (isAnswerChecked && !isOverallCorrect) {
      setIsAnswerChecked(false);
      setIsOverallCorrect(null);
    }
  };

  // Core: Kun (Romaji -> Hiragana), On (Romaji -> Katakana), mỗi ô một cách đọc
  const handleReadingChange = (
    group: 'kun' | 'on',
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    handleClearErrorOnEdit();
    const converted = convertRomajiToKana(e.target.value, group === 'kun' ? 'hiragana' : 'katakana');
    const setter = group === 'kun' ? setKunInputs : setOnInputs;
    setter((prev) => {
      const next = [...prev];
      next[index] = converted;
      return next;
    });
  };

  // Vocab reading change (Romaji -> Hiragana)
  const handleVocabChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleClearErrorOnEdit();
    const raw = e.target.value;
    if (vocabImeMode === 'off') {
      setVocabInput(raw);
    } else {
      const converted = convertRomajiToKana(raw, vocabImeMode);
      setVocabInput(converted);
    }
  };

  // Check Answer Handler
  const handleCheckAnswer = () => {
    if (currentCard && acceptedAnswersRef.current.has(currentCard.id)) return;
    if (!currentCard) return;

    if (mode === 'core') {
      // Finalize trailing 'n'
      const finalKun = kunParts.map((_, i) => (kunInputs[i] || '').replace(/n(?=[^a-z]|$)/gi, 'ん'));
      const finalOn = onParts.map((_, i) => (onInputs[i] || '').replace(/n(?=[^a-z]|$)/gi, 'ン'));
      setKunInputs(finalKun);
      setOnInputs(finalOn);

      const kunRes = matchReadingGroup(finalKun, kunParts);
      const onRes = matchReadingGroup(finalOn, onParts);
      setKunResults(kunRes);
      setOnResults(onRes);

      const kunMatch = kunRes.every(Boolean);
      const onMatch = onRes.every(Boolean);

      const matched = kunMatch && onMatch;
      setIsOverallCorrect(matched);
      setIsAnswerChecked(true);

      if (matched) {
        sound.playCorrect();
        acceptedAnswersRef.current.add(currentCard.id);
        if (!wrongCardIds.has(currentCard.id)) setScore((s) => s + 1);
        if (autoSpeechEnabled && currentKanji) {
          speakJapanese(currentKanji.kanji);
        }
        advanceTimerRef.current = setTimeout(() => {
          handleNextCard();
        }, 1200);
      } else {
        sound.playWrong();
        setWrongCardIds((prev) => new Set(prev).add(currentCard.id));
        // Refocus first wrong input
        setTimeout(() => {
          const k = kunRes.indexOf(false);
          if (k >= 0) {
            focusSlot('kun', k);
            return;
          }
          const o = onRes.indexOf(false);
          if (o >= 0) focusSlot('on', o);
        }, 50);
      }
    } else {
      // Vocab mode
      let finalized = vocabInput;
      if (vocabImeMode !== 'off') {
        const targetN = vocabImeMode === 'katakana' ? 'ン' : 'ん';
        finalized = vocabInput.replace(/n(?=[^a-z]|$)/gi, targetN);
        if (finalized !== vocabInput) setVocabInput(finalized);
      }

      const matched = checkJapaneseAnswer(finalized, currentVocab as JapaneseVocabCard);
      setIsOverallCorrect(matched);
      setIsAnswerChecked(true);

      if (matched) {
        sound.playCorrect();
        acceptedAnswersRef.current.add(currentCard.id);
        if (!wrongCardIds.has(currentCard.id)) setScore((s) => s + 1);
        // Gõ đúng → hiện nghĩa, đọc tiếng Nhật rồi đọc nghĩa tiếng Việt, đọc xong mới sang thẻ
        const tokenAtCheck = stepTokenRef.current;
        const goNextIfStill = () => {
          // Chỉ tự sang thẻ nếu người dùng chưa tự bấm Tiếp tục
          if (stepTokenRef.current !== tokenAtCheck) return;
          advanceTimerRef.current = setTimeout(() => {
            if (stepTokenRef.current === tokenAtCheck) handleNextCard();
          }, 600);
        };
        if (autoSpeechEnabled && currentVocab) {
          setTimeout(() => {
            if (stepTokenRef.current !== tokenAtCheck) return;
            speakJaThenVi(
              currentVocab.reading || currentVocab.term,
              currentVocab.definition || '',
              goNextIfStill
            );
          }, 350);
        } else {
          advanceTimerRef.current = setTimeout(() => {
            handleNextCard();
          }, 2200);
        }
      } else {
        sound.playWrong();
        setWrongCardIds((prev) => new Set(prev).add(currentCard.id));
        setTimeout(() => {
          vocabInputRef.current?.focus();
        }, 50);
      }
    }
  };

  const handleNextCard = () => {
    stepTokenRef.current += 1;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }

    if (currentIndex < cards.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      sound.playFinish();
      setIsCompleted(true);
    }
  };

  const handleSkipCard = () => {
    if (!currentCard) return;
    setWrongCardIds((prev) => new Set(prev).add(currentCard.id));
    handleNextCard();
  };

  // Keyboard navigation for Core Mode: Enter → sang ô trống kế tiếp, hết ô trống thì kiểm tra
  const handleReadingKeyDown = (
    group: 'kun' | 'on',
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (isAnswerChecked && isOverallCorrect) {
      handleNextCard();
      return;
    }
    const slots = getReadingSlots();
    const cur = slots.findIndex((sl) => sl.group === group && sl.index === index);
    const valueOf = (sl: { group: 'kun' | 'on'; index: number }) =>
      ((sl.group === 'kun' ? kunInputs : onInputs)[sl.index] || '').trim();
    for (let step = 1; step < slots.length; step++) {
      const sl = slots[(cur + step) % slots.length];
      if (!valueOf(sl)) {
        focusSlot(sl.group, sl.index);
        return;
      }
    }
    handleCheckAnswer();
  };

  // Keyboard navigation for Vocab Mode
  const handleVocabKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isAnswerChecked && isOverallCorrect) {
        handleNextCard();
      } else {
        handleCheckAnswer();
      }
    }
  };

  // Restart functions
  const handleRestartAll = () => {
    const baseCards = getCardsByTab(filterTab, sourceList);
    setCards(isShuffleEnabled ? shuffleArray(baseCards) : [...baseCards]);
    setCurrentIndex(0);
    setScore(0);
    setWrongCardIds(new Set());
    setIsAnswerChecked(false);
    setIsOverallCorrect(null);
    setVocabInput('');
    setKunInputs([]);
    setOnInputs([]);
    setKunResults([]);
    setOnResults([]);
    acceptedAnswersRef.current.clear();
    stepTokenRef.current += 1;
    if (advanceTimerRef.current) { clearTimeout(advanceTimerRef.current); advanceTimerRef.current = null; }
    setSeconds(0);
    setIsCompleted(false);
    sound.playClick();
  };
  const handleRestartWrongOnly = () => {
    const wrongList = sourceList.filter((c) => wrongCardIds.has(c.id));
    if (wrongList.length === 0) return;
    setCards(isShuffleEnabled ? shuffleArray(wrongList) : [...wrongList]);
    setCurrentIndex(0);
    setScore(0);
    setWrongCardIds(new Set());
    setIsAnswerChecked(false);
    setIsOverallCorrect(null);
    setVocabInput('');
    setKunInputs([]);
    setOnInputs([]);
    setKunResults([]);
    setOnResults([]);
    acceptedAnswersRef.current.clear();
    stepTokenRef.current += 1;
    if (advanceTimerRef.current) { clearTimeout(advanceTimerRef.current); advanceTimerRef.current = null; }
    setSeconds(0);
    setIsCompleted(false);
    sound.playClick();
  };
  const isCurrentCardMastered = !!currentCard?.mastered;

  const handleToggleMasteredCurrent = () => {
    if (!currentCard || !onCardMastered) return;
    onCardMastered(currentCard.id);
    // Update local card state
    setCards((prev) =>
      prev.map((c) => (c.id === currentCard.id ? { ...c, mastered: !c.mastered } : c))
    );
    setSourceList((prev) =>
      prev.map((c) => (c.id === currentCard.id ? { ...c, mastered: !c.mastered } : c))
    );
    sound.playClick();
  };

  // =========================================================================
  // VIEW: EMPTY LIST
  // =========================================================================
  if (cards.length === 0) {
    return (
      <div className="min-h-screen bg-[#070913] text-slate-100 flex flex-col justify-center items-center p-6 select-none">
        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Layers className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Không có thẻ nào phù hợp</h2>
            <p className="text-sm text-slate-400 mt-2">
              Tab{' '}
              <span className="text-amber-400 font-bold">
                {filterTab === 'original'
                  ? 'Chưa thuộc'
                  : filterTab === 'mastered'
                  ? 'Đã thuộc'
                  : 'Tất cả'}
              </span>{' '}
              hiện tại không có thẻ chữ Hán nào.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleFilterChange('all')}
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm cursor-pointer transition-all"
            >
              Chuyển sang Tất cả thẻ ({totalCount})
            </button>
            <button
              onClick={onExit}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm cursor-pointer transition-all"
            >
              Quay lại danh sách
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: COMPLETED SUMMARY
  // =========================================================================
  if (isCompleted) {
    const accuracy = firstAttemptAccuracy(score, cards.length);
    return (
      <div className="min-h-screen bg-[#070913] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-8 select-none">
        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl animate-fade-in">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
            <Award className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs font-black uppercase text-cyan-400 tracking-widest">
              Hoàn thành bài luyện gõ
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
              {accuracy >= 80 ? 'Xuất sắc! 🎉' : 'Hoàn thành tốt! 💪'}
            </h2>
            <p className="text-sm text-slate-400 mt-2">{title || 'Luyện gõ Chữ Hán'}</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/50">
              <span className="text-[10px] font-black uppercase text-slate-400 block">ĐIỂM SỐ</span>
              <span className="text-xl font-black text-cyan-400 mt-0.5 block">
                {score}/{cards.length}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/50">
              <span className="text-[10px] font-black uppercase text-slate-400 block">ĐÚNG LẦN ĐẦU</span>
              <span className="text-xl font-black text-emerald-400 mt-0.5 block">{accuracy}%</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/50">
              <span className="text-[10px] font-black uppercase text-slate-400 block">THỜI GIAN</span>
              <span className="text-xl font-black text-amber-400 mt-0.5 block font-mono">
                {formatTime(seconds)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-2">
            {wrongCardIds.size > 0 && (
              <button
                type="button"
                onClick={handleRestartWrongOnly}
                className="w-full py-3.5 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-500/20 active:scale-98 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Luyện lại {wrongCardIds.size} câu sai
              </button>
            )}

            <button
              type="button"
              onClick={handleRestartAll}
              className="w-full py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20 active:scale-98 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Luyện lại tất cả ({cards.length})
            </button>

            <button
              type="button"
              onClick={onExit}
              className="w-full py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 font-bold text-sm cursor-pointer active:scale-98 transition-all"
            >
              Quay lại danh sách
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: MAIN TYPING INTERFACE
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 flex flex-col justify-between p-3 sm:p-6 select-none">
      {/* 1. TOP BAR */}
      <div className="max-w-3xl mx-auto w-full flex items-center justify-between pb-3 border-b border-slate-800/80">
        {/* Left: Mode Title & Progress */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase text-cyan-400 tracking-wider">
              {mode === 'core' ? 'CHỮ HÁN CỐT LÕI (KUN / ON)' : 'TỪ VỰNG CHỮ HÁN GHÉP'}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {currentIndex + 1}/{cards.length}
            </span>
          </div>
          <span className="text-xs text-slate-400 truncate max-w-[200px] sm:max-w-xs mt-0.5">
            {title || (mode === 'core' ? 'Luyện gõ âm Kun & âm On' : 'Luyện gõ cách đọc từ ghép')}
          </span>
        </div>

        {/* Center: Timer */}
        <div className="hidden sm:flex flex-col items-center">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
            THỜI GIAN
          </span>
          <span className="text-lg font-black text-white font-mono leading-tight">
            {formatTime(seconds)}
          </span>
        </div>

        {/* Right: Controls & Exit */}
        <div className="flex items-center gap-2">
          {/* Sound FX */}
          <button
            type="button"
            onClick={handleToggleSound}
            className={`p-2 rounded-xl border text-xs cursor-pointer transition-all ${
              soundEnabled
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}
            title={soundEnabled ? 'Âm thanh: BẬT' : 'Âm thanh: TẮT'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Shuffle */}
          <button
            type="button"
            onClick={handleToggleShuffle}
            className={`p-2 rounded-xl border text-xs cursor-pointer transition-all ${
              isShuffleEnabled
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}
            title={isShuffleEnabled ? 'Trộn thẻ: BẬT' : 'Trộn thẻ: TẮT'}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          {/* Exit */}
          <button
            type="button"
            onClick={onExit}
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 border border-slate-700 cursor-pointer transition-all"
            title="Thoát luyện gõ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="max-w-3xl mx-auto w-full my-2">
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300 ease-out"
            style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
          />
        </div>
      </div>

      {/* 2. MAIN CARD WORKSPACE */}
      <div className="max-w-2xl mx-auto w-full my-auto py-4 space-y-4">
        {/* CARD PROMPT BOX */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center relative shadow-2xl overflow-hidden">
          {/* Top Info Bar inside Prompt */}
          <div className="flex items-center justify-between mb-4">
            {/* Filter Tabs in prompt header */}
            <div className="flex items-center gap-1 bg-slate-800/70 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => handleFilterChange('original')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  filterTab === 'original'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Chưa thuộc ({unmasteredCount})
              </button>
              <button
                type="button"
                onClick={() => handleFilterChange('mastered')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  filterTab === 'mastered'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Đã thuộc ({masteredCount})
              </button>
              <button
                type="button"
                onClick={() => handleFilterChange('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  filterTab === 'all'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tất cả ({totalCount})
              </button>
            </div>

            {/* Mastered Star Toggle */}
            {onCardMastered && (
              <button
                type="button"
                onClick={handleToggleMasteredCurrent}
                className={`p-2 rounded-xl border text-xs cursor-pointer transition-all flex items-center gap-1.5 ${
                  isCurrentCardMastered
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
                title={isCurrentCardMastered ? 'Đã thuộc (Bấm để hủy)' : 'Đánh dấu đã thuộc'}
              >
                <Star
                  className={`w-4 h-4 ${isCurrentCardMastered ? 'fill-amber-400 text-amber-400' : ''}`}
                />
                <span className="hidden sm:inline text-[11px] font-bold">
                  {isCurrentCardMastered ? 'Đã thuộc' : 'Thuộc'}
                </span>
              </button>
            )}
          </div>

          {/* PROMPT CONTENT */}
          {mode === 'core' && currentKanji && (
            <div className="space-y-4">
              {/* Big Kanji */}
              <div className="flex items-center justify-center gap-3">
                <span className="text-6xl sm:text-7xl font-black text-white font-japanese tracking-wide drop-shadow-md">
                  {currentKanji.kanji}
                </span>
                <button
                  type="button"
                  onClick={handleSpeakCard}
                  className="p-2.5 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 cursor-pointer active:scale-95 transition-all shadow-sm"
                  title="Phát âm chữ Hán"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>

              {/* Hán Việt & Meaning */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <span className="px-3.5 py-1 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 font-black text-sm tracking-widest uppercase">
                  {currentKanji.hanViet || 'HÁN VIỆT'}
                </span>
                {currentKanji.strokeCount && (
                  <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold">
                    {currentKanji.strokeCount} nét
                  </span>
                )}
              </div>

              <p className="text-lg sm:text-xl font-bold text-slate-200 max-w-lg mx-auto">
                {currentKanji.meaning}
              </p>
            </div>
          )}

          {mode === 'vocab' && currentVocab && (
            <div className="space-y-4">
              {/* Big Vocab Compound (Chữ Hán) */}
              <div className="flex items-center justify-center gap-3">
                <span className="text-5xl sm:text-6xl font-black text-white font-japanese tracking-wide drop-shadow-md">
                  {currentVocab.term}
                </span>
                <button
                  type="button"
                  onClick={handleSpeakCard}
                  className="p-2.5 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 cursor-pointer active:scale-95 transition-all shadow-sm"
                  title="Phát âm từ vựng"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>

              {/* Vietnamese Meaning (Nghĩa tiếng Việt) — chỉ hiện sau khi gõ đúng */}
              {isAnswerChecked && isOverallCorrect ? (
                <p className="text-lg sm:text-xl font-bold text-cyan-300 max-w-lg mx-auto animate-fade-in">
                  {currentVocab.definition}
                </p>
              ) : (
                <p className="text-sm font-semibold text-slate-500 max-w-lg mx-auto">
                  Gõ đúng cách đọc để xem nghĩa
                </p>
              )}

              {isAnswerChecked && isOverallCorrect && currentVocab.example && (
                <div className="pt-2 text-xs text-slate-400 bg-slate-800/40 p-2.5 rounded-xl border border-slate-800 text-left">
                  <span className="font-bold text-slate-300">Ví dụ: </span>
                  <span className="text-slate-200">{currentVocab.example}</span>
                  {currentVocab.exampleMeaning && (
                    <div className="text-slate-400 mt-0.5">{currentVocab.exampleMeaning}</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* INPUT AREA */}
        {mode === 'core' && currentKanji && (
          <div className="space-y-3">
            {/* Box 1: Kunyomi (Hiragana) */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                  <span>KUNYOMI (訓読み)</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    • Âm thuần Nhật (Hiragana)
                  </span>
                </label>
                {!hasKunyomi ? (
                  <span className="text-[10px] text-slate-400 italic">Không có âm Kun</span>
                ) : kunParts.length > 1 ? (
                  <span className="text-[10px] font-bold text-amber-300">{kunParts.length} cách đọc</span>
                ) : null}
              </div>

              <div className={`grid gap-2 ${kunParts.length > 1 ? 'sm:grid-cols-2' : ''}`}>
                {(hasKunyomi ? kunParts : ['']).map((_, i) => (
                  <div key={i} className="relative">
                    <input
                      ref={(el) => {
                        kunInputRefs.current[i] = el;
                      }}
                      type="text"
                      value={kunInputs[i] ?? ''}
                      disabled={!hasKunyomi}
                      onChange={(e) => handleReadingChange('kun', i, e)}
                      onKeyDown={(e) => handleReadingKeyDown('kun', i, e)}
                      placeholder={
                        !hasKunyomi
                          ? '— Không có âm Kun (Bỏ qua) —'
                          : kunParts.length > 1
                          ? `Âm Kun thứ ${i + 1}/${kunParts.length}`
                          : 'Gõ âm Kun (vd: saki → さき)'
                      }
                      aria-label={`Âm Kun thứ ${i + 1}`}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      className={`w-full px-4 py-3 rounded-xl bg-slate-950 border text-base sm:text-lg font-bold font-japanese outline-none transition-all ${
                        !hasKunyomi
                          ? 'border-slate-800 text-slate-400 bg-slate-900/50 cursor-not-allowed'
                          : isAnswerChecked && kunResults.length > 0
                          ? kunResults[i]
                            ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                            : 'border-rose-500 text-rose-300 bg-rose-500/10'
                          : 'border-slate-700 text-slate-300/70 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20'
                      }`}
                    />
                    {hasKunyomi && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {kunParts.length > 1 ? `Hiragana ${i + 1}` : 'Hiragana'}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Error feedback for Kunyomi */}
              {isAnswerChecked && hasKunyomi && kunResults.length > 0 && !kunCorrect && (
                <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5 flex items-center justify-between animate-fade-in">
                  <div>
                    <span className="font-bold">Đáp án chuẩn: </span>
                    <span className="font-black text-rose-300 font-japanese text-sm">
                      {currentKanji.kunyomi}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">Ấn phím bất kỳ để sửa</span>
                </div>
              )}
            </div>

            {/* Box 2: Onyomi (Katakana) */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase text-cyan-400 tracking-wider flex items-center gap-1.5">
                  <span>ONYOMI (音読み)</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    • Âm Hán Nhật (Katakana)
                  </span>
                </label>
                {!hasOnyomi ? (
                  <span className="text-[10px] text-slate-400 italic">Không có âm On</span>
                ) : onParts.length > 1 ? (
                  <span className="text-[10px] font-bold text-cyan-300">{onParts.length} cách đọc</span>
                ) : null}
              </div>

              <div className={`grid gap-2 ${onParts.length > 1 ? 'sm:grid-cols-2' : ''}`}>
                {(hasOnyomi ? onParts : ['']).map((_, i) => (
                  <div key={i} className="relative">
                    <input
                      ref={(el) => {
                        onInputRefs.current[i] = el;
                      }}
                      type="text"
                      value={onInputs[i] ?? ''}
                      disabled={!hasOnyomi}
                      onChange={(e) => handleReadingChange('on', i, e)}
                      onKeyDown={(e) => handleReadingKeyDown('on', i, e)}
                      placeholder={
                        !hasOnyomi
                          ? '— Không có âm On (Bỏ qua) —'
                          : onParts.length > 1
                          ? `Âm On thứ ${i + 1}/${onParts.length}`
                          : 'Gõ âm On (vd: sen → セン)'
                      }
                      aria-label={`Âm On thứ ${i + 1}`}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      className={`w-full px-4 py-3 rounded-xl bg-slate-950 border text-base sm:text-lg font-bold font-japanese outline-none transition-all ${
                        !hasOnyomi
                          ? 'border-slate-800 text-slate-400 bg-slate-900/50 cursor-not-allowed'
                          : isAnswerChecked && onResults.length > 0
                          ? onResults[i]
                            ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                            : 'border-rose-500 text-rose-300 bg-rose-500/10'
                          : 'border-slate-700 text-slate-300/70 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
                      }`}
                    />
                    {hasOnyomi && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {onParts.length > 1 ? `Katakana ${i + 1}` : 'Katakana'}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Error feedback for Onyomi */}
              {isAnswerChecked && hasOnyomi && onResults.length > 0 && !onCorrect && (
                <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5 flex items-center justify-between animate-fade-in">
                  <div>
                    <span className="font-bold">Đáp án chuẩn: </span>
                    <span className="font-black text-rose-300 font-japanese text-sm">
                      {currentKanji.onyomi}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">Ấn phím bất kỳ để sửa</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* INPUT AREA FOR VOCAB (1 BOX) */}
        {mode === 'vocab' && currentVocab && (
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase text-cyan-400 tracking-wider flex items-center gap-1.5">
                <span>CÁCH ĐỌC TIẾNG NHẬT</span>
                <span className="text-[10px] text-slate-400 font-normal">• Kana</span>
              </label>

              {/* IME Toggle badge */}
              <button
                type="button"
                onClick={() => {
                  const next =
                    vocabImeMode === 'hiragana'
                      ? 'katakana'
                      : vocabImeMode === 'katakana'
                      ? 'off'
                      : 'hiragana';
                  setVocabImeMode(next);
                  sound.playClick();
                }}
                className="text-[10px] font-mono px-2.5 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 cursor-pointer transition-all"
                title="Bấm để đổi bộ gõ IME (Hiragana / Katakana / Tắt)"
              >
                IME: {vocabImeMode === 'hiragana' ? 'あ' : vocabImeMode === 'katakana' ? 'ア' : 'EN'}
              </button>
            </div>

            <div className="relative">
              <input
                ref={vocabInputRef}
                type="text"
                value={vocabInput}
                onChange={handleVocabChange}
                onKeyDown={handleVocabKeyDown}
                placeholder="Gõ cách đọc tiếng Nhật (vd: sensei → せんせい)"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                className={`w-full px-4 py-3.5 rounded-xl bg-slate-950 border text-lg sm:text-xl font-bold font-japanese outline-none transition-all ${
                  isAnswerChecked
                    ? isOverallCorrect
                      ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                      : 'border-rose-500 text-rose-300 bg-rose-500/10'
                    : 'border-slate-700 text-slate-300/70 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
                }`}
              />
            </div>

            {/* Error feedback for Vocab */}
            {isAnswerChecked && !isOverallCorrect && (
              <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-center justify-between animate-fade-in">
                <div>
                  <span className="font-bold">Đáp án chuẩn: </span>
                  <span className="font-black text-rose-300 font-japanese text-base ml-1">
                    {currentVocab.reading || currentVocab.term}
                  </span>
                  {currentVocab.romaji && (
                    <span className="text-xs text-rose-300/80 font-sans ml-2 font-normal">
                      ({currentVocab.romaji})
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400">Ấn phím bất kỳ để sửa</span>
              </div>
            )}
          </div>
        )}

        {/* OVERALL SUCCESS BANNER */}
        {isAnswerChecked && isOverallCorrect && (
          <div className="bg-emerald-500/15 border border-emerald-500/40 rounded-2xl p-3.5 flex items-center justify-between text-emerald-400 font-bold text-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Chính xác! Đang chuyển thẻ tiếp theo... 🎉</span>
            </div>
            <span className="text-xs text-emerald-300/80 font-mono hidden sm:inline">
              [Enter ↵ để đi tiếp]
            </span>
          </div>
        )}
      </div>

      {/* 3. BOTTOM ACTION BAR */}
      <div className="max-w-2xl mx-auto w-full pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
        {/* Skip button */}
        <button
          type="button"
          onClick={handleSkipCard}
          className="px-4 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-bold cursor-pointer active:scale-95 transition-all"
        >
          Bỏ qua thẻ này
        </button>

        {/* Check / Next Button */}
        <button
          type="button"
          onClick={
            isAnswerChecked && isOverallCorrect
              ? handleNextCard
              : handleCheckAnswer
          }
          className={`flex-1 sm:flex-initial px-6 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all ${
            isAnswerChecked && isOverallCorrect
              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
              : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20'
          }`}
        >
          <span>{isAnswerChecked && isOverallCorrect ? 'Tiếp tục' : 'Kiểm tra'}</span>
          <CornerDownLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
