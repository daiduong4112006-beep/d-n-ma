const path=require('node:path'),assert=require('node:assert/strict'),esbuild=require('esbuild'),React=require('react'),{create,act}=require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT=true;global.__toggleQA={progress:{currentIndex:0,knownQuestionIds:['a'],updatedAt:1},marks:[],remote:null};
global.document={addEventListener(){},removeEventListener(){},visibilityState:'visible'};global.window={addEventListener(){},removeEventListener(){}};
const mocks={
 '../utils/storage':`const s=global.__toggleQA;export const getFlashcardProgress=()=>s.progress;export const saveFlashcardProgress=(id,p)=>{s.progress=p};export const markQuestionMastered=(...args)=>s.marks.push(args);export const getCurrentUserEmail=()=> 'qa@example.com';`,
 '../lib/cloud':`export const subscribeFlashcardProgress=(e,id,fn)=>{global.__toggleQA.remote=fn;return()=>{}};`,
 '../utils/realtimeSync':`export const realtimeSync={getLatestState:()=>null,subscribeKey:()=>()=>{}};`,
 '../utils/audio':`export const sound={playCorrect(){},playFlip(){}};`,
 './ClickableText':`export const ClickableText=()=>null;`,
 './AiQuestionModal':`export const AiQuestionModal=()=>null;`
};
(async()=>{const root=path.resolve(__dirname,'../..'),file=path.join(root,'test-results/mcq-toggle.cjs');await esbuild.build({entryPoints:[path.join(root,'src/components/FlashcardViewer.tsx')],bundle:true,platform:'node',packages:'external',format:'cjs',outfile:file,plugins:[{name:'mocks',setup(b){b.onResolve({filter:/.*/},a=>a.path in mocks?{path:a.path,namespace:'qa'}:undefined);b.onLoad({filter:/.*/,namespace:'qa'},a=>({contents:mocks[a.path]}));}}]});
 const {FlashcardViewer}=require(file);let view,finished=0;const q={id:'a',question:'QA',options:['A','B'],correctAnswer:0,explanation:'QA',mastered:true};await act(async()=>{view=create(React.createElement(FlashcardViewer,{quizId:'q',questions:[q],onFinish(){finished++}}))});const toggle=()=>view.root.findAllByType('button').find(x=>'aria-pressed' in x.props);
 assert.equal(toggle().props['aria-pressed'],true);await act(async()=>toggle().props.onClick());assert.deepEqual(global.__toggleQA.progress.knownQuestionIds,[]);assert.deepEqual(global.__toggleQA.marks.at(-1),['q','a',false]);assert.equal(finished,0);assert.equal(toggle().props['aria-pressed'],false);assert.equal(q.mastered,true);console.log('PASS known card can be unmarked, saved immediately and does not mutate props or advance');
 await act(async()=>toggle().props.onClick());assert.deepEqual(global.__toggleQA.progress.knownQuestionIds,['a']);assert.deepEqual(global.__toggleQA.marks.at(-1),['q','a',true]);assert.equal(finished,1);console.log('PASS unmarked card can be marked again and retains next-card behavior');
 await act(async()=>global.__toggleQA.remote({currentIndex:0,knownQuestionIds:[],updatedAt:Date.now()+100}));assert.equal(toggle().props['aria-pressed'],false);await act(async()=>toggle().props.onClick());assert.deepEqual(global.__toggleQA.progress.knownQuestionIds,['a']);console.log('PASS local action after remote update is persisted rather than skipped');
 await act(async()=>view.unmount());
})().catch(e=>{console.error(e);process.exitCode=1});
