// t14: a text-swap selector test counts a click on its own target as cta_click, with no data-living-cta
// on the element (the Divi header button case), for variant A, B and holdout, once per session.
// Also: the GA mirror falls back to window.dataLayer when gtag is absent. Run: node t14.js
const { chromium } = require('playwright-core');
const { BASE, UA, run, admin, check, summary, events, hex16, cleanup, tool } = require('./lib');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SEL = 'header.sl-hdr a.et_pb_button[href="#contact"]';

async function visit(browser, { bucket, clicks = 1, gtag = false }) {
  const vid = hex16();
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1366, height: 900 } });
  await ctx.addInitScript((g) => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    window.dataLayer = window.dataLayer || [];
    if (g) { window.__gtagCalls = []; window.gtag = function () { window.__gtagCalls.push([].slice.call(arguments)); }; }
  }, gtag);
  await ctx.addCookies([
    { name: 'playground_auto_login_already_happened', value: '1', url: BASE },
    { name: 'spark_living', value: `${vid}.${bucket}`, url: BASE },
  ]);
  const p = await ctx.newPage();
  await p.goto(BASE + '/vis-test/');
  await sleep(700);
  const info = await p.evaluate((sel) => {
    const el = document.querySelector(sel);
    return { text: el.textContent.trim(), hasCta: el.hasAttribute('data-living-cta') };
  }, SEL);
  await p.evaluate(() => document.addEventListener('click', (e) => { if (e.target.closest('a')) e.preventDefault(); }));
  for (let i = 0; i < clicks; i++) { await p.click(SEL); await sleep(400); }
  await sleep(300);
  const dl = await p.evaluate(() => (window.dataLayer || []).filter((x) => x && typeof x.event === 'string' && x.event.indexOf('living_') === 0));
  const gt = await p.evaluate(() => window.__gtagCalls || null);
  await ctx.close();
  return { vid, info, dl, gt, rows: await events(`visitor_id='${vid}'`) };
}

(async () => {
  const a = await admin();
  const browser = await chromium.launch();
  await cleanup(true);
  await run('mkvis.php');
  const r = await a.api('POST', '/tests', { name: 'Text swap click', element_type: 'selector', target: SEL, hypothesis: 'h', tier: 1, start: true, sessions_14d: 500, variants: { A: { label: 'A' }, B: { label: 'B', changes: [{ op: 'text', value: 'Get My Free Website Plan' }] } } });
  check('text-swap test (no css) is running', r.status === 201 && r.body.status === 'running' && !r.body.variants.B.css, r.body);

  const vA = await visit(browser, { bucket: 3000, clicks: 2 });
  check('A session shows the original wording', vA.info.text === 'Get started', vA.info);
  check('the button carries no data-living-cta', vA.info.hasCta === false, vA.info);
  check('A: exactly one cta_click row after two clicks (once per session)', vA.rows.filter((x) => x.event_type === 'cta_click').length === 1, vA.rows);
  check('A: the row is labelled A', vA.rows.every((x) => x.variant === 'A'), vA.rows);
  check('A: one exposure row', vA.rows.filter((x) => x.event_type === 'exposure').length === 1, vA.rows);

  const vB = await visit(browser, { bucket: 7000, clicks: 2 });
  check('B session shows the new wording', vB.info.text === 'Get My Free Website Plan', vB.info);
  check('B: exactly one cta_click row after two clicks', vB.rows.filter((x) => x.event_type === 'cta_click').length === 1, vB.rows);
  check('B: the row is labelled B', vB.rows.every((x) => x.variant === 'B'), vB.rows);

  const vH = await visit(browser, { bucket: 100, clicks: 1 });
  check('holdout session sees A and its click is logged as H', vH.info.text === 'Get started' && vH.rows.filter((x) => x.event_type === 'cta_click' && x.variant === 'H').length === 1, [vH.info, vH.rows]);

  const vN = await visit(browser, { bucket: 7000, clicks: 0 });
  check('no click, no cta_click row', vN.rows.filter((x) => x.event_type === 'cta_click').length === 0 && vN.rows.length === 1, vN.rows);

  // dataLayer fallback (no gtag on the page)
  check('without gtag, exposure lands in window.dataLayer as event living_exposure', vA.dl.some((x) => x.event === 'living_exposure' && x.living_experiment === r.body.id && x.living_variant === 'A'), vA.dl);
  check('without gtag, the click lands as living_conversion with living_event cta_click', vB.dl.some((x) => x.event === 'living_conversion' && x.living_event === 'cta_click' && x.living_variant === 'B'), vB.dl);
  // gtag present: gtag is used, dataLayer is not
  const vG = await visit(browser, { bucket: 3000, clicks: 1, gtag: true });
  check('with gtag present, gtag gets the events', Array.isArray(vG.gt) && vG.gt.some((c) => c[0] === 'event' && c[1] === 'living_exposure') && vG.gt.some((c) => c[1] === 'living_conversion'), vG.gt);
  check('with gtag present, no living_ push to dataLayer', vG.dl.length === 0, vG.dl);

  // data-living-cta still works on a plain CTA elsewhere (t2/t5 cover it); quick check on the old button page
  await browser.close();
  await cleanup(true);
  const lg = await tool('log');
  check('debug log is empty', /\(no debug\.log\)/.test(lg) || lg.trim() === '', lg.slice(0, 300));
  process.exit(summary('t14 text-swap click logging + dataLayer mirror') ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
