import {logicalProjectStorageKey,projectStoragePrefix} from './projectStorage';
import {projectStorage as localStorage} from './projectStorage';
// Browser-local outbox. A local save is not a server acknowledgement.
export interface CloudMutation {id:string;email:string;path:string;data:Record<string,any>;merge:boolean;queuedAt:number;notBefore?:number;firstQueuedAt?:number;backend?:'firebase'|'supabase';}
export interface CloudSyncStatus {pending:number;error:string;lastAcknowledgedAt:number|null;errorCode:string;retryAt:number;}
const PREFIX='mcq_cloud_outbox_v1_';
const memory=new Map<string,CloudMutation[]>();
let writer:((item:CloudMutation)=>Promise<void>)|null=null;
let identity=()=>'';
let canSend=()=>false;
let active:Promise<void>|null=null;
let lastAcknowledgedAt:number|null=null;
let lastError='';
let lastErrorCode='';
let wakeTimer:ReturnType<typeof setTimeout>|null=null;
const QUOTA_KEY='mcq_cloud_quota_backoff_v1';
function quotaUntil(){try{return Number(localStorage.getItem(QUOTA_KEY))||0;}catch{return 0;}}
function scheduleWake(at:number){if(wakeTimer)clearTimeout(wakeTimer);wakeTimer=setTimeout(()=>{wakeTimer=null;void flushCloudOutbox(false);},Math.max(1,at-Date.now()));}

function read(email:string):CloudMutation[]{try{const raw=localStorage.getItem(PREFIX+email);if(raw)return JSON.parse(raw);}catch{}return memory.get(email)||[];}
function store(email:string,items:CloudMutation[]){memory.set(email,items);try{if(items.length)localStorage.setItem(PREFIX+email,JSON.stringify(items));else localStorage.removeItem(PREFIX+email);}catch{lastError='Không đủ bộ nhớ để lưu hàng đợi đồng bộ. Giữ tab này mở và kiểm tra kết nối.';}notify();}
function notify(){if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('mcq-cloud-sync-status'));}
export function getCloudSyncStatus():CloudSyncStatus{const email=identity(),items=email?read(email):[];const legacy=items.some(x=>x.backend!=='supabase'),blocked=legacy&&quotaUntil()>Date.now();return {pending:items.length,error:lastError,lastAcknowledgedAt,errorCode:blocked?'resource-exhausted':legacy?'cloud/legacy-pending':lastErrorCode,retryAt:blocked?quotaUntil():0};}
export function moveLegacyPendingToSupabase(email=identity()){
 const items=read(email),latest=new Map<string,CloudMutation>();
 for(const original of items){const item={...original,backend:'supabase' as const};const old=latest.get(item.path);if(!old||item.queuedAt>=old.queuedAt)latest.set(item.path,item);}
 store(email,[...latest.values()]);lastError='';lastErrorCode='';notify();void flushCloudOutbox();
}
export function getPendingCloudMutations(email=identity()){return read(email).map(x=>({...x}));}
export function pendingCloudMutation(path:string,email=identity()){return read(email).find(item=>item.path===path);}
export function configureCloudOutbox(options:{email:()=>string;ready:()=>boolean;write:(item:CloudMutation)=>Promise<void>}){identity=options.email;canSend=options.ready;writer=options.write;}
export async function enqueueCloudMutation(email:string,path:string,data:Record<string,any>,merge=false,delayMs=0,backend:'firebase'|'supabase'='firebase'):Promise<void>{
 email=email.trim().toLowerCase();if(!email)throw new Error('Chưa có tài khoản để đồng bộ.');
 const item:CloudMutation={id:`${Date.now()}-${Math.random()}`,email,path,data:JSON.parse(JSON.stringify(data)),merge,queuedAt:Date.now(),backend};
 const queue=read(email);const previous=queue.find(x=>x.path===path&&(x.backend||'firebase')===backend);
 // Merge-only settings patches must retain earlier pending fields.
 if(merge&&previous){item.data={...previous.data,...item.data};item.merge=previous.merge;}
 if(delayMs>0){item.firstQueuedAt=previous?.firstQueuedAt||Date.now();item.notBefore=Math.min(Date.now()+delayMs,item.firstQueuedAt+5000);}
 store(email,[...queue.filter(x=>x.path!==path||(x.backend||'firebase')!==backend),item]);
 if(delayMs>0){scheduleWake(Math.min(...read(email).filter(x=>x.notBefore).map(x=>x.notBefore!)));return;}
 await flushCloudOutbox(false);
 if(read(email).some(x=>x.id===item.id))throw new Error(lastError||'Thay đổi đã lưu trên máy, đang chờ gửi lên server.');
}
export function flushCloudOutbox(force=true):Promise<void>{
 if(active)return active;
 active=(async()=>{
  if(!writer||!canSend()||typeof navigator!=='undefined'&&!navigator.onLine)return;
  const email=identity();if(!email)return;
  const attempted=new Set<string>();
  for(;;){
   if(identity()!==email||!canSend())break;
   const item=read(email).find(x=>!attempted.has(x.id)&&(x.backend==='supabase'||quotaUntil()<=Date.now())&&(force||!x.notBefore||x.notBefore<=Date.now()));if(!item)break;attempted.add(item.id);
   try{await writer(item);lastAcknowledgedAt=Date.now();lastError='';lastErrorCode='';if(item.backend!=='supabase'){try{localStorage.removeItem(QUOTA_KEY);}catch{}}const queue=read(email);store(email,queue.filter(x=>x.id!==item.id));}
   catch(error){lastError=String((error as any)?.message||error);lastErrorCode=String((error as any)?.code||'').replace(/^firestore\//,'');if(item.backend!=='supabase'&&lastErrorCode==='resource-exhausted'){try{localStorage.setItem(QUOTA_KEY,String(Date.now()+15*60*1000));}catch{}}notify();if(lastErrorCode==='cloud/legacy-pending'||item.backend!=='supabase'&&lastErrorCode==='resource-exhausted')continue;break;}
  }
 })().finally(()=>{active=null;const pending=read(identity()).filter(x=>x.notBefore&&x.notBefore>Date.now());if(pending.length)scheduleWake(Math.min(...pending.map(x=>x.notBefore!)));notify();});
 return active;
}
export function cloudIdentityChanged(){lastError='';lastErrorCode='';lastAcknowledgedAt=null;notify();void flushCloudOutbox();}
// Trigger retries only from the app lifecycle; no timers while this module is imported in tests.
export function startCloudOutbox():()=>void{
 const retry=()=>{void flushCloudOutbox(false);};
 const storage=(event:StorageEvent)=>{if(logicalProjectStorageKey(event.key)?.startsWith(PREFIX)){notify();retry();}};
 window.addEventListener('online',retry);window.addEventListener('focus',retry);window.addEventListener('storage',storage);
 const timer=setInterval(retry,15000);retry();
 return()=>{if(wakeTimer)clearTimeout(wakeTimer);wakeTimer=null;clearInterval(timer);window.removeEventListener('online',retry);window.removeEventListener('focus',retry);window.removeEventListener('storage',storage);};
}
