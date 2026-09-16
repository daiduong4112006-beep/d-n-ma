import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  deleteUser,
  GoogleAuthProvider,
  signInWithPopup,
  User,
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  or,
  getDocs,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Quiz, QuizAttempt } from '../types/quiz';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true }, firebaseConfig.firestoreDatabaseId);

export { onAuthStateChanged };

let firestoreQuotaExceeded = false;

export const isFirebaseConfigured = (): boolean => {
  return (
    Boolean(firebaseConfig.apiKey) &&
    !firebaseConfig.apiKey.includes('remixed-') &&
    firebaseConfig.apiKey.startsWith('AIza')
  );
};

export const isFirestoreAvailable = (): boolean => {
  return isFirebaseConfigured() && !firestoreQuotaExceeded;
};

const handleFirestoreError = (action: string, err: any) => {
  const errStr = String(err?.message || err || '').toLowerCase();
  const isQuota =
    err?.code === 'resource-exhausted' ||
    errStr.includes('resource-exhausted') ||
    errStr.includes('quota');
  if (isQuota) {
    if (!firestoreQuotaExceeded) {
      firestoreQuotaExceeded = true;
      console.warn(
        `[Firestore Quota] Daily Firestore write/read quota exceeded. App seamlessly using local storage for ${action}.`
      );
    }
  } else {
    console.warn(`[Firestore Notice] ${action}:`, err?.message || err);
  }
};

export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number = 10000,
  label: string = 'Operation'
): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

export const registerUser = async (email: string, pass: string, name: string) => {
  if (!isFirebaseConfigured()) {
    const err: any = new Error('Firebase Auth is unconfigured');
    err.code = 'auth/operation-not-allowed';
    throw err;
  }
  const userCred = await withTimeout(
    createUserWithEmailAndPassword(auth, email, pass),
    10000,
    'registerUser'
  );
  if (userCred.user) {
    try {
      await withTimeout(updateProfile(userCred.user, { displayName: name }), 5000, 'updateProfile');
    } catch {}
  }
  return userCred.user;
};

export const loginUser = async (email: string, pass: string) => {
  if (!isFirebaseConfigured()) {
    const err: any = new Error('Firebase Auth is unconfigured');
    err.code = 'auth/operation-not-allowed';
    throw err;
  }
  const userCred = await withTimeout(
    signInWithEmailAndPassword(auth, email, pass),
    10000,
    'loginUser'
  );
  return userCred.user;
};

export const loginWithGoogle = async () => {
  if (!isFirebaseConfigured()) {
    const err: any = new Error('Firebase Auth is unconfigured');
    err.code = 'auth/operation-not-allowed';
    throw err;
  }
  const provider = new GoogleAuthProvider();
  const userCred = await withTimeout(
    signInWithPopup(auth, provider),
    15000,
    'loginWithGoogle'
  );
  return userCred.user;
};

export const logoutUser = async () => {
  if (isFirebaseConfigured() && auth.currentUser) {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Firebase signOut ignored:', e);
    }
  }
};

export const deleteCurrentUserAccount = async () => {
  if (isFirebaseConfigured() && auth.currentUser) {
    await deleteUser(auth.currentUser);
  }
};

export const getPossibleUserIds = (userId: string): string[] => {
  const set = new Set<string>();

  const addVariants = (val: string) => {
    if (!val) return;
    const v = val.trim().toLowerCase();
    set.add(v);
    if (v.includes('@')) {
      const sanitized = v.replace(/[^a-z0-9]/g, '_');
      set.add(sanitized);
      set.add('usr_' + sanitized);
    } else if (v.startsWith('usr_')) {
      const raw = v.replace('usr_', '');
      set.add(raw);
    }
  };

  addVariants(userId);

  try {
    const saved = localStorage.getItem('mcq_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.email) {
        addVariants(parsed.email);
      }
    }
  } catch {}

  if (auth.currentUser?.email) {
    addVariants(auth.currentUser.email);
  }
  if (auth.currentUser?.uid) {
    set.add(auth.currentUser.uid);
  }

  return Array.from(set).filter(Boolean);
};

// Real-time Firestore sync for Quizzes
export const subscribeQuizzes = (
  userId: string,
  onUpdate: (quizzes: Quiz[]) => void,
  onError?: (err: Error) => void
) => {
  if (!isFirestoreAvailable()) {
    if (onError) onError(new Error('Firestore unavailable'));
    return () => {};
  }
  try {
    const userIds = getPossibleUserIds(userId);
    let email = '';
    try {
      const saved = localStorage.getItem('mcq_user');
      if (saved) email = JSON.parse(saved)?.email || '';
    } catch {}
    if (!email && auth.currentUser?.email) {
      email = auth.currentUser.email;
    }
    const cleanEmail = email ? email.trim().toLowerCase() : '';

    const conditions = [];
    if (userIds.length > 0) {
      conditions.push(where('userId', 'in', userIds.slice(0, 10)));
    }
    if (cleanEmail) {
      conditions.push(where('userEmail', '==', cleanEmail));
    }

    const q = conditions.length > 1
      ? query(collection(db, 'quizzes'), or(...conditions))
      : query(collection(db, 'quizzes'), conditions[0] || where('userId', '==', userId));

    return onSnapshot(
      q,
      (snapshot) => {
        const quizzes: Quiz[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            title: data.title || '',
            description: data.description || '',
            subject: data.subject || '',
            topic: data.topic || '',
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
            timesCompleted: data.timesCompleted || 0,
            lastScore: data.lastScore,
            lastTotal: data.lastTotal,
            lastAttemptDate: data.lastAttemptDate,
            questions: data.questions || [],
          };
        });
        onUpdate(quizzes);
      },
      (err) => {
        handleFirestoreError('subscribeQuizzes', err);
        if (onError) onError(err);
      }
    );
  } catch (err: any) {
    handleFirestoreError('subscribeQuizzes catch', err);
    if (onError) onError(err);
    return () => {};
  }
};

// Save single quiz to Firestore with immediate zero latency
export const syncQuizToFirestore = async (userId: string, quiz: Quiz): Promise<void> => {
  if (!isFirestoreAvailable() || !quiz?.id) return;

  try {
    const quizRef = doc(db, 'quizzes', quiz.id);
    const cleanQuiz = JSON.parse(JSON.stringify(quiz));
    let email = '';
    try {
      const savedUser = localStorage.getItem('mcq_user');
      if (savedUser) email = JSON.parse(savedUser)?.email || '';
    } catch {}
    if (!email && auth.currentUser?.email) {
      email = auth.currentUser.email;
    }

    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanUserId = cleanEmail
      ? 'usr_' + cleanEmail.replace(/[^a-z0-9]/g, '_')
      : (userId || 'guest_user');

    const payload: any = {
      ...cleanQuiz,
      userId: cleanUserId,
      updatedAt: new Date().toISOString(),
    };
    if (cleanEmail) {
      payload.userEmail = cleanEmail;
    }

    await setDoc(quizRef, payload);
  } catch (err) {
    handleFirestoreError('syncQuizToFirestore', err);
  }
};

export const flushQuizWrites = async (): Promise<void> => {
  // Direct writes are already instant
};

// Delete single quiz from Firestore immediately
export const removeQuizFromFirestore = async (quizId: string): Promise<void> => {
  if (!isFirestoreAvailable() || !quizId) return;
  try {
    const quizRef = doc(db, 'quizzes', quizId);
    await deleteDoc(quizRef);
  } catch (err) {
    handleFirestoreError('removeQuizFromFirestore', err);
  }
};

// Real-time Firestore sync for Attempts
export const subscribeAttempts = (
  userId: string,
  onUpdate: (attempts: QuizAttempt[]) => void,
  onError?: (err: Error) => void
) => {
  if (!isFirestoreAvailable()) {
    if (onError) onError(new Error('Firestore unavailable'));
    return () => {};
  }
  try {
    const userIds = getPossibleUserIds(userId);
    const q = userIds.length > 1
      ? query(collection(db, 'attempts'), where('userId', 'in', userIds))
      : query(collection(db, 'attempts'), where('userId', '==', userIds[0] || userId));

    return onSnapshot(
      q,
      (snapshot) => {
        const attempts: QuizAttempt[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            quizId: data.quizId || '',
            quizTitle: data.quizTitle || '',
            score: data.score || 0,
            totalQuestions: data.totalQuestions || 0,
            correctAnswers: data.correctAnswers || 0,
            wrongAnswers: data.wrongAnswers || 0,
            accuracy: data.accuracy || 0,
            date: data.date || new Date().toISOString(),
            mode: data.mode || 'normal',
            questionResults: data.questionResults || [],
          };
        });
        attempts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        onUpdate(attempts);
      },
      (err) => {
        handleFirestoreError('subscribeAttempts', err);
        if (onError) onError(err);
      }
    );
  } catch (err: any) {
    handleFirestoreError('subscribeAttempts catch', err);
    if (onError) onError(err);
    return () => {};
  }
};

// Save attempt to Firestore
export const syncAttemptToFirestore = async (userId: string, attempt: QuizAttempt): Promise<void> => {
  if (!isFirestoreAvailable()) return;
  try {
    const attemptRef = doc(db, 'attempts', attempt.id);
    const cleanAttempt = JSON.parse(JSON.stringify(attempt));
    await setDoc(attemptRef, {
      ...cleanAttempt,
      userId,
    });
  } catch (err) {
    handleFirestoreError('syncAttemptToFirestore', err);
  }
};

// Firestore User Account Management across browsers
export interface FirestoreUserRecord {
  email: string;
  name: string;
  password?: string;
  createdAt: string;
  updatedAt: string;
}

export const saveUserToFirestore = async (email: string, name: string, password?: string): Promise<void> => {
  if (!isFirestoreAvailable()) return;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const userRef = doc(db, 'users', cleanEmail);
    await withTimeout(
      setDoc(
        userRef,
        {
          email: cleanEmail,
          name: name.trim(),
          password: password || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ),
      2500,
      'saveUserToFirestore'
    );
  } catch (err) {
    handleFirestoreError('saveUserToFirestore', err);
  }
};

export const getUserFromFirestore = async (email: string): Promise<FirestoreUserRecord | null> => {
  if (!isFirestoreAvailable()) return null;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const userRef = doc(db, 'users', cleanEmail);
    const snap = await withTimeout(getDoc(userRef), 2500, 'getUserFromFirestore');
    if (snap.exists()) {
      return snap.data() as FirestoreUserRecord;
    }
    return null;
  } catch (err) {
    handleFirestoreError('getUserFromFirestore', err);
    return null;
  }
};

export const subscribeUserDoc = (
  email: string,
  onUserUpdate: (record: FirestoreUserRecord | null) => void
): (() => void) => {
  if (!isFirestoreAvailable() || !email) {
    return () => {};
  }
  try {
    const cleanEmail = email.trim().toLowerCase();
    const userRef = doc(db, 'users', cleanEmail);
    return onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          onUserUpdate(snap.data() as FirestoreUserRecord);
        } else {
          onUserUpdate(null);
        }
      },
      (err) => {
        handleFirestoreError('subscribeUserDoc', err);
      }
    );
  } catch (err) {
    handleFirestoreError('subscribeUserDoc catch', err);
    return () => {};
  }
};

export const deleteUserFromFirestore = async (email: string): Promise<void> => {
  if (!isFirestoreAvailable()) return;
  try {
    const cleanEmail = email.trim().toLowerCase();
    
    // Delete user account doc
    await deleteDoc(doc(db, 'users', cleanEmail)).catch((e) => handleFirestoreError('deleteUserFromFirestore user', e));

    // Delete user settings doc
    await deleteDoc(doc(db, 'settings', cleanEmail)).catch((e) => handleFirestoreError('deleteUserFromFirestore settings', e));

    // Get all variants of user IDs for this email
    const userIds = getPossibleUserIds(cleanEmail);

    // Delete all quizzes matching any of the user IDs
    const quizSnaps = userIds.length > 1
      ? await getDocs(query(collection(db, 'quizzes'), where('userId', 'in', userIds)))
      : await getDocs(query(collection(db, 'quizzes'), where('userId', '==', userIds[0] || cleanEmail)));
    await Promise.all(quizSnaps.docs.map((d) => deleteDoc(d.ref)));

    // Delete all attempts matching any of the user IDs
    const attemptSnaps = userIds.length > 1
      ? await getDocs(query(collection(db, 'attempts'), where('userId', 'in', userIds)))
      : await getDocs(query(collection(db, 'attempts'), where('userId', '==', userIds[0] || cleanEmail)));
    await Promise.all(attemptSnaps.docs.map((d) => deleteDoc(d.ref)));
  } catch (err) {
    handleFirestoreError('deleteUserFromFirestore', err);
  }
};

// Clear ALL collections on server
export const wipeAllServerCollections = async (): Promise<void> => {
  if (!isFirestoreAvailable()) return;
  try {
    const collectionsToClear = ['users', 'quizzes', 'attempts', 'settings', 'japanese_courses'];
    for (const colName of collectionsToClear) {
      const snap = await getDocs(collection(db, colName));
      const deletes = snap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletes);
    }
  } catch (err) {
    handleFirestoreError('wipeAllServerCollections', err);
  }
};

// ---------------------------------------------------------------------------
// Cloud Firestore Real-time Sync for Japanese Courses across devices & browsers
// ---------------------------------------------------------------------------
export const syncJapaneseCourseToFirestore = async (course: any): Promise<void> => {
  if (!isFirestoreAvailable() || !course?.id) return;
  try {
    const courseRef = doc(db, 'japanese_courses', course.id);
    const clean = JSON.parse(JSON.stringify(course));
    await setDoc(courseRef, { ...clean, updatedAt: new Date().toISOString() });
  } catch (err) {
    handleFirestoreError('syncJapaneseCourseToFirestore', err);
  }
};

export const deleteJapaneseCourseFromFirestore = async (courseId: string): Promise<void> => {
  if (!isFirestoreAvailable() || !courseId) return;
  try {
    const courseRef = doc(db, 'japanese_courses', courseId);
    await deleteDoc(courseRef);
  } catch (err) {
    handleFirestoreError('deleteJapaneseCourseFromFirestore', err);
  }
};

export const subscribeJapaneseCourses = (
  onUpdate: (courses: any[]) => void,
  onError?: (err: Error) => void
): (() => void) => {
  if (!isFirestoreAvailable()) {
    if (onError) onError(new Error('Firestore unavailable'));
    return () => {};
  }
  try {
    const q = collection(db, 'japanese_courses');
    return onSnapshot(
      q,
      (snapshot) => {
        const courses: any[] = snapshot.docs.map((d) => ({
          ...d.data(),
          id: d.id,
        }));
        onUpdate(courses);
      },
      (err) => {
        handleFirestoreError('subscribeJapaneseCourses', err);
        if (onError) onError(err);
      }
    );
  } catch (err: any) {
    handleFirestoreError('subscribeJapaneseCourses catch', err);
    if (onError) onError(err);
    return () => {};
  }
};

// Firestore User Settings Sync
export const saveUserSettingsToFirestore = async (email: string, settings: any): Promise<void> => {
  if (!isFirestoreAvailable()) return;
  try {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;
    const ref = doc(db, 'settings', cleanEmail);
    await setDoc(ref, { ...settings, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    handleFirestoreError('saveUserSettingsToFirestore', err);
  }
};

export const getUserSettingsFromFirestore = async (email: string): Promise<any | null> => {
  if (!isFirestoreAvailable()) return null;
  try {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return null;
    const ref = doc(db, 'settings', cleanEmail);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (err) {
    handleFirestoreError('getUserSettingsFromFirestore', err);
    return null;
  }
};

// ---------------------------------------------------------------------------
// JPD123 Course Access Whitelist Sync
// ---------------------------------------------------------------------------
export const saveJpd123AccessListToFirestore = async (allowedEmails: string[]): Promise<void> => {
  if (!isFirestoreAvailable()) return;
  try {
    const ref = doc(db, 'settings', 'jpd123_access_list');
    await setDoc(
      ref,
      {
        allowedEmails: allowedEmails.map((e) => e.trim().toLowerCase()),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError('saveJpd123AccessListToFirestore', err);
  }
};

export const subscribeJpd123AccessList = (
  onUpdate: (allowedEmails: string[]) => void
): (() => void) => {
  if (!isFirestoreAvailable()) return () => {};
  try {
    const ref = doc(db, 'settings', 'jpd123_access_list');
    return onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data?.allowedEmails)) {
            onUpdate(data.allowedEmails);
          }
        }
      },
      (err) => {
        handleFirestoreError('subscribeJpd123AccessList', err);
      }
    );
  } catch (err) {
    handleFirestoreError('subscribeJpd123AccessList catch', err);
    return () => {};
  }
};

// ---------------------------------------------------------------------------
// Real-time Cloud Sync for Starred Vocabulary ("Từ cần lưu ý ghi nhớ")
// ---------------------------------------------------------------------------
export const syncStarredVocabularyToFirestore = async (email: string, words: any[]): Promise<void> => {
  if (!isFirestoreAvailable() || !email) return;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const vocabRef = doc(db, 'vocabulary', cleanEmail);
    const cleanWords = JSON.parse(JSON.stringify(words));
    await setDoc(vocabRef, {
      email: cleanEmail,
      words: cleanWords,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    handleFirestoreError('syncStarredVocabularyToFirestore', err);
  }
};

export const subscribeStarredVocabulary = (
  email: string,
  onUpdate: (words: any[]) => void
): (() => void) => {
  if (!isFirestoreAvailable() || !email) return () => {};
  try {
    const cleanEmail = email.trim().toLowerCase();
    const vocabRef = doc(db, 'vocabulary', cleanEmail);
    return onSnapshot(
      vocabRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          onUpdate(Array.isArray(data?.words) ? data.words : []);
        }
      },
      (err) => {
        handleFirestoreError('subscribeStarredVocabulary', err);
      }
    );
  } catch (err) {
    handleFirestoreError('subscribeStarredVocabulary catch', err);
    return () => {};
  }
};

// ---------------------------------------------------------------------------
// Real-time Cloud Sync for Starred Questions in Quizzes ("Đánh dấu câu hỏi sao")
// ---------------------------------------------------------------------------
export const syncStarredQuestionsToFirestore = async (
  email: string,
  quizId: string,
  starredIds: string[]
): Promise<void> => {
  if (!isFirestoreAvailable() || !email || !quizId) return;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const docId = `${cleanEmail.replace(/[^a-z0-9]/g, '_')}_${quizId}`;
    const ref = doc(db, 'starred_questions', docId);
    await setDoc(ref, {
      email: cleanEmail,
      quizId,
      starredIds,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    handleFirestoreError('syncStarredQuestionsToFirestore', err);
  }
};

export const subscribeStarredQuestions = (
  email: string,
  quizId: string,
  onUpdate: (starredIds: string[]) => void
): (() => void) => {
  if (!isFirestoreAvailable() || !email || !quizId) return () => {};
  try {
    const cleanEmail = email.trim().toLowerCase();
    const docId = `${cleanEmail.replace(/[^a-z0-9]/g, '_')}_${quizId}`;
    const ref = doc(db, 'starred_questions', docId);
    return onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          onUpdate(Array.isArray(data?.starredIds) ? data.starredIds : []);
        }
      },
      (err) => {
        handleFirestoreError('subscribeStarredQuestions', err);
      }
    );
  } catch (err) {
    handleFirestoreError('subscribeStarredQuestions catch', err);
    return () => {};
  }
};

// ---------------------------------------------------------------------------
// Real-time Cloud Sync for Flashcards Progress (MCQ Master)
// ---------------------------------------------------------------------------
const pendingFlashcardWrites = new Map<string, { email: string; quizId: string; progress: any }>();
let flashcardWriteTimer: any = null;

const executeFlashcardWrite = async (item: { email: string; quizId: string; progress: any }) => {
  if (!isFirestoreAvailable() || !item.email || !item.quizId) return;
  try {
    const cleanEmail = item.email.trim().toLowerCase();
    const docId = `${cleanEmail.replace(/[^a-z0-9]/g, '_')}_${String(item.quizId).trim()}`;
    const ref = doc(db, 'flashcard_progress', docId);
    await setDoc(
      ref,
      {
        email: cleanEmail,
        quizId: String(item.quizId).trim(),
        progress: {
          currentIndex: item.progress.currentIndex,
          knownQuestionIds: item.progress.knownQuestionIds || [],
          updatedAt: item.progress.updatedAt || Date.now(),
        },
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError('syncFlashcardProgressToFirestore', err);
  }
};

export const syncFlashcardProgressToFirestore = async (
  email: string,
  quizId: string,
  progress: { currentIndex: number; knownQuestionIds: string[]; updatedAt?: number },
  immediate = false
): Promise<void> => {
  if (!email || !quizId) return;
  const key = `${email}_${quizId}`;
  pendingFlashcardWrites.set(key, { email, quizId, progress });

  if (immediate) {
    if (flashcardWriteTimer) clearTimeout(flashcardWriteTimer);
    await executeFlashcardWrite({ email, quizId, progress });
    pendingFlashcardWrites.delete(key);
    return;
  }

  if (!flashcardWriteTimer) {
    flashcardWriteTimer = setTimeout(() => {
      flashcardWriteTimer = null;
      const items = Array.from(pendingFlashcardWrites.values());
      pendingFlashcardWrites.clear();
      items.forEach((item) => executeFlashcardWrite(item).catch(() => {}));
    }, 200); // Ultra-responsive 200ms debounce
  }
};

export const subscribeFlashcardProgress = (
  email: string,
  quizId: string,
  onUpdate: (progress: { currentIndex: number; knownQuestionIds: string[]; updatedAt?: number }) => void
): (() => void) => {
  if (!isFirestoreAvailable() || !email || !quizId) return () => {};
  try {
    const cleanEmail = email.trim().toLowerCase();
    const docId = `${cleanEmail.replace(/[^a-z0-9]/g, '_')}_${String(quizId).trim()}`;
    const ref = doc(db, 'flashcard_progress', docId);
    return onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data?.progress) {
            onUpdate({
              ...data.progress,
              updatedAt: data.progress.updatedAt || (data.updatedAt ? new Date(data.updatedAt).getTime() : Date.now()),
            });
          }
        }
      },
      (err) => {
        handleFirestoreError('subscribeFlashcardProgress', err);
      }
    );
  } catch (err) {
    handleFirestoreError('subscribeFlashcardProgress catch', err);
    return () => {};
  }
};

// Global subscription for all flashcard progress of this user across devices
export const subscribeAllFlashcardProgress = (
  email: string,
  onUpdate: (items: Record<string, { currentIndex: number; knownQuestionIds: string[]; updatedAt?: number }>) => void
): (() => void) => {
  if (!isFirestoreAvailable() || !email) return () => {};
  try {
    const cleanEmail = email.trim().toLowerCase();
    const q = query(collection(db, 'flashcard_progress'), where('email', '==', cleanEmail));
    return onSnapshot(
      q,
      (snap) => {
        const result: Record<string, any> = {};
        snap.docs.forEach((d) => {
          const data = d.data();
          if (data?.quizId && data?.progress) {
            result[data.quizId] = {
              currentIndex: typeof data.progress.currentIndex === 'number' ? data.progress.currentIndex : 0,
              knownQuestionIds: Array.isArray(data.progress.knownQuestionIds) ? data.progress.knownQuestionIds : [],
              updatedAt: data.progress.updatedAt || (data.updatedAt ? new Date(data.updatedAt).getTime() : Date.now()),
            };
          }
        });
        onUpdate(result);
      },
      (err) => {
        handleFirestoreError('subscribeAllFlashcardProgress', err);
      }
    );
  } catch (err) {
    handleFirestoreError('subscribeAllFlashcardProgress catch', err);
    return () => {};
  }
};

// ---------------------------------------------------------------------------
// Real-time Cloud Sync for Quiz MCQ Practice Learning Progress (QuizPage)
// ---------------------------------------------------------------------------
export interface QuizLearningProgressCloud {
  currentIndex: number;
  userAnswers: Record<string, number | number[]>;
  currentOptions?: any;
  updatedAt?: number;
}

const pendingQuizWrites = new Map<string, { email: string; quizId: string; progress: QuizLearningProgressCloud }>();
let quizWriteTimer: any = null;

const executeQuizWrite = async (item: { email: string; quizId: string; progress: QuizLearningProgressCloud }) => {
  if (!isFirestoreAvailable() || !item.email || !item.quizId) return;
  try {
    const cleanEmail = item.email.trim().toLowerCase();
    const docId = `${cleanEmail.replace(/[^a-z0-9]/g, '_')}_${String(item.quizId).trim()}`;
    const ref = doc(db, 'quiz_learning_progress', docId);
    await setDoc(
      ref,
      {
        email: cleanEmail,
        quizId: String(item.quizId).trim(),
        progress: {
          currentIndex: item.progress.currentIndex,
          userAnswers: item.progress.userAnswers || {},
          currentOptions: item.progress.currentOptions || null,
          updatedAt: item.progress.updatedAt || Date.now(),
        },
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError('syncQuizLearningProgressToFirestore', err);
  }
};

export const syncQuizLearningProgressToFirestore = async (
  email: string,
  quizId: string,
  progress: QuizLearningProgressCloud,
  immediate = false
): Promise<void> => {
  if (!email || !quizId) return;
  const key = `${email}_${quizId}`;
  pendingQuizWrites.set(key, { email, quizId, progress });

  if (immediate) {
    if (quizWriteTimer) clearTimeout(quizWriteTimer);
    await executeQuizWrite({ email, quizId, progress });
    pendingQuizWrites.delete(key);
    return;
  }

  if (!quizWriteTimer) {
    quizWriteTimer = setTimeout(() => {
      quizWriteTimer = null;
      const items = Array.from(pendingQuizWrites.values());
      pendingQuizWrites.clear();
      items.forEach((item) => executeQuizWrite(item).catch(() => {}));
    }, 200); // Ultra-responsive 200ms debounce
  }
};

export const subscribeQuizLearningProgress = (
  email: string,
  quizId: string,
  onUpdate: (progress: QuizLearningProgressCloud) => void
): (() => void) => {
  if (!isFirestoreAvailable() || !email || !quizId) return () => {};
  try {
    const cleanEmail = email.trim().toLowerCase();
    const docId = `${cleanEmail.replace(/[^a-z0-9]/g, '_')}_${String(quizId).trim()}`;
    const ref = doc(db, 'quiz_learning_progress', docId);
    return onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data?.progress) {
            onUpdate({
              ...data.progress,
              updatedAt: data.progress.updatedAt || (data.updatedAt ? new Date(data.updatedAt).getTime() : Date.now()),
            });
          }
        }
      },
      (err) => {
        handleFirestoreError('subscribeQuizLearningProgress', err);
      }
    );
  } catch (err) {
    handleFirestoreError('subscribeQuizLearningProgress catch', err);
    return () => {};
  }
};

// Global subscription for all quiz learning progress of this user across devices
export const subscribeAllQuizLearningProgress = (
  email: string,
  onUpdate: (items: Record<string, QuizLearningProgressCloud>) => void
): (() => void) => {
  if (!isFirestoreAvailable() || !email) return () => {};
  try {
    const cleanEmail = email.trim().toLowerCase();
    const q = query(collection(db, 'quiz_learning_progress'), where('email', '==', cleanEmail));
    return onSnapshot(
      q,
      (snap) => {
        const result: Record<string, QuizLearningProgressCloud> = {};
        snap.docs.forEach((d) => {
          const data = d.data();
          if (data?.quizId && data?.progress) {
            result[data.quizId] = {
              currentIndex: typeof data.progress.currentIndex === 'number' ? data.progress.currentIndex : 0,
              userAnswers: data.progress.userAnswers || {},
              currentOptions: data.progress.currentOptions || null,
              updatedAt: data.progress.updatedAt || (data.updatedAt ? new Date(data.updatedAt).getTime() : Date.now()),
            };
          }
        });
        onUpdate(result);
      },
      (err) => {
        handleFirestoreError('subscribeAllQuizLearningProgress', err);
      }
    );
  } catch (err) {
    handleFirestoreError('subscribeAllQuizLearningProgress catch', err);
    return () => {};
  }
};

// ---------------------------------------------------------------------------
// Real-time Cloud Sync for Practice Mistakes Progress (Luyện câu hay sai)
// ---------------------------------------------------------------------------
export interface PracticeMistakesProgressCloud {
  currentIndex: number;
  masteredCount: number;
  updatedAt: number;
}

export const syncPracticeMistakesProgressToFirestore = async (
  email: string,
  progress: PracticeMistakesProgressCloud
): Promise<void> => {
  if (!isFirestoreAvailable() || !email) return;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const docId = `${cleanEmail.replace(/[^a-z0-9]/g, '_')}_practice_mistakes`;
    const ref = doc(db, 'practice_mistakes_progress', docId);
    await setDoc(
      ref,
      {
        email: cleanEmail,
        progress: {
          currentIndex: progress.currentIndex,
          masteredCount: progress.masteredCount || 0,
          updatedAt: progress.updatedAt || Date.now(),
        },
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError('syncPracticeMistakesProgressToFirestore', err);
  }
};

export const subscribePracticeMistakesProgress = (
  email: string,
  onUpdate: (progress: PracticeMistakesProgressCloud) => void
): (() => void) => {
  if (!isFirestoreAvailable() || !email) return () => {};
  try {
    const cleanEmail = email.trim().toLowerCase();
    const docId = `${cleanEmail.replace(/[^a-z0-9]/g, '_')}_practice_mistakes`;
    const ref = doc(db, 'practice_mistakes_progress', docId);
    return onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data?.progress) {
            onUpdate({
              currentIndex: typeof data.progress.currentIndex === 'number' ? data.progress.currentIndex : 0,
              masteredCount: data.progress.masteredCount || 0,
              updatedAt: data.progress.updatedAt || (data.updatedAt ? new Date(data.updatedAt).getTime() : Date.now()),
            });
          }
        }
      },
      (err) => {
        handleFirestoreError('subscribePracticeMistakesProgress', err);
      }
    );
  } catch (err) {
    handleFirestoreError('subscribePracticeMistakesProgress catch', err);
    return () => {};
  }
};

// Flush all pending debounced writes immediately (on visibility hidden, unload, or route change)
export const flushAllPendingProgressSync = async (): Promise<void> => {
  if (flashcardWriteTimer) {
    clearTimeout(flashcardWriteTimer);
    flashcardWriteTimer = null;
  }
  if (quizWriteTimer) {
    clearTimeout(quizWriteTimer);
    quizWriteTimer = null;
  }

  const flashcardPromises = Array.from(pendingFlashcardWrites.values()).map((item) =>
    executeFlashcardWrite(item).catch(() => {})
  );
  pendingFlashcardWrites.clear();

  const quizPromises = Array.from(pendingQuizWrites.values()).map((item) =>
    executeQuizWrite(item).catch(() => {})
  );
  pendingQuizWrites.clear();

  await Promise.all([...flashcardPromises, ...quizPromises]);
};

// ---------------------------------------------------------------------------
// Real-time Cloud Sync for Japanese Study Progress (Typing, Flashcard, Kanji)
// ---------------------------------------------------------------------------
export const syncStudyProgressToFirestore = async (
  email: string,
  progressKey: string,
  data: any
): Promise<void> => {
  if (!isFirestoreAvailable() || !email || !progressKey) return;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const docId = `${cleanEmail.replace(/[^a-z0-9]/g, '_')}_${progressKey.replace(/[^a-z0-9_-]/gi, '_')}`;
    const ref = doc(db, 'study_progress', docId);
    await setDoc(ref, {
      email: cleanEmail,
      key: progressKey,
      data: JSON.parse(JSON.stringify(data)),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    handleFirestoreError('syncStudyProgressToFirestore', err);
  }
};

export const subscribeStudyProgress = (
  email: string,
  onUpdate: (items: Record<string, any>) => void
): (() => void) => {
  if (!isFirestoreAvailable() || !email) return () => {};
  try {
    const cleanEmail = email.trim().toLowerCase();
    const q = query(collection(db, 'study_progress'), where('email', '==', cleanEmail));
    return onSnapshot(
      q,
      (snap) => {
        const result: Record<string, any> = {};
        snap.docs.forEach((d) => {
          const item = d.data();
          if (item?.key && item?.data) {
            result[item.key] = item.data;
          }
        });
        onUpdate(result);
      },
      (err) => {
        handleFirestoreError('subscribeStudyProgress', err);
      }
    );
  } catch (err) {
    handleFirestoreError('subscribeStudyProgress catch', err);
    return () => {};
  }
};

