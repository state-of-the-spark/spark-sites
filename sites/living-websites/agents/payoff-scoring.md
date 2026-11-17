# Payoff scoring

How the Scout ranks candidate tests, how the Judge checks the ranking, and why this site gets bold tests before small ones. The code is `payoff.js` in this folder (no dependencies; `node payoff.js --test` runs 26 checks; `node payoff.js candidates.json` ranks a file; `pluginPayload()` turns a candidate into the fields `POST /suggestions` and `PATCH /suggestions/{id}` accept). Updated 2026-11-16 for plugin 0.4.0: the 14 day hard stop became a stop that scales with traffic (14 to 42 days).

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
| `days_needed` | Days to a result, between 7 and 42 (the days each version needs to reach 100 sessions at this traffic, 7 at the least). | Section "Days needed". |

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

The plugin's rules from 0.4.0 (Spark_Living_Stats): a result needs **100 sessions per version and 7 full days**. A test's last day is no longer a fixed 14: it is **the number of days projected to reach 100 sessions per version, rounded up, never below 14 and never above 42**. A new test starts at 50/50 among the 90 percent of visitors who are not in the permanent 10 percent holdout, so each version gets **45 percent of the page's visits**.

```
per_version_per_day = sessions_14d / 14 x 0.45
projected_days      = ceil(100 / per_version_per_day)
days_to_result      = max(7, projected_days)        (the days_needed above)
stop_days           = clamp(projected_days, 14, 42) (the test's last day, stored on the test)
```

The plugin refuses to start a test whose `projected_days` is over 42 (fewer than 75 sessions in 14 days), unless an administrator forces it. After the start the nightly job recomputes the stop date from the exposure rate the test has actually had (from day 3 and 20 exposed sessions), within the same 14 to 42 days. The score divides by `min(42, max(7, days_to_100))`, so a slow test scores lower than the same test on a busier page.

Two classes, which decide rank before score does:

| Class | Rule | Meaning |
|---|---|---|
| `decidable` | `projected_days` is 42 or fewer (75 or more sessions in 14 days) | ranked first |
| `below_minimum` | `projected_days` is over 42 | **ranked after every decidable candidate.** The plugin will not start it on its own; forced, it would end at the 42 day stop as "no difference". |
| (excluded) | tier 3 | score 0, last, never proposed |

Boundaries (checked in `payoff.js --test` and in the plugin's own tests): 223 sessions in 14 days gives 14 days, 222 gives 15, 137 gives 23, 100 gives 32, 75 gives 42, 74 gives 43 (too slow). Sessions needed for a 7 day result: 445.

## What this means at low traffic: sparkmysite.com

The homepage had 137 sessions in the 14 days ending 2026-11-11 (96 desktop, 41 phone). Under the old fixed 14 day stop that was 61.7 sessions per version, and **no homepage test could ever be decided**. Under the 0.4.0 rule the same test takes **23 days** (137 sessions give 22.7 days to 100 per version): it can finish, and its stop date is 23 days after it starts. Phone-only tests are still too slow (41 sessions need 76 days). Whole-site elements pool traffic: the whole site had 526 sessions, which reaches a result in 7 days (the stop date is floored at 14), but only for an element that exists on every page counted; such a test uses `scope: "sitewide"` and the whole-site count.

When the Orchestrator finds that no candidate is decidable, it queues nothing, says so, and names the remedies: pool traffic (a whole-site element), or raise traffic (ads).

## Why bold beats small here

A test's chance to show a real difference depends on its sample. The smallest relative lift it could call, at a 90 percent call and 80 percent chance of catching a real effect, with a baseline rate `p` (the share of visits that click or submit) and `n` visits per version, is about:

```
mde = 2.12 x sqrt(2 x p x (1 - p) / n) / p
```

With the assumed baseline of 6 percent (the table counts the sessions a test has at the end of 14 days; a test with a longer stop collects more, up to 100 per version, which is the 119 percent row):

| Sessions in 14 days | Per version at the end | Smallest lift the test could call |
|---|---|---|
| 41 | 18 | 277 percent |
| 137 | 62 | 151 percent |
| 223 | 100 | 119 percent |
| 526 | 237 | 109 percent |
| 1,000 | 450 | 79 percent |
| 5,000 | 2,250 | 35 percent |

Every prior in the table is far below those figures. At this site's traffic even a doubling is hard to call. So the chance that a test shows its effect is roughly `lift / mde` (capped at 1), and the score includes that as `power_factor`. The result: **while a test is too small to see its effect, the score grows with the square of the lift.** Five times the lift is 25 times the score. A colour change (0.03) scores one twenty-fifth of a new call button (0.15) with everything else equal. A small tweak is not just less valuable; it is almost unmeasurable. Hence the Scout's rule: propose changes a visitor would clearly notice, and keep them on the lead.

The same reasoning is why results come at the rate they do: at one page with 137 visits a test takes 23 days, so about one result a month, and it can now be a real one.

## Assumptions to replace

- `baseline_rate` defaults to **0.06**. It is a guess. As soon as the plugin reports a real intent rate for the page, the Scout passes it in.
- The 45 percent share assumes the plugin's start split. The plugin shifts weights nightly (within 20 to 80 percent, and not before each version has 30 exposures); the scorer ignores that, which is fair before the first test.
- `reach_share` below the first screen is an estimate until the site records scroll depth.
- The lift prior is a prior.
- The model is a ranking aid, not a forecast. Nothing in it is shown to an owner as a promise.

## How the Judge uses it

The Judge runs `payoff.js` on the Scout's inputs and compares. A different score from the same inputs, or an input that does not match the evidence (an old `sessions_14d`, a `reach_share` that ignores where the element is, a `change_type` that understates a bold change), is a hold. The Judge never fails a candidate for being `below_minimum`; it copies the flag to the Orchestrator.
