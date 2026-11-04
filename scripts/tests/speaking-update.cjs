const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const base=path.join(root,'public/jpd123-speaking');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
function boot(saved=null) {
 const store=new Map(saved?[['jpd123_v1',JSON.stringify(saved)]]:[]),nodes=new Map();
 const node=selector=>{if(!nodes.has(selector)) nodes.set(selector,{innerHTML:'',outerHTML:'',style:{},classList:{add(){},remove(){},toggle(){}},value:'',focus(){}});return nodes.get(selector)};
 const document={documentElement:{dataset:{}},querySelector:node,querySelectorAll:()=>[],getElementById:id=>node('#'+id),addEventListener(){}};
 const context=vm.createContext({document,location:{search:'?theme=dark&embed=1',hash:''},history:{replaceState(){}},window:{addEventListener(){}},URLSearchParams,
 localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},speechSynthesis:{getVoices:()=>[],cancel(){},speak(){}},SpeechSynthesisUtterance:function(t){this.text=t},
 matchMedia:()=>({matches:false}),scrollTo(){},setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},console});
 for(const script of scripts) new vm.Script(script).runInContext(context,{timeout:2000});
 return {run:code=>vm.runInContext(code,context,{timeout:2000}),get:code=>JSON.parse(vm.runInContext(`JSON.stringify(${code})`,context)),store,nodes,document};
}
let count=0;function test(name,fn){fn();count++;console.log('PASS '+name)}
test('Updated Speaking HTML boots with 29 pictures, 10 exams, and 32 priority questions',()=>{
 const app=boot();assert.equal(app.get('D.gallery.length'),29);assert.equal(app.get('D.exams.length'),10);assert.equal(app.get('D.q34.filter(q=>q.thu).length'),32);
 assert.equal(app.get('counts().pictures'),'0/29');assert.equal(app.get('counts().exam'),'0/10');assert.equal(app.document.documentElement.dataset.theme,'dark');assert.equal(app.document.documentElement.dataset.embed,'1');
 assert.ok(html.includes('id="dun-master-theme"'));assert.ok(html.includes('.rail,:root[data-embed] .bottom{display:none!important}'));
});
test('Every image reference stays within the Speaking directory and exists',()=>{
 const data=boot().get('D');let checked=0;
 function visit(value){if(!value||typeof value!=='object')return;if(typeof value.src==='string'){const target=path.resolve(base,value.src);assert.ok(target.startsWith(base+path.sep));assert.ok(fs.existsSync(target),value.src);checked++}for(const child of Object.values(value))visit(child)}
 visit(data);assert.ok(checked>=29);
});
test('Legacy picture progress follows image identity after inserted pictures; other progress is intact',()=>{
 const saved={pics:{0:1,5:1,17:1,23:1},learned:{11:1},reads:{2:1},exams:{7:90},mine:{'4-①':'My answer'}};
 const app=boot(saved);assert.deepEqual(app.get('S.pics'),{'0':1,'6':1,'21':1,'28':1});
 for(const key of ['learned','reads','exams','mine'])assert.deepEqual(app.get('S.'+key),saved[key]);
 const reloaded=boot(JSON.parse(app.store.get('jpd123_v1')));assert.deepEqual(reloaded.get('S.pics'),app.get('S.pics'));assert.equal(reloaded.get('counts().pictures'),'4/29');
});
test('All previously completed pictures remain completed, but none of the five new pictures are marked',()=>{
 const app=boot({pics:Object.fromEntries(Array.from({length:24},(_,i)=>[i,1]))});assert.equal(app.get('counts().pictures'),'24/29');
 for(const filename of ['map_rome.jpg','q_course.jpg','q_hotel.jpg','q_trans.jpg','q_living.jpg'])assert.equal(app.get(`Boolean(S.pics[D.gallery.findIndex(g=>g.imgs[0].src==='img/${filename}')])`),false);
});
test('Priority filter contains exactly the 32 marked questions',()=>{
 const app=boot();app.run("qFilter='thu';go('questions')");assert.equal((app.nodes.get('#app').innerHTML.match(/class="tile /g)||[]).length,32);
});
test('All Speaking sections and five new picture lessons render',()=>{
 const app=boot();for(const route of ['home','guide','vocab','read','questions','pictures','flash','exam','mine']){app.run(`go('${route}')`);assert.ok(app.nodes.get('#app').innerHTML.length>100,route)}
 for(const filename of ['map_rome.jpg','q_course.jpg','q_hotel.jpg','q_trans.jpg','q_living.jpg']){app.run(`go('pictures',D.gallery.findIndex(g=>g.imgs[0].src==='img/${filename}'))`);assert.ok(app.nodes.get('#app').innerHTML.includes(filename),filename)}
});
test('Two new fixed exams and a random exam progress through reading, questions, scoring and saved results',()=>{
 for(const idx of [8,9,-1]){const app=boot();app.run(`go('exam');startExam(${idx})`);assert.equal(app.get('E.pics.length'),4);app.run('E.step=1;examView()');for(let i=0;i<4;i++)app.run('E.ok++;nextQ()');assert.equal(app.get('E.step'),5);assert.ok(app.nodes.get('#app').innerHTML.includes('100%'));if(idx>=0)assert.equal(app.get(`S.exams[${idx}]`),100)}
});
console.log(`${count} Speaking update tests passed.`);
