// t17 (0.3.0): Site Charter, Change Ledger, upgrade routine, backfill.
// Run: node t17.js  (server from start.sh must be up)
const { BASE, run, admin, check, summary, tool } = require('./lib');

const q = (m, extra = '') => run('q17.php', `&m=${m}${extra}`);
const ymd = (d) => new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
const sg = (over = {}) => ({
  title: 'Ledger test suggestion', hypothesis: 'h', page: '/', device: 'all', element_type: 'selector', target: '.t17-target',
  variants: { A: { label: 'A' }, B: { label: 'B', changes: [{ op: 'text', value: 'New words' }] } }, change_type: 'wording',
  rationale: 'Because.', evidence: [{ source: 'Page review', detail: 'seen', as_of: ymd(1) }], priority: 1, suggested_by: 'agent:scout',
  sessions_14d: 250, sessions_as_of: ymd(1), ...over,
});
const kinds = (list) => list.map((x) => x.kind);

(async () => {
  const a = await admin();
  const api = (m, p, b) => a.api(m, p.replace('?', '&'), b);
  await q('reset_all');
  await q('upgrade');

  // ---------- charter: defaults, auth ----------
  const NOLOGIN = { cookie: 'playground_auto_login_already_happened=1' };
  const anon = await fetch(`${BASE}/index.php?rest_route=/spark-living/v1/charter`, { headers: NOLOGIN });
  check('GET /charter without credentials is 401', anon.status === 401, anon.status);
  const anonPut = await fetch(`${BASE}/index.php?rest_route=/spark-living/v1/charter`, { method: 'PUT', headers: { ...NOLOGIN, 'content-type': 'application/json' }, body: '{}' });
  check('PUT /charter without credentials is 401', anonPut.status === 401, anonPut.status);
  const anonCh = await fetch(`${BASE}/index.php?rest_route=/spark-living/v1/changes`, { headers: NOLOGIN });
  check('GET /changes without credentials is 401', anonCh.status === 401, anonCh.status);

  let r = await api('GET', '/charter');
  const c0 = r.body;
  check('GET /charter: 200, version 0, autonomy suggest, empty fields', r.status === 200 && c0.version === 0 && c0.autonomy_level === 'suggest' && c0.business_name === '' && Array.isArray(c0.off_limits) && c0.primary_conversion.type === '' && c0.speed_budget.load_ms === null, c0);
  const fields = ['business_name', 'business_goal', 'primary_conversion', 'secondary_conversions', 'audience', 'brand', 'off_limits', 'autonomy_level', 'speed_budget', 'updated_at', 'updated_by', 'version'];
  check('GET /charter: every contract field present', fields.every((f) => f in c0) && ['colors', 'fonts', 'button_shape', 'voice_notes'].every((f) => f in c0.brand) && ['load_ms', 'button_visible_ms', 'max_added_kb'].every((f) => f in c0.speed_budget));

  // ---------- charter: save, validate, merge ----------
  r = await api('PUT', '/charter', {
    business_name: 'Spark Sites', business_goal: 'More qualified website leads for local businesses.',
    primary_conversion: { type: 'form', description: 'Contact form on the homepage', selector: '#contact form' },
    secondary_conversions: [{ type: 'call', description: 'Tap the phone number' }, { type: 'booking', description: '' }],
    audience: 'Small local businesses.', brand: { colors: ['#1F6B3A', 'not a color!!', '#fff'], fonts: ['Poppins'], button_shape: 'pill', voice_notes: 'Plain, warm.' },
    off_limits: ['Prices', 'Prices', 'Legal text', ''], autonomy_level: 'tier1', speed_budget: { load_ms: 2500, button_visible_ms: 600, max_added_kb: 12 },
    evil_key: 'x', version: 99, updated_by: 'tester', updated_at: '2000-01-01 00:00:00',
  });
  const c1 = r.body;
  check('PUT /charter: 200, version 1', r.status === 200 && c1.version === 1, r.body);
  check('PUT /charter: values stored and cleaned', c1.business_name === 'Spark Sites' && c1.primary_conversion.type === 'form' && c1.primary_conversion.selector === '#contact form' && c1.secondary_conversions.length === 2 && c1.brand.colors.join() === '#1f6b3a,#fff' && c1.off_limits.join() === 'Prices,Legal text' && c1.autonomy_level === 'tier1' && c1.speed_budget.load_ms === 2500, c1);
  check('PUT /charter: unknown keys dropped, version and updated_at not taken from input', !('evil_key' in c1) && c1.version === 1 && c1.updated_at !== '2000-01-01 00:00:00' && /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(c1.updated_at) && c1.updated_by === 'tester', c1);
  r = await api('GET', '/charter');
  check('GET /charter returns what was saved', r.body.version === 1 && r.body.business_name === 'Spark Sites' && r.body.brand.fonts[0] === 'Poppins', r.body);

  r = await api('PUT', '/charter', { brand: { voice_notes: 'Changed only this.' } });
  check('partial PUT merges: other brand fields kept, version 2', r.status === 200 && r.body.version === 2 && r.body.brand.voice_notes === 'Changed only this.' && r.body.brand.button_shape === 'pill' && r.body.business_name === 'Spark Sites', r.body);
  r = await api('PUT', '/charter', { brand: { voice_notes: 'Changed only this.' } });
  check('saving the same content again still raises the version (3)', r.body.version === 3, r.body);

  const bad = async (name, body, code) => { const x = await api('PUT', '/charter', body); check('PUT /charter refused: ' + name, x.status === 400 && (!code || x.body.code === code), [x.status, x.body.code]); };
  await bad('primary conversion type', { primary_conversion: { type: 'banana' } }, 'spark_living_charter_conversion');
  await bad('secondary conversion type', { secondary_conversions: [{ type: 'nope', description: 'x' }] }, 'spark_living_charter_conversion');
  await bad('autonomy level', { autonomy_level: 'god' }, 'spark_living_charter_autonomy');
  await bad('negative speed budget', { speed_budget: { load_ms: -5 } }, 'spark_living_charter_speed');
  await bad('text speed budget', { speed_budget: { max_added_kb: 'lots' } }, 'spark_living_charter_speed');
  r = await api('GET', '/charter');
  check('refused saves changed nothing (still version 3)', r.body.version === 3, r.body.version);

  // ---------- ledger: charter rows, listing, filters ----------
  r = await api('GET', '/changes');
  const chRows = r.body.filter((x) => x.kind === 'charter_update');
  check('GET /changes: 200 list, newest first, three charter_update rows', r.status === 200 && Array.isArray(r.body) && chRows.length === 3 && r.body[0].id > r.body[1].id, kinds(r.body));
  check('GET /changes: X-WP-Total header', Number(r.headers.get('x-wp-total')) >= 3, r.headers.get('x-wp-total'));
  const row = chRows[chRows.length - 1];
  check('charter_update row: before/after, charter fields, undo payload, status applied', row.subject_type === 'charter' && row.subject_id === '1' && row.before_json.version === 0 && row.after_json.version === 1 && row.status === 'applied' && row.undo_json && row.undo_json.action === 'restore_charter' && row.proposed_by === 'tester' && row.gate_verdict === 'na', row);
  check('row has every contract column', ['id', 'created_at', 'kind', 'subject_type', 'subject_id', 'summary', 'before_json', 'after_json', 'proposed_by', 'gate_verdict', 'gate_reasons', 'gate_by', 'charter_version', 'evidence_json', 'result_json', 'undo_json', 'undone_at', 'status'].every((k) => k in row), Object.keys(row));
  r = await api('GET', '/changes?kind=charter_update&per_page=2');
  check('GET /changes: kind filter and per_page', r.body.length === 2 && r.body.every((x) => x.kind === 'charter_update'), kinds(r.body));
  r = await api('GET', '/changes?kind=charter_update&per_page=2&page=2');
  check('GET /changes: page 2', r.body.length >= 1 && r.body.every((x) => x.kind === 'charter_update'), r.body.length);

  // ---------- POST /changes (outside agents) ----------
  r = await api('POST', '/changes', { kind: 'style_fix', subject_type: 'page', subject_id: '12', summary: 'Made the footer button the brand green.', before: { color: '#333' }, after: { color: '#1f6b3a' }, proposed_by: 'agent:scout', gate_verdict: 'pass', gate_reasons: 'on brand, reversible', gate_by: 'agent:judge', evidence: { screenshot: 'x.png' }, undo: { action: 'restore_charter', charter: { business_name: 'HACK' }, expect_version: 3 } });
  const sf = r.body;
  check('POST /changes: 201 with the row', r.status === 201 && sf.kind === 'style_fix' && sf.proposed_by === 'agent:scout' && sf.gate_verdict === 'pass' && sf.before_json.color === '#333' && sf.after_json.color === '#1f6b3a' && sf.charter_version === 3, r);
  check('POST /changes: an outside agent cannot attach an undo payload', sf.undo_json === null && sf.can_undo === false, sf);
  r = await api('POST', '/changes', { kind: 'rows_removed', subject_type: 'events', subject_id: '53,54,55', summary: 'Three speed-test rows deleted.', proposed_by: 'owner' });
  check('POST /changes: rows_removed accepted', r.status === 201 && r.body.kind === 'rows_removed' && r.body.gate_verdict === 'na', r);
  r = await api('POST', '/changes', { kind: 'banana', summary: 'x' });
  check('POST /changes refused: unknown kind', r.status === 400, [r.status, r.body.code]);
  r = await api('POST', '/changes', { kind: 'other' });
  check('POST /changes refused: no summary', r.status === 400, [r.status, r.body.code]);
  r = await api('POST', '/changes', { kind: 'other', summary: 'x'.repeat(400), gate_verdict: 'maybe' });
  check('POST /changes refused: bad gate_verdict', r.status === 400, [r.status, r.body.code]);
  r = await api('POST', '/changes', { kind: 'other', summary: 'y'.repeat(400) });
  check('POST /changes: summary capped at 300 characters', r.status === 201 && r.body.summary.length === 300, r.body.summary && r.body.summary.length);
  r = await api('GET', '/changes?subject_id=12');
  check('GET /changes: subject_id filter', r.body.length === 1 && r.body[0].kind === 'style_fix', r.body);

  // ---------- speed (record only) ----------
  let s = (await api('GET', '/state')).body;
  check('GET /state: charter, changes (max 10), speed null, rules.min_exposures_before_shift, version 0.3.0', s.charter && s.charter.version === 3 && Array.isArray(s.changes) && s.changes.length <= 10 && s.changes.length > 0 && s.speed === null && s.rules.min_exposures_before_shift === 30 && s.plugin_version === '0.3.0', [s.plugin_version, s.speed, s.rules]);
  r = await api('POST', '/changes', { kind: 'other', subject_type: 'speed', subject_id: 'home', summary: 'Speed measured on the homepage.', proposed_by: 'agent:auditor', after: { load_ms: 880, button_visible_ms: 410, added_kb: 4.6 } });
  s = (await api('GET', '/state')).body;
  check('GET /state: speed holds the last posted values', s.speed && s.speed.load_ms === 880 && s.speed.button_visible_ms === 410 && s.speed.added_kb === 4.6 && s.speed.measured_by === 'agent:auditor' && /^\d{4}-/.test(s.speed.measured_at), s.speed);

  // ---------- undo: charter ----------
  r = await api('GET', '/changes?kind=charter_update');
  const oldest = r.body[r.body.length - 1];
  const newest = r.body[0];
  check('only the newest charter change can be undone (older one reports can_undo false)', newest.can_undo === true && oldest.can_undo === false, [newest.can_undo, oldest.can_undo]);
  r = await api('POST', `/changes/${oldest.id}/undo`);
  check('undo of a charter change that is no longer the latest: refused, not undoable', r.status === 409 && r.body.code === 'spark_living_not_undoable', [r.status, r.body.code]);
  await api('PUT', '/charter', { business_name: 'Renamed Co', off_limits: ['Prices'] });
  r = await api('GET', '/changes?kind=charter_update&per_page=1');
  const last = r.body[0];
  r = await api('POST', `/changes/${last.id}/undo`);
  check('undo charter: 200, new row recorded, content restored', r.status === 200 && r.body.kind === 'charter_update' && r.body.evidence_json.undo_of === last.id, r);
  const ch = (await api('GET', '/charter')).body;
  check('undo charter: name and off-limits back, version went up (not down)', ch.business_name === 'Spark Sites' && ch.off_limits.join() === 'Prices,Legal text' && ch.version === 5, ch);
  const lastAfter = (await api('GET', '/changes?kind=charter_update&per_page=3')).body;
  check('undo charter: original marked undone with a time, undo row has no undo of its own', lastAfter.find((x) => x.id === last.id).status === 'undone' && lastAfter.find((x) => x.id === last.id).undone_at !== '' && lastAfter[0].undo_json === null, lastAfter.map((x) => [x.id, x.status]));
  r = await api('POST', `/changes/${last.id}/undo`);
  check('undo twice: refused', r.status === 409 && r.body.code === 'spark_living_not_undoable', [r.status, r.body.code]);
  r = await api('POST', `/changes/${sf.id}/undo`);
  check('undo of a style_fix: clear not-undoable error', r.status === 409 && r.body.code === 'spark_living_not_undoable' && /undoable/i.test(r.body.message), r.body);
  r = await api('POST', `/changes/99999/undo`);
  check('undo of a missing row: 404', r.status === 404, r.status);

  // ---------- lifecycle rows ----------
  await api('PUT', '/charter', { autonomy_level: 'suggest' });
  let before = (await api('GET', '/changes?per_page=100')).headers.get('x-wp-total');
  r = await api('POST', '/suggestions', sg());
  const s1 = r.body;
  r = await api('GET', `/changes?subject_id=${s1.id}`);
  check('suggestion create writes a test_suggested row (proposed_by from suggested_by)', r.body.length === 1 && r.body[0].kind === 'test_suggested' && r.body[0].proposed_by === 'agent:scout' && r.body[0].subject_type === 'test', r.body);

  r = await api('POST', `/suggestions/${s1.id}/queue`);
  check('human queue: 200', r.status === 200 && r.body.status === 'queued', r.body);
  r = await api('GET', `/changes?subject_id=${s1.id}&kind=test_queued`);
  const qrow = r.body[0];
  check('queue writes test_queued: proposed_by owner, gate na, undo = unqueue', qrow && qrow.proposed_by === 'owner' && qrow.gate_verdict === 'na' && qrow.undo_json.action === 'unqueue' && qrow.can_undo === true, qrow);
  r = await api('POST', `/changes/${qrow.id}/undo`);
  check('undo a queued test: it goes back to suggested', r.status === 200 && r.body.kind === 'test_unqueued' && r.body.evidence_json.undo_of === qrow.id, r);
  const back = (await api('GET', '/suggestions')).body.suggestions.find((x) => x.id === s1.id);
  check('undo a queued test: status suggested, original row undone', back && back.status === 'suggested' && (await api('GET', `/changes?subject_id=${s1.id}&kind=test_queued`)).body[0].status === 'undone');
  r = await api('POST', `/changes/${qrow.id}/undo`);
  check('undo of the same queue row again: refused', r.status === 409, r.status);

  await api('POST', `/suggestions/${s1.id}/queue`);
  r = await api('POST', `/suggestions/${s1.id}/unqueue`);
  const un = (await api('GET', `/changes?subject_id=${s1.id}&kind=test_unqueued`)).body;
  check('unqueue by hand writes test_unqueued', r.status === 200 && un.length === 2, un.length);
  r = await api('POST', `/suggestions/${s1.id}/dismiss`);
  check('dismiss writes test_dismissed', r.status === 200 && (await api('GET', `/changes?subject_id=${s1.id}&kind=test_dismissed`)).body.length === 1);

  // start, conclude with a shipped winner
  r = await api('POST', '/tests', { name: 'Ledger run', element_type: 'selector', target: '.t17-run', hypothesis: 'h', tier: 1, start: true, sessions_14d: 300, variants: { A: { label: 'A' }, B: { label: 'B', changes: [{ op: 'text', value: 'Go' }] } } });
  const t1 = r.body;
  const st = (await api('GET', `/changes?subject_id=${t1.id}`)).body;
  check('start writes test_started with sessions evidence and 50/50 after', st.length === 1 && st[0].kind === 'test_started' && st[0].after_json.weights.A === 0.5 && st[0].evidence_json.sessions_14d === 300, st);
  r = await api('POST', `/tests/${t1.id}/conclude`, { verdict: 'ship_b', note: 'ledger test' });
  const cl = (await api('GET', `/changes?subject_id=${t1.id}`)).body;
  check('conclude (ship_b) writes test_concluded and winner_applied', kinds(cl).includes('test_concluded') && kinds(cl).includes('winner_applied'), kinds(cl));
  const tc = cl.find((x) => x.kind === 'test_concluded');
  check('test_concluded carries the verdict and the counts', tc.after_json.verdict === 'ship_b' && tc.result_json && tc.result_json.counts, tc);
  r = await api('POST', '/tests', { name: 'Ledger run 2', element_type: 'selector', target: '.t17-run2', hypothesis: 'h', tier: 1, start: true, sessions_14d: 300, variants: { A: { label: 'A' }, B: { label: 'B', changes: [{ op: 'text', value: 'Go' }] } } });
  await api('POST', `/tests/${r.body.id}/conclude`, { verdict: 'keep_a' });
  const cl2 = (await api('GET', `/changes?subject_id=${r.body.id}`)).body;
  check('conclude (keep_a) writes test_concluded and no winner_applied', kinds(cl2).includes('test_concluded') && !kinds(cl2).includes('winner_applied'), kinds(cl2));

  // revert (engine): a shipped winner whose leads collapsed
  const rv = await q('revert_scenario');
  const rvRows = (await api('GET', '/changes?kind=reverted')).body;
  check('auto-revert writes a reverted row from the engine', /reverted/.test(rv) && rvRows.length >= 1 && rvRows[0].proposed_by === 'engine', [rv, rvRows.length]);

  // ---------- wp-admin charter screen ----------
  const adminPage = await (await fetch(`${BASE}/wp-admin/admin.php?page=spark-living-charter`, { headers: { cookie: a.cookie() } })).text();
  check('wp-admin charter screen renders with the form and current values', /name="spark_living_nonce"/.test(adminPage) && /name="business_name"/.test(adminPage) && /Spark Sites/.test(adminPage) && /name="autonomy_level"/.test(adminPage), adminPage.slice(0, 200));
  const nonce = (adminPage.match(/name="spark_living_nonce" value="([a-f0-9]+)"/) || [])[1];
  const body = new URLSearchParams({ action: 'spark_living_save_charter', spark_living_nonce: nonce, _wp_http_referer: '/wp-admin/admin.php?page=spark-living-charter', business_name: 'Saved From Admin', business_goal: 'Goal text', pc_type: 'call', pc_description: 'Tap to call', pc_selector: '', secondary: 'form | Contact form | #contact form\nbooking | Book a slot |', audience: 'Locals', colors: '#112233, #445566', fonts: 'Inter', button_shape: 'rounded', voice_notes: 'Warm', off_limits: 'Prices\nGuarantees', autonomy_level: 'full', load_ms: '2000', button_visible_ms: '500', max_added_kb: '10' });
  const post = await fetch(`${BASE}/wp-admin/admin-post.php`, { method: 'POST', redirect: 'manual', headers: { cookie: a.cookie(), 'content-type': 'application/x-www-form-urlencoded' }, body });
  const cAfter = (await api('GET', '/charter')).body;
  check('wp-admin charter form saves through the same code (redirects, version up, values stored)', post.status === 302 && cAfter.business_name === 'Saved From Admin' && cAfter.primary_conversion.type === 'call' && cAfter.secondary_conversions.length === 2 && cAfter.secondary_conversions[0].selector === '#contact form' && cAfter.brand.colors.join() === '#112233,#445566' && cAfter.off_limits.join() === 'Prices,Guarantees' && cAfter.autonomy_level === 'full' && cAfter.speed_budget.max_added_kb === 10 && cAfter.version === 7 && cAfter.updated_by === 'user:admin', cAfter);
  const noNonce = await fetch(`${BASE}/wp-admin/admin-post.php`, { method: 'POST', redirect: 'manual', headers: { cookie: a.cookie(), 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ action: 'spark_living_save_charter', business_name: 'No nonce' }) });
  check('wp-admin charter form without a nonce is refused and saves nothing', noNonce.status >= 400 && (await api('GET', '/charter')).body.business_name === 'Saved From Admin', noNonce.status);

  // ---------- upgrade routine and backfill ----------
  await q('reset_all');
  await api('PUT', '/charter', { autonomy_level: 'suggest' });
  const sgA = (await api('POST', '/suggestions', sg({ title: 'Backfill suggestion A', suggested_by: 'Lumen page review' }))).body;
  const sgB = (await api('POST', '/suggestions', sg({ title: 'Backfill suggestion B', priority: 2, suggested_by: 'Lumen page review' }))).body;
  const runT = (await api('POST', '/tests', { name: 'Backfill running test', element_type: 'selector', target: '.t17-bf', hypothesis: 'h', tier: 1, start: true, sessions_14d: 137, variants: { A: { label: 'A' }, B: { label: 'B', changes: [{ op: 'text', value: 'Go' }] } } })).body;
  await q('set', `&id=${runT.id}&k=start_date&v=${encodeURIComponent('2026-11-13 13:58:11')}`);
  await q('set_weights', `&id=${runT.id}&wa=0.8&wb=0.2`);
  await q('ledger_wipe');
  const up = JSON.parse(await q('fresh'));
  check('upgrade from 0.2.0: ran, from 0.2.0 to 0.3.0, rows backfilled', up.ran === true && up.from === '0.2.0' && up.to === '0.3.0' && up.backfilled >= 4 && up.plugin_update_rows === 1, up);
  check('upgrade: the ledger table exists again', (await q('table')) === 'yes');
  const rows = JSON.parse(await q('ledger_rows'));
  const by = (k, sid) => rows.filter((x) => x.kind === k && (sid === undefined || x.subject_id === String(sid)));
  check('backfill: test_started at the real start time (2026-11-13 13:58:11)', by('test_started', runT.id).length === 1 && by('test_started', runT.id)[0].created_at === '2026-11-13 13:58:11', by('test_started', runT.id));
  check('backfill: both suggestions, at their stored suggested_at', by('test_suggested', sgA.id).length === 1 && by('test_suggested', sgB.id).length === 1 && by('test_suggested', sgA.id)[0].created_at === sgA.suggested_at && by('test_suggested', sgA.id)[0].proposed_by === 'Lumen page review', by('test_suggested'));
  const pu = by('plugin_update');
  check('backfill: plugin installed row (first activity) and plugin_update 0.2.0 to 0.3.0', pu.length === 2 && pu.some((x) => /updated from 0\.2\.0 to 0\.3\.0/.test(x.summary)) && pu.some((x) => /installed on this site/.test(x.summary)), pu.map((x) => x.summary));
  check('backfill: 80/20 weights noted as time unknown, before 50/50, after 80/20', by('weights_changed', runT.id).length === 1 && JSON.parse(by('weights_changed', runT.id)[0].after_json).A === 0.8 && /exact time was not recorded/.test(by('weights_changed', runT.id)[0].summary), by('weights_changed'));
  check('backfill rows are flagged in evidence', rows.filter((x) => x.kind !== 'plugin_update' || /installed on this/.test(x.summary)).every((x) => JSON.parse(x.evidence_json).backfill === true));
  const n1 = Number(await q('ledger_count'));
  const up2 = JSON.parse(await q('upgrade'));
  const up3 = JSON.parse(await q('upgrade'));
  await api('GET', '/state');
  check('upgrade run twice more: no new rows, no error', Number(await q('ledger_count')) === n1 && up2.backfilled === 0 && up3.backfilled === 0 && up2.plugin_update_rows === 0 && up3.plugin_update_rows === 0, [n1, up2, up3]);
  check('upgrade: the running test is untouched (same start time, weights)', (await q('digest', `&id=${runT.id}`)).endsWith(':running:2026-11-13 13:58:11:{"A":0.8,"B":0.2}'), await q('digest', `&id=${runT.id}`));

  // fresh install (no data at all): one "installed" row, nothing else
  await q('reset_all');
  await q('purge_experiments');
  const upf = JSON.parse(await q('fresh', '&install=1'));
  const rowsF = JSON.parse(await q('ledger_rows'));
  check('fresh install: a single plugin_update "installed" row, nothing backfilled', rowsF.length === 1 && rowsF[0].kind === 'plugin_update' && /installed/.test(rowsF[0].summary) && upf.backfilled === 0, rowsF.map((x) => x.summary));

  process.exit(summary('t17 charter + ledger + upgrade') ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
