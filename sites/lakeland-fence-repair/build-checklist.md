# Citrus Grove protocol - Lakeland Fence Repair working checklist

Rule: document each phase AS EXECUTED so this file becomes the reusable protocol. Detail lives here; strategy lives in `plan.md`; values live in `variables.md`.

## Phase 0 - Feasibility [DONE 2026-07-19]
- [x] Semrush pull: all Lakeland fence terms KD 0-5, installation 260/mo > repair 20/mo, roof comparison (higher CPC, KD 27-29, licensing wall). GO.

## Phase 1 - Entity [BLOCKED on Grant decisions]
- [ ] Fulfillment partner agreement (who takes the jobs, referral %)
- [ ] DBA/LLC "Lakeland Fence Repair" filed (makes exact-match GBP name compliant)
- [ ] Dedicated phone number (permanent NAP number; ad tracking numbers separate, never in NAP)
- [ ] Polk County / City of Lakeland local registration check for fence work
- [ ] Lock canonical NAP string in variables.md BEFORE any listing is created

## Phase 2 - Brand kit [LOGO DONE 2026-07-20]
- [x] Final brand package delivered by Claude Design (direction "2b Wordmark Lockup - refined/estate"): 7 SVGs + brand guide, in `brand/final/`. Clone tokens {CITY} {TRADE} {PHONE} {TAGLINE} {COUNTY} - pickets and palette never change, so the kit re-clones per city (Bartow, Fort Meade)
- [x] Logo live on staging: lockup-light in header (site-logo block, 280px), favicon as WP site icon
- [ ] Palette: brand guide locks Estate gold #B08D3F, but the site ships Sun Gold #E8A33D on accent-1 (buttons/eyebrows). GRANT DECISION - reconcile or keep the brighter CTA gold deliberately
- [ ] OG image (not yet built; seal.svg or monogram are candidates)

### Phase 2 lessons (apply to every future tree)
- **WordPress core refuses SVG uploads** (`rest_upload_sideload_error`). Either rasterize to PNG or add a sanitizing plugin. PNG chosen here: one less plugin in a site being built to sell.
- **Never ship a live-text SVG as a logo.** The lockup calls Marcellus, which is not installed on the site or on most visitors' machines - and an SVG loaded via `<img>` cannot pull a webfont, so it silently falls back to Georgia (or generic serif on Android/Linux). Every visitor would see a slightly different logo. Fix: render to PNG with the font embedded (headless Chrome + base64 @font-face, script kept at `brand/final/rendered/`), or outline the text before shipping vector.
- **Swapping site-title text for a fixed-width logo breaks a `nowrap` header.** Text shrinks and wraps; a 280px image does not. The TT25 header group had `flexWrap:"nowrap"`, so the Get a Free Quote button was clipped off-screen at 390px. Fix was block-native (`flexWrap:"wrap"`), no CSS added.
- **Company name must move into the logo's alt text** when the text site-title is removed, or the name leaves the DOM entirely.

## Phase 3 - Site build (staging: lakelandfencerepair.mystagingwebsite.com) [CORE DONE 2026-07-19]
- [x] Global styles via REST (global-styles post ID 5): brand palette on TT25 slugs (base/contrast/accent-1..6), SYSTEM FONT STACK instead of Font Library webfonts - deliberate CWV choice, zero font payload (deviation from original plan, keep for future trees)
- [x] Header (nav ref 23 + Get a Free Quote button) + footer (deep-forest NAP block, services + company link columns) via template-part REST
- [x] All 16 pages published: home (7, page-no-title template, front page), fence-installation (8), wood (9), vinyl (10), chain-link (11), gate (12), storm (13), service-areas hub (14) + south-lakeland (15) + north-lakeland (16) + kathleen (17, real 2019 EF-2 tornado angle), cost guide (18), financing (19), reviews (20, honest placeholder), about (21), contact (22, Jetpack form to grant@stateofthespark.com)
- [x] Schema: HomeAndConstructionBusiness (home) + Service JSON-LD per service/area page via wp:html blocks (no plugin dependency)
- [x] Meta: Slim SEO installed; excerpts = meta descriptions (140-160 chars) on all pages; sitemap live at /sitemap.xml
- [x] Sample page deleted; pretty permalinks confirmed; 16/16 pages verified (200, single H1, no leaked block markup, CTA, schema)
- [x] Interim imagery: 5 CC0 public-domain photos (media 47-51, license + source recorded in each media description) placed on install/wood/vinyl/chain-link/storm pages
- [x] Home v2 redesign (2026-07-19 late): Mossy Oak Fences structure adopted per Grant (profile: design-profile.md) - cover-block hero w/ photo + 70% forest overlay at fixed 560px (NOT full-vh), trust cards, 6 image-card services grid (4:3 crops), two-col editorial w/ photo, "Ready to get started?" 4-step + Jetpack quote form ON home (First/Last/Email/Phone/dropdown/message), sitewide mega-footer w/ full page hierarchy (4 columns). Copy unchanged per instruction.
- [x] LESSON: Jetpack form submit is block `jetpack/button` - `jetpack/field-button` is dead and silently renders NO submit button (both forms shipped buttonless until caught; verify submit label text, not just "<form")
- [ ] REPLACE interim photos with real job photos (or AI-generated after Gemini billing fix) before launch
- [x] Logo: DONE 2026-07-20 (Claude Design package, not Gemini - Gemini billing no longer blocks the logo, only custom photography). Header site-title replaced by site-logo block (media 61, 1200x156 PNG, alt = "Lakeland Fence Repair - fence repair and installation in Polk County, Florida"); site icon set (media 62, 512x512). Verified rendered at 390/768/1440
- [ ] Staging is INDEXABLE (no X-Robots-Tag, blog_public not in REST): Grant flips Settings > Reading > "Discourage search engines" in wp-admin until DNS cutover, then flips back
- [ ] CWV check: LCP < 2.0s mobile, zero CLS (not yet measured)
- [ ] GA4 + Search Console + call tracking wired (needs phone number decision)
- [ ] Phone number + NAP into header/footer/contact/schema once Grant provides
- [ ] DNS cutover lakelandfencerepair.com -> Pressable (domain currently a registrar parking lander that 200s every path); verify HTTPS + search-replace of staging URLs

## Phase 4 - GBP + citations
- [ ] GBP created: name = legal DBA, category "Fence contractor", service-area business, address hidden (verify with 603 Hartsell; P.O. Box not allowed)
- [ ] Video verification prep (signage/tools/vehicle evidence with partner)
- [ ] 40-50 citations + data aggregators, exact canonical NAP
- [ ] Local: Lakeland Chamber, Polk directories (Biz Scout list overlap)

## Phase 5 - Content cadence
- [ ] 1-2 commercial-adjacent posts/month max (service:blog ratio guardrail)

## Phase 6 - Reviews + links
- [ ] Per-job SMS review ask flow with partner; target 20+ reviews in 6 months; real reviews only
- [ ] 1-2 local link plays (sponsorship, storm-prep PR angle)

## Phase 7 - Ads
- [ ] Google Search campaign (call-focused) from month 1; LSA once insurance docs ready

## Phase 8 - Measurement
- [ ] Weekly: rankings (organic + map pack), calls/leads log, GSC. Lead log = the P&L evidence for exit.

## Phase 9 - Exit prep (month 9-12)
- [ ] 12-mo lead log + P&L, transferable assets list, BizBuySell/Flippa package
