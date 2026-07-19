# Claude Design mega prompt - Lakeland Fence Repair brand kit

Paste everything below the line into Claude Design (claude.ai/design). Attach or paste alongside it: `logo-b-sun-shield.svg`, `logo-c-horizontal.svg` (both included inline below), and optionally `design-profile.md`.

---

## ROLE

You are the brand designer for **Lakeland Fence Repair**, a real local fence repair and installation company serving Lakeland and Polk County, Florida. Build a small, hard-working brand system and a suite of brand artifacts. This brand is also a TEMPLATE: it will be cloned for other cities (Bartow, Fort Meade) and other trades (roof repair), so every artifact must be built so the city name, trade name, and one local motif can be swapped without redesigning.

## BUSINESS SNAPSHOT

- Positioning: repair-first honesty. "If it can be fixed, we fix it. We only quote a new fence when repair stops making sense."
- Services: wood, vinyl, and chain link fence repair; gate repair; storm damage repair; new fence installation.
- Customers: Lakeland homeowners (and some businesses), often right after storm damage. They want fast, straight answers, not sales pressure.
- Voice: plainspoken Florida contractor. Concrete, honest, zero hype. Never "premier" or "top-rated." No em dashes in any copy; use hyphens or colons.
- Website: block-native WordPress, system font stack, live at lakelandfencerepair.com (staging: lakelandfencerepair.mystagingwebsite.com).

## LOCKED BRAND SYSTEM (do not change these)

Palette - locked, all artifacts use only these:
- Forest Green #1F4D2E (primary brand color, grounds and text on light)
- Deep Forest #153A22 (dark grounds, badge fields)
- Wood Brown / Bark #5C4030 (fence pickets, warm accents, rules)
- Sun Gold #E8A33D (THE accent: CTAs, sun motif, beak, highlights - use with restraint, one place per artifact)
- Cream #F4F1E8 (light ground)
- Charcoal #26241F (text on light)
- Supporting tints allowed: Sage #E3EAE2, Rail Brown #4A3326

Typography: system font stack (system-ui, -apple-system, "Segoe UI", Roboto) with weight 700-800 for display, generous letterspacing on uppercase labels. You MAY propose one display face for large print (signage, truck) if it meaningfully improves impact; everything digital stays system-stack.

Motifs: fence pickets (pointed tops), rising Florida sun, and per-city local motif. Lakeland's motif is the Lake Morton swan. Clone rule: {CITY} text, tagline line, and the local motif swap; pickets and sun stay.

## REFERENCE MARKS (keep as the design baseline)

Two approved concept marks. Refine, extend, and build artifacts from these. You may also propose ONE new direction of your own, clearly labeled as new.

Mark B, "Sun Shield" (primary badge): shield, cream sky, gold rising sun with rays, six brown pickets over forest green ground, forest banner reading LAKELAND, gold FENCE REPAIR below.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 250" role="img" aria-label="Lakeland Fence Repair shield logo with rising sun and fence pickets">
  <defs>
    <clipPath id="shieldClip">
      <path d="M 14 22 Q 14 14 22 14 L 198 14 Q 206 14 206 22 L 206 150 Q 206 196 110 238 Q 14 196 14 150 Z"/>
    </clipPath>
  </defs>
  <!-- shield base -->
  <path d="M 10 20 Q 10 10 20 10 L 200 10 Q 210 10 210 20 L 210 151 Q 210 200 110 244 Q 10 200 10 151 Z" fill="#153A22"/>
  <path d="M 14 22 Q 14 14 22 14 L 198 14 Q 206 14 206 22 L 206 150 Q 206 196 110 238 Q 14 196 14 150 Z" fill="#F4F1E8"/>
  <g clip-path="url(#shieldClip)">
    <!-- sky -->
    <rect x="14" y="14" width="192" height="86" fill="#F4F1E8"/>
    <!-- sun + rays -->
    <g>
      <circle cx="110" cy="100" r="30" fill="#E8A33D"/>
      <g stroke="#E8A33D" stroke-width="7" stroke-linecap="round">
        <line x1="110" y1="52" x2="110" y2="38"/>
        <line x1="76" y1="66" x2="66" y2="56"/>
        <line x1="144" y1="66" x2="154" y2="56"/>
      </g>
    </g>
    <!-- ground -->
    <rect x="14" y="100" width="192" height="140" fill="#1F4D2E"/>
    <!-- pickets -->
    <g fill="#5C4030">
      <path d="M 34 112 L 43 100 L 52 112 L 52 190 L 34 190 Z"/>
      <path d="M 62 106 L 71 94 L 80 106 L 80 196 L 62 196 Z"/>
      <path d="M 90 102 L 99 90 L 108 102 L 108 202 L 90 202 Z"/>
      <path d="M 118 102 L 127 90 L 136 102 L 136 202 L 118 202 Z"/>
      <path d="M 146 106 L 155 94 L 164 106 L 164 196 L 146 196 Z"/>
      <path d="M 174 112 L 183 100 L 192 112 L 192 190 L 174 190 Z"/>
    </g>
    <rect x="14" y="122" width="192" height="8" fill="#4A3326"/>
    <rect x="14" y="152" width="192" height="8" fill="#4A3326"/>
  </g>
  <!-- banner -->
  <g>
    <path d="M 6 172 L 214 172 L 214 204 L 6 204 Z" fill="#1F4D2E"/>
    <path d="M 6 172 L 0 178 L 6 184 Z" fill="#112D1A"/>
    <path d="M 214 172 L 220 178 L 214 184 Z" fill="#112D1A"/>
    <text x="110" y="194" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="21" font-weight="800" fill="#F4F1E8" letter-spacing="5" text-anchor="middle">LAKELAND</text>
  </g>
  <text x="110" y="222" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="13.5" font-weight="800" fill="#E8A33D" letter-spacing="2.6" text-anchor="middle">FENCE REPAIR</text>
</svg>
```

Mark C, "Horizontal Lockup" (working mark for site header and documents): deep-forest rounded tile with cream pickets and gold sun, then LAKELAND in gold letterspaced caps over FENCE REPAIR in heavy forest caps, bark rule, tagline REPAIR · INSTALLATION · POLK COUNTY.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 470 120" role="img" aria-label="Lakeland Fence Repair horizontal logo lockup">
  <!-- icon tile -->
  <g>
    <rect x="8" y="12" width="96" height="96" rx="14" fill="#153A22"/>
    <clipPath id="tileClip"><rect x="8" y="12" width="96" height="96" rx="14"/></clipPath>
    <g clip-path="url(#tileClip)">
      <circle cx="56" cy="56" r="22" fill="#E8A33D"/>
      <g fill="#F4F1E8">
        <path d="M 22 52 L 28.5 43 L 35 52 L 35 108 L 22 108 Z"/>
        <path d="M 42 46 L 48.5 37 L 55 46 L 55 108 L 42 108 Z"/>
        <path d="M 62 46 L 68.5 37 L 75 46 L 75 108 L 62 108 Z"/>
        <path d="M 82 52 L 88.5 43 L 95 52 L 95 108 L 82 108 Z"/>
      </g>
      <rect x="14" y="62" width="84" height="5.5" fill="#C9C2AE"/>
      <rect x="14" y="84" width="84" height="5.5" fill="#C9C2AE"/>
    </g>
  </g>
  <!-- wordmark -->
  <text x="126" y="42" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="19" font-weight="800" fill="#E8A33D" letter-spacing="7.5">LAKELAND</text>
  <text x="124" y="82" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="34" font-weight="800" fill="#1F4D2E" letter-spacing="0.5">FENCE REPAIR</text>
  <rect x="126" y="94" width="330" height="2.5" fill="#5C4030"/>
  <text x="126" y="112" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="11.5" font-weight="700" fill="#26241F" letter-spacing="3.4">REPAIR · INSTALLATION · POLK COUNTY</text>
</svg>
```

## DELIVERABLES

Round 1 - marks:
1. Refined Sun Shield: tighten geometry, optical spacing, and small-size survival (must hold at 36 px).
2. Refined Horizontal Lockup + reversed (dark-ground) variant + square icon tile alone (favicon; must hold at 16 px).
3. One new direction of your own on the same palette and motifs (optional but welcome), with the same variants.

Round 2 - brand artifacts (build from the winning marks; every artifact in light-ground and dark-ground versions where applicable):
4. Google Business Profile avatar (square, badge-centered, legible at 120 px and 40 px).
5. Favicon set: 16, 32, 48 px.
6. Truck door decal, 24x18 in: badge + phone placeholder {PHONE} + lakelandfencerepair.com.
7. Yard sign, 18x24 in, readable at 40 feet: badge, "FENCE REPAIRED BY", {PHONE}, site.
8. Business card, 3.5x2 in, front and back.
9. Letterhead / invoice header and footer strip.
10. Email signature block (HTML-safe, system fonts only).
11. Social templates: profile avatar, cover image, and one before/after job-photo post frame with a small watermark corner badge.
12. Review-ask card (SMS/handout): "How did we do?" + QR placeholder + review link line.
13. Facebook/Google ad creative frame: headline area, photo area, CTA button in Sun Gold.
14. Job-photo watermark: small, corner-safe, works over photography.

## GUARDRAILS

- Palette is locked. No new hues, no gradients that leave the palette.
- Honesty: no invented awards, star ratings, "since 19XX", or fake certifications anywhere on any artifact. A "Licensed and insured" line may appear only as a placeholder token {CREDENTIALS}.
- Templating: build every artifact with swappable tokens: {CITY}, {TRADE}, {PHONE}, {TAGLINE}, {MOTIF}. Show one example clone (BARTOW FENCE REPAIR) to prove the system swaps cleanly.
- Vector-first: SVG for all marks; artifacts sized in real print dimensions where named.
- Every mark must pass: cream ground, deep-forest ground, 1-color (all-forest) fallback, and grayscale.
- Small-size tests are part of the deliverable, not an afterthought: show each mark at its named minimum size.

## SUCCESS CRITERIA

A Lakeland homeowner sees the truck at a stoplight and can read who it is and what they do in three seconds. The badge looks at home next to city-park and county-fair signage: local, established, warm. Nothing reads as a generic AI template. And the whole kit clones to a new city in under an hour by swapping tokens.
