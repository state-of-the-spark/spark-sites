// 0.1.4 frames of the two new dashboard areas. Local: node shot4.js local   Live: node shot4.js live <cookies.json>
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = 'C:/Users/grant/Documents/GitHub/spark-sites/sites/living-websites/audit/screenshots/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const mode = process.argv[2] || 'local';
const prefix = mode === 'live' ? 'live-dash-' : 'local-dash-';
const URL = mode === 'live' ? 'https://sparkmysite.com/living/' : 'http://127.0.0.1:9400/living/';

(async () => {
  const browser = await chromium.launch();
  const open = async (vp, extra = {}) => {
    const ctx = await browser.newContext({ userAgent: UA, viewport: vp, ...extra });
    const errs = [];
    if (mode === 'live') {
      const ck = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
      await ctx.addCookies([{ name: ck.liName, value: ck.liVal, domain: 'sparkmysite.com', path: '/', secure: true, httpOnly: true, sameSite: 'Lax' }]);
    } else {
      await ctx.addCookies([{ name: 'playground_auto_login_already_happened', value: '1', url: 'http://127.0.0.1:9400' }]);
    }
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(e.message));
    if (mode !== 'live') { await p.goto('http://127.0.0.1:9400/wp-login.php'); await p.fill('#user_login', 'admin'); await p.fill('#user_pass', 'password'); await p.click('#wp-submit'); await p.waitForLoadState('networkidle'); }
    for (let i = 0; i < 3; i++) {
      await p.goto(URL + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(1500);
      if (await p.$('.sl-dash')) break;
    }
    await p.waitForTimeout(6500); // let the vine, burst and bubbles settle
    return { ctx, p, errs };
  };
  const box = (p, sels) => p.evaluate((sels) => {
    let l = 1e9, t = 1e9, r = 0, b = 0;
    for (const s of sels) { const e = document.querySelector(s); if (!e) continue; const x = e.getBoundingClientRect(); l = Math.min(l, x.left); t = Math.min(t, x.top + scrollY); r = Math.max(r, x.right); b = Math.max(b, x.bottom + scrollY); }
    return { x: Math.max(0, l - 12), y: Math.max(0, t - 12), width: Math.min(innerWidth, r + 12) - Math.max(0, l - 12), height: b - t + 24 };
  }, sels);
  const shoot = async (p, file, sels) => { const c = await box(p, sels); await p.screenshot({ path: OUT + file, clip: c, fullPage: true }); console.log(file, JSON.stringify(c)); };

  let { ctx, p, errs } = await open({ width: 1366, height: 900 });
  await shoot(p, prefix + 'sources-desktop.png', ['.sl-sources', 'table']);
  await shoot(p, prefix + 'current-vs-challenger-desktop.png', ['.sl-card']);
  console.log('desktop errors', JSON.stringify(errs)); await ctx.close();
  ({ ctx, p, errs } = await open({ width: 390, height: 844 }));
  await shoot(p, prefix + 'sources-and-test-mobile.png', ['.sl-card', '.sl-sources', 'table']);
  console.log('mobile errors', JSON.stringify(errs), 'scrollWidth', await p.evaluate(() => document.documentElement.scrollWidth)); await ctx.close();
  ({ ctx, p, errs } = await open({ width: 1366, height: 900 }, { colorScheme: 'dark' }));
  await shoot(p, prefix + 'sources-and-test-dark.png', ['.sl-card', '.sl-sources', 'table']);
  console.log('dark errors', JSON.stringify(errs)); await ctx.close();
  await browser.close();
})();
