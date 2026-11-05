const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const esbuild=require('esbuild');
const root=path.resolve(__dirname,'../..');
const sdk=`
export const initializeApp=()=>({});export const connectAuthEmulator=()=>{};export const connectFirestoreEmulator=()=>{};
export const getAuth=()=>({currentUser:{email:'sync-test@example.invalid',emailVerified:true}});
export const initializeFirestore=()=>({});export const persistentLocalCache=()=>({});export const persistentMultipleTabManager=()=>({});export const memoryLocalCache=()=>({});
export const getFirestore=()=>({});export const collection=(...a)=>a;export const doc=(...a)=>a.slice(1).join('/');
export const setDoc=async(ref,data)=>{
 const validate=value=>{if(Array.isArray(value)){if(value.some(Array.isArray))throw Error('Nested arrays are not supported');value.forEach(validate);}else if(value&&typeof value==='object')Object.values(value).forEach(validate)};validate(data);
 const course=data.courseJson?JSON.parse(data.courseJson):data.course;
 await new Promise(r=>setTimeout(r,(course?.title||data.title)==='slow'?25:1));records.set(ref,structuredClone(data));};
export const deleteDoc=async(ref)=>{records.delete(ref);};export const onSnapshot=(q,...args)=>{handlers.push(args.find(x=>typeof x==='function'));return()=>{}};
export const runTransaction=async(db,fn)=>{const writes=[];await fn({get:async ref=>({exists:()=>records.has(ref),data:()=>structuredClone(records.get(ref))}),set:(ref,data)=>writes.push(()=>setDoc(ref,data))});await Promise.all(writes.map(fn=>fn()));};
export const getDoc=async()=>({exists:()=>false,data:()=>({})});export const query=(...a)=>a;export const where=(...a)=>a;export const or=(...a)=>a;export const getDocs=async()=>({docs:[]});
export const getStorage=()=>({});export const ref=(...a)=>a;export const uploadString=async()=>{};export const getDownloadURL=async()=>'';
export const updateDoc=async()=>{};export const deleteField=()=>null;export const increment=n=>n;
export const GoogleAuthProvider=class{};
export const createUserWithEmailAndPassword=async()=>({});export const signInWithEmailAndPassword=async()=>({});export const signOut=async()=>{};export const onAuthStateChanged=()=>()=>{};export const updateProfile=async()=>{};export const deleteUser=async()=>{};export const signInWithPopup=async()=>({});export const sendEmailVerification=async()=>{};export const sendPasswordResetEmail=async()=>{};
`;
(async()=>{
 fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
 const result=await esbuild.build({stdin:{contents:`export { syncQuizToFirestore,removeQuizFromFirestore,syncJapaneseCourseToFirestore,deleteJapaneseCourseFromFirestore,subscribeJapaneseCourses,syncStudyProgressToFirestore,flushAllPendingProgressSync } from './src/lib/firebase';`,resolveDir:root,loader:'ts'},bundle:true,write:false,platform:'browser',format:'iife',define:{'import.meta.env.DEV':'false'},globalName:'api',logLevel:'silent',plugins:[{name:'fake-sdk',setup(b){b.onResolve({filter:/^firebase\//},()=>({path:'sdk',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:sdk}));b.onResolve({filter:/firebase-applet-config.json/},()=>({path:'config',namespace:'config'}));b.onLoad({filter:/.*/,namespace:'config'},()=>({contents:JSON.stringify({apiKey:'AIzaTestOnly',projectId:'offline-test',firestoreDatabaseId:'test'}),loader:'json'}));}}]});
 const records=new Map(),handlers=[],cache=new Map(),context=vm.createContext({records,handlers,console,setTimeout,clearTimeout,structuredClone,Date,Promise,CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts?.detail}},window:{addEventListener(){},dispatchEvent(){}},localStorage:{getItem:k=>cache.get(k)||null,setItem:(k,v)=>cache.set(k,v),removeItem:k=>cache.delete(k)}});vm.runInContext(result.outputFiles[0].text,context);
 const api=context.api,c={id:'c',lessons:[],updatedAt:new Date().toISOString()},email='sync-test@example.invalid';const cases=[];
 async function test(name,fn){try{records.clear();await fn();cases.push({name,status:'PASS'})}catch(e){cases.push({name,status:'FAIL',error:e.message})}}
 const savedCourse=ref=>{const value=records.get(ref);return value.courseJson?JSON.parse(value.courseJson):value.course};
 await test('Timer-only progress changes do not issue additional Firebase writes',async()=>{
  const key='jp_progress_typing_quota_test',ref='study_progress/sync_test_example_invalid_'+key;
  await api.syncStudyProgressToFirestore(email,key,{currentIndex:0,inputVal:'a',seconds:1,savedAt:'1'});await api.flushAllPendingProgressSync();
  const initial=records.get(ref);assert.ok(initial);
  for(let seconds=2;seconds<=60;seconds++)await api.syncStudyProgressToFirestore(email,key,{currentIndex:0,inputVal:'a',seconds,savedAt:String(seconds)});
  await api.flushAllPendingProgressSync();assert.deepEqual(records.get(ref),initial);
  await api.syncStudyProgressToFirestore(email,key,{currentIndex:0,inputVal:'ab',seconds:61,savedAt:'61'});await api.flushAllPendingProgressSync();assert.equal(records.get(ref).data.inputVal,'ab');
 });

 await test('Real Firebase wrapper: later edit wins even when earlier write is slow',async()=>{await Promise.all([api.syncJapaneseCourseToFirestore({...c,title:'slow'},email),api.syncJapaneseCourseToFirestore({...c,title:'latest'},email)]);assert.equal(savedCourse(`user_japanese_courses/${email}_c`).title,'latest')});
 await test('Real Firebase wrapper: delete after pending edit leaves a tombstone',async()=>{await Promise.all([api.syncJapaneseCourseToFirestore({...c,title:'slow'},email),api.deleteJapaneseCourseFromFirestore('c',email)]);assert.ok(records.get(`user_japanese_courses/${email}_c`).course.deletedAt)});
 await test('Real Firebase wrapper: restore after delete wins',async()=>{await Promise.all([api.deleteJapaneseCourseFromFirestore('c',email),api.syncJapaneseCourseToFirestore({...c,title:'restored',updatedAt:new Date(Date.now()+1000).toISOString()},email)]);const saved=savedCourse(`user_japanese_courses/${email}_c`);assert.equal(saved.title,'restored');assert.equal(saved.deletedAt,undefined)});
 await test('Real Firebase wrapper: a foreign account never sends through the active login',async()=>{await api.syncJapaneseCourseToFirestore({...c,title:'A'},email);await assert.rejects(api.syncJapaneseCourseToFirestore({...c,title:'B'},'other@example.invalid'));assert.equal(records.size,1);assert.equal(savedCourse(`user_japanese_courses/${email}_c`).title,'A')});
 await test('Real Firebase wrapper: snapshot payload detached from mutable caller',async()=>{const value={...c,title:'original'};const saved=api.syncJapaneseCourseToFirestore(value,email);value.title='mutated';await saved;assert.equal(savedCourse(`user_japanese_courses/${email}_c`).title,'original')});
 await test('Regression from live Render: nested grammar tables round-trip with mastery',async()=>{const value={...c,lessons:[{cards:[{id:'word',mastered:true}]}],grammarPoints:[{table:{header:[['A','B']],rows:[['one','two'],['three','four']]}}]};await api.syncJapaneseCourseToFirestore(value,email);assert.deepEqual(savedCourse(`user_japanese_courses/${email}_c`),value)});
 await test('Course listener reads legacy map and new JSON envelope',async()=>{let result;api.subscribeJapaneseCourses(email,value=>result=value);handlers.at(-1)({docs:[{data:()=>({course:{id:'legacy'}})},{data:()=>({courseJson:JSON.stringify({id:'json',grammarPoints:[{table:{rows:[['a','b']]}}]})})}]});assert.equal(result[0].id,'legacy');assert.equal(result[1].grammarPoints[0].table.rows[0][1],'b')});
 await test('MCQ real wrapper: earlier slow save does not replace newer edit',async()=>{await Promise.all([api.syncQuizToFirestore('u',{id:'q',title:'slow',questions:[]}),api.syncQuizToFirestore('u',{id:'q',title:'new',questions:[]})]);assert.equal(records.get('quizzes/q').title,'new')});
 await test('MCQ real wrapper: delete wins over pending save',async()=>{await Promise.all([api.syncQuizToFirestore('u',{id:'q',title:'slow',questions:[]}),api.removeQuizFromFirestore('q')]);assert.ok(records.get('quizzes/q').deletedAt)});
 await test('MCQ real wrapper: recreation after deletion remains saved',async()=>{await Promise.all([api.removeQuizFromFirestore('q'),api.syncQuizToFirestore('u',{id:'q',title:'restored',questions:[]})]);assert.equal(records.get('quizzes/q').title,'restored')});
 for(const c of cases)console.log(c.status+' '+c.name+(c.error?'\n'+c.error:''));fs.writeFileSync(path.join(root,'test-results/sync-cloud.json'),JSON.stringify({mode:'actual Firebase wrapper with fake SDK; no real Firebase requests',cases},null,2));process.exitCode=cases.some(c=>c.status==='FAIL')?1:0;
})();
