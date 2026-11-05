import {useEffect} from 'react';
import {startCloudOutbox} from '../utils/cloudOutbox';

// Keep delivery/recovery running silently. Detailed status lives in Settings.
export function CloudSyncStatus(_props:{email?:string}){
 useEffect(()=>startCloudOutbox(),[]);
 return null;
}
