// t21 (0.3.0): the dashboard on all three surfaces (/living/, the shortcode, wp-admin): Site goals, Change log, gate line,
// layout at 390px and 1366px in light and dark, no horizontal scroll, Undo button.
// Run: node t21.js
const { chromium } = require('playwright-core');
const { BASE, UA, run, admin, check, summary } = require('./lib');
const q = (m, extra = '') => run('q17.php', `&m=${m}${extra}`);
const ymd = (d) => new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&middot;/g, '.').replace(/&#8217;/g, "'").replace(/\s+/g, ' ');

(async () => {
  const a = await admin();
  const api = (m, p, b) => a.api(m, p.replace('?', '&'), b);
  await q('reset_all'); await q('upgrade');
  await run('q17b.php', '&m=mk_shortcode_page');

  // empty states first
  let html = await (await fetch(BASE + '/living/', { headers: { cookie: a.cookie() } })).text();
  let t = text(html);
  check('empty charter: Site goals card says nothing has been written and links to wp-admin', /Site goals/.test(t) && /No site goals have been written yet/.test(t) && /page=spark-living-charter/.test(html) && /Autonomy[\s\S]*Suggest only/.test(t), t.slice(t.indexOf('Site goals'), t.indexOf('Site goals') + 400));
  check('empty ledger: Change log has the heading and says nothing has been recorded', /Change log/.test(t) && /Nothing has been recorded yet/.test(t));

  // fill: charter, speed, suggestions with gate verdicts, lifecycle rows
  await api('PUT', '/charter', { business_name: 'Sparkmysite Demo', business_goal: 'More qualified website leads for local businesses.', primary_conversion: { type: 'form', description: 'Contact form on the homepage' }, secondary_conversions: [{ type: 'call', description: 'Tap the phone number' }], audience: 'Small local service businesses in Florida.', brand: { colors: ['#1f6b3a', '#0ecaeb'], fonts: ['Poppins'], button_shape: 'pill' }, off_limits: ['Prices', 'Legal text', 'Guarantees'], autonomy_level: 'tier1', speed_budget: { load_ms: 2500, button_visible_ms: 600, max_added_kb: 12 } });
  await api('POST', '/changes', { kind: 'other', subject_type: 'speed', subject_id: 'home', summary: 'Speed measured on the homepage.', proposed_by: 'agent:auditor', after: { load_ms: 880, button_visible_ms: 410, added_kb: 4.6 } });
  const base = { element_type: 'selector', target: 'a.et_pb_button[href="#contact"]', page: '/', device: 'all', variants: { A: { label: 'Current' }, B: { label: 'Challenger', changes: [{ op: 'text', value: 'Get My Free Website Plan' }] } }, change_type: 'wording', suggested_by: 'agent:scout', sessions_as_of: ymd(1) };
  const s1 = (await api('POST', '/suggestions', { ...base, title: 'Say what the button gives you', a_label: 'Get started', b_label: 'Get My Free Website Plan', rationale: 'The button names an action, not the result.', evidence: [{ source: 'Page review', detail: 'Header button says Get started', as_of: ymd(2) }], priority: 1, sessions_14d: 260 })).body;
  const s2 = (await api('POST', '/suggestions', { ...base, title: 'Shorten the contact form', change_type: 'shape', a_label: 'Six fields', b_label: 'Three fields', rationale: 'Six fields before the first call.', evidence: [{ source: 'Page review', detail: 'Six required fields', as_of: ymd(2) }], priority: 2, sessions_14d: 260 })).body;
  await api('POST', `/suggestions/${s1.id}/gate`, { verdict: 'pass', reasons: 'Wording only, on brand, easy to reverse, serves the main form conversion.', by: 'agent:judge', risk_tier: 1 });
  await api('POST', `/suggestions/${s2.id}/gate`, { verdict: 'hold', reasons: 'Touches form fields; the owner should confirm which fields are required.', by: 'agent:judge', risk_tier: 2 });
  const s3 = (await api('POST', '/suggestions', { ...base, title: 'Third idea', priority: 3, rationale: 'Placeholder idea.', sessions_14d: 300 })).body;
  await api('POST', `/suggestions/${s3.id}/queue`);
  // a refused agent attempt (shows a Refused row)
  await api('POST', `/suggestions/${s2.id}/queue`, { by: 'agent:scout' });
  // more rows so the list is capped at 10
  for (let i = 0; i < 4; i++) { await api('POST', '/changes', { kind: 'style_fix', subject_type: 'page', subject_id: String(20 + i), summary: 'Made the footer button on page ' + (20 + i) + ' match the brand green.', proposed_by: 'agent:scout', gate_verdict: 'pass', gate_reasons: 'On brand, reversible.', gate_by: 'agent:judge' }); }
  await api('POST', '/changes', { kind: 'rows_removed', subject_type: 'events', subject_id: '53,54,55', summary: 'Three speed-test rows were deleted from the events table.', proposed_by: 'owner' });
  await api('POST', '/changes', { kind: 'ad_change', subject_type: 'ad', subject_id: 'meta-1', summary: 'Paused the ad with the highest cost per lead.', proposed_by: 'agent:ads', gate_verdict: 'fail', gate_reasons: 'Stage 1 only: suggestions, not changes.', gate_by: 'agent:judge' });

  const surfaces = [['/living/', 'living'], ['/living-shortcode-test/', 'shortcode'], ['/wp-admin/admin.php?page=spark-living', 'wp-admin']];
  for (const [path, label] of surfaces) {
    html = await (await fetch(BASE + path, { headers: { cookie: a.cookie() } })).text();
    t = text(html);
    const logItems = (html.match(/data-sl-change="\d+"/g) || []).length;
    check(`${label}: Site goals card shows the charter (name, goal, conversions, audience, off limits, brand, autonomy, speed budget and the last measurement)`, /Sparkmysite Demo/.test(t) && /More qualified website leads/.test(t) && /Form submission\s*:\s*Contact form on the homepage/.test(t) && /Phone call\s*:\s*Tap the phone number/.test(t) && /Small local service businesses/.test(t) && /Prices/.test(t) && /Guarantees/.test(t) && /#1f6b3a/.test(t) && /Poppins/.test(t) && /Tier 1 on its own/.test(t) && /Page load 2,500 ms; button visible 600 ms; added by the plugin 12 KB at most/.test(t) && /Last measured: page load 880 ms; button visible 410 ms; added 4\.6 KB/.test(t), t.slice(t.indexOf('Site goals'), t.indexOf('Site goals') + 900));
    const goalsHtml = html.slice(html.indexOf('id="sl-goals"'), html.indexOf('id="sl-current"'));
    check(`${label}: Site goals card is read only (no form, no input inside it) and links to the wp-admin charter`, !/<form|<input|<textarea/.test(goalsHtml) && /page=spark-living-charter/.test(goalsHtml));
    check(`${label}: Change log has exactly the newest 10 rows`, logItems === 10, logItems);
    check(`${label}: Change log rows read in plain words with who proposed it and a gate tag`, /Proposed by: agent:scout/.test(t) && /sl-gate sl-gate-pass">Gate: pass</.test(html) && /sl-gate sl-gate-fail">Gate: fail</.test(html) && /sl-gate sl-gate-na">Not gated</.test(html) && /Paused the ad with the highest cost per lead/.test(t), t.slice(t.indexOf('Change log'), t.indexOf('Change log') + 500));
    check(`${label}: a Refused row is shown for the blocked agent attempt`, /Refused/.test(t) && /tried to queue/.test(t));
    check(`${label}: Undo is offered on the queued test and nowhere else`, (html.match(/data-sl-undo=/g) || []).length === 1);
    check(`${label}: suggestion cards show the Goal Gate line (pass and hold)`, /Goal Gate: Gate: pass/.test(t) && /Goal Gate: Gate: hold/.test(t) && /Touches form fields; the owner should confirm/.test(t));
  }

  // layout in the browser
  const browser = await chromium.launch();
  const mkctx = async (vp, scheme) => {
    const ctx = await browser.newContext({ userAgent: UA, viewport: vp, colorScheme: scheme });
    await ctx.addCookies([{ name: 'playground_auto_login_already_happened', value: '1', url: BASE }]);
    const p = await ctx.newPage();
    await p.goto(BASE + '/wp-login.php'); await p.fill('#user_login', 'admin'); await p.fill('#user_pass', 'password'); await p.click('#wp-submit'); await p.waitForLoadState('networkidle');
    return { ctx, p };
  };
  for (const [vp, scheme] of [[{ width: 1366, height: 900 }, 'light'], [{ width: 1366, height: 900 }, 'dark'], [{ width: 390, height: 844 }, 'light'], [{ width: 390, height: 844 }, 'dark']]) {
    const { ctx, p } = await mkctx(vp, scheme);
    for (const [path, label] of [['/living/', 'living'], ['/wp-admin/admin.php?page=spark-living', 'wp-admin'], ['/living-shortcode-test/', 'shortcode']]) {
      await p.goto(BASE + path + (path.includes('?') ? '&' : '?') + 'v=' + Date.now());
      await sleep(1200);
      const m = await p.evaluate(() => {
        const wide = [];
        document.querySelectorAll('.sl-goals *, .sl-changes *, .sl-sug *').forEach((el) => { const r = el.getBoundingClientRect(); if (r.right > window.innerWidth + 1 && r.width > 0) wide.push(el.tagName + '.' + el.className); });
        return { sw: document.documentElement.scrollWidth, iw: window.innerWidth, wide: wide.slice(0, 5) };
      });
      check(`${vp.width}px ${scheme} ${label}: no horizontal page scroll and nothing in the new sections runs past the viewport`, m.sw <= m.iw && m.wide.length === 0, m);
    }
    await ctx.close();
  }

  // click Undo in the browser
  const { ctx, p } = await mkctx({ width: 1366, height: 900 }, 'light');
  await p.goto(BASE + '/living/?v=' + Date.now());
  await sleep(800);
  await p.click('button[data-sl-undo]');
  await p.waitForFunction(() => document.body.innerText.includes('taken off the queue and back in Suggested tests'), null, { timeout: 20000 });
  await sleep(500);
  const after = await p.content();
  check('clicking Undo on the page takes the queued test off the queue and the log shows the undo', /taken off the queue and back in Suggested tests/.test(after) && !/data-sl-undo=/.test(after), (after.match(/data-sl-undo/g) || []).length);
  const qq = (await api('GET', '/suggestions')).body;
  check('...REST agrees: no queued test, the suggestion is back', qq.queue.length === 0 && qq.suggestions.some((x) => x.id === s3.id), qq.queue.length);
  await ctx.close();
  await browser.close();
  await q('reset_all');
  process.exit(summary('t21 dashboard sections') ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
