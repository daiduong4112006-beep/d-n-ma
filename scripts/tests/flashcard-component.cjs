const fs=require('fs'),path=require('path'),Module=require('module'),assert=require('assert/strict');
const esbuild=require('esbuild');
const runtime=process.env.SYNC_TEST_RUNTIME || path.resolve(__dirname,'../../node_modules');const React=require(runtime+'/react');const {create,act}=require(runtime+'/react-test-renderer');
const root=path.resolve(__dirname,'../..');const filename=root+'/src/components/japanese/JapaneseFlashcardMode.tsx';
const source=fs.readFileSync(filename,'utf8');const icons=source.match(/import\s*\{([\s\S]*?)\}\s*from 'lucide-react'/)[1].split(',').map(x=>x.trim()).filter(x=>/^\w+$/.test(x));
global.IS_REACT_ACT_ENVIRONMENT=true;const data=new Map();global.localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};global.window={addEventListener(){},removeEventListener(){}};
global.__savedProgress=null;global.__subscribers=[];
const mock={
 'lucide-react':icons.map(n=>`export const ${n}=()=>null;`).join('\n'),
 '../../utils/japaneseKana':`export const speakJapanese=()=>{};export const katakanaToHiragana=x=>x;`,
 '../../utils/audio':`export const sound={isEnabled:()=>false,setEnabled(){},playFlip(){},playClick(){},playCorrect(){}};`,
 '../../utils/studyProgressStorage':`export const getFlashcardProgress=()=>global.__savedProgress;export const saveFlashcardProgress=(id,data)=>{global.__savedProgress=data};export const clearFlashcardProgress=()=>{global.__savedProgress=null};`,
 '../../utils/realtimeSync':`export const realtimeSync={subscribeKey(type,key,callback){global.__subscribers.push(callback);return()=>{global.__subscribers=global.__subscribers.filter(x=>x!==callback)}}};`,
};
(async()=>{
 fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
 const result=await esbuild.build({entryPoints:[filename],bundle:true,write:false,platform:'node',nodePaths:[runtime],format:'cjs',logLevel:'silent',plugins:[{name:'component-unit-mocks',setup(b){b.onResolve({filter:/.*/},a=>{if(a.path==='react')return {path:runtime+'/react/index.js',external:true};if(a.path in mock)return{path:a.path,namespace:'mock'};});b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:mock[a.path],loader:'js'}));}}]});
 const mod=new Module(path.resolve('work/flashcard-compiled.cjs'),module);mod.filename=path.resolve('work/flashcard-compiled.cjs');mod.paths=module.paths;mod._compile(result.outputFiles[0].text,mod.filename);const Component=mod.exports.JapaneseFlashcardMode;
 const text=node=>node==null?'':typeof node==='string'?node:Array.isArray(node)?node.map(text).join(''):text(node.children);
 const cases=[];let renderer;const base={id:'test-lesson',title:'Test',cards:[{id:'a',term:'一',reading:'いち',definition:'Một',mastered:false},{id:'b',term:'二',reading:'に',definition:'Hai',mastered:false}]};
 const render=async(lesson,saved=null,callback=()=>{})=>{global.__savedProgress=saved;await act(async()=>{renderer=create(React.createElement(Component,{lesson,onExit(){},onCardMastered:callback}))});};
 const button=label=>renderer.root.findAllByType('button').find(b=>text(b.children).includes(label));
 async function test(name,fn){try{await fn();cases.push({name,status:'PASS'})}catch(e){cases.push({name,status:'FAIL',error:e.stack})}finally{if(renderer){await act(async()=>renderer.unmount());renderer=null}global.__subscribers=[];global.__savedProgress=null;}}
 await test('Flashcard actual component restores saved index zero and mastered card',async()=>{const lesson=structuredClone(base);lesson.cards[0].mastered=true;await render(lesson,{currentIndex:0,cardIds:['a','b'],masteredIds:['a'],direction:'jp-to-vi'});assert.ok(button('✓ Đã thuộc'));assert.ok(text(renderer.toJSON()).includes('いち'))});
 await test('Flashcard actual component applies a remote unmark through updated course props',async()=>{const lesson=structuredClone(base);lesson.cards[0].mastered=true;await render(lesson);const fresh=structuredClone(base);await act(async()=>renderer.update(React.createElement(Component,{lesson:fresh,onExit(){}})));assert.ok(button('Đánh dấu đã thuộc'))});
 await test('Flashcard actual component updates when a card is deleted remotely',async()=>{await render(structuredClone(base));const fresh=structuredClone(base);fresh.cards=[];await act(async()=>renderer.update(React.createElement(Component,{lesson:fresh,onExit(){}})));assert.ok(text(renderer.toJSON()).includes('Không có thẻ nào'))});
 await test('Flashcard actual component mark callback does not mutate parent props',async()=>{const lesson=structuredClone(base);let change;await render(lesson,null,(id,mastered)=>{change={id,mastered}});await act(async()=>button('Đánh dấu đã thuộc').props.onClick());assert.deepEqual(change,{id:'a',mastered:true});assert.equal(lesson.cards[0].mastered,false)});
 await test('Flashcard actual component reflects incoming empty masteredIds at index zero',async()=>{const lesson=structuredClone(base);lesson.cards[0].mastered=true;await render(lesson);await act(async()=>global.__subscribers[0]({currentIndex:0,data:{masteredIds:[]}}));assert.ok(button('Đánh dấu đã thuộc'))});
 for(const c of cases)console.log(c.status+' '+c.name+(c.error?'\n'+c.error:''));fs.writeFileSync(path.join(root,'test-results/sync-component.json'),JSON.stringify({mode:'actual React component mounted with test renderer; browser/cloud adapters mocked',cases},null,2));process.exitCode=cases.some(x=>x.status==='FAIL')?1:0;
})();
