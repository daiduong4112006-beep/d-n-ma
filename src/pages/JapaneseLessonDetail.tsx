import React, { useState } from 'react';
import {
  ArrowLeft,
  Layers,
  Keyboard,
  CheckSquare2,
  Volume2,
  Brain,
  Check,
  Search,
  Edit3,
  Trash2,
  X,
} from 'lucide-react';
import { JapaneseLesson, JapaneseVocabCard } from '../types/japanese';
import { speakJapanese } from '../utils/japaneseKana';
import { sound } from '../utils/audio';

interface JapaneseLessonDetailProps {
  lesson: JapaneseLesson;
  courseCode?: string;
  onBack: () => void;
  onStartMode: (mode: 'typing' | 'flashcard' | 'multichoice', filter?: 'original' | 'mastered' | 'all') => void;
  onEditLesson: () => void;
  onDeleteLesson?: () => void;
  onToggleMastery: (cardId: string, currentMastered: boolean) => void;
}

export const JapaneseLessonDetail: React.FC<JapaneseLessonDetailProps> = ({
  lesson,
  courseCode = 'jpd123',
  onBack,
  onStartMode,
  onEditLesson,
  onDeleteLesson,
  onToggleMastery,
}) => {
  const [vocabSearch, setVocabSearch] = useState('');
  const [vocabFilterTab, setVocabFilterTab] = useState<'original' | 'mastered' | 'all'>('original');

  const totalVocab = lesson.cards.length;
  const vocabMasteredCount = lesson.cards.filter((c) => c.mastered).length;
  const unmasteredCount = totalVocab - vocabMasteredCount;

  const filteredVocab = lesson.cards.filter((card) => {
    // 1. Tab filter (Mục gốc vs Đã nhớ vs Tất cả)
    if (vocabFilterTab === 'original' && card.mastered) return false;
    if (vocabFilterTab === 'mastered' && !card.mastered) return false;

    // 2. Search query filter
    if (!vocabSearch.trim()) return true;
    const q = vocabSearch.toLowerCase();
    return (
      card.term.toLowerCase().includes(q) ||
      (card.reading && card.reading.toLowerCase().includes(q)) ||
      card.definition.toLowerCase().includes(q) ||
      (card.romaji && card.romaji.toLowerCase().includes(q))
    );
  });

  const handleToggleVocab = (card: JapaneseVocabCard, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = !card.mastered;
    if (next) sound.playCorrect();
    else sound.playClick();
    onToggleMastery(card.id, !!card.mastered);
  };

  const handleSpeak = (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    speakJapanese(text);
  };

  // Extract lesson label (e.g. "LESSON 1" or "LESSON 4-1")
  const lessonNumber = lesson.lessonCode
    ? `LESSON ${lesson.lessonCode.replace(/^L/i, '')}`
    : 'LESSON 1';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Breadcrumb link: ← Back to Course jpd123 */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-teal-700 hover:text-teal-800 dark:text-emerald-400 dark:hover:text-emerald-300 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          <span>Back to Course {courseCode}</span>
        </button>
      </div>

      {/* Header Row: Title & Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 select-none">
            {lessonNumber}
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {lesson.title}
          </h1>
          {lesson.description && (
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {lesson.description}
            </p>
          )}
        </div>

        {/* Action Buttons matching screenshot */}
        <div className="grid grid-cols-3 sm:flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Flashcard Button */}
          <button
            type="button"
            onClick={() => onStartMode('flashcard')}
            className="px-3 sm:px-5 py-2.5 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 font-bold text-xs shadow-2xs flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer active:scale-95 transition-all"
            title="Học bằng thẻ ghi nhớ Flashcard"
          >
            <Layers className="w-4 h-4 text-slate-700 dark:text-slate-300 shrink-0" />
            <span>Flashcard</span>
          </button>

          {/* Gõ Button */}
          <button
            type="button"
            onClick={() => onStartMode('typing', vocabFilterTab)}
            className="px-3 sm:px-5 py-2.5 rounded-full bg-slate-950 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-750 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer active:scale-95 transition-all"
            title={`Luyện gõ từ vựng tiếng Nhật theo: ${
              vocabFilterTab === 'original'
                ? 'Mục gốc'
                : vocabFilterTab === 'mastered'
                ? 'Đã nhớ'
                : 'Tất cả'
            }`}
          >
            <Keyboard className="w-4 h-4 text-white shrink-0" />
            <span className="hidden sm:inline">
              Gõ {vocabFilterTab === 'original' ? '• Mục gốc' : vocabFilterTab === 'mastered' ? '• Đã nhớ' : '• Tất cả'}
            </span>
            <span className="sm:hidden">Luyện gõ</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-white">
              {vocabFilterTab === 'original' ? unmasteredCount : vocabFilterTab === 'mastered' ? vocabMasteredCount : totalVocab}
            </span>
          </button>

          {/* Multichoice Button */}
          <button
            type="button"
            onClick={() => onStartMode('multichoice')}
            className="px-3 sm:px-5 py-2.5 rounded-full bg-[#ea580c] hover:bg-orange-600 text-white font-bold text-xs shadow-sm shadow-orange-600/30 flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer active:scale-95 transition-all"
            title="Luyện tập trắc nghiệm 4 đáp án"
          >
            <CheckSquare2 className="w-4 h-4 text-white shrink-0" />
            <span>Multichoice</span>
          </button>
        </div>
      </div>

      {/* Sub-bar: Filter Tabs (Mục gốc / Đã nhớ / Tất cả) & Search & Edit tools */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Category Tabs: Mục gốc vs Đã nhớ */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => {
              setVocabFilterTab('original');
              sound.playClick();
            }}
            className={`px-3.5 sm:px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 shrink-0 ${
              vocabFilterTab === 'original'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <span>Mục gốc</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                vocabFilterTab === 'original'
                  ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {unmasteredCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setVocabFilterTab('mastered');
              sound.playClick();
            }}
            className={`px-3.5 sm:px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 shrink-0 ${
              vocabFilterTab === 'mastered'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Đã nhớ</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                vocabFilterTab === 'mastered'
                  ? 'bg-white/20 text-white'
                  : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {vocabMasteredCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setVocabFilterTab('all');
              sound.playClick();
            }}
            className={`px-3 sm:px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              vocabFilterTab === 'all'
                ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/30'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <span>Tất cả ({totalVocab})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Search box */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={vocabSearch}
              onChange={(e) => setVocabSearch(e.target.value)}
              placeholder="Tìm từ vựng..."
              className="w-full pl-8 pr-7 py-2 text-xs rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-900 dark:text-white"
            />
            {vocabSearch && (
              <button
                type="button"
                onClick={() => setVocabSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Edit / Delete Lesson */}
          <button
            type="button"
            onClick={onEditLesson}
            className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs font-bold"
            title="Chỉnh sửa bài học"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          {onDeleteLesson && (
            <button
              type="button"
              onClick={onDeleteLesson}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer text-xs font-bold"
              title="Xóa bài học này"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Vocabulary Container */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Table Header (visible on tablets & desktops) */}
        <div className="hidden sm:grid grid-cols-12 px-6 sm:px-8 py-4 border-b border-slate-200 dark:border-slate-800 text-[11px] sm:text-xs font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase select-none">
          <div className="col-span-1">NO.</div>
          <div className="col-span-4">TỪ VỰNG</div>
          <div className="col-span-4">NGHĨA</div>
          <div className="col-span-3 text-right">TRẠNG THÁI</div>
        </div>

        {/* Rows */}
        {filteredVocab.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-sm font-medium space-y-2">
            <p>
              {vocabFilterTab === 'mastered'
                ? 'Chưa có từ vựng nào trong mục "Đã nhớ". Hãy bấm "Ghi nhớ" từ mục gốc hoặc Flashcard để lưu vào đây!'
                : vocabFilterTab === 'original'
                ? 'Tuyệt vời! Bạn đã ghi nhớ toàn bộ từ vựng trong bài học này.'
                : 'Không tìm thấy từ vựng phù hợp'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredVocab.map((card, index) => {
              const isMastered = !!card.mastered;
              const readingText = card.reading?.trim() || '';
              const termText = card.term.trim();

              // Rule: きた (reading) là từ chính to ở trên, 北 (term) từ phụ to ở dưới kèm phiên âm
              const mainWord = readingText && readingText !== termText ? readingText : termText;
              const subWord = readingText && readingText !== termText ? termText : '';
              const romajiText = card.romaji ? card.romaji.trim() : '';
              const toSpeak = readingText || termText;

              return (
                <div key={card.id}>
                  {/* MOBILE VIEW (< sm): Clean, finger-friendly card */}
                  <div className="sm:hidden p-4 space-y-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black flex items-center justify-center shrink-0">
                          #{index + 1}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span
                            onClick={() => handleSpeak(toSpeak)}
                            className="text-2xl font-black font-sans text-slate-900 dark:text-white leading-tight cursor-pointer hover:text-orange-600 transition-colors select-none"
                            title="Bấm để nghe phát âm"
                          >
                            {mainWord}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleSpeak(toSpeak, e)}
                            className="p-1 rounded-md text-slate-400 hover:text-orange-500 transition-colors cursor-pointer"
                            title="Nghe phát âm"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleVocab(card)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0 ${
                          isMastered
                            ? 'border border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30'
                            : 'bg-[#ea580c] hover:bg-orange-600 text-white shadow-xs'
                        }`}
                        title={isMastered ? 'Bấm để chuyển về Mục gốc' : 'Bấm để đánh dấu đã nhớ'}
                      >
                        {isMastered ? (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Đã nhớ</span>
                          </>
                        ) : (
                          <>
                            <Brain className="w-3.5 h-3.5" />
                            <span>Ghi nhớ</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Sub-word, romaji, part of speech */}
                    {(subWord || romajiText || card.partOfSpeech) && (
                      <div className="flex items-center gap-2 flex-wrap pl-9">
                        {subWord && (
                          <span className="text-base font-bold font-sans text-slate-700 dark:text-slate-300">
                            {subWord}
                          </span>
                        )}
                        {romajiText && (
                          <span className="text-xs font-semibold font-mono text-slate-500 dark:text-slate-400">
                            [{romajiText}]
                          </span>
                        )}
                        {card.partOfSpeech && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase">
                            {card.partOfSpeech}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Definition & Example */}
                    <div className="pl-9 space-y-1">
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {card.definition}
                      </div>
                      {card.example && (
                        <div className="text-xs text-slate-400 dark:text-slate-500 italic">
                          {card.example}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* DESKTOP VIEW (>= sm): 12-column table */}
                  <div className="hidden sm:grid grid-cols-12 items-center px-6 sm:px-8 py-5 sm:py-6 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                    {/* NO. */}
                    <div className="col-span-1 text-base sm:text-lg font-black text-slate-700 dark:text-slate-300">
                      {index + 1}.
                    </div>

                    {/* TỪ VỰNG: Main word on top, sub-word below */}
                    <div className="col-span-4 pr-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            onClick={() => handleSpeak(toSpeak)}
                            className="text-2xl sm:text-3xl font-black font-sans text-slate-900 dark:text-white leading-tight cursor-pointer hover:text-orange-600 transition-colors select-none"
                            title="Bấm để nghe phát âm"
                          >
                            {mainWord}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleSpeak(toSpeak, e)}
                            className="p-1 rounded-md text-slate-400 hover:text-orange-500 transition-colors cursor-pointer"
                            title="Nghe phát âm"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {subWord && (
                            <span className="text-base sm:text-lg font-bold font-sans text-slate-700 dark:text-slate-300">
                              {subWord}
                            </span>
                          )}
                          {romajiText && (
                            <span className="text-xs sm:text-sm font-semibold font-mono text-slate-500 dark:text-slate-400">
                              [{romajiText}]
                            </span>
                          )}
                          {card.partOfSpeech && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase">
                              {card.partOfSpeech}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* NGHĨA */}
                    <div className="col-span-4 pr-4">
                      <div className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">
                        {card.definition}
                      </div>
                      {card.example && (
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 italic line-clamp-2">
                          {card.example}
                        </div>
                      )}
                    </div>

                    {/* TRẠNG THÁI */}
                    <div className="col-span-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleToggleVocab(card)}
                        className={`px-4 sm:px-5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 whitespace-nowrap ${
                          isMastered
                            ? 'border border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                            : 'bg-[#ea580c] hover:bg-orange-600 text-white shadow-sm shadow-orange-600/30'
                        }`}
                        title={isMastered ? 'Bấm để chuyển về Mục gốc' : 'Bấm để đánh dấu đã nhớ'}
                      >
                        {isMastered ? (
                          <>
                            <Check className="w-4 h-4 stroke-[2.5]" />
                            <span>Đã nhớ</span>
                          </>
                        ) : (
                          <>
                            <Brain className="w-4 h-4" />
                            <span>Ghi nhớ</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
