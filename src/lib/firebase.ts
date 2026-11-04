import { orderedWrite, flushOrderedWrites } from '../utils/orderedWrites';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  deleteUser,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  User,
} from 'firebase/auth';
import {
  initializeFirestore,
  connectFirestoreEmulator,
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
  deleteField,
  updateDoc,
  persistentLocalCache,
  increment,
  persistentMultipleTabManager,
  memoryLocalCache,
  Firestore,
} from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import { Quiz, QuizAttempt } from '../types/quiz';

export const isLocalTestEnvironment=import.meta.env.DEV&&import.meta.env.VITE_USE_FIREBASE_EMULATORS==='true';
const useLocalEmulators=isLocalTestEnvironment;
const app = initializeApp(useLocalEmulators?{...firebaseConfig,projectId:'demo-dun-admin-qa',apiKey:'demo-key',authDomain:'localhost'}:firebaseConfig);
export const auth = getAuth(app);
if(useLocalEmulators)connectAuthEmulator(auth,'http://127.0.0.1:9199',{disableWarnings:true});
// Bộ nhớ đệm offline của Firestore (IndexedDB, dùng chung nhiều tab): mất mạng vẫn đọc được dữ liệu
// đã tải và ghi được, có mạng lại sẽ tự đẩy lên. Trình duyệt không có IndexedDB → dùng bộ nhớ tạm.
const createDb = (): Firestore => {
  try {
    return initializeFirestore(
      app,
      { ignoreUndefinedProperties: true, localCache: useLocalEmulators?memoryLocalCache():persistentLocalCache({ tabManager: persistentMultipleTabManager() }) },
      useLocalEmulators?'(default)':firebaseConfig.firestoreDatabaseId
    );
  } catch (e) {
    console.warn('Firestore offline cache unavailable, using memory cache:', e);
    return initializeFirestore(app, { ignoreUndefinedProperties: true, localCache: memoryLocalCache() }, useLocalEmulators?'(default)':firebaseConfig.firestoreDatabaseId);
  }
};
export const db = createDb();
if(useLocalEmulators)connectFirestoreEmulator(db,'127.0.0.1',8380);

// ---------------- Ảnh câu hỏi → Firebase Storage ----------------
// Ảnh dán/tải lên được lưu dạng data URL (base64) ngay trong bộ đề, dễ vượt giới hạn 1 MB của
// Firestore. Trước khi lưu lên đám mây, ảnh được tải lên Storage và thay bằng đường link.
// Nếu dự án chưa bật Storage (hoặc mất mạng) thì giữ nguyên data URL như trước.
let storageDisabled = false;
const uploadedCache = new Map<string, string>();

const hashString = async (str: string): Promise<string> => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf))
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

export const uploadImageDataUrl = async (dataUrl: string): Promise<string> => {
  if (!dataUrl?.startsWith('data:image/') || storageDisabled) return dataUrl;
  const email = (auth.currentUser?.email || '').toLowerCase();
  if (!email || !(firebaseConfig as any).storageBucket) return dataUrl;
  try {
    const hash = await hashString(dataUrl);
    const hit = uploadedCache.get(hash);
    if (hit) return hit;
    const ext = (dataUrl.match(/^data:image\/([a-z0-9+]+)/i)?.[1] || 'png').replace('jpeg', 'jpg').replace('svg+xml', 'svg');
    const r = storageRef(getStorage(app), `quiz-images/${email}/${hash}.${ext}`);
    await withTimeout(uploadString(r, dataUrl, 'data_url', { cacheControl: 'public, max-age=31536000' }), 20000, 'uploadImage');
    const url = await withTimeout(getDownloadURL(r), 10000, 'getDownloadURL');
    uploadedCache.set(hash, url);
    return url;
  } catch (e: any) {
    const code = String(e?.code || '');
    // Chưa bật Storage / không có quyền → thôi thử trong phiên này
    if (code.includes('unauthorized') || code.includes('unknown') || code.includes('bucket') || code.includes('project-not-found')) {
      storageDisabled = true;
    }
    console.warn('Không tải ảnh lên Storage được, giữ ảnh trong bộ đề:', e);
    return dataUrl;
  }
};

/** Thay mọi ảnh data URL trong bộ đề bằng link Storage (giữ nguyên nếu không tải lên được) */
export const offloadQuizImages = async <T extends { questions?: { imageUrl?: string }[] }>(quiz: T): Promise<T> => {
  const qs = quiz.questions || [];
  if (!qs.some((q) => q.imageUrl?.startsWith('data:image/'))) return quiz;
  const questions = await Promise.all(
    qs.map(async (q) => (q.imageUrl?.startsWith('data:image/') ? { ...q, imageUrl: await uploadImageDataUrl(q.imageUrl) } : q))
  );
  return { ...quiz, questions };
};

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
    try {
      await withTimeout(sendEmailVerification(userCred.user), 8000, 'sendEmailVerification');
    } catch (e) {
      console.warn('Không gửi được email xác minh:', e);
    }
  }
  return userCred.user;
};

/** Gửi lại email xác minh cho người đang đăng nhập */
export const resendVerificationEmail = async () => {
  const u = auth.currentUser;
  if (!u) throw new Error('Bạn chưa đăng nhập.');
  await withTimeout(sendEmailVerification(u), 8000, 'sendEmailVerification');
};

/** Tải lại trạng thái tài khoản; trả về true nếu email đã được xác minh (và làm mới token cho Firestore rules) */
export const refreshEmailVerified = async (): Promise<boolean> => {
  const u = auth.currentUser;
  if (!u) return false;
  await withTimeout(u.reload(), 8000, 'reloadUser');
  if (auth.currentUser?.emailVerified) {
    await auth.currentUser.getIdToken(true);
    return true;
  }
  return false;
};

/** Gửi email đặt lại mật khẩu */
export const sendResetPassword = async (email: string) => {
  await withTimeout(sendPasswordResetEmail(auth, email), 10000, 'sendPasswordResetEmail');
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

/** Email của người đang đăng nhập (ưu tiên Firebase Auth) – dùng làm khóa sở hữu dữ liệu trên Firestore */
export const currentEmail = (): string => {
  const fromAuth = auth.currentUser?.email;
  if (fromAuth) return fromAuth.trim().toLowerCase();
  try {
    const saved = localStorage.getItem('mcq_user');
    const e = saved ? JSON.parse(saved)?.email : '';
    return e ? String(e).trim().toLowerCase() : '';
  } catch {
    return '';
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

/**
 * Chuyển dữ liệu cũ sang khóa sở hữu theo email: bộ đề / lượt làm bài trước đây chỉ có `userId`
 * → thêm `userEmail` để vẫn đọc được sau khi siết quy tắc Firestore. Chạy một lần mỗi máy.
 */
const migrateLegacyOwnership = async (col: 'quizzes' | 'attempts', userIds: string[], email: string) => {
  const key = `mcq_owner_migrated_v1_${col}_${email}`;
  try {
    if (localStorage.getItem(key)) return;
  } catch {}
  const ids = userIds.slice(0, 10);
  if (!ids.length) return;
  try {
    const snap = await withTimeout(getDocs(query(collection(db, col), where('userId', 'in', ids))), 15000, 'migrate ' + col);
    await Promise.all(
      snap.docs.filter((d) => !d.data().userEmail).map((d) => updateDoc(d.ref, { userEmail: email }))
    );
    try {
      localStorage.setItem(key, '1');
    } catch {}
  } catch (err) {
    // Sau khi đã siết quy tắc, truy vấn cũ theo userId bị chặn → bỏ qua
    handleFirestoreError('migrateLegacyOwnership ' + col, err);
  }
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

    // Đã đăng nhập: chỉ truy vấn theo userEmail (khớp quy tắc bảo mật Firestore mới).
    // Bộ đề cũ chưa có userEmail được bổ sung một lần bằng migrateLegacyOwnership.
    if (cleanEmail) migrateLegacyOwnership('quizzes', userIds, cleanEmail);
    const q = cleanEmail
      ? query(collection(db, 'quizzes'), where('userEmail', '==', cleanEmail))
      : query(collection(db, 'quizzes'), where('userId', 'in', userIds.slice(0, 10).length ? userIds.slice(0, 10) : [userId]));

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
export const syncQuizToFirestore = async(userId:string,quiz:Quiz):Promise<void>=>{
  if(!isFirestoreAvailable()||!quiz?.id)return;
  const email=currentEmail();const snapshot=JSON.parse(JSON.stringify(quiz));
  return orderedWrite(`quiz:${email}:${quiz.id}`,async()=>{
    try{
      const clean=JSON.parse(JSON.stringify(await offloadQuizImages(snapshot)));
      const payload:any={...clean,userId:email?'usr_'+email.replace(/[^a-z0-9]/g,'_'):(userId||'guest_user'),updatedAt:snapshot.updatedAt||new Date().toISOString()};
      if(email)payload.userEmail=email;
      await setDoc(doc(db,'quizzes',snapshot.id),payload);
    }catch(err){handleFirestoreError('syncQuizToFirestore',err);throw err;}
  });
};
export const flushQuizWrites = async():Promise<void>=>{await flushOrderedWrites();};
export const removeQuizFromFirestore = async(quizId:string):Promise<void>=>{
  if(!isFirestoreAvailable()||!quizId)return;
  const email=currentEmail();
  return orderedWrite(`quiz:${email}:${quizId}`,async()=>{
    try{await deleteDoc(doc(db,'quizzes',quizId));}
    catch(err){handleFirestoreError('removeQuizFromFirestore',err);throw err;}
  });
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
    const email = currentEmail();
    if (email) migrateLegacyOwnership('attempts', userIds, email);
    const q = email
      ? query(collection(db, 'attempts'), where('userEmail', '==', email))
      : userIds.length > 1
      ? query(collection(db, 'attempts'), where('userId', 'in', userIds.slice(0, 10)))
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
    const email = currentEmail();
    await setDoc(attemptRef, {
      ...cleanAttempt,
      userId,
      ...(email ? { userEmail: email } : {}),
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

/**
 * Lưu hồ sơ người dùng (email + tên). KHÔNG lưu mật khẩu – mật khẩu do Firebase Auth quản lý.
 * Đồng thời xóa trường `password` cũ (bản trước lưu mật khẩu dạng chữ) nếu còn.
 */
export const saveUserToFirestore = async (email: string, name: string): Promise<void> => {
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
          password: deleteField(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ),
      4000,
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

export const syncJapaneseCourseToFirestore = async (course:any,email?:string):Promise<void> => {
  if(!isFirestoreAvailable() || !course?.id)return;
  const cleanEmail=(email||auth.currentUser?.email||'').trim().toLowerCase();if(!cleanEmail)return;
  const snapshot=JSON.parse(JSON.stringify(course));
  return orderedWrite(`japanese:${cleanEmail}:${course.id}`,async()=>{
    try {
      const lessons=await Promise.all((snapshot.lessons||[]).map(async(l:any)=>({...l,cards:(await offloadQuizImages({questions:l.cards||[]})).questions})));
      const clean=snapshot.lessons?{...snapshot,lessons}:snapshot;
      await setDoc(doc(db,'user_japanese_courses',`${cleanEmail}_${snapshot.id}`),{email:cleanEmail,courseId:snapshot.id,courseJson:JSON.stringify(clean),schemaVersion:2,updatedAt:new Date().toISOString()});
    }catch(err){handleFirestoreError('syncJapaneseCourseToFirestore',err);throw err;}
  });
};
export const deleteJapaneseCourseFromFirestore = async(courseId:string,email?:string):Promise<void>=>{
  if(!isFirestoreAvailable()||!courseId)return;
  const cleanEmail=(email||auth.currentUser?.email||'').trim().toLowerCase();if(!cleanEmail)return;
  return orderedWrite(`japanese:${cleanEmail}:${courseId}`,async()=>{
    const deletedAt=new Date().toISOString();
    try{await setDoc(doc(db,'user_japanese_courses',`${cleanEmail}_${courseId}`),{email:cleanEmail,courseId,course:{id:courseId,deletedAt,updatedAt:deletedAt},updatedAt:deletedAt});}
    catch(err){handleFirestoreError('deleteJapaneseCourseFromFirestore',err);throw err;}
  });
};

export const subscribeJapaneseCourses = (
  emailOrOnUpdate: string | undefined | null | ((courses: any[]) => void),
  maybeOnUpdate?: ((courses: any[]) => void) | ((err: Error) => void),
  maybeOnError?: (err: Error) => void
): (() => void) => {
  if (!isFirestoreAvailable()) {
    const onError=typeof emailOrOnUpdate === 'function' ? maybeOnUpdate : maybeOnError;
    if(onError)(onError as (error:Error)=>void)(new Error('Firestore unavailable'));
    return ()=>{};
  }

  let email = '';
  let onUpdate: (courses: any[]) => void = () => {};
  let onError: ((err: Error) => void) | undefined = undefined;

  if (typeof emailOrOnUpdate === 'function') {
    onUpdate = emailOrOnUpdate;
    email = auth.currentUser?.email || '';
    if (typeof maybeOnUpdate === 'function') {
      onError = maybeOnUpdate as (err: Error) => void;
    }
  } else {
    email = typeof emailOrOnUpdate === 'string' ? emailOrOnUpdate : (auth.currentUser?.email || '');
    if (typeof maybeOnUpdate === 'function') {
      onUpdate = maybeOnUpdate as (courses: any[]) => void;
    }
    onError = maybeOnError;
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    onUpdate([]);
    return () => {};
  }

  try {
    const q = query(collection(db, 'user_japanese_courses'), where('email', '==', cleanEmail));
    return onSnapshot(
      q,
      (snapshot) => {
        const courses: any[] = snapshot.docs
          .map((d) => {
            const data = d.data();
            if(typeof data?.courseJson === 'string') {
              try{return JSON.parse(data.courseJson);}catch(err){handleFirestoreError('decodeJapaneseCourse',err);return null;}
            }
            return data?.course || null;
          })
          .filter(Boolean);
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
  await flushOrderedWrites();
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


// ---------------------------------------------------------------------------
// CHIA SẺ BỘ ĐỀ: lưu một bản chụp công khai ở `shared_quizzes/{shareId}`
// Người nhận mở link #shared?id=... để xem trước và lưu về bộ đề của mình.
// ---------------------------------------------------------------------------
export interface SharedQuizDoc {
  shareId: string;
  quiz: Quiz;
  ownerName?: string;
  ownerEmail?: string;
  sourceQuizId: string;
  createdAt: string;
  updatedAt: string;
  /** Hạn dùng link (ms); null = không hạn */
  expiresAtMs?: number | null;
  /** Chế độ lớp học: người làm bài gửi điểm về cho người chia sẻ */
  classMode?: boolean;
  views?: number;
  saves?: number;
}

export interface ShareOptions {
  expiresAtMs?: number | null;
  classMode?: boolean;
}

export interface SharedResult {
  email: string;
  name: string;
  score: number;
  total: number;
  percent: number;
  bestPercent: number;
  attempts: number;
  lastAt: string;
}

const SHARE_IDS_KEY = 'mcq_share_ids';

const newShareId = () => {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  const arr = new Uint32Array(10);
  try {
    crypto.getRandomValues(arr);
  } catch {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 1e9);
  }
  arr.forEach((n) => (s += chars[n % chars.length]));
  return s;
};

/** Bản bộ đề để chia sẻ: bỏ tiến độ / điểm riêng của người chia sẻ */
const toShareableQuiz = (quiz: Quiz): Quiz => {
  const clean: Quiz = JSON.parse(JSON.stringify(quiz));
  delete (clean as any).userId;
  delete (clean as any).userEmail;
  delete clean.lastScore;
  delete clean.lastTotal;
  delete clean.lastAttemptDate;
  clean.timesCompleted = 0;
  clean.questions = (clean.questions || []).map((q) => ({
    ...q,
    timesAnswered: 0,
    timesCorrect: 0,
    timesWrong: 0,
    mastered: false,
  }));
  return clean;
};

/**
 * Tạo (hoặc cập nhật) link chia sẻ cho một bộ đề. Mỗi bộ đề giữ một mã cố định
 * trên máy này để link cũ vẫn dùng được và luôn mở ra nội dung mới nhất.
 */
export const createOrUpdateSharedQuiz = async (quiz: Quiz, ownerName?: string, opts: ShareOptions = {}): Promise<string> => {
  if (!isFirestoreAvailable()) throw new Error('offline');
  let map: Record<string, string> = {};
  try {
    map = JSON.parse(localStorage.getItem(SHARE_IDS_KEY) || '{}');
  } catch {}
  const shareId = map[quiz.id] || newShareId();
  const now = new Date().toISOString();
  const isNew = !map[quiz.id];
  const payload: Partial<SharedQuizDoc> = {
    shareId,
    quiz: toShareableQuiz(await offloadQuizImages(quiz)),
    ownerName: ownerName || '',
    ownerEmail: currentEmail(),
    sourceQuizId: quiz.id,
    updatedAt: now,
    ...(isNew ? { createdAt: now } : {}),
    ...('expiresAtMs' in opts ? { expiresAtMs: opts.expiresAtMs ?? null } : {}),
    ...('classMode' in opts ? { classMode: !!opts.classMode } : {}),
  };
  const size = new Blob([JSON.stringify(payload)]).size;
  if (size > 950_000) throw new Error('too-large');
  // merge: giữ nguyên lượt xem / lượt lưu / cài đặt cũ
  await withTimeout(setDoc(doc(db, 'shared_quizzes', shareId), payload, { merge: true }), 12000, 'Chia sẻ bộ đề');
  map[quiz.id] = shareId;
  try {
    localStorage.setItem(SHARE_IDS_KEY, JSON.stringify(map));
  } catch {}
  return shareId;
};

/** Thông tin link chia sẻ (cho người tạo): lượt xem, lượt lưu, hạn dùng, chế độ lớp */
export const getSharedQuizMeta = async (shareId: string): Promise<SharedQuizDoc | null> => {
  const snap = await withTimeout(getDoc(doc(db, 'shared_quizzes', shareId)), 10000, 'getSharedQuizMeta');
  return snap.exists() ? (snap.data() as SharedQuizDoc) : null;
};

/** Đếm lượt xem (mỗi máy 1 lần) hoặc lượt lưu */
export const bumpSharedCounter = async (shareId: string, field: 'views' | 'saves') => {
  const flag = `mcq_share_${field}_${shareId}`;
  try {
    if (localStorage.getItem(flag)) return;
    localStorage.setItem(flag, '1');
  } catch {}
  try {
    await updateDoc(doc(db, 'shared_quizzes', shareId), { [field]: increment(1) });
  } catch {}
};

/** Chế độ lớp học: gửi điểm của mình về cho người chia sẻ */
export const submitSharedResult = async (shareId: string, r: { score: number; total: number; name?: string }) => {
  const email = (auth.currentUser?.email || '').toLowerCase();
  if (!email || !shareId) return false;
  const ref = doc(db, 'shared_quizzes', shareId, 'results', email);
  const percent = r.total ? Math.round((r.score / r.total) * 100) : 0;
  let prev: SharedResult | null = null;
  try {
    const s = await getDoc(ref);
    prev = s.exists() ? (s.data() as SharedResult) : null;
  } catch {}
  const data: SharedResult = {
    email,
    name: r.name || auth.currentUser?.displayName || email.split('@')[0],
    score: r.score,
    total: r.total,
    percent,
    bestPercent: Math.max(percent, prev?.bestPercent || 0),
    attempts: (prev?.attempts || 0) + 1,
    lastAt: new Date().toISOString(),
  };
  await withTimeout(setDoc(ref, data), 10000, 'submitSharedResult');
  return true;
};

/** Người chia sẻ xem điểm của cả lớp */
export const getSharedResults = async (shareId: string): Promise<SharedResult[]> => {
  const snap = await withTimeout(getDocs(collection(db, 'shared_quizzes', shareId, 'results')), 10000, 'getSharedResults');
  return snap.docs.map((d) => d.data() as SharedResult).sort((a, b) => b.bestPercent - a.bestPercent);
};

export const getSharedQuiz = async (shareId: string): Promise<SharedQuizDoc | null> => {
  if (!isFirebaseConfigured()) throw new Error('offline');
  const snap = await withTimeout(getDoc(doc(db, 'shared_quizzes', shareId)), 12000, 'Tải bộ đề chia sẻ');
  return snap.exists() ? (snap.data() as SharedQuizDoc) : null;
};
