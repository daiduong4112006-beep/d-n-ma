const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),esbuild=require('esbuild');
const root=path.resolve(__dirname,'../..');
(async()=>{
 const result=await esbuild.build({entryPoints:[path.join(root,'src/utils/cloudOutbox.ts')],bundle:true,write:false,format:'iife',globalName:'api',logLevel:'silent'});
 let now=100000,email='qa@example.invalid',writes=[],fail=false;
 const values=new Map(),timers=new Map();let timerId=0;
 class Clock extends Date{static now(){return now}}
 const context=vm.createContext({Date:Clock,console,Promise,Map,Set,localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},window:{dispatchEvent(){},addEventListener(){},removeEventListener(){}},navigator:{onLine:true},CustomEvent:class{},setTimeout:(fn,ms)=>{timers.set(++timerId,{fn,at:now+ms});return timerId},clearTimeout:id=>timers.delete(id),setInterval:()=>0,clearInterval(){}});
 vm.runInContext(result.outputFiles[0].text,context);const api=context.api;
 api.configureCloudOutbox({email:()=>email,ready:()=>true,write:async item=>{writes.push(JSON.parse(JSON.stringify(item)));if(fail)throw Object.assign(Error('Quota exceeded'),{code:'resource-exhausted'});}});
 for(let n=0;n<100;n++)await api.enqueueCloudMutation(email,'study_progress/test',{email,n},true,1500);
 assert.equal(writes.length,0);assert.equal(api.getCloudSyncStatus().pending,1);assert.equal(JSON.parse(values.get('mcq_cloud_outbox_v1_'+email))[0].data.n,99);
 await api.enqueueCloudMutation(email,'user_japanese_courses/course',{email,mastered:true});
 assert.equal(writes.length,1);assert.equal(writes[0].path,'user_japanese_courses/course');
 await api.flushCloudOutbox();assert.equal(writes.length,2);assert.equal(writes[1].data.n,99);assert.equal(api.getCloudSyncStatus().pending,0);
 console.log('PASS 100 typing changes persist locally and coalesce into one cloud write; mastery sends immediately');
 fail=true;await assert.rejects(api.enqueueCloudMutation(email,'quizzes/qa',{email,title:'Offline'}));
 const atFailure=writes.length;for(let n=0;n<20;n++)await api.flushCloudOutbox();
 assert.equal(writes.length,atFailure);assert.equal(api.getCloudSyncStatus().errorCode,'resource-exhausted');assert.ok(api.getCloudSyncStatus().retryAt>now);assert.equal(api.getCloudSyncStatus().pending,1);
 api.cloudIdentityChanged();await api.flushCloudOutbox();assert.equal(writes.length,atFailure);
 console.log('PASS quota pauses repeated retries and survives identity refresh without deleting pending data');
 fail=false;
 await api.enqueueCloudMutation(email,'study_progress/dual',{email,key:'typing',data:{currentIndex:2}},true,0,'supabase');
 assert.equal(writes.at(-1).backend,'supabase');assert.equal(api.getCloudSyncStatus().pending,1);
 console.log('PASS Firebase quota cannot block Supabase writes or erase unsent Firebase data');
 now+=15*60*1000+1;await api.flushCloudOutbox();assert.equal(api.getCloudSyncStatus().pending,0);assert.equal(api.getCloudSyncStatus().errorCode,'');
 console.log('PASS queued change resumes after quota cooldown and is removed only after server acknowledgement');
 let file=fs.readFileSync(path.join(root,'src/lib/cloud.ts'),'utf8');assert.ok(file.includes('const {seconds,savedAt,updatedAt,...content}=data'));assert.ok(file.includes('delayMs: progressKey.startsWith'));
})().catch(e=>{console.error(e);process.exitCode=1});
