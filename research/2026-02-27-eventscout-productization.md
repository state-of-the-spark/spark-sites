---
type: research
date: 2026-02-27
status: active
tags: [eventscout, product, saas, revenue, agents]
---

# EventScout Productization — Research Brief

## What EventScout Does Today

EventScout is an AI-powered local event discovery agent built for Spark Sites. It scrapes business/networking events from 4 platforms (Meetup, Eventbrite, Lu.ma, Facebook Events), uses Gemini 2.0 Flash to score each event 1-10 against custom customer avatars, deduplicates across platforms, tracks seen events, and delivers a ranked HTML email digest twice a week.

**Current stack:**
- Apify actors for scraping (Event Scraper Pro + Facebook Events Scraper)
- Google Gemini 2.0 Flash for AI scoring
- YAML config for avatars, geography, sources
- GitHub Actions for scheduling (Wed/Fri 8am ET)
- Styled HTML email delivery via Gmail SMTP
- Seen-event registry (JSON) with 60-day retention

**Current config (Spark Sites):**
- 7 cities (Lakeland, Tampa, Orlando, Winter Haven, Kissimmee, Brandon, St. Petersburg)
- 4 avatars (local business owner, growing entrepreneur, female founder, event host)
- Output: ranked digest with score badges, avatar matching, "Worth Watching" section

---

## Why This Is Productizable

1. **No free public alternative.** Unlike Sunbiz data (free), curated event intelligence scored against custom customer profiles doesn't exist as a commodity.
2. **Painful to DIY.** Requires Apify accounts, Gemini API, scoring prompts, deduplication, seen-event tracking, email delivery — a real stack that most businesses won't build.
3. **Broad TAM.** Any business or professional that attends local events for networking, sponsorship, or client acquisition.
4. **Near-zero marginal cost.** Each customer adds ~$0.10-0.50/week in API costs at current Apify + Gemini rates.
5. **Email IS the product.** No app to build. No dashboard needed for v1. They get a beautiful email in their inbox.

---

## Target Customers

| Segment | Why They'd Buy | Willingness to Pay |
|---------|---------------|-------------------|
| **Marketing agencies** | Need event opportunities for clients, sponsor prospecting | High ($99-199/mo) |
| **B2B sales teams** | Insurance, commercial RE, financial advisors working conferences | High ($99/mo) |
| **Chambers of Commerce** | Exist to connect businesses with events; could recommend to members | Medium ($49-99/mo) |
| **Solo consultants / coaches** | Need to be seen at the right events, no time to hunt | Medium ($49/mo) |
| **Event sponsors / vendors** | Brands looking for sponsorship or vendor booth opportunities | High ($99-199/mo) |
| **Commercial real estate** | Track new business events, grand openings, market activity | Medium ($49-99/mo) |

---

## Pricing Model

| Tier | Price | Includes |
|------|-------|---------|
| **Starter** | $49/mo | 1 metro area, 2 avatars, weekly digest, 1 email recipient |
| **Pro** | $99/mo | 3 metro areas, 4 avatars, 2x/week digest, up to 5 email recipients |
| **Agency** | $199/mo | Unlimited metros, unlimited avatars, white-label digest for clients, API access |

**Annual discount:** 2 months free (e.g., Starter $490/yr instead of $588).

**Margins:** At $49/mo with ~$2/mo API cost per customer, gross margin is ~96%.

---

## Marketing Strategy

### Positioning

**Headline:** "Stop missing the events that would actually grow your business."

**Pitch:** Every week, events happen in your city where your ideal customers gather. You find out about them too late — or never. EventScout watches Meetup, Eventbrite, Facebook Events, and Lu.ma, scores every event against YOUR customer profile, and sends you a ranked digest. You just show up.

### Channels

1. **LinkedIn organic** — "I built an AI that scouts local events for my agency. Here's what it found this week." Post real digest screenshots. Show the score breakdowns. Let the product sell itself.

2. **Agency communities** — Skool groups, Facebook groups, agency Slack communities. Agencies are always hunting for client event opportunities. Offer 2-week free trials.

3. **Chamber of Commerce outreach** — Cold email chambers directly. They'd use this internally AND recommend it to members. Potential partnership: chamber gets it free, members get a discount code.

4. **Content marketing** — Weekly "Top Events for [City] Business Owners" blog posts. SEO play + proof of product. Each post is basically a public digest.

5. **Spark Sites cross-sell** — Offer to existing Spark Sites clients as an add-on. "We'll find the events where your customers are." Easy upsell.

### Trust Signals

- "Powered by the same system Spark Sites uses internally"
- Show real data: "We've scored 1,200+ events across Central Florida"
- Testimonials from Grant's own experience: events attended because of EventScout that led to real business

---

## Delivery Architecture

### What Exists Today (single-tenant)
```
config.yaml (1 customer) → scout.py → Apify + Gemini → HTML email
```

### What Changes for Multi-Tenant

**Phase 1: Manual (5 customers)**
- Store each customer's config as a separate YAML file (e.g., `configs/customer-123.yaml`)
- Run a loop script that executes `scout.py --config configs/customer-123.yaml` for each customer
- GitHub Action iterates through all configs
- Onboarding: Grant manually writes YAML from customer intake form
- Billing: Stripe subscription, manual setup
- **Timeline:** 1-2 days of work. Everything else already exists.

**Phase 2: Semi-Automated (20 customers)**
- Simple onboarding form (Typeform or custom page on sparkmysite.com)
- Auto-generate YAML from form submission (Python script or Zapier)
- Stripe billing with webhooks to enable/disable configs
- Customer can reply to digest email with feedback
- **Timeline:** 1-2 weeks of work.

**Phase 3: Scale (50+ customers)**
- Customer dashboard: edit avatars, view past digests, manage team recipients
- White-label option for agencies (their logo, their branding on the email)
- API endpoint for programmatic access to scored events
- Move from GitHub Actions to dedicated scheduler (VPS cron or cloud function)
- **Timeline:** 1-2 months of work.

### Infrastructure Cost Per Customer

| Component | Cost/Customer/Month |
|-----------|-------------------|
| Apify actor runs (8-10/month) | ~$0.50-1.00 |
| Gemini API calls (8-10/month) | ~$0.05-0.10 |
| Email delivery (8-10/month) | ~$0.01 |
| **Total** | **~$0.60-1.10** |

At $49/mo minimum, that's **97%+ gross margin**.

---

## Competitive Landscape

| Competitor | What They Do | Why EventScout Wins |
|-----------|-------------|-------------------|
| Eventbrite search | Manual search on one platform | We search 4 platforms, score with AI, deliver to inbox |
| Meetup notifications | Generic email alerts | We score against YOUR customer profile, not generic relevance |
| Google Alerts | "events near me" alerts | Low quality, no scoring, no deduplication |
| Manual research | Team member Googles events weekly | 2-4 hours/week saved per person |
| Nothing (most common) | They miss events | EventScout exists because this is the default |

**No direct competitor** offers multi-platform event scraping + AI scoring against custom business avatars + curated email digest. This is a new category.

---

## Risks

1. **Apify dependency** — if Apify changes pricing or actors break, scraping stops. Mitigation: actors are community-maintained and replaceable.
2. **Platform blocking** — Facebook or Meetup could block scraping. Mitigation: we use established Apify actors that handle anti-scraping.
3. **Support burden** — customers want more customization than YAML allows. Mitigation: Phase 2 dashboard, and keep Starter tier simple.
4. **Churn** — event discovery is "nice to have" not "need to have" for some segments. Mitigation: target agencies and B2B sales (higher pain) not solo hobbyists.

---

## Recommended Action Plan

### Immediate (This Week)
- [ ] Validate demand: post on LinkedIn about EventScout, gauge interest
- [ ] Pick 3-5 people to offer free 2-week trial (agencies, chamber contacts, B2B sales reps)

### Phase 1 Launch (March 2026)
- [ ] Build multi-config runner script (loop through customer YAMLs)
- [ ] Create intake form (city, business type, ideal customer description)
- [ ] Set up Stripe product with 3 tiers
- [ ] Create landing page on sparkmysite.com/eventscout
- [ ] Onboard 5 beta customers at $49/mo

### Phase 2 Growth (April-May 2026)
- [ ] Automate onboarding (form → YAML generation)
- [ ] Add customer self-serve portal
- [ ] Target 20 paying customers
- [ ] Agency white-label option

### Revenue Projection

| Month | Customers | MRR | Notes |
|-------|-----------|-----|-------|
| March | 5 | $245-495 | Beta, mix of Starter/Pro |
| April | 10 | $490-990 | Word of mouth, LinkedIn |
| May | 20 | $980-1,980 | Chamber partnerships, agency outreach |
| June | 30 | $1,470-2,970 | Content marketing kicks in |
| December | 50-75 | $2,450-7,425 | Established, referral-driven |

**Conservative year 1 target:** $30K-50K ARR from EventScout alone.

---

*Research compiled by Lumen for Spark Sites — February 2026*
