// 0.2.0 frames of "Up next" and "Suggested tests".
// Local: node shot5.js local        (seeds a running test, one queued, three suggested)
// Live:  node shot5.js live <cookies.json>   (no seeding; shows whatever the live site holds)
const { chromium } = require('playwright-core');
const fs = require('fs');
const { BASE, admin, run, cleanup } = require('./lib');
const OUT = 'C:/Users/grant/Documents/GitHub/spark-sites/sites/living-websites/audit/screenshots/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const mode = process.argv[2] || 'local';
const prefix = mode === 'live' ? 'live-dash-suggested-' : 'local-dash-suggested-';
const URL = mode === 'live' ? 'https://sparkmysite.com/living/' : BASE + '/living/';
const CSS = '@media (max-width:980px){.et_pb_section a.et_pb_button.et_pb_button_0{display:inline-block!important;position:absolute!important;top:33px;right:34px;z-index:6;margin:0!important;padding:6px 12px!important;font-size:13px!important;line-height:1.2!important;white-space:nowrap}.et_pb_section_0 .et_pb_column_1,.et_pb_section_0 .et_pb_button_0_wrapper{position:static!important}}';
const ymd = (d) => new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);

async function seed() {
  const a = await admin();
  await cleanup(true); await run('q16.php', '&m=reset');
  const base = { element_type: 'selector', target: 'a.et_pb_button[href="#contact"]', page: '/', device: 'mobile', variants: { A: { label: 'Current' }, B: { label: 'Challenger', css: CSS } }, change_type: 'visibility', suggested_by: 'Lumen page review' };
  await a.api('POST', '/tests', { name: 'Header button wording', element_type: 'selector', target: 'a.et_pb_button[href="#contact"]', hypothesis: 'A clearer promise in the header button will get more people to start.', tier: 1, start: true, sessions_14d: 137, a_label: 'Get started', variants: { A: { label: 'A' }, B: { label: 'B', changes: [{ op: 'text', value: 'Get My Free Website Plan' }] } } });
  const mk = (o) => a.api('POST', '/suggestions', { ...base, ...o });
  const q1 = await mk({ title: 'Make the contact form shorter', hypothesis: 'h', page: '/', device: 'all', variants: { A: { label: 'A' }, B: { label: 'B', changes: [{ op: 'add_class', value: 'sl-short' }] } }, change_type: 'shape', a_label: 'Six fields in the contact form', b_label: 'Three fields in the contact form', rationale: 'The form asks for six things before the first call.', evidence: [{ source: 'Page review, desktop screenshot', detail: 'Six required fields', as_of: '2026-11-12' }], priority: 1, sessions_14d: 260, sessions_as_of: ymd(3) });
  await a.api('POST', `/suggestions/${q1.body.id}/queue`);
  await mk({ title: 'Show the Get Started button on phones', hypothesis: 'Phone visitors have no button in the header today.', rationale: 'On phones and tablets the theme hides the header button, so the only path to the contact form is scrolling or opening the menu. On desktop the same button is the main call to action.', a_label: 'No button in the header on phones', b_label: 'Get Started button shown in the header on phones', evidence: [{ source: 'Page review, phone and desktop screenshots', detail: 'Header button is hidden at 980px and below', as_of: '2026-11-12' }, { source: 'Google Analytics', detail: '41 phone sessions on the homepage in 14 days', as_of: '2026-11-11' }, { source: 'Staging test', detail: 'Ran correctly on the staging copy', as_of: '2026-11-12' }], priority: 1, sessions_14d: 41, sessions_as_of: '2026-11-11' });
  await mk({ title: 'Lead with the offer in the headline', page: '/', device: 'desktop', variants: { A: { label: 'A' }, B: { label: 'B', changes: [{ op: 'text', value: 'A website that improves itself' }] } }, change_type: 'wording', rationale: 'The headline names the company, not the benefit.', evidence: [{ source: 'Page review, desktop screenshot', detail: 'Headline is the company tagline', as_of: '2026-11-12' }], priority: 2, sessions_14d: 240, sessions_as_of: ymd(2) });
  await mk({ title: 'Third idea (hidden behind the top two)', priority: 3, rationale: 'Placeholder.', sessions_14d: 300, sessions_as_of: ymd(1) });
}

(async () => {
  if (mode === 'local') await seed();
  const browser = await chromium.launch();
  const open = async (vp, extra = {}) => {
    const ctx = await browser.newContext({ userAgent: UA, viewport: vp, ...extra });
    const errs = [];
    if (mode === 'live') {
      const ck = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
      await ctx.addCookies([{ name: ck.liName, value: ck.liVal, domain: 'sparkmysite.com', path: '/', secure: true, httpOnly: true, sameSite: 'Lax' }]);
    } else {
      await ctx.addCookies([{ name: 'playground_auto_login_already_happened', value: '1', url: BASE }]);
    }
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(e.message));
    if (mode !== 'live') { await p.goto(BASE + '/wp-login.php'); await p.fill('#user_login', 'admin'); await p.fill('#user_pass', 'password'); await p.click('#wp-submit'); await p.waitForLoadState('networkidle'); }
    for (let i = 0; i < 3; i++) {
      const r = await p.goto(URL + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(1500);
      if (await p.$('.sl-dash')) break;
    }
    await p.waitForTimeout(6500);
    return { ctx, p, errs };
  };
  const shoot = async (p, file, sel) => {
    const c = await p.evaluate((sel) => { const e = document.querySelector(sel).getBoundingClientRect(); return { x: Math.max(0, e.left - 12), y: Math.max(0, e.top + scrollY - 12), width: Math.min(innerWidth, e.right + 12) - Math.max(0, e.left - 12), height: e.height + 24 }; }, sel);
    await p.screenshot({ path: OUT + file, clip: c, fullPage: true }); console.log(file, JSON.stringify(c));
  };
  let { ctx, p, errs } = await open({ width: 1366, height: 900 });
  await shoot(p, prefix + 'desktop.png', '#sl-plan');
  console.log('desktop errors', JSON.stringify(errs)); await ctx.close();
  ({ ctx, p, errs } = await open({ width: 390, height: 844 }));
  await shoot(p, prefix + 'mobile.png', '#sl-plan');
  console.log('mobile errors', JSON.stringify(errs), 'scrollWidth', await p.evaluate(() => document.documentElement.scrollWidth)); await ctx.close();
  ({ ctx, p, errs } = await open({ width: 1366, height: 900 }, { colorScheme: 'dark' }));
  await shoot(p, prefix + 'dark.png', '#sl-plan');
  console.log('dark errors', JSON.stringify(errs)); await ctx.close();
  await browser.close();
  if (mode === 'local') { await run('q16.php', '&m=reset'); await cleanup(true); }
})();
