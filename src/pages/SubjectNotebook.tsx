import React,{useEffect,useRef,useState,useLayoutEffect} from 'react';
import {auth} from '../lib/cloud';
import {ArrowLeft,BookOpen} from 'lucide-react';
import {SubjectCode,subjectInfo,readSubjectQuestions,readSubjectChapter,saveSubjectQuestion,saveSubjectChapter,subscribeSubjectProgress} from '../utils/subjectProgress';
const protocol='dun-study-v1';
interface ExamView {questionId:string;selected?:string;reveal:boolean;onAnswer:(id:string,choice:string)=>void}
export function SubjectNotebook({code,email,onBack,exam,onOpenExam}:{code:SubjectCode;email?:string;onBack:()=>void;exam?:ExamView;onOpenExam?:()=>void}){
 const frame=useRef<HTMLIFrameElement>(null),snapshot=useRef<Record<string,string>>({}),navigation=useRef('');
 const section=useRef<HTMLElement>(null);
 const [readingHeight,setReadingHeight]=useState<number>();
 useLayoutEffect(()=>{
  if(exam)return;
  const fit=()=>{if(section.current)setReadingHeight(Math.max(240,window.innerHeight-section.current.getBoundingClientRect().top));};
  fit();window.addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);
  const observer=new ResizeObserver(fit);if(section.current?.parentElement)observer.observe(section.current.parentElement);
  return()=>{observer.disconnect();window.removeEventListener('resize',fit);window.visualViewport?.removeEventListener('resize',fit);};
 },[!!exam]);
 const subject=subjectInfo(code);
 const [html,setHtml]=useState(''),[loadError,setLoadError]=useState('');
 useEffect(()=>{const abort=new AbortController();setHtml('');setLoadError('');void(async()=>{try{const token=await auth.currentUser?.getIdToken();if(!token)throw new Error('Cần đăng nhập để mở môn học.');const response=await fetch('/api/study-notebooks/'+code,{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:abort.signal});if(!response.ok)throw new Error(response.status===403?'Bạn chưa được cấp quyền môn này.':'Không tải được môn học. Vui lòng mở lại khi có mạng.');const content=await response.text();if(!abort.signal.aborted)setHtml(content);}catch(e){if(!abort.signal.aborted)setLoadError((e as Error).message);}})();return()=>abort.abort();},[code,email]);
 const examRef=useRef(exam);examRef.current=exam;
 useEffect(()=>{if(exam)frame.current?.contentWindow?.postMessage({protocol,subject:code,kind:'exam-view',id:exam.questionId,selected:exam.selected,reveal:exam.reveal},'*');},[code,exam?.questionId,exam?.selected,exam?.reveal]);
 useEffect(()=>{
  let stopped=false,scheduled=false;
  const theme=()=>document.documentElement.classList.contains('dark')?'dark':'light';
  const send=(message:Record<string,unknown>)=>{if(!stopped)frame.current?.contentWindow?.postMessage({protocol,subject:code,...message},'*');};
  const initialize=()=>{const questions=readSubjectQuestions(code);snapshot.current=Object.fromEntries(Object.entries(questions).map(([id,value])=>[id,JSON.stringify(value)]));navigation.current=readSubjectChapter(code);send({kind:'init',questions,chapter:navigation.current,theme:theme()});};
  const refresh=()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;if(stopped)return;const questions=readSubjectQuestions(code);for(const id of subject.questionIds){const value=questions[id]||{done:null,pick:null},serialized=JSON.stringify(value);if(serialized!==(snapshot.current[id]||'{"done":null,"pick":null}')){snapshot.current[id]=serialized;send({kind:'question',id,value});}}const chapter=readSubjectChapter(code);if(chapter!==navigation.current){navigation.current=chapter;send({kind:'navigation',chapter});}});};
  const receive=(event:MessageEvent)=>{
   if(event.source!==frame.current?.contentWindow||event.origin!=='null')return;
   const message=event.data;if(!message||message.protocol!==protocol||message.subject!==code)return;
   if(message.kind==='hello')initialize();
   else if(message.kind==='ready'&&examRef.current){const e=examRef.current;send({kind:'exam-view',id:e.questionId,selected:e.selected,reveal:e.reveal});}
   else if(message.kind==='exam-answer'&&examRef.current&&!examRef.current.reveal&&message.id===examRef.current.questionId&&typeof message.choice==='string'&&/^(?:[A-E]|i{1,3}|iv|v|vi)$/.test(message.choice))examRef.current.onAnswer(message.id,message.choice);
   else if(message.kind==='question'&&typeof message.id==='string')saveSubjectQuestion(code,message.id,message.value);
   else if(message.kind==='open-exam'&&!examRef.current)onOpenExam?.();
   else if(message.kind==='navigation')saveSubjectChapter(code,message.chapter);
  };
  window.addEventListener('message',receive);const unsubscribe=subscribeSubjectProgress(code,refresh);
  const observer=new MutationObserver(()=>send({kind:'theme',theme:theme()}));observer.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  // Cover cached iframe loads that complete before the parent's effect is installed.
  const el=frame.current;el?.addEventListener('load',initialize);
  return()=>{stopped=true;window.removeEventListener('message',receive);unsubscribe();observer.disconnect();el?.removeEventListener('load',initialize);};
 },[code,email,subject,onOpenExam]);
 return <section ref={section} data-subject-notebook={exam?'exam':'reading'} className="w-full min-w-0 flex flex-col overflow-hidden" style={exam?undefined:{height:readingHeight??'100dvh'}}><header hidden={!!exam} className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 shrink-0 border-b border-slate-200 dark:border-slate-800"><div className="flex items-center gap-3"><button onClick={onBack} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"><ArrowLeft size={16}/>Môn học</button><div><h1 className="font-extrabold text-base flex items-center gap-2"><BookOpen size={17} className="text-indigo-500"/>{code}</h1><p className="text-xs text-slate-500 dark:text-slate-400">{subject.title}</p></div></div><span className="text-xs text-slate-500 dark:text-slate-400">{subject.chapters.length} chương · {subject.questionIds.length} câu hỏi</span></header>{loadError?<p role="alert" className="p-5 text-rose-500">{loadError}</p>:!html?<p className="p-5 text-slate-500">Đang tải môn học…</p>:<iframe ref={frame} key={`${code}:${email||'guest'}`} title={`Sổ ôn ${code}`} sandbox="allow-scripts" srcDoc={html||undefined} className={`w-full border-0 bg-slate-50 dark:bg-slate-950 ${exam?'':'flex-1 min-h-0'}`} style={{height:exam?'calc(100dvh - 285px)':'100%',minHeight:exam?360:0}}/>}</section>;
}
