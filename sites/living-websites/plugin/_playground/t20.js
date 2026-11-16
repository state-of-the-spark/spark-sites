// t20 (0.3.0): slower weight shifting, driven through the real nightly job, plus the ledger rows and undo for weights.
// Run: node t20.js
const { admin, run, check, summary } = require('./lib');
const q = (m, extra = '') => run('q17.php', `&m=${m}${extra}`);

(async () => {
  const a = await admin();
  const api = (m, p, b) => a.api(m, p.replace('?', '&'), b);
  await q('reset_all');
  await q('upgrade');

  const t = (await api('POST', '/tests', { name: 'Weight floor test', element_type: 'selector', target: '.t20', hypothesis: 'h', tier: 1, start: true, sessions_14d: 300, variants: { A: { label: 'A' }, B: { label: 'B', changes: [{ op: 'text', value: 'Go' }] } } })).body;
  const rows = async (kind = 'weights_changed') => (await api('GET', `/changes?subject_id=${t.id}&kind=${kind}`)).body;
  const weights = async () => JSON.parse(await q('cron')); // runs the nightly job and returns the stored weights
  check('rule default: 30, shown in /state', (await api('GET', '/state')).body.rules.min_exposures_before_shift === 30);

  // The live situation: 26 visits, B ahead, split already at 80/20. Next nightly run must put it back and say why.
  await q('seed_counts', `&id=${t.id}&na=12&nb=14`);
  await q('set_weights', `&id=${t.id}&wa=0.8&wb=0.2`);
  let w = await weights();
  check('26 visits (12 and 14), split at 80/20, below the floor of 30: nightly job puts it back to 50/50', w.A === 0.5 && w.B === 0.5, w);
  let wr = await rows();
  check('...and records a weights_changed row saying why (before 80/20, after 50/50, counts, floor)', wr.length === 1 && wr[0].before_json.A === 0.8 && wr[0].after_json.A === 0.5 && wr[0].proposed_by === 'engine' && /put back from 80\/20 to 50\/50/.test(wr[0].summary) && /each version needs 30/.test(wr[0].summary) && wr[0].evidence_json.reason === 'below_exposure_floor' && wr[0].evidence_json.exposures.A === 12 && wr[0].evidence_json.exposures.B === 14 && wr[0].evidence_json.min_exposures_before_shift === 30, wr);

  // Run again below the floor: already 50/50, nothing to record
  w = await weights();
  wr = await rows();
  check('a second run below the floor leaves 50/50 and writes no new row', w.A === 0.5 && wr.length === 1, [w, wr.length]);

  // One version at 29, the other well above: still held
  await q('seed_counts', `&id=${t.id}&na=29&nb=60`);
  w = await weights();
  check('29 and 60 exposures: still 50/50 although B is far ahead', w.A === 0.5 && w.B === 0.5, w);

  // Both at the floor: the split may move
  await q('seed_counts', `&id=${t.id}&na=30&nb=30`);
  w = await weights();
  wr = await rows();
  check('30 and 30 exposures with B clearly ahead: the split moves (B gets the larger share)', w.B > 0.5 && w.A < 0.5, w);
  check('...and that move is recorded with the counts that caused it and a restore-weights undo', wr.length === 2 && wr[0].before_json.A === 0.5 && wr[0].evidence_json.reason === 'evidence' && wr[0].evidence_json.exposures.A === 30 && wr[0].undo_json.action === 'restore_weights' && /moved from 50\/50/.test(wr[0].summary), wr[0]);

  // Undo that move
  const moved = wr[0];
  const u = await api('POST', `/changes/${moved.id}/undo`, { by: 'owner' });
  const st = (await api('GET', '/state')).body.running;
  check('undo of a weights change: weights back to 50/50, new weights_changed row, original marked undone', u.status === 200 && u.body.kind === 'weights_changed' && st.weights.A === 0.5 && (await rows()).find((x) => x.id === moved.id).status === 'undone', [u.status, st && st.weights]);

  // Raising the floor in the setting holds the same test again
  await q('seed_counts', `&id=${t.id}&na=40&nb=40`);
  w = await weights();
  check('40 and 40, floor 30: moves', w.B > 0.5, w);
  await q('settings', '&v=50');
  check('/state shows the changed setting', (await api('GET', '/state')).body.rules.min_exposures_before_shift === 50);
  w = await weights();
  check('floor raised to 50 in the plugin setting: the next nightly run puts 40 and 40 back to 50/50', w.A === 0.5 && w.B === 0.5, w);
  await q('settings', '&v=0');
  w = await weights();
  check('floor 0: the rule is off, the split follows the evidence', w.B > 0.5, w);
  await q('settings', '&v=30');

  // The nightly job never concludes or changes anything else when held
  const e = (await api('GET', '/state')).body.running;
  check('the test is still running with its start time untouched', e && e.id === t.id && e.status === 'running' && e.forced_start === false, e && e.status);

  // Weights row with the evidence is in the dashboard change log
  const html = await (await fetch(require('./lib').BASE + '/living/', { headers: { cookie: a.cookie() } })).text();
  check('the change log on /living/ shows the weights rows in plain words', /Traffic split changed/.test(html) && /put back from 80\/20 to 50\/50/.test(html));

  await q('reset_all');
  process.exit(summary('t20 slower weight shifting') ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
