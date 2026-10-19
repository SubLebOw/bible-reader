'use strict';
const LSB_URL='https://raw.githubusercontent.com/Beblia/Holy-Bible-XML-Format/master/EnglishLSBBible.xml';
const LSB_SIZE=5168207;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const PROSE=new Set(['walker','james','mattison','robinson','horner','harden','morwyng','cooper','gh','hogan','pd','user']);
let cat, prefs, marks, cur={book:'JHN',ch:0,tr:null,tr2:null,compare:false};
const cache=new Map();
// ---------- storage ----------
const loadJ=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}};
const savePrefs=()=>localStorage.setItem('br.prefs',JSON.stringify(prefs));
const saveMarks=()=>localStorage.setItem('br.marks',JSON.stringify(marks));
let _db;
function idb(){if(_db)return _db;_db=new Promise((res,rej)=>{const r=indexedDB.open('bible-reader',2);r.onupgradeneeded=()=>{const d=r.result;for(const n of['lsb','user'])if(!d.objectStoreNames.contains(n))d.createObjectStore(n)};r.onsuccess=()=>res(r.result);r.onerror=()=>{_db=null;rej(r.error)}});return _db}
async function uGet(k){const db=await idb();return new Promise((res,rej)=>{const q=db.transaction('user').objectStore('user').get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
async function uAll(){const db=await idb();return new Promise((res,rej)=>{const q=db.transaction('user').objectStore('user').getAll();q.onsuccess=()=>res(q.result||[]);q.onerror=()=>rej(q.error)})}
async function uPut(k,v){const db=await idb();return new Promise((res,rej)=>{const tx=db.transaction('user','readwrite');tx.objectStore('user').put(v,k);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}
async function uDel(k){const db=await idb();return new Promise((res,rej)=>{const tx=db.transaction('user','readwrite');tx.objectStore('user').delete(k);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}
async function idbGet(k){const db=await idb();return new Promise((res,rej)=>{const q=db.transaction('lsb').objectStore('lsb').get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
async function idbPutMany(obj){const db=await idb();return new Promise((res,rej)=>{const tx=db.transaction('lsb','readwrite');const st=tx.objectStore('lsb');for(const[k,v]of Object.entries(obj))st.put(v,k);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}
async function idbClear(){const db=await idb();return new Promise(res=>{const tx=db.transaction('lsb','readwrite');tx.objectStore('lsb').clear();tx.oncomplete=()=>res()})}
// ---------- data ----------
const P66=()=>cat.tabs[0].groups.flatMap(g=>g.items.map(i=>i.id));
async function getData(tr,book){
  const key=tr+'/'+book; if(cache.has(key))return cache.get(key);
  let p;
  if(tr==='lsb') p=idbGet('b:'+book).then(c=>({c}));
  else if(tr==='user') p=uGet('u:'+book.slice(2)).then(u=>{if(!u)throw new Error('your file was removed');return{c:u.c,credit:'Your file “'+u.file+'” — stored only in this browser (never uploaded). Added '+new Date(u.added).toLocaleDateString()+'.'}});
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
let renderGen=0;
async function render(opts={}){
  const gen=++renderGen;
  const b=cat.books[cur.book]; cur.tr=resolveTr(cur.book,prefs.tr||prefs.defTr);
  const labels=chapLabels(cur.book,cur.tr); if(cur.ch>=labels.length)cur.ch=labels.length-1; if(cur.ch<0)cur.ch=0;
  const chLabel=labels[cur.ch];
  prefs.pos={book:cur.book,ch:chLabel}; savePrefs(); cur.key=cur.book+'/'+chLabel;
  history.replaceState(null,'','#/'+cur.book+'/'+encodeURIComponent(chLabel)+(opts.verse?'/'+opts.verse:''));
  $('#btnRef').textContent=refText(cur.book,chLabel); $('#pRef').firstChild.textContent=refText(cur.book,chLabel)+' '; $('#pTr').textContent=cat.translations[cur.tr].short; document.title=refText(cur.book,chLabel)+' · Bible Reader';
  fillTrSelect($('#selTr'),cur.book,cur.tr);
  const cols=[cur.tr]; let tr2=null;
  if(cur.compare){tr2=prefs.tr2&&trsFor(cur.book).includes(prefs.tr2)&&prefs.tr2!==cur.tr?prefs.tr2:trsFor(cur.book).find(t=>t!==cur.tr); fillTrSelect($('#selTr2'),cur.book,tr2,cur.tr); if(tr2)cols.push(tr2)}
  $('#selTr2').hidden=!cur.compare;
  const R=$('#reader'); R.className=cols.length>1?'compare':'';
  const htmls=await Promise.all(cols.map(t=>colHtml(t,chLabel,cols.length>1)));
  if(gen!==renderGen)return; // a newer navigation started while this chapter was loading
  let note='';
  const want=prefs.tr||prefs.defTr; if(want&&cur.tr!==want&&cur.tr!=='user'&&cat.translations[want]) note=`<div class="notice">${esc(b.name)} isn’t in the ${esc(cat.translations[want].short)}; showing ${esc(cat.translations[cur.tr].name)}.</div>`;
  if(cur.compare&&!tr2) note+='<div class="notice">Only one translation is available for this book, so there is nothing to compare.</div>';
  R.innerHTML=(cols.length>1?`<div style="grid-column:1/-1">${head(chLabel)}${note}</div>`:head(chLabel)+note)+htmls.join('')+`<div class="navfoot" style="grid-column:1/-1"><button id="fPrev">‹ Previous</button><button id="fNext">Next ›</button></div>`;
  $('#fPrev').onclick=()=>step(-1); $('#fNext').onclick=()=>step(1);
  if(opts.restoreY!=null) settleScroll(()=>opts.restoreY);
  else if(opts.verse){const el=R.querySelector(`.v[data-v="${CSS.escape(opts.verse)}"]`); if(el){el.classList.add('flash');settleScroll(()=>verseY(el))}else settleScroll(()=>0)}
  else if(!opts.keepScroll) settleScroll(()=>0);
}
// ---------- scroll handling ----------
// Height of whatever is pinned over the top of the reading view (desktop #bar or phone #pbar).
function topBarH(){const bar=document.body.classList.contains('phone')?$('#pbar'):$('#bar');return bar?Math.max(0,bar.getBoundingClientRect().bottom):0}
// Page offset that puts a verse a little below the top bar (a third of the way down the visible area), never under it.
function verseY(el){const r=el.getBoundingClientRect();const bar=topBarH();const tab=document.body.classList.contains('phone')?($('#tabbar').getBoundingClientRect().height||0):0;
  const room=innerHeight-bar-tab;const gap=Math.max(16,Math.min(room/3,room-r.height-16));return Math.max(0,Math.round(r.top+scrollY-bar-gap))}
// Scroll to a target and keep it there while the page settles. Touch momentum from a swipe, the browser's own
// scroll restoration, or a late layout change could otherwise leave the new chapter slightly scrolled down.
// Stops as soon as the reader touches, wheels or presses a key.
let settleGen=0;
function settleScroll(target){
  const g=++settleGen; const de=document.documentElement;
  const apply=()=>{if(g!==settleGen)return;const y=target();if(Math.abs(scrollY-y)>1)window.scrollTo({top:y,left:0,behavior:'instant'})};
  // cancel any in-flight momentum scroll (iOS/Android ignore scrollTo while it runs)
  const touch=document.body.classList.contains('phone')||matchMedia('(pointer: coarse)').matches; const ov=de.style.overflow; if(touch)de.style.overflow='hidden'; apply(); requestAnimationFrame(()=>{if(touch)de.style.overflow=ov; apply(); requestAnimationFrame(apply)});
  const stop=()=>{if(g===settleGen)settleGen++;off()};
  const ev=['touchstart','wheel','keydown','mousedown'];const off=()=>ev.forEach(e=>removeEventListener(e,stop,true));
  setTimeout(()=>ev.forEach(e=>addEventListener(e,stop,{capture:true,passive:true})),50);
  [80,200,400,700].forEach(t=>setTimeout(apply,t)); setTimeout(()=>{if(g===settleGen)settleGen++;off()},800);
  if(document.fonts&&document.fonts.status!=='loaded')document.fonts.ready.then(apply);
}
// Remember the exact spot so a reload of the same chapter comes back to it.
let saveT; addEventListener('scroll',()=>{clearTimeout(saveT);saveT=setTimeout(saveScroll,200)},{passive:true});
addEventListener('pagehide',saveScroll);
function saveScroll(){try{localStorage.setItem('br.scroll',JSON.stringify({k:cur.key,y:Math.round(scrollY)}))}catch(e){}}
function reloadY(key){try{const nav=performance.getEntriesByType('navigation')[0];if(!nav||nav.type!=='reload')return null;
  const s=JSON.parse(localStorage.getItem('br.scroll')||'null');return s&&s.k===key?s.y:null}catch(e){return null}}
function head(chLabel){const b=cat.books[cur.book];const multi=chapLabels(cur.book,cur.tr).length>1;return `<h1>${esc(b.name)}</h1><div class="sub">${multi?(isNaN(chLabel)?esc(chLabel):'Chapter '+esc(chLabel)):''}</div>`}
async function colHtml(tr,chLabel,showName){
  let d; try{d=await getData(tr,cur.book)}catch(e){return `<div class="col"><p class="notice">Could not load ${esc(tr)} (${esc(e.message)}).</p></div>`}
  const ch=d.c.find(c=>c.n===chLabel)||d.c[cur.ch]||d.c[0]; const T=cat.translations[tr]; const prose=PROSE.has(tr);
  let h=`<div class="col ${prose?'prose':''}" data-tr="${tr}">`+(showName?`<h2>${esc(T.name)}</h2>`:'');
  if(ch.h)h+=`<h3>${esc(ch.h)}</h3>`;
  h+='<p>'; let first=true; const drop=!prose&&/^\d+$/.test(ch.n)&&chapLabels(cur.book,tr).length>1;
  for(const[v,t]of ch.v){ if(!t)continue; const k=keyOf(cur.book,ch.n,v); if(first&&drop)h+=`<span class="dropnum" aria-hidden="true">${esc(ch.n)}</span>`;
    const hl=marks.hl[k]?' hl-'+marks.hl[k]:''; h+=`<span class="v${hl}${first&&drop?' v1':''}" data-v="${esc(v)}" data-ch="${esc(ch.n)}">${v?`<sup>${esc(v)}</sup>`:''}${esc(t)}${marks.notes[k]?'<span class="nt" title="'+esc(marks.notes[k])+'"> ✎</span>':''}${marks.bm[k]?'<span class="bm"> ★</span>':''} </span>`; first=false}
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
function go(book,chLabel,verse,restoreY){cur.book=book;const tr=resolveTr(book,prefs.tr||prefs.defTr);const L=chapLabels(book,tr);let i=L.indexOf(String(chLabel));if(i<0&&chLabel!=null&&!isNaN(chLabel))i=Math.min(+chLabel-1,L.length-1);cur.ch=Math.max(0,i);closeAll();render({verse:verse?String(verse):null,restoreY})}
// ---------- panels ----------
function openPanel(id){closeAll();$('#overlay').hidden=false;$(id).hidden=false;setTab({'#searchPanel':'search','#marksPanel':'marks','#settings':'settings','#about':'settings'}[id]||'read')}
function closeAll(){$$('.panel').forEach(p=>p.hidden=true);$('#overlay').hidden=true;$('#verseMenu').hidden=true;const sh=$('#sheetShade');if(sh)sh.hidden=true;setTab('read')}
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
      if(!it.id){const ub=it.uid&&cat.books['U_'+it.uid];
        if(ub)return `<button data-b="U_${esc(it.uid)}" class="mine" title="${esc(it.note)}">${esc(ub.name)}<small>your file</small></button>`;
        return `<div class="na" tabindex="0" data-uid="${esc(it.uid||'')}"><div class="naname">${esc(it.name)}<small>unavailable</small></div><div class="nanote">${esc(it.note)}</div>${it.uid?`<button class="up" data-up="${esc(it.uid)}">⤒ Upload file</button>`:''}</div>`}
      const b=cat.books[it.id];const trs=trsFor(it.id).map(t=>cat.translations[t].short).join(' · ');
      return `<button data-b="${it.id}" title="${esc(it.note||'')}">${esc(b.name)}<small>${esc(it.note?it.note:trs)}</small></button>`}).join('')}</div></div>`).join('');
    body.querySelectorAll('[data-b]').forEach(e=>e.onclick=()=>{pick.book=e.dataset.b;const L=chapLabels(pick.book,resolveTr(pick.book,prefs.tr||prefs.defTr));if(L.length===1){pick.ch=L[0]}drawPicker()});
    body.querySelectorAll('.na').forEach(e=>e.onclick=ev=>{if(ev.target.closest('[data-up]'))return;const was=e.classList.contains('open');body.querySelectorAll('.na.open').forEach(x=>x.classList.remove('open'));if(!was)e.classList.add('open')});
    body.querySelectorAll('[data-up]').forEach(b=>b.onclick=ev=>{ev.stopPropagation();startUpload(b.dataset.up)});
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
  const k=keyOf(cur.book,el.dataset.ch,el.dataset.v); selV={k,el}; const ref=refText(cur.book,el.dataset.ch,el.dataset.v);
  const tr=el.closest('.col').dataset.tr; const txt=()=>el.textContent.replace(/^\S+/,'').replace(/[✎★]/g,'').trim()+' — '+ref+' ('+cat.translations[tr].short+')';
  const m=$('#verseMenu'); const IC=window.ICONS||{};
  m.innerHTML=`<div class="vmhead">${esc(ref)}</div><div class="vmsw">${['y','g','b','p'].map(c=>`<button class="sw hl-${c}${marks.hl[k]===c?' on':''}" data-hl="${c}" title="Highlight" aria-label="Highlight ${c}"></button>`).join('')}<button class="sw clr" data-hl="" title="Clear highlight" aria-label="Clear highlight">✕</button></div>
  <button class="vmrow" data-a="note"><span>${marks.notes[k]?'Edit Note':'Take a Note'}</span>${IC.note||'✎'}</button>
  <button class="vmrow" data-a="bm"><span>${marks.bm[k]?'Remove Bookmark':'Bookmark Verse'}</span>${IC.bm||'☆'}</button>
  <button class="vmrow" data-a="copy"><span>Copy Verse</span>${IC.copy||'⧉'}</button>
  <button class="vmrow" data-a="share"><span>Share Verse</span>${IC.share||'⤴'}</button>
  <button class="vmrow" data-a="cmp"><span>Compare Translations</span>${IC.cmp||'⇆'}</button>`;
  if(document.body.classList.contains('phone')){m.style.top='';m.style.left=''}
  else{const r=el.getBoundingClientRect(); m.style.top=(window.scrollY+r.bottom+6)+'px'; m.style.left=Math.max(8,Math.min(window.innerWidth-300,ev.clientX-140))+'px'}
  m.hidden=false; $('#sheetShade').hidden=!document.body.classList.contains('phone');
  const done=()=>{m.hidden=true;$('#sheetShade').hidden=true};
  m.querySelectorAll('[data-hl]').forEach(b=>b.onclick=()=>{if(b.dataset.hl)marks.hl[k]=b.dataset.hl;else delete marks.hl[k];saveMarks();done();render({keepScroll:true})});
  m.querySelector('[data-a=note]').onclick=()=>{const t=prompt('Note for '+ref,marks.notes[k]||'');if(t===null)return;if(t.trim())marks.notes[k]=t.trim();else delete marks.notes[k];saveMarks();done();render({keepScroll:true})};
  m.querySelector('[data-a=bm]').onclick=()=>{if(marks.bm[k])delete marks.bm[k];else marks.bm[k]=Date.now();saveMarks();done();render({keepScroll:true})};
  m.querySelector('[data-a=copy]').onclick=()=>{navigator.clipboard?.writeText(txt());toast('Copied');done()};
  m.querySelector('[data-a=share]').onclick=async()=>{const t=txt();done();if(navigator.share){try{await navigator.share({text:t,title:ref})}catch(e){}}else{navigator.clipboard?.writeText(t);toast('Sharing isn’t available here — copied instead')}};
  m.querySelector('[data-a=cmp]').onclick=()=>{done();verseCompare(cur.book,el.dataset.ch,el.dataset.v)};
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
  drawUserFiles();
  $('#btnRemoveLsb').hidden=!meta; $('#btnAddLsb').textContent=meta?'Re-download LSB':'Add LSB';
}
// ---------- your own files for unavailable books (stored only in IndexedDB) ----------
const PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
const ROMAN=s=>{const m={I:1,V:5,X:10,L:50,C:100,D:500,M:1000};s=s.toUpperCase();let t=0;for(let i=0;i<s.length;i++){const a=m[s[i]],b=m[s[i+1]]||0;t+=a<b?-a:a}return t};
function naItems(){const out={};for(const t of cat.tabs)for(const g of t.groups)for(const it of g.items)if(!it.id&&it.uid)out[it.uid]=it;return out}
function registerUser(u){
  cat.translations.user={name:'Your file (stored only in this browser)',short:'Your file',license:'Your own file — never uploaded; kept in this browser’s IndexedDB',src:'uploaded by you'};
  const id='U_'+u.uid; cat.books[id]={id,name:u.name,abbr:[u.name.toLowerCase()],grp:'user',tr:{user:u.c.map(c=>c.n)}};
  if(!cat.order.includes(id))cat.order.push(id); cache.delete('user/'+id);
}
async function loadUsers(){try{for(const u of await uAll())registerUser(u)}catch(e){console.warn(e)}}
function splitParas(t){const ps=t.split(/\n\s*\n/).map(p=>p.replace(/\s*\n\s*/g,' ').trim()).filter(Boolean);return ps.length>1?ps:t.split(/\n/).map(x=>x.trim()).filter(Boolean)}
function versesOf(body){
  const lines=body.split(/\n/); const num=/^\s*\[?(\d{1,3})[\].):]?\s+(\S.*)$/;
  const hits=lines.filter(l=>num.test(l)).length;
  if(hits>=2&&hits>=lines.filter(l=>l.trim()).length*0.4){const v=[];for(const l of lines){const m=l.match(num);if(m)v.push([m[1],m[2].trim()]);else if(l.trim()&&v.length)v[v.length-1][1]+=' '+l.trim();else if(l.trim())v.push(['',l.trim()])}return v}
  // inline verse numbers like "1 In the beginning ... 2 And the earth"
  const flat=body.replace(/\s+/g,' ').trim(); const parts=flat.split(/(?:^|\s)(?=\d{1,3}\s+[A-Z“"‘(])/);
  if(parts.length>=3){let n=0,ok=true;const v=[];for(const p of parts){const m=p.match(/^(\d{1,3})\s+(.*)$/);if(m&&+m[1]===n+1){n++;v.push([m[1],m[2]])}else if(v.length)v[v.length-1][1]+=' '+p;else v.push(['',p])}if(n>=3)return v}
  return splitParas(body).map((p,i)=>[String(i+1),p]);
}
function parseText(t){
  t=t.replace(/\r\n?/g,'\n').replace(/^\uFEFF/,'');
  const cv=t.split('\n').map(l=>l.match(/^\s*(?:[1-3]?\s?[A-Za-z]+\.?\s+)?(\d{1,3}):(\d{1,3})\s+(\S.*)$/)).filter(Boolean);
  if(cv.length>=3){const chs=[];for(const m of cv){let c=chs.find(x=>x.n===m[1]);if(!c){c={n:m[1],v:[]};chs.push(c)}c.v.push([m[2],m[3].trim()])}return{how:'chapter:verse lines',c:chs}}
  const head=/^\s*(?:#+\s*)?(?:chapter|chap\.?|ch\.|statute|section|canon|saying|book|part)\s+([0-9]+|[IVXLCDM]+)\b[.:]?\s*(.*)$/i;
  const lines=t.split('\n'); const chs=[]; let curC=null;
  for(const l of lines){const m=l.match(head);if(m){curC={n:/^\d+$/.test(m[1])?m[1]:String(ROMAN(m[1])),h:m[2].replace(/^[-–—:.\s]+/,'').trim()||undefined,body:''};chs.push(curC);continue}
    if(!curC){if(!l.trim())continue;curC={n:'1',body:''};chs.push(curC)}curC.body+=l+'\n'}
  const seen=new Set(); for(const c of chs){while(seen.has(c.n))c.n+=' (bis)';seen.add(c.n)}
  const out=chs.map(c=>({n:c.n,h:c.h,v:versesOf(c.body.replace(/^#+\s*/gm,''))})).filter(c=>c.v.length);
  return{how:chs.length>1?'“Chapter N” headings':'one chapter, split into '+(out[0]&&out[0].v[0]&&/^\d+$/.test(out[0].v[0][0])?'verses/paragraphs':'paragraphs'),c:out};
}
function parseUsfm(t){const chs=[];let c=null,v=null,book=(t.match(/\\h\s+(.+)/)||[])[1];
  t=t.replace(/\\f\s.*?\\f\*/gs,'').replace(/\\x\s.*?\\x\*/gs,'').replace(/\\w\s([^|\\]*)\|?[^\\]*\\w\*/g,'$1');
  for(const raw of t.split(/\n/)){let l=raw.trim(); let m;
    if(m=l.match(/^\\c\s+(\S+)/)){c={n:m[1],v:[]};chs.push(c);continue}
    if(!c)continue;
    l=l.replace(/^\\(p|m|q\d?|pi\d?|nb|li\d?|b)\b\s*/,'');
    while((m=l.match(/^\\v\s+(\S+)\s*(.*)$/))){const rest=m[2];const nx=rest.search(/\\v\s/);v=[m[1],(nx>=0?rest.slice(0,nx):rest)];c.v.push(v);l=nx>=0?rest.slice(nx):''}
    if(l&&!/^\\(s\d?|ms|mt\d?|d|r|toc\d?|id|h|ide|rem)\b/.test(l)&&v)v[1]+=' '+l}
  chs.forEach(c=>c.v.forEach(x=>x[1]=x[1].replace(/\\[a-z]+\d?\*?/g,'').replace(/\s+/g,' ').trim()));
  return{how:'USFM',book,c:chs.filter(c=>c.v.length)}}
function parseXmlBooks(t){
  const doc=new DOMParser().parseFromString(t,'application/xml'); if(doc.querySelector('parsererror'))throw new Error('This file is not valid XML.');
  const books=[]; const q=(el,s)=>[...el.getElementsByTagName(s)];
  if(q(doc,'BIBLEBOOK').length){ // Zefania
    for(const b of q(doc,'BIBLEBOOK'))books.push({name:b.getAttribute('bname')||'Book '+b.getAttribute('bnumber'),c:q(b,'CHAPTER').map(c=>({n:c.getAttribute('cnumber'),v:q(c,'VERS').map(v=>[v.getAttribute('vnumber'),v.textContent.trim()])}))});
    return{how:'Zefania XML',books}}
  if(q(doc,'osis').length||doc.documentElement.namespaceURI?.includes('osis')){ // OSIS (container or milestone verses)
    const vs=q(doc,'verse'); const byBook=new Map();
    const add=(id,txt)=>{const p=id.split('.');if(p.length<3)return;const[b,c,v]=p;if(!byBook.has(b))byBook.set(b,new Map());const bm=byBook.get(b);if(!bm.has(c))bm.set(c,[]);bm.get(c).push([v,txt.replace(/\s+/g,' ').trim()])};
    if(vs.some(v=>v.getAttribute('sID'))){ // milestones: walk text between sID and eID
      const w=doc.createTreeWalker(doc.documentElement,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);let curId=null,buf='';
      for(let n=w.nextNode();n;n=w.nextNode()){if(n.nodeType===1&&n.localName==='verse'){if(n.getAttribute('sID')){curId=n.getAttribute('osisID');buf=''}else if(n.getAttribute('eID')&&curId){add(curId,buf);curId=null}}
        else if(n.nodeType===3&&curId&&!['note','title'].includes(n.parentNode.localName))buf+=n.nodeValue}}
    else for(const v of vs){const id=v.getAttribute('osisID');if(id){const cl=v.cloneNode(true);[...cl.getElementsByTagName('note')].forEach(x=>x.remove());add(id.split(' ')[0],cl.textContent)}}
    for(const[b,m]of byBook)books.push({name:b,c:[...m].map(([n,v])=>({n,v}))});
    return{how:'OSIS XML',books}}
  if(q(doc,'book').length&&q(doc,'verse').length){ // Beblia-style
    for(const b of q(doc,'book'))books.push({name:b.getAttribute('name')||'Book '+(b.getAttribute('number')||books.length+1),c:q(b,'chapter').map(c=>({n:c.getAttribute('number'),v:q(c,'verse').map(v=>[v.getAttribute('number'),v.textContent.trim()])}))});
    return{how:'Beblia XML',books}}
  throw new Error('Unrecognised XML (expected OSIS, Zefania or Beblia).')}
function parseJson(t){const j=JSON.parse(t);
  const fromArr=a=>a.map((c,i)=>Array.isArray(c)?{n:String(i+1),v:c.map((x,k)=>[String(k+1),String(x)])}:{n:String(c.n??c.chapter??c.number??i+1),h:c.h??c.title,v:(c.v??c.verses??[]).map((x,k)=>Array.isArray(x)?[String(x[0]),String(x[1])]:typeof x==='string'?[String(k+1),x]:[String(x.verse??x.number??k+1),String(x.text??'')])});
  if(Array.isArray(j?.c))return{how:'JSON (Bible Reader format)',c:fromArr(j.c)};
  if(Array.isArray(j?.chapters))return{how:'JSON (chapters array)',c:fromArr(j.chapters)};
  if(Array.isArray(j))return{how:'JSON array',c:fromArr(j)};
  if(Array.isArray(j?.books)&&j.books.length)return{how:'JSON (books)',books:j.books.map(b=>({name:b.name||b.book,c:fromArr(b.chapters||b.c||[])}))};
  throw new Error('Unrecognised JSON. Expected {"chapters":[{"chapter":1,"verses":[{"verse":1,"text":"…"}]}]} or similar.')}
async function loadPdfJs(){if(window.pdfjsLib)return window.pdfjsLib;await new Promise((res,rej)=>{const s=document.createElement('script');s.src=PDFJS+'pdf.min.js';s.onload=res;s.onerror=()=>rej(new Error('Could not load the PDF reader (are you offline?)'));document.head.appendChild(s)});window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS+'pdf.worker.min.js';return window.pdfjsLib}
async function pdfText(file){const lib=await loadPdfJs();const pdf=await lib.getDocument({data:await file.arrayBuffer()}).promise;let out='';
  for(let i=1;i<=pdf.numPages;i++){const pg=await pdf.getPage(i);const tc=await pg.getTextContent();let lastY=null;for(const it of tc.items){const y=it.transform[5];if(lastY!==null&&Math.abs(y-lastY)>2)out+='\n';out+=it.str;lastY=y}out+='\n\n'}
  return out.replace(/(\w)-\n(\w)/g,'$1$2')}
async function parseUpload(file){
  const ext=(file.name.match(/\.([a-z0-9]+)$/i)||[])[1]?.toLowerCase();
  if(ext==='pdf')return Object.assign(parseText(await pdfText(file)),{how2:'PDF text (via pdf.js)'});
  const t=await file.text();
  if(ext==='json')return parseJson(t);
  if(ext==='xml'||/^\s*<\?xml|^\s*<(osis|XMLBIBLE|bible)/i.test(t))return parseXmlBooks(t);
  if(ext==='usfm'||ext==='sfm'||/^\\id\s/m.test(t))return parseUsfm(t);
  return parseText(t);
}
let upState=null;
function startUpload(uid,replace){const inp=document.createElement('input');inp.type='file';inp.accept='.txt,.md,.json,.xml,.usfm,.sfm,.pdf,text/plain,application/json,application/xml,application/pdf';
  inp.onchange=()=>{if(inp.files[0])previewUpload(uid,inp.files[0],replace)};document.body.appendChild(inp);inp.style.display='none';inp.click();setTimeout(()=>inp.remove(),60000)}
async function previewUpload(uid,file,replace){
  const it=naItems()[uid]; const P=$('#uploadPanel'); openPanel('#uploadPanel'); P.innerHTML='<div class="muted">Reading '+esc(file.name)+'…</div>';
  let r; try{r=await parseUpload(file)}catch(e){P.innerHTML=`<h2>Couldn’t read that file</h2><p class="err">${esc(e.message)}</p><div class="row"><button id="upCancel">Close</button></div>`;$('#upCancel').onclick=closeAll;return}
  const books=r.books||[{name:r.book||it?.name,c:r.c}];
  upState={uid,file:file.name,how:(r.how2?r.how2+' → ':'')+r.how,books,bi:0,name:(it?.name||books[0].name||file.name)};
  drawPreview();
}
function drawPreview(){const s=upState,P=$('#uploadPanel'),b=s.books[s.bi]; const nv=b.c.reduce((a,c)=>a+c.v.length,0);
  P.innerHTML=`<h2>Preview</h2><p class="fine">File <b>${esc(s.file)}</b> · detected: ${esc(s.how)} · ${b.c.length} chapter${b.c.length===1?'':'s'}, ${nv} verse${nv===1?'':'s'}/paragraphs.</p>
  ${s.books.length>1?`<div class="set"><label>Which book in this file?</label><select id="upBook">${s.books.map((x,i)=>`<option value="${i}"${i===s.bi?' selected':''}>${esc(x.name)}</option>`).join('')}</select></div>`:''}
  <div class="set"><label>Show it as</label><input id="upName" value="${esc(s.name)}"></div>
  <div class="upprev">${b.c.slice(0,2).map(c=>`<div><b>${esc(c.n)}</b>${c.h?' <i>'+esc(c.h)+'</i>':''}</div>`+c.v.slice(0,4).map(v=>`<div><sup>${esc(v[0])}</sup> ${esc(v[1].slice(0,240))}${v[1].length>240?'…':''}</div>`).join('')).join('')}</div>
  <p class="fine">Stored only in this browser (IndexedDB). It is never uploaded to GitHub or anywhere else.</p>
  <div class="row"><button id="upOk" class="primary"${nv?'':' disabled'}>Add to my library</button><button id="upCancel">Cancel</button></div>`;
  if($('#upBook'))$('#upBook').onchange=e=>{s.bi=+e.target.value;drawPreview()};
  $('#upCancel').onclick=closeAll;
  $('#upOk').onclick=async()=>{const u={uid:s.uid,name:($('#upName').value.trim()||s.name),file:s.file,added:Date.now(),c:b.c.map(c=>({n:String(c.n),...(c.h?{h:c.h}:{}),v:c.v.filter(v=>v[1])}))};
    await uPut('u:'+s.uid,u); registerUser(u); toast('Added “'+u.name+'” (your file)'); closeAll(); go('U_'+s.uid,u.c[0].n)}}
async function drawUserFiles(){const box=$('#userFiles');if(!box)return;const all=await uAll().catch(()=>[]);
  box.innerHTML=all.length?all.map(u=>`<div class="ufile"><div><b>${esc(u.name)}</b><small>${esc(u.file)} · ${u.c.length} ch. · ${new Date(u.added).toLocaleDateString()}</small></div><button data-rep="${esc(u.uid)}">Replace</button><button data-del="${esc(u.uid)}">Remove</button></div>`).join(''):'<div class="muted">None yet. In the book picker, hover over (or tap) a greyed-out book and choose “Upload file”.</div>';
  box.querySelectorAll('[data-rep]').forEach(b=>b.onclick=()=>startUpload(b.dataset.rep,true));
  box.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{const u=all.find(x=>x.uid===b.dataset.del);if(!confirm('Remove your file for “'+u.name+'” from this browser?'))return;await uDel('u:'+u.uid);delete cat.books['U_'+u.uid];cat.order=cat.order.filter(x=>x!=='U_'+u.uid);cache.delete('user/U_'+u.uid);if(cur.book==='U_'+u.uid)go('JHN',1);toast('Removed');drawUserFiles()})}
// per-verse compare across every translation that has this book
async function verseCompare(book,ch,v){openPanel('#comparePanel');const P=$('#comparePanel');P.innerHTML=`<div class="sheethead"><h2>${esc(refText(book,ch,v))}</h2><button class="x" id="cmpX">Done</button></div><div id="cmpBody" class="muted">Loading…</div>`;$('#cmpX').onclick=closeAll;
  const rows=await Promise.all(trsFor(book).map(async t=>{try{const d=await getData(t,book);const c=d.c.find(x=>x.n===ch);const x=c&&c.v.find(y=>y[0]===v);return x?`<div class="cmp"><b>${esc(cat.translations[t].short)}</b><span>${esc(x[1])}</span></div>`:''}catch(e){return''}}));
  $('#cmpBody').className='';$('#cmpBody').innerHTML=rows.join('')||'<div class="muted">Only one translation has this verse.</div>'}
// ---------- phone layout (ESV-style): top bar, bottom tabs, swipe, sheets ----------
const PHONE_MQ='(max-width: 760px), (pointer: coarse) and (max-width: 1024px)';
function applyPhone(){document.body.classList.toggle('phone',matchMedia(PHONE_MQ).matches)}
function setTab(t){$$('#tabbar button').forEach(b=>b.classList.toggle('on',b.dataset.tab===t))}
function bindPhone(){
  applyPhone(); matchMedia(PHONE_MQ).addEventListener?.('change',applyPhone);
  $('#pRef').onclick=openPicker;
  $('#pTr').onclick=()=>{const t=trsFor(cur.book);if(t.length<2){toast('Only '+cat.translations[cur.tr].short+' has this book');return}const i=t.indexOf(cur.tr);prefs.tr=t[(i+1)%t.length];savePrefs();render({keepScroll:true});toast(cat.translations[prefs.tr].name)};
  $('#pAa').onclick=()=>{openPanel('#settings');drawSettings()};
  $$('#tabbar button').forEach(b=>b.onclick=()=>{const t=b.dataset.tab;
    if(t==='read'){closeAll();return}
    if(t==='search'){openPanel('#searchPanel');$('#searchInput').focus()}
    if(t==='marks'){openPanel('#marksPanel');drawMarks()}
    if(t==='settings'){openPanel('#settings');drawSettings()}});
  $$('.panel').forEach(p=>{if(!p.querySelector('.sheetclose')){const b=document.createElement('button');b.className='sheetclose';b.textContent='Done';b.onclick=closeAll;p.prepend(b)}});
  $('#sheetShade').onclick=()=>{$('#verseMenu').hidden=true;$('#sheetShade').hidden=true;$$('.v.sel').forEach(x=>x.classList.remove('sel'))};
  // swipe left/right on the reading view to change chapter
  let sx=0,sy=0,st=0; const M=$('#main');
  M.addEventListener('touchstart',e=>{const t=e.touches[0];sx=t.clientX;sy=t.clientY;st=Date.now()},{passive:true});
  M.addEventListener('touchend',e=>{const t=e.changedTouches[0];const dx=t.clientX-sx,dy=t.clientY-sy;if(Math.abs(dx)>70&&Math.abs(dy)<60&&Date.now()-st<800&&!window.getSelection().toString()){step(dx<0?1:-1)}},{passive:true});
}
// ---------- init ----------
async function init(){
  if('scrollRestoration' in history)history.scrollRestoration='manual'; // we place the scroll ourselves
  prefs=loadJ('br.prefs',{}); marks=Object.assign({hl:{},notes:{},bm:{}},loadJ('br.marks',{}));
  setTheme(prefs.theme||'light'); setFont(0);
  cat=await fetch('data/catalog.json').then(r=>r.json());
  await enableLsb().catch(()=>false);
  await loadUsers();
  if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').catch(e=>console.warn('SW',e));
  if(prefs.defTr==='lsb'&&!cat.translations.lsb)prefs.defTr='web';
  cur.compare=!!prefs.compare;
  const h=location.hash.match(/^#\/([^/]+)\/([^/]+)(?:\/([^/]+))?/);
  const pos=h?{book:h[1],ch:decodeURIComponent(h[2]),v:h[3]}:(prefs.pos||{book:'JHN',ch:'1'});
  if(!cat.books[pos.book])pos.book='JHN';
  bind();
  if(!prefs.welcomed){$('#welcome').hidden=false} 
  go(pos.book,pos.ch,pos.v,h?reloadY(pos.book+'/'+pos.ch):null);
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
  document.addEventListener('click',e=>{if(!e.target.closest('#verseMenu')&&!e.target.closest('.v')){$('#verseMenu').hidden=true;$('#sheetShade').hidden=true;$$('.v.sel').forEach(x=>x.classList.remove('sel'))}});
  bindPhone();
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
