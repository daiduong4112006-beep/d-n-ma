import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  Volume1,
  RotateCcw,
  Award,
  CheckCircle2,
  AlertCircle,
  Shuffle,
  SlidersHorizontal,
  ArrowRight,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import {
  convertRomajiToKana,
  speakJapanese,
  checkVietnameseAnswer,
} from '../../utils/japaneseKana';
import { sound } from '../../utils/audio';
import { shuffleArray } from '../../utils/shuffle';
import {
  checkGrammarSentenceAnswer,
  parseDialogueExample,
  ParsedDialogue,
} from '../../utils/japaneseKanjiConverter';
import { JPD123_GRAMMAR_POINTS, JapaneseGrammarPoint } from '../../data/jpd123Grammar';
import { JapaneseGrammarAiModal } from './JapaneseGrammarAiModal';
import { computeJapaneseDiff, DiffPart } from '../../utils/japaneseDiff';

export interface GrammarPracticeExample {
  japanese: string;
  reading?: string;
  vietnamese: string;
  grammarTitle?: string;
  lessonTag?: string;
}

interface JapaneseGrammarPracticeModeProps {
  title: string;
  grammarPointTitle?: string;
  examples: GrammarPracticeExample[];
  onExit: () => void;
}

export const JapaneseGrammarPracticeMode: React.FC<JapaneseGrammarPracticeModeProps> = ({
  title,
  grammarPointTitle,
  examples,
  onExit,
}) => {
  const [isShuffleEnabled, setIsShuffleEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('grammar_shuffle_enabled');
    return saved !== null ? saved === 'true' : true; // Default ON
  });

  const [items, setItems] = useState<GrammarPracticeExample[]>(() => {
    const saved = localStorage.getItem('grammar_shuffle_enabled');
    const shouldShuffle = saved !== null ? saved === 'true' : true;
    return shouldShuffle ? shuffleArray([...examples]) : [...examples];
  });

  const [direction, setDirection] = useState<'vi-to-jp' | 'jp-to-vi'>(() => {
    const saved = localStorage.getItem('grammar_typing_direction');
    return saved === 'jp-to-vi' ? 'jp-to-vi' : 'vi-to-jp';
  });

  const toggleDirection = (newDir?: 'vi-to-jp' | 'jp-to-vi') => {
    const next = newDir || (direction === 'vi-to-jp' ? 'jp-to-vi' : 'vi-to-jp');
    setDirection(next);
    localStorage.setItem('grammar_typing_direction', next);
    setSingleInput('');
    setInputA('');
    setInputB('');
    setIsAnswerChecked(false);
    setIsCorrect(null);
    setCorrectA(null);
    setCorrectB(null);
    sound.playClick();
  };

  const [currentIndex, setCurrentIndex] = useState(0);

  // Single sentence input state
  const [singleInput, setSingleInput] = useState('');

  // Dialogue inputs state (for A and B)
  const [inputA, setInputA] = useState('');
  const [inputB, setInputB] = useState('');

  const [imeMode, setImeMode] = useState<'hiragana' | 'katakana' | 'off'>('hiragana');
  const [seconds, setSeconds] = useState(0);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctA, setCorrectA] = useState<boolean | null>(null);
  const [correctB, setCorrectB] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [wrongIndices, setWrongIndices] = useState<Set<number>>(new Set());
  const [isCompleted, setIsCompleted] = useState(false);

  // Options & audio settings
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(() => sound.isEnabled());
  const [autoSpeechEnabled, setAutoSpeechEnabled] = useState(() => {
    return localStorage.getItem('grammar_auto_speech') === 'true';
  });

  // AI Assistant modal state
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiContextSentence, setAiContextSentence] = useState('');

  const singleInputRef = useRef<HTMLInputElement>(null);
  const inputARef = useRef<HTMLInputElement>(null);
  const inputBRef = useRef<HTMLInputElement>(null);
  const pendingCursorRef = useRef<{
    field: 'single' | 'a' | 'b';
    pos: number;
  } | null>(null);
  const timerRef = useRef<number | null>(null);

  // Preserve cursor position across React re-renders when editing in the middle of text
  useLayoutEffect(() => {
    if (pendingCursorRef.current) {
      const { field, pos } = pendingCursorRef.current;
      const el =
        field === 'single'
          ? singleInputRef.current
          : field === 'a'
          ? inputARef.current
          : inputBRef.current;
      if (el) {
        el.setSelectionRange(pos, pos);
      }
      pendingCursorRef.current = null;
    }
  });

  const currentItem = items[currentIndex];
  const parsed: ParsedDialogue = currentItem
    ? parseDialogueExample(currentItem.japanese, currentItem.vietnamese)
    : { isDialogue: false };

  const currentGrammarPoint: JapaneseGrammarPoint = React.useMemo(() => {
    const matched = JPD123_GRAMMAR_POINTS.find(
      (gp) => gp.title === grammarPointTitle || gp.title === currentItem?.grammarTitle
    );
    if (matched) return matched;
    return {
      id: 'active-grammar-point',
      title: grammarPointTitle || currentItem?.grammarTitle || 'Cấu trúc ngữ pháp',
      lessonTag: currentItem?.lessonTag || 'Ngữ pháp',
      formation: '',
      meaning: currentItem?.vietnamese || '',
      explanation: '',
      examples: examples.map((e) => ({ japanese: e.japanese, reading: e.reading || '', vietnamese: e.vietnamese })),
    };
  }, [grammarPointTitle, currentItem?.grammarTitle, currentItem?.lessonTag, currentItem?.vietnamese, examples]);

  // Timer counter - stops when completed
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
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isCompleted]);

  // Format MM:SS
  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Reset inputs & auto-focus when question changes
  useEffect(() => {
    setSingleInput('');
    setInputA('');
    setInputB('');
    setIsAnswerChecked(false);
    setIsCorrect(null);
    setCorrectA(null);
    setCorrectB(null);

    const focusTimer = setTimeout(() => {
      if (parsed.isDialogue) {
        inputARef.current?.focus();
      } else {
        singleInputRef.current?.focus();
      }
    }, 40);

    return () => clearTimeout(focusTimer);
  }, [currentIndex, parsed.isDialogue]);

  // Handle IME inputs for single and dialogue
  const handleSingleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // When editing after an answer check, immediately hide error feedback
    if (isAnswerChecked) {
      setIsAnswerChecked(false);
      setIsCorrect(null);
    }

    const raw = e.target.value;
    const cursorPos = e.target.selectionStart ?? raw.length;

    if (direction === 'jp-to-vi' || imeMode === 'off') {
      pendingCursorRef.current = { field: 'single', pos: cursorPos };
      setSingleInput(raw);
    } else {
      const rawPrefix = raw.slice(0, cursorPos);
      const convertedPrefix = convertRomajiToKana(rawPrefix, imeMode);
      const converted = convertRomajiToKana(raw, imeMode);
      pendingCursorRef.current = { field: 'single', pos: convertedPrefix.length };
      setSingleInput(converted);
    }
  };

  const handleInputAChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isAnswerChecked) {
      setIsAnswerChecked(false);
      setIsCorrect(null);
      setCorrectA(null);
      setCorrectB(null);
    }

    const raw = e.target.value;
    const cursorPos = e.target.selectionStart ?? raw.length;

    if (direction === 'jp-to-vi' || imeMode === 'off') {
      pendingCursorRef.current = { field: 'a', pos: cursorPos };
      setInputA(raw);
    } else {
      const rawPrefix = raw.slice(0, cursorPos);
      const convertedPrefix = convertRomajiToKana(rawPrefix, imeMode);
      const converted = convertRomajiToKana(raw, imeMode);
      pendingCursorRef.current = { field: 'a', pos: convertedPrefix.length };
      setInputA(converted);
    }
  };

  const handleInputBChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isAnswerChecked) {
      setIsAnswerChecked(false);
      setIsCorrect(null);
      setCorrectA(null);
      setCorrectB(null);
    }

    const raw = e.target.value;
    const cursorPos = e.target.selectionStart ?? raw.length;

    if (direction === 'jp-to-vi' || imeMode === 'off') {
      pendingCursorRef.current = { field: 'b', pos: cursorPos };
      setInputB(raw);
    } else {
      const rawPrefix = raw.slice(0, cursorPos);
      const convertedPrefix = convertRomajiToKana(rawPrefix, imeMode);
      const converted = convertRomajiToKana(raw, imeMode);
      pendingCursorRef.current = { field: 'b', pos: convertedPrefix.length };
      setInputB(converted);
    }
  };

  // Check answer logic supporting both vi-to-jp and jp-to-vi
  const checkAnswer = () => {
    if (!currentItem) return;

    const targetKana = imeMode === 'katakana' ? 'ン' : 'ん';

    if (parsed.isDialogue) {
      if (!inputA.trim() && !inputB.trim()) return;

      let finA = inputA;
      let finB = inputB;

      // Auto-finalize any pending trailing 'n' to 'ん' or 'ン' ONLY when typing Japanese (vi-to-jp)
      if (direction === 'vi-to-jp' && imeMode !== 'off') {
        const targetKana = imeMode === 'katakana' ? 'ン' : 'ん';
        finA = inputA.replace(/n(?=[^a-z]|$)/gi, targetKana);
        finB = inputB.replace(/n(?=[^a-z]|$)/gi, targetKana);
        if (finA !== inputA) setInputA(finA);
        if (finB !== inputB) setInputB(finB);
      }

      let okA = false;
      let okB = false;

      if (direction === 'vi-to-jp') {
        okA = checkGrammarSentenceAnswer(finA, parsed.partA?.japanese || '');
        okB = checkGrammarSentenceAnswer(finB, parsed.partB?.japanese || '', true);
      } else {
        okA = checkVietnameseAnswer(finA, parsed.partA?.vietnamese || '');
        okB = checkVietnameseAnswer(finB, parsed.partB?.vietnamese || '');
      }

      const overallCorrect = okA && okB;

      setCorrectA(okA);
      setCorrectB(okB);
      setIsAnswerChecked(true);
      setIsCorrect(overallCorrect);

      if (overallCorrect) {
        sound.playCorrect();
        setScore((s) => s + 1);
        if (autoSpeechEnabled) {
          speakJapanese(currentItem.japanese);
        }
        setTimeout(() => {
          handleNext();
        }, 1300);
      } else {
        sound.playWrong();
        setWrongIndices((prev) => new Set(prev).add(currentIndex));
        // Auto focus into the first failed field
        setTimeout(() => {
          if (!okA) {
            inputARef.current?.focus();
          } else if (!okB) {
            inputBRef.current?.focus();
          }
        }, 40);
      }
    } else {
      if (!singleInput.trim()) return;

      let finSingle = singleInput;

      // Auto-finalize any pending trailing 'n' to 'ん' or 'ン' ONLY when typing Japanese (vi-to-jp)
      if (direction === 'vi-to-jp' && imeMode !== 'off') {
        const targetKana = imeMode === 'katakana' ? 'ン' : 'ん';
        finSingle = singleInput.replace(/n(?=[^a-z]|$)/gi, targetKana);
        if (finSingle !== singleInput) setSingleInput(finSingle);
      }

      let ok = false;
      if (direction === 'vi-to-jp') {
        ok = checkGrammarSentenceAnswer(finSingle, currentItem.japanese);
      } else {
        ok = checkVietnameseAnswer(finSingle, currentItem.vietnamese);
      }

      setIsAnswerChecked(true);
      setIsCorrect(ok);

      if (ok) {
        sound.playCorrect();
        setScore((s) => s + 1);
        if (autoSpeechEnabled) {
          speakJapanese(currentItem.japanese);
        }
        setTimeout(() => {
          handleNext();
        }, 1300);
      } else {
        sound.playWrong();
        setWrongIndices((prev) => new Set(prev).add(currentIndex));
        setTimeout(() => {
          singleInputRef.current?.focus();
        }, 40);
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      sound.playFinish();
      setIsCompleted(true);
    }
  };

  const handleRetrySame = () => {
    const failedA = !correctA;
    const failedB = !correctB;
    setIsAnswerChecked(false);
    setIsCorrect(null);
    setCorrectA(null);
    setCorrectB(null);
    // PRESERVE user input: do NOT clear singleInput, inputA, or inputB!
    setTimeout(() => {
      if (parsed.isDialogue) {
        if (failedA && inputARef.current) {
          inputARef.current.focus();
        } else if (failedB && inputBRef.current) {
          inputBRef.current.focus();
        }
      } else {
        singleInputRef.current?.focus();
      }
    }, 40);
  };

  // Keyboard navigation
  const handleKeyDownSingle = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isAnswerChecked && isCorrect) {
        handleNext();
      } else {
        checkAnswer();
      }
    }
  };

  const handleKeyDownA = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isAnswerChecked && isCorrect) {
        handleNext();
        return;
      }
      if (isAnswerChecked && !isCorrect) {
        checkAnswer();
        return;
      }
      // If B is empty, move focus to B; if B is filled, check
      if (inputB.trim()) {
        checkAnswer();
      } else {
        inputBRef.current?.focus();
      }
    }
  };

  const handleKeyDownB = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isAnswerChecked && isCorrect) {
        handleNext();
        return;
      }
      checkAnswer();
    }
  };

  // Toggle shuffle on/off
  const handleToggleShuffle = () => {
    const next = !isShuffleEnabled;
    setIsShuffleEnabled(next);
    localStorage.setItem('grammar_shuffle_enabled', String(next));
    if (next) {
      setItems(shuffleArray([...examples]));
    } else {
      setItems([...examples]);
    }
    setCurrentIndex(0);
    setInputA('');
    setInputB('');
    setSingleInput('');
    setIsAnswerChecked(false);
    setIsCorrect(null);
    setCorrectA(null);
    setCorrectB(null);
    sound.playClick();
  };

  // Re-shuffle all cards
  const handleShuffle = () => {
    const shuffled = shuffleArray([...items]);
    setItems(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setSeconds(0);
    setIsCompleted(false);
    setIsAnswerChecked(false);
    setIsCorrect(null);
    setWrongIndices(new Set());
    sound.playClick();
  };

  // Restart / Restore session
  const handleRestart = (onlyMistakes: boolean = false) => {
    if (onlyMistakes) {
      const mistakes = items.filter((_, idx) => wrongIndices.has(idx));
      if (mistakes.length > 0) {
        setItems(isShuffleEnabled ? shuffleArray(mistakes) : mistakes);
      }
    } else {
      setItems(isShuffleEnabled ? shuffleArray([...examples]) : [...examples]);
      setWrongIndices(new Set());
    }
    setCurrentIndex(0);
    setScore(0);
    setSeconds(0);
    setIsCompleted(false);
    setIsAnswerChecked(false);
    setIsCorrect(null);
    sound.playClick();
  };

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 flex flex-col justify-between p-4 sm:p-8 select-none">
      {/* Top Header */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between py-3 border-b border-slate-800/80">
        {/* Left Side */}
        <div className="flex flex-col">
          <span className="text-[11px] font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>LUYỆN GÕ VÍ DỤ NGỮ PHÁP</span>
          </span>
          <span className="text-xl sm:text-2xl font-black text-white leading-tight">
            {items.length > 0 ? currentIndex + 1 : 0}/{items.length}
          </span>
        </div>

        {/* Center: Timer */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
            THỜI GIAN
          </span>
          <span className="text-xl sm:text-2xl font-black text-white font-mono leading-tight">
            {formatTime(seconds)}
          </span>
        </div>

        {/* Right Side: AI, Options & Exit */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => {
              setAiContextSentence(currentItem ? currentItem.japanese : '');
              setShowAiModal(true);
              sound.playClick();
            }}
            className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-purple-950/80 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-700/70 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-xs"
            title="Trợ lý AI giải thích & hỏi đáp ngữ pháp"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Hỏi đáp AI</span>
            <span className="sm:hidden">AI</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowOptionsModal(true);
              sound.playClick();
            }}
            className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-xs"
            title="Tùy chọn luyện tập"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tùy chọn</span>
          </button>

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

      {/* 2-Way Language Direction Switcher Bar (Outside for instant access) */}
      <div className="max-w-4xl mx-auto w-full flex flex-wrap items-center justify-between gap-2 py-2 sm:py-2.5">
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
            <span>Đề: Tiếng Việt ➔ Gõ: Tiếng Nhật</span>
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
            <span>Đề: Tiếng Nhật ➔ Gõ: Tiếng Việt</span>
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
                  <h3 className="text-base font-black">Tùy chọn luyện tập</h3>
                  <p className="text-[11px] text-slate-400">Hướng dịch, trộn câu, bộ gõ và âm thanh</p>
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
              {/* Direction Switcher in Modal */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  Hướng luyện tập
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-800/80 p-1 rounded-2xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => toggleDirection('vi-to-jp')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                      direction === 'vi-to-jp'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🇻🇳 Đề Việt ➔ Gõ Nhật
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleDirection('jp-to-vi')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                      direction === 'jp-to-vi'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🇯🇵 Đề Nhật ➔ Gõ Việt
                  </button>
                </div>
              </div>

              {/* Shuffle Toggle & Restart */}
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
                      handleRestart(false);
                      setShowOptionsModal(false);
                    }}
                    className={`px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-amber-600 text-slate-200 hover:text-white border border-slate-700 flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                      !isShuffleEnabled ? 'col-span-2' : ''
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Làm lại từ đầu</span>
                  </button>
                </div>
              </div>

              {/* IME Mode Switcher (visible for vi-to-jp) */}
              {direction === 'vi-to-jp' && (
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
              )}

              {/* Audio Settings */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  Cài đặt âm thanh
                </label>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/60 border border-slate-800">
                  <div className="flex items-center gap-2.5">
                    {soundEffectsEnabled ? (
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-slate-500" />
                    )}
                    <div>
                      <div className="text-xs font-bold">Âm thanh hiệu ứng</div>
                      <div className="text-[10px] text-slate-400">Tiếng đúng, sai và hoàn thành</div>
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

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/60 border border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <Volume1 className={`w-4 h-4 ${autoSpeechEnabled ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <div>
                      <div className="text-xs font-bold">Tự động phát âm</div>
                      <div className="text-[10px] text-slate-400">Đọc tiếng Nhật khi gõ đúng câu</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !autoSpeechEnabled;
                      setAutoSpeechEnabled(next);
                      localStorage.setItem('grammar_auto_speech', next ? 'true' : 'false');
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

      {/* Main Practice Area */}
      {items.length === 0 ? (
        <div className="max-w-md mx-auto w-full my-auto text-center space-y-4 p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl">
          <BookOpen className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-lg font-black text-white">Chưa có ví dụ nào</h3>
          <p className="text-xs text-slate-400">Cấu trúc này hiện chưa có câu ví dụ để luyện tập.</p>
          <button
            type="button"
            onClick={onExit}
            className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
          >
            Quay lại Ngữ pháp
          </button>
        </div>
      ) : !isCompleted ? (
        <div className="max-w-2xl mx-auto w-full my-auto py-4 space-y-6">
          {/* Grammar structure title badge */}
          {(currentItem.grammarTitle || grammarPointTitle || title) && (
            <div className="text-center">
              <span className="px-3.5 py-1 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 font-black text-xs inline-flex items-center gap-1.5 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>{currentItem.grammarTitle || grammarPointTitle || title}</span>
              </span>
            </div>
          )}

          {/* Prompt Card */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4 text-center">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <span className="text-[11px] font-black uppercase text-cyan-400 tracking-wider">
                {direction === 'vi-to-jp' ? 'ĐỀ BÀI: DỊCH SANG TIẾNG NHẬT' : 'ĐỀ BÀI: DỊCH SANG TIẾNG VIỆT'}
              </span>
              <div className="flex items-center gap-1">
                {direction === 'vi-to-jp' ? (
                  /* Pill Switcher for IME [ あ  ア  Tắt ] */
                  <div className="flex items-center bg-slate-950 border border-slate-700/80 rounded-xl p-0.5 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setImeMode('hiragana')}
                      className={`px-2.5 py-0.5 rounded-lg transition-colors cursor-pointer ${
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
                      className={`px-2.5 py-0.5 rounded-lg transition-colors cursor-pointer ${
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
                      className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer text-[10px] ${
                        imeMode === 'off' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white'
                      }`}
                    >
                      Tắt
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => speakJapanese(currentItem.japanese)}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs"
                    title="Phát âm câu tiếng Nhật"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Nghe</span>
                  </button>
                )}
              </div>
            </div>

            {/* Prompt Content */}
            {parsed.isDialogue ? (
              <div className="space-y-3 text-left">
                {direction === 'vi-to-jp' ? (
                  <>
                    {parsed.partA?.vietnamese && (
                      <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                          A
                        </span>
                        <p className="text-base sm:text-lg font-bold text-slate-100 leading-snug">
                          {parsed.partA.vietnamese}
                        </p>
                      </div>
                    )}
                    {parsed.partB?.vietnamese && (
                      <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                          B
                        </span>
                        <p className="text-base sm:text-lg font-bold text-slate-100 leading-snug">
                          {parsed.partB.vietnamese}
                        </p>
                      </div>
                    )}
                    {!parsed.partB?.vietnamese && (
                      <h2 className="text-xl sm:text-2xl font-black text-white text-center leading-relaxed">
                        {currentItem.vietnamese}
                      </h2>
                    )}
                  </>
                ) : (
                  <>
                    {parsed.partA?.japanese && (
                      <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                          A
                        </span>
                        <div className="flex-1">
                          <p className="text-base sm:text-lg font-bold text-slate-100 leading-snug">
                            {parsed.partA.japanese}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => speakJapanese(parsed.partA?.japanese || '')}
                          className="p-1 rounded-lg text-slate-400 hover:text-cyan-400"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {parsed.partB?.japanese && (
                      <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                          B
                        </span>
                        <div className="flex-1">
                          <p className="text-base sm:text-lg font-bold text-slate-100 leading-snug">
                            {parsed.partB.japanese}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => speakJapanese(parsed.partB?.japanese || '')}
                          className="p-1 rounded-lg text-slate-400 hover:text-cyan-400"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="py-2">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-relaxed">
                  {direction === 'vi-to-jp' ? currentItem.vietnamese : currentItem.japanese}
                </h2>
              </div>
            )}
          </div>

          {/* Input Section */}
          <div className="space-y-4">
            {parsed.isDialogue ? (
              /* Dialogue Mode: 2 separate input rows for A and B */
              <div className="space-y-3.5">
                {/* Row A */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center shadow-xs">
                        A
                      </span>
                      <span className="text-xs font-black uppercase text-indigo-400 tracking-wider">
                        {direction === 'vi-to-jp' ? 'CÂU HỎI (A) - TIẾNG NHẬT' : 'CÂU HỎI (A) - NGHĨA VIỆT'}
                      </span>
                    </div>
                    {parsed.partA?.japanese && (
                      <button
                        type="button"
                        onClick={() => speakJapanese(parsed.partA?.japanese || '')}
                        className="text-slate-400 hover:text-cyan-400 p-1 rounded-lg transition-colors cursor-pointer"
                        title="Nghe phát âm câu A"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div
                    className={`rounded-2xl transition-all shadow-lg p-1.5 sm:p-2 bg-white ${
                      isAnswerChecked
                        ? correctA
                          ? 'border-2 border-emerald-500 ring-4 ring-emerald-500/30'
                          : 'border-2 border-rose-500 ring-4 ring-rose-500/30'
                        : 'border-2 border-indigo-400 ring-4 ring-indigo-400/20'
                    }`}
                  >
                    <input
                      ref={inputARef}
                      type="text"
                      value={inputA}
                      onChange={handleInputAChange}
                      onKeyDown={handleKeyDownA}
                      readOnly={isAnswerChecked && isCorrect === true}
                      placeholder={
                        direction === 'vi-to-jp'
                          ? 'Nhập câu hỏi A (gõ Hiragana hoặc Romaji)...'
                          : 'Nhập nghĩa tiếng Việt của câu A...'
                      }
                      className="w-full text-base sm:text-xl font-bold py-2 sm:py-2.5 px-3 bg-transparent outline-none text-slate-900 placeholder:text-slate-300"
                    />
                  </div>
                </div>

                {/* Row B */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center shadow-xs">
                        B
                      </span>
                      <span className="text-xs font-black uppercase text-emerald-400 tracking-wider">
                        {direction === 'vi-to-jp' ? 'CÂU TRẢ LỜI (B) - TIẾNG NHẬT' : 'CÂU TRẢ LỜI (B) - NGHĨA VIỆT'}
                      </span>
                    </div>
                    {parsed.partB?.japanese && (
                      <button
                        type="button"
                        onClick={() => speakJapanese(parsed.partB?.japanese || '')}
                        className="text-slate-400 hover:text-cyan-400 p-1 rounded-lg transition-colors cursor-pointer"
                        title="Nghe phát âm câu B"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div
                    className={`rounded-2xl transition-all shadow-lg p-1.5 sm:p-2 bg-white ${
                      isAnswerChecked
                        ? correctB
                          ? 'border-2 border-emerald-500 ring-4 ring-emerald-500/30'
                          : 'border-2 border-rose-500 ring-4 ring-rose-500/30'
                        : 'border-2 border-emerald-400 ring-4 ring-emerald-400/20'
                    }`}
                  >
                    <input
                      ref={inputBRef}
                      type="text"
                      value={inputB}
                      onChange={handleInputBChange}
                      onKeyDown={handleKeyDownB}
                      readOnly={isAnswerChecked && isCorrect === true}
                      placeholder={
                        direction === 'vi-to-jp'
                          ? 'Nhập câu trả lời B (gõ Hiragana hoặc Romaji)...'
                          : 'Nhập nghĩa tiếng Việt của câu B...'
                      }
                      className="w-full text-base sm:text-xl font-bold py-2 sm:py-2.5 px-3 bg-transparent outline-none text-slate-900 placeholder:text-slate-300"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Single Sentence Input */
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
                    {direction === 'vi-to-jp' ? 'GÕ TIẾNG NHẬT (KANA)' : 'GÕ NGHĨA TIẾNG VIỆT'}
                  </span>
                  <button
                    type="button"
                    onClick={() => speakJapanese(currentItem.japanese)}
                    className="text-slate-400 hover:text-cyan-400 p-1 rounded-lg transition-colors cursor-pointer"
                    title="Nghe phát âm"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
                <div
                  className={`rounded-3xl transition-all shadow-2xl p-2 sm:p-3 bg-white ${
                    isAnswerChecked
                      ? isCorrect
                        ? 'border-2 border-emerald-500 ring-4 ring-emerald-500/30'
                        : 'border-2 border-rose-500 ring-4 ring-rose-500/30'
                      : 'border-2 border-cyan-400 ring-4 ring-cyan-400/20'
                  }`}
                >
                  <input
                    ref={singleInputRef}
                    type="text"
                    value={singleInput}
                    onChange={handleSingleInputChange}
                    onKeyDown={handleKeyDownSingle}
                    readOnly={isAnswerChecked && isCorrect === true}
                    placeholder={
                      direction === 'vi-to-jp'
                        ? 'Gõ tiếng Nhật (gõ Hiragana hoặc Romaji)...'
                        : 'Nhập nghĩa tiếng Việt của câu...'
                    }
                    className="w-full text-center text-xl sm:text-2xl font-black py-3 sm:py-4 px-4 bg-transparent outline-none text-slate-900 placeholder:text-slate-300"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* Answer Checked Feedback Box */}
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
                    <div className="text-left space-y-1">
                      <span className="font-black text-base block">
                        {isCorrect ? 'Chính xác! 🎉' : 'Chưa chính xác! Hãy xem đáp án đúng:'}
                      </span>
                      {isCorrect && (
                        <div className="text-xs text-slate-200">
                          <span className="font-bold text-slate-400 mr-2">Đáp án:</span>
                          <b className="text-white text-base">
                            {direction === 'vi-to-jp' ? currentItem.japanese : currentItem.vietnamese}
                          </b>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => speakJapanese(currentItem.japanese)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Phát âm câu này"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAiContextSentence(currentItem.japanese);
                        setShowAiModal(true);
                        sound.playClick();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-purple-900/60 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-600/50 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                      title="Hỏi trợ lý AI giải thích câu này"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                      <span>Hỏi AI</span>
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
                          onClick={handleNext}
                          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer flex items-center gap-1"
                          title="Bỏ qua câu này và chuyển sang câu tiếp theo"
                        >
                          <span>Bỏ qua (Tiếp)</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleNext}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white flex items-center gap-1 cursor-pointer shadow-md"
                      >
                        <span>Tiếp (Enter)</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Detailed Error Diff Highlighting when wrong */}
                {!isCorrect && (
                  <div className="pt-2 border-t border-rose-900/50 text-left">
                    {parsed.isDialogue ? (
                      <div className="space-y-2.5">
                        {!correctA && (
                          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                            <div className="text-[11px] font-black uppercase text-indigo-400 tracking-wider">
                              Câu A:
                            </div>
                            {direction === 'vi-to-jp' ? (
                              (() => {
                                const diffA = computeJapaneseDiff(inputA, parsed.partA?.japanese || '');
                                return (
                                  <div className="space-y-1.5 text-xs font-mono">
                                    {diffA.firstErrorHint && (
                                      <div className="text-amber-300 font-bold bg-amber-950/40 px-2 py-1 rounded-lg border border-amber-800/40">
                                        💡 {diffA.firstErrorHint}
                                      </div>
                                    )}
                                    <div className="flex flex-wrap items-center gap-1">
                                      <span className="text-slate-400 text-[11px] font-bold select-none">Bạn gõ:</span>
                                      <div className="inline-flex flex-wrap items-center bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                                        {diffA.userParts.map((p, idx) => (
                                          <span
                                            key={idx}
                                            className={
                                              p.type === 'wrong'
                                                ? 'bg-rose-600 text-white font-black px-1 rounded shadow-xs line-through decoration-rose-200'
                                                : 'text-emerald-300'
                                            }
                                          >
                                            {p.text}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1">
                                      <span className="text-slate-400 text-[11px] font-bold select-none">Đáp án:</span>
                                      <div className="inline-flex flex-wrap items-center bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                                        {diffA.targetParts.map((p, idx) => (
                                          <span
                                            key={idx}
                                            className={
                                              p.type === 'missing'
                                                ? 'bg-amber-400 text-slate-950 font-black px-1 rounded shadow-xs'
                                                : 'text-slate-200'
                                            }
                                          >
                                            {p.text}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()
                            ) : (
                              <div className="space-y-1.5 text-xs">
                                <div className="text-slate-300">
                                  <span className="text-slate-400 font-bold mr-2">Bạn gõ:</span>
                                  <span className="text-rose-400 font-bold">{inputA || '(trống)'}</span>
                                </div>
                                <div className="text-slate-200">
                                  <span className="text-slate-400 font-bold mr-2">Nghĩa tiếng Việt chuẩn:</span>
                                  <span className="text-emerald-300 font-bold">{parsed.partA?.vietnamese}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {!correctB && (
                          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                            <div className="text-[11px] font-black uppercase text-emerald-400 tracking-wider">
                              Câu B:
                            </div>
                            {direction === 'vi-to-jp' ? (
                              (() => {
                                const diffB = computeJapaneseDiff(inputB, parsed.partB?.japanese || '');
                                return (
                                  <div className="space-y-1.5 text-xs font-mono">
                                    {diffB.firstErrorHint && (
                                      <div className="text-amber-300 font-bold bg-amber-950/40 px-2 py-1 rounded-lg border border-amber-800/40">
                                        💡 {diffB.firstErrorHint}
                                      </div>
                                    )}
                                    <div className="flex flex-wrap items-center gap-1">
                                      <span className="text-slate-400 text-[11px] font-bold select-none">Bạn gõ:</span>
                                      <div className="inline-flex flex-wrap items-center bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                                        {diffB.userParts.map((p, idx) => (
                                          <span
                                            key={idx}
                                            className={
                                              p.type === 'wrong'
                                                ? 'bg-rose-600 text-white font-black px-1 rounded shadow-xs line-through decoration-rose-200'
                                                : 'text-emerald-300'
                                            }
                                          >
                                            {p.text}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1">
                                      <span className="text-slate-400 text-[11px] font-bold select-none">Đáp án:</span>
                                      <div className="inline-flex flex-wrap items-center bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                                        {diffB.targetParts.map((p, idx) => (
                                          <span
                                            key={idx}
                                            className={
                                              p.type === 'missing'
                                                ? 'bg-amber-400 text-slate-950 font-black px-1 rounded shadow-xs'
                                                : 'text-slate-200'
                                            }
                                          >
                                            {p.text}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()
                            ) : (
                              <div className="space-y-1.5 text-xs">
                                <div className="text-slate-300">
                                  <span className="text-slate-400 font-bold mr-2">Bạn gõ:</span>
                                  <span className="text-rose-400 font-bold">{inputB || '(trống)'}</span>
                                </div>
                                <div className="text-slate-200">
                                  <span className="text-slate-400 font-bold mr-2">Nghĩa tiếng Việt chuẩn:</span>
                                  <span className="text-emerald-300 font-bold">{parsed.partB?.vietnamese}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Single sentence error diff */
                      <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                        {direction === 'vi-to-jp' ? (
                          (() => {
                            const diff = computeJapaneseDiff(singleInput, currentItem.japanese);
                            return (
                              <div className="space-y-1.5 text-xs font-mono">
                                {diff.firstErrorHint && (
                                  <div className="text-amber-300 font-bold bg-amber-950/40 px-2.5 py-1.5 rounded-xl border border-amber-800/40 flex items-center gap-1.5">
                                    <span>💡 Điểm sai:</span>
                                    <span>{diff.firstErrorHint}</span>
                                  </div>
                                )}
                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
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
                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
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
                            );
                          })()
                        ) : (
                          <div className="space-y-2 text-xs">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-slate-400 font-bold select-none">Bạn đã gõ:</span>
                              <span className="bg-rose-950/80 text-rose-300 font-bold px-2.5 py-1 rounded-xl border border-rose-800/50">
                                {singleInput || '(chưa nhập)'}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-slate-400 font-bold select-none">Nghĩa tiếng Việt chuẩn:</span>
                              <span className="bg-emerald-950/80 text-emerald-300 font-bold px-2.5 py-1 rounded-xl border border-emerald-800/50">
                                {currentItem.vietnamese}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Check Button */}
            {!isAnswerChecked && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={checkAnswer}
                  disabled={
                    parsed.isDialogue
                      ? !inputA.trim() && !inputB.trim()
                      : !singleInput.trim()
                  }
                  className="w-full py-3.5 rounded-full bg-[#1e293b] hover:bg-indigo-600 disabled:opacity-30 text-slate-200 hover:text-white text-xs font-black uppercase tracking-wider text-center cursor-pointer shadow-md transition-all active:scale-[0.99] border border-slate-700/60"
                >
                  ĐÃ GÕ XONG • KIỂM TRA (ENTER)
                </button>
                <p className="text-[11px] text-slate-500 text-center mt-2">
                  {direction === 'vi-to-jp'
                    ? 'Mẹo: Gõ bằng Hiragana hoặc Katakana (Romaji sẽ tự động chuyển đổi).'
                    : 'Mẹo: Gõ nghĩa tiếng Việt có hoặc không có dấu đều được chấp nhận.'}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Completion Screen */
        <div className="max-w-md mx-auto w-full my-auto text-center space-y-5 p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-500/30">
            <Award className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xl font-black text-white">Hoàn thành luyện tập! 🎉</h3>
            <p className="text-xs text-slate-400">
              Bạn đã hoàn thành tất cả {items.length} ví dụ ngữ pháp.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/50">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Độ chính xác</span>
              <div className="text-2xl font-black text-emerald-400">
                {items.length > 0 ? Math.round((score / items.length) * 100) : 0}%
              </div>
              <span className="text-[10px] text-slate-400">
                {score}/{items.length} câu đúng
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Thời gian</span>
              <div className="text-2xl font-black text-indigo-400 font-mono">
                {formatTime(seconds)}
              </div>
              <span className="text-[10px] text-slate-400">Tổng thời gian</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            {wrongIndices.size > 0 && (
              <button
                type="button"
                onClick={() => handleRestart(true)}
                className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black cursor-pointer shadow-md shadow-amber-600/30 transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Luyện lại {wrongIndices.size} câu chưa đúng</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleRestart(false)}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black cursor-pointer shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Luyện lại (Trộn câu mới)</span>
            </button>

            <button
              type="button"
              onClick={onExit}
              className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition-all"
            >
              Quay lại danh sách ngữ pháp
            </button>
          </div>
        </div>
      )}

      {/* Bottom info footer */}
      <div className="max-w-4xl mx-auto w-full pt-3 border-t border-slate-800/80 text-center text-xs text-slate-500">
        <span>Gõ phím tiếng Nhật • Hỗ trợ cả Chữ Hán và Hiragana • Hội thoại 2 dòng A & B</span>
      </div>

      {/* Embedded Japanese Grammar AI Modal */}
      <JapaneseGrammarAiModal
        grammarPoint={currentGrammarPoint}
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        initialContextSentence={aiContextSentence}
      />
    </div>
  );
};
