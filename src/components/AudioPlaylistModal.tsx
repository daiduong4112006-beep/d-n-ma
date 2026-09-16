import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, X, Headphones, RefreshCw, Clock } from 'lucide-react';
import { Quiz, Question } from '../types/quiz';

interface AudioPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: Quiz | null;
}

export const AudioPlaylistModal: React.FC<AudioPlaylistModalProps> = ({
  isOpen,
  onClose,
  quiz,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPhase, setPlaybackPhase] = useState<'question' | 'waiting' | 'answer' | 'idle'>('idle');
  const [countdown, setCountdown] = useState(3);
  const [speed, setSpeed] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'all' | 'one' | 'off'>('all');

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const questions = quiz?.questions || [];
  const currentQ = questions[currentIndex];

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // Cleanup speech on modal close
  useEffect(() => {
    if (!isOpen) {
      stopPlayback();
      setCurrentIndex(0);
    }
  }, [isOpen]);

  const stopPlayback = () => {
    setIsPlaying(false);
    setPlaybackPhase('idle');
    if (timerRef.current) clearInterval(timerRef.current);
    if (synthRef.current) {
      synthRef.current.cancel();
    }
  };

  const speakText = (text: string, onEnd?: () => void) => {
    if (!synthRef.current || isMuted) {
      // If muted or unsupported, advance with a timeout
      setTimeout(() => {
        if (onEnd) onEnd();
      }, 2000);
      return;
    }

    synthRef.current.cancel();

    // Remove markdown/code blocks for clean speech
    const cleanText = text.replace(/```[\s\S]*?```/g, ' [đoạn mã] ').replace(/[`*_#]/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = speed;

    // Detect language or find suitable voice
    const voices = synthRef.current.getVoices();
    const isVietnameseText = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(cleanText);
    const targetLang = isVietnameseText ? 'vi-VN' : 'en-US';

    const matchedVoice = voices.find((v) => v.lang.startsWith(targetLang.slice(0, 2)));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onend = () => {
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      if (onEnd) onEnd();
    };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  };

  const playCurrentQuestionFlow = () => {
    if (!currentQ) return;
    setIsPlaying(true);
    setPlaybackPhase('question');

    const qText = `Câu hỏi số ${currentIndex + 1}: ${currentQ.question}`;

    speakText(qText, () => {
      // Question done, start 3-second thinking countdown
      setPlaybackPhase('waiting');
      let remaining = 3;
      setCountdown(remaining);

      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);
        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);

          // Now speak correct answer and explanation
          setPlaybackPhase('answer');
          const correctOpt = currentQ.options[currentQ.correctAnswer] || '';
          const ansText = `Đáp án đúng là: ${correctOpt}. ${currentQ.explanation ? `Giải thích: ${currentQ.explanation}` : ''}`;

          speakText(ansText, () => {
            // Answer spoken, advance to next question
            setTimeout(() => {
              handleNextQuestionAuto();
            }, 1000);
          });
        }
      }, 1000);
    });
  };

  const handleNextQuestionAuto = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      if (repeatMode === 'all') {
        setCurrentIndex(0);
      } else {
        stopPlayback();
      }
    }
  };

  // Re-trigger playback flow when index changes while playing
  useEffect(() => {
    if (isPlaying && isOpen && currentQ) {
      playCurrentQuestionFlow();
    }
  }, [currentIndex, isPlaying]);

  if (!isOpen || !quiz) return null;

  const handleTogglePlay = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      setIsPlaying(true);
      playCurrentQuestionFlow();
    }
  };

  const handlePrev = () => {
    stopPlayback();
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    stopPlayback();
    setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Chế độ Nghe Ôn tập Tự động (Hands-Free)
              </h2>
              <p className="text-xs text-slate-400">
                Tự động đọc câu hỏi, đếm ngược 3s suy nghĩ, rồi đọc đáp án & giải thích
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Question Player Canvas */}
        {currentQ ? (
          <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-4 text-center relative overflow-hidden">
            {/* Status Phase Badge */}
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs font-bold text-slate-400">
                Câu {currentIndex + 1} / {questions.length}
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {playbackPhase === 'question' && '🔊 Đang đọc câu hỏi...'}
                {playbackPhase === 'waiting' && `⏳ Đếm ngược suy nghĩ: ${countdown}s`}
                {playbackPhase === 'answer' && '💡 Đang đọc đáp án đúng...'}
                {playbackPhase === 'idle' && 'Tạm dừng'}
              </span>
            </div>

            {/* Question Text */}
            <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 min-h-[60px] flex items-center justify-center">
              {currentQ.question}
            </p>

            {/* Reveal Answer if in answer phase */}
            {playbackPhase === 'answer' && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-200 animate-in fade-in zoom-in duration-200">
                Đáp án đúng: {currentQ.options[currentQ.correctAnswer]}
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-xs text-slate-400 py-6">Bộ đề không có câu hỏi nào.</p>
        )}

        {/* Player Controls */}
        <div className="space-y-4">
          {/* Main Play / Skip Buttons */}
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 transition-all cursor-pointer"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={handleTogglePlay}
              className="p-5 rounded-3xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 transition-all cursor-pointer active:scale-95"
            >
              {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 fill-current ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={currentIndex === questions.length - 1}
              className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 transition-all cursor-pointer"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Speed & Repeat & Sound toggles */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-bold">Tốc độ đọc:</span>
              {[0.8, 1.0, 1.2, 1.5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpeed(s)}
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                    speed === s
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-emerald-500" />}
                <span>{isMuted ? 'Tắt âm' : 'Bật âm'}</span>
              </button>

              <button
                type="button"
                onClick={() => setRepeatMode(repeatMode === 'all' ? 'off' : 'all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl cursor-pointer ${
                  repeatMode === 'all'
                    ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                    : 'bg-slate-100 dark:bg-slate-800'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Lặp toàn bộ</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
