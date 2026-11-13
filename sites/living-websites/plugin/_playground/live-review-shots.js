// Logged-out full-page captures of the live homepage for a page review, plus a CTA / headline / form inventory.
// Sets the plugin's staff cookie (spark_living_staff=1) so the visit is never logged as a test exposure.
// node live-review-shots.js <inventory-out.json>
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = 'C:/Users/grant/Documents/GitHub/spark-sites/sites/living-websites/audit/screenshots/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const SLICE = 2500, SPLIT_OVER = 6000;

const inventory = () => {
  const cssPath = (el) => {
    const parts = []; let e = el;
    while (e && e.nodeType === 1 && parts.length < 5) {
      if (e.id) { parts.unshift('#' + e.id); break; }
      let s = e.tagName.toLowerCase();
      const c = [...e.classList].filter((x) => !/^sl-v-|^et-animated|^et_had/.test(x)).slice(0, 3);
      if (c.length) s += '.' + c.join('.');
      parts.unshift(s); e = e.parentElement;
      if (document.querySelectorAll(parts.join(' > ')).length === 1) break;
    }
    return parts.join(' > ');
  };
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
  const top = (el) => Math.round(el.getBoundingClientRect().top + scrollY);
  const links = [...document.querySelectorAll('a[href], button, input[type=submit], [role=button]')]
    .map((el) => ({ text: (el.textContent || el.value || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 80), selector: cssPath(el), dest: el.getAttribute('href') || (el.tagName === 'BUTTON' || el.tagName === 'INPUT' ? '(button: ' + (el.type || 'button') + ')' : ''), top: top(el), visible: vis(el), kind: el.matches('.et_pb_button, .button, [class*=btn], [class*=cta]') ? 'button' : (el.closest('nav, #top-menu, .et_mobile_menu, header') ? 'nav' : 'link') }))
    .filter((x) => x.top < 1500);
  const h = document.querySelector('h1') || document.querySelector('h2');
  const heads = [...document.querySelectorAll('h1, h2')].filter(vis).slice(0, 4).map((el) => ({ tag: el.tagName, text: el.textContent.replace(/\s+/g, ' ').trim().slice(0, 160), selector: cssPath(el), top: top(el) }));
  const forms = [...document.querySelectorAll('form')].map((f) => ({ selector: cssPath(f), id: f.id || '', action: f.getAttribute('action') || '', method: f.method, top: top(f), visible: vis(f), fields: [...f.querySelectorAll('input:not([type=hidden]), select, textarea')].map((i) => ({ type: i.type || i.tagName.toLowerCase(), name: i.name || '', label: ((i.labels && i.labels[0] && i.labels[0].textContent) || i.getAttribute('aria-label') || i.placeholder || '').replace(/\s+/g, ' ').trim().slice(0, 50), required: i.required || i.getAttribute('aria-required') === 'true' })), submit: [...f.querySelectorAll('input[type=submit], button[type=submit], button:not([type])')].map((b) => (b.value || b.textContent).replace(/\s+/g, ' ').trim()) }));
  return { title: document.title, url: location.href, docHeight: document.documentElement.scrollHeight, h1: h ? { text: h.textContent.replace(/\s+/g, ' ').trim(), selector: cssPath(h) } : null, headings: heads, aboveFold1500: links, forms, htmlClass: document.documentElement.className.split(' ').filter((c) => /^sl-v-/.test(c)).join(' ') };
};

(async () => {
  // The site's bot check (a hashcash challenge) does not pass in bundled headless Chromium; the installed Chrome does.
  const browser = await chromium.launch({ channel: 'chrome', args: ['--disable-blink-features=AutomationControlled'] });
  const result = {};
  for (const [name, vp] of [['desktop', { width: 1366, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ userAgent: UA, viewport: vp });
    await ctx.addCookies([{ name: 'spark_living_staff', value: '1', domain: 'sparkmysite.com', path: '/', secure: true, httpOnly: false, sameSite: 'Lax' }]);
    const p = await ctx.newPage();
    let ok = false, status = 0;
    for (let i = 0; i < 4 && !ok; i++) {
      const r = await p.goto('https://sparkmysite.com/?rv=' + Date.now(), { waitUntil: 'domcontentloaded' });
      status = r ? r.status() : 0;
      await p.waitForFunction(() => !/Checking your browser/i.test(document.title), null, { timeout: 30000 }).catch(() => {});
      await p.waitForLoadState('load').catch(() => {});
      await p.waitForTimeout(2500);
      ok = (await p.evaluate(() => !!document.querySelector('#contact, .et_pb_section') && document.documentElement.scrollHeight > 1500)) ;
    }
    console.log(name, 'loaded', ok, 'status', status);
    // trigger lazy content and scroll animations
    const h = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += 500) { await p.evaluate((y) => window.scrollTo(0, y), y); await p.waitForTimeout(150); }
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(1200);
    result[name] = await p.evaluate(inventory);
    const flags = await p.evaluate(() => ({ cookieStaff: document.cookie.includes('spark_living_staff=1'), sparkCookies: document.cookie.split('; ').filter((c) => /^spark_living/.test(c)).map((c) => c.split('=')[0]), hasPluginScript: !!document.getElementById('spark-living-js') }));
    result[name].flags = flags;
    const file = `review-home-${name}-full.png`;
    await p.screenshot({ path: OUT + file, fullPage: true });
    const H = result[name].docHeight;
    console.log(file, 'height', H, JSON.stringify(flags));
    if (H > SPLIT_OVER) {
      const buf = fs.readFileSync(OUT + file);
      // slice with clip on a fresh fullPage capture to avoid image libraries
      let n = 1;
      for (let y = 0; y < H; y += SLICE, n++) {
        const hh = Math.min(SLICE, H - y);
        await p.screenshot({ path: OUT + `review-home-${name}-${n}.png`, fullPage: true, clip: { x: 0, y, width: vp.width, height: hh } });
      }
      result[name].slices = n - 1;
      console.log(name, 'slices', n - 1);
    }
    await ctx.close();
  }
  fs.writeFileSync(process.argv[2], JSON.stringify(result, null, 1));
  await browser.close();
})();
