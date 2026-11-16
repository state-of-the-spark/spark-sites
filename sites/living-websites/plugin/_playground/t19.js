// t19 (0.3.0): test-visit mode (?sl_test=1[&sl_force=A|B]) runs the variant code and records nothing.
// Run: node t19.js
const { chromium } = require('playwright-core');
const { BASE, UA, run, admin, check, summary, hex16 } = require('./lib');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (m, extra = '') => run('q17.php', `&m=${m}${extra}`);

(async () => {
  const a = await admin();
  await q('reset_all');
  await q('upgrade');
  // The button page that earlier tests use (target .header-cta, a tel link and a form).
  const have = await fetch(BASE + '/button-test/', { headers: { cookie: 'playground_auto_login_already_happened=1' } });
  if (have.status !== 200) { await run('setup.php'); }
  const t = (await a.api('POST', '/tests', { name: 'Test visit mode', element_type: 'selector', target: '.header-cta', hypothesis: 'h', tier: 1, start: true, sessions_14d: 500, variants: { A: { label: 'A' }, B: { label: 'B', changes: [{ op: 'text', value: 'Variant B words' }] } } })).body;
  const ORIG = 'Free Quote', B = 'Variant B words';
  const browser = await chromium.launch();
  const evBefore = Number(await q('ev_count'));

  // A fresh browser, webdriver NOT hidden on purpose: in test mode the script must still run (agents run headless).
  const mk = async (cookies = [], extra = {}) => {
    const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 900 }, ...extra });
    await ctx.addCookies([{ name: 'playground_auto_login_already_happened', value: '1', url: BASE }, ...cookies]);
    const p = await ctx.newPage();
    const reqs = [];
    p.on('request', (r) => { if (/spark-living\/v1\/event|spark-living%2Fv1%2Fevent/.test(decodeURIComponent(r.url()))) reqs.push(r.url()); });
    return { ctx, p, reqs };
  };
  const names = async (ctx) => Object.fromEntries((await ctx.cookies()).map((c) => [c.name, decodeURIComponent(c.value)]));
  const state = (p) => p.evaluate(() => ({ text: document.querySelector('.header-cta').textContent.trim(), cls: document.documentElement.className, test: document.documentElement.getAttribute('data-sl-test'), rep: window.sparkLivingTest || null }));

  // ---------- force B ----------
  let { ctx, p, reqs } = await mk();
  await p.goto(`${BASE}/button-test/?sl_test=1&sl_force=B`);
  await sleep(700);
  let s = await state(p);
  let ck = await names(ctx);
  check('force B: the variant code ran (button reads the B wording, class sl-v-ID-B, data-sl-test set)', s.text === B && s.cls.includes(`sl-v-${t.id}-B`) && s.test === '1', s);
  check('force B: report object says forced B and applied', s.rep && s.rep.force === 'B' && s.rep.assignments[0].variant === 'B' && s.rep.assignments[0].applied === true && s.rep.assignments[0].id === t.id, s.rep);
  check('force B: the session cookie spark_living_test is set (no max-age: a session cookie)', /^1\.\d+:B$/.test(ck.spark_living_test || '') && (await ctx.cookies()).find((c) => c.name === 'spark_living_test').expires === -1, ck);
  check('force B: no real cookies were created (spark_living, spark_living_sid, spark_living_a)', !('spark_living' in ck) && !('spark_living_sid' in ck) && !('spark_living_a' in ck), ck);
  // click everything countable
  await p.evaluate(() => document.addEventListener('click', (e) => { if (e.target.closest('a')) e.preventDefault(); }));
  await p.click('.header-cta'); await p.click('#callus'); await p.focus('#in1');
  await sleep(800);
  check('force B: no event request left the browser (exposure, click, tel, form start)', reqs.length === 0, reqs);
  check('force B: the events table did not change', Number(await q('ev_count')) === evBefore, [await q('ev_count'), evBefore]);

  // same browser, no query string: the mode persists for the session
  await p.goto(`${BASE}/button-test/`);
  await sleep(500);
  s = await state(p);
  check('next page view in the same browser keeps test mode and the forced version', s.text === B && s.test === '1', s);
  // sl_test=1 without sl_force clears the force; with a stated force it switches
  await p.goto(`${BASE}/button-test/?sl_test=1&sl_force=A`);
  await sleep(500);
  s = await state(p);
  check('force A: original wording, class sl-v-ID-A', s.text === ORIG && s.cls.includes(`sl-v-${t.id}-A`), s);
  // leave test mode
  await p.goto(`${BASE}/button-test/?sl_test=0`);
  await sleep(500);
  ck = await names(ctx);
  check('sl_test=0 ends test mode (cookie removed)', !('spark_living_test' in ck), ck);
  await ctx.close();

  // ---------- natural assignment in test mode follows the real bucket without touching it ----------
  const vid = hex16();
  // bucket 9000 is past the holdout and (weights 50/50) lands in B; bucket 5000 would land in A.
  for (const [bucket, want] of [[9000, B], [3000, ORIG]]) {
    const c = await mk([{ name: 'spark_living', value: `${vid}.${bucket}`, url: BASE }, { name: 'spark_living_sid', value: hex16(), url: BASE }, { name: 'spark_living_a', value: `${t.id}:${want === B ? 'B' : 'A'}`, url: BASE }]);
    const before = await names(c.ctx);
    await c.p.goto(`${BASE}/button-test/?sl_test=1`);
    await sleep(600);
    const st = await state(c.p);
    const after = await names(c.ctx);
    const unchanged = ['spark_living', 'spark_living_sid', 'spark_living_a'].every((k) => before[k] === after[k]);
    check(`real visitor cookies (bucket ${bucket}): a test visit applies "${want}" exactly as the real visitor would and leaves all three real cookies untouched`, st.text === want && unchanged && c.reqs.length === 0, [st.text, before, after, c.reqs]);
    await c.ctx.close();
  }
  // the real cookies belong to a real visitor: nothing for them was written, so the events table is unchanged
  check('after the cookie checks the events table is still unchanged', Number(await q('ev_count')) === evBefore);

  // ---------- control: a normal visit still counts (so "zero events" above means something) ----------
  const ctl = await mk([{ name: 'spark_living', value: `${hex16()}.9000`, url: BASE }], {});
  await ctl.ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
  await ctl.p.goto(`${BASE}/button-test/`);
  await sleep(900);
  check('control: an ordinary visit (no sl_test) sends the exposure event and the table grows by one', ctl.reqs.length >= 1 && Number(await q('ev_count')) === evBefore + 1, [ctl.reqs.length, await q('ev_count'), evBefore]);
  await ctl.ctx.close();
  const evNow = Number(await q('ev_count'));

  // ---------- server-side second guard ----------
  const post = (body, cookie = '') => fetch(`${BASE}/index.php?rest_route=/spark-living/v1/event`, { method: 'POST', headers: { cookie: 'playground_auto_login_already_happened=1' + (cookie ? '; ' + cookie : ''), 'content-type': 'application/json', 'user-agent': UA }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, j: await r.json() }));
  const ev = { experiment_id: t.id, variant: 'B', visitor_id: hex16(), session_id: hex16(), event_type: 'cta_click' };
  let r = await post(ev);
  check('server control: a valid event is stored', r.status === 202 && r.j.stored === true, r);
  r = await post({ ...ev, session_id: hex16(), test: true });
  check('server: an event carrying test:true is rejected, not stored', r.j.ok === true && r.j.stored === false && r.j.test === true, r);
  r = await post({ ...ev, session_id: hex16(), test: 1 });
  check('server: test:1 is rejected too', r.j.stored === false, r);
  r = await post({ ...ev, session_id: hex16() }, 'spark_living_test=1.5000%3AB');
  check('server: an event from a browser that carries the test cookie is rejected, not stored', r.j.stored === false && r.j.test === true, r);
  r = await post({ ...ev, session_id: hex16(), test: false });
  check('server: test:false does not block a normal event', r.j.stored === true, r);
  check('server: only the two normal events were stored (control + test:false)', Number(await q('ev_count')) === evNow + 2, [await q('ev_count'), evNow]);

  // ---------- staff (logged in) ----------
  const adminCtx = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 900 } });
  await adminCtx.addCookies([{ name: 'playground_auto_login_already_happened', value: '1', url: BASE }]);
  const ap = await adminCtx.newPage();
  const areq = [];
  ap.on('request', (r) => { if (/spark-living\/v1\/event|spark-living%2Fv1%2Fevent/.test(decodeURIComponent(r.url()))) areq.push(r.url()); });
  await ap.goto(BASE + '/wp-login.php'); await ap.fill('#user_login', 'admin'); await ap.fill('#user_pass', 'password'); await ap.click('#wp-submit'); await ap.waitForLoadState('networkidle');
  const evStaff0 = Number(await q('ev_count'));
  await ap.goto(BASE + '/button-test/');
  await sleep(500);
  const noScript = await ap.evaluate(() => ({ script: !!document.getElementById('spark-living-js'), text: document.querySelector('.header-cta').textContent.trim() }));
  check('staff without test mode: no script is printed and the page shows the original (as before)', noScript.script === false && noScript.text === ORIG, noScript);
  await ap.goto(`${BASE}/button-test/?sl_test=1&sl_force=B`);
  await sleep(700);
  s = await state(ap);
  await ap.evaluate(() => document.addEventListener('click', (e) => { if (e.target.closest('a')) e.preventDefault(); }));
  await ap.click('.header-cta');
  await sleep(500);
  check('staff with ?sl_test=1&sl_force=B: the variant code runs (B wording) and nothing is sent or stored', s.text === B && s.test === '1' && areq.length === 0 && Number(await q('ev_count')) === evStaff0, [s, areq, await q('ev_count'), evStaff0]);
  await adminCtx.close();

  // ---------- the page HTML is identical for everyone (cache safety) ----------
  const h1 = await (await fetch(`${BASE}/button-test/`, { headers: { cookie: 'playground_auto_login_already_happened=1' } })).text();
  const h2 = await (await fetch(`${BASE}/button-test/?sl_test=1&sl_force=B`, { headers: { cookie: 'playground_auto_login_already_happened=1' } })).text();
  const strip = (h) => h.replace(/nonce[^"]*"[^"]*"/g, '');
  check('the served HTML does not change with sl_test (the mode lives in the browser, so cached pages are safe)', h1.length === h2.length, [h1.length, h2.length]);

  await browser.close();
  await q('reset_all');
  process.exit(summary('t19 test-visit mode') ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
