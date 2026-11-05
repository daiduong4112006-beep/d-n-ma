const path=require('node:path'),assert=require('node:assert/strict'),esbuild=require('esbuild'),React=require('react'),{create,act}=require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT=true;
global.__shareQA={failSave:false,failClipboard:true,prompts:0};
global.window={location:{origin:'https://qa.test',pathname:'/'},prompt(){global.__shareQA.prompts++}};
Object.defineProperty(global,'navigator',{configurable:true,value:{clipboard:{writeText:async()=>{if(global.__shareQA.failClipboard)throw Error('blocked')}}}});
const root=path.resolve(__dirname,'../..'),file=path.join(root,'test-results/share-modal.cjs');
const text=n=>n==null?'':typeof n==='string'?n:Array.isArray(n)?n.map(text).join(''):text(n.children);
(async()=>{
 await esbuild.build({entryPoints:[path.join(root,'src/components/ShareQuizModal.tsx')],bundle:true,platform:'node',packages:'external',format:'cjs',outfile:file,plugins:[{name:'cloud',setup(b){b.onResolve({filter:/lib\/cloud$/},()=>({path:'cloud',namespace:'qa'}));b.onLoad({filter:/.*/,namespace:'qa'},()=>({contents:`export const createOrUpdateSharedQuiz=async()=>{if(global.__shareQA.failSave)throw Error('offline');return 'qa-share'};export const getSharedQuizMeta=async()=>({views:2,saves:1,classMode:false});export const getSharedResults=async()=>[];`}));}}]});
 const {ShareQuizModal}=require(file);let view;
 await act(async()=>{view=create(React.createElement(ShareQuizModal,{isOpen:true,onClose(){},quiz:{id:'qa',title:'QA',questions:[]}}))});
 const button=t=>view.root.findAllByType('button').find(b=>text(b.children)===t);
 await act(async()=>button('Sao chép').props.onClick());assert.equal(global.__shareQA.prompts,1);assert.equal(button('Đã chép'),undefined);console.log('PASS blocked clipboard opens manual copy without claiming success');
 global.__shareQA.failClipboard=false;await act(async()=>button('Sao chép').props.onClick());assert.ok(button('Đã chép'));console.log('PASS successful clipboard copy reports completion');
 global.__shareQA.failSave=true;await act(async()=>view.root.findByType('select').props.onChange({target:{value:'1'}}));assert.match(text(view.toJSON()),/Chưa lưu được tùy chọn/);assert.equal(view.root.findByType('select').props.disabled,false);assert.equal(view.root.findByType('select').props.value,'0');console.log('PASS failed share option update stays unchanged and allows retry');
 global.__shareQA.failSave=false;await act(async()=>view.root.findByType('select').props.onChange({target:{value:'1'}}));assert.doesNotMatch(text(view.toJSON()),/Chưa lưu được tùy chọn/);console.log('PASS retry clears the previous option error');
 await act(async()=>view.unmount());
})().catch(e=>{console.error(e);process.exitCode=1});
