---
type: decision
date: 2026-02-20
status: accepted
linked_decisions:
  - decisions/2026-02-12-brand-name-evolution.md
  - decisions/2026-02-12-growth-partner-positioning.md
  - decisions/2026-02-20-parent-brand-website-architecture.md
---
# Parent Brand Rollout Strategy

## Situation

The parent brand (sparkmygrowth.com) is decided. Nicole is aligned. Now: how do we introduce it to existing clients and the market?

## Decision

Three-channel rollout: email sequence, organic content, and cross-marketing between properties.

---

## Channel 1: Email Sequence to Existing Clients

### Email 1 — Announcement
Position the pivot: "As your technology partner, we're introducing AI-powered services and expanding into a full growth agency." Frame it as evolution, not abandonment — Spark Sites isn't going away, it's becoming part of something bigger.

### Email 2+ — Drip Sequence
Follow-up emails that introduce specific services one at a time. Each email focuses on one capability, one client pain, one clear CTA.

### Email 3+ — Service Introduction
Deeper dives into individual offerings (AI-enabled marketing, strategy sessions, content, ads management). Link to sparkmygrowth.com for each.

**Key framing:** "We've always been more than websites. Now we have a name for it."

---

## Channel 2: Organic Content

### Messaging Model
Do a messaging session on ourselves (eat our own cooking). Use the Messaging Strategy Session framework from `core/offers/strategy/messaging-session.md` to extract Spark's own core message, language map, and differentiators for the parent brand.

### Content Themes (Recurring Phrases)
Build these into the content vocabulary through repetition:
- **AI-enabled marketing** — the umbrella term for what we do differently
- **Marketing tools** — demystify the tech, educate clients on what's available
- **AI for small business** — accessible, not intimidating
- **Growth partner** — the relationship frame (already decided)

### Execution
- Use `/mb-ads` skill to generate organic content (hooks, short-form, social posts)
- Every piece links back to sparkmygrowth.com
- Develop a hook library specifically for the parent brand messaging
- Content introduces the concept gradually — don't lead with "we rebranded," lead with value

---

## Channel 3: Cross-Marketing Between Properties

### Website Cross-Links
- **sparkmysite.com** main menu links to sparkmygrowth.com (and vice versa)
- **sparkmygrowth.com** main menu links to sparkmysite.com
- Hero sections on both sites reference the other ("Part of the Spark family" or similar)

### The Relationship
- sparkmygrowth.com is the agency — strategy, AI, growth, full scope
- sparkmysite.com is the websites offer — one entry point under the agency
- sparkmycampaign.com is client-facing tooling — linked from client dashboards, not public-facing marketing

---

## Sequencing

1. **Now:** Do our own messaging session (extract parent brand language)
2. **Now:** Codify messaging into reference files (voice.md, content-strategy.md)
3. **When WordPress is live:** Build sparkmygrowth.com with the new messaging
4. **After site is live:** Send email announcement to existing clients
5. **Ongoing:** Organic content using the new vocabulary, linking to sparkmygrowth.com
6. **Ongoing:** Cross-link menus and heroes between properties

## What Changes

- `core/voice.md` — Add parent brand vocabulary (AI-enabled marketing, marketing tools, growth partner)
- `core/content-strategy.md` — Add parent brand content pillars and hook themes
- New hook library needed for parent brand messaging (`/mb-ads` skill)
- sparkmysite.com nav needs sparkmygrowth.com link (when ready)
- Email templates needed (separate output task)

## Open Questions

1. Email platform — what are we using for the drip sequence?
2. Messaging session timing — do it before or after WordPress site is built?
3. Content cadence — how often are we posting parent brand content?
