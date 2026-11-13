// t13: eligibility at start. A test starts only with sessions_14d >= 100, or an explicit force:true
// from an administrator (recorded on the experiment). Run: node t13.js
const { chromium } = require('playwright-core');
const { BASE, UA, tool, run, admin, check, summary, cleanup } = require('./lib');

const body = (name, extra = {}) => ({ name, element_type: 'selector', target: '.zzz-elig', hypothesis: 'h', tier: 1, variants: { A: { label: 'A' }, B: { label: 'B', changes: [{ op: 'text', value: 'x' }] } }, ...extra });

(async () => {
  const a = await admin();
  await cleanup(true);
  await run('mkeditor.php');

  // ---- /tests/{id}/start ---------------------------------------------------------
  let r = await a.api('POST', '/tests', body('Elig draft'));
  check('a test without start:true is created as a draft', r.status === 201 && r.body.status === 'draft', r.status);
  const id = r.body.id;

  r = await a.api('POST', `/tests/${id}/start`);
  check('start without sessions_14d is refused with 400 and a clear reason', r.status === 400 && r.body.code === 'spark_living_eligibility_missing' && /sessions_14d/.test(r.body.message) && /100/.test(r.body.message), r.body);
  r = await a.api('POST', `/tests/${id}/start`, {});
  check('start with an empty body is refused too (400)', r.status === 400, r.status);
  r = await a.api('POST', `/tests/${id}/start`, { sessions_14d: 99 });
  check('99 sessions: refused with 422 and the reason names 99 and 100', r.status === 422 && r.body.code === 'spark_living_not_eligible' && /99/.test(r.body.message) && /100/.test(r.body.message), r.body);
  check('the refusal says how an administrator can override', /force:true/.test(r.body.message), r.body.message);
  let st = await a.api('GET', `/stats&experiment_id=${id}`);
  check('after refusals the test is still a draft', st.body.experiment.status === 'draft', st.body.experiment.status);

  r = await a.api('POST', `/tests/${id}/start`, { sessions_14d: 'abc' });
  check('sessions_14d "abc" is refused (400)', r.status === 400 && r.body.code === 'spark_living_sessions_invalid', r.body);
  r = await a.api('POST', `/tests/${id}/start`, { sessions_14d: -5 });
  check('sessions_14d -5 is refused (400)', r.status === 400, r.status);
  r = await a.api('POST', `/tests/${id}/start`, { sessions_14d: 120.5 });
  check('sessions_14d 120.5 is refused (400, whole numbers only)', r.status === 400, r.status);
  r = await a.api('POST', `/tests/${id}/start`, { sessions_14d: true });
  check('sessions_14d true is refused (400)', r.status === 400, r.status);

  r = await a.api('POST', `/tests/${id}/start`, { sessions_14d: 100 });
  check('exactly 100 sessions starts the test (200, running)', r.status === 200 && r.body.status === 'running', r.body);
  check('a normal start is not marked forced and records the number', r.body.forced_start === false && r.body.start_sessions_14d === 100, [r.body.forced_start, r.body.start_sessions_14d]);

  r = await a.api('POST', `/tests/${id}/start`, { sessions_14d: 500 });
  check('starting a running test is a 409 (state error comes before eligibility)', r.status === 409, r.status);
  r = await a.api('POST', `/tests/999999/start`, { sessions_14d: 500 });
  check('starting a missing test is a 404', r.status === 404, r.status);
  await a.api('POST', `/tests/${id}/conclude`, { verdict: 'no_difference', note: 'x' });

  // numeric string, device scoped
  r = await a.api('POST', '/tests', body('Elig mobile', { device: 'mobile' }));
  const idM = r.body.id;
  r = await a.api('POST', `/tests/${idM}/start`, { sessions_14d: 80 });
  check('mobile test: 80 sessions refused and the message names the device', r.status === 422 && /mobile/.test(r.body.message) && r.body.data.device === 'mobile', r.body);
  r = await a.api('POST', `/tests/${idM}/start`, { sessions_14d: '150' });
  check('mobile test: "150" (numeric string) starts', r.status === 200 && r.body.start_sessions_14d === 150 && r.body.forced_start === false, r.body);
  await a.api('POST', `/tests/${idM}/conclude`, { verdict: 'keep_a', note: 'x' });

  // ---- force ----------------------------------------------------------------------
  r = await a.api('POST', '/tests', body('Elig forced'));
  const idF = r.body.id;
  r = await a.api('POST', `/tests/${idF}/start`, { force: true });
  check('force:true with no number starts the test (administrator)', r.status === 200 && r.body.status === 'running', r.body);
  check('forced start is recorded on the experiment (forced_start true, sessions 0)', r.body.forced_start === true && r.body.start_sessions_14d === 0, [r.body.forced_start, r.body.start_sessions_14d]);
  st = await a.api('GET', `/stats&experiment_id=${idF}`);
  check('the record is visible through /stats too', st.body.experiment.forced_start === true, st.body.experiment.forced_start);
  const stt = await a.api('GET', '/state');
  check('/state exposes the forced flag on the running test and the 100 bar in the rules', stt.body.running.forced_start === true && stt.body.rules.eligibility_sessions_14d === 100, [stt.body.running.forced_start, stt.body.rules]);
  await a.api('POST', `/tests/${idF}/conclude`, { verdict: 'no_difference', note: 'x' });

  r = await a.api('POST', '/tests', body('Elig forced 40'));
  const idF2 = r.body.id;
  r = await a.api('POST', `/tests/${idF2}/start`, { force: true, sessions_14d: 40 });
  check('force with 40 sessions: started, forced, number recorded', r.status === 200 && r.body.forced_start === true && r.body.start_sessions_14d === 40, r.body);
  await a.api('POST', `/tests/${idF2}/conclude`, { verdict: 'no_difference', note: 'x' });

  r = await a.api('POST', '/tests', body('Elig force not needed'));
  const idF3 = r.body.id;
  r = await a.api('POST', `/tests/${idF3}/start`, { force: true, sessions_14d: 150 });
  check('force with 150 sessions: not recorded as forced (the bar was met)', r.status === 200 && r.body.forced_start === false && r.body.start_sessions_14d === 150, r.body);
  await a.api('POST', `/tests/${idF3}/conclude`, { verdict: 'no_difference', note: 'x' });

  r = await a.api('POST', '/tests', body('Elig force string'));
  const idF4 = r.body.id;
  r = await a.api('POST', `/tests/${idF4}/start`, { force: 'false', sessions_14d: 10 });
  check('force:"false" (string) does not force', r.status === 422, r.status);
  await cleanup();

  // ---- non-administrator cannot force (or start at all) -----------------------------
  const ed = await admin('ed1', 'password');
  r = await ed.api('POST', `/tests/${idF4}/start`, { force: true });
  check('an editor cannot call start with force (403)', r.status === 403, [r.status, r.body && r.body.code]);
  st = await a.api('GET', `/stats&experiment_id=${idF4}`);
  check('the refused editor call left the test a draft', st.body.experiment.status === 'draft', st.body.experiment.status);

  // ---- POST /tests with start:true follows the same rule ----------------------------
  await cleanup();
  const countQueued = async () => (await a.api('GET', '/state')).body.queued.length;
  const q0 = await countQueued();
  r = await a.api('POST', '/tests', body('Create+start no sessions', { start: true }));
  check('create with start:true and no sessions_14d is refused (400)', r.status === 400 && r.body.code === 'spark_living_eligibility_missing', r.body);
  r = await a.api('POST', '/tests', body('Create+start low', { start: true, sessions_14d: 50 }));
  check('create with start:true and 50 sessions is refused (422)', r.status === 422, r.status);
  check('a refused create+start leaves no stray draft behind', (await countQueued()) === q0, [q0, await countQueued()]);
  r = await a.api('POST', '/tests', body('Create+start ok', { start: true, sessions_14d: 100 }));
  check('create with start:true and 100 sessions starts (201, running)', r.status === 201 && r.body.status === 'running' && r.body.forced_start === false, r.body);
  await cleanup();
  r = await a.api('POST', '/tests', body('Create+start forced', { start: true, force: true }));
  check('create with start:true and force:true starts and records it', r.status === 201 && r.body.status === 'running' && r.body.forced_start === true, r.body);
  const idCF = r.body.id;
  await cleanup();

  // Tier 2 follows the same rule at approval time.
  r = await a.api('POST', '/tests', body('Tier 2 offer', { tier: 2 }));
  const idT2 = r.body.id;
  check('tier 2 test waits for approval', r.body.status === 'awaiting_approval', r.body.status);
  r = await a.api('POST', `/tests/${idT2}/start`, {});
  check('tier 2 approval/start without sessions is refused (400)', r.status === 400, r.status);
  r = await a.api('POST', `/tests/${idT2}/start`, { sessions_14d: 130 });
  check('tier 2 approval/start with 130 sessions works', r.status === 200 && r.body.status === 'running', r.body);
  await cleanup();

  // ---- dashboard: wp-admin form and the "below the bar" note -----------------------------
  r = await a.api('POST', '/tests', body('Admin form test', { device: 'mobile' }));
  const idA = r.body.id;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 900 } });
  await ctx.addCookies([{ name: 'playground_auto_login_already_happened', value: '1', url: BASE }]);
  const p = await ctx.newPage();
  await p.goto(BASE + '/wp-login.php'); await p.fill('#user_login', 'admin'); await p.fill('#user_pass', 'password'); await p.click('#wp-submit'); await p.waitForLoadState('networkidle');
  await p.goto(BASE + '/wp-admin/admin.php?page=spark-living');
  const row = p.locator('li', { hasText: 'Admin form test' }).first();
  await row.locator('button:has-text("Start")').click(); await p.waitForLoadState('networkidle');
  let txt = await p.textContent('body');
  check('wp-admin Start with no number: refused with a clear notice', /Not started: the target page needs at least 100 sessions/.test(txt), txt.slice(0, 200));
  st = await a.api('GET', `/stats&experiment_id=${idA}`);
  check('wp-admin refusal left the test a draft', st.body.experiment.status === 'draft');
  await p.locator('li', { hasText: 'Admin form test' }).first().locator('input[name="sessions_14d"]').fill('60');
  await p.locator('li', { hasText: 'Admin form test' }).first().locator('input[name="force"]').check();
  await p.locator('li', { hasText: 'Admin form test' }).first().locator('button:has-text("Start")').click(); await p.waitForLoadState('networkidle');
  txt = await p.textContent('body');
  check('wp-admin Start anyway with 60 sessions: the test is running', /Test started\./.test(txt), txt.slice(0, 200));
  check('dashboard shows "Started below the 100-session bar (60 sessions in the last 14 days)"', /Started below the 100-session bar \(60 sessions in the last 14 days\)\./.test(txt), txt.slice(0, 300));
  check('dashboard shows the device scope of the running test', /Mobile only \(viewport 980px or narrower\)\./.test(txt));
  st = await a.api('GET', `/stats&experiment_id=${idA}`);
  check('the admin-form start is recorded on the experiment', st.body.experiment.forced_start === true && st.body.experiment.start_sessions_14d === 60, [st.body.experiment.forced_start, st.body.experiment.start_sessions_14d]);
  // After it concludes, the history still carries the note.
  await a.api('POST', `/tests/${idA}/conclude`, { verdict: 'no_difference', note: 'admin form test' });
  const hist = await (await fetch(BASE + '/living/', { headers: { cookie: a.cookie() } })).text();
  check('/living/ test history keeps the "below the bar" note for a concluded forced test', /Started below the 100-session bar \(60 sessions/.test(hist));
  const lg0 = await a.api('GET', '/log&per_page=5');
  check('the evolution log entry carries forced_start and device', lg0.body.some((x) => x.experiment_id === idA && x.forced_start === true && x.device === 'mobile'), lg0.body.slice(0, 2));
  await browser.close();
  await cleanup();

  const lg = await tool('log');
  check('debug log is empty', /\(no debug\.log\)/.test(lg) || lg.trim() === '', lg.slice(0, 300));
  process.exit(summary('t13 eligibility at start') ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
