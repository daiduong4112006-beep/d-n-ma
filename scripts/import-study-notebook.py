"""Split a supplied study notebook into isolated subject assets; do not execute source scripts."""
import sys, re, json, hashlib
from pathlib import Path

source = Path(sys.argv[1]).read_text(encoding='utf-8')
root = Path(__file__).resolve().parents[1]
out = root / 'public' / 'study-notebooks'
out.mkdir(exist_ok=True)
scripts = list(re.finditer(r'<script\b([^>]*)>([\s\S]*?)</script\s*>', source, re.I))
assert len(scripts) == 6, 'Source format changed: inspect before importing'
content, notes, answers = [json.loads(scripts[i].group(2)) for i in range(3)]
runtime = scripts[-1].group(2).strip()
assert runtime.startswith('(function(){') and runtime.endswith('})();')
runtime = 'function runNotebook(){' + runtime[len('(function(){'):-len('})();')] + '\n}'
old_store = "const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},\n             set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};"
assert old_store in runtime
runtime = runtime.replace(old_store, "const store={get:(k,d)=>window.__notebookState[k]??d,set:(k,v)=>{window.__notebookState[k]=v;window.__queueNotebookChange()}};")
runtime = runtime.replace("let subj=store.get('subj','MAS291')", "let subj=document.body.dataset.subject")
runtime = runtime.replace("const hs=location.hash.slice(1);", "const hs='';")
runtime = runtime.replace("o.setAttribute('aria-pressed',!A&&pk===L?'true':'false')", "o.setAttribute('aria-pressed',pk===L?'true':'false')")
assert runtime.count('renderRail();open(cur);') >= 1
runtime = runtime.replace('renderRail();open(cur);\n\n}', r'''window.__applyNotebookPatch=(id,value)=>{
  if(!window.__notebookIds.has(id))return;
  if(value.done)done[id]=value.done;else delete done[id];
  if(value.pick)picks[id]=value.pick;else delete picks[id];
  document.querySelectorAll('#doc p.qh').forEach(p=>p._sync&&p._sync());
  document.querySelectorAll('#doc .bank-body ul').forEach(ul=>ul._show&&ul._show());
  renderRail();chapterMeter();renderBoard();
  const explanations=[...document.querySelectorAll('#doc .ansx')];if(explanations.length)typeset({querySelectorAll:()=>explanations});
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
}''')
# The original runtime includes no injected instructions; reviewed logic is retained.
# Remote rendering only refreshes marks/answers, never reopens the chapter or scrolls the reader.
runtime = runtime.replace("typeset({querySelectorAll:()=>explanations})", "(window.MathJax?.typesetPromise&&window.MathJax.typesetPromise(explanations).catch(()=>{}))")
bridge = r'''
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
'''
(out / 'notebook.js').write_text(runtime + '\n' + bridge, encoding='utf-8')
skin = '''<style>
.seg,#theme,.brand .mk{display:none!important}
body[data-mode="exam"] .hdr,body[data-mode="exam"] .rail,body[data-mode="exam"] .side,body[data-mode="exam"] .totop{display:none!important}body[data-mode="exam"] .wrap{display:block;padding:0}body[data-mode="exam"] .page{border:0;border-radius:0;margin:0;padding:22px!important}.exam-option{display:block;width:100%;text-align:left;padding:13px 16px;margin:8px 0;border:1px solid var(--rule);border-radius:12px;background:var(--paper);color:var(--ink);font:inherit;cursor:pointer}.exam-option[aria-pressed="true"]{border-color:var(--pen);background:var(--pen-soft)}.exam-option.exam-right{border-color:var(--ok);background:var(--ok-soft)}.exam-option.exam-wrong{border-color:var(--red);background:var(--red-soft)}.exam-page ul{padding-left:0}.exam-page .qh code,.exam-page .qh strong{display:none}
:root{--f-display:Inter,"Be Vietnam Pro",system-ui,sans-serif;--f-body:Inter,"Be Vietnam Pro",system-ui,sans-serif;--bg:#f8fafc;--paper:#fff;--sunk:#eef2ff;--ink:#172033;--muted:#64748b;--rule:#e2e8f0;--pen:#4f46e5;--grid:transparent;--shadow:none;--hdr:56px}
:root[data-theme="dark"]{--bg:#020617;--paper:#0f172a;--sunk:#1e293b;--ink:#f1f5f9;--muted:#94a3b8;--rule:#334155;--pen:#a5b4fc;--grid:transparent;--shadow:none}
body{font-size:14px;line-height:1.75}.hdr{backdrop-filter:none;background:var(--paper)}.hdr-in{padding:8px 18px}.brand b{font-size:14px}.brand small{font-size:11px}.search{max-width:440px}.wrap{max-width:1600px;gap:20px;padding:20px}.page,.sheet,.qboard{border-radius:20px;box-shadow:none}.page{border:1px solid var(--rule)}.bank{border-radius:14px}.side{font-size:12px}.chead h1{font-size:clamp(23px,3vw,32px)}.page>h1{font-size:24px}.page>h2{font-size:20px}table{max-width:100%}.doc{min-width:0;overflow-wrap:anywhere}.rail .lbl{letter-spacing:.06em}.total{gap:8px;flex-wrap:wrap}.brand{flex-shrink:1;min-width:0}.brand small{display:none}
@media(max-width:700px){.wrap{padding:12px;gap:12px}.hdr-in{padding:8px 12px}.page{padding:18px!important}.search{flex-basis:100%;max-width:none;margin:0}.search input{font-size:13px}.brand b{font-size:13px}.chead .num{font-size:40px}.side{display:none}}
</style>'''
manifest = {'sourceSha256': hashlib.sha256(source.encode()).hexdigest(), 'subjects': []}
for code, chapters in content['data'].items():
    ids = [q['id'] for q in content['index'] if q['s'] == code]
    assert len(ids) == len(set(ids)) == sum(c['q'] for c in chapters)
    for ch in chapters:
        assert not re.search(r'<script\b|\bon\w+\s*=|javascript:', ch['html'], re.I), 'Unexpected active chapter markup'
    values = [dict(data={code: chapters}, index=[q for q in content['index'] if q['s'] == code]), {code: notes[code]}, {k:v for k,v in answers.items() if k.startswith(code+'-')}]
    html = source
    for i in range(2, -1, -1):
        m = scripts[i]; html = html[:m.start(2)] + json.dumps(values[i],ensure_ascii=False).replace('</',r'<\/') + html[m.end(2):]
    # Remove executable scripts by content identity; preserve the three JSON payloads.
    html = re.sub(r'<script\b([^>]*)>([\s\S]*?)</script\s*>', lambda m: m.group(0) if 'application/json' in m.group(1) else '', html, flags=re.I)
    csp = "default-src 'none'; script-src 'nonce-dun-study-math' https://cdnjs.cloudflare.com; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'"
    html = html.replace('<head>', '<head><meta http-equiv="Content-Security-Policy" content="'+csp+'">',1)
    html = html.replace('<body>', '<body data-subject="'+code+'">',1)
    html = html.replace('</head>',skin+'</head>',1)
    # Original export closes head before app styles: skin goes last to win the cascade.
    html += skin
    html = html.replace('<b>Sổ ôn</b>', '<b>'+code+'</b>')
    html = re.sub(r'<title>.*?</title>', '<title>Sổ ôn '+code+'</title>', html, count=1)
    html += '<script nonce="dun-study-math">'+scripts[3].group(2)+'</script><script nonce="dun-study-math" src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-svg.min.js"></script><script nonce="dun-study-math" src="/study-notebooks/notebook.js"></script>'
    # Nonce permits our reviewed runtime URL while sandbox prevents access to parent/storage.
    (out / (code.lower()+'.html')).write_text(html,encoding='utf-8')
    exam=[]
    for ch in chapters:
        markers=list(re.finditer(r'<p class="qh" id="([^"]+)"',ch['html']))
        for i,marker in enumerate(markers):
            key=marker.group(1);answer=answers.get(key)
            if not answer:continue
            block=ch['html'][marker.start():markers[i+1].start() if i+1<len(markers) else len(ch['html'])]
            labels=re.findall(r'<li[^>]*>\s*(?:<p[^>]*>\s*)?(?:([A-E])\.\s|\((i{1,3}|iv|vi?)\)\s|(i{1,3}|iv|vi?)\.\s)',block)
            letters=[m[0] for m in labels if m[0]]
            choices=letters or [m[1] or m[2] for m in labels]
            item=next((q for q in content['index'] if q['id']==key),None)
            group=re.match(r'Dạng (\d+):',item['d']) if item else None
            exam.append({'id':key,'chapter':ch['num'],'answer':answer[0],'verified':bool(answer[2]) and answer[0] in choices and len(set(choices))>=2,'group':int(group.group(1)) if group else -1,'typeTitle':item['d'] if item else ''})
    manifest['subjects'].append({'code':code,'title':'Toán cho Machine Learning' if code=='MAI391' else 'Xác suất thống kê','chapters':[{'num':ch['num'],'title':ch['short'],'questions':ch['q']} for ch in chapters],'questionIds':ids,'answers':len(values[2]),'examQuestions':exam,'contentSha256':hashlib.sha256(json.dumps(values,ensure_ascii=False).encode()).hexdigest()})
(root/'src/data/studySubjects.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Imported',[(s['code'],len(s['chapters']),len(s['questionIds']),s['answers']) for s in manifest['subjects']])
