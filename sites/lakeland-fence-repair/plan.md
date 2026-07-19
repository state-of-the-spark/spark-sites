---
type: research
status: draft-for-grant-review
date: 2026-07-19
project: Rank-and-Flip Local Sites (working name: Citrus Grove)
first-property: Lakeland Fence Repair
---

# Lakeland Fence Repair: Rank-and-Flip Plan (Citrus Grove Protocol v0.1)

Grant's metaphor: planting a row of citrus trees. Each site is a tree - it takes months to fruit, but the grove compounds. Lakeland Fence Repair is tree #1. The protocol below is written so tree #2 (another city) or tree #3 (another trade, e.g. roof repair) is a duplication exercise, not a rebuild.

**Business model:** Build a slightly-generic local home-services brand. Rank it top 1-3 organic + Google Maps for "{trade} repair {city}" intent. Generate real leads. Monetize leads (partner contractor or lead sale). Exit by selling the operating asset (site + GBP + phone number + lead history) on BizBuySell / Flippa / direct to a local contractor.

---

## 1. The two decisions that shape everything else

### Decision A: Fulfillment model (this is the linchpin of the whole plan)

A website alone ranks organically. But **Google Maps requires a real, verifiable business** (Google Business Profile). GBP verification in 2025-26 is strict for contractors: video verification showing signage, tools, vehicle, or workspace is now common. And BizBuySell buyers pay for *businesses with revenue*, not just websites with traffic (websites alone sell for roughly 2-3x annual profit; a lead-flow business with a ranked GBP is worth far more than raw traffic).

Options, best to worst for flip value:
1. **Operating lead-gen business (RECOMMENDED):** Form an LLC or DBA named exactly "Lakeland Fence Repair." Real phone number, real service-area address, GBP verified. Partner with one local fence contractor who fulfills jobs for a referral percentage or per-lead fee. Real jobs produce real reviews, which is what actually ranks the map listing. At exit, you sell a business with P&L, not a domain.
2. **Lead-sale model:** Rank the site, sell leads to multiple contractors. Works organically; GBP is harder to justify and riskier (Google suspends profiles that do not represent a real operating entity). Weaker exit story.
3. **Website-only flip:** Rank organically, no GBP, sell the site to a contractor who attaches their own GBP. Lowest effort, lowest ceiling. Misses the maps half of "top 1-3 organic AND maps."

The GBP name rule: Google requires the profile name to match the real-world business name. If the legal/DBA name IS "Lakeland Fence Repair," the exact-match name is compliant, not keyword stuffing. That is why the entity step matters.

### Decision B: Build stack - block theme over Divi (recommendation)

Grant asked for the honest call. **Recommendation: block-native build on a lean block theme (Twenty Twenty-Five or GeneratePress), not Divi.** Reasons, in order of weight:

1. **Flip friction:** Divi requires an Elegant Themes license. When the site sells, the buyer inherits a license dependency (no updates without buying one, or you transfer/gift API keys). A default WP theme has zero license encumbrance - the asset transfers clean. For a build-to-sell property this alone decides it.
2. **Speed / Core Web Vitals:** No page-builder CSS/JS payload. Better LCP out of the box. The stated priority is SEO; CWV is table stakes for local top-3.
3. **We already have the proven workflow:** the Monel Security and Winter Haven builds established the block-native playbook - zero inline CSS, global styles, self-hosted fonts via WP Font Library, patterns. This is now our fastest, cleanest build path.
4. **Duplication:** block patterns + theme.json + a variables sheet ({city}, {trade}, {phone}, {partner}) clone faster and more scriptably (via WP REST) than Divi layout JSON imports.

Divi fallback (if Grant overrides): Divi child theme, static CSS generation on, critical CSS on, unused modules disabled, no inline CSS in modules. Workable, but slower and license-encumbered.

Hosting: existing Pressable slot (already paid for; 199-site plan has room).

---

## 2. Brand and logo system (city-portable, trade-portable)

**Naming convention:** "{City} {Trade} Repair" as both domain and trading name. Exact-match domain + matching DBA + matching GBP name is the strongest local signal stack, and buyers on BizBuySell instantly understand what they are buying.

**Logo: a templated badge system, not a one-off logo.** One master template with three swappable variables:
- **City band** (text): LAKELAND / BARTOW / FORT MEADE
- **Trade icon** (glyph): fence pickets / roof gable / etc.
- **Accent motif** (city flavor): for Lakeland, the swan (Lake Morton swans are THE Lakeland symbol) or a low sun over water. Subtle - the badge reads "local + established," not cute.

**Style direction:** badge/shield or horizontal lockup, heavy slab or condensed sans type (trust + trade feel). Palette for fence: deep forest green + wood brown + off-white, with a safety-orange or sun-gold accent for CTAs. Roof variant later swaps brown for slate blue. Looks credible on a yard sign, a truck door, and a favicon - that is the test.

**Production path:** master template in Canva (REST API + PAT available) with the three variables; concept drafts can come from nano-banana image generation first, then rebuilt clean in Canva for vector export. Per-city duplication becomes a 10-minute task.

---

## 3. SEO plan: built FOR search, not fixed after

### 3.1 Keyword discovery (Semrush pull - data pending, will be appended below)

Seeds: fence repair lakeland fl, fence company lakeland, fence installation lakeland fl, fence contractors lakeland, gate repair lakeland, wood/vinyl/chain-link variants, plus roof repair lakeland comparison set for trade-2 sizing.

**Semrush pull completed 2026-07-19 (us database). Key findings:**

Lakeland-qualified terms (the winnable set - KD is trivially low across the board):

| Keyword | Volume | KD | CPC |
|---|---|---|---|
| fence installation lakeland fl | 260 | 2 | $6.43 |
| lakeland fence company | 260 | 5 | $7.98 |
| fence companies lakeland fl | 170 | 1 | $5.08 |
| fence installation lakeland | 140 | 1 | $6.43 |
| lakeland florida fence companies | 140 | 1 | $7.98 |
| fence company lakeland fl | 110 | 3 | $7.98 |
| fence repair lakeland | 40 | 0 | $5.24 |
| fence repair lakeland fl | 20 | 0 | $4.51 |
| fence contractors lakeland fl | 10 | 0 | n/a |
| gate/wood/vinyl repair lakeland variants | <10/mo each | - | - |

Trade comparison (fence vs roof, Lakeland):

| Keyword | Volume | KD | CPC |
|---|---|---|---|
| roof repair lakeland fl | 260 | 27 | $66.68 |
| roofing companies lakeland fl | 210 | 29 | $31.14 |

**Strategic implications:**

1. **Installation beats repair 4-6x in local volume.** "fence installation lakeland fl" (260/mo) dwarfs "fence repair lakeland fl" (20/mo). The repair-named brand should position as repair AND installation from day 1: keep the domain/brand, but the homepage targets the company/installation cluster and /fence-installation is a first-class money page, not an afterthought.
2. **The real volume is in unbranded "near me" queries** ("fence company near me" 74,000/mo nationally, "fence repair" 9,900/mo). Lakeland searchers mostly type generic queries and let Google geo-match via the local pack. This validates the plan's weight on GBP + local signals: the map pack is where the volume actually is, not the exact-match organic long tail.
3. **KD 0-5 on every Lakeland fence term = genuinely weak organic competition.** Top-3 organic is very achievable with a clean service-first site. This is a good first tree.
4. **Roofing is the higher-value, harder second tree.** Same local volume as fence, but CPC 5-10x higher ($31-67 vs $6-8) = far bigger job tickets, and KD 27-29 = real competition (plus the licensing wall in section 4). Fence first, prove the protocol, then roofing with a licensed partner.
5. **Content page opportunities from question data:** "how much does fence repair cost" + "how much is fence repair" (110/mo each, KD 6-8) = one pricing/cost-guide page; "do fence companies offer financing" (110/mo, KD 2) = financing FAQ/section. High-volume DIY how-tos (leaning fence post 320/mo, chain link 390/mo) are topical-authority support only - cap them per the service-first ratio.
6. **Competitor branded searches leak heavily** (Williams Fence, Magnolia Fence, AJ Fencing, Daniels Fence, Family Fence Factory, Danielle Fence, All Florida Enterprises = the incumbent set to study for citations, reviews count, and site structure). A reviews/comparison page can intercept some branded traffic later; more importantly this is the benchmark list for Phase 0 competitive teardown.

### 3.2 Site architecture (service-first, shallow, small)

Grant's guardrail is correct and current: Google's site-purpose classification means a service business drowning in blog posts starts looking like a content site and stops being served for "near me" service queries. The ratio stays heavily service.

```
/                      -> money page: "Fence Repair in Lakeland, FL" (primary term + brand)
/fence-installation    -> capture install intent (usually higher volume + ticket than repair)
/wood-fence-repair
/vinyl-fence-repair
/chain-link-fence-repair
/gate-repair
/storm-damage-fence-repair   (hurricane angle: FL-specific, seasonal spikes, insurance intent)
/service-areas         -> ONE hub page; 3-5 sub-pages max (South Lakeland, North Lakeland,
                          Kathleen, Highland City, Mulberry) written with genuinely local detail,
                          never doorway-page boilerplate
/reviews               -> live review feed
/about                 -> real entity signals: who, service area, licensing/insurance statements
/contact               -> NAP, form, click-to-call, map embed
/blog                  -> max 1-2 posts/month, commercial-adjacent only
                          ("fence repair cost in Lakeland", "hurricane fence damage and insurance")
```

Roughly 12-15 pages total at launch. Every service page: one primary keyword, H1 match, FAQ block (from question keywords), photos with local alt text, embedded review snippets, one CTA pattern.

### 3.3 Technical SEO (day-1 checklist)

- Block theme, zero inline CSS, self-hosted fonts (WP Font Library), no external font/CDN calls
- LocalBusiness schema (HomeAndConstructionBusiness type, serviceType per page), Service + FAQPage schema, sameAs to GBP/citations
- NAP identical everywhere (footer sitewide, contact page, GBP, citations) - lock the canonical NAP string in the protocol doc before creating ANY listing
- Click-to-call tel: links; primary number is the permanent NAP number (call tracking via a pool number in ads only, never in NAP)
- GA4 + Search Console + call tracking from day 1 (lead log = the P&L evidence a buyer pays for)
- XML sitemap, clean slugs, no tag/category archive bloat, noindex on junk archives
- CWV budget: LCP < 2.0s on 4G mobile, zero CLS; test before launch, not after

### 3.4 Maps / GBP plan (the other half of top-3)

1. Entity first: DBA/LLC "Lakeland Fence Repair," dedicated phone, service-area address that can survive video verification
2. GBP categories: primary "Fence contractor"; secondary "Fence supply store"-type only if true
3. Photos weekly for the first 60 days (job photos from the fulfillment partner)
4. Reviews engine: every completed job triggers a review ask (SMS link). Target 20+ reviews in 6 months. **Hard guardrail: never fake or incentivized reviews** (FTC + instant GBP suspension risk; also just not who we are)
5. Citations: top 40-50 (Yelp, Angi, Thumbtack, BBB, Nextdoor, Houzz, HomeAdvisor, Foursquare, data aggregators) + local (Lakeland Chamber, Polk directories - Biz Scout's directory work is adjacent here)
6. Local links: sponsor something small and Lakeland-real (little league, Lake Morton cleanup), Lakeland Ledger/LkldNow mentions if a storm-prep angle earns one

### 3.5 Ads layer (immediate traffic while the trees grow)

- Google Search ads on repair + install terms, call-focused, from month 1: proves lead flow, feeds the review engine, generates the revenue history that makes the flip valuable
- Local Services Ads (Google Guaranteed) once the entity has insurance docs: for fence this needs background check + insurance, worth it for the map-pack-above-the-map placement
- Budget question for Grant (below)

### 3.6 Timeline expectations (honest citrus math)

- Month 0-1: entity, brand, site live, GBP verified, citations begun, ads on
- Month 2-3: map pack movement on lower-competition terms, first organic page-1 entries, first ad-driven jobs and reviews
- Month 4-8: top-3 contention for "fence repair lakeland fl" organic + maps, assuming review velocity holds
- Month 9-12: asset has a P&L; flip-ready or hold-for-cashflow decision

---

## 4. Legal / compliance guardrails (flag now, not later)

- **Fence contracting in Florida:** not a state-licensed trade; Polk County / City of Lakeland local registration or specialty permits may apply. Verify at entity-formation step.
- **ROOFING IS DIFFERENT:** roofing is a state-licensed trade in Florida (F.S. 489, CCC license). Advertising or contracting roofing work without a license is a criminal offense. "Lakeland Roof Repair" can only operate as a brand fronting a LICENSED roofing partner, with the partner's license number in ads and on the site. Do not clone the fence playbook to roofing without this solved.
- **Lead handling:** if we ever sell leads to third parties, TCPA/consent rules apply to any call/SMS follow-up.
- **Reviews:** real jobs, real reviews only.
- **GBP honesty:** profile represents a real operating entity or we do not create one.

---

## 5. The protocol (systematized for duplication)

Phase checklist - each phase gets its own detailed sub-doc as we execute Lakeland Fence Repair, so the protocol is written from a real run, not theory:

| Phase | Name | Output |
|---|---|---|
| 0 | Feasibility | Semrush volume/KD/CPC check per {city}x{trade}; go/no-go threshold |
| 1 | Entity | DBA/LLC, phone, address, email, insurance; canonical NAP string locked |
| 2 | Brand kit | Templated badge logo ({city}, {trade icon}, motif), palette, favicon, OG image |
| 3 | Site build | Block-theme clone from master pattern library + variables sheet |
| 4 | GBP + citations | Verified profile, 40-50 citations, aggregators |
| 5 | Content | 12-15 service-first pages; 1-2 posts/mo ceiling |
| 6 | Reviews + links | Per-job review ask, local link plays |
| 7 | Ads | Search campaign template; LSA when docs ready |
| 8 | Measurement | GA4 + GSC + call tracking + lead log (the P&L record) |
| 9 | Exit prep | 12-mo lead log, P&L, transferable assets list, BizBuySell/Flippa listing package |

Duplication modes:
- **Same trade, new city:** clone site, swap variables sheet, new entity + GBP + citations. Target: < 1 week of work.
- **New trade, same city:** clone protocol, new keyword feasibility pull, new service-page set, new fulfillment partner, licensing check FIRST (see roofing flag).

Where the protocol lives: proposal is a new repo (`grantspark/citrus-grove` or similar) since this is a distinct venture with its own sites, playbooks, and eventually its own P&L - not personal/cross-project content. Grant to confirm repo name/org.

---

## 6. Open questions for Grant

1. Fulfillment: run as a real operating lead-gen business with a partner fence contractor? (Recommended; unlocks GBP + best flip value)
2. Exact domains owned (lakelandfencerepair.com? others in the portfolio worth feasibility pulls?)
3. GBP address + phone: what address can survive video verification?
4. Stack confirm: block theme over Divi acceptable?
5. Monthly budget: citations (~$3-500 one-time) + ads ($15-30/day to start?)
6. New repo for the venture: name/org preference?

## 7. Linchpin note

This is a Lane 1-adjacent wealth play (build asset, sell asset), not the Lane 2 sales engine. It contributes to the $5M GAV ends-goal, not the $30K/mo Sept-30 linchpin. Worth being honest that hours spent here do not move the outbound-sales bottleneck.
