const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict');
const root=process.cwd(),React=require(path.join(root,'node_modules/react')), {create,act}=require(path.join(root,'node_modules/react-test-renderer')),esbuild=require(path.join(root,'node_modules/esbuild'));
global.IS_REACT_ACT_ENVIRONMENT=true;
const listeners=new Map();global.window={addEventListener:(n,fn)=>{if(!listeners.has(n))listeners.set(n,new Set());listeners.get(n).add(fn)},removeEventListener:(n,fn)=>listeners.get(n)?.delete(fn)};
global.__access=true;global.__admin=false;global.__courses=[];global.__local=[];global.__cloud=null;
const entry=path.join(root,'src/pages/JapaneseLearningPage.tsx');const source=fs.readFileSync(entry,'utf8');
const icons=source.match(/import\s*\{([^}]+)\}\s*from 'lucide-react'/)[1].split(',').map(s=>s.trim()).filter(Boolean);
const mocks={
 'lucide-react':icons.map(n=>`export const ${n}=()=>null;`).join('\n'),
 '../utils/storageEvents':`export function subscribeStorageKeys(match,fn){global.__local.push(fn);return()=>{global.__local=global.__local.filter(x=>x!==fn)}}`,
 '../utils/japaneseStorage':`export const getJapaneseCourses=()=>structuredClone(global.__courses);export const getCoursesStorageKey=()=> 'courses';export const reconcileJapaneseCoursesFromCloud=()=>{};export const saveJapaneseCourse=x=>global.__courses;export const deleteJapaneseCourse=()=>global.__courses;export const isJapaneseAdmin=()=>global.__admin;export const canAccessJpd123=()=>global.__access;export const saveJapaneseCourses=()=>{};export const restoreDefaultJpd123Course=()=>global.__courses;export const getCleanDefaultJpdCourse=()=>global.__courses[0];export const ensureJpdCourseUpToDate=x=>x;`,
 '../lib/firebase':`export function subscribeJapaneseCourses(email,fn){global.__cloud=fn;return()=>{if(global.__cloud===fn)global.__cloud=null}}export const syncJapaneseCourseToFirestore=()=>{};`,
 './JapaneseCourseDetail':`import React from 'react';export const JapaneseCourseDetail=({course,onBackToCourses})=>React.createElement('div',{'data-testid':'course-detail'},course.title,React.createElement('button',{onClick:onBackToCourses},'Về danh sách'));`,
 '../utils/audio':`export const sound={playClick(){},playSuccess(){}};`,
};
const text=n=>n==null?'':typeof n==='string'?n:Array.isArray(n)?n.map(text).join(''):text(n.children);
const base={id:'course-jpd123',code:'JPD 123',title:'JPD123 protected fixture',description:'Fixture',level:'N5',lessons:[],kanjiList:[],grammarPoints:[],materials:[]};
(async()=>{const result=await esbuild.build({entryPoints:[entry],bundle:true,write:false,platform:'node',format:'cjs',logLevel:'silent',plugins:[{name:'page-adapters',setup(b){b.onResolve({filter:/.*/},a=>{if(a.path==='react')return {path:path.join(root,'node_modules/react/index.js'),external:true};if(a.path in mocks)return {path:a.path,namespace:'mock'};});b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:mocks[a.path],loader:'js'}));}}]});
const file=path.join(root,'scripts/tests/course-entry-compiled.cjs'),mod=new Module(file,module);mod.filename=file;mod.paths=Module._nodeModulePaths(path.dirname(file));mod._compile(result.outputFiles[0].text,file);const Page=mod.exports.JapaneseLearningPage;
let renderer,passed=0;const props={currentUser:{email:'learner@example.com',name:'Learner'}};
const mount=async p=>act(async()=>{renderer=create(React.createElement(Page,p||props))});const detail=()=>renderer.root.findAll(n=>n.props['data-testid']==='course-detail').length;
const open=async()=>{const title=renderer.root.findAllByType('h3').find(n=>text(n.children)===base.title);assert.ok(title);let node=title;while(node&&!node.props.onClick)node=node.parent;assert.ok(node);await act(async()=>node.props.onClick());};
const event=async name=>act(async()=>{for(const fn of listeners.get(name)||[])fn()});
const test=async(name,fn)=>{global.__access=true;global.__admin=false;global.__courses=[structuredClone(base)];try{await fn();passed++;console.log('PASS '+name)}finally{if(renderer){await act(async()=>renderer.unmount());renderer=null}}};
await test('Admin and delegated account enter course list even with one course',async()=>{for(const admin of [false,true]){global.__admin=admin;await mount();assert.equal(detail(),0);assert.ok(text(renderer.toJSON()).includes(base.title));await act(async()=>renderer.unmount());renderer=null;}});
await test('Cloud and cross-tab refresh never auto-open a course',async()=>{await mount();await act(async()=>global.__cloud([]));await act(async()=>global.__local.forEach(fn=>fn()));assert.equal(detail(),0)});
await test('Only explicit click opens; Back plus sync stays at list',async()=>{await mount();await open();assert.equal(detail(),1);await act(async()=>renderer.root.findByType('button').props.onClick());await act(async()=>global.__cloud([]));assert.equal(detail(),0)});
await test('Unpermitted account hides cached JPD aliases but keeps own courses',async()=>{global.__access=false;global.__courses=[base,{...base,id:'renamed-id',code:' jPd 123 '},{...base,id:'own-course',code:'N4',title:'Own course'}];await mount();assert.equal(detail(),0);assert.ok(!text(renderer.toJSON()).includes(base.title));assert.ok(text(renderer.toJSON()).includes('Own course'));});
await test('Revoking permission closes an opened folder; granting again does not auto-open',async()=>{await mount();await open();global.__access=false;await event('mcq-account-control');assert.equal(detail(),0);assert.ok(!text(renderer.toJSON()).includes(base.title));global.__access=true;await event('mcq-account-control');assert.equal(detail(),0);assert.ok(text(renderer.toJSON()).includes(base.title));});
await test('Account switch clears selected course and ignores stale cloud callback',async()=>{await mount();await open();const old=global.__cloud;global.__access=false;global.__courses=[];await act(async()=>renderer.update(React.createElement(Page,{currentUser:{email:'other@example.com',name:'Other'}})));await act(async()=>old([base]));assert.equal(detail(),0);assert.ok(!text(renderer.toJSON()).includes(base.title));});
console.log(`${passed} Japanese course entry component cases passed`);
})().catch(e=>{console.error(e);process.exitCode=1});
