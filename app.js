'use strict';
const LSB_URL='https://raw.githubusercontent.com/Beblia/Holy-Bible-XML-Format/master/EnglishLSBBible.xml';
const LSB_SIZE=5168207;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const PROSE=new Set(['walker','james','mattison','robinson']);
let cat, prefs, marks, cur={book:'JHN',ch:0,tr:null,tr2:null,compare:false};
const cache=new Map();
// ---------- storage ----------
const loadJ=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}};
const savePrefs=()=>localStorage.setItem('br.prefs',JSON.stringify(prefs));
const saveMarks=()=>localStorage.setItem('br.marks',JSON.stringify(marks));
function idb(){return new Promise((res,rej)=>{const r=indexedDB.open('bible-reader',1);r.onupgradeneeded=()=>r.result.createObjectStore('lsb');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function idbGet(k){const db=await idb();return new Promise((res,rej)=>{const q=db.transaction('lsb').objectStore('lsb').get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
async function idbPutMany(obj){const db=await idb();return new Promise((res,rej)=>{const tx=db.transaction('lsb','readwrite');const st=tx.objectStore('lsb');for(const[k,v]of Object.entries(obj))st.put(v,k);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}
async function idbClear(){const db=await idb();return new Promise(res=>{const tx=db.transaction('lsb','readwrite');tx.objectStore('lsb').clear();tx.oncomplete=()=>res()})}
// ---------- data ----------
const P66=()=>cat.tabs[0].groups.flatMap(g=>g.items.map(i=>i.id));
async function getData(tr,book){
  const key=tr+'/'+book; if(cache.has(key))return cache.get(key);
  let p;
  if(tr==='lsb') p=idbGet('b:'+book).then(c=>({c}));
  else p=fetch('data/'+key+'.json').then(r=>{if(!r.ok)throw new Error(r.status);return r.json()});
  cache.set(key,p); p.catch(()=>cache.delete(key)); return p;
}
function trsFor(book){const b=cat.books[book];if(!b)return[];const have=Object.keys(b.tr);return cat.pref.filter(t=>have.includes(t)).concat(have.filter(t=>!cat.pref.includes(t)))}
function resolveTr(book,want){const t=trsFor(book);return t.includes(want)?want:(t.includes(prefs.defTr)?prefs.defTr:t[0])}
async function enableLsb(){
  const meta=await idbGet('meta').catch(()=>null); if(!meta)return false;
  cat.translations.lsb={name:'Legacy Standard Bible',short:'LSB',license:'© 2021 The Lockman Foundation. Loaded into this browser only from the Beblia XML; not distributed by this site.',src:'github.com/Beblia/Holy-Bible-XML-Format'};
  for(const[b,ch]of Object.entries(meta.chapters)) if(cat.books[b]) cat.books[b].tr.lsb=ch;
  return true;
}
function parseLsb(text){
  const doc=new DOMParser().parseFromString(text,'application/xml');
  if(doc.querySelector('parsererror'))throw new Error('This file is not valid XML.');
  const order=P66(), out={}, chapters={};
  const books=doc.querySelectorAll('book'); if(books.length<60)throw new Error('This does not look like a full Bible XML file ('+books.length+' books).');
  books.forEach(b=>{const code=order[+b.getAttribute('number')-1]; if(!code)return;
    const chs=[...b.querySelectorAll('chapter')].map(c=>({n:c.getAttribute('number'),v:[...c.querySelectorAll('verse')].map(v=>[v.getAttribute('number'),v.textContent.trim()])}));
    out['b:'+code]=chs; chapters[code]=chs.map(c=>c.n)});
  const title=doc.documentElement.getAttribute('title')||'';
  if(!/LSB|Legacy Standard/i.test(title)&&!confirm('This XML is titled “'+title+'”, not the LSB. Import it as “LSB” anyway?'))throw new Error('Import cancelled.');
  out.meta={chapters,title,added:Date.now()}; return out;
}
async function downloadLsb(bar){
  const r=await fetch(LSB_URL); if(!r.ok)throw new Error('Download failed (HTTP '+r.status+')');
  const total=+r.headers.get('content-length')||LSB_SIZE; const rd=r.body.getReader(); const parts=[]; let got=0;
  for(;;){const{done,value}=await rd.read(); if(done)break; parts.push(value); got+=value.length; prog(bar,Math.min(got/total,.99),'Downloading '+(got/1048576).toFixed(1)+' MB')}
  prog(bar,.99,'Saving…'); const text=new TextDecoder().decode(await new Blob(parts).arrayBuffer());
  return installLsb(text,bar);
}
async function installLsb(text,bar){
  const obj=parseLsb(text); await idbClear(); await idbPutMany(obj); for(const k of[...cache.keys()])if(k.startsWith('lsb/'))cache.delete(k);
  await enableLsb(); prefs.defTr='lsb'; prefs.tr='lsb'; savePrefs(); cur.tr='lsb'; prog(bar,1,'LSB installed ✓'); return true;
}
function prog(bar,f,txt){if(!bar)return;bar.hidden=false;bar.firstElementChild.style.width=(f*100)+'%';bar.lastElementChild.textContent=txt}
// ---------- rendering ----------
const keyOf=(b,c,v)=>b+'.'+c+'.'+v;
function chapLabels(book,tr){return cat.books[book].tr[tr]||[]}
function refText(book,chLabel,v){const b=cat.books[book];const one=Object.values(b.tr)[0].length===1&&chLabel==='1';return b.name+(one?'':' '+chLabel)+(v?(one?' ':':')+v:'')}
async function render(opts={}){
  const b=cat.books[cur.book]; cur.tr=resolveTr(cur.book,prefs.tr||prefs.defTr);
  const labels=chapLabels(cur.book,cur.tr); if(cur.ch>=labels.length)cur.ch=labels.length-1; if(cur.ch<0)cur.ch=0;
  const chLabel=labels[cur.ch];
  prefs.pos={book:cur.book,ch:chLabel}; savePrefs();
  history.replaceState(null,'','#/'+cur.book+'/'+encodeURIComponent(chLabel)+(opts.verse?'/'+opts.verse:''));
  $('#btnRef').textContent=refText(cur.book,chLabel); document.title=refText(cur.book,chLabel)+' · Bible Reader';
  fillTrSelect($('#selTr'),cur.book,cur.tr);
  const cols=[cur.tr]; let tr2=null;
  if(cur.compare){tr2=prefs.tr2&&trsFor(cur.book).includes(prefs.tr2)&&prefs.tr2!==cur.tr?prefs.tr2:trsFor(cur.book).find(t=>t!==cur.tr); fillTrSelect($('#selTr2'),cur.book,tr2,cur.tr); if(tr2)cols.push(tr2)}
  $('#selTr2').hidden=!cur.compare;
  const R=$('#reader'); R.className=cols.length>1?'compare':'';
  const htmls=await Promise.all(cols.map(t=>colHtml(t,chLabel,cols.length>1)));
  let note='';
  const want=prefs.tr||prefs.defTr; if(want&&cur.tr!==want&&cat.translations[want]) note=`<div class="notice">${esc(b.name)} isn’t in the ${esc(cat.translations[want].short)}; showing ${esc(cat.translations[cur.tr].name)}.</div>`;
  if(cur.compare&&!tr2) note+='<div class="notice">Only one translation is available for this book, so there is nothing to compare.</div>';
  R.innerHTML=(cols.length>1?`<div style="grid-column:1/-1">${head(chLabel)}${note}</div>`:head(chLabel)+note)+htmls.join('')+`<div class="navfoot" style="grid-column:1/-1"><button id="fPrev">‹ Previous</button><button id="fNext">Next ›</button></div>`;
  $('#fPrev').onclick=()=>step(-1); $('#fNext').onclick=()=>step(1);
  if(opts.verse){const el=R.querySelector(`.v[data-v="${CSS.escape(opts.verse)}"]`); if(el){el.scrollIntoView({block:'center'});el.classList.add('flash')}}
  else if(!opts.keepScroll) window.scrollTo(0,0);
}
function head(chLabel){const b=cat.books[cur.book];const multi=chapLabels(cur.book,cur.tr).length>1;return `<h1>${esc(b.name)}</h1><div class="sub">${multi?(isNaN(chLabel)?esc(chLabel):'Chapter '+esc(chLabel)):''}</div>`}
async function colHtml(tr,chLabel,showName){
  let d; try{d=await getData(tr,cur.book)}catch(e){return `<div class="col"><p class="notice">Could not load ${esc(tr)} (${esc(e.message)}).</p></div>`}
  const ch=d.c.find(c=>c.n===chLabel)||d.c[cur.ch]||d.c[0]; const T=cat.translations[tr]; const prose=PROSE.has(tr);
  let h=`<div class="col ${prose?'prose':''}" data-tr="${tr}">`+(showName?`<h2>${esc(T.name)}</h2>`:'');
  if(ch.h)h+=`<h3>${esc(ch.h)}</h3>`;
  h+='<p>';
  for(const[v,t]of ch.v){ if(!t)continue; const k=keyOf(cur.book,ch.n,v);
    const hl=marks.hl[k]?' hl-'+marks.hl[k]:''; h+=`<span class="v${hl}" data-v="${esc(v)}" data-ch="${esc(ch.n)}">${v?`<sup>${esc(v)}</sup>`:''}${esc(t)}${marks.notes[k]?'<span class="nt" title="'+esc(marks.notes[k])+'"> ✎</span>':''}${marks.bm[k]?'<span class="bm"> ★</span>':''} </span>`}
  h+='</p>';
  h+=`<div class="credit">${esc(d.credit||(T.name+' — '+T.license+'.'))}</div></div>`;
  return h;
}
function fillTrSelect(sel,book,val,exclude){sel.innerHTML=trsFor(book).filter(t=>t!==exclude).map(t=>`<option value="${t}"${t===val?' selected':''} title="${esc(cat.translations[t].name)}">${esc(cat.translations[t].short)}</option>`).join('');sel.title=cat.translations[val]?.name||''}
function step(dir){
  const labels=chapLabels(cur.book,cur.tr); let i=cur.ch+dir;
  if(i>=0&&i<labels.length){cur.ch=i;return render()}
  const ord=cat.order; let bi=ord.indexOf(cur.book)+dir; if(bi<0||bi>=ord.length)return;
  cur.book=ord[bi]; cur.tr=resolveTr(cur.book,prefs.tr||prefs.defTr); cur.ch=dir>0?0:chapLabels(cur.book,cur.tr).length-1; render();
}
function go(book,chLabel,verse){cur.book=book;const tr=resolveTr(book,prefs.tr||prefs.defTr);const L=chapLabels(book,tr);let i=L.indexOf(String(chLabel));if(i<0&&chLabel!=null&&!isNaN(chLabel))i=Math.min(+chLabel-1,L.length-1);cur.ch=Math.max(0,i);closeAll();render({verse:verse?String(verse):null})}
// ---------- panels ----------
function openPanel(id){closeAll();$('#overlay').hidden=false;$(id).hidden=false}
function closeAll(){$$('.panel').forEach(p=>p.hidden=true);$('#overlay').hidden=true;$('#verseMenu').hidden=true}
function toast(t){const e=$('#toast');e.textContent=t;e.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>e.hidden=true,2200)}
// picker: tab -> book -> chapter -> verse
let pick={tab:null,book:null,ch:null};
function openPicker(){pick={tab:prefs.lastTab||'prot',book:null,ch:null};openPanel('#picker');drawPicker()}
async function drawPicker(){
  $('#pickTabs').innerHTML=cat.tabs.map(t=>`<button data-t="${t.id}" class="${t.id===pick.tab?'on':''}">${esc(t.name)}</button>`).join('');
  $$('#pickTabs button').forEach(b=>b.onclick=()=>{pick={tab:b.dataset.t,book:null,ch:null};prefs.lastTab=pick.tab;savePrefs();drawPicker()});
  const tab=cat.tabs.find(t=>t.id===pick.tab); let cr=`<a data-s="tab">${esc(tab.name)}</a>`; const body=$('#pickBody');
  if(!pick.book){
    body.innerHTML=tab.groups.map(g=>`<div class="grp"><h4>${esc(g.name)}</h4><div class="books">${g.items.map(it=>{
      if(!it.id)return `<button class="na" title="${esc(it.note)}" data-na="${esc(it.note)}">${esc(it.name)}<small>unavailable</small></button>`;
      const b=cat.books[it.id];const trs=trsFor(it.id).map(t=>cat.translations[t].short).join(' · ');
      return `<button data-b="${it.id}" title="${esc(it.note||'')}">${esc(b.name)}<small>${esc(it.note?it.note:trs)}</small></button>`}).join('')}</div></div>`).join('');
    body.querySelectorAll('[data-b]').forEach(e=>e.onclick=()=>{pick.book=e.dataset.b;const L=chapLabels(pick.book,resolveTr(pick.book,prefs.tr||prefs.defTr));if(L.length===1){pick.ch=L[0]}drawPicker()});
    body.querySelectorAll('[data-na]').forEach(e=>e.onclick=()=>alert(e.textContent.replace('unavailable','')+'\n\n'+e.dataset.na));
  } else {
    const tr=resolveTr(pick.book,prefs.tr||prefs.defTr); const L=chapLabels(pick.book,tr);
    cr+=` › <a data-s="book">${esc(cat.books[pick.book].name)}</a>`;
    if(pick.ch==null){
      body.innerHTML=`<div class="muted">Choose a chapter</div><div class="nums">${L.map(l=>`<button data-c="${esc(l)}">${esc(l)}</button>`).join('')}</div>`;
      body.querySelectorAll('[data-c]').forEach(e=>e.onclick=()=>{pick.ch=e.dataset.c;drawPicker()});
    } else {
      if(L.length>1)cr+=` › ${esc(pick.ch)}`;
      body.innerHTML='<div class="muted">Loading…</div>';
      const d=await getData(tr,pick.book); const ch=d.c.find(c=>c.n===pick.ch)||d.c[0];
      body.innerHTML=`<div class="muted">Choose a verse (or <a href="#" id="pickWhole">open the whole chapter</a>)</div><div class="nums">${ch.v.filter(v=>v[1]).map(v=>`<button data-v="${esc(v[0])}">${esc(v[0]||'·')}</button>`).join('')}</div>`;
      $('#pickWhole').onclick=e=>{e.preventDefault();go(pick.book,pick.ch)};
      body.querySelectorAll('[data-v]').forEach(e=>e.onclick=()=>go(pick.book,pick.ch,e.dataset.v));
    }
  }
  $('#pickCrumbs').innerHTML=cr;
  $$('#pickCrumbs a').forEach(a=>a.onclick=()=>{if(a.dataset.s==='tab'){pick.book=null;pick.ch=null}else{pick.ch=null}drawPicker()});
}
// palette
const norm=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
function scoreBook(b,q){if(!q)return 0;const n=norm(b.name);let s=0;
  for(const a of b.abbr.concat([b.id.toLowerCase()])){const A=norm(a);if(A===q)s=Math.max(s,100);else if(A.startsWith(q))s=Math.max(s,70)}
  if(n===q)s=Math.max(s,100);else if(n.startsWith(q))s=Math.max(s,85);else if(n.includes(q))s=Math.max(s,50);
  if(!s){let i=0;for(const c of n){if(c===q[i])i++}if(i===q.length)s=20}
  if(b.grp==='bible')s+=5; return s}
function palResults(input){
  const m=input.trim().match(/^(.*?[a-z\u00c0-\u024f].*?)\s*(\d+)?(?:\s*[:.]\s*(\d+))?$/i); if(!m)return[];
  const q=norm(m[1]); const ch=m[2], v=m[3];
  return Object.values(cat.books).map(b=>[scoreBook(b,q),b]).filter(x=>x[0]>0).sort((a,b)=>b[0]-a[0]).slice(0,9).map(([,b])=>({b:b.id,ch,v}));
}
let palSel=0;
function drawPal(){const r=palResults($('#palInput').value);palSel=Math.min(palSel,Math.max(0,r.length-1));
  $('#palList').innerHTML=r.map((x,i)=>`<div class="${i===palSel?'on':''}" data-i="${i}">${esc(cat.books[x.b].name)}${x.ch?' '+x.ch:''}${x.v?':'+x.v:''}</div>`).join('')||'<div class="muted">No match</div>';
  $$('#palList [data-i]').forEach(e=>e.onclick=()=>{const x=r[+e.dataset.i];go(x.b,x.ch||null,x.v)}); return r}
// search
let searchGen=0;
async function doSearch(){
  const q=$('#searchInput').value.trim(); const gen=++searchGen; const out=$('#searchResults'); out.innerHTML='';
  if(q.length<2){$('#searchStatus').textContent='';return}
  const words=q.toLowerCase().split(/\s+/).filter(Boolean); const tr=cur.tr; const scope=$('#searchScope').value;
  const books=scope==='book'?[cur.book]:cat.order.filter(b=>cat.books[b].tr[tr]);
  let n=0,html=[]; const re=new RegExp('('+words.map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')','gi');
  for(let i=0;i<books.length;i++){
    if(gen!==searchGen)return; $('#searchStatus').textContent=`Searching ${cat.translations[tr].short}… ${cat.books[books[i]].name}`;
    let d; try{d=await getData(tr,books[i])}catch(e){continue}
    for(const c of d.c)for(const[v,t]of c.v){const L=t.toLowerCase(); if(words.every(w=>L.includes(w))){n++; if(n<=500)html.push(`<div class="res" data-b="${books[i]}" data-c="${esc(c.n)}" data-v="${esc(v)}"><b>${esc(refText(books[i],c.n,v))}</b><span>${esc(t).replace(re,'<mark>$1</mark>')}</span></div>`)}}
    if(i%8===7){out.innerHTML=html.join('');bindRes()}
  }
  out.innerHTML=html.join(''); bindRes();
  $('#searchStatus').textContent=`${n} result${n===1?'':'s'} in ${cat.translations[tr].name}${n>500?' (showing first 500)':''}`;
}
function bindRes(){$$('#searchResults .res').forEach(e=>e.onclick=()=>go(e.dataset.b,e.dataset.c,e.dataset.v))}
// verse menu
let selV=null;
function verseMenu(el,ev){
  $$('.v.sel').forEach(x=>x.classList.remove('sel')); el.classList.add('sel');
  const k=keyOf(cur.book,el.dataset.ch,el.dataset.v); selV={k,el};
  const m=$('#verseMenu'); m.innerHTML=`${['y','g','b','p'].map(c=>`<button class="sw hl-${c}" data-hl="${c}" title="Highlight"></button>`).join('')}<button data-hl="" title="Clear highlight">✕</button><button data-a="note">✎ Note</button><button data-a="bm">${marks.bm[k]?'★ Unbookmark':'☆ Bookmark'}</button><button data-a="copy">Copy</button>`;
  const r=el.getBoundingClientRect(); m.style.top=(window.scrollY+r.top-48)+'px'; m.style.left=Math.max(8,Math.min(window.innerWidth-380,ev.clientX-120))+'px'; m.hidden=false;
  m.querySelectorAll('[data-hl]').forEach(b=>b.onclick=()=>{if(b.dataset.hl)marks.hl[k]=b.dataset.hl;else delete marks.hl[k];saveMarks();m.hidden=true;render({keepScroll:true})});
  m.querySelector('[data-a=note]').onclick=()=>{const t=prompt('Note for '+refText(cur.book,el.dataset.ch,el.dataset.v),marks.notes[k]||'');if(t===null)return;if(t.trim())marks.notes[k]=t.trim();else delete marks.notes[k];saveMarks();m.hidden=true;render({keepScroll:true})};
  m.querySelector('[data-a=bm]').onclick=()=>{if(marks.bm[k])delete marks.bm[k];else marks.bm[k]=Date.now();saveMarks();m.hidden=true;render({keepScroll:true})};
  m.querySelector('[data-a=copy]').onclick=()=>{const txt=el.textContent.replace(/^\S+/,'').replace(/[✎★]/g,'').trim();navigator.clipboard?.writeText(`${txt} — ${refText(cur.book,el.dataset.ch,el.dataset.v)} (${cat.translations[el.closest('.col').dataset.tr].short})`);toast('Copied');m.hidden=true};
}
let marksTab='bm';
function drawMarks(){
  const tabs={bm:'Bookmarks',hl:'Highlights',notes:'Notes'};
  $('#marksTabs').innerHTML=Object.entries(tabs).map(([k,v])=>`<button class="${k===marksTab?'on':''}" data-k="${k}">${v} (${Object.keys(marks[k]).length})</button>`).join('');
  $$('#marksTabs button').forEach(b=>b.onclick=()=>{marksTab=b.dataset.k;drawMarks()});
  const ent=Object.entries(marks[marksTab]).filter(([k])=>cat.books[k.split('.')[0]]);
  $('#marksBody').innerHTML=ent.length?ent.map(([k,val])=>{const[b,c,v]=k.split('.');return `<div class="res" data-b="${b}" data-c="${esc(c)}" data-v="${esc(v)}"><b>${esc(refText(b,c,v))}</b><span>${marksTab==='notes'?esc(val):marksTab==='hl'?'<span class="hl-'+val+'">&nbsp;&nbsp;&nbsp;&nbsp;</span>':''}</span></div>`}).join(''):'<div class="muted">Nothing here yet. Tap any verse to highlight, bookmark or add a note.</div>';
  $$('#marksBody .res').forEach(e=>e.onclick=()=>go(e.dataset.b,e.dataset.c,e.dataset.v));
}
function drawAbout(){
  const rows=Object.entries(cat.translations).map(([k,t])=>`<tr><td><b>${esc(t.short)}</b></td><td>${esc(t.name)}</td><td>${esc(t.license)}</td><td>${esc(t.src)}</td></tr>`).join('');
  $('#about').innerHTML=`<h2>About these texts</h2><p class="fine">Every text here is public domain or openly licensed, except the LSB, which you load yourself into this browser. Each book ends with its translator and source. Books with no free English translation are listed but greyed out, rather than filled in with guesswork.</p><table><tr><th></th><th>Translation</th><th>Licence</th><th>Source</th></tr>${rows}</table>`;
}
function setTheme(t){prefs.theme=t;document.body.dataset.theme=t;savePrefs();$$('#themeSeg button').forEach(b=>b.classList.toggle('on',b.dataset.t===t))}
function setFont(d){prefs.fs=Math.max(14,Math.min(30,(prefs.fs||20)+d));document.documentElement.style.setProperty('--fs',prefs.fs+'px');savePrefs()}
async function drawSettings(){
  $('#selDefault').innerHTML=['lsb','bsb','web','kjv'].filter(t=>cat.translations[t]).map(t=>`<option value="${t}"${t===prefs.defTr?' selected':''}>${esc(cat.translations[t].short)} — ${esc(cat.translations[t].name)}</option>`).join('');
  const meta=await idbGet('meta').catch(()=>null);
  $('#lsbState').textContent=meta?`Installed in this browser (${Object.keys(meta.chapters).length} books, added ${new Date(meta.added).toLocaleDateString()}).`:'Not installed.';
  $('#btnRemoveLsb').hidden=!meta; $('#btnAddLsb').textContent=meta?'Re-download LSB':'Add LSB';
}
// ---------- init ----------
async function init(){
  prefs=loadJ('br.prefs',{}); marks=Object.assign({hl:{},notes:{},bm:{}},loadJ('br.marks',{}));
  setTheme(prefs.theme||'light'); setFont(0);
  cat=await fetch('data/catalog.json').then(r=>r.json());
  await enableLsb().catch(()=>false);
  if(prefs.defTr==='lsb'&&!cat.translations.lsb)prefs.defTr='web';
  cur.compare=!!prefs.compare;
  const h=location.hash.match(/^#\/([^/]+)\/([^/]+)(?:\/([^/]+))?/);
  const pos=h?{book:h[1],ch:decodeURIComponent(h[2]),v:h[3]}:(prefs.pos||{book:'JHN',ch:'1'});
  if(!cat.books[pos.book])pos.book='JHN';
  bind();
  if(!prefs.welcomed){$('#welcome').hidden=false} 
  go(pos.book,pos.ch,pos.v);
}
function bind(){
  $('#btnPrev').onclick=()=>step(-1); $('#btnNext').onclick=()=>step(1);
  $('#btnRef').onclick=openPicker;
  $('#selTr').onchange=e=>{prefs.tr=e.target.value;savePrefs();render({keepScroll:true})};
  $('#selTr2').onchange=e=>{prefs.tr2=e.target.value;savePrefs();render({keepScroll:true})};
  $('#btnCompare').onclick=()=>{cur.compare=!cur.compare;prefs.compare=cur.compare;savePrefs();render({keepScroll:true})};
  $('#btnSearch').onclick=()=>{openPanel('#searchPanel');$('#searchInput').focus()};
  let st; $('#searchInput').oninput=()=>{clearTimeout(st);st=setTimeout(doSearch,250)}; $('#searchScope').onchange=doSearch;
  $('#btnJump').onclick=openPalette;
  $('#btnMarks').onclick=()=>{openPanel('#marksPanel');drawMarks()};
  $('#btnTheme').onclick=()=>setTheme({light:'sepia',sepia:'dark',dark:'light'}[prefs.theme]||'light');
  $('#btnSettings').onclick=()=>{openPanel('#settings');drawSettings()};
  $$('#themeSeg button').forEach(b=>b.onclick=()=>setTheme(b.dataset.t));
  $('#fontUp').onclick=()=>setFont(1); $('#fontDown').onclick=()=>setFont(-1);
  $('#selDefault').onchange=e=>{prefs.defTr=e.target.value;prefs.tr=e.target.value;savePrefs();render({keepScroll:true})};
  $('#btnAddLsb').onclick=async()=>{const b=$('#btnAddLsb');b.disabled=true;try{await downloadLsb($('#lsbProg'));toast('LSB added and set as default');drawSettings();render({keepScroll:true})}catch(e){prog($('#lsbProg'),0,'Error: '+e.message)}b.disabled=false};
  $('#lsbFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{prog($('#lsbProg'),.5,'Reading file…');await installLsb(await f.text(),$('#lsbProg'));toast('LSB imported');drawSettings();render({keepScroll:true})}catch(err){prog($('#lsbProg'),0,'Error: '+err.message)}e.target.value=''};
  $('#btnRemoveLsb').onclick=async()=>{if(!confirm('Remove the LSB from this browser?'))return;await idbClear();location.reload();prefs.defTr='web';prefs.tr='web';savePrefs()};
  $('#btnExport').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(marks,null,1)],{type:'application/json'}));a.download='bible-notes.json';a.click()};
  $('#importMarks').onchange=async e=>{try{const m=JSON.parse(await e.target.files[0].text());for(const k of['hl','notes','bm'])Object.assign(marks[k],m[k]||{});saveMarks();toast('Imported');render({keepScroll:true})}catch(err){alert('Could not import: '+err.message)}};
  $('#aboutLink').onclick=e=>{e.preventDefault();openPanel('#about');drawAbout()};
  $('#overlay').onclick=closeAll;
  $('#wWeb').onclick=()=>{prefs.welcomed=true;prefs.defTr='web';prefs.tr='web';savePrefs();$('#welcome').hidden=true;render()};
  $('#wLsb').onclick=async()=>{$('#wErr').textContent='';$$('.choice').forEach(b=>b.disabled=true);try{await downloadLsb($('#wProg'));prefs.welcomed=true;savePrefs();setTimeout(()=>{$('#welcome').hidden=true;render()},400)}catch(e){$('#wErr').textContent='Could not add the LSB: '+e.message+'. You can use WEB for now and try again from Settings.';$$('.choice').forEach(b=>b.disabled=false)}};
  $('#reader').addEventListener('click',e=>{const v=e.target.closest('.v');if(v){e.stopPropagation();verseMenu(v,e)}});
  document.addEventListener('click',e=>{if(!e.target.closest('#verseMenu')&&!e.target.closest('.v')){$('#verseMenu').hidden=true;$$('.v.sel').forEach(x=>x.classList.remove('sel'))}});
  $('#palInput').oninput=()=>{palSel=0;drawPal()};
  $('#palInput').onkeydown=e=>{const r=palResults($('#palInput').value);if(e.key==='ArrowDown'){palSel=Math.min(palSel+1,r.length-1);drawPal();e.preventDefault()}else if(e.key==='ArrowUp'){palSel=Math.max(palSel-1,0);drawPal();e.preventDefault()}else if(e.key==='Enter'&&r[palSel]){const x=r[palSel];go(x.b,x.ch||null,x.v)}};
  document.addEventListener('keydown',e=>{
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openPalette();return}
    if(e.key==='Escape'){closeAll();return}
    if(/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)||!$('#welcome').hidden)return;
    if(e.key==='ArrowLeft')step(-1); else if(e.key==='ArrowRight')step(1); else if(e.key==='/'){e.preventDefault();$('#btnSearch').click()}
  });
}
function openPalette(){openPanel('#palette');$('#palInput').value='';palSel=0;drawPal();$('#palInput').focus()}
init().catch(e=>{document.body.insertAdjacentHTML('beforeend','<p class="notice">Failed to start: '+esc(e.message)+'</p>')});
