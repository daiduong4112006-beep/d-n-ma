import {projectStorage as localStorage} from './projectStorage';
import {useEffect,useState} from 'react';
import {AccountControl,effectiveJpdModules} from './adminPolicy';
import {getCurrentUserEmail} from './storage';
const controls=new Map<string,AccountControl|null>();
export function setAccountControl(email:string,value:AccountControl|null){controls.set(email.toLowerCase(),value);window.dispatchEvent(new CustomEvent('mcq-account-control'));}
export function getAccountControl(email:string){return controls.get(email.toLowerCase())||null;}
export function ownJpdModules(email=getCurrentUserEmail()){
 let legacy:string[]=[];try{legacy=JSON.parse(localStorage.getItem('mcq_jpd123_allowed_emails')||'[]');}catch{}
 return effectiveJpdModules(email,getAccountControl(email),Array.isArray(legacy)?legacy:[]);
}
export function useOwnJpdModules(){const [,refresh]=useState(0);useEffect(()=>{const update=()=>refresh(n=>n+1);window.addEventListener('mcq-account-control',update);window.addEventListener('mcq-jpd-access',update);return()=>{window.removeEventListener('mcq-account-control',update);window.removeEventListener('mcq-jpd-access',update);};},[]);return ownJpdModules();}
