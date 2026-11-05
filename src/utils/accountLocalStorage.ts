import {logicalProjectStorageKey} from './projectStorage';
import {projectStorage as localStorage} from './projectStorage';
// These older keys were shared by every login on the same browser.
const scoped=(key:string)=>['jp_progress_','flashcard_progress_','mcq_learning_progress_','mcq_starred_questions_'].some(p=>key.startsWith(p))||['mcq_starred_vocabulary_v1','mcq_practice_mistakes_progress','mcq_deleted_quiz_ids'].includes(key);
export function localAccountEmail(){try{return String(JSON.parse(localStorage.getItem('mcq_user')||'{}').email||'').trim().toLowerCase();}catch{return '';}}
export function accountLocalKey(key:string){const email=localAccountEmail();return scoped(key)&&email?`${key}__account__${encodeURIComponent(email)}`:key;}
export const isAccountLocalKey=(actual:string,logical:string)=>actual===accountLocalKey(logical)||logicalProjectStorageKey(actual)===accountLocalKey(logical);
export const accountLocalStorage={
 getItem(key:string){const target=accountLocalKey(key);let value=localStorage.getItem(target);if(value!==null||target===key)return value;
  const claim=`mcq_legacy_key_owner_${key}`;const owner=localStorage.getItem(claim);value=localStorage.getItem(key);
  if(value!==null&&(!owner||owner===localAccountEmail())){localStorage.setItem(claim,localAccountEmail());localStorage.setItem(target,value);return value;}return null;
 },
 setItem(key:string,value:string){localStorage.setItem(accountLocalKey(key),value);},
 removeItem(key:string){localStorage.removeItem(accountLocalKey(key));}
};
