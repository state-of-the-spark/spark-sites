# Runbook: the weekly run per site (Phase B, self-assigning tests)

Status: written 2026-11-16 against plugin contract 0.3.0 and updated the same day for 0.4.0 (stop date that scales with traffic, payoff score on suggestions, results record, separate gate and build capabilities, charter approval, validate and preview routes). The four role prompts, the scoring code and the dry run exist. The central controller that runs this automatically does not; today a person (Lumen) starts each role by hand.

Roles and files:

| Role | Prompt | Job |
|---|---|---|
| Scout | `agents\scout\PROMPT.md` | looks at pages and data, proposes 3 to 6 candidate tests, scores them |
| Judge | `agents\judge\PROMPT.md` | the Goal Gate; independent of the Scout; pass, hold or fail |
| Builder | `agents\builder\PROMPT.md` | builds the exact variant, previews it, creates the suggestion, posts the verdict, tries to queue |
| Engine | the plugin's nightly job (no AI) | starts the queued test, splits traffic, counts, decides, ships or reverts |
| Auditor | `agents\auditor\PROMPT.md` | after a test starts or ends, and daily: checks what is served, guard metric, speed; reports, never fixes |

The statistics never run on an AI model. Agents choose and build; fixed code measures and decides.

## The weekly order

Per enrolled site, once a week (suggested Monday morning, so a test can start on Monday night's engine run).

| Step | Who | Reads | Writes (all in `agents\runs\<site>\<date>\`) |
|---|---|---|---|
| 0 | Controller (today: Lumen) | the plugin, GA4 | `charter.json`, `traffic.json`, optional `results-library.json` |
| 1 | Scout | step 0 files, `GET /state`, `GET /suggestions`, the live pages in test-visit mode | `state.json`, `screenshots\*.png`, `scout-candidates.json` |
| 2 | Judge | `charter.json`, `scout-candidates.json`, `screenshots\` | `judge-verdicts.json` |
| 3 | Controller | the two files above | `decision.json` (which candidate goes to the Builder, or none, and why) |
| 4a | Builder (one candidate) | candidate, verdict, charter | `builder-<id>.json`, build frames (own preview and the plugin's token preview), a suggestion in the plugin with its payoff score |
| 4b | Controller, with the Judge's login | `gate_post_body` | the Goal Gate verdict recorded on the suggestion (only a login with `spark_living_gate` can post it) |
| 4c | Builder (short second call) | the suggestion id | one queue attempt; the plugin writes the ledger rows (`test_suggested`, `gate_verdict`, `test_queued` or `queue_attempt`) itself |
| 5 | Engine (plugin, nightly) | its own queue | recomputes the running test's stop date; at autonomy `tier1` or `full` with an approved charter, queues the highest-payoff suggestion that passed the gate if nothing runs and nothing is queued (`engine:auto-pick`); starts the queued test when the running one is over and the traffic gate passes |
| 6 | Auditor | `GET /state`, `GET /stats`, `GET /changes`, the live page with `sl_force=A` and `B` | `audit-<test id>-<event>.json`, `screenshots\audit-*.png`, a row in the change log |

Run the Auditor three times in a test's life: `started` (the morning after the engine starts it), `daily` while it runs, `concluded` (the morning after it ends, to check the winner is live or the original is back).

## File shapes handed between roles

- `charter.json`: exactly the plugin's charter (`business_name`, `business_goal`, `primary_conversion`, `secondary_conversions`, `audience`, `brand`, `off_limits`, `autonomy_level`, `speed_budget`, `version`). Copied from `GET /charter` once the owner has approved and saved it. Until then the draft in `charters\<site>.json` is used for dry runs only.
- `traffic.json`, written by the controller from GA4 (never by an AI guess). The plugin's rule since 0.4.0: a test needs 75 sessions in 14 days or more (on its page and device; the whole site for a sitewide test) to start, and its stop date is the days projected to reach 100 sessions per version, 14 at the least and 42 at the most:

```json
{ "site": "example.com", "as_of": "2026-11-11", "window_days": 14, "source": "GA4 property ...",
  "site_total": { "sessions": 526, "desktop": 287, "mobile": 234, "tablet": 5 },
  "pages": [ { "path": "/", "sessions": 137, "desktop": 96, "mobile": 41, "tablet": 0 } ] }
```

- `scout-candidates.json`: see the Scout prompt (candidates, each with element, change, rationale, evidence, tier, payoff inputs and score).
- `judge-verdicts.json`: see the Judge prompt (one verdict per candidate; `gate_post_body` is what the Builder posts to `/gate`).
- `decision.json`, written by the controller:

```json
{ "site": "example.com", "date": "2026-11-16",
  "ranking": [ { "rank": 1, "candidate_id": "c1", "verdict": "pass", "traffic_class": "decidable", "score": 0.14 } ],
  "chosen": "c1",
  "reason": "plain words: why this one, or why none" }
```

Choosing rule (from the roadmap: highest score that clears the traffic minimum): take only candidates the Judge passed; rank them with `payoff.js` (decidable first, then by score); choose the first that is `decidable`. `decidable` now means a result can be reached within 42 days at this traffic (75 sessions in 14 days or more); a candidate at 137 sessions needs 23 days and is decidable. **If none is decidable, choose none**, say so in `reason`, and name the remedies from `payoff-scoring.md` (pool traffic with a whole-site element, raise traffic). Never pick a `below_minimum` candidate to fill the slot; the plugin refuses to start it unless an administrator forces it. If a test is already running, still run steps 1 to 4 so the next one is ready, and keep at most one suggestion queued. At autonomy `tier1` or `full` the plugin's own nightly job also picks, with no controller, the highest-payoff suggestion that has a `pass` verdict against the current approved charter, so keep the payoff fields on every suggestion current (`PATCH /suggestions/{id}`).

- `builder-<id>.json`, `audit-<test id>-<event>.json`: see the prompts.

## What happens at each autonomy level (set in the Charter)

| Level | Scout, Judge, Builder | Queue | Who starts a test | Tier 2 | Tier 3 |
|---|---|---|---|---|---|
| `suggest` | run | the plugin refuses a queue, create-and-start or start request made by an agent (`by` starting `agent:`, or any login without `manage_options`); the owner presses **Queue this test** on the dashboard | the engine, once the owner has queued it; the nightly job never picks | owner only | never |
| `tier1` | run | accepted for a suggestion with a `pass` gate verdict on the current charter version, tier 1 only | the engine, nightly, from the queue; it may also auto-pick the best qualifying suggestion | owner only | never |
| `full` | run | accepted for tiers 1 and 2 | the engine, same as above | agent may queue after a `pass` | never |

In every level, while the charter is empty or a draft (`status` is `draft`: any content change through `PUT /charter` sets it back), the plugin refuses every agent queue, create-and-start and start request, and the nightly job picks nothing. A person approves the charter (`POST /charter/approve` as an administrator, or the **Approve these goals** button under Living Websites, Site charter); an approval whose `by` starts with `agent:` is refused. Approving does not change the version, so verdicts already recorded stay valid.

The Builder always makes one queue call so the plugin's answer is on record. At `suggest` that answer is the refusal (a `queue_attempt` row with status `failed`), and the run ends with a suggestion waiting on the dashboard, a gate verdict beside it and the plugin's own ledger rows. The Auditor only has work once a test is running.

### Logins and capabilities (0.4.0)

The plugin has two capabilities, `spark_living_gate` (post a Goal Gate verdict) and `spark_living_build` (create, patch and queue suggestions, validate and preview a variant). Administrators hold both. Give each role the smallest login that does its job (README, "Separate low-privilege logins"): a **Judge** login with only the gate capability, a **Builder** login with only the build capability, a **Scout** and an **Auditor** login with either one (they only read, and the Auditor posts one `audit` row). A Builder cannot post its own verdict, cannot call `POST /tests`, and cannot approve the charter, whatever `by` it sends. The `goal_gate` key on a suggestion holds the verdict ({verdict, reasons, by, at, charter_version, stale}); `traffic_gate` holds the separate traffic check (the old `gate` key is an alias of it for one version).

sparkmysite.com is the first site and stays at `suggest` until the owner has approved the charter, the first three runs have been read by a person, and the lead counting (Phase A item 4) is confirmed.

## Credentials

The repository is PUBLIC. Nothing secret is ever written to it, to a run folder that is committed, to a screenshot, or to an agent's report.

- Each role receives three values: `SPARK_LIVING_SITE` (the site address), `SPARK_LIVING_USER`, `SPARK_LIVING_APP_PASSWORD` (a WordPress application password, sent as HTTP Basic over HTTPS).
- Supplied as environment variables by whoever starts the agent, or read by the controller from a local untracked file, `agents\.secrets\<site>.env`, one `NAME=value` per line. The folder `agents\.secrets\` is ignored by git (see `agents\.gitignore`); confirm with `git status` before any commit.
- Use a separate WordPress user and application password per role (Scout, Judge, Builder, Auditor). Since 0.4.0 the plugin's routes no longer all need `manage_options`: use the two low-privilege logins described above, so a Builder cannot post its own verdict. Separate logins let the change log's `by` field be trusted, and let one role be switched off without the others. Application passwords can be revoked in the user's profile at any time.
- An agent that finds a secret in something it is about to write stops and reports it without printing it.

## Models

Sonnet for every role. The Judge is the one to upgrade first (a stronger model, run once per proposal), because it is the safety gate and the only role that must resist a persuasive Scout. Everything else is mechanical looking, building and checking.

## Failure handling

- A role that is blocked writes what happened word for word and stops; it does not try a different route. The controller opens a Bug Desk ticket for a failed or refused call it did not expect.
- A refusal by the plugin is an answer, not an error. It is recorded in the result file and the change log.
- An Auditor finding of `issue` with severity `stop_now` goes to a person the same hour. The Auditor does not stop anything. (A per-site kill switch is part of Phase E and is not built.)

## What is still manual

- Writing the charter with the owner and pressing approve (the draft for sparkmysite.com is in `charters\`).
- Starting each role (no controller yet) and supplying `traffic.json` from GA4.
- Living Block tests (a person places the block in the page editor).
- Tier 2 approvals (a tier 2 suggestion can now be created through the plugin; an agent may queue it only at autonomy `full`).
- Anything the plugin cannot do from a selector: a new element in a page.
- Reading the first runs and the owner report.
- The shared results library across sites is not built; the Scout uses the prior table in `payoff-scoring.md`. Each site's plugin now keeps its own results table and serves it at `GET /results` (administrators only); the controller copies it into `results-library.json`.
- Phase A items the system depends on: verified lead counting on live, GA4 connection, speed budget enforcement. (The change ledger with undo and slower weight shifting are built.)
