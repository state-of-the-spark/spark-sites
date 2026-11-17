// t22 (0.4.0): the stop date that scales with traffic, the new start gate, the nightly recompute, the upgrade of a test that was
// already running, whole-site scope (exposure counted once per session), and "only one test per element".
// Run: node t22.js
const { chromium } = require('playwright-core');
const { BASE, UA, run, admin, check, summary, events, tool } = require('./lib');

const q = (m, extra = '') => run('q22.php', `&m=${m}${extra}`);
const q17 = (m, extra = '') => run('q17.php', `&m=${m}${extra}`);
const J = async (p) => { const t = await p; try { return JSON.parse(t); } catch { return t; } };
const ymd = (d) => new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ');
const sg = (n, over = {}) => ({
  title: 'Stop date suggestion ' + n, hypothesis: 'h', page: '/', device: 'all', element_type: 'selector', target: '.t22-s' + n,
  variants: { A: { label: 'A' }, B: { label: 'B', changes: [{ op: 'text', value: 'New words ' + n }] } }, change_type: 'wording',
  rationale: 'Because ' + n, evidence: [{ source: 'Page review', detail: 'seen', as_of: ymd(1) }], priority: n, suggested_by: 'owner',
  sessions_14d: 250, sessions_as_of: ymd(1), ...over,
});
const longDate = (d) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

(async () => {
  const a = await admin();
  const api = (m, p, b) => a.api(m, p.replace('?', '&'), b);
  await q17('reset_all'); await q17('upgrade');

  // ---- A. The start gate and the stop date it stores --------------------------------------------------------------
  const table = [[5000, 200, 14], [223, 200, 14], [222, 200, 15], [137, 200, 23], [100, 200, 32], [75, 200, 42]];
  for (const [sessions, , want] of table) {
    const s = (await api('POST', '/suggestions', sg(sessions, { sessions_14d: sessions }))).body;
    const st = await api('POST', `/tests/${s.id}/start`, { sessions_14d: sessions });
    const run1 = await J(q('running'));
    check(`start gate: ${sessions} sessions in 14 days starts, and its stop date is ${want} days`, st.status === 200 && run1 && run1.max_days === want && st.body.max_days === want, [st.status, st.body.code, run1]);
    const led = await J(q('ledger', '&kind=test_started'));
    const row = led[led.length - 1];
    const ev = row && JSON.parse(row.evidence_json || '{}');
    check(`${sessions} sessions: the test_started ledger row records the projected days and the stop`, ev && ev.max_days === want && ev.sessions_14d === sessions && ev.projected_days === Math.ceil(100 / ((sessions / 14) * 0.45) - 1e-9), ev);
    await api('POST', `/tests/${s.id}/conclude`, { verdict: 'keep_a', note: 'done' });
  }
  let s = (await api('POST', '/suggestions', sg(74, { sessions_14d: 74 }))).body;
  let r = await api('POST', `/tests/${s.id}/start`, { sessions_14d: 74 });
  check('start gate: 74 sessions (43 days) is refused with 422 and says why', r.status === 422 && r.body.code === 'spark_living_not_eligible' && /43 days/.test(r.body.message) && /42-day limit/.test(r.body.message) && r.body.data.projected_days === 43, [r.status, r.body]);
  r = await api('POST', `/tests/${s.id}/start`, { sessions_14d: 0 });
  check('start gate: 0 sessions is refused (422)', r.status === 422 && /more than 42 days/.test(r.body.message), [r.status, r.body.message]);
  r = await api('POST', `/tests/${s.id}/start`, {});
  check('start gate: no count is 400 spark_living_eligibility_missing and names 75', r.status === 400 && r.body.code === 'spark_living_eligibility_missing' && /at least 75/.test(r.body.message) && /42 days/.test(r.body.message), [r.status, r.body.message]);
  r = await api('POST', `/tests/${s.id}/start`, { sessions_14d: 74, force: true });
  let run1 = await J(q('running'));
  check('force: an administrator can start a test that cannot finish; it is flagged forced and gets the 42 day ceiling', r.status === 200 && r.body.forced_start === true && run1.max_days === 42, [r.status, r.body.code, run1]);
  await api('POST', `/tests/${s.id}/conclude`, { verdict: 'keep_a' });
  // POST /tests with start:true follows the same rule
  r = await api('POST', '/tests', { name: 'Direct 137', element_type: 'selector', target: '.t22-direct', variants: { A: { label: 'A' }, B: { label: 'B', changes: [{ op: 'text', value: 'x' }] } }, start: true, sessions_14d: 137 });
  run1 = await J(q('running'));
  check('POST /tests with start:true and 137 sessions: stop date 23 days', r.status === 201 && run1 && run1.max_days === 23, [r.status, r.body.code, run1]);
  await api('POST', `/tests/${r.body.id}/conclude`, { verdict: 'keep_a' });
  r = await api('POST', '/tests', { name: 'Direct 60', element_type: 'selector', target: '.t22-direct2', variants: { A: { label: 'A' }, B: { label: 'B', changes: [{ op: 'text', value: 'x' }] } }, start: true, sessions_14d: 60 });
  check('POST /tests with start:true and 60 sessions is refused and leaves no stray draft', r.status === 422 && !(await api('GET', '/state')).body.queued.some((x) => x.name === 'Direct 60'), [r.status]);

  // ---- B. Dashboard wording ---------------------------------------------------------------------------------------
  await q17('reset_all');
  const id1 = parseInt(await q('start_direct', '&sessions=137&ago=3&sel=.t22-dash&name=Dash%20test'), 10);
  let html = await (await fetch(BASE + '/living/', { headers: { cookie: a.cookie() } })).text();
  let t = text(html);
  const start = new Date(Date.now() - 3 * 86400000);
  const stop = new Date(start.getTime() + 23 * 86400000);
  check('dashboard: "Day 4 of 23" with the start, earliest read and stop as dates', /Day 4 of 23\. Started /.test(t) && t.includes('Started ' + longDate(start) + '.') && t.includes('Stops ' + longDate(stop) + ' at the latest'), t.slice(t.indexOf('Day '), t.indexOf('Day ') + 220));
  check('dashboard: earliest read date is shown', /Earliest read [A-Z][a-z]+ \d+, \d{4}\./.test(t));
  check('dashboard: the old "14 days" and "100-session minimum" wording is gone from the running card', !/Day \d+ of 14/.test(t) && !/100-session/.test(t), t.match(/.{40}100-session.{40}/));

  // ---- C. The nightly recompute -----------------------------------------------------------------------------------
  const steps = [
    { name: 'a fast test (60 and 60 exposures in 4 days) is floored at 14 days', sessions: 137, ago: 4, na: 60, nb: 60, want: 14, basis: 'observed' },
    { name: 'a slow test (20 and 20 in 10 days) is capped at 42 days', sessions: 137, ago: 10, na: 20, nb: 20, want: 42, basis: 'observed' },
    { name: 'a middle test (27 and 27 in 5 days) is 19 days', sessions: 137, ago: 5, na: 27, nb: 27, want: 19, basis: 'observed' },
    { name: 'before day 3 the stated traffic is kept (40 exposures in 2 days)', sessions: 137, ago: 2, na: 20, nb: 20, want: 23, basis: 'start_traffic' },
    { name: 'under 20 exposures the stated traffic is kept (8 and 8 in 6 days)', sessions: 137, ago: 6, na: 8, nb: 8, want: 23, basis: 'start_traffic' },
  ];
  for (const sp of steps) {
    await q17('reset_all');
    const id = parseInt(await q('start_direct', `&sessions=${sp.sessions}&ago=${sp.ago}&sel=.t22-nightly`), 10);
    await q('seed_obs', `&id=${id}&na=${sp.na}&nb=${sp.nb}`);
    const before = await J(q('meta', `&id=${id}`));
    await q('cron');
    const m = await J(q('meta', `&id=${id}`));
    const led = await J(q('ledger', '&kind=stop_date_changed'));
    check(`nightly recompute: ${sp.name}`, m.status === 'running' && m.max_days === sp.want && m.start_date === before.start_date && m.variants_md5 === before.variants_md5 && m.events_md5 === before.events_md5, [m, before.max_days]);
    if (sp.want !== before.max_days) {
      const row = led[led.length - 1];
      const ev = row && JSON.parse(row.evidence_json);
      check(`  ... and writes a stop_date_changed row (${before.max_days} to ${sp.want} days, basis ${sp.basis})`, led.length === 1 && JSON.parse(row.before_json).max_days === before.max_days && JSON.parse(row.after_json).max_days === sp.want && ev.basis === sp.basis && row.proposed_by === 'engine', led);
    } else {
      check('  ... and writes no row when nothing changed', led.length === 0, led);
    }
    await q('cron');
    const led2 = await J(q('ledger', '&kind=stop_date_changed'));
    check('  ... a second nightly run with the same data changes nothing and writes no further row', led2.length === led.length, [led.length, led2.length]);
  }

  // ---- C2. The test's own stop date is what ends it ---------------------------------------------------------------
  const hard = [
    { name: 'day 14.2 of a 23 day test: still running (no stop at 14)', ago: 14.2, na: 40, nb: 40, status: 'running' },
    { name: 'day 41: still running (the ceiling is 42)', ago: 41, na: 40, nb: 40, status: 'running' },
    { name: 'day 42.1: ended as no difference at the 42 day ceiling', ago: 42.1, na: 40, nb: 40, status: 'concluded', verdict: 'no_difference', reason: /Hard stop at 42 days/ },
    { name: 'day 14.5 with plenty of traffic (150 and 150, equal): ended at the 14 day floor', ago: 14.5, na: 150, nb: 150, status: 'concluded', verdict: 'no_difference', reason: /Hard stop at 14 days with no winner/, equal: true },
  ];
  for (const h of hard) {
    await q17('reset_all');
    const id = parseInt(await q('start_direct', `&sessions=137&ago=${h.ago}&sel=.t22-hard`), 10);
    await q('seed_obs', `&id=${id}&na=${h.na}&nb=${h.nb}`);
    if (h.equal) { /* equal intent rates: add the same clicks to both arms */
      await tool('sql', '&q=' + encodeURIComponent(`INSERT INTO wp_spark_living_events (experiment_id, variant, visitor_id, session_id, event_type, created_at) SELECT experiment_id, variant, visitor_id, session_id, 'cta_click', created_at FROM wp_spark_living_events WHERE experiment_id = ${id} AND event_type = 'exposure' AND id % 10 = 0`));
    }
    await q('cron');
    const m = await J(q('meta', `&id=${id}`));
    let ok = m.status === h.status;
    if (h.verdict) { ok = ok && m.verdict === h.verdict; const st = (await api('GET', `/stats?experiment_id=${id}`)).body; ok = ok && h.reason.test(st.stats.decision.reason); }
    check('hard stop: ' + h.name, ok, m);
  }

  // ---- D. A test that was already running when 0.4.0 arrived ------------------------------------------------------
  await q17('reset_all');
  const idL = parseInt(await q('start_direct', '&sessions=137&ago=3.4&sel=.t22-legacy&name=Legacy%20running'), 10);
  await q('seed_obs', `&id=${idL}&na=16&nb=19`); // 35 exposures in 3.4 days: the nightly job would work from these, the upgrade must not
  await q17('set_weights', `&id=${idL}&wa=0.8&wb=0.2`);
  await q('legacy_running', `&id=${idL}`);
  const before = await J(q('meta', `&id=${idL}`));
  const up = await J(q('upgrade_again'));
  const after = await J(q('meta', `&id=${idL}`));
  const led = await J(q('ledger', '&kind=stop_date_changed'));
  check('upgrade: a running test without a stop date gets one from the same code (23 days from its stated 137 sessions)', up.stop_dates_set === 1 && after.max_days === 23 && after.stop_basis === 'start_traffic', [up, after]);
  check('upgrade: start time, variants, weights and event rows are not touched', after.start_date === before.start_date && after.variants_md5 === before.variants_md5 && after.events_md5 === before.events_md5 && JSON.stringify(after.weights) === JSON.stringify(before.weights) && after.status === 'running', [before, after]);
  const row = led[0];
  check('upgrade: one ledger row says the stop date changed from 14 to 23 days and why', led.length === 1 && JSON.parse(row.before_json).max_days === 14 && JSON.parse(row.after_json).max_days === 23 && /Rule change in 0\.4\.0/.test(JSON.parse(row.evidence_json).reason) && row.proposed_by.startsWith('engine:upgrade-'), led);
  const sd = JSON.parse(row.after_json).stop_date;
  check('upgrade: the stored stop date is start + 23 days', sd === new Date(Date.parse(before.start_date.replace(' ', 'T') + 'Z') + 23 * 86400000).toISOString().slice(0, 19).replace('T', ' '), sd);
  await q('upgrade_again');
  const led2 = await J(q('ledger', '&kind=stop_date_changed'));
  check('upgrade: running it again writes nothing more', led2.length === 1, led2.length);
  await q('cron'); // the nightly job now recomputes from the 34 exposures (weights back to 50/50 first applies after)
  const m3 = await J(q('meta', `&id=${idL}`));
  check('after the upgrade the nightly job takes over (basis observed) and keeps start, variants and events', m3.stop_basis === 'observed' && m3.start_date === before.start_date && m3.variants_md5 === before.variants_md5 && m3.events_md5 === before.events_md5, m3);

  // ---- E. Whole-site scope ---------------------------------------------------------------------------------------
  await q17('reset_all');
  const pages = await J(q('mk_pages'));
  let sw = await api('POST', '/suggestions', sg(900, { scope: 'sitewide', page: undefined, target: '.q22-btn', sessions_14d: 526, title: 'Sitewide button' }));
  check('sitewide suggestion: no page needed; scope stored; traffic is whole-site', sw.status === 201 && sw.body.scope === 'sitewide' && sw.body.page === '' && sw.body.traffic.scope === 'sitewide' && sw.body.traffic.days_to_result === 7, [sw.status, sw.body.code, sw.body.message]);
  const bad = await api('POST', '/suggestions', sg(901, { scope: 'galaxy' }));
  check('scope must be page or sitewide (400)', bad.status === 400 && bad.body.code === 'spark_living_scope');
  const noPage = await api('POST', '/suggestions', sg(902, { page: undefined }));
  check('a page-scope suggestion still needs a page (400)', noPage.status === 400 && noPage.body.code === 'spark_living_page');
  html = await (await fetch(BASE + '/living/', { headers: { cookie: a.cookie() } })).text();
  t = text(html);
  check('card: shows "Whole site" and the whole-site traffic note', /Whole site/.test(t) && /526 sessions on the whole site in 14 days/.test(t), t.slice(t.indexOf('Sitewide button'), t.indexOf('Sitewide button') + 500));
  let st = await api('POST', `/tests/${sw.body.id}/start`, { sessions_14d: 526 });
  check('sitewide test starts on the whole-site count (6 days to 100 per version, so the 14 day floor)', st.status === 200 && st.body.scope === 'sitewide' && st.body.max_days === 14, [st.status, st.body.code]);

  // The same session visits both pages: one exposure only, wherever the selector first matched.
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
  const page = await ctx.newPage();
  await ctx.addCookies([{ name: 'playground_auto_login_already_happened', value: '1', url: BASE }]);
  const urlOf = (slug) => `${BASE}/q22-${slug}/`;
  // Force B: log in is not needed; use a visitor outside the holdout by clearing and retrying.
  let ids = [];
  for (let tries = 0; tries < 6 && !ids.length; tries++) {
    await ctx.clearCookies(); await ctx.addCookies([{ name: 'playground_auto_login_already_happened', value: '1', url: BASE }]);
    await page.goto(urlOf('one'), { waitUntil: 'networkidle' });
    const ck = await ctx.cookies();
    const bucket = parseInt(((ck.find((c) => c.name === 'spark_living') || {}).value || '.0').split('.')[1], 10);
    if (bucket >= 1000) { ids = [1]; }
  }
  await page.waitForTimeout(600);
  await page.goto(urlOf('two'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.goto(urlOf('one'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const rows = await events(`experiment_id = ${sw.body.id} AND event_type = 'exposure'`);
  const label = await page.evaluate(() => (document.querySelector('.q22-btn') || {}).textContent);
  check('sitewide: one session across page one, page two and page one again records exactly one exposure', rows.length === 1, rows);
  await page.goto(urlOf('two'), { waitUntil: 'networkidle' });
  const label2 = await page.evaluate(() => (document.querySelector('.q22-btn') || {}).textContent);
  check('sitewide: the variant is applied on both pages (same version on each)', label === label2 && ['Book a free call', 'New words 900'].includes(label), [label, label2]);
  await browser.close();

  // ---- F. One test per element ------------------------------------------------------------------------------------
  await q17('reset_all');
  const w = (await api('POST', '/suggestions', sg(910, { target: '.t22-held', title: 'Won it' }))).body;
  await api('POST', `/tests/${w.id}/start`, { sessions_14d: 300 });
  await api('POST', `/tests/${w.id}/conclude`, { verdict: 'ship_b' });
  const dup = (await api('POST', '/suggestions', sg(911, { target: ' .t22-held ', title: 'Same element again' }))).body;
  let qr = await api('POST', `/suggestions/${dup.id}/queue`, {});
  check('queue is refused (409) when a shipped winner already holds the element, even for the owner', qr.status === 409 && qr.body.code === 'spark_living_selector_in_use' && /Won it/.test(qr.body.message), [qr.status, qr.body]);
  qr = await api('POST', `/tests/${dup.id}/start`, { sessions_14d: 300 });
  check('start is refused (409) for the same reason, and nothing starts', qr.status === 409 && qr.body.code === 'spark_living_selector_in_use' && !(await J(q('running'))), [qr.status, qr.body.code]);
  const other = (await api('POST', '/suggestions', sg(912, { target: '.t22-free', title: 'Another element' }))).body;
  qr = await api('POST', `/suggestions/${other.id}/queue`, {});
  check('a different element queues fine', qr.status === 200 && qr.body.status === 'queued', [qr.status, qr.body.code]);
  const dev = (await api('POST', '/suggestions', sg(913, { target: '.t22-held', device: 'mobile', title: 'Held element, phones' }))).body;
  const wdev = (await api('POST', '/suggestions', sg(914, { target: '.t22-devsplit', device: 'desktop', title: 'Desktop only winner' }))).body;
  await api('POST', `/suggestions/${other.id}/unqueue`, {});
  await api('POST', `/tests/${wdev.id}/start`, { sessions_14d: 300 }); await api('POST', `/tests/${wdev.id}/conclude`, { verdict: 'ship_b' });
  const mob = (await api('POST', '/suggestions', sg(915, { target: '.t22-devsplit', device: 'mobile', title: 'Same element, phones' }))).body;
  qr = await api('POST', `/suggestions/${mob.id}/queue`, {});
  check('the same element on the other device is not held (desktop winner, mobile test queues)', qr.status === 200, [qr.status, qr.body.code]);
  const pg = (await api('POST', '/suggestions', sg(916, { target: '.t22-held', page: '/about', title: 'Held element, other page' }))).body;
  qr = await api('POST', `/suggestions/${pg.id}/queue`, {});
  check('a winner on "/" does not hold the same element on "/about" (two stated pages that differ)', qr.status === 200, [qr.status, qr.body.code]);
  // Both pages stated and different: no clash
  const w2 = (await api('POST', '/suggestions', sg(917, { target: '.t22-pg', page: '/pricing', title: 'Pricing winner' }))).body;
  await api('POST', `/tests/${w2.id}/start`, { sessions_14d: 300 }); await api('POST', `/tests/${w2.id}/conclude`, { verdict: 'ship_b' });
  const c2 = (await api('POST', '/suggestions', sg(918, { target: '.t22-pg', page: '/contact', title: 'Contact, same element' }))).body;
  qr = await api('POST', `/suggestions/${c2.id}/queue`, {});
  check('the same element on a different page is not held', qr.status === 200, [qr.status, qr.body.code]);
  const c3 = (await api('POST', '/suggestions', sg(919, { target: '.t22-pg', scope: 'sitewide', title: 'Sitewide, same element' }))).body;
  qr = await api('POST', `/suggestions/${c3.id}/queue`, {});
  check('a sitewide test on an element a page winner holds is refused', qr.status === 409 && qr.body.code === 'spark_living_selector_in_use', [qr.status, qr.body.code]);
  // one running test at a time still holds
  await api('POST', `/suggestions/${c2.id}/unqueue`, {});
  await api('POST', `/tests/${c2.id}/start`, { sessions_14d: 300 }).then(() => null);
  const busy = await api('POST', `/tests/${other.id}/start`, { sessions_14d: 300 });
  check('the one-running-test rule still holds (409 busy)', busy.status === 409 && busy.body.code === 'spark_living_busy', [busy.status, busy.body.code]);

  console.log('');
  const lint = await q17('lint');
  check('every php file in the plugin parses', /lint ok/.test(lint), lint);
  const log = await tool('log');
  check('debug log is empty', /no debug\.log/.test(log), log.slice(0, 400));
  process.exit(summary('t22 stop date, start gate, scope') ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
