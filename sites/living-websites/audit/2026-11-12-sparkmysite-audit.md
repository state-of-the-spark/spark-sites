# sparkmysite.com audit for the Living Websites split-test plugin (read-only)

**Date:** 2026-11-12. **Method:** read-only. GA4 Data API (property confirmed as sparkmysite.com: `hostName` returns only `sparkmysite.com`), WordPress abilities (read), Pressable read operations, and plain HTTP GETs of the two public pages (see the tooling note under section 3). Nothing was changed anywhere.

## What this means for the build

**Blockers and corrections to the spec**

1. **The spec's "zero key events" finding needs a precise reading.** `generate_lead` fires (286 events in 28 days) but is NOT a key event (`keyEvents` = 0). Only `add_to_cart` (8) and `contact` (2) are marked. So lead form submissions are tracked but not counted as conversions. Fix is one GA4 Admin click, not a build.
2. **There is no phone-click event at all.** The homepage has 4 `tel:+18632251713` links; no event is sent when one is clicked (GA4 shows no tel/phone event). The `click` event (142) is GA4 enhanced-measurement outbound clicks, not tel clicks. `/claude-skills-google-ads/` has no `tel:` link.
3. **Most leads are recorded on a thank-you page, not on the form page.** 238 of 286 `generate_lead` events fire on `/skill-drop-thank-you/`. Form 25 redirects there after submit. Only 5 fire on `/claude-skills-google-ads/` itself. The plugin must attribute the lead to the originating page and test (cookie carries the variant), not the page where the event fires.
4. **There is no site header on either test page.** Both pages use the Divi `page-template-blank` template with no Theme Builder header and no sticky element. The homepage nav is a Divi Menu module inside the page content (section 0); `/claude-skills-google-ads/` has no nav. "Site-wide header call to action" (the spec's first test) does not exist as a single element. The first site-wide candidate must be created, or the first test must be a page-level hero button.
5. **Only one page clears 100 sessions in 14 days.** `/` has 136. The next is `/free-ada-website-scan/` at 67. `/claude-skills-google-ads/` has only 40 in the trailing 14 days (684 over 28), so it fails the 14-day bar now; traffic has fallen. Total site sessions: 525 (14 days) and 1,738 (28 days).
6. **Pressable shows no existing staging or sandbox for this site, and a sandbox would count as one of 222 of 250 billable sites** (28 spare), but whether sandbox sites bill as sites is not determined (see section 4).
7. **Divi 4.27.9, not Divi 5.** Selector-swap engine is the right call for the Divi pages. The WordPress core version is 7.1.4.
8. **GA4 is loaded through Google Tag Manager `GTM-5B5SKJ`**, not gtag directly. The first-party mirror events (`living_exposure`, `living_conversion`) should push to `dataLayer`, and a GA4 event tag or the existing `gtag` fallback must be in the container. The existing mu-plugin `spark-lead-tracking` already calls `gtag('event','generate_lead')`, falling back to `dataLayer.push`.
9. **No consent banner or cookie plugin exists**, so a first-party cookie will not be blocked or need gating (section 5).

**Exact Phase 0 steps**

1. In GA4 Admin, Events: mark `generate_lead` as a key event (and keep `contact`, `add_to_cart`). Marking is not retroactive for history reports beyond what GA4 backfills; new data counts from the toggle.
2. Add a phone-click event: in GTM `GTM-5B5SKJ`, a Click-URL-starts-with-`tel:` trigger plus a GA4 event tag `tel_click`, then mark `tel_click` as a key event. Alternative: `spark-living` emits it itself.
3. Do not rely on thank-you-page `generate_lead` for experiments. `spark-living` records `form_submit` server-side for Gravity Forms 25 and 31 (hook `gform_after_submission`) and mirrors to GA4.
4. Create a real, testable site-wide element (a header or hero call to action) before the first site-wide test, or start with the hero button on `/` (`a.et_pb_button_0`, "Get started", `#contact`).
5. Install on a Pressable sandbox first. Confirm the sandbox policy before creating one.
6. Exit test for Phase 0: a test form submit on form 31 and a test tel click appear in the first-party log and as key events in GA4 (DebugView or the realtime report).

## 1. GA4 (property confirmed: only host is `sparkmysite.com`)

**Events in the last 28 days (to 2026-11-11), with key-event counts**

| eventName | eventCount | keyEvents |
|---|---|---|
| scroll_depth | 3648 | 0 |
| page_view | 2497 | 0 |
| session_start | 1763 | 0 |
| first_visit | 1579 | 0 |
| user_engagement | 1308 | 0 |
| generate_lead | 286 | **0** |
| click | 142 | 0 |
| ada_scan_complete | 19 | 0 |
| add_to_cart | 8 | 8 |
| video_progress | 3 | 0 |
| contact | 2 | 2 |
| ai_search_check_complete | 1 | 0 |
| video_complete | 1 | 0 |
| video_start | 1 | 0 |

- Key-event status here comes from the `keyEvents` metric per event. The key-event admin list itself was not read (no admin tool); the metric is the evidence.
- Form submit, generate_lead: exists, not a key event. Phone/tel click: **no such event exists**.
- `generate_lead` by page (28 days): `/skill-drop-thank-you/` 238; `/make-ai-do-real-work/` 9; `/` 5; `/claude-skills-google-ads/` 5; `/contact-spark-sites/` 5; `/free-ai-search-visibility-check/` 5; `/free-ada-website-scan/` 3; `/lakeland-local-website-design/` 3; thank-you page for SEO checklist 3; and several pages at 1 or 2.
- `contact` (2, key event) fired on `/contact/` only.

**Sessions**

- Last 14 days (2026-10-29 to 2026-11-11): **525**.
- Last 28 days: **1,738**.

**Sessions by page, trailing 14 days (top 15)**

| Page | Sessions | Passes 100 bar |
|---|---|---|
| / | 136 | Yes |
| /free-ada-website-scan/ | 67 | No |
| /free-ai-search-visibility-check/ | 52 | No |
| /claude-skills-google-ads/ | 40 | No |
| /make-ai-do-real-work/ | 24 | No |
| /skill-drop-thank-you/ | 20 | No (not testable) |
| /law-firm-workshop/ | 18 | No |
| /make-ai-do-real-work/watch/ | 17 | No |
| /contact-spark-sites/ | 16 | No |
| /website-design/ | 10 | No |
| /what-is-ai-optimization-ai-search-success/ | 10 | No |
| /ai-website-for-27/ | 8 | No |
| /checkout/ | 7 | No |
| /our-team/ | 7 | No |
| /seo-ranking-checklist/ | 7 | No |

**Sessions by device category (28 days):** mobile 1,107 (63.7%), desktop 633 (36.4%), tablet 14.

**Sessions by source/medium (28 days, top 10):** (direct)/(none) 503; fb/paid 478; facebook/paid_social 255; google/organic 120; ig/paid 87; m.facebook.com/referral 85; google/cpc 64; facebook.com/referral 52; th/paid 24; bing/organic 9. Paid social is the main traffic driver (roughly 820 sessions across fb, facebook, ig, th paid), so variants must be mobile-first.

## 2. WordPress

Source: WordPress abilities `core/get-environment-info`, `core/get-site-info`, Pressable `list_site_plugins`, `list_site_themes`.

- **WordPress 7.1.4**, PHP 8.2.35, MariaDB 11.8.9, environment `production`.
- **Theme:** child theme `divi-child-theme` 4.2.2 (active) over **Divi 4.27.9** (parent). Divi 4, not Divi 5.
- **Homepage (page 46114) and `/claude-skills-google-ads/` (page 45198): both built in Divi** (3,985 and 1,691 `et_pb_` occurrences; 13 `wp-block-` strings each, which come from global block styles, not page content). Both use the `page-template-blank` template.
- **Form plugin: Gravity Forms 3.2.2** (add-ons: Mailchimp, Stripe, Zapier, Color Picker, Zero Spam). Jetpack Forms exists as a module but `jetpack-forms/list-forms` returned an empty list, so Jetpack forms are not in use.
- **Forms by ID** (titles come from the `spark-lead-tracking` mu-plugin map, not from reading Gravity Forms itself): 2 Contact Form; 3 ADA Contact Form; 4 Client Links Page Request; 6 Content Phase Form; 7 Design Phase Form; 9 Get Free Website System; 10 Spark Messaging Consultation; 12/13 Content Concierge sign-ups; 15 HotSpark Discovery Estimate; 17 Leads Master Mind; 19 Media Website Estimate; 20/21 AI Website Questionnaire; 22 Website Sales Form; 23 Spark Access inquiry; 24 AI ROI Strategy; **25 Skill Drop - Google Ads Skill Download**; 26 Free SCORE Webinar; 27 SEO Checklist; 28 Lakeland Local; 29 Roofing plan call; 30 Websites page plan call; **31 Home Page: Plan Call Request**; 32 Law Firm plan call; 33 Law Firm front door review; 34 Contractor Marketing plan request. Placements confirmed on the live pages: **form 31 on `/`**, **form 25 on `/claude-skills-google-ads/`**. Placement of the other IDs is not determined (the Gravity Forms API needs authentication and no read ability exists for it).
- **Active plugins (relevant):** Gravity Forms and add-ons, WooCommerce 11.2.1 with Subscriptions, AutomateWoo, AffiliateWP, Yoast SEO 28.8, Jetpack 16.5-a.1, Mailchimp for WooCommerce, Smash Balloon Instagram Feed, Wordfence, Redirection, Akismet, ManageWP Worker, Divi Dash, MCP Adapter, Abilities API, Web Stories, Widgets for Google Reviews, Post to Google My Business. Full list is 66 plugins (Pressable).
- **Must-use plugins that matter:** `spark-lead-tracking` (fires Meta Lead, Google Ads conversion `AW-11553553986`, and GA4 `generate_lead` on Gravity Forms confirmation and on the law funnel REST forms), `spark-direct-checkout`, `spark-skilldrop-form-css` (styles form 25), `spark-law-lean`, `spark-law-cache-ttl`, `spark-seq-gateway`, `spark-law-video-tracking`. Drop-ins: `advanced-cache.php` (Batcache), `object-cache.php` (Memcached).
- **Existing A/B testing plugin:** none found. **Tag manager:** GTM via page head (no plugin). **Analytics plugin:** none (no Site Kit, MonsterInsights, ExactMetrics). **Caching plugin:** none as a plugin; page cache is Batcache plus Pressable edge cache (drop-in, not a plugin). Divi's own split testing was not tested.

## 3. Front end

**Tooling note:** `playwright-headless` failed with "Browser is already in use for C:\Users\grant\.claude\lumen-headless-profile" (another session holds the profile lock). Per the brief I did not use Claude in Chrome. I fetched both URLs with plain HTTP GET (curl, no JavaScript execution) and analyzed the HTML source. Therefore **not determined**: anything injected by JavaScript after load (the rendered DOM, GTM-injected tags actually firing, computed sticky/fixed behavior).

**GA4 and tags (identical on both pages)**
- **GTM container `GTM-5B5SKJ`** loaded by inline snippet in the head (plus the noscript iframe). No `gtag/js` script tag and no direct gtag.
- The public GTM container script (`gtm.js?id=GTM-5B5SKJ`) references GA4 measurement ID **`G-L1E46CXFZT`** via a Google tag (`__googtag`), Google Ads **`AW-11553553986`** (`__awct`), and a `scroll_depth` GA4 event. GTM tag configuration inside the container admin was not read.
- Meta Pixel ID **122043853188869** (referenced in `spark-lead-tracking`).

**Homepage `https://sparkmysite.com/` (page 46114)**
- Header: no `<header>` and no Theme Builder header output. Section 0 holds a Divi Menu module (`.et_pb_menu_0`, `nav.et-menu-nav`, menu "main-menu-2026"): Website Support & Design, AI & Automations, Web Strategy, Contact (`/contact-spark-sites/`). There is no sticky element (no `position:fixed`, `position:sticky`, or `et_pb_sticky` in the page).
- **Primary call to action:** `a.et_pb_button.et_pb_button_0` text "Get started", `href="#contact"`. Secondary: `a.et_pb_button_1` "See the menu" (`#packages`); `a.et_pb_button_2` "Get my website" (`/checkout/?add-to-cart=46107`); `a.et_pb_button_3` "Get my marketing set up" (`/checkout/?add-to-cart=46600`). Stable selector: `a.et_pb_button[href="#contact"]`.
- **`tel:` links (4, all `tel:+18632251713`):** a pink pill "Call us: (863) 225-1713" with inline styles; a text link "Call us" ("Call us or ... calendar"); two plain "(863) 225-1713" links. No class or id on any of them; usable selector: `a[href="tel:+18632251713"]`. None fires a tracking event.
- **Primary form:** Gravity Forms **31** "Home Page: Plan Call Request", `form#gform_31`, wrapper `#gform_wrapper_31`, anchor `#gf_31`, section `id="contact"`. AJAX submission (iframe target `gform_ajax_frame_31`); fires `gform_confirmation_loaded`.

**`https://sparkmysite.com/claude-skills-google-ads/` (page 45198)**
- Header: none (no nav, no sticky element).
- **Primary call to action:** `a.et_pb_button.et_pb_button_1` "Get the free skill", `href="#get-skill"`. Others: `et_pb_button_2` "Download in the FB Group" (facebook.com/groups/sparkmysite), `et_pb_button_3` "Get ALL of Our AI Tools" (skool.com). `et_pb_button_0` was not present as an anchor (not determined what it is). Stable selector: `a.et_pb_button[href="#get-skill"]`.
- **`tel:` links:** none.
- **Primary form:** Gravity Forms **25** "Skill Drop - Google Ads Skill Download", `form#gform_25`, wrapper `#gform_wrapper_25`, section `id="get-skill"`; submit button styled by mu-plugin `spark-skilldrop-form-css`; redirects to `/skill-drop-thank-you/` where `generate_lead` is recorded.

**Response headers (GET, anonymous)**
- Server nginx, `Host-Header: wpcloud`, `X-ac: ... _atomic_dca HIT|MISS`, `Server-Timing: a8c-cdn ... cache;desc=HIT|MISS` (edge CDN cache). `Vary: Cookie`. Homepage also `Cache-Control: max-age=191, must-revalidate` and `X-nananana: Batcache-Hit` (Batcache page cache, short TTL). Observed: homepage `MISS` then `MISS`, skills page `MISS` then `HIT`; with the query string `?audit=1` the homepage showed one `HIT`. Pages are cached at the edge and by Batcache, but not consistently.
- `Vary: Cookie` means cookies can affect cache keying at the edge; the plugin's cookie must be set client-side only (never via a `Set-Cookie` response header) and must not be added to the cache key. The `/wp-json/` REST events endpoint must be bypassed from cache (not tested; no write calls made).

## 4. Pressable

- **Site ID: 1614838** (name `sparkmysite`, domain `sparkmysite.com`, state live, datacenter DFW, created 2026-03-10, `cloned_from_id` null, `staging` false, `sandbox` false).
- **Staging or sandbox clone:** none found. `search_sites` for "sparkmysite" returns exactly 1 site (this one). A clone with a different name would not match; "not determined" for clones named otherwise (no clone-listing tool was used).
- **Edge cache:** `enabled`; `defensive_mode` false (`get_site_edge_cache_status`).
- **PHP version:** 8.2 on the site (confirmed by WordPress as 8.2.35). The account default is 8.5.
- **Account site counts (`get_account_site_counts`):** plan_type `single`, billable sites **222**, max **250** ("222 / 250"), 28 spare. **Whether a sandbox counts toward the 250 limit: not determined.** The tool reports numbers only and the create_site documentation lists `sandbox` as an option without stating billing. Pressable creates sandboxes as non-live sites; confirm with Pressable before creating one. Nothing was created.
- Storage: file system 8.3 GB, database 1.7 GB.

## 5. Consent banner and cookie plugins

- **None found.** No Complianz, Cookiebot, CookieYes, Osano, Termly, iubenda, or OneTrust in the plugin list, in either page's HTML, or as script sources. The string "consent" appears inside Google's GTM runtime script, which is generic library code; no Consent Mode configuration was read from the container admin (not determined).
- A first-party cookie will not be blocked by a consent banner. Privacy-policy text may still need updating before launch (a decision, not an audit finding).
- Note: the existing `spark_lead_pending` cookie (set by `spark-lead-tracking`) shows first-party cookies already work on this site.
