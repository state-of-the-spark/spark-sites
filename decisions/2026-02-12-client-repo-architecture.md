---
type: decision
date: 2026-02-12
status: accepted
linked_research: []
supersedes: null
---

# Decision: Separate Repos for Premium Client Work

## Context

Spark Sites is growing into a full-service growth marketing agency. Premium clients — those purchasing ongoing marketing services (ads, SEO, social, content) — need the same reference-driven workflow that powers Spark Sites' own marketing. The question: should client work live inside spark-sites as subfolders, or should each premium client get their own repo?

This decision affects how we onboard clients, how we switch between client work, and whether client context can be cleanly separated or handed off.

## Options

### Option A: Separate repo per client (recommended)

Each premium client gets their own business repo with the full Main Branch structure (`core/`, `research/`, `decisions/`, `outputs/`). Same vip engine powers all of them. Client repos are added to `~/.config/vip/local.yaml` under `recent_repos` and switched via `/mb-start`.

**Pros:**
- Passes the Shared Soul Test — each client has their own soul, voice, audience, offer
- Clean separation of context — client work never bleeds into agency work
- Portable — client repo can be archived, handed off, or transferred if relationship ends
- Skills work out of the box — `/mb-ads`, `/mb-think`, `/mb-organic` expect repo-root `reference/`
- Token efficiency — only one client's context loaded at a time
- Client can eventually use Main Branch themselves (their repo is self-contained)
- Git history per client — clear audit trail of what was researched, decided, and created

**Cons:**
- More repos to manage (one per active client)
- Initial setup time per client (`/mb-setup` for each)
- Switching between clients requires `/mb-start` repo selection
- No single view of "all client work" without external tooling (ClickUp fills this gap)

### Option B: Client folders within spark-sites

Create a `clients/` folder inside spark-sites: `clients/client-name/reference/`, `clients/client-name/outputs/`, etc.

**Pros:**
- Everything in one repo — simple file management
- Can see all client work at a glance in one repo
- No repo switching needed

**Cons:**
- Violates the Shared Soul Test — client souls are not Spark Sites' soul
- Skills expect `reference/` at repo root — would need path workarounds or skill modifications
- Client context mixed with agency context in git history
- Can't hand off a client's work cleanly — it's entangled with your repo
- Token waste — loading spark-sites context pollutes client work
- Scaling problem — repo grows linearly with each client added
- No clean separation if a client relationship ends

### Option C: Clients as "offers" in spark-sites multi-offer structure

Treat each client as an offer under `core/offers/client-name/`.

**Pros:**
- Uses existing multi-offer architecture
- Offer switching already works

**Cons:**
- Fundamentally wrong abstraction — clients are not Spark Sites offers
- A client's soul is not your soul. A client's voice is not your voice
- Offer-level files only override `offer.md` and `audience.md` — clients need their own `soul.md`, `voice.md`, `testimonials.md`, angles, brand, everything
- Would corrupt Spark Sites' own offer structure (websites, seo, consulting are real offers)
- Breaks every assumption the architecture makes about what "offer" means

## Decision

**We chose: Option A (Separate repo per client)**

The Shared Soul Test is definitive — each client has their own identity, voice, audience, and offer. The Main Branch engine + data architecture was designed for exactly this: same engine, different data, different outputs. The overhead of managing multiple repos is minimal because `/mb-start` already handles repo switching via `recent_repos`, and `/mb-setup` scaffolds new repos in minutes. ClickUp handles the project management layer across clients.

## Consequences

### What Becomes Easier
- Client onboarding is repeatable (`/mb-setup` → build reference → start creating)
- Each client gets the full power of every skill, tuned to their business
- Handing off or archiving client work is a clean repo operation
- Client context never pollutes agency work or other clients
- Can eventually give clients access to their own repo for collaboration

### What Becomes Harder
- Must switch repos to switch clients (small friction, handled by `/mb-start`)
- No single-repo view of all client work (use ClickUp for cross-client tracking)
- Each client needs initial `/mb-setup` and reference building investment

### What We're Accepting
- `recent_repos` in local.yaml becomes the de facto client roster
- The real bottleneck is building quality reference files per client, not repo management
- Some clients (one-off website builds) may not need a full repo — this is for premium/ongoing clients only

## What Changes

No reference file changes needed — this is an operational process decision. What changes:

1. **Client onboarding workflow**: Run `/mb-setup` for each new premium client → scaffold repo → build reference files through `/mb-think` → create with `/mb-ads`, `/mb-organic`, etc.
2. **`~/.config/vip/local.yaml`**: Each client repo gets added to `recent_repos` as onboarded. `/mb-start` presents the full list for switching.
3. **spark-sites stays focused**: spark-sites is Spark Sites the agency. Client testimonials about Spark Sites go in `spark-sites/core/proof/testimonials.md`. Client business context goes in the client's own repo.
4. **Boundary rule**: If it's about the CLIENT'S business (their offer, audience, voice, ads), it goes in the client repo. If it's about SPARK SITES (your process, your proof, your agency offer), it goes in spark-sites.

## Client Tier Guide

Not every client needs a repo:

| Client Type | Repo? | Why |
|-------------|-------|-----|
| One-off website build | No | Deliverable-based, no ongoing reference needed |
| Website + basic maintenance | No | Minimal ongoing context |
| Premium marketing services (ads, SEO, social, content) | Yes | Ongoing reference-driven work, multiple output types |
| Retainer/strategy clients | Yes | Deep reference, evolving decisions, multiple campaigns |

The threshold: **if you'll run `/mb-ads` or `/mb-organic` for them more than once, they need a repo.**

## Review Date

Revisit after onboarding 3 clients — assess whether the workflow scales and whether any shared tooling (cross-client dashboards, templates) is needed.
