---
type: offer
offer: claude-skill
status: draft
created: 2026-07-17
source: Grant's spoken brief during /ads session
---

# Offer: Claude Skill Download

## One-Liner

We don't train you anymore. We train your Claude. Downloadable Claude skills your business uploads once - and the work starts happening.

## What It Is

A growing series of downloadable Claude skills that Spark creates and clients deploy in-house. No course, no training program, no learning curve. The client uploads the skill into their own Claude, follows a short install walkthrough, and the skill does the work. Each skill ships with: how to install it, what to expect from it, and how to run it.

**The strategic shift:** Spark stops training humans on every little thing and starts training their Claude instead. Clients deploy capabilities, not curriculum.

## The First Skill: Google Ads Implementation

- **What it does:** Wields Claude + Claude in Chrome to set up the client's initial Google Ads campaigns for them - at $10/day spend.
- **Outcome:** Upload a skill, suddenly have marketing running. No ads training, no agency retainer, no setup fees.
- **Requirements (confirm):** Claude subscription with Claude in Chrome, a Google Ads account, ~$10/day ad budget.

## The Funnel

```
Ad  →  Landing page  →  Email capture  →  Thank-you page
        (what it is,                       ├─ Download the skill
         how to install,                   ├─ "Get ALL our skills" → Spark AI Skool group
         what you get)                     └─ "Just do it for me" → Schedule a call / Spark Sites
```

Three ascending paths from the thank-you page:
1. **Free:** enter email → download the skill.
2. **Membership:** join the Spark AI Skool group → access to every skill Spark ever creates. (Group is being refocused on Spark citizens / Spark Sites owners getting the full skill library.)
3. **Done-for-you:** book a call / become a Spark Sites owner - we deploy it all, and owners get the full skill library too.

## Value Proposition

- The gap between "AI is powerful" and "AI is working for MY business" closes with an upload, not a course.
- No training on every little thing - deploy in-house without becoming a tech person.
- First skill = marketing running at $10/day. Real, immediate ROI from the first deploy.
- The library compounds: members get every future skill automatically.

## Audience

Small business owners and entrepreneurs (see `core/audience.md`) who know they should be using AI but don't want to be trained on it. They've watched competitors move; they're overwhelmed by tools; the DIY learning curve is the thing that's stopped them. Also existing Spark clients who want capabilities in-house without hiring.

## Skill Source

The first skill's source of truth lives in this repo: `core/offers/claude-skill/skill/google-ads-local-launch/SKILL.md`. The distributable package is the same folder zipped as `google-ads-local-launch.skill` (one top-level folder containing SKILL.md, forward-slash paths). v1.1 (2026-07-18) replaced the bulleted intake with a three-stage guided onboarding: one free-text opener (name + website) → silent site research → interactive questionnaire (AskUserQuestion) whose options are generated from the research, with a one-question-per-message chat fallback. v1.2 (2026-07-18) generalized beyond home services: the research pass classifies the business into a profile (LOCAL_SERVICE / STOREFRONT / REGIONAL_NATIONAL / ONLINE_SELLER), profile-filtered steps adapt targeting, keywords, dayparting, and conversion goals, and ambiguous steps ask a mid-run interactive question instead of guessing. Shopping-feed campaigns remain out of scope (future skill). Fix motive: v1.1's description hard-refused non-home-services businesses during Grant's test.

## Open Items (Grant to confirm)

- [x] **Mechanism name:** **Spark Skill Drops** (chosen by Grant 2026-07-17). First drop: "The $10/Day Google Ads Skill."
- [ ] Landing page URL (page not built yet)
- [ ] Is the first skill free-with-email only, or also purchasable a la carte? (Brief mentioned both)
- [ ] Skool group pricing/tier for "all skills" access
- [ ] Skool about page must be updated BEFORE ads run (congruence rule: ads can't promise what the about page doesn't show)
