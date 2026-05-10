# Spark Sites

**Spark — Your growth partner. Strategy, education, and execution for entrepreneurs.**
**Spark Sites — The website entry point. High-end sites made accessible.**

---

## Engine

This repo uses Main Branch. Engine lives at: `~/Documents/GitHub/vip`

**Additional tool repos:**
- `~/Documents/GitHub/spark-sales` — Sales pipeline (Prospect Pro + Demo Drop)

Both are linked via `additionalDirectories` in `.claude/settings.local.json`.

**Parent repo:** `~/Documents/GitHub/grant-sparks` (Lumen orchestrator)

Start every session:
```bash
cd ~/Documents/GitHub/spark-sites
claude
/mb-start
```

---

## The Business

**What:** Growth partner for small businesses — strategy, education, and execution. Based in Lakeland, FL
**Who:** Small business owners and entrepreneurs who want professional digital presence without enterprise pricing
**Why:** Educate, Empower, Encourage — we believe the more clients understand, the more they value what we do

## Team

**Source of truth:** `grant-sparks/reference/brand/team.md` (linked via additionalDirectories)

---

## Services (Multi-Offer)

| Offer | Entry Price | Notes |
|-------|-------------|-------|
| **websites** | $500–$3,500+ | Primary entry point |
| **seo** | $900 one-time or $500–$1K/mo | Includes Content Bot |
| **google-ads** | $350 setup + $350–$1,500/mo | Based on ad spend |
| **facebook-ads** | $350 setup + $350–$1,500/mo | Based on ad spend |
| **social** | ~$500–$2K/mo | Needs productizing |
| **consulting** | $120/hr | Under-productized |
| **influencer** | Custom | Nicole's specialty |
| **education** | TBD | Coming soon |

**Active offer:** Check `.vip/local.yaml` for current session focus.

---

## Product Ladder

```
EDUCATION/WEBINARS → Demonstrates expertise
         ↓
    WEBSITES (primary entry) → Discovery Call → Upsell
         ↓
SEO / ADS / SOCIAL / CONSULTING / INFLUENCER
         ↓
    ALL-INCLUSIVE PACKAGE ($3,500+)
```

---

## Folder Structure

```
spark-sites/
├── CLAUDE.md              ← You are here
├── .vip/
│   ├── config.yaml        # Team settings (git-tracked)
│   └── local.yaml         # Session state (git-ignored)
├── core/                  # Main Branch v0.2 canonical content
│   ├── soul.md            # Brand-level soul
│   ├── offer.md           # Brand-level offer
│   ├── audience.md        # Brand-level audience
│   ├── voice.md           # Voice and tone
│   ├── content-strategy.md
│   ├── product-ladder.md
│   ├── offers/            # Per-offer details
│   │   ├── websites/
│   │   ├── seo/
│   │   ├── google-ads/
│   │   ├── facebook-ads/
│   │   ├── social/
│   │   ├── consulting/
│   │   ├── influencer/
│   │   ├── education/
│   │   └── strategy/
│   ├── brand/             # visual-style.md
│   ├── proof/             # testimonials, angles
│   └── operations/        # book-framework, lab-notes, pricing-matrix, funnel/
├── bets/                  # Active business bets
├── pushes/                # Pushes (campaigns)
├── log/                   # Daily log
├── documents/             # General documents
├── research/              # Dated investigations
├── decisions/             # Dated choices
├── outputs/               # Generated assets
└── reference/
    └── clients/           # Client-specific notes (orphaned by v0.2 schema)
```

---

## Quick Reference

**Voice:** Friendly, professional, educator tone. Patient guidance. Technical only when it adds clarity.

**Visual:** Solarpunk, Florida-influenced, bright and warm. Hopeful tech future.

**Core Values:** Educate, Empower, Encourage

**Location:** Lakeland, FL

**Domains:**

| Domain | Purpose |
|--------|---------|
| startwithspark.com | Legacy/vanity — redirects to sparkmygrowth.com |
| sparkmygrowth.com | Parent agency brand (Spark Growth Marketing) |
| sparkmysite.com | Websites sub-brand (Spark Sites) |
| sparkmycampaign.com | Client dashboards (spark-dashboards repo) |

---

## Known Gaps

- [x] Strategy sessions need productizing → Messaging Strategy Session ($350, 90 min) live in `core/offers/strategy/`
- [ ] Educational library not yet launched
- [ ] Webinars paused — need to restart
- [ ] Social media pricing needs clearer structure
- [ ] Need more testimonials (ads results, e-commerce, influencer)

---

## Key Skills

| Need | Skill | Source |
|------|-------|--------|
| Research, decide, update reference | `/mb-think` | vip |
| Generate ads | `/mb-ads` | vip |
| Create organic content | `/mb-organic` | vip |
| Build landing pages | `/mb-site` | vip |
| Help with anything | `/mb-help` | vip |
| **Find prospect leads** | **`/prospect-pro`** | **spark-sales** |
| **Build demo site for a lead** | **`/demo-drop`** | **spark-sales** |

### Sales Pipeline (Demo Drop + Prospect Pro)

These two skills power the Spark Sites cold outreach pipeline. They live in the `spark-sales` repo (linked via `additionalDirectories` in `.claude/settings.local.json`).

**`/prospect-pro`** — Scans Google Maps for businesses in Polk County with no/weak digital presence. Returns 5 qualified leads, pushes approved ones to ClickUp (Spark Sites Sales list).

**`/demo-drop`** — Takes any lead (from Prospect Pro, ClickUp, or manual) and builds a live demo website via v0 API, deploys to Netlify. Show up to the cold call with proof.

**Config:** All agency settings (geography, industries, Netlify slug, GitHub org, ClickUp list) live in `demo-drop.config.yaml` in the spark-sales repo.

**Bridge links:** Skill discovery requires bridge copies at `.claude/skills/prospect-pro/` and `.claude/skills/demo-drop/` (gitignored). If these are missing, recreate them:
```bash
cp -r ~/Documents/GitHub/spark-sales/.claude/skills/prospect-pro .claude/skills/
cp -r ~/Documents/GitHub/spark-sales/.claude/skills/demo-drop .claude/skills/
```
