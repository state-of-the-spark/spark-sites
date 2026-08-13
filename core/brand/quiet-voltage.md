---
type: reference
status: active
updated: 2026-08-12
source: Claude Design "Spark brand system" handoff (2026-08-12)
direction: "Quiet Voltage" (direction 1b — RECOMMENDED & chosen as the company brand)
relationship: Subsidiary of State of the Spark. Parent visual identity = grant-sparks/reference/brand/state-of-the-spark-visual.md
supersedes: visual-style.md (the old bright "solarpunk" coral-to-pink brand — now archived)
---
# Spark Sites — Visual Identity ("Quiet Voltage")

**One line:** Premium, minimal, quietly expensive. "The firm serious operators hire." Restraint as proof of competence — **cyan spent like money, one ray at a time.**

Spark Sites is the systematized firm — it reads like a company a contractor trusts with $500/mo and a buyer could value, sitting exactly between a trade-services shop and an umbrella brand. It is the **subsidiary** of [State of the Spark](../../../grant-sparks/reference/brand/state-of-the-spark-visual.md); same spark mark, opposite discipline (parent is loud and dark; Spark Sites is quiet and light).

> **Note (2026-08-12):** This replaces the earlier Quiet Voltage draft that guessed at a dark canvas + electric-lime accent. The real direction is **porcelain (light) grounds + rationed cyan**, per the Claude Design handoff. The `new-home` page on sparkmysite.com (built to the wrong guess) must be rebuilt to this spec.

**Source of truth:** the Claude Design kit — `tokens/spark-sites.css` (CSS custom properties + starter components), `assets/spark-mark.svg` + `assets/spark-mark-duotone.svg`, and the master `Brand Guide.dc.html` in [`grant-sparks/reference/brand/spark-brand-system/`](../../../grant-sparks/reference/brand/spark-brand-system/). Reference `var(--ss-*)` tokens, never raw hex.

## The Idea — restraint is the brand

Light-first: porcelain grounds, ink sections for statements, generous whitespace, editorial serif body. Cyan is punctuation, not paint. **Cyan budget per view: the spark's core dot + at most ONE hairline or key number.** If cyan is everywhere it's dead; spent once, it's electric.

## Color Palette

| Token | Name | Hex | Role |
|-------|------|-----|------|
| `--ss-ink` | Ink | `#101418` | **Primary.** Ink statements, CTA fills, mark rays, headlines |
| `--ss-porcelain` | Porcelain | `#F7F8F8` (border `#E0E5E8`) | **Secondary ground — light-first default** |
| `--ss-cyan` | Spark | `#0ECAEB` | **THE accent.** Spark core dot, hairlines, key numbers ONLY |
| `--ss-graphite` | Graphite | `#2A3138` | Subheads, secondary surfaces, body text |
| `--ss-mist` | Mist | `#E4E8EA` | Borders, dividers, quiet panels |
| `--ss-gray` | — | `#8A939B` | Muted text, captions, the endorsement line |
| `--ss-white` | — | `#FFFFFF` | Text on ink |

No magenta. No gradients. No coral/pink (that was the old brand).

## Typography

Fonts: `Poppins:wght@500;600` + `Hanken Grotesk:wght@400;500;600;700` + `Source Serif 4` (opsz 8..60, 400;500, incl. italic). (Google Fonts.)

| Role | Font | Spec |
|------|------|------|
| Headlines / display | **Hanken Grotesk 600** | 34px reference, letter-spacing -0.03em, line-height 1.1. Often with a **44×2px cyan hairline** beneath. "Headlines speak softly." |
| Body / prose | **Source Serif 4 (400)** | 16px, line-height 1.6, color Graphite `#2A3138`. "Measured, editorial, assured." Links underline in cyan, text stays ink. |
| Captions | Source Serif 4 *italic* | 14px, gray `#8A939B` |
| Wordmark | **Poppins 600** | **Logo lockup ONLY** — "spark sites" lowercase, letter-spacing -0.02em, ink. Poppins is used nowhere else in the type system. |

## Spark Mark

- **Renders INK rays with a CYAN center dot** (`assets/spark-mark-duotone.svg`). On ink grounds: white rays + cyan dot. **Never full-cyan here — full cyan is parent-only (✗).**
- Across all lockups, only the center dot is cyan; rays stay ink or white. Strictest cyan-restraint statement in the system.
- Plain `assets/spark-mark.svg` uses `currentColor` (recolor via CSS `color`); inline the SVG so it works.
- Minimum mark size **24px**; clearspace = **one ray-length** on all sides.
- **Wordmark** is live text (Poppins 600 lowercase, letter-spacing -0.02em) — never an image.

### Endorsement line
Spark Sites credits the parent with **"a State of the Spark company"** (`.ss-endorsement`, Hanken Grotesk 12px, letter-spacing 0.06em, gray). Belongs in **footers**, cards, and about pages. **Never inside the logo lockup itself.**

## Components (starter classes in `tokens/spark-sites.css`)

- **Primary CTA** (`.ss-btn-primary`): ink fill `#101418`, white text, Hanken Grotesk 600, padding 14px 26px, **radius 10px**. Hover reveals a **2px cyan ledge** along the bottom edge (`inset 0 -2px 0 var(--ss-cyan)`).
- **Text link** (`a.ss-link`): ink text, **cyan underline**, underline-offset 3–4px.
- **Hairline** (`.ss-hairline`): 44×2px cyan rule — the one sanctioned cyan flourish under a headline.
- Radius rhythm: `--ss-radius: 10px` (softer than the parent's 6px).

## DO

Porcelain grounds, ink statements · generous whitespace · serif body · cyan as punctuation · endorsement line in footers ("a State of the Spark company").

## DON'T

- No full-cyan spark (parent only).
- No magenta anywhere.
- No gradients.
- No more than **one** cyan accent per view.
- Endorsement never inside the logo lockup.

## Where this came from + what to borrow

Claude Design explored **four** Spark Sites directions; **1b "Quiet Voltage" was recommended and chosen** as the company brand. The others are a parts bin, not the brand:
- **1a "Live Wire"** (bold, dark, full-cyan, magenta) — borrow its energy for **ad campaigns only**, not the site.
- **1c "Circuit"** (tech/AI, spectrum-gradient spark, mono type, "proof-chips") — borrow the **proof-chip pattern** (`ai_lead_reply < 60s`, `uptime 99.9%`) for the **AI story** only.
- **1d "Front Porch"** (warm, rounded, cream) — hold in reserve **if the wellness vertical ever leads.**

**Verticals (messaging flexes, look stays fixed):** home services & contractors first, health & wellness second. Photography direction (from 1d): real, candid on-the-job shots of actual owners — crew on site / practitioner with client — not stock.

## WordPress deployment (from HANDOFF.md)

1. Enqueue the brand's Google Fonts URL (top comment of `tokens/spark-sites.css`).
2. Enqueue `tokens/spark-sites.css` site-wide (`wp_enqueue_style`), before theme CSS.
3. Reference only `var(--ss-*)` in page builders & custom CSS — no raw hex.
4. Inline the SVG mark (so `currentColor` works); wordmark is live text, Poppins 600 lowercase, never an image.
5. Buttons/links: start from the `.ss-*` starter classes.
