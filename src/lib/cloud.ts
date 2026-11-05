import {projectStorage as localStorage} from '../utils/projectStorage';
import {configureCloudOutbox,enqueueCloudMutation,cloudIdentityChanged,flushCloudOutbox,getPendingCloudMutations} from '../utils/cloudOutbox';
import {orderedWrite,flushOrderedWrites} from '../utils/orderedWrites';
import {auth,onAuthStateChanged} from './supabaseAuth';
export {auth,onAuthStateChanged,registerUser,loginUser,loginWithGoogle,logoutUser,deleteCurrentUserAccount,resendVerificationEmail,refreshEmailVerified,sendResetPassword,updateAccountPassword} from './supabaseAuth';
import {supabase,isSupabaseConfigured,cloudFailure} from './supabaseClient';
import {db,collection,doc,getDoc,getDocs,onSnapshot,query,where,or,deleteDoc,updateDoc,deleteField,increment,runTransaction,setDoc as directSetDoc} from './supabaseDocuments';
export {db};
import {Quiz,QuizAttempt} from '../types/quiz';
export const isLocalTestEnvironment=false;
// Compatibility names retained so existing UI/storage code does not change its data shape.
export const isFirebaseConfigured=isSupabaseConfigured;
export const isFirestoreAvailable=isSupabaseConfigured;
const handleFirestoreError=(action:string,error:any)=>console.warn('[Supabase] '+action,error?.code||'',error?.message||'Request failed');
export function withTimeout<T>(promise:Promise<T>,ms=10000,label='Operation'):Promise<T>{return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(label+' timed out')),ms);promise.then(v=>{clearTimeout(timer);resolve(v);},e=>{clearTimeout(timer);reject(e);});});}
configureCloudOutbox({email:()=>currentEmail(),ready:()=>!!auth.currentUser?.emailVerified,write:async item=>{
 if(item.backend!=='supabase')throw Object.assign(new Error('Có dữ liệu chờ từ bản Firebase. Mở Cài đặt → Chuyển dữ liệu để chuyển hàng đợi cũ.'),{code:'cloud/legacy-pending'});
 if(auth.currentUser?.email?.trim().toLowerCase()!==item.email)throw new Error('Phiên đăng nhập đã thay đổi.');
 let prepared=item.data;
 if(item.path.startsWith('quizzes/'))prepared=await offloadQuizImages(prepared);
 if(item.path.startsWith('user_japanese_courses/')&&prepared.courseJson){const course=JSON.parse(prepared.courseJson);const lessons=await Promise.all((course.lessons||[]).map(async(l:any)=>({...l,cards:(await offloadQuizImages({questions:l.cards||[]})).questions})));prepared={...prepared,courseJson:JSON.stringify({...course,lessons})};}
 const ref=doc(db,item.path);
 await runTransaction(db,async tx=>{const snapshot=await tx.get(ref);const remote=snapshot.exists()?snapshot.data():null;let data=prepared;const time=(v:any)=>typeof v==='number'?v:Date.parse(v||'')||0;
 if(remote&&item.path.startsWith('srs_progress/')){const records={...(remote.records||{})};for(const [id,value] of Object.entries(data.records||{})){const v=value as any;if(!records[id]||(v.lastReviewedDate||'')>(records[id].lastReviewedDate||''))records[id]=v;}data={...data,records,updatedAt:time(remote.updatedAt)>time(data.updatedAt)?remote.updatedAt:data.updatedAt};}
 else if(remote&&item.path.startsWith('fe_mock_exams/')){const map=new Map([...(remote.history||[]),...(data.history||[])].map((x:any)=>[x.id,x]));data={...data,history:[...map.values()].sort((a:any,b:any)=>b.date.localeCompare(a.date)).slice(0,30),updatedAt:time(remote.updatedAt)>time(data.updatedAt)?remote.updatedAt:data.updatedAt};}
 else if(remote&&time(remote.updatedAt)>time(data.updatedAt)&&time(data.updatedAt)>0)return;
 tx.set(ref,data,{merge:item.merge});});
}});
onAuthStateChanged(auth,()=>cloudIdentityChanged());
export const writeCloudDocument=(ref:any,data:any,options?:{merge?:boolean;delayMs?:number})=>enqueueCloudMutation((data.email||data.userEmail||data.ownerEmail||currentEmail()||'').toLowerCase().trim(),ref.path,data,!!options?.merge,options?.delayMs||0,'supabase');
const setDoc=writeCloudDocument;
const uploadedCache=new Map<string,string>();
export async function uploadImageDataUrl(dataUrl:string):Promise<string>{if(!dataUrl?.startsWith('data:image/'))return dataUrl;const user=auth.currentUser;if(!user?.emailVerified)return dataUrl;
 const mime=dataUrl.slice(5,dataUrl.indexOf(';'));if(!['image/png','image/jpeg','image/webp','image/gif','image/avif'].includes(mime))throw new Error('Chỉ hỗ trợ ảnh PNG, JPEG, WEBP, GIF hoặc AVIF.');
 const cached=uploadedCache.get(user.uid+dataUrl);if(cached)return cached;const bytes=Uint8Array.from(atob(dataUrl.slice(dataUrl.indexOf(',')+1)),c=>c.charCodeAt(0));if(bytes.length>10485760)throw new Error('Ảnh vượt 10 MB.');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');const ext=mime.split('/')[1].replace('jpeg','jpg'),path=user.uid+'/'+hash+'.'+ext;
 const {error}=await supabase().storage.from('quiz-images').upload(path,bytes,{contentType:mime,upsert:true,cacheControl:'31536000'});if(error)throw cloudFailure(error);const url=supabase().storage.from('quiz-images').getPublicUrl(path).data.publicUrl;uploadedCache.set(user.uid+dataUrl,url);return url;
}
export async function offloadQuizImages<T extends {questions?:{imageUrl?:string}[]}>(quiz:T):Promise<T>{if(!quiz.questions?.some(q=>q.imageUrl?.startsWith('data:image/')))return quiz;return {...quiz,questions:await Promise.all(quiz.questions.map(async q=>q.imageUrl?.startsWith('data:image/')?{...q,imageUrl:await uploadImageDataUrl(q.imageUrl)}:q))};}
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
  onUpdate: (quizzes: Quiz[], deleted?:Record<string,string>) => void,
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
      {includeMetadataChanges:true},
      (snapshot) => {
        if(snapshot.metadata?.fromCache&&!snapshot.docs.length)return;
        const quizzes: Quiz[] = snapshot.docs.filter(d=>!d.data().deletedAt).map((docSnap) => {
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
        const deleted=Object.fromEntries(snapshot.docs.filter(d=>d.data().deletedAt).map(d=>[d.id,d.data().deletedAt]));
        onUpdate(quizzes,deleted);
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
      const clean=JSON.parse(JSON.stringify(snapshot));
      const payload:any={...clean,userId:email?'usr_'+email.replace(/[^a-z0-9]/g,'_'):(userId||'guest_user'),updatedAt:snapshot.updatedAt||new Date().toISOString()};
      if(email)payload.userEmail=email;
      await setDoc(doc(db,'quizzes',snapshot.id),payload);
    }catch(err){handleFirestoreError('syncQuizToFirestore',err);throw err;}
  });
};
export const flushQuizWrites = async():Promise<void>=>{await flushOrderedWrites();};
export const removeQuizFromFirestore = async(quizId:string):Promise<void>=>{
  if(!isFirestoreAvailable()||!quizId)return;
  const email=currentEmail();const deletionTime=new Date().toISOString();
  return orderedWrite(`quiz:${email}:${quizId}`,async()=>{
    try{const at=deletionTime;await setDoc(doc(db,'quizzes',quizId),{userEmail:email,userId:email?'usr_'+email.replace(/[^a-z0-9]/g,'_'):'guest_user',deletedAt:at,updatedAt:at});}
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
      {includeMetadataChanges:true},
      (snapshot) => {
        if(snapshot.metadata?.fromCache&&!snapshot.docs.length)return;
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

export const deleteUserFromFirestore=async(email:string)=>{if(auth.currentUser?.email?.toLowerCase()!==email.trim().toLowerCase())throw new Error('Không được xóa dữ liệu tài khoản khác.');const {error}=await supabase().rpc('dun_delete_my_data');if(error)throw cloudFailure(error);};

export const syncJapaneseCourseToFirestore = async (course:any,email?:string):Promise<void> => {
  if(!isFirestoreAvailable() || !course?.id)return;
  const cleanEmail=(email||auth.currentUser?.email||'').trim().toLowerCase();if(!cleanEmail)return;
  const snapshot=JSON.parse(JSON.stringify(course));
  return orderedWrite(`japanese:${cleanEmail}:${course.id}`,async()=>{
    try {
      const clean=snapshot;
      await setDoc(doc(db,'user_japanese_courses',`${cleanEmail}_${snapshot.id}`),{email:cleanEmail,courseId:snapshot.id,courseJson:JSON.stringify(clean),schemaVersion:2,updatedAt:snapshot.updatedAt||new Date().toISOString()});
    }catch(err){handleFirestoreError('syncJapaneseCourseToFirestore',err);throw err;}
  });
};
export const deleteJapaneseCourseFromFirestore = async(courseId:string,email?:string):Promise<void>=>{
  if(!isFirestoreAvailable()||!courseId)return;
  const cleanEmail=(email||auth.currentUser?.email||'').trim().toLowerCase();if(!cleanEmail)return;
  const deletedAt=new Date().toISOString();
  return orderedWrite(`japanese:${cleanEmail}:${courseId}`,async()=>{
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
      {includeMetadataChanges:true},
      (snapshot) => {
        if(snapshot.metadata?.fromCache&&!snapshot.docs.length)return;
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
export const subscribeUserSettings=(email:string,onUpdate:(settings:any)=>void):(()=>void)=>onSnapshot(doc(db,'settings',email.toLowerCase().trim()),snapshot=>{if(snapshot.exists())onUpdate(snapshot.data());},error=>handleFirestoreError('subscribeUserSettings',error));

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
  if(!email||!quizId)return;
  return executeFlashcardWrite({email,quizId,progress:JSON.parse(JSON.stringify(progress))});
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
      {includeMetadataChanges:true},
      (snap) => {
        if(snap.metadata?.fromCache&&!snap.docs.length)return;
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
  cleared?:boolean;
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
          cleared:(item.progress as any).cleared===true,
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
  if(!email||!quizId)return;
  return executeQuizWrite({email,quizId,progress:JSON.parse(JSON.stringify(progress))});
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
      {includeMetadataChanges:true},
      (snap) => {
        if(snap.metadata?.fromCache&&!snap.docs.length)return;
        const result: Record<string, QuizLearningProgressCloud> = {};
        snap.docs.forEach((d) => {
          const data = d.data();
          if (data?.quizId && data?.progress) {
            result[data.quizId] = {
              currentIndex: typeof data.progress.currentIndex === 'number' ? data.progress.currentIndex : 0,
              userAnswers: data.progress.userAnswers || {},
              currentOptions: data.progress.currentOptions || null,
              cleared:data.progress.cleared===true,
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
  void flushCloudOutbox();
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

  await Promise.all([...flashcardPromises, ...quizPromises,flushOrderedWrites(),flushCloudOutbox()]);
};

// ---------------------------------------------------------------------------
// Real-time Cloud Sync for Japanese Study Progress (Typing, Flashcard, Kanji)
// ---------------------------------------------------------------------------
const lastStudyContent = new Map<string,string>();
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
    const identity = cleanEmail + ':' + progressKey;
    // The local timer still persists every second; only meaningful study changes use cloud writes.
    if(progressKey.startsWith('jp_progress_')){
      const {seconds,savedAt,updatedAt,...content}=data;
      const signature=JSON.stringify(content);
      if(lastStudyContent.get(identity)===signature)return;
      lastStudyContent.set(identity,signature);
    }
    await setDoc(ref, {
      email: cleanEmail,
      key: progressKey,
      data: JSON.parse(JSON.stringify(data)),
      updatedAt: new Date().toISOString(),
    }, { merge: true, delayMs: progressKey.startsWith('jp_progress_') && !data.cleared ? 1500 : 0 });
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
      {includeMetadataChanges:true},
      (snap) => {
        if(snap.metadata?.fromCache&&!snap.docs.length)return;
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
export const bumpSharedCounter=async(shareId:string,field:'views'|'saves')=>{const flag='mcq_share_'+field+'_'+shareId;try{if(localStorage.getItem(flag))return;}catch{}const {error}=await supabase().rpc('dun_shared_action',{p_share:shareId,p_action:field});if(error)throw cloudFailure(error);try{localStorage.setItem(flag,'1');}catch{}};

/** Chế độ lớp học: gửi điểm của mình về cho người chia sẻ */
export const submitSharedResult=async(shareId:string,r:{score:number;total:number;name?:string})=>{const {error}=await supabase().rpc('dun_shared_action',{p_share:shareId,p_action:'result',p_score:r.score,p_total:r.total,p_name:r.name||auth.currentUser?.displayName||''});if(error)throw cloudFailure(error);return true;};

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
