import {configureProjectStorage} from '../utils/projectStorage';
import {createClient,SupabaseClient} from '@supabase/supabase-js';
configureProjectStorage(import.meta.env?.VITE_SUPABASE_URL||'');
let client:SupabaseClient|null=null;
export function isSupabaseConfigured(){return !!import.meta.env?.VITE_SUPABASE_URL&&!!import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY;}
export function supabase(){
 if(client)return client;
 const url=import.meta.env?.VITE_SUPABASE_URL,key=import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw Object.assign(new Error('Chưa cấu hình Supabase URL và publishable key.'),{code:'cloud/not-configured'});
 if(key.startsWith('sb_secret_'))throw new Error('Secret key không được đặt trong trình duyệt.');
 if(key.split('.').length===3){const claim=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(claim.role!=='anon')throw new Error('Chỉ được dùng anon/publishable key công khai.');}
 if(!url.startsWith('https://')&&!/^http:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(url))throw new Error('Supabase URL phải dùng HTTPS.');
 client=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});return client;
}
export const cloudFailure=(error:any)=>Object.assign(new Error(error?.message||'Không kết nối được Supabase.'),{code:error?.code||'cloud/unavailable'});
