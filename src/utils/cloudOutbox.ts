// Browser-local outbox. A local save is not a server acknowledgement.
export interface CloudMutation {id:string;email:string;path:string;data:Record<string,any>;merge:boolean;queuedAt:number;}
export interface CloudSyncStatus {pending:number;error:string;lastAcknowledgedAt:number|null;}
const PREFIX='mcq_cloud_outbox_v1_';
const memory=new Map<string,CloudMutation[]>();
let writer:((item:CloudMutation)=>Promise<void>)|null=null;
let identity=()=>'';
let canSend=()=>false;
let active:Promise<void>|null=null;
let lastAcknowledgedAt:number|null=null;
let lastError='';
function read(email:string):CloudMutation[]{try{const raw=localStorage.getItem(PREFIX+email);if(raw)return JSON.parse(raw);}catch{}return memory.get(email)||[];}
function store(email:string,items:CloudMutation[]){memory.set(email,items);try{if(items.length)localStorage.setItem(PREFIX+email,JSON.stringify(items));else localStorage.removeItem(PREFIX+email);}catch{lastError='Không đủ bộ nhớ để lưu hàng đợi đồng bộ. Giữ tab này mở và kiểm tra kết nối.';}notify();}
function notify(){if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('mcq-cloud-sync-status'));}
export function getCloudSyncStatus():CloudSyncStatus{const email=identity();return {pending:email?read(email).length:0,error:lastError,lastAcknowledgedAt};}
export function pendingCloudMutation(path:string,email=identity()){return read(email).find(item=>item.path===path);}
export function configureCloudOutbox(options:{email:()=>string;ready:()=>boolean;write:(item:CloudMutation)=>Promise<void>}){identity=options.email;canSend=options.ready;writer=options.write;}
export async function enqueueCloudMutation(email:string,path:string,data:Record<string,any>,merge=false):Promise<void>{
 email=email.trim().toLowerCase();if(!email)throw new Error('Chưa có tài khoản để đồng bộ.');
 const item:CloudMutation={id:`${Date.now()}-${Math.random()}`,email,path,data:JSON.parse(JSON.stringify(data)),merge,queuedAt:Date.now()};
 const queue=read(email);const previous=queue.find(x=>x.path===path);
 // Merge-only settings patches must retain earlier pending fields.
 if(merge&&previous){item.data={...previous.data,...item.data};item.merge=previous.merge;}
 store(email,[...queue.filter(x=>x.path!==path),item]);
 await flushCloudOutbox();
 if(read(email).some(x=>x.id===item.id))throw new Error(lastError||'Thay đổi đã lưu trên máy, đang chờ gửi lên server.');
}
export function flushCloudOutbox():Promise<void>{
 if(active)return active;
 active=(async()=>{
  if(!writer||!canSend()||typeof navigator!=='undefined'&&!navigator.onLine)return;
  const email=identity();if(!email)return;
  const attempted=new Set<string>();
  for(;;){
   if(identity()!==email||!canSend())break;
   const item=read(email).find(x=>!attempted.has(x.id));if(!item)break;attempted.add(item.id);
   try{await writer(item);lastAcknowledgedAt=Date.now();lastError='';const queue=read(email);store(email,queue.filter(x=>x.id!==item.id));}
   catch(error){lastError=String((error as any)?.message||error);notify();break;}
  }
 })().finally(()=>{active=null;notify();});
 return active;
}
export function cloudIdentityChanged(){lastError='';lastAcknowledgedAt=null;notify();void flushCloudOutbox();}
// Trigger retries only from the app lifecycle; no timers while this module is imported in tests.
export function startCloudOutbox():()=>void{
 const retry=()=>{void flushCloudOutbox();};
 const storage=(event:StorageEvent)=>{if(event.key?.startsWith(PREFIX)){notify();retry();}};
 window.addEventListener('online',retry);window.addEventListener('focus',retry);window.addEventListener('storage',storage);
 const timer=setInterval(retry,15000);retry();
 return()=>{clearInterval(timer);window.removeEventListener('online',retry);window.removeEventListener('focus',retry);window.removeEventListener('storage',storage);};
}
