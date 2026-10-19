const { chromium, devices } = require('playwright-core');
const BASE = process.argv[2] || 'https://sublebow.github.io/bible-reader/';
const OUT = __dirname + '/scroll/' + (process.argv[3] || 'before');
require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  let fails = 0;
  for (const mode of ['phone', 'desktop']) {
    const ctx = mode === 'phone' ? await br.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }) : await br.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    const m = async (name, wantTop = true) => {
      await p.waitForTimeout(700);
      const r = await p.evaluate(() => { const bar = document.querySelector(document.body.classList.contains('phone') ? '#pbar' : '#bar'); const bb = bar.getBoundingClientRect().bottom; const h = document.querySelector('#reader h1').getBoundingClientRect(); return { y: Math.round(scrollY), barBottom: Math.round(bb), h1Top: Math.round(h.top), hash: location.hash } });
      const ok = wantTop ? r.y === 0 && r.h1Top >= r.barBottom : true;
      if (!ok) fails++;
      console.log((ok ? 'PASS ' : 'FAIL ') + mode + ' ' + name + ' ' + JSON.stringify(r));
      await p.screenshot({ path: `${OUT}/${mode}-${name}.png` }); return r;
    };
    await p.goto(BASE); await p.waitForSelector('#welcome:not([hidden])'); await p.click('#wWeb'); await p.waitForSelector('#reader .v');
    await m('first-load');
    // scroll down then open a chapter from the picker
    await p.evaluate(() => scrollTo(0, 1500)); await p.waitForTimeout(300);
    if (mode === 'phone') { await p.tap('#pRef'); } else { await p.click('#btnRef'); }
    await p.waitForSelector('#picker:not([hidden]) [data-b="ROM"], .panel:not([hidden]) [data-b="ROM"]');
    await p.click('.panel:not([hidden]) [data-b="ROM"]'); await p.click('#pickBody [data-c="8"]'); await p.click('#pickWhole');
    await m('picker-rom8');
    await p.evaluate(() => scrollTo(0, 2000)); await p.waitForTimeout(300);
    if (mode === 'phone') { await p.evaluate(() => { const M = document.querySelector('main') || document.querySelector('#reader'); const mk = (type, x) => { const t = new Touch({ identifier: 1, target: M, clientX: x, clientY: 400 }); M.dispatchEvent(new TouchEvent(type, { bubbles: true, touches: type === 'touchend' ? [] : [t], changedTouches: [t] })) }; mk('touchstart', 320); mk('touchend', 80); }); }
    else { await p.keyboard.press('ArrowRight'); }
    await m('next-chapter');
    await p.evaluate(() => { document.querySelector('#fNext').click(); setTimeout(() => window.scrollBy(0, 120), 150); }); await m('next+late-drift');
    await p.evaluate(() => scrollTo(0, 1200)); await p.waitForTimeout(300);
    await p.evaluate(() => document.querySelector('#fNext').click()); await m('footer-next');
    await p.evaluate(() => scrollTo(0, 1200)); await p.waitForTimeout(300);
    await p.evaluate(() => { location.hash = '#/MRK/4'; }); await p.reload(); await p.waitForSelector('#reader .v'); await m('reload-mrk4');
    await p.goto(BASE + '#/LUK/2/10'); await p.reload(); await p.waitForSelector('.v[data-v="10"]'); await p.waitForTimeout(700);
    const v = await p.evaluate(() => { const bar = document.querySelector(document.body.classList.contains('phone') ? '#pbar' : '#bar').getBoundingClientRect().bottom; const r = document.querySelector('.v[data-v="10"]').getBoundingClientRect(); return { y: Math.round(scrollY), barBottom: Math.round(bar), vTop: Math.round(r.top), vh: innerHeight } });
    const vok = v.y > 0 && v.vTop >= v.barBottom && v.vTop < v.vh; if (!vok) fails++;
    console.log((vok ? 'PASS ' : 'FAIL ') + mode + ' verse-jump LUK 2:10 ' + JSON.stringify(v)); await p.screenshot({ path: `${OUT}/${mode}-verse-luk2-10.png` });
    // reload keeps the exact spot (no verse in URL)
    await p.goto(BASE + '#/ROM/8'); await p.reload(); await p.waitForSelector('#reader .v'); await p.waitForTimeout(900);
    await p.mouse.wheel(0, 900); await p.waitForTimeout(600); const y0 = await p.evaluate(() => Math.round(scrollY));
    await p.reload(); await p.waitForSelector('#reader .v'); await p.waitForTimeout(1200); const y1 = await p.evaluate(() => Math.round(scrollY));
    const rok = y0 > 300 && Math.abs(y1 - y0) <= 2; if (!rok) fails++; console.log((rok ? 'PASS ' : 'FAIL ') + mode + ' reload keeps spot ' + y0 + ' -> ' + y1);
    // user scrolling right after opening a chapter is not fought
    await p.evaluate(() => document.querySelector('#fNext').click()); await p.waitForTimeout(250); await p.mouse.wheel(0, 500); await p.waitForTimeout(900);
    const uy = await p.evaluate(() => Math.round(scrollY)); const uok = uy > 200; if (!uok) fails++; console.log((uok ? 'PASS ' : 'FAIL ') + mode + ' user scroll after open respected ' + uy);
    console.log('errors', errs.length, errs.join('|'));
    await ctx.close();
  }
  await br.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
})();
