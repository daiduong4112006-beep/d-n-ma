import React, { useState } from 'react';
import { Sparkles, X, Loader2, BookOpen, CheckCircle2, ArrowRight, Layers, Sliders, Globe } from 'lucide-react';
import { Quiz, Question } from '../types/quiz';

interface AiGenerateQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuizGenerated: (quiz: Quiz) => void;
}

export const AiGenerateQuizModal: React.FC<AiGenerateQuizModalProps> = ({
  isOpen,
  onClose,
  onQuizGenerated,
}) => {
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('');
  const [count, setCount] = useState<number>(10);
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | 'Mixed'>('Mixed');
  const [language, setLanguage] = useState<'vi' | 'en'>('vi');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick suggestions
  const topicPresets = [
    { title: 'Lập trình Python & Cấu trúc dữ liệu', subject: 'Khoa học máy tính' },
    { title: 'React 19 Hooks, Virtual DOM & State', subject: 'Lập trình Web' },
    { title: 'Ngữ pháp & Từ vựng TOEIC 650+', subject: 'Tiếng Anh' },
    { title: 'Giải tích 1: Đạo hàm & Tích phân', subject: 'Toán học' },
    { title: 'Nguyên lý Hệ điều hành & Đa tiến trình', subject: 'Công nghệ thông tin' },
    { title: 'Kiến thức Lịch sử Thế giới Hiện đại', subject: 'Lịch sử' },
  ];

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() && !customPrompt.trim()) {
      setError('Vui lòng nhập chủ đề hoặc yêu cầu tạo đề thi');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          subject: subject.trim() || 'Tổng hợp',
          count,
          difficulty,
          language,
          customPrompt: customPrompt.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi khi tạo đề thi với AI');
      }

      if (data.questions && data.questions.length > 0) {
        const newQuiz: Quiz = {
          id: `quiz-ai-${Date.now()}`,
          title: data.title || topic.trim(),
          description: `Đề thi trắc nghiệm gồm ${data.questions.length} câu hỏi được tạo tự động bởi AI Gemini.`,
          subject: data.subject || subject.trim() || 'Tổng hợp',
          topic: data.topic || topic.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          timesCompleted: 0,
          questions: data.questions,
        };

        onQuizGenerated(newQuiz);
        onClose();
      } else {
        throw new Error('AI không trả về câu hỏi hợp lệ.');
      }
    } catch (err: any) {
      console.error('Error generating AI quiz:', err);
      setError(err.message || 'Có lỗi xảy ra khi tạo đề thi. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Tạo bộ đề trắc nghiệm bằng AI
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gemini AI sẽ tự động biên soạn câu hỏi, 4 đáp án và giải thích chi tiết bằng Tiếng Việt
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleGenerate} className="space-y-5">
          {/* Topic suggestions */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              Gợi ý chủ đề nhanh:
            </label>
            <div className="flex flex-wrap gap-2">
              {topicPresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setTopic(preset.title);
                    setSubject(preset.subject);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 transition-all cursor-pointer text-left"
                >
                  {preset.title}
                </button>
              ))}
            </div>
          </div>

          {/* Topic & Subject inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Chủ đề / Tên đề thi <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="VD: Cấu trúc dữ liệu & Giải thuật"
                required
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Môn học / Lĩnh vực
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="VD: Công nghệ thông tin"
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Number of questions & Difficulty */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                Số lượng câu hỏi
              </label>
              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value={5}>5 câu hỏi (Nhanh)</option>
                <option value={10}>10 câu hỏi (Tiêu chuẩn)</option>
                <option value={15}>15 câu hỏi (Chuyên sâu)</option>
                <option value={20}>20 câu hỏi (Toàn diện)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                Độ khó
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Mixed">Trộn đều (Dễ / Vừa / Khó)</option>
                <option value="Easy">Dễ (Cơ bản / Nhận biết)</option>
                <option value="Medium">Trung bình (Thông hiểu)</option>
                <option value="Hard">Khó (Vận dụng cao)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-500" />
                Ngôn ngữ câu hỏi
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="vi">Tiếng Việt (Toàn bộ)</option>
                <option value="en">Tiếng Anh (Giải thích bằng TV)</option>
              </select>
            </div>
          </div>

          {/* Custom Prompt / Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Yêu cầu cụ thể hoặc dàn ý bài học (Tùy chọn)
            </label>
            <textarea
              rows={3}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="VD: Tập trung vào độ phức tạp thuật toán O(log n), các câu hỏi trắc nghiệm code Python lồng nhau, tránh các câu hỏi lý thuyết suông..."
              className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI đang soạn {count} câu hỏi...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Tạo bộ đề ngay ({count} câu)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
