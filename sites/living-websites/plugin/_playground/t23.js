// t23 (0.4.0): payoff score on suggestions (POST, PATCH, the plugin's own days figure), sorting (Goal Gate verdict, payoff, priority),
// the "Rejected by the Goal Gate" expander, the unambiguous goal_gate / traffic_gate keys, tier 2 suggestions, and auto-pick at each
// autonomy level with a draft, an approved and an empty charter.
// Run: node t23.js
const { BASE, run, admin, check, summary, tool } = require('./lib');

const q = (m, extra = '') => run('q22.php', `&m=${m}${extra}`);
const q17 = (m, extra = '') => run('q17.php', `&m=${m}${extra}`);
const J = async (p) => { const t = await p; try { return JSON.parse(t); } catch { return t; } };
const ymd = (d) => new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ');
let N = 0;
const sg = (over = {}) => {
  N++;
  return {
    title: 'Payoff suggestion ' + N, hypothesis: 'h', page: '/', device: 'all', element_type: 'selector', target: '.t23-s' + N,
    variants: { A: { label: 'A' }, B: { label: 'B', changes: [{ op: 'text', value: 'New words ' + N }] } }, change_type: 'wording',
    rationale: 'Because ' + N, evidence: [{ source: 'Page review', detail: 'seen', as_of: ymd(1) }], priority: N, suggested_by: 'agent:scout',
    sessions_14d: 250, sessions_as_of: ymd(1), ...over,
  };
};
const PI = (over = {}) => ({ sessions_reaching: 137, proximity: 0.8, expected_lift: 0.1, days_to_result: 23, traffic_class: 'decidable', ...over });

(async () => {
  const a = await admin();
  const api = (m, p, b) => a.api(m, p.replace('?', '&'), b);
  await q17('reset_all'); await q17('upgrade');
  const setup = async (level, approve) => {
    await q17('reset_all');
    if (level !== 'none') {
      await api('PUT', '/charter', { business_name: 'T23 Co', business_goal: 'More leads', primary_conversion: { type: 'form', description: 'Contact form' }, autonomy_level: level, updated_by: 'owner' });
      if (approve) { await api('POST', '/charter/approve', { by: 'owner' }); }
    }
  };
  const mk = async (over, gate, extra = {}) => {
    const r = await api('POST', '/suggestions', sg(over));
    if (r.status !== 201) { throw new Error('create failed ' + JSON.stringify(r.body)); }
    if (gate) { await api('POST', `/suggestions/${r.body.id}/gate`, { verdict: gate, reasons: 'On brand.', by: 'agent:judge', risk_tier: over.tier || 1, ...extra }); }
    return r.body;
  };

  // ---- A. Payoff fields on POST /suggestions ------------------------------------------------------------------------
  await setup('suggest', false);
  let r = await api('POST', '/suggestions', sg({ sessions_14d: 137, payoff_score: 0.0517, payoff_inputs: PI(), payoff_version: 'payoff.js 2026-11-16' }));
  check('POST /suggestions accepts payoff_score, payoff_inputs and payoff_version', r.status === 201 && r.body.payoff_score === 0.0517 && r.body.payoff_version === 'payoff.js 2026-11-16' && r.body.payoff_inputs.sessions_reaching === 137 && r.body.payoff_inputs.proximity === 0.8 && r.body.payoff_inputs.traffic_class === 'decidable', [r.status, r.body.code, r.body.message]);
  const pc = r.body.payoff.plugin_check;
  check('the plugin works out days to result itself and stores it beside the agent\'s figure', pc.days_to_result === 23 && pc.agent_days_to_result === 23 && pc.agrees === true && pc.traffic_class === 'decidable' && pc.reachable === true && pc.stop_days === 23, pc);
  r = await api('POST', '/suggestions', sg({ sessions_14d: 137, payoff_score: 0.5, payoff_inputs: PI({ days_to_result: 10 }) }));
  check('when the agent says 10 days and the plugin says 23, both are kept and agrees is false', r.body.payoff.plugin_check.days_to_result === 23 && r.body.payoff.plugin_check.agent_days_to_result === 10 && r.body.payoff.plugin_check.agrees === false, r.body.payoff);
  r = await api('POST', '/suggestions', sg({ sessions_14d: 60, payoff_inputs: PI({ days_to_result: 38, traffic_class: 'decidable' }) }));
  check('at 60 sessions the plugin calls it below_minimum (52 days is not reachable) whatever the agent says', r.body.payoff.plugin_check.traffic_class === 'below_minimum' && r.body.payoff.plugin_check.reachable === false && r.body.payoff.plugin_check.days_to_result === 52, r.body.payoff);
  const bads = [
    [{ payoff_score: -1 }, 'spark_living_payoff_score'], [{ payoff_score: 'high' }, 'spark_living_payoff_score'],
    [{ payoff_inputs: PI({ proximity: 1.5 }) }, 'spark_living_payoff_inputs'], [{ payoff_inputs: PI({ days_to_result: 'soon' }) }, 'spark_living_payoff_inputs'],
    [{ payoff_inputs: 'text' }, 'spark_living_payoff_inputs'], [{ payoff_version: 'v<script>' }, 'spark_living_payoff_version'],
  ];
  let bad = [];
  for (const [body, code] of bads) { const x = await api('POST', '/suggestions', sg(body)); if (x.status !== 400 || x.body.code !== code) bad.push([body, x.status, x.body.code]); }
  check('invalid payoff fields are refused with 400 and a specific code, and nothing is written', bad.length === 0 && (await api('GET', '/suggestions')).body.suggestions.length === 3, bad);
  r = await api('POST', '/suggestions', sg({ payoff_inputs: { ...PI(), evil: '<b>x</b>', sessions_14d: 137, change_type: 'cta_promote' } }));
  check('unknown payoff_inputs keys are dropped; the documented extras are kept', r.status === 201 && !('evil' in r.body.payoff_inputs) && r.body.payoff_inputs.change_type === 'cta_promote' && r.body.payoff_inputs.sessions_14d === 137, r.body.payoff_inputs);
  r = await api('POST', '/suggestions', sg());
  check('a suggestion without payoff fields has payoff_score null and an empty payoff_inputs', r.status === 201 && r.body.payoff_score === null && Object.keys(r.body.payoff_inputs).length === 0 && r.body.payoff_version === '', r.body.payoff);

  // ---- B. PATCH /suggestions/{id} ----------------------------------------------------------------------------------
  await setup('suggest', false);
  const p1 = await mk({ sessions_14d: 137 }, null);
  let pr = await api('PATCH', `/suggestions/${p1.id}`, { payoff_score: 0.2, payoff_inputs: PI({ days_to_result: 23 }), payoff_version: 'payoff.js 2026-11-17', by: 'agent:scout' });
  check('PATCH sets the payoff fields and returns the card', pr.status === 200 && pr.body.payoff_score === 0.2 && pr.body.payoff_version === 'payoff.js 2026-11-17' && pr.body.payoff.plugin_check.agrees === true, [pr.status, pr.body.code]);
  pr = await api('PATCH', `/suggestions/${p1.id}`, { sessions_14d: 300, sessions_as_of: ymd(0) });
  check('PATCH refreshes the traffic count; the plugin recomputes its days to result (300 sessions: 11 days to 100 per version)', pr.status === 200 && pr.body.sessions_14d === 300 && pr.body.payoff.plugin_check.days_to_result === 11 && pr.body.traffic.projected_days === 11, [pr.status, pr.body.payoff && pr.body.payoff.plugin_check]);
  pr = await api('PATCH', `/suggestions/${p1.id}`, { sessions_14d: 300 });
  check('PATCH with sessions_14d but no date is refused (400)', pr.status === 400 && pr.body.code === 'spark_living_sessions_as_of');
  pr = await api('PATCH', `/suggestions/${p1.id}`, { payoff_score: null });
  check('PATCH with payoff_score null clears the score', pr.status === 200 && pr.body.payoff_score === null);
  pr = await api('PATCH', `/suggestions/${p1.id}`, {});
  check('PATCH with nothing to change is 400 spark_living_nothing', pr.status === 400 && pr.body.code === 'spark_living_nothing');
  pr = await api('PATCH', `/suggestions/${p1.id}`, { payoff_score: -5 });
  check('PATCH with a bad score is 400 and changes nothing', pr.status === 400 && pr.body.code === 'spark_living_payoff_score' && (await api('GET', '/suggestions')).body.suggestions[0].payoff_score === null);
  pr = await api('PATCH', '/suggestions/99999999', { payoff_score: 1 });
  check('PATCH on a test that does not exist is 404', pr.status === 404);
  const led = await J(q('ledger', '&kind=suggestion_updated'));
  check('every PATCH that worked wrote a suggestion_updated ledger row (3), naming who', led.length === 3 && led[0].proposed_by === 'agent:scout' && /Suggestion updated/.test(led[0].summary), led.map((x) => x.proposed_by));
  await api('POST', `/suggestions/${p1.id}/dismiss`, {});
  pr = await api('PATCH', `/suggestions/${p1.id}`, { payoff_score: 1 });
  check('PATCH on a dismissed suggestion is 409', pr.status === 409);

  // ---- C. Sorting: Goal Gate verdict, then payoff, then priority --------------------------------------------------------
  await setup('suggest', false);
  const sA = await mk({ title: 'A pass 0.05', payoff_score: 0.05, priority: 1 }, 'pass');
  const sB = await mk({ title: 'B pass 0.20', payoff_score: 0.2, priority: 2 }, 'pass');
  const sC = await mk({ title: 'C unchecked 0.30', payoff_score: 0.3, priority: 3 }, null);
  const sD = await mk({ title: 'D hold 0.50', payoff_score: 0.5, priority: 4 }, 'hold');
  const sE = await mk({ title: 'E fail 0.90', payoff_score: 0.9, priority: 5 }, 'fail');
  const sF = await mk({ title: 'F pass unscored', priority: 6 }, 'pass');
  const sG = await mk({ title: 'G unchecked unscored', priority: 0 + 7 }, null);
  const sH = await mk({ title: 'H pass 0.20 tie', payoff_score: 0.2, priority: 8 }, 'pass');
  const order = (await api('GET', '/suggestions')).body.suggestions.map((x) => x.name);
  check('order: pass by payoff (ties by priority), then pass unscored, then not checked by payoff, then not checked unscored, then hold, then fail last', order.join('|') === ['B pass 0.20', 'H pass 0.20 tie', 'A pass 0.05', 'F pass unscored', 'C unchecked 0.30', 'G unchecked unscored', 'D hold 0.50', 'E fail 0.90'].join('|'), order);
  const stateOrder = (await api('GET', '/state')).body.suggestions.map((x) => x.name);
  check('GET /state lists the suggestions in the same order', stateOrder.join('|') === order.join('|'));
  let html = await (await fetch(BASE + '/living/', { headers: { cookie: a.cookie() } })).text();
  let t = text(html);
  const cards = [...html.matchAll(/<article class="sl-card sl-sug"[^>]*data-sl-id="(\d+)"/g)].map((m) => +m[1]);
  check('the dashboard shows the two best-placed suggestions, in order, outside the rejected list', cards.join(',') === [sB.id, sH.id].join(','), cards);
  const rejected = html.slice(html.indexOf('id="sl-rejected"'), html.indexOf('</details>', html.indexOf('id="sl-rejected"')));
  check('"Rejected by the Goal Gate (1)" expander holds the failed one (and only it) and is closed by default', /<summary>Rejected by the Goal Gate \(1\)<\/summary>/.test(rejected) && rejected.includes('E fail 0.90') && !/<details[^>]* open/.test(rejected), rejected.slice(0, 300));
  check('the failed suggestion is not among the visible cards', !html.slice(0, html.indexOf('id="sl-rejected"')).includes('E fail 0.90'));
  check('"5 more suggested tests are waiting" counts the unshown ones that are not rejected (A, F, C, G, D)', /5 more suggested tests are waiting/.test(t), t.match(/\d+ more suggested[^.]*\./));
  check('payoff line in words: B is "highest of 5" (0.3 and 0.5 are scored but 0.2 outranks A 0.05)'.replace('highest of 5', 'third of 5'), /Expected payoff: third of 5/.test(t) && /\(score 0\.2\)/.test(t), t.match(/Expected payoff:[^.]{0,60}/g));
  check('payoff line: a tie shares the rank (H also third of 5)', (t.match(/Expected payoff: third of 5/g) || []).length === 2);
  // Rank words for a different set
  await q17('reset_all');
  const w1 = await mk({ title: 'W1', payoff_score: 0.7 }, 'pass'); const w2 = await mk({ title: 'W2', payoff_score: 0.4 }, 'pass'); await mk({ title: 'W3', payoff_score: 0.1 }, 'pass');
  html = await (await fetch(BASE + '/living/', { headers: { cookie: a.cookie() } })).text(); t = text(html);
  check('payoff words: "highest of 3" on the best, "second of 3" next', /W1[\s\S]*?Expected payoff: highest of 3 \(score 0\.7\)/.test(t) && /W2[\s\S]*?Expected payoff: second of 3 \(score 0\.4\)/.test(t), t.match(/Expected payoff:[^.]{0,50}/g));
  await q17('reset_all');
  await mk({ title: 'Lonely', payoff_score: 0.7 }, 'pass'); await mk({ title: 'Unscored one' }, 'pass');
  html = await (await fetch(BASE + '/living/', { headers: { cookie: a.cookie() } })).text(); t = text(html);
  check('payoff words: a single scored suggestion is "the only one scored"; an unscored one says "not scored yet"', /Expected payoff: the only one scored/.test(t) && /Expected payoff: not scored yet/.test(t));
  await q17('reset_all');
  const l3 = [await mk({ title: 'L1', payoff_score: 0.9 }, 'pass'), await mk({ title: 'L2', payoff_score: 0.5 }, 'pass'), await mk({ title: 'L3', payoff_score: 0.1 }, 'pass')];
  await api('POST', `/suggestions/${l3[0].id}/dismiss`, {});
  html = await (await fetch(BASE + '/living/', { headers: { cookie: a.cookie() } })).text(); t = text(html);
  check('payoff words: "lowest of 2" on the weaker of two', /Expected payoff: highest of 2/.test(t) && /Expected payoff: lowest of 2/.test(t), t.match(/Expected payoff:[^.]{0,50}/g));

  // ---- D. goal_gate and traffic_gate keys --------------------------------------------------------------------------
  await setup('tier1', true);
  const k = await mk({ sessions_14d: 137 }, null);
  check('a new suggestion carries goal_gate (empty verdict) and traffic_gate, with the old gate key as an alias of the traffic check', k.goal_gate && k.goal_gate.verdict === '' && k.goal_gate.stale === false && k.traffic_gate && k.traffic_gate.ok === true && k.traffic_gate.code === 'ready' && JSON.stringify(k.gate) === JSON.stringify(k.traffic_gate), [k.goal_gate, k.traffic_gate, k.gate]);
  const long = 'x'.repeat(900);
  const g = await api('POST', `/suggestions/${k.id}/gate`, { verdict: 'hold', reasons: long, by: 'agent:judge' });
  check('goal_gate after a verdict: {verdict, reasons (a string of at most 600), by, at, charter_version, stale}', g.status === 200 && g.body.goal_gate.verdict === 'hold' && typeof g.body.goal_gate.reasons === 'string' && g.body.goal_gate.reasons.length === 600 && g.body.goal_gate.by === 'agent:judge' && /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(g.body.goal_gate.at) && g.body.goal_gate.charter_version === 1 && g.body.goal_gate.stale === false, g.body.goal_gate);
  check('the old gate key still means the traffic check (not the Goal Gate)', g.body.gate.code === 'ready' && g.body.gate_verdict === 'hold', [g.body.gate]);
  await api('PUT', '/charter', { business_goal: 'More leads, faster' });
  const k2 = (await api('GET', '/suggestions')).body.suggestions.find((x) => x.id === k.id);
  check('goal_gate.stale is true once the charter changes', k2.goal_gate.stale === true && k2.goal_gate.charter_version === 1, k2.goal_gate);
  const rows = await J(q('ledger'));
  check('the verdict row uses the kind gate_verdict (not other)', rows.some((x) => x.kind === 'gate_verdict' && x.subject_id == k.id) && !rows.some((x) => x.kind === 'other'), rows.map((x) => x.kind));
  const kinds = ['gate_verdict', 'suggestion_created', 'queue_attempt', 'audit', 'stop_date_changed'];
  bad = [];
  for (const kd of kinds) { const x = await api('POST', '/changes', { kind: kd, summary: 'posted ' + kd, proposed_by: 'agent:auditor' }); if (x.status !== 201 || x.body.kind !== kd) bad.push([kd, x.status, x.body.code]); }
  check('POST /changes accepts the five new kinds and stores them as sent', bad.length === 0, bad);

  // ---- E. Tier 2 suggestions ---------------------------------------------------------------------------------------
  await setup('full', true);
  r = await api('POST', '/suggestions', sg({ tier: 2, title: 'Tier two' }));
  check('POST /suggestions accepts tier 2 (0.2.0 refused it)', r.status === 201 && r.body.tier === 2 && r.body.risk_tier === 2 && r.body.status === 'suggested', [r.status, r.body.code]);
  r = await api('POST', '/suggestions', sg({ tier: 3 }));
  check('tier 3 is still refused (400 spark_living_tier3)', r.status === 400 && r.body.code === 'spark_living_tier3');
  r = await api('POST', '/suggestions', sg({ tier: 'x' }));
  check('a tier that is not 1, 2 or 3 is 400', r.status === 400 && r.body.code === 'spark_living_tier');
  const t2 = await mk({ tier: 2, title: 'Tier two judged' }, 'pass');
  let aq = await api('POST', `/suggestions/${t2.id}/queue`, { by: 'agent:builder' });
  check('at autonomy full an agent may queue a passed tier 2 suggestion', aq.status === 200 && aq.body.status === 'queued', [aq.status, aq.body.code]);
  await api('POST', `/suggestions/${t2.id}/unqueue`, {});
  await api('PUT', '/charter', { autonomy_level: 'tier1' }); await api('POST', '/charter/approve', { by: 'owner' });
  await api('POST', `/suggestions/${t2.id}/gate`, { verdict: 'pass', reasons: 'ok', by: 'agent:judge', risk_tier: 2 });
  aq = await api('POST', `/suggestions/${t2.id}/queue`, { by: 'agent:builder' });
  check('at autonomy tier1 the same tier 2 suggestion is refused (spark_living_agent_tier)', aq.status === 403 && aq.body.code === 'spark_living_agent_tier', [aq.status, aq.body.code]);

  // ---- F. Auto-pick -------------------------------------------------------------------------------------------------
  const world = async () => {
    // S1 tier 1 pass 0.10 | S2 tier 1 pass 0.30 | S3 tier 2 pass 0.60 | S4 tier 1 hold 0.90 | S5 tier 1 pass unscored | S6 tier 1 pass 0.50 but only 40 sessions
    const out = {};
    out.s1 = await mk({ title: 'S1', payoff_score: 0.1, sessions_14d: 300 }, 'pass');
    out.s2 = await mk({ title: 'S2', payoff_score: 0.3, sessions_14d: 300 }, 'pass');
    out.s3 = await mk({ title: 'S3', payoff_score: 0.6, sessions_14d: 300, tier: 2 }, 'pass');
    out.s4 = await mk({ title: 'S4', payoff_score: 0.9, sessions_14d: 300 }, 'hold');
    out.s5 = await mk({ title: 'S5', sessions_14d: 300 }, 'pass');
    out.s6 = await mk({ title: 'S6', payoff_score: 0.5, sessions_14d: 40 }, 'pass');
    return out;
  };
  const cases = [
    { level: 'suggest', charter: 'approved', want: null },
    { level: 'tier1', charter: 'approved', want: 's2' },
    { level: 'full', charter: 'approved', want: 's3' },
    { level: 'tier1', charter: 'draft', want: null },
    { level: 'full', charter: 'draft', want: null },
    { level: 'tier1', charter: 'empty', want: null },
    { level: 'full', charter: 'empty', want: null },
  ];
  for (const c of cases) {
    await q17('reset_all');
    if (c.charter !== 'empty') {
      await api('PUT', '/charter', { business_name: 'T23 Co', business_goal: 'More leads', primary_conversion: { type: 'form', description: 'Contact form' }, autonomy_level: c.level });
      if (c.charter === 'approved') { await api('POST', '/charter/approve', { by: 'owner' }); }
    }
    const w = await world();
    const plan = await J(q('autopick_plan'));
    await q('cron');
    const running = await J(q('running'));
    const ledQ = (await J(q('ledger', '&kind=test_queued'))).filter((x) => x.proposed_by === 'engine:auto-pick');
    const ledS = await J(q('ledger', '&kind=test_started'));
    const label = `auto-pick at ${c.level}, ${c.charter} charter`;
    if (c.want) {
      const exp = w[c.want];
      const ev = ledQ[0] && JSON.parse(ledQ[0].evidence_json || '{}');
      check(`${label}: picks ${exp.name}, queues it as engine:auto-pick and starts it the same night`, running && running.id === exp.id && ledQ.length === 1 && ev.auto_pick === true && ev.payoff_score === exp.payoff_score && ledS.length === 1 && ledS[0].proposed_by === 'engine' && plan.would_pick === exp.id, [running, ledQ.length, plan]);
      const others = (await api('GET', '/suggestions')).body.suggestions;
      check(`${label}: the others stay suggested, untouched (${others.length} left)`, others.length === 5 && others.every((x) => x.status === 'suggested'));
      check(`${label}: the ledger row carries the gate verdict, the charter version and the skipped list`, ledQ[0].gate_verdict === 'pass' && (ev.skipped || []).length > 0, ev);
    } else {
      check(`${label}: picks nothing, queues nothing, writes no ledger row`, running === null && ledQ.length === 0 && ledS.length === 0 && plan.would_pick === null && (await api('GET', '/suggestions')).body.queue.length === 0, [running, plan]);
    }
  }
  // Other reasons for not picking
  await setup('tier1', true);
  let w = await world();
  let plan0 = await J(q('autopick_plan'));
  check('plan: skipped list names each reason (hold, no score, tier 2, unreachable traffic)', plan0.skipped.some((x) => x.id === w.s4.id && /hold/.test(x.reason)) && plan0.skipped.some((x) => x.id === w.s5.id && /no payoff score/.test(x.reason)) && plan0.skipped.some((x) => x.id === w.s3.id && /risk tier 2/.test(x.reason)) && plan0.skipped.some((x) => x.id === w.s6.id && /traffic gate/.test(x.reason)), plan0.skipped);
  check('GET /state reports the auto_pick plan (would_pick, reason)', (await api('GET', '/state')).body.auto_pick.would_pick === w.s2.id);
  await api('POST', `/suggestions/${w.s1.id}/queue`, {});
  check('a test already queued: nothing is picked', (await J(q('autopick_plan'))).would_pick === null && /already queued/.test((await J(q('autopick_plan'))).reason));
  await api('POST', `/suggestions/${w.s1.id}/unqueue`, {});
  await api('PUT', '/charter', { business_goal: 'A new goal' });
  check('a charter edited after the verdicts (status draft again): nothing is picked', (await J(q('autopick_plan'))).would_pick === null);
  await api('POST', '/charter/approve', { by: 'owner' });
  plan0 = await J(q('autopick_plan'));
  check('charter approved again but every verdict is older: nothing qualifies (verdicts must be against the current version)', plan0.would_pick === null && plan0.reason === 'No suggestion qualifies.' && plan0.skipped.some((x) => /older charter/.test(x.reason)), plan0);
  await api('POST', `/suggestions/${w.s2.id}/gate`, { verdict: 'pass', reasons: 'Still fine.', by: 'agent:judge' });
  check('re-judged against the new version: it qualifies again', (await J(q('autopick_plan'))).would_pick === w.s2.id);
  await api('PATCH', `/suggestions/${w.s2.id}`, { sessions_14d: 300, sessions_as_of: ymd(30) });
  plan0 = await J(q('autopick_plan'));
  check('a traffic count older than 21 days is not picked (out_of_date)', plan0.skipped.some((x) => x.id === w.s2.id && /out_of_date/.test(x.reason)) && plan0.would_pick !== w.s2.id, plan0.skipped);
  await q('start_direct', '&sessions=300&sel=.t23-running');
  check('a running test: nothing is picked', /running/.test((await J(q('autopick_plan'))).reason));
  // element held by a shipped winner
  await q17('reset_all');
  await api('PUT', '/charter', { business_name: 'T23 Co', business_goal: 'More leads', primary_conversion: { type: 'form', description: 'x' }, autonomy_level: 'tier1' }); await api('POST', '/charter/approve', { by: 'owner' });
  const held = await mk({ title: 'Held winner', target: '.t23-held', sessions_14d: 300 }, 'pass');
  await api('POST', `/tests/${held.id}/start`, { sessions_14d: 300 }); await api('POST', `/tests/${held.id}/conclude`, { verdict: 'ship_b' });
  const clash = await mk({ title: 'Clash', target: '.t23-held', payoff_score: 0.9, sessions_14d: 300 }, 'pass');
  const free = await mk({ title: 'Free', target: '.t23-free', payoff_score: 0.2, sessions_14d: 300 }, 'pass');
  plan0 = await J(q('autopick_plan'));
  check('an element held by a shipped winner is skipped; the next best is picked', plan0.would_pick === free.id && plan0.skipped.some((x) => x.id === clash.id && /held by another test/.test(x.reason)), plan0);
  // tier 3 never
  await api('POST', `/suggestions/${free.id}/gate`, { verdict: 'pass', reasons: 'x', by: 'agent:judge', risk_tier: 3 });
  check('a suggestion the judge raised to tier 3 is never auto-picked', (await J(q('autopick_plan'))).would_pick !== free.id);

  console.log('');
  const lint = await q17('lint');
  check('every php file in the plugin parses', /lint ok/.test(lint), lint);
  const log = await tool('log');
  check('debug log is empty', /no debug\.log/.test(log), log.slice(0, 600));
  process.exit(summary('t23 payoff, sorting, auto-pick') ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
