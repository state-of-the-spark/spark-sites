# Payoff scoring

How the Scout ranks candidate tests, how the Judge checks the ranking, and why this site gets bold tests before small ones. The code is `payoff.js` in this folder (no dependencies; `node payoff.js --test` runs 21 checks; `node payoff.js candidates.json` ranks a file).

## The formula

From the Phase B roadmap: traffic reaching the element, times how far the element sits from the lead, times the expected lift, divided by the days needed to reach a result.

```
score = sessions_reaching x proximity x lift x power_factor / days_needed
```

| Term | Meaning | Where it comes from |
|---|---|---|
| `sessions_reaching` | `sessions_14d` x `reach_share`. Visits in the last 14 days on the page and device the test covers, times the share that get to see the element. | `sessions_14d` is a dated GA4 count supplied by the controller. `reach_share` is 1 for anything above the first screen; below it, an estimate that must say it is an estimate. |
| `proximity` | 0 to 1: how close the element is to a lead. | The scale below. |
| `lift` | Expected relative gain in the lead-side rate, from the prior table, blended with the results library when it has similar tests. | The table below. A prior, not data. |
| `power_factor` | 0 to 1: how likely this test is to show its effect at the sample it can reach. Equals `lift / mde`, capped at 1. | Section "Why bold beats small". This is an addition to the roadmap formula; without it the score treats a test too small to tell anything apart as if it would. |
| `days_needed` | Days to a result, between 7 and 14. | Section "Days needed". |

The score has no unit a person should read into; only the order matters. Doubling the score means a candidate is worth about twice as much testing time.

## Proximity scale

| Value | The element is... | Example |
|---|---|---|
| 1.0 | the lead itself | the phone number, the booking link, the form's submit button |
| 0.8 | a button or link that goes straight to the lead | header button that jumps to the form, a "Book a free call" link |
| 0.6 | a button that goes to a step before the lead | "See the menu" that goes to the packages |
| 0.4 | a section on the way to the lead | the form's introduction, a packages heading |
| 0.2 | a headline or picture | the hero headline |
| 0.1 | something with no click path | a stats row |

## Expected lift prior (relative gain, expected value, deliberately conservative)

**This is a prior, not data.** It is a starting guess so that candidates can be ordered before the first results exist. It is set low on purpose (the expected value of a typical change, not the best case, and published A/B results are skewed toward winners). Every concluded test on every site replaces it, step by step, through the results library (`results-library.md`).

| `change_type` | Expected lift | What it is |
|---|---|---|
| `shape` | 0.02 | button corners, border |
| `color` | 0.03 | button or link colour |
| `wording` | 0.05 | the words on a button or link |
| `style` | 0.05 | other look changes |
| `placement` | 0.08 | moving an element |
| `headline` | 0.08 | the headline's angle or words |
| `visibility` | 0.10 | showing an existing element where it was hidden |
| `cta_promote` | 0.10 | turning a weak text link into a real button |
| `cta_retarget` | 0.12 | sending a main button straight to the lead step |
| `form_length` | 0.12 | fewer fields (tier 2) |
| `block` | 0.12 | swapping a whole block of content |
| `layout` | 0.12 | moving sections (tier 2) |
| `cta_add` | 0.15 | a lead action where none was on screen |
| `offer` | 0.15 | what is offered (tier 2 or 3; never chosen automatically) |

**Blending with the library.** If the library holds `n` concluded similar tests with mean lift `m`: `lift = (n x m + 3 x prior) / (n + 3)`. Three tests count as much as the prior; ten pull it most of the way.

## Days needed, and the traffic classes

The plugin's fixed rules (Spark_Living_Stats): a result needs **100 sessions per version and 7 full days**, and every test stops at **14 days**. A new test starts at 50/50 among the 90 percent of visitors who are not in the permanent 10 percent holdout, so each version gets **45 percent of the page's visits**.

```
per_version_per_day = sessions_14d / 14 x 0.45
days_to_100         = 100 / per_version_per_day
days_needed         = min(14, max(7, days_to_100))
```

Three classes, which decide rank before score does:

| Class | Rule | Meaning |
|---|---|---|
| `decidable` | the test can reach 100 sessions per version inside 14 days (needs 223 or more sessions in 14 days) | ranked first |
| `below_minimum` | it cannot reach 100 per version in 14 days, but the page has 100 or more sessions so the plugin will let it start | **ranked after every decidable candidate.** Under the plugin's current rules such a test can only end at the 14-day stop as "no difference"; it cannot ship a winner. |
| `below_minimum_not_eligible` | fewer than 100 sessions in 14 days, so the plugin refuses to start it | ranked after the above |
| (excluded) | tier 3 | score 0, last, never proposed |

Sessions needed in 14 days: **223** to be decidable at all (14 days needed); **445** to be decidable in the 7 day minimum.

## What this means at low traffic: sparkmysite.com

The homepage had 137 sessions in the 14 days ending 2026-11-11 (96 desktop, 41 phone). That is 61.7 sessions per version by day 14 and would take 22.7 days to reach 100. **No test confined to the homepage can be decided by the rules as they stand.** Only a page or an element with at least 223 sessions in 14 days can. Whole-site elements pool traffic: the whole site had 526 sessions in the same 14 days, which is decidable in the 7 day minimum, but only for an element that exists on every page counted.

So when the Orchestrator finds that no candidate is decidable, it queues nothing, and says so, and names the three remedies: pool traffic (find a whole-site element), raise traffic (ads), or have the owner change the plugin's rule for small sites (for example a lower per-version minimum with a higher certainty bar).

## Why bold beats small here

A test's chance to show a real difference depends on its sample. The smallest relative lift it could call, at a 90 percent call and 80 percent chance of catching a real effect, with a baseline rate `p` (the share of visits that click or submit) and `n` visits per version, is about:

```
mde = 2.12 x sqrt(2 x p x (1 - p) / n) / p
```

With the assumed baseline of 6 percent:

| Sessions in 14 days | Per version at the end | Smallest lift the test could call |
|---|---|---|
| 41 | 18 | 277 percent |
| 137 | 62 | 151 percent |
| 223 | 100 | 119 percent |
| 526 | 237 | 109 percent |
| 1,000 | 450 | 79 percent |
| 5,000 | 2,250 | 35 percent |

Every prior in the table is far below those figures. At this site's traffic even a doubling is hard to call. So the chance that a test shows its effect is roughly `lift / mde` (capped at 1), and the score includes that as `power_factor`. The result: **while a test is too small to see its effect, the score grows with the square of the lift.** Five times the lift is 25 times the score. A colour change (0.03) scores one twenty-fifth of a new call button (0.15) with everything else equal. A small tweak is not just less valuable; it is almost unmeasurable. Hence the Scout's rule: propose changes a visitor would clearly notice, and keep them on the lead.

The same reasoning is why results come at the rate they do: at one page with 137 visits, one 14-day test gives at most one "no difference", about two a month.

## Assumptions to replace

- `baseline_rate` defaults to **0.06**. It is a guess. As soon as the plugin reports a real intent rate for the page, the Scout passes it in.
- The 45 percent share assumes the plugin's start split. The plugin shifts weights nightly (within 20 to 80 percent); the scorer ignores that, which is fair before the first test.
- `reach_share` below the first screen is an estimate until the site records scroll depth.
- The lift prior is a prior.
- The model is a ranking aid, not a forecast. Nothing in it is shown to an owner as a promise.

## How the Judge uses it

The Judge runs `payoff.js` on the Scout's inputs and compares. A different score from the same inputs, or an input that does not match the evidence (an old `sessions_14d`, a `reach_share` that ignores where the element is, a `change_type` that understates a bold change), is a hold. The Judge never fails a candidate for being `below_minimum`; it copies the flag to the Orchestrator.
