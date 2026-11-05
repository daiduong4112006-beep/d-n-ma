// Browser-local outbox. A local save is not a server acknowledgement.
export interface CloudMutation {id:string;email:string;path:string;data:Record<string,any>;merge:boolean;queuedAt:number;notBefore?:number;firstQueuedAt?:number;}
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
export function getCloudSyncStatus():CloudSyncStatus{const email=identity();return {pending:email?read(email).length:0,error:lastError,lastAcknowledgedAt,errorCode:quotaUntil()>Date.now()?'resource-exhausted':lastErrorCode,retryAt:quotaUntil()};}
export function pendingCloudMutation(path:string,email=identity()){return read(email).find(item=>item.path===path);}
export function configureCloudOutbox(options:{email:()=>string;ready:()=>boolean;write:(item:CloudMutation)=>Promise<void>}){identity=options.email;canSend=options.ready;writer=options.write;}
export async function enqueueCloudMutation(email:string,path:string,data:Record<string,any>,merge=false,delayMs=0):Promise<void>{
 email=email.trim().toLowerCase();if(!email)throw new Error('Chưa có tài khoản để đồng bộ.');
 const item:CloudMutation={id:`${Date.now()}-${Math.random()}`,email,path,data:JSON.parse(JSON.stringify(data)),merge,queuedAt:Date.now()};
 const queue=read(email);const previous=queue.find(x=>x.path===path);
 // Merge-only settings patches must retain earlier pending fields.
 if(merge&&previous){item.data={...previous.data,...item.data};item.merge=previous.merge;}
 if(delayMs>0){item.firstQueuedAt=previous?.firstQueuedAt||Date.now();item.notBefore=Math.min(Date.now()+delayMs,item.firstQueuedAt+5000);}
 store(email,[...queue.filter(x=>x.path!==path),item]);
 if(delayMs>0){scheduleWake(Math.min(...read(email).filter(x=>x.notBefore).map(x=>x.notBefore!)));return;}
 await flushCloudOutbox(false);
 if(read(email).some(x=>x.id===item.id))throw new Error(lastError||'Thay đổi đã lưu trên máy, đang chờ gửi lên server.');
}
export function flushCloudOutbox(force=true):Promise<void>{
 if(active)return active;
 active=(async()=>{
  if(!writer||!canSend()||typeof navigator!=='undefined'&&!navigator.onLine)return;
  const email=identity();if(!email)return;
  if(quotaUntil()>Date.now()){notify();return;}
  const attempted=new Set<string>();
  for(;;){
   if(identity()!==email||!canSend())break;
   const item=read(email).find(x=>!attempted.has(x.id)&&(force||!x.notBefore||x.notBefore<=Date.now()));if(!item)break;attempted.add(item.id);
   try{await writer(item);lastAcknowledgedAt=Date.now();lastError='';lastErrorCode='';try{localStorage.removeItem(QUOTA_KEY);}catch{}const queue=read(email);store(email,queue.filter(x=>x.id!==item.id));}
   catch(error){lastError=String((error as any)?.message||error);lastErrorCode=String((error as any)?.code||'').replace(/^firestore\//,'');if(lastErrorCode==='resource-exhausted'){try{localStorage.setItem(QUOTA_KEY,String(Date.now()+15*60*1000));}catch{}}notify();break;}
  }
 })().finally(()=>{active=null;const pending=read(identity()).filter(x=>x.notBefore&&x.notBefore>Date.now());if(pending.length)scheduleWake(Math.min(...pending.map(x=>x.notBefore!)));notify();});
 return active;
}
export function cloudIdentityChanged(){lastError='';lastErrorCode='';lastAcknowledgedAt=null;notify();void flushCloudOutbox();}
// Trigger retries only from the app lifecycle; no timers while this module is imported in tests.
export function startCloudOutbox():()=>void{
 const retry=()=>{void flushCloudOutbox(false);};
 const storage=(event:StorageEvent)=>{if(event.key?.startsWith(PREFIX)){notify();retry();}};
 window.addEventListener('online',retry);window.addEventListener('focus',retry);window.addEventListener('storage',storage);
 const timer=setInterval(retry,15000);retry();
 return()=>{if(wakeTimer)clearTimeout(wakeTimer);wakeTimer=null;clearInterval(timer);window.removeEventListener('online',retry);window.removeEventListener('focus',retry);window.removeEventListener('storage',storage);};
}
