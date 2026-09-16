import { Quiz, Question, QuizAttempt } from '../types/quiz';

export interface DifficultQuestionItem {
  question: Question;
  quizId: string;
  quizTitle: string;
  subject: string;
  accuracy: number; // 0 to 100
}

export const getMostDifficultQuestions = (quizzes: Quiz[], maxCount: number = 6): DifficultQuestionItem[] => {
  const items: DifficultQuestionItem[] = [];

  quizzes.forEach((quiz) => {
    quiz.questions.forEach((q) => {
      if (q.timesAnswered > 0) {
        const accuracy = Math.round((q.timesCorrect / q.timesAnswered) * 100);
        items.push({
          question: q,
          quizId: quiz.id,
          quizTitle: quiz.title,
          subject: quiz.subject,
          accuracy,
        });
      }
    });
  });

  // Sort by lowest accuracy first, then by highest timesWrong
  items.sort((a, b) => {
    if (a.accuracy !== b.accuracy) {
      return a.accuracy - b.accuracy;
    }
    return b.question.timesWrong - a.question.timesWrong;
  });

  return items.slice(0, maxCount);
};

export const getSubjectsList = (quizzes: Quiz[]): string[] => {
  const set = new Set<string>();
  quizzes.forEach((q) => {
    if (q.subject) set.add(q.subject);
  });
  return Array.from(set);
};

export interface HeatmapDay {
  dateStr: string; // YYYY-MM-DD
  count: number; // quizzes completed or questions done
  level: 0 | 1 | 2 | 3 | 4; // color intensity
}

/**
 * Generates activity heatmap data for the past N days (e.g. 90-120 days)
 */
export const getActivityHeatmap = (attempts: QuizAttempt[], days: number = 105): { days: HeatmapDay[]; totalActiveDays: number; currentStreak: number } => {
  const map = new Map<string, number>();

  // Aggregate attempts per day
  attempts.forEach((att) => {
    if (att.date) {
      const datePart = att.date.split('T')[0];
      map.set(datePart, (map.get(datePart) || 0) + (att.totalQuestions || 1));
    }
  });

  const result: HeatmapDay[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    const count = map.get(dateStr) || 0;

    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (count > 0 && count <= 5) level = 1;
    else if (count > 5 && count <= 15) level = 2;
    else if (count > 15 && count <= 30) level = 3;
    else if (count > 30) level = 4;

    result.push({ dateStr, count, level });
  }

  let totalActiveDays = 0;
  map.forEach((val) => {
    if (val > 0) totalActiveDays++;
  });

  // Calculate current streak
  let currentStreak = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    const count = map.get(dateStr) || 0;
    if (count > 0) {
      currentStreak++;
    } else if (i > 0) {
      break; // broken streak
    }
  }

  return { days: result, totalActiveDays, currentStreak };
};

export interface SubjectMastery {
  subject: string;
  totalQuestions: number;
  masteredQuestions: number;
  timesAnswered: number;
  timesCorrect: number;
  accuracy: number; // 0-100
  masteryPercentage: number; // 0-100
}

/**
 * Calculates mastery level grouped by subject
 */
export const getSubjectMasteryBreakdown = (quizzes: Quiz[]): SubjectMastery[] => {
  const map = new Map<string, { total: number; mastered: number; answered: number; correct: number }>();

  quizzes.forEach((quiz) => {
    const subj = quiz.subject?.trim() || 'Chung';
    if (!map.has(subj)) {
      map.set(subj, { total: 0, mastered: 0, answered: 0, correct: 0 });
    }
    const cur = map.get(subj)!;
    quiz.questions.forEach((q) => {
      cur.total += 1;
      if (q.mastered) cur.mastered += 1;
      cur.answered += q.timesAnswered || 0;
      cur.correct += q.timesCorrect || 0;
    });
  });

  return Array.from(map.entries()).map(([subject, data]) => {
    const accuracy = data.answered > 0 ? Math.round((data.correct / data.answered) * 100) : 0;
    const masteryPercentage = data.total > 0 ? Math.round((data.mastered / data.total) * 100) : 0;
    return {
      subject,
      totalQuestions: data.total,
      masteredQuestions: data.mastered,
      timesAnswered: data.answered,
      timesCorrect: data.correct,
      accuracy,
      masteryPercentage,
    };
  }).sort((a, b) => b.totalQuestions - a.totalQuestions);
};

/**
 * Calculate overall Exam Readiness Index (0 - 100%)
 */
export const calculateExamReadiness = (quizzes: Quiz[], attempts: QuizAttempt[]): {
  score: number;
  gradeText: string;
  recommendation: string;
} => {
  if (quizzes.length === 0 || attempts.length === 0) {
    return {
      score: 0,
      gradeText: 'Chưa đủ dữ liệu',
      recommendation: 'Hãy làm thử ít nhất 1-2 bài thi để hệ thống đánh giá năng lực!',
    };
  }

  let totalQuestions = 0;
  let masteredQuestions = 0;
  quizzes.forEach((q) => {
    totalQuestions += q.questions.length;
    masteredQuestions += q.questions.filter((item) => item.mastered).length;
  });

  // Average of recent 5 attempts accuracy
  const recentAttempts = attempts.slice(0, 5);
  const avgRecentAccuracy = recentAttempts.reduce((sum, a) => sum + (a.accuracy || 0), 0) / (recentAttempts.length || 1);

  // Coverage ratio
  const coverageRatio = totalQuestions > 0 ? (masteredQuestions / totalQuestions) * 100 : 0;

  // Composite Readiness Score: 60% accuracy + 40% mastery coverage
  const readiness = Math.min(100, Math.round(avgRecentAccuracy * 0.6 + coverageRatio * 0.4));

  let gradeText = 'Mới bắt đầu';
  let recommendation = 'Hãy tiếp tục làm quen với các bộ đề cơ bản.';

  if (readiness >= 90) {
    gradeText = 'Xuất sắc / Sẵn sàng 100%';
    recommendation = 'Kiến thức rất vững vàng! Bạn có thể tự tin bước vào kỳ thi thật.';
  } else if (readiness >= 75) {
    gradeText = 'Khá Tốt / Sẵn sàng cao';
    recommendation = 'Nắm vững phần lớn kiến thức. Hãy ôn lại vài câu hay sai để đạt điểm tối đa.';
  } else if (readiness >= 55) {
    gradeText = 'Trung bình / Cần củng cố';
    recommendation = 'Nên dành thêm thời gian luyện Flashcard và làm lại các câu bị sai.';
  } else {
    gradeText = 'Cần nỗ lực nhiều hơn';
    recommendation = 'Tập trung ôn từng chủ đề nhỏ với AI giải thích trước khi thi thử.';
  }

  return { score: readiness, gradeText, recommendation };
};
