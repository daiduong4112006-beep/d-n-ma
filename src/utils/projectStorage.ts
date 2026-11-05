// Keep each Supabase project separate from Firebase and other project caches.
// The old browser keys are retained; a fresh project never imports them implicitly.
let prefix='';
export function configureProjectStorage(url:string){if(!url){prefix='';return;}const host=new URL(url).hostname;prefix='dun-project:'+host+':';}
export function projectStoragePrefix(){return prefix;}
export function logicalProjectStorageKey(key:string|null){if(key===null)return null;if(!prefix)return key;return key.startsWith(prefix)?key.slice(prefix.length):null;}
function native(){return globalThis.localStorage;}
function keys(){const storage=native();const out:string[]=[];for(let i=0;i<(storage?.length||0);i++){const key=storage.key(i);if(key!==null&&(!prefix||key.startsWith(prefix)))out.push(key);}return out;}
export const projectStorage:Storage={
 get length(){return keys().length;},key(index:number){const key=keys()[index];return key===undefined?null:key.slice(prefix.length);},
 getItem(key:string){return native()?.getItem(prefix+key)??null;},
 setItem(key:string,value:string){const storage=native();if(!storage)throw new Error('Bộ nhớ trình duyệt không sẵn sàng.');storage.setItem(prefix+key,value);},
 removeItem(key:string){native()?.removeItem(prefix+key);},
 clear(){for(const key of keys())native().removeItem(key);}
};
