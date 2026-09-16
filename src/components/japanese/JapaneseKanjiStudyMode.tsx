import React, { useState, useEffect, useRef } from 'react';
import { X, Volume2, CheckCircle2, AlertCircle, Award, RotateCcw, Shuffle, Sparkles, BookOpen } from 'lucide-react';
import { JapaneseKanjiCard } from '../../types/japanese';
import { speakJapanese } from '../../utils/japaneseKana';
import { sound } from '../../utils/audio';
import { shuffleArray } from '../../utils/shuffle';
import { realtimeSync } from '../../utils/realtimeSync';

interface JapaneseKanjiStudyModeProps {
  kanjiCards: JapaneseKanjiCard[];
  title?: string;
  onExit: () => void;
  onKanjiMastered?: (kanjiId: string, mastered: boolean) => void;
}

export const JapaneseKanjiStudyMode: React.FC<JapaneseKanjiStudyModeProps> = ({
  kanjiCards,
  title = 'Luyện tập Chữ Hán',
  onExit,
  onKanjiMastered,
}) => {
  const [deck, setDeck] = useState<JapaneseKanjiCard[]>(kanjiCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [resumeNotice, setResumeNotice] = useState(false);

  // Storage key based on cards
  const storageKey = `jp_study_kanji_study_${kanjiCards[0]?.lessonTag || 'all'}`;

  // Restore progress on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.currentIndex === 'number' && parsed.currentIndex > 0 && parsed.currentIndex < kanjiCards.length) {
          setCurrentIndex(parsed.currentIndex);
          setScore(parsed.score || 0);
          setStreak(parsed.streak || 0);
          setResumeNotice(true);
        }
      }
    } catch (e) {
      // ignore
    }
  }, [storageKey, kanjiCards.length]);

  const isRemoteUpdateRef = useRef(false);
  const isInitialMountRef = useRef(true);

  // Cross-Tab Real-time Sync (< 2ms)
  useEffect(() => {
    if (!storageKey) return;

    const unsubscribe = realtimeSync.subscribeKey('JP_KANJI', storageKey, (payload) => {
      if (typeof payload.currentIndex === 'number' && payload.currentIndex >= 0 && payload.currentIndex < deck.length) {
        isRemoteUpdateRef.current = true;
        setCurrentIndex(payload.currentIndex);
        if (typeof payload.data?.score === 'number') setScore(payload.data.score);
        if (typeof payload.data?.streak === 'number') setStreak(payload.data.streak);
      }
    });

    return () => unsubscribe();
  }, [storageKey, deck.length]);

  // Save progress on change
  useEffect(() => {
    if (deck.length === 0 || isCompleted) return;

    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }

    try {
      const data = {
        currentIndex,
        score,
        streak,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(storageKey, JSON.stringify(data));
      realtimeSync.broadcast('JP_KANJI', storageKey, currentIndex, data);
    } catch (e) {
      // ignore
    }
  }, [currentIndex, score, streak, isCompleted, deck.length, storageKey]);

  const currentCard = deck[currentIndex];

  // Options: 1 correct Hán Việt + Meaning, 3 distractors
  const [options, setOptions] = useState<Array<{ text: string; sub: string; isCorrect: boolean }>>([]);

  useEffect(() => {
    if (!currentCard) return;
    const correctChoice = {
      text: currentCard.hanViet,
      sub: currentCard.meaning,
      isCorrect: true,
    };

    const others = deck.filter((k) => k.id !== currentCard.id);
    const shuffledOthers = shuffleArray(others).slice(0, 3);
    const distractors = shuffledOthers.map((k) => ({
      text: k.hanViet,
      sub: k.meaning,
      isCorrect: false,
    }));

    // Fallbacks if fewer than 4 kanji
    const fallback = [
      { text: 'NHẬT', sub: 'Mặt trời, ngày', isCorrect: false },
      { text: 'NGUYỆT', sub: 'Mặt trăng, tháng', isCorrect: false },
      { text: 'HOẢ', sub: 'Lửa', isCorrect: false },
      { text: 'THUỶ', sub: 'Nước', isCorrect: false },
    ];
    while (distractors.length < 3) {
      const fb = fallback.find((f) => f.text !== correctChoice.text && !distractors.some((d) => d.text === f.text));
      if (fb) distractors.push(fb);
      else distractors.push({ text: `HÁN VIỆT ${distractors.length + 1}`, sub: 'Ý nghĩa', isCorrect: false });
    }

    const all = shuffleArray([correctChoice, ...distractors]);
    setOptions(all);
    setSelectedOption(null);
  }, [currentCard, deck]);

  const handleSelect = (idx: number) => {
    if (selectedOption !== null || !currentCard) return;
    setSelectedOption(idx);
    const opt = options[idx];
    if (opt.isCorrect) {
      sound.playCorrect();
      setScore((s) => s + 1);
      setStreak((st) => st + 1);
      if (onKanjiMastered) onKanjiMastered(currentCard.id, true);
    } else {
      sound.playWrong();
      setStreak(0);
      // Do not demote kanji on wrong choice
    }
  };

  const handleNext = () => {
    if (currentIndex < deck.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
    } else {
      sound.playFinish();
      setIsCompleted(true);
      try {
        localStorage.removeItem(storageKey);
      } catch (e) {
        // ignore
      }
    }
  };

  const handleShuffle = () => {
    const shuffled = shuffleArray(deck);
    setDeck(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setSelectedOption(null);
    setIsCompleted(false);
    sound.playClick();
  };

  const handleRestore = () => {
    setDeck(kanjiCards);
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setSelectedOption(null);
    setIsCompleted(false);
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      // ignore
    }
    sound.playClick();
  };

  const handleSpeak = () => {
    if (!currentCard) return;
    const toSpeak = currentCard.kunyomi && currentCard.kunyomi !== '-' ? currentCard.kunyomi.split('、')[0] : currentCard.kanji;
    speakJapanese(toSpeak);
  };

  if (!currentCard || deck.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center text-slate-100">
        <p className="text-sm text-slate-400">Không có chữ Hán nào trong học phần này.</p>
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
      {/* Top Header */}
      <div className="max-w-4xl mx-auto w-full flex flex-wrap items-center justify-between gap-3 py-2 border-b border-slate-800">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-black">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{title}</span>
          </div>

          <button
            type="button"
            onClick={handleShuffle}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            title="Trộn ngẫu nhiên chữ Hán"
          >
            <Shuffle className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Trộn câu</span>
          </button>

          <button
            type="button"
            onClick={handleRestore}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            title="Khôi phục thứ tự và bắt đầu lại từ đầu"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Khôi phục</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-bold text-slate-400">
            Chữ Hán <span className="text-indigo-400 font-extrabold">{currentIndex + 1}</span> / {deck.length}
          </div>

          {streak > 1 && (
            <div className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-extrabold flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>{streak} chuỗi</span>
            </div>
          )}

          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Thoát</span>
          </button>
        </div>
      </div>

      {/* Resume Banner */}
      {resumeNotice && (
        <div className="max-w-xl mx-auto w-full mt-3 p-2.5 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-between text-xs text-indigo-200">
          <span>Đang tiếp tục từ chữ Hán #{currentIndex + 1} bạn đang học dở.</span>
          <button
            type="button"
            onClick={() => setResumeNotice(false)}
            className="text-indigo-400 hover:text-white font-bold ml-3 cursor-pointer"
          >
            Đã hiểu
          </button>
        </div>
      )}

      {/* Main Study Arena */}
      {!isCompleted ? (
        <div className="max-w-xl mx-auto w-full my-auto py-6 space-y-6">
          {/* Kanji Presentation Card */}
          <div className="p-8 sm:p-10 rounded-3xl bg-slate-900 border-2 border-slate-800 text-center relative shadow-2xl space-y-4">
            <button
              type="button"
              onClick={handleSpeak}
              className="absolute top-4 right-4 p-2.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Nghe phát âm"
            >
              <Volume2 className="w-5 h-5" />
            </button>

            {/* Huge Kanji Character */}
            <div className="text-7xl sm:text-8xl md:text-9xl font-black text-white tracking-widest leading-none drop-shadow-md">
              {currentCard.kanji}
            </div>

            {/* Kunyomi & Onyomi Clues */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {currentCard.kunyomi && currentCard.kunyomi !== '-' && (
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Kun: {currentCard.kunyomi}
                </span>
              )}
              {currentCard.onyomi && currentCard.onyomi !== '-' && (
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  On: {currentCard.onyomi}
                </span>
              )}
              {currentCard.strokeCount && (
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
                  {currentCard.strokeCount} nét
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 font-medium">
              Chọn âm Hán Việt và ý nghĩa chính xác của chữ Hán trên:
            </p>
          </div>

          {/* Multiple Choice Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {options.map((opt, idx) => {
              const isChosen = selectedOption === idx;
              let btnStyle = 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-700 text-slate-200';

              if (selectedOption !== null) {
                if (opt.isCorrect) {
                  btnStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/50';
                } else if (isChosen) {
                  btnStyle = 'bg-rose-950/80 border-rose-500 text-rose-200 ring-2 ring-rose-500/50';
                } else {
                  btnStyle = 'bg-slate-900/40 border-slate-800/40 text-slate-600 opacity-40';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelect(idx)}
                  disabled={selectedOption !== null}
                  className={`p-4 rounded-2xl border-2 text-left transition-all duration-150 cursor-pointer flex flex-col justify-center min-h-[82px] active:scale-[0.98] ${btnStyle}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black tracking-wide uppercase">
                      {opt.text}
                    </span>
                    {selectedOption !== null && opt.isCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    )}
                    {selectedOption !== null && isChosen && !opt.isCorrect && (
                      <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    )}
                  </div>
                  <span className="text-xs font-medium text-slate-400 line-clamp-1 mt-0.5">
                    {opt.sub}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Bottom Action after selecting */}
          {selectedOption !== null && (
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleNext}
                className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30 active:scale-95 transition-all"
              >
                <span>{currentIndex < deck.length - 1 ? 'Chữ tiếp theo' : 'Xem kết quả'}</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Results View */
        <div className="max-w-md mx-auto w-full my-auto text-center space-y-6 p-8 rounded-3xl bg-slate-900 border border-slate-800">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl">
            <Award className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white">Hoàn thành bài luyện Kanji!</h2>
            <p className="text-xs text-slate-400">Bạn đã ôn tập toàn bộ {deck.length} chữ Hán cốt lõi.</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-around">
            <div>
              <span className="text-2xl font-black text-emerald-400 block">{score}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Đúng</span>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div>
              <span className="text-2xl font-black text-indigo-400 block">
                {Math.round((score / deck.length) * 100)}%
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Độ chính xác</span>
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
              className="flex-1 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs cursor-pointer transition-all shadow-md shadow-indigo-600/30"
            >
              Quay lại bài học
            </button>
          </div>
        </div>
      )}

      {/* Progress Line */}
      <div className="max-w-4xl mx-auto w-full">
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-orange-500 to-indigo-500 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / deck.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
