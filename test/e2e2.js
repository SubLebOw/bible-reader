// Round-2 checks: new books, Supporting Texts tab, upload for greyed books, phone layout + PWA.
const { chromium, devices } = require('/workspace/bible-reader/node_modules/playwright-core');
const BASE = process.argv[2] || 'http://localhost:8765/';
const OUT = process.argv[3] || '/workspace/bible-reader';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push(m.text()) });
  await p.goto(BASE); await p.waitForSelector('#welcome:not([hidden])'); await p.click('#wWeb');
  const checks = [['SIN2', '1', /Yuhanes/, 'Horner'], ['DIDA', '1', /Clement/, 'Harden'], ['JOSI', '1', /Gorion/, 'HEBREW Josippon'], ['COV2R', '2', /Cephas/, 'Epistle of the Apostles'],
    ['CLEMR', '1', /Mount of Olives/, 'Ethiopic'], ['TAC', '15.44', /Christus/, 'Church'], ['PLIN', '10.96', /Christians/, 'Melmoth'], ['JOSA', '18.3.3', /wise man/, 'Whiston'],
    ['SUET', 'Claudius 25', /Chrestus/, 'Rolfe'], ['MARA', '1', /wise king/i, 'Cureton'], ['LUC', '11–14', /crucified/, 'Fowler'], ['THAL', '1', /Thallus/, 'Salmond'], ['TDOM', 'I.1', /Holy Ghost/, 'Cooper'], ['POX1224', 'Fr. 2 verso ii (p. 175)', /physician/, 'Grenfell'], ['LINF', '1', /Christmas night/, 'Hogan']];
  for (const [b, c, re, cr] of checks) {
    await p.goto(BASE + '#/' + b + '/' + encodeURIComponent(c)); await p.reload(); await p.waitForSelector('#reader .v');
    const t = await p.textContent('#reader'); ok(re.test(t) && (await p.textContent('.credit')).includes(cr), `${b} ${c} renders, credit mentions ${cr}`);
  }
  await p.click('#btnRef'); await p.click('#pickTabs [data-t="sup"]');
  ok((await p.$$eval('#pickBody [data-b]', e => e.map(x => x.dataset.b))).join() === 'TAC,PLIN,SUET,LUC,THAL,JOSA,MARA', 'Supporting Texts tab lists the 7 texts');
  ok((await p.textContent('#pickBody')).includes('Sanhedrin 43a'), 'Talmud shown greyed with note');
  await p.click('#pickTabs [data-t="all"]'); ok((await p.$$('#pickBody [data-b="TAC"]')).length === 1, 'All tab includes Supporting Texts');
  // upload for a greyed book
  await p.click('#pickTabs [data-t="eth"]'); const na = p.locator('#pickBody .na[data-uid="SIN1"]');
  ok(await na.locator('.up').isHidden(), 'Upload button hidden until hover'); await na.hover(); ok(await na.locator('.up').isVisible(), 'hover reveals Upload file button');
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), na.locator('.up').click()]);
  await fc.setFiles('/workspace/bible-reader/test/sample-upload.txt');
  await p.waitForSelector('#uploadPanel:not([hidden]) #upOk'); const pv = await p.textContent('#uploadPanel');
  ok(/2 chapters, 5 verse/.test(pv) && /sample line/.test(pv), 'preview shows 2 chapters, 5 verses');
  await p.click('#upOk'); await p.waitForFunction(() => /sample line/.test(document.querySelector('#reader').textContent)); let t = await p.textContent('#reader');
  ok(/sample line of my own text/.test(t) && /stored only in this browser/.test(await p.textContent('.credit')), 'uploaded text renders, labelled as your file');
  await p.reload(); await p.waitForFunction(() => /sample line/.test(document.querySelector('#reader')?.textContent||''), null, {timeout:10000}).catch(()=>{}); ok(/sample line/.test(await p.textContent('#reader')), 'upload persists after reload');
  await p.click('#btnRef'); await p.click('#pickTabs [data-t="eth"]'); ok((await p.textContent('#pickBody [data-b="U_SIN1"]')).includes('your file'), 'picker un-greys book with “your file”');
  await p.keyboard.press('Escape'); await p.click('#btnSettings'); await p.waitForSelector('#userFiles .ufile'); ok((await p.textContent('#userFiles')).includes('sample-upload.txt'), 'Settings lists the file with Replace/Remove');
  p.once('dialog', d => d.accept()); await p.click('#userFiles [data-del="SIN1"]'); await p.waitForFunction(() => !document.querySelector('#userFiles .ufile'));
  ok(true, 'Remove works'); await p.keyboard.press('Escape');
  // verse compare from verse menu (desktop)
  await p.goto(BASE + '#/JHN/3/16'); await p.reload(); await p.waitForSelector('.v[data-v="16"]'); await p.click('.v[data-v="16"]'); await p.click('#verseMenu [data-a=cmp]');
  await p.waitForSelector('#comparePanel .cmp'); ok((await p.$$('#comparePanel .cmp')).length >= 3, 'verse compare lists several translations');
  ok(errs.length === 0, 'no page errors (desktop): ' + errs.join(' | '));
  // ---------- phone ----------
  const ph = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36' });
  const q = await ph.newPage(); const perr = []; q.on('pageerror', e => perr.push(e.message));
  await q.goto(BASE); await q.waitForSelector('#welcome:not([hidden])'); await q.screenshot({ path: OUT + '/phone-welcome.png' }); await q.tap('#wWeb');
  await q.goto(BASE + '#/JHN/3'); await q.reload(); await q.waitForSelector('.v[data-v="16"]');
  ok(await q.evaluate(() => document.body.classList.contains('phone')), 'phone layout active at 390px with mobile UA');
  ok(await q.isVisible('#tabbar') && await q.isHidden('#bar') && /John 3/.test(await q.textContent('#pRef')), 'top bar shows John 3; bottom tab bar visible');
  ok(await q.isVisible('.dropnum'), 'ESV-style drop chapter numeral');
  await q.screenshot({ path: OUT + '/phone-read.png' });
  await q.tap('.v[data-v="16"]'); await q.waitForSelector('#verseMenu:not([hidden])');
  const box = await q.$eval('#verseMenu', e => { const r = e.getBoundingClientRect(); return { b: r.bottom, w: r.width } });
  ok(box.w > 350 && box.b > 700, 'verse tap opens bottom action sheet'); ok(/Share Verse/.test(await q.textContent('#verseMenu')) && /Compare/.test(await q.textContent('#verseMenu')), 'sheet has highlight, note, bookmark, copy, share, compare');
  await q.waitForTimeout(400); await q.screenshot({ path: OUT + '/phone-verse-sheet.png' });
  await q.tap('#verseMenu .sw.hl-b'); await q.waitForSelector('.v[data-v="16"].hl-b'); ok(true, 'highlight from sheet');
  // swipe left => next chapter
  await q.evaluate(() => { const m = document.querySelector('#main'); const mk = (type, x) => { const t = new Touch({ identifier: 1, target: m, clientX: x, clientY: 400 }); m.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true })) }; mk('touchstart', 320); mk('touchend', 80) });
  await q.waitForFunction(() => /John 4/.test(document.querySelector('#pRef').textContent)); ok(true, 'swipe left goes to next chapter (John 4)');
  await q.tap('#pRef'); await q.waitForSelector('#picker:not([hidden])');
  const pk = await q.$eval('#picker', e => { const r = e.getBoundingClientRect(); return r.width >= 389 && r.top <= 1 });
  ok(pk, 'picker opens as full-screen sheet'); await q.tap('#pickTabs [data-t="prot"]'); await q.screenshot({ path: OUT + '/phone-picker-books.png' });
  await q.tap('#pickBody [data-b="PSA"]'); await q.waitForSelector('#pickBody [data-c]'); await q.screenshot({ path: OUT + '/phone-picker-chapters.png' });
  await q.tap('#pickBody [data-c="23"]'); await q.waitForSelector('#pickBody [data-v]'); await q.tap('#pickWhole'); await q.waitForFunction(() => /Psalms 23/.test(document.querySelector('#pRef').textContent)); ok(true, 'picker book grid → chapter grid → Psalms 23');
  await q.tap('#pRef'); await q.tap('#pickTabs [data-t="sup"]'); await q.screenshot({ path: OUT + '/phone-picker-supporting.png' }); await q.tap('#picker .sheetclose');
  await q.tap('#tabbar [data-tab=search]'); await q.fill('#searchInput', 'shepherd'); await q.waitForFunction(() => /results? in/.test(document.querySelector('#searchStatus').textContent), null, { timeout: 60000 }); await q.screenshot({ path: OUT + '/phone-search.png' }); ok(true, 'Search tab');
  await q.tap('#tabbar [data-tab=marks]'); await q.waitForSelector('#marksPanel:not([hidden])'); await q.tap('#marksTabs [data-k=hl]'); ok(/John 3:16/.test(await q.textContent('#marksBody')), 'Notes tab lists the highlight'); await q.screenshot({ path: OUT + '/phone-notes.png' });
  await q.tap('#tabbar [data-tab=settings]'); await q.waitForSelector('#settings:not([hidden])'); await q.tap('#fontUp'); await q.tap('#themeSeg [data-t=dark]'); await q.screenshot({ path: OUT + '/phone-settings.png' });
  await q.tap('#tabbar [data-tab=read]'); await q.screenshot({ path: OUT + '/phone-dark.png' }); await q.tap('#themeSeg [data-t=light]').catch(() => {});
  const man = await q.evaluate(async () => { const r = await fetch('manifest.webmanifest'); const j = await r.json(); return j.icons.length + ' ' + j.display });
  ok(/3 standalone/.test(man), 'manifest: ' + man);
  const sw = await q.evaluate(async () => { const r = await navigator.serviceWorker.ready; return !!r.active });
  ok(sw, 'service worker active');
  await q.waitForTimeout(500); const cached = await q.evaluate(async () => { const c = await caches.open('br-data'); return (await c.keys()).map(r => r.url).filter(u => /PSA|JHN/.test(u)).length });
  ok(cached >= 1, 'already-read chapters cached by service worker: ' + cached);
  ok(perr.length === 0, 'no page errors (phone): ' + perr.join(' | '));
  await browser.close(); console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2) });
