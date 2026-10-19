const { chromium } = require('/workspace/bible-reader/node_modules/playwright-core');
const BASE = process.argv[2] || 'http://localhost:8765/';
const SHOT = process.argv[3] || '/workspace/bible-reader/screenshot.png';
const log = (...a) => console.log(...a);
let fails = 0; const ok = (c, m) => { log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  // ---------- Path A: Use WEB ----------
  let ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  let p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.goto(BASE); await p.waitForSelector('#welcome:not([hidden])');
  ok(true, 'welcome screen shown on first visit');
  await p.click('#wWeb'); await p.waitForSelector('#welcome', { state: 'hidden' });
  await p.goto(BASE + '#/JHN/3/16'); await p.reload(); await p.waitForSelector('.v[data-v="16"]');
  ok(await p.isHidden('#welcome'), 'welcome not shown again after choice');
  let t = await p.textContent('.v[data-v="16"]'); ok(/For God so loved the world/.test(t), 'WEB John 3:16: ' + t.trim().slice(0, 70));
  ok((await p.inputValue('#selTr')) === 'web', 'WEB is current translation');
  // Enoch via palette
  await p.keyboard.press('Control+k'); await p.fill('#palInput', 'enoch 6'); await p.keyboard.press('Enter');
  await p.waitForFunction(() => document.querySelector('h1')?.textContent === '1 Enoch');
  t = await p.textContent('#reader'); ok(/children of men had multiplied/.test(t) && /Semj/.test(t), 'Enoch 6 renders (Charles)');
  ok(/R\. H\. Charles/.test(await p.textContent('.credit')), 'Enoch credit shown');
  // picker tabs
  await p.click('#btnRef'); for (const tab of ['prot', 'cath', 'eth', 'gos', 'all']) { await p.click(`#pickTabs [data-t="${tab}"]`); }
  await p.click('#pickTabs [data-t="eth"]'); const na = await p.$$eval('#pickBody .na', e => e.length); ok(na >= 5, 'Ethiopian tab greys out unavailable books: ' + na);
  await p.click('#pickTabs [data-t="gos"]'); await p.click('#pickBody [data-b="GTH"]'); await p.click('#pickBody [data-c="77"]'); await p.waitForSelector('#pickBody [data-v]'); await p.click('#pickBody [data-v="1"]');
  await p.waitForFunction(() => document.querySelector('h1')?.textContent === 'Gospel of Thomas'); t = await p.textContent('#reader'); ok(/Split a log/.test(t), 'Picker tab→book→chapter→verse: Thomas 77');
  await p.click('#btnRef'); ok(await p.$eval('#pickTabs .on', e => e.dataset.t) === 'gos', 'last tab remembered');
  await p.keyboard.press('Escape');
  // catholic
  await p.goto(BASE + '#/1MA/1'); await p.reload(); await p.waitForSelector('.v'); ok(/Alexander/.test(await p.textContent('#reader')), '1 Maccabees renders');
  await p.goto(BASE + '#/MQ2/1'); await p.reload(); await p.waitForSelector('.v'); ok((await p.textContent('h1')) === '2 Meqabyan', '2 Meqabyan renders');
  // search
  await p.goto(BASE + '#/JHN/3'); await p.reload(); await p.waitForSelector('.v');
  await p.click('#btnSearch'); await p.fill('#searchInput', 'only begotten'); await p.waitForFunction(() => /results? in/.test(document.querySelector('#searchStatus').textContent), null, { timeout: 60000 });
  let st = await p.textContent('#searchStatus'); ok(/\d+ results? in World English/.test(st), 'search: ' + st);
  await p.fill('#searchInput', 'loved the world'); await p.waitForFunction(() => /results? in/.test(document.querySelector('#searchStatus').textContent) && document.querySelector('#searchResults .res'), null, { timeout: 60000 });
  const firstRes = await p.textContent('#searchResults .res b'); ok(firstRes.length > 0, 'search result: ' + firstRes);
  await p.keyboard.press('Escape');
  // themes
  for (const th of ['sepia', 'dark', 'light']) { await p.click('#btnTheme'); }
  await p.click('#btnSettings'); await p.click('#themeSeg [data-t="dark"]'); ok(await p.evaluate(() => document.body.dataset.theme) === 'dark', 'theme switch to dark'); 
  const bg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor); ok(bg === 'rgb(22, 22, 26)', 'dark bg applied ' + bg);
  await p.click('#themeSeg [data-t="sepia"]'); ok(await p.evaluate(() => document.body.dataset.theme) === 'sepia', 'theme switch to sepia');
  await p.keyboard.press('Escape');
  // arrow keys + highlight persistence
  await p.keyboard.press('ArrowRight'); await p.waitForFunction(() => /John 4/.test(document.querySelector('#btnRef').textContent)); ok(true, 'ArrowRight → John 4');
  await p.keyboard.press('ArrowLeft'); await p.waitForFunction(() => /John 3/.test(document.querySelector('#btnRef').textContent));
  await p.click('.v[data-v="16"]'); await p.click('#verseMenu [data-hl="y"]'); await p.reload(); await p.waitForSelector('.v[data-v="16"]');
  ok(await p.$eval('.v[data-v="16"]', e => e.classList.contains('hl-y')), 'highlight persisted after reload');
  ok(/John 3/.test(await p.textContent('#btnRef')), 'last position remembered');
  ok(errs.length === 0, 'no page errors (WEB path) ' + errs.join(' | '));
  await ctx.close();
  // ---------- Path B: Add LSB ----------
  ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); p = await ctx.newPage(); const errs2 = []; p.on('pageerror', e => errs2.push(e.message));
  await p.goto(BASE + '#/JHN/3/16'); await p.waitForSelector('#welcome:not([hidden])');
  await p.click('#wLsb'); await p.waitForSelector('#wProg:not([hidden])'); ok(true, 'LSB progress indicator shown');
  await p.waitForSelector('#welcome', { state: 'hidden', timeout: 120000 });
  await p.waitForFunction(() => document.querySelector('#selTr').value === 'lsb', null, { timeout: 30000 });
  t = await p.textContent('.v[data-v="16"]'); ok(/For God so loved the world, that He gave His only begotten Son/.test(t), 'LSB John 3:16: ' + t.trim().slice(0, 90));
  await p.reload(); await p.waitForSelector('.v[data-v="16"]'); ok((await p.inputValue('#selTr')) === 'lsb' && await p.isHidden('#welcome'), 'LSB persists as default after reload');
  await p.click('#btnCompare'); await p.waitForFunction(() => document.querySelectorAll('.col').length === 2, null, {timeout:10000}).catch(()=>{}); ok((await p.$$('.col')).length === 2, 'compare view shows two columns');
  await p.click('#btnSettings'); await p.click('#themeSeg [data-t="sepia"]'); await p.keyboard.press('Escape');
  await p.click('#btnSearch'); await p.fill('#searchInput', 'begotten'); await p.waitForFunction(() => /results? in Legacy/.test(document.querySelector('#searchStatus').textContent), null, { timeout: 60000 });
  ok(true, 'LSB search: ' + await p.textContent('#searchStatus')); await p.keyboard.press('Escape');
  await p.click('#btnCompare'); await p.waitForFunction(() => document.querySelectorAll('.col').length === 1);
  await p.goto(BASE + '#/JHN/3/16'); await p.reload(); await p.waitForSelector('.v[data-v="16"]'); await p.waitForTimeout(1200);
  await p.screenshot({ path: SHOT });
  await p.click('#btnRef'); await p.click('#pickTabs [data-t="eth"]'); await p.waitForTimeout(300); await p.screenshot({ path: SHOT.replace('.png','-ethiopian-tab.png') }); await p.keyboard.press('Escape');
  // non-LSB book falls back
  await p.goto(BASE + '#/ENO/1'); await p.reload(); await p.waitForSelector('.v'); ok(/isn’t in the LSB/.test(await p.textContent('#reader')), 'Enoch shows fallback notice while LSB default');
  ok(errs2.length === 0, 'no page errors (LSB path) ' + errs2.join(' | '));
  await browser.close(); log(fails ? `${fails} FAILED` : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2) });
