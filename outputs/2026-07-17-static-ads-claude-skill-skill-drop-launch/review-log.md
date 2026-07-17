# Review Log — Skill Drop Launch Batch 001

Reviewed: 2026-07-17 · 6 lenses (FTC, Meta Policy, Copy Quality, Visual Standards, Voice Authenticity, Substantiation), 6 parallel agents
Status: **REVIEW REQUIRED — 2 launch gates open (P1). Copy itself is fixed and clean.**

## P1 — Launch gates (NOT auto-fixed; Grant decisions/build work)

1. **Landing page does not exist.** Every ad points to placeholder `https://sparkmysite.com/skill-drops`. Build + QA the page, then replace the URL batch-wide. The page must match ad claims: skill free with email, $10/day = Google ad spend, Claude subscription requirement, three-path thank-you funnel.
2. **"Every skill we ever release" membership promise** (appears in ~7 primaries) requires the Spark AI Skool group about page to be updated and the membership tier/pricing to exist BEFORE launch. Alternative if launching sooner: strip that line from the 7 primaries.

## P2/P3 — Auto-applied fixes

**Accuracy (FTC + Substantiation):**
- Founding year corrected 2018 → 2013 in 10 copy instances + 1 headline (source of truth: `core/soul.md`; same error was corrected in the 2026-02-12 batch). Root cause fixed: `core/proof/angles/burned-by-agencies.md` carried the wrong year.
- Ad 1 H1 "Team Behind 20+ Years" → "Founder Building Small Business Tech Since 2004" (tenure was Grant's, not the company's).
- Hooks implying an existing user base for an unshipped product rewritten to capability framing: Ad 1 P1 "go from" → "can go from"; Ad 3 P1 "are launching" → "can launch".
- Fabricated-sounding anecdotes removed: Ad 2 P2 hook ("since March... Tuesday night" first-person story) → hypothetical framing; Ad 5 P2 hook (specific implied conversation) → general statement.
- Ad 4 H3 "Campaigns Live in 30 Minutes" → "Campaigns Live Today" (unverified time estimate stated as fact). Remaining "about 30 minutes" mentions stay hedged - TIME THE REAL INSTALL once the skill ships and adjust batch-wide.
- "$1,500/mo" flat agency-price framing → "four figures / hundreds to thousands a month" (Spark's own Google Ads pricing starts at $350/mo; $1,500 is the top tier). Ad 5 H4 "$1,500 Retainer" → "Monthly Retainer". Ad 5 P3's full "$350-$1,500/month" range retained (accurate).
- Ad 5 P1/P5 "That's the whole price" / "Marketing for the price of lunch" → full honest cost list (skill free + Claude subscription + $10/day to Google). Ad 5 P3 cost list gained a Claude-subscription bullet.
- $10/day clarified as Google ad spend in the two primaries that lacked it (Ad 1 P2, P4).

**Testimonial scoping (Substantiation; FTC had passed these, applied the stricter framing):**
- Sarah M. (Ad 1 P1/P5): explicitly scoped as paid consulting work, origin-story framing only.
- Wesley S. (Ad 2 P5, Ad 5 P5): explicitly scoped to paid SEO/web/content services, not the skill.
- Charles L. (Ad 3 P5): scoped to "regular client services."
- Luiza H. (Ad 4 P5): scoped to live workshops/calls; "philosophy just became" → "bringing that philosophy to."

**Meta policy:**
- Ad 3 P5 "if you've been burned... you're" → third-person (Personal Attributes). Ad 3 P3 opener aligned.
- Ad 4 P4 hook "you don't have to attend" → "nobody has to attend."

**Voice:**
- Ad 3 "agency" self-labels removed (3 instances) per voice.md ban; kept third-person "agencies."
- Ad 1 P3 jargon ("location targeting, match types") → plain English.

**Cold-traffic comprehension (Copy Quality):**
- "Claude" now introduced as "the AI assistant" / "Claude AI" on first mention in every standalone primary, including all five Pattern Interrupts.
- "Claude in Chrome" gets a plain-English clause ("the version that can click through Google Ads for you") in each Deep Ad + Ad 5 P3.

**Visual (Part 1 synced to prompts.json as-generated wording):**
- 001.1_IMG_03 headline shortened; 001.3_IMG_01 label → "YOUR Claude"; 001.3_IMG_02 + 001.5_IMG_02 dashboards → no readable text; 001.3_IMG_03 invoice → no dollar figure, "forever" dropped; 001.4_IMG_01 timeline years removed.

## P3 — Noted, not changed (monitor / decide later)

- **Hook lengths:** all 5 Deep Ad (Primary 1) hooks pass 123-135 chars. Shorter formats (esp. all Pattern Interrupts) intentionally run short - needs a one-time sign-off that the 123-135 rule applies to Deep Ad hooks only, or lengthening pass.
- **Angle overlap:** Ad 1 (AI-Forward inverted) and Ad 4 (Education inverted) share a narrative spine - expect correlated performance; don't read them as independent tests.
- **CTA template repetition:** long-form primaries share the same three-path close; fine per-ad, repetitive if one prospect sees several. Diversify in batch 002.
- **001_12 certificate image:** three text blocks was flagged as high text-render risk - visually QA the generated image; regenerate with caption dropped if text came out garbled.
- **Ad 2 "11:47 PM tired" emotional depiction:** third-person framed, likely passes; monitor Meta review on this ad.

## Images

30/30 generated (15 concepts x vertical 1080x1920 + square 1920x1920), all JPEG under 300KB (two recompressed post-generation). Model: gemini-3-pro-image-preview. Est. cost ~$0.75. **Human visual QA still required before launch** - especially text-bearing graphics (001_01, 001_04, 001_07, 001_10, 001_12, 001_13, 001_15).
