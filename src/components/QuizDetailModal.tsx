import React, { useState } from 'react';
import { Quiz, StudyOptions } from '../types/quiz';
import {
  X,
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
  Sliders,
  RotateCw,
  HelpCircle,
  FileText,
} from 'lucide-react';

interface QuizDetailModalProps {
  quiz: Quiz | null;
  isOpen: boolean;
  onClose: () => void;
  onStartPractice: (quizId: string, options: StudyOptions) => void;
  onEditQuiz: (quizId: string) => void;
  onDeleteQuiz: (quizId: string) => void;
}

export const QuizDetailModal: React.FC<QuizDetailModalProps> = ({
  quiz,
  isOpen,
  onClose,
  onStartPractice,
  onEditQuiz,
  onDeleteQuiz,
}) => {
  if (!isOpen || !quiz) return null;

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'questions' | 'study'>('questions');

  // Quizlet Study Options state
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [questionLimit, setQuestionLimit] = useState<number>(0); // 0 = all
  const [studyMode, setStudyMode] = useState<'mcq' | 'flashcard'>('mcq');
  const [instantFeedback, setInstantFeedback] = useState(true);

  const totalQuestions = quiz.questions.length;
  const letters = ['A', 'B', 'C', 'D'];

  const filteredQuestions = quiz.questions.filter(
    (q) =>
      q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.options.some((opt) => opt.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (q.note && q.note.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleLaunch = (overrideMode?: 'mcq' | 'flashcard') => {
    onStartPractice(quiz.id, {
      shuffleQuestions,
      shuffleOptions,
      questionLimit,
      mode: overrideMode || studyMode,
      instantFeedback,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 md:p-6 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 text-xs font-bold rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {quiz.subject || 'Tổng hợp'}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                • {totalQuestions} câu hỏi
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {quiz.title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
              {quiz.description || 'Danh sách câu hỏi trắc nghiệm.'}
            </p>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleLaunch('mcq')}
              className="inline-flex items-center gap-1.5 px-4 py-2 font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Thi Trắc Nghiệm</span>
            </button>

            <button
              type="button"
              onClick={() => handleLaunch('flashcard')}
              className="inline-flex items-center gap-1.5 px-4 py-2 font-bold text-xs text-amber-900 bg-amber-300 hover:bg-amber-400 dark:bg-amber-400 dark:hover:bg-amber-300 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Thẻ Ghi Nhớ</span>
            </button>

            <button
              type="button"
              onClick={() => onEditQuiz(quiz.id)}
              className="p-2 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              title="Chỉnh sửa bộ đề"
            >
              <Edit3 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (window.confirm('Bạn có chắc chắn muốn xóa bộ đề này?')) {
                  onDeleteQuiz(quiz.id);
                  onClose();
                }
              }}
              className="p-2 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer"
              title="Xóa bộ đề"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="flex items-center justify-between px-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('questions')}
              className={`flex items-center gap-2 py-3 px-4 font-bold text-xs border-b-2 transition-all cursor-pointer ${
                activeTab === 'questions'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Danh sách câu hỏi ({totalQuestions})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('study')}
              className={`flex items-center gap-2 py-3 px-4 font-bold text-xs border-b-2 transition-all cursor-pointer ${
                activeTab === 'study'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Tùy chỉnh ôn tập</span>
            </button>
          </div>

          {activeTab === 'questions' && (
            <div className="relative w-64 hidden sm:block">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm câu hỏi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'questions' ? (
            /* Quizlet Split Side-by-Side Question List View */
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Mobile Search bar */}
              <div className="relative sm:hidden">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm câu hỏi, ghi chú..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                />
              </div>

              {filteredQuestions.length === 0 ? (
                <p className="text-center py-12 text-xs text-slate-400">
                  Không tìm thấy câu hỏi phù hợp.
                </p>
              ) : (
                filteredQuestions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                  >
                    {/* Split 2-Column Grid: Left = Question & Options | Right = Answer & Notes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                      {/* Left Column: Câu hỏi & Các phương án */}
                      <div className="space-y-3 md:pr-4 md:border-r md:border-slate-200/70 dark:md:border-slate-800">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 leading-snug">
                            Câu {idx + 1}. {q.question}
                          </span>
                        </div>

                        <div className="space-y-1.5 pt-1">
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
                                  className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-xs transition-all ${
                                    isCorrect
                                      ? 'bg-emerald-50/80 dark:bg-emerald-950/60 font-bold border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  <span
                                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 ${
                                      isCorrect
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                    }`}
                                  >
                                    {letters[optIdx]}
                                  </span>
                                  <span className="leading-relaxed">{opt}</span>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>

                      {/* Right Column: Đáp án đúng & Giải thích / Ghi chú */}
                      <div className="space-y-3">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                          Đáp án đúng & Giải thích
                        </span>

                        {/* Correct Answer Box */}
                        <div className="p-3.5 rounded-xl bg-emerald-500 text-white shadow-xs space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider opacity-90">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Đáp án chính xác {q.correctAnswers && q.correctAnswers.length > 1 ? '(Đa đáp án)' : ''}:</span>
                          </div>
                          <div className="text-sm font-extrabold pl-5 flex flex-wrap gap-1.5">
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

                        {/* Notes / Explanation Box */}
                        {q.note || q.explanation ? (
                          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 space-y-1 text-xs text-amber-950 dark:text-amber-200">
                            <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                              <FileText className="w-4 h-4 shrink-0" />
                              <span>Ghi chú / Giải thích chi tiết (#):</span>
                            </div>
                            <p className="pl-5 leading-relaxed font-mono text-[11px] whitespace-pre-line text-amber-900 dark:text-amber-200">
                              {q.note || q.explanation}
                            </p>
                          </div>
                        ) : (
                          <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-400 italic">
                            Chưa có ghi chú / giải thích cho câu hỏi này.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Study Options Tab */
            <div className="space-y-6 animate-in fade-in duration-200 max-w-2xl mx-auto">
              <div className="space-y-3">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block">
                  1. Hình thức thi
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setStudyMode('mcq')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                      studyMode === 'mcq'
                        ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-100 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-slate-300'
                    }`}
                  >
                    <div className="p-2.5 rounded-xl bg-indigo-600 text-white shrink-0">
                      <Play className="w-5 h-5 fill-current" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm">Thi Trắc Nghiệm MCQ</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Chọn A, B, C, D có tính điểm.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStudyMode('flashcard')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                      studyMode === 'flashcard'
                        ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-100 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-slate-300'
                    }`}
                  >
                    <div className="p-2.5 rounded-xl bg-amber-500 text-white shrink-0">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm">Thẻ Ghi Nhớ (Flashcard)</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Lật thẻ xem đáp án & ghi chú.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Quizlet Toggles & Options */}
              <div className="space-y-4 p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block">
                  2. Tùy chỉnh xáo trộn
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <Shuffle className="w-4 h-4 text-indigo-600" />
                      <div>
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                          Trộn câu hỏi
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          Xáo trộn vị trí các câu
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={shuffleQuestions}
                      onChange={(e) => setShuffleQuestions(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded-md focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <RotateCw className="w-4 h-4 text-indigo-600" />
                      <div>
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                          Trộn phương án
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          Xáo vị trí A, B, C, D
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={shuffleOptions}
                      onChange={(e) => setShuffleOptions(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded-md focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <div>
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                          Hiện đáp án ngay
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          Bấm xong hiện giải thích
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={instantFeedback}
                      onChange={(e) => setInstantFeedback(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded-md focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      <div>
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                          Số lượng câu ôn
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          Giới hạn câu hỏi
                        </span>
                      </div>
                    </div>
                    <select
                      value={questionLimit}
                      onChange={(e) => setQuestionLimit(Number(e.target.value))}
                      className="px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none cursor-pointer"
                    >
                      <option value={0}>Tất cả ({totalQuestions} câu)</option>
                      {totalQuestions > 5 && <option value={5}>5 câu</option>}
                      {totalQuestions > 10 && <option value={10}>10 câu</option>}
                      {totalQuestions > 15 && <option value={15}>15 câu</option>}
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleLaunch()}
                className="w-full py-4 px-6 text-sm font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Bắt Đầu Ôn Tập Ngay</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
