import {auth} from './supabaseAuth';
import {supabase,cloudFailure} from './supabaseClient';
export const db={provider:'supabase'};
export interface Ref {kind:'doc'|'collection';path:string;constraints?:any[];}
export function collection(_db:any,...parts:string[]):Ref{return {kind:'collection',path:parts.join('/')};}
export function doc(base:any,...parts:string[]):Ref{const path=base?.kind==='collection'?[base.path,...(parts.length?parts:[crypto.randomUUID()])].join('/'):parts.join('/');return {kind:'doc',path};}
export const where=(field:string,op:string,value:any)=>({field,op,value});
export const orderBy=(field:string,direction='asc')=>({order:field,direction});
export const limit=(n:number)=>({limit:n});
export const or=(...filters:any[])=>({or:filters});
export const query=(ref:Ref,...constraints:any[]):Ref=>({...ref,constraints});
export const deleteField=()=>({__dm_delete:true});
export const increment=(n:number)=>({__dm_increment:n});
export interface Row {id:string;path:string;collection_path:string;owner_email:string;data:any;revision:number;}
function matches(value:any,c:any):boolean{if(c.or)return c.or.some((x:any)=>matches(value,x));if(!c.field)return true;const v=c.field.split('.').reduce((o:any,k:string)=>o?.[k],value);if(c.op==='==')return v===c.value;if(c.op==='in')return c.value.includes(v);throw new Error('Unsupported query operator '+c.op);}
export function snapshot(row:Row|undefined,ref:Ref){return {id:ref.path.split('/').at(-1)!,rowId:row?.id,ref,metadata:{fromCache:false},exists:()=>!!row,data:()=>row?.data,revision:row?.revision||0};}
export async function getDoc(ref:Ref){const {data,error}=await supabase().rpc('dun_read_documents',{p_path:ref.path,p_collection:false});if(error)throw cloudFailure(error);return snapshot(data?.[0],ref);}
export async function getDocs(ref:Ref){const rows:Row[]=[];for(let start=0;;start+=500){const {data,error}=await supabase().rpc('dun_read_documents',{p_path:ref.path,p_collection:true,p_offset:start,p_limit:500});if(error)throw cloudFailure(error);rows.push(...(data||[]));if(!data||data.length<500)break;}let selected=rows.filter(row=>(ref.constraints||[]).every(c=>matches(row.data,c)));for(const c of ref.constraints||[]){if(c.order)selected.sort((a,b)=>String(a.data[c.order]||'').localeCompare(String(b.data[c.order]||''))*(c.direction==='desc'?-1:1));if(c.limit)selected=selected.slice(0,c.limit);}const docs=selected.map(row=>snapshot(row,{kind:'doc',path:row.path}));return {docs,empty:!docs.length,size:docs.length,metadata:{fromCache:false}};}
export const getDocsFromServer=getDocs;
export async function runTransaction(_db:any,fn:(tx:{get:typeof getDoc;set:(ref:Ref,data:any,options?:{merge?:boolean})=>void;delete:(ref:Ref)=>void})=>any){for(let attempt=0;attempt<5;attempt++){const reads:any[]=[],writes:any[]=[];const value=await fn({get:async ref=>{const s=await getDoc(ref);reads.push({path:ref.path,revision:s.revision});return s;},set:(ref,data,options)=>writes.push({path:ref.path,data,merge:!!options?.merge}),delete:ref=>writes.push({path:ref.path,delete:true})});const {error}=await supabase().rpc('dun_commit_documents',{p_reads:reads,p_writes:writes});if(!error)return value;if(error.code!=='40001')throw cloudFailure(error);}throw Object.assign(new Error('Dữ liệu vừa được thay đổi trên thiết bị khác. Hãy thử lại.'),{code:'40001'});}
export const setDoc=(ref:Ref,data:any,options?:{merge?:boolean})=>runTransaction(db,async tx=>{tx.set(ref,data,options);});
export const updateDoc=(ref:Ref,data:any)=>setDoc(ref,data,{merge:true});
export const deleteDoc=(ref:Ref)=>runTransaction(db,async tx=>{tx.delete(ref);});
type DocumentChange={eventType:'INSERT'|'UPDATE'|'DELETE';new:Partial<Row>;old:Partial<Row>};
const subscribers=new Set<{
 refresh:()=>void;
 changed:(payload:DocumentChange)=>void;
 fail:(error:Error)=>void;
}>();
let sharedChannel:ReturnType<ReturnType<typeof supabase>['channel']>|null=null;
const refreshDelayMs=75;

export function onSnapshot(ref:Ref,...args:any[]):()=>void{
 const callbacks=args.filter(x=>typeof x==='function'),next=callbacks[0],fail=callbacks[1]||(()=>{});
 const identity=auth.currentUser?.uid;
 let disposed=false,running=false,again=false;
 let timer:ReturnType<typeof setTimeout>|undefined;
 let visibleRowIds:Set<string>|undefined;
 const isCurrent=()=>!disposed&&auth.currentUser?.uid===identity;
 const reportFailure=(error:Error)=>{if(isCurrent())fail(error);};
 const refresh=()=>{
  if(!isCurrent())return;
  if(running){again=true;return;}
  if(timer!==undefined)return;
  timer=setTimeout(()=>{timer=undefined;void read();},refreshDelayMs);
 };
 const read=async()=>{
  if(!isCurrent())return;
  running=true;
  try{
   const value=ref.kind==='doc'?await getDoc(ref):await getDocs(ref);
   if(!isCurrent())return;
   const documents='docs' in value?value.docs:[value];
   visibleRowIds=new Set(documents.flatMap(document=>document.rowId?[document.rowId]:[]));
   next(value);
  }catch(error){
   reportFailure(cloudFailure(error));
  }finally{
   running=false;
   if(again){again=false;refresh();}
  }
 };
 const entry={
  refresh,
  changed:(payload:DocumentChange)=>{
   if(payload.eventType==='DELETE'){
    // Realtime only sends the UUID on deletes. Use the last visible result, or
    // reconcile conservatively if a read may still return the deleted row.
    const id=payload.old?.id;
    if(!id||running||!visibleRowIds||visibleRowIds.has(id))refresh();
    return;
   }
   const row=payload.new;
   const key=ref.kind==='doc'?row.path:row.collection_path;
   if(!key||key===ref.path)refresh();
  },
  fail:reportFailure,
 };
 subscribers.add(entry);
 try{
  if(!sharedChannel){
   const channel=supabase().channel('dun-docs-'+Math.random().toString(36).slice(2))
    .on('postgres_changes',{event:'*',schema:'public',table:'dun_documents'},payload=>{
     if(sharedChannel===channel)for(const s of subscribers)s.changed(payload);
    });
   sharedChannel=channel;
   try{
    channel.subscribe(status=>{
     if(sharedChannel!==channel)return;
     if(status==='SUBSCRIBED')for(const s of subscribers)s.refresh();
     else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')for(const s of subscribers)s.fail(new Error('Realtime đang mất kết nối. Dữ liệu chưa gửi vẫn giữ trên thiết bị.'));
    });
   }catch(error){
    sharedChannel=null;
    void supabase().removeChannel(channel);
    throw error;
   }
  }
 }catch(error){queueMicrotask(()=>reportFailure(cloudFailure(error)));}
 refresh();
 if(typeof window!=='undefined'){
  window.addEventListener('focus',refresh);
  window.addEventListener('online',refresh);
 }
 return()=>{
  disposed=true;
  clearTimeout(timer);
  subscribers.delete(entry);
  if(typeof window!=='undefined'){
   window.removeEventListener('focus',refresh);
   window.removeEventListener('online',refresh);
  }
  if(!subscribers.size&&sharedChannel){
   const channel=sharedChannel;
   sharedChannel=null;
   void supabase().removeChannel(channel);
  }
 };
}
