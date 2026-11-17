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

// The plugin's rules from 0.4.0 (Spark_Living_Stats): 100 sessions per version, 7 day minimum, a hard stop that scales with
// traffic (the days projected to reach 100 per version, never below 14 or above 42), permanent 10 percent holdout. The start
// allocation is 50/50 of the non-holdout visitors, so each version gets 45 percent. A test whose projection is over 42 days is
// refused at start (75 sessions in 14 days is the smallest count that passes).
const RULES = Object.freeze({
  MIN_PER_VERSION: 100,
  MIN_DAYS: 7,
  MIN_STOP_DAYS: 14,
  MAX_STOP_DAYS: 42,
  ELIGIBILITY_SESSIONS: 75,
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

const PAYOFF_VERSION = 'payoff.js 2026-11-16';

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
  const projectedDays = Number.isFinite(daysToMin) ? Math.ceil(daysToMin - 1e-9) : null; // what the plugin works out (rounded up)
  const daysToResult = projectedDays === null ? null : Math.max(RULES.MIN_DAYS, projectedDays); // 7 at the least; over 42 means too slow
  const daysEffective = Math.min(RULES.MAX_STOP_DAYS, Math.max(RULES.MIN_DAYS, daysToMin)); // what the score divides by
  const belowMinimum = projectedDays === null || projectedDays > RULES.MAX_STOP_DAYS; // cannot reach 100 per version inside 42 days
  const eligible = !belowMinimum; // the plugin's start gate (75 sessions in 14 days or more)

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
    traffic_class: belowMinimum ? 'below_minimum' : 'decidable',
    below_minimum: belowMinimum,
    eligible_to_start: eligible,
    projected_days: projectedDays,
    days_to_result: daysToResult,
    stop_days: projectedDays === null ? RULES.MAX_STOP_DAYS : Math.max(RULES.MIN_STOP_DAYS, Math.min(RULES.MAX_STOP_DAYS, projectedDays)),
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
  if (r.excluded_tier3) return 2;
  if (r.traffic_class === 'decidable') return 0;
  return 1; // below_minimum: cannot reach a result inside 42 days
}

// What to send to the plugin (POST /suggestions or PATCH /suggestions/{id}): the score and its inputs, in the plugin's field names.
// The plugin recomputes days to result itself and keeps both figures; it flags a disagreement of more than a day.
function pluginPayload(c) {
  const p = c.payoff_inputs || c;
  const r = score(c);
  return {
    payoff_score: r.score,
    payoff_version: PAYOFF_VERSION,
    payoff_inputs: {
      sessions_reaching: r.sessions_reaching,
      proximity: p.proximity,
      expected_lift: r.lift_used,
      days_to_result: r.days_to_result,
      traffic_class: r.traffic_class,
      sessions_14d: p.sessions_14d,
      reach_share: p.reach_share,
      change_type: p.change_type,
      baseline_rate: r.baseline_rate_used,
      power_factor: r.power_factor,
    },
  };
}

// Highest first; decidable before below_minimum before excluded (tier 3). Ties: id, so the output is stable.
function rank(list) {
  return list.map(score)
    .sort((a, b) => classRank(a) - classRank(b) || b.score - a.score || String(a.id).localeCompare(String(b.id)))
    .map((r, i) => Object.assign({ rank: i + 1 }, r));
}

module.exports = { score, rank, pluginPayload, LIFT_PRIOR, RULES, PAYOFF_VERSION };

// ---------------------------------------------------------------- checks
function selfTest() {
  let pass = 0, bad = 0;
  const ok = (cond, label) => { if (cond) { pass++; console.log('  ok   ' + label); } else { bad++; console.log('  FAIL ' + label); } };
  const inputs = { sessions_14d: 137, reach_share: 1, proximity: 0.8, change_type: 'cta_promote' };
  const make = (over, tier) => ({ id: 'x', tier: tier || 1, payoff_inputs: Object.assign({}, inputs, over) });

  const a = score(make({}));
  ok(a.below_minimum === false && a.traffic_class === 'decidable', '137 sessions in 14 days is decidable under the 42 day rule (it was below_minimum under the old 14 day rule)');
  ok(a.per_version_sessions_14d === 61.7, 'per version at day 14 is 61.7');
  ok(a.days_to_100_per_version === 22.7 && a.projected_days === 23 && a.days_to_result === 23 && a.stop_days === 23, '100 per version takes 22.7 days: 23 rounded up, so the test\'s stop date is 23 days');
  ok(a.eligible_to_start === true, '137 passes the plugin start gate (75 sessions)');

  ok(score(make({ sessions_14d: 223 })).projected_days === 14 && score(make({ sessions_14d: 223 })).stop_days === 14, '223 sessions gives 14 days (the old rule\'s boundary)');
  ok(score(make({ sessions_14d: 222 })).projected_days === 15, '222 sessions gives 15 days');
  ok(score(make({ sessions_14d: 75 })).projected_days === 42 && score(make({ sessions_14d: 75 })).below_minimum === false, '75 sessions gives 42 days and can start');
  ok(score(make({ sessions_14d: 74 })).projected_days === 43 && score(make({ sessions_14d: 74 })).below_minimum === true && score(make({ sessions_14d: 74 })).eligible_to_start === false, '74 sessions gives 43 days: below the minimum, cannot start');
  const wide = score(make({ sessions_14d: 526 }));
  ok(wide.below_minimum === false && wide.days_effective === 7 && wide.days_to_result === 7 && wide.stop_days === 14, '526 sessions (the whole site) reaches a result in 7 days; the stop date is floored at 14');
  ok(score(make({ sessions_14d: 300 })).days_to_result === 11, '300 sessions needs 11 days');
  ok(score(make({ sessions_14d: 5000 })).days_to_result === 7 && score(make({ sessions_14d: 5000 })).stop_days === 14, 'a lot of traffic: 7 day minimum, 14 day floor on the stop');

  ok(score(make({ sessions_14d: 41 })).traffic_class === 'below_minimum' && score(make({ sessions_14d: 41 })).projected_days === 76, '41 sessions (phones only) would need 76 days: below the minimum');
  ok(score(make({ sessions_14d: 0 })).score === 0 && score(make({ sessions_14d: 0 })).days_to_result === null && score(make({ sessions_14d: 0 })).stop_days === 42, 'zero sessions scores 0 without crashing; no projection, the stop would be the 42 day ceiling');

  const small = score(make({ change_type: 'color' }));
  const bold = score(make({ change_type: 'cta_add' }));
  ok(bold.score > small.score * 5, 'at 137 sessions a bold change outscores a small one by more than 5 times');
  ok(Math.abs(bold.score / small.score - 25) < 0.5, 'when a test is too small to detect the effect, score grows with lift squared: 5 times the lift is 25 times the score');
  const wideBold = score(make({ change_type: 'cta_add', sessions_14d: 526 }));
  ok(wideBold.power_factor < 1 && wideBold.mde_relative > 0.5, 'even at 526 sessions the smallest detectable lift (about 109 percent at a 6 percent baseline) is far above any prior');
  ok(score(make({ sessions_14d: 137 })).score < score(make({ sessions_14d: 223 })).score, 'a longer wait lowers the score: the same candidate scores less at 137 sessions (23 days) than at 223 (14 days)');

  ok(score(make({ proximity: 0.4 })).score < score(make({ proximity: 0.8 })).score, 'a candidate closer to the conversion scores higher');
  ok(score(make({ reach_share: 0.35 })).score < score(make({ reach_share: 1 })).score, 'fewer sessions reaching the element scores lower');
  ok(score(make({}, 3)).score === 0 && score(make({}, 3)).excluded_tier3 === true, 'tier 3 scores 0 and is excluded');
  ok(score(make({}, 2)).needs_owner_approval_unless_full === true, 'tier 2 is marked as needing the owner unless autonomy is full');

  const pp = pluginPayload({ id: 'x', tier: 1, payoff_inputs: Object.assign({}, inputs) });
  ok(pp.payoff_version === PAYOFF_VERSION && pp.payoff_score === a.score && pp.payoff_inputs.days_to_result === 23 && pp.payoff_inputs.traffic_class === 'decidable' && pp.payoff_inputs.sessions_reaching === 137 && pp.payoff_inputs.expected_lift === 0.1, 'pluginPayload gives the plugin the score, the version and the inputs in its own field names');

  const lib = score(make({ library_n: 3, library_lift: 0.30 }));
  ok(Math.abs(lib.lift_used - (3 * 0.30 + 3 * 0.10) / 6) < 1e-9, 'three concluded similar tests pull the lift halfway from the prior to their mean');

  const ranked = rank([
    { id: 'low-but-decidable', tier: 1, payoff_inputs: { sessions_14d: 526, reach_share: 1, proximity: 0.2, change_type: 'color' } },
    { id: 'high-but-below', tier: 1, payoff_inputs: { sessions_14d: 60, reach_share: 1, proximity: 1, change_type: 'cta_add' } },
    { id: 'lower-but-below', tier: 1, payoff_inputs: { sessions_14d: 41, reach_share: 1, proximity: 1, change_type: 'cta_add' } },
    { id: 'tier3', tier: 3, payoff_inputs: { sessions_14d: 526, reach_share: 1, proximity: 1, change_type: 'offer' } },
  ]);
  ok(ranked.map((r) => r.id).join(',') === 'low-but-decidable,high-but-below,lower-but-below,tier3', 'ranking puts decidable first, then below_minimum (cannot finish in 42 days), then tier 3');

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
