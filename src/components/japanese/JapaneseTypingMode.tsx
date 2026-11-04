import { firstAttemptAccuracy } from '../../utils/typingScore';
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
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
  Lightbulb,
} from 'lucide-react';
import { JapaneseLesson, JapaneseVocabCard } from '../../types/japanese';
import {
  convertRomajiToKana,
  speakJapanese,
  checkJapaneseAnswer,
  checkVietnameseAnswer,
} from '../../utils/japaneseKana';
import { checkGrammarSentenceAnswer } from '../../utils/japaneseKanjiConverter';
import { sound } from '../../utils/audio';
import { getTypingProgress, saveTypingProgress, clearTypingProgress } from '../../utils/studyProgressStorage';
import { shuffleArray } from '../../utils/shuffle';
import { realtimeSync } from '../../utils/realtimeSync';
import { computeJapaneseDiff } from '../../utils/japaneseDiff';
import { removeVietnameseAccents } from '../../utils/japaneseKana';
import { toKanaReading } from '../../utils/kanaReading';

// Câu ví dụ hiển thị/đọc hoàn toàn bằng kana (không chữ Hán)
const toKanaExample = (ex?: string) => (ex ? toKanaReading(ex) : ex);

/* ---------------- Gợi ý & so sánh cho chiều Nhật → Việt ---------------- */
/** Tách nghĩa tiếng Việt thành các cách nói chấp nhận được (vd. "Cả năm, suốt năm") */
const viVariants = (def: string): string[] =>
  (def || '')
    .split(/[,;/／+、|]+/)
    .map((x) => x.replace(/[\(（][^\)）]*[\)）]/g, '').replace(/[~～〜]/g, '').trim())
    .filter(Boolean);

const hasVietnameseMarks = (s: string) => s !== removeVietnameseAccents(s);

/** Cách nói gần với câu trả lời nhất (để chỉ chỗ sai cho đúng) */
const closestVariant = (input: string, def: string): string => {
  const vs = viVariants(def);
  if (!vs.length) return def || '';
  const norm = (x: string) => removeVietnameseAccents(x.toLowerCase()).replace(/\s+/g, ' ').trim();
  const u = norm(input);
  let best = vs[0];
  let bestScore = -1;
  for (const v of vs) {
    const t = norm(v);
    let same = 0;
    for (let i = 0; i < Math.min(u.length, t.length); i++) if (u[i] === t[i]) same++;
    const score = same - Math.abs(u.length - t.length) * 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = v;
    }
  }
  return best;
};

/** Gợi ý tiếng Việt từng bước: 1 = chữ cái đầu mỗi từ, 2 = lộ một nửa, 3 = cả đáp án */
const viHintMask = (answer: string, level: number): string => {
  if (level >= 3) return answer;
  return answer
    .split(/(\s+)/)
    .map((w) => {
      if (!w.trim()) return w;
      const chars = Array.from(w);
      const keep = level <= 1 ? 1 : Math.max(1, Math.ceil(chars.length / 2));
      return chars.map((c, i) => (i < keep ? c : '_')).join('');
    })
    .join('');
};

/** So sánh từng chữ cho tiếng Việt (bộ so sánh tiếng Nhật sẽ đổi chữ La-tinh thành kana) */
const computePlainDiff = (input: string, target: string) => {
  const a = Array.from(input);
  const b = Array.from(target);
  const eq = (x: string, y: string) => x.toLowerCase() === y.toLowerCase();
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) dp[i][j] = eq(a[i], b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const userMark: boolean[] = new Array(n).fill(false);
  const targetMark: boolean[] = new Array(m).fill(false);
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (eq(a[i], b[j])) {
      userMark[i] = targetMark[j] = true;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  const group = (chars: string[], marks: boolean[], bad: 'wrong' | 'missing') => {
    const parts: { text: string; type: 'correct' | 'wrong' | 'missing' }[] = [];
    chars.forEach((c, k) => {
      const type = marks[k] ? 'correct' : bad;
      const last = parts[parts.length - 1];
      if (last && last.type === type) last.text += c;
      else parts.push({ text: c, type });
    });
    return parts;
  };
  const userParts = group(a, userMark, 'wrong');
  const targetParts = group(b, targetMark, 'missing');
  // Gợi ý: từ đầu tiên bị sai
  const uw = input.trim().split(/\s+/);
  const tw = target.trim().split(/\s+/);
  let firstErrorHint = '';
  for (let k = 0; k < Math.max(uw.length, tw.length); k++) {
    const x = uw[k] || '';
    const y = tw[k] || '';
    if (x.toLowerCase() !== y.toLowerCase()) {
      firstErrorHint = !x ? `Còn thiếu "${tw.slice(k).join(' ')}"` : !y ? `Thừa "${uw.slice(k).join(' ')}"` : `Gõ "${x}" → cần là "${y}"`;
      break;
    }
  }
  return { userParts, targetParts, firstErrorHint };
};

/** Đọc tiếng Việt (nếu máy có giọng tiếng Việt) */
const speakVietnamese = (text: string) => {
  try {
    const synth = window.speechSynthesis;
    if (!synth || !text) return;
    const voice = synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith('vi'));
    if (!voice) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = 0.95;
    synth.speak(u);
  } catch {}
};

export type TypingDirection = 'vi-to-jp' | 'jp-to-vi';

function recoverTypingScore(state: {currentIndex: number; score?: number; wrongCardIds?: string[]; scoringVersion?: number; acceptedCardIds?: string[]}, order: string[]) {
  const wrong = new Set(state.wrongCardIds || []);
  const accepted = new Set<string>(state.scoringVersion === 2 && Array.isArray(state.acceptedCardIds)
    ? state.acceptedCardIds.filter(id => order.includes(id)) : []);
  if (state.scoringVersion === 2) return {accepted, score: [...accepted].filter(id => !wrong.has(id)).length};
  // Legacy score included corrected answers; deduct mistakes before the saved position.
  const failed = order.slice(0, state.currentIndex).filter(id => wrong.has(id)).length;
  const score = Math.max(0, Math.min(state.score || 0, state.currentIndex - failed));
  return {accepted: new Set(order.slice(0, state.currentIndex).filter(id => !wrong.has(id)).slice(0, score)), score};
}


interface JapaneseTypingModeProps {
  lesson: JapaneseLesson;
  initialFilter?: 'original' | 'mastered' | 'all';
  isKanjiSection?: boolean;
  isExampleMode?: boolean;
  initialDirection?: TypingDirection;
  onExit: () => void;
  onCardMastered?: (cardId: string, mastered: boolean) => void;
}

export const JapaneseTypingMode: React.FC<JapaneseTypingModeProps> = ({
  lesson,
  initialFilter = 'original',
  isKanjiSection = false,
  isExampleMode = false,
  initialDirection,
  onExit,
  onCardMastered,
}) => {
  // Source cards representing full list from outer view (filtered to cards with example in example mode)
  const rawCards = isExampleMode
    ? lesson.cards.filter((c) => c.example && c.example.trim().length > 0)
    : lesson.cards;
  const [cardsSource, setCardsSource] = useState<JapaneseVocabCard[]>(rawCards);

  // Sync if lesson.cards prop changes
  useEffect(() => {
    const list = isExampleMode
      ? lesson.cards.filter((c) => c.example && c.example.trim().length > 0)
      : lesson.cards;
    setCardsSource(list);
  }, [lesson.cards, isExampleMode]);

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
    const baseList = getCardsByTab(tab, rawCards);
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
  // An accepted card can only schedule one advance and earn one first-attempt point.
  const acceptedAnswersRef = useRef(new Set<string>());
  const [wrongCardIds, setWrongCardIds] = useState<Set<string>>(new Set());
  const [isCompleted, setIsCompleted] = useState(false);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [showAudioHintFeedback, setShowAudioHintFeedback] = useState(false);
  // Gợi ý tiếng Việt từng bước (chiều Nhật → Việt)
  const [viHintLevel, setViHintLevel] = useState(0);

  // Options modal & audio settings
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(() => sound.isEnabled());
  const [autoSpeechEnabled, setAutoSpeechEnabled] = useState(() => {
    return localStorage.getItem('typing_auto_speech') === 'true';
  });
  const [direction, setDirection] = useState<TypingDirection>(() => {
    if (isExampleMode) {
      const saved = localStorage.getItem('typing_direction_example');
      return saved === 'jp-to-vi' ? 'jp-to-vi' : 'vi-to-jp';
    }
    if (initialDirection && (initialDirection === 'vi-to-jp' || initialDirection === 'jp-to-vi')) {
      return initialDirection;
    }
    const saved = localStorage.getItem('typing_direction_vocab_user');
    return saved === 'jp-to-vi' ? 'jp-to-vi' : 'vi-to-jp';
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCursorRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Preserve cursor position across React re-renders when editing in the middle of text
  useLayoutEffect(() => {
    if (pendingCursorRef.current !== null && inputRef.current) {
      const pos = pendingCursorRef.current;
      inputRef.current.setSelectionRange(pos, pos);
      pendingCursorRef.current = null;
    }
  });

  useEffect(() => () => { if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current); }, [currentIndex, filterTab, direction, isShuffleEnabled]);
  const currentCard = cards[currentIndex];
  const exKana = toKanaExample(currentCard?.example);
  const isCurrentKata = currentCard
    ? /[\u30A0-\u30FF]/.test(currentCard.term) && !/[\u4E00-\u9FAF]/.test(currentCard.term)
    : false;
  const storageId = isExampleMode
    ? `lesson_example_${lesson.id}_${filterTab}`
    : `lesson_${lesson.id}_${filterTab}`;

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
    setWrongCardIds(new Set());
    acceptedAnswersRef.current.clear();
    if (advanceTimerRef.current) { clearTimeout(advanceTimerRef.current); advanceTimerRef.current = null; }
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
    const next: TypingDirection = newDir || (direction === 'vi-to-jp' ? 'jp-to-vi' : 'vi-to-jp');
    setDirection(next);
    if (isExampleMode) {
      localStorage.setItem('typing_direction_example', next);
    } else {
      localStorage.setItem('typing_direction_vocab_user', next);
      localStorage.setItem('typing_direction', next);
    }
    setInputVal('');
    setIsAnswerChecked(false);
    setIsCorrect(null);
    setCurrentIndex(0);
    setScore(0);
    setWrongCardIds(new Set());
    acceptedAnswersRef.current.clear();
    if (advanceTimerRef.current) { clearTimeout(advanceTimerRef.current); advanceTimerRef.current = null; }
    sound.playClick();
  };
  // 1. Restore previous session progress on mount or filter change
  useEffect(() => {
    const saved = getTypingProgress(storageId);
    if (saved && typeof saved.currentIndex === 'number' && saved.currentIndex >= 0 && saved.currentIndex < cards.length) {
      if (saved.cardIds && saved.cardIds.length === cards.length) {
        const idMap = new Map<string, JapaneseVocabCard>(cards.map((c) => [c.id, c] as [string, JapaneseVocabCard]));
        const reordered = saved.cardIds.map((id) => idMap.get(id)).filter(Boolean) as JapaneseVocabCard[];
        if (reordered.length === cards.length) {
          setCards(reordered);
        }
      }
      setCurrentIndex(saved.currentIndex);
      const order = saved.cardIds || cards.map(c => c.id);
      const recovered = recoverTypingScore(saved, order);
      acceptedAnswersRef.current = recovered.accepted;
      setScore(recovered.score);
      const alreadyAccepted = recovered.accepted.has(order[saved.currentIndex]);
      setIsAnswerChecked(alreadyAccepted);
      setIsCorrect(alreadyAccepted ? true : null);
      setSeconds(saved.seconds || 0);
      if (saved.wrongCardIds) setWrongCardIds(new Set(saved.wrongCardIds));
      if (saved.inputVal) setInputVal(saved.inputVal);
      setShowResumeBanner(true);
    }
  }, [storageId, cards.length]);

  const isRemoteUpdateRef = useRef(false);
  // Giá trị mới nhất cho bộ lắng nghe đồng bộ (tránh dùng giá trị cũ trong closure)
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const cardsRef = useRef(cards);
  cardsRef.current = cards;
  const isInitialMountRef = useRef(true);

  // Cross-Tab & Cross-Device Real-time Sync (< 2ms)
  useEffect(() => {
    if (!storageId) return;

    const unsubscribe = realtimeSync.subscribeKey('JP_TYPING', storageId, (payload) => {
      if (typeof payload.currentIndex === 'number' && payload.currentIndex >= 0 && payload.currentIndex < cards.length) {
        // Cùng câu đang gõ và không có gì mới (thường là bản lưu của chính mình được gửi lại):
        // KHÔNG đụng vào ô nhập, khung báo sai, hay bộ hẹn giờ tự chuyển câu.
        const curId = cardsRef.current[currentIndexRef.current]?.id;
        const remoteOrder: string[] = payload.data?.cardIds || [];
        const remoteAccepted = new Set<string>(payload.data?.acceptedCardIds || []);
        if (
          payload.currentIndex === currentIndexRef.current &&
          (!remoteOrder.length || remoteOrder[payload.currentIndex] === curId) &&
          remoteAccepted.has(curId) === acceptedAnswersRef.current.has(curId)
        ) {
          return;
        }
        isRemoteUpdateRef.current = true;
        if (advanceTimerRef.current) { clearTimeout(advanceTimerRef.current); advanceTimerRef.current = null; }
        setCurrentIndex(payload.currentIndex);
        const order: string[] = payload.data?.cardIds || cards.map(c => c.id);
        const recovered = recoverTypingScore({...payload.data, currentIndex: payload.currentIndex}, order);
        acceptedAnswersRef.current = recovered.accepted;
        setScore(recovered.score);
        const alreadyAccepted = recovered.accepted.has(order[payload.currentIndex]);
        setIsAnswerChecked(alreadyAccepted);
        setIsCorrect(alreadyAccepted ? true : null);
        if (typeof payload.data?.inputVal === 'string') setInputVal(payload.data.inputVal);
        const orderedCards = order.map(id => cards.find(c => c.id === id)).filter(Boolean) as JapaneseVocabCard[];
        if (orderedCards.length === cards.length && new Set(order).size === cards.length) setCards(orderedCards);
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
      scoringVersion: 2,
      acceptedCardIds: [...acceptedAnswersRef.current],
      seconds,
      inputVal,
    });
  }, [currentIndex, cards, score, wrongCardIds, seconds, inputVal, isCompleted, isAnswerChecked, storageId]);

  // Timer counter
  useEffect(() => {
    if (isCompleted) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = window.setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isCompleted]);

  // Format MM:SS
  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Focus input automatically on card change
  useEffect(() => {
    const alreadyAccepted = acceptedAnswersRef.current.has(cards[currentIndex]?.id);
    if (!alreadyAccepted) setInputVal('');
    setIsAnswerChecked(alreadyAccepted);
    setIsCorrect(alreadyAccepted ? true : null);
    setShowAudioHintFeedback(false);
    setViHintLevel(0);
    
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
    // Nhật → Việt: đáp án là tiếng Việt nên gợi ý bằng chữ tiếng Việt (từng bước), không phát lại tiếng Nhật
    if (direction === 'jp-to-vi') {
      const next = Math.min(3, viHintLevel + 1);
      setViHintLevel(next);
      setShowAudioHintFeedback(true);
      sound.playClick();
      if (next >= 3) {
        // Đã xem cả đáp án → tính là chưa thuộc câu này
        setWrongCardIds((prev) => new Set(prev).add(currentCard.id));
        const ans = isExampleMode ? currentCard.exampleMeaning || currentCard.definition : viVariants(currentCard.definition)[0] || currentCard.definition;
        speakVietnamese(ans);
      }
      inputRef.current?.focus();
      return;
    }
    const targetText = isExampleMode
      ? exKana || currentCard.reading || currentCard.term
      : currentCard.reading || currentCard.term;
    speakJapanese(targetText);
    setShowAudioHintFeedback(true);
    sound.playClick();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Auto speech for Japanese word when moving to card in jp-to-vi mode
  useEffect(() => {
    if (autoSpeechEnabled && currentCard && (direction === 'jp-to-vi' || isExampleMode) && !isCompleted) {
      const targetText = isExampleMode
        ? exKana || currentCard.reading || currentCard.term
        : currentCard.reading || currentCard.term;
      speakJapanese(targetText);
    }
  }, [currentIndex, autoSpeechEnabled, direction, isCompleted, currentCard, isExampleMode]);

  // Handle typing with Romaji -> Kana conversion if IME mode is enabled (in vi-to-jp mode)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Dismiss error feedback box as soon as user starts editing/fixing their answer!
    if (isAnswerChecked && !isCorrect) {
      setIsAnswerChecked(false);
      setIsCorrect(null);
    }

    const raw = e.target.value;
    const cursorPos = e.target.selectionStart ?? raw.length;

    if (direction === 'jp-to-vi' || imeMode === 'off') {
      pendingCursorRef.current = cursorPos;
      setInputVal(raw);
    } else {
      const rawPrefix = raw.slice(0, cursorPos);
      const convertedPrefix = convertRomajiToKana(rawPrefix, imeMode);
      const converted = convertRomajiToKana(raw, imeMode);
      pendingCursorRef.current = convertedPrefix.length;
      setInputVal(converted);
    }
  };

  const checkAnswer = () => {
    if (currentCard && acceptedAnswersRef.current.has(currentCard.id)) return;
    if (!currentCard || !inputVal.trim()) return;

    let finalized = inputVal;
    // Auto-finalize any pending trailing 'n' to 'ん' or 'ン' ONLY when typing Japanese (vi-to-jp)
    if (direction === 'vi-to-jp' && imeMode !== 'off') {
      const targetKanaN = isCurrentKata || imeMode === 'katakana' ? 'ン' : 'ん';
      finalized = inputVal.replace(/n(?=[^a-z]|$)/gi, targetKanaN);
      if (finalized !== inputVal) {
        setInputVal(finalized);
      }
    }

    let matched = false;
    if (isExampleMode) {
      if (direction === 'jp-to-vi') {
        matched = checkVietnameseAnswer(finalized, currentCard.exampleMeaning || currentCard.definition);
      } else {
        matched = checkGrammarSentenceAnswer(finalized, exKana || '', true) || checkGrammarSentenceAnswer(finalized, currentCard.example || '', true);
      }
    } else if (direction === 'vi-to-jp') {
      matched = checkJapaneseAnswer(finalized, currentCard);
    } else {
      matched = checkVietnameseAnswer(finalized, currentCard.definition);
    }

    setIsAnswerChecked(true);
    setIsCorrect(matched);

    const speechText = isExampleMode
      ? exKana || currentCard.reading || currentCard.term
      : currentCard.reading || currentCard.term;

    if (matched) {
      sound.playCorrect();
      acceptedAnswersRef.current.add(currentCard.id);
      if (!wrongCardIds.has(currentCard.id)) setScore((s) => s + 1);
      if (autoSpeechEnabled) {
        speakJapanese(speechText);
      }

      // Advance automatically after a short delay
      advanceTimerRef.current = setTimeout(() => {
        handleNextCard();
      }, 1200);
    } else {
      sound.playWrong();
      if (autoSpeechEnabled) {
        speakJapanese(speechText);
      }
      setWrongCardIds((prev) => new Set(prev).add(currentCard.id));
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  const handleNextCard = () => {
    if (advanceTimerRef.current) { clearTimeout(advanceTimerRef.current); advanceTimerRef.current = null; }
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
    // PRESERVE user input: do NOT clear inputVal!
    setTimeout(() => {
      inputRef.current?.focus();
    }, 30);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!isAnswerChecked || !isCorrect) {
        checkAnswer();
      } else {
        handleNextCard();
      }
    } else if (isAnswerChecked && !isCorrect) {
      const ignoredNavKeys = [
        'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab',
        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'
      ];
      if (!ignoredNavKeys.includes(e.key)) {
        setIsAnswerChecked(false);
        setIsCorrect(null);
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
    setWrongCardIds(new Set());
    acceptedAnswersRef.current.clear();
    if (advanceTimerRef.current) { clearTimeout(advanceTimerRef.current); advanceTimerRef.current = null; }
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
    setWrongCardIds(new Set());
    acceptedAnswersRef.current.clear();
    if (advanceTimerRef.current) { clearTimeout(advanceTimerRef.current); advanceTimerRef.current = null; }
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
    setWrongCardIds(new Set());
    acceptedAnswersRef.current.clear();
    if (advanceTimerRef.current) { clearTimeout(advanceTimerRef.current); advanceTimerRef.current = null; }
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
            title="Bấm để đổi hướng luyện gõ (Việt ⇄ Nhật)"
          >
            <span className="text-[11px] font-black uppercase text-cyan-400 tracking-wider">
              {direction === 'vi-to-jp'
                ? (isExampleMode ? 'VÍ DỤ: VIỆT → NHẬT' : 'VIỆT → NHẬT')
                : (isExampleMode ? 'VÍ DỤ: NHẬT → VIỆT' : 'NHẬT → VIỆT')}
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

      {/* Category Tabs: Chưa nhớ • Đã nhớ • Tất cả (Đồng bộ dữ liệu từ danh sách ngoài) */}
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
            <span>Chưa nhớ</span>
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
                ? 'Từ này đang ở mục "Đã nhớ". Bấm để đưa về "Chưa nhớ" (đồng bộ danh sách ngoài)'
                : 'Bấm để đánh dấu "Đã nhớ" (đồng bộ danh sách ngoài)'
            }
          >
            <CheckCircle2
              className={`w-3.5 h-3.5 ${
                currentCard.mastered ? 'text-emerald-400' : 'text-slate-500'
              }`}
            />
            <span>{currentCard.mastered ? 'Đã nhớ (✓)' : 'Chưa nhớ'}</span>
          </button>
        )}
      </div>

      {/* 2-Way Direction Switcher placed prominently OUTSIDE for 1-click fast switching */}
      <div className="max-w-4xl mx-auto w-full pt-1.5 pb-1 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-2xl p-1 text-xs font-bold shadow-xs">
          <button
            type="button"
            onClick={() => toggleDirection('vi-to-jp')}
            className={`px-3.5 sm:px-4 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              direction === 'vi-to-jp'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span className="text-sm">🇻🇳</span>
            <span>{isExampleMode ? 'Đề: Ví dụ Việt ➔ Gõ: Nhật' : 'Đề: Nghĩa Việt ➔ Gõ: Tiếng Nhật'}</span>
          </button>

          <button
            type="button"
            onClick={() => toggleDirection('jp-to-vi')}
            className={`px-3.5 sm:px-4 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              direction === 'jp-to-vi'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span className="text-sm">🇯🇵</span>
            <span>{isExampleMode ? 'Đề: Ví dụ Nhật ➔ Gõ: Việt' : 'Đề: Tiếng Nhật ➔ Gõ: Nghĩa Việt'}</span>
          </button>
        </div>

        <span className="text-[11px] text-slate-500 font-medium hidden sm:inline-block">
          Bấm để đổi hướng luyện gõ tức thì
        </span>
      </div>

      {/* Options Modal */}
      {showOptionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 rounded-3xl border border-slate-700 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 text-slate-100 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
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

            <div className="space-y-4 overflow-y-auto flex-1 pr-1.5 custom-scrollbar">
              {/* Chọn mục luyện gõ: Chưa nhớ / Đã nhớ / Tất cả */}
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
                    Chưa nhớ ({unmasteredCount})
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
                      toggleDirection('vi-to-jp');
                      setShowOptionsModal(false);
                    }}
                    className={`px-3.5 py-2.5 rounded-xl border flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                      direction === 'vi-to-jp'
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                        : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🇻🇳</span>
                      <span>
                        {isExampleMode
                          ? 'Đề: Ví dụ tiếng Việt → Gõ: Câu tiếng Nhật'
                          : 'Đề: Nghĩa tiếng Việt → Gõ: Tiếng Nhật'}
                      </span>
                    </div>
                    {direction === 'vi-to-jp' && <span className="text-xs font-black">✓</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      toggleDirection('jp-to-vi');
                      setShowOptionsModal(false);
                    }}
                    className={`px-3.5 py-2.5 rounded-xl border flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                      direction === 'jp-to-vi'
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                        : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🇯🇵</span>
                      <span>
                        {isExampleMode
                          ? 'Đề: Ví dụ tiếng Nhật → Gõ: Nghĩa tiếng Việt'
                          : 'Đề: Tiếng Nhật → Gõ: Nghĩa tiếng Việt'}
                      </span>
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

            <div className="pt-2 shrink-0">
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
                ? 'Đã nhớ toàn bộ từ "Chưa nhớ"!'
                : 'Bài học chưa có từ vựng'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
              {filterTab === 'mastered'
                ? 'Bạn chưa đánh dấu từ nào là "Đã nhớ". Hãy chọn "Chưa nhớ" hoặc "Tất cả" để bắt đầu luyện gõ.'
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
                Gõ Chưa nhớ ({unmasteredCount} từ)
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
                {isExampleMode
                  ? direction === 'vi-to-jp'
                    ? 'ĐỀ BÀI: CÂU TIẾNG VIỆT → GÕ TIẾNG NHẬT'
                    : 'ĐỀ BÀI: CÂU TIẾNG NHẬT → GÕ NGHĨA TIẾNG VIỆT'
                  : direction === 'vi-to-jp'
                  ? 'ĐỀ BÀI: NGHĨA TIẾNG VIỆT'
                  : 'THUẬT NGỮ TIẾNG NHẬT'}
              </span>
              {(direction === 'jp-to-vi' || isExampleMode) && (
                <button
                  type="button"
                  onClick={() => speakJapanese(isExampleMode ? (exKana || currentCard.reading || currentCard.term) : (currentCard.reading || currentCard.term))}
                  className="p-1 rounded-full text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Nghe phát âm"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {isExampleMode ? (
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30 flex-wrap justify-center shadow-xs">
                  <span className="text-indigo-400">🎯 Từ vựng bài học:</span>
                  <span className="text-white font-black text-sm">{currentCard.term}</span>
                  {currentCard.reading && currentCard.reading !== currentCard.term && (
                    <span className="text-indigo-200">({currentCard.reading})</span>
                  )}
                  <span className="text-slate-400">•</span>
                  <span className="text-amber-300">{currentCard.definition}</span>
                </div>

                <div className="p-4 sm:p-5 rounded-3xl bg-slate-800/90 border border-indigo-500/40 shadow-2xl space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-[11px] font-black uppercase text-indigo-400 tracking-wider">
                      {direction === 'vi-to-jp' ? 'CÂU TIẾNG VIỆT CẦN DỊCH VÀ GÕ TIẾNG NHẬT' : 'CÂU VÍ DỤ TIẾNG NHẬT CẦN DỊCH SANG TIẾNG VIỆT'}
                    </span>
                    <button
                      type="button"
                      onClick={() => speakJapanese(exKana || '')}
                      className="p-1 rounded-full text-slate-400 hover:text-cyan-400 hover:bg-slate-700 transition-colors cursor-pointer"
                      title="Nghe phát âm câu ví dụ tiếng Nhật"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-relaxed">
                    {direction === 'vi-to-jp'
                      ? (currentCard.exampleMeaning || exKana)
                      : exKana}
                  </h2>
                </div>

                <p className="text-xs text-slate-400">
                  {direction === 'vi-to-jp'
                    ? '(Dịch câu tiếng Việt trên sang tiếng Nhật bằng Hiragana, Kanji hoặc Romaji theo cấu trúc bài học)'
                    : '(Nhìn câu tiếng Nhật ở trên và nhập nghĩa tiếng Việt tương ứng)'}
                </p>
              </div>
            ) : direction === 'vi-to-jp' ? (
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight">
                {currentCard.definition}
              </h2>
            ) : (
              <div className="space-y-1">
                <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight">
                  {isCurrentKata ? currentCard.term : (currentCard.reading || currentCard.term)}
                </h2>
                <div className="flex items-center justify-center gap-2 text-sm sm:text-base text-slate-300 font-medium">
                  {isCurrentKata ? (
                    currentCard.reading && currentCard.reading !== currentCard.term && (
                      <span className="text-indigo-300 font-bold">{currentCard.reading}</span>
                    )
                  ) : (
                    currentCard.term && currentCard.reading && currentCard.term !== currentCard.reading && (
                      <span className="text-amber-400 font-bold">{currentCard.term}</span>
                    )
                  )}
                  {currentCard.romaji && (
                    <span className="text-slate-400 font-mono">[{currentCard.romaji}]</span>
                  )}
                </div>
              </div>
            )}

            {/* Câu ví dụ kèm theo: Nhật → Việt hiện câu tiếng Nhật; Việt → Nhật hiện nghĩa tiếng Việt
                (hiện câu tiếng Nhật sẽ lộ luôn đáp án) */}
            {!isExampleMode && direction === 'jp-to-vi' && exKana && (
              <p className="text-sm sm:text-base text-slate-300 font-medium">{exKana}</p>
            )}
            {!isExampleMode && direction === 'vi-to-jp' && currentCard.exampleMeaning && (
              <p className="text-sm sm:text-base text-slate-400 font-medium italic">Ví dụ: {currentCard.exampleMeaning}</p>
            )}
          </div>

          {/* Input Section (exact match to image.png) */}
          <div className="space-y-4 pt-2">
            {/* Header above input: BỘ GÕ TRONG APP & Switcher (for vi-to-jp) */}
            {direction === 'vi-to-jp' ? (
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  {isExampleMode
                    ? 'GÕ CÂU TIẾNG NHẬT (KANJI HOẶC HIRAGANA)'
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
                  {isExampleMode ? 'NHẬP NGHĨA CÂU TIẾNG VIỆT' : 'NHẬP NGHĨA TIẾNG VIỆT'}
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
                    isExampleMode
                      ? direction === 'vi-to-jp'
                        ? imeMode === 'off'
                          ? 'Gõ câu ví dụ tiếng Nhật...'
                          : 'Gõ ví dụ (ひらがな | カタカナ)...'
                        : 'Nhập nghĩa tiếng Việt của câu ví dụ...'
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
                title={direction === 'jp-to-vi' ? 'Không nhớ nghĩa? Bấm để hiện dần chữ cái của đáp án' : 'Không biết từ? Bấm vào đây để nghe gợi ý phát âm'}
              >
                {direction === 'jp-to-vi' ? (
                  <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 group-hover:text-white group-hover:scale-110 transition-transform" />
                ) : (
                  <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400 group-hover:text-white group-hover:scale-110 transition-transform" />
                )}
                <span className="text-[10px] sm:text-[11px] font-black mt-0.5 whitespace-nowrap">
                  Gợi ý
                </span>
              </button>
            </div>

            {/* Gợi ý tiếng Việt (Nhật → Việt) */}
            {showAudioHintFeedback && !isAnswerChecked && direction === 'jp-to-vi' && (() => {
              const ans = isExampleMode ? currentCard.exampleMeaning || currentCard.definition : viVariants(currentCard.definition)[0] || currentCard.definition;
              return (
                <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-amber-950/50 border border-amber-500/40 text-amber-100 text-xs animate-in fade-in slide-in-from-top-1 duration-150 shadow-md">
                  <div className="flex items-center gap-2 min-w-0">
                    <Lightbulb className="w-4 h-4 text-amber-300 shrink-0" />
                    <span className="min-w-0">
                      {viHintLevel >= 3 ? 'Đáp án: ' : 'Gợi ý: '}
                      <b className="font-mono text-sm tracking-wide text-white break-words">{viHintMask(ans, viHintLevel)}</b>
                      {viHintLevel >= 3 && <span className="text-amber-300/80"> · câu này sẽ được ôn lại</span>}
                    </span>
                  </div>
                  {viHintLevel < 3 && (
                    <button type="button" onClick={handlePlayHintAudio} className="text-amber-300 hover:text-white font-bold underline text-[11px] cursor-pointer shrink-0">
                      {viHintLevel === 1 ? 'Gợi ý thêm' : 'Xem đáp án'}
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Audio Hint Feedback Banner */}
            {showAudioHintFeedback && !isAnswerChecked && direction === 'vi-to-jp' && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-indigo-950/70 border border-indigo-500/40 text-indigo-200 text-xs animate-in fade-in slide-in-from-top-1 duration-150 shadow-md">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-indigo-400 animate-pulse shrink-0" />
                  <span>
                    🔊 Đang phát âm gợi ý! {(direction === 'vi-to-jp' || isExampleMode) && (
                      <span className="text-amber-300 font-bold ml-1">
                        Bắt đầu bằng &quot;{((isExampleMode ? (direction === 'vi-to-jp' ? exKana : (currentCard.exampleMeaning || currentCard.definition)) : currentCard.reading) || currentCard.term).replace(/^[~～〜⁓〰\s(（]+/, '').charAt(0)}...&quot;
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
                className={`p-4 rounded-3xl border flex flex-col gap-3 text-sm animate-in fade-in zoom-in-95 duration-150 ${
                  isCorrect
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                    : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    {isCorrect ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
                    )}
                    <div className="text-left">
                      <span className="font-black text-base block">
                        {isCorrect ? 'Chính xác! 🎉' : 'Chưa chính xác! Hãy xem vị trí bị sai:'}
                      </span>
                      {isCorrect && (
                        <div className="text-xs text-slate-200 mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>Đáp án đúng:</span>
                          {isExampleMode ? (
                            direction === 'vi-to-jp' ? (
                              <>
                                <b className="text-white text-base">
                                  {exKana}
                                </b>
                                {currentCard.exampleMeaning && (
                                  <span className="text-amber-300 font-medium ml-1">
                                    ({currentCard.exampleMeaning})
                                  </span>
                                )}
                              </>
                            ) : (
                              <>
                                <b className="text-white text-base">
                                  {currentCard.exampleMeaning || currentCard.definition}
                                </b>
                                {exKana && (
                                  <span className="text-indigo-300 font-medium ml-1">
                                    ({exKana})
                                  </span>
                                )}
                              </>
                            )
                          ) : direction === 'vi-to-jp' ? (
                            <>
                              <b className="text-white text-base">
                                {isCurrentKata ? currentCard.term : (currentCard.reading || currentCard.term)}
                              </b>
                              {isCurrentKata ? (
                                currentCard.reading && currentCard.reading !== currentCard.term && (
                                  <span className="text-indigo-300 font-bold">({currentCard.reading})</span>
                                )
                              ) : (
                                currentCard.term && currentCard.reading && currentCard.term !== currentCard.reading && (
                                  <span className="text-amber-400 font-bold">({currentCard.term})</span>
                                )
                              )}
                              {currentCard.romaji && (
                                <span className="text-slate-400 font-mono">[{currentCard.romaji}]</span>
                              )}
                            </>
                          ) : (
                            <b className="text-white text-base">{currentCard.definition}</b>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => speakJapanese(isExampleMode ? (exKana || currentCard.reading || currentCard.term) : (currentCard.reading || currentCard.term))}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title={isExampleMode ? "Phát âm câu ví dụ này" : "Phát âm từ này"}
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>

                    {!isCorrect ? (
                      <>
                        <button
                          type="button"
                          onClick={checkAnswer}
                          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white border border-amber-500 transition-all cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95"
                          title="Kiểm tra lại câu trả lời sau khi sửa (Enter)"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Kiểm tra lại (Enter)</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleNextCard}
                          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer flex items-center gap-1"
                          title="Bỏ qua từ này và chuyển sang từ tiếp theo"
                        >
                          <span>Bỏ qua (Tiếp)</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleNextCard}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white flex items-center gap-1 cursor-pointer shadow-md"
                      >
                        <span>Tiếp (Enter)</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Detailed Error Diff View */}
                {!isCorrect && (
                  <div className="pt-2 border-t border-rose-900/50 text-left">
                    {(() => {
                      const targetTextForDiff = isExampleMode
                        ? (direction === 'vi-to-jp' ? (exKana || '') : (currentCard.exampleMeaning || currentCard.definition || ''))
                        : direction === 'vi-to-jp'
                        ? (isCurrentKata ? currentCard.term : (currentCard.reading || currentCard.term || ''))
                        : (currentCard.definition || '');

                      // Nhật → Việt: so với cách nói gần nhất; gõ không dấu thì so không dấu
                      let diffTarget = targetTextForDiff;
                      let diffInput = inputVal;
                      if (direction === 'jp-to-vi') {
                        diffTarget = closestVariant(inputVal, targetTextForDiff);
                        if (!hasVietnameseMarks(inputVal)) {
                          diffTarget = removeVietnameseAccents(diffTarget);
                          diffInput = removeVietnameseAccents(inputVal);
                        }
                      }
                      const diff = direction === 'jp-to-vi' ? computePlainDiff(diffInput, diffTarget) : computeJapaneseDiff(diffInput, diffTarget);
                      return (
                        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                          {diff.firstErrorHint && (
                            <div className="text-amber-300 font-bold bg-amber-950/40 px-2.5 py-1.5 rounded-xl border border-amber-800/40 flex items-center gap-1.5 text-xs">
                              <span>💡 Điểm sai:</span>
                              <span>{diff.firstErrorHint}</span>
                            </div>
                          )}
                          <div className="space-y-1.5 text-xs font-mono">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-slate-400 text-[11px] font-bold select-none">Bạn đã gõ:</span>
                              <div className="inline-flex flex-wrap items-center bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800">
                                {diff.userParts.map((p, idx) => (
                                  <span
                                    key={idx}
                                    className={
                                      p.type === 'wrong'
                                        ? 'bg-rose-600 text-white font-black px-1 rounded shadow-xs line-through decoration-rose-200'
                                        : 'text-emerald-300 font-bold'
                                    }
                                  >
                                    {p.text}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-slate-400 text-[11px] font-bold select-none">Đáp án chuẩn:</span>
                              <div className="inline-flex flex-wrap items-center bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800">
                                {diff.targetParts.map((p, idx) => (
                                  <span
                                    key={idx}
                                    className={
                                      p.type === 'missing'
                                        ? 'bg-amber-400 text-slate-950 font-black px-1 rounded shadow-xs'
                                        : 'text-slate-200 font-bold'
                                    }
                                  >
                                    {p.text}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          {direction === 'jp-to-vi' && viVariants(targetTextForDiff).length > 1 && (
                            <div className="text-[11px] text-slate-400">
                              Nghĩa đầy đủ (gõ 1 cách là được): <span className="text-slate-200 font-bold">{targetTextForDiff}</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
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
            <p className="text-xs text-slate-400">Đúng lần đầu: {firstAttemptAccuracy(score, cards.length)}%. Sửa đáp án không xóa lần sai.</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-around">
            <div>
              <span className="text-2xl font-black text-emerald-400 block">{score}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Đúng lần đầu</span>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div>
              <span className="text-2xl font-black text-rose-400 block">{wrongCardIds.size}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Từng trả lời sai</span>
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
