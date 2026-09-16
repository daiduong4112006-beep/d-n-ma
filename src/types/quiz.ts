export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface Question {
  id: string;
  question: string;
  options: [string, string, string, string] | string[];
  correctAnswer: number; // 0, 1, 2, or 3 (first correct answer)
  correctAnswers?: number[]; // Array of correct answer indices for multi-answer questions (e.g. [2, 3] for @c,d)
  explanation: string;
  note?: string;
  difficulty: Difficulty;
  timesAnswered: number;
  timesCorrect: number;
  timesWrong: number;
  mastered: boolean;
  imageUrl?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  subject: string;
  topic: string;
  createdAt: string;
  updatedAt: string;
  questions: Question[];
  lastScore?: number;
  lastTotal?: number;
  lastAttemptDate?: string;
  timesCompleted: number;
}

export interface QuestionResult {
  questionId: string;
  questionText: string;
  options: string[];
  selectedAnswer: number | number[];
  selectedAnswers?: number[];
  correctAnswer: number;
  correctAnswers?: number[];
  isCorrect: boolean;
  explanation: string;
  note?: string;
  difficulty: Difficulty;
  imageUrl?: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  quizTitle: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  accuracy: number; // 0 to 100
  date: string; // ISO string
  questionResults: QuestionResult[];
  mode?: 'normal' | 'practice_mistakes' | 'single_question';
}

export interface GlobalStatistics {
  totalQuestions: number;
  questionsAnswered: number;
  correctAnswers: number;
  wrongAnswers: number;
  accuracy: number;
  bestScorePercentage: number;
  quizzesCompleted: number;
}

export interface WrongQuestionDetail {
  question: Question;
  quizId: string;
  quizTitle: string;
  subject: string;
}

export interface StudyOptions {
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  questionLimit: number; // 0 = all
  mode: 'mcq' | 'flashcard';
  instantFeedback: boolean;
  timeLimitMinutes?: number; // 0 or undefined = no timer limit
}

