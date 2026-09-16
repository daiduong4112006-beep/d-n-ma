import React, { useState } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Edit3,
  Volume2,
  Layers,
  BookOpen,
  ArrowRight,
  X,
  Brain,
  FolderOpen,
  Check,
  CheckSquare2,
  ChevronRight,
  Keyboard,
  Play,
  Filter,
  Star,
  ArrowLeft,
} from 'lucide-react';
import { JapaneseKanjiCard, JapaneseVocabCard, JapaneseLesson } from '../../types/japanese';
import { speakJapanese } from '../../utils/japaneseKana';
import { sound } from '../../utils/audio';
import { JapaneseFlashcardMode } from './JapaneseFlashcardMode';
import { JapaneseKanjiStudyMode } from './JapaneseKanjiStudyMode';
import { JapaneseTypingMode } from './JapaneseTypingMode';
import { JapaneseMultiChoiceMode } from './JapaneseMultiChoiceMode';

interface Props {
  kanjiList: JapaneseKanjiCard[];
  kanjiVocabList?: JapaneseVocabCard[];
  courseCode?: string;
  onBackToCourse?: () => void;
  onUpdateKanjiList: (updated: JapaneseKanjiCard[]) => void;
  onUpdateKanjiVocabList?: (updated: JapaneseVocabCard[]) => void;
}

const LESSON_FOLDER_METADATA: Record<
  string,
  { code: string; title: string; desc: string }
> = {
  L4: {
    code: 'jpd123 • L4',
    title: 'Địa điểm và Phương hướng',
    desc: 'Bao gồm các Hán tự chỉ nơi chốn, phương hướng, địa danh (Thượng, Hạ, Đông, Tây, Nam, Bắc...)',
  },
  L5: {
    code: 'jpd123 • L5',
    title: 'Hành động và Nghỉ ngơi',
    desc: 'Bao gồm các Hán tự chỉ thời gian, hoạt động thường ngày và nghỉ ngơi (Tiên, Sinh, Học, Hiệu...)',
  },
  L6: {
    code: 'jpd123 • L6',
    title: 'Giao tiếp và Sinh hoạt',
    desc: 'Bao gồm các Hán tự giao tiếp, sinh hoạt gia đình và bạn bè (Hội, Xã, Thoại, Ngữ...)',
  },
  L7: {
    code: 'jpd123 • L7',
    title: 'Tự nhiên và Cơ bản',
    desc: 'Bao gồm các Hán tự tự nhiên, số đếm và các chữ Hán căn bản (Sơn, Xuyên, Điền, Thiên...)',
  },
};

export const JapaneseKanjiSection: React.FC<Props> = ({
  kanjiList,
  kanjiVocabList = [],
  courseCode = 'jpd123',
  onBackToCourse,
  onUpdateKanjiList,
  onUpdateKanjiVocabList,
}) => {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [kanjiSearch, setKanjiSearch] = useState('');
  const [vocabSearch, setVocabSearch] = useState('');
  const [filterKanjiChar, setFilterKanjiChar] = useState<string | null>(null);

  // Active study mode
  const [activeStudyMode, setActiveStudyMode] = useState<
    'none' | 'kanji-study' | 'kanji-flashcard' | 'vocab-flashcard' | 'vocab-typing' | 'vocab-multichoice'
  >('none');

  // Modals
  const [editingKanji, setEditingKanji] = useState<JapaneseKanjiCard | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [kanjiToDelete, setKanjiToDelete] = useState<JapaneseKanjiCard | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    kanji: '',
    hanViet: '',
    onyomi: '',
    kunyomi: '',
    meaning: '',
    strokeCount: 4,
    lessonTag: 'L4',
    examples: [{ word: '', reading: '', meaning: '' }],
  });

  // Helper to map vocab card to lesson folder
  const getVocabFolderTag = (v: JapaneseVocabCard): string => {
    if (v.id.startsWith('v4-') || v.id.includes('l4') || v.id.includes('L4'))
      return 'L4';
    if (v.id.startsWith('v5-') || v.id.includes('l5') || v.id.includes('L5'))
      return 'L5';
    if (v.id.startsWith('v6-') || v.id.includes('l6') || v.id.includes('L6'))
      return 'L6';
    if (v.id.startsWith('v7-') || v.id.includes('l7') || v.id.includes('L7'))
      return 'L7';
    return 'L4';
  };

  const allFolderTags = ['L4', 'L5', 'L6', 'L7'];

  // Current folder's Kanji list
  const currentFolderKanji = kanjiList.filter((k) => {
    if (!selectedFolder || selectedFolder === 'ALL') return true;
    return (k.lessonTag || 'L4') === selectedFolder;
  });

  // Filtered Kanji
  const filteredKanji = currentFolderKanji.filter((k) => {
    if (!kanjiSearch.trim()) return true;
    const q = kanjiSearch.toLowerCase();
    return (
      k.kanji.toLowerCase().includes(q) ||
      k.hanViet.toLowerCase().includes(q) ||
      k.meaning.toLowerCase().includes(q) ||
      (k.onyomi && k.onyomi.toLowerCase().includes(q)) ||
      (k.kunyomi && k.kunyomi.toLowerCase().includes(q))
    );
  });

  // Current folder's Vocab list
  const currentFolderVocab = kanjiVocabList.filter((v) => {
    if (!selectedFolder || selectedFolder === 'ALL') return true;
    return getVocabFolderTag(v) === selectedFolder;
  });

  // Filtered Vocab
  const filteredVocab = currentFolderVocab.filter((v) => {
    if (filterKanjiChar && !v.term.includes(filterKanjiChar)) {
      return false;
    }
    if (!vocabSearch.trim()) return true;
    const q = vocabSearch.toLowerCase();
    return (
      v.term.toLowerCase().includes(q) ||
      (v.reading && v.reading.toLowerCase().includes(q)) ||
      (v.romaji && v.romaji.toLowerCase().includes(q)) ||
      v.definition.toLowerCase().includes(q)
    );
  });

  const kanjiMasteredCount = currentFolderKanji.filter((k) => k.mastered).length;
  const vocabMasteredCount = currentFolderVocab.filter((v) => v.mastered).length;

  const handleToggleKanjiMastered = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = kanjiList.map((k) =>
      k.id === id ? { ...k, mastered: !k.mastered } : k
    );
    onUpdateKanjiList(updated);
    sound.playClick();
  };

  const handleToggleVocabMastered = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!onUpdateKanjiVocabList) return;
    const updated = kanjiVocabList.map((v) =>
      v.id === id ? { ...v, mastered: !v.mastered } : v
    );
    onUpdateKanjiVocabList(updated);
    sound.playClick();
  };

  const handleSpeak = (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    speakJapanese(text);
  };

  const openAddModal = () => {
    setFormData({
      kanji: '',
      hanViet: '',
      onyomi: '',
      kunyomi: '',
      meaning: '',
      strokeCount: 4,
      lessonTag: selectedFolder !== 'ALL' ? selectedFolder : 'L4',
      examples: [{ word: '', reading: '', meaning: '' }],
    });
    setEditingKanji(null);
    setIsAdding(true);
  };

  const openEditModal = (k: JapaneseKanjiCard, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFormData({
      kanji: k.kanji,
      hanViet: k.hanViet,
      onyomi: k.onyomi || '',
      kunyomi: k.kunyomi || '',
      meaning: k.meaning,
      strokeCount: k.strokeCount || 4,
      lessonTag: k.lessonTag || 'L4',
      examples:
        k.examples && k.examples.length > 0
          ? k.examples
          : [{ word: '', reading: '', meaning: '' }],
    });
    setEditingKanji(k);
    setIsAdding(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.kanji.trim() || !formData.hanViet.trim()) return;

    const cleanExamples = (formData.examples || []).filter(
      (ex) => ex.word.trim() || ex.meaning.trim()
    );

    if (editingKanji) {
      const updated = kanjiList.map((k) =>
        k.id === editingKanji.id
          ? {
              ...k,
              kanji: formData.kanji.trim(),
              hanViet: formData.hanViet.trim(),
              onyomi: formData.onyomi.trim(),
              kunyomi: formData.kunyomi.trim(),
              meaning: formData.meaning.trim(),
              strokeCount: Number(formData.strokeCount) || 4,
              lessonTag: formData.lessonTag,
              examples: cleanExamples,
            }
          : k
      );
      onUpdateKanjiList(updated);
    } else {
      const newCard: JapaneseKanjiCard = {
        id: `kanji_${Date.now()}`,
        kanji: formData.kanji.trim(),
        hanViet: formData.hanViet.trim(),
        onyomi: formData.onyomi.trim(),
        kunyomi: formData.kunyomi.trim(),
        meaning: formData.meaning.trim(),
        strokeCount: Number(formData.strokeCount) || 4,
        lessonTag: formData.lessonTag,
        examples: cleanExamples,
        mastered: false,
        createdAt: new Date().toISOString(),
      };
      onUpdateKanjiList([newCard, ...kanjiList]);
    }

    setIsAdding(false);
    setEditingKanji(null);
    sound.playCorrect();
  };

  const handleDeleteKanji = () => {
    if (!kanjiToDelete) return;
    const updated = kanjiList.filter((k) => k.id !== kanjiToDelete.id);
    onUpdateKanjiList(updated);
    setKanjiToDelete(null);
    sound.playClick();
  };

  // Virtual lesson helper for typing & multichoice study modes
  const virtualLessonForVocab: JapaneseLesson = {
    id: `kanji_vocab_${selectedFolder || 'all'}`,
    title: `Từ vựng Chữ Hán • ${
      !selectedFolder || selectedFolder === 'ALL'
        ? 'Tất cả bài học'
        : LESSON_FOLDER_METADATA[selectedFolder]?.title || selectedFolder
    }`,
    cards: currentFolderVocab,
    description: `Luyện tập ${currentFolderVocab.length} từ ghép chữ Hán`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // =========================================================================
  // SUB-VIEW MODES (FULLSCREEN STUDY EXPERIENCES)
  // =========================================================================
  if (activeStudyMode === 'kanji-study') {
    return (
      <JapaneseKanjiStudyMode
        kanjiCards={currentFolderKanji}
        title={`Study Mode • ${
          !selectedFolder || selectedFolder === 'ALL'
            ? 'Toàn bộ Chữ Hán'
            : LESSON_FOLDER_METADATA[selectedFolder]?.title || selectedFolder
        }`}
        onExit={() => setActiveStudyMode('none')}
        onKanjiMastered={(id) => handleToggleKanjiMastered(id)}
      />
    );
  }

  if (activeStudyMode === 'kanji-flashcard') {
    return (
      <JapaneseFlashcardMode
        kanjiCards={currentFolderKanji}
        title={`Flashcard Chữ Hán • ${
          !selectedFolder || selectedFolder === 'ALL'
            ? 'Toàn bộ Chữ Hán'
            : LESSON_FOLDER_METADATA[selectedFolder]?.title || selectedFolder
        }`}
        storageId={`kanji_flashcard_${selectedFolder || 'all'}`}
        onExit={() => setActiveStudyMode('none')}
        onCardMastered={(id) => handleToggleKanjiMastered(id)}
      />
    );
  }

  if (activeStudyMode === 'vocab-flashcard') {
    return (
      <JapaneseFlashcardMode
        customCards={currentFolderVocab}
        title={`Flashcard Từ vựng Chữ Hán • ${
          !selectedFolder || selectedFolder === 'ALL'
            ? 'Toàn bộ từ ghép'
            : LESSON_FOLDER_METADATA[selectedFolder]?.title || selectedFolder
        }`}
        storageId={`kanji_vocab_flashcard_${selectedFolder || 'all'}`}
        onExit={() => setActiveStudyMode('none')}
        onCardMastered={(id) => handleToggleVocabMastered(id)}
      />
    );
  }

  if (activeStudyMode === 'vocab-typing') {
    return (
      <JapaneseTypingMode
        lesson={virtualLessonForVocab}
        onExit={() => setActiveStudyMode('none')}
        onCardMastered={(id) => handleToggleVocabMastered(id)}
      />
    );
  }

  if (activeStudyMode === 'vocab-multichoice') {
    return (
      <JapaneseMultiChoiceMode
        lesson={virtualLessonForVocab}
        onExit={() => setActiveStudyMode('none')}
        onCardMastered={(id) => handleToggleVocabMastered(id)}
      />
    );
  }

  const currentFolderMeta = (selectedFolder && LESSON_FOLDER_METADATA[selectedFolder]) || {
    code: `${courseCode || 'jpd123'} • ${selectedFolder || 'ALL'}`,
    title: selectedFolder === 'ALL' ? 'Toàn bộ Thư mục Chữ Hán' : `Bài học ${selectedFolder || ''}`,
    desc: 'Các Hán tự và từ vựng chữ Hán thuộc bài học này',
  };

  const renderModals = () => (
    <>
      {/* MODAL: ADD / EDIT KANJI */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {editingKanji ? 'Chỉnh sửa chữ Hán' : 'Thêm chữ Hán mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Chữ Hán *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.kanji}
                    onChange={(e) =>
                      setFormData({ ...formData, kanji: e.target.value })
                    }
                    placeholder="VD: 北"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-black text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Hán Việt *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.hanViet}
                    onChange={(e) =>
                      setFormData({ ...formData, hanViet: e.target.value })
                    }
                    placeholder="VD: BẮC"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold uppercase text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Nghĩa tiếng Việt *
                </label>
                <input
                  type="text"
                  required
                  value={formData.meaning}
                  onChange={(e) =>
                    setFormData({ ...formData, meaning: e.target.value })
                  }
                  placeholder="VD: Phía bắc, hướng bắc"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Âm Kun (Kunyomi)
                  </label>
                  <input
                    type="text"
                    value={formData.kunyomi}
                    onChange={(e) =>
                      setFormData({ ...formData, kunyomi: e.target.value })
                    }
                    placeholder="VD: きた"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Âm On (Onyomi)
                  </label>
                  <input
                    type="text"
                    value={formData.onyomi}
                    onChange={(e) =>
                      setFormData({ ...formData, onyomi: e.target.value })
                    }
                    placeholder="VD: ホク"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Số nét
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={64}
                    value={formData.strokeCount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        strokeCount: Number(e.target.value) || 4,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Thuộc Thư mục bài
                  </label>
                  <select
                    value={formData.lessonTag}
                    onChange={(e) =>
                      setFormData({ ...formData, lessonTag: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                  >
                    <option value="L4">L4: Địa điểm và Phương hướng</option>
                    <option value="L5">L5: Hành động và Nghỉ ngơi</option>
                    <option value="L6">L6: Giao tiếp và Sinh hoạt</option>
                    <option value="L7">L7: Tự nhiên và Cơ bản</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-md shadow-blue-600/30 cursor-pointer"
                >
                  {editingKanji ? 'Lưu thay đổi' : 'Thêm chữ Hán'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {kanjiToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center text-2xl font-serif shrink-0">
                {kanjiToDelete.kanji}
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  Xóa chữ Hán này?
                </h4>
                <p className="text-xs text-slate-500">
                  {kanjiToDelete.hanViet} • {kanjiToDelete.meaning}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chữ Hán này sẽ bị xóa khỏi danh sách. Thao tác này không thể hoàn tác.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setKanjiToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDeleteKanji}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-md shadow-rose-600/30 cursor-pointer"
              >
                Xóa chữ Hán
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // =========================================================================
  // VIEW 1: 4 FOLDERS OVERVIEW (WHEN NO FOLDER IS SELECTED) - MATCHES USER SCREENSHOT
  // =========================================================================
  if (!selectedFolder) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* HEADER BAR (MATCHING SCREENSHOT) */}
        <div className="flex items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl border-2 border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/50 flex items-center justify-center text-sky-600 dark:text-sky-400 font-serif font-black text-2xl shadow-xs select-none">
              漢
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                HÁN TỰ
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
                Học và luyện tập hán tự theo chủ đề
              </p>
            </div>
          </div>

          {onBackToCourse && (
            <button
              type="button"
              onClick={onBackToCourse}
              className="px-3.5 py-1.5 rounded-full border border-sky-200 dark:border-sky-800 bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 text-xs font-bold shadow-2xs hover:bg-sky-50 dark:hover:bg-slate-700/60 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{(courseCode || 'JPD123').toUpperCase()}</span>
            </button>
          )}
        </div>

        {/* 2X2 GRID OF 4 FOLDERS (MATCHING USER SCREENSHOT) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {allFolderTags.map((tag) => {
            const meta = LESSON_FOLDER_METADATA[tag] || {
              code: `jpd123 • ${tag}`,
              title: `Bài học ${tag}`,
              desc: '',
            };
            const kCount = kanjiList.filter(
              (k) => (k.lessonTag || 'L4') === tag
            ).length;
            const vCount = kanjiVocabList.filter(
              (v) => getVocabFolderTag(v) === tag
            ).length;
            const lessonNum = tag.replace('L', '');

            return (
              <div
                key={tag}
                onClick={() => {
                  setSelectedFolder(tag);
                  setFilterKanjiChar(null);
                  sound.playClick();
                }}
                className="relative overflow-hidden bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-sky-300 dark:hover:border-sky-800 transition-all p-5 sm:p-7 flex items-center justify-between cursor-pointer group select-none"
              >
                {/* Left vertical blue stripe accent */}
                <div className="absolute left-0 top-3.5 bottom-3.5 w-1.5 bg-blue-600 rounded-r-full" />

                <div className="flex items-center gap-4 sm:gap-5 min-w-0">
                  {/* App-like kanji icon badge with waves and cherry blossoms */}
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-linear-to-b from-sky-400 via-blue-500 to-blue-600 text-white flex items-center justify-center shadow-md shrink-0 overflow-hidden group-hover:scale-105 transition-transform select-none">
                    <span className="absolute top-1 right-1.5 text-[11px] opacity-85 select-none">🌸</span>
                    <span className="absolute bottom-1 left-1.5 text-[11px] opacity-85 select-none">🌸</span>
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent pointer-events-none" />
                    <span className="text-3xl sm:text-4xl font-serif font-black drop-shadow-sm select-none relative z-10">
                      漢
                    </span>
                  </div>

                  {/* Folder Details */}
                  <div className="space-y-1.5 min-w-0">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100/80 text-blue-600 dark:bg-blue-950/80 dark:text-blue-400 inline-block">
                        LESSON {lessonNum}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {meta.title}
                    </h3>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/70 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{kCount} KANJI</span>
                      </span>

                      <span className="text-slate-300 dark:text-slate-700 font-black select-none">•</span>

                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/70 flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 fill-purple-600/20 text-purple-600 dark:text-purple-400 stroke-[2.5]" />
                        <span>{vCount} VOCAB</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Circular Chevron Right Button */}
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xs shrink-0 ml-3">
                  <ChevronRight className="w-5 h-5 stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions (View All & Add) */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => {
              setSelectedFolder('ALL');
              setFilterKanjiChar(null);
              sound.playClick();
            }}
            className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer shadow-2xs transition-all"
          >
            <FolderOpen className="w-4 h-4 text-blue-600" />
            <span>Xem tất cả ({kanjiList.length} chữ Hán)</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-sm flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Hán tự</span>
          </button>
        </div>

        {renderModals()}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: FOLDER DETAIL (WHEN A FOLDER IS CLICKED)
  // =========================================================================
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* TOP NAVIGATION IN FOLDER DETAIL */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => {
            setSelectedFolder(null);
            setFilterKanjiChar(null);
            sound.playClick();
          }}
          className="px-4 py-2 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-xs font-black hover:bg-sky-100 dark:hover:bg-sky-900/60 flex items-center gap-2 shadow-2xs cursor-pointer transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <span>Quay lại 4 Thư mục Hán tự</span>
        </button>

        {/* Quick Folder Switchers */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {allFolderTags.map((tag) => {
            const isSelected = selectedFolder === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setSelectedFolder(tag);
                  setFilterKanjiChar(null);
                  sound.playClick();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                {tag}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setSelectedFolder('ALL');
              setFilterKanjiChar(null);
              sound.playClick();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
              selectedFolder === 'ALL'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
            }`}
          >
            TẤT CẢ
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="ml-auto px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Hán tự</span>
          </button>
        </div>
      </div>

      {/* FOLDER BANNER */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
            {selectedFolder === 'ALL' ? 'jpd123 • TỔNG HỢP' : currentFolderMeta.code}
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
            {selectedFolder === 'ALL'
              ? 'Toàn bộ Thư mục Chữ Hán'
              : currentFolderMeta.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {selectedFolder === 'ALL'
              ? `Tổng hợp ${kanjiList.length} chữ Hán cốt lõi và ${kanjiVocabList.length} từ vựng`
              : currentFolderMeta.desc}
          </p>
        </div>

        {filterKanjiChar && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-xs font-bold text-orange-700 dark:text-orange-300">
            <Filter className="w-3.5 h-3.5" />
            <span>Lọc theo chữ Hán: 「{filterKanjiChar}」</span>
            <button
              type="button"
              onClick={() => setFilterKanjiChar(null)}
              className="p-1 hover:text-rose-600 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 2-COLUMN SPLIT LAYOUT (KANJI CORE ON LEFT, VOCABULARY ON RIGHT)      */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================================================================= */}
        {/* LEFT COLUMN: KANJI CORE                                           */}
        {/* ================================================================= */}
        <div className="lg:col-span-6 xl:col-span-7 space-y-4">
          {/* Kanji Header Row */}
          <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                KANJI CORE ({currentFolderKanji.length})
              </h3>
              {kanjiMasteredCount > 0 && (
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40">
                  {kanjiMasteredCount}/{currentFolderKanji.length} thuộc
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* STUDY MODE Button */}
              <button
                type="button"
                onClick={() => setActiveStudyMode('kanji-study')}
                className="px-3.5 sm:px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-black text-xs shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                title="Bắt đầu học chữ Hán"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>STUDY MODE</span>
              </button>

              {/* FLASHCARD Button */}
              <button
                type="button"
                onClick={() => setActiveStudyMode('kanji-flashcard')}
                className="px-3 sm:px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 font-bold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                title="Lật thẻ Flashcard chữ Hán"
              >
                <Layers className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                <span>FLASHCARD</span>
              </button>
            </div>
          </div>

          {/* Quick search for Kanji */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={kanjiSearch}
              onChange={(e) => setKanjiSearch(e.target.value)}
              placeholder="Tìm chữ Hán, Hán Việt, âm On/Kun hoặc nghĩa..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-slate-900 dark:text-white"
            />
            {kanjiSearch && (
              <button
                type="button"
                onClick={() => setKanjiSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Kanji Cards Grid: 2 columns */}
          {filteredKanji.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-sm font-bold">
              Không tìm thấy chữ Hán
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredKanji.map((k) => {
                const isMastered = !!k.mastered;
                const isFiltered = filterKanjiChar === k.kanji;

                return (
                  <div
                    key={k.id}
                    onClick={() => {
                      setFilterKanjiChar(isFiltered ? null : k.kanji);
                    }}
                    className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 group cursor-pointer ${
                      isFiltered
                        ? 'bg-orange-50/80 dark:bg-orange-950/40 border-orange-500 shadow-sm ring-2 ring-orange-500/30'
                        : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-orange-300 dark:hover:border-orange-900/60'
                    }`}
                  >
                    {/* Left: Big Bold Kanji Character */}
                    <div className="w-14 text-center shrink-0">
                      <div className="text-4xl sm:text-5xl font-black font-serif text-slate-900 dark:text-white leading-none pt-1 select-none">
                        {k.kanji}
                      </div>
                    </div>

                    {/* Right: HanViet, Meaning, Readings, Ghi nhớ */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Row 1: Han-Viet & Meaning */}
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                          {k.hanViet}
                        </span>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate">
                          {k.meaning}
                        </span>
                      </div>

                      {/* Row 2: Reading chips (Kun & On) */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {k.kunyomi && k.kunyomi !== '-' && (
                          <span
                            className="px-2 py-0.5 rounded-lg text-[11px] font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSpeak(k.kunyomi.split('、')[0]);
                            }}
                            title="Bấm để nghe âm Kun"
                          >
                            {k.kunyomi}
                          </span>
                        )}
                        {k.onyomi && k.onyomi !== '-' && (
                          <span
                            className="px-2 py-0.5 rounded-lg text-[11px] font-bold border border-cyan-200 dark:border-cyan-800 bg-cyan-50/70 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 cursor-pointer hover:bg-cyan-100/70"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSpeak(k.onyomi.split('、')[0]);
                            }}
                            title="Bấm để nghe âm On"
                          >
                            {k.onyomi}
                          </span>
                        )}
                      </div>

                      {/* Row 3: Action Buttons */}
                      <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80">
                        {/* GHI NHỚ Button */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleKanjiMastered(k.id, e)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 ${
                            isMastered
                              ? 'border border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                              : 'bg-orange-600 hover:bg-orange-500 text-white shadow-xs'
                          }`}
                        >
                          {isMastered ? (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Đã thuộc</span>
                            </>
                          ) : (
                            <>
                              <Brain className="w-3.5 h-3.5" />
                              <span>Ghi nhớ</span>
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSpeak(k.kanji);
                            }}
                            className="p-1 rounded-md text-slate-300 hover:text-orange-500 transition-colors cursor-pointer"
                            title="Nghe phát âm"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => openEditModal(k, e)}
                            className="p-1 rounded-md text-slate-300 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                            title="Chỉnh sửa"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setKanjiToDelete(k);
                            }}
                            className="p-1 rounded-md text-slate-300 hover:text-rose-500 transition-colors cursor-pointer"
                            title="Xóa chữ Hán"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* RIGHT COLUMN: DANH SÁCH TỪ VỰNG CHỮ HÁN                           */}
        {/* ================================================================= */}
        <div className="lg:col-span-6 xl:col-span-5 space-y-4">
          {/* Header Row */}
          <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                TỪ VỰNG CHỮ HÁN ({currentFolderVocab.length})
              </h3>
              {vocabMasteredCount > 0 && (
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40">
                  {vocabMasteredCount}/{currentFolderVocab.length} thuộc
                </span>
              )}
            </div>

            {/* Mode Action Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Flashcard */}
              <button
                type="button"
                onClick={() => setActiveStudyMode('vocab-flashcard')}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-xs flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                title="Lật thẻ Flashcard từ vựng"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Flashcard</span>
              </button>

              {/* Luyện gõ */}
              <button
                type="button"
                onClick={() => setActiveStudyMode('vocab-typing')}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold text-xs shadow-xs flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                title="Luyện gõ từ vựng"
              >
                <Keyboard className="w-3.5 h-3.5 text-orange-400" />
                <span className="hidden sm:inline">Gõ</span>
              </button>

              {/* Trắc nghiệm */}
              <button
                type="button"
                onClick={() => setActiveStudyMode('vocab-multichoice')}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 font-bold text-xs shadow-2xs flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                title="Trắc nghiệm 4 đáp án"
              >
                <CheckSquare2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="hidden sm:inline">Trắc nghiệm</span>
              </button>
            </div>
          </div>

          {/* Quick search for Vocab */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={vocabSearch}
              onChange={(e) => setVocabSearch(e.target.value)}
              placeholder="Tìm từ vựng, Hiragana, Romaji hoặc nghĩa..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-slate-900 dark:text-white"
            />
            {vocabSearch && (
              <button
                type="button"
                onClick={() => setVocabSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Vocabulary Cards List */}
          {filteredVocab.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-sm font-bold">
              Không tìm thấy từ vựng nào
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[820px] overflow-y-auto pr-1 scrollbar-thin">
              {filteredVocab.map((card) => {
                const isMastered = !!card.mastered;

                return (
                  <div
                    key={card.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-orange-300 dark:hover:border-orange-900/60 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          onClick={() => handleSpeak(card.reading || card.term)}
                          className="text-lg sm:text-xl font-black font-sans text-slate-900 dark:text-white leading-tight cursor-pointer hover:text-orange-600 transition-colors"
                          title="Bấm để nghe phát âm"
                        >
                          {card.term}
                        </span>
                        <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                          {card.reading || card.term}
                        </span>
                        {card.partOfSpeech && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {card.partOfSpeech}
                          </span>
                        )}
                      </div>

                      <div className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {card.definition}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleSpeak(card.reading || card.term, e)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Nghe phát âm"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Memory Toggle */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleVocabMastered(card.id, e)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 ${
                          isMastered
                            ? 'border border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                            : 'bg-orange-600 hover:bg-orange-500 text-white shadow-xs'
                        }`}
                      >
                        {isMastered ? (
                          <>
                            <Check className="w-3 h-3 stroke-[2.5]" />
                            <span>Đã lưu</span>
                          </>
                        ) : (
                          <>
                            <Brain className="w-3 h-3" />
                            <span>Ghi nhớ</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {renderModals()}
    </div>
  );
};
