import React,{useEffect,useState} from 'react';
import {Cloud,CloudOff,RefreshCw} from 'lucide-react';
import {auth,onAuthStateChanged} from '../lib/cloud';
import {getCloudSyncStatus,flushCloudOutbox,startCloudOutbox} from '../utils/cloudOutbox';
export function CloudSyncStatus({email}:{email?:string}){
 const [,refresh]=useState(0);const state=getCloudSyncStatus();
 useEffect(()=>{const update=()=>refresh(n=>n+1);const stop=startCloudOutbox();const unAuth=onAuthStateChanged(auth,update);window.addEventListener('mcq-cloud-sync-status',update);return()=>{stop();unAuth();window.removeEventListener('mcq-cloud-sync-status',update);};},[]);
 if(!email)return null;
 const verified=auth.currentUser?.emailVerified&&auth.currentUser.email?.toLowerCase()===email.toLowerCase();
 const legacy=state.errorCode==='cloud/legacy-pending';
 const quota=state.errorCode==='resource-exhausted'&&state.pending>0;
 const message=!verified?'Chỉ lưu trên thiết bị: hãy đăng nhập Supabase và xác minh email để đồng bộ.':legacy?'Có thay đổi từ bản Firebase cũ. Mở Chuyển dữ liệu để gửi sang Supabase.':quota?'Nền tảng cũ đã hết hạn mức ghi. Thay đổi vẫn lưu trên máy; đồng bộ tiếp khi hạn mức được khôi phục.':state.error?'Chưa gửi thành công lên server. Thay đổi đang được giữ trên máy để gửi lại.':state.pending?`Đang chờ đồng bộ ${state.pending} thay đổi lên server…`:null;
 if(!message)return null;
 return <div role="status" className="flex items-center flex-wrap gap-2 px-4 py-2 text-xs border-b border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200">{verified&&!state.error?<Cloud size={15}/>:<CloudOff size={15}/>}<span className="flex-1">{message}</span>{verified&&legacy&&<a className="underline" href="#sync-migration">Chuyển dữ liệu cũ</a>}{verified&&!legacy&&(state.pending>0||state.error)&&<button className="inline-flex items-center gap-1 underline" disabled={quota&&state.retryAt>Date.now()} title={quota?'Tạm nghỉ gửi để tránh lặp lỗi quota. Tự kiểm tra lại sau.':undefined} onClick={()=>void flushCloudOutbox()}><RefreshCw size={13}/>{quota&&state.retryAt>Date.now()?'Chờ hạn mức':'Thử gửi lại'}</button>}</div>;
}
