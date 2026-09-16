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
  searchTerm: string;
  selectedSubject: string;
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

  // Filter quizzes by search and subject
  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesSearch =
      !searchTerm ||
      quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quiz.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quiz.subject.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSubject = selectedSubject === 'All' || quiz.subject === selectedSubject;

    return matchesSearch && matchesSubject;
  });

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

      {/* Quizzes List Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800 flex-wrap gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <span>Bộ đề của tôi</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold">
              {filteredQuizzes.length} bộ đề
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Bấm vào bất kỳ bộ đề nào để xem danh sách câu hỏi và ôn tập.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Generator Button */}
          <button
            type="button"
            onClick={handleOpenAiModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold text-indigo-600 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 border border-indigo-200/80 dark:border-indigo-800 rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>AI Sinh Bộ Đề</span>
          </button>

          <button
            type="button"
            onClick={handleCreateClick}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo bộ đề mới</span>
          </button>
        </div>
      </div>

      {/* Quizzes Grid */}
      {filteredQuizzes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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

