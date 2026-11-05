import {collection,doc,onSnapshot,query,where,getDocsFromServer,runTransaction,limit,orderBy} from './supabaseDocuments';
import {auth,db} from './cloud';
import {canOpenAdmin} from '../utils/adminAccess';
import {AccountControl,validateControlChange,normalizeEmail} from '../utils/adminPolicy';
import {Quiz,QuizAttempt} from '../types/quiz';
import {normalizeAdminQuiz,normalizeAdminAttempt} from '../utils/adminLibraryData';
export interface AdminUser {id:string;email:string;name:string;createdAt?:string;updatedAt?:string;}
export interface AdminLog {id:string;actor:string;target:string;at:string;before:AccountControl;after:AccountControl;}
function requireAdmin(){if(!canOpenAdmin())throw new Error('Chỉ chủ hệ thống đã xác minh email được quản trị.');}
export function subscribeAdminUsers(next:(users:AdminUser[])=>void,fail:(e:Error)=>void){requireAdmin();return onSnapshot(collection(db,'users'),snap=>next(snap.docs.map(d=>{const v=d.data();return {id:d.id,email:normalizeEmail(d.id),name:typeof v.name==='string'?v.name:d.id,createdAt:v.createdAt,updatedAt:v.updatedAt};})),fail);}
export function subscribeAdminControls(next:(controls:Record<string,AccountControl>)=>void,fail:(e:Error)=>void){requireAdmin();return onSnapshot(collection(db,'admin_controls'),snap=>next(Object.fromEntries(snap.docs.map(d=>[d.id,d.data()]))),fail);}
export function subscribeAdminLogs(next:(logs:AdminLog[])=>void,fail:(e:Error)=>void){requireAdmin();return onSnapshot(query(collection(db,'admin_audit'),orderBy('at','desc'),limit(100)),snap=>next(snap.docs.map(d=>({...d.data(),id:d.id} as AdminLog))),fail);}
export function subscribeAccountControl(email:string,next:(control:AccountControl|null)=>void,fail:(e:Error)=>void){return onSnapshot(doc(db,'admin_controls',normalizeEmail(email)),snap=>next(snap.exists()?snap.data() as AccountControl:null),fail);}
export async function saveAccountControls(emails:string[],patch:AccountControl){
 requireAdmin();if(typeof navigator!=='undefined'&&!navigator.onLine)throw new Error('Cần kết nối mạng để đổi quyền.');
 const changes=[...new Set(emails.map(normalizeEmail))].map(email=>validateControlChange(email,patch));
 if(!changes.length||changes.length>50)throw new Error('Chọn từ 1 đến 50 tài khoản.');
 const actor=auth.currentUser!.email!.toLowerCase();
 await runTransaction(db,async tx=>{
  const refs=changes.map(c=>doc(db,'admin_controls',c.email));
  const snapshots=await Promise.all(refs.map(ref=>tx.get(ref)));
  const at=new Date().toISOString();
  changes.forEach((change,i)=>{const before=snapshots[i].exists()?snapshots[i].data() as AccountControl:{};const after={...before,...change.patch,updatedAt:at};
   tx.set(refs[i],after);tx.set(doc(collection(db,'admin_audit')),{actor,target:change.email,at,before,after});
  });
 });
}
export async function loadAdminUserLibrary(email:string):Promise<{quizzes:Quiz[];attempts:QuizAttempt[]}>{
 requireAdmin();const target=normalizeEmail(email);
 const [quizzes,attempts]=await Promise.all(['quizzes','attempts'].map(c=>getDocsFromServer(query(collection(db,c),where('userEmail','==',target)))));
 requireAdmin();
 return {quizzes:quizzes.docs.filter(d=>!d.data().deletedAt).map(d=>normalizeAdminQuiz(d.id,d.data())),attempts:attempts.docs.map(d=>normalizeAdminAttempt(d.id,d.data()))};
}
