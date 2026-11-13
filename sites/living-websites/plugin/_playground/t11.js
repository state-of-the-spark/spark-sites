// t11: "visibility / CSS" variant for the selector-swap engine. Run: node t11.js
// Use case: the original hides the header "Get started" button on mobile; the challenger shows it.
const { chromium } = require('playwright-core');
const { BASE, UA, tool, run, admin, check, summary, events, hex16, cleanup } = require('./lib');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MOBILE = { width: 390, height: 800 };
const DESKTOP = { width: 1280, height: 900 };
const SEL = 'header.sl-hdr a.et_pb_button[href="#contact"]';
const CSS = 'header.sl-hdr a.et_pb_button[href="#contact"]{display:inline-block!important}';

async function visit(browser, { bucket, viewport, path = '/vis-test/', click = false, watch = 0 }) {
  const vid = hex16();
  const ctx = await browser.newContext({ userAgent: UA, viewport });
  await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
  if (watch) {
    // Record the page state at the moment <body> first exists, i.e. before anything can paint.
    await ctx.addInitScript((id) => {
      new MutationObserver(() => {
        if (document.body && !window.__atBody) {
          window.__atBody = { cssStyle: !!document.getElementById('spark-living-css-' + id), cls: document.documentElement.className };
        }
      }).observe(document, { childList: true, subtree: true });
    }, watch);
  }
  await ctx.addCookies([
    { name: 'playground_auto_login_already_happened', value: '1', url: BASE },
    { name: 'spark_living', value: `${vid}.${bucket}`, url: BASE },
  ]);
  const p = await ctx.newPage();
  await p.goto(BASE + path);
  await sleep(700);
  const info = await p.evaluate((sel) => {
    const el = document.querySelector(sel);
    return {
      exists: !!el,
      display: el ? getComputedStyle(el).display : null,
      cls: document.documentElement.className,
      cssStyles: [...document.querySelectorAll('style[id^="spark-living-css-"]')].map((s) => s.id),
      atBody: window.__atBody || null,
    };
  }, SEL);
  if (click && info.exists && info.display !== 'none') {
    await p.evaluate(() => document.addEventListener('click', (e) => { if (e.target.closest('a')) e.preventDefault(); }));
    await p.click(SEL);
    await sleep(500);
    await p.click(SEL);
    await sleep(400);
  }
  await ctx.close();
  return { vid, info, rows: await events(`visitor_id='${vid}'`) };
}

(async () => {
  const a = await admin();
  const browser = await chromium.launch();
  await cleanup(true);
  await run('mkvis.php');

  // ---- Sanitizing the snippet on save -------------------------------------------
  const dirty = '</style><script>alert(1)</script>\n@import "evil.css";\n@IMPORT url(evil.css);\nbackground:URL (x);\nwidth:expression(alert(1));\nbehavior:Javascript :alert(1);\nuurl(rl(x);\n' + 'u' + String.fromCharCode(92) + '72l(x);\n.ok{color:red}';
  let r = await a.api('POST', '/tests', { name: 'Dirty css', element_type: 'selector', target: SEL, tier: 1, device: 'mobile', variants: { A: { label: 'A', css: 'a{color:red}' }, B: { label: 'B', css: dirty } } });
  const stored = r.status === 201 ? r.body.variants.B.css : '';
  check('dirty CSS test is created (a clean remainder is left)', r.status === 201 && stored.includes('.ok{color:red}'), r.status);
  check('sanitized CSS contains no "<"', !stored.includes('<'), stored);
  check('sanitized CSS contains no @import', !/@\s*import/i.test(stored), stored);
  check('sanitized CSS contains no url(', !/url\s*\(/i.test(stored), stored);
  check('sanitized CSS contains no expression', !/expression/i.test(stored), stored);
  check('sanitized CSS contains no javascript:', !/javascript\s*:/i.test(stored), stored);
  check('sanitized CSS contains no backslash (no escape-sequence rebuilds)', !stored.includes(String.fromCharCode(92)), stored);
  check('CSS on variant A is ignored (only the challenger carries a snippet)', r.status === 201 && !r.body.variants.A.css, r.body && r.body.variants && r.body.variants.A);
  r = await a.api('POST', '/tests', { name: 'Only junk css', element_type: 'selector', target: SEL, tier: 1, variants: { B: { css: '<< @import  ' } } });
  check('a snippet that sanitizes to nothing, with no changes, is refused (400)', r.status === 400, r);
  r = await a.api('POST', '/tests', { name: 'No change at all', element_type: 'selector', target: SEL, tier: 1, variants: { B: { label: 'B' } } });
  check('no changes and no css is still refused (400)', r.status === 400, r);
  r = await a.api('POST', '/tests', { name: 'Long css', element_type: 'selector', target: SEL, tier: 1, variants: { B: { css: 'a{color:red}' + ' '.repeat(10) + 'b'.repeat(5000) } } });
  check('CSS is capped at 2000 characters', r.status === 201 && r.body.variants.B.css.length <= 2000, r.body && r.body.variants && r.body.variants.B.css.length);

  // ---- Running a visibility test on mobile --------------------------------------
  await cleanup();
  r = await a.api('POST', '/tests', { name: 'Header button on mobile', element_type: 'selector', target: SEL, hypothesis: 'Showing the header button on mobile brings more clicks.', tier: 1, device: 'mobile', start: true, sessions_14d: 240, variants: { A: { label: 'Hidden on mobile' }, B: { label: 'Shown on mobile', css: CSS } } });
  check('visibility test created and started', r.status === 201 && r.body.status === 'running', r.status);
  check('B carries the CSS snippet and no changes', r.body.variants.B.css === CSS && r.body.variants.B.changes.length === 0, r.body && r.body.variants && r.body.variants.B);
  const id = r.body.id;

  const mB = await visit(browser, { bucket: 7000, viewport: MOBILE, click: true, watch: id });
  const mA = await visit(browser, { bucket: 2000, viewport: MOBILE, watch: id });
  const mH = await visit(browser, { bucket: 500, viewport: MOBILE });
  const dB = await visit(browser, { bucket: 7000, viewport: DESKTOP, click: true });

  check('original CSS really hides the button on mobile for the A visitor', mA.info.exists && mA.info.display === 'none', mA.info);
  check('mobile B visitor: the button is shown (display inline-block)', mB.info.display === 'inline-block', mB.info);
  check('mobile holdout: the button stays hidden (original)', mH.info.display === 'none', mH.info);
  check('B visitor: html carries class sl-v-<id>-B and the css style element exists', mB.info.cls.split(' ').includes(`sl-v-${id}-B`) && mB.info.cssStyles.includes(`spark-living-css-${id}`), mB.info);
  check('A visitor: no css style element, class is sl-v-<id>-A', mA.info.cssStyles.length === 0 && mA.info.cls.split(' ').includes(`sl-v-${id}-A`), mA.info);
  check('no flicker: the css style and the html class already exist when <body> is first created', !!(mB.info.atBody && mB.info.atBody.cssStyle && mB.info.atBody.cls.includes(`sl-v-${id}-B`)), mB.info.atBody);
  check('mobile B visitor: exposure logged on page load (variant B)', mB.rows.some((x) => x.event_type === 'exposure' && x.variant === 'B' && x.experiment_id == id), mB.rows);
  check('mobile B visitor: a click on the target selector is logged as cta_click, once', mB.rows.filter((x) => x.event_type === 'cta_click' && x.variant === 'B').length === 1, mB.rows);
  check('mobile A visitor: exposure logged as A (button present but hidden)', mA.rows.some((x) => x.event_type === 'exposure' && x.variant === 'A' && x.experiment_id == id), mA.rows);
  check('mobile holdout: exposure logged as H', mH.rows.some((x) => x.event_type === 'exposure' && x.variant === 'H' && x.experiment_id == id), mH.rows);
  check('desktop session (device=mobile): no css applied, nothing logged, even after clicking', dB.info.cssStyles.length === 0 && !/sl-v-/.test(dB.info.cls) && dB.rows.length === 0, [dB.info, dB.rows]);

  // The target is not on this page: no exposure (documented: the element must be in the DOM).
  const away = await visit(browser, { bucket: 7000, viewport: MOBILE, path: '/button-test/' });
  check('page without the target element: no exposure logged', away.rows.filter((x) => x.event_type === 'exposure').length === 0, away.rows);

  // Stats see the sessions.
  const st = await a.api('GET', `/stats&experiment_id=${id}`);
  check('stats count the exposed sessions (A=1, B=1, H=1) and the B intent session', st.status === 200 && st.body.stats.counts.A.sessions === 1 && st.body.stats.counts.B.sessions === 1 && st.body.stats.counts.H.sessions === 1 && st.body.stats.counts.B.intent === 1, JSON.stringify(st.body).slice(0, 700));

  // ---- device = all: a click on the target counts for A too ---------------------
  await cleanup(true);
  r = await a.api('POST', '/tests', { name: 'Header button all devices', element_type: 'selector', target: SEL, tier: 1, start: true, sessions_14d: 500, variants: { B: { label: 'B', css: 'header.sl-hdr a.et_pb_button{background:#1f6b3a!important}' } } });
  const id2 = r.body.id;
  const dA = await visit(browser, { bucket: 2000, viewport: DESKTOP, click: true });
  check('device=all, desktop A visitor: the visible button click is a cta_click for A', dA.rows.some((x) => x.event_type === 'cta_click' && x.variant === 'A' && x.experiment_id == id2), dA.rows);
  const dB2 = await visit(browser, { bucket: 7000, viewport: DESKTOP });
  check('device=all, desktop B visitor: css applied (green background)', dB2.info.cssStyles.includes(`spark-living-css-${id2}`), dB2.info);

  // ---- Promoted CSS winner ------------------------------------------------------
  await cleanup(true);
  r = await a.api('POST', '/tests', { name: 'Header button shown on mobile (ship)', element_type: 'selector', target: SEL, tier: 1, device: 'mobile', start: true, sessions_14d: 240, variants: { B: { label: 'Shown', css: CSS } } });
  const id3 = r.body.id;
  r = await a.api('POST', `/tests/${id3}/conclude`, { verdict: 'ship_b', note: 'ship css winner' });
  check('CSS test can be shipped', r.status === 200 && r.body.experiment.promoted === true, r.status);
  const pm = await visit(browser, { bucket: 7000, viewport: MOBILE, click: true });
  const ph = await visit(browser, { bucket: 500, viewport: MOBILE });
  const pd = await visit(browser, { bucket: 7000, viewport: DESKTOP, click: true });
  check('promoted CSS winner: mobile living visitor sees the button', pm.info.display === 'inline-block', pm.info);
  check('promoted CSS winner: mobile holdout still gets the original (button hidden)', ph.info.display === 'none', ph.info);
  check('promoted CSS winner: mobile living visitor exposure and click logged as site watch (exp 0, L)', pm.rows.some((x) => x.experiment_id == 0 && x.variant === 'L' && x.event_type === 'exposure') && pm.rows.some((x) => x.experiment_id == 0 && x.variant === 'L' && x.event_type === 'cta_click'), pm.rows);
  check('promoted CSS winner (mobile): desktop session sees the original and logs nothing', pd.info.cssStyles.length === 0 && pd.rows.length === 0, [pd.info, pd.rows]);

  await browser.close();
  await cleanup(true);
  const log = await tool('log');
  check('debug log is empty', /\(no debug\.log\)/.test(log) || log.trim() === '', log.slice(0, 300));
  process.exit(summary('t11 visibility / css variant') ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
