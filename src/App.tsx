import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { Quiz, QuizAttempt, Question, WrongQuestionDetail, GlobalStatistics, StudyOptions } from './types/quiz';
import {
  getQuizzes,
  saveQuiz,
  saveQuizzes,
  deleteQuiz,
  saveAttempt,
  getWrongQuestionsList,
  getGlobalStatistics,
  resetToDemoData,
  getEffectiveUserId,
  clearAllUserData,
  getDeletedQuizIds,
  transferGuestDataToUser,
  updateAllFlashcardProgressFromCloud,
  updateAllQuizLearningProgressFromCloud,
  updatePracticeMistakesProgressFromCloud,
} from './utils/storage';
import { getSubjectsList } from './utils/statistics';
import {
  auth,
  onAuthStateChanged,
  subscribeQuizzes,
  subscribeAttempts,
  subscribeUserDoc,
  subscribeStarredVocabulary,
  subscribeJapaneseCourses,
  subscribeStudyProgress,
  subscribeAllFlashcardProgress,
  subscribeAllQuizLearningProgress,
  subscribePracticeMistakesProgress,
  subscribeJpd123AccessList,
  flushAllPendingProgressSync,
  syncQuizToFirestore,
  flushQuizWrites,
  saveUserToFirestore,
  logoutUser,
  deleteCurrentUserAccount,
  deleteUserFromFirestore,
  wipeAllServerCollections,
  saveUserSettingsToFirestore,
  getUserSettingsFromFirestore,
  syncJapaneseCourseToFirestore,
} from './lib/firebase';
import { sound } from './utils/audio';
import { updateStarredWordsFromCloud } from './utils/vocabulary';
import { saveJapaneseCourses, saveAllowedJpd123Emails, canAccessJpd123, DEFAULT_JPD123_COURSE } from './utils/japaneseStorage';
import { updateStudyProgressFromCloud } from './utils/studyProgressStorage';

// Components
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';

// Pages
import { Dashboard } from './pages/Dashboard';
import { QuizDetailPage } from './pages/QuizDetailPage';
import { QuizFormPage } from './pages/QuizFormPage';
import { QuizPage } from './pages/QuizPage';
import { QuizResult } from './pages/QuizResult';
import { ReviewPage } from './pages/ReviewPage';
import { PracticeMistakes } from './pages/PracticeMistakes';
import { Statistics } from './pages/Statistics';
import { ImportQuiz } from './pages/ImportQuiz';
import { SettingsPage } from './pages/Settings';
import { SavedVocabularyPage } from './pages/SavedVocabularyPage';
import { JapaneseLearningPage } from './pages/JapaneseLearningPage';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [wrongQuestions, setWrongQuestions] = useState<WrongQuestionDetail[]>([]);
  const [stats, setStats] = useState<GlobalStatistics>({
    totalQuestions: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    accuracy: 0,
    bestScorePercentage: 0,
    quizzesCompleted: 0,
  });

  // Selected Quiz for Full Page Details
  const [selectedQuizDetail, setSelectedQuizDetail] = useState<Quiz | null>(null);

  // Active state for quiz execution
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [activeStudyOptions, setActiveStudyOptions] = useState<StudyOptions | undefined>(undefined);
  const [quizToEdit, setQuizToEdit] = useState<Quiz | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState<QuizAttempt | null>(null);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'wrong'>('all');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');

  // Theme & Sound Settings State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('mcq_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => sound.isEnabled());

  // User Auth State
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string } | null>(() => {
    try {
      const saved = localStorage.getItem('mcq_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Global Keyboard Shortcuts (Press '?' to show cheat sheet)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('mcq_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('mcq_theme', 'light');
    }
  }, [isDarkMode]);

  // Load user settings from Firestore when user logs in
  useEffect(() => {
    if (currentUser?.email) {
      getUserSettingsFromFirestore(currentUser.email).then((settings) => {
        if (settings) {
          if (typeof settings.isDarkMode === 'boolean') {
            setIsDarkMode(settings.isDarkMode);
          }
          if (typeof settings.soundEnabled === 'boolean') {
            sound.setEnabled(settings.soundEnabled);
            setSoundEnabled(settings.soundEnabled);
          }
        }
      });
    }
  }, [currentUser]);

  const handleToggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (currentUser?.email) {
        saveUserSettingsToFirestore(currentUser.email, { isDarkMode: next, soundEnabled });
      }
      return next;
    });
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    sound.setEnabled(next);
    setSoundEnabled(next);
    if (next) sound.playCorrect();
    if (currentUser?.email) {
      saveUserSettingsToFirestore(currentUser.email, { isDarkMode, soundEnabled: next });
    }
  };

  const refreshData = () => {
    const loadedQuizzes = getQuizzes();
    setQuizzes(loadedQuizzes);
    setWrongQuestions(getWrongQuestionsList());
    setStats(getGlobalStatistics());
  };

  // Browser History Navigation Manager (supports Back/Forward buttons in browser)
  const navigateTo = (
    tab: string,
    options?: {
      quizDetail?: Quiz | null;
      activeQuiz?: Quiz | null;
      studyOptions?: StudyOptions;
      quizToEdit?: Quiz | null;
      attempt?: QuizAttempt | null;
      reviewFilter?: 'all' | 'wrong';
    },
    replace: boolean = false
  ) => {
    const nextQuizDetail = options?.quizDetail !== undefined ? options.quizDetail : (tab === 'quiz-detail' ? selectedQuizDetail : null);
    const nextActiveQuiz = options?.activeQuiz !== undefined ? options.activeQuiz : (tab === 'quiz-mode' ? activeQuiz : null);
    const nextQuizToEdit = options?.quizToEdit !== undefined ? options.quizToEdit : (tab === 'edit-quiz' ? quizToEdit : null);
    const nextAttempt = options?.attempt !== undefined ? options.attempt : currentAttempt;
    const nextStudyOptions = options?.studyOptions !== undefined ? options.studyOptions : activeStudyOptions;
    const nextReviewFilter = options?.reviewFilter !== undefined ? options.reviewFilter : reviewFilter;

    setActiveTab(tab);
    setSelectedQuizDetail(nextQuizDetail);
    setActiveQuiz(nextActiveQuiz);
    setQuizToEdit(nextQuizToEdit);
    if (options?.attempt !== undefined) setCurrentAttempt(nextAttempt);
    if (options?.studyOptions !== undefined) setActiveStudyOptions(nextStudyOptions);
    if (options?.reviewFilter !== undefined) setReviewFilter(nextReviewFilter);

    // Prepare hash URL
    let hash = `#${tab}`;
    if (tab === 'quiz-detail' && nextQuizDetail) {
      hash = `#quiz-detail?id=${nextQuizDetail.id}`;
    } else if (tab === 'quiz-mode' && nextActiveQuiz) {
      hash = `#quiz-mode?id=${nextActiveQuiz.id}`;
    } else if (tab === 'edit-quiz' && nextQuizToEdit) {
      hash = `#edit-quiz?id=${nextQuizToEdit.id}`;
    }

    const stateData = {
      tab,
      quizDetailId: nextQuizDetail?.id || null,
      activeQuizId: nextActiveQuiz?.id || null,
      quizToEditId: nextQuizToEdit?.id || null,
      reviewFilter: nextReviewFilter,
      timestamp: Date.now(),
    };

    try {
      if (replace) {
        window.history.replaceState(stateData, '', hash);
      } else {
        if (window.location.hash !== hash || window.history.state?.tab !== tab) {
          window.history.pushState(stateData, '', hash);
        }
      }
    } catch (e) {
      console.warn('History navigation notice:', e);
    }
  };

  // Synchronize Browser Back / Forward buttons (popstate event)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      const hash = window.location.hash.replace(/^#/, '') || 'dashboard';
      const [route, queryString] = hash.split('?');
      const params = new URLSearchParams(queryString || '');
      const paramId = params.get('id');

      const targetTab = state?.tab || route || 'dashboard';
      const targetQuizDetailId = state?.quizDetailId || (route === 'quiz-detail' ? paramId : null);
      const targetActiveQuizId = state?.activeQuizId || (route === 'quiz-mode' ? paramId : null);
      const targetQuizToEditId = state?.quizToEditId || (route === 'edit-quiz' ? paramId : null);
      const targetReviewFilter = state?.reviewFilter || 'all';

      setActiveTab(targetTab);

      if (targetQuizDetailId) {
        const found = quizzes.find((q) => q.id === targetQuizDetailId) || getQuizzes().find((q) => q.id === targetQuizDetailId);
        if (found) setSelectedQuizDetail(found);
      } else if (targetTab === 'dashboard' || targetTab === 'my-quizzes') {
        setSelectedQuizDetail(null);
      }

      if (targetQuizToEditId) {
        const found = quizzes.find((q) => q.id === targetQuizToEditId) || getQuizzes().find((q) => q.id === targetQuizToEditId);
        if (found) setQuizToEdit(found);
      } else if (targetTab !== 'edit-quiz') {
        setQuizToEdit(null);
      }

      if (targetActiveQuizId) {
        const found = quizzes.find((q) => q.id === targetActiveQuizId) || getQuizzes().find((q) => q.id === targetActiveQuizId);
        if (found) setActiveQuiz(found);
      }

      if (targetReviewFilter) {
        setReviewFilter(targetReviewFilter);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [quizzes]);

  // Handle Initial Load Hash URL
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '');
    if (hash) {
      const [route, queryString] = hash.split('?');
      const params = new URLSearchParams(queryString || '');
      const paramId = params.get('id');
      if (route) {
        setActiveTab(route);
        if (paramId) {
          const loaded = getQuizzes();
          const found = loaded.find((q) => q.id === paramId);
          if (found) {
            if (route === 'quiz-detail') setSelectedQuizDetail(found);
            if (route === 'quiz-mode') setActiveQuiz(found);
            if (route === 'edit-quiz') setQuizToEdit(found);
          }
        }
      }
      try {
        window.history.replaceState(
          {
            tab: route || 'dashboard',
            quizDetailId: paramId || null,
            timestamp: Date.now(),
          },
          '',
          window.location.hash
        );
      } catch {}
    } else {
      try {
        window.history.replaceState({ tab: 'dashboard', timestamp: Date.now() }, '', '#dashboard');
      } catch {}
    }
  }, []);

  // Update selected quiz detail if quizzes reload
  useEffect(() => {
    if (activeTab === 'quiz-detail' && !selectedQuizDetail && quizzes.length > 0) {
      const hash = window.location.hash.replace(/^#/, '');
      const [, queryString] = hash.split('?');
      const params = new URLSearchParams(queryString || '');
      const paramId = params.get('id');
      if (paramId) {
        const found = quizzes.find((q) => q.id === paramId);
        if (found) setSelectedQuizDetail(found);
      }
    }
  }, [quizzes, activeTab, selectedQuizDetail]);

  useEffect(() => {
    let unSubQuizzes: (() => void) | null = null;
    let unSubAttempts: (() => void) | null = null;
    let unSubUserDoc: (() => void) | null = null;
    let unSubStarredVocab: (() => void) | null = null;
    let unSubCourses: (() => void) | null = null;
    let unSubProgress: (() => void) | null = null;
    let unSubAllFlashcards: (() => void) | null = null;
    let unSubAllQuizProgress: (() => void) | null = null;
    let unSubPracticeMistakes: (() => void) | null = null;
    let unSubJpd123Access: (() => void) | null = null;

    refreshData();

    const email = currentUser?.email || auth.currentUser?.email;

    if (email) {
      let hasLoadedUserDoc = false;
      // Listen in real-time to user document in Firestore to keep profile name synchronized
      unSubUserDoc = subscribeUserDoc(email, (userDoc) => {
        if (userDoc) {
          hasLoadedUserDoc = true;
          if (userDoc.name && userDoc.name !== currentUser?.name) {
            const updated = { email, name: userDoc.name };
            setCurrentUser(updated);
            localStorage.setItem('mcq_user', JSON.stringify(updated));
          }
        } else if (hasLoadedUserDoc) {
          // Account was explicitly deleted in Firestore on another browser or on server!
          console.warn('Account deleted in Firestore. Real-time automatic logout across browsers...');
          const targetEmail = email;
          logoutUser().catch(() => {});
          clearAllUserData(targetEmail);
          localStorage.removeItem('mcq_user');
          setCurrentUser(null);
          setQuizzes([]);
          setWrongQuestions([]);
          setStats({
            totalQuestions: 0,
            questionsAnswered: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            accuracy: 0,
            bestScorePercentage: 0,
            quizzesCompleted: 0,
          });
          refreshData();
        }
      });

      // Real-time sync for Starred Vocabulary ("Từ cần lưu ý ghi nhớ") across PC and Phone
      unSubStarredVocab = subscribeStarredVocabulary(email, (cloudWords) => {
        updateStarredWordsFromCloud(cloudWords);
      });

      // Real-time sync for Japanese Study Progress (typing, flashcards, kanji) across PC and Phone
      unSubProgress = subscribeStudyProgress(email, (items) => {
        updateStudyProgressFromCloud(items);
      });

      // Global real-time sync for All Flashcards Progress (PC <-> Phone)
      unSubAllFlashcards = subscribeAllFlashcardProgress(email, (cloudData) => {
        updateAllFlashcardProgressFromCloud(cloudData);
      });

      // Global real-time sync for All Quiz Practice Learning Progress (PC <-> Phone)
      unSubAllQuizProgress = subscribeAllQuizLearningProgress(email, (cloudData) => {
        updateAllQuizLearningProgressFromCloud(cloudData);
      });

      // Global real-time sync for Practice Mistakes Progress (PC <-> Phone)
      unSubPracticeMistakes = subscribePracticeMistakesProgress(email, (cloudData) => {
        updatePracticeMistakesProgressFromCloud(cloudData);
      });
    }

    // Real-time sync for Japanese Courses across PC and Phone (regardless of active tab)
    unSubCourses = subscribeJapaneseCourses((cloudCourses) => {
      if (Array.isArray(cloudCourses)) {
        let toSave = cloudCourses;
        if (canAccessJpd123(email)) {
          const hasJpd = toSave.some((c) => c && (c.id === 'course-jpd123' || c.code?.toLowerCase().replace(/\s+/g, '') === 'jpd123'));
          if (!hasJpd) {
            toSave = [DEFAULT_JPD123_COURSE, ...toSave];
            if (email?.toLowerCase().trim() === 'daiduong4112006@gmail.com') {
              syncJapaneseCourseToFirestore(DEFAULT_JPD123_COURSE).catch(() => {});
            }
          }
        }
        saveJapaneseCourses(toSave, email, true);
      }
    });

    // Real-time sync for JPD123 access list across all devices
    unSubJpd123Access = subscribeJpd123AccessList((emails) => {
      saveAllowedJpd123Emails(emails, true);
    });

    const activeUserId = getEffectiveUserId();

    if (activeUserId && activeUserId !== 'guest_user') {
      unSubQuizzes = subscribeQuizzes(
        activeUserId,
        (cloudQuizzes) => {
          // Cloud Firestore is authoritative for logged-in users.
          // This ensures created, edited, and deleted quizzes sync instantly in real-time across all devices.
          setQuizzes(cloudQuizzes);
          saveQuizzes(cloudQuizzes);
          setSelectedQuizDetail((prev) => {
            if (!prev) return null;
            const updated = cloudQuizzes.find((q) => q.id === prev.id);
            return updated || null;
          });
          setWrongQuestions(getWrongQuestionsList());
          setStats(getGlobalStatistics());
        },
        (err) => {
          console.warn('Quiz subscription notice:', err);
          refreshData();
        }
      );

      unSubAttempts = subscribeAttempts(activeUserId, (cloudAttempts) => {
        const userEmail = currentUser?.email || auth.currentUser?.email || '';
        const sanitized = userEmail.replace(/[^a-z0-9]/g, '_');
        const attemptsKey = `mcq_master_attempts_v1_${sanitized}`;
        localStorage.setItem(attemptsKey, JSON.stringify(cloudAttempts));
        setStats(getGlobalStatistics());
      });
    }

    const unSubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userObj = {
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '',
        };
        setCurrentUser(userObj);
        localStorage.setItem('mcq_user', JSON.stringify(userObj));
        transferGuestDataToUser(userObj.email);
        refreshData();
      }
    });

    const handleBeforeUnload = () => {
      flushQuizWrites().catch(() => {});
      flushAllPendingProgressSync().catch(() => {});
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushAllPendingProgressSync().catch(() => {});
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      unSubAuth();
      if (unSubUserDoc) unSubUserDoc();
      if (unSubQuizzes) unSubQuizzes();
      if (unSubAttempts) unSubAttempts();
      if (unSubStarredVocab) unSubStarredVocab();
      if (unSubCourses) unSubCourses();
      if (unSubProgress) unSubProgress();
      if (unSubAllFlashcards) unSubAllFlashcards();
      if (unSubAllQuizProgress) unSubAllQuizProgress();
      if (unSubPracticeMistakes) unSubPracticeMistakes();
      if (unSubJpd123Access) unSubJpd123Access();
    };
  }, [currentUser?.email]);

  const handleStartQuizWithOptions = (quizId: string, options?: StudyOptions) => {
    const target = quizzes.find((q) => q.id === quizId);
    if (!target) return;
    if (target.questions.length === 0) {
      alert('Bộ đề này chưa có câu hỏi nào. Vui lòng thêm câu hỏi trước khi thi!');
      return;
    }
    navigateTo('quiz-mode', { activeQuiz: target, studyOptions: options });
  };

  const handleQuizCompleted = (attempt: QuizAttempt) => {
    saveAttempt(attempt);
    setCurrentAttempt(attempt);
    refreshData();
    navigateTo('quiz-result', { attempt });
  };

  const handleSaveQuiz = (quiz: Quiz) => {
    saveQuiz(quiz);
    refreshData();
    navigateTo('dashboard', { quizDetail: null, quizToEdit: null });
  };

  const handleDeleteQuiz = (quizId: string) => {
    deleteQuiz(quizId);
    if (selectedQuizDetail?.id === quizId) {
      setSelectedQuizDetail(null);
    }
    refreshData();
  };

  const handlePracticeSingleQuestion = (quizId: string, questionId: string) => {
    const parentQuiz = quizzes.find((q) => q.id === quizId);
    if (!parentQuiz) return;

    const question = parentQuiz.questions.find((q) => q.id === questionId);
    if (!question) return;

    const singleQuiz: Quiz = {
      id: `single-${Date.now()}`,
      title: `Practice: ${question.question.substring(0, 30)}...`,
      description: `Targeted practice for difficult question`,
      subject: parentQuiz.subject,
      topic: parentQuiz.topic,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timesCompleted: 0,
      questions: [question],
    };

    navigateTo('quiz-mode', { activeQuiz: singleQuiz });
  };

  const handleResetDemo = () => {
    if (window.confirm('Khôi phục lại dữ liệu demo ban đầu?')) {
      resetToDemoData();
      refreshData();
      navigateTo('dashboard', { quizDetail: null });
    }
  };

  const handleClearAll = async () => {
    const SUPER_ADMIN = 'daiduong4112006@gmail.com';
    if (currentUser?.email?.toLowerCase().trim() !== SUPER_ADMIN) {
      alert('BẢO MẬT HỆ THỐNG:\n\nChỉ tài khoản Quản trị viên tối cao (daiduong4112006@gmail.com) mới có quyền Reset Server và xóa toàn bộ dữ liệu!');
      return;
    }

    if (
      window.confirm(
        'XÁC NHẬN XÓA TOÀN BỘ TÀI KHOẢN VÀ DỮ LIỆU SERVER:\n\nBạn có chắc chắn muốn xóa tất cả tài khoản và toàn bộ dữ liệu bộ đề trên hệ thống? Sau khi xóa, tất cả dữ liệu sẽ được đưa về trạng thái trống hoàn toàn.'
      )
    ) {
      if (currentUser?.email) {
        await deleteUserFromFirestore(currentUser.email);
      }
      await wipeAllServerCollections();
      try {
        await deleteCurrentUserAccount();
      } catch (e) {
        console.warn('Firebase account delete notice:', e);
      }
      try {
        await logoutUser();
      } catch (e) {
        console.error('Logout error during clear:', e);
      }
      clearAllUserData(currentUser?.email);
      localStorage.clear();
      setCurrentUser(null);
      setQuizzes([]);
      setWrongQuestions([]);
      setStats({
        totalQuestions: 0,
        questionsAnswered: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        accuracy: 0,
        bestScorePercentage: 0,
        quizzesCompleted: 0,
      });
      navigateTo('dashboard', { quizDetail: null });
      alert('Đã xóa sạch toàn bộ tài khoản trên máy chủ và dữ liệu hệ thống thành công!');
    }
  };

  const handleExportBackup = () => {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      quizzes,
      attempts: localStorage.getItem('mcq_master_attempts_v1')
        ? JSON.parse(localStorage.getItem('mcq_master_attempts_v1')!)
        : [],
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcq_master_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const subjectsList = getSubjectsList(quizzes);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased">
      {/* Top Navbar & Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          navigateTo(tab);
        }}
        onCreateNewQuiz={() => {
          navigateTo('import-export', { quizToEdit: null });
        }}
        title={
          activeTab === 'dashboard' || activeTab === 'my-quizzes'
            ? 'Bộ đề của tôi'
            : activeTab === 'quiz-detail'
            ? 'Chi tiết bộ đề & Ôn tập'
            : activeTab === 'create-quiz'
            ? 'Tạo bộ đề mới'
            : activeTab === 'edit-quiz'
            ? 'Chỉnh sửa câu hỏi'
            : activeTab === 'quiz-mode'
            ? 'Thi trắc nghiệm'
            : activeTab === 'quiz-result'
            ? 'Kết quả bài thi'
            : activeTab === 'review-mode'
            ? 'Xem lại đáp án'
            : activeTab === 'practice-mistakes'
            ? 'Luyện câu hay sai'
            : activeTab === 'statistics'
            ? 'Thống kê kết quả'
            : activeTab === 'import-export'
            ? 'Nhập & Xuất đề thi'
            : activeTab === 'saved-vocabulary'
            ? 'Từ cần lưu ý ghi nhớ'
            : activeTab === 'japanese'
            ? 'Học Tiếng Nhật - Luyện Từ Vựng'
            : 'Cài đặt hệ thống'
        }
        subtitle="Ôn luyện trắc nghiệm MCQ theo phương pháp Quizlet"
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedSubject={selectedSubject}
        onSubjectChange={setSelectedSubject}
        subjectsList={subjectsList}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {/* Main List: My Quizzes */}
          {(activeTab === 'dashboard' || activeTab === 'my-quizzes') && (
            <Dashboard
              quizzes={quizzes}
              onStartQuizWithOptions={handleStartQuizWithOptions}
              onSelectQuizDetails={(quiz) => {
                navigateTo('quiz-detail', { quizDetail: quiz });
              }}
              onEditQuiz={(id) => {
                const target = quizzes.find((q) => q.id === id);
                if (target) {
                  navigateTo('edit-quiz', { quizToEdit: target });
                }
              }}
              onDeleteQuiz={handleDeleteQuiz}
              onCreateQuiz={() => {
                navigateTo('import-export', { quizToEdit: null });
              }}
              onNavigateToImport={() => navigateTo('import-export')}
              onPracticeQuizMistakes={(quizId) => {
                const target = quizzes.find((q) => q.id === quizId);
                if (target) {
                  // Filter quiz to wrong questions only
                  const wrongQs = target.questions.filter(
                    (q) => q.timesAnswered > 0 && q.timesCorrect / q.timesAnswered < 0.8
                  );
                  if (wrongQs.length === 0) {
                    alert('Bộ đề này chưa có câu hỏi nào bị làm sai!');
                    return;
                  }
                  const wrongQuiz: Quiz = {
                    ...target,
                    title: `${target.title} - (Luyện câu sai)`,
                    questions: wrongQs,
                  };
                  navigateTo('quiz-mode', { activeQuiz: wrongQuiz });
                }
              }}
              searchTerm={searchTerm}
              selectedSubject={selectedSubject}
              currentUser={currentUser}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              onQuizCreated={(newQuiz) => {
                refreshData();
                navigateTo('quiz-detail', { quizDetail: newQuiz });
              }}
            />
          )}

          {/* Full-Screen Quiz Details Page */}
          {activeTab === 'quiz-detail' && selectedQuizDetail && (
            <QuizDetailPage
              quiz={selectedQuizDetail}
              currentUser={currentUser}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              onUpdateQuiz={(updatedQuiz) => {
                const list = saveQuiz(updatedQuiz);
                setQuizzes(list);
                setSelectedQuizDetail(updatedQuiz);
                setWrongQuestions(getWrongQuestionsList());
                setStats(getGlobalStatistics());
              }}
              onBack={() => {
                navigateTo('dashboard', { quizDetail: null });
              }}
              onStartPractice={(quizId, options, customQuestionsList) => {
                if (customQuestionsList) {
                  navigateTo('quiz-mode', { activeQuiz: customQuestionsList, studyOptions: options });
                } else {
                  handleStartQuizWithOptions(quizId, options);
                }
              }}
              onEditQuiz={(id) => {
                const target = quizzes.find((q) => q.id === id);
                if (target) {
                  navigateTo('edit-quiz', { quizToEdit: target });
                }
              }}
              onDeleteQuiz={(id) => {
                handleDeleteQuiz(id);
                navigateTo('dashboard', { quizDetail: null });
              }}
            />
          )}

          {/* Create or Edit Quiz */}
          {(activeTab === 'create-quiz' || activeTab === 'edit-quiz') && (
            currentUser ? (
              <QuizFormPage
                quizToEdit={quizToEdit}
                onSaveQuiz={handleSaveQuiz}
                onCancel={() => navigateTo('dashboard', { quizToEdit: null })}
              />
            ) : (
              <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4 max-w-md mx-auto my-12 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto border border-indigo-100 dark:border-indigo-900">
                  <Lock className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100">
                    Yêu cầu đăng nhập
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Bạn cần Đăng ký hoặc Đăng nhập để tạo bộ đề mới và lưu dữ liệu cá nhân.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="w-full py-2.5 px-4 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                >
                  Đăng ký / Đăng nhập ngay
                </button>
              </div>
            )
          )}

          {/* Quiz Mode Runner */}
          {activeTab === 'quiz-mode' && activeQuiz && (
            <QuizPage
              quiz={activeQuiz}
              studyOptions={activeStudyOptions}
              onQuizCompleted={handleQuizCompleted}
              onExit={() => {
                if (selectedQuizDetail) {
                  navigateTo('quiz-detail', { quizDetail: selectedQuizDetail });
                } else {
                  navigateTo('dashboard');
                }
              }}
            />
          )}

          {/* Quiz Result Screen */}
          {activeTab === 'quiz-result' && currentAttempt && (
            <QuizResult
              attempt={currentAttempt}
              onReviewAll={() => {
                navigateTo('review-mode', { reviewFilter: 'all' });
              }}
              onReviewWrong={() => {
                navigateTo('review-mode', { reviewFilter: 'wrong' });
              }}
              onRetry={() => {
                if (currentAttempt) {
                  handleStartQuizWithOptions(currentAttempt.quizId);
                }
              }}
              onDashboard={() => navigateTo('dashboard', { quizDetail: null })}
            />
          )}

          {/* Answer Review Page */}
          {activeTab === 'review-mode' && currentAttempt && (
            <ReviewPage
              attempt={currentAttempt}
              initialFilter={reviewFilter}
              onBackToDashboard={() => navigateTo('dashboard', { quizDetail: null })}
              onRetry={() => handleStartQuizWithOptions(currentAttempt.quizId)}
            />
          )}

          {/* Practice Mistakes Mode */}
          {activeTab === 'practice-mistakes' && (
            <PracticeMistakes
              wrongQuestionsList={wrongQuestions}
              onRefreshList={() => setWrongQuestions(getWrongQuestionsList())}
              onBackToDashboard={() => navigateTo('dashboard')}
            />
          )}

          {/* Statistics Analytics */}
          {activeTab === 'statistics' && (
            <Statistics
              stats={stats}
              quizzes={quizzes}
              onPracticeSingleQuestion={handlePracticeSingleQuestion}
            />
          )}

          {/* Import & Export */}
          {activeTab === 'import-export' && (
            currentUser ? (
              <ImportQuiz
                quizzes={quizzes}
                onSaveImportedQuiz={handleSaveQuiz}
                onAppendToQuiz={(targetId, parsedQs) => {
                  const target = quizzes.find((q) => q.id === targetId);
                  if (!target) return;
                  const newQuestions: Question[] = parsedQs.map((q, idx) => ({
                    id: `q-appended-${Date.now()}-${idx}`,
                    question: q.question,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    correctAnswers: q.correctAnswers || [q.correctAnswer],
                    explanation: q.explanation,
                    note: q.note,
                    difficulty: q.difficulty,
                    imageUrl: q.imageUrl,
                    timesAnswered: 0,
                    timesCorrect: 0,
                    timesWrong: 0,
                    mastered: false,
                  }));
                  const updated = {
                    ...target,
                    questions: [...target.questions, ...newQuestions],
                  };
                  saveQuiz(updated);
                  refreshData();
                  navigateTo('dashboard', { quizDetail: null });
                }}
              />
            ) : (
              <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4 max-w-md mx-auto my-12 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto border border-indigo-100 dark:border-indigo-900">
                  <Lock className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100">
                    Yêu cầu đăng nhập
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Bạn cần Đăng ký hoặc Đăng nhập để nhập / xuất file bộ đề thi của riêng bạn.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="w-full py-2.5 px-4 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                >
                  Đăng ký / Đăng nhập ngay
                </button>
              </div>
            )
          )}

          {/* Saved Vocabulary Notes Section */}
          {activeTab === 'saved-vocabulary' && (
            <SavedVocabularyPage onBackToDashboard={() => navigateTo('dashboard')} />
          )}

          {/* Japanese Learning Section */}
          {activeTab === 'japanese' && (
            <JapaneseLearningPage
              currentUser={currentUser}
              onBackToDashboard={() => navigateTo('dashboard')}
            />
          )}

          {/* Settings */}
          {activeTab === 'settings' && (
            <SettingsPage
              currentUser={currentUser}
              onResetDemoData={handleResetDemo}
              onExportAllBackup={handleExportBackup}
              onClearAllData={handleClearAll}
              isDarkMode={isDarkMode}
              onToggleDarkMode={handleToggleDarkMode}
              soundEnabled={soundEnabled}
              onToggleSound={handleToggleSound}
            />
          )}
        </main>

      {/* User Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          localStorage.setItem('mcq_user', JSON.stringify(user));
          transferGuestDataToUser(user.email);
          refreshData();
        }}
        onLogout={() => {
          setCurrentUser(null);
          localStorage.removeItem('mcq_user');
        }}
      />

      {/* Keyboard Shortcuts Cheat Sheet Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}
