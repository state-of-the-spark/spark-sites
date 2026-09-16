# Critical read — /websites/ (page 46108), 2026-09-16

Read as a skeptical Polk County roofer/HVAC/auto-shop owner who has never had a website, landing from a Judah cold call.

## What was wrong on first draft, and fixed in the same pass

1. **Hero badge still said "No contracts. No hidden fees. Just $297/month."** — leftover from the contractor template's single-product framing. Wrong: this page has three prices, not one. Fixed to "Starting at $34/mo. No hidden fees."
2. **Bottom CTA row still had the contractor template's duplicate buttons and badge**: "Get started now" (linked straight to the $297/mo Growth product), "Request a consult" (linked to an old contractor-specific Google Calendar booking link), and a badge reading "No contracts · 90-day money-back guarantee · $297/month." None of that was written for this page — it would have quietly sold Growth-only and promised a 90-day guarantee never confirmed for the Starter/Built-For-You tiers. Fixed: "See the 3 tiers" (anchors to pricing) and "Call (863) 225-1713" (tel: link), badge now "Three tiers, one flat price each. No hidden fees."
3. **Real mobile bug, not just copy**: the hero row and the FAQ row both use Divi's `display:grid` with a fixed two-column split (`grid-template-columns` with no `!important`, no responsive override, inherited unchanged from the contractor/roofing template). On a 390px phone this doesn't stack — the second column (hero photo + all 3 stat cards on the hero; the entire FAQ answer column) renders off-canvas to the right and is invisible. This is a pre-existing template gap that nobody had hit before because prior niche pages didn't get audited this deep on mobile. Fixed by targeting Divi's generated `.et_pb_row_1` / `.et_pb_row_8` classes with `grid-template-columns:1fr!important` under a `max-width:700px` media query (page-scoped, only affects this page). Confirmed by computed-style check (not just eyeballing) that both rows now compute a single column on a 390px viewport, and by screenshot that the hero stat cards and every FAQ answer are now fully visible and full-width on mobile.
4. **Pricing-card badge pill ("THE AVERAGE SMALL BUSINESS SITE") rendered as a stretched blob** on mobile because `border-radius:999px` on a 3-line-wrapped badge doesn't read as a pill once it wraps. Fixed: `border-radius` down to 8px so it reads as a clean rounded rectangle at any width.

## Guardrails from Amber's 9/14 roofing review — applied here from the start, not bolted on after

- **No "custom website, unlimited pages" promise anywhere.** The trust-card section that carried that literal phrase on the contractor/roofing template was rebuilt from scratch: 6 new cards (mobile-friendly, hosting/backups, human support, AI-enhanced/human-reviewed, keep-your-site, room-to-grow) that are true for all three tiers. Page count is stated explicitly everywhere it matters: Starter = one page, Built-For-You = 1 to 5 pages, both in the pricing cards and in FAQ #1 and #4.
- **No social media marketing in any tier.** FAQ #8 directly answers "Do you handle my social media posting?" with "No" and explains what Growth's content hours actually cover, so a prospect who asks doesn't get a vague non-answer.
- **Content wording limited to "AI-enhanced content."** Used exactly that phrase (trust card #4, Growth tier bullet, FAQ #6), never "social," never a stronger content claim than "about 4 hrs/mo."
- **Client-supplied-content dependency flagged wherever it applies.** Built-For-You pricing card bullet: "Page count and content depend on the details and photos you provide." Product description on Woo 46107 says the same. FAQ #4 and #5 both spell out that pages/content depend on what the client sends, and that a bigger build is quoted separately.

## Read top to bottom, is it clear?

- **Above the fold:** H1 states the $34/mo hook immediately, subhead names all 3 paths in one sentence, hero button anchors straight to the pricing cards. A first-time visitor does not have to scroll to know the offer.
- **Each tier says who it's for:** every pricing card ends with an explicit "Best for: ..." line (brand-new business / established business wanting a done-for-you site / business ready to turn a site into leads). This is the single highest-value fix over the contractor/roofing template, which never did this for its one product.
- **Jargon check:** GA4, CRM, pixel, and GBP appear only inside the Growth tier's own bullet list and are never required to understand Starter or Built-For-You. None of the FAQ answers use unexplained jargon — GBP is spelled "Google Business Profile," GA4 stays as GA4 but only inside a bullet that's clearly Growth-specific and skippable.
- **One CTA per tier:** each pricing card has exactly one button, one destination, one price. The secondary "Claim your free audit" and the plan-call form are the only other CTAs, both of which are tier-agnostic ("tell us what you have, we'll say what fits") rather than competing with the tier buttons.
- **Contractor/roofing leftovers checked and removed:** nav labels ("The Program / Pricing / Who we help") are generic enough to still apply and are shared across all Spark Sites program pages (not changed, low risk, not misleading); footer is the shared site footer (untouched, not niche-specific, fine); the "Spark Care – Growth" product page itself still reads contractor-flavored in its own description (that's the existing shared Woo product used by both roofing and this page — out of scope for this landing page build, flagged below as an open item).

## Verification performed (not claimed without seeing it)

- Desktop: full top-to-bottom screenshot pass (hero, chips, trust cards, all 3 pricing cards with badges, proof/about, FAQ two-column, CTA with form + buttons, footer).
- Mobile (390px, via a same-origin same-viewport iframe technique since the browser window would not resize below ~1489px in this environment): full top-to-bottom pass after two real layout bugs were found and fixed (see #3 above), re-verified by both computed-style checks and fresh screenshots.
- All 3 buy buttons: navigated to each destination directly and confirmed price and product name — $34.00/month (Get Online: DIY Site), Sign-up fee $1,800.00 + Get Online: Built-For-You Site copy, $297.00/month (Spark Care – Growth). No purchase was completed.
- Structural: fetched live rendered HTML, confirmed zero leftover `[et_pb`/`[gravityform` shortcode text, zero `&#91;` entity leaks, `gform_wrapper_30` present, and all 3 `application/ld+json` blocks (Yoast x2 + ours: LocalBusiness/Service/WebPage/FAQPage) parse as valid JSON.

## Open items for Grant

1. **Woo 46106 / 46107 are brand-new hidden products** created specifically because no existing product matched the locked $34-no-fee / $1,800-plus-$34 prices (the closest existing ones, 45927 "AI Website Build" at $350 sign-up and 45926 "Spark Sites Website Build" at $1,500 sign-up, don't match this page's pricing and were left untouched). Confirm these are the products you want live, or fold the page onto the existing ones if you'd rather reconcile the $1,500-vs-$1,800 discrepancy flagged back on the roofing build.
2. Gravity Form 30 notification goes to support@sparkmysite.com + nicole@sparkmysite.com, bcc grant@stateofthespark.com — same pattern as the roofing form.
3. Page is published live but **unlinked** (no nav/footer link) and **noindex** per the launch pattern used for roofing/roofer-report; link it from somewhere when you're ready for search/organic traffic to find it.
