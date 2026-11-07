import {projectStoragePrefix} from './projectStorage';
import {accountStateKey} from './accountState';
import {SubjectCode} from './subjectProgress';
import {SubjectExamAttempt,validSubjectAttempt} from './subjectExamMatrix';
export function readSubjectExamHistory(code:SubjectCode):SubjectExamAttempt[]{
 const storage=globalThis.localStorage,prefix=projectStoragePrefix()+accountStateKey(`subject-${code}-exam-`),records=new Map<string,{value:SubjectExamAttempt;at:number}>();
 for(let i=0;i<(storage?.length||0);i++){
  const key=storage.key(i);if(!key?.startsWith(prefix))continue;
  try{const data=JSON.parse(storage.getItem(key)||'null');if(!validSubjectAttempt(data?.value,code))continue;const at=Date.parse(data.savedAt)||0;const previous=records.get(data.value.id);if(!previous||at>previous.at)records.set(data.value.id,{value:data.value,at});}catch{}
 }
 return [...records.values()].map(r=>r.value).sort((a,b)=>b.startedAt-a.startedAt);
}
