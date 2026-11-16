// Phase A dashboard frames.
// Local: node shot-phaseA.js local          (seeds charter, gate verdicts, change log; shoots 1366 and 390, light and dark)
// Live:  node shot-phaseA.js live <cookies.json>   (no seeding; cookies.json = {liName, liVal})
const { chromium } = require('playwright-core');
const fs = require('fs');
const { BASE, UA, admin, run } = require('./lib');
const OUT = 'C:/Users/grant/Documents/GitHub/spark-sites/sites/living-websites/audit/screenshots/';
const mode = process.argv[2] || 'local';
const URL = mode === 'live' ? 'https://sparkmysite.com/living/' : BASE + '/living/';
const ymd = (d) => new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function seed() {
  const a = await admin();
  const api = (m, p, b) => a.api(m, p.replace('?', '&'), b);
  await run('q17.php', '&m=reset_all');
  await run('q17.php', '&m=upgrade');
  await api('PUT', '/charter', { business_name: 'Sparkmysite Demo', business_goal: 'More qualified website leads for local businesses.', primary_conversion: { type: 'form', description: 'Contact form on the homepage' }, secondary_conversions: [{ type: 'call', description: 'Tap the phone number' }], audience: 'Small local service businesses in Florida.', brand: { colors: ['#1f6b3a', '#0ecaeb'], fonts: ['Poppins'], button_shape: 'pill' }, off_limits: ['Prices', 'Legal text', 'Guarantees'], autonomy_level: 'tier1', speed_budget: { load_ms: 2500, button_visible_ms: 600, max_added_kb: 12 } });
  await api('POST', '/tests', { name: 'Header button wording', element_type: 'selector', target: 'a.et_pb_button[href="#contact"]', hypothesis: 'A clearer promise in the header button will get more people to start.', tier: 1, start: true, sessions_14d: 137, a_label: 'Get started', variants: { A: { label: 'A' }, B: { label: 'B', changes: [{ op: 'text', value: 'Get My Free Website Plan' }] } } });
  await api('POST', '/changes', { kind: 'other', subject_type: 'speed', subject_id: 'home', summary: 'Speed measured on the homepage.', proposed_by: 'agent:auditor', after: { load_ms: 880, button_visible_ms: 410, added_kb: 4.6 } });
  const base = { element_type: 'selector', target: 'a.et_pb_button[href="#contact"]', page: '/', device: 'all', variants: { A: { label: 'Current' }, B: { label: 'Challenger', changes: [{ op: 'text', value: 'Get My Free Website Plan' }] } }, change_type: 'wording', suggested_by: 'agent:scout', sessions_as_of: ymd(1) };
  const s1 = (await api('POST', '/suggestions', { ...base, title: 'Lead with the offer in the headline', a_label: 'The headline names the company', b_label: 'A website that improves itself', rationale: 'The headline names the company, not the benefit.', evidence: [{ source: 'Page review, desktop screenshot', detail: 'Headline is the company tagline', as_of: ymd(2) }], priority: 1, sessions_14d: 260 })).body;
  const s2 = (await api('POST', '/suggestions', { ...base, title: 'Shorten the contact form', change_type: 'shape', a_label: 'Six fields in the form', b_label: 'Three fields in the form', rationale: 'Six fields before the first call.', evidence: [{ source: 'Page review', detail: 'Six required fields', as_of: ymd(2) }], priority: 2, sessions_14d: 260 })).body;
  await api('POST', `/suggestions/${s1.id}/gate`, { verdict: 'pass', reasons: 'Wording only, on brand, easy to reverse, serves the main form conversion.', by: 'agent:judge', risk_tier: 1 });
  await api('POST', `/suggestions/${s2.id}/gate`, { verdict: 'hold', reasons: 'Touches form fields; the owner should confirm which fields are required.', by: 'agent:judge', risk_tier: 2 });
  const s3 = (await api('POST', '/suggestions', { ...base, title: 'Show a phone number in the header', priority: 3, rationale: 'Placeholder idea.', sessions_14d: 300 })).body;
  await api('POST', `/suggestions/${s3.id}/queue`);
  await api('POST', `/suggestions/${s2.id}/queue`, { by: 'agent:scout' });
  await api('POST', '/changes', { kind: 'style_fix', subject_type: 'page', subject_id: '21', summary: 'Made the footer button match the brand green.', proposed_by: 'agent:scout', gate_verdict: 'pass', gate_reasons: 'On brand, reversible.', gate_by: 'agent:judge' });
  await api('POST', '/changes', { kind: 'rows_removed', subject_type: 'events', subject_id: '53,54,55', summary: 'Three speed-test rows were deleted from the events table.', proposed_by: 'owner' });
}

(async () => {
  if (mode === 'local') await seed();
  const browser = await chromium.launch();
  const out = [];
  for (const [name, vp, scheme] of [['desktop-light', { width: 1366, height: 900 }, 'light'], ['desktop-dark', { width: 1366, height: 900 }, 'dark'], ['mobile-light', { width: 390, height: 844 }, 'light'], ['mobile-dark', { width: 390, height: 844 }, 'dark']]) {
    const ctx = await browser.newContext({ userAgent: UA, viewport: vp, colorScheme: scheme, deviceScaleFactor: vp.width < 600 ? 2 : 1 });
    if (mode === 'live') {
      const ck = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
      await ctx.addCookies(ck.cookies.map((c) => ({ ...c, domain: 'sparkmysite.com', path: '/', secure: true, httpOnly: true, sameSite: 'Lax' })));
    } else {
      await ctx.addCookies([{ name: 'playground_auto_login_already_happened', value: '1', url: BASE }]);
    }
    const p = await ctx.newPage();
    if (mode !== 'live') { await p.goto(BASE + '/wp-login.php'); await p.fill('#user_login', 'admin'); await p.fill('#user_pass', 'password'); await p.click('#wp-submit'); await p.waitForLoadState('networkidle'); }
    for (let i = 0; i < 3; i++) { await p.goto(URL + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' }); await sleep(1500); if (await p.$('.sl-dash')) break; }
    await sleep(4500);
    const sw = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    const pre = mode === 'live' ? 'live-dash-phaseA-' : 'local-dash-phaseA-';
    const shot = async (sel, file) => { const el = await p.$(sel); if (!el) { out.push('MISSING ' + sel); return; } await el.scrollIntoViewIfNeeded(); await el.screenshot({ path: OUT + file }); out.push(OUT + file); };
    if (mode === 'local') {
      await shot('#sl-goals + section', pre + name + '-goals.png');
      await shot('#sl-suggested ~ article.sl-sug', pre + name + '-gatecard.png');
      await shot('#sl-changes', pre + name + '-changelog.png');
    }
    await p.screenshot({ path: OUT + pre + name + '-full.png', fullPage: true });
    out.push(OUT + pre + name + '-full.png scrollWidth ' + sw.join('/'));
    await ctx.close();
  }
  await browser.close();
  console.log(out.join('\n'));
})().catch((e) => { console.error(e); process.exit(2); });
