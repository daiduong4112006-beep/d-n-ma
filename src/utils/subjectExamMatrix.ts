import {SubjectCode,subjectInfo} from './subjectProgress';
export const subjectMatrices={
 MAS291:[{chapter:'1',count:2,weights:{1:13,2:4,3:13}},{chapter:'2',count:8,weights:{1:13,2:6,3:11,4:12,5:5}},{chapter:'3',count:10,weights:{0:9,1:12,2:10,3:10,4:9,5:10,6:12}},{chapter:'4',count:8,weights:{1:12,2:12,3:12,4:12,5:12}},{chapter:'6',count:5,weights:{1:12,2:6,3:12,4:10}},{chapter:'7',count:3,weights:{1:11,2:5,3:4}},{chapter:'8',count:3,weights:{1:9,2:12,3:4,4:10,5:0}},{chapter:'9',count:4,weights:{1:11,2:6,3:8,4:12,5:0,6:2}},{chapter:'10',count:3,weights:{1:10,2:10,3:12}},{chapter:'11',count:4,weights:{1:9,2:3,3:8,4:12}}],
 MAI391:[{chapter:'3',count:7,weights:{1:10,2:9,3:10,4:9,5:10,6:9,7:10,8:1}},{chapter:'4',count:8,weights:{1:7,2:8,3:6,4:8,5:7,6:9,7:10,8:9}},{chapter:'5',count:11,weights:{1:10,2:8,3:7,4:10,5:9,6:10,7:10}},{chapter:'6',count:8,weights:{1:10,2:10,3:9,4:5,5:8,6:9}},{chapter:'7',count:6,weights:{1:5,2:6,3:2,4:9,5:9}}]
};
export const subjectMatrixNote=(code:SubjectCode)=>code==='MAI391'?'Tài liệu cho số câu xấp xỉ cộng thành 39. Bản thi thử dùng 7–8–11–8–6 để đủ 40 câu; không lấy Chương 9, 10, 12.':'Đề 50 câu theo phân bổ 10 chương trong tài liệu.';
export type ExamQuestion=ReturnType<typeof subjectInfo>['examQuestions'][number];
export function maxSubjectExamQuestions(code:SubjectCode){return subjectInfo(code).examQuestions.filter(q=>q.verified&&subjectMatrices[code].some(row=>row.chapter===q.chapter&&(row.weights as Record<number,number>)[q.group]>0)).length;}
export function planSubjectExam(code:SubjectCode,count=code==='MAI391'?40:50){
 if(!Number.isInteger(count)||count<1||count>maxSubjectExamQuestions(code))throw new Error('Số câu vượt giới hạn ngân hàng đề.');
 const total=subjectMatrices[code].reduce((n,r)=>n+r.count,0);
 const rows=subjectMatrices[code].map(row=>{const exact=row.count*count/total;const capacity=subjectInfo(code).examQuestions.filter(q=>q.verified&&q.chapter===row.chapter&&(row.weights as Record<number,number>)[q.group]>0).length;return {...row,count:Math.min(Math.floor(exact),capacity),capacity,fraction:exact-Math.floor(exact)};});
 let remaining=count-rows.reduce((n,r)=>n+r.count,0);
 const ordered=[...rows].sort((a,b)=>b.fraction-a.fraction);
 while(remaining){let changed=false;for(const row of ordered){if(remaining&&row.count<row.capacity){row.count++;remaining--;changed=true;}}if(!changed)throw new Error('Ngân hàng chưa đủ câu.');}
 return rows;
}
function shuffle<T>(list:T[],random:()=>number){const result=[...list];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
export function buildSubjectExam(code:SubjectCode,random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296,count=code==='MAI391'?40:50){
 const bank=subjectInfo(code).examQuestions,selected:ExamQuestion[]=[];
 for(const row of planSubjectExam(code,count)){
  const groups=Object.entries(row.weights as Record<string,number>).filter(([,weight])=>weight!>0).map(([group,weight])=>({group:Number(group),weight:weight!,questions:shuffle(bank.filter(q=>q.verified&&q.chapter===row.chapter&&q.group===Number(group)),random),quota:0,fraction:0}));
  const available=groups.reduce((sum,g)=>sum+g.questions.length,0);if(available<row.count)throw new Error(`Chương ${row.chapter} chưa đủ câu có đáp án xác định (${available}/${row.count}).`);
  const totalWeight=groups.reduce((sum,g)=>sum+g.weight,0);
  for(const g of groups){const exact=row.count*g.weight/totalWeight;g.quota=Math.min(Math.floor(exact),g.questions.length);g.fraction=exact-Math.floor(exact);}
  let left=row.count-groups.reduce((sum,g)=>sum+g.quota,0);
  const order=shuffle(groups,random).sort((a,b)=>b.fraction-a.fraction);
  while(left){let assigned=false;for(const g of order){if(!left)break;if(g.quota<g.questions.length){g.quota++;left--;assigned=true;}}if(!assigned)throw new Error('Không đủ câu cho ma trận.');}
  selected.push(...groups.sort((a,b)=>a.group-b.group).flatMap(g=>g.questions.slice(0,g.quota)));
 }
 if(new Set(selected.map(q=>q.id)).size!==selected.length)throw new Error('Ngân hàng có mã câu bị trùng.');
 return selected;
}
export interface SubjectExamAttempt{id:string;code:SubjectCode;questionIds:string[];questionCount?:number;answers:Record<string,string>;currentIndex:number;startedAt:number;deadline:number;submittedAt?:number;correct?:number;}
export function gradeSubjectExam(attempt:SubjectExamAttempt){const bank=new Map(subjectInfo(attempt.code).examQuestions.map(q=>[q.id,q]));return attempt.questionIds.filter(id=>bank.get(id)?.answer===attempt.answers[id]).length;}
export function validSubjectAttempt(value:any,code:SubjectCode):value is SubjectExamAttempt{
 const bank=new Map(subjectInfo(code).examQuestions.map(q=>[q.id,q]));let rows;try{rows=planSubjectExam(code,value?.questionCount??(code==='MAI391'?40:50));}catch{return false;}
 return !!value&&value.code===code&&typeof value.id==='string'&&Number.isFinite(value.startedAt)&&Number.isFinite(value.deadline)&&value.deadline>value.startedAt&&Number.isInteger(value.currentIndex)&&value.currentIndex>=0&&value.currentIndex<value.questionIds?.length&&Array.isArray(value.questionIds)&&new Set(value.questionIds).size===value.questionIds.length&&value.questionIds.length===rows.reduce((n,r)=>n+r.count,0)&&value.questionIds.every((id:string)=>bank.get(id)?.verified)&&rows.every(r=>value.questionIds.filter((id:string)=>bank.get(id)?.chapter===r.chapter).length===r.count)&&value.answers&&typeof value.answers==='object'&&!Array.isArray(value.answers)&&Object.entries(value.answers).every(([id,pick])=>value.questionIds.includes(id)&&typeof pick==='string'&&/^(?:[A-E]|i{1,3}|iv|v|vi)$/.test(pick));
}
