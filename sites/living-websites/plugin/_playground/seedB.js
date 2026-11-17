// Seeds the local dashboard for the Phase B frames and layout test: a running test with a 23 day stop date, an approved charter,
// suggestions with payoff scores (one passed, one held, one failed, one not checked, one sitewide), a queued test, and a draft charter variant.
const { admin, run } = require('./lib');
const ymd = (d) => new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);

async function seed(opts = {}) {
  const a = await admin();
  const api = (m, p, b) => a.api(m, p.replace('?', '&'), b);
  await run('q17.php', '&m=reset_all');
  await run('q17.php', '&m=purge_experiments');
  await run('q17.php', '&m=upgrade');
  await api('PUT', '/charter', { business_name: 'Sparkmysite Demo', business_goal: 'More qualified website leads for local businesses.', primary_conversion: { type: 'form', description: 'Contact form on the homepage' }, secondary_conversions: [{ type: 'call', description: 'Tap the phone number' }], audience: 'Small local service businesses in Florida.', brand: { colors: ['#1f6b3a', '#0ecaeb'], fonts: ['Poppins'], button_shape: 'pill' }, off_limits: ['Prices', 'Legal text', 'Guarantees'], autonomy_level: 'suggest', speed_budget: { load_ms: 2500, button_visible_ms: 600, max_added_kb: 12 } });
  if (!opts.draft) { await api('POST', '/charter/approve', { by: 'owner' }); }
  // the running test: 137 sessions in 14 days, 3 days in, so "Day 4 of 23"
  const id = parseInt(await run('q22.php', '&m=start_direct&sessions=137&ago=3.2&sel=a.et_pb_button%5Bhref%3D%22%23contact%22%5D&name=Header%20button%20wording'), 10);
  await run('q22.php', `&m=set_meta&id=${id}&k=hypothesis&v=${encodeURIComponent('A clearer promise in the header button will get more people to start.')}`);
  await run('q22.php', `&m=set_meta&id=${id}&k=a_label&v=${encodeURIComponent('Get started')}`);
  await run('q22.php', `&m=set_meta&id=${id}&k=b_label&v=${encodeURIComponent('Get My Free Website Plan')}`);
  await run('q22.php', `&m=set_meta&id=${id}&k=change_type&v=wording`);
  await run('q22.php', `&m=seed_obs&id=${id}&na=15&nb=19`);
  await api('POST', '/changes', { kind: 'other', subject_type: 'speed', subject_id: 'home', summary: 'Speed measured on the homepage.', proposed_by: 'agent:auditor', after: { load_ms: 880, button_visible_ms: 410, added_kb: 4.6 } });
  const mk = (over) => ({ element_type: 'selector', page: '/', device: 'all', change_type: 'wording', suggested_by: 'agent:scout', sessions_as_of: ymd(1), sessions_14d: 137, variants: { A: { label: 'Current' }, B: { label: 'Challenger', changes: [{ op: 'text', value: 'New words' }] } }, ...over });
  const ev = (d) => [{ source: 'Screenshot review, desktop', detail: d, as_of: ymd(2) }];
  const book = (await api('POST', '/suggestions', mk({ title: 'Make "Book a free call" a real button in the hero', target: 'a.q25-book', change_type: 'style', a_label: 'A small text link: "or book a free call"', b_label: 'An outlined button: "Book a free call"', rationale: 'The only direct booking path on the first screen is a small link.', evidence: ev('The hero has a text link for booking, no button'), payoff_score: 0.0406, payoff_inputs: { sessions_reaching: 137, proximity: 0.8, expected_lift: 0.1, days_to_result: 23, traffic_class: 'decidable' }, payoff_version: 'payoff.js 2026-11-16' }))).body;
  const form = (await api('POST', '/suggestions', mk({ title: 'Send the hero button to the plan-call form', target: 'a.q25-hero', change_type: 'placement', a_label: 'Goes to the packages', b_label: 'Goes to the plan-call form', rationale: 'The hero button leads to a step before the lead.', evidence: ev('Hero button goes to #packages'), payoff_score: 0.0439, payoff_inputs: { sessions_reaching: 137, proximity: 0.6, expected_lift: 0.12, days_to_result: 23, traffic_class: 'decidable' }, payoff_version: 'payoff.js 2026-11-16' }))).body;
  const sitewide = (await api('POST', '/suggestions', mk({ title: 'Pin the phone button on every page', scope: 'sitewide', page: undefined, target: 'a.q25-phone', sessions_14d: 526, change_type: 'visibility', a_label: 'Phone button sits in the middle of the page', b_label: 'Phone button stays in the corner', rationale: 'The phone button is far down on every page.', evidence: ev('Four phone links, none on the first screen'), payoff_score: 0.0214, payoff_inputs: { sessions_reaching: 526, proximity: 1, expected_lift: 0.15, days_to_result: 7, traffic_class: 'decidable' }, payoff_version: 'payoff.js 2026-11-16' }))).body;
  const slow = (await api('POST', '/suggestions', mk({ title: 'Show the Get started button in the header on phones', target: 'a.q25-phoneheader', device: 'mobile', sessions_14d: 41, change_type: 'visibility', a_label: 'No button in the header on phones', b_label: 'Get started button shown in the header on phones', rationale: 'Phones get no header button.', evidence: ev('The header button is hidden below 980 pixels'), payoff_score: 0.0049, payoff_inputs: { sessions_reaching: 41, proximity: 0.8, expected_lift: 0.1, days_to_result: 76, traffic_class: 'below_minimum' }, payoff_version: 'payoff.js 2026-11-16' }))).body;
  const bad = (await api('POST', '/suggestions', mk({ title: 'Headline that names the result', target: 'h1.q25-title', change_type: 'wording', a_label: 'The company tagline', b_label: 'A website that brings you calls', rationale: 'The headline names the company, not the benefit.', evidence: ev('Headline is the tagline'), payoff_score: 0.0065, payoff_inputs: { sessions_reaching: 137, proximity: 0.2, expected_lift: 0.08, days_to_result: 23, traffic_class: 'decidable' }, payoff_version: 'payoff.js 2026-11-16' }))).body;
  const held = (await api('POST', '/suggestions', mk({ title: 'Three form boxes instead of five', target: 'form.q25-form', tier: 2, change_type: 'shape', a_label: 'Five boxes', b_label: 'Three boxes', rationale: 'Five boxes before the first call.', evidence: ev('Five required boxes'), payoff_score: 0.0256, payoff_inputs: { sessions_reaching: 48, proximity: 1, expected_lift: 0.12, days_to_result: 23, traffic_class: 'decidable' }, payoff_version: 'payoff.js 2026-11-16' }))).body;
  await api('POST', `/suggestions/${book.id}/gate`, { verdict: 'pass', reasons: 'Wording and look only, on brand, easy to reverse, serves the main form and phone conversions.', by: 'agent:judge', risk_tier: 1 });
  await api('POST', `/suggestions/${form.id}/gate`, { verdict: 'hold', reasons: 'That button also feeds direct package purchases, which the charter does not count.', by: 'agent:judge', risk_tier: 1 });
  await api('POST', `/suggestions/${bad.id}/gate`, { verdict: 'fail', reasons: 'Promises a result the owner has not supplied.', by: 'agent:judge', risk_tier: 3 });
  await api('POST', `/suggestions/${held.id}/gate`, { verdict: 'hold', reasons: 'Removed boxes tell the team what the visitor wants.', by: 'agent:judge', risk_tier: 2 });
  await api('POST', `/suggestions/${slow.id}/queue`, {});
  return { id, book, form, sitewide, slow, bad, held, api, a };
}
module.exports = { seed };
