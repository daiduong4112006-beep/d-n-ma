import { Quiz, QuizAttempt, GlobalStatistics, WrongQuestionDetail } from '../types/quiz';
import {
  auth,
  syncQuizToFirestore,
  removeQuizFromFirestore,
  syncAttemptToFirestore,
  syncFlashcardProgressToFirestore,
  syncQuizLearningProgressToFirestore,
  syncPracticeMistakesProgressToFirestore,
  PracticeMistakesProgressCloud,
} from '../lib/firebase';
import { realtimeSync } from './realtimeSync';

export const getCurrentUserEmail = (): string => {
  try {
    const saved = localStorage.getItem('mcq_user');
    if (saved) {
      const user = JSON.parse(saved);
      if (user?.email) return user.email.toLowerCase().trim();
    }
  } catch {}
  try {
    if (auth?.currentUser?.email) {
      return auth.currentUser.email.toLowerCase().trim();
    }
  } catch {}
  return '';
};

const getQuizzesKey = (email?: string): string => {
  const userEmail = email !== undefined ? email : getCurrentUserEmail();
  if (!userEmail) return 'mcq_master_quizzes_v1_guest';
  const sanitized = userEmail.replace(/[^a-z0-9]/g, '_');
  return `mcq_master_quizzes_v1_${sanitized}`;
};

const getAttemptsKey = (email?: string): string => {
  const userEmail = email !== undefined ? email : getCurrentUserEmail();
  if (!userEmail) return 'mcq_master_attempts_v1_guest';
  const sanitized = userEmail.replace(/[^a-z0-9]/g, '_');
  return `mcq_master_attempts_v1_${sanitized}`;
};

// 10 Demo questions for Data Structures
const DEMO_DS_QUIZ: Quiz = {
  id: 'ds-demo-001',
  title: 'Data Structures & Algorithms Foundations',
  description: 'Bộ câu hỏi ôn tập 10 Cấu trúc dữ liệu và Giải thuật cơ bản phục vụ luyện thi MCQ.',
  subject: 'Computer Science',
  topic: 'Data Structures',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  timesCompleted: 1,
  lastScore: 8,
  lastTotal: 10,
  lastAttemptDate: new Date(Date.now() - 3600000 * 24).toISOString(),
  questions: [
    {
      id: 'ds-q1',
      question: 'What is the time complexity of Binary Search on a sorted array of size n?',
      options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'],
      correctAnswer: 1,
      explanation: 'Binary Search divides the search space in half at every step, making its time complexity O(log n).',
      note: 'Remember: Binary Search strictly requires a sorted array.',
      difficulty: 'Medium',
      timesAnswered: 5,
      timesCorrect: 4,
      timesWrong: 1,
      mastered: false,
    },
    {
      id: 'ds-q2',
      question: 'What is the time complexity of inserting an element at the beginning of a Singly Linked List?',
      options: ['O(1)', 'O(n)', 'O(log n)', 'O(n log n)'],
      correctAnswer: 0,
      explanation: 'Inserting at the head of a linked list only requires updating the new node pointer and head pointer, taking constant time O(1).',
      note: 'Unlike arrays, linked lists do not require shifting elements when inserting at the head.',
      difficulty: 'Easy',
      timesAnswered: 4,
      timesCorrect: 4,
      timesWrong: 0,
      mastered: true,
    },
    {
      id: 'ds-q3',
      question: 'In the worst-case scenario with hash collisions, what is the search time complexity of a Hash Table?',
      options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
      correctAnswer: 2,
      explanation: 'In the worst-case scenario where all keys hash to the same bucket (e.g. linked list chaining), search degrades to O(n).',
      note: 'Average case lookup is O(1) assuming a good hash distribution.',
      difficulty: 'Hard',
      timesAnswered: 6,
      timesCorrect: 2,
      timesWrong: 4,
      mastered: false,
    },
    {
      id: 'ds-q4',
      question: 'Which fundamental principle defines the behavior of a Stack data structure?',
      options: ['FIFO (First In First Out)', 'LIFO (Last In First Out)', 'LILO (Last In Last Out)', 'Priority-based'],
      correctAnswer: 1,
      explanation: 'A Stack processes items in Last In First Out order (LIFO), like a stack of plates.',
      note: 'Common stack methods are push(), pop(), and peek().',
      difficulty: 'Easy',
      timesAnswered: 3,
      timesCorrect: 3,
      timesWrong: 0,
      mastered: true,
    },
    {
      id: 'ds-q5',
      question: 'Which data structure is naturally used to implement Breadth-First Search (BFS) in a graph?',
      options: ['Stack', 'Queue', 'Priority Queue', 'Binary Tree'],
      correctAnswer: 1,
      explanation: 'BFS explores graph nodes level by level, which requires a Queue (FIFO order) to process neighbors in sequence.',
      note: 'DFS uses a Stack (or recursion stack), whereas BFS uses a Queue.',
      difficulty: 'Medium',
      timesAnswered: 4,
      timesCorrect: 3,
      timesWrong: 1,
      mastered: false,
    },
    {
      id: 'ds-q6',
      question: 'What is the worst-case height of an unbalanced Binary Search Tree (BST) containing n nodes?',
      options: ['O(log n)', 'O(1)', 'O(n)', 'O(n log n)'],
      correctAnswer: 2,
      explanation: 'If elements are inserted in sorted order, a BST degenerates into a linear linked list of height O(n).',
      note: 'Self-balancing trees like AVL or Red-Black trees maintain height O(log n).',
      difficulty: 'Medium',
      timesAnswered: 5,
      timesCorrect: 3,
      timesWrong: 2,
      mastered: false,
    },
    {
      id: 'ds-q7',
      question: 'What is the average time complexity of the QuickSort algorithm?',
      options: ['O(n²)', 'O(n log n)', 'O(n)', 'O(2ⁿ)'],
      correctAnswer: 1,
      explanation: 'QuickSort recursively partitions arrays around a pivot. On average, it divides the array evenly, giving O(n log n) complexity.',
      note: 'Worst case is O(n²) when pivot selection is poor (e.g. already sorted array with bad pivot choice).',
      difficulty: 'Medium',
      timesAnswered: 4,
      timesCorrect: 4,
      timesWrong: 0,
      mastered: true,
    },
    {
      id: 'ds-q8',
      question: 'What property holds true for the root node of a Min-Heap?',
      options: ['It contains the maximum element', 'It contains the minimum element', 'It contains the median element', 'It is equal to the leaf nodes'],
      correctAnswer: 1,
      explanation: 'In a Min-Heap, every parent node is smaller than or equal to its children, so the root always holds the minimum value.',
      note: 'Min-Heaps enable O(1) access to the minimum element and O(log n) extraction.',
      difficulty: 'Easy',
      timesAnswered: 3,
      timesCorrect: 3,
      timesWrong: 0,
      mastered: true,
    },
    {
      id: 'ds-q9',
      question: 'What is the time complexity to access an element by index in a standard static array?',
      options: ['O(1)', 'O(n)', 'O(log n)', 'O(n²)'],
      correctAnswer: 0,
      explanation: 'Arrays store elements in contiguous memory locations, allowing direct memory address calculation in O(1) time.',
      note: 'Address formula: base_address + (index * element_size).',
      difficulty: 'Easy',
      timesAnswered: 3,
      timesCorrect: 3,
      timesWrong: 0,
      mastered: true,
    },
    {
      id: 'ds-q10',
      question: 'Which graph algorithm finds the shortest path between a source node and all other nodes in a weighted graph with non-negative edge weights?',
      options: ['Kruskal Algorithm', 'Dijkstra Algorithm', 'Floyd-Warshall Algorithm', 'Tarjan Algorithm'],
      correctAnswer: 1,
      explanation: 'Dijkstra Algorithm uses a priority queue to iteratively expand the shortest known distance to reachable vertices.',
      note: 'Dijkstra does not work correctly with negative edge weights; Bellman-Ford should be used instead.',
      difficulty: 'Hard',
      timesAnswered: 5,
      timesCorrect: 2,
      timesWrong: 3,
      mastered: false,
    },
  ],
};

// Second demo quiz for variety
const DEMO_WEB_DEV_QUIZ: Quiz = {
  id: 'web-dev-002',
  title: 'React & Modern Frontend Essentials',
  description: 'Trắc nghiệm kiến thức React 19, Hook, Tailwind, và tối ưu hóa ứng dụng web.',
  subject: 'Web Development',
  topic: 'React & Frontend',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  timesCompleted: 0,
  questions: [
    {
      id: 'web-q1',
      question: 'Which Hook is used in React to perform side effects in function components?',
      options: ['useState', 'useContext', 'useEffect', 'useReducer'],
      correctAnswer: 2,
      explanation: 'useEffect lets you synchronize a component with an external system or handle lifecycle events.',
      note: 'Make sure to properly declare state dependencies inside the dependency array.',
      difficulty: 'Easy',
      timesAnswered: 0,
      timesCorrect: 0,
      timesWrong: 0,
      mastered: false,
    },
    {
      id: 'web-q2',
      question: 'What is the primary function of Virtual DOM in React?',
      options: [
        'To directly replace the browser DOM completely',
        'To minimize real DOM manipulation by calculating minimal diffs',
        'To store data in browser LocalStorage automatically',
        'To compile TypeScript into JavaScript'
      ],
      correctAnswer: 1,
      explanation: 'React maintains a lightweight Virtual DOM tree in memory, diffs it against updates, and batches real DOM updates efficiently.',
      note: 'Reconciler algorithm determines what actually needs updating.',
      difficulty: 'Medium',
      timesAnswered: 0,
      timesCorrect: 0,
      timesWrong: 0,
      mastered: false,
    },
    {
      id: 'web-q3',
      question: 'What happens when you pass an empty array `[]` as the second argument to `useEffect`?',
      options: [
        'The effect runs on every single render',
        'The effect only runs once after the initial render',
        'The effect is disabled and never runs',
        'The effect throws a runtime error'
      ],
      correctAnswer: 1,
      explanation: 'An empty dependency array indicates the effect does not depend on any state values, so it executes once on mount.',
      note: 'Equivalent to componentDidMount in legacy class components.',
      difficulty: 'Easy',
      timesAnswered: 0,
      timesCorrect: 0,
      timesWrong: 0,
      mastered: false,
    },
    {
      id: 'web-q4',
      question: 'How do you trigger a re-render in a React functional component?',
      options: [
        'By directly mutating a regular variable',
        'By calling a state updater function returned by useState',
        'By calling console.log()',
        'By modifying props directly inside the component body'
      ],
      correctAnswer: 1,
      explanation: 'Calling a state updater function alerts React that state has changed and schedules a re-render.',
      note: 'Props are read-only and should never be mutated.',
      difficulty: 'Easy',
      timesAnswered: 0,
      timesCorrect: 0,
      timesWrong: 0,
      mastered: false,
    },
    {
      id: 'web-q5',
      question: 'What is the purpose of React.memo?',
      options: [
        'To cache expensive calculation return values',
        'To prevent a component from re-rendering if its props have not changed',
        'To handle async API calls in React components',
        'To create global state stores'
      ],
      correctAnswer: 1,
      explanation: 'React.memo is a higher-order component that skips rendering a component when its props are unchanged.',
      note: 'Use useMemo for caching values, and React.memo for caching component outputs.',
      difficulty: 'Medium',
      timesAnswered: 0,
      timesCorrect: 0,
      timesWrong: 0,
      mastered: false,
    },
  ],
};

export const initializeStorage = (): Quiz[] => {
  const userEmail = getCurrentUserEmail();
  const key = getQuizzesKey(userEmail);
  const existingQuizzes = localStorage.getItem(key);

  if (!existingQuizzes) {
    localStorage.setItem(key, JSON.stringify([]));
    return [];
  }
  try {
    return JSON.parse(existingQuizzes);
  } catch (e) {
    console.error('Error parsing stored quizzes, resetting to empty', e);
    localStorage.setItem(key, JSON.stringify([]));
    return [];
  }
};

export const getQuizzes = (): Quiz[] => {
  return initializeStorage();
};

export const saveQuizzes = (quizzes: Quiz[]): void => {
  const key = getQuizzesKey();
  localStorage.setItem(key, JSON.stringify(quizzes));
};

export const getQuizById = (id: string): Quiz | undefined => {
  const quizzes = getQuizzes();
  return quizzes.find((q) => q.id === id);
};

export const getEffectiveUserId = (): string => {
  const email = getCurrentUserEmail();
  if (email) {
    return 'usr_' + email.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
  }
  if (auth.currentUser?.uid) {
    return auth.currentUser.uid;
  }
  return 'guest_user';
};

export const saveQuiz = (quiz: Quiz): Quiz[] => {
  const quizzes = getQuizzes();
  const index = quizzes.findIndex((q) => q.id === quiz.id);
  let updatedQuiz: Quiz;
  let updated: Quiz[];
  if (index >= 0) {
    updated = [...quizzes];
    updatedQuiz = { ...quiz, updatedAt: new Date().toISOString() };
    updated[index] = updatedQuiz;
  } else {
    updatedQuiz = {
      ...quiz,
      createdAt: quiz.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updated = [...quizzes, updatedQuiz];
  }
  saveQuizzes(updated);

  const userId = getEffectiveUserId();
  syncQuizToFirestore(userId, updatedQuiz).catch((err) =>
    console.error('Error syncing quiz to firestore:', err)
  );

  return updated;
};

export const getDeletedQuizIds = (): string[] => {
  try {
    const raw = localStorage.getItem('mcq_deleted_quiz_ids');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const markQuizAsDeleted = (id: string): void => {
  try {
    const deleted = getDeletedQuizIds();
    if (!deleted.includes(id)) {
      deleted.push(id);
      localStorage.setItem('mcq_deleted_quiz_ids', JSON.stringify(deleted));
    }
  } catch (e) {
    console.error('markQuizAsDeleted error:', e);
  }
};

export const deleteQuiz = (id: string): Quiz[] => {
  markQuizAsDeleted(id);
  const quizzes = getQuizzes();
  const updated = quizzes.filter((q) => q.id !== id);
  saveQuizzes(updated);

  const userId = getEffectiveUserId();
  removeQuizFromFirestore(id).catch((err) =>
    console.error('Error deleting quiz from firestore:', err)
  );

  return updated;
};

export const getAttempts = (): QuizAttempt[] => {
  const key = getAttemptsKey();
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const saveAttempt = (attempt: QuizAttempt): void => {
  const attempts = getAttempts();
  attempts.unshift(attempt);
  const key = getAttemptsKey();
  localStorage.setItem(key, JSON.stringify(attempts));

  const userId = getEffectiveUserId();
  syncAttemptToFirestore(userId, attempt).catch((err) =>
    console.error('Error syncing attempt to firestore:', err)
  );

  // Update quiz metadata for last score & times completed
  const quizzes = getQuizzes();
  const quiz = quizzes.find((q) => q.id === attempt.quizId);
  if (quiz) {
    quiz.lastScore = attempt.score;
    quiz.lastTotal = attempt.totalQuestions;
    quiz.lastAttemptDate = attempt.date;
    quiz.timesCompleted = (quiz.timesCompleted || 0) + 1;

    // Update individual questions stats according to user requirements:
    // - Thành thạo & Hoàn thành: Lấy dữ liệu ở phần Học (Practice mode)
    // - Hay sai: Lấy dữ liệu ở cả phần Học và Thi thử / Luyện câu hay sai
    attempt.questionResults.forEach((res) => {
      const question = quiz.questions.find((q) => q.id === res.questionId);
      if (question) {
        if (attempt.mode === 'practice_mistakes') {
          // Practice mistakes mode: if user gets it right, mark as mastered/corrected
          if (res.isCorrect) {
            question.mastered = true;
            question.timesCorrect = (question.timesCorrect || 0) + 1;
          } else {
            question.timesWrong = (question.timesWrong || 0) + 1;
            question.mastered = false;
          }
        } else if (attempt.mode === 'normal' || (attempt as any).mode === 'exam') {
          // Exam mode: Only record wrong answers for "Hay sai"
          if (!res.isCorrect) {
            question.timesWrong = (question.timesWrong || 0) + 1;
            question.mastered = false;
          }
        }
        // Note: For practice mode, single question stats were updated in real-time during answer select
      }
    });

    saveQuizzes(quizzes);
    syncQuizToFirestore(userId, quiz).catch((err) =>
      console.error('Error syncing updated quiz metadata to firestore:', err)
    );
  }
};

export const updateSingleQuestionStat = (
  quizId: string,
  questionId: string,
  isCorrect: boolean,
  mode: 'practice' | 'exam' | 'practice_mistakes' = 'practice'
): void => {
  const quizzes = getQuizzes();
  const quiz = quizzes.find((q) => q.id === quizId);
  if (!quiz) return;

  const question = quiz.questions.find((q) => q.id === questionId);
  if (!question) return;

  if (mode === 'practice') {
    // Phần Học: Update timesAnswered, timesCorrect, timesWrong & mastered
    question.timesAnswered = (question.timesAnswered || 0) + 1;
    if (isCorrect) {
      question.timesCorrect = (question.timesCorrect || 0) + 1;
      question.mastered = true;
    } else {
      question.timesWrong = (question.timesWrong || 0) + 1;
      question.mastered = false;
    }
  } else if (mode === 'practice_mistakes') {
    // Phần Luyện câu hay sai
    if (isCorrect) {
      question.mastered = true;
      question.timesCorrect = (question.timesCorrect || 0) + 1;
    } else {
      question.timesWrong = (question.timesWrong || 0) + 1;
      question.mastered = false;
    }
  } else if (mode === 'exam') {
    // Phần Thi thử: Lấy câu trả lời sai cho "Hay sai"
    if (!isCorrect) {
      question.timesWrong = (question.timesWrong || 0) + 1;
      question.mastered = false;
    }
  }

  saveQuizzes(quizzes);

  const userId = getEffectiveUserId();
  syncQuizToFirestore(userId, quiz).catch((err) =>
    console.error('Error syncing single question stat update to firestore:', err)
  );
};

export const markQuestionMastered = (quizId: string, questionId: string, mastered: boolean): void => {
  const quizzes = getQuizzes();
  const quiz = quizzes.find((q) => q.id === quizId);
  if (!quiz) return;

  const question = quiz.questions.find((q) => q.id === questionId);
  if (question) {
    question.mastered = mastered;
    saveQuizzes(quizzes);
    const userId = getEffectiveUserId();
    syncQuizToFirestore(userId, quiz).catch((err) =>
      console.error('Error syncing markQuestionMastered to firestore:', err)
    );
  }
};

export const resetQuizWrongQuestions = (quizId: string): void => {
  const quizzes = getQuizzes();
  const quiz = quizzes.find((q) => q.id === quizId);
  if (!quiz) return;

  quiz.questions.forEach((q) => {
    q.timesWrong = 0;
    q.mastered = false;
  });

  saveQuizzes(quizzes);
  const userId = getEffectiveUserId();
  syncQuizToFirestore(userId, quiz).catch((err) =>
    console.error('Error syncing reset wrong questions to firestore:', err)
  );
};

export interface FlashcardProgress {
  currentIndex: number;
  knownQuestionIds: string[];
  updatedAt?: number;
}

export const getFlashcardProgress = (quizId: string): FlashcardProgress => {
  if (!quizId) return { currentIndex: 0, knownQuestionIds: [], updatedAt: 0 };
  try {
    const cleanId = String(quizId).trim();
    const raw = localStorage.getItem(`flashcard_progress_${cleanId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        currentIndex: typeof parsed.currentIndex === 'number' ? parsed.currentIndex : 0,
        knownQuestionIds: Array.isArray(parsed.knownQuestionIds) ? parsed.knownQuestionIds : [],
        updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
      };
    }
  } catch (e) {
    console.error('Error reading flashcard progress:', e);
  }
  return { currentIndex: 0, knownQuestionIds: [], updatedAt: 0 };
};

export const saveFlashcardProgress = (
  quizId: string,
  progress: { currentIndex: number; knownQuestionIds: string[]; updatedAt?: number },
  skipBroadcast = false
): void => {
  if (!quizId) return;
  const cleanId = String(quizId).trim();
  const timestamp = progress.updatedAt || Date.now();
  const enrichedProgress: FlashcardProgress = {
    ...progress,
    updatedAt: timestamp,
  };

  try {
    localStorage.setItem(`flashcard_progress_${cleanId}`, JSON.stringify(enrichedProgress));
    
    // Broadcast immediately to all other tabs (< 2ms)
    if (!skipBroadcast) {
      realtimeSync.broadcast('MCQ_FLASHCARD', cleanId, enrichedProgress.currentIndex, {
        knownQuestionIds: enrichedProgress.knownQuestionIds,
        updatedAt: timestamp,
      }, timestamp);
    }

    const userEmail = getCurrentUserEmail();
    if (userEmail) {
      syncFlashcardProgressToFirestore(userEmail, cleanId, enrichedProgress).catch(() => {});
    }
  } catch (e) {
    console.error('Error saving flashcard progress:', e);
  }
};

export const resetFlashcardProgress = (quizId: string): void => {
  if (!quizId) return;
  const cleanId = String(quizId).trim();
  try {
    localStorage.removeItem(`flashcard_progress_${cleanId}`);
    realtimeSync.broadcast('MCQ_FLASHCARD', cleanId, 0, { knownQuestionIds: [], updatedAt: Date.now() });
  } catch (e) {
    console.error('Error resetting flashcard progress:', e);
  }
};

export const updateAllFlashcardProgressFromCloud = (
  items: Record<string, { currentIndex: number; knownQuestionIds: string[]; updatedAt?: number }>
): void => {
  if (typeof window === 'undefined' || !items) return;
  try {
    Object.entries(items).forEach(([quizId, cloudData]) => {
      const cleanQuizId = String(quizId).trim();
      const key = `flashcard_progress_${cleanQuizId}`;
      const local = getFlashcardProgress(cleanQuizId);
      const cloudTimestamp = cloudData.updatedAt || 0;
      const localTimestamp = local.updatedAt || 0;

      // Cloud takes precedence if newer timestamp or if local is at 0 and cloud has actual progress
      if (cloudTimestamp >= localTimestamp || (local.currentIndex === 0 && cloudData.currentIndex > 0)) {
        const merged: FlashcardProgress = {
          currentIndex: cloudData.currentIndex,
          knownQuestionIds: cloudData.knownQuestionIds || [],
          updatedAt: cloudTimestamp || Date.now(),
        };
        localStorage.setItem(key, JSON.stringify(merged));
        // Notify any active FlashcardViewer component
        realtimeSync.notifyLocal('MCQ_FLASHCARD', cleanQuizId, cloudData.currentIndex, merged, merged.updatedAt);
      }
    });
  } catch (e) {
    console.error('Error updating flashcard progress from cloud:', e);
  }
};

export interface QuizLearningProgressState {
  currentIndex: number;
  userAnswers: Record<string, number | number[]>;
  currentOptions?: any;
  updatedAt: number;
}

export const getQuizLearningProgress = (
  quizId: string,
  isWrongQuestions = false
): QuizLearningProgressState | null => {
  if (!quizId) return null;
  const cleanId = String(quizId).trim();
  const progressKey = isWrongQuestions
    ? `mcq_learning_progress_${cleanId}_wrong`
    : `mcq_learning_progress_${cleanId}`;
  try {
    const raw = localStorage.getItem(progressKey);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading quiz learning progress:', e);
  }
  return null;
};

export const saveQuizLearningProgress = (
  quizId: string,
  progress: QuizLearningProgressState,
  isWrongQuestions = false,
  skipBroadcast = false
): void => {
  if (!quizId) return;
  const cleanId = String(quizId).trim();
  const progressKey = isWrongQuestions
    ? `mcq_learning_progress_${cleanId}_wrong`
    : `mcq_learning_progress_${cleanId}`;
  try {
    const timestamp = progress.updatedAt || Date.now();
    const enriched: QuizLearningProgressState = {
      ...progress,
      updatedAt: timestamp,
    };
    localStorage.setItem(progressKey, JSON.stringify(enriched));

    // Broadcast immediately to other tabs (< 2ms)
    if (!skipBroadcast) {
      realtimeSync.broadcast('MCQ_PRACTICE', cleanId, enriched.currentIndex, enriched, timestamp);
    }

    // Sync to Cloud Firestore for Cross-Device sync
    const userEmail = getCurrentUserEmail();
    if (userEmail && !isWrongQuestions) {
      syncQuizLearningProgressToFirestore(userEmail, cleanId, enriched).catch(() => {});
    }
  } catch (e) {
    console.error('Error saving quiz learning progress:', e);
  }
};

export const clearQuizLearningProgress = (quizId: string, isWrongQuestions = false): void => {
  if (!quizId) return;
  const cleanId = String(quizId).trim();
  const progressKey = isWrongQuestions
    ? `mcq_learning_progress_${cleanId}_wrong`
    : `mcq_learning_progress_${cleanId}`;
  try {
    localStorage.removeItem(progressKey);
  } catch (e) {
    console.error('Error clearing quiz learning progress:', e);
  }
};

export const updateAllQuizLearningProgressFromCloud = (
  items: Record<string, any>
): void => {
  if (typeof window === 'undefined' || !items) return;
  try {
    Object.entries(items).forEach(([quizId, cloudData]) => {
      const cleanQuizId = String(quizId).trim();
      const progressKey = `mcq_learning_progress_${cleanQuizId}`;
      const local = getQuizLearningProgress(cleanQuizId);
      const cloudTimestamp = cloudData.updatedAt || 0;
      const localTimestamp = local?.updatedAt || 0;

      if (cloudTimestamp >= localTimestamp || (!local && cloudData.currentIndex > 0)) {
        const merged: QuizLearningProgressState = {
          currentIndex: cloudData.currentIndex,
          userAnswers: cloudData.userAnswers || {},
          currentOptions: cloudData.currentOptions,
          updatedAt: cloudTimestamp || Date.now(),
        };
        localStorage.setItem(progressKey, JSON.stringify(merged));
        // Notify active QuizPage component
        realtimeSync.notifyLocal('MCQ_PRACTICE', cleanQuizId, cloudData.currentIndex, merged, merged.updatedAt);
      }
    });
  } catch (e) {
    console.error('Error updating quiz learning progress from cloud:', e);
  }
};

// ---------------------------------------------------------------------------
// Practice Mistakes (Luyện câu hay sai) Progress Storage & Realtime Sync
// ---------------------------------------------------------------------------
export interface PracticeMistakesProgressState {
  currentIndex: number;
  masteredCount: number;
  updatedAt: number;
}

export const getPracticeMistakesProgress = (): PracticeMistakesProgressState | null => {
  try {
    const raw = localStorage.getItem('mcq_practice_mistakes_progress');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return null;
};

export const savePracticeMistakesProgress = (
  currentIndex: number,
  masteredCount: number,
  skipBroadcast = false
): void => {
  try {
    const state: PracticeMistakesProgressState = {
      currentIndex,
      masteredCount,
      updatedAt: Date.now(),
    };
    localStorage.setItem('mcq_practice_mistakes_progress', JSON.stringify(state));

    if (!skipBroadcast) {
      realtimeSync.broadcast('MCQ_MISTAKES', 'global', currentIndex, state, state.updatedAt);
    }

    const userEmail = getCurrentUserEmail();
    if (userEmail) {
      syncPracticeMistakesProgressToFirestore(userEmail, state).catch(() => {});
    }
  } catch (e) {
    console.error('Error saving practice mistakes progress:', e);
  }
};

export const updatePracticeMistakesProgressFromCloud = (
  cloudData: PracticeMistakesProgressCloud
): void => {
  if (typeof window === 'undefined' || !cloudData) return;
  try {
    const local = getPracticeMistakesProgress();
    const cloudTimestamp = cloudData.updatedAt || 0;
    const localTimestamp = local?.updatedAt || 0;

    if (cloudTimestamp >= localTimestamp || (!local && cloudData.currentIndex > 0)) {
      const merged: PracticeMistakesProgressState = {
        currentIndex: cloudData.currentIndex,
        masteredCount: cloudData.masteredCount || 0,
        updatedAt: cloudTimestamp || Date.now(),
      };
      localStorage.setItem('mcq_practice_mistakes_progress', JSON.stringify(merged));
      realtimeSync.notifyLocal('MCQ_MISTAKES', 'global', cloudData.currentIndex, merged, merged.updatedAt);
    }
  } catch (e) {
    console.error('Error updating practice mistakes progress from cloud:', e);
  }
};

export const getWrongQuestionsList = (): WrongQuestionDetail[] => {
  const quizzes = getQuizzes();
  const list: WrongQuestionDetail[] = [];

  quizzes.forEach((quiz) => {
    quiz.questions.forEach((q) => {
      // Unmastered wrong questions
      if (q.timesWrong > 0 && !q.mastered) {
        list.push({
          question: q,
          quizId: quiz.id,
          quizTitle: quiz.title,
          subject: quiz.subject,
        });
      }
    });
  });

  return list;
};

export const getGlobalStatistics = (): GlobalStatistics => {
  const quizzes = getQuizzes();
  const attempts = getAttempts();

  let totalQuestions = 0;
  let questionsAnswered = 0;
  let correctAnswers = 0;
  let wrongAnswers = 0;

  quizzes.forEach((quiz) => {
    totalQuestions += quiz.questions.length;
    quiz.questions.forEach((q) => {
      questionsAnswered += q.timesAnswered;
      correctAnswers += q.timesCorrect;
      wrongAnswers += q.timesWrong;
    });
  });

  const accuracy = questionsAnswered > 0 ? Math.round((correctAnswers / questionsAnswered) * 100) : 0;

  let bestScorePercentage = 0;
  attempts.forEach((att) => {
    if (att.accuracy > bestScorePercentage) {
      bestScorePercentage = att.accuracy;
    }
  });

  return {
    totalQuestions,
    questionsAnswered,
    correctAnswers,
    wrongAnswers,
    accuracy,
    bestScorePercentage,
    quizzesCompleted: attempts.length,
  };
};

export const resetToDemoData = (): Quiz[] => {
  const quizzesKey = getQuizzesKey();
  const attemptsKey = getAttemptsKey();
  localStorage.removeItem(quizzesKey);
  localStorage.removeItem(attemptsKey);
  return initializeStorage();
};

export const clearAllUserData = (email?: string): void => {
  if (email) {
    const cleanEmail = email.trim().toLowerCase();
    const sanitized = cleanEmail.replace(/[^a-z0-9]/g, '_');
    localStorage.removeItem(`mcq_master_quizzes_v1_${sanitized}`);
    localStorage.removeItem(`mcq_master_attempts_v1_${sanitized}`);
    localStorage.removeItem(`mcq_master_quizzes_v1_usr_${sanitized}`);
    localStorage.removeItem(`mcq_master_attempts_v1_usr_${sanitized}`);
  }
  // Clear guest and fallback keys
  localStorage.removeItem('mcq_master_quizzes_v1_guest');
  localStorage.removeItem('mcq_master_attempts_v1_guest');
  localStorage.removeItem('mcq_quizzes');
  localStorage.removeItem('mcq_attempts');
  localStorage.removeItem('mcq_user');
  localStorage.removeItem('mcq_registered_users');
  localStorage.removeItem('mcq_deleted_quiz_ids');
};

export const transferGuestDataToUser = (userEmail: string): void => {
  if (!userEmail) return;
  const guestKey = 'mcq_master_quizzes_v1_guest';
  const guestRaw = localStorage.getItem(guestKey);
  if (!guestRaw) return;

  try {
    const guestQuizzes: Quiz[] = JSON.parse(guestRaw);
    if (guestQuizzes && guestQuizzes.length > 0) {
      const cleanEmail = userEmail.trim().toLowerCase();
      const sanitized = cleanEmail.replace(/[^a-z0-9]/g, '_');
      const userKey = `mcq_master_quizzes_v1_${sanitized}`;
      const existingUserRaw = localStorage.getItem(userKey);
      const existingUserQuizzes: Quiz[] = existingUserRaw ? JSON.parse(existingUserRaw) : [];

      const merged = [...existingUserQuizzes];
      const activeUserId = 'usr_' + sanitized;

      guestQuizzes.forEach((gq) => {
        if (!merged.some((q) => q.id === gq.id)) {
          merged.push(gq);
        }
        syncQuizToFirestore(activeUserId, gq).catch((e) =>
          console.error('Transfer guest quiz to firestore error:', e)
        );
      });

      localStorage.setItem(userKey, JSON.stringify(merged));
      localStorage.removeItem(guestKey);
    }
  } catch (e) {
    console.error('transferGuestDataToUser error:', e);
  }
};
