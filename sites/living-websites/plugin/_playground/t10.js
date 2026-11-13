// t10: device-scoped tests (all / mobile / desktop). Run: node t10.js
// Mobile = viewport width <= 980px, decided in the browser; the served HTML must be identical for every device.
const { chromium } = require('playwright-core');
const { BASE, UA, tool, run, admin, check, summary, events, hex16, cleanup } = require('./lib');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const MOBILE = { width: 390, height: 800 };
const DESKTOP = { width: 1280, height: 900 };

async function visit(browser, { bucket, viewport, ua = UA, path = '/button-test/', click = null }) {
  const vid = hex16();
  const ctx = await browser.newContext({ userAgent: ua, viewport });
  await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
  await ctx.addCookies([
    { name: 'playground_auto_login_already_happened', value: '1', url: BASE },
    { name: 'spark_living', value: `${vid}.${bucket}`, url: BASE },
  ]);
  const p = await ctx.newPage();
  await p.goto(BASE + path);
  await p.waitForSelector('.header-cta');
  await sleep(500);
  const text = await p.textContent('.header-cta');
  if (click) { await p.evaluate(() => document.addEventListener('click', (e) => { if (e.target.closest('a')) e.preventDefault(); })); await p.click('.header-cta'); await sleep(500); }
  await sleep(300);
  const cookies = Object.fromEntries((await ctx.cookies()).filter((c) => c.name.startsWith('spark_living')).map((c) => [c.name, decodeURIComponent(c.value)]));
  await ctx.close();
  return { vid, text, cookies, rows: await events(`visitor_id='${vid}'`) };
}

async function blockVisit(browser, { bucket, viewport }) {
  const vid = hex16();
  const ctx = await browser.newContext({ userAgent: UA, viewport });
  await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
  await ctx.addCookies([{ name: 'playground_auto_login_already_happened', value: '1', url: BASE }, { name: 'spark_living', value: `${vid}.${bucket}`, url: BASE }]);
  const p = await ctx.newPage();
  await p.goto(BASE + '/block-test/');
  await sleep(700);
  const shown = await p.evaluate(() => document.querySelector('.spark-living-block').innerText.trim());
  await ctx.close();
  return { shown, rows: await events(`visitor_id='${vid}'`) };
}

async function newTest(a, name, device) {
  await cleanup();
  const body = { name, element_type: 'selector', target: '.header-cta', hypothesis: 'device scope', tier: 1, start: true, sessions_14d: 500, variants: { A: { label: 'A' }, B: { label: 'B', changes: [{ op: 'text', value: 'Get my free estimate' }] } } };
  if (device) body.device = device;
  const r = await a.api('POST', '/tests', body);
  return r;
}

(async () => {
  const a = await admin();
  const browser = await chromium.launch();
  const ORIG = 'Free Quote', CHANGED = 'Get my free estimate';
  await cleanup(true);

  // ---- Validation and default ------------------------------------------------
  let r = await a.api('POST', '/tests', { name: 'bad device', element_type: 'selector', target: '.header-cta', tier: 1, device: 'tablet', variants: { B: { changes: [{ op: 'text', value: 'x' }] } } });
  check('invalid device value is refused with 400', r.status === 400 && /device/.test(JSON.stringify(r.body)), r);

  r = await newTest(a, 'Device default', null);
  check('test without a device field defaults to "all"', r.status === 201 && r.body.device === 'all', r.body && r.body.device);
  let id = r.body.id;
  let m = await visit(browser, { bucket: 7000, viewport: MOBILE });
  let d = await visit(browser, { bucket: 7000, viewport: DESKTOP });
  check('device=all: mobile B visitor sees the challenger', m.text === CHANGED, m.text);
  check('device=all: desktop B visitor sees the challenger', d.text === CHANGED, d.text);
  check('device=all: both log an exposure', m.rows.some((x) => x.event_type === 'exposure' && x.experiment_id == id) && d.rows.some((x) => x.event_type === 'exposure' && x.experiment_id == id));

  // ---- device = mobile ---------------------------------------------------------
  r = await newTest(a, 'Mobile only', 'mobile');
  id = r.body.id;
  check('device=mobile accepted and stored on the experiment', r.status === 201 && r.body.device === 'mobile', r.body && r.body.device);
  const mB = await visit(browser, { bucket: 7000, viewport: MOBILE, click: true });
  const mA = await visit(browser, { bucket: 2000, viewport: MOBILE });
  const mH = await visit(browser, { bucket: 500, viewport: MOBILE });
  const dB = await visit(browser, { bucket: 7000, viewport: DESKTOP, click: true });
  const dA = await visit(browser, { bucket: 2000, viewport: DESKTOP });
  const dH = await visit(browser, { bucket: 500, viewport: DESKTOP, click: true });
  check('mobile test: mobile B visitor sees the challenger', mB.text === CHANGED, mB.text);
  check('mobile test: mobile A visitor sees the original', mA.text === ORIG, mA.text);
  check('mobile test: mobile holdout sees the original', mH.text === ORIG, mH.text);
  check('mobile test: mobile B is assigned and exposed (exposure B)', mB.rows.some((x) => x.event_type === 'exposure' && x.variant === 'B' && x.experiment_id == id), mB.rows);
  check('mobile test: mobile B click on data-living-cta counted as cta_click', mB.rows.some((x) => x.event_type === 'cta_click' && x.variant === 'B' && x.experiment_id == id), mB.rows);
  check('mobile test: mobile A exposed as A', mA.rows.some((x) => x.event_type === 'exposure' && x.variant === 'A' && x.experiment_id == id), mA.rows);
  check('mobile test: mobile holdout exposed as H', mH.rows.some((x) => x.event_type === 'exposure' && x.variant === 'H' && x.experiment_id == id), mH.rows);
  check('mobile test: desktop B visitor sees the original', dB.text === ORIG, dB.text);
  check('mobile test: desktop A visitor sees the original', dA.text === ORIG, dA.text);
  check('mobile test: desktop sessions log NOTHING (B, A, holdout; B and holdout also clicked the CTA)', dB.rows.length === 0 && dA.rows.length === 0 && dH.rows.length === 0, [dB.rows, dA.rows, dH.rows]);
  check('mobile test: desktop session carries no assignment to the test (cookie exp is 0)', /^0:/.test(dB.cookies.spark_living_a || ''), dB.cookies);
  check('mobile test: mobile session cookie carries the test id', new RegExp('^' + id + ':B$').test(mB.cookies.spark_living_a || ''), mB.cookies);

  // Boundary: 980 is mobile, 981 is desktop.
  const b980 = await visit(browser, { bucket: 7000, viewport: { width: 980, height: 800 } });
  const b981 = await visit(browser, { bucket: 7000, viewport: { width: 981, height: 800 } });
  check('boundary: viewport 980px counts as mobile', b980.text === CHANGED && b980.rows.length >= 1, [b980.text, b980.rows]);
  check('boundary: viewport 981px counts as desktop (original, nothing logged)', b981.text === ORIG && b981.rows.length === 0, [b981.text, b981.rows]);

  // No user-agent sniffing: the viewport decides, not the UA string.
  const uaPhoneWide = await visit(browser, { bucket: 7000, viewport: DESKTOP, ua: IPHONE_UA });
  const uaDesktopNarrow = await visit(browser, { bucket: 7000, viewport: MOBILE, ua: UA });
  check('no UA sniffing: iPhone user agent on a wide viewport is treated as desktop', uaPhoneWide.text === ORIG && uaPhoneWide.rows.length === 0, [uaPhoneWide.text, uaPhoneWide.rows]);
  check('no UA sniffing: desktop user agent on a narrow viewport is treated as mobile', uaDesktopNarrow.text === CHANGED, uaDesktopNarrow.text);

  // Caching: the served HTML (including the inline config) is byte-identical for every device.
  const get = async (ua) => (await (await fetch(BASE + '/button-test/', { headers: { cookie: 'playground_auto_login_already_happened=1', 'user-agent': ua } })).text());
  const hDesk = await get(UA), hPhone = await get(IPHONE_UA);
  const cfg = (h) => (h.match(/<script id="spark-living-js">[\s\S]*?<\/script>/) || [''])[0];
  check('page cache safe: inline script and config are byte-identical for desktop and iPhone user agents', cfg(hDesk).length > 500 && cfg(hDesk) === cfg(hPhone), [cfg(hDesk).length, cfg(hPhone).length]);
  check('page cache safe: the config carries the device scope for the browser to decide', /"device":"mobile"/.test(cfg(hDesk)));

  // ---- device = desktop --------------------------------------------------------
  r = await newTest(a, 'Desktop only', 'desktop');
  id = r.body.id;
  check('device=desktop accepted and stored', r.status === 201 && r.body.device === 'desktop', r.body && r.body.device);
  const xdB = await visit(browser, { bucket: 7000, viewport: DESKTOP, click: true });
  const xmB = await visit(browser, { bucket: 7000, viewport: MOBILE, click: true });
  const xmA = await visit(browser, { bucket: 2000, viewport: MOBILE });
  check('desktop test: desktop B visitor sees the challenger and is exposed', xdB.text === CHANGED && xdB.rows.some((x) => x.event_type === 'exposure' && x.variant === 'B' && x.experiment_id == id), [xdB.text, xdB.rows]);
  check('desktop test: desktop B click counted', xdB.rows.some((x) => x.event_type === 'cta_click' && x.experiment_id == id), xdB.rows);
  check('desktop test: mobile B and A visitors see the original and log nothing', xmB.text === ORIG && xmA.text === ORIG && xmB.rows.length === 0 && xmA.rows.length === 0, [xmB.rows, xmA.rows]);

  // ---- promoted winner keeps its device scope ----------------------------------
  r = await a.api('POST', `/tests/${id}/conclude`, { verdict: 'ship_b', note: 'device promote test' });
  check('desktop test can be concluded and shipped', r.status === 200 && r.body.experiment.promoted === true, r.status);
  const pd = await visit(browser, { bucket: 7000, viewport: DESKTOP });
  const pm = await visit(browser, { bucket: 7000, viewport: MOBILE, click: true });
  const ph = await visit(browser, { bucket: 500, viewport: DESKTOP });
  check('promoted desktop winner: desktop living visitor sees it and is logged as L', pd.text === CHANGED && pd.rows.some((x) => x.experiment_id == 0 && x.variant === 'L' && x.event_type === 'exposure'), [pd.text, pd.rows]);
  check('promoted desktop winner: mobile visitor sees the original and logs nothing', pm.text === ORIG && pm.rows.length === 0, [pm.text, pm.rows]);
  check('promoted desktop winner: desktop holdout sees the original (logged H)', ph.text === ORIG && ph.rows.some((x) => x.variant === 'H'), [ph.text, ph.rows]);

  // ---- Living Block test with a device scope -------------------------------------
  await cleanup();
  r = await a.api('POST', '/tests', { name: 'Block mobile only', element_type: 'block', tier: 1, device: 'mobile', start: true, sessions_14d: 300, variants: { A: { label: 'A' }, B: { label: 'B' } } });
  check('block test with device=mobile is created and started', r.status === 201 && r.body.device === 'mobile', r.status);
  await run('upd.php', `&exp=${r.body.id}`);
  const bm = await blockVisit(browser, { bucket: 7000, viewport: MOBILE });
  const bd = await blockVisit(browser, { bucket: 7000, viewport: DESKTOP });
  check('block test, mobile B visitor sees variant B and is exposed', bm.shown === 'VARIANT-B-TEXT' && bm.rows.some((x) => x.event_type === 'exposure' && x.variant === 'B'), bm);
  check('block test, desktop B visitor sees variant A only and logs nothing', bd.shown === 'VARIANT-A-TEXT' && bd.rows.length === 0, bd);

  await browser.close();
  await cleanup();
  const log = await tool('log');
  check('debug log is empty', /\(no debug\.log\)/.test(log) || log.trim() === '', log.slice(0, 300));
  process.exit(summary('t10 device scope') ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
