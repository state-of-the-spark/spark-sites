// t15 (0.1.4): the "Data sources" chip row above the live numbers, and the Current versus Challenger
// comparison in the "Current test" card. Run: node t15.js  (server from start.sh must be up)
const { chromium } = require('playwright-core');
const { BASE, UA, tool, run, admin, check, summary, cleanup } = require('./lib');

const SEL = 'header.sl-hdr a.et_pb_button[href="#contact"]';
const sources = (q) => run('mksrc.php', '&' + q);
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ');
const chip = (html, id) => { const m = html.match(new RegExp(`<li class="sl-src[^"]*" data-sl-source="${id}" data-sl-status="(\\w+)">([\\s\\S]*?)</li>`)); return m ? { status: m[1], html: m[2], text: text(m[2]).trim() } : null; };
const compare = (html) => { const m = html.match(/<p class="sl-cmp-type">[\s\S]*?<\/dl>/); return m ? { html: m[0], text: text(m[0]).trim() } : null; };
const sql = async (q) => { const t = await tool('sql', '&q=' + encodeURIComponent(q)); try { return JSON.parse(t.slice(0, t.lastIndexOf(']') + 1)); } catch { return []; } };
const body = (name, extra = {}) => ({ name, element_type: 'selector', target: SEL, hypothesis: 'Hyp', tier: 1, start: true, sessions_14d: 300, variants: { A: { label: 'A' }, B: { label: 'B', changes: [{ op: 'text', value: 'Get My Free Website Plan' }] } }, ...extra });

(async () => {
  const a = await admin();
  const page = async (path = '/living/') => (await fetch(BASE + path, { headers: { cookie: a.cookie() } })).text();
  await cleanup(true);
  await sources('m=install'); await sources('m=ga&v=0'); await sources('m=extra&v=0'); await sources('m=icon&v=0');

  // ---------- Part 1: no running test ----------
  let h = await page();
  let site = chip(h, 'site-visit-log'), ga = chip(h, 'google-analytics');
  check('no test: the Data sources heading is present', /<h3 id="sl-sources-h">Data sources<\/h3>/.test(h));
  check('no test: Site visit log chip is Paused (word and status attribute)', site && site.status === 'paused' && /Paused/.test(site.text) && !/Live/.test(site.text), site);
  check('no test: Google Analytics chip is Paused', ga && ga.status === 'paused' && /Paused/.test(ga.text), ga);
  check('no test: the log chip says what it supplies', site && /Views, clicks and form submissions for the test/.test(site.text), site);
  check('no test: the log chip says no test is running and no events yet', site && /No test is running\. No events yet/.test(site.text), site);
  check('no test: Analytics says Traffic check before a test starts and "Not connected" with no parenthesis', ga && /Traffic check before a test starts/.test(ga.text) && /Not connected\. Traffic count entered by hand when the test started$/.test(ga.text), ga);
  check('no test: the section sits under the Current test heading', h.indexOf('id="sl-current"') < h.indexOf('class="sl-sources"'));

  // ---------- running test ----------
  let r = await a.api('POST', '/tests', body('Header button wording'));
  check('running text-swap test created (201, running)', r.status === 201 && r.body.status === 'running', r.body);
  const id = r.body.id;
  h = await page();
  site = chip(h, 'site-visit-log'); ga = chip(h, 'google-analytics');
  check('running: Site visit log is Live (word, status attribute, live class)', site && site.status === 'live' && /Live/.test(site.text) && !/Paused/.test(site.text) && /class="sl-src sl-src-live"/.test(h), site);
  check('running, no events: detail reads "No events yet"', site && /No events yet/.test(site.text), site);
  check('running: Analytics still Paused (no connection)', ga && ga.status === 'paused' && /Paused/.test(ga.text), ga);
  check('running: Analytics detail carries the stored 14-day count', ga && /Not connected\. Traffic count entered by hand when the test started \(300 sessions\)/.test(ga.text), ga);
  const iSrc = h.indexOf('class="sl-sources"'), iTab = h.indexOf('<caption>Live numbers'), iCard = h.indexOf('class="sl-card"');
  check('running: order is card, Data sources, then the Live numbers table', iCard > 0 && iCard < iSrc && iSrc < iTab, [iCard, iSrc, iTab]);
  check('Data sources markup has the dot with the word next to it and no colour-only status', /<span class="sl-src-state"><span class="sl-dot" aria-hidden="true"><\/span>(Live|Paused)<\/span>/.test(h));

  await sources(`m=seed&exp=${id}&age=180&type=exposure&variant=A`);
  h = await page(); site = chip(h, 'site-visit-log');
  check('running with an event: "Last event: 3 minutes ago"', site && /Last event: 3 minutes ago/.test(site.text), site);

  // icons
  check('no site icon: the log chip uses the inline fallback svg (no image request)', site && /<svg/.test(site.html) && !/<img/.test(site.html), site && site.html);
  check('Analytics icon is inline svg with orange/yellow bars and no external request', ga && (ga.html.match(/<rect /g) || []).length === 3 && /F9AB00/i.test(ga.html) && /E37400/i.test(ga.html) && !/<img/.test(ga.html) && !/https?:/.test(ga.html.replace(/xmlns="[^"]*"/, '')), ga && ga.html);
  const ic = await sources('m=icon&v=1');
  h = await page(); site = chip(h, 'site-visit-log');
  check('with a site icon: the log chip shows it as an image sized 16', site && /<img src="[^"]*sl-test-icon[^"]*" alt="" width="16" height="16"/.test(site.html), [ic, site && site.html]);
  await sources('m=icon&v=0');

  // connection filter
  await sources('m=ga&v=1');
  h = await page(); ga = chip(h, 'google-analytics');
  check('GA connection filter true: Analytics is Live with the connected detail', ga && ga.status === 'live' && /Live/.test(ga.text) && /Connected\. Analytics is read directly/.test(ga.text) && !/Not connected/.test(ga.text), ga);
  let st = (await a.api('GET', '/state')).body;
  check('/state shows Analytics live when connected', st.sources.find((s) => s.id === 'google-analytics').live === true);
  await sources('m=ga&v=0');
  h = await page(); ga = chip(h, 'google-analytics');
  check('GA connection filter false again: Paused', ga && ga.status === 'paused');

  // registry filter + escaping of a hostile source
  await sources('m=extra&v=1');
  h = await page();
  const extra = chip(h, 'crm-sheet');
  check('a source added through the filter renders; a bad status becomes Paused', extra && extra.status === 'paused' && /Paused/.test(extra.text), extra);
  check('hostile source name, detail and svg are escaped or stripped (no script, no raw tag)', !/<script>alert/.test(h.replace(/<script id=[\s\S]*?<\/script>/g, '')) && !/alert\(2\)/.test(h) && /Lead sheet\s*(?:alert\(1\)\s*)?&amp; co/.test(h) && !/<b>today<\/b>/.test(h), (h.match(/Lead sheet[^<]*/) || [''])[0]);
  st = (await a.api('GET', '/state')).body;
  check('/state lists three sources with the filter on', st.sources.length === 3 && st.sources[2].id === 'crm-sheet' && st.sources[2].live === false, st.sources.map((s) => s.id));
  await sources('m=extra&v=0');

  // ---------- /state sources ----------
  st = (await a.api('GET', '/state')).body;
  const sl = st.sources.find((s) => s.id === 'site-visit-log'), sg = st.sources.find((s) => s.id === 'google-analytics');
  check('/state has a sources key with exactly the two shipped sources', Array.isArray(st.sources) && st.sources.length === 2 && sl && sg, st.sources);
  check('/state: log source live, with name, what, status, detail and icon type', sl.status === 'live' && sl.live === true && sl.name === 'Site visit log' && /Last event/.test(sl.detail) && sl.what.length > 0 && sl.icon.type === 'svg', sl);
  check('/state: Analytics paused with the hand-entered count', sg.status === 'paused' && sg.live === false && /\(300 sessions\)/.test(sg.detail), sg);

  // ---------- Part 2: comparison, defaults ----------
  h = await page(); let cmp = compare(h);
  check('text swap default: "What is being tested: Wording"', cmp && /What is being tested: Wording/.test(cmp.text), cmp && cmp.text);
  check('text swap default: Current is "Original text (unchanged)" (original not stored)', cmp && /Current variant A Original text \(unchanged\)/.test(cmp.text), cmp && cmp.text);
  check('text swap default: Challenger is the replacement text in quotes', cmp && /Challenger variant B “Get My Free Website Plan”/.test(cmp.text), cmp && cmp.text);
  check('button target: the challenger text is a pill', cmp && /<span class="sl-pill">“Get My Free Website Plan”<\/span>/.test(cmp.html), cmp && cmp.html);
  check('the selector stays in the card, secondary', /class="sl-muted sl-sel">\(a\.et_pb_button\[href=&quot;#contact&quot;\]\)/.test(h) || /class="sl-muted sl-sel">\(header\.sl-hdr a\.et_pb_button/.test(h), (h.match(/sl-sel">[^<]*/) || [''])[0]);

  // label edit on the running test changes nothing but the label
  await sources(`m=seed&exp=${id}&age=60&type=exposure&variant=B&n=2`);
  await sources(`m=seed&exp=${id}&age=60&type=cta_click&variant=A`);
  const fieldsOf = (e) => JSON.stringify({ status: e.status, start_date: e.start_date, weights: e.weights, variants: e.variants, target: e.target, device: e.device, tier: e.tier, forced_start: e.forced_start, start_sessions_14d: e.start_sessions_14d, element_type: e.element_type, hypothesis: e.hypothesis, name: e.name });
  const before = (await a.api('GET', `/stats&experiment_id=${id}`)).body;
  const rowsBefore = await sql(`SELECT id, experiment_id, variant, visitor_id, session_id, event_type, created_at FROM wp_spark_living_events ORDER BY id`);
  r = await a.api('POST', `/tests/${id}`, { a_label: 'Get started' });
  check('POST /tests/{id} with a_label on the running test returns 200', r.status === 200 && r.body.a_label === 'Get started', r.body);
  const after = (await a.api('GET', `/stats&experiment_id=${id}`)).body;
  const rowsAfter = await sql(`SELECT id, experiment_id, variant, visitor_id, session_id, event_type, created_at FROM wp_spark_living_events ORDER BY id`);
  check('label edit: status, start time, weights, variants and the other fields are identical', fieldsOf(before.experiment) === fieldsOf(after.experiment), [fieldsOf(before.experiment), fieldsOf(after.experiment)]);
  check('label edit: the counts and rates are identical', JSON.stringify(before.stats.counts) === JSON.stringify(after.stats.counts) && JSON.stringify(before.stats.rates) === JSON.stringify(after.stats.rates), [before.stats.counts, after.stats.counts]);
  check('label edit: the event rows are byte-identical (nothing added, removed or changed)', JSON.stringify(rowsBefore) === JSON.stringify(rowsAfter) && rowsAfter.length > 0, [rowsBefore.length, rowsAfter.length]);
  check('label edit: the test is still running and the running id is unchanged', after.experiment.status === 'running' && (await a.api('GET', '/state')).body.running.id === id);
  h = await page(); cmp = compare(h);
  check('with a_label "Get started": Current reads the exact text in quotes', cmp && /Current variant A “Get started”/.test(cmp.text) && /<span class="sl-pill">“Get started”<\/span>/.test(cmp.html), cmp && cmp.text);
  check('with a_label: Challenger still reads "Get My Free Website Plan"', cmp && /Challenger variant B “Get My Free Website Plan”/.test(cmp.text), cmp && cmp.text);

  r = await a.api('POST', `/tests/${id}`, { b_label: 'Get My Free Website Plan (longer)', change_type: 'wording' });
  check('b_label and change_type edit work together', r.status === 200 && r.body.b_label === 'Get My Free Website Plan (longer)' && r.body.change_type === 'wording', r.body);
  h = await page(); cmp = compare(h);
  check('custom b_label replaces the replacement text', cmp && /Challenger variant B “Get My Free Website Plan \(longer\)”/.test(cmp.text), cmp && cmp.text);
  r = await a.api('POST', `/tests/${id}`, { b_label: '', a_label: '' });
  check('empty strings clear the labels (defaults come back)', r.status === 200 && r.body.a_label === '' && r.body.b_label === '' && r.body.comparison.current === 'Original text (unchanged)' && r.body.comparison.challenger === 'Get My Free Website Plan', r.body.comparison);
  r = await a.api('POST', `/tests/${id}`, { change_type: 'banana' });
  check('an unknown change_type is refused with 400 and stored nothing', r.status === 400 && r.body.code === 'spark_living_change_type', r.body);
  r = await a.api('POST', `/tests/${id}`, {});
  check('an empty update body is refused with 400', r.status === 400, r.body);
  r = await a.api('POST', `/tests/${id}`, { status: 'concluded', weights: { A: 0.9, B: 0.1 }, name: 'hijack', target: '.x', variants: {}, a_label: 'Ok' });
  const hijack = (await a.api('GET', `/stats&experiment_id=${id}`)).body.experiment;
  check('other fields sent to the update route are ignored (status, weights, name, target, variants)', r.status === 200 && hijack.status === 'running' && hijack.weights.A === 0.5 && hijack.name === 'Header button wording' && hijack.target === SEL && hijack.variants.B.changes.length === 1, hijack);
  await a.api('POST', `/tests/${id}`, { a_label: 'Get started' });
  st = (await a.api('GET', '/state')).body;
  check('/state running includes change_type, a_label, b_label', st.running.a_label === 'Get started' && 'change_type' in st.running && 'b_label' in st.running, st.running && [st.running.change_type, st.running.a_label, st.running.b_label]);

  // ---------- escaping and the 200 character cap ----------
  const long = 'x'.repeat(260);
  r = await a.api('POST', `/tests/${id}`, { a_label: long });
  check('a_label is capped at 200 characters', r.status === 200 && r.body.a_label.length === 200, r.body.a_label && r.body.a_label.length);
  await sources(`m=rawlabel&exp=${id}`);
  h = await page(); cmp = compare(h);
  check('a hostile stored label is cleaned and escaped on output (no raw tag, no handler)', cmp && !/<img/.test(cmp.html) && !/onerror/.test(cmp.html.replace(/&[a-z#0-9]+;/g, '')) , cmp && cmp.html);
  r = await a.api('POST', `/tests/${id}`, { a_label: `Say "hi" & <i>bye</i> <script>alert(9)</script>it's` });
  check('label input is sanitised on write (tags stripped)', r.status === 200 && !/[<>]/.test(r.body.a_label) && !/script|alert/.test(r.body.a_label), r.body.a_label);
  h = await page(); cmp = compare(h);
  check('quotes and ampersand in a label are escaped in the markup', cmp && /&amp;/.test(cmp.html) && /&quot;hi&quot;/.test(cmp.html) && !/<i>|<script/.test(cmp.html), cmp && cmp.html);
  const adminHtml = await page('/wp-admin/admin.php?page=spark-living');
  check('wp-admin page shows the sources and the comparison too', /class="sl-sources"/.test(adminHtml) && /class="sl-cmp-type"/.test(adminHtml));

  // ---------- other test types ----------
  await cleanup();
  r = await a.api('POST', '/tests', body('Style test', { target: '.zzz-style', variants: { A: { label: 'A' }, B: { label: 'B', css: '.zzz-style{background:#123}' } } }));
  h = await page(); cmp = compare(h);
  check('CSS variant default: Style, Original (no change), Restyled by the test', r.status === 201 && cmp && /What is being tested: Style/.test(cmp.text) && /Current variant A Original \(no change\)/.test(cmp.text) && /Challenger variant B Restyled by the test/.test(cmp.text) && !/sl-pill/.test(cmp.html), cmp && cmp.text);
  await cleanup();
  r = await a.api('POST', '/tests', body('Style labelled', { target: '.zzz-style', change_type: 'color', a_label: 'Green button', b_label: 'Blue button', variants: { A: { label: 'A' }, B: { label: 'B', changes: [{ op: 'style', value: 'background:#00f' }] } } }));
  h = await page(); cmp = compare(h);
  check('custom type and labels: Colour, plain text without quotes or pills', r.status === 201 && cmp && /What is being tested: Colour/.test(cmp.text) && /Current variant A Green button/.test(cmp.text) && /Challenger variant B Blue button/.test(cmp.text) && !/“/.test(cmp.text) && !/sl-pill/.test(cmp.html), cmp && cmp.text);
  await cleanup();
  r = await a.api('POST', '/tests', body('Placement', { target: '.zzz-place', change_type: 'placement', variants: { A: { label: 'A' }, B: { label: 'B', changes: [{ op: 'add_class', value: 'moved' }] } } }));
  h = await page(); cmp = compare(h);
  check('type with no labels and no css: "Original (no change)" and "Changed by the test"', cmp && /What is being tested: Placement/.test(cmp.text) && /Original \(no change\)/.test(cmp.text) && /Changed by the test/.test(cmp.text), cmp && cmp.text);
  await cleanup();
  r = await a.api('POST', '/tests', body('Heading words', { target: '.hero h1', variants: { A: { label: 'A' }, B: { label: 'B', changes: [{ op: 'text', value: 'A better headline' }] } } }));
  h = await page(); cmp = compare(h);
  check('wording on a non-button target: quoted text, no pill', cmp && /Challenger variant B “A better headline”/.test(cmp.text) && !/sl-pill/.test(cmp.html), cmp && cmp.html);
  await cleanup();
  r = await a.api('POST', '/tests', { name: 'Block test', element_type: 'block', target: '', hypothesis: 'Hyp', tier: 1, start: true, sessions_14d: 300 });
  h = await page(); cmp = compare(h);
  check('Living Block default: Block content, Version A, Version B', r.status === 201 && cmp && /What is being tested: Block content/.test(cmp.text) && /Current variant A Version A/.test(cmp.text) && /Challenger variant B Version B/.test(cmp.text), cmp && cmp.text);
  await cleanup();
  r = await a.api('POST', '/tests', { name: 'Drafty', element_type: 'selector', target: '.zzz-q', hypothesis: 'h', tier: 1, change_type: 'shape', a_label: 'Square corners', b_label: 'Round corners', variants: { B: { changes: [{ op: 'style', value: 'border-radius:99px' }] } } });
  check('create accepts change_type, a_label, b_label (draft)', r.status === 201 && r.body.change_type === 'shape' && r.body.a_label === 'Square corners' && r.body.b_label === 'Round corners', r.body);
  st = (await a.api('GET', '/state')).body;
  check('/state queued includes the three fields', st.queued.some((q) => q.change_type === 'shape' && q.a_label === 'Square corners' && q.b_label === 'Round corners'), st.queued);
  r = await a.api('POST', '/tests', { name: 'Bad type', element_type: 'selector', target: '.zzz-q', tier: 1, change_type: 'banana', a_label: 'z'.repeat(300), variants: { B: { changes: [{ op: 'text', value: 'x' }] } } });
  check('create: an unknown change_type is stored empty (default applies) and a long label is capped', r.status === 201 && r.body.change_type === '' && r.body.a_label.length === 200, r.body.a_label.length);

  // ---------- layout: desktop, phone width, dark ----------
  await cleanup(true);
  r = await a.api('POST', '/tests', body('Header button wording', { a_label: 'Get started' }));
  await sources('m=extra&v=0');
  const browser = await chromium.launch();
  const open = async (vp, extra = {}) => {
    const ctx = await browser.newContext({ userAgent: UA, viewport: vp, ...extra });
    const p = await ctx.newPage();
    await ctx.addCookies([{ name: 'playground_auto_login_already_happened', value: '1', url: BASE }]);
    await p.goto(BASE + '/wp-login.php'); await p.fill('#user_login', 'admin'); await p.fill('#user_pass', 'password'); await p.click('#wp-submit'); await p.waitForLoadState('networkidle');
    await p.goto(BASE + '/living/?v=' + Math.random(), { waitUntil: 'domcontentloaded' });
    return { ctx, p };
  };
  const geo = (p) => p.evaluate(() => {
    const R = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width }; };
    const rows = [...document.querySelectorAll('.sl-cmp-row')].map((e) => { const b = e.getBoundingClientRect(); const dt = e.querySelector('dt').getBoundingClientRect(), dd = e.querySelector('dd').getBoundingClientRect(); return { l: b.left, r: b.right, dtTop: dt.top, ddTop: dd.top, dtL: dt.left, ddL: dd.left }; });
    const chips = [...document.querySelectorAll('.sl-src')].map((e) => { const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, w: b.width, sw: e.scrollWidth, cw: e.clientWidth }; });
    const dot = document.querySelector('.sl-src-live .sl-dot'), dot2 = document.querySelector('.sl-src-paused .sl-dot');
    return { sw: document.documentElement.scrollWidth, iw: window.innerWidth, rows, chips, dotLive: dot && getComputedStyle(dot).backgroundColor, dotPaused: dot2 && getComputedStyle(dot2).backgroundColor, vine: !!document.querySelector('.sl-vine .sl-stem') && !!document.querySelector('.sl-vine .sl-burst'), bubbles: document.querySelectorAll('.sl-evolved .sl-bub i').length, burstAt: getComputedStyle(document.querySelector('.sl-dash')).getPropertyValue('--sl-burst-at').trim(), ico: [...document.querySelectorAll('.sl-src-ico svg, .sl-src-ico img')].map((e) => e.getBoundingClientRect().width) };
  });
  let c = await open({ width: 1366, height: 900 });
  let g = await geo(c.p);
  check('desktop: no horizontal scroll', g.sw <= g.iw, g);
  check('desktop: Current/Challenger rows put the label beside the text', g.rows.length === 2 && g.rows.every((x) => Math.abs(x.dtTop - x.ddTop) < 14 && x.ddL > x.dtL + 60), g.rows);
  check('desktop: two chips on one row and logos are 16px', g.chips.length === 2 && Math.abs(g.chips[0].t - g.chips[1].t) < 2 && g.ico.every((w) => w >= 16 && w <= 20), [g.chips, g.ico]);
  check('live dot and paused dot are different colours', g.dotLive && g.dotPaused && g.dotLive !== g.dotPaused, [g.dotLive, g.dotPaused]);
  check('vine, burst and 30 bubbles are still there and the burst timing variable is unchanged', g.vine && g.bubbles === 30 && g.burstAt === '1.8s', [g.vine, g.bubbles, g.burstAt]);
  await c.ctx.close();
  c = await open({ width: 390, height: 844 });
  g = await geo(c.p);
  check('390px: no horizontal scroll', g.sw <= 390, g);
  check('390px: the comparison stacks (text below its label) and fits the width', g.rows.every((x) => x.ddTop > x.dtTop + 8 && x.r <= 390 && x.l >= 0), g.rows);
  check('390px: chips wrap onto their own lines and fit', g.chips.length === 2 && g.chips[1].t > g.chips[0].t + 20 && g.chips.every((x) => x.r <= 390 && x.l >= 0 && x.sw <= x.cw + 1), g.chips);
  await c.ctx.close();
  c = await open({ width: 1366, height: 900 }, { colorScheme: 'dark' });
  g = await geo(c.p);
  const dark = await c.p.evaluate(() => ({ bg: getComputedStyle(document.body).backgroundColor, card: getComputedStyle(document.querySelector('.sl-src')).backgroundColor, live: getComputedStyle(document.querySelector('.sl-src-live .sl-dot')).backgroundColor }));
  check('dark: page and chip colours switch to the dark palette and the live dot is the light green', dark.bg === 'rgb(15, 26, 20)' && dark.card === 'rgb(22, 37, 28)' && dark.live === 'rgb(127, 211, 155)', dark);
  await c.ctx.close();
  await browser.close();

  // ---------- tidy up ----------
  const out = await fetch(BASE + '/living/', { headers: { cookie: 'playground_auto_login_already_happened=1' }, redirect: 'manual' });
  check('logged out /living/ is still 404', out.status === 404, out.status);
  await sources('m=remove'); await sources('m=icon&v=0');
  await cleanup(true);
  const lg = await tool('log');
  check('debug log is empty', /\(no debug\.log\)/.test(lg) || lg.trim() === '', lg.slice(0, 400));
  process.exit(summary('t15 data sources + current vs challenger') ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
