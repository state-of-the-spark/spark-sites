# Spark Living v0.2.0

Living Websites by Spark Sites. A WordPress plugin that runs one split test at a time on a site, keeps what brings in more leads, logs every change, and reports through a REST API.

Spec: `spark-sites/decisions/2026-11-12-living-websites-build-plan-DRAFT.md` (sections 3 and 4.1 are the contract). This is a local build. It has not been installed on any live site. On 2026-11-12 it was run in WordPress Playground (PHP 8.2, WordPress 7.1, SQLite) and the flows listed in "Not finished or not verified" were exercised.

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

### Eligibility at start

A test is refused unless the request states that its target page had **100 or more sessions in the last 14 days** (for a device-scoped test: sessions on that device). The plugin has no pageview data, so the caller (the brain, from GA4) sends the number as `sessions_14d`; the plugin cannot check that it is true. The bar is `Spark_Living_Stats::ELIGIBILITY_SESSIONS` and is reported in `GET /state` under `rules.eligibility_sessions_14d`.

```json
POST /wp-json/spark-living/v1/tests/123/start
{ "sessions_14d": 240 }
```

| Request | Result |
|---|---|
| `sessions_14d` missing | 400 `spark_living_eligibility_missing`, with the reason and the 100 bar |
| `sessions_14d` not a whole number of 0 or more | 400 `spark_living_sessions_invalid` |
| `sessions_14d` below 100 | 422 `spark_living_not_eligible`, naming the number, the device and the bar |
| 100 or more | the test starts; `start_sessions_14d` is stored, `forced_start` is false |
| `force: true` (administrator) with a missing or low number | the test starts; stored as `forced_start: true` plus the number given (0 if none) |
| `force: true` with 100 or more | starts normally; `forced_start` stays false because the bar was met |
| `force: true` from anyone without `manage_options` | refused (all these routes already need `manage_options`; the check is repeated for force) |

The state errors come first: a missing test is 404, a test that is not a draft or awaiting approval is 409. **`POST /tests` with `start: true` follows the same rule** (send `sessions_14d` or `force: true` in the body); it is checked before anything is written, so a refusal leaves no draft behind. Tier 2 tests are still created as `awaiting_approval` and need the number when they are approved and started. The wp-admin "Start" button has a "Sessions, last 14 days" box and a "Start anyway" tick box; the dashboard shows "Started below the 100-session bar (N sessions in the last 14 days)" for a forced test, while it runs and in the history afterwards.

Tier 2 tests (offer, price, guarantee, legal claim) are created as `awaiting_approval` and only start through the explicit approve button (admin) or `POST /tests/{id}/start`.

### Measuring

* A click on a selector test's own target element records `cta_click` (once per session, for A, B and holdout sessions alike, whatever the variant changes). Mark any other call to action with `data-living-cta` to record `cta_click` too.
* `a[href^="tel:"]` clicks record `tel_click` automatically.
* The first focus inside any form records `form_start`.
* Gravity Forms submissions record `form_submit` on the server (`gform_after_submission`), using the visitor's cookies.
* GA4: when `gtag` exists, exposures send `living_exposure` and everything else sends `living_conversion`, each with `living_experiment`, `living_variant` and (for conversions) `living_event`. Register those as custom dimensions in GA4. On sites that load Google Analytics through Google Tag Manager there is no `gtag`; when `window.dataLayer` exists the plugin pushes `{event: 'living_exposure', ...}` / `{event: 'living_conversion', ...}` there instead. **A GTM tag is needed to forward these events to GA4** (a Custom Event trigger on `living_exposure` and `living_conversion`, with the `living_experiment`, `living_variant` and `living_event` dataLayer variables); the plugin changes nothing in GTM or GA. AJAX Gravity Forms confirmations are mirrored to GA4 as `living_conversion` with `living_event = form_submit` (GA4 only; the database row is the server-side one).

## REST API (brain)

All routes need `manage_options` (use an application password). Base: `/wp-json/spark-living/v1`.

| Method and route | Purpose |
|---|---|
| `GET /state` | Running test with live numbers and the current decision, `sources` (the data source list), `queued` (draft and awaiting-approval tests, as before), `suggestions` and `queue` (0.2.0, see below), promoted winners, cumulative lift, `tally` (evolved, keep_a, no_difference, guard_blocked, reverted), `evolutions` (= tally.evolved), rules |
| `GET /stats?experiment_id=ID` | Stats for one test (the running test when omitted); concluded tests return their stored final snapshot |
| `GET /log?per_page=50&page=1` | Evolution log, newest first; `X-WP-Total` header |
| `POST /tests` | Create a test (body above; optional `device`, optional `variants.B.css`). `start: true` starts it if none is running (409 otherwise) and needs `sessions_14d` (or `force: true`) like `/start` |
| `POST /tests/{id}` | Edit only `change_type`, `a_label` and `b_label` (see "Current versus Challenger"). Allowed in any status, including running; nothing else is touched. 400 for an unknown `change_type` or an empty body; an empty string clears a field |
| `POST /tests/{id}/start` | Start a draft, or approve and start a Tier 2 test. Body `{"sessions_14d": N}`, N of 100 or more, or `{"force": true}` (administrator; recorded). 400 or 422 otherwise |
| `POST /tests/{id}/conclude` | Body `{"verdict":"ship_b" \| "keep_a" \| "no_difference","note":"..."}`; logs it and promotes B on `ship_b` |
| `GET /suggestions` | `{suggestions: [...], queue: [...]}`. Suggestions by priority (1 first), the queue in start order. Each item carries `traffic` (sessions, as_of, age_days, meets_min, fresh), `gate` (ok, code, message) and `queue_position` (0 when not queued) |
| `POST /suggestions` | Create a suggested test (fields below). 201 with the new test; 400 with a specific `code` for any invalid field. Never starts anything |
| `POST /suggestions/{id}/queue` | Suggested to queued, at the end of the line. 409 unless the test is `suggested`. Does not start it |
| `POST /suggestions/{id}/unqueue` | Queued back to suggested ("Remove from queue"). It keeps its priority |
| `POST /suggestions/{id}/dismiss` | Suggested or queued to dismissed. The record is kept; it leaves every list |
| `POST /event` (public) | Browser events only; nonce-free, validated, rate limited, `no-store` |

## How it runs

* **Assignment (inline script in the head).** First decides whether the viewport is mobile (980px or narrower) and drops every test scoped to the other device. Then reads or sets cookie `spark_living` (random visitor id plus a bucket 0-9999). Bucket under 1000 is the permanent 10 percent holdout and always sees A. Everyone else is placed by the stored weights (sticky through cookie `spark_living_a`). Blocks: injected CSS shows the chosen variant before first paint, and the other is removed at DOMContentLoaded. Selector tests: the target is hidden until the change is applied, with a 1.2 second safety timeout that always reveals it. Bots (user agent, `navigator.webdriver`) and users who can `edit_posts` (server: nothing is printed; browser: cookie `spark_living_staff` set at login) are never assigned or counted and see A.
* **Promoted winners** stay live for everyone except the holdout. The holdout keeps seeing the original, which is what produces the living versus frozen number.
* **Nightly job (`spark_living_nightly`, daily WP-Cron).** For the running test: gather counts, run `Spark_Living_Stats::decide()`, then either update the weights (Thompson, 20 percent floor) or conclude the test, write the `living_evolution` entry and promote a winner. Then it checks any winner shipped 7 or more days ago for auto-revert, and prunes events older than 400 days.
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
| `page` | Required. A post ID, an http or https URL, or a path starting with `/`. Anything else (for example `javascript:`) is 400. |
| `device` | `all` (default), `mobile` or `desktop`. |
| `element_type`, `target`, `variants` | Exactly as `POST /tests`: a selector test needs a valid selector and a challenger with a change or a `css` snippet (sanitised by the same CSS sanitiser); a block test uses `element_type: block`. |
| `change_type`, `a_label`, `b_label` | As in 0.1.4. An unknown `change_type` is 400. |
| `rationale` | Required. Plain text, up to 600 characters (601 is 400): what was seen on the page. |
| `evidence` | Optional list of up to 5 items `{source, detail, as_of}`: source (120 characters), one-line detail (200) and a real date `YYYY-MM-DD`. An item missing any of the three is 400. |
| `priority` | Whole number of 1 or more; 1 is first. Default: last place. |
| `suggested_by` | Plain text, 80 characters, for example "Lumen page review". `suggested_at` is set by the server. |
| `sessions_14d`, `sessions_as_of` | Required. The trailing 14-day sessions for the target page and device, and the date (`YYYY-MM-DD`, not in the future) they were measured. Supplied by whoever writes the suggestion; the plugin has no pageview data. |
| `tier` | Tier 2 is refused (400): those tests need owner approval and may not be queued to start by themselves. |

Every text field goes through the plugin's existing sanitisers (tags and script bodies stripped) and is escaped again on output. Nothing is written when any field is invalid.

### The queue
* One test runs at a time, as before. Queued tests wait in the order they were queued (`queue_order`); removing one and queueing it again puts it last.
* **Queueing never starts a test.** The nightly job (`spark_living_nightly`) starts the next one: after it has evaluated the running test, if no test is running it looks at the first queued test only and starts it when its stored count passes the gate: `sessions_14d` is 100 or more **and** `sessions_as_of` is no more than 21 days old (a count measured 21 days ago still passes; 22 does not). The test then starts like any other (50/50, holdout, `start_sessions_14d` = the stored count, `forced_start` false). The dashboard says "Starts on the next nightly check after the current test ends."
* A failed gate leaves the test queued and starts nothing. The dashboard shows why on its card: "Waiting: traffic count is below the minimum" or "Waiting: traffic count is out of date". A blocked first test is not skipped for the one behind it.
* The queue never forces a start. A suggestion below 100 sessions can only be started by hand with `POST /tests/{id}/start` and `force: true` (recorded as `forced_start`), which now also accepts `suggested` and `queued` tests.
* Suggest, queue, remove and dismiss touch only the suggestion's own fields. They never change the running test, its variants, assignment, start time or event rows (`t16.js` compares a fingerprint before and after).

### The cards
"Suggested tests" shows the two best-ranked suggestions, then a muted "N more suggested tests are waiting." Each card has: rank and title; page and device; "What would change" (change type, then Current and Challenger rows, the same as the Current test card); "Why" (the rationale); "Based on" (each evidence item as a small tag with the source and date, plus its detail line); "Traffic" ("137 sessions in 14 days (measured Nov 11). Meets the 100-session minimum." or, under 100, "Below the 100-session minimum; this would need a forced start." in a muted warning bar; a count older than 21 days adds a note that it would not start on its own); and two buttons, **Queue this test** (primary) and **Dismiss**. "Up next" lists queued tests with their position, the same comparison, the wait reason if any, and **Remove from queue**.

The buttons are real `<button type="button">` elements with a visible focus outline. A press disables every button, shows "Working...", posts to the REST route with the REST nonce, then swaps the two sections in place (no page reload, so the load animation does not replay) and reads the result out in a status line (`role="status"`). A failure shows the server's message in that line and re-enables the buttons. There is no alert, confirm or prompt dialog anywhere.

## Cache flush

The allocation weights and the live set are printed into the page head, so a cached page can carry stale ones. `Spark_Living_Util::flush_page_cache()` runs: after the nightly job updates the allocation weights; when a test starts, concludes (nightly, REST or admin) or a winner is auto-reverted (through the `spark_living_test_started`, `spark_living_test_concluded` and `spark_living_test_reverted` actions). It calls, each only when it exists (`function_exists` / `has_action`): `wp_cache_flush()`, `batcache_clear_url()` for the home URL (Pressable page cache), `rocket_clean_domain()` (WP Rocket), `w3tc_flush_all()` (W3 Total Cache), `wp_cache_clear_cache()` (WP Super Cache), `sg_cachepress_purge_cache()` (SiteGround), `wpfc_clear_all_cache()` (WP Fastest Cache) and the `litespeed_purge_all` action. A site with another cache can hook the `spark_living_flush_cache` action, which fires at the end. Only the home URL is cleared per URL on Batcache; other pages expire on their normal cache lifetime.

## Data model

**Events table `{prefix}spark_living_events`:** `id`, `experiment_id` (0 = site watch, see below), `variant` (A, B, H holdout, L living/promoted), `visitor_id`, `session_id`, `event_type` (`exposure`, `cta_click`, `form_start`, `form_submit`, `tel_click`), `created_at` (UTC). Indexes: `(experiment_id, event_type, session_id)`, `(experiment_id, variant, event_type)`, `created_at`, `visitor_id`. No IP address, user agent or URL is stored.

**Experiments:** private custom post type `living_experiment` (post ID = experiment ID; title = name). Chosen over an options row because tests are kept forever for the log, IDs come free, and nothing needs a custom table. Post meta (`_spark_living_` prefix): `change_type`, `a_label`, `b_label` (0.1.4, descriptive only), `element_type` (block or selector), `target`, `hypothesis`, `variants` ({A:{label,changes}, B:{label,changes,css}}), `weights` ({A,B}), `status` (draft, awaiting_approval, running, concluded, and from 0.2.0 suggested, queued, dismissed), the suggestion fields `page`, `rationale`, `evidence`, `priority`, `suggested_by`, `suggested_at`, `sessions_14d`, `sessions_as_of`, `queued_at`, `queue_order`, `dismissed_at` (0.2.0, empty on other tests), `start_date`, `end_date`, `tier` (1 or 2), `device` (all, mobile, desktop), `forced_start` (true when started below the 100-session bar), `start_sessions_14d` (the number stated at start, 0 if none), `verdict`, `winner`, `promoted`, `shipped_at`, `revert_checked`, `reverted`, `snapshot` (final numbers).

**Evolution log:** private custom post type `living_evolution`, one post per concluded test (plus one per auto-revert, `entry_type = revert`). Meta (`_spark_living_log_` prefix): `experiment_id`, `element_type`, `target`, `hypothesis`, `variant_a`, `variant_b`, `numbers`, `verdict`, `shipped`, `started`, `ended`, `note`, `device`, `forced_start`, `start_sessions_14d`.

**Definitions used by the stats** (counted per distinct session, only sessions that have an exposure row for that experiment): *sessions* = exposed sessions; *intent* = sessions with `cta_click`, `form_submit` or `tel_click`; *leads* = sessions with `form_submit` or `tel_click`. "Site watch" rows (`experiment_id = 0`, variant H or L) record exposures when winners are live but no test is running, so the lift keeps measuring.

**Options:** `spark_living_db_version`, `spark_living_rewrite_version`, `spark_living_last_run`.

**Hooks for other code:** actions `spark_living_test_started`, `spark_living_test_concluded` (id, verdict, shipped), `spark_living_test_reverted`, `spark_living_nightly_complete`.

## Not finished or not verified

Verified 2026-11-12 in WordPress Playground (PHP 8.2, WordPress 7.1, SQLite, WP_DEBUG and WP_DEBUG_LOG on, empty log): activation and the events table, both blocks (registration, editor, server render), selector tests through the REST API (cookie plus nonce, and an application password), A, B and holdout assignment, stickiness, the safety timeout, bot and editor exclusion, exposure, cta_click, tel_click and form_start events, the nightly job on seeded data (ship B, day-14 no difference, lead guard, weights inside 20 to 80), the cache flush, `/living/` (404 logged out, dashboard for an administrator) and the wp-admin forms. `node tests/stats-check.js` passes.

Added and verified the same way (WordPress Playground, `_playground/t10.js` to `t13.js`, 127 assertions, plus the older scripts re-run): device scope (`t10.js`), the visibility / CSS variant and its sanitizing (`t11.js`), the dashboard tally (`t12.js`) and eligibility at start (`t13.js`). Run them with the server from `_playground/start.sh` up.

Still unverified (needs a real Pressable site): the SQL on MySQL (Playground uses SQLite through a translation layer); the Gravity Forms hook with a real submission (Gravity Forms is not installed; the action was fired by hand with the visitor cookies); the GA4 mirror with a real `gtag`; the Divi selector swap on a real Divi 4.27.9 page; the event endpoint behind Pressable edge cache; a real WP-Cron tick (the job was called directly).

Known gaps and limits in v0.1:
* **Chained tests on one element.** When a winner ships, "B becomes the new A" is modeled as a promoted winner. A follow-up test on the same element is a new experiment whose A should equal the promoted version; the holdout then sees that experiment's A, not the true original. The brain must define follow-ups that way until v0.2 adds a baseline-of-record.
* **Weights are in cached HTML.** New visitors follow the weights printed in the page at cache time. The plugin flushes the cache when weights change (see "Cache flush"), so the lag is short. Existing visitors are sticky.
* **Eligibility (100+ sessions in 14 days) is enforced only on the number the caller sends.** The plugin has no pageview data, so it cannot tell whether `sessions_14d` is true; the brain still has to read GA4. What the plugin does is refuse a start with no number or a low one, and record a forced start. `POST /tests` with `start: true` now needs the number as well, which changes the v0.1 behaviour (it used to start without one).
* **Device is decided once per page load.** A visitor who resizes a window across 980px mid-visit keeps the decision made at load; the next page load re-decides. A returning visitor whose window sits on the other side of the line is simply not in the test that visit.
* **CSS variant exposure needs the target element in the page HTML.** Elements the theme only inserts with JavaScript after load are not seen at DOMContentLoaded. Not checked on a real Divi page.
* **The visibility / CSS snippet cannot load anything by URL** (`url(` and `@import` are stripped), and it is not linted for validity.
* **The brain's work is outside this plugin:** picking hypotheses, writing the challenger, guardrails (contrast, brand, no invented claims) and the weekly owner report are workstreams D and E. Tier 2 approval here is an admin button or an explicit `start` call; one-click approval from the owner email is not built.
* **Selector tests reveal at DOMContentLoaded**, so a slow page can keep the target hidden up to the 1.2 second timeout. Block tests have no such delay.
* **Search:** both block variants are in the HTML (as the plan says); B is hidden with CSS by default and removed in the browser.
* **Revert:** reverting a shipped winner removes it from the live set but leaves the experiment record. Auto-revert compares lead sessions after the ship with the prior 14 days of tracked leads (fewer days if tracking is newer).
* **No consent banner integration.** The plugin sets first-party cookies (`spark_living`, `spark_living_a`, `spark_living_sid`, plus `spark_living_staff` for editors). Decide with the site owner whether they need to be listed in a cookie notice.
* No unit tests inside WordPress, no uninstall routine, no multisite handling, no translation files.
