import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  RotateCw,
  Volume2,
  VolumeX,
  ArrowLeft,
  ArrowRight,
  Shuffle,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
  Volume1,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { JapaneseLesson, JapaneseVocabCard, JapaneseKanjiCard } from '../../types/japanese';
import { speakJapanese } from '../../utils/japaneseKana';
import { sound } from '../../utils/audio';
import { getFlashcardProgress, saveFlashcardProgress, clearFlashcardProgress } from '../../utils/studyProgressStorage';
import { shuffleArray } from '../../utils/shuffle';
import { realtimeSync } from '../../utils/realtimeSync';

interface JapaneseFlashcardModeProps {
  lesson?: JapaneseLesson;
  customCards?: JapaneseVocabCard[];
  kanjiCards?: JapaneseKanjiCard[];
  title?: string;
  storageId?: string;
  onExit: () => void;
  onCardMastered?: (cardId: string, mastered: boolean) => void;
}

export const JapaneseFlashcardMode: React.FC<JapaneseFlashcardModeProps> = ({
  lesson,
  customCards,
  kanjiCards,
  title,
  storageId,
  onExit,
  onCardMastered,
}) => {
  // Determine if this is Kanji flashcard or Vocab flashcard
  const isKanjiMode = !!kanjiCards && kanjiCards.length > 0;
  
  // Initial deck
  const initialCards = isKanjiMode
    ? kanjiCards
    : (customCards || lesson?.cards || []);

  const [deck, setDeck] = useState<any[]>(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [direction, setDirection] = useState<'jp-to-vi' | 'vi-to-jp'>('jp-to-vi');
  const [masteredSet, setMasteredSet] = useState<Set<string>>(
    () => new Set(initialCards.filter((c) => c.mastered).map((c) => c.id))
  );
  const [showResumeBanner, setShowResumeBanner] = useState(false);

  // Options modal & Audio settings
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(() => sound.isEnabled());
  const [autoSpeechEnabled, setAutoSpeechEnabled] = useState(() => {
    return localStorage.getItem('flashcard_auto_speech') === 'true';
  });
  const [isWideFrame, setIsWideFrame] = useState(() => {
    return localStorage.getItem('flashcard_wide_frame') !== 'false';
  });

  const persistenceKey = storageId || (lesson ? `lesson_${lesson.id}` : isKanjiMode ? 'kanji_deck' : 'vocab_deck');

  // 1. Restore previous session progress on mount
  useEffect(() => {
    const saved = getFlashcardProgress(persistenceKey);
    if (saved && typeof saved.currentIndex === 'number' && saved.currentIndex > 0 && saved.currentIndex < initialCards.length) {
      // If saved card order exists, reorder deck
      if (saved.cardIds && saved.cardIds.length === initialCards.length) {
        const idMap = new Map<string, any>(initialCards.map((c) => [c.id, c] as [string, any]));
        const reordered = saved.cardIds.map((id) => idMap.get(id)).filter(Boolean);
        if (reordered.length === initialCards.length) {
          setDeck(reordered);
        }
      }
      setCurrentIndex(saved.currentIndex);
      if (saved.direction) setDirection(saved.direction);
      if (saved.masteredIds) {
        setMasteredSet((prev) => new Set([...prev, ...(saved.masteredIds || [])]));
      }
      setShowResumeBanner(true);
    }
  }, [persistenceKey, initialCards]);

  const isRemoteUpdateRef = useRef(false);
  const isInitialMountRef = useRef(true);

  // Cross-Tab & Cross-Device Real-time Sync (< 2ms)
  useEffect(() => {
    if (!persistenceKey) return;

    const unsubscribe = realtimeSync.subscribeKey('JP_FLASHCARD', persistenceKey, (payload) => {
      if (typeof payload.currentIndex === 'number' && payload.currentIndex >= 0 && payload.currentIndex < deck.length) {
        isRemoteUpdateRef.current = true;
        setCurrentIndex(payload.currentIndex);
        setIsFlipped(false);
        if (payload.data?.masteredIds && Array.isArray(payload.data.masteredIds)) {
          setMasteredSet(new Set(payload.data.masteredIds));
        }
      }
    });

    return () => unsubscribe();
  }, [persistenceKey, deck.length]);

  // 2. Save progress on change
  useEffect(() => {
    if (deck.length === 0) return;

    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }

    saveFlashcardProgress(persistenceKey, {
      currentIndex,
      cardIds: deck.map((c) => c.id),
      direction,
      masteredIds: Array.from(masteredSet),
    });
  }, [currentIndex, deck, direction, masteredSet, persistenceKey]);

  const currentItem = deck[currentIndex];

  const handleFlip = useCallback(() => {
    sound.playFlip();
    setIsFlipped((prev) => !prev);
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < deck.length - 1) {
      setIsFlipped(false);
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, deck.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleToggleMastered = () => {
    if (!currentItem) return;
    const next = new Set(masteredSet);
    const isNowMastered = !next.has(currentItem.id);
    if (isNowMastered) {
      next.add(currentItem.id);
      sound.playCorrect();
    } else {
      next.delete(currentItem.id);
    }
    setMasteredSet(next);
    // Update current item directly in deck so state is in sync
    currentItem.mastered = isNowMastered;
    setDeck((prev) =>
      prev.map((c) => (c.id === currentItem.id ? { ...c, mastered: isNowMastered } : c))
    );
    if (onCardMastered) onCardMastered(currentItem.id, isNowMastered);
  };

  // SHUFFLE ACTION (Trộn thẻ)
  const handleShuffle = () => {
    const shuffled = shuffleArray(deck);
    setDeck(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowResumeBanner(false);
    sound.playClick();
  };

  // RESTORE ACTION (Khôi phục)
  const handleRestore = () => {
    setDeck(initialCards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowResumeBanner(false);
    clearFlashcardProgress(persistenceKey);
    sound.playClick();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showOptionsModal) return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlip, handleNext, handlePrev, showOptionsModal]);

  // Auto-speech on card change or flip
  useEffect(() => {
    if (autoSpeechEnabled && currentItem) {
      if (isKanjiMode) {
        const toSpeak =
          currentItem.kunyomi && currentItem.kunyomi !== '-'
            ? currentItem.kunyomi.split('、')[0]
            : currentItem.kanji;
        speakJapanese(toSpeak);
      } else {
        speakJapanese(currentItem.reading || currentItem.term);
      }
    }
  }, [currentIndex, isFlipped, autoSpeechEnabled, currentItem, isKanjiMode]);

  if (!currentItem || deck.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center text-slate-100">
        <p className="text-sm text-slate-400">Không có thẻ nào trong học phần.</p>
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

  const isMastered = masteredSet.has(currentItem.id);

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 flex flex-col justify-between p-4 sm:p-8 select-none">
      {/* Top Header with Single Tùy chọn Button */}
      <div className="max-w-4xl mx-auto w-full flex flex-wrap items-center justify-between gap-3 py-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          {/* NÚT TÙY CHỌN (Gộp Trộn thẻ, Khôi phục, Âm thanh, Âm thanh nói, Hướng thẻ) */}
          <button
            type="button"
            onClick={() => {
              setShowOptionsModal(true);
              sound.playClick();
            }}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-2 cursor-pointer active:scale-95 transition-all shadow-xs"
            title="Tùy chọn học tập (Trộn thẻ, khôi phục, âm thanh, phát âm...)"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tùy chọn</span>
          </button>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-slate-400">
            Thẻ <span className="text-indigo-400 font-extrabold">{currentIndex + 1}</span> / {deck.length}
          </span>

          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
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
                  <h3 className="text-base font-black">Tùy chọn học phần</h3>
                  <p className="text-[11px] text-slate-400">Cài đặt âm thanh, thứ tự thẻ và hiển thị</p>
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
              {/* Actions: Trộn thẻ & Khôi phục */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  Thứ tự thẻ
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
                    <span>Trộn thẻ</span>
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

              {/* Direction Switch */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  Hướng học thẻ
                </label>
                <button
                  type="button"
                  onClick={() => setDirection((d) => (d === 'jp-to-vi' ? 'vi-to-jp' : 'jp-to-vi'))}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 flex items-center justify-between text-xs font-bold transition-all cursor-pointer"
                >
                  <span>
                    {direction === 'jp-to-vi'
                      ? '🇯🇵 Tiếng Nhật → 🇻🇳 Tiếng Việt'
                      : '🇻🇳 Tiếng Việt → 🇯🇵 Tiếng Nhật'}
                  </span>
                  <span className="text-[11px] text-indigo-400 font-bold">Chạm để đổi</span>
                </button>
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
                      <div className="text-[10px] text-slate-400">Tiếng lật thẻ, thông báo và click</div>
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
                      <div className="text-[10px] text-slate-400">Tự động phát âm tiếng Nhật khi mở/lật thẻ</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !autoSpeechEnabled;
                      setAutoSpeechEnabled(next);
                      localStorage.setItem('flashcard_auto_speech', next ? 'true' : 'false');
                      if (next && currentItem) {
                        speakJapanese(currentItem.reading || currentItem.term);
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

      {/* Resume Banner if returning to session */}
      {showResumeBanner && (
        <div className="max-w-xl mx-auto w-full mt-3 p-2.5 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-between text-xs text-indigo-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Đang tiếp tục từ thẻ #{currentIndex + 1} bạn đang học dở.</span>
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

      {/* Center 3D Flashcard */}
      <div
        className={`mx-auto w-full my-auto py-4 sm:py-6 transition-all duration-300 ${
          isWideFrame ? 'max-w-3xl sm:max-w-4xl lg:max-w-5xl' : 'max-w-xl'
        }`}
      >
        <div
          onClick={handleFlip}
          className={`relative w-full rounded-3xl bg-slate-900 border-2 border-slate-700/80 hover:border-indigo-500/80 flex flex-col justify-between cursor-pointer shadow-2xl transition-all duration-200 active:scale-[0.99] group ${
            isWideFrame
              ? 'min-h-[460px] sm:min-h-[520px] md:min-h-[560px] p-6 sm:p-12'
              : 'min-h-[360px] sm:min-h-[420px] p-6 sm:p-8'
          }`}
        >
          {/* Card Top Sub-info */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-black tracking-wider uppercase text-[10px] sm:text-xs text-indigo-400">
              {direction === 'jp-to-vi'
                ? isFlipped
                  ? isKanjiMode ? 'Mặt sau: Âm Hán Việt & Nghĩa' : 'Mặt sau: Nghĩa Tiếng Việt'
                  : isKanjiMode ? 'Mặt trước: Chữ Hán' : 'Mặt trước: Từ vựng Tiếng Nhật'
                : isFlipped
                ? isKanjiMode ? 'Mặt sau: Chữ Hán' : 'Mặt sau: Tiếng Nhật'
                : 'Mặt trước: Nghĩa Tiếng Việt'}
            </span>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const next = !isWideFrame;
                  setIsWideFrame(next);
                  localStorage.setItem('flashcard_wide_frame', String(next));
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title={isWideFrame ? 'Thu nhỏ khung thẻ' : 'Mở rộng khung thẻ to'}
              >
                {isWideFrame ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isKanjiMode) {
                    const toSpeak = currentItem.kunyomi && currentItem.kunyomi !== '-' ? currentItem.kunyomi.split('、')[0] : currentItem.kanji;
                    speakJapanese(toSpeak);
                  } else {
                    speakJapanese(currentItem.reading || currentItem.term);
                  }
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-200 transition-colors"
                title="Nghe phát âm"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Card Center Content */}
          <div className="my-auto text-center space-y-4 sm:space-y-6 py-4">
            {isKanjiMode ? (
              // KANJI CARD RENDERING
              direction === 'jp-to-vi' ? (
                !isFlipped ? (
                  <div className="space-y-4">
                    <div className="text-8xl sm:text-9xl md:text-[10rem] font-black text-white tracking-wider">
                      {currentItem.kanji}
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                      {currentItem.kunyomi && currentItem.kunyomi !== '-' && (
                        <span className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          Kun: {currentItem.kunyomi}
                        </span>
                      )}
                      {currentItem.onyomi && currentItem.onyomi !== '-' && (
                        <span className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          On: {currentItem.onyomi}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-amber-400 tracking-wider">
                      {currentItem.hanViet}
                    </h2>
                    <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-100 max-w-2xl mx-auto leading-relaxed">
                      {currentItem.meaning}
                    </p>
                    <div className="pt-4 border-t border-slate-800 flex items-center justify-center gap-4 text-sm text-slate-400">
                      <span>Chữ Hán: <b className="text-white text-xl sm:text-2xl font-black">{currentItem.kanji}</b></span>
                      {currentItem.strokeCount && <span>({currentItem.strokeCount} nét)</span>}
                    </div>
                  </div>
                )
              ) : (
                !isFlipped ? (
                  <div className="space-y-4">
                    <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-amber-400">
                      {currentItem.hanViet}
                    </h2>
                    <p className="text-2xl sm:text-3xl font-bold text-slate-200">
                      {currentItem.meaning}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-8xl sm:text-9xl md:text-[10rem] font-black text-white">
                      {currentItem.kanji}
                    </div>
                    <div className="flex justify-center gap-3 text-sm text-indigo-300">
                      {currentItem.kunyomi && <span>Kun: {currentItem.kunyomi}</span>}
                      {currentItem.onyomi && <span>On: {currentItem.onyomi}</span>}
                    </div>
                  </div>
                )
              )
            ) : (
              // VOCABULARY CARD RENDERING
              direction === 'jp-to-vi' ? (
                !isFlipped ? (
                  // Front: Japanese
                  // Rule: reading (e.g. きた) is the main big word on top, term (e.g. 北) is below with romaji transcription
                  (() => {
                    const readingText = currentItem.reading?.trim() || '';
                    const termText = currentItem.term?.trim() || '';
                    const mainWord = readingText && readingText !== termText ? readingText : termText;
                    const subWord = readingText && readingText !== termText ? termText : '';
                    const romajiText = currentItem.romaji ? currentItem.romaji.trim() : '';

                    return (
                      <div className="space-y-4">
                        {/* Từ chính to ở trên (ví dụ: きた) */}
                        <h2 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-white tracking-wide">
                          {mainWord}
                        </h2>

                        {/* Từ phụ to ở dưới và cạnh là có ghi luôn phiên âm (ví dụ: 北 [kita]) */}
                        <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap pt-2">
                          {subWord && (
                            <span className="text-3xl sm:text-4xl md:text-5xl font-black text-amber-400">
                              {subWord}
                            </span>
                          )}
                          {romajiText && (
                            <span className="text-base sm:text-xl font-mono font-bold text-slate-300">
                              [{romajiText}]
                            </span>
                          )}
                          {currentItem.partOfSpeech && (
                            <span className="px-3 py-1 rounded-lg bg-slate-800 text-slate-400 text-xs sm:text-sm font-bold uppercase">
                              {currentItem.partOfSpeech}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  // Back: Vietnamese
                  <div className="space-y-4">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-emerald-400 leading-tight">
                      {currentItem.definition}
                    </h2>
                    {currentItem.example && (
                      <p className="text-base sm:text-lg md:text-xl text-slate-300 italic max-w-2xl mx-auto leading-relaxed">
                        &ldquo;{currentItem.example}&rdquo;
                      </p>
                    )}
                    <div className="pt-4 border-t border-slate-800 flex items-center justify-center gap-3 text-sm text-slate-400">
                      {currentItem.reading && <span className="text-indigo-400 font-bold text-base">{currentItem.reading}</span>}
                      <span className="font-black text-white text-xl sm:text-2xl">{currentItem.term}</span>
                    </div>
                  </div>
                )
              ) : (
                // Reverse direction: Vi to Jp
                !isFlipped ? (
                  <div className="space-y-4">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight">
                      {currentItem.definition}
                    </h2>
                    {currentItem.example && (
                      <p className="text-base sm:text-lg text-slate-400 italic max-w-xl mx-auto">
                        &ldquo;{currentItem.example}&rdquo;
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentItem.reading && (
                      <p className="text-xl sm:text-2xl font-bold text-indigo-300">
                        {currentItem.reading}
                      </p>
                    )}
                    <h2 className="text-5xl sm:text-6xl md:text-7xl font-black text-cyan-400">
                      {currentItem.term}
                    </h2>
                  </div>
                )
              )
            )}
          </div>

          {/* Card Bottom Hint */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="text-[11px]">Bấm vào thẻ hoặc nhấn <kbd className="px-1.5 py-0.5 bg-slate-800 rounded-md text-[10px] font-mono">Space</kbd> để lật</span>
            <RotateCw className="w-4 h-4 text-slate-500 group-hover:rotate-180 transition-transform duration-300" />
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 mt-4 sm:mt-6">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-30 text-xs font-bold text-slate-200 cursor-pointer transition-all shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Thẻ trước</span>
            <span className="sm:hidden">Trước</span>
          </button>

          <button
            type="button"
            onClick={handleToggleMastered}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 rounded-2xl border text-xs font-extrabold transition-all cursor-pointer shadow-md min-w-0 ${
              isMastered
                ? 'bg-emerald-600 border-emerald-500 text-white'
                : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-300'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">{isMastered ? '✓ Đã thuộc' : 'Đánh dấu đã thuộc'}</span>
            <span className="sm:hidden">{isMastered ? 'Đã thuộc' : 'Chưa thuộc'}</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentIndex === deck.length - 1}
            className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-30 text-xs font-bold text-slate-200 cursor-pointer transition-all shrink-0"
          >
            <span className="hidden sm:inline">Thẻ tiếp</span>
            <span className="sm:hidden">Tiếp</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="max-w-4xl mx-auto w-full">
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-indigo-500 to-cyan-400 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / deck.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
