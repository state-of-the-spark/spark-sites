# Results library (spec only)

The shared record of concluded tests across every enrolled site. The Scout reads it to replace the guessed lift in `payoff-scoring.md` with what has actually happened on similar pages. This is the advantage of hosting many sites: a new client starts with tests that already won (or lost) elsewhere.

Status 2026-11-16: the per-site half is built (plugin 0.4.0 keeps one row per concluded test in its own table and serves it at `GET /results`, see the last section). The cross-site store is not built. This file says what the record is, how it is matched, and how the Scout uses it, so the plugin and the controller can be built to it.

## One record per concluded test

Written by the controller when the plugin concludes a test (verdict `ship_b`, `keep_a`, `no_difference` or `guard_blocked`), from the plugin's evolution log and `GET /stats`. Losers and no-difference results are stored too, always. A library of winners only would overstate every lift.

```json
{
  "record_id": "2026-11-27-site042-46907",
  "site_key": "site042",
  "industry": "web agency",
  "page_type": "home",
  "element": "header_button",
  "change_type": "wording",
  "device": "all",
  "tier": 1,
  "started": "2026-11-13",
  "ended": "2026-11-27",
  "days": 14,
  "sessions_a": 62,
  "sessions_b": 59,
  "lead_rate_a": 0.0,
  "lead_rate_b": 0.0,
  "intent_rate_a": 0.06,
  "intent_rate_b": 0.08,
  "relative_lift_intent": 0.33,
  "relative_lift_leads": null,
  "p_b_beats_a": 0.74,
  "verdict": "no_difference",
  "shipped": false,
  "met_minimum": false,
  "holdout_note": "",
  "summary": "Plain words: what changed and what happened.",
  "variant_a": "Get started",
  "variant_b": "Get My Free Website Plan"
}
```

| Field | Meaning |
|---|---|
| `site_key` | An internal key, never the client's name or address (the library may be shown to other clients as aggregates only). |
| `industry` | From a fixed list kept with the charters (for example `home services`, `legal`, `retail`, `web agency`). |
| `page_type` | `home`, `landing`, `service`, `pricing`, `contact`, `product`, `checkout`, `other`. |
| `element` | A fixed list: `header_button`, `hero_button`, `hero_headline`, `hero_link`, `sticky_call`, `form`, `form_submit`, `phone_link`, `booking_link`, `pricing_cta`, `other`. |
| `change_type` | The same keys as the scorer: `shape`, `color`, `wording`, `style`, `placement`, `headline`, `visibility`, `cta_promote`, `cta_retarget`, `cta_add`, `form_length`, `block`, `layout`, `offer`. |
| `sessions_a`, `sessions_b` | Exposed sessions per version (the holdout is not counted). |
| `intent_rate_*`, `lead_rate_*` | The plugin's definitions: intent is a click, form submission or phone tap; leads are form submissions and phone taps. |
| `relative_lift_intent`, `relative_lift_leads` | (B minus A) / A on each rate, or null when A's rate is 0. |
| `met_minimum` | True only when both versions reached 100 sessions and the test ran 7 days. A record that did not meet it is kept but weighted down (below). |
| `verdict`, `shipped` | The plugin's verdict and whether B went live. |

Personal data is never stored: no visitor ids, no addresses, no form text.

## How the Scout matches

For a candidate with an `industry`, `page_type`, `element` and `change_type`, look for records in this order and stop at the first level that has at least 3 records:

1. industry + page_type + element + change_type
2. page_type + element + change_type
3. element + change_type
4. change_type only

`library_n` is the number of records at the level used. `library_lift` is the sample-weighted mean of `relative_lift_leads` (or `relative_lift_intent` when leads are all zero), weighting each record by its smaller version's sessions, and by one half again when `met_minimum` is false. Negative and zero lifts count. The Scout passes both numbers into `payoff.js`, which blends them with the prior (`payoff-scoring.md`); fewer than 3 records means the Scout passes nothing and the prior stands.

The Scout also copies up to 3 of the closest records into a candidate's evidence as "library, similar test, result" with the date, so the Judge and the owner can see what the lift is based on.

## Where it should live

Not in this repository (it is public, and the records come from client sites). A private store the controller can read and write, for example a table in a private spreadsheet or a small database, one row per record, plus a `results-library.json` export the controller writes into each run folder. Records are append-only; a correction is a new record that points to the old one.

## What it unlocks

- Better lift estimates in the payoff score for every new site.
- "Observe mode" for sites too small to test: they can inherit a change that won on several similar sites (a Phase B follow-up; the Judge still checks every inherited change against that site's own charter).
- The owner report's line "tests like this one have won on N similar sites".

## What the plugin records (0.4.0), and how it differs from the record above

Plugin 0.4.0 writes one row per concluded test into `{prefix}spark_living_results` (when the test concludes; once, from the stored data, for tests that had already concluded) and serves them at `GET /results?per_page=20&page=1&outcome=&change_type=&scope=` (administrators only, newest first, `X-WP-Total` header). Nothing is sent anywhere. The shape follows the record above for every field the plugin can truthfully know:

| Field in the record above | In `GET /results` |
|---|---|
| `record_id` | `<ended date>-<test id>`, no site key |
| `site_key`, `industry` | **not present**: the plugin does not know them; the controller adds them when it copies the rows into the library |
| `page_type` | only `home`, `product`, `sitewide`, `other` or `unknown` (the plugin knows the front page, a WooCommerce product, a sitewide test, and nothing finer); the controller can refine it |
| `element` | the CSS selector (`element`), not the library's fixed element names; the controller maps it |
| `change_type` | the test's own `change_type` (wording, color, shape, placement, visibility, style, block), or the one derived from the variant; the Scout's finer names (`cta_promote`, `headline`, ...) are not stored by the plugin |
| `device`, `tier`, `started`, `ended`, `days`, `sessions_a`, `sessions_b`, `intent_rate_*`, `lead_rate_*`, `relative_lift_intent`, `relative_lift_leads`, `p_b_beats_a`, `verdict`, `shipped`, `met_minimum`, `summary`, `variant_a`, `variant_b` | present, as described above (`variant_a`/`variant_b` are the a_label and b_label) |
| `holdout_note` | not present |
| (new) | `test_id`, `test_name`, `scope` (page or sitewide), `outcome` (challenger won, original won, no difference, voided; a guard-blocked test is "original won" with `verdict: guard_blocked`), `max_days` (the stop date in days), `forced_start`, `payoff_score_at_start`, and the aliases `lift` (= `relative_lift_intent`) and `probability` (= `p_b_beats_a`) |

A voided test (concluded with no verdict, for example one cleaned away) is recorded with its counts if it has any, otherwise zeros, and `outcome: "voided"`. The `met_minimum` flag uses the plugin's rule: both versions at 100 sessions or more and at least 7 days.
