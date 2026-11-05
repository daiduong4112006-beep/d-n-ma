import {syncStudyProgressToFirestore} from '../lib/firebase';
import {getCurrentUserEmail} from './storage';
const PREFIX='mcq_account_state_v1_';
const identity=()=>getCurrentUserEmail()||'guest';
export const accountStateKey=(key:string,email=identity())=>`${PREFIX}${encodeURIComponent(email)}_${key}`;
export function readAccountState<T>(key:string,fallback:T,legacyKey?:string):T{
 try{const raw=localStorage.getItem(accountStateKey(key));if(raw)return JSON.parse(raw).value as T;
  if(legacyKey){const claimKey=PREFIX+'legacy-owner_'+legacyKey;const owner=localStorage.getItem(claimKey);const legacy=localStorage.getItem(legacyKey);
   if(legacy&&(!owner||owner===identity())){localStorage.setItem(claimKey,identity());const value=JSON.parse(legacy);localStorage.setItem(accountStateKey(key),JSON.stringify({value,savedAt:'2000-01-01T00:00:00Z'}));return value;}
  }
 }catch{}return fallback;
}
function notify(key:string){window.dispatchEvent(new CustomEvent('mcq-account-state',{detail:{key,email:identity()}}));}
export function saveAccountLocalState<T>(key:string,value:T){const data={value,savedAt:new Date().toISOString()};localStorage.setItem(accountStateKey(key),JSON.stringify(data));notify(key);return data;}
export function saveAccountState<T>(key:string,value:T){const data=saveAccountLocalState(key,value);const email=getCurrentUserEmail();if(email)void syncStudyProgressToFirestore(email,'account:'+key,data).catch(()=>{});}
export function applyAccountStateFromCloud(key:string,data:any){
 if(!data||!('value' in data))return;
 try{const raw=localStorage.getItem(accountStateKey(key));const local=raw?JSON.parse(raw):null;if(local&&Date.parse(local.savedAt)>=Date.parse(data.savedAt))return;localStorage.setItem(accountStateKey(key),JSON.stringify(data));notify(key);}catch{}
}
export function subscribeAccountState(key:string,callback:()=>void){const custom=(e:Event)=>{const d=(e as CustomEvent).detail;if(d?.key===key&&d.email===identity())callback();};const storage=(e:StorageEvent)=>{if(e.key===accountStateKey(key))callback();};window.addEventListener('mcq-account-state',custom);window.addEventListener('storage',storage);return()=>{window.removeEventListener('mcq-account-state',custom);window.removeEventListener('storage',storage);};}
