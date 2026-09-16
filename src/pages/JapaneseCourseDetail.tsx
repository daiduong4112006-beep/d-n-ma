import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Layers,
  FileText,
  FolderOpen,
  Plus,
  Play,
  Edit3,
  Trash2,
  Search,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import {
  JapaneseCourse,
  JapaneseLesson,
  JapaneseVocabCard,
  JapaneseKanjiCard,
  JapaneseGrammarPoint,
  JapaneseMaterial,
} from '../types/japanese';
import { JapaneseKanjiSection } from '../components/japanese/JapaneseKanjiSection';
import { JapaneseGrammarSection } from '../components/japanese/JapaneseGrammarSection';
import { JapaneseMaterialsSection } from '../components/japanese/JapaneseMaterialsSection';
import { JapaneseLessonDetail } from './JapaneseLessonDetail';
import { JapaneseLessonEditor } from './JapaneseLessonEditor';
import { JapaneseFlashcardMode } from '../components/japanese/JapaneseFlashcardMode';
import { JapaneseTypingMode } from '../components/japanese/JapaneseTypingMode';
import { JapaneseMultiChoiceMode } from '../components/japanese/JapaneseMultiChoiceMode';
import { JapaneseKanjiStudyMode } from '../components/japanese/JapaneseKanjiStudyMode';
import { sound } from '../utils/audio';

interface Props {
  course: JapaneseCourse;
  onBackToCourses: () => void;
  onUpdateCourse: (updated: JapaneseCourse) => void;
}

type CourseTab = 'vocabulary' | 'kanji' | 'grammar' | 'materials';
type ActiveSubView = 'tabs' | 'lesson-detail' | 'lesson-editor' | 'typing' | 'flashcard' | 'multichoice' | 'kanji-flashcard' | 'kanji-study';

export const JapaneseCourseDetail: React.FC<Props> = ({
  course,
  onBackToCourses,
  onUpdateCourse,
}) => {
  const [activeTab, setActiveTab] = useState<CourseTab>('vocabulary');
  const [activeSubView, setActiveSubView] = useState<ActiveSubView>('tabs');

  // Selected Lesson State
  const [selectedLesson, setSelectedLesson] = useState<JapaneseLesson | null>(null);
  const [lessonToEdit, setLessonToEdit] = useState<JapaneseLesson | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<JapaneseLesson | null>(null);
  const [vocabSearch, setVocabSearch] = useState('');
  const [vocabLessonFilter, setVocabLessonFilter] = useState<string>('ALL');
  const [typingFilter, setTypingFilter] = useState<'original' | 'mastered' | 'all'>('original');

  // Keep selectedLesson in sync when course prop updates from cloud or other devices
  useEffect(() => {
    if (selectedLesson) {
      const fresh = (course.lessons || []).find((l) => l.id === selectedLesson.id);
      if (fresh && JSON.stringify(fresh) !== JSON.stringify(selectedLesson)) {
        setSelectedLesson(fresh);
      }
    }
  }, [course]);

  // 1. Vocabulary Handlers
  const handleSelectLesson = (lesson: JapaneseLesson) => {
    setSelectedLesson(lesson);
    setActiveSubView('lesson-detail');
    sound.playClick();
  };

  const handleCreateNewLesson = () => {
    setLessonToEdit(null);
    setActiveSubView('lesson-editor');
  };

  const handleEditLesson = (lesson: JapaneseLesson, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLessonToEdit(lesson);
    setActiveSubView('lesson-editor');
  };

  const handleSaveLesson = (savedLesson: JapaneseLesson) => {
    const currentLessons = course.lessons || [];
    const idx = currentLessons.findIndex((l) => l.id === savedLesson.id);
    let updatedLessons: JapaneseLesson[];

    if (idx >= 0) {
      updatedLessons = [...currentLessons];
      updatedLessons[idx] = savedLesson;
    } else {
      updatedLessons = [savedLesson, ...currentLessons];
    }

    const updatedCourse: JapaneseCourse = {
      ...course,
      lessons: updatedLessons,
    };
    onUpdateCourse(updatedCourse);

    if (selectedLesson?.id === savedLesson.id) {
      setSelectedLesson(savedLesson);
    }
    setActiveSubView(selectedLesson ? 'lesson-detail' : 'tabs');
  };

  const handleDeleteLessonConfirm = () => {
    if (!lessonToDelete) return;
    const updatedLessons = (course.lessons || []).filter((l) => l.id !== lessonToDelete.id);
    const updatedCourse: JapaneseCourse = {
      ...course,
      lessons: updatedLessons,
    };
    onUpdateCourse(updatedCourse);

    if (selectedLesson?.id === lessonToDelete.id) {
      setSelectedLesson(null);
      setActiveSubView('tabs');
    }
    setLessonToDelete(null);
    sound.playClick();
  };

  const handleToggleCardMastery = (cardId: string, currentMastered: boolean) => {
    if (!selectedLesson) return;
    const updatedCards = selectedLesson.cards.map((c) =>
      c.id === cardId ? { ...c, mastered: !currentMastered } : c
    );
    const updatedLesson = { ...selectedLesson, cards: updatedCards };
    setSelectedLesson(updatedLesson);

    const updatedLessons = course.lessons.map((l) =>
      l.id === updatedLesson.id ? updatedLesson : l
    );
    onUpdateCourse({ ...course, lessons: updatedLessons });
    sound.playClick();
  };

  const handleSetCardMastery = (cardId: string, mastered: boolean) => {
    if (!selectedLesson) return;
    const updatedCards = selectedLesson.cards.map((c) =>
      c.id === cardId ? { ...c, mastered } : c
    );
    const updatedLesson = { ...selectedLesson, cards: updatedCards };
    setSelectedLesson(updatedLesson);

    const updatedLessons = course.lessons.map((l) =>
      l.id === updatedLesson.id ? updatedLesson : l
    );
    onUpdateCourse({ ...course, lessons: updatedLessons });
  };

  const handleSetKanjiMastery = (kanjiId: string, mastered: boolean) => {
    if (!selectedLesson) return;
    const updatedKanji = (selectedLesson.kanjiCore || []).map((k) =>
      k.id === kanjiId ? { ...k, mastered } : k
    );
    const updatedLesson = { ...selectedLesson, kanjiCore: updatedKanji };
    setSelectedLesson(updatedLesson);

    const updatedLessons = course.lessons.map((l) =>
      l.id === updatedLesson.id ? updatedLesson : l
    );
    const updatedCourseKanji = (course.kanjiList || []).map((k) =>
      k.id === kanjiId ? { ...k, mastered } : k
    );
    onUpdateCourse({ ...course, lessons: updatedLessons, kanjiList: updatedCourseKanji });
  };

  const handleToggleKanjiMastery = (kanjiId: string, currentMastered: boolean) => {
    if (!selectedLesson) return;
    const updatedKanji = (selectedLesson.kanjiCore || []).map((k) =>
      k.id === kanjiId ? { ...k, mastered: !currentMastered } : k
    );
    const updatedLesson = { ...selectedLesson, kanjiCore: updatedKanji };
    setSelectedLesson(updatedLesson);

    const updatedLessons = course.lessons.map((l) =>
      l.id === updatedLesson.id ? updatedLesson : l
    );
    const updatedCourseKanji = (course.kanjiList || []).map((k) =>
      k.id === kanjiId ? { ...k, mastered: !currentMastered } : k
    );
    onUpdateCourse({ ...course, lessons: updatedLessons, kanjiList: updatedCourseKanji });
    sound.playClick();
  };

  // 2. Kanji Handlers
  const handleUpdateKanjiList = (updatedKanji: JapaneseKanjiCard[]) => {
    onUpdateCourse({ ...course, kanjiList: updatedKanji });
  };

  const handleUpdateKanjiVocabList = (updatedVocab: JapaneseVocabCard[]) => {
    onUpdateCourse({ ...course, kanjiVocabList: updatedVocab });
  };

  // 3. Grammar Handlers
  const handleUpdateGrammar = (updatedGrammar: JapaneseGrammarPoint[]) => {
    onUpdateCourse({ ...course, grammarPoints: updatedGrammar });
  };

  // 4. Materials Handlers
  const handleUpdateMaterials = (updatedMaterials: JapaneseMaterial[], deletedId?: string) => {
    const deletedMaterialIds = Array.isArray(course.deletedMaterialIds)
      ? [...course.deletedMaterialIds]
      : [];
    if (deletedId && !deletedMaterialIds.includes(deletedId)) {
      deletedMaterialIds.push(deletedId);
    }
    onUpdateCourse({ ...course, materials: updatedMaterials, deletedMaterialIds });
  };

  // Subview renders (Practicing lessons)
  if (activeSubView === 'lesson-editor') {
    return (
      <JapaneseLessonEditor
        lessonToEdit={lessonToEdit}
        onSave={handleSaveLesson}
        onCancel={() => {
          setActiveSubView(selectedLesson ? 'lesson-detail' : 'tabs');
        }}
      />
    );
  }

  if (activeSubView === 'typing' && selectedLesson) {
    return (
      <JapaneseTypingMode
        lesson={selectedLesson}
        initialFilter={typingFilter}
        onExit={() => setActiveSubView('lesson-detail')}
        onCardMastered={handleSetCardMastery}
      />
    );
  }

  if (activeSubView === 'flashcard' && selectedLesson) {
    return (
      <JapaneseFlashcardMode
        lesson={selectedLesson}
        onExit={() => setActiveSubView('lesson-detail')}
        onCardMastered={handleSetCardMastery}
      />
    );
  }

  if (activeSubView === 'multichoice' && selectedLesson) {
    return (
      <JapaneseMultiChoiceMode
        lesson={selectedLesson}
        onExit={() => setActiveSubView('lesson-detail')}
      />
    );
  }

  if (activeSubView === 'kanji-flashcard' && selectedLesson) {
    return (
      <JapaneseFlashcardMode
        kanjiCards={selectedLesson.kanjiCore || []}
        title={`Flashcard Chữ Hán • ${selectedLesson.title}`}
        storageId={`kanji_flashcard_${selectedLesson.id}`}
        onExit={() => setActiveSubView('lesson-detail')}
        onCardMastered={handleSetKanjiMastery}
      />
    );
  }

  if (activeSubView === 'kanji-study' && selectedLesson) {
    return (
      <JapaneseKanjiStudyMode
        kanjiCards={selectedLesson.kanjiCore || []}
        title={`Study Mode • ${selectedLesson.title}`}
        onExit={() => setActiveSubView('lesson-detail')}
        onKanjiMastered={handleSetKanjiMastery}
      />
    );
  }

  if (activeSubView === 'lesson-detail' && selectedLesson) {
    return (
      <>
        <JapaneseLessonDetail
          lesson={selectedLesson}
          courseCode={course.code || 'jpd123'}
          onBack={() => {
            setSelectedLesson(null);
            setActiveSubView('tabs');
          }}
          onStartMode={(mode, filter) => {
            if (mode === 'typing' && filter) {
              setTypingFilter(filter);
            }
            setActiveSubView(mode);
          }}
          onEditLesson={() => handleEditLesson(selectedLesson)}
          onDeleteLesson={() => setLessonToDelete(selectedLesson)}
          onToggleMastery={handleToggleCardMastery}
        />

        {/* Delete Confirmation Modal for Lesson Detail */}
        {lessonToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white">
                    Xóa bài học này?
                  </h4>
                  <p className="text-xs text-slate-500 truncate max-w-[200px]">
                    {lessonToDelete.title}
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bài học và danh sách từ vựng sẽ bị xóa khỏi khóa học. Bạn có chắc chắn muốn xóa không?
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setLessonToDelete(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleDeleteLessonConfirm}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black cursor-pointer shadow-md shadow-rose-600/30"
                >
                  Xóa bài
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Filter lessons in vocabulary tab
  const filteredLessons = (course.lessons || []).filter((l) => {
    if (vocabLessonFilter !== 'ALL') {
      const num = vocabLessonFilter.replace('Bài ', '');
      const matches =
        l.title.includes(vocabLessonFilter) ||
        l.title.startsWith(`${num}-`) ||
        l.title.includes(`${num}.`) ||
        (l.lessonCode && l.lessonCode.includes(num));
      if (!matches) return false;
    }
    const q = vocabSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      l.title.toLowerCase().includes(q) ||
      (l.lessonCode && l.lessonCode.toLowerCase().includes(q)) ||
      l.description.toLowerCase().includes(q) ||
      l.cards.some(
        (c) =>
          c.term.toLowerCase().includes(q) ||
          (c.reading && c.reading.toLowerCase().includes(q)) ||
          c.definition.toLowerCase().includes(q)
      )
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Course Header */}
      <div className="p-6 rounded-3xl bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <button
              type="button"
              onClick={onBackToCourses}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại danh sách khóa học</span>
            </button>

            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-xl bg-orange-500 text-white font-black text-xs tracking-wider shadow-sm">
                {course.code || 'JPD 123'}
              </span>
              <span className="text-xs text-indigo-300 font-bold">
                Level: {course.level || 'Cơ bản'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {course.title || 'Tiếng Nhật JPD 123'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {course.description || 'Thư mục tài liệu tổng hợp bao gồm Từ vựng, Chữ Hán, Ngữ pháp và Tài liệu học tập.'}
            </p>
          </div>

          {/* Quick Info Badges */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="px-3.5 py-2 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10 text-center">
              <span className="text-lg font-black block text-sky-400">
                {course.lessons?.length || 0}
              </span>
              <span className="text-[10px] font-bold text-slate-300 uppercase">Bài học</span>
            </div>
            <div className="px-3.5 py-2 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10 text-center">
              <span className="text-lg font-black block text-rose-400">
                {course.kanjiList?.length || 0}
              </span>
              <span className="text-[10px] font-bold text-slate-300 uppercase">Chữ Hán</span>
            </div>
            <div className="px-3.5 py-2 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10 text-center">
              <span className="text-lg font-black block text-indigo-400">
                {course.grammarPoints?.length || 0}
              </span>
              <span className="text-[10px] font-bold text-slate-300 uppercase">Ngữ pháp</span>
            </div>
            <div className="px-3.5 py-2 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10 text-center">
              <span className="text-lg font-black block text-emerald-400">
                {course.materials?.length || 0}
              </span>
              <span className="text-[10px] font-bold text-slate-300 uppercase">Tài liệu</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 MAIN TABS NAVIGATION (Từ vựng, Chữ Hán, Ngữ pháp, Tài liệu học tập) */}
      <div className="p-1.5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-2 overflow-x-auto">
        {/* Tab 1: Từ vựng */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('vocabulary');
            sound.playClick();
          }}
          className={`flex-1 min-w-[140px] py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'vocabulary'
              ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Từ vựng ({course.lessons?.length || 0})</span>
        </button>

        {/* Tab 2: Chữ Hán */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('kanji');
            sound.playClick();
          }}
          className={`flex-1 min-w-[140px] py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'kanji'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <span className="text-sm font-serif leading-none">🈲</span>
          <span>Chữ Hán ({course.kanjiList?.length || 0})</span>
        </button>

        {/* Tab 3: Ngữ pháp */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('grammar');
            sound.playClick();
          }}
          className={`flex-1 min-w-[140px] py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'grammar'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Ngữ pháp ({course.grammarPoints?.length || 0})</span>
        </button>

        {/* Tab 4: Tài liệu học tập */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('materials');
            sound.playClick();
          }}
          className={`flex-1 min-w-[150px] py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'materials'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Tài liệu ({course.materials?.length || 0})</span>
        </button>
      </div>

      {/* TAB 1: TỪ VỰNG (VOCABULARY LESSONS) */}
      {activeTab === 'vocabulary' && (
        <div className="space-y-6">
          {/* Action header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                SELECT A LESSON TO BEGIN
              </span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Các bài học từ vựng
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={vocabSearch}
                  onChange={(e) => setVocabSearch(e.target.value)}
                  placeholder="Tìm kiếm bài học..."
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-xs"
                />
              </div>

              <button
                type="button"
                onClick={handleCreateNewLesson}
                className="px-4 py-2.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black shadow-md shadow-orange-500/30 flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo bài học</span>
              </button>
            </div>
          </div>

          {/* Quick Lesson Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'ALL', label: 'Tất cả bài', count: (course.lessons || []).length },
              {
                id: 'Bài 4',
                label: 'Bài 4',
                count: (course.lessons || []).filter(
                  (l) => l.title.includes('Bài 4') || l.title.startsWith('4-') || l.lessonCode?.includes('4-')
                ).length,
              },
              {
                id: 'Bài 5',
                label: 'Bài 5',
                count: (course.lessons || []).filter(
                  (l) => l.title.includes('Bài 5') || l.title.startsWith('5-') || l.lessonCode?.includes('5-')
                ).length,
              },
              {
                id: 'Bài 6',
                label: 'Bài 6',
                count: (course.lessons || []).filter(
                  (l) => l.title.includes('Bài 6') || l.title.startsWith('6-') || l.lessonCode?.includes('6-')
                ).length,
              },
              {
                id: 'Bài 7',
                label: 'Bài 7',
                count: (course.lessons || []).filter(
                  (l) => l.title.includes('Bài 7') || l.title.startsWith('7-') || l.lessonCode?.includes('7-')
                ).length,
              },
            ].map((pill) => {
              const isSelected = vocabLessonFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => {
                    setVocabLessonFilter(pill.id);
                    sound.playClick();
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{pill.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      isSelected
                        ? 'bg-orange-600/80 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {pill.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Lessons Grid */}
          {filteredLessons.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-800 dark:text-slate-200">
                  {vocabSearch ? 'Không tìm thấy bài học phù hợp' : 'Chưa có bài học từ vựng nào trong khóa học này'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                  Hãy bấm nút &quot;Tạo bài học&quot; để thêm các bài từ vựng mới cho khóa học {course.code}.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCreateNewLesson}
                className="px-5 py-2.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black shadow-md shadow-orange-500/30 inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo bài học mới</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLessons.map((lesson) => (
                <div
                  key={lesson.id}
                  onClick={() => handleSelectLesson(lesson)}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-orange-300 dark:hover:border-orange-900/60 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-sky-400 via-blue-500 to-indigo-600 text-white flex flex-col items-center justify-center shrink-0 shadow-xs relative overflow-hidden select-none">
                      <span className="text-[12px] leading-none mb-0.5">🌸</span>
                      <span className="text-[9px] font-black tracking-wider leading-none">
                        TỪ VỰNG
                      </span>
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          {lesson.lessonCode || 'LESSON'}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white truncate group-hover:text-orange-500 transition-colors">
                        {lesson.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {lesson.cards.length} từ vựng
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 ml-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectLesson(lesson);
                      }}
                      className="w-9 h-9 rounded-xl bg-linear-to-r from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-500/30 group-hover:scale-105 active:scale-95 cursor-pointer"
                      title="Mở bài học"
                    >
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleEditLesson(lesson, e)}
                      className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Chỉnh sửa bài học"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLessonToDelete(lesson);
                      }}
                      className="p-2 rounded-xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                      title="Xóa bài học"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CHỮ HÁN (KANJI) */}
      {activeTab === 'kanji' && (
        <JapaneseKanjiSection
          kanjiList={course.kanjiList || []}
          kanjiVocabList={course.kanjiVocabList || []}
          courseCode={course.code || 'JPD123'}
          onBackToCourse={onBackToCourses}
          onUpdateKanjiList={handleUpdateKanjiList}
          onUpdateKanjiVocabList={handleUpdateKanjiVocabList}
        />
      )}

      {/* TAB 3: NGỮ PHÁP (GRAMMAR WITH ATTACHED FILES) */}
      {activeTab === 'grammar' && (
        <JapaneseGrammarSection
          grammarPoints={course.grammarPoints || []}
          onUpdateGrammarPoints={handleUpdateGrammar}
        />
      )}

      {/* TAB 4: TÀI LIỆU HỌC TẬP (LEARNING MATERIALS & UPLOADED FILES) */}
      {activeTab === 'materials' && (
        <JapaneseMaterialsSection
          materials={course.materials || []}
          onUpdateMaterials={handleUpdateMaterials}
        />
      )}

      {/* CONFIRM DELETE LESSON MODAL */}
      {lessonToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  Xóa bài học này?
                </h4>
                <p className="text-xs text-slate-500 truncate max-w-[200px]">
                  {lessonToDelete.title}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLessonToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDeleteLessonConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black cursor-pointer"
              >
                Xóa bài
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
