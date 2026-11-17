// t24 (0.4.0): the results record and GET /results, the two capabilities, POST /validate-variant, preview of a test that is not
// running (tokens), charter approval, and the hole that let POST /tests and /start bypass the Goal Gate.
// Run: node t24.js
const { chromium } = require('playwright-core');
const { BASE, UA, run, admin, check, summary, tool } = require('./lib');

const q = (m, extra = '') => run('q22.php', `&m=${m}${extra}`);
const q17 = (m, extra = '') => run('q17.php', `&m=${m}${extra}`);
const J = async (p) => { const t = await p; try { return JSON.parse(t); } catch { return t; } };
const ymd = (d) => new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
let N = 0;
const sg = (over = {}) => {
  N++;
  return {
    title: 'T24 suggestion ' + N, hypothesis: 'h', page: '/', device: 'all', element_type: 'selector', target: '.t24-s' + N,
    variants: { A: { label: 'A' }, B: { label: 'B', changes: [{ op: 'text', value: 'New words ' + N }] } }, change_type: 'wording',
    rationale: 'Because ' + N, evidence: [{ source: 'Page review', detail: 'seen', as_of: ymd(1) }], priority: N, suggested_by: 'owner',
    sessions_14d: 300, sessions_as_of: ymd(1), ...over,
  };
};
const CH = { business_name: 'T24 Co', business_goal: 'More leads', primary_conversion: { type: 'form', description: 'Contact form' } };

(async () => {
  const a = await admin();
  const api = (m, p, b) => a.api(m, p.replace('?', '&'), b);
  await q17('reset_all'); await run('q17.php', '&m=purge_experiments'); await q('results_wipe'); await q17('upgrade');

  // ================= A. The results record ====================================================================================
  check('results table exists after the upgrade', (await q('results_table')) === 'yes');
  const c1 = parseInt(await q('mk_concluded', '&verdict=ship_b&na=120&nb=118&ia=12&ib=20&days=14&name=Winner%20test'), 10);
  const c2 = parseInt(await q('mk_concluded', '&verdict=keep_a&na=60&nb=62&ia=6&ib=3&days=21&name=Loser%20test&sel=.q22-old2'), 10);
  const c3 = parseInt(await q('mk_concluded', '&verdict=no_difference&na=50&nb=48&ia=5&ib=5&days=23&name=Flat%20test&sel=.q22-old3'), 10);
  const c4 = parseInt(await q('mk_concluded', '&verdict=guard_blocked&na=150&nb=150&ia=15&ib=30&days=9&name=Guarded%20test&sel=.q22-old4'), 10);
  const c5 = parseInt(await q('mk_concluded', '&verdict=&days=3&name=Voided%20test&sel=.q22-old5'), 10);
  await q('set_meta', `&id=${c1}&k=payoff_score&v=0.0517`);
  await q('results_wipe');
  const up = await J(q('upgrade_again'));
  check('upgrade back-fills one row for each concluded test (5)', up.results_backfilled === 5 && (await J(q('results'))).length === 5, [up, (await J(q('results'))).length]);
  const up2 = await J(q('upgrade_again'));
  check('running the upgrade again adds none (safe to run twice)', up2.results_backfilled === 0 && (await J(q('results'))).length === 5, up2);
  let rr = await api('GET', '/results');
  const byId = Object.fromEntries(rr.body.map((x) => [x.test_id, x]));
  check('GET /results returns the rows with a total header', rr.status === 200 && rr.body.length === 5 && rr.headers.get('x-wp-total') === '5' && rr.headers.get('x-wp-totalpages') === '1', [rr.status, rr.headers.get('x-wp-total')]);
  const w = byId[c1];
  check('challenger-won row: outcome, shipped, scope, device, element, change type, labels, tier', w.outcome === 'challenger won' && w.verdict === 'ship_b' && w.shipped === true && w.scope === 'page' && w.device === 'all' && w.element === '.q22-old' && w.change_type === 'wording' && w.a_label === 'Get started' && w.b_label === 'Get a plan' && w.tier === 1 && w.page_type === 'home', w);
  check('row: sessions and intent rate per version, lift, probability, days, minimum met', w.sessions_a === 120 && w.sessions_b === 118 && Math.abs(w.intent_rate_a - 0.1) < 1e-6 && Math.abs(w.intent_rate_b - 20 / 118) < 1e-5 && Math.abs(w.lift - ((20 / 118 - 0.1) / 0.1)) < 1e-4 && w.relative_lift_intent === w.lift && w.p_b_beats_a === 0.93 && w.probability === 0.93 && Math.abs(w.days - 14) < 0.01 && w.met_minimum === true, w);
  check('row: payoff score at the start is carried', w.payoff_score_at_start === 0.0517, w.payoff_score_at_start);
  check('row: record_id, dates and the plain-words summary', /^\d{4}-\d\d-\d\d-\d+$/.test(w.record_id) && w.record_id.endsWith('-' + c1) && /^\d{4}-\d\d-\d\d$/.test(w.started) && /^\d{4}-\d\d-\d\d$/.test(w.ended) && /Challenger "Get a plan" against current "Get started": challenger won after 14\.0 days \(120 and 118 sessions\)/.test(w.summary), w.summary);
  check('outcome words: original won, no difference, original won (guard), voided', byId[c2].outcome === 'original won' && byId[c3].outcome === 'no difference' && byId[c4].outcome === 'original won' && byId[c4].verdict === 'guard_blocked' && byId[c5].outcome === 'voided', Object.values(byId).map((x) => x.outcome));
  check('met_minimum is false when a version has fewer than 100 sessions or the test ran under 7 days', byId[c2].met_minimum === false && byId[c3].met_minimum === false && byId[c4].met_minimum === true && byId[c5].met_minimum === false);
  check('a voided test (no verdict, no counts) is recorded with zeros and no lift', byId[c5].sessions_a === 0 && byId[c5].relative_lift_intent === null && byId[c5].probability === null);
  rr = await api('GET', '/results?per_page=2&page=2');
  check('paging: per_page=2 page=2 gives 2 rows; total stays 5; 3 pages', rr.body.length === 2 && rr.headers.get('x-wp-total') === '5' && rr.headers.get('x-wp-totalpages') === '3');
  rr = await api('GET', '/results?outcome=no%20difference');
  check('filter by outcome', rr.body.length === 1 && rr.body[0].test_id === c3, rr.body.length);
  // a test that concludes now writes its row at once
  await q17('reset_all');
  await q('results_wipe');
  const s1 = (await api('POST', '/suggestions', sg())).body;
  await api('PATCH', `/suggestions/${s1.id}`, { payoff_score: 0.31 });
  await api('POST', `/tests/${s1.id}/start`, { sessions_14d: 300 });
  const cr = await api('POST', `/tests/${s1.id}/conclude`, { verdict: 'keep_a' });
  const live = (await api('GET', '/results')).body;
  check('concluding a test writes its results row immediately (device scope, scope, element, payoff score at start)', cr.status === 200 && live.length === 1 && live[0].test_id === s1.id && live[0].outcome === 'original won' && live[0].device === 'all' && live[0].scope === 'page' && live[0].payoff_score_at_start === 0.31 && live[0].max_days === 14, live);
  await run('q17.php', '&m=purge_experiments');
  await q17('reset_all');
  const s1b = (await api('POST', '/suggestions', sg())).body;
  await api('POST', `/tests/${s1b.id}/start`, { sessions_14d: 300 });
  await api('POST', `/tests/${s1b.id}/conclude`, { verdict: 'keep_a' });
  await q('drop_results');
  const upd = await J(q('upgrade_again'));
  check('with the table missing, the upgrade creates it and back-fills (a second table rebuild is safe)', (await q('results_table')) === 'yes' && (await J(q('results'))).length === 1, [upd]); // (the SQLite layer keeps a dropped table visible to one request, so the count the upgrade reports is not asserted here)
  check('a test that is only suggested or running has no results row', (await J(q('results'))).every((x) => x.outcome !== ''));

  // ================= B. The two capabilities ==================================================================================
  await q17('reset_all');
  await q('mk_role_user', '&u=slgate&caps=spark_living_gate');
  await q('mk_role_user', '&u=slbuild&caps=spark_living_build');
  await q('mk_role_user', '&u=slnone&caps=');
  const gate = await admin('slgate'); const build = await admin('slbuild'); const none = await admin('slnone');
  const U = { admin: (m, p, b) => api(m, p, b), gate: (m, p, b) => gate.api(m, p.replace('?', '&'), b), build: (m, p, b) => build.api(m, p.replace('?', '&'), b), none: (m, p, b) => none.api(m, p.replace('?', '&'), b) };
  await api('PUT', '/charter', CH); // not approved on purpose
  const seed = (await api('POST', '/suggestions', sg({ title: 'Cap target' }))).body;
  const seed2 = (await api('POST', '/suggestions', sg({ title: 'Cap target 2' }))).body;
  const want = async (name, who, m, p, b, code) => {
    const r = await U[who](m, p, b);
    return [name + ' / ' + who, r.status === code, [r.status, r.body && (r.body.code || r.body.message)]];
  };
  const rows = [];
  for (const who of ['gate', 'build']) { for (const p of ['/state', '/suggestions', '/charter', '/changes', '/log', '/stats']) { rows.push(await want('GET ' + p, who, 'GET', p, undefined, p === '/stats' ? 404 : 200)); } }
  for (const p of ['/state', '/suggestions', '/charter']) { rows.push(await want('GET ' + p, 'none', 'GET', p, undefined, 403)); }
  rows.push(await want('POST /suggestions', 'build', 'POST', '/suggestions', sg(), 201));
  rows.push(await want('POST /suggestions', 'gate', 'POST', '/suggestions', sg(), 403));
  rows.push(await want('POST /suggestions', 'none', 'POST', '/suggestions', sg(), 403));
  rows.push(await want('PATCH /suggestions/{id}', 'build', 'PATCH', `/suggestions/${seed.id}`, { payoff_score: 0.1 }, 200));
  rows.push(await want('PATCH /suggestions/{id}', 'gate', 'PATCH', `/suggestions/${seed.id}`, { payoff_score: 0.1 }, 403));
  rows.push(await want('POST /gate', 'gate', 'POST', `/suggestions/${seed.id}/gate`, { verdict: 'pass', reasons: 'ok', by: 'agent:judge' }, 200));
  rows.push(await want('POST /gate', 'build', 'POST', `/suggestions/${seed.id}/gate`, { verdict: 'pass', reasons: 'ok', by: 'agent:builder' }, 403));
  rows.push(await want('POST /gate', 'none', 'POST', `/suggestions/${seed.id}/gate`, { verdict: 'pass', reasons: 'ok', by: 'x' }, 403));
  rows.push(await want('POST /gate', 'admin', 'POST', `/suggestions/${seed2.id}/gate`, { verdict: 'hold', reasons: 'later', by: 'owner' }, 200));
  rows.push(await want('POST /validate-variant', 'build', 'POST', '/validate-variant', { selector: '.x', text: 'y' }, 200));
  rows.push(await want('POST /validate-variant', 'gate', 'POST', '/validate-variant', { selector: '.x', text: 'y' }, 403));
  rows.push(await want('POST /preview-token', 'build', 'POST', `/suggestions/${seed.id}/preview-token`, {}, 200));
  rows.push(await want('POST /preview-token', 'gate', 'POST', `/suggestions/${seed.id}/preview-token`, {}, 403));
  rows.push(await want('GET /results', 'gate', 'GET', '/results', undefined, 403));
  rows.push(await want('GET /results', 'build', 'GET', '/results', undefined, 403));
  rows.push(await want('GET /results', 'admin', 'GET', '/results', undefined, 200));
  for (const who of ['gate', 'build']) {
    rows.push(await want('PUT /charter', who, 'PUT', '/charter', { business_goal: 'hijack' }, 403));
    rows.push(await want('POST /charter/approve', who, 'POST', '/charter/approve', {}, 403));
    rows.push(await want('POST /tests/{id}/conclude', who, 'POST', `/tests/${seed.id}/conclude`, { verdict: 'keep_a' }, 403));
    rows.push(await want('POST /changes/{id}/undo', who, 'POST', '/changes/1/undo', {}, 403));
  }
  check('capability matrix: every route answers as the capability rules say (' + rows.length + ' calls)', rows.every((x) => x[1]), rows.filter((x) => !x[1]));
  // a Builder cannot post its own verdict, in any form
  let r = await U.build('POST', '/changes', { kind: 'gate_verdict', summary: 'I judge myself', proposed_by: 'agent:builder', gate_verdict: 'pass' });
  check('Builder: a gate_verdict row through POST /changes is refused (403 spark_living_gate_cap)', r.status === 403 && r.body.code === 'spark_living_gate_cap', [r.status, r.body.code]);
  r = await U.build('POST', '/changes', { kind: 'audit', summary: 'Builder note with a pretend verdict', proposed_by: 'agent:builder', gate_verdict: 'pass', gate_by: 'agent:judge', gate_reasons: 'trust me' });
  check('Builder: any other row is stored without gate data (gate_verdict becomes na, gate_by and reasons dropped)', r.status === 201 && r.body.gate_verdict === 'na' && r.body.gate_by === '' && r.body.gate_reasons === '', r.body);
  r = await U.gate('POST', '/changes', { kind: 'audit', summary: 'Judge note', proposed_by: 'agent:judge', gate_verdict: 'pass', gate_by: 'agent:judge', gate_reasons: 'checked' });
  check('Judge: its own row keeps the verdict it posts', r.status === 201 && r.body.gate_verdict === 'pass' && r.body.gate_by === 'agent:judge', r.body);
  r = await U.build('POST', `/suggestions/${seed.id}/queue`, {});
  check('Builder login is an agent even without "by": queue is checked against the gate and the approved charter (403)', r.status === 403 && r.body.code === 'spark_living_charter_unapproved', [r.status, r.body.code]);
  await api('POST', '/charter/approve', { by: 'owner' });
  r = await U.build('POST', `/suggestions/${seed.id}/queue`, { by: 'owner' });
  check('Builder login that claims to be "owner" is still checked, and autonomy "suggest" refuses it', r.status === 403 && r.body.code === 'spark_living_agent_not_allowed', [r.status, r.body.code]);
  await api('PUT', '/charter', { autonomy_level: 'tier1' }); await api('POST', '/charter/approve', { by: 'owner' });
  await api('POST', `/suggestions/${seed.id}/gate`, { verdict: 'pass', reasons: 'ok', by: 'agent:judge' });
  r = await U.build('POST', `/suggestions/${seed.id}/queue`, {});
  check('Builder queues what the Judge passed, once the charter is approved and the level allows it', r.status === 200 && r.body.status === 'queued', [r.status, r.body.code]);
  await api('POST', `/suggestions/${seed.id}/unqueue`, {});
  r = await U.build('POST', '/tests', { name: 'Direct by builder', element_type: 'selector', target: '.t24-direct', variants: { A: { label: 'A' }, B: { label: 'B', changes: [{ op: 'text', value: 'x' }] } } });
  check('Builder cannot create a test through POST /tests (no gate verdict can exist yet): 403', r.status === 403 && r.body.code === 'spark_living_gate_missing', [r.status, r.body.code]);
  const adm = await api('GET', '/state');
  check('an administrator holds both capabilities without any role being changed (filter, not a stored role)', adm.status === 200 && (await api('POST', `/suggestions/${seed.id}/gate`, { verdict: 'pass', reasons: 'ok', by: 'owner' })).status === 200 && (await api('POST', '/suggestions', sg())).status === 201);

  // ================= C. POST /validate-variant ===============================================================================
  const before = { posts: (await api('GET', '/state')).body.suggestions.length, ledger: parseInt(await q17('ledger_count'), 10) };
  const vv = (b) => api('POST', '/validate-variant', b);
  let v = await vv({ selector: 'a.et_pb_button[href="#contact"]', text: 'Get My Free Website Plan' });
  check('valid variant: ok, selector acceptable, text kept, nothing stripped, written false', v.status === 200 && v.body.ok === true && v.body.selector.ok === true && v.body.variant.changes.length === 1 && v.body.variant.changes[0].value === 'Get My Free Website Plan' && v.body.stripped.length === 0 && v.body.written === false, v.body);
  v = await vv({ selector: '.x', text: '<b>Hi</b> <script>alert(1)</script>there' });
  check('text with tags: the tags (and the script body) are stripped and the result says so', v.body.variant.changes[0].value === 'Hi there' && v.body.stripped.some((x) => x.what === 'change' && x.op === 'text' && x.kept === 'Hi there' && x.given.includes('<script>')), v.body);
  v = await vv({ selector: '.x', css: 'a{color:red} @import url(http://evil.test/x.css); b{background:url(x.png)} /* hi */' });
  check('css: @import and url( are stripped; the reason names them; the cleaned css is returned', v.body.stripped.some((x) => x.what === 'css' && /@import, url\(/.test(x.reason)) && !/url\s*\(|@import/i.test(v.body.variant.css) && /color:red/.test(v.body.variant.css), v.body);
  v = await vv({ selector: '.x', css: 'a{color:red}<style>', changes: [{ op: 'href', value: 'javascript:alert(1)' }, { op: 'delete', value: 'x' }, { op: 'add_class', value: 'ok-class' }, { op: 'style', value: 'color:red;background:url(x)' }] });
  check('changes: javascript: href dropped, unknown op named, class kept, style declaration with url( dropped', v.body.variant.changes.length === 2 && v.body.variant.changes[0].op === 'add_class' && v.body.variant.changes[1].value === 'color:red;' && v.body.stripped.some((x) => x.op === 'href') && v.body.stripped.some((x) => x.op === 'delete' && /not one of/.test(x.reason)) && v.body.stripped.some((x) => x.what === 'css' && /angle brackets/.test(x.reason)), v.body);
  const sels = [['a { color: red }', /not allowed/], ['a<b', /not allowed/], ['x'.repeat(201), /longer than 200/], ['', /empty/], ['p ~ q @ r', /not allowed/], ['div:nth-child(2) > a', null], ['a[href="#contact"]', null], ['a;b', /not allowed/], ['é', /outside letters/]];
  bad = [];
  for (const [sel, re] of sels) { const x = (await vv({ selector: sel, text: 'ok' })).body; const ok = re === null ? (x.selector.ok === true && x.ok === true) : (x.selector.ok === false && re.test(x.selector.reason) && x.ok === false); if (!ok) bad.push([sel.slice(0, 30), x.selector]); }
  check('selector format: acceptable selectors pass; each unacceptable one is named with the reason (' + sels.length + ' cases)', bad.length === 0, bad);
  v = await vv({ selector: '.x' });
  check('a variant with no change and no css is not ok (needs at least one)', v.body.ok === false && v.body.problems.some((x) => /at least one/.test(x)), v.body.problems);
  v = await vv({ text: 'Only text' });
  check('selector left out: selector.ok is null (not checked) and the variant is judged on its own', v.body.selector.ok === null && v.body.ok === true && v.body.variant.changes[0].value === 'Only text');
  v = await vv({ selector: '.x', format: 'block' });
  check('format block: not validated here (a Living Block cannot be placed through REST)', v.body.ok === false && v.body.problems.some((x) => /Living Block/.test(x)));
  v = await vv({ selector: '.x', changes: Array.from({ length: 12 }, (_, i) => ({ op: 'add_class', value: 'c' + i })) });
  check('more than 10 changes: the extra ones are reported as dropped', v.body.variant.changes.length === 10 && v.body.stripped.some((x) => x.what === 'changes'), v.body.stripped);
  const after = { posts: (await api('GET', '/state')).body.suggestions.length, ledger: parseInt(await q17('ledger_count'), 10) };
  check('validate-variant writes nothing (no test, no ledger row)', after.posts === before.posts && after.ledger === before.ledger, [before, after]);

  // ================= D. Preview of a test that is not running ==================================================================
  await q17('reset_all');
  await api('PUT', '/charter', CH);
  const pages = await J(q('mk_pages'));
  const prev = (await api('POST', '/suggestions', sg({ title: 'Preview me', target: '.q22-btn', page: '/q22-one/', variants: { A: { label: 'A' }, B: { label: 'B', changes: [{ op: 'text', value: 'Preview words' }], css: '.q22-btn{outline:3px solid #0a0}' } } }))).body;
  const other = (await api('POST', '/suggestions', sg({ title: 'Running one', target: '.q22-other', variants: { A: { label: 'A' }, B: { label: 'B', changes: [{ op: 'text', value: 'Other B' }] } } }))).body;
  await api('POST', `/tests/${other.id}/start`, { sessions_14d: 300 });
  const tk = await api('POST', `/suggestions/${prev.id}/preview-token`, {});
  const exp = Date.parse(tk.body.expires_at.replace(' ', 'T') + 'Z');
  check('preview token: issued for 30 minutes and tied to the test', tk.status === 200 && tk.body.test_id === prev.id && tk.body.expires_in === 1800 && Math.abs(exp - Date.now() - 1800000) < 120000 && /^\d+\.\d+\.[a-f0-9]{32}$/.test(tk.body.token) && tk.body.query.includes('sl_exp=' + prev.id), tk.body);
  const token = tk.body.token;
  const fetchPage = async (qs, cookie) => { const res = await fetch(`${BASE}/q22-one/${qs}`, { headers: cookie ? { cookie } : { cookie: 'playground_auto_login_already_happened=1' } }); const html = await res.text(); return { html, headers: res.headers, status: res.status }; };
  const hasPreview = (h) => /"mode":"preview"/.test(h);
  let pg = await fetchPage(`?sl_test=1&sl_exp=${prev.id}&sl_force=B&sl_pt=${token}`);
  check('anonymous visitor with a valid token: the page carries only the previewed test', pg.status === 200 && hasPreview(pg.html) && pg.html.includes(`"id":${prev.id}`) && !/"mode":"running"/.test(pg.html), pg.html.match(/window\.sparkLiving=[^;]{0,300}/));
  check('the preview page is not cacheable and not indexable', /no-store|no-cache/.test(pg.headers.get('cache-control') || '') && /noindex/.test(pg.headers.get('x-robots-tag') || ''), [pg.headers.get('cache-control'), pg.headers.get('x-robots-tag')]);
  pg = await fetchPage(`?sl_test=1&sl_exp=${prev.id}&sl_force=B`);
  check('anonymous visitor without a token: nothing is previewed (the normal page, with the running test)', !hasPreview(pg.html) && /"mode":"running"/.test(pg.html));
  const expired = await q('mk_token', `&id=${prev.id}&offset=-2000`);
  pg = await fetchPage(`?sl_test=1&sl_exp=${prev.id}&sl_force=B&sl_pt=${expired}`);
  check('an expired token (issued 2000 seconds ago) shows nothing', !hasPreview(pg.html) && (await q('verify_token', `&id=${prev.id}&t=${expired}`)) === 'invalid');
  const justOk = await q('mk_token', `&id=${prev.id}&offset=-1700`);
  pg = await fetchPage(`?sl_test=1&sl_exp=${prev.id}&sl_force=B&sl_pt=${justOk}`);
  check('a token issued 1700 seconds ago is still valid (30 minutes = 1800)', hasPreview(pg.html));
  pg = await fetchPage(`?sl_test=1&sl_exp=${other.id}&sl_force=B&sl_pt=${token}`);
  check('a token for another test shows nothing (and so does a token used for a running test)', !hasPreview(pg.html));
  const otherToken = (await api('POST', `/suggestions/${prev.id}/preview-token`, {})).body.token;
  pg = await fetchPage(`?sl_test=1&sl_exp=${prev.id}&sl_force=B&sl_pt=${otherToken.slice(0, -1) + (otherToken.endsWith('a') ? 'b' : 'a')}`);
  check('a token with one character changed shows nothing', !hasPreview(pg.html));
  pg = await fetchPage(`?sl_exp=${prev.id}&sl_force=B&sl_pt=${token}`);
  check('without ?sl_test=1 in the address nothing is previewed even with a valid token', !hasPreview(pg.html));
  pg = await fetchPage(`?sl_test=1&sl_exp=${prev.id}&sl_force=B`, a.cookie());
  check('a signed-in administrator needs no token', hasPreview(pg.html));
  pg = await fetchPage(`?sl_test=1&sl_exp=${prev.id}&sl_force=B`, build.cookie());
  check('a user with the build capability needs no token', hasPreview(pg.html));
  pg = await fetchPage(`?sl_test=1&sl_exp=${prev.id}&sl_force=B`, gate.cookie());
  check('a user with only the gate capability gets no preview', !hasPreview(pg.html));
  pg = await fetchPage(`?sl_test=1&sl_exp=${prev.id}&sl_force=B`, none.cookie());
  check('a signed-in user with no plugin capability gets no preview', !hasPreview(pg.html));
  let tk2 = await api('POST', `/suggestions/${other.id}/preview-token`, {});
  check('a running test cannot be previewed (409); an unknown test is 404', tk2.status === 409 && (await api('POST', '/suggestions/999999/preview-token', {})).status === 404, tk2.status);
  const dis = (await api('POST', '/suggestions', sg({ title: 'to dismiss' }))).body; await api('POST', `/suggestions/${dis.id}/dismiss`, {});
  const tkd = await api('POST', `/suggestions/${dis.id}/preview-token`, {});
  const dtoken = await q('mk_token', `&id=${dis.id}`);
  pg = await fetchPage(`?sl_test=1&sl_exp=${dis.id}&sl_force=B&sl_pt=${dtoken}`);
  check('a dismissed suggestion cannot be previewed, even with a correctly signed token', tkd.status === 409 && !hasPreview(pg.html));
  // In a real browser: anonymous, desktop user agent, no webdriver flag.
  const evBefore = await q('ev_count');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
  await ctx.addCookies([{ name: 'playground_auto_login_already_happened', value: '1', url: BASE }]);
  const page = await ctx.newPage();
  const btn = () => page.evaluate(() => { const e = document.querySelector('.q22-btn'); const o = document.querySelector('.q22-other'); return { text: e && e.textContent, outline: e && getComputedStyle(e).outlineStyle, other: o && o.textContent, test: document.documentElement.getAttribute('data-sl-test') }; });
  await page.goto(`${BASE}/q22-one/?sl_test=1&sl_exp=${prev.id}&sl_force=B&sl_pt=${token}`, { waitUntil: 'networkidle' });
  let st = await btn();
  check('browser, token, force B: the previewed challenger shows (text and css) and the running test is left alone', st.text === 'Preview words' && st.outline === 'solid' && st.other === 'Other link' && st.test === '1', st);
  await page.goto(`${BASE}/q22-one/?sl_test=1&sl_exp=${prev.id}&sl_force=A&sl_pt=${token}`, { waitUntil: 'networkidle' });
  st = await btn();
  check('browser, token, force A: the original', st.text === 'Book a free call' && st.outline !== 'solid', st);
  await page.goto(`${BASE}/q22-one/?sl_test=1&sl_exp=${prev.id}&sl_pt=${token}`, { waitUntil: 'networkidle' });
  st = await btn();
  check('browser, token, no sl_force: the challenger (a preview shows B unless A is asked for)', st.text === 'Preview words', st);
  await page.goto(`${BASE}/q22-two/?sl_test=1&sl_exp=${prev.id}&sl_force=B&sl_pt=${token}`, { waitUntil: 'networkidle' });
  st = await btn();
  check('the preview is selector based: on a second page that has the element it shows the challenger too', st.text === 'Preview words', st);
  await page.waitForTimeout(500);
  check('the preview visits recorded nothing (events table unchanged)', (await q('ev_count')) === evBefore, [evBefore, await q('ev_count')]);
  const ctx2 = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 800 } });
  await ctx2.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
  await ctx2.addCookies([{ name: 'playground_auto_login_already_happened', value: '1', url: BASE }]);
  const p2 = await ctx2.newPage();
  await p2.goto(`${BASE}/q22-one/?sl_exp=${prev.id}&sl_force=B`, { waitUntil: 'networkidle' });
  const t2 = await p2.evaluate(() => (document.querySelector('.q22-btn') || {}).textContent);
  check('an ordinary visit (no token, no test mode) sees the original link', t2 === 'Book a free call', t2);
  await p2.goto(`${BASE}/q22-one/?sl_test=1&sl_exp=${prev.id}&sl_force=B`, { waitUntil: 'networkidle' });
  const t3 = await p2.evaluate(() => (document.querySelector('.q22-btn') || {}).textContent);
  check('test-visit mode without a token: still the original (the running test is the only one forced)', t3 === 'Book a free call', t3);
  await browser.close();

  // ================= E. Charter approval =====================================================================================
  await q17('reset_all');
  let c = (await api('GET', '/charter')).body;
  check('an empty charter is a draft with no approval', c.version === 0 && c.status === 'draft' && c.approved_by === '' && c.approved_at === '');
  r = await api('POST', '/charter/approve', { by: 'owner' });
  check('approving an empty charter is refused (409 spark_living_charter_empty)', r.status === 409 && r.body.code === 'spark_living_charter_empty', [r.status, r.body.code]);
  r = await api('PUT', '/charter', { ...CH, status: 'approved', approved_by: 'me', approved_at: '2020-01-01 00:00:00' });
  check('PUT /charter ignores status, approved_by and approved_at in the body: version 1, draft', r.status === 200 && r.body.version === 1 && r.body.status === 'draft' && r.body.approved_by === '', r.body);
  r = await api('POST', '/charter/approve', {});
  c = r.body;
  check('POST /charter/approve by an administrator: approved, who and when recorded, version unchanged', r.status === 200 && c.status === 'approved' && c.approved_by === 'user:admin' && /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(c.approved_at) && c.version === 1, c);
  let led = await J(q('ledger', '&kind=charter_approved'));
  check('approval wrote one charter_approved ledger row', led.length === 1 && /version 1 approved/.test(led[0].summary) && led[0].proposed_by === 'user:admin', led);
  await api('POST', '/charter/approve', {});
  check('approving again changes nothing and writes no second row', (await J(q('ledger', '&kind=charter_approved'))).length === 1);
  r = await api('PUT', '/charter', { business_goal: 'More leads' });
  check('PUT with unchanged content: the version goes up, the approval stays', r.body.version === 2 && r.body.status === 'approved' && r.body.approved_by === 'user:admin', r.body);
  r = await api('PUT', '/charter', { business_goal: 'More qualified leads' });
  check('PUT with a content change: back to draft, approval cleared, version bumped by the server', r.body.version === 3 && r.body.status === 'draft' && r.body.approved_by === '' && r.body.approved_at === '', r.body);
  r = await api('PUT', '/charter', { autonomy_level: 'tier1' });
  check('a change of autonomy level is a content change too', r.body.status === 'draft' && r.body.version === 4);
  r = await api('POST', '/charter/approve', { by: 'agent:builder' });
  check('approval with by "agent:..." is refused (403 spark_living_agent_cannot_approve); so is "Agent:" in any case', r.status === 403 && r.body.code === 'spark_living_agent_cannot_approve' && (await api('POST', '/charter/approve', { by: 'Agent:Judge' })).status === 403 && (await J(q('charter_state'))).status === 'draft');
  r = await build.api('POST', '/charter/approve', {});
  check('approval from a user without manage_options is refused', r.status === 403);
  // Agent actions are refused while the charter is a draft, and work once it is approved.
  const t1 = (await api('POST', '/suggestions', sg({ title: 'Agent target' }))).body;
  await api('POST', `/suggestions/${t1.id}/gate`, { verdict: 'pass', reasons: 'ok', by: 'agent:judge' });
  r = await api('POST', `/suggestions/${t1.id}/queue`, { by: 'agent:builder' });
  check('agent queue while the charter is a draft: 403 spark_living_charter_unapproved', r.status === 403 && r.body.code === 'spark_living_charter_unapproved', [r.status, r.body.code]);
  const ledq = await J(q('ledger', '&kind=queue_attempt'));
  check('the refusal is a queue_attempt row with status failed, naming the actor and the reason', ledq.length === 1 && ledq[0].status === 'failed' && ledq[0].proposed_by === 'agent:builder' && /was refused/.test(ledq[0].summary) && JSON.parse(ledq[0].evidence_json).refused === 'spark_living_charter_unapproved', ledq);
  await api('POST', '/charter/approve', { by: 'owner' });
  r = await api('POST', `/suggestions/${t1.id}/queue`, { by: 'agent:builder' });
  check('after approval the same call succeeds', r.status === 200 && r.body.status === 'queued', [r.status, r.body.code]);
  await api('POST', `/suggestions/${t1.id}/unqueue`, {});
  // Undo of a charter save restores the content and leaves a draft
  const chg = (await api('GET', '/changes?kind=charter_update&per_page=1')).body[0];
  r = await api('POST', `/changes/${chg.id}/undo`, {});
  check('undoing the last charter save restores the earlier content and the charter is a draft', r.status === 200 && (await J(q('charter_state'))).status === 'draft');
  // wp-admin screen
  const br2 = await chromium.launch();
  const cx = await br2.newContext({ userAgent: UA, viewport: { width: 1280, height: 900 } });
  await cx.addCookies([{ name: 'playground_auto_login_already_happened', value: '1', url: BASE }]);
  const ap = await cx.newPage();
  await ap.goto(BASE + '/wp-login.php'); await ap.fill('#user_login', 'admin'); await ap.fill('#user_pass', 'password'); await ap.click('#wp-submit'); await ap.waitForLoadState('networkidle');
  await ap.goto(BASE + '/wp-admin/admin.php?page=spark-living-charter', { waitUntil: 'networkidle' });
  const btnCount = await ap.locator('button:has-text("Approve these goals")').count();
  const draftText = await ap.locator('.notice-warning.inline').first().innerText().catch(() => '');
  check('wp-admin Site charter screen: a draft shows the notice and an "Approve these goals" button', btnCount === 1 && /Draft: agents may not queue or start tests/.test(draftText), [btnCount, draftText]);
  const card = await (await fetch(BASE + '/living/', { headers: { cookie: a.cookie() } })).text();
  check('Site goals card on the dashboard says Draft and that agents may not queue', /sl-draft">Draft</.test(card) && /Agents may not queue or start tests, and nothing is picked automatically, until a person approves these goals/.test(card));
  await ap.locator('button:has-text("Approve these goals")').click();
  await ap.waitForLoadState('networkidle');
  const note = await ap.locator('.notice-success').first().innerText().catch(() => '');
  const cs = await J(q('charter_state'));
  check('pressing the button approves the charter (notice shown, approved_by is the signed-in user)', /Site goals approved/.test(note) && cs.status === 'approved' && cs.approved_by === 'user:admin', [note, cs]);
  check('after approval the button is gone and the screen says who approved it', (await ap.locator('button:has-text("Approve these goals")').count()) === 0 && /Approved/.test(await ap.locator('.wrap').innerText()), '');
  const card2 = await (await fetch(BASE + '/living/', { headers: { cookie: a.cookie() } })).text();
  check('Site goals card now says Approved by user:admin', /sl-approved">Approved</.test(card2) && /by user:admin on/.test(card2.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')));
  await br2.close();

  // ================= F. The hole: POST /tests and /start with an agent as the actor ===========================================
  await q17('reset_all');
  await api('PUT', '/charter', { ...CH, autonomy_level: 'tier1' }); await api('POST', '/charter/approve', { by: 'owner' });
  const f1 = (await api('POST', '/suggestions', sg({ title: 'F pass' }))).body;
  await api('POST', `/suggestions/${f1.id}/gate`, { verdict: 'pass', reasons: 'ok', by: 'agent:judge' });
  const f2 = (await api('POST', '/suggestions', sg({ title: 'F none' }))).body;
  const f3 = (await api('POST', '/suggestions', sg({ title: 'F fail' }))).body;
  await api('POST', `/suggestions/${f3.id}/gate`, { verdict: 'fail', reasons: 'bad', by: 'agent:judge' });
  const f4 = (await api('POST', '/suggestions', sg({ title: 'F tier2', tier: 2 }))).body;
  await api('POST', `/suggestions/${f4.id}/gate`, { verdict: 'pass', reasons: 'ok', by: 'agent:judge', risk_tier: 2 });
  const body = { name: 'Direct by agent', element_type: 'selector', target: '.t24-agent', variants: { A: { label: 'A' }, B: { label: 'B', changes: [{ op: 'text', value: 'x' }] } } };
  const total0 = (await api('GET', '/suggestions')).body.suggestions.length + (await api('GET', '/state')).body.queued.length;
  r = await api('POST', '/tests', { ...body, by: 'agent:builder' });
  check('POST /tests with by "agent:..." is refused (403 spark_living_gate_missing) and creates nothing', r.status === 403 && r.body.code === 'spark_living_gate_missing' && ((await api('GET', '/suggestions')).body.suggestions.length + (await api('GET', '/state')).body.queued.length) === total0, [r.status, r.body.code]);
  r = await api('POST', '/tests', { ...body, by: 'agent:builder', start: true, sessions_14d: 300 });
  check('POST /tests with start:true and an agent is refused too, and nothing starts', r.status === 403 && !(await J(q('running'))), [r.status, r.body.code]);
  r = await api('POST', '/tests', { ...body, by: 'agent:builder', start: true, force: true });
  check('... also with force:true', r.status === 403 && !(await J(q('running'))), [r.status, r.body.code]);
  r = await api('POST', `/tests/${f2.id}/start`, { sessions_14d: 300, by: 'agent:builder' });
  check('start of a suggestion with no verdict, by an agent: 403 spark_living_gate_missing', r.status === 403 && r.body.code === 'spark_living_gate_missing' && !(await J(q('running'))), [r.status, r.body.code]);
  r = await api('POST', `/tests/${f2.id}/start`, { sessions_14d: 300, force: true, by: 'agent:builder' });
  check('start with force:true by an agent: still refused', r.status === 403 && !(await J(q('running'))), [r.status, r.body.code]);
  r = await api('POST', `/tests/${f3.id}/start`, { sessions_14d: 300, by: 'agent:builder' });
  check('start of a test the Judge failed, by an agent: 403', r.status === 403 && r.body.code === 'spark_living_gate_missing');
  r = await api('POST', `/tests/${f4.id}/start`, { sessions_14d: 300, by: 'agent:builder' });
  check('start of a tier 2 test at autonomy tier1, by an agent: 403 spark_living_agent_tier', r.status === 403 && r.body.code === 'spark_living_agent_tier', [r.status, r.body.code]);
  await api('PUT', '/charter', { business_goal: 'edited' });
  r = await api('POST', `/tests/${f1.id}/start`, { sessions_14d: 300, by: 'agent:builder' });
  check('start while the charter is an unapproved draft: 403 spark_living_charter_unapproved', r.status === 403 && r.body.code === 'spark_living_charter_unapproved');
  await api('POST', '/charter/approve', { by: 'owner' });
  r = await api('POST', `/tests/${f1.id}/start`, { sessions_14d: 300, by: 'agent:builder' });
  check('start with the verdict on the older charter version: 403 spark_living_gate_stale', r.status === 403 && r.body.code === 'spark_living_gate_stale', [r.status, r.body.code]);
  await api('POST', `/suggestions/${f1.id}/gate`, { verdict: 'pass', reasons: 'ok', by: 'agent:judge' });
  await api('PUT', '/charter', { autonomy_level: 'suggest' }); await api('POST', '/charter/approve', { by: 'owner' });
  await api('POST', `/suggestions/${f1.id}/gate`, { verdict: 'pass', reasons: 'ok', by: 'agent:judge' });
  r = await api('POST', `/tests/${f1.id}/start`, { sessions_14d: 300, by: 'agent:builder' });
  check('start at autonomy "suggest": 403 spark_living_agent_not_allowed', r.status === 403 && r.body.code === 'spark_living_agent_not_allowed', [r.status, r.body.code]);
  const refusals = await J(q('ledger', '&kind=queue_attempt'));
  check('every refusal above is a queue_attempt ledger row with status failed (' + refusals.length + ')', refusals.length >= 9 && refusals.every((x) => x.status === 'failed' && /tried to start/.test(x.summary)), refusals.length);
  await api('PUT', '/charter', { autonomy_level: 'tier1' }); await api('POST', '/charter/approve', { by: 'owner' });
  r = await build.api('POST', `/tests/${f2.id}/start`, { sessions_14d: 300 });
  check('a Builder login with no "by" at all is still an agent: refused on an unjudged test', r.status === 403 && r.body.code === 'spark_living_gate_missing', [r.status, r.body.code]);
  // An administrator without "by" behaves as today.
  r = await api('POST', `/tests/${f2.id}/start`, { sessions_14d: 300 });
  check('an administrator with no "by" can still start an unjudged suggestion (as today)', r.status === 200 && r.body.status === 'running', [r.status, r.body.code]);
  await api('POST', `/tests/${f2.id}/conclude`, { verdict: 'keep_a' });
  r = await api('POST', `/tests/${f1.id}/start`, { sessions_14d: 300, by: 'owner' });
  check('an administrator that names itself "owner" is not an agent', r.status === 200, [r.status, r.body.code]);
  await api('POST', `/tests/${f1.id}/conclude`, { verdict: 'keep_a' });
  await api('PUT', '/charter', { autonomy_level: 'tier1' }); await api('POST', '/charter/approve', { by: 'owner' });
  const f5 = (await api('POST', '/suggestions', sg({ title: 'F good' }))).body;
  await api('POST', `/suggestions/${f5.id}/gate`, { verdict: 'pass', reasons: 'ok', by: 'agent:judge' });
  r = await api('POST', `/tests/${f5.id}/start`, { sessions_14d: 300, by: 'agent:builder' });
  check('an agent start that passes every check (verdict pass on the current approved charter, tier allowed, no force) goes through', r.status === 200 && r.body.status === 'running', [r.status, r.body.code]);
  const sr = await J(q('ledger', '&kind=test_started'));
  check('and the ledger names the agent as who started it', sr.some((x) => x.proposed_by === 'agent:builder'), sr.map((x) => x.proposed_by));

  console.log('');
  const lint = await q17('lint');
  check('every php file in the plugin parses', /lint ok/.test(lint), lint);
  const log = await tool('log');
  check('debug log is empty', /no debug\.log/.test(log), log.slice(0, 600));
  process.exit(summary('t24 results, capabilities, validate, preview, approval, closed hole') ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
