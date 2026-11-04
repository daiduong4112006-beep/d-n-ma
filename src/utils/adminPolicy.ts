import {ALL_JPD_MODULES,normalizeJpdModules,JpdModuleId} from './jpdModules';
export const ADMIN_EMAIL='daiduong4112006@gmail.com';
export type AccountControl={disabled?:boolean;jpdModules?:JpdModuleId[];updatedAt?:string};
export function normalizeEmail(email:string){return email.trim().toLowerCase();}
export function validateControlChange(email:string,patch:AccountControl){
 const target=normalizeEmail(email);if(!/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(target))throw new Error('Email không hợp lệ.');
 if(target===ADMIN_EMAIL)throw new Error('Không thể thay đổi quyền của chủ hệ thống.');
 const keys=Object.keys(patch);if(!keys.length||keys.some(k=>!['disabled','jpdModules'].includes(k)))throw new Error('Thay đổi không được hỗ trợ.');
 const clean:AccountControl={};
 if('disabled' in patch){if(typeof patch.disabled!=='boolean')throw new Error('Trạng thái không hợp lệ.');clean.disabled=patch.disabled;}
 if('jpdModules' in patch){if(!Array.isArray(patch.jpdModules)||patch.jpdModules.some(m=>!ALL_JPD_MODULES.includes(m)))throw new Error('Mục JPD123 không hợp lệ.');clean.jpdModules=normalizeJpdModules(patch.jpdModules);}
 return {email:target,patch:clean};
}
export function effectiveJpdModules(email:string,control:AccountControl|null,legacyEmails:string[]=[]):JpdModuleId[]{
 if(normalizeEmail(email)===ADMIN_EMAIL)return [...ALL_JPD_MODULES];
 if(control?.disabled)return [];
 if(Array.isArray(control?.jpdModules))return normalizeJpdModules(control.jpdModules);
 return legacyEmails.map(normalizeEmail).includes(normalizeEmail(email))?[...ALL_JPD_MODULES]:[];
}
