---
type: reference
date: 2026-09-13
topics: [roofing, ads, meta, hormozi]
---

# Roofer report ads: the library and the ship set

Built 2026-09-13 on the Hormozi structure Grant asked for (CTAs x meats x hooks),
with one deliberate departure explained below.

## The library (reusable, this is the part that compounds)

| Piece | Count | File |
|---|---|---|
| Hooks | 40, in 8 categories | `hooks.md` (H01-H40) |
| Meats | 8, one per report truth | `meats-and-ctas.md` (M1-M8) |
| CTAs | 3 | `meats-and-ctas.md` (CTA-A/B/C) |

Full matrix would be 3 x 8 x 40 = **960 combinations**. We are deliberately not
building 960 ads, and the reason is arithmetic, not laziness.

## Why the ship set is only 6

The ad set runs **$10/day**. Split across even ten ads that is a dollar a day each,
which never reaches enough volume to tell you which hook won. Hormozi runs fifty
hooks because he has the spend to resolve fifty hooks. At this budget the
transferable part of his method is the *discipline*, not the volume:

**Hold the CTA and the meat constant. Vary only the hook.** The hook does most of
the work, so a hook test is the only test worth running first.

- **Fixed CTA: CTA-A (download the report).** The only one of the three that captures
  an email and drops the person into the `niche-roofing` tag, so it is the only one
  that builds an asset rather than renting a click. CTA-C (call or text) belongs on
  retargeting to people who already downloaded. CTA-B is the weakest cold ad because
  it captures nothing. The three CTAs are stages, not alternatives.
- **Fixed meat: M1 (you are renting your leads).** Needs no setup to land, and the
  FTC's $7.2M order against HomeAdvisor is the most specific, least deniable fact in
  the set, which is what earns trust from someone who has never heard of us.
- **Varying: 6 hooks**, chosen for spread across emotional registers rather than six
  versions of the same appeal.

## The six

| Ad | Hook | Register |
|---|---|---|
| ad-01-H26 | How many roofs do you have to sell just to pay your marketing company back? | Self-audit question, the report's own central question |
| ad-02-H16 | $228 a lead. $600 to $1,200 for one that actually closes. | Hard number |
| ad-03-H32 | Storm chasers aren't beating you on the roof. They're beating you online. | Identity plus enemy |
| ad-04-H02 | That lead you just paid for already went out to 16 other roofers. | Visceral specific |
| ad-05-H13 | A new Florida law just created the biggest marketing opening in roofing. | Opportunity, timely (SB 808) |
| ad-06-H28 | Who owns your Google Business Profile right now, you or your agency? | Ownership anxiety, different axis from money |

**Two of the copy agent's picks were overridden.** H39 (the "276 percent in 90 days"
result) was dropped because that case study is a pest control company, not a roofer,
and stripped into an ad it reads as an unattributed performance claim, which is both
the thing this report positions against and the kind of claim Meta scrutinises. H01
was dropped as overlapping H26 and H16 on the money axis, and because it presumes the
reader already pays an agency $3,000 a month, which many 1-to-4-crew owners do not.

## What to paste into Meta

Same for all six ads except the image:

- **Image:** `ads/ad-0N-HNN.png`, 1080x1350 (4:5 feed)
- **Primary text:** meat M1 followed by CTA-A, both verbatim from `meats-and-ctas.md`
- **Headline:** What your marketing company won't dare tell a Florida roofer
- **Description:** 13 pages. Every number sourced. Free.
- **Destination:** https://sparkmysite.com/roofing-report/
- **Call to action button:** Download

The campaign already carries URL tags
(`utm_source=facebook&utm_medium=paid_social&utm_campaign=roofing-marketing&utm_content={{ad.name}}`).
Consider changing `utm_campaign` to `roofer-report` so this reports separately from
the roofing marketing page traffic. The ad names above are written so
`{{ad.name}}` identifies which hook won.

## Before this can run

1. **The campaign is PAUSED** at all three levels, and the only ad in it is a
   placeholder. Campaign "Roofing Marketing - Deep Ads (Organic Clips)"
   (52563208526210), ad set "Roofing Owners - Central FL - Landing Page Views"
   (52563208526610). ClickUp 868m4njve.
2. **$10/day will not resolve six creatives** inside a sensible window. Either raise
   the ad set to about $30/day, or ship three of the six and hold the rest.
3. **Upload is manual for now.** Supermetrics refuses writes to act_38409803
   (WRITE_ACCESS_NOT_ENABLED, ClickUp 868m413fq, open since 9/10). The bug cites team
   `m8iU5IVrACELNCllLUKO` while the account lookup reports the connection in team
   "Spark Sites" ID `1051966`; a toggle set on one team while calls execute under the
   other would look correct and still refuse every write. Until that is resolved these
   go in by hand, or through Claude in Chrome.

## Rebuilding

```
node build-ads.mjs          # reads selected-hooks.json, writes ads/*.html
```

Then render each at 1080x1350 with headless Chrome. **The output path passed to
`--screenshot` must be an absolute Windows path**; a relative path silently produces a
zero-byte file. Every ad carries `data-fit` on its content column: dump the DOM and
confirm it is >= 0, because a negative value means the composition overflows and Meta
crops it.

To test different hooks, edit `selected-hooks.json` and rebuild. The hook library in
`hooks.md` has 34 more.
