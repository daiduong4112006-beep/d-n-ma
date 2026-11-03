import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Layers,
  FileText,
  Plus,
  Play,
  Edit3,
  Trash2,
  Search,
  Sparkles,
  AlertTriangle,
  Mic,
  FileStack,
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
import { JapaneseLessonDetail } from './JapaneseLessonDetail';
import { JapaneseLessonEditor } from './JapaneseLessonEditor';
import { JapaneseFlashcardMode } from '../components/japanese/JapaneseFlashcardMode';
import { JapaneseTypingMode } from '../components/japanese/JapaneseTypingMode';
import { JapaneseMultiChoiceMode } from '../components/japanese/JapaneseMultiChoiceMode';
import { JapaneseKanjiStudyMode } from '../components/japanese/JapaneseKanjiStudyMode';
import { JapaneseSpeakingSection, SPK_GROUPS } from '../components/japanese/JapaneseSpeakingSection';
import { JapaneseExamBankSection, ExamBankStats } from '../components/japanese/JapaneseExamBankSection';
import { SectionHeader, FilterChip, ToneButton, ProgressRing, TONE, CourseTone } from '../components/japanese/courseUi';
import { sound } from '../utils/audio';

interface Props {
  course: JapaneseCourse;
  onBackToCourses: () => void;
  onUpdateCourse: (updated: JapaneseCourse) => void;
  /** Chỉ dùng cho bản demo một file: HTML Ôn SPK nhúng sẵn */
  speakingSrcDoc?: string;
}

type CourseTab = 'vocabulary' | 'kanji' | 'grammar' | 'speaking' | 'exam-bank';
type ActiveSubView = 'tabs' | 'lesson-detail' | 'lesson-editor' | 'typing' | 'typing-example' | 'flashcard' | 'multichoice' | 'kanji-flashcard' | 'kanji-study';

export const JapaneseCourseDetail: React.FC<Props> = ({
  course,
  onBackToCourses,
  onUpdateCourse,
  speakingSrcDoc,
}) => {
  const [activeTab, setActiveTab] = useState<CourseTab>('vocabulary');
  // Ôn SPK & Source FE chỉ có trong khóa JPD123
  const isJpd123 =
    course.id === 'course-jpd123' || (course.code || '').toLowerCase().replace(/\s+/g, '') === 'jpd123';
  const [activeSubView, setActiveSubView] = useState<ActiveSubView>('tabs');

  // Selected Lesson State
  const [selectedLesson, setSelectedLesson] = useState<JapaneseLesson | null>(null);
  const [lessonToEdit, setLessonToEdit] = useState<JapaneseLesson | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<JapaneseLesson | null>(null);
  const [vocabSearch, setVocabSearch] = useState('');
  const [vocabLessonFilter, setVocabLessonFilter] = useState<string>('ALL');
  // Mục con đang chọn của từng mục (điều khiển từ thanh bên trái)
  const [kanjiFolder, setKanjiFolder] = useState<string | null>(null);
  const [grammarFilter, setGrammarFilter] = useState<string>('ALL');
  const [spkRoute, setSpkRoute] = useState<string>('home');
  const [spkCounts, setSpkCounts] = useState<Record<string, string>>({});
  const [feCat, setFeCat] = useState<string>('');
  const [feStats, setFeStats] = useState<ExamBankStats | null>(null);
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
        initialDirection="vi-to-jp"
        onExit={() => setActiveSubView('lesson-detail')}
        onCardMastered={handleSetCardMastery}
      />
    );
  }

  if (activeSubView === 'typing-example' && selectedLesson) {
    return (
      <JapaneseTypingMode
        lesson={selectedLesson}
        isExampleMode={true}
        initialDirection="vi-to-jp"
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

  // ---- Tiến độ từng mục (hiển thị ở thanh điều hướng bên trái) ----
  const allCards = (course.lessons || []).flatMap((l) => l.cards || []);
  const vocabMastered = allCards.filter((c) => c.mastered).length;
  const kanjiTotal = (course.kanjiList || []).length;
  const kanjiMastered = (course.kanjiList || []).filter((k) => k.mastered).length;
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
  const readLS = (key: string) => {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null');
    } catch {
      return null;
    }
  };
  const spkState = readLS('jpd123_v1');
  const spkLearned = spkState?.learned ? Object.keys(spkState.learned).length : 0;
  const fePicks = readLS('jpd-bank-picks') || {};
  const feDone = Object.keys(fePicks).length;
  const overall = pct(vocabMastered + kanjiMastered, allCards.length + kanjiTotal);

  type SubItem = { key: string; label: string; count?: string | number; group?: string };
  const lessonCount = (n: string) =>
    (course.lessons || []).filter((l) => l.title.includes(`Bài ${n}`) || l.title.startsWith(`${n}-`) || l.lessonCode?.includes(`${n}-`)).length;
  const kanjiCount = (tag: string) => (course.kanjiList || []).filter((k) => (k.lessonTag || 'L4') === tag).length;
  const grammarCount = (tag: string) => (course.grammarPoints || []).filter((g) => g.lessonTag === tag).length;
  const KANJI_FOLDER_TITLES: Record<string, string> = {
    L4: 'Địa điểm & Phương hướng',
    L5: 'Hành động & Nghỉ ngơi',
    L6: 'Giao tiếp & Sinh hoạt',
    L7: 'Tự nhiên & Cơ bản',
  };
  const SUBS: Record<CourseTab, { items: SubItem[]; value: string; set: (k: string) => void }> = {
    vocabulary: {
      items: [{ key: 'ALL', label: 'Tất cả bài', count: (course.lessons || []).length }, ...['4', '5', '6', '7'].map((n) => ({ key: `Bài ${n}`, label: `Bài ${n}`, count: lessonCount(n) }))],
      value: vocabLessonFilter,
      set: setVocabLessonFilter,
    },
    kanji: {
      items: [
        { key: '', label: 'Tổng quan 4 thư mục' },
        ...['L4', 'L5', 'L6', 'L7'].map((t) => ({ key: t, label: `Bài ${t.slice(1)} · ${KANJI_FOLDER_TITLES[t]}`, count: kanjiCount(t) })),
        { key: 'ALL', label: 'Toàn bộ chữ Hán', count: kanjiTotal },
      ],
      value: kanjiFolder ?? '',
      set: (k) => setKanjiFolder(k || null),
    },
    grammar: {
      items: [{ key: 'ALL', label: 'Tất cả bài', count: (course.grammarPoints || []).length }, ...['4', '5', '6', '7'].map((n) => ({ key: `Bài ${n}`, label: `Bài ${n}`, count: grammarCount(`Bài ${n}`) }))],
      value: grammarFilter,
      set: setGrammarFilter,
    },
    speaking: {
      items: SPK_GROUPS.flatMap((g) => g.items.map((it) => ({ key: it.k, label: it.label, group: g.label, count: spkCounts[it.k] }))),
      value: spkRoute,
      set: setSpkRoute,
    },
    'exam-bank': {
      items: [
        { key: '', label: 'Tất cả dạng', count: feStats?.total ?? 880 },
        ...Object.entries(feStats?.categories || {}).map(([c, n]) => ({ key: c, label: c, count: n })),
      ],
      value: feCat,
      set: setFeCat,
    },
  };

  const NAV: {
    id: CourseTab;
    tone: CourseTone;
    icon: React.ReactNode;
    label: string;
    sub: string;
    progress?: number;
  }[] = [
    { id: 'vocabulary', tone: 'orange', icon: <BookOpen className="w-5 h-5" />, label: 'Từ vựng', sub: `${course.lessons?.length || 0} bài · ${allCards.length} từ`, progress: pct(vocabMastered, allCards.length) },
    { id: 'kanji', tone: 'rose', icon: <span className="font-japanese font-black text-lg leading-none">漢</span>, label: 'Chữ Hán', sub: `${kanjiTotal} chữ · ${(course.kanjiVocabList || []).length} từ ghép`, progress: pct(kanjiMastered, kanjiTotal) },
    { id: 'grammar', tone: 'indigo', icon: <FileText className="w-5 h-5" />, label: 'Ngữ pháp', sub: `${course.grammarPoints?.length || 0} mẫu câu` },
    ...(isJpd123
      ? ([
          { id: 'speaking', tone: 'emerald', icon: <Mic className="w-5 h-5" />, label: 'Ôn SPK', sub: 'Thi nói · 48 câu · 24 tranh', progress: pct(spkLearned, 48) },
          { id: 'exam-bank', tone: 'sky', icon: <FileStack className="w-5 h-5" />, label: 'Source FE', sub: `Đề cuối kỳ · ${feStats?.done ?? feDone}/880 đã làm`, progress: pct(feStats?.done ?? feDone, 880) },
        ] as const)
      : []),
  ];

  const lessonNumOf = (l: JapaneseLesson) => {
    const m = (l.lessonCode || l.title).match(/(\d+)/);
    return m ? m[1] : '';
  };

  return (
    <div className="animate-in fade-in duration-200">
      <div className="grid lg:grid-cols-[288px_minmax(0,1fr)] gap-6 items-start">
        {/* ================= THANH KHÓA HỌC BÊN TRÁI ================= */}
        <aside className="lg:sticky lg:top-6 space-y-4 min-w-0">
          {/* Thẻ khóa học */}
          <div className="relative overflow-hidden rounded-3xl p-5 bg-slate-900 text-white border border-slate-800">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-4 -bottom-10 font-japanese font-black text-[140px] leading-none text-white/[0.04] select-none"
            >
              日本
            </span>
            <button
              type="button"
              onClick={onBackToCourses}
              className="relative inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Tất cả khóa học</span>
            </button>
            <div className="relative mt-4 flex items-center gap-4">
              <ProgressRing value={overall} size={68} stroke={6} className="text-orange-500">
                <span className="text-base font-black leading-none">{overall}%</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">đã nhớ</span>
              </ProgressRing>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-orange-500 text-white font-black text-[10px] tracking-wider">
                    {course.code || 'JPD 123'}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">{course.level || 'Cơ bản'}</span>
                </div>
                <h1 className="mt-1.5 text-lg font-black leading-snug tracking-tight">
                  {course.title || 'Tiếng Nhật JPD 123'}
                </h1>
              </div>
            </div>
            <p className="relative mt-3 text-xs text-slate-400 leading-relaxed hidden lg:block">
              {course.description || 'Khóa học tiếng Nhật tổng hợp bao gồm Từ vựng, Chữ Hán và Ngữ pháp.'}
            </p>
          </div>

          {/* Điều hướng 5 mục */}
          <nav
            aria-label="Các mục của khóa học"
            className="flex lg:flex-col gap-2 overflow-x-auto pb-1 lg:pb-0 lg:p-2 lg:rounded-3xl lg:bg-white lg:dark:bg-slate-900 lg:border lg:border-slate-200 lg:dark:border-slate-800"
          >
            {NAV.map((n) => {
              const active = activeTab === n.id;
              const sub = SUBS[n.id];
              return (
                <div key={n.id} className="shrink-0 lg:shrink">
                <button
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => {
                    setActiveTab(n.id);
                    sound.playClick();
                  }}
                  className={`group relative shrink-0 lg:w-full flex items-center gap-3 p-2.5 pr-3 rounded-2xl text-left transition-all cursor-pointer ${
                    active
                      ? `bg-slate-900 dark:bg-slate-800 text-white shadow-lg ring-1 ${TONE[n.tone].ring}`
                      : 'bg-white dark:bg-slate-900 lg:bg-transparent lg:dark:bg-transparent border border-slate-200 dark:border-slate-800 lg:border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      active ? `${TONE[n.tone].bar} text-white` : `${TONE[n.tone].soft} ${TONE[n.tone].text}`
                    }`}
                  >
                    {n.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black leading-tight">{n.label}</span>
                    <span className={`block text-[11px] font-semibold truncate ${active ? 'text-slate-300' : 'text-slate-400'}`}>
                      {n.sub}
                    </span>
                    {n.progress !== undefined && (
                      <span className="hidden lg:block mt-1.5 h-1 rounded-full bg-slate-200 dark:bg-slate-700/70 overflow-hidden">
                        <span className={`block h-full rounded-full ${TONE[n.tone].bar}`} style={{ width: `${n.progress}%` }} />
                      </span>
                    )}
                  </span>
                  {n.progress !== undefined && (
                    <span className={`hidden lg:block text-[10px] font-black ${active ? 'text-white' : 'text-slate-400'}`}>
                      {n.progress}%
                    </span>
                  )}
                </button>
                {/* Mục con của mục đang mở (máy tính) */}
                {active && sub && sub.items.length > 1 && (
                  <div className="hidden lg:block mt-1 mb-2 ml-7 pl-3 border-l-2 border-slate-200 dark:border-slate-800 space-y-0.5">
                    {sub.items.map((it, i) => {
                      const on = sub.value === it.key;
                      const showGroup = it.group && it.group !== sub.items[i - 1]?.group;
                      return (
                        <React.Fragment key={it.key || '_'}>
                          {showGroup && (
                            <span className="block pt-2 pb-0.5 pl-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                              {it.group}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              sub.set(it.key);
                              sound.playClick();
                            }}
                            className={`relative w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left text-[13px] transition-all cursor-pointer ${
                              on
                                ? `${TONE[n.tone].soft} ${TONE[n.tone].text} font-black`
                                : 'text-slate-500 dark:text-slate-400 font-semibold hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            {on && <span className={`absolute -left-[15px] top-1.5 bottom-1.5 w-[3px] rounded-full ${TONE[n.tone].bar}`} />}
                            <span className="flex-1 truncate">{it.label}</span>
                            {it.count !== undefined && it.count !== '' && (
                              <span className="text-[10px] font-black opacity-70">{it.count}</span>
                            )}
                          </button>
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
                </div>
              );
            })}
          </nav>

          {/* Mục con trên điện thoại / máy tính bảng: một hàng vuốt ngang */}
          {SUBS[activeTab] && SUBS[activeTab].items.length > 1 && (
            <div className="lg:hidden flex gap-2 overflow-x-auto pb-1">
              {SUBS[activeTab].items.map((it) => {
                const tone = NAV.find((x) => x.id === activeTab)?.tone || 'orange';
                return (
                  <FilterChip
                    key={it.key || '_'}
                    tone={tone}
                    active={SUBS[activeTab].value === it.key}
                    label={it.label}
                    count={typeof it.count === 'number' ? it.count : undefined}
                    onClick={() => SUBS[activeTab].set(it.key)}
                  />
                );
              })}
            </div>
          )}
        </aside>

        {/* ================= NỘI DUNG MỤC ĐANG CHỌN ================= */}
        <main className="min-w-0 space-y-6">
      {/* TAB 1: TỪ VỰNG (VOCABULARY LESSONS) */}
      {activeTab === 'vocabulary' && (
        <div className="space-y-5">
          <SectionHeader
            tone="orange"
            icon={<BookOpen className="w-6 h-6" />}
            eyebrow="Mục 1 · Từ vựng"
            title="Các bài học từ vựng"
            desc={`Chọn một bài để học bằng Flashcard, Luyện gõ, Gõ ví dụ hoặc Trắc nghiệm. Đã nhớ ${vocabMastered}/${allCards.length} từ.`}
            actions={
              <>
                <div className="relative w-full sm:w-60">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={vocabSearch}
                    onChange={(e) => setVocabSearch(e.target.value)}
                    placeholder="Tìm bài, từ vựng, nghĩa…"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                  />
                </div>
                <ToneButton tone="orange" onClick={handleCreateNewLesson}>
                  <Plus className="w-4 h-4" /> Tạo bài học
                </ToneButton>
              </>
            }
          />

          {filteredLessons.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 space-y-4">
              <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-800 dark:text-slate-200">
                  {vocabSearch ? 'Không tìm thấy bài học phù hợp' : 'Chưa có bài học từ vựng nào trong khóa học này'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                  Bấm &quot;Tạo bài học&quot; để thêm bài từ vựng mới cho khóa {course.code}.
                </p>
              </div>
              <ToneButton tone="orange" onClick={handleCreateNewLesson}>
                <Plus className="w-4 h-4" /> Tạo bài học mới
              </ToneButton>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredLessons.map((lesson) => {
                const total = lesson.cards.length;
                const mem = lesson.cards.filter((c) => c.mastered).length;
                const p = pct(mem, total);
                const num = lessonNumOf(lesson);
                const [head, ...rest] = lesson.title.split(':');
                const jpTitle = rest.length ? rest.join(':').replace(/\(.*\)\s*$/, '').trim() : lesson.title;
                const viTitle = (lesson.title.match(/\(([^)]*)\)\s*$/) || [])[1] || lesson.description || '';
                return (
                  <div
                    key={lesson.id}
                    onClick={() => handleSelectLesson(lesson)}
                    className="group relative overflow-hidden p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-orange-300 dark:hover:border-orange-500/40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-500/5 transition-all cursor-pointer flex flex-col gap-3"
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-2 -top-6 text-[96px] font-black leading-none text-slate-100 dark:text-slate-800/60 select-none"
                    >
                      {num}
                    </span>
                    <div className="relative flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] font-black tracking-wider uppercase">
                        {lesson.lessonCode || head || 'LESSON'}
                      </span>
                      <span className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => handleEditLesson(lesson, e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
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
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
                          title="Xóa bài học"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </span>
                    </div>
                    <div className="relative min-w-0">
                      <h4 className="text-lg font-black text-slate-900 dark:text-white font-japanese truncate group-hover:text-orange-500 transition-colors">
                        {jpTitle}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{viTitle}</p>
                    </div>
                    <div className="relative mt-auto space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-500 dark:text-slate-400">{total} từ vựng</span>
                        <span className={p >= 80 ? 'text-emerald-500' : 'text-slate-400'}>
                          {mem ? `${mem}/${total} đã nhớ` : 'Chưa học'}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${p >= 80 ? 'bg-emerald-500' : 'bg-orange-500'}`}
                          style={{ width: `${p}%` }}
                        />
                      </div>
                    </div>
                    <div className="relative flex items-center justify-between pt-1">
                      <span className="text-[11px] font-bold text-slate-400">Flashcard · Gõ · Trắc nghiệm</span>
                      <span className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/30 group-hover:scale-110 transition-transform">
                        <Play className="w-4 h-4 fill-white ml-0.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
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
          folder={kanjiFolder}
          onFolderChange={setKanjiFolder}
        />
      )}

      {/* TAB 3: NGỮ PHÁP (GRAMMAR WITH ATTACHED FILES) */}
      {activeTab === 'grammar' && (
        <JapaneseGrammarSection
          grammarPoints={course.grammarPoints || []}
          onUpdateGrammarPoints={handleUpdateGrammar}
          lessonFilter={grammarFilter}
          onLessonFilterChange={setGrammarFilter}
        />
      )}

      {/* TAB 4: ÔN SPK */}
      {isJpd123 && activeTab === 'speaking' && (
        <JapaneseSpeakingSection srcDoc={speakingSrcDoc} route={spkRoute} onRouteChange={setSpkRoute} onCounts={setSpkCounts} />
      )}

      {/* TAB 5: SOURCE FE */}
      {isJpd123 && activeTab === 'exam-bank' && (
        <JapaneseExamBankSection category={feCat} onCategoryChange={setFeCat} onStats={setFeStats} />
      )}

        </main>
      </div>

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
