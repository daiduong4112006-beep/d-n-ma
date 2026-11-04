// Actual React components and answer validators; browser, audio and cloud adapters are isolated.
const fs=require('node:fs'), path=require('node:path'), Module=require('node:module'), assert=require('node:assert/strict');
const esbuild=require('esbuild');
const runtime=process.env.SYNC_TEST_RUNTIME || path.resolve(__dirname,'../../node_modules');
const React=require(runtime+'/react');
const {create,act}=require(runtime+'/react-test-renderer');
const root=path.resolve(__dirname,'../..');
global.IS_REACT_ACT_ENVIRONMENT=true;
const data=new Map();
global.localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
global.__typingSaved=null; global.__typingSubscribers=[];
const mock={
  '../../utils/audio':`export const sound=new Proxy({}, {get:(_,key)=>key==='isEnabled'?()=>false:()=>{}});`,
  '../../utils/studyProgressStorage':`export const getTypingProgress=()=>global.__typingSaved;export const saveTypingProgress=(id,data)=>global.__typingSaved=data;export const clearTypingProgress=()=>global.__typingSaved=null;`,
  '../../utils/realtimeSync':`export const realtimeSync={subscribeKey(t,k,cb){global.__typingSubscribers.push(cb);return()=>{global.__typingSubscribers=global.__typingSubscribers.filter(x=>x!==cb)}}};`,
  './JapaneseGrammarAiModal':`export const JapaneseGrammarAiModal=()=>null;`,
};
async function component(name) {
  const filename=path.join(root,'src/components/japanese',name+'.tsx');
  const source=fs.readFileSync(filename,'utf8');
  const icons=source.match(/import\s*\{([^}]+)\}\s*from 'lucide-react'/)[1].split(',').map(x=>x.trim()).filter(x=>/^\w+$/.test(x));
  const mocks={...mock,'lucide-react':icons.map(n=>`export const ${n}=()=>null;`).join('\n')};
  const result=await esbuild.build({entryPoints:[filename],bundle:true,write:false,platform:'node',format:'cjs',nodePaths:[runtime],logLevel:'silent',plugins:[{name:'isolated-adapters',setup(b){
    b.onResolve({filter:/.*/},a=>a.path==='react'?{path:runtime+'/react/index.js',external:true}:a.path in mocks?{path:a.path,namespace:'mock'}:undefined);
    b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:mocks[a.path],loader:'js'}));
  }}]});
  const mod=new Module(filename,module);mod.paths=module.paths;mod._compile(result.outputFiles[0].text,filename);return mod.exports[name];
}
const text=n=>n==null?'':typeof n==='string'||typeof n==='number'?String(n):Array.isArray(n)?n.map(text).join(''):text(n.children);
const key={key:'Enter',preventDefault(){}};
const cards=[{id:'a',term:'いち',reading:'いち',definition:'Một',example:'いちです。',exampleMeaning:'Là một.',mastered:false},{id:'b',term:'に',reading:'に',definition:'Hai',example:'にです。',exampleMeaning:'Là hai.',mastered:false}];
let renderer,clock=0,nextTimer=1,timers=new Map();
const originals={setTimeout:global.setTimeout,clearTimeout:global.clearTimeout,setInterval:global.setInterval,clearInterval:global.clearInterval};
function fakeClock(){global.setTimeout=(fn,ms=0)=>{const id=nextTimer++;timers.set(id,{fn,at:clock+ms});return id};global.clearTimeout=id=>timers.delete(id);global.setInterval=()=>nextTimer++;global.clearInterval=()=>{};
 global.window={setInterval:global.setInterval,addEventListener(){},removeEventListener(){},speechSynthesis:{cancel(){},getVoices(){return[]}}};
 global.document={activeElement:null};
}
async function advance(ms){const end=clock+ms;while(true){const due=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;timers.delete(due[0]);clock=due[1].at;await act(async()=>due[1].fn())}clock=end;}
async function render(Component,props,saved=null){data.clear();data.set('typing_auto_speech_enabled','false');for(const k of ['typing_shuffle_enabled','grammar_shuffle_enabled','kanji_typing_shuffle'])data.set(k,'false');global.__typingSaved=saved;await act(async()=>{renderer=create(React.createElement(Component,{...props,onExit(){}}),{createNodeMock:()=>({focus(){},setSelectionRange(){},select(){}})})})}
const inputs=()=>renderer.root.findAllByType('input').filter(n=>n.props.type!=='checkbox' && typeof n.props.onChange==='function');
async function fill(values){for(let i=0;i<values.length;i++)await act(async()=>inputs()[i].props.onChange({target:{value:values[i],selectionStart:values[i].length}}))}
async function enter(){await act(async()=>inputs().at(-1).props.onKeyDown(key))}
const button=label=>renderer.root.findAllByType('button').find(b=>text(b.children).includes(label));
const results=[];
async function test(name,fn){try{await fn();results.push({name,status:'PASS'})}catch(error){results.push({name,status:'FAIL',error:error.stack})}finally{if(renderer){await act(async()=>renderer.unmount());renderer=null}timers.clear();global.__typingSubscribers=[];clock=0}}
(async()=>{
 const Typing=await component('JapaneseTypingMode'),Kanji=await component('JapaneseKanjiTypingMode'),Grammar=await component('JapaneseGrammarPracticeMode');
 fakeClock();
 await test('Rounding never turns a non-perfect large session into 100%',async()=>{
  const file=path.join(root,'src/utils/typingScore.ts');
  const mod=new Module(file,module);mod._compile(esbuild.transformSync(fs.readFileSync(file,'utf8'),{loader:'ts',format:'cjs'}).code,file);
  const {firstAttemptAccuracy}=mod.exports;
  assert.equal(firstAttemptAccuracy(235,236),99.6);
  assert.equal(firstAttemptAccuracy(9999,10000),99.9);
  assert.equal(firstAttemptAccuracy(236,236),100);
  assert.equal(firstAttemptAccuracy(0,0),0);
 });
 for(const example of [false,true])await test((example?'Example':'Vocabulary')+' typing: wrong→correct then first-try correct scores 1/2; repeated Enter cannot add points',async()=>{
  await render(Typing,{lesson:{id:'test',title:'Test',cards},isExampleMode:example});
  await fill(['まちがい']);await enter();
  await fill([example?'いちです。':'いち']);
  const check=inputs()[0].props.onKeyDown;
  await act(async()=>{check(key);check(key)});
  await advance(1300);
  await fill([example?'にです。':'に']);await enter();await advance(1300);
  const output=text(renderer.toJSON());assert.match(output,/Hoàn thành bài luyện gõ/);
  const stats=renderer.root.findAllByType('span');
  const label=stats.find(n=>text(n.children)==='Đúng lần đầu');assert.ok(label);assert.equal(text(label.parent.children[0]),'1');
 });
 await test('Typing resume at index zero preserves first-card mistake',async()=>{
  await render(Typing,{lesson:{id:'test',title:'Test',cards}}, {currentIndex:0,cardIds:['a','b'],score:0,wrongCardIds:['a'],seconds:5,inputVal:'まちがい'});
  await fill(['いち']);await enter();await advance(1300);await fill(['に']);await enter();await advance(1300);
  const label=renderer.root.findAllByType('span').find(n=>text(n.children)==='Đúng lần đầu');assert.equal(text(label.parent.children[0]),'1');
 });
 await test('Typing legacy resume excludes earlier corrected mistakes',async()=>{
  await render(Typing,{lesson:{id:'test',title:'Test',cards}},{currentIndex:1,cardIds:['a','b'],score:1,wrongCardIds:['a'],seconds:5});
  await fill(['に']);await enter();await advance(1300);
  const label=renderer.root.findAllByType('span').find(n=>text(n.children)==='Đúng lần đầu');assert.equal(text(label.parent.children[0]),'1');
 });
 await test('Typing manual next cancels pending auto-next and does not skip the following card',async()=>{
  await render(Typing,{lesson:{id:'test',title:'Test',cards:[...cards,{...cards[0],id:'c'}]}});
  await fill(['いち']);await enter();await enter();await advance(1500);
  assert.equal(inputs()[0].props.value,'');assert.match(text(renderer.toJSON()),/Hai/);
 });
 for(const core of [false,true])await test('Kanji '+(core?'Kun/On':'compound')+': correcting a mistake does not count as first-try success',async()=>{
  await render(Kanji,{mode:core?'core':'vocab',vocabCards:cards,kanjiCards:[{id:'k',kanji:'一',meaning:'Một',kunyomi:'ひと',onyomi:'イチ',strokeCount:1,mastered:false}]});
  await fill(core?['まちがい','イチ']:['まちがい']);await enter();
  await fill(core?['ひと','イチ']:['いち']);await enter();await advance(2400);
  if(!core){await fill(['に']);await enter();await advance(2400)}
  const output=text(renderer.toJSON());assert.match(output,core?/0\/1/:/1\/2/);assert.match(output,core?/0%/:/50%/);
 });
 for(const dialogue of [false,true])await test('Grammar '+(dialogue?'dialogue':'single sentence')+': wrong→correct remains 0% first-try accuracy',async()=>{
  const japanese=dialogue?'A: いちです。 / B: にです。':'いちです。';
  const vietnamese=dialogue?'A: Là một.\nB: Là hai.':'Là một.';
  await render(Grammar,{title:'Test',examples:[{japanese,vietnamese}]});
  await fill(dialogue?['まちがい','にです。']:['まちがい']);await enter();
  await fill(dialogue?['いちです。','にです。']:['いちです。']);await enter();await advance(2400);
  const output=text(renderer.toJSON());assert.match(output,/0%/);assert.match(output,/0\/1 câu đúng lần đầu/);
 });
 await test('Restart starts a fresh first-attempt score',async()=>{
  await render(Kanji,{mode:'vocab',vocabCards:[cards[0]]});await fill(['まちがい']);await enter();await fill(['いち']);await enter();await advance(2400);
  const restart=button('Luyện lại tất cả');assert.ok(restart);await act(async()=>restart.props.onClick());
  await fill(['いち']);await enter();await advance(2400);assert.match(text(renderer.toJSON()),/100%/);
 });
 await test('All answers correct at first attempt still earns 100%',async()=>{
  await render(Typing,{lesson:{id:'test',title:'Test',cards}});
  await fill(['いち']);await enter();await advance(1300);await fill(['に']);await enter();await advance(1300);
  assert.match(text(renderer.toJSON()),/Đúng lần đầu: 100%/);
 });
 await test('Repeated wrong attempts then corrections cannot become 100%',async()=>{
  await render(Typing,{lesson:{id:'test',title:'Test',cards}});
  for(const answer of ['いち','に']){await fill(['まちがい']);await enter();await enter();await fill([answer]);await enter();await advance(1300)}
  assert.match(text(renderer.toJSON()),/Đúng lần đầu: 0%/);
 });
 await test('Retrying only mistaken vocabulary is a fresh scored session',async()=>{
  await render(Typing,{lesson:{id:'test',title:'Test',cards:[cards[0]]}});
  await fill(['まちがい']);await enter();await fill(['いち']);await enter();await advance(1300);
  await act(async()=>button('Luyện lại các từ chưa đúng').props.onClick());
  assert.equal(inputs()[0].props.value,'');
  await fill(['いち']);await enter();await advance(1300);assert.match(text(renderer.toJSON()),/Đúng lần đầu: 100%/);
 });
 await test('Skip does not award a first-attempt point',async()=>{
  await render(Kanji,{mode:'vocab',vocabCards:[cards[0]]});
  await act(async()=>button('Bỏ qua thẻ này').props.onClick());assert.match(text(renderer.toJSON()),/0%/);
 });
 await test('Grammar first-try correct earns 100% and manual next cancels auto-next',async()=>{
  await render(Grammar,{title:'Test',examples:[{japanese:'いちです。',vietnamese:'Là một.'},{japanese:'にです。',vietnamese:'Là hai.'}]});
  await fill(['いちです。']);await enter();await enter();await advance(1500);
  assert.ok(inputs().length);assert.match(text(renderer.toJSON()),/Là hai/);
  await fill(['にです。']);await enter();await advance(1400);assert.match(text(renderer.toJSON()),/100%/);
 });
 await test('Incoming progress at index zero restores mistake and corrected score',async()=>{
  await render(Typing,{lesson:{id:'test',title:'Test',cards}});
  await act(async()=>global.__typingSubscribers[0]({currentIndex:0,data:{cardIds:['a','b'],score:0,wrongCardIds:['a'],seconds:4}}));
  await fill(['いち']);await enter();await advance(1300);await fill(['に']);await enter();await advance(1300);
  assert.match(text(renderer.toJSON()),/Đúng lần đầu: 50%/);
 });
 await test('Resume an already accepted last card without losing or duplicating its point',async()=>{
  await render(Typing,{lesson:{id:'test',title:'Test',cards}},{currentIndex:1,cardIds:['a','b'],score:2,wrongCardIds:[],acceptedCardIds:['a','b'],scoringVersion:2,seconds:5,inputVal:'に'});
  await enter();assert.match(text(renderer.toJSON()),/Đúng lần đầu: 100%/);
 });
 await test('Remote pending success preserves the first-attempt point until manual next',async()=>{
  await render(Typing,{lesson:{id:'test',title:'Test',cards}});
  await act(async()=>global.__typingSubscribers[0]({currentIndex:1,data:{cardIds:['a','b'],score:1,wrongCardIds:['a'],acceptedCardIds:['a','b'],scoringVersion:2,seconds:4,inputVal:'に'}}));
  await enter();assert.match(text(renderer.toJSON()),/Đúng lần đầu: 50%/);
 });
 await test('Legacy first-try successes survive migration into the new persisted format',async()=>{
  await render(Typing,{lesson:{id:'test',title:'Test',cards}},{currentIndex:1,cardIds:['a','b'],score:1,wrongCardIds:[],seconds:5});
  assert.equal(global.__typingSaved.scoringVersion,2);assert.deepEqual(global.__typingSaved.acceptedCardIds,['a']);
  await fill(['に']);await enter();await advance(1300);assert.match(text(renderer.toJSON()),/Đúng lần đầu: 100%/);
 });
 Object.assign(global,originals);
 for(const r of results)console.log(r.status+' '+r.name+(r.error?'\n'+r.error:''));
 fs.mkdirSync(path.join(root,'test-results'),{recursive:true});fs.writeFileSync(path.join(root,'test-results/typing-score.json'),JSON.stringify({mode:'Actual React components and real Japanese validators; simulated timers and isolated browser/cloud/audio',results},null,2));process.exitCode=results.some(r=>r.status==='FAIL')?1:0;
})().catch(e=>{Object.assign(global,originals);console.error(e);process.exitCode=1});
