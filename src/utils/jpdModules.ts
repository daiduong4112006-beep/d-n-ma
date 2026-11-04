export const JPD_MODULES = [
  {id:'vocabulary',label:'Từ vựng',description:'Bài học, thẻ nhớ và luyện gõ từ vựng.',symbol:'Aa'},
  {id:'kanji',label:'Chữ Hán',description:'Kanji, cách đọc và từ ghép.',symbol:'漢'},
  {id:'grammar',label:'Ngữ pháp',description:'Mẫu câu và luyện tập ngữ pháp.',symbol:'文'},
  {id:'speaking',label:'Ôn SPK',description:'Câu hỏi, bộ tranh và luyện nói.',symbol:'話'},
  {id:'exam-bank',label:'Source FE',description:'Ngân hàng đề và thi thử cuối kỳ.',symbol:'試'},
] as const;
export type JpdModuleId = typeof JPD_MODULES[number]['id'];
export const ALL_JPD_MODULES: JpdModuleId[] = JPD_MODULES.map(m=>m.id);
export function normalizeJpdModules(value: unknown): JpdModuleId[] {
  if(!Array.isArray(value))return [];
  return ALL_JPD_MODULES.filter(id=>value.includes(id));
}
export function getJpdModules(user:{role?:string;jpd123:boolean;jpdModules?:JpdModuleId[]}):JpdModuleId[]{
  if(user.role==='super_admin')return [...ALL_JPD_MODULES];
  return Array.isArray(user.jpdModules)?normalizeJpdModules(user.jpdModules):user.jpd123?[...ALL_JPD_MODULES]:[];
}
export function jpdModuleSummary(user:{role?:string;jpd123:boolean;jpdModules?:JpdModuleId[]}){
  const modules=getJpdModules(user);
  return modules.length===5?'Toàn bộ 5 mục':modules.length?`${modules.length}/5 mục`:'Chưa cấp';
}
