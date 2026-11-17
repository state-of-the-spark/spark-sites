// Live checks for 0.4.0 on the public homepage, in the installed Chrome (the site's bot check blocks bundled headless Chromium).
// Desktop user agent at both widths (the bot check blocks phone user agents). Every address carries sl_test=1 (nothing is recorded), except the one
// "ordinary visit", which carries the staff cookie so the plugin script never counts it. No clicks, no forms.
//   node live-verify-phaseB.js testvisit
//   node live-verify-phaseB.js preview <token> <hero selector>
const { chromium } = require('playwright-core');
const OUT = 'C:/Users/grant/Documents/GitHub/spark-sites/sites/living-websites/audit/screenshots/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const SITE = 'https://sparkmysite.com/';
const mode = process.argv[2];

async function open(p, url) {
  let ok = false;
  for (let i = 0; i < 4 && !ok; i++) {
    await p.goto(url + (url.includes('?') ? '&' : '?') + 'lv=' + Date.now(), { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => !/Checking your browser/i.test(document.title), null, { timeout: 30000 }).catch(() => {});
    await p.waitForLoadState('load').catch(() => {});
    await p.waitForTimeout(2500);
    ok = await p.evaluate(() => !!document.querySelector('#contact, .et_pb_section') && document.documentElement.scrollHeight > 1500);
  }
  return ok;
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', args: ['--disable-blink-features=AutomationControlled'] });
  const out = [];
  if (mode === 'testvisit') {
    const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1366, height: 900 } });
    const p = await ctx.newPage();
    for (const F of ['B', 'A']) {
      const ok = await open(p, `${SITE}?sl_test=1&sl_force=${F}`);
      const info = await p.evaluate(() => {
        const all = [...document.querySelectorAll('a.et_pb_button[href="#contact"]')].map((e) => ({ text: (e.textContent || '').trim(), top: Math.round(e.getBoundingClientRect().top + scrollY), vis: e.getBoundingClientRect().width > 0 }));
        const hdr = all.filter((x) => x.top < 160 && x.vis)[0] || null;
        return { all, hdr, cls: document.documentElement.className.split(' ').filter((c) => /^sl-v-|data-sl/.test(c)).join(' '), testAttr: document.documentElement.getAttribute('data-sl-test'), cookies: document.cookie.split('; ').map((c) => c.split('=')[0]).filter((n) => /^spark_living/.test(n)), assignments: window.sparkLivingTest ? window.sparkLivingTest.assignments : null };
      });
      await p.screenshot({ path: OUT + `live-testvisit-force${F}.png`, clip: { x: 0, y: 0, width: 1366, height: 160 } });
      out.push(`force${F}: loaded=${ok} header button="${info.hdr && info.hdr.text}" matches=${info.all.length} class="${info.cls}" data-sl-test=${info.testAttr} spark_living cookies=[${info.cookies}] assignments=${JSON.stringify(info.assignments)}`);
      out.push(OUT + `live-testvisit-force${F}.png`);
    }
    await ctx.close();
  } else if (mode === 'preview') {
    const token = process.argv[3], sel = process.argv[4];
    const addr = (extra) => `${SITE}?sl_test=1&sl_exp=46912&sl_force=B${extra}`;
    for (const [name, vp] of [['desktop', { width: 1366, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
      const ctx = await browser.newContext({ userAgent: UA, viewport: vp, deviceScaleFactor: name === 'mobile' ? 2 : 1 });
      const p = await ctx.newPage();
      const ok = await open(p, addr('&sl_pt=' + token));
      const info = await p.evaluate((sel) => {
        const e = document.querySelector(sel); if (!e) return { found: false };
        const cs = getComputedStyle(e), r = e.getBoundingClientRect();
        return { found: true, text: (e.textContent || '').trim(), outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor, bg: cs.backgroundColor, color: cs.color, top: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height), sw: document.documentElement.scrollWidth, iw: innerWidth, testAttr: document.documentElement.getAttribute('data-sl-test'), assignments: window.sparkLivingTest ? window.sparkLivingTest.assignments : null };
      }, sel);
      await p.evaluate((sel) => { const e = document.querySelector(sel); if (e) { e.scrollIntoView({ block: 'center' }); } }, sel);
      await p.waitForTimeout(800);
      await p.screenshot({ path: OUT + `live-preview-46912-${name}.png` });
      out.push(`preview ${name}: loaded=${ok} ${JSON.stringify(info)}`);
      out.push(OUT + `live-preview-46912-${name}.png`);
      await ctx.close();
    }
    // The same address without the token, and an ordinary visit (staff cookie so it is never counted).
    const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1366, height: 900 } });
    const p = await ctx.newPage();
    const read = (sel) => p.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return { found: false }; const cs = getComputedStyle(e); return { found: true, text: (e.textContent || '').trim(), outline: cs.outlineStyle + ' ' + cs.outlineWidth, bg: cs.backgroundColor, hasPreview: !!(window.sparkLiving && window.sparkLiving.tests && window.sparkLiving.tests.some((t) => t.mode === 'preview')) }; }, sel);
    await open(p, addr(''));
    let info = await read(sel);
    await p.evaluate((sel) => { const e = document.querySelector(sel); if (e) e.scrollIntoView({ block: 'center' }); }, sel); await p.waitForTimeout(600);
    await p.screenshot({ path: OUT + 'live-preview-46912-notoken-desktop.png' });
    out.push('no token (test-visit address, no sl_pt): ' + JSON.stringify(info)); out.push(OUT + 'live-preview-46912-notoken-desktop.png');
    await ctx.addCookies([{ name: 'spark_living_staff', value: '1', domain: 'sparkmysite.com', path: '/', secure: true, httpOnly: false, sameSite: 'Lax' }]);
    await open(p, SITE + `?sl_exp=46912&sl_force=B`);
    info = await read(sel);
    out.push('ordinary visit (staff cookie, no sl_test, sl_exp and sl_force in the address): ' + JSON.stringify(info));
    await ctx.close();
  }
  await browser.close();
  console.log(out.join('\n'));
})().catch((e) => { console.error(e); process.exit(2); });
