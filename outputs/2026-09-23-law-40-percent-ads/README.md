---
type: reference
date: 2026-09-23
topics: [law-firm, ads, meta, hormozi]
---

# Law firm "40% Problem" ads: the library and the ship set

Built 2026-09-23, cloned method-for-method from
`spark-sites/outputs/2026-09-13-roofer-ads/` (Hormozi structure: CTAs x meats x
hooks), on top of the new report
`spark-sites/outputs/2026-09-23-law-40-percent-report/the-40-percent-problem.md`.

## The library (reusable, this is the part that compounds)

| Piece | Count | File |
|---|---|---|
| Hooks | 40, in 8 categories | `hooks.md` (H01-H40) |
| Meats | 8, one per report truth | `meats-and-ctas.md` (M1-M8) |
| CTAs | 3 | `meats-and-ctas.md` (CTA-A/B/C) |

Full matrix would be 3 x 8 x 40 = **960 combinations**. Same discipline as the
roofer build: not building 960 ads, and the reason is arithmetic, not laziness.

## Why the ship set is only 6

**Hold the CTA and the meat constant. Vary only the hook.** The hook does most of
the work, and this is a small test budget, so a hook test is the only test worth
running first.

- **Fixed CTA: CTA-A (download the report).** The only one of the three that
  captures an email, so it's the only one that builds an asset rather than renting
  a click. CTA-C (call or text / Intake Speed Test) belongs on retargeting to
  people who already downloaded. CTA-B (see the program page) is the weakest cold
  ad because it captures nothing. The three CTAs are stages, not alternatives,
  same logic as the roofer set.
- **Fixed meat: M1 (six in ten firms don't pick up).** It needs zero context to
  land, since it's a fear every firm owner already carries whether or not they've
  run the test themselves, and the underlying study (500 firms, secret-shopper
  methodology) is specific and third-party enough to earn trust from someone who
  has never heard of Spark Sites before.
- **Varying: 6 hooks**, chosen for spread across registers, not six versions of
  the same appeal.

## The six

| Ad | Hook | Register |
|---|---|---|
| ad-01-H26 | How many consultations does a missed call cost a small law firm every month? | Self-audit question, the report's own central math |
| ad-02-H18 | $23.88 a click for "DUI lawyer near me," and roughly $239 for the one caller who reaches out. | Hard number |
| ad-03-H31 | Some marketing companies keep a law firm's domain and Google Business Profile under their own login. | Enemy naming, ownership anxiety |
| ad-04-H03 | A missed call at 12:15 can cost a Florida firm a signed client by 2:00 the same afternoon. | Visceral specific |
| ad-05-H13 | The Florida Bar allows something about asking for reviews that almost no small firm actually uses. | Curiosity gap, underused Bar-compliant lever |
| ad-06-H28 | Who actually owns a firm's Google Business Profile, its website, and its ad account? | Direct ownership question (same axis as H31, different register, deliberately testable against it) |

Full reasoning for each pick is in `hooks.md` under "Strongest 6."

## Meta ad policy note: why these hooks avoid "Are you a lawyer who...?"

The roofer precedent used direct "you/your" address freely ("How many roofs do you
have to sell..."). For this audience it's riskier, because a hook that both
questions the reader AND asserts a personal attribute ("Are you a lawyer who...?")
can trip Meta's personal-attributes policy, which gets stricter scrutiny on
legal-adjacent ads. The fix used throughout `hooks.md`: talk about the FIRM in the
third person ("Florida law firms...") or address "your firm" / "your website" /
"a firm's Google profile" as a business asset, never "you are a lawyer who...".
None of the 40 hooks opens with a personal "you are a..." construction. This is a
compliance pattern worth keeping for any future B2B-professional-audience build
(accountants, financial advisors, medical practices), not just this one.

## What to paste into Meta

Same for all six ads except the image and hook-specific copy:

- **Image:** `ads/ad-0N-HNN.png` (1080x1350, primary feed placement). Also built:
  `ads/ad-0N-HNN-1x1.png` (1080x1080, square) and `ads/ad-0N-HNN-story.png`
  (1080x1920, Stories/Reels placements). Background photo used per ad is recorded
  in `selected-hooks.json`.
- **Primary text:** meat M1 followed by CTA-A, both verbatim from
  `meats-and-ctas.md`.
- **Headline:** What your marketing company won't dare tell a Florida law firm
- **Description:** Free. Eight truths, every number sourced.
- **Destination:** https://sparkmysite.com/law-firm-report/
- **Call to action button:** Download

**Suggested UTM:**
`utm_campaign=law-40-percent-report&utm_content={{ad.name}}` (the ad IDs above are
written so `{{ad.name}}` identifies which hook won).

## Before this can run

1. **`sparkmysite.com/law-firm-report/` returns a 404 right now** (checked
   2026-09-23). This build assumes that page will exist as the report's landing
   page / download gate; it needs to be built and live before any ad using CTA-A
   can run. `sparkmysite.com/law-firm-marketing/` (the CTA-B program page) is
   already live and returns 200.
2. **No Meta campaign, ad set, or account has been touched.** Per the task
   constraints, nothing was uploaded, launched, or edited in Meta. This is a
   creative and copy build only.
3. **Budget.** The roofer precedent ran into real ad-set-budget-vs-hook-count
   math ($10/day cannot resolve six creatives in a sensible window; that set
   needed to move to about $30/day or ship three of six at a time). The same
   math will apply here; decide budget before launch.
4. **Grant's approval** on hooks, meats, and the six selected before anything
   goes live, per the household rule that outward sends and campaign launches
   are confirm-first.
5. **Page count in the "proof" badge.** The ad creatives use "Free. Every number
   sourced." instead of stating a page count (the roofer ads said "13 pages"). The
   report markdown reviewed for this build didn't state its own page count or
   have an associated PDF yet, so a specific number wasn't invented. If a PDF gets
   built with a known page count, swap that line in `selected-hooks.json` and
   rebuild.

## Rebuilding

```
node build-ads.mjs          # reads selected-hooks.json, writes ads/*.html (3 sizes per ad)
```

Then render each to PNG with headless Chrome. On this machine:

```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --headless --disable-gpu \
  --screenshot="ABSOLUTE\path\ads\ad-01-H26.png" --window-size=1080,1350 \
  --virtual-time-budget=8000 "file:///ABSOLUTE/path/ads/ad-01-H26.html"
```

Use `--window-size=1080,1080` for the `-1x1` files and `--window-size=1080,1920`
for the `-story` files. **The file:// URL and the --screenshot path both need to
be real Windows paths run through `cygpath -m` / `cygpath -w`** from Git Bash; a
bare POSIX `/c/...` path silently produces an `ERR_FILE_NOT_FOUND` page screenshot
instead of the ad (hit this on the first render pass of this build, fixed by
converting both paths before calling Chrome).

Every ad writes `data-fit` on its content column (dump the DOM with
`--dump-dom` and grep `data-fit`). All 18 renders in this build came back
`data-fit="0"`, which is correct: the column uses `margin-bottom:auto` to push
the domain line to the bottom, so the box exactly fills the frame by design, not
because it's overflowing. A negative value would mean real overflow and a hook
that Meta will crop.

Every PNG in `ads/` was read back and visually inspected (all 6 feed-size ads,
plus a same-hook 1:1 and 9:16 spot check) before this build was called done: no
clipped text, no overlap with the caution-badge or CTA button, legible contrast
over all four background photos.

## Layout: what changed from the roofer clone, and why

- **No caution tape, no STOP sign.** Both were roofing/storm-specific hazard
  motifs. Replaced with a "40%" stat badge (the report's own headline number) in
  the same position and visual weight, so the graphic anchor above the headline
  still exists but is on-topic instead of borrowed.
- **Four background photos instead of one.** The roofer clone used a single storm
  photo referenced from the report's own design folder; this build does the same
  (referencing, not copying, `../../2026-09-23-law-40-percent-report/design/`) but
  rotates across the four supplied attorney/office photos, matched by feel: the
  "answering a call" photo on the missed-call hooks, the "phone + case files"
  photo on the cost-per-click hook, the "consultation" photo on the Bar-rules
  hook, and the "office exterior" photo on both ownership hooks.
- **Three aspect ratios per ad, not one.** `build-ads.mjs` now renders 4:5 (feed),
  1:1 (square), and 9:16 (Stories/Reels) from one function, scaling every
  dimension (padding, icon size, type size) by the canvas height relative to the
  1350px feed baseline, rather than hand-tuning three separate templates.

## Video scripts

`video-scripts.md` has 8 recorded-video scripts (one per report truth, 45-75
seconds, Grant on camera) plus 3 short 15-20 second cutdowns for Reels/Stories,
each hook line, full script, B-roll notes, on-screen captions, a post caption, and
which ad hook it pairs with. Recording order and a one-session, one-location shoot
plan are at the bottom of that file.

## Lumen review, 2026-09-23 (after the build)

- **Ad 3 swapped: H31 → H16.** The first set had two ownership hooks (H31 and H28) and none carrying the report's own headline stat. H16 ("40% of law firms answered the phone in a 2024 study. Five years earlier, it was 56%.") is the title number of the lead magnet, so it now anchors the test. H28 stays as the single ownership hook.
- **Photo cleaned.** The AI photo of the attorney at her desk had a stray "NEW MESSAGE" UI label floating at the left edge (visible in ads 1 and 5). Regenerated without it (nano-banana edit), saved as `attorney-answering-lead-clean.webp`, and the same clean photo replaced the one on the live law page (media 46284).
- **Rendering:** `node render-pngs.mjs` re-renders every `ads/*.html` to PNG at the right size (feed 1080x1350, `-1x1` 1080x1080, `-story` 1080x1920). Use it instead of hand-typed Chrome commands; a Bash loop with Windows paths silently wrote to the wrong place.
- `contact-sheet-feed.png` shows the six feed ads side by side.
