import React, { useState, useEffect, useMemo } from 'react';
import {
  StarredWord,
  getStarredWords,
  removeStarredWordById,
  updateWordNote,
  updateWordSubject,
  updateWordDetails,
  clearAllStarredWords,
  getAllWordSubjects,
  getSuggestedSubjects,
  addOrUpdateStarredWord,
} from '../utils/vocabulary';
import {
  Star,
  Volume2,
  Trash2,
  Search,
  BookOpen,
  Edit3,
  Check,
  Sparkles,
  AlertCircle,
  ArrowLeft,
  RotateCw,
  Plus,
  Tag,
  FolderPlus,
  Layers,
  LayoutGrid,
  ListFilter,
  X,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { sound } from '../utils/audio';

interface SavedVocabularyPageProps {
  onBackToDashboard?: () => void;
}

export const SavedVocabularyPage: React.FC<SavedVocabularyPageProps> = ({ onBackToDashboard }) => {
  const [words, setWords] = useState<StarredWord[]>([]);
  const [search, setSearch] = useState('');
  const [activeSubjectTab, setActiveSubjectTab] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grouped' | 'grid'>('grouped');

  // Edit / Add Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingWordItem, setEditingWordItem] = useState<StarredWord | null>(null);
  const [newSubjectModalOpen, setNewSubjectModalOpen] = useState(false);
  const [newSubjectInput, setNewSubjectInput] = useState('');

  // Form state for Add / Edit
  const [formWord, setFormWord] = useState('');
  const [formTranslation, setFormTranslation] = useState('');
  const [formSubject, setFormSubject] = useState('Chung');
  const [formNote, setFormNote] = useState('');
  const [formContext, setFormContext] = useState('');

  // Flashcard practice mode state for saved words
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [practiceWords, setPracticeWords] = useState<StarredWord[]>([]);
  const [practiceTitle, setPracticeTitle] = useState('Tất cả các môn');
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const loadWords = () => {
    setWords(getStarredWords());
  };

  useEffect(() => {
    loadWords();

    const handleUpdate = () => {
      loadWords();
    };

    window.addEventListener('mcq_vocabulary_updated', handleUpdate);
    return () => {
      window.removeEventListener('mcq_vocabulary_updated', handleUpdate);
    };
  }, []);

  const subjects = useMemo(() => {
    const set = new Set<string>();
    words.forEach((w) => {
      set.add(w.subject && w.subject.trim() ? w.subject.trim() : 'Chung');
    });
    return Array.from(set).sort();
  }, [words]);

  const allAvailableSubjects = useMemo(() => {
    return getSuggestedSubjects();
  }, [words]);

  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleDelete = (id: string) => {
    sound.playFlip();
    removeStarredWordById(id);
    loadWords();
  };

  const handleClearSubjectOrAll = (targetSubject?: string) => {
    const isAll = !targetSubject || targetSubject === 'ALL';
    const msg = isAll
      ? 'Bạn có chắc chắn muốn xóa TẤT CẢ các từ cần lưu ý trong danh sách?'
      : `Bạn có chắc chắn muốn xóa toàn bộ từ trong môn "${targetSubject}"?`;

    if (window.confirm(msg)) {
      clearAllStarredWords(isAll ? undefined : targetSubject);
      loadWords();
    }
  };

  const handleOpenAddModal = (presetSubject?: string) => {
    setFormWord('');
    setFormTranslation('');
    setFormSubject(presetSubject || (activeSubjectTab !== 'ALL' ? activeSubjectTab : 'Chung'));
    setFormNote('');
    setFormContext('');
    setEditingWordItem(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (item: StarredWord) => {
    setEditingWordItem(item);
    setFormWord(item.word);
    setFormTranslation(item.translation);
    setFormSubject(item.subject || 'Chung');
    setFormNote(item.userNote || '');
    setFormContext(item.contextSentence || '');
    setIsAddModalOpen(true);
  };

  const handleSaveWordForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formWord.trim()) {
      alert('Vui lòng nhập từ / cụm từ cần ghi nhớ.');
      return;
    }

    if (editingWordItem) {
      updateWordDetails(editingWordItem.id, {
        word: formWord.trim(),
        translation: formTranslation.trim() || 'Chưa có bản dịch',
        subject: formSubject.trim() || 'Chung',
        userNote: formNote.trim() || undefined,
        contextSentence: formContext.trim() || undefined,
      });
    } else {
      addOrUpdateStarredWord({
        word: formWord.trim(),
        translation: formTranslation.trim() || 'Chưa có bản dịch',
        subject: formSubject.trim() || 'Chung',
        userNote: formNote.trim() || undefined,
        contextSentence: formContext.trim() || undefined,
      });
    }

    setIsAddModalOpen(false);
    loadWords();
  };

  const handleStartPractice = (subjectFilter?: string) => {
    let list = words;
    let title = 'Tất cả các môn';

    if (subjectFilter && subjectFilter !== 'ALL') {
      list = words.filter((w) => (w.subject || 'Chung') === subjectFilter);
      title = `Môn: ${subjectFilter}`;
    }

    if (list.length === 0) {
      alert('Không có từ nào trong mục này để ôn tập.');
      return;
    }

    setPracticeWords(list);
    setPracticeTitle(title);
    setCardIndex(0);
    setIsFlipped(false);
    setIsPracticeMode(true);
  };

  // Filtered words by search + activeSubjectTab
  const filteredWords = useMemo(() => {
    return words.filter((w) => {
      const matchSearch =
        w.word.toLowerCase().includes(search.toLowerCase()) ||
        w.translation.toLowerCase().includes(search.toLowerCase()) ||
        (w.subject && w.subject.toLowerCase().includes(search.toLowerCase())) ||
        (w.userNote && w.userNote.toLowerCase().includes(search.toLowerCase()));

      const matchTab = activeSubjectTab === 'ALL' || (w.subject || 'Chung') === activeSubjectTab;

      return matchSearch && matchTab;
    });
  }, [words, search, activeSubjectTab]);

  // Group filtered words by subject for 'grouped' view
  const groupedWords = useMemo(() => {
    const map: Record<string, StarredWord[]> = {};
    filteredWords.forEach((w) => {
      const sub = w.subject && w.subject.trim() ? w.subject.trim() : 'Chung';
      if (!map[sub]) map[sub] = [];
      map[sub].push(w);
    });
    return map;
  }, [filteredWords]);

  // Practice Mode Flashcard View
  if (isPracticeMode && practiceWords.length > 0) {
    const currentCard = practiceWords[cardIndex] || practiceWords[0];

    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIsPracticeMode(false)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Thoát lật thẻ ({cardIndex + 1}/{practiceWords.length})</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-indigo-500" />
              {practiceTitle}
            </span>
            <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/50 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              Ôn tập
            </span>
          </div>
        </div>

        {/* Card flip */}
        <div
          onClick={() => {
            sound.playFlip();
            setIsFlipped(!isFlipped);
          }}
          className={`w-full min-h-[320px] p-8 bg-white dark:bg-slate-900 border-2 rounded-3xl shadow-xl cursor-pointer transition-all duration-300 flex flex-col justify-between relative select-none ${
            isFlipped ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/20' : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase text-slate-400">
                {isFlipped ? 'Mặt sau (Bản dịch & Ghi chú)' : 'Mặt trước (Từ vựng)'}
              </span>
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                Môn: {currentCard.subject || 'Chung'}
              </span>
            </div>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <RotateCw className="w-3.5 h-3.5" /> Chạm để lật
            </span>
          </div>

          {!isFlipped ? (
            <div className="my-auto text-center space-y-4">
              <h2 className="text-3xl md:text-4xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                {currentCard.word}
              </h2>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSpeak(currentCard.word);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors cursor-pointer shadow-2xs"
              >
                <Volume2 className="w-4 h-4 text-indigo-500" />
                <span>Phát âm (US)</span>
              </button>
            </div>
          ) : (
            <div className="my-auto space-y-4 text-center">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Nghĩa Tiếng Việt:
                </span>
                <p className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                  {currentCard.translation}
                </p>
              </div>

              {currentCard.userNote && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 font-medium max-w-lg mx-auto">
                  💡 Ghi chú: {currentCard.userNote}
                </div>
              )}

              {currentCard.contextSentence && (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 max-w-lg mx-auto">
                  "{currentCard.contextSentence}"
                </p>
              )}
            </div>
          )}

          <div className="text-center text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
            Bấm "Chạm để lật" để kiểm tra xem bạn đã nhớ nghĩa từ này chưa
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setIsFlipped(false);
              setCardIndex((prev) => (prev > 0 ? prev - 1 : practiceWords.length - 1));
            }}
            className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 transition-all shadow-2xs"
          >
            ← Từ trước
          </button>

          <span className="text-xs font-bold text-slate-500">
            {cardIndex + 1} / {practiceWords.length}
          </span>

          <button
            type="button"
            onClick={() => {
              setIsFlipped(false);
              setCardIndex((prev) => (prev < practiceWords.length - 1 ? prev + 1 : 0));
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs transition-all"
          >
            Từ tiếp →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="p-6 md:p-8 bg-gradient-to-br from-amber-500/10 via-indigo-500/10 to-transparent border border-amber-200/80 dark:border-amber-900/50 rounded-3xl space-y-4 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500 text-white rounded-xl shadow-md">
                <Star className="w-5 h-5 fill-white" />
              </div>
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                Từ cần lưu ý ghi nhớ
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
              Các từ vựng, thuật ngữ được phân loại rõ ràng theo từng <b>Môn học</b>. Bạn có thể thêm, sửa, đổi môn hoặc lật thẻ ôn tập theo từng chuyên đề riêng!
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => handleOpenAddModal()}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
              title="Thêm một từ vựng / thuật ngữ cần nhớ vào danh mục"
            >
              <Plus className="w-4 h-4" />
              <span>+ Thêm từ mới</span>
            </button>

            {words.length > 0 && (
              <button
                type="button"
                onClick={() => handleStartPractice(activeSubjectTab)}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
              >
                <BookOpen className="w-4 h-4" />
                <span>
                  Lật Thẻ Ôn Tập ({activeSubjectTab === 'ALL' ? words.length : filteredWords.length})
                </span>
              </button>
            )}

            {words.length > 0 && (
              <button
                type="button"
                onClick={() => handleClearSubjectOrAll(activeSubjectTab)}
                className="px-3 py-2.5 text-rose-600 hover:text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="Xóa danh sách từ đã chọn"
              >
                <Trash2 className="w-4 h-4 inline sm:mr-1" />
                <span className="hidden sm:inline">
                  {activeSubjectTab === 'ALL' ? 'Xóa tất cả' : `Xóa môn ${activeSubjectTab}`}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Search Bar & View Mode Switcher */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm từ vựng, bản dịch, môn học hoặc ghi chú..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('grouped')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'grouped'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Phân loại theo từng mục / từng môn"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Chia theo Bộ đề / Môn</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Xem danh sách phẳng tất cả các từ"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Danh sách tổng</span>
            </button>
          </div>
        </div>
      </div>

      {/* Subject Filter Tabs */}
      {words.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveSubjectTab('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer shrink-0 ${
              activeSubjectTab === 'ALL'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Tất cả ({words.length})</span>
          </button>

          {subjects.map((sub) => {
            const count = words.filter((w) => (w.subject || 'Chung') === sub).length;
            const isActive = activeSubjectTab === sub;
            return (
              <button
                key={sub}
                type="button"
                onClick={() => setActiveSubjectTab(sub)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Tag className="w-3.5 h-3.5 text-indigo-400" />
                <span>{sub}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    isActive ? 'bg-indigo-800 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main List Rendering */}
      {words.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl space-y-4 max-w-md mx-auto my-8 shadow-2xs">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
            <Star className="w-8 h-8 fill-amber-400" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
              Chưa có từ cần lưu ý nào
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Bạn có thể bấm <b>"+ Thêm từ mới"</b> bên trên hoặc nhấp chuột vào bất kỳ từ nào khi làm bài thi để lưu lại theo từng môn học!
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleOpenAddModal()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition-all cursor-pointer shadow-xs"
            >
              + Thêm từ thủ công ngay
            </button>
            {onBackToDashboard && (
              <button
                type="button"
                onClick={onBackToDashboard}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 transition-all cursor-pointer"
              >
                Quay lại Bộ đề thi
              </button>
            )}
          </div>
        </div>
      ) : filteredWords.length === 0 ? (
        <div className="p-10 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 text-xs space-y-2">
          <p>Không tìm thấy từ vựng khớp với bộ lọc hiện tại.</p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setActiveSubjectTab('ALL');
            }}
            className="text-indigo-600 font-bold hover:underline cursor-pointer"
          >
            Xóa bộ lọc để xem tất cả
          </button>
        </div>
      ) : viewMode === 'grouped' ? (
        /* GROUPED VIEW: Separated by Subject categories */
        <div className="space-y-8">
          {Object.entries(groupedWords).map(([subjectName, items]) => (
            <div
              key={subjectName}
              className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4"
            >
              {/* Subject Group Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>Môn: {subjectName}</span>
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                        {items.length} từ ghi nhớ
                      </span>
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleOpenAddModal(subjectName)}
                    className="px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-all cursor-pointer"
                  >
                    + Thêm vào môn này
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStartPractice(subjectName)}
                    className="px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Lật thẻ ({items.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleClearSubjectOrAll(subjectName)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-all cursor-pointer"
                    title={`Xóa tất cả từ của môn ${subjectName}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Cards Grid for this subject */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {items.map((item) => (
                  <WordCard
                    key={item.id}
                    item={item}
                    onSpeak={handleSpeak}
                    onDelete={handleDelete}
                    onEdit={handleOpenEditModal}
                    onChangeSubject={(newSub) => {
                      updateWordSubject(item.id, newSub);
                      loadWords();
                    }}
                    allSubjects={allAvailableSubjects}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* FLAT GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredWords.map((item) => (
            <WordCard
              key={item.id}
              item={item}
              onSpeak={handleSpeak}
              onDelete={handleDelete}
              onEdit={handleOpenEditModal}
              onChangeSubject={(newSub) => {
                updateWordSubject(item.id, newSub);
                loadWords();
              }}
              allSubjects={allAvailableSubjects}
            />
          ))}
        </div>
      )}

      {/* ADD / EDIT WORD MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
                <span>{editingWordItem ? 'Chỉnh sửa từ cần lưu ý' : 'Thêm từ ghi nhớ mới'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWordForm} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Từ / Cụm từ cần lưu ý <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Binary Search, Algorithm, Phép đồng dư..."
                  value={formWord}
                  onChange={(e) => setFormWord(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Bản dịch / Định nghĩa Tiếng Việt:
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Thuật toán tìm kiếm nhị phân chia đôi không gian tìm kiếm..."
                  value={formTranslation}
                  onChange={(e) => setFormTranslation(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Môn học / Chuyên đề:</span>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-normal">
                    Chọn gợi ý hoặc gõ tên môn mới
                  </span>
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Ví dụ: Toán học, Lập trình C++, Mạng máy tính, Tiếng Anh..."
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {/* Quick Pick Subject Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {allAvailableSubjects.map((sub) => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setFormSubject(sub)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                          formSubject === sub
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  💡 Ghi chú ghi nhớ / Mẹo nhớ nhanh:
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú thêm kinh nghiệm, công thức liên quan, hay bẫy câu hỏi..."
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ngữ cảnh / Câu ví dụ (Tùy chọn):
                </label>
                <input
                  type="text"
                  placeholder="Câu hỏi hoặc ví dụ chứa từ này..."
                  value={formContext}
                  onChange={(e) => setFormContext(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingWordItem ? 'Lưu cập nhật' : 'Thêm từ ghi nhớ'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-component for individual Word Card
interface WordCardProps {
  item: StarredWord;
  onSpeak: (word: string) => void;
  onDelete: (id: string) => void;
  onEdit: (item: StarredWord) => void;
  onChangeSubject: (newSubject: string) => void;
  allSubjects: string[];
}

const WordCard: React.FC<WordCardProps> = ({
  item,
  onSpeak,
  onDelete,
  onEdit,
  onChangeSubject,
  allSubjects,
}) => {
  const [isChangingSubject, setIsChangingSubject] = useState(false);
  const [customSubject, setCustomSubject] = useState('');

  return (
    <div className="p-4 md:p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs hover:border-amber-300 dark:hover:border-amber-700 transition-all space-y-3 relative group">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-lg text-indigo-600 dark:text-indigo-400">
              {item.word}
            </span>
            <button
              type="button"
              onClick={() => onSpeak(item.word)}
              className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors cursor-pointer"
              title="Nghe phát âm (US)"
            >
              <Volume2 className="w-4 h-4" />
            </button>

            {/* Subject Pill / Change Trigger */}
            <button
              type="button"
              onClick={() => setIsChangingSubject(!isChangingSubject)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
              title="Bấm để đổi môn học cho từ này"
            >
              <Tag className="w-3 h-3 text-indigo-500" />
              <span>{item.subject || 'Chung'}</span>
            </button>
          </div>

          <p className="text-xs font-extrabold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-200/80 dark:border-amber-800/80 inline-block leading-relaxed">
            {item.translation}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-all cursor-pointer"
            title="Chỉnh sửa từ này"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(item.id)}
            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-all cursor-pointer opacity-80 group-hover:opacity-100"
            title="Xóa khỏi danh sách lưu ý"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Change Subject Dropdown */}
      {isChangingSubject && (
        <div className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2 animate-in fade-in duration-150">
          <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between">
            <span>Chuyển sang môn khác:</span>
            <button
              type="button"
              onClick={() => setIsChangingSubject(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
            {allSubjects.map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => {
                  onChangeSubject(sub);
                  setIsChangingSubject(false);
                }}
                className={`px-2 py-0.5 text-[10px] rounded-md font-semibold transition-all cursor-pointer ${
                  (item.subject || 'Chung') === sub
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-slate-900 hover:bg-indigo-50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (customSubject.trim()) {
                onChangeSubject(customSubject.trim());
                setCustomSubject('');
                setIsChangingSubject(false);
              }
            }}
            className="flex items-center gap-1 pt-1"
          >
            <input
              type="text"
              placeholder="+ Môn mới..."
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              className="flex-1 px-2 py-1 text-[10px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="px-2.5 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-md cursor-pointer"
            >
              Lưu
            </button>
          </form>
        </div>
      )}

      {item.contextSentence && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
          "{item.contextSentence}"
        </p>
      )}

      {/* User Custom Note Section */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>
            {item.userNote ? (
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                💡 {item.userNote}
              </span>
            ) : (
              <span className="text-slate-400 italic">Chưa có ghi chú cá nhân</span>
            )}
          </span>
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="text-indigo-600 hover:underline flex items-center gap-1 font-bold cursor-pointer ml-2 shrink-0"
          >
            <Edit3 className="w-3 h-3" />
            <span>{item.userNote ? 'Sửa' : '+ Ghi chú'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

