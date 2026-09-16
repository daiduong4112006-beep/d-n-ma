import React, { useState, useEffect, useRef } from 'react';
import { Quiz, StudyOptions, Question } from '../types/quiz';
import { ClickableText } from '../components/ClickableText';
import { FlashcardViewer } from '../components/FlashcardViewer';
import { AiQuestionModal } from '../components/AiQuestionModal';
import { ShareQuizModal } from '../components/ShareQuizModal';
import { AiSimilarQuestionsModal } from '../components/AiSimilarQuestionsModal';
import {
  ArrowLeft,
  Play,
  Layers,
  Shuffle,
  CheckCircle2,
  Edit3,
  Trash2,
  Search,
  Sparkles,
  Zap,
  BookOpen,
  RotateCw,
  FileText,
  Clock,
  AlertTriangle,
  BarChart3,
  X,
  Sliders,
  Award,
  Volume2,
  Star,
  Gamepad2,
  Flame,
  Boxes,
  GraduationCap,
  Image,
  UploadCloud,
  Plus,
  Save,
  ArrowUpDown,
  Share2,
} from 'lucide-react';
import { sound } from '../utils/audio';
import { saveQuiz } from '../utils/storage';
import { compressImage } from '../utils/imageCompressor';
import { subscribeStarredQuestions, syncStarredQuestionsToFirestore } from '../lib/firebase';

interface QuizDetailPageProps {
  quiz: Quiz;
  onBack: () => void;
  onStartPractice: (quizId: string, options: StudyOptions, customQuestionsList?: Quiz) => void;
  onEditQuiz: (quizId: string) => void;
  onDeleteQuiz: (quizId: string) => void;
  onUpdateQuiz?: (quiz: Quiz) => void;
  currentUser?: { email: string; name: string } | null;
  onOpenAuthModal?: () => void;
}

export const QuizDetailPage: React.FC<QuizDetailPageProps> = ({
  quiz,
  onBack,
  onStartPractice,
  onEditQuiz,
  onDeleteQuiz,
  onUpdateQuiz,
  currentUser,
  onOpenAuthModal,
}) => {
  const requireLogin = (): boolean => {
    if (!currentUser) {
      if (onOpenAuthModal) onOpenAuthModal();
      return true;
    }
    return false;
  };

  const [currentQuiz, setCurrentQuiz] = useState<Quiz>(quiz);

  useEffect(() => {
    setCurrentQuiz(quiz);
  }, [quiz]);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeConfigModal, setActiveConfigModal] = useState<'none' | 'practice' | 'exam'>('none');
  const [starredIds, setStarredIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`mcq_starred_questions_${quiz.id}`);
      if (saved) return new Set(JSON.parse(saved));
    } catch {}
    return new Set();
  });
  const [sortMode, setSortMode] = useState<'original' | 'starred-first'>('original');
  const [aiModalQuestion, setAiModalQuestion] = useState<Question | null>(null);

  // Modals
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSimilarModalOpen, setIsSimilarModalOpen] = useState(false);
  const [selectedTargetQuestionForSimilar, setSelectedTargetQuestionForSimilar] = useState<Question | null>(null);

  const lastRemoteStarred = useRef<string>('');

  // Real-time sync starredIds across phone and computer
  useEffect(() => {
    if (!currentUser?.email || !currentQuiz?.id) return;
    const unsub = subscribeStarredQuestions(currentUser.email, currentQuiz.id, (ids) => {
      lastRemoteStarred.current = [...ids].sort().join(',');
      setStarredIds(new Set(ids));
      try {
        localStorage.setItem(`mcq_starred_questions_${currentQuiz.id}`, JSON.stringify(ids));
      } catch {}
    });
    return () => unsub();
  }, [currentUser?.email, currentQuiz?.id]);

  // Sync starredIds to localStorage and Firestore
  useEffect(() => {
    const idsArray = Array.from(starredIds);
    try {
      localStorage.setItem(`mcq_starred_questions_${currentQuiz.id}`, JSON.stringify(idsArray));
    } catch {}
    const serialized = [...idsArray].sort().join(',');
    if (serialized !== lastRemoteStarred.current && currentUser?.email && currentQuiz?.id) {
      lastRemoteStarred.current = serialized;
      syncStarredQuestionsToFirestore(currentUser.email, currentQuiz.id, idsArray).catch(() => {});
    }
  }, [starredIds, currentQuiz.id, currentUser?.email]);

  // Edit question modal state
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [qEditForm, setQEditForm] = useState<{
    question: string;
    imageUrl: string;
    options: string[];
    correctAnswers: number[];
    explanation: string;
    note: string;
  }>({
    question: '',
    imageUrl: '',
    options: ['', ''],
    correctAnswers: [0],
    explanation: '',
    note: '',
  });

  const handleOpenEditQuestion = (originalIdx: number, q: Question) => {
    const realIndex = currentQuiz.questions.findIndex((item) => item.id === q.id);
    const targetIdx = realIndex !== -1 ? realIndex : originalIdx;
    setEditingQuestionIndex(targetIdx);
    setQEditForm({
      question: q.question,
      imageUrl: q.imageUrl || '',
      options: [...q.options],
      correctAnswers:
        q.correctAnswers && q.correctAnswers.length > 0
          ? [...q.correctAnswers]
          : [q.correctAnswer ?? 0],
      explanation: q.explanation || '',
      note: q.note || '',
    });
  };

  const handleProcessImage = async (fileOrBlobOrUrl: File | Blob | string) => {
    try {
      const compressed = await compressImage(fileOrBlobOrUrl, 960, 960, 0.8);
      if (compressed) {
        setQEditForm((prev) => ({ ...prev, imageUrl: compressed }));
      }
    } catch (err) {
      console.error('Error processing image:', err);
    }
  };

  const handleSaveQuestionEdit = async () => {
    if (editingQuestionIndex === null) return;
    if (!qEditForm.question.trim()) {
      alert('Vui lòng nhập nội dung câu hỏi.');
      return;
    }
    const cleanOpts = qEditForm.options.map((o) => o.trim()).filter(Boolean);
    if (cleanOpts.length < 2) {
      alert('Vui lòng nhập ít nhất 2 lựa chọn đáp án.');
      return;
    }

    const validCorrectAns = qEditForm.correctAnswers.filter((i) => i < cleanOpts.length);
    if (validCorrectAns.length === 0) {
      validCorrectAns.push(0);
    }

    const updatedQuestions = [...currentQuiz.questions];
    const targetQ = updatedQuestions[editingQuestionIndex];
    if (!targetQ) return;

    // Ensure image is compressed before saving
    let finalImageUrl = qEditForm.imageUrl.trim();
    if (finalImageUrl && finalImageUrl.startsWith('data:image/')) {
      finalImageUrl = await compressImage(finalImageUrl, 960, 960, 0.8);
    }

    updatedQuestions[editingQuestionIndex] = {
      ...targetQ,
      question: qEditForm.question.trim(),
      imageUrl: finalImageUrl || undefined,
      options: cleanOpts,
      correctAnswer: validCorrectAns[0] || 0,
      correctAnswers: validCorrectAns,
      explanation: qEditForm.explanation.trim(),
      note: qEditForm.note.trim(),
    };

    const updatedQuiz: Quiz = {
      ...currentQuiz,
      questions: updatedQuestions,
      updatedAt: new Date().toISOString(),
    };

    saveQuiz(updatedQuiz);
    setCurrentQuiz(updatedQuiz);
    if (onUpdateQuiz) {
      onUpdateQuiz(updatedQuiz);
    }
    setEditingQuestionIndex(null);
    sound.playCorrect();
  };

  // Study Options state
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [questionLimitInput, setQuestionLimitInput] = useState<number | string>(quiz.questions.length);
  const [timeLimitMinutesInput, setTimeLimitMinutesInput] = useState<number | string>(45);
  const [instantFeedback, setInstantFeedback] = useState(true);

  const toggleStar = (qId: string) => {
    sound.playFlip();
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const speakText = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = /^[A-Za-z0-9\s.,?!'"-]+$/.test(text) ? 'en-US' : 'vi-VN';
      window.speechSynthesis.speak(utterance);
    }
  };

  const totalQuestions = currentQuiz.questions.length;
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

  // Stats calculation according to user rules:
  // - Hoàn thành & Thành thạo: Lấy từ phần Học (timesAnswered & mastered)
  // - Hay sai: Lấy từ cả phần Học và Thi thử (timesWrong > 0 & !mastered)
  const completedQuestions = currentQuiz.questions.filter((q) => q.timesAnswered > 0);
  const masteredQuestions = currentQuiz.questions.filter((q) => q.mastered);
  const wrongQuestions = currentQuiz.questions.filter((q) => q.timesWrong > 0 && !q.mastered);
  const starredCount = currentQuiz.questions.filter((q) => starredIds.has(q.id)).length;

  const indexedQuestions = currentQuiz.questions.map((q, idx) => ({
    ...q,
    _originalIndex: idx + 1,
  }));

  const sortedQuestions = [...indexedQuestions].sort((a, b) => {
    if (sortMode === 'starred-first') {
      const aStarred = starredIds.has(a.id) ? 1 : 0;
      const bStarred = starredIds.has(b.id) ? 1 : 0;
      if (aStarred !== bStarred) {
        return bStarred - aStarred; // Starred questions on top
      }
    }
    return a._originalIndex - b._originalIndex; // Original order
  });

  const filteredQuestions = sortedQuestions.filter(
    (q) =>
      q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.options.some((opt) => opt.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (q.note && q.note.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (q.explanation && q.explanation.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleLaunchPractice = () => {
    onStartPractice(quiz.id, {
      shuffleQuestions,
      shuffleOptions,
      questionLimit: 0, // 0 = Full questions
      timeLimitMinutes: 0,
      mode: 'mcq',
      instantFeedback,
    });
  };

  const handleLaunchExamCustom = (customLimit?: number, customTime?: number) => {
    const parsedQ = typeof questionLimitInput === 'number' ? questionLimitInput : parseInt(String(questionLimitInput), 10);
    const qLimit = customLimit ?? (isNaN(parsedQ) || parsedQ <= 0 ? totalQuestions : parsedQ);

    const parsedT = typeof timeLimitMinutesInput === 'number' ? timeLimitMinutesInput : parseInt(String(timeLimitMinutesInput), 10);
    const tLimit = customTime ?? (isNaN(parsedT) || parsedT <= 0 ? 45 : parsedT);

    onStartPractice(quiz.id, {
      shuffleQuestions: true,
      shuffleOptions: true,
      questionLimit: qLimit,
      timeLimitMinutes: tLimit,
      mode: 'mcq',
      instantFeedback: false,
    });
  };

  const handlePracticeMistakes = () => {
    if (wrongQuestions.length === 0) {
      alert('Tuyệt vời! Bộ đề này hiện tại chưa có câu hỏi nào bị làm sai.');
      return;
    }
    const wrongQuiz: Quiz = {
      ...quiz,
      title: `${quiz.title} - (Luyện câu hay sai: ${wrongQuestions.length} câu)`,
      questions: wrongQuestions,
    };
    onStartPractice(
      quiz.id,
      {
        shuffleQuestions: false,
        shuffleOptions: false,
        questionLimit: 0,
        mode: 'mcq',
        instantFeedback: true,
      },
      wrongQuiz
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12 max-w-6xl mx-auto">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 rounded-xl transition-all shadow-xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại danh sách bộ đề</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-indigo-500" />
            <span>Chia sẻ</span>
          </button>

          <button
            type="button"
            onClick={() => onEditQuiz(quiz.id)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl transition-all cursor-pointer"
          >
            <Edit3 className="w-4 h-4" />
            <span>Sửa câu hỏi</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (window.confirm('Bạn có chắc chắn muốn xóa bộ đề này?')) {
                onDeleteQuiz(quiz.id);
                onBack();
              }
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Xóa bộ đề</span>
          </button>
        </div>
      </div>

      {/* Quiz Header Title Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="px-3 py-1 text-xs font-extrabold rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            {quiz.subject || 'Môn học'}
          </span>
          {quiz.topic && (
            <span className="text-xs text-slate-400 font-medium">
              • Chuyên đề: {quiz.topic}
            </span>
          )}
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {totalQuestions} câu hỏi
          </span>
        </div>

        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          {quiz.title}
        </h1>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-3xl">
          {quiz.description || 'Chọn chế độ ôn tập phù hợp. Bấm vào bất kỳ từ nào để tra nghĩa tiếng Việt.'}
        </p>
      </div>

      {/* 1. THỐNG KÊ KẾT QUẢ HIỆN NGAY Ở TRÊN CÙNG */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <span>Thống kê kết quả bộ đề</span>
          </h3>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
            Đã làm {quiz.timesCompleted || 0} lần
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 block">Tổng số câu</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1 block">
              {totalQuestions}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 block">
              Đã học (Phần học)
            </span>
            <span className="text-2xl font-extrabold text-indigo-900 dark:text-indigo-200 mt-1 block">
              {completedQuestions.length} / {totalQuestions}
            </span>
            <span className="text-[10px] text-indigo-500 font-medium">
              ({totalQuestions > 0 ? Math.round((completedQuestions.length / totalQuestions) * 100) : 0}%)
            </span>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">
              Thành thạo (Phần học)
            </span>
            <span className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-200 mt-1 block">
              {masteredQuestions.length} / {totalQuestions}
            </span>
            <span className="text-[10px] text-emerald-500 font-medium">
              ({totalQuestions > 0 ? Math.round((masteredQuestions.length / totalQuestions) * 100) : 0}%)
            </span>
          </div>

          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50">
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 block">
              Câu hay sai (Học & Thi)
            </span>
            <span className="text-2xl font-extrabold text-rose-900 dark:text-rose-200 mt-1 block">
              {wrongQuestions.length}
            </span>
            <span className="text-[10px] text-rose-500 font-medium">
              câu làm sai
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-indigo-600 to-emerald-500 rounded-full transition-all duration-500"
            style={{
              width: `${totalQuestions > 0 ? Math.round((masteredQuestions.length / totalQuestions) * 100) : 0}%`,
            }}
          />
        </div>
      </div>

      {/* ÔN TẬP TRÊN LỚP (Thẻ ghi nhớ, Học, Kiểm tra, Câu hay sai) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg text-white space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-300">
            Ôn tập trên lớp
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            {totalQuestions} câu hỏi
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* 1. Thẻ ghi nhớ */}
          <button
            type="button"
            onClick={() => {
              onStartPractice(quiz.id, {
                mode: 'flashcard',
                shuffleQuestions: false,
                shuffleOptions: false,
                questionLimit: 0,
                instantFeedback: true,
              });
            }}
            className="p-3.5 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 hover:border-indigo-500 rounded-xl flex items-center gap-3 text-xs font-extrabold text-indigo-200 transition-all cursor-pointer shadow-xs group"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Layers className="w-4.5 h-4.5 text-indigo-400" />
            </div>
            <div className="text-left">
              <span className="block text-indigo-100 leading-tight">Thẻ ghi nhớ</span>
              <span className="text-[10px] text-indigo-300/70 font-normal">Lật flashcard</span>
            </div>
          </button>

          {/* 2. Học (Ôn tập) */}
          <button
            type="button"
            onClick={handleLaunchPractice}
            className="p-3.5 bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 hover:border-blue-500 rounded-xl flex items-center gap-3 text-xs font-extrabold text-slate-200 transition-all cursor-pointer shadow-xs group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <GraduationCap className="w-4.5 h-4.5 text-blue-400" />
            </div>
            <div className="text-left">
              <span className="block text-slate-100 leading-tight">Học</span>
              <span className="text-[10px] text-slate-400 font-normal">Ôn luyện trắc nghiệm</span>
            </div>
          </button>

          {/* 3. Kiểm tra */}
          <button
            type="button"
            onClick={() => setActiveConfigModal('exam')}
            className="p-3.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-700/60 hover:border-amber-500 rounded-xl flex items-center gap-3 text-xs font-extrabold text-amber-200 transition-all cursor-pointer shadow-xs group"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Award className="w-4.5 h-4.5 text-amber-400" />
            </div>
            <div className="text-left">
              <span className="block text-amber-100 leading-tight">Kiểm tra</span>
              <span className="text-[10px] text-amber-300/70 font-normal">Thi có tính giờ</span>
            </div>
          </button>

          {/* 4. Câu hay sai */}
          <button
            type="button"
            onClick={handlePracticeMistakes}
            disabled={wrongQuestions.length === 0}
            className={`p-3.5 border rounded-xl flex items-center gap-3 text-xs font-extrabold transition-all shadow-xs group ${
              wrongQuestions.length > 0
                ? 'bg-rose-950/80 hover:bg-rose-900 border-rose-700/60 hover:border-rose-500 text-rose-200 cursor-pointer'
                : 'bg-slate-800/50 border-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${
                wrongQuestions.length > 0
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'bg-slate-700/50 text-slate-500'
              }`}
            >
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
            <div className="text-left">
              <span className="block leading-tight">
                Câu hay sai {wrongQuestions.length > 0 ? `(${wrongQuestions.length})` : ''}
              </span>
              <span className="text-[10px] opacity-75 font-normal">
                {wrongQuestions.length > 0 ? 'Luyện lại câu sai' : 'Chưa có câu sai'}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* MODAL CONFIG 1: BẢNG CÀI ĐẶT ÔN TẬP */}
      {activeConfigModal === 'practice' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 relative">
            <button
              type="button"
              onClick={() => setActiveConfigModal('none')}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                  Tùy Chọn Chế Độ Ôn Tập
                </h3>
                <p className="text-xs text-slate-500">
                  Chế độ ôn tập sẽ chạy đầy đủ {totalQuestions} câu hỏi của bộ đề.
                </p>
              </div>
            </div>

            {/* BẢNG THEO DÕI TIẾN ĐỘ HỌC CỦA BỘ ĐỀ */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/50 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-950 dark:text-indigo-200">
                <span>Tiến độ thành thạo bộ đề:</span>
                <span>
                  {masteredQuestions.length} / {totalQuestions} câu ({totalQuestions > 0 ? Math.round((masteredQuestions.length / totalQuestions) * 100) : 0}%)
                </span>
              </div>
              <div className="h-2 w-full bg-indigo-200/60 dark:bg-indigo-900/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                  style={{
                    width: `${totalQuestions > 0 ? Math.round((masteredQuestions.length / totalQuestions) * 100) : 0}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300">
                Chế độ này tự động ôn đầy đủ toàn bộ {totalQuestions} câu hỏi.
              </p>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Shuffle className="w-4 h-4 text-indigo-600" />
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                      Trộn thứ tự câu hỏi
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Ngẫu nhiên hóa vị trí các câu trong bộ đề
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                  className="w-5 h-5 text-indigo-600 rounded-md focus:ring-indigo-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 cursor-pointer">
                <div className="flex items-center gap-3">
                  <RotateCw className="w-4 h-4 text-indigo-600" />
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                      Trộn phương án A B C D
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Ngẫu nhiên vị trí các lựa chọn đáp án
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={shuffleOptions}
                  onChange={(e) => setShuffleOptions(e.target.checked)}
                  className="w-5 h-5 text-indigo-600 rounded-md focus:ring-indigo-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                      Hiện đáp án ngay khi chọn
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Xem ngay giải thích chi tiết & đáp án đúng sau từng câu
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={instantFeedback}
                  onChange={(e) => setInstantFeedback(e.target.checked)}
                  className="w-5 h-5 text-indigo-600 rounded-md focus:ring-indigo-500 cursor-pointer"
                />
              </label>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveConfigModal('none');
                  handleLaunchPractice();
                }}
                className="w-full py-3.5 px-4 font-extrabold text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Bắt Đầu Ôn Tập (Tất Cả {totalQuestions} Câu)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIG 2: BẢNG CÀI ĐẶT KIỂM TRA */}
      {activeConfigModal === 'exam' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 relative">
            <button
              type="button"
              onClick={() => setActiveConfigModal('none')}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                  Cài Đặt Chế Độ Kiểm Tra
                </h3>
                <p className="text-xs text-slate-500">
                  Tùy chỉnh số câu hỏi và đồng hồ đếm ngược như thi thật.
                </p>
              </div>
            </div>

            {/* Presets */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Nút thi nhanh chuẩn ma trận:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveConfigModal('none');
                    handleLaunchExamCustom(50, 45);
                  }}
                  className="py-3 px-3 font-extrabold text-xs text-amber-950 bg-amber-300 hover:bg-amber-400 rounded-xl transition-all cursor-pointer text-center shadow-xs"
                >
                  ⚡ Thi 50 Câu (45 Phút)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveConfigModal('none');
                    handleLaunchExamCustom(60, 60);
                  }}
                  className="py-3 px-3 font-extrabold text-xs text-emerald-950 bg-emerald-300 hover:bg-emerald-400 rounded-xl transition-all cursor-pointer text-center shadow-xs"
                >
                  ⚡ Thi 60 Câu (60 Phút)
                </button>
              </div>
            </div>

            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="grid grid-cols-2 gap-4">
                {/* Input Số câu */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Số lượng câu hỏi:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={totalQuestions}
                    value={questionLimitInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setQuestionLimitInput('');
                      } else {
                        const num = parseInt(val, 10);
                        setQuestionLimitInput(isNaN(num) ? '' : num);
                      }
                    }}
                    onBlur={() => {
                      if (questionLimitInput === '' || Number(questionLimitInput) <= 0) {
                        setQuestionLimitInput(totalQuestions);
                      } else if (Number(questionLimitInput) > totalQuestions) {
                        setQuestionLimitInput(totalQuestions);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 block">Tối đa: {totalQuestions} câu</span>
                </div>

                {/* Input Số phút */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Thời gian làm bài (phút):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={timeLimitMinutesInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setTimeLimitMinutesInput('');
                      } else {
                        const num = parseInt(val, 10);
                        setTimeLimitMinutesInput(isNaN(num) ? '' : num);
                      }
                    }}
                    onBlur={() => {
                      if (timeLimitMinutesInput === '' || Number(timeLimitMinutesInput) <= 0) {
                        setTimeLimitMinutesInput(45);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 block">Đồng hồ đếm ngược</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveConfigModal('none');
                  handleLaunchExamCustom();
                }}
                className="w-full py-3.5 px-4 font-extrabold text-xs text-white bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Award className="w-4 h-4 text-amber-400" />
                <span>Bắt Đầu Kiểm Tra ({questionLimitInput || totalQuestions} câu - {timeLimitMinutesInput || 45} phút)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INLINE FLASHCARD WIDGET - BẢNG THẺ GHI NHỚ HIỆN TRỰC TIẾP TẠI TRANG */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Bảng thẻ ghi nhớ Flashcards ({totalQuestions} thẻ)
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            Mặt trước: Câu hỏi + 4 đáp án | Mặt sau: Đáp án đúng + Giải thích
          </span>
        </div>

        <FlashcardViewer quizId={quiz.id} questions={quiz.questions} onFinish={() => {}} />
      </div>

      {/* 3. DANH SÁCH TẤT CẢ CÂU HỎI INPPUT VÀO (FULL LIST WITH CLICKABLE TRANSLATION WORDS) */}
      <div className="space-y-4 pt-2">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
              Danh sách tất cả câu hỏi ({totalQuestions} câu)
            </h3>
            <span className="text-[11px] text-slate-400 italic hidden sm:inline">
              • Chạm vào từ bất kỳ để tra từ điển tiếng Việt
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto">
            {/* Lựa chọn sắp xếp: Thứ tự gốc vs Thứ tự đánh dấu sao lên đầu */}
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  sound.playFlip();
                  setSortMode('original');
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  sortMode === 'original'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-extrabold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="Hiển thị theo thứ tự ban đầu của đề thi"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>Thứ tự gốc</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playFlip();
                  setSortMode('starred-first');
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  sortMode === 'starred-first'
                    ? 'bg-amber-500 text-white shadow-xs font-extrabold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400'
                }`}
                title="Đưa các câu hỏi đã đánh dấu sao lên vị trí đầu danh sách"
              >
                <Star className={`w-3.5 h-3.5 ${sortMode === 'starred-first' ? 'fill-current text-white' : 'text-amber-500'}`} />
                <span>Đánh dấu sao lên đầu</span>
                {starredCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                      sortMode === 'starred-first'
                        ? 'bg-amber-700 text-white'
                        : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    {starredCount}
                  </span>
                )}
              </button>
            </div>

            {/* Tìm kiếm câu hỏi */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm từ khóa câu hỏi, đáp án, ghi chú..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {filteredQuestions.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
            <p className="text-xs text-slate-400 font-medium">Không tìm thấy câu hỏi phù hợp.</p>
          </div>
        ) : (
          filteredQuestions.map((q, idx) => {
            const isStarred = starredIds.has(q.id);
            const questionNumber = q._originalIndex || idx + 1;
            return (
              <div
                key={q.id || idx}
                className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 relative group"
              >
                {/* 2-Column Split: Left = Question & Choices | Right = Answer, Explanation & Notes */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  {/* Left Column: Question & Options */}
                  <div className="space-y-3 lg:pr-6 lg:border-r lg:border-slate-100 dark:lg:border-slate-800">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap flex-1">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 leading-snug">
                          Câu {questionNumber}. <ClickableText text={q.question} isExamMode={false} quizId={currentQuiz.id} quizTitle={currentQuiz.title} />
                        </span>
                        {isStarred && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/70 px-2 py-0.5 rounded-md shrink-0">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            <span>Đã gắn sao</span>
                          </span>
                        )}
                      </div>

                      {/* Action buttons: AI Explanation, AI Similar, Star & Audio Speaker */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setAiModalQuestion(q)}
                          title="Hỏi AI giải thích câu này"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>Hỏi AI</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTargetQuestionForSimilar(q);
                            setIsSimilarModalOpen(true);
                          }}
                          title="Tạo câu hỏi tương tự với AI"
                          className="p-2 rounded-xl text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/60 transition-all cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditQuestion(questionNumber - 1, q)}
                          title="Sửa câu hỏi & ảnh"
                          className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-all cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => speakText(q.question)}
                          title="Đọc câu hỏi bằng giọng nói"
                          className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-all cursor-pointer"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleStar(q.id)}
                          title={isStarred ? 'Bỏ đánh dấu sao' : 'Đánh dấu sao câu hỏi này'}
                          className={`p-2 rounded-xl transition-all cursor-pointer ${
                            isStarred
                              ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/60'
                              : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <Star className={`w-4 h-4 ${isStarred ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {q.imageUrl && (
                      <div className="rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 max-h-[250px] bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-2">
                        <img
                          src={q.imageUrl}
                          alt="Ảnh đính kèm"
                          referrerPolicy="no-referrer"
                          className="max-h-[230px] w-auto object-contain rounded-xl"
                        />
                      </div>
                    )}

                  <div className="space-y-2 pt-1">
                    {(() => {
                      const correctList =
                        q.correctAnswers && q.correctAnswers.length > 0
                          ? q.correctAnswers
                          : typeof q.correctAnswer === 'number'
                          ? [q.correctAnswer]
                          : [];
                      return q.options.map((opt, optIdx) => {
                        const isCorrect = correctList.includes(optIdx);
                        return (
                          <div
                            key={optIdx}
                            className={`p-3 rounded-xl border flex items-center gap-3 text-xs transition-all ${
                              isCorrect
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 font-bold border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0 ${
                                isCorrect
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {letters[optIdx] || String.fromCharCode(65 + optIdx)}
                            </span>
                            <span className="leading-relaxed flex-1">
                              <ClickableText text={opt} isExamMode={false} quizId={currentQuiz.id} quizTitle={currentQuiz.title} />
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Right Column: Correct Answer & Explanation / Detailed Notes */}
                <div className="space-y-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Đáp án & Giải thích chi tiết
                  </span>

                  {/* Correct Answer Box */}
                  <div className="p-4 rounded-xl bg-emerald-500 text-white shadow-xs space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-90">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        Đáp án chính xác{' '}
                        {q.correctAnswers && q.correctAnswers.length > 1 ? '(Đa đáp án)' : ''}:
                      </span>
                    </div>
                    <div className="text-base font-extrabold pl-6 flex flex-wrap gap-2">
                      {(q.correctAnswers && q.correctAnswers.length > 0
                        ? q.correctAnswers
                        : [q.correctAnswer ?? 0]
                      ).map((cIdx) => (
                        <span key={cIdx} className="inline-block bg-emerald-600/60 border border-emerald-300/40 px-2 py-0.5 rounded-lg">
                          [{letters[cIdx] || String.fromCharCode(65 + cIdx)}] {q.options[cIdx]}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Explanation Box */}
                  {q.explanation && (
                    <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/50 space-y-1.5 text-xs text-indigo-950 dark:text-indigo-200">
                      <div className="flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-300">
                        <Sparkles className="w-4 h-4 shrink-0 text-indigo-600" />
                        <span>Giải thích chi tiết:</span>
                      </div>
                      <div className="pl-6 leading-relaxed whitespace-pre-line text-indigo-900 dark:text-indigo-200">
                        {q.explanation}
                      </div>
                    </div>
                  )}

                  {/* Notes Box */}
                  {q.note && (
                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 space-y-1.5 text-xs text-amber-950 dark:text-amber-200">
                      <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300">
                        <FileText className="w-4 h-4 shrink-0 text-amber-600" />
                        <span>Ghi chú ghi nhớ:</span>
                      </div>
                      <div className="pl-6 leading-relaxed font-mono text-[12px] whitespace-pre-line text-amber-900 dark:text-amber-200">
                        {q.note}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>

    {/* AI Question Modal */}
    {aiModalQuestion && (
      <AiQuestionModal
        question={aiModalQuestion}
        isOpen={!!aiModalQuestion}
        onClose={() => setAiModalQuestion(null)}
      />
    )}

    {/* Edit Question Modal */}
    {editingQuestionIndex !== null && (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-indigo-600" />
              <span>Chỉnh sửa Câu hỏi #{editingQuestionIndex + 1}</span>
            </h3>
            <button
              type="button"
              onClick={() => setEditingQuestionIndex(null)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Question Text */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nội dung câu hỏi:
              </label>
              <textarea
                rows={3}
                value={qEditForm.question}
                onChange={(e) => setQEditForm((prev) => ({ ...prev, question: e.target.value }))}
                className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Question Image (URL / File / Paste / Drag & Drop) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Image className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Ảnh đính kèm câu hỏi (URL, Tải file, hoặc Dán ảnh Ctrl+V)</span>
                </span>
                {qEditForm.imageUrl && (
                  <button
                    type="button"
                    onClick={() => setQEditForm((prev) => ({ ...prev, imageUrl: '' }))}
                    className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                  >
                    Xóa ảnh
                  </button>
                )}
              </label>
              <div
                onPaste={(e) => {
                  const items = e.clipboardData?.items;
                  if (!items) return;
                  for (let i = 0; i < items.length; i++) {
                    if (items[i].type.startsWith('image/')) {
                      const blob = items[i].getAsFile();
                      if (blob) {
                        handleProcessImage(blob);
                        e.preventDefault();
                      }
                    }
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.type.startsWith('image/')) {
                    handleProcessImage(file);
                  }
                }}
                className="space-y-2"
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={qEditForm.imageUrl}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.startsWith('data:image/')) {
                        handleProcessImage(val);
                      } else {
                        setQEditForm((prev) => ({ ...prev, imageUrl: val }));
                      }
                    }}
                    placeholder="Dán URL ảnh hoặc nhấn Ctrl+V để dán ảnh từ bộ nhớ tạm..."
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <label className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 cursor-pointer flex items-center gap-1.5 shrink-0 transition-all">
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Chọn file</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleProcessImage(file);
                        }
                      }}
                    />
                  </label>
                </div>

                {qEditForm.imageUrl ? (
                  <div className="relative p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl max-h-[160px] flex items-center justify-center overflow-hidden">
                    <img src={qEditForm.imageUrl} alt="Preview" className="max-h-[140px] w-auto object-contain rounded-lg" />
                    <button
                      type="button"
                      onClick={() => setQEditForm((prev) => ({ ...prev, imageUrl: '' }))}
                      className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-full opacity-80 hover:opacity-100 transition-opacity cursor-pointer shadow-md"
                      title="Xóa ảnh này"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    💡 Mẹo: Bạn có thể sao chép ảnh từ màn hình/web rồi nhấn <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 border rounded text-[10px] font-mono">Ctrl + V</kbd> hoặc kéo thả tệp ảnh vào đây!
                  </p>
                )}
              </div>
            </div>

            {/* Options */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Các lựa chọn (Tích chọn 1 hoặc NHIỀU đáp án đúng):
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Đã chọn {qEditForm.correctAnswers.length} đáp án đúng
                  </span>
                  <button
                    type="button"
                    onClick={() => setQEditForm((prev) => ({ ...prev, options: [...prev.options, ''] }))}
                    className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm phương án</span>
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {qEditForm.options.map((opt, oIdx) => {
                  const letter = letters[oIdx] || `${oIdx + 1}`;
                  const isChecked = qEditForm.correctAnswers.includes(oIdx);
                  return (
                    <div key={oIdx} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setQEditForm((prev) => {
                            const exists = prev.correctAnswers.includes(oIdx);
                            let nextAns: number[];
                            if (exists) {
                              nextAns = prev.correctAnswers.filter((i) => i !== oIdx);
                            } else {
                              nextAns = [...prev.correctAnswers, oIdx];
                            }
                            return { ...prev, correctAnswers: nextAns };
                          });
                        }}
                        className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center cursor-pointer shrink-0 transition-all ${
                          isChecked
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                        title={isChecked ? 'Bấm để hủy chọn đáp án đúng' : 'Bấm để chọn làm đáp án đúng'}
                      >
                        {letter}
                      </button>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const val = e.target.value;
                          setQEditForm((prev) => {
                            const nextOpts = [...prev.options];
                            nextOpts[oIdx] = val;
                            return { ...prev, options: nextOpts };
                          });
                        }}
                        placeholder={`Lựa chọn ${letter}...`}
                        className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                      {qEditForm.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            setQEditForm((prev) => {
                              const nextOpts = prev.options.filter((_, i) => i !== oIdx);
                              const nextCorrect = prev.correctAnswers
                                .filter((i) => i !== oIdx)
                                .map((i) => (i > oIdx ? i - 1 : i));
                              return { ...prev, options: nextOpts, correctAnswers: nextCorrect };
                            });
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Explanation & Note */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Giải thích chi tiết:
                </label>
                <textarea
                  rows={2}
                  value={qEditForm.explanation}
                  onChange={(e) => setQEditForm((prev) => ({ ...prev, explanation: e.target.value }))}
                  placeholder="Giải thích vì sao đáp án này đúng..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Ghi chú / Mẹo nhớ:
                </label>
                <textarea
                  rows={2}
                  value={qEditForm.note}
                  onChange={(e) => setQEditForm((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="Mẹo nhớ nhanh..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setEditingQuestionIndex(null)}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveQuestionEdit}
              className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Lưu thay đổi</span>
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Share Quiz Modal */}
    {isShareModalOpen && (
      <ShareQuizModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        quiz={currentQuiz}
      />
    )}

    {/* AI Similar Questions Generator Modal */}
    {isSimilarModalOpen && (
      <AiSimilarQuestionsModal
        isOpen={isSimilarModalOpen}
        onClose={() => {
          setIsSimilarModalOpen(false);
          setSelectedTargetQuestionForSimilar(null);
        }}
        originalQuestion={selectedTargetQuestionForSimilar || currentQuiz.questions[0]}
        onAddQuestionsToQuiz={(newQuestions) => {
          const updated: Quiz = {
            ...currentQuiz,
            questions: [...currentQuiz.questions, ...newQuestions],
          };
          saveQuiz(updated);
          setCurrentQuiz(updated);
          if (onUpdateQuiz) onUpdateQuiz(updated);
          sound.playCorrect();
        }}
      />
    )}
  </div>
);
};
