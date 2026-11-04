import {auth} from '../lib/firebase';
export const SUPER_ADMIN_EMAIL='daiduong4112006@gmail.com';
export const isDesignPreview=false;
export function canOpenAdmin(){return auth.currentUser?.emailVerified===true&&auth.currentUser.email?.trim().toLowerCase()===SUPER_ADMIN_EMAIL;}
