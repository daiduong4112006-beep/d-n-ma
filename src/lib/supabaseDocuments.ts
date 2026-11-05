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
export interface Row {path:string;collection_path:string;owner_email:string;data:any;revision:number;}
function matches(value:any,c:any):boolean{if(c.or)return c.or.some((x:any)=>matches(value,x));if(!c.field)return true;const v=c.field.split('.').reduce((o:any,k:string)=>o?.[k],value);if(c.op==='==')return v===c.value;if(c.op==='in')return c.value.includes(v);throw new Error('Unsupported query operator '+c.op);}
export function snapshot(row:Row|undefined,ref:Ref){return {id:ref.path.split('/').at(-1)!,ref,metadata:{fromCache:false},exists:()=>!!row,data:()=>row?.data,revision:row?.revision||0};}
export async function getDoc(ref:Ref){const {data,error}=await supabase().rpc('dun_read_documents',{p_path:ref.path,p_collection:false});if(error)throw cloudFailure(error);return snapshot(data?.[0],ref);}
export async function getDocs(ref:Ref){const rows:Row[]=[];for(let start=0;;start+=500){const {data,error}=await supabase().rpc('dun_read_documents',{p_path:ref.path,p_collection:true,p_offset:start,p_limit:500});if(error)throw cloudFailure(error);rows.push(...(data||[]));if(!data||data.length<500)break;}let selected=rows.filter(row=>(ref.constraints||[]).every(c=>matches(row.data,c)));for(const c of ref.constraints||[]){if(c.order)selected.sort((a,b)=>String(a.data[c.order]||'').localeCompare(String(b.data[c.order]||''))*(c.direction==='desc'?-1:1));if(c.limit)selected=selected.slice(0,c.limit);}const docs=selected.map(row=>snapshot(row,{kind:'doc',path:row.path}));return {docs,empty:!docs.length,size:docs.length,metadata:{fromCache:false}};}
export const getDocsFromServer=getDocs;
export async function runTransaction(_db:any,fn:(tx:{get:typeof getDoc;set:(ref:Ref,data:any,options?:{merge?:boolean})=>void;delete:(ref:Ref)=>void})=>any){for(let attempt=0;attempt<5;attempt++){const reads:any[]=[],writes:any[]=[];const value=await fn({get:async ref=>{const s=await getDoc(ref);reads.push({path:ref.path,revision:s.revision});return s;},set:(ref,data,options)=>writes.push({path:ref.path,data,merge:!!options?.merge}),delete:ref=>writes.push({path:ref.path,delete:true})});const {error}=await supabase().rpc('dun_commit_documents',{p_reads:reads,p_writes:writes});if(!error)return value;if(error.code!=='40001')throw cloudFailure(error);}throw Object.assign(new Error('Dữ liệu vừa được thay đổi trên thiết bị khác. Hãy thử lại.'),{code:'40001'});}
export const setDoc=(ref:Ref,data:any,options?:{merge?:boolean})=>runTransaction(db,async tx=>{tx.set(ref,data,options);});
export const updateDoc=(ref:Ref,data:any)=>setDoc(ref,data,{merge:true});
export const deleteDoc=(ref:Ref)=>runTransaction(db,async tx=>{tx.delete(ref);});
// One native Realtime channel per browser client. DELETE events contain only a random
// UUID primary key; refresh all current queries without exposing email-bearing paths.
const subscribers=new Set<{path:string;refresh:()=>void;fail:(error:Error)=>void}>();
let sharedChannel:any=null;
export function onSnapshot(ref:Ref,...args:any[]):()=>void{
 const callbacks=args.filter(x=>typeof x==='function'),next=callbacks[0],fail=callbacks[1]||(()=>{});
 const identity=auth.currentUser?.uid;
 let disposed=false,running=false,again=false;
 const refresh=async()=>{if(disposed)return;if(running){again=true;return;}running=true;try{const value=ref.kind==='doc'?await getDoc(ref):await getDocs(ref);if(!disposed&&auth.currentUser?.uid===identity)next(value);}catch(error){if(!disposed)fail(cloudFailure(error));}finally{running=false;if(again&&!disposed){again=false;void refresh();}}};
 const path=ref.kind==='doc'?ref.path.substring(0,ref.path.lastIndexOf('/')):ref.path;
 const entry={path,refresh:()=>{void refresh();},fail};subscribers.add(entry);
 try{
  if(!sharedChannel)sharedChannel=supabase().channel('dun-docs-'+Math.random().toString(36).slice(2)).on('postgres_changes',{event:'*',schema:'public',table:'dun_documents'},payload=>{const collection=(payload.new as any)?.collection_path;for(const s of subscribers)if(!collection||s.path===collection)s.refresh();}).subscribe(status=>{if(status==='SUBSCRIBED')for(const s of subscribers)s.refresh();else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')for(const s of subscribers)s.fail(new Error('Realtime đang mất kết nối. Dữ liệu chưa gửi vẫn giữ trên thiết bị.'));});
  void refresh();
 }catch(error){queueMicrotask(()=>{if(!disposed)fail(cloudFailure(error));});}
 const focus=()=>void refresh();if(typeof window!=='undefined'){window.addEventListener('focus',focus);window.addEventListener('online',focus);}
 return()=>{disposed=true;subscribers.delete(entry);if(typeof window!=='undefined'){window.removeEventListener('focus',focus);window.removeEventListener('online',focus);}if(!subscribers.size&&sharedChannel){void supabase().removeChannel(sharedChannel);sharedChannel=null;}};
}
