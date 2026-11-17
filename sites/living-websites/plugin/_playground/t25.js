// t25 (0.4.0): the dashboard with the Phase B additions at 1366 and 390 px, light and dark: the running card's dates, the payoff line,
// the rejected-by-the-Goal-Gate list (closed, then opened), the scope line, the Site goals approval line. No horizontal scroll, nothing in the
// new parts past the viewport, text readable (contrast) and the queued card says why it waits.
// Run: node t25.js
const { chromium } = require('playwright-core');
const { BASE, UA, check, summary, tool } = require('./lib');
const { seed } = require('./seedB');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const s = await seed();
  const a = s.a;
  const html = await (await fetch(BASE + '/living/', { headers: { cookie: a.cookie() } })).text();
  const t = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ');
  check('running card: "Day 4 of 23. Started ... Earliest read ... Stops ... at the latest."', /Day 4 of 23\. Started [A-Z][a-z]+ \d+, \d{4}\. Earliest read [A-Z][a-z]+ \d+, \d{4}\. Stops [A-Z][a-z]+ \d+, \d{4} at the latest\./.test(t), t.slice(t.indexOf('Day 4'), t.indexOf('Day 4') + 200));
  check('suggestion cards: payoff words (second of 4, lowest of 4) with the small raw number; the queued card shows only its number', /Expected payoff: second of 4 \(score 0\.0406\)/.test(t) && /Expected payoff: lowest of 4 \(score 0\.0214\)/.test(t) && /Expected payoff: score 0\.0049/.test(t), t.match(/Expected payoff:[^.]{0,60}/g));
  check('suggestion card: "At this traffic a result takes about 23 days." (not amber)', /At this traffic a result takes about 23 days\./.test(t) && !/<span class="sl-traffic-low">At this traffic a result takes about 23/.test(html));
  check('queued card for the 41-session test: amber "more than the 42-day limit" and "Waiting: at this traffic a result would take more than 42 days"', /At this traffic a result takes about 76 days, more than the 42-day limit/.test(t) && /Waiting: at this traffic a result would take more than 42 days/.test(t) && /sl-traffic-low">At this traffic a result takes about 76/.test(html));
  check('sitewide card: "Whole site" and the whole-site count', /Whole site \(every page where the element appears\)/.test(t) && /526 sessions on the whole site in 14 days/.test(t));
  check('Site goals: Approved by owner', /Approved by owner on/.test(t), t.match(/Approval[^.]{0,80}/));
  check('rejected expander is present and closed, with the failed suggestion inside only', /id="sl-rejected"/.test(html) && !/<details class="sl-rejected" id="sl-rejected" open/.test(html) && /Rejected by the Goal Gate \(1\)/.test(t));

  const browser = await chromium.launch();
  for (const [vp, scheme] of [[{ width: 1366, height: 900 }, 'light'], [{ width: 1366, height: 900 }, 'dark'], [{ width: 390, height: 844 }, 'light'], [{ width: 390, height: 844 }, 'dark']]) {
    const ctx = await browser.newContext({ userAgent: UA, viewport: vp, colorScheme: scheme });
    await ctx.addCookies([{ name: 'playground_auto_login_already_happened', value: '1', url: BASE }]);
    const p = await ctx.newPage();
    await p.goto(BASE + '/wp-login.php'); await p.fill('#user_login', 'admin'); await p.fill('#user_pass', 'password'); await p.click('#wp-submit'); await p.waitForLoadState('networkidle');
    await p.goto(BASE + '/living/?v=' + Date.now()); await sleep(1200);
    const open = await p.evaluate(() => { const d = document.getElementById('sl-rejected'); const was = d.open; d.querySelector('summary').click(); return [was, d.open]; });
    await sleep(200);
    const m = await p.evaluate(() => {
      const wide = [];
      document.querySelectorAll('.sl-sched, .sl-payoff, .sl-sug *, .sl-rejected *, .sl-goals *').forEach((el) => { const r = el.getBoundingClientRect(); if (r.right > window.innerWidth + 1 && r.width > 0) wide.push(el.tagName + '.' + el.className); });
      const lum = (c) => { const m = c.match(/\d+(\.\d+)?/g).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
      const bgOf = (el) => { while (el) { const b = getComputedStyle(el).backgroundColor; if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) return b; el = el.parentElement; } return 'rgb(255,255,255)'; };
      const low = [];
      document.querySelectorAll('.sl-payoff, .sl-payoff strong, .sl-sched, .sl-traffic-low, .sl-traffic-ok, .sl-small, .sl-rejected summary').forEach((el) => {
        const c = getComputedStyle(el).color; const b = bgOf(el); const l1 = lum(c), l2 = lum(b); const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        if (ratio < 4.5) low.push([el.className || el.tagName, c, b, Math.round(ratio * 100) / 100]);
      });
      return { sw: document.documentElement.scrollWidth, iw: window.innerWidth, wide: wide.slice(0, 5), low };
    });
    check(`${vp.width}px ${scheme}: the rejected list opens on click`, open[0] === false && open[1] === true, open);
    check(`${vp.width}px ${scheme}: no horizontal page scroll; nothing in the new parts runs past the viewport`, m.sw <= m.iw && m.wide.length === 0, m);
    check(`${vp.width}px ${scheme}: text in the new parts has a contrast ratio of at least 4.5 to 1`, m.low.length === 0, m.low);
    await ctx.close();
  }
  await browser.close();
  const log = await tool('log');
  check('debug log is empty', /no debug\.log/.test(log), log.slice(0, 600));
  process.exit(summary('t25 dashboard, Phase B') ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
