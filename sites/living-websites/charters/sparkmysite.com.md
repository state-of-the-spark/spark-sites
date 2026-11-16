# Site Charter for sparkmysite.com (DRAFT for the owner to approve)

Status: draft written 2026-11-16 by an agent. Nothing here has been saved to the site. The file `sparkmysite.com.json` in this folder is the same charter in the shape the plugin's `PUT /charter` expects. The agents must not act on it until the owner has approved it and it has been saved to the site.

Every value is marked one of three ways:

- READ: taken from a page, a file or a measurement I looked at myself.
- INFERRED: my judgement from what I read. The owner should confirm it or change it.
- OWNER: a decision only the owner can make. I put in a safe default.

## How the values were gathered

- One visit to https://sparkmysite.com/?sl_test=1 on 2026-11-16, desktop 1366 px wide, installed Google Chrome, a desktop user agent, once. It read the page's computed colours, fonts, button shapes and the list of links and forms. It did not click anything or submit anything. I also set the plugin's staff cookie (`spark_living_staff=1`) in that visit, so the plugin's script returned early. Before plugin version 0.3.0 is live the `sl_test` parameter does nothing; the staff cookie is what kept the visit out of the numbers.
- The homepage review screenshots from 2026-11-13 (`audit\screenshots\review-home-desktop-1.png` to `-4.png`, `review-home-mobile-1.png` to `-6.png`).
- The audit file `audit\2026-11-13-live-install.md` (speed check of 2026-11-15, page review facts).
- The brand folder `core\brand\quiet-voltage.md`.
- The business goal file in the owner's private repository (read only).

## Value by value

| Charter field | Value (short) | Where it came from |
|---|---|---|
| business_name | Spark Sites (a State of the Spark company) | READ. Page footer: "A State of the Spark company"; title "Spark Sites from State of the Spark". |
| business_goal | Qualified inbound leads, one every business day, and grow revenue from them | READ for the lead goal (the signed Q4 goal: one qualified inbound lead every business day). INFERRED wording. The dollar target is left out on purpose: this file is in a public repository. The owner can add the revenue figure when saving the charter on the site. |
| primary_conversion | Form `#gform_31`, "Get my plan call" | READ. The form id and its five fields were read from the live page. Choosing it as the primary conversion was your instruction. |
| secondary_conversions: booking | Links to `calendar.app.google/QZ8TkgtqGG2fMvot5` | READ. Six links on the page point there. Your instruction named it. |
| secondary_conversions: call | `a[href^="tel:"]`, (863) 225-1713 | READ. Four phone links, all to `tel:+18632251713`. Your instruction named phone taps. |
| audience | Small local business owners, Lakeland and Polk County, Florida, and elsewhere | INFERRED from the hero ("Based in Lakeland, FL, serving clients everywhere", "businesses anywhere", "Serving Lakeland since 2013") and the brand folder (home services and contractors first). The owner should confirm the vertical focus. |
| brand.colors: live_* | Pink #EC0868 to purple #8B3FD9 gradient buttons; link blue #1FB6E0; text #0A0505 on light and #FFFFFF on dark | READ from the page's computed styles. |
| brand.colors: live_dark_ground | #0B0B14 | INFERRED by eye from the screenshots (a very dark navy). Not read from the page. |
| brand.colors: brand_folder_* | Spark blue #0ECAEB, ink #101418, porcelain #F7F8F8 | READ from `core\brand\quiet-voltage.md`. |
| brand.fonts | Plus Jakarta Sans (headlines, buttons), Poppins (body), Inter (content links) | READ from computed styles. Brand-folder fonts also listed. |
| brand.button_shape | Pill, 999 px radius; form submit 10 px | READ. |
| brand.voice_notes | Plain, warm, short, local | INFERRED from the page copy. |
| off_limits | Prices, package contents, guarantees, legal text, testimonials and reviews, team names and photos, the Google rating | READ from your instruction (all seven). |
| off_limits: statistics and logos | 20+ years, 2013, 100%, the client logo row | INFERRED addition. They are claims and proof the owner owns. Remove if you want them testable. |
| off_limits: phone number and booking address | Destinations may not change | INFERRED addition. Wording around them can be tested. |
| off_limits: new claims | No new claim about results, savings, speed or rankings | INFERRED addition. It is what the plan's guardrails already say ("no invented claims"). |
| autonomy_level | suggest | READ from your instruction. |
| speed_budget.load_ms | 1100 | INFERRED. The 2026-11-15 speed check measured a median load of 856 ms; I allowed about 30 percent headroom. |
| speed_budget.button_visible_ms | 500 | INFERRED. Measured: the header button is visible at about 255 ms for the original and 397 ms for the challenger; I allowed a little above the challenger. |
| speed_budget.max_added_kb | 4 | INFERRED. The plugin's own script adds about 12 KB; I limit each new challenger to 4 KB more. |
| version | 1 | INFERRED. The plugin should assign the real version number when the charter is saved. |

## Things the owner needs to decide

1. **Two looks, one charter.** The live homepage is dark with pink to purple gradient pill buttons. The brand folder (Quiet Voltage) says porcelain and ink, spark blue as the only accent, no gradients, no magenta. I recorded both. Until you choose, agents match the live page (the existing buttons) and may use spark blue `#0ECAEB` only as a thin outline or hover accent, as the earlier page-review suggestion did.
2. **Do direct purchases count as a conversion?** The homepage has "Get my website" and "Get my marketing set up" buttons in the packages. The charter names the plan-call form as primary, so a test that sends visitors straight to the form could reduce direct purchases and nothing would notice. If purchases count, add `purchase` as a secondary conversion.
3. **Is the revenue target part of the charter?** Left out of this public file.
4. **Is the "5.0 on Google" line and the stats row really untouchable?** I included them under off-limits to be safe.
5. **Speed budget numbers** are my proposal from one day of measurements.
