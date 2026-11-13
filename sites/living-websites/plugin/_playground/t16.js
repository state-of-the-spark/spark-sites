// t16 (0.2.0): suggested tests, the queue buttons, and the nightly auto-start.
// Run: node t16.js  (server from start.sh must be up)
const { chromium } = require('playwright-core');
const { BASE, UA, tool, run, admin, check, summary, cleanup } = require('./lib');

const SEL = 'a.et_pb_button[href="#contact"]';
const CSS = '@media (max-width:980px){.et_pb_section a.et_pb_button.et_pb_button_0{display:inline-block!important;position:absolute!important;top:33px;right:34px;z-index:6;margin:0!important;padding:6px 12px!important;font-size:13px!important;line-height:1.2!important;white-space:nowrap}.et_pb_section_0 .et_pb_column_1,.et_pb_section_0 .et_pb_button_0_wrapper{position:static!important}}';
const ymd = (daysAgo) => new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);
const q = (m, extra = '') => run('q16.php', `&m=${m}${extra}`);
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&middot;/g, '.').replace(/\s+/g, ' ');
const section = (html, id) => { const i = html.indexOf(`id="${id}"`); if (i < 0) return ''; const rest = html.slice(i + 10); const n = rest.search(/<h2 id="/); return n < 0 ? rest : rest.slice(0, n); };
const cards = (html, id) => { const s = section(html, id); return s.split('<article ').slice(1).map((c) => c.split('</article>')[0]); };

const sg = (over = {}) => ({
  title: 'Show the Get Started button on phones', hypothesis: 'Phone visitors have no button in the header today.',
  page: '/', device: 'mobile', element_type: 'selector', target: SEL,
  variants: { A: { label: 'Current' }, B: { label: 'Challenger', css: CSS } },
  change_type: 'visibility', a_label: 'No button in the header on phones', b_label: 'Get Started button shown in the header on phones',
  rationale: 'On phones the theme hides the header button.',
  evidence: [{ source: 'Page review, phone and desktop screenshots', detail: 'Header button is hidden at 980px and below', as_of: '2026-11-12' }, { source: 'Google Analytics', detail: '41 phone sessions on the homepage in 14 days', as_of: '2026-11-11' }],
  priority: 1, suggested_by: 'Lumen page review', sessions_14d: 41, sessions_as_of: ymd(2), ...over,
});
const runBody = (name) => ({ name, element_type: 'selector', target: '.hdr-run', hypothesis: 'h', tier: 1, start: true, sessions_14d: 300, variants: { A: { label: 'A' }, B: { label: 'B', changes: [{ op: 'text', value: 'Go' }] } } });

(async () => {
  const a = await admin();
  const page = async (path = '/living/', cookie = a.cookie()) => { const r = await fetch(BASE + path, { headers: { cookie }, redirect: 'manual' }); return { status: r.status, html: await r.text() }; };
  await cleanup(true); await q('reset');

  // ---------- create ----------
  let r = await a.api('POST', '/suggestions', sg());
  const s1 = r.body;
  check('create: 201 with status suggested', r.status === 201 && s1.status === 'suggested', r.body);
  check('create: not running, not queued, nothing started', (await q('running')) === '0' && !s1.start_date);
  check('create: the CSS variant passed the sanitiser unchanged', s1.variants.B.css === CSS, s1.variants.B.css);
  check('create: all fields stored', s1.page === '/' && s1.device === 'mobile' && s1.change_type === 'visibility' && s1.a_label === 'No button in the header on phones' && s1.b_label === 'Get Started button shown in the header on phones' && s1.rationale === 'On phones the theme hides the header button.' && s1.priority === 1 && s1.suggested_by === 'Lumen page review' && s1.sessions_14d === 41 && s1.sessions_as_of === ymd(2) && s1.evidence.length === 2 && s1.evidence[0].as_of === '2026-11-12', s1);
  check('create: suggested_at is set by the server', /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(s1.suggested_at));
  check('create: response carries traffic and gate (41 is below the minimum)', s1.traffic.meets_min === false && s1.traffic.fresh === true && s1.gate.ok === false && s1.gate.code === 'below_minimum', [s1.traffic, s1.gate]);

  // validation
  const bad = async (name, over, code) => { const x = await a.api('POST', '/suggestions', sg(over)); check('create refused: ' + name, x.status === 400 && (!code || x.body.code === code), [x.status, x.body.code]); };
  await bad('no title', { title: '' }, 'spark_living_name');
  await bad('no page', { page: '' }, 'spark_living_page');
  await bad('javascript: page', { page: 'javascript:alert(1)' }, 'spark_living_page');
  await bad('bad device', { device: 'tablet' }, 'spark_living_device');
  await bad('bad change_type', { change_type: 'banana' }, 'spark_living_change_type');
  await bad('no rationale', { rationale: '' }, 'spark_living_rationale');
  await bad('rationale over 600', { rationale: 'x'.repeat(601) }, 'spark_living_rationale_long');
  await bad('evidence item without a date', { evidence: [{ source: 's', detail: 'd' }] }, 'spark_living_evidence');
  await bad('evidence with an impossible date', { evidence: [{ source: 's', detail: 'd', as_of: '2026-02-30' }] }, 'spark_living_evidence');
  await bad('evidence not a list', { evidence: 'nope' }, 'spark_living_evidence');
  await bad('sessions_14d missing', { sessions_14d: undefined }, 'spark_living_sessions_invalid');
  await bad('sessions_14d negative', { sessions_14d: -3 }, 'spark_living_sessions_invalid');
  await bad('sessions_14d fractional', { sessions_14d: 12.5 }, 'spark_living_sessions_invalid');
  await bad('sessions_as_of missing', { sessions_as_of: '' }, 'spark_living_sessions_as_of');
  await bad('sessions_as_of in the future', { sessions_as_of: ymd(-30) }, 'spark_living_sessions_as_of');
  await bad('priority zero', { priority: 0 }, 'spark_living_priority');
  await bad('Tier 2', { tier: 2 }, 'spark_living_tier2');
  await bad('no valid change in B', { variants: { A: { label: 'A' }, B: { label: 'B' } } }, 'spark_living_changes');
  await bad('invalid selector', { target: 'a{}' }, 'spark_living_selector');
  let list = (await a.api('GET', '/suggestions')).body;
  check('refusals left no stray tests behind', list.suggestions.length === 1 && list.queue.length === 0, list.suggestions.map((x) => x.id));
  r = await a.api('POST', '/suggestions', sg({ title: 'Max', rationale: 'x'.repeat(600) }));
  check('rationale of exactly 600 characters is accepted', r.status === 201 && r.body.rationale.length === 600);
  await a.api('POST', `/suggestions/${r.body.id}/dismiss`);
  r = await a.api('POST', '/suggestions', sg({ title: 'Page by id', page: '46', priority: undefined }));
  check('page may be a post ID; priority defaults to last place', r.status === 201 && r.body.page === '46' && r.body.priority === 2, [r.body.page, r.body.priority]);
  const sId = r.body.id; await a.api('POST', `/suggestions/${sId}/dismiss`);

  // ---------- sanitising and escaping ----------
  r = await a.api('POST', '/suggestions', sg({
    title: 'Hostile <b>bold</b> <script>alert(1)</script>title', hypothesis: 'h <img src=x onerror=alert(5)>',
    rationale: 'why <script>alert(2)</script> <i>x</i> "quoted" & more',
    a_label: 'x" onmouseover="alert(3)', b_label: '<b>bold</b> label',
    suggested_by: '<script>alert(4)</script>Bot', priority: 5,
    evidence: [{ source: '<b>Src</b> <script>alert(6)</script>', detail: 'det <u>ail</u> "q"', as_of: '2026-11-10' }],
    variants: { A: { label: 'A' }, B: { label: 'B', css: CSS + ' </style><script>alert(7)</script> @import url(//evil.test/x.css);' } },
  }));
  const hostile = r.body;
  check('hostile text: stored without tags or script bodies', r.status === 201 && hostile.name === 'Hostile bold title' && !/[<>]/.test(hostile.rationale + hostile.b_label + hostile.suggested_by + hostile.evidence[0].source + hostile.evidence[0].detail) && !/alert\(2\)|alert\(4\)|alert\(6\)/.test(JSON.stringify([hostile.rationale, hostile.suggested_by, hostile.evidence])), hostile);
  check('hostile CSS: no angle bracket, @import or url( survives', !/[<\\]/.test(hostile.variants.B.css) && !/@\s*import|url\s*\(/i.test(hostile.variants.B.css), hostile.variants.B.css);
  let d = await page();
  const hz = cards(d.html, 'sl-suggested').find((c) => /Hostile bold title/.test(c)) || '';
  check('dashboard shows the sanitised card', hz !== '', cards(d.html, 'sl-suggested').length);
  check('no script, img or event-handler markup from any field reaches the page', !/<script[^>]*>[^<]*alert\(\d\)/.test(d.html) && !/<img src=x/.test(d.html) && !/<[^>]*\sonmouseover=/.test(d.html) && !/<b>(bold|Src)<\/b>/.test(d.html), (d.html.match(/.{40}alert\(\d\).{20}/) || [''])[0]);
  check('quotes in a label are escaped in the HTML', /onmouseover=&quot;alert\(3\)/.test(hz) || !/onmouseover/.test(hz) || /x&quot; onmouseover/.test(hz), hz.slice(0, 300));
  await a.api('POST', `/suggestions/${hostile.id}/dismiss`);

  // ---------- permissions ----------
  await q('mkuser', '&u=slsub&role=subscriber'); await q('mkuser', '&u=sledit&role=editor');
  const sub = await admin('slsub', 'password'), edit = await admin('sledit', 'password');
  for (const [who, u] of [['subscriber', sub], ['editor', edit]]) {
    const x = await u.api('GET', '/suggestions'), y = await u.api('POST', '/suggestions', sg()), z = await u.api('POST', `/suggestions/${s1.id}/queue`), w = await u.api('POST', `/suggestions/${s1.id}/dismiss`), v = await u.api('POST', `/suggestions/${s1.id}/unqueue`), st = await u.api('GET', '/state');
    check(`${who}: every suggestion route is refused (403)`, [x, y, z, w, v].every((o) => o.status === 403) && st.status === 403, [x.status, y.status, z.status, w.status, v.status]);
  }
  const anon = async (method, path, body) => { const res = await fetch(`${BASE}/index.php?rest_route=/spark-living/v1${path}`, { method, headers: { 'content-type': 'application/json', cookie: 'playground_auto_login_already_happened=1' }, body: body ? JSON.stringify(body) : undefined }); return res.status; };
  const an = [await anon('GET', '/suggestions'), await anon('POST', '/suggestions', sg()), await anon('POST', `/suggestions/${s1.id}/queue`), await anon('POST', `/suggestions/${s1.id}/dismiss`), await anon('GET', '/state')];
  check('logged out: 401 on every route', an.every((x) => x === 401), an);
  const noNonce = await fetch(`${BASE}/index.php?rest_route=/spark-living/v1/suggestions/${s1.id}/queue`, { method: 'POST', headers: { cookie: a.cookie(), 'content-type': 'application/json' }, body: '{}' });
  check('admin cookie without the REST nonce is refused (401 or 403)', [401, 403].includes(noNonce.status), noNonce.status);
  check('and it did not queue anything', (await a.api('GET', '/suggestions')).body.queue.length === 0);
  const sd = await page('/living/', sub.cookie());
  const ld = await fetch(BASE + '/living/', { redirect: 'manual', headers: { cookie: 'playground_auto_login_already_happened=1' } });
  check('dashboard stays 404 for a subscriber and for a logged-out visitor', sd.status === 404 && ld.status === 404 && !/Suggested tests/.test(sd.html) && !/Suggested tests/.test(await ld.text()), [sd.status, ld.status]);

  // ---------- list, ranks and the top-two rule ----------
  await q('reset');
  const mk = async (title, priority, sessions = 240, extra = {}) => (await a.api('POST', '/suggestions', sg({ title, priority, sessions_14d: sessions, ...extra }))).body;
  const p3 = await mk('Third', 3), p1 = await mk('First', 1), p4 = await mk('Fourth', 4), p2 = await mk('Second', 2);
  list = (await a.api('GET', '/suggestions')).body;
  check('GET /suggestions orders by priority (1 first)', list.suggestions.map((x) => x.name).join() === 'First,Second,Third,Fourth', list.suggestions.map((x) => x.name));
  d = await page();
  let cs = cards(d.html, 'sl-suggested');
  check('dashboard shows only the top two, in rank order', cs.length === 2 && /sl-sug-t-\d+">\s*<span class="sl-rank"[^>]*>1<\/span>.*First/.test(cs[0].replace(/\s+/g, ' ')) && /Second/.test(cs[1]) && !/Third|Fourth/.test(section(d.html, 'sl-suggested').replace(/<p class="sl-muted sl-plan-more">[\s\S]*$/, '')), cs.length);
  check('and a muted "2 more" line for the rest', /2 more suggested tests are waiting\./.test(text(section(d.html, 'sl-suggested'))));
  check('each card has real Queue and Dismiss buttons', cs.every((c) => /<button type="button" class="sl-btn sl-btn-primary" data-sl-act="queue">Queue this test<\/button>/.test(c) && /<button type="button" class="sl-btn" data-sl-act="dismiss">Dismiss<\/button>/.test(c)));
  await a.api('POST', `/suggestions/${p1.id}/dismiss`);
  d = await page(); cs = cards(d.html, 'sl-suggested');
  check('dismissing the first pulls the third into view; "1 more" (singular)', cs.length === 2 && /Second/.test(cs[0]) && /Third/.test(cs[1]) && /1 more suggested test is waiting\./.test(text(section(d.html, 'sl-suggested'))), cs.length);
  await a.api('POST', `/suggestions/${p4.id}/dismiss`);
  d = await page();
  check('with exactly two left there is no "more" line', cards(d.html, 'sl-suggested').length === 2 && !/more suggested/.test(d.html));

  // ---------- traffic line ----------
  const lowS = await mk('Low traffic', 6, 41, { sessions_as_of: '2026-11-11' }), okS = await mk('Enough traffic', 7, 137, { sessions_as_of: '2026-11-11' });
  await a.api('POST', `/suggestions/${p2.id}/dismiss`); await a.api('POST', `/suggestions/${p3.id}/dismiss`);
  d = await page(); cs = cards(d.html, 'sl-suggested');
  const lowCard = text(cs.find((c) => /Low traffic/.test(c))), okCard = text(cs.find((c) => /Enough traffic/.test(c)));
  check('under 100: "41 sessions in 14 days (measured Nov 11)" and the plain warning', /Traffic: 41 sessions in 14 days \(measured Nov 11\)\. Below the 100-session minimum; this would need a forced start\./.test(lowCard), lowCard);
  check('the warning is the muted-warning element', /<span class="sl-traffic-low">Below the 100-session minimum; this would need a forced start\.<\/span>/.test(cs.find((c) => /Low traffic/.test(c))));
  check('137: meets the minimum, no warning', /Traffic: 137 sessions in 14 days \(measured Nov 11\)\. Meets the 100-session minimum\./.test(okCard) && !/Below/.test(okCard), okCard);
  const stale = await mk('Stale traffic', 8, 500, { sessions_as_of: ymd(30) });
  await a.api('POST', `/suggestions/${lowS.id}/dismiss`);
  d = await page(); cs = cards(d.html, 'sl-suggested');
  check('an old count says it would not start on its own', /more than 21 days old/.test(text(cs.find((c) => /Stale traffic/.test(c)) || '')), text(cs[1] || ''));
  await a.api('POST', `/suggestions/${stale.id}/dismiss`);

  // ---------- card content ----------
  const full = await mk('Show the Get Started button on phones', 1, 41, { sessions_as_of: '2026-11-11' });
  await a.api('POST', `/suggestions/${okS.id}/dismiss`);
  d = await page(); const card = cards(d.html, 'sl-suggested')[0], ct = text(card);
  check('card: title, What would change (Visibility), Current and Challenger rows', /Show the Get Started button on phones/.test(ct) && /What would change: Visibility/.test(ct) && /Current variant A No button in the header on phones/.test(ct) && /Challenger variant B Get Started button shown in the header on phones/.test(ct), ct.slice(0, 500));
  check('card: Why shows the rationale', /Why: On phones the theme hides the header button\./.test(ct));
  check('card: Based on shows each source with its date and detail', /Based on:/.test(ct) && /Page review, phone and desktop screenshots Nov 12 Header button is hidden at 980px and below/.test(ct) && /Google Analytics Nov 11 41 phone sessions on the homepage in 14 days/.test(ct), ct);
  check('card: page and device are shown', /Homepage \(\/\)/.test(ct) && /Mobile only/.test(ct), ct.slice(0, 200));
  check('the not-instant line is on the page once, muted', (d.html.match(/Starts on the next nightly check after the current test ends\./g) || []).length === 1);

  // ---------- queue, unqueue, dismiss ----------
  const A1 = full, B1 = await mk('Queue B', 2, 300), C1 = await mk('Queue C', 3, 300);
  r = await a.api('POST', `/suggestions/${A1.id}/queue`);
  check('queue: 200, status queued, position 1', r.status === 200 && r.body.status === 'queued' && r.body.queue_position === 1, r.body);
  check('queueing with nothing running does not start it', (await q('running')) === '0' && r.body.start_date === '');
  r = await a.api('POST', `/suggestions/${B1.id}/queue`);
  check('second in line is position 2', r.body.queue_position === 2);
  check('queue twice: 409', (await a.api('POST', `/suggestions/${A1.id}/queue`)).status === 409);
  check('queue a missing test: 404', (await a.api('POST', '/suggestions/99999999/queue')).status === 404);
  d = await page();
  const up = cards(d.html, 'sl-upnext');
  check('Up next lists the two queued tests in order with their position', up.length === 2 && /Position 1 in the queue/.test(text(up[0])) && /Show the Get Started/.test(up[0]) && /Position 2 in the queue/.test(text(up[1])) && /Queue B/.test(up[1]), up.length);
  check('Up next cards have a Remove from queue button and no Queue button', up.every((c) => /data-sl-act="unqueue">Remove from queue<\/button>/.test(c) && !/data-sl-act="queue"/.test(c)));
  check('queued tests are gone from Suggested tests', !/Queue B/.test(section(d.html, 'sl-suggested')) && /Queue C/.test(section(d.html, 'sl-suggested')));
  check('the card in Up next explains the wait (head item is under the minimum)', /Waiting: traffic count is below the minimum/.test(text(up[0])) && !/Waiting/.test(text(up[1])), text(up[0]));
  let st = (await a.api('GET', '/state')).body;
  check('/state: suggestions and queue are present with positions, traffic and gate', Array.isArray(st.suggestions) && Array.isArray(st.queue) && st.queue.length === 2 && st.queue[0].id === A1.id && st.queue[1].queue_position === 2 && st.queue[0].gate.code === 'below_minimum' && st.queue[1].gate.ok === true && st.suggestions.length === 1 && st.suggestions[0].name === 'Queue C' && st.suggestions[0].traffic.sessions === 300, [st.suggestions.length, st.queue.length]);
  check('/state: the older draft list ("queued") is untouched and holds none of these', Array.isArray(st.queued) && !st.queued.some((x) => [A1.id, B1.id, C1.id].includes(x.id)), st.queued.map((x) => x.id));
  r = await a.api('POST', `/suggestions/${A1.id}/unqueue`);
  check('remove from queue: back to suggested, position cleared', r.status === 200 && r.body.status === 'suggested' && r.body.queue_position === 0 && r.body.priority === 1, r.body.status);
  list = (await a.api('GET', '/suggestions')).body;
  check('after removal it returns to its old rank (priority 1 is first again) and B is position 1', list.suggestions[0].id === A1.id && list.queue.length === 1 && list.queue[0].id === B1.id && list.queue[0].queue_position === 1, list.suggestions.map((x) => x.name));
  check('unqueue something not queued: 409', (await a.api('POST', `/suggestions/${A1.id}/unqueue`)).status === 409);
  r = await a.api('POST', `/suggestions/${B1.id}/dismiss`);
  check('dismiss a queued test: it leaves the queue and is kept as dismissed', r.status === 200 && r.body.status === 'dismissed' && (await a.api('GET', '/suggestions')).body.queue.length === 0);
  check('dismiss twice: 409', (await a.api('POST', `/suggestions/${B1.id}/dismiss`)).status === 409);
  check('a dismissed test cannot be queued: 409', (await a.api('POST', `/suggestions/${B1.id}/queue`)).status === 409);

  // ---------- auto-start gate ----------
  await q('reset'); await cleanup(true);
  const gateCase = async (name, sessions, daysOld, expectStart, extraAfter) => {
    await q('reset');
    const s = await mk('Gate ' + name, 1, sessions);
    await q('age', `&id=${s.id}&days=${daysOld}`);
    await a.api('POST', `/suggestions/${s.id}/queue`);
    const run1 = await q('cron');
    const e = JSON.parse(await q('get', `&id=${s.id}`));
    check(`gate ${name}: ${expectStart ? 'starts' : 'stays queued'}`, expectStart ? (run1 === String(s.id) && e.status === 'running') : (run1 === '0' && e.status === 'queued'), [run1, e.status]);
    return { s, e };
  };
  let g = await gateCase('100 sessions, fresh', 100, 1, true);
  check('started test records start_sessions_14d = stored count, not forced, a start date', g.e.start_sessions_14d === 100 && g.e.forced_start === false && /^\d{4}-/.test(g.e.start_date) && g.e.weights.A === 0.5, g.e);
  g = await gateCase('99 sessions', 99, 1, false);
  g = await gateCase('0 sessions', 0, 1, false);
  g = await gateCase('500 sessions, 22 days old', 500, 22, false);
  g = await gateCase('500 sessions, exactly 21 days old', 500, 21, true);
  g = await gateCase('99 sessions and 30 days old', 99, 30, false);
  st = (await a.api('GET', '/state')).body;
  await q('reset');
  const low = await mk('Why low', 1, 60), old = await mk('Why old', 2, 400);
  await q('age', `&id=${old.id}&days=40`);
  await a.api('POST', `/suggestions/${low.id}/queue`); await a.api('POST', `/suggestions/${old.id}/queue`);
  await q('cron');
  d = await page(); const w = cards(d.html, 'sl-upnext');
  check('dashboard says why a queued test waits: below the minimum', /Waiting: traffic count is below the minimum/.test(text(w[0])), text(w[0]));
  check('dashboard says why a queued test waits: out of date', /Waiting: traffic count is out of date/.test(text(w[1])), text(w[1]));
  check('head of the line is not skipped: the blocked head holds back the second even if it would pass', (await q('running')) === '0');
  // a fresh, big second item behind a blocked head
  await q('reset');
  const head = await mk('Head blocked', 1, 20), second = await mk('Second ready', 2, 900);
  await a.api('POST', `/suggestions/${head.id}/queue`); await a.api('POST', `/suggestions/${second.id}/queue`);
  check('strict order: second would pass but the blocked head is not skipped', (await q('cron')) === '0' && JSON.parse(await q('get', `&id=${second.id}`)).status === 'queued');
  await q('set', `&id=${head.id}&k=sessions_14d&v=150`);
  check('once the head passes the gate it starts, the second keeps waiting', (await q('cron')) === String(head.id) && JSON.parse(await q('get', `&id=${second.id}`)).status === 'queued');

  // ---------- one at a time, and conclusion hands over ----------
  check('queueing, unqueueing or dismissing a running test is refused (409)', [(await a.api('POST', `/suggestions/${head.id}/queue`)).status, (await a.api('POST', `/suggestions/${head.id}/unqueue`)).status, (await a.api('POST', `/suggestions/${head.id}/dismiss`)).status].every((x) => x === 409));
  const before = await q('digest', `&id=${head.id}`);
  r = await a.api('POST', '/suggestions', sg({ title: 'Brand new', priority: 9, sessions_14d: 800 }));
  await a.api('POST', `/suggestions/${r.body.id}/queue`);
  await a.api('POST', `/suggestions/${r.body.id}/unqueue`);
  await a.api('POST', `/suggestions/${second.id}/unqueue`); await a.api('POST', `/suggestions/${second.id}/queue`);
  await a.api('POST', `/suggestions/${r.body.id}/dismiss`);
  await q('cron');
  check('one at a time: cron with a test running starts nothing else', (await q('running')) === String(head.id) && JSON.parse(await q('get', `&id=${second.id}`)).status === 'queued');
  check('starting another test by hand while one runs: 409', (await a.api('POST', `/tests/${second.id}/start`, { sessions_14d: 900 })).status === 409);
  check('creating a started test while one runs: 409', (await a.api('POST', '/tests', runBody('Another'))).status === 409);
  check('suggest/queue/unqueue/dismiss never touched the running test (fields and event rows identical)', (await q('digest', `&id=${head.id}`)) === before, [before, await q('digest', `&id=${head.id}`)]);
  d = await page();
  check('Current test card still shows the running test', /Head blocked/.test(section(d.html, 'sl-current')));
  await a.api('POST', `/tests/${head.id}/conclude`, { verdict: 'no_difference', note: 'done' });
  check('after it concludes nothing starts until the nightly job', (await q('running')) === '0' && JSON.parse(await q('get', `&id=${second.id}`)).status === 'queued');
  check('nightly job after the conclusion starts the next queued test', (await q('cron')) === String(second.id));
  const e2 = JSON.parse(await q('get', `&id=${second.id}`));
  check('the auto-started test is running, not forced, with the stored count', e2.status === 'running' && e2.forced_start === false && e2.start_sessions_14d === 900, e2);
  check('the queue is now empty on the dashboard', /Nothing is queued\./.test(text(section((await page()).html, 'sl-upnext'))));
  // a forced start of a suggestion goes through the normal start rule
  await q('reset'); await cleanup(true);
  const f = await mk('Forced one', 1, 41);
  const fs1 = await a.api('POST', `/tests/${f.id}/start`, { sessions_14d: 41 });
  check('a suggestion below the minimum is refused a normal start (422)', fs1.status === 422);
  const fs2 = await a.api('POST', `/tests/${f.id}/start`, { force: true, sessions_14d: 41 });
  check('...and starts with force:true, recorded as forced', fs2.status === 200 && fs2.body.forced_start === true && fs2.body.start_sessions_14d === 41, fs2.body);
  await q('reset');

  // ---------- the buttons in a real browser ----------
  await cleanup(true);
  const bA = await mk('Browser A', 1, 41), bB = await mk('Browser B', 2, 300), bC = await mk('Browser C', 3, 300);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1366, height: 900 } });
  await ctx.addCookies([{ name: 'playground_auto_login_already_happened', value: '1', url: BASE }]);
  const p = await ctx.newPage();
  let dialogs = 0; p.on('dialog', async (dl) => { dialogs++; await dl.dismiss(); });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(BASE + '/wp-login.php'); await p.fill('#user_login', 'admin'); await p.fill('#user_pass', 'password'); await p.click('#wp-submit'); await p.waitForLoadState('networkidle');
  await p.goto(BASE + '/living/'); await p.waitForSelector('#sl-plan');
  const names = async (sel) => p.$$eval(`${sel} h3.sl-sug-title`, (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  check('browser: two suggestions shown', (await names('#sl-suggested ~ article, #sl-plan-body')).length >= 2 && (await p.$$('#sl-plan-body article')).length === 2);
  await p.evaluate(() => { window.__noReload = 1; });
  // keyboard: Tab to the first Queue button, focus ring visible, activate with Enter
  await p.focus('#sl-plan-body article:first-of-type [data-sl-act="queue"]');
  await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Tab');
  const focusInfo = await p.evaluate(() => { const e = document.activeElement; const cs = getComputedStyle(e); return { tag: e.tagName, act: e.getAttribute('data-sl-act'), outline: cs.outlineStyle + ' ' + cs.outlineWidth }; });
  check('browser: Queue is a real button, reachable by keyboard, with a visible focus outline', focusInfo.tag === 'BUTTON' && focusInfo.act === 'queue' && /solid 3px/.test(focusInfo.outline), focusInfo);
  // hold the request to see the in-flight state
  let release; const gate = new Promise((res) => { release = res; });
  await p.route('**/suggestions/*/queue*', async (route) => { await gate; await route.continue(); });
  await p.keyboard.press('Enter');
  await p.waitForTimeout(300);
  const inflight = await p.evaluate(() => ({ disabled: [...document.querySelectorAll('#sl-plan button[data-sl-act]')].every((b) => b.disabled), status: document.querySelector('.sl-plan-status').textContent }));
  check('browser: every button is disabled while the request is in flight, with a status message', inflight.disabled && /Working/.test(inflight.status), inflight);
  release(); await p.waitForFunction(() => /Queued\./.test(document.querySelector('.sl-plan-status').textContent), null, { timeout: 15000 });
  await p.unroute('**/suggestions/*/queue*');
  const upNames = await p.$$eval('#sl-upnext ~ article.sl-queued h3', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  check('browser: after Queue the card moved to Up next with its position, without a page reload', upNames.length === 1 && /Browser A/.test(upNames[0]) && (await p.evaluate(() => window.__noReload === 1)), upNames);
  check('browser: the third suggestion moved up into view', (await p.$$eval('#sl-suggested ~ article h3', (els) => els.map((e) => e.textContent))).some((t) => /Browser C/.test(t)));
  check('browser: the status message reads "Queued." and is a live region', await p.evaluate(() => { const s = document.querySelector('.sl-plan-status'); return /^Queued\./.test(s.textContent) && s.getAttribute('role') === 'status' && s.getAttribute('aria-live') === 'polite'; }));
  check('browser: the state really changed on the server', JSON.parse(await q('get', `&id=${bA.id}`)).status === 'queued' && (await q('running')) === '0');
  await p.click('#sl-upnext ~ article [data-sl-act="unqueue"]'); await p.waitForFunction(() => /Removed from the queue/.test(document.querySelector('.sl-plan-status').textContent));
  check('browser: Remove from queue returns it to Suggested tests', (await p.$$eval('#sl-upnext ~ article.sl-queued', (e) => e.length)) === 0 && JSON.parse(await q('get', `&id=${bA.id}`)).status === 'suggested');
  await p.click('#sl-plan-body article:first-of-type [data-sl-act="dismiss"]'); await p.waitForFunction(() => /Dismissed\./.test(document.querySelector('.sl-plan-status').textContent));
  check('browser: Dismiss removes the card and the record is marked dismissed', JSON.parse(await q('get', `&id=${bA.id}`)).status === 'dismissed');
  // error path: server says no
  await p.route('**/suggestions/*/dismiss*', (route) => route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ code: 'spark_living_state', message: 'That test is not in the right state for this action.' }) }));
  await p.click('#sl-plan-body article:first-of-type [data-sl-act="dismiss"]'); await p.waitForFunction(() => /not in the right state/.test(document.querySelector('.sl-plan-status').textContent));
  check('browser: an error is shown in the page and the buttons come back', await p.evaluate(() => [...document.querySelectorAll('#sl-plan button[data-sl-act]')].every((b) => !b.disabled)));
  check('browser: no alert, confirm or prompt dialog appeared, and no page errors', dialogs === 0 && errs.length === 0, [dialogs, errs]);
  await ctx.close();
  // the wp-admin page carries the same sections and works too
  const ad = await page('/wp-admin/admin.php?page=spark-living');
  check('wp-admin page has Up next, Suggested tests and the buttons', /id="sl-upnext"/.test(ad.html) && /id="sl-suggested"/.test(ad.html) && /data-sl-act="queue"/.test(ad.html), ad.status);
  check('wp-admin keeps the draft list under its new name, and the "Queued tests" name is gone', /Drafts and approvals/.test(ad.html) && !/>Queued tests</.test(ad.html));
  await browser.close();
  await q('reset');
  const tag = (await tool('log')).match(/PHP (Warning|Notice|Fatal|Deprecated)[^\n]*spark-living[^\n]*/g);
  check('PHP log has no warnings or notices from the plugin', !tag, tag);
  const ok = summary('t16 suggested tests and queue');
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
