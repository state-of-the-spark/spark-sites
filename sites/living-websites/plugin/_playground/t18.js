// t18 (0.3.0): Goal Gate record and the agent-queue refusal matrix.
// 3 autonomy levels x 3 risk tiers x gate (pass | fail | stale charter version) = 27 agent queue attempts,
// plus the human click, validation of POST /suggestions/{id}/gate, and the gate line on the cards.
// Run: node t18.js
const { BASE, run, admin, check, summary } = require('./lib');

const q = (m, extra = '') => run('q17.php', `&m=${m}${extra}`);
const ymd = (d) => new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
const sg = (n, over = {}) => ({
  title: 'Gate suggestion ' + n, hypothesis: 'h', page: '/', device: 'all', element_type: 'selector', target: '.t18-target',
  variants: { A: { label: 'A' }, B: { label: 'B', changes: [{ op: 'text', value: 'New words ' + n }] } }, change_type: 'wording',
  rationale: 'Because ' + n, evidence: [{ source: 'Page review', detail: 'seen', as_of: ymd(1) }], priority: n, suggested_by: 'agent:scout',
  sessions_14d: 250, sessions_as_of: ymd(1), ...over,
});

(async () => {
  const a = await admin();
  const api = (m, p, b) => a.api(m, p.replace('?', '&'), b);
  await q('reset_all');
  await q('upgrade');

  const levels = ['suggest', 'tier1', 'full'];
  const tiers = [1, 2, 3];
  const gates = ['pass', 'fail', 'stale'];
  let n = 0;
  const allowedFor = (level, tier, gate) => gate === 'pass' && ((level === 'tier1' && tier === 1) || (level === 'full' && tier <= 2));
  const bad = [];
  let allowedCount = 0, refusedCount = 0;

  for (const level of levels) {
    for (const tier of tiers) {
      for (const gate of gates) {
        n++;
        await api('PUT', '/charter', { autonomy_level: level });
        const s = (await api('POST', '/suggestions', sg(n))).body;
        // The judge records a verdict (and the risk tier) against the current charter version.
        const g = await api('POST', `/suggestions/${s.id}/gate`, { verdict: gate === 'fail' ? 'fail' : 'pass', reasons: gate === 'fail' ? 'Off brand.' : 'On brand, reversible, serves the main conversion.', by: 'agent:judge', risk_tier: tier });
        if (g.status !== 200) { bad.push([level, tier, gate, 'gate call', g.status, g.body]); continue; }
        if (gate === 'stale') { await api('PUT', '/charter', { business_goal: 'Goal edited after the verdict #' + n }); }
        const r = await api('POST', `/suggestions/${s.id}/queue`, { by: 'agent:scout' });
        const want = allowedFor(level, tier, gate);
        const got = r.status === 200 && r.body.status === 'queued';
        if (want !== got) { bad.push([level, tier, gate, 'want', want, 'got', r.status, r.body.code]); }
        if (want) { allowedCount++; await api('POST', `/suggestions/${s.id}/unqueue`, { by: 'owner' }); } else { refusedCount++; }
        // A refused attempt leaves the suggestion where it was.
        if (!want) {
          const now = (await api('GET', '/suggestions')).body.suggestions.find((x) => x.id === s.id);
          if (!now || now.status !== 'suggested') { bad.push([level, tier, gate, 'refused but status changed', now && now.status]); }
        }
      }
    }
  }
  check('matrix: all 27 agent queue attempts behave as the rules say (' + allowedCount + ' allowed, ' + refusedCount + ' refused)', bad.length === 0 && n === 27 && allowedCount === 3 && refusedCount === 24, bad);

  // Specific refusals carry a clear code
  await api('PUT', '/charter', { autonomy_level: 'suggest' });
  let s = (await api('POST', '/suggestions', sg(100))).body;
  let r = await api('POST', `/suggestions/${s.id}/queue`, { by: 'agent:scout' });
  check('agent at level suggest: 403 spark_living_agent_not_allowed', r.status === 403 && r.body.code === 'spark_living_agent_not_allowed', [r.status, r.body.code]);
  await api('PUT', '/charter', { autonomy_level: 'full' });
  r = await api('POST', `/suggestions/${s.id}/queue`, { by: 'agent:scout' });
  check('agent with no verdict recorded: 403 spark_living_gate_missing', r.status === 403 && r.body.code === 'spark_living_gate_missing', [r.status, r.body.code]);
  await api('POST', `/suggestions/${s.id}/gate`, { verdict: 'hold', reasons: 'Need the owner to confirm the wording.', by: 'agent:judge' });
  r = await api('POST', `/suggestions/${s.id}/queue`, { by: 'agent:scout' });
  check('agent with a hold verdict: refused', r.status === 403 && r.body.code === 'spark_living_gate_missing', [r.status, r.body.code]);
  await api('POST', `/suggestions/${s.id}/gate`, { verdict: 'pass', reasons: 'Confirmed.', by: 'agent:judge' });
  await api('PUT', '/charter', { audience: 'changed' });
  r = await api('POST', `/suggestions/${s.id}/queue`, { by: 'agent:scout' });
  check('stale verdict: 403 spark_living_gate_stale', r.status === 403 && r.body.code === 'spark_living_gate_stale', [r.status, r.body.code]);
  await api('POST', `/suggestions/${s.id}/gate`, { verdict: 'pass', reasons: 'Judged again on the new version.', by: 'agent:judge', risk_tier: 3 });
  r = await api('POST', `/suggestions/${s.id}/queue`, { by: 'agent:scout' });
  check('tier 3 is never queued by an agent, even at level full with a fresh pass: 403 spark_living_agent_tier3', r.status === 403 && r.body.code === 'spark_living_agent_tier3', [r.status, r.body.code]);
  await api('PUT', '/charter', { autonomy_level: 'tier1' });
  await api('POST', `/suggestions/${s.id}/gate`, { verdict: 'pass', reasons: 'ok', by: 'agent:judge', risk_tier: 2 });
  r = await api('POST', `/suggestions/${s.id}/queue`, { by: 'agent:scout' });
  check('tier 2 at level tier1: 403 spark_living_agent_tier', r.status === 403 && r.body.code === 'spark_living_agent_tier', [r.status, r.body.code]);

  // by is matched case-insensitively and ignoring leading space
  r = await api('POST', `/suggestions/${s.id}/queue`, { by: '  Agent:Sneaky' });
  check('"  Agent:Sneaky" is still treated as an agent', r.status === 403, r.status);

  // Refusals are recorded in the ledger
  const failedRows = (await api('GET', `/changes?subject_id=${s.id}&kind=test_queued`)).body;
  check('refused agent attempts are recorded as failed test_queued rows with the reason', failedRows.length >= 4 && failedRows.every((x) => x.status === 'failed' && x.proposed_by.toLowerCase().includes('agent:') && x.gate_reasons.startsWith('Refused')), failedRows.map((x) => [x.status, x.proposed_by]));
  check('a failed row cannot be undone', failedRows[0].can_undo === false);

  // Human queue works at every level, recorded as gate na
  for (const level of levels) {
    await api('PUT', '/charter', { autonomy_level: level });
    const h = (await api('POST', '/suggestions', sg(200 + levels.indexOf(level)))).body;
    // no gate verdict at all, tier 1
    r = await api('POST', `/suggestions/${h.id}/queue`);
    const row = (await api('GET', `/changes?subject_id=${h.id}&kind=test_queued`)).body[0];
    check(`human queue click at level ${level}, no verdict: allowed and recorded with gate na`, r.status === 200 && r.body.status === 'queued' && row.gate_verdict === 'na' && row.proposed_by === 'owner' && row.status === 'applied', [r.status, row]);
    await api('POST', `/suggestions/${h.id}/unqueue`);
  }
  s = (await api('POST', '/suggestions', sg(300))).body;
  r = await api('POST', `/suggestions/${s.id}/queue`, { by: 'owner' });
  check('by "owner" is a human click: allowed', r.status === 200 && r.body.status === 'queued', [r.status, r.body]);
  await api('POST', `/suggestions/${s.id}/unqueue`);

  // An allowed agent queue is recorded with the gate pass and the judge
  await api('PUT', '/charter', { autonomy_level: 'full' });
  s = (await api('POST', '/suggestions', sg(400))).body;
  await api('POST', `/suggestions/${s.id}/gate`, { verdict: 'pass', reasons: 'Serves the main conversion; reversible.', by: 'agent:judge', risk_tier: 2 });
  r = await api('POST', `/suggestions/${s.id}/queue`, { by: 'agent:scout' });
  const okRow = (await api('GET', `/changes?subject_id=${s.id}&kind=test_queued`)).body[0];
  check('allowed agent queue: ledger row shows proposed_by, gate pass, reasons, judge, the charter version', r.status === 200 && okRow.proposed_by === 'agent:scout' && okRow.gate_verdict === 'pass' && okRow.gate_by === 'agent:judge' && /main conversion/.test(okRow.gate_reasons) && okRow.charter_version === (await api('GET', '/charter')).body.version, okRow);

  // ---------- POST /suggestions/{id}/gate: storage and validation ----------
  s = (await api('POST', '/suggestions', sg(500))).body;
  r = await api('POST', `/suggestions/${s.id}/gate`, { verdict: 'pass', reasons: 'R'.repeat(700), by: 'agent:judge', risk_tier: 1 });
  const stored = r.body;
  const ver = (await api('GET', '/charter')).body.version;
  check('gate: stored fields (verdict, reasons capped at 600, by, at, charter version, risk tier)', r.status === 200 && stored.gate_verdict === 'pass' && stored.gate_reasons.length === 600 && stored.gate_by === 'agent:judge' && /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(stored.gate_at) && stored.gate_charter_version === ver && stored.risk_tier === 1 && stored.tier === 1, stored);
  const row = (await api('GET', `/changes?subject_id=${s.id}`)).body.find((x) => x.gate_verdict === 'pass' && /Goal Gate/.test(x.summary));
  check('gate: writes a ledger row carrying the verdict, reasons, judge and charter version', row && row.gate_by === 'agent:judge' && row.charter_version === ver && row.gate_reasons.length === 600 && row.kind === 'other', row);
  const sug = (await api('GET', '/suggestions')).body.suggestions.find((x) => x.id === s.id);
  check('GET /suggestions shows the gate fields', sug.gate_verdict === 'pass' && sug.gate_by === 'agent:judge' && sug.gate_charter_version === ver && sug.risk_tier === 1, sug);
  const bd = async (name, body, status, code) => { const x = await api('POST', `/suggestions/${s.id}/gate`, body); check('gate refused: ' + name, x.status === status && (!code || x.body.code === code), [x.status, x.body.code]); };
  await bd('bad verdict', { verdict: 'maybe', by: 'agent:judge' }, 400, 'spark_living_gate_verdict');
  await bd('na is not a verdict an agent can post', { verdict: 'na', by: 'agent:judge' }, 400, 'spark_living_gate_verdict');
  await bd('no by', { verdict: 'pass' }, 400, 'spark_living_gate_by');
  await bd('fail without reasons', { verdict: 'fail', by: 'agent:judge' }, 400, 'spark_living_gate_reasons');
  await bd('risk_tier 4', { verdict: 'pass', by: 'agent:judge', risk_tier: 4 }, 400, 'spark_living_gate_tier');
  const miss = await api('POST', `/suggestions/999999/gate`, { verdict: 'pass', by: 'agent:judge' });
  check('gate refused: unknown test is 404', miss.status === 404, miss.status);
  const noauth = await fetch(`${BASE}/index.php?rest_route=/spark-living/v1/suggestions/${s.id}/gate`, { method: 'POST', headers: { cookie: 'playground_auto_login_already_happened=1', 'content-type': 'application/json' }, body: JSON.stringify({ verdict: 'pass', by: 'agent:judge' }) });
  check('gate without credentials is 401', noauth.status === 401, noauth.status);
  // a judge may state the charter version it read; an old one is stored as given, so the queue sees it as stale
  await api('PUT', '/charter', { autonomy_level: 'full' });
  r = await api('POST', `/suggestions/${s.id}/gate`, { verdict: 'pass', by: 'agent:judge', charter_version: ver });
  const cur = (await api('GET', '/charter')).body.version;
  check('gate: a stated older charter_version is stored as given', r.body.gate_charter_version === ver && ver !== cur, [r.body.gate_charter_version, ver, cur]);
  r = await api('POST', `/suggestions/${s.id}/queue`, { by: 'agent:scout' });
  check('...and the agent queue then refuses it as stale', r.status === 403 && r.body.code === 'spark_living_gate_stale', [r.status, r.body.code]);

  // a running test can not be gated
  const run1 = await api('POST', '/tests', { name: 'Running gate', element_type: 'selector', target: '.t18-run', hypothesis: 'h', tier: 1, start: true, sessions_14d: 300, variants: { A: { label: 'A' }, B: { label: 'B', changes: [{ op: 'text', value: 'Go' }] } } });
  r = await api('POST', `/suggestions/${run1.body.id}/gate`, { verdict: 'pass', by: 'agent:judge' });
  check('gate refused: a running test is 409', r.status === 409, r.status);
  await api('POST', `/tests/${run1.body.id}/conclude`, { verdict: 'keep_a' });

  // ---------- the gate on the cards ----------
  const page = async (path = '/living/') => (await fetch(BASE + path, { headers: { cookie: a.cookie() } })).text();
  const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ');
  await q('reset_all');
  await api('PUT', '/charter', { autonomy_level: 'full', business_name: 'Cards Co' });
  const c1 = (await api('POST', '/suggestions', sg(1, { title: 'Card with a pass', priority: 1 }))).body;
  const c2 = (await api('POST', '/suggestions', sg(2, { title: 'Card never checked', priority: 2 }))).body;
  await api('POST', `/suggestions/${c1.id}/gate`, { verdict: 'pass', reasons: 'Serves the form and stays on brand.', by: 'agent:judge', risk_tier: 1 });
  let html = await page();
  let t = text(html);
  check('card: shows the verdict tag, reasons, judge, charter version and risk tier', /Goal Gate: Gate: pass/.test(t) && /Serves the form and stays on brand\./.test(t) && /Judged by agent:judge/.test(t) && /against charter version \d+/.test(t) && /Risk tier 1/.test(t), t.slice(t.indexOf('Suggested tests'), t.indexOf('Suggested tests') + 700));
  check('card: a suggestion with no verdict reads "Not checked yet"', /Card never checked[\s\S]*?Not checked yet/.test(t));
  check('card: the pass tag uses the pass class and has text, not colour alone', /sl-gate sl-gate-pass">Gate: pass</.test(html));
  await api('PUT', '/charter', { business_goal: 'A new goal, so the earlier verdict is out of date.' });
  html = await page(); t = text(html);
  check('card: after a charter save the verdict is marked Out of date and says why', /sl-gate sl-gate-stale">Out of date</.test(html) && /so an agent may not queue this until it is judged again/.test(t), t.slice(t.indexOf('Suggested tests'), t.indexOf('Suggested tests') + 600));
  await api('POST', `/suggestions/${c1.id}/queue`);
  html = await page(); t = text(html);
  check('queued card also shows the gate line', /Up next[\s\S]*Goal Gate:[\s\S]*Out of date/.test(t));

  await api('POST', `/suggestions/${c1.id}/unqueue`);
  await q('reset_all');
  process.exit(summary('t18 goal gate + agent queue matrix') ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
