const tails = new Map<string,Promise<unknown>>();
// Async image uploads must not allow an earlier save to overtake a later save/delete.
export function orderedWrite<T>(key:string,write:()=>Promise<T>):Promise<T> {
  const result=(tails.get(key)||Promise.resolve()).catch(()=>{}).then(write);
  tails.set(key,result);
  result.finally(()=>{if(tails.get(key)===result)tails.delete(key);}).catch(()=>{});
  return result;
}
export async function flushOrderedWrites():Promise<void> {await Promise.allSettled([...tails.values()]);}
