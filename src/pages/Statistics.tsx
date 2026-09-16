import React, { useMemo } from 'react';
import { GlobalStatistics, Quiz } from '../types/quiz';
import { getMostDifficultQuestions, getActivityHeatmap, getSubjectMasteryBreakdown } from '../utils/statistics';
import { getAttempts } from '../utils/storage';
import { DifficultyBadge } from '../components/DifficultyBadge';
import {
  BarChart3,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Trophy,
  AlertTriangle,
  Play,
  Award,
  BookOpen,
  Calendar,
  Flame,
  Layers,
  TrendingUp,
} from 'lucide-react';

interface StatisticsProps {
  stats: GlobalStatistics;
  quizzes: Quiz[];
  onPracticeSingleQuestion: (quizId: string, questionId: string) => void;
}

export const Statistics: React.FC<StatisticsProps> = ({
  stats,
  quizzes,
  onPracticeSingleQuestion,
}) => {
  const difficultQuestions = useMemo(() => getMostDifficultQuestions(quizzes, 6), [quizzes]);
  const attempts = useMemo(() => getAttempts(), []);
  const heatmapData = useMemo(() => getActivityHeatmap(attempts, 60), [attempts]);
  const masteryBreakdown = useMemo(() => getSubjectMasteryBreakdown(quizzes), [quizzes]);
  const currentStreak = heatmapData.currentStreak;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Phân tích & Thống kê học tập
          </h2>
          <p className="text-xs text-slate-400">
            Thống kê chi tiết biểu đồ học tập, mức độ thành thạo theo từng môn và câu hỏi hay sai.
          </p>
        </div>

        {/* Streak Badge */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300">
            <Flame className="w-5 h-5 fill-amber-500 text-amber-500" />
            <div>
              <span className="text-xs font-black block leading-none">{currentStreak} Ngày liên tiếp</span>
              <span className="text-[10px] text-amber-600/80 dark:text-amber-400 font-medium">Chuỗi chăm chỉ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Tổng số câu hỏi</span>
            <HelpCircle className="w-4 h-4 text-indigo-500" />
          </div>
          <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 block">
            {stats.totalQuestions}
          </span>
          <span className="text-[11px] text-slate-400">Trong hệ thống</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Câu hỏi đã làm</span>
            <BarChart3 className="w-4 h-4 text-indigo-500" />
          </div>
          <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 block">
            {stats.questionsAnswered}
          </span>
          <span className="text-[11px] text-slate-400">Tổng lượt trả lời</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Số câu đúng</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 block">
            {stats.correctAnswers}
          </span>
          <span className="text-[11px] text-slate-400">Lượt chọn chính xác</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Số câu sai</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <span className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 block">
            {stats.wrongAnswers}
          </span>
          <span className="text-[11px] text-slate-400">Lượt chọn chưa đúng</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Tỷ lệ chính xác</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 block">
            {stats.accuracy}%
          </span>
          <span className="text-[11px] text-slate-400">Tỷ lệ trung bình</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Điểm cao nhất</span>
            <Trophy className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 block">
            {stats.bestScorePercentage}%
          </span>
          <span className="text-[11px] text-slate-400">Thành tích tốt nhất</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1 col-span-2 sm:col-span-1 lg:col-span-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Bài thi đã làm</span>
            <BookOpen className="w-4 h-4 text-indigo-500" />
          </div>
          <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 block">
            {stats.quizzesCompleted}
          </span>
          <span className="text-[11px] text-slate-400">Lượt hoàn thành bộ đề</span>
        </div>
      </div>

      {/* Activity Heatmap Section */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Lịch sử hoạt động 60 ngày gần nhất
              </h3>
              <p className="text-xs text-slate-400">Mức độ chăm chỉ và tần suất làm câu hỏi mỗi ngày</p>
            </div>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="overflow-x-auto pb-2">
          <div className="flex items-center gap-1.5 min-w-[500px]">
            {heatmapData.days.map((day) => {
              let bg = 'bg-slate-100 dark:bg-slate-800';
              if (day.level === 1) bg = 'bg-emerald-200 dark:bg-emerald-950/80 border border-emerald-300';
              else if (day.level === 2) bg = 'bg-emerald-400 dark:bg-emerald-800';
              else if (day.level === 3) bg = 'bg-emerald-600 dark:bg-emerald-600';
              else if (day.level === 4) bg = 'bg-emerald-700 dark:bg-emerald-400';

              return (
                <div
                  key={day.dateStr}
                  title={`${day.dateStr}: ${day.count} câu hỏi đã làm`}
                  className={`w-4 h-4 rounded-md ${bg} transition-all hover:scale-125 cursor-pointer shrink-0`}
                />
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
          <span>60 ngày trước</span>
          <div className="flex items-center gap-1.5">
            <span>Ít</span>
            <div className="w-3 h-3 rounded-xs bg-slate-100 dark:bg-slate-800" />
            <div className="w-3 h-3 rounded-xs bg-emerald-200 dark:bg-emerald-900" />
            <div className="w-3 h-3 rounded-xs bg-emerald-400 dark:bg-emerald-700" />
            <div className="w-3 h-3 rounded-xs bg-emerald-600 dark:bg-emerald-500" />
            <span>Nhiều</span>
          </div>
          <span>Hôm nay</span>
        </div>
      </div>

      {/* Subject Mastery Breakdown */}
      {masteryBreakdown.length > 0 && (
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Mức độ thành thạo theo từng Môn học
              </h3>
              <p className="text-xs text-slate-400">Tỷ lệ câu hỏi đã thuộc lòng (Mastered) theo danh mục</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {masteryBreakdown.map((item) => (
              <div
                key={item.subject}
                className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{item.subject}</span>
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                    {item.masteryPercentage}% ({item.masteredQuestions}/{item.totalQuestions})
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${item.masteryPercentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Most Difficult Questions Section */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Các câu hỏi khó nhất
              </h3>
              <p className="text-xs text-slate-400">
                Những câu hỏi có tỷ lệ sai cao nhất mà bạn cần chú ý rèn luyện lại.
              </p>
            </div>
          </div>
        </div>

        {difficultQuestions.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-6">
            Chưa có đủ dữ liệu thống kê câu hỏi khó. Làm thêm các bài quiz để ghi nhận lịch sử!
          </p>
        ) : (
          <div className="space-y-3">
            {difficultQuestions.map((item, idx) => (
              <div
                key={item.question.id || idx}
                className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                      #{idx + 1}
                    </span>
                    <DifficultyBadge difficulty={item.question.difficulty} />
                    <span className="text-xs text-slate-400 font-medium">
                      Bộ đề: {item.quizTitle}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {item.question.question}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <span className="text-rose-600 dark:text-rose-400 font-bold">
                      Trả lời sai: {item.question.timesWrong} lần
                    </span>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      Trả lời đúng: {item.question.timesCorrect} lần
                    </span>
                    <span>•</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Tỷ lệ đúng: {item.accuracy}%
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onPracticeSingleQuestion(item.quizId, item.question.id)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Luyện câu hỏi này</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

