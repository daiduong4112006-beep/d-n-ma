import { useEffect, useState } from 'react';
import { getCurrentUserEmail } from './storage';
export interface ExperiencePreferences{reading:'standard'|'large';density:'comfortable'|'compact';reduceMotion:boolean;showGrid:boolean;focusMode:boolean;shuffleQuestions:boolean;shuffleOptions:boolean;examMinutes:number;}
export const DEFAULT_PREFERENCES:ExperiencePreferences={reading:'standard',density:'comfortable',reduceMotion:false,showGrid:true,focusMode:false,shuffleQuestions:false,shuffleOptions:false,examMinutes:45};
const key=()=>`dm_experience_preferences_v1_${getCurrentUserEmail()||'guest'}`;
export function readPreferences():ExperiencePreferences{try{const p=JSON.parse(localStorage.getItem(key())||'{}');return {reading:p.reading==='large'?'large':'standard',density:p.density==='compact'?'compact':'comfortable',reduceMotion:p.reduceMotion===true,showGrid:p.showGrid!==false,focusMode:p.focusMode===true,shuffleQuestions:p.shuffleQuestions===true,shuffleOptions:p.shuffleOptions===true,examMinutes:[15,30,45,60,90].includes(p.examMinutes)?p.examMinutes:45};}catch{return {...DEFAULT_PREFERENCES};}}
export function savePreferences(value:ExperiencePreferences){localStorage.setItem(key(),JSON.stringify(value));window.dispatchEvent(new CustomEvent('dm-preferences-updated'));}
export function createPreferenceBackup(value:ExperiencePreferences){return {kind:'dun-master-preferences',version:1,preferences:value};}
export function parsePreferenceBackup(raw:unknown):ExperiencePreferences{
 const data=raw as {kind?:string;version?:number;preferences?:ExperiencePreferences};
 const p=data?.preferences;
 if(data?.kind!=='dun-master-preferences'||data?.version!==1||!p)throw new Error('Chọn tệp tùy chọn DUN MASTER phiên bản 1.');
 if(!['standard','large'].includes(p.reading)||!['comfortable','compact'].includes(p.density)||![15,30,45,60,90].includes(p.examMinutes)||['reduceMotion','showGrid','focusMode','shuffleQuestions','shuffleOptions'].some(k=>typeof p[k as keyof ExperiencePreferences]!=='boolean'))throw new Error('Tệp chứa tùy chọn không hợp lệ.');
 return Object.fromEntries(Object.keys(DEFAULT_PREFERENCES).map(k=>[k,p[k as keyof ExperiencePreferences]])) as unknown as ExperiencePreferences;
}
export function useExperiencePreferences(identity?:string){const [preferences,setPreferences]=useState(readPreferences);useEffect(()=>{const update=()=>setPreferences(readPreferences());window.addEventListener('dm-preferences-updated',update);window.addEventListener('storage',update);window.addEventListener('mcq-account-control',update);return()=>{window.removeEventListener('dm-preferences-updated',update);window.removeEventListener('storage',update);window.removeEventListener('mcq-account-control',update);};},[]);useEffect(()=>setPreferences(readPreferences()),[identity]);return preferences;}
