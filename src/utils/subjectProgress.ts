import manifest from '../data/studySubjects.json';
import {readAccountState,saveAccountState,accountStateKey} from './accountState';
import {logicalProjectStorageKey} from './projectStorage';
export type SubjectCode='MAI391'|'MAS291';
export interface SubjectAnswer {done:'ok'|'bad'|'rev'|true|null;pick:string|null}
export const studySubjects=manifest.subjects;
export const subjectInfo=(code:SubjectCode)=>studySubjects.find(s=>s.code===code)!;
const ids=new Map(studySubjects.map(s=>[s.code,new Set(s.questionIds)]));
export const subjectQuestionKey=(code:SubjectCode,id:string)=>`subject-${code}-question-${id}`;
export const subjectNavigationKey=(code:SubjectCode)=>`subject-${code}-navigation`;
export function cleanSubjectAnswer(value:any):SubjectAnswer|null{
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 if(![null,true,'ok','bad','rev'].includes(value.done)||!(value.pick===null||typeof value.pick==='string'&&/^(?:[A-E]|i{1,3}|iv|v|vi)$/.test(value.pick)))return null;
 return {done:value.done,pick:value.pick};
}
export function readSubjectQuestions(code:SubjectCode){const result:Record<string,SubjectAnswer>={};for(const id of subjectInfo(code).questionIds){const value=cleanSubjectAnswer(readAccountState(subjectQuestionKey(code,id),null));if(value)result[id]=value;}return result;}
export function saveSubjectQuestion(code:SubjectCode,id:string,value:any){const clean=cleanSubjectAnswer(value);if(!ids.get(code)?.has(id)||!clean)return false;saveAccountState(subjectQuestionKey(code,id),clean);return true;}
export function validSubjectChapter(code:SubjectCode,chapter:unknown):chapter is string{return typeof chapter==='string'&&(chapter==='notes'||subjectInfo(code).chapters.some(c=>c.num===chapter));}
export function readSubjectChapter(code:SubjectCode){const saved=readAccountState(subjectNavigationKey(code),'');return validSubjectChapter(code,saved)?saved:subjectInfo(code).chapters[0].num;}
export function saveSubjectChapter(code:SubjectCode,chapter:unknown){if(!validSubjectChapter(code,chapter))return false;saveAccountState(subjectNavigationKey(code),chapter);return true;}
export function subscribeSubjectProgress(code:SubjectCode,callback:()=>void){
 const prefix=`subject-${code}-`;
 const changed=(event:Event)=>{if((event as CustomEvent).detail?.key?.startsWith(prefix))callback();};
 const storage=(event:StorageEvent)=>{const key=logicalProjectStorageKey(event.key);if(key?.startsWith(accountStateKey(prefix)))callback();};
 window.addEventListener('mcq-account-state',changed);window.addEventListener('storage',storage);
 return()=>{window.removeEventListener('mcq-account-state',changed);window.removeEventListener('storage',storage);};
}
