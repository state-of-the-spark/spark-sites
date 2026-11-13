// t12: dashboard count fix. "Evolved" counts only tests that shipped a winning challenger;
// original-won, no-difference, guard-blocked and reverted are shown separately. Run: node t12.js
const { BASE, tool, run, admin, check, summary, cleanup } = require('./lib');

const TALLY_RE = (k) => new RegExp(`data-sl-tally="${k}"><strong>([\\d,]+)</strong>`);
async function page(a, path) { return (await fetch(BASE + path, { headers: { cookie: a.cookie() } })).text(); }
function readTally(html) {
  const n = (k) => { const m = html.match(TALLY_RE(k)); return m ? parseInt(m[1].replace(/,/g, ''), 10) : null; };
  const sentence = (html.match(/has evolved ([\d,]+) times?\./) || [])[1];
  return { evolved: n('evolved'), keep_a: n('keep_a'), no_difference: n('no_difference'), guard_blocked: n('guard_blocked'), reverted: n('reverted'), sentence: sentence ? parseInt(sentence.replace(/,/g, ''), 10) : null };
}

(async () => {
  const a = await admin();
  await cleanup(true);

  async function runTest(name, verdict) {
    await cleanup();
    const r = await a.api('POST', '/tests', { name, element_type: 'selector', target: '.zzz-tally', tier: 1, start: true, sessions_14d: 300, variants: { B: { label: 'B', changes: [{ op: 'text', value: 'x' }] } } });
    if (r.status !== 201) return r;
    return a.api('POST', `/tests/${r.body.id}/conclude`, { verdict, note: 'tally test' });
  }

  const s0 = (await a.api('GET', '/state')).body;
  const h0 = await page(a, '/living/');
  const t0 = readTally(h0);
  check('before: /living/ sentence equals the evolved tile', t0.sentence === t0.evolved && t0.evolved !== null, t0);
  check('before: /state tally matches the rendered tiles', s0.tally.evolved === t0.evolved && s0.tally.keep_a === t0.keep_a && s0.tally.no_difference === t0.no_difference, [s0.tally, t0]);

  const results = [];
  results.push(await runTest('Tally ship', 'ship_b'));
  results.push(await runTest('Tally keep A one', 'keep_a'));
  results.push(await runTest('Tally keep A two', 'keep_a'));
  results.push(await runTest('Tally no diff one', 'no_difference'));
  results.push(await runTest('Tally no diff two', 'no_difference'));
  results.push(await runTest('Tally no diff three', 'no_difference'));
  check('six tests were run and concluded', results.every((x) => x.status === 200), results.map((x) => x.status));
  await run('mklog.php', '&kind=guard');
  await run('mklog.php', '&kind=revert');

  const s1 = (await a.api('GET', '/state')).body;
  const h1 = await page(a, '/living/');
  const t1 = readTally(h1);
  const d = (k) => (t1[k] || 0) - (t0[k] || 0);
  check('evolved went up by exactly 1 (only the shipped test)', d('evolved') === 1, [t0, t1]);
  check('original-won went up by exactly 2', d('keep_a') === 2, [t0, t1]);
  check('no-difference went up by exactly 3', d('no_difference') === 3, [t0, t1]);
  check('guard-blocked is shown separately (+1)', d('guard_blocked') === 1, [t0, t1]);
  check('a revert entry is shown separately and does NOT count as evolved (+1 reverted, evolved unchanged by it)', d('reverted') === 1 && d('evolved') === 1, [t0, t1]);
  check('"has evolved N times" uses the evolved count, not every concluded test', t1.sentence === t1.evolved && t1.evolved === t0.evolved + 1, t1);
  const log = await a.api('GET', '/log&per_page=1');
  const totalLog = parseInt(log.headers.get('x-wp-total'), 10);
  check('the old figure (every log entry) is larger than the evolved figure', totalLog > t1.evolved, [totalLog, t1.evolved]);
  check('/state tally matches the dashboard and /state.evolutions is the evolved count', s1.tally.evolved === t1.evolved && s1.tally.keep_a === t1.keep_a && s1.tally.no_difference === t1.no_difference && s1.evolutions === s1.tally.evolved, [s1.evolutions, s1.tally]);
  check('the explanatory line says what "evolved" means', /Evolved means a challenger won and shipped/.test(h1));
  check('history section lists every concluded test, whatever the outcome (Original won, No difference)', /Current version won/.test(h1) && /No difference; kept current/.test(h1));

  const admHtml = await page(a, '/wp-admin/admin.php?page=spark-living');
  const ta = readTally(admHtml);
  check('wp-admin page shows the same tally', ta.evolved === t1.evolved && ta.keep_a === t1.keep_a && ta.no_difference === t1.no_difference, [ta, t1]);

  await cleanup();
  const lg = await tool('log');
  check('debug log is empty', /\(no debug\.log\)/.test(lg) || lg.trim() === '', lg.slice(0, 300));
  process.exit(summary('t12 dashboard tally') ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
