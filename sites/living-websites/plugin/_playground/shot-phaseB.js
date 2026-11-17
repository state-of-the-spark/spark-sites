// Phase B dashboard frames.
// Local: node shot-phaseB.js local          (seeds with seedB.js; shoots 1366 and 390, light and dark; also the rejected list opened)
// Live:  node shot-phaseB.js live <cookies.json>   (no seeding; cookies.json = {cookies: [{name, value}]}; writes live-dash-phaseB-desktop/mobile/dark.png, full page)
const { chromium } = require('playwright-core');
const fs = require('fs');
const { BASE, UA } = require('./lib');
const { seed } = require('./seedB');
const OUT = 'C:/Users/grant/Documents/GitHub/spark-sites/sites/living-websites/audit/screenshots/';
const mode = process.argv[2] || 'local';
const URL = mode === 'live' ? 'https://sparkmysite.com/living/' : BASE + '/living/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  if (mode === 'local') await seed();
  const browser = await chromium.launch();
  const out = [];
  const sets = mode === 'live'
    ? [['desktop', { width: 1366, height: 900 }, 'light'], ['mobile', { width: 390, height: 844 }, 'light'], ['dark', { width: 1366, height: 900 }, 'dark']]
    : [['desktop-light', { width: 1366, height: 900 }, 'light'], ['desktop-dark', { width: 1366, height: 900 }, 'dark'], ['mobile-light', { width: 390, height: 844 }, 'light'], ['mobile-dark', { width: 390, height: 844 }, 'dark']];
  for (const [name, vp, scheme] of sets) {
    const ctx = await browser.newContext({ userAgent: UA, viewport: vp, colorScheme: scheme, deviceScaleFactor: vp.width < 600 ? 2 : 1 });
    if (mode === 'live') {
      const ck = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
      await ctx.addCookies(ck.cookies.map((c) => ({ ...c, domain: 'sparkmysite.com', path: '/', secure: true, httpOnly: true, sameSite: 'Lax' })));
    } else {
      await ctx.addCookies([{ name: 'playground_auto_login_already_happened', value: '1', url: BASE }]);
    }
    const p = await ctx.newPage();
    if (mode !== 'live') { await p.goto(BASE + '/wp-login.php'); await p.fill('#user_login', 'admin'); await p.fill('#user_pass', 'password'); await p.click('#wp-submit'); await p.waitForLoadState('networkidle'); }
    for (let i = 0; i < 3; i++) { await p.goto(URL + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' }); await sleep(1500); if (await p.$('.sl-dash')) break; }
    await sleep(4500);
    const sw = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    const pre = mode === 'live' ? 'live-dash-phaseB-' : 'local-dash-phaseB-';
    const shot = async (sel, file) => { const el = await p.$(sel); if (!el) { out.push('MISSING ' + sel); return; } await el.scrollIntoViewIfNeeded(); await el.screenshot({ path: OUT + file }); out.push(OUT + file); };
    if (mode === 'local') {
      await shot('#sl-current + .sl-card', pre + name + '-running.png');
      await shot('#sl-suggested ~ article.sl-sug', pre + name + '-suggestion.png');
      await shot('#sl-plan', pre + name + '-plan.png');
      await p.evaluate(() => { const d = document.getElementById('sl-rejected'); if (d) d.open = true; });
      await sleep(300);
      await shot('#sl-rejected', pre + name + '-rejected-open.png');
      await p.evaluate(() => { const d = document.getElementById('sl-rejected'); if (d) d.open = false; });
      await shot('#sl-goals + section', pre + name + '-goals.png');
    }
    const file = mode === 'live' ? pre + name + '.png' : pre + name + '-full.png';
    await p.screenshot({ path: OUT + file, fullPage: true });
    out.push(OUT + file + ' scrollWidth ' + sw.join('/'));
    await ctx.close();
  }
  await browser.close();
  console.log(out.join('\n'));
})().catch((e) => { console.error(e); process.exit(2); });
