const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module'),esbuild=require('esbuild');
const root=path.resolve(__dirname,'../..');
(async()=>{
 const result=await esbuild.build({entryPoints:[path.join(root,'src/utils/subjectExamMatrix.ts')],bundle:true,write:false,platform:'node',format:'cjs',plugins:[{name:'isolate-cloud',setup(b){b.onResolve({filter:/accountState|projectStorage/},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const readAccountState=()=>null, saveAccountState=()=>{}, accountStateKey=x=>x, logicalProjectStorageKey=x=>x;'}));}}]});
 const mod=new Module(__filename);mod._compile(result.outputFiles[0].text,__filename);
 const {buildSubjectExam,subjectMatrices,validSubjectAttempt,gradeSubjectExam,planSubjectExam,maxSubjectExamQuestions}=mod.exports;
 for(const code of ['MAI391','MAS291']){
  const fingerprints=new Set();
  for(let seed=1;seed<=300;seed++){
   let state=seed;const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
   const questions=buildSubjectExam(code,random),ids=questions.map(q=>q.id),total=code==='MAI391'?40:50;
   assert.equal(ids.length,total);assert.equal(new Set(ids).size,total);assert(questions.every(q=>q.verified));
   for(const row of subjectMatrices[code]){assert.equal(questions.filter(q=>q.chapter===row.chapter).length,row.count);assert(questions.filter(q=>q.chapter===row.chapter).every(q=>row.weights[q.group]>0));}
   const attempt={id:'test',code,questionIds:ids,answers:Object.fromEntries(questions.map(q=>[q.id,q.answer])),currentIndex:0,startedAt:1000,deadline:61000};
   assert(validSubjectAttempt(attempt,code));assert.equal(gradeSubjectExam(attempt),total);
   assert.equal(gradeSubjectExam({...attempt,answers:{}}),0);
   assert(!validSubjectAttempt({...attempt,questionIds:ids.map(()=>ids[0])},code));
   assert(!validSubjectAttempt({...attempt,answers:{unknown:'A'}},code));
   assert(!validSubjectAttempt({...attempt,deadline:0},code));
   assert(!validSubjectAttempt({...attempt,currentIndex:total},code));
   fingerprints.add(ids.join(','));
  }
  assert(fingerprints.size>290);console.log('PASS '+code+': 300 random exams, chapter quotas, eligible types, uniqueness, grading and resume validation');
 }
 for(const code of ['MAI391','MAS291']){
  const max=maxSubjectExamQuestions(code);
  for(const count of [1,7,25,40,50,max]){
   const rows=planSubjectExam(code,count),questions=buildSubjectExam(code,()=>0.37,count);
   assert.equal(questions.length,count);assert.equal(new Set(questions.map(q=>q.id)).size,count);
   for(const row of rows)assert.equal(questions.filter(q=>q.chapter===row.chapter).length,row.count);
   const attempt={id:'custom',code,questionCount:count,questionIds:questions.map(q=>q.id),answers:{},currentIndex:0,startedAt:1000,deadline:61000};assert(validSubjectAttempt(attempt,code));
  }
  assert.throws(()=>planSubjectExam(code,0));assert.throws(()=>planSubjectExam(code,max+1));assert.throws(()=>planSubjectExam(code,1.5));
  console.log('PASS '+code+': custom question counts scale matrix quotas, stay unique and restore correctly');
 }
 const proTests = {
  MAS291: { pt1: ['1','2','3'], pt2: ['4','6','7'], pt3: ['8','9','10','11'] },
  MAI391: { pt1: ['3','4','5'], pt2: ['6','7'] },
 };
 for (const [code, presets] of Object.entries(proTests)) {
  for (const [presetId, chapters] of Object.entries(presets)) {
   const questions = buildSubjectExam(code, () => 0.37, 15, presetId);
   const ids = questions.map(q => q.id);
   assert.equal(ids.length, 15);
   assert.equal(new Set(ids).size, 15);
   assert.deepEqual([...new Set(questions.map(q => q.chapter))], chapters);
   const attempt = {
    id: 'pro-test', code, presetId, questionCount: 15, questionIds: ids,
    answers: {}, currentIndex: 0, startedAt: 1000, deadline: 1201000,
   };
   assert(validSubjectAttempt(attempt, code));
   assert(!validSubjectAttempt({...attempt, deadline: 61000}, code));
   const outside = buildSubjectExam(code, () => 0.37).find(q => !chapters.includes(q.chapter));
   assert(!validSubjectAttempt({...attempt, questionIds: [outside.id, ...ids.slice(1)]}, code));
   assert.throws(() => planSubjectExam(code, 14, presetId));
   console.log('PASS '+code+' '+presetId+': 15 unique questions, exact chapter scope, 20 minutes and restore');
  }
 }
 assert.throws(() => planSubjectExam('MAI391', 15, 'pt3'));
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'src/data/studySubjects.json'),'utf8'));
 for(const subject of manifest.subjects){
  const html=fs.readFileSync(path.join(root,'server-data/study-notebooks',subject.code.toLowerCase()+'.html'),'utf8');
  const payloads=[...html.matchAll(/<script\b[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
  assert.equal(payloads.length,3);assert.deepEqual(Object.keys(payloads[0].data),[subject.code]);
  assert.equal(payloads[0].index.length,subject.questionIds.length);assert.equal(Object.keys(payloads[2]).length,subject.answers);
  assert(payloads[0].index.every(q=>q.s===subject.code));
  assert(html.includes("connect-src 'none'"));assert(html.includes("default-src 'none'"));
  console.log('PASS '+subject.code+': isolated payload, complete index/answers and CSP');
 }
 const host=fs.readFileSync(path.join(root,'src/pages/SubjectNotebook.tsx'),'utf8');
 assert(host.includes('sandbox="allow-scripts"'));assert(!host.includes('allow-same-origin'));assert(host.includes("event.origin!=='null'"));assert(host.includes('event.source!==frame.current?.contentWindow'));
 console.log('PASS sandbox boundaries and message origin/source checks');
})().catch(e=>{console.error(e);process.exitCode=1});
