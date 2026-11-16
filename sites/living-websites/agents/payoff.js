#!/usr/bin/env node
'use strict';
/*
 * Payoff score for one candidate test (Living Websites, Phase B).
 * No dependencies. Spec and reasoning: payoff-scoring.md (same folder).
 *
 *   node payoff.js candidate.json     score one candidate, or an array / {candidates: [...]} (ranked)
 *   node payoff.js --test             run the built-in checks
 *
 * As a module: const { score, rank, LIFT_PRIOR, RULES } = require('./payoff.js');
 */

// The plugin's fixed rules (Spark_Living_Stats): 100 sessions per version, 7 day minimum, 14 day hard stop,
// permanent 10 percent holdout. The start allocation is 50/50 of the non-holdout visitors, so each version gets 45 percent.
const RULES = Object.freeze({
  MIN_PER_VERSION: 100,
  MIN_DAYS: 7,
  HARD_STOP_DAYS: 14,
  ELIGIBILITY_SESSIONS: 100,
  HOLDOUT: 0.10,
  VERSION_SHARE: 0.45,
  Z_SUM: 1.2816 + 0.8416, // one-sided 90 percent call plus 80 percent power
  DEFAULT_BASELINE_RATE: 0.06, // an ASSUMPTION: share of exposed sessions that click, submit or tap. Replace with the real rate.
  LIBRARY_WEIGHT: 3, // the prior counts as this many concluded similar tests when blended with the results library
});

// PRIOR, NOT DATA. Expected relative lift on the primary conversion rate of exposed sessions, by kind of change.
// Deliberately conservative (an expected value, not a best case). Replaced step by step by the results library.
const LIFT_PRIOR = Object.freeze({
  shape: 0.02,
  color: 0.03,
  wording: 0.05,
  style: 0.05,
  placement: 0.08,
  headline: 0.08,
  visibility: 0.10,
  cta_promote: 0.10,
  cta_retarget: 0.12,
  form_length: 0.12,
  block: 0.12,
  layout: 0.12,
  cta_add: 0.15,
  offer: 0.15,
});

function fail(msg) { throw new Error('payoff: ' + msg); }
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const round = (x, d) => (Number.isFinite(x) ? Math.round(x * Math.pow(10, d)) / Math.pow(10, d) : x);

function validate(c) {
  if (!c || typeof c !== 'object') fail('candidate must be an object');
  const p = c.payoff_inputs || c; // accept the Scout's nested shape or a flat one
  if (![1, 2, 3].includes(c.tier)) fail('tier must be 1, 2 or 3 (candidate ' + c.id + ')');
  if (!Number.isInteger(p.sessions_14d) || p.sessions_14d < 0) fail('sessions_14d must be a whole number of 0 or more (candidate ' + c.id + ')');
  if (!isNum(p.proximity) || p.proximity < 0 || p.proximity > 1) fail('proximity must be 0 to 1 (candidate ' + c.id + ')');
  if (!isNum(p.reach_share) || p.reach_share < 0 || p.reach_share > 1) fail('reach_share must be 0 to 1 (candidate ' + c.id + ')');
  if (!Object.prototype.hasOwnProperty.call(LIFT_PRIOR, p.change_type)) fail('unknown change_type "' + p.change_type + '" (candidate ' + c.id + '); allowed: ' + Object.keys(LIFT_PRIOR).join(', '));
  if (p.baseline_rate !== undefined && !(isNum(p.baseline_rate) && p.baseline_rate > 0 && p.baseline_rate < 1)) fail('baseline_rate must be between 0 and 1 (candidate ' + c.id + ')');
  if (p.library_n !== undefined && (!Number.isInteger(p.library_n) || p.library_n < 0)) fail('library_n must be a whole number (candidate ' + c.id + ')');
  if (p.library_n > 0 && !(isNum(p.library_lift) && p.library_lift >= -1)) fail('library_lift is needed when library_n is above 0 (candidate ' + c.id + ')');
  return p;
}

function score(c) {
  const p = validate(c);
  const sessions = p.sessions_14d;
  const baseline = p.baseline_rate !== undefined ? p.baseline_rate : RULES.DEFAULT_BASELINE_RATE;

  // Lift: the prior, blended with concluded similar tests from the results library when there are any.
  const prior = LIFT_PRIOR[p.change_type];
  const n = p.library_n || 0;
  const lift = n > 0 ? (n * p.library_lift + RULES.LIBRARY_WEIGHT * prior) / (n + RULES.LIBRARY_WEIGHT) : prior;

  // Traffic and time.
  const perVersionDaily = (sessions / 14) * RULES.VERSION_SHARE;
  const perVersion14 = perVersionDaily * 14;
  const daysToMin = perVersionDaily > 0 ? RULES.MIN_PER_VERSION / perVersionDaily : Infinity;
  const daysEffective = Math.min(RULES.HARD_STOP_DAYS, Math.max(RULES.MIN_DAYS, daysToMin));
  const belowMinimum = perVersion14 < RULES.MIN_PER_VERSION; // cannot reach 100 per version inside 14 days
  const eligible = sessions >= RULES.ELIGIBILITY_SESSIONS; // the plugin's start gate

  // Detectability: the smallest relative lift this test could call at its sample size (90 percent call, 80 percent power).
  const nEnd = perVersionDaily * daysEffective;
  const mdeRel = nEnd > 0 ? (RULES.Z_SUM * Math.sqrt((2 * baseline * (1 - baseline)) / nEnd)) / baseline : Infinity;
  const powerFactor = Number.isFinite(mdeRel) ? Math.min(1, lift / mdeRel) : 0;

  const reaching = sessions * p.reach_share;
  const excluded = c.tier === 3;
  const raw = (reaching * p.proximity * lift * powerFactor) / daysEffective;

  return {
    id: c.id,
    score: excluded ? 0 : round(raw, 4),
    traffic_class: belowMinimum ? (eligible ? 'below_minimum' : 'below_minimum_not_eligible') : 'decidable',
    below_minimum: belowMinimum,
    eligible_to_start: eligible,
    excluded_tier3: excluded,
    needs_owner_approval_unless_full: c.tier === 2,
    lift_prior: prior,
    lift_used: round(lift, 4),
    sessions_reaching: round(reaching, 1),
    per_version_sessions_14d: round(perVersion14, 1),
    days_to_100_per_version: Number.isFinite(daysToMin) ? round(daysToMin, 1) : null,
    days_effective: round(daysEffective, 1),
    mde_relative: Number.isFinite(mdeRel) ? round(mdeRel, 3) : null,
    power_factor: round(powerFactor, 4),
    baseline_rate_used: baseline,
  };
}

function classRank(r) {
  if (r.excluded_tier3) return 3;
  if (r.traffic_class === 'decidable') return 0;
  if (r.traffic_class === 'below_minimum') return 1;
  return 2;
}

// Highest first; decidable before below_minimum before not eligible before excluded. Ties: id, so the output is stable.
function rank(list) {
  return list.map(score)
    .sort((a, b) => classRank(a) - classRank(b) || b.score - a.score || String(a.id).localeCompare(String(b.id)))
    .map((r, i) => Object.assign({ rank: i + 1 }, r));
}

module.exports = { score, rank, LIFT_PRIOR, RULES };

// ---------------------------------------------------------------- checks
function selfTest() {
  let pass = 0, bad = 0;
  const ok = (cond, label) => { if (cond) { pass++; console.log('  ok   ' + label); } else { bad++; console.log('  FAIL ' + label); } };
  const inputs = { sessions_14d: 137, reach_share: 1, proximity: 0.8, change_type: 'cta_promote' };
  const make = (over, tier) => ({ id: 'x', tier: tier || 1, payoff_inputs: Object.assign({}, inputs, over) });

  const a = score(make({}));
  ok(a.below_minimum === true && a.traffic_class === 'below_minimum', '137 sessions in 14 days is below_minimum (about 62 per version)');
  ok(a.per_version_sessions_14d === 61.7, 'per version at day 14 is 61.7');
  ok(a.days_to_100_per_version === 22.7 && a.days_effective === 14, '100 per version would take 22.7 days; the test is capped at 14');
  ok(a.eligible_to_start === true, '137 passes the plugin start gate (100 sessions)');

  ok(score(make({ sessions_14d: 223 })).below_minimum === false, '223 sessions is the smallest count that can reach 100 per version in 14 days');
  ok(score(make({ sessions_14d: 222 })).below_minimum === true, '222 sessions is still below_minimum');
  const wide = score(make({ sessions_14d: 526 }));
  ok(wide.below_minimum === false && wide.days_effective === 7, '526 sessions (the whole site) is decidable at the 7 day minimum');
  ok(score(make({ sessions_14d: 300 })).days_effective > 7 && score(make({ sessions_14d: 300 })).days_effective < 14, '300 sessions needs between 7 and 14 days');

  ok(score(make({ sessions_14d: 41 })).traffic_class === 'below_minimum_not_eligible', '41 sessions fails the start gate as well');
  ok(score(make({ sessions_14d: 0 })).score === 0, 'zero sessions scores 0 without crashing');

  const small = score(make({ change_type: 'color' }));
  const bold = score(make({ change_type: 'cta_add' }));
  ok(bold.score > small.score * 5, 'at 137 sessions a bold change outscores a small one by more than 5 times');
  ok(Math.abs(bold.score / small.score - 25) < 0.5, 'when a test is too small to detect the effect, score grows with lift squared: 5 times the lift is 25 times the score');
  const wideBold = score(make({ change_type: 'cta_add', sessions_14d: 526 }));
  ok(wideBold.power_factor < 1 && wideBold.mde_relative > 0.5, 'even at 526 sessions the smallest detectable lift (about 109 percent at a 6 percent baseline) is far above any prior');

  ok(score(make({ proximity: 0.4 })).score < score(make({ proximity: 0.8 })).score, 'a candidate closer to the conversion scores higher');
  ok(score(make({ reach_share: 0.35 })).score < score(make({ reach_share: 1 })).score, 'fewer sessions reaching the element scores lower');
  ok(score(make({}, 3)).score === 0 && score(make({}, 3)).excluded_tier3 === true, 'tier 3 scores 0 and is excluded');
  ok(score(make({}, 2)).needs_owner_approval_unless_full === true, 'tier 2 is marked as needing the owner unless autonomy is full');

  const lib = score(make({ library_n: 3, library_lift: 0.30 }));
  ok(Math.abs(lib.lift_used - (3 * 0.30 + 3 * 0.10) / 6) < 1e-9, 'three concluded similar tests pull the lift halfway from the prior to their mean');

  const ranked = rank([
    { id: 'low-but-decidable', tier: 1, payoff_inputs: { sessions_14d: 526, reach_share: 1, proximity: 0.2, change_type: 'color' } },
    { id: 'high-but-below', tier: 1, payoff_inputs: { sessions_14d: 137, reach_share: 1, proximity: 1, change_type: 'cta_add' } },
    { id: 'not-eligible', tier: 1, payoff_inputs: { sessions_14d: 41, reach_share: 1, proximity: 1, change_type: 'cta_add' } },
    { id: 'tier3', tier: 3, payoff_inputs: { sessions_14d: 526, reach_share: 1, proximity: 1, change_type: 'offer' } },
  ]);
  ok(ranked.map((r) => r.id).join(',') === 'low-but-decidable,high-but-below,not-eligible,tier3', 'ranking puts decidable first, then below_minimum, then not eligible, then tier 3');

  let threw = false;
  try { score(make({ proximity: 1.5 })); } catch (e) { threw = /proximity/.test(e.message); }
  ok(threw, 'proximity above 1 is refused');
  threw = false;
  try { score(make({ change_type: 'sparkle' })); } catch (e) { threw = /unknown change_type/.test(e.message); }
  ok(threw, 'an unknown change_type is refused');

  console.log(bad === 0 ? '\nAll ' + pass + ' checks passed.' : '\n' + bad + ' of ' + (pass + bad) + ' checks FAILED.');
  process.exit(bad === 0 ? 0 : 1);
}

if (require.main === module) {
  const arg = process.argv[2];
  if (arg === '--test') selfTest();
  else if (!arg) { console.error('usage: node payoff.js <candidate.json> | --test'); process.exit(2); }
  else {
    const data = JSON.parse(require('fs').readFileSync(arg, 'utf8'));
    const list = Array.isArray(data) ? data : (Array.isArray(data.candidates) ? data.candidates : null);
    console.log(JSON.stringify(list ? rank(list) : score(data), null, 2));
  }
}
