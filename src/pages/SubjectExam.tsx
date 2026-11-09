import React,{useEffect,useState} from 'react';
import {ArrowLeft,Clock,CheckCircle,Shuffle} from 'lucide-react';
import {SubjectCode,subjectInfo,subscribeSubjectProgress} from '../utils/subjectProgress';
import {buildSubjectExam,gradeSubjectExam,planSubjectExam,maxSubjectExamQuestions,subjectMatrixNote,
 SubjectExamAttempt,validSubjectAttempt,SubjectProTestId,subjectProTests,PRO_TEST_QUESTION_COUNT,PRO_TEST_MINUTES} from '../utils/subjectExamMatrix';
import {readAccountState,saveAccountState} from '../utils/accountState';
import {readSubjectExamHistory} from '../utils/subjectExamHistory';
import {SubjectNotebook} from './SubjectNotebook';
export function SubjectExam({code,email,onBack}:{code:SubjectCode;email?:string;onBack:()=>void}){
 const [view,setView]=useState<'history'|'create'|'exam'>('history');
 const [history,setHistory]=useState(()=>readSubjectExamHistory(code));
 const [questionCount,setQuestionCount]=useState(code==='MAI391'?40:50);
 const [presetId, setPresetId] = useState<SubjectProTestId>();
 const presets = subjectProTests[code];
 const selectedPreset = presets.find(test => test.id === presetId);
 const configuredCount = selectedPreset ? PRO_TEST_QUESTION_COUNT : questionCount;
 const key=`subject-${code}-exam-active`,info=subjectInfo(code);
 const load=()=>{const value=readAccountState<unknown>(key,null);return validSubjectAttempt(value,code)?value:null;};
 const [attempt,setAttempt]=useState<SubjectExamAttempt|null>(load),[minutes,setMinutes]=useState(60),[now,setNow]=useState(Date.now()),[error,setError]=useState('');
 useEffect(()=>{setView('history');setAttempt(load());setHistory(readSubjectExamHistory(code));return subscribeSubjectProgress(code,()=>{const records=readSubjectExamHistory(code);setHistory(records);setAttempt(current=>current?records.find(r=>r.id===current.id)||current:load());});},[code,email]);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const persist=(next:SubjectExamAttempt)=>{const previous=load();if(previous&&previous.id!==next.id)saveAccountState(`subject-${code}-exam-attempt-${previous.id}`,readSubjectExamHistory(code).find(r=>r.id===previous.id)||previous);setAttempt(next);saveAccountState(key,next);saveAccountState(`subject-${code}-exam-attempt-${next.id}`,next);setHistory(readSubjectExamHistory(code));};
 const submit=()=>{if(!attempt||attempt.submittedAt)return;const result={...attempt,submittedAt:Date.now(),correct:gradeSubjectExam(attempt)};persist(result);saveAccountState(`subject-${code}-exam-result-${attempt.id}`,result);};
 useEffect(()=>{if(view==='exam'&&attempt&&!attempt.submittedAt&&now>=attempt.deadline)submit();},[view,now,attempt?.id,attempt?.submittedAt]);
 const configuredMinutes = selectedPreset ? PRO_TEST_MINUTES : minutes;
 const resetSettings = () => {
   setPresetId(undefined);
   setQuestionCount(code === 'MAI391' ? 40 : 50);
   setMinutes(60);
 };
 const openNewExam = () => {
   resetSettings();
   setView('create');
 };
 const start = () => {
   try {
     const questions = buildSubjectExam(code, undefined, configuredCount, selectedPreset?.id);
     const startedAt = Date.now();
     persist({
       id: crypto.randomUUID(), code, questionIds: questions.map(q => q.id),
       questionCount: configuredCount, presetId: selectedPreset?.id, answers: {},
       currentIndex: 0, startedAt, deadline: startedAt + configuredMinutes * 60000,
     });
     setView('exam');
     setError('');
   } catch (e) {
     setError((e as Error).message);
   }
 };
 const answer=(id:string,choice:string)=>{if(!attempt||attempt.submittedAt||Date.now()>=attempt.deadline||id!==attempt.questionIds[attempt.currentIndex])return;persist({...attempt,answers:{...attempt.answers,[id]:choice}});};
 const navigate=(i:number)=>{if(attempt)persist({...attempt,currentIndex:i});};
 const shownAttempt=view==='exam'?attempt:null;
 const shownPreset = shownAttempt && presets.find(test => test.id === shownAttempt.presetId);
 const rows=planSubjectExam(
   code,
   shownAttempt ? shownAttempt.questionCount ?? shownAttempt.questionIds.length : configuredCount,
   shownAttempt ? shownAttempt.presetId : selectedPreset?.id
 ),total=rows.reduce((sum,r)=>sum+r.count,0),remaining=attempt?Math.max(0,Math.ceil((attempt.deadline-now)/1000)):0;
 return <section className="w-full max-w-[1600px] mx-auto pb-3 space-y-4"><header className="flex flex-wrap items-center justify-between gap-3"><div className="flex gap-3 items-center"><button onClick={()=>view==='history'?onBack():setView('history')} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700" aria-label={view==='history'?'Quay lại môn học':'Danh sách đề'}><ArrowLeft size={18}/></button><div><h1 className="text-xl font-extrabold">{code} · Kiểm tra theo ma trận</h1><p className="text-xs text-slate-500">{info.title} · {shownPreset && `${shownPreset.label} · `}{total} câu</p></div></div>{view==='exam'&&attempt&&!attempt.submittedAt&&<span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 font-bold tabular-nums"><Clock size={16}/>{Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')}</span>}</header>
 {view==='history'?<div className="space-y-4"><div className="flex flex-wrap justify-between gap-3 items-center"><div><h2 className="font-bold">Đề của bạn</h2><p className="text-sm text-slate-500">Mở đề cũ để làm tiếp hoặc xem kết quả.</p></div><button className="rounded-xl bg-indigo-600 text-white px-4 py-2.5 font-bold" onClick={openNewExam}>Tạo đề mới</button></div>{!history.length?<p className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500">Chưa có đề nào. Chọn Tạo đề mới để bắt đầu.</p>:<div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">{history.map((item,i)=><button key={item.id} onClick={()=>{setAttempt(item);setView('exam');}} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-left p-4 space-y-2"><h3 className="font-bold">{code} · Đề {history.length-i}{item.presetId && ` · ${presets.find(test => test.id === item.presetId)?.label}`}</h3><p className="text-xs text-slate-500">{new Date(item.startedAt).toLocaleString('vi-VN')}</p><p className="text-sm">{item.questionIds.length} câu · {Math.round((item.deadline-item.startedAt)/60000)} phút</p><p className="font-semibold text-sm text-indigo-500">{item.submittedAt?`Xem kết quả · ${gradeSubjectExam(item)}/${item.questionIds.length}`:item.deadline<=now?'Hết giờ · Xem bài':`Làm tiếp · ${Object.keys(item.answers).length}/${item.questionIds.length} câu`}</p></button>)}</div>}</div>:view==='create'||!attempt?<div className="grid lg:grid-cols-[1fr_340px] gap-5"><div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5"><h2 className="font-bold mb-3">Phân bổ câu theo chương</h2><div className="divide-y divide-slate-100 dark:divide-slate-800">{rows.map(row=><div key={row.chapter} className="py-3 flex justify-between gap-3 text-sm"><span>Chương {row.chapter} · {info.chapters.find(c=>c.num===row.chapter)?.title}</span><b className="shrink-0">{row.count} câu</b></div>)}</div></div><div className="rounded-3xl bg-indigo-600 text-white p-6 space-y-4 self-start"><Shuffle size={28}/><h2 className="text-xl font-extrabold">Bốc đề mới</h2><p className="text-sm text-indigo-100">Câu hỏi không trùng, có đáp án xác định. Mặc định {code==='MAI391'?40:50} câu, 60 phút. Có thể chỉnh số câu và thời gian; phân bổ chương được tính lại theo tỉ lệ ma trận.</p><details className="rounded-xl border border-indigo-400/60 p-3"><summary className="cursor-pointer text-sm font-bold">Tùy chỉnh đề</summary><div className="space-y-3 mt-3">
 <label className="block text-sm font-semibold">Mẫu đề
   <select
     value={selectedPreset?.id ?? ''}
     onChange={event => setPresetId(presets.find(test => test.id === event.target.value)?.id)}
     className="block w-full mt-2 p-3 rounded-xl text-slate-900 bg-white"
   >
     <option value="">Toàn bộ chương</option>
     {presets.map(test => <option key={test.id} value={test.id}>{test.label}</option>)}
   </select>
 </label>
 {selectedPreset && <p className="text-sm text-indigo-100">
   Chương {selectedPreset.chapters.join(', ')} · {PRO_TEST_QUESTION_COUNT} câu · {PRO_TEST_MINUTES} phút
 </p>}
 <label className="block text-sm font-semibold">Số câu hỏi<input type="number" min={1} max={maxSubjectExamQuestions(code)} value={configuredCount} disabled={!!selectedPreset} onChange={e=>setQuestionCount(Math.max(1,Math.min(maxSubjectExamQuestions(code),Math.trunc(Number(e.target.value))||1)))} className="block w-full mt-2 p-3 rounded-xl text-slate-900 bg-white"/></label><label className="block text-sm font-semibold">Thời gian tự luyện (phút)<input type="number" min={5} max={180} value={configuredMinutes} disabled={!!selectedPreset} onChange={e=>setMinutes(Math.max(5,Math.min(180,Number(e.target.value)||5)))} className="block w-full mt-2 p-3 rounded-xl text-slate-900 bg-white"/></label><button type="button" className="text-xs underline" onClick={resetSettings}>Khôi phục mặc định</button></div></details><button onClick={start} className="w-full py-3 bg-white text-indigo-700 rounded-xl font-bold">Bắt đầu {total} câu</button><p className="text-xs text-indigo-100 leading-relaxed">{subjectMatrixNote(code)} Số câu và thời gian tự chọn chỉ áp dụng cho bài mới. Phân bổ dạng là cấu hình luyện tập từ tần suất, không phải ma trận chính thức của bộ môn.</p>{error&&<p role="alert">{error}</p>}</div></div>:<>
 {attempt.submittedAt&&<div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 p-4 flex flex-wrap gap-3 justify-between items-center"><div className="flex items-center gap-3"><CheckCircle className="text-emerald-500"/><div><h2 className="font-extrabold">Kết quả: {gradeSubjectExam(attempt)}/{total} · {(gradeSubjectExam(attempt)/total*10).toFixed(1)} điểm</h2><p className="text-xs text-slate-500">Đã nộp bài · chọn số câu để xem đáp án và lời giải.</p></div></div><button onClick={openNewExam} className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-sm">Bốc đề mới</button></div>}
 <div className="grid lg:grid-cols-[220px_minmax(0,1fr)] gap-4"><aside className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 self-start"><p className="text-xs font-bold text-slate-500 mb-3">Đã chọn {Object.keys(attempt.answers).length}/{total}</p><div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-4 gap-2 max-h-28 lg:max-h-none overflow-y-auto p-0.5">{attempt.questionIds.map((id,i)=>{const q=info.examQuestions.find(q=>q.id===id);const picked=attempt.answers[id];const result=attempt.submittedAt?(picked===q?.answer?'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300':'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'):picked?'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300':'bg-slate-100 dark:bg-slate-800';return <button key={id} onClick={()=>navigate(i)} aria-label={`Câu ${i+1}`} aria-current={attempt.currentIndex===i?'true':undefined} className={`rounded-lg h-8 text-xs font-bold ${result} ${attempt.currentIndex===i?'ring-2 ring-indigo-500':''}`}>{i+1}</button>})}</div>{!attempt.submittedAt&&<button onClick={()=>{if(window.confirm(`Nộp bài với ${Object.keys(attempt.answers).length}/${total} câu đã chọn?`))submit();}} className="mt-4 w-full rounded-xl bg-indigo-600 text-white py-2.5 font-bold text-sm">Nộp bài</button>}</aside><div className="min-w-0 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900"><div className="px-4 py-3 flex justify-between text-xs font-bold text-slate-500 border-b border-slate-200 dark:border-slate-800"><span>Câu {attempt.currentIndex+1}/{total}</span><span>Chương {info.examQuestions.find(q=>q.id===attempt.questionIds[attempt.currentIndex])?.chapter}</span></div><SubjectNotebook code={code} email={email} onBack={onBack} exam={{questionId:attempt.questionIds[attempt.currentIndex],selected:attempt.answers[attempt.questionIds[attempt.currentIndex]],reveal:!!attempt.submittedAt,onAnswer:answer}}/><div className="p-3 flex justify-between border-t border-slate-200 dark:border-slate-800"><button disabled={!attempt.currentIndex} onClick={()=>navigate(attempt.currentIndex-1)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 disabled:opacity-40 text-sm">Câu trước</button><button disabled={attempt.currentIndex>=total-1} onClick={()=>navigate(attempt.currentIndex+1)} className="px-4 py-2 rounded-xl bg-indigo-600 text-white disabled:opacity-40 text-sm">Câu tiếp</button></div></div></div>
 </>}
 </section>;
}
