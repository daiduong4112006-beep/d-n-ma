import React, { lazy } from 'react';

// Các trang lớn chỉ tải khi mở (giúp lần vào đầu nhanh hơn)
export const SharedQuizPage = lazy(() => import('../pages/SharedQuizPage').then((m) => ({ default: m.SharedQuizPage })));
export const QuizDetailPage = lazy(() => import('../pages/QuizDetailPage').then((m) => ({ default: m.QuizDetailPage })));
export const QuizFormPage = lazy(() => import('../pages/QuizFormPage').then((m) => ({ default: m.QuizFormPage })));
export const QuizPage = lazy(() => import('../pages/QuizPage').then((m) => ({ default: m.QuizPage })));
export const QuizResult = lazy(() => import('../pages/QuizResult').then((m) => ({ default: m.QuizResult })));
export const ReviewPage = lazy(() => import('../pages/ReviewPage').then((m) => ({ default: m.ReviewPage })));
export const PracticeMistakes = lazy(() => import('../pages/PracticeMistakes').then((m) => ({ default: m.PracticeMistakes })));
export const Statistics = lazy(() => import('../pages/Statistics').then((m) => ({ default: m.Statistics })));
export const ImportQuiz = lazy(() => import('../pages/ImportQuiz').then((m) => ({ default: m.ImportQuiz })));
export const SettingsPage = lazy(() => import('../pages/Settings').then((m) => ({ default: m.SettingsPage })));
export const SavedVocabularyPage = lazy(() => import('../pages/SavedVocabularyPage').then((m) => ({ default: m.SavedVocabularyPage })));
export const SubjectsPage = lazy(() => import('../pages/SubjectsPage').then((m) => ({ default: m.SubjectsPage })));
export const JapaneseLearningPage = lazy(() => import('../pages/JapaneseLearningPage').then((m) => ({ default: m.JapaneseLearningPage })));

export const PageLoading: React.FC = () => (
  <div className="flex items-center justify-center py-24 text-sm font-semibold text-slate-400">
    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
    Đang tải…
  </div>
);

