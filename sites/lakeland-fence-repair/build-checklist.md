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

## Phase 2 - Brand kit
- [ ] 2-3 badge logo concepts (nano-banana drafts -> Canva master template with {city}/{icon}/{motif} variables)
- [ ] Palette + type locked into theme.json tokens
- [ ] Favicon + OG image

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
- [ ] Logo: BLOCKED - Gemini image models need billing enabled on the API key project (free tier limit 0; old nano-banana model retired). Header uses styled site-title text meanwhile
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
