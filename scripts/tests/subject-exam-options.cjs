const path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict'),esbuild=require('esbuild'),React=require('react'),{create,act}=require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT=true;global.__savedExam=null;
const root=path.resolve(__dirname,'../..');
(async()=>{
 const mocks={ '../utils/subjectExamHistory':`export const readSubjectExamHistory=()=>[];`, './SubjectNotebook':`export const SubjectNotebook=()=>null;`, '../utils/accountState':`export const readAccountState=(k,d)=>d,saveAccountState=(k,v)=>{if(k.endsWith('-exam-active'))global.__savedExam=v;};`, '../utils/subjectProgress':`import data from './src/data/studySubjects.json';export const subjectInfo=code=>data.subjects.find(s=>s.code===code),subscribeSubjectProgress=()=>()=>{};`};
 const result=await esbuild.build({entryPoints:[path.join(root,'src/pages/SubjectExam.tsx')],bundle:true,write:false,platform:'node',format:'cjs',plugins:[{name:'adapters',setup(b){b.onResolve({filter:/.*/},a=>a.path==='react'?{path:require.resolve('react'),external:true}:/subjectProgress$/.test(a.path)?{path:'../utils/subjectProgress',namespace:'mock'}:/accountState$/.test(a.path)?{path:'../utils/accountState',namespace:'mock'}:a.path in mocks?{path:a.path,namespace:'mock'}:undefined);b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:mocks[a.path],resolveDir:root}));}}]});
 const mod=new Module(__filename,module);mod.paths=module.paths;mod._compile(result.outputFiles[0].text,__filename);const Component=mod.exports.SubjectExam;
 const text=n=>n==null?'':typeof n==='string'||typeof n==='number'?String(n):Array.isArray(n)?n.map(text).join(''):text(n.children);
 for(const code of ['MAI391','MAS291']){
  let r;await act(async()=>{r=create(React.createElement(Component,{code,email:'qa@example.com',onBack(){}}))});
  await act(async()=>r.root.findAllByType('button').find(b=>text(b.children)==='Tạo đề mới').props.onClick());
  const inputs=()=>r.root.findAllByType('input').filter(n=>n.props.type==='number');
  assert.equal(inputs()[0].props.value,code==='MAI391'?40:50);assert.equal(inputs()[1].props.value,60);
  assert(!r.root.findByType('details').props.open);
  await act(async()=>inputs()[0].props.onChange({target:{value:'20'}}));await act(async()=>inputs()[1].props.onChange({target:{value:'30'}}));
  const presetSelect=()=>r.root.findByType('select');
  const options=presetSelect().findAllByType('option').map(option=>option.props.value);
  assert.deepEqual(options,code==='MAI391'?['','pt1','pt2']:['','pt1','pt2','pt3']);
  await act(async()=>presetSelect().props.onChange({target:{value:'pt1'}}));
  assert.equal(inputs()[0].props.value,15);assert.equal(inputs()[1].props.value,20);
  assert(inputs().every(input=>input.props.disabled));
  await act(async()=>presetSelect().props.onChange({target:{value:''}}));
  assert.equal(inputs()[0].props.value,20);assert.equal(inputs()[1].props.value,30);
  const start=r.root.findAllByType('button').find(b=>text(b.children)==='Bắt đầu 20 câu');assert(start);
  const before=Date.now();await act(async()=>start.props.onClick());const saved=global.__savedExam;
  assert.equal(saved.questionCount,20);assert.equal(saved.questionIds.length,20);assert.equal(saved.deadline-saved.startedAt,30*60000);assert(saved.startedAt>=before);
  await act(async()=>r.unmount());console.log('PASS '+code+': defaults unchanged, optional settings collapsed, custom count/time persist into attempt');
  await act(async()=>{r=create(React.createElement(Component,{code,email:'qa@example.com',onBack(){}}))});
  await act(async()=>r.root.findAllByType('button').find(b=>text(b.children)==='Tạo đề mới').props.onClick());
  const selected=code==='MAI391'?'pt2':'pt3';
  await act(async()=>presetSelect().props.onChange({target:{value:selected}}));
  await act(async()=>r.root.findAllByType('button').find(b=>text(b.children)==='Bắt đầu 15 câu').props.onClick());
  assert.equal(global.__savedExam.presetId,selected);
  assert.equal(global.__savedExam.questionIds.length,15);
  assert.equal(global.__savedExam.deadline-global.__savedExam.startedAt,20*60000);
  await act(async()=>r.unmount());console.log('PASS '+code+': choosing Pro Test saves its identity and starts a 15-question, 20-minute attempt');
 }
})().catch(e=>{console.error(e);process.exitCode=1});
