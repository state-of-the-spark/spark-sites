# Living Websites: Product Plan and Build Plan (DRAFT)

**Date:** 2026-11-12
**Owner:** Grant Sparks
**Status:** DRAFT. Concept approved for build start by Grant 2026-11-12 ("capture this plan in detail... deploy subagents to start working"). Three defaults below are Lumen's and still need Grant's sign-off.
**Build folder:** `C:\Users\grant\Documents\GitHub\spark-sites\sites\living-websites\`

---

## 1. What it is

A Living Website is a WordPress site with an agent inside it whose one job is to make the site convert better over time, with no prompting. It watches its own visitors, always runs one clear split test, keeps what wins, records every change, and reports to its owner.

**Rollout order:** sparkmysite.com prototype, then VIP beta, then every site Spark Sites hosts. It is also a PR piece: Spark Sites publishes its own site's evolution log.

**Comparable:** Coframe (https://www.coframe.com/). Read 2026-11-12: a JavaScript snippet for high-traffic enterprise sites (Dropbox, Cash App), sold by demo, humans approve every variation, headline "Turn your traffic into revenue." They do not use the word "living" and do not serve small WordPress sites. That gap is the position.

## 2. The facts the design is built on

GA4, sparkmysite.com, 28 days ending 2026-11-11:

| Page | Sessions | Per day |
|---|---|---|
| /claude-skills-google-ads/ | 684 | ~24 |
| / | 326 | ~12 |
| /skill-drop-thank-you/ (not testable) | 219 | ~8 |
| /law-firm-workshop/ | 74 | ~3 |
| /free-ada-website-scan/ | 72 | ~3 |

- Only two testable pages clear 100 sessions. Most client sites will have less.
- GA4 reported **zero key events on all of the top 25 pages**. Conversions are not being counted as key events. Measurement is Phase 0.
- /skill-drop-thank-you/ sessions divided by /claude-skills-google-ads/ sessions is roughly 32%. That page has a high enough conversion rate to test on real conversions.

### Corrections from the 2026-11-12 audit (these supersede the table above where they differ)

Full audit: `C:\Users\grant\Documents\GitHub\spark-sites\sites\living-websites\audit\2026-11-12-sparkmysite-audit.md`

- **Traffic is lower and less even than the 28-day view implied.** Site total: 525 sessions in the trailing 14 days (about 37 a day), 1,738 in 28. Only the homepage clears the bar (136 sessions in 14 days). /claude-skills-google-ads/ had 40 in the last 14 days; its 684 came from an earlier burst. It is eligible only while a campaign is sending it traffic.
- **Leads are being recorded, just not as key events.** `generate_lead` fired 286 times in 28 days (238 on /skill-drop-thank-you/). Only `add_to_cart` and `contact` are marked as key events. Phone clicks are not tracked at all (four `tel:` links on the homepage).
- **Correction to the audit's header finding (checked 2026-11-12 with a headless browser, logged out).** The audit said there is no header call to action on the test pages. That was wrong for desktop: the homepage header has a "Get started" button, matched by `a.et_pb_button[href="#contact"]`, visible at 1366 wide (about 132 by 50 px, top right of the header). On mobile it is not there. It is in the page HTML, but Divi's own inline CSS hides it at 980 px and below: `@media only screen and (min-width: 768px) and (max-width: 980px) .et_pb_button_0 {display:none}` and `@media only screen and (max-width: 767px) .et_pb_button_0 {display:none}` (the module's "disable on tablet and phone" setting). Measured: visible at 981 wide, hidden at 980, 768, 767 and 390. At 390 it is hidden with the menu closed, with the hamburger menu open (the menu lists only the five text links, no button) and after scrolling (the header is not sticky, so nothing stays on screen). Staging behaves the same way. Pages with no header button in the DOM remain possible on other pages; this finding is for the homepage only. The first test is the header button wording, and the homepage hero button plus a sticky call button remain candidates for later tests.
- **Mobile share is lower than the stack note below says.** GA4 for the 14 days ending 2026-11-11: site-wide 526 sessions (desktop 287, mobile 234, tablet 5), so mobile is about 44%, not 64%. Homepage only (pagePath "/"): 137 sessions (desktop 96, mobile 41, tablet 0), so mobile is about 30%. Over 28 days ending 2026-11-11 the homepage had 328 sessions (desktop 224, mobile 103, tablet 1). The 64% figure should not be used.
- **Stack:** WordPress 7.1.4, PHP 8.2, Divi 4 (so the selector-swap engine is the main path here, not the Living Block), Gravity Forms 31 (homepage) and 25 (skills page), GA4 through Google Tag Manager, Batcache plus Pressable edge cache with `Vary: Cookie`. No consent plugin, no existing split-test plugin. 64% of sessions are mobile.
- **Caching caution:** responses vary by cookie, so the plugin's cookie must be set in the browser only and must not be one the cache varies on; confirm on the sandbox.
- **Pressable:** site 1614838; account at 222 of 250 sites; no staging copy found.

### Staging results (2026-11-12)

Full record: `C:\Users\grant\Documents\GitHub\spark-sites\sites\living-websites\audit\2026-11-12-staging-install.md`

- **Where:** a temporary Pressable staging clone of sparkmysite.com, site 1869351, https://sparkmysite-living-test.mystagingwebsite.com. The live site (1614838) was never written to.
- **Install:** `spark-living` v0.1.0 uploaded and activated on the real stack (Divi, Gravity Forms, WooCommerce, MariaDB). No PHP errors from the plugin. The events table was created.
- **Test 46892:** "STAGING TEST hero button wording", selector `a.et_pb_button[href="#contact"]`, A "Get started", B "Get My Free Website Plan", 50/50. Of 14 fresh browser sessions, 8 saw B, 5 saw A and 1 hit the double page load glitch. The assignment was sticky on a second page load in every case measured. Events written: exposure A 9 and B 12; cta_click A 4 and B 5.
- **Other checks that passed:** `/living/` returns 404 logged out. The nightly job ran clean by WP-CLI and is scheduled.
- **Cache behaviour:** pages come from Batcache and the CDN with `Vary: Cookie`. Every request after the first was a cache hit with no cookies, with the plugin's cookies and with random cookie sets, so the plugin's cookies do not cause misses. Assignment therefore stays in the browser. After a test starts or ends the cache must be purged; the plugin does that.
- **Still unverified:** a real Gravity Forms submission (`form_submit` on real MySQL) was not tested because the clone's mu-plugins could reach real services; the GA4 mirror (`living_exposure`, `living_conversion`) was not checked; and the occasional double page load on the first request in a fresh browser (it looks like the Pressable edge, not the plugin, but that is not proven).

## 3. Test rules (the "intelligent bandwidth")

Classic fixed-sample A/B testing needs thousands of visitors per variant at a 3% lead rate. These rules make results show in days and stay truthful.

| Rule | Setting |
|---|---|
| Eligibility | The page or site-wide element had 100+ sessions in the trailing 14 days |
| Concurrency | One test per site at a time, one element per test, two variants (A = current, B = challenger) |
| Allocation | Thompson sampling (Beta-Bernoulli bandit), recomputed nightly; neither variant drops below 20% of traffic |
| Minimum run | 7 full days AND 100 sessions per variant |
| Win call | Probability that B beats A is 90% or more (B wins) or 10% or less (A wins) |
| Hard stop | 14 days. No winner means "no difference": keep A, log it, queue a bolder test |
| Primary metric | Intent rate: sessions with a tracked call-to-action click, form submission or click-to-call, divided by exposed sessions |
| Guard metric | Lead count (form submissions plus click-to-call). B cannot ship if its lead rate is lower than A's with 80% or more probability |
| Holdout | A permanent 10% of visitors always see the original baseline. This yields the "living versus frozen" number |
| After a win | B becomes the new A; the old A is archived in the evolution log; a new test starts within 24 hours |
| Auto-revert | If leads over the 7 days after a ship fall more than 30% below the prior 14-day daily average, revert and log it |

**Test order:** site-wide elements first (header call to action, sticky call button, primary form), because they pool traffic from every page. Then top pages. Only large differences (offer, headline angle, call-to-action wording, form length), never subtle ones.

**Truth in marketing:** a 90% bar is directional evidence. Marketing may say the site "tests and keeps what performs better"; it may not promise a lift figure until the holdout produces one.

### Test backlog

1. **Test 1: header button wording, "Get started" (A) versus "Get My Free Website Plan" (B).** Running on staging as test 46892 (not yet on the live site). Desktop only in effect, since the button is hidden at 980 px and below.
2. **Test 2 (owner's idea, 2026-11-12): mobile only. Show the "Get started" header button (challenger) versus no header button on mobile (original).** Needs two things, both being added to the plugin now: device-scoped tests (a test that only counts and assigns visitors on one device class) and a CSS/visibility variant (B reveals the hidden button by overriding the display rule instead of swapping text). Current state, verified 2026-11-12: on mobile the original already has no header button (Divi hides it at 980 px and below), so A is the existing page and B is new. Mobile traffic on the homepage, GA4, pagePath "/": 41 sessions in the 14 days ending 2026-11-11 (about 2.9 a day), 103 in the 28 days ending 2026-11-11. **That does not clear the 100-sessions-in-14-days bar** (41 against 100). Even at 28 days the 103 mobile sessions would have to be split across two variants, and the rule needs 100 sessions per variant, so about 200 mobile sessions: roughly 68 days at the current rate. Site-wide mobile was 234 sessions in 14 days, but the button only exists on the homepage, so that figure does not count. This test is not eligible today; it needs more homepage mobile traffic (for example from ads) or the rule relaxed by the owner.

## 4. Architecture

### 4.1 Body: the WordPress plugin `spark-living`

- **Living Block** (Gutenberg): a container block whose inner blocks are the variants, each a real block tree. No code blobs. Server-rendered so both variants are in the cached HTML.
- **Assignment:** a small inline script in the head reads or sets a first-party cookie (visitor id, bucket), picks the variant per the current allocation weights, and reveals it before first paint. The other variant is removed from the DOM. This works with Pressable page cache and avoids flicker. Bots and logged-in admins always see A and are never counted.
- **Divi and non-block pages:** a selector-swap engine. A test definition names a CSS selector and the change (text, link, class, inline style). Used for headers, sticky buttons and Divi modules. Divi's own split testing is not relied on (unverified in Divi 5).
- **Events:** first-party table `wp_spark_living_events` (experiment id, variant, visitor id, session id, event type, timestamp). Event types: exposure, cta_click, form_start, form_submit, tel_click. Form submissions are recorded server-side through the Gravity Forms `gform_after_submission` hook. Other events post to a REST endpoint with `navigator.sendBeacon`. Events are mirrored to GA4 as `living_exposure` and `living_conversion` with experiment and variant parameters.
- **Stats:** runs inside the plugin on a nightly WP-Cron job, so a site keeps living even if the central brain is offline. Computes allocation weights, probability to beat, guard metric, and the win, stop and revert rules in section 3.
- **Evolution log:** custom post type `living_evolution`. One entry per concluded test: hypothesis, both variants, numbers, verdict, dates.
- **Dashboard:** a front-end page at `/living/` rendered only for users with `manage_options` (everyone else gets a 404), plus the same view in wp-admin. Shows the current test, the growth-rings timeline of every evolution, and cumulative lift against the holdout.
- **REST API** (application-password auth): read stats, read log, create a test, conclude a test. This is how the brain talks to the site.
- **Privacy:** no personal data stored; the visitor id is a random value; IP addresses are not saved.

### 4.2 Brain: the nightly agent (one scheduled routine, loops over enrolled sites)

1. Read each site's state through the plugin REST API.
2. If no test is running, pick the next hypothesis from the site's backlog and write the challenger variant (as blocks or a selector swap).
3. Check the variant against guardrails, then create the test.
4. Write the weekly owner report.

**Hypothesis sources, all already available:** Google Ads search terms (headline message match), winning Meta ad hooks, Local Services Ads lead and call counts, GA4 device and source splits, Search Console queries, and the fleet playbook.

**Guardrails:** reads the client brand file; every variant passes WCAG AA contrast; no invented claims, statistics, testimonials, prices or guarantees.

**Autonomy tiers (Lumen's default, needs Grant's sign-off):**
- Tier 1, ships on its own: wording of headlines and calls to action, button color within the brand palette, section order, form length.
- Tier 2, one click from the owner in the weekly email: any change to an offer, price, guarantee or legal claim.

### 4.3 Memory: fleet learning

Every concluded test from every site lands in one shared playbook (element, industry, what changed, result). Sites too small to test run in observe mode and inherit changes that have won on several similar sites. This is the advantage an enterprise tool cannot copy.

### 4.4 Reports

Weekly email to the owner: "Your website changed itself this week." What was tested, what won, what shipped, leads this week against last, the next test. Monthly: the growth-rings summary.

## 5. Rollout

| Phase | Scope | Exit test |
|---|---|---|
| 0. Measurement | sparkmysite.com: form submissions and click-to-call marked as GA4 key events; first-party event log live | A test form submit and a test call click both appear in the log and in GA4 |
| 1. Prototype | sparkmysite.com: site-wide call to action first, then /claude-skills-google-ads/, then the homepage. Public evolution log | Three concluded tests and one shipped winner |
| 2. VIP beta | WordPress VIP sites that pass the eligibility scan, ads clients first | Each beta site has one concluded test and a weekly report the owner has read |
| 3. Fleet | All hosting clients; low-traffic sites in observe mode | Enrollment is one click per site |

**Standing step for every Pressable clone or staging copy (added 2026-11-12).** A clone arrives indexable, able to send mail, and with every integration live. The first actions on any clone, before anything else: (1) set noindex (`blog_public` 0); (2) block mail (a `pre_wp_mail` mu-plugin); (3) deactivate Jetpack and every plugin or mu-plugin that calls outside services (mail, CRM, automation, webhooks); (4) cancel pending scheduled actions (Action Scheduler and WP-Cron events such as subscription renewals). Staging site 1869351 is temporary and is to be deleted when testing ends; deleting it needs the owner's approval at that time (Pressable `delete_site`, confirm the ID is 1869351 and not 1614838).

## 6. Landing page concept (solarpunk, inside the Quiet Voltage system)

A wireframe website grows as a plant while the visitor scrolls.

1. **Hero:** a seed-like site wireframe in soil, sun rising. "Your website is alive."
2. **Roots:** lines grow down to labeled sources: GA4, Google Ads, Meta Ads, Local Services Ads, forms, calls.
3. **Branching:** two branches sprout marked A and B. Light (traffic) falls on both; the weaker fades and is pruned, the stronger leafs out.
4. **Growth rings:** the trunk in cross-section; each ring is one evolution, with a date and what changed.
5. **Live proof:** a real counter from this page's own log. "This page has evolved N times. Current test: ..."
6. **Call to action:** see the evolution log; get a Living Website.

Built as inline SVG with scroll-driven animation, honoring reduced-motion settings, WCAG AA contrast.

## 7. Marketing language

- **Name:** Living Websites by Spark Sites
- **Headline:** Your website is alive. It gets better every week, on its own.
- **Subhead:** Most websites are finished the day they launch. Yours watches its own visitors, tests one improvement at a time, keeps what brings in more leads, and reports back to you.
- **Line:** Built once. Growing forever.
- **How it works:** It watches. It tests one thing. It keeps the winner. It tells you what changed.

**Facebook ads:**

1. **Your website hasn't changed since launch. Your customers have.** A Living Website tests its own headlines, buttons and offers every week and keeps the winners. No meetings, no prompts. See one evolve.
2. **We let our website redesign itself. Here's every test it ran.** Links to the public evolution log.
3. **Last night your website ran an experiment while you slept.** One test at a time. More calls and form fills over time. A report in your inbox every week.
4. **A brochure sits there. A Living Website learns.** Video: time-lapse of the growth rings.

## 8. Decisions still open for Grant

1. **Autonomy tiers** as written in 4.2 (Tier 1 automatic, Tier 2 one-click approval). Default taken 2026-11-12, owner can change.
2. **Pricing** (working default, not announced anywhere: basic version included in hosting to counter the roughly 25% yearly hosting loss; paid tier with the ad-data brain for VIPs).
3. **Name** "Living Websites by Spark Sites" and the plugin name `spark-living`. Default taken 2026-11-12, owner can change.
4. **Landing page** built in the light Quiet Voltage look. Default taken 2026-11-12, owner can change.

## 9. Risks

- **Low traffic:** handled by site-wide tests, the intent metric and fleet learning; some sites will only ever observe.
- **Search:** both variants are in the HTML and one is removed in the browser. Tests are short and neither variant is shown only to crawlers.
- **Caching:** assignment is in the browser, so page cache is unaffected. The events endpoint must be excluded from cache.
- **Brand drift and bad claims:** guardrails and Tier 2 approval.
- **Novelty effect:** the holdout and the auto-revert rule.
- **Chained tests weaken the 10% holdout comparison.** The holdout always sees the original baseline, but each shipped winner changes what the other 90% see, and the next test runs on top of it. After several wins the holdout is comparing against a page that is further and further from the live one, and the lift it shows mixes every change together. Unsolved; to be worked out before any lift figure is published.

## 10. Workstreams

| # | Workstream | Output | Started 2026-11-12 |
|---|---|---|---|
| A | Plugin v0.1 | `sites\living-websites\plugin\spark-living\` | Yes (Sonnet) |
| B | Measurement and platform audit, read-only | `sites\living-websites\audit\2026-11-12-sparkmysite-audit.md` | Yes (Sonnet) |
| C | Landing page prototype, local only | `sites\living-websites\landing-prototype\index.html` | Yes (Sonnet) |
| D | Brain routine and fleet playbook | Scheduled routine plus playbook store | After A is installed on a test site |
| E | Weekly owner report | Email template and sender | After D |
| F | Install on a Pressable sandbox, then sparkmysite.com | Live prototype | After A and B; going live on the public site needs Grant's go |
| G | Ads and launch PR | Meta campaign, press piece | After Phase 1 produces a real result |
