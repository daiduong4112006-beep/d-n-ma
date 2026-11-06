function runNotebook(){
const C=JSON.parse(document.getElementById('content').textContent);
const NOTES=JSON.parse(document.getElementById('notes').textContent);
const D=C.data, IDX=C.index;
const ANS=JSON.parse(document.getElementById('answers').textContent);
const $=s=>document.querySelector(s);
const store={get:(k,d)=>window.__notebookState[k]??d,set:(k,v)=>{window.__notebookState[k]=v;window.__queueNotebookChange()}};
let subj=document.body.dataset.subject, cur=store.get('ch_'+subj,null);
let done=store.get('done',{}), picks=store.get('picks',{});
const SNAME={MAI391:'MAI391 · Toán cho Machine Learning',MAS291:'MAS291 · Xác suất thống kê'};

function typeset(el){
  if(!window.MathJax||!MathJax.typesetPromise){setTimeout(()=>typeset(el),300);return}
  MathJax.typesetPromise([el]).catch(()=>{});
}
function chapters(){return D[subj]}
function progress(c){let n=0;for(let i=1;i<=c.q;i++){if(done[`${subj}-${c.num}-q${i}`])n++}return n}
function renderRail(){
  $('#subjname').textContent=SNAME[subj];
  const ul=$('#chlist');ul.innerHTML='';
  let tAll=0,tDone=0;
  chapters().forEach(c=>{
    const li=document.createElement('li'),b=document.createElement('button');
    b.type='button';b.dataset.ch=c.num;
    const p=progress(c);tAll+=c.q||0;tDone+=p;
    const pct=c.q?Math.round(100*p/c.q):0, full=c.q&&p===c.q;
    b.innerHTML=`<span class="bub${full?' full':''}" style="--p:${pct}"><i>${c.num}</i></span><span class="t">${c.short}<span class="pg${full?' full':''}">${c.q?p+' / '+c.q+' câu':'Bài tập tự soạn'}</span></span>`;
    if(String(c.num)===String(cur))b.setAttribute('aria-current','true');
    b.onclick=()=>{open(c.num);closeNav()};
    li.appendChild(b);ul.appendChild(li);
  });
  const sep=document.createElement('li');sep.className='sep';ul.appendChild(sep);
  const li=document.createElement('li'),b=document.createElement('button');
  b.type='button';b.innerHTML=`<span class="bub warn" style="--p:0"><i>!</i></span><span class="t">Câu và ảnh còn thiếu<span class="pg">Danh sách kiểm tra</span></span>`;
  if(cur==='notes')b.setAttribute('aria-current','true');
  b.onclick=()=>{open('notes');closeNav()};li.appendChild(b);ul.appendChild(li);
  $('#tdone').textContent=tDone;$('#tall').textContent=tAll;
  document.querySelectorAll('.seg button').forEach(x=>x.setAttribute('aria-pressed',x.dataset.s===subj?'true':'false'));
}
let tocLinks=[];
function renderToc(c){
  tocLinks=[];
  ['#toc','#tocm'].forEach(sel=>{
    const t=$(sel);t.innerHTML='';if(!c)return;
    c.toc.forEach(([lv,txt,id])=>{
      const li=document.createElement('li'),a=document.createElement('a');
      a.href='#';a.textContent=txt.replace(/^PHẦN \d+\.\s*/,m=>m.replace('PHẦN','Phần'));a.className=lv==='h1'?'l1':'';a.dataset.id=id;
      a.onclick=e=>{e.preventDefault();const el=document.getElementById(id);if(el){el.scrollIntoView({behavior:'smooth',block:'start'})}closeNav()};
      li.appendChild(a);t.appendChild(li);tocLinks.push(a);
    });
  });
}
function setBankCount(d){
  const ids=[...d.querySelectorAll('p.qh')].map(p=>p.id);const n=ids.filter(i=>done[i]).length;
  let s=d.querySelector('.bdone');if(!s){s=document.createElement('span');s.className='bdone';d.querySelector('summary .cnt').before(s)}
  s.textContent=n?`đã làm ${n}`:'';
}
function chapterMeter(){
  const c=chapters().find(x=>String(x.num)===String(cur));if(!c||!c.q)return;
  const p=progress(c),m=$('#cmeter'),t=$('#cprog');
  if(m)m.style.width=(100*p/c.q)+'%';if(t)t.textContent=p+' / '+c.q;
}
let curQ=null;
function renderBoard(){
  const body=$('#qbody'),c=chapters().find(x=>String(x.num)===String(cur));
  if(!c){$('#qbt').textContent='Bảng câu';$('#qbn').textContent='';body.innerHTML='<p class="qempty">Chọn một chương để xem bảng câu.</p>';return}
  $('#qbt').textContent='Bảng câu · Chương '+c.num;
  if(!c.q){$('#qbn').textContent='';body.innerHTML='<p class="qempty">Chương này không có câu đề thật, chỉ có câu luyện tập tự soạn.</p>';return}
  $('#qbn').textContent=c.q+' câu';
  let n={ok:0,bad:0,rev:0,done:0},cells='';
  for(let i=1;i<=c.q;i++){const id=`${subj}-${c.num}-q${i}`,v=done[id];let cl='';
    if(v==='ok'||v==='bad'||v==='rev'){cl='st-'+v;n[v]++}else if(v){cl='st-done';n.done++}
    cells+=`<button type="button" data-q="${id}" class="${cl}${id===curQ?' here':''}" title="Câu ${i}">${i}</button>`}
  const left=c.q-n.ok-n.bad-n.rev-n.done,pc=k=>(100*k/c.q)+'%';
  body.innerHTML=`<div class="qgrid">${cells}</div>
    <div class="qbar" aria-hidden="true"><i style="width:${pc(n.ok)};background:var(--st-ok)"></i><i style="width:${pc(n.bad)};background:var(--st-bad)"></i><i style="width:${pc(n.rev)};background:var(--st-rev)"></i><i style="width:${pc(n.done)};background:var(--pen)"></i></div>
    <div class="qsum"><div class="k-ok"><b>${n.ok}</b>Đúng</div><div class="k-bad"><b>${n.bad}</b>Sai</div><div class="k-rev"><b>${n.rev}</b>Cần ôn</div><div><b>${left}</b>Chưa chấm</div></div>
    <div class="qlegend"><span style="--c:var(--st-ok)">Đúng</span><span style="--c:var(--st-bad)">Sai</span><span style="--c:var(--st-rev)">Cần ôn</span></div>`;
  body.querySelectorAll('.qgrid button').forEach(b=>b.onclick=()=>{jump(b.dataset.q);closeNav()});
}
function jump(id){const el=document.getElementById(id);if(!el)return;const d=el.closest('details');if(d)d.open=true;
  el.scrollIntoView({block:'start',behavior:'smooth'});el.classList.remove('flash');void el.offsetWidth;el.classList.add('flash')}
function decorate(root){
  root.querySelectorAll('p.qh').forEach(p=>{
    const id=p.id,g=document.createElement('span');g.className='qst';g.setAttribute('role','group');g.setAttribute('aria-label','Tự chấm câu này');
    const sync=()=>g.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',done[id]===x.dataset.v?'true':'false'));
    const hasA=!!ANS[id];
    (hasA?[['rev','Cần ôn']]:[['ok','Đúng'],['bad','Sai'],['rev','Cần ôn']]).forEach(([v,t])=>{const x=document.createElement('button');x.type='button';x.className='s-'+v;x.dataset.v=v;x.textContent=t;
      x.onclick=()=>{if(done[id]===v)delete done[id];else done[id]=v;store.set('done',done);sync();renderRail();chapterMeter();renderBoard();const d=p.closest('details.bank');if(d)setBankCount(d)};g.appendChild(x)});
    sync();p._sync=sync;p.appendChild(g);
  });
  // đáp án A–E thành ô tô (chỉ để đánh dấu lựa chọn của mình, không có đáp án)
  const qOf=ul=>{let el=ul.previousElementSibling;while(el){if(el.matches&&el.matches('p.qh'))return el.id;el=el.previousElementSibling}return null};
  const firstText=li=>{let f=li.firstChild;while(f&&f.nodeType===3&&!f.nodeValue.trim())f=f.nextSibling;if(f&&f.nodeType===1&&f.tagName==='P')f=f.firstChild;return f&&f.nodeType===3?f:null};
  const RX={L:/^\s*([A-E])\.\s+/,R:/^\s*(?:\((i{1,3}|iv|vi?)\)|(i{1,3}|iv|vi?)\.)\s+/};
  const hasL=new Set();
  root.querySelectorAll('.bank-body ul').forEach(ul=>{const q=qOf(ul);if(q&&[...ul.children].some(li=>{const f=firstText(li);return f&&RX.L.test(f.nodeValue)}))hasL.add(q)});
  root.querySelectorAll('.bank-body ul').forEach(ul=>{
    const qid=qOf(ul);
    const mode=qid&&hasL.has(qid)?'L':(qid&&ANS[qid]&&!/^[A-E]$/.test(ANS[qid][0])?'R':'');
    if(!mode)return;
    ul.querySelectorAll(':scope > li').forEach(li=>{
      const f=firstText(li);if(!f)return;
      const m=f.nodeValue.match(RX[mode]);if(!m)return;
      m[1]=m[1]||m[2];
      f.nodeValue=f.nodeValue.slice(m[0].length);
      const L=m[1],ot=document.createElement('span');ot.className='ot';
      while(li.firstChild)ot.appendChild(li.firstChild);
      const ob=document.createElement('button');ob.type='button';ob.className='ob';ob.textContent=L;
      ob.setAttribute('aria-label','Chọn '+L);
      const key=qid?qid:null;
      ob.onclick=()=>{if(!key)return;const A=ANS[key];
        if(A){if(picks[key])return;picks[key]=L;done[key]=L===A[0]?'ok':'bad';store.set('done',done)}
        else{picks[key]=picks[key]===L?undefined:L;if(!picks[key])delete picks[key]}
        store.set('picks',picks);ul._show&&ul._show(true)};
      li.classList.add('opt');li.appendChild(ob);li.appendChild(ot);
    });
    if(!ul.querySelector('.ob')||!qid)return;
    const key=qid,qp=document.getElementById(qid)||root.querySelector('#'+CSS.escape(qid));
    const upd=()=>{qp&&qp._sync&&qp._sync();renderRail();chapterMeter();renderBoard();const d=ul.closest('details.bank');if(d)setBankCount(d)};
    ul._show=(fresh)=>{const A=ANS[key],pk=picks[key];
      ul.querySelectorAll('.ob').forEach(o=>{const L=o.textContent;
        o.setAttribute('aria-pressed',pk===L?'true':'false');
        o.classList.toggle('right',!!(A&&pk&&L===A[0]));o.classList.toggle('wrong',!!(A&&pk&&L===pk&&pk!==A[0]));
        o.classList.toggle('dim',!!(A&&pk&&L!==A[0]&&L!==pk))});
      ul.classList.toggle('locked',!!(A&&pk));
      let ex=ul.nextElementSibling;if(!(ex&&ex.classList&&ex.classList.contains('ansx'))){ex=null}
      if(!(A&&pk)){if(ex)ex.remove();if(fresh!==undefined)upd();return}
      if(!ex){ex=document.createElement('div');ul.after(ex)}
      const ok=pk===A[0];ex.className='ansx '+(ok?'ok':'bad');
      ex.innerHTML=`<div class="v">${ok?'Đúng rồi':'Chưa đúng · đáp án '+(/^[A-E]$/.test(A[0])?A[0]:'('+A[0]+')')}${A[2]?'':'<span class="unsure">đáp án tự giải, chưa chắc</span>'}</div><div class="why">${A[1]}</div><button type="button" class="redo">Làm lại câu này</button>`;
      ex.querySelector('.redo').onclick=()=>{delete picks[key];if(done[key]==='ok'||done[key]==='bad')delete done[key];store.set('picks',picks);store.set('done',done);ul._show(true)};
      if(fresh){typeset(ex)}
      if(fresh!==undefined)upd()};
    ul._show();
  });
  root.querySelectorAll('details.bank').forEach(d=>{
    setBankCount(d);
    d.addEventListener('toggle',()=>{if(d.open&&!d.dataset.ts){d.dataset.ts=1;typeset(d.querySelector('.bank-body'))}});
  });
}
function open(num,thenId){
  cur=num;store.set('ch_'+subj,num);
  const doc=$('#doc');
  if(num==='notes'){
    doc.innerHTML=`<article class="page notes">${NOTES[subj]}</article>`;renderToc(null);renderRail();renderBoard();window.scrollTo(0,0);return;
  }
  const list=chapters();
  const i=Math.max(0,list.findIndex(x=>String(x.num)===String(num)));const c=list[i];
  cur=c.num;store.set('ch_'+subj,c.num);
  const p=progress(c);
  const nh2=c.toc.filter(t=>t[0]==='h2').length;
  const stats=c.q?`<span class="chip prog">Đã làm <b id="cprog">${p} / ${c.q}</b></span><span class="chip"><b>${c.q}</b> câu đề thật</span>`:`<span class="chip">Câu luyện tập tự soạn, đáp án cuối chương</span>`;
  const prev=list[i-1],next=list[i+1];
  doc.innerHTML=`<article class="page"><header class="chead"><div class="num">${c.num}</div><div class="k">${subj} · Chương ${c.num}</div><h1>${c.short}</h1>${c.sub?`<p class="sub">${c.sub}</p>`:''}<div class="cstats">${stats}<span class="chip"><b>${nh2}</b> mục và dạng bài</span></div>${c.q?`<div class="meter"><span id="cmeter" style="width:${100*p/c.q}%"></span></div>`:''}</header>${c.html}</article>`+
    `<nav class="pager" aria-label="Chuyển chương">${prev?`<button type="button" data-go="${prev.num}"><small>← Chương ${prev.num}</small><span>${prev.short}</span></button>`:''}${next?`<button type="button" class="nx" data-go="${next.num}"><small>Chương ${next.num} →</small><span>${next.short}</span></button>`:''}</nav>`;
  doc.querySelectorAll('.pager button').forEach(b=>b.onclick=()=>open(b.dataset.go));
  curQ=null;decorate(doc);renderToc(c);renderRail();renderBoard();
  const art=doc.querySelector('.page'),tmp=[];
  art.querySelectorAll(':scope > *').forEach(el=>{if(!el.matches('details.bank'))tmp.push(el)});
  const banks=[...art.querySelectorAll('details.bank')];
  banks.forEach(d=>{d.open=true;d.dataset.ts=1});
  const tsAll=()=>{if(!(window.MathJax&&MathJax.typesetPromise)){setTimeout(tsAll,300);return}
    let pr=MathJax.typesetPromise(tmp).catch(()=>{});
    banks.forEach(d=>{pr=pr.then(()=>MathJax.typesetPromise([d.querySelector('.bank-body')])).catch(()=>{})});};
  tsAll();
  if(thenId){
    const el=document.getElementById(thenId);
    if(el){const d=el.closest('details');if(d){d.open=true}
      setTimeout(()=>{el.scrollIntoView({block:'center'});el.classList.add('flash')},60)}
  } else window.scrollTo(0,0);
  onScroll();
}
document.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{
  subj=b.dataset.s;store.set('subj',subj);cur=store.get('ch_'+subj,chapters()[0].num);renderRail();open(cur);
  $('#q').value='';$('#results').hidden=true;
});
$('#home').onclick=e=>{e.preventDefault();open(chapters()[0].num)};
// xóa đánh dấu: bấm 2 lần để xác nhận
let armT;$('#reset').onclick=e=>{const b=e.currentTarget;
  if(!b.classList.contains('arm')){b.classList.add('arm');b.textContent='Bấm lần nữa để xóa';clearTimeout(armT);armT=setTimeout(()=>{b.classList.remove('arm');b.textContent='Xóa đánh dấu'},3000);return}
  Object.keys(done).forEach(k=>{if(k.startsWith(subj+'-'))delete done[k]});Object.keys(picks).forEach(k=>{if(k.startsWith(subj+'-'))delete picks[k]});
  store.set('done',done);store.set('picks',picks);b.classList.remove('arm');b.textContent='Đã xóa';setTimeout(()=>b.textContent='Xóa đánh dấu',1500);open(cur)};
// tìm kiếm
const norm=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
const IDXN=IDX.map(x=>({...x,n:norm(x.h+' '+x.t+' '+x.d)}));
let st;
$('#q').addEventListener('input',e=>{clearTimeout(st);st=setTimeout(()=>search(e.target.value),120)});
$('#q').addEventListener('keydown',e=>{if(e.key==='Escape'){$('#results').hidden=true;e.target.blur()}
  if(e.key==='ArrowDown'){const f=$('#results button');if(f){e.preventDefault();f.focus()}}});
$('#results').addEventListener('keydown',e=>{const a=e.target;if(e.key==='ArrowDown'&&a.nextElementSibling){e.preventDefault();a.nextElementSibling.focus()}
  if(e.key==='ArrowUp'){e.preventDefault();(a.previousElementSibling||$('#q')).focus()}});
document.addEventListener('click',e=>{if(!e.target.closest('.search'))$('#results').hidden=true});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){e.preventDefault();$('#q').focus()}});
function esc(s){return s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}
function search(v){
  const r=$('#results');v=v.trim();
  if(v.length<2){r.hidden=true;return}
  const terms=norm(v).split(/\s+/).filter(Boolean);
  const hits=IDXN.filter(x=>x.s===subj&&terms.every(t=>x.n.includes(t))).slice(0,40);
  r.innerHTML=hits.length?'':`<div class="none">Không thấy câu nào chứa “${esc(v)}” trong ${subj}. Thử bỏ dấu hoặc đổi môn.</div>`;
  hits.forEach(h=>{
    const b=document.createElement('button');b.type='button';
    let snip=h.t.replace(/\\[a-zA-Z]+|[{}$]/g,' ').replace(/\s+/g,' ').slice(0,150);
    b.innerHTML=`<div class="meta">Chương ${h.c} · ${esc(h.d)}</div><div>${esc(h.h.replace(/Đánh dấu.*$/,''))}: ${esc(snip)}…</div>`;
    b.onclick=()=>{r.hidden=true;open(h.c,h.id)};r.appendChild(b);
  });
  r.hidden=false;
}
// ngăn kéo mục lục trên điện thoại
function closeNav(){$('#rail').classList.remove('open');$('#scrim').hidden=true;$('#navbtn').setAttribute('aria-expanded','false')}
$('#navbtn').onclick=()=>{const o=$('#rail').classList.toggle('open');$('#scrim').hidden=!o;$('#navbtn').setAttribute('aria-expanded',o?'true':'false')};
$('#scrim').onclick=closeNav;
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeNav()});
// cuộn: thanh đọc, nút lên đầu, mục lục đang xem
let raf=0;function onScroll(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;
  const h=document.documentElement,max=h.scrollHeight-innerHeight;$('#readbar').style.width=(max>0?100*scrollY/max:0)+'%';
  $('#totop').hidden=scrollY<900;
  let on=null;const y=parseFloat(getComputedStyle(h).scrollPaddingTop)||80;
  for(const a of tocLinks){const el=document.getElementById(a.dataset.id);if(el&&el.getBoundingClientRect().top<=y+10)on=a.dataset.id}
  tocLinks.forEach(a=>a.classList.toggle('on',a.dataset.id===on));
  let q=null;for(const p of document.querySelectorAll('#doc p.qh')){if(p.getBoundingClientRect().top<=y+40)q=p.id;else break}
  if(q!==curQ){curQ=q;document.querySelectorAll('.qgrid button').forEach(b=>{const h=b.dataset.q===q;b.classList.toggle('here',h);if(h&&b.parentElement.scrollHeight>b.parentElement.clientHeight){const g=b.parentElement,t=b.offsetTop-g.offsetTop;if(t<g.scrollTop||t>g.scrollTop+g.clientHeight-40)g.scrollTop=t-60}})}
})}
addEventListener('scroll',onScroll,{passive:true});
$('#totop').onclick=()=>scrollTo({top:0,behavior:'smooth'});
// giao diện
$('#theme').onclick=()=>{const r=document.documentElement;const dark=r.dataset.theme?r.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;r.dataset.theme=dark?'light':'dark';store.set('theme',r.dataset.theme)};
const th=store.get('theme',null);if(th)document.documentElement.dataset.theme=th;
const hs='';const m=hs.match(/^(MAI391|MAS291)-(\w+)$/);
if(m){subj=m[1];cur=m[2]}
if(!cur)cur=chapters()[0].num;
window.__applyNotebookPatch=(id,value)=>{
  if(!window.__notebookIds.has(id))return;
  if(value.done)done[id]=value.done;else delete done[id];
  if(value.pick)picks[id]=value.pick;else delete picks[id];
  document.querySelectorAll('#doc p.qh').forEach(p=>p._sync&&p._sync());
  document.querySelectorAll('#doc .bank-body ul').forEach(ul=>ul._show&&ul._show());
  renderRail();chapterMeter();renderBoard();
  const explanations=[...document.querySelectorAll('#doc .ansx')];if(explanations.length)(window.MathJax?.typesetPromise&&window.MathJax.typesetPromise(explanations).catch(()=>{}));
};
window.__applyNotebookNavigation=num=>{if(String(cur)!==String(num))open(num)};
window.__renderNotebookExam=(id,selected,reveal)=>{
 const item=IDX.find(q=>q.id===id);if(!item)return;
 const chapter=D[subj].find(c=>String(c.num)===String(item.c));if(!chapter)return;
 const parsed=new DOMParser().parseFromString(chapter.html,'text/html');const first=parsed.getElementById(id);if(!first)return;
 const doc=$('#doc');doc.innerHTML='';const article=document.createElement('article');article.className='page exam-page';doc.appendChild(article);
 for(let el=first;el;el=el.nextElementSibling){if(el!==first&&(el.matches('p.qh,h1,h2,h3,details')||el.tagName==='HR'))break;article.appendChild(el.cloneNode(true));}
 const lis=[...article.querySelectorAll('ul>li')];const labels=lis.map(li=>li.textContent.trim().match(/^([A-E])\.\s|^\((i{1,3}|iv|vi?)\)\s|^(i{1,3}|iv|vi?)\.\s/));
 const hasLetters=labels.some(m=>m&&m[1]);
 lis.forEach((li,i)=>{const m=labels[i];if(!m||hasLetters&&!m[1])return;const label=m[1]||m[2]||m[3];const button=document.createElement('button');button.type='button';button.className='exam-option';button.setAttribute('aria-pressed',selected===label?'true':'false');button.innerHTML=li.innerHTML;
  button.disabled=!!reveal;button.onclick=()=>send('exam-answer',{id,choice:label});
  if(reveal&&ANS[id]){button.classList.toggle('exam-right',label===ANS[id][0]);button.classList.toggle('exam-wrong',label===selected&&selected!==ANS[id][0]);}
  li.innerHTML='';li.style.listStyle='none';li.appendChild(button);
 });
 if(reveal&&ANS[id]){const solution=document.createElement('div');solution.className='ansx';solution.innerHTML='<b>Đáp án: '+ANS[id][0]+'</b><div>'+ANS[id][1]+'</div>';article.appendChild(solution);}
 document.body.dataset.mode='exam';typeset(article);
};
renderRail();open(cur);
}

const protocol='dun-study-v1';
const subject=document.body.dataset.subject;
window.__notebookIds=new Set(JSON.parse(document.getElementById('content').textContent).index.map(q=>q.id));
let initialized=false,queued=false,baseline={},lastNavigation='';
const send=(kind,extra={})=>parent.postMessage({protocol,subject,kind,...extra},'*');
window.__queueNotebookChange=()=>{if(queued||!initialized)return;queued=true;queueMicrotask(()=>{
 queued=false;const state=window.__notebookState;
 for(const id of window.__notebookIds){const value={done:state.done?.[id]||null,pick:state.picks?.[id]||null};const serialized=JSON.stringify(value);
  if(serialized!==(baseline[id]||'{"done":null,"pick":null}')){baseline[id]=serialized;send('question',{id,value});}}
 const chapter=String(state['ch_'+subject]||'');if(chapter&&chapter!==lastNavigation){lastNavigation=chapter;send('navigation',{chapter});}
});};
addEventListener('message',event=>{
 if(event.source!==parent||event.data?.protocol!==protocol||event.data.subject!==subject)return;
 const m=event.data;
 if(m.kind==='init'&&!initialized){
  const done={},picks={};for(const [id,value]of Object.entries(m.questions||{})){if(!window.__notebookIds.has(id))continue;if(value.done)done[id]=value.done;if(value.pick)picks[id]=value.pick;baseline[id]=JSON.stringify({done:value.done||null,pick:value.pick||null});}
  window.__notebookState={done,picks,theme:m.theme,['ch_'+subject]:m.chapter};lastNavigation=m.chapter||'';
  document.documentElement.dataset.theme=m.theme;runNotebook();initialized=true;send('ready');
 }else if(m.kind==='question'&&initialized&&window.__notebookIds.has(m.id)){
  baseline[m.id]=JSON.stringify({done:m.value?.done||null,pick:m.value?.pick||null});window.__applyNotebookPatch(m.id,m.value||{});
 }else if(m.kind==='navigation'&&initialized){lastNavigation=m.chapter;window.__applyNotebookNavigation(m.chapter);
 }else if(m.kind==='theme'){document.documentElement.dataset.theme=m.theme;}
 else if(m.kind==='exam-view'&&initialized&&window.__notebookIds.has(m.id)){window.__renderNotebookExam(m.id,m.selected,m.reveal);}
});
send('hello');
