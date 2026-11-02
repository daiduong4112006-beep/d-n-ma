import React, { useState } from 'react';
import { Quiz, StudyOptions } from '../types/quiz';
import { QuizCard } from '../components/QuizCard';
import { AiGenerateQuizModal } from '../components/AiGenerateQuizModal';
import { saveQuiz } from '../utils/storage';
import { sound } from '../utils/audio';
import {
  Plus,
  BookOpen,
  Lock,
  Sparkles,
  CheckCircle2,
  Clock,
  TrendingUp,
} from 'lucide-react';

interface DashboardProps {
  quizzes: Quiz[];
  onStartQuizWithOptions: (quizId: string, options?: StudyOptions) => void;
  onSelectQuizDetails: (quiz: Quiz) => void;
  onEditQuiz: (quizId: string) => void;
  onDeleteQuiz: (quizId: string) => void;
  onCreateQuiz: () => void;
  onNavigateToImport?: () => void;
  onPracticeQuizMistakes?: (quizId: string) => void;
  searchTerm?: string;
  selectedSubject?: string;
  currentUser?: { email: string; name: string } | null;
  onOpenAuthModal?: () => void;
  onQuizCreated?: (newQuiz: Quiz) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  quizzes,
  onStartQuizWithOptions,
  onSelectQuizDetails,
  onEditQuiz,
  onDeleteQuiz,
  onCreateQuiz,
  onNavigateToImport,
  onPracticeQuizMistakes,
  searchTerm,
  selectedSubject,
  currentUser,
  onOpenAuthModal,
  onQuizCreated,
}) => {
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [internalSearch, setInternalSearch] = useState('');
  const [internalSubject, setInternalSubject] = useState('All');

  const effectiveSearch = searchTerm !== undefined ? searchTerm : internalSearch;
  const effectiveSubject = selectedSubject !== undefined && selectedSubject !== '' ? selectedSubject : internalSubject;

  const availableSubjects = React.useMemo(() => {
    const set = new Set<string>();
    quizzes.forEach((q) => {
      if (q.subject && q.subject.trim()) set.add(q.subject.trim());
    });
    return ['All', ...Array.from(set)];
  }, [quizzes]);

  // Filter quizzes by search and subject
  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesSearch =
      !effectiveSearch ||
      quiz.title.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
      quiz.description.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
      quiz.subject.toLowerCase().includes(effectiveSearch.toLowerCase());

    const matchesSubject = effectiveSubject === 'All' || quiz.subject === effectiveSubject;

    return matchesSearch && matchesSubject;
  });

  // Calculate global stats
  const totalQuizzes = quizzes.length;
  const completedQuizzes = quizzes.filter((q) => q.lastScore !== undefined).length;
  const inProgressQuizzes = totalQuizzes - completedQuizzes;

  let totalAnswered = 0;
  let totalCorrect = 0;
  quizzes.forEach((q) => {
    q.questions.forEach((question) => {
      totalAnswered += question.timesAnswered;
      totalCorrect += question.timesCorrect;
    });
  });
  const globalAccuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  const confirmDelete = () => {
    if (deleteCandidateId) {
      onDeleteQuiz(deleteCandidateId);
      setDeleteCandidateId(null);
    }
  };

  const handleCreateClick = () => {
    if (!currentUser) {
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }
    if (onNavigateToImport) {
      onNavigateToImport();
    } else {
      onCreateQuiz();
    }
  };

  const handleOpenAiModal = () => {
    if (!currentUser) {
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }
    setIsAiModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Guest Login Sync Notice Banner */}
      {!currentUser && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">
                Bạn đang sử dụng ở chế độ Khách (chưa đăng nhập)
              </p>
              <p className="text-[11px] sm:text-xs text-amber-700 dark:text-amber-400">
                Đăng nhập cùng 1 tài khoản để đồng bộ bộ đề thi theo thời gian thực (real-time) giữa máy tính và điện thoại.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenAuthModal}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow-2xs shrink-0 cursor-pointer"
          >
            Đăng nhập ngay
          </button>
        </div>
      )}

      {/* Stats Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-indigo-900/5 dark:from-indigo-600/20 dark:to-indigo-900/10 border border-indigo-200/40 dark:border-indigo-500/20 transition-all hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-indigo-600/70 dark:text-indigo-300/70 uppercase tracking-wider">Tổng bộ đề</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{totalQuizzes}</p>
          <p className="text-[11px] text-indigo-500/50 dark:text-indigo-300/50 mt-1">{filteredQuizzes.length} hiển thị</p>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-900/5 dark:from-emerald-600/20 dark:to-emerald-900/10 border border-emerald-200/40 dark:border-emerald-500/20 transition-all hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-emerald-600/70 dark:text-emerald-300/70 uppercase tracking-wider">Đã hoàn thành</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{completedQuizzes}</p>
          <p className="text-[11px] text-emerald-500/50 dark:text-emerald-300/50 mt-1">
            {totalQuizzes > 0 ? Math.round((completedQuizzes / totalQuizzes) * 100) : 0}% tổng
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-900/5 dark:from-amber-600/20 dark:to-amber-900/10 border border-amber-200/40 dark:border-amber-500/20 transition-all hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-amber-600/70 dark:text-amber-300/70 uppercase tracking-wider">Đang học</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-600 dark:text-amber-400">{inProgressQuizzes}</p>
          <p className="text-[11px] text-amber-500/50 dark:text-amber-300/50 mt-1">Cần ôn tập</p>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/10 to-violet-900/5 dark:from-violet-600/20 dark:to-violet-900/10 border border-violet-200/40 dark:border-violet-500/20 transition-all hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-violet-600/70 dark:text-violet-300/70 uppercase tracking-wider">Chính xác TB</span>
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-violet-500 dark:text-violet-400" />
            </div>
          </div>
          <p className="text-3xl font-black text-violet-600 dark:text-violet-400">{globalAccuracy}%</p>
          <p className="text-[11px] text-violet-500/50 dark:text-violet-300/50 mt-1">{totalAnswered} câu đã trả lời</p>
        </div>
      </div>

      {/* Quizzes List Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800 gap-3">
        <div>
          <h2 className="text-lg md:text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <span>Bộ đề gần đây</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold">
              {filteredQuizzes.length} bộ đề
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Bấm vào bất kỳ bộ đề nào để xem danh sách câu hỏi và ôn tập.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* AI Generator Button */}
          <button
            type="button"
            onClick={handleOpenAiModal}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-extrabold text-indigo-600 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 border border-indigo-200/80 dark:border-indigo-800 rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>AI Sinh Bộ Đề</span>
          </button>

          <button
            type="button"
            onClick={handleCreateClick}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo bộ đề mới</span>
          </button>
        </div>
      </div>

      {/* Quizzes Grid */}
      {filteredQuizzes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredQuizzes.map((quiz) => (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              onStart={(id) => onStartQuizWithOptions(id)}
              onSelectQuizDetails={(q) => onSelectQuizDetails(q)}
              onEdit={onEditQuiz}
              onDelete={(id) => setDeleteCandidateId(id)}
              onPracticeQuizMistakes={onPracticeQuizMistakes}
            />
          ))}
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
              Chưa có bộ đề nào
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Không tìm thấy bộ câu hỏi nào. Bạn hãy bấm nút bên dưới để tạo bộ đề mới hoặc dùng AI tạo tự động!
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleOpenAiModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 font-bold text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>AI Tạo Tự Động</span>
            </button>
            <button
              type="button"
              onClick={handleCreateClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo bộ đề mới</span>
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidateId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Xác nhận xóa bộ đề
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Bạn có chắc chắn muốn xóa bộ đề này? Thao tác này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteCandidateId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Xóa ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Generate Quiz Modal */}
      {isAiModalOpen && (
        <AiGenerateQuizModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          onQuizGenerated={(newQuiz) => {
            saveQuiz(newQuiz);
            if (onQuizCreated) onQuizCreated(newQuiz);
            sound.playCorrect();
          }}
        />
      )}
    </div>
  );
};
