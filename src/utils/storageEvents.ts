import {logicalProjectStorageKey,projectStoragePrefix} from './projectStorage';
export const DATA_CHANGED = 'mcq_data_changed';
export function notifyDataChanged(key: string): void {
  if(typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(DATA_CHANGED,{detail:{key}}));
}
export function subscribeStorageKeys(matches:(key:string)=>boolean, callback:()=>void):()=>void {
  const stored=(event:StorageEvent)=>{const key=logicalProjectStorageKey(event.key);if(event.key===null || key!==null&&matches(key)) callback();};
  const local=(event:Event)=>{const key=(event as CustomEvent).detail?.key;if(key&&matches(key))callback();};
  window.addEventListener('storage',stored);window.addEventListener(DATA_CHANGED,local);
  return ()=>{window.removeEventListener('storage',stored);window.removeEventListener(DATA_CHANGED,local);};
}
