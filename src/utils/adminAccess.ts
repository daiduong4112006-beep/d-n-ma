import {auth} from '../lib/cloud';
export const SUPER_ADMIN_EMAIL='daiduong4112006@gmail.com';
export const isDesignPreview=false;
export function canOpenAdmin(){return auth.currentUser?.emailVerified===true&&auth.currentUser.email?.trim().toLowerCase()===SUPER_ADMIN_EMAIL;}

// Navigation is not authorization. Keep the owner's entry visible while Auth restores.
export function canShowAdminEntry(displayEmail?:string|null){return (auth.currentUser?.email||displayEmail||'').trim().toLowerCase()===SUPER_ADMIN_EMAIL;}
export function getAdminSessionState(){const user=auth.currentUser;if(!user)return 'signed-out';if(user.email?.trim().toLowerCase()!==SUPER_ADMIN_EMAIL)return 'wrong-account';return user.emailVerified?'ready':'unverified';}
