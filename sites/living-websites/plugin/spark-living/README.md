# Spark Living v0.4.0

Living Websites by Spark Sites. A WordPress plugin that runs one split test at a time on a site, keeps what brings in more leads, logs every change, and reports through a REST API.

Spec: `spark-sites/decisions/2026-11-12-living-websites-build-plan-DRAFT.md` (sections 3 and 4.1 are the contract). Live on sparkmysite.com since 2026-11-13 (0.4.0 deployed 2026-11-16, see the audit file `audit/2026-11-13-live-install.md`). On 2026-11-12 it was first run in WordPress Playground (PHP 8.2, WordPress 7.1, SQLite) and the flows listed in "Not finished or not verified" were exercised.

Requirements: WordPress 6.3 or newer, PHP 8.1 or newer. Gravity Forms is optional (server-side `form_submit` needs it). No npm, no build step, no external libraries.

## Install

1. Copy the `spark-living` folder into `wp-content/plugins/`.
2. Activate it. Activation creates the `{prefix}spark_living_events` table, registers the `/living/` address, and schedules the nightly job.
3. Open **Living Websites** in the wp-admin menu. Visit `/living/` while logged in as an administrator to see the same view on the front end. Anyone else gets the theme's 404.
4. For the brain: create an application password for an administrator (Users, Profile, Application Passwords) and call the REST API below over HTTPS.
5. Pressable page cache: exclude `/wp-json/spark-living/` from caching (the endpoint also sends `Cache-Control: no-store`). The plugin flushes the page cache itself (see "Cache flush" below); this is only the one-time exclusion.

Deactivating stops the nightly job and keeps all data. There is no uninstall routine in v0.1 (data is kept on delete).

## How to define a test

A test is one element, two variants: A (current) and B (challenger). Only one test can run at a time. Rules from section 3 are fixed in `Spark_Living_Stats` constants.

### Option 1: Living Block (Gutenberg)

1. Create the test through the REST API (or an admin draft) with `element_type: "block"`. Note the returned `id`.
2. In the editor insert **Living Block**. It contains two **Living Variant** blocks. Put normal blocks inside each one (A = current, B = challenger). Set the block's **Experiment ID** in the sidebar to the test id.
3. Start the test. Both variants are in the cached HTML with data attributes; the head script keeps one and removes the other before first paint. When the test is not running (or no winner is promoted), only variant A is output.

### Option 2: Selector swap (Divi and any non-block element)

Create a test whose `target` is a CSS selector and whose B variant lists changes. Allowed ops: `text`, `href`, `add_class`, `remove_class`, `style`.

```json
POST /wp-json/spark-living/v1/tests
{
  "name": "Header call to action wording",
  "element_type": "selector",
  "target": ".header-cta a",
  "hypothesis": "Naming the outcome beats naming the action.",
  "tier": 1,
  "start": true,
  "variants": {
    "A": { "label": "Free Quote" },
    "B": { "label": "Get my free estimate", "changes": [
      { "op": "text", "value": "Get my free estimate" },
      { "op": "style", "value": "background:#1f6b3a;color:#ffffff" }
    ] }
  }
}
```

The wp-admin page has a simple form for the same thing (it also takes a device and a CSS snippet, see below).

### Option 3: Visibility / CSS variant

For a test where the challenger is not a text or link change but a different look or a different "is it there at all". The use case: the original hides the header "Get started" button on mobile, the challenger shows it.

A challenger (variant B of a selector test) may carry a small CSS snippet in `variants.B.css`. It is applied only while that variant is active: the head script creates a `<style id="spark-living-css-{id}">` element for B sessions before first paint (so there is no flicker), and never for A or the holdout. The script also puts a class on `<html>` for every test that applies to the session, `sl-v-{id}-A` or `sl-v-{id}-B`, so a snippet can also be scoped by that class if you want. A test needs either `changes`, or `css`, or both; one with neither is refused (400).

```json
POST /wp-json/spark-living/v1/tests
{
  "name": "Header Get started button on mobile",
  "element_type": "selector",
  "target": "header a.et_pb_button[href='#contact']",
  "hypothesis": "Showing the header button on mobile brings more enquiries.",
  "device": "mobile",
  "tier": 1,
  "sessions_14d": 240,
  "start": true,
  "variants": {
    "A": { "label": "Hidden on mobile (current)" },
    "B": { "label": "Shown on mobile",
           "css": "header a.et_pb_button[href='#contact']{display:inline-block!important}" }
  }
}
```

* **Write the snippet so it beats the original rule.** The original hides the button with a theme or Divi rule, so the snippet normally needs `!important` or a more specific selector.
* **On Divi, `!important` alone is not enough: the snippet must also out-rank Divi's own selector (specificity).** Divi prints its hiding rules (for example `.et_pb_button_0{display:none!important}` inside media queries) in a `<style>` in the page body, after the button. With equal specificity and `!important` on both sides, the later rule wins, and the plugin's style in the head loses. Staging example (2026-11-12, test 46894): `@media (max-width:980px){.et_pb_button_0{display:inline-block !important}}` did not show the button. Raising specificity did: `.et_pb_section a.et_pb_button.et_pb_button_0{display:inline-block!important;...}`. Test each candidate by injecting it in a browser on the real page before saving it as a test.
* **Sanitized on save** (`Spark_Living_Util::sanitize_css()`): every `<`, backslash, `@import`, `url(`, `expression` and `javascript:` is removed (repeatedly, so a word cannot be rebuilt from what is left), control characters are dropped, and the snippet is cut at 2000 characters. A snippet that is empty after that and has no `changes` is refused. Only B carries a snippet; a `css` on A is ignored. Images or fonts by URL are therefore not possible in a snippet.
* **Exposure** is logged once per session when the page loads for a session the test applies to (see "Device scope"), as `exposure` for A, B or H. The target element must exist in the page HTML, hidden or not; a page without it logs nothing, because that session never had the element to test. The target is not hidden while the page loads for a CSS-only variant (nothing needs to be swapped).
* **Clicks:** a click on the target selector counts as `cta_click`, once per session, without the element needing `data-living-cta`. While a test is running only that test's target counts; with none running, a promoted CSS winner's target counts for the site watch. `tel_click`, `form_start` and `form_submit` work as before.
* **Shipping:** `ship_b` promotes the snippet like any winner; living visitors get it, the holdout keeps the original.

### Device scope

An experiment has a `device` field: `all` (the default), `mobile` or `desktop`. **Mobile means a viewport 980px wide or narrower** (Divi 4's mobile-menu breakpoint); desktop is anything wider. Any other value is refused with 400.

* The decision is made in the browser, in the inline head script (`matchMedia('(max-width: 980px)')`, falling back to `innerWidth`), once per page load. The server looks at nothing about the device (no user-agent sniffing), so the page HTML and the inline config are the same for every visitor and page caching keeps working. A phone user agent on a wide window counts as desktop; a narrow desktop window counts as mobile.
* For a device-scoped test only matching sessions are assigned, exposed and counted. A session on the other device sees the original, and the script logs nothing for it: no exposure, no clicks, no events at all (its assignment cookie is set to `0:L` or `0:H`, so a Gravity Forms submission is not attributed to the test either). The same holds for a promoted winner: its device scope stays attached, and non-matching sessions see the original and are not counted in the lift.
* When the holdout falls on the matching device it is exposed as H as usual.
* Block tests (`element_type: "block"`) accept `device` too.
* Eligibility counts for a device-scoped test are sessions on that device (see "Eligibility at start").

### Eligibility at start, and the stop date (0.4.0)

**The rule changed in 0.4.0.** Before, a test needed 100 sessions in 14 days and was force-stopped at 14 days, so a page with about 137 sessions in 14 days gave each version about 62 and every test ended "no difference". Now a test's last day scales with its traffic.

* **Days to result.** From the traffic the caller states (`sessions_14d`), with the 50/50 split and the 10 percent holdout, each version gets 45 percent of the visits: `projected_days = ceil(100 / (sessions_14d / 14 x 0.45))`.
* **Start gate: can this reach a result within 42 days?** A test is refused unless `projected_days` is **42 or fewer**, which means **75 or more sessions in the last 14 days** (`Spark_Living_Stats::ELIGIBILITY_SESSIONS`, reported in `GET /state` rules). The plugin has no pageview data, so the caller (the brain, from GA4) sends the number as `sessions_14d`: for a page test, the sessions on the target page (on that device for a device-scoped test); for a sitewide test, the sessions on the whole site. The plugin cannot check that it is true.
* **Stop date.** The test's hard stop is `max_days = clamp(projected_days, 14, 42)`, stored on the test when it starts (`max_days`, `stop_basis`, `stop_updated_at`). The 7 day minimum and the 90 percent / 10 percent win and loss rules are unchanged. Examples: 223 sessions in 14 days gives 14 days, 222 gives 15, 137 gives 23, 100 gives 32, 75 gives 42, 74 gives 43 (refused unless forced).
* **Nightly recompute.** Each night, before it decides, the job recomputes `max_days` from the exposure rate the test has actually had (once it has run 3 days and exposed 20 sessions; before that the stated traffic is used): `100 / ((exposures in A and B / days) x the smaller traffic share)`, rounded up, within 14 and 42. The smaller share is 50 percent until each version has the exposure floor (30). A change writes a `stop_date_changed` ledger row with the old and new day count and date and the reason; no change writes nothing.
* **A test that was running when 0.4.0 arrived** gets its stop date from the same code during the upgrade (computed from its stated `start_sessions_14d`, so it does not jump), with one `stop_date_changed` row saying the rule changed. Its start time, variants, weights and events are not touched.
* **Dashboard.** The running card reads "Day N of M. Started <date>. Earliest read <date>. Stops <date> at the latest." Suggestion cards read "At this traffic a result takes about N days." (amber, with "this would need a forced start", only when N is over 42).

```json
POST /wp-json/spark-living/v1/tests/123/start
{ "sessions_14d": 137 }
```

| Request | Result |
|---|---|
| `sessions_14d` missing | 400 `spark_living_eligibility_missing`, with the reason and the bar (75) |
| `sessions_14d` not a whole number of 0 or more | 400 `spark_living_sessions_invalid` |
| `sessions_14d` below 75 | 422 `spark_living_not_eligible`, naming the number, the days it would take and the 42 day limit |
| 75 or more | the test starts; `start_sessions_14d` and `max_days` are stored, `forced_start` is false |
| `force: true` (administrator) with a missing or low number | the test starts; stored as `forced_start: true` plus the number given (0 if none); `max_days` is the 42 day ceiling |
| `force: true` with 75 or more | starts normally; `forced_start` stays false because the bar was met |
| `force: true` from anyone without `manage_options`, or from an agent | refused |

The state errors come first: a missing test is 404, a test that is not a draft, suggested, queued or awaiting approval is 409. **`POST /tests` with `start: true` follows the same rule** (send `sessions_14d` or `force: true` in the body); it is checked before anything is written, so a refusal leaves no draft behind. Tier 2 tests created through `POST /tests` are still created as `awaiting_approval` and need the number when they are approved and started.

Tier 2 tests (offer, price, guarantee, legal claim) created through `POST /tests` are `awaiting_approval` and only start through the explicit approve button (admin) or `POST /tests/{id}/start`.

### Measuring

* A click on a selector test's own target element records `cta_click` (once per session, for A, B and holdout sessions alike, whatever the variant changes). Mark any other call to action with `data-living-cta` to record `cta_click` too.
* `a[href^="tel:"]` clicks record `tel_click` automatically.
* The first focus inside any form records `form_start`.
* Gravity Forms submissions record `form_submit` on the server (`gform_after_submission`), using the visitor's cookies.
* GA4: when `gtag` exists, exposures send `living_exposure` and everything else sends `living_conversion`, each with `living_experiment`, `living_variant` and (for conversions) `living_event`. Register those as custom dimensions in GA4. On sites that load Google Analytics through Google Tag Manager there is no `gtag`; when `window.dataLayer` exists the plugin pushes `{event: 'living_exposure', ...}` / `{event: 'living_conversion', ...}` there instead. **A GTM tag is needed to forward these events to GA4** (a Custom Event trigger on `living_exposure` and `living_conversion`, with the `living_experiment`, `living_variant` and `living_event` dataLayer variables); the plugin changes nothing in GTM or GA. AJAX Gravity Forms confirmations are mirrored to GA4 as `living_conversion` with `living_event = form_submit` (GA4 only; the database row is the server-side one).

## REST API (brain)

Use an application password (HTTP Basic over HTTPS). Since 0.4.0 not every route needs `manage_options`: see "Phase B", "Capabilities". Administrators can call everything. Base: `/wp-json/spark-living/v1`.

| Method and route | Purpose |
|---|---|
| `GET /state` | Running test with live numbers and the current decision, `sources` (the data source list), `queued` (draft and awaiting-approval tests, as before), `suggestions` and `queue` (0.2.0, see below), promoted winners, cumulative lift, `tally` (evolved, keep_a, no_difference, guard_blocked, reverted), `evolutions` (= tally.evolved), rules |
| `GET /stats?experiment_id=ID` | Stats for one test (the running test when omitted); concluded tests return their stored final snapshot |
| `GET /log?per_page=50&page=1` | Evolution log, newest first; `X-WP-Total` header |
| `POST /tests` | Create a test (body above; optional `device`, optional `variants.B.css`). `start: true` starts it if none is running (409 otherwise) and needs `sessions_14d` (or `force: true`) like `/start` |
| `POST /tests/{id}` | Edit only `change_type`, `a_label` and `b_label` (see "Current versus Challenger"). Allowed in any status, including running; nothing else is touched. 400 for an unknown `change_type` or an empty body; an empty string clears a field |
| `POST /tests/{id}/start` | Start a draft, or approve and start a Tier 2 test. Body `{"sessions_14d": N}`, N of 75 or more (0.4.0; it was 100), or `{"force": true}` (administrator; recorded). 400 or 422 otherwise. An agent (`by` starting `agent:`, or a login without `manage_options`) must also pass the gate, tier, autonomy and approved-charter checks and cannot force |
| `POST /tests/{id}/conclude` | Body `{"verdict":"ship_b" \| "keep_a" \| "no_difference","note":"..."}`; logs it and promotes B on `ship_b` |
| `GET /suggestions` | `{suggestions: [...], queue: [...]}`. Suggestions by priority (1 first), the queue in start order. Each item carries `traffic` (sessions, as_of, age_days, meets_min, fresh), `gate` (ok, code, message) and `queue_position` (0 when not queued) |
| `POST /suggestions` | Create a suggested test (fields below). 201 with the new test; 400 with a specific `code` for any invalid field. Never starts anything |
| `POST /suggestions/{id}/queue` | Suggested to queued, at the end of the line. 409 unless the test is `suggested`. Does not start it |
| `POST /suggestions/{id}/unqueue` | Queued back to suggested ("Remove from queue"). It keeps its priority |
| `POST /suggestions/{id}/dismiss` | Suggested or queued to dismissed. The record is kept; it leaves every list |
| `PATCH /suggestions/{id}` | (0.4.0) Edit the payoff fields, the traffic count (`sessions_14d` with `sessions_as_of`) and the priority of a suggested or queued test |
| `POST /suggestions/{id}/gate`, `POST /suggestions/{id}/preview-token`, `POST /validate-variant`, `POST /charter/approve`, `GET /results` | (0.4.0) See "Phase B" |
| `POST /event` (public) | Browser events only; nonce-free, validated, rate limited, `no-store` |

## Phase A: Foundations (0.3.0)

Six additions that every later autonomous feature depends on. Nothing here starts, stops or changes a test by itself.

### 1. Site Charter

One option, `spark_living_charter` (a JSON string). Empty until someone saves it (version 0, autonomy `suggest`). Fields: `business_name`, `business_goal`, `primary_conversion` {`type` form|call|booking|purchase, `description`, `selector`}, `secondary_conversions` (same shape, up to 10), `audience`, `brand` {`colors`, `fonts`, `button_shape`, `voice_notes`}, `off_limits` (up to 50 strings), `autonomy_level` (`suggest` | `tier1` | `full`), `speed_budget` {`load_ms`, `button_visible_ms`, `max_added_kb`}, `version`, `updated_at`, `updated_by`.

* `GET /charter` returns it. `PUT /charter` saves it: fields you leave out keep their value, `brand`, `primary_conversion` and `speed_budget` merge field by field, lists are replaced, unknown keys are dropped, `version`/`updated_at` are never taken from input. A bad enum or a negative budget is a 400. `updated_by` (optional) names the actor, default the signed-in user. **The version goes up by one on every save**, even an identical one. 401 without credentials.
* wp-admin: **Living Websites, Site charter** (a form posting through the same code). The dashboard shows a read-only **Site goals** card on `/living/`, the shortcode and wp-admin. `GET /state` carries `charter`.
* Autonomy: `suggest` agents may never queue; `tier1` agents may queue risk tier 1; `full` agents may queue tier 1 and 2. Tier 3 is never queued by an agent.

### 2. Change Ledger

Table `{prefix}spark_living_changes`, created by `Spark_Living_Upgrade` (dbDelta, runs on `init` when the stored versions differ, safe to run twice). Columns: `id`, `created_at` (UTC), `kind`, `subject_type`, `subject_id`, `summary` (300), `before_json`, `after_json`, `proposed_by`, `gate_verdict` (pass|fail|hold|na), `gate_reasons`, `gate_by`, `charter_version`, `evidence_json`, `result_json`, `undo_json`, `undone_at`, `status` (applied|undone|failed). Kinds: test_suggested, test_queued, test_unqueued, test_dismissed, test_started, test_concluded, winner_applied, reverted, weights_changed, style_fix, ad_change, charter_update, rows_removed, plugin_update, other.

The engine writes a row for every suggestion, queue, unqueue, dismiss, start, conclusion, winner, auto-revert, every weight change by the nightly job (before and after, and the exposure counts that caused it), every charter save and every plugin version change, all through `Spark_Living_Ledger::record()`. A refused agent queue attempt is a `test_queued` row with status `failed`. Goal Gate verdicts are `other` rows (subject_type `test`).

* `GET /changes?per_page=20&page=1&kind=&subject_id=`: newest first, `X-WP-Total`, `X-WP-TotalPages`. The `*_json` fields hold decoded values (objects), not strings; each row also has `can_undo`.
* `POST /changes`: for outside agents. Required `kind` and `summary`; optional `subject_type`, `subject_id`, `before_json`/`before`, `after_json`/`after`, `proposed_by`, `gate_verdict`, `gate_reasons`, `gate_by`, `evidence_json`, `result_json`, `status` (applied|failed). No undo payload is accepted, so a posted row is never undoable. 201 with the row.
* `POST /changes/{id}/undo` (optional `by`): implemented for a queued test (takes it off the queue), a charter save (only while it is still the latest charter version) and a weights change (only while the test runs). Anything else is 409 `spark_living_not_undoable`. The undo is recorded as a new row and the original is marked `undone`.
* Dashboard **Change log**: newest 10 rows in plain words with the gate verdict as a tag and an Undo button where it works. `GET /state` carries `changes` (newest 10).
* **Speed (record only).** Post `{"kind":"other","subject_type":"speed","summary":"...","after_json":{"load_ms":880,"button_visible_ms":410,"added_kb":4.6}}`; `GET /state` returns the last one as `speed` ({load_ms, button_visible_ms, added_kb, measured_at, measured_by, change_id}, or null) and the Site goals card shows it beside the charter budget. Nothing enforces the budget.
* **Backfill.** The first upgrade to 0.3.0 writes rows for what already exists, derived from stored post data only: first recorded activity (install), each suggestion at its stored `suggested_at`, queued/dismissed times, each started test at its real `start_date`, concluded tests, winners, reverts, and a note when a running test already sits off 50/50 (time not recorded). Then the `plugin_update` row. Rows are flagged `evidence_json.backfill`.

### 3. Goal Gate record

New test meta: `gate_verdict`, `gate_reasons` (600), `gate_by`, `gate_at`, `gate_charter_version`. The risk tier is the existing `tier` field (now 1, 2 or 3); responses also show it as `risk_tier`.

* `POST /suggestions/{id}/gate` body `{verdict: pass|fail|hold, reasons, by, risk_tier?, charter_version?}`. `by` is required; `reasons` is required for fail and hold; `risk_tier` sets `tier`; `charter_version` (optional) is the version the judge read, default the current one. Allowed on suggested, queued and draft tests. Writes a ledger row.
* `POST /suggestions/{id}/queue` takes an optional `by`. A `by` starting with `agent:` is refused (403) unless the autonomy level allows its tier and the suggestion has `gate_verdict` = `pass` with `gate_charter_version` equal to the CURRENT charter version. Codes: `spark_living_agent_not_allowed` (level suggest), `spark_living_agent_tier3`, `spark_living_agent_tier` (tier 2 at level tier1), `spark_living_gate_missing` (no verdict, fail or hold), `spark_living_gate_stale`. No `by` or any other `by` is a human click and is recorded with gate `na`. `unqueue`, `dismiss`, `/tests/{id}/start` and `/conclude` also accept `by` for the ledger but are not gated.
* The suggestion and queue cards show the verdict, reasons, judge, charter version, risk tier, and "Out of date" when the charter changed after the verdict.

### 4. Test-visit mode

Open any page with `?sl_test=1` (optionally `&sl_force=A` or `&sl_force=B`). The browser script sets the session cookie `spark_living_test` (`1.<bucket>[:A|B]`) and then runs the variant code exactly as for a real visitor, with these differences: it runs even for staff, bots and `navigator.webdriver` (so headless agents and logged-in staff can check a variant); it sends **no events** and pushes nothing to GA or the dataLayer; it never reads for writing or changes the real cookies `spark_living`, `spark_living_sid`, `spark_living_a` (a real `spark_living` bucket is read only, so the tester sees what that visitor would); `sl_force` overrides holdout and weights. The mode lasts for the browser session; `?sl_test=0` ends it; `?sl_test=1` without `sl_force` clears an earlier force. `<html data-sl-test="1">` and `window.sparkLivingTest` ({force, bucket, assignments:[{id, mode, variant, label, applied}]}) show what ran. Second guard: the event endpoint stores nothing for a browser carrying the test cookie or for a body with `test` true, and the Gravity Forms hook skips test browsers. The served HTML does not change, so cached pages are safe. A logged-in editor gets the script only when the request carries `sl_test=1` or the test cookie.

### 5. Slower weight shifting

The nightly job keeps the split at 50/50 until EACH version has at least `min_exposures_before_shift` exposures (default 30; option `spark_living_settings` {min_exposures_before_shift}, editable on the Site charter screen, filter `spark_living_min_exposures_before_shift`; shown in `GET /state` rules). A test below the floor whose stored weights are not 50/50 is put back to 50/50 on the next nightly run and a `weights_changed` row says why. A test that moves writes a row with the counts that caused it. `Spark_Living_Stats::floor_weights()` is mirrored in `tests/stats-check.js`.

### 6. Speed budget

`speed_budget` lives in the charter and `speed` in `GET /state` (see the ledger). Record and display only.

### Tests

`_playground/t17.js` (charter, ledger, upgrade, backfill), `t18.js` (gate and the 27-case agent queue matrix), `t19.js` (test-visit mode), `t20.js` (weight floor), `t21.js` (dashboard on three surfaces, 390 and 1366 px, light and dark), `runall.sh` runs any list of them.

## Phase B: Self-assigning tests (0.4.0)

What an agent harness needs from the plugin to pick, build and queue tests by itself, with the plugin keeping the statistics, the gates and the record. Nothing here removes a human gate: at autonomy `suggest` (the default) nothing is ever queued or started by an agent or by the nightly job.

### 1. A stop date that scales with traffic, and whole-site scope

See "Eligibility at start, and the stop date" above for the rule. Also:

* **`scope`: `page` (default) or `sitewide`.** Accepted by `POST /tests`, `POST /suggestions` and the wp-admin create form, shown on every card ("Whole site"). A sitewide test's variant applies on every page where its selector matches (the browser script decides, as before), the traffic input is the whole site's sessions, `page` may be left out, and **exposure is counted once per session wherever the selector first matches** (the one-exposure-per-session rule is per experiment and session, not per page). A page test's `page` is advisory for the traffic count and the cards: the selector, not the page, decides where the variant appears. The test that was running when 0.4.0 was installed is not converted.
* **One test per element.** One test runs at a time, as before. In addition the plugin refuses (409 `spark_living_selector_in_use`) to start a test, or to queue one, whose element (the selector, compared after trimming spaces and ignoring case and spaces around `> + ~ ,`) is already held by a shipped winner on overlapping pages and devices (a page test and a sitewide test overlap; two page tests overlap unless both name a different page; mobile and desktop do not overlap). A queued test waits behind a running test on the same element. Revert the winner first. Overlapping but differently written selectors (`.btn` and `a.btn.x`) are not detected.

### 2. Payoff score on suggestions

* New fields on `POST /suggestions` and `PATCH /suggestions/{id}`: `payoff_score` (number of 0 or more; `null` clears it), `payoff_inputs` (object: `sessions_reaching`, `proximity` 0 to 1, `expected_lift`, `days_to_result`, `traffic_class`; optionally `sessions_14d`, `reach_share`, `change_type`, `baseline_rate`, `power_factor`, `library_n`; other keys are dropped), `payoff_version` (up to 40 characters). A bad value is 400 (`spark_living_payoff_score`, `_inputs`, `_version`) and nothing is written. `PATCH` also takes `sessions_14d` with `sessions_as_of` and `priority`, works on a suggested or queued test, and writes a `suggestion_updated` ledger row.
* **The plugin does its own days to result** from its own rules and stores it beside the agent's: `payoff.plugin_check` = {`days_to_result` (7 at the least), `stop_days`, `reachable`, `traffic_class` (`decidable` or `below_minimum`), `agent_days_to_result`, `agrees` (within a day), `computed_at`}. The agent's own figure stays in `payoff_inputs.days_to_result`.
* **Order.** `GET /suggestions`, `GET /state` and the dashboard sort by Goal Gate verdict first (pass, then not checked or out of date, then hold, then fail), then by payoff score (highest first, unscored last), then the old priority, then oldest first. On the dashboard a verdict of fail is hidden under a closed "Rejected by the Goal Gate (N)" expander. Each card has "Expected payoff: highest of 3" (or "second of 3", "lowest of 3", "the only one scored", "not scored yet") with the raw number small beside it.
* **Auto-pick.** At autonomy `tier1` or `full`, when the nightly job finds no running test and nothing queued, it queues the highest-payoff suggestion that has a `pass` verdict against the current charter version, whose tier the level allows (tier 1 at `tier1`, tiers 1 and 2 at `full`, tier 3 never), that has a payoff score, that has a fresh traffic count (21 days) from which a result is reachable within 42 days, and whose element is free. The ledger row (`test_queued`) is proposed by `engine:auto-pick` and lists what was skipped and why; the usual start path then starts it in the same run (`test_started` by `engine`). **At `suggest` it never does this, and it never does it while the charter is empty or a draft.** `GET /state` carries `auto_pick` (what the next run would do and why not), which writes nothing.

### 3. Results record

Table `{prefix}spark_living_results` (dbDelta, created by the upgrade, safe to run twice; `spark_living_db_version` is 3). One row per concluded test, written when the test concludes and, once on upgrade, for the tests that had already concluded: test id and name, page type, scope, device, element selector, change type, `a_label`, `b_label`, outcome (`challenger won`, `original won`, `no difference`, `voided`), verdict, shipped, tier, started and ended dates, days run, `max_days`, sessions, intent and lead rates per version, lift, probability, `met_minimum`, `forced_start`, the payoff score at the start and a one-line summary. `GET /results?per_page=20&page=1&outcome=&change_type=&scope=` (administrators only) returns them newest first with `X-WP-Total` and `X-WP-TotalPages`, in the shape of `agents/results-library.md` for the fields the plugin can truthfully know. It does not know `site_key`, `industry`, or a finer `page_type` than home, product, sitewide, other or unknown; it keeps the selector, not a named element. **Nothing is sent to any other site.**

### 4. Gaps the agent harness reported, and what was done

1. **Tier 2 suggestions** can be created through `POST /suggestions` (`tier` or `risk_tier` of 1 or 2). Tier 3 is still refused (400 `spark_living_tier3`). An agent queues tier 2 only at autonomy `full`.
2. **Unambiguous gate keys.** Every suggestion and queued card carries `goal_gate` = {`verdict`, `reasons` (a string of at most 600 characters), `by`, `at`, `charter_version`, `stale`} for the Goal Gate and `traffic_gate` = {`ok`, `code`, `message`} for the traffic check. The old `gate` key (the traffic check) and the flat `gate_verdict`, `gate_reasons`, `gate_by`, `gate_at`, `gate_charter_version` fields stay as aliases for one version (0.4.x) and will be removed.
3. **Authorship.** New ledger kinds: `gate_verdict`, `suggestion_created`, `suggestion_updated`, `queue_attempt`, `audit`, `stop_date_changed`, `charter_approved`. The server uses `gate_verdict` for a verdict, `queue_attempt` (status `failed`) for a refused queue or start, `stop_date_changed`, `suggestion_updated` and `charter_approved`; it keeps `test_suggested` for the creation of a suggestion (`suggestion_created` is accepted through `POST /changes` for outside rows). Two capabilities, below.
4. **Server-side rows.** `POST /suggestions`, `PATCH`, `/gate`, `/queue`, `/unqueue`, `/dismiss`, `/tests/{id}/start`, `/conclude`, `PUT /charter`, `POST /charter/approve`, the nightly job and the upgrade all write their own ledger rows on the server. **Agents must not post duplicates** through `POST /changes`; that route is for facts the plugin cannot see (an audit finding, a speed measurement, an ad change).
5. **`POST /validate-variant`** (build capability; writes nothing). Body: `selector`, `changes` [{op, value}] and/or the shorthands `text`, `href`, `add_class`, `remove_class`, `style`, plus `css`, and `format` (`selector` or `block`). Returns `ok`, `selector` {given, ok, sanitized, reason}, `variant` {changes, css} (what would be kept), `stripped` [what was removed and why], `problems`, `written: false`.
6. **Preview of a test that is not running.** `POST /suggestions/{id}/preview-token` (build capability) returns a signed token valid for 30 minutes and for that test id only (HMAC with the site's auth salt; nothing is stored). Open any page as `?sl_test=1&sl_exp={id}&sl_force=B&sl_pt={token}` (`sl_force=A` shows the original; with no `sl_force` a preview shows B). The page then carries only that test's challenger, in that browser only, in test-visit mode (nothing is recorded, no cookie of the visitor is touched). It works for a signed-in user with the build capability (no token needed) or a holder of a valid token; for anyone else the parameters are ignored and the page is the normal one. The preview page is sent not cacheable and noindex. Only suggested, queued and draft selector tests can be previewed; a running test is seen with `?sl_test=1&sl_force=B` as before.
7. **Charter approval.** The charter has `status` (`draft` or `approved`), `approved_by` and `approved_at`. Any change of content through `PUT /charter` (or the wp-admin form, or an undo) sets it back to `draft`, clears the approval and bumps the version on the server; a save that changes nothing bumps the version but keeps the approval. `status`, `approved_by`, `approved_at` in a request body are ignored. `POST /charter/approve` (administrator; optional `by`) approves the current content without changing the version, so verdicts already recorded stay valid; it is refused when `by` starts with `agent:` (403 `spark_living_agent_cannot_approve`) and when the charter is empty (409). **While the charter is empty or a draft, every agent queue, create-and-start and start is refused (403 `spark_living_charter_unapproved`) and auto-pick does nothing, whatever the autonomy level.** The Site goals card says "Draft" and why, and wp-admin, Living Websites, Site charter shows an **Approve these goals** button.
8. **The hole in `POST /tests` and `/start` is closed.** A caller is an agent when its `by` starts with `agent:` or when it is signed in without `manage_options`. An agent's `POST /tests` (with or without `start`, with or without `force`) is refused with the same checks as the queue route (a new test has no verdict, so `spark_living_gate_missing`), and an agent's `POST /tests/{id}/start` must pass the gate, tier, autonomy and approved-charter checks, and may not use `force` (`spark_living_agent_no_force`). Each refusal is a `queue_attempt` ledger row with status `failed`. An administrator who sends no `by` (or a `by` that does not start with `agent:`) behaves as before.
9. **Documented limits.** Living Block tests cannot be placed through REST (a person places the block in the page editor). A selector test cannot create a new element, only change one that is in the page's HTML. The plugin has no per-page session source: the controller supplies `sessions_14d` (from GA4). A completed booking on Google Calendar is not counted as a lead, only the click on the booking link.

### Capabilities

| Capability | May | Granted to |
|---|---|---|
| `spark_living_gate` | `POST /suggestions/{id}/gate`; a `gate_verdict` row or gate data through `POST /changes`; the read routes | administrators (automatically) and any user or role given it |
| `spark_living_build` | `POST /suggestions`, `PATCH /suggestions/{id}`, `/queue`, `/unqueue`, `/dismiss`, `POST /validate-variant`, `POST /suggestions/{id}/preview-token`, `POST /tests`, `/tests/{id}`, `/tests/{id}/start` (as an agent: checked), the read routes | administrators (automatically) and any user or role given it |
| `manage_options` | everything, including `/conclude`, `PUT /charter`, `/charter/approve`, `/changes/{id}/undo`, `GET /results`, the dashboard | administrators |

Read routes (`GET /state`, `/stats`, `/log`, `/suggestions`, `/charter`, `/changes`) and `POST /changes` are open to a holder of either capability. A row posted through `POST /changes` by someone without the gate capability is stored with `gate_verdict` `na` and no gate data, and a `gate_verdict` row from them is refused, so a Builder cannot record its own verdict. Administrators hold both capabilities through a filter (`user_has_cap`), so no role is changed in the database.

### Separate low-privilege logins (one with gate only, one with build only)

Do this once per site, with WP-CLI or the Users screen; the plugin never creates users itself. Use real, generated passwords; the application password is shown once.

```
# Judge: may post a Goal Gate verdict and read, nothing else.
wp role create spark_living_judge "Spark Living Judge"
wp cap add spark_living_judge read spark_living_gate
wp user create living-judge living-judge@example.com --role=spark_living_judge --user_pass="<generate one>"
wp user application-password create living-judge "judge agent"

# Builder: may create, patch and queue suggestions, validate and preview a variant; cannot post a verdict.
wp role create spark_living_builder "Spark Living Builder"
wp cap add spark_living_builder read spark_living_build
wp user create living-builder living-builder@example.com --role=spark_living_builder --user_pass="<generate one>"
wp user application-password create living-builder "builder agent"
```

The agent sends the application password as HTTP Basic over HTTPS. A Builder that posts `/gate` gets 403; a Judge that posts `/suggestions` gets 403; neither can conclude a test, change or approve the charter, undo a change or read `/results`. A Builder login is treated as an agent on every route whatever `by` it sends, so it is always checked against the Goal Gate, the approved charter and the autonomy level.

### Tests

`_playground/t22.js` (stop date, start gate, nightly recompute, upgrade of a running test, sitewide scope, one test per element), `t23.js` (payoff, sorting, the rejected expander, goal_gate and traffic_gate keys, tier 2, auto-pick), `t24.js` (results and backfill, capabilities, validate-variant, preview tokens, charter approval, the closed hole), `t25.js` (dashboard layout at 1366 and 390 px, light and dark), and the mirror `tests/stats-check.js`. `runall.sh` runs any list of them.

## How it runs

* **Assignment (inline script in the head).** First decides whether the viewport is mobile (980px or narrower) and drops every test scoped to the other device. Then reads or sets cookie `spark_living` (random visitor id plus a bucket 0-9999). Bucket under 1000 is the permanent 10 percent holdout and always sees A. Everyone else is placed by the stored weights (sticky through cookie `spark_living_a`). Blocks: injected CSS shows the chosen variant before first paint, and the other is removed at DOMContentLoaded. Selector tests: the target is hidden until the change is applied, with a 1.2 second safety timeout that always reveals it. Bots (user agent, `navigator.webdriver`) and users who can `edit_posts` (server: nothing is printed; browser: cookie `spark_living_staff` set at login) are never assigned or counted and see A.
* **Promoted winners** stay live for everyone except the holdout. The holdout keeps seeing the original, which is what produces the living versus frozen number.
* **Nightly job (`spark_living_nightly`, daily WP-Cron).** For the running test: recompute its stop date (0.4.0), gather counts, run `Spark_Living_Stats::decide()`, then either update the weights (Thompson, 20 percent floor) or conclude the test, write the `living_evolution` entry and promote a winner. Then it checks any winner shipped 7 or more days ago for auto-revert, auto-picks a suggestion when allowed (0.4.0, never at autonomy `suggest`), starts the first queued test when none runs, and prunes events older than 400 days.
* **Stats (`includes/class-spark-living-stats.php`).** Beta-Bernoulli with a uniform prior. P(B beats A) uses the exact closed-form sum for integer Beta parameters (deterministic, no random numbers), cross-checked against a seeded Monte Carlo in the test script. Thompson allocation for two arms is P(B beats A), clamped to 20 to 80 percent.

## Dashboard counts

The `/living/` dashboard, the wp-admin page and `GET /state` use the same tally (`Spark_Living_Store::verdict_tally()`, taken from the whole evolution log, not one page of it):

* **Evolved** counts only tests that shipped a winning challenger (verdict `ship_b`). "Site has evolved N times" uses this number.
* **Original won** (`keep_a`), **no difference** (`no_difference`) and **blocked by the lead guard** (`guard_blocked`, shown when above zero) are shown as their own tiles, and every concluded test still appears in the "Test history" list with its outcome.
* **Shipped, then reverted** (auto-revert log entries) is its own tile when above zero. A reverted winner still counts once under Evolved, because it did ship; the reverted tile tells you how many were rolled back.

Before this change the sentence used the total number of log entries, so every concluded test (and every revert) was called an evolution.

## Dashboard animation (0.1.2)

The dashboard (admin only) plays two one-time animations on load, in pure inline SVG and CSS: a vine that grows under the title (about 2.2 s), then, after about 2.6 s, small spark blue bubbles rise through the first tally card ("evolved") and it settles into a soft spark blue gradient. Transform and opacity only, no libraries, no requests. A three-line inline script sets how far the bubbles rise to the card height (the CSS has a default if it does not run). With `prefers-reduced-motion: reduce` the vine is fully drawn, the card shows its resting gradient and nothing moves. Nothing outside the dashboard changed.

## Dashboard animation (0.1.3)

The vine now stops at about 75 percent of the width (1.8 s). A Spark burst, redrawn inline from the brand logo mark, grows out of the vine tip the moment the stem finishes (0.55 s with a slight overshoot) and stays as the resting ornament. The evolved card bubbles start at that same moment. One CSS value, `--sl-stem`, drives the stem, the burst and the bubbles, so they cannot drift apart. Reduced motion shows the finished state with no movement.

## Dashboard sources and current vs challenger (0.1.4)

Two additions to the admin dashboard (`/living/`, the shortcode and the wp-admin page).

### Data sources row

Just above the live numbers (or under the "no test is running" line) a row headed **Data sources** shows one chip per source: a 16 px logo, the name, a status dot with the word **Live** or **Paused** (green or grey; the word is always there, so colour is never the only signal), one muted line on what the source supplies and one detail line. `GET /state` returns the same list under `sources` (`id`, `name`, `what`, `status`, `live`, `detail`, `icon`).

Statuses are computed from real state on every request:

* **Site visit log** (the plugin's own events table). Logo: the WordPress site icon (`get_site_icon_url`), with an inline leaf if none is set. Supplies "Views, clicks and form submissions for the test". Live when a test is running and the tracking script is being printed for it (`Spark_Living_Frontend::tracking_active()`); Paused otherwise. Detail: "Last event: 3 minutes ago" from the newest row for the running test, or "No events yet". With no test running it reads "No test is running. Last event: ..." (newest row overall).
* **Google Analytics.** Inline SVG bar-chart mark, no external request. Supplies "Traffic check before a test starts". Paused unless the `spark_living_ga_connected` filter returns true; the plugin has no direct Analytics connection today (the 14-day session count is typed in when a test starts and stored as `start_sessions_14d`, and the event mirror to Analytics is not forwarding), so it shows grey and Paused with "Not connected. Traffic count entered by hand when the test started (N sessions)" (no parenthesis when no count was stored). Return true from that filter only from code that really reads Analytics.

Add more sources with the `spark_living_data_sources` filter. Each entry: `id`, `name`, `icon` (`{type: 'url' | 'svg', value: image URL or inline SVG}`), `what`, `status` (`'live'` or `'paused'`, anything else is shown as paused) and `detail`. Names and lines are escaped; inline SVG goes through an allow-list (shapes and paths only, scripts removed).

```php
add_filter( 'spark_living_ga_connected', '__return_true' ); // only when a real connection exists
add_filter( 'spark_living_data_sources', function ( $sources ) {
	$sources[] = array( 'id' => 'crm', 'name' => 'Lead sheet', 'icon' => array( 'type' => 'url', 'value' => 'https://example.com/i.png' ), 'what' => 'Leads typed in by hand', 'status' => 'live', 'detail' => 'Updated daily' );
	return $sources;
} );
```

### Current versus Challenger

In the "Current test" card, after the hypothesis, the dashboard says **What is being tested** (Wording, Colour, Shape, Placement, Visibility, Style or Block content) and shows two rows: **Current** (variant A) and **Challenger** (variant B), in plain language. The selector stays in the card, smaller and muted.

Three optional fields on a test: `change_type` (`wording`, `color`, `shape`, `placement`, `visibility`, `style`, `block`), `a_label` and `b_label` (plain text, sanitised with the plugin's text sanitiser, 200 characters). They are accepted by `POST /tests` and by `POST /tests/{id}`, and returned in `GET /state` (each experiment also carries a `comparison` object with the resolved type and both descriptions). Editing them on a running test never changes assignment, variants, weights, start time or counts.

Defaults when the fields are empty:

| Test | What is being tested | Current | Challenger |
|---|---|---|---|
| Text swap (B has a `text` change) | Wording | The original text in quotes if `a_label` is set or A carries a text change; otherwise "Original text (unchanged)" | B's replacement text in quotes |
| CSS variant or other selector change | Style | Original (no change) | Restyled by the test |
| Living Block | Block content | Version A | Version B |
| Another `change_type` with no labels | that type | Original (no change) | Changed by the test |

**Where the original text lives:** nowhere. Variant A of a text-swap test carries no change (A is "leave the element alone"), only B stores the replacement. That is why a running test shows "Original text (unchanged)" until `a_label` is set to the original wording. For wording tests on a button or link target (selector with `a`, `button`, `btn`, `cta`, `[href` and similar) each text is shown as a small pill. Everything is escaped.

On narrow screens (600 px and under) the comparison stacks, the chips take a full row each, and the numbers tables scroll sideways inside their own box instead of widening the page.

## Suggested tests and queue (0.2.0)

The dashboard (`/living/`, the shortcode and the wp-admin page) has two sections after "Current test": **Up next** (the queue) and **Suggested tests**. A suggestion is a fully specified test that nobody has queued yet. The brain (or a page review) writes it; the owner reads it and presses **Queue this test** or **Dismiss**.

### What existed before 0.2.0
There was no ordered queue and no suggestions. The only waiting tests were drafts and Tier 2 tests awaiting approval (`GET /state` `queued`, and a list in wp-admin only, headed "Queued tests"), each started by hand with a session count. Nothing started a test on its own. That list is unchanged apart from its wp-admin heading, now "Drafts and approvals", so "queue" means one thing.

### What was added
Three statuses on `living_experiment`: `suggested`, `queued`, `dismissed`; new fields; the five routes above; a new class `Spark_Living_Queue` (`includes/class-spark-living-queue.php`); the two dashboard sections; and one extra step in the nightly job. Nothing in the assignment, statistics, event collection or the running test changed.

### Suggestion fields (`POST /suggestions`, JSON)
| Field | Rule |
|---|---|
| `title` (or `name`) | Required. Plain text, 200 characters. |
| `hypothesis` | Optional text. |
| `page` | Required unless `scope` is `sitewide`. A post ID, an http or https URL, or a path starting with `/`. Anything else (for example `javascript:`) is 400. |
| `device` | `all` (default), `mobile` or `desktop`. |
| `element_type`, `target`, `variants` | Exactly as `POST /tests`: a selector test needs a valid selector and a challenger with a change or a `css` snippet (sanitised by the same CSS sanitiser); a block test uses `element_type: block`. |
| `change_type`, `a_label`, `b_label` | As in 0.1.4. An unknown `change_type` is 400. |
| `rationale` | Required. Plain text, up to 600 characters (601 is 400): what was seen on the page. |
| `evidence` | Optional list of up to 5 items `{source, detail, as_of}`: source (120 characters), one-line detail (200) and a real date `YYYY-MM-DD`. An item missing any of the three is 400. |
| `priority` | Whole number of 1 or more; 1 is first. Default: last place. |
| `suggested_by` | Plain text, 80 characters, for example "Lumen page review". `suggested_at` is set by the server. |
| `sessions_14d`, `sessions_as_of` | Required. The trailing 14-day sessions for the target page and device, and the date (`YYYY-MM-DD`, not in the future) they were measured. Supplied by whoever writes the suggestion; the plugin has no pageview data. |
| `tier` | 1 (default) or 2 (0.4.0). Tier 3 is refused (400). A tier 2 suggestion is queued by a person, or by an agent only at autonomy `full`. |
| `scope`, `payoff_score`, `payoff_inputs`, `payoff_version` | 0.4.0, see Phase B. |

Every text field goes through the plugin's existing sanitisers (tags and script bodies stripped) and is escaped again on output. Nothing is written when any field is invalid.

### The queue
* One test runs at a time, as before. Queued tests wait in the order they were queued (`queue_order`); removing one and queueing it again puts it last.
* **Queueing never starts a test.** The nightly job (`spark_living_nightly`) starts the next one: after it has evaluated the running test, if no test is running it looks at the first queued test only and starts it when its stored count passes the gate: `sessions_14d` lets a result be reached within 42 days (75 or more sessions in 14 days, 0.4.0) **and** `sessions_as_of` is no more than 21 days old (a count measured 21 days ago still passes; 22 does not). The test then starts like any other (50/50, holdout, `start_sessions_14d` = the stored count, `forced_start` false). The dashboard says "Starts on the next nightly check after the current test ends."
* A failed gate leaves the test queued and starts nothing. The dashboard shows why on its card: "Waiting: at this traffic a result would take more than 42 days" or "Waiting: traffic count is out of date". A blocked first test is not skipped for the one behind it.
* The queue never forces a start. A suggestion below 75 sessions (0.4.0; it was 100) can only be started by hand with `POST /tests/{id}/start` and `force: true` (recorded as `forced_start`), which now also accepts `suggested` and `queued` tests.
* Suggest, queue, remove and dismiss touch only the suggestion's own fields. They never change the running test, its variants, assignment, start time or event rows (`t16.js` compares a fingerprint before and after).

### The cards
"Suggested tests" shows the two best-ranked suggestions, then a muted "N more suggested tests are waiting." Each card has: rank and title; page and device; "What would change" (change type, then Current and Challenger rows, the same as the Current test card); "Why" (the rationale); "Based on" (each evidence item as a small tag with the source and date, plus its detail line); "Traffic" (0.4.0: "137 sessions in 14 days (measured Nov 11). At this traffic a result takes about 23 days." or, when that is over 42 days, "At this traffic a result takes about 76 days, more than the 42-day limit; this would need a forced start." in a muted warning bar; 0.2.0 to 0.3.0 said "Meets the 100-session minimum." and "Below the 100-session minimum."; a count older than 21 days adds a note that it would not start on its own); and two buttons, **Queue this test** (primary) and **Dismiss**. "Up next" lists queued tests with their position, the same comparison, the wait reason if any, and **Remove from queue**.

The buttons are real `<button type="button">` elements with a visible focus outline. A press disables every button, shows "Working...", posts to the REST route with the REST nonce, then swaps the two sections in place (no page reload, so the load animation does not replay) and reads the result out in a status line (`role="status"`). A failure shows the server's message in that line and re-enables the buttons. There is no alert, confirm or prompt dialog anywhere.

## Cache flush

The allocation weights and the live set are printed into the page head, so a cached page can carry stale ones. `Spark_Living_Util::flush_page_cache()` runs: after the nightly job updates the allocation weights; when a test starts, concludes (nightly, REST or admin) or a winner is auto-reverted (through the `spark_living_test_started`, `spark_living_test_concluded` and `spark_living_test_reverted` actions). It calls, each only when it exists (`function_exists` / `has_action`): `wp_cache_flush()`, `batcache_clear_url()` for the home URL (Pressable page cache), `rocket_clean_domain()` (WP Rocket), `w3tc_flush_all()` (W3 Total Cache), `wp_cache_clear_cache()` (WP Super Cache), `sg_cachepress_purge_cache()` (SiteGround), `wpfc_clear_all_cache()` (WP Fastest Cache) and the `litespeed_purge_all` action. A site with another cache can hook the `spark_living_flush_cache` action, which fires at the end. Only the home URL is cleared per URL on Batcache; other pages expire on their normal cache lifetime.

## Data model

**Events table `{prefix}spark_living_events`:** `id`, `experiment_id` (0 = site watch, see below), `variant` (A, B, H holdout, L living/promoted), `visitor_id`, `session_id`, `event_type` (`exposure`, `cta_click`, `form_start`, `form_submit`, `tel_click`), `created_at` (UTC). Indexes: `(experiment_id, event_type, session_id)`, `(experiment_id, variant, event_type)`, `created_at`, `visitor_id`. No IP address, user agent or URL is stored.

**Experiments:** private custom post type `living_experiment` (post ID = experiment ID; title = name). Chosen over an options row because tests are kept forever for the log, IDs come free, and nothing needs a custom table. Post meta (`_spark_living_` prefix): `change_type`, `a_label`, `b_label` (0.1.4, descriptive only), `element_type` (block or selector), `target`, `hypothesis`, `variants` ({A:{label,changes}, B:{label,changes,css}}), `weights` ({A,B}), `status` (draft, awaiting_approval, running, concluded, and from 0.2.0 suggested, queued, dismissed), the suggestion fields `page`, `rationale`, `evidence`, `priority`, `suggested_by`, `suggested_at`, `sessions_14d`, `sessions_as_of`, `queued_at`, `queue_order`, `dismissed_at` (0.2.0, empty on other tests), `start_date`, `end_date`, `tier` (1 or 2), `device` (all, mobile, desktop), `forced_start` (true when started below the 100-session bar), `start_sessions_14d` (the number stated at start, 0 if none), `verdict`, `winner`, `promoted`, `shipped_at`, `revert_checked`, `reverted`, `snapshot` (final numbers).

**Evolution log:** private custom post type `living_evolution`, one post per concluded test (plus one per auto-revert, `entry_type = revert`). Meta (`_spark_living_log_` prefix): `experiment_id`, `element_type`, `target`, `hypothesis`, `variant_a`, `variant_b`, `numbers`, `verdict`, `shipped`, `started`, `ended`, `note`, `device`, `forced_start`, `start_sessions_14d`.

**Definitions used by the stats** (counted per distinct session, only sessions that have an exposure row for that experiment): *sessions* = exposed sessions; *intent* = sessions with `cta_click`, `form_submit` or `tel_click`; *leads* = sessions with `form_submit` or `tel_click`. "Site watch" rows (`experiment_id = 0`, variant H or L) record exposures when winners are live but no test is running, so the lift keeps measuring.

**Results table `{prefix}spark_living_results`** (0.4.0): see Phase B. **Options:** `spark_living_db_version` (3 from 0.4.0; 2 in 0.3.0), `spark_living_version`, `spark_living_rewrite_version`, `spark_living_last_run`, `spark_living_charter`, `spark_living_settings`, `spark_living_ledger_backfilled`, `spark_living_results_backfilled`.

**Change ledger table `{prefix}spark_living_changes`:** see "Phase A". Events table unchanged.

**Hooks for other code:** actions `spark_living_test_started`, `spark_living_test_concluded` (id, verdict, shipped), `spark_living_test_reverted`, `spark_living_nightly_complete`.

## Not finished or not verified

**0.4.0 (Phase B) limits.** Not built: cross-site results store, the scheduler, ads and design phases, verification of lead counting. Not verified on MySQL: the results queries (local tests ran on SQLite). A page-scope test's `page` does not restrict where the browser script applies the variant (the selector does). Auto-pick has been exercised only against seeded data in WordPress Playground, never against live traffic. A preview token is a bearer token in the address: anyone who has the whole address can open the preview for 30 minutes; it shows only the challenger of that one test and records nothing.

Verified 2026-11-12 in WordPress Playground (PHP 8.2, WordPress 7.1, SQLite, WP_DEBUG and WP_DEBUG_LOG on, empty log): activation and the events table, both blocks (registration, editor, server render), selector tests through the REST API (cookie plus nonce, and an application password), A, B and holdout assignment, stickiness, the safety timeout, bot and editor exclusion, exposure, cta_click, tel_click and form_start events, the nightly job on seeded data (ship B, day-14 no difference, lead guard, weights inside 20 to 80), the cache flush, `/living/` (404 logged out, dashboard for an administrator) and the wp-admin forms. `node tests/stats-check.js` passes.

Added and verified the same way (WordPress Playground, `_playground/t10.js` to `t13.js`, 127 assertions, plus the older scripts re-run): device scope (`t10.js`), the visibility / CSS variant and its sanitizing (`t11.js`), the dashboard tally (`t12.js`) and eligibility at start (`t13.js`). Run them with the server from `_playground/start.sh` up.

Still unverified (needs a real Pressable site): the SQL on MySQL (Playground uses SQLite through a translation layer); the Gravity Forms hook with a real submission (Gravity Forms is not installed; the action was fired by hand with the visitor cookies); the GA4 mirror with a real `gtag`; the Divi selector swap on a real Divi 4.27.9 page; the event endpoint behind Pressable edge cache; a real WP-Cron tick (the job was called directly).

Known gaps and limits in v0.1:
* **Chained tests on one element.** When a winner ships, "B becomes the new A" is modeled as a promoted winner. A follow-up test on the same element is a new experiment whose A should equal the promoted version; the holdout then sees that experiment's A, not the true original. The brain must define follow-ups that way until v0.2 adds a baseline-of-record.
* **Weights are in cached HTML.** New visitors follow the weights printed in the page at cache time. The plugin flushes the cache when weights change (see "Cache flush"), so the lag is short. Existing visitors are sticky.
* **Eligibility (0.4.0: a result reachable within 42 days, 75+ sessions in 14 days; it was 100+) is enforced only on the number the caller sends.** The plugin has no pageview data, so it cannot tell whether `sessions_14d` is true; the brain still has to read GA4. What the plugin does is refuse a start with no number or a low one, and record a forced start. `POST /tests` with `start: true` now needs the number as well, which changes the v0.1 behaviour (it used to start without one).
* **Device is decided once per page load.** A visitor who resizes a window across 980px mid-visit keeps the decision made at load; the next page load re-decides. A returning visitor whose window sits on the other side of the line is simply not in the test that visit.
* **CSS variant exposure needs the target element in the page HTML.** Elements the theme only inserts with JavaScript after load are not seen at DOMContentLoaded. Not checked on a real Divi page.
* **The visibility / CSS snippet cannot load anything by URL** (`url(` and `@import` are stripped), and it is not linted for validity.
* **The brain's work is outside this plugin:** picking hypotheses, writing the challenger, guardrails (contrast, brand, no invented claims) and the weekly owner report are workstreams D and E. Tier 2 approval here is an admin button or an explicit `start` call; one-click approval from the owner email is not built.
* **Selector tests reveal at DOMContentLoaded**, so a slow page can keep the target hidden up to the 1.2 second timeout. Block tests have no such delay.
* **Search:** both block variants are in the HTML (as the plan says); B is hidden with CSS by default and removed in the browser.
* **Revert:** reverting a shipped winner removes it from the live set but leaves the experiment record. Auto-revert compares lead sessions after the ship with the prior 14 days of tracked leads (fewer days if tracking is newer).
* **No consent banner integration.** The plugin sets first-party cookies (`spark_living`, `spark_living_a`, `spark_living_sid`, plus `spark_living_staff` for editors). Decide with the site owner whether they need to be listed in a cookie notice.
* No unit tests inside WordPress, no uninstall routine, no multisite handling, no translation files.
