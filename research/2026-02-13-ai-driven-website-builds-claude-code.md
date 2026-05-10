---
type: research
date: 2026-02-13
source: claude-code
topics: [website-builds, ai-workflow, service-delivery, platforms, wordpress-mcp, pressable]
linked_decisions: []
status: draft
---
# AI-Driven Website Builds: Process & Platform Research

## The Question

How do we move from standard website builds to AI-driven website builds as a core service?

## Current State

**What's working:**
- `/mb-site` skill + Netlify deployment is fast and effective for brochure/informational sites
- Static HTML/CSS sites look great, deploy instantly, low maintenance
- Reference-driven generation means sites are on-brand from the start

**What's missing:**
- No CMS — clients can't edit their own content after handoff
- Limited SEO visibility — can't easily track performance, rankings, or organic traffic
- Not robust enough for clients who need more than an informational presence
- No plugin ecosystem, no forms-to-pipeline, no e-commerce

## Platforms Under Consideration

| Platform | Type | Strengths | Weaknesses | Verdict |
|----------|------|-----------|------------|---------|
| **Netlify + /site** | Static generation | Speed, simplicity, AI-native workflow | No CMS, no SEO tooling, brochure-only | Good for simple brochure sites |
| **Pressable + WordPress MCP** | Managed WordPress (Automattic) | Full CRUD via MCP, CMS built in, SEO plugins, markdown round-trip (confirmed), cheaper than current hosting | Beta, needs base theme/setup step | ⭐ **Frontrunner** |
| **WordPress.com MCP** | Hosted WordPress | Claude Connector in connectors directory | **Read-only** — no write access yet | Not sufficient |
| **Self-hosted WordPress + MCP Adapter** | Self-managed | Full control, Abilities API extensible | Hosting/maintenance burden on us or client | Unnecessary if using Pressable |
| **Lovable** | AI app builder | GitHub export, fast prototyping | Brittle post-export, no CMS, expensive debugging ($200-500/mo) | Not for client deliverables |
| **Manus** | AI agent platform | Impressive demos, full-stack generation | 25% factual error rate, burns credits fast, "intuitive intern" | Too unreliable for client work |

## WordPress MCP Landscape (Researched Feb 13, 2026)

Three distinct implementations exist:

### 1. WordPress.com Claude Connector
- Official connector launched Feb 5, 2026 — first in Claude's connectors directory
- **Read-only**: can query posts, comments, stats, settings, users
- Cannot create or edit content
- Write access announced but not shipped
- Available on all paid WordPress.com plans
- Source: [WordPress.com Claude Connector announcement](https://wordpress.com/blog/2026/02/05/claude-connector/)

### 2. WordPress MCP Adapter (self-hosted, open source)
- Official WordPress plugin shipping with WordPress 6.9
- Uses new **Abilities API** — any registered ability becomes an MCP tool
- Can create/manage posts, pages, Gutenberg blocks, WooCommerce products
- AI agents discover capabilities dynamically via `wp_register_ability()`
- Authentication: Application Passwords or JWT tokens
- **Critical limitation**: ~40% of WordPress sites use page builders (Elementor, Divi). MCP can't safely edit page builder content — only Gutenberg-native sites
- Source: [WordPress MCP Adapter GitHub](https://github.com/WordPress/mcp-adapter), [Developer Blog](https://developer.wordpress.org/news/2026/02/from-abilities-to-ai-agents-introducing-the-wordpress-mcp-adapter/)

### 3. Pressable MCP (managed WordPress, Automattic-owned) ⭐
- MCP Adapter **built into hosting** — toggle on from dashboard, no plugin install
- **Full write access**: create, update, search, delete posts, pages, custom post types
- Media uploads, taxonomy management, user management, site configuration
- Free with Pressable hosting (no extra MCP cost)
- Currently in **beta** — "activation at customer's own risk"
- **Key intel from Pressable senior technical architect**: entire site will be available as markdown
- Source: [Pressable MCP Guide](https://pressable.com/knowledgebase/getting-started-with-model-context-protocol-mcp-on-pressable/)

### Third-party options
- [Apify WordPress MCP Server](https://apify.com/extremescrapes/wordpress-mcp-server) — REST API access for publishing/managing content ($0.05/operation)
- Various npm/GitHub community MCP servers connecting to WordPress REST API

### Claude Cowork (announced Feb 13, 2026)
- WordPress.com plugin + skills that turns a Claude conversation into a **full WordPress block theme**
- Three skills: Site Specification → Site Design → Theme Creation
- Generates working Gutenberg block themes from natural language
- Currently deploys to WordPress Studio (local), but output theme can be used on any WordPress site
- **Developer preview** — early but officially backed by WordPress.com
- Potential to automate the "base theme" step that Pressable MCP currently needs
- Source: [Claude Cowork announcement](https://wordpress.com/blog/2026/02/13/new-plugin-and-skills-for-claude-cowork/)

## Why Pressable Stands Out

### Pricing (Corrected — From Grant's Direct Research)

| | Per Install/Month | Notes |
|--|---|---|
| **Pressable Year 1 (annual)** | **$2.75** | Promotional rate |
| **Pressable Year 2+ (renewal)** | **~$5.50** | Roughly double first-year rate |
| **Current hosting cost** | **$5.25** | What we're paying now |

**Bottom line:** Year 1 is a significant savings over current hosting. Even at renewal, it's roughly the same — and we get managed WordPress + MCP + Jetpack Complete included. The MCP capability is essentially free on top of hosting we'd be paying for anyway. This is not an added cost — it's a lateral move with more capability.

### Markdown Round-Trip (Confirmed by Pressable Architect)

```
Reference files → generate content as markdown → push to Pressable via MCP
                                                         ↓
                                              WordPress CMS (client edits)
                                                         ↓
Pull site as markdown ← read back via MCP ← client's live site
```

This means:
1. **We build with AI** — same reference-driven generation we already do with /site
2. **Client gets a real CMS** — they edit pages, add posts, manage content
3. **We can sync back** — pull site as markdown, see changes, push updates
4. **SEO comes built in** — WordPress plugins (Yoast, RankMath) handle meta, sitemaps, structured data natively in Gutenberg
5. **No page builder lock-in** — Gutenberg-native = MCP-compatible
6. **Managed hosting** — Pressable handles server, security, updates (Automattic-backed)

## Alternatives Evaluated

### Lovable — Not for Client Deliverables
- Exports to GitHub (no lock-in) and deploys to Netlify/Vercel
- "Brilliant for 0→1, but brittle for 1→100" — once you leave their ecosystem, you maintain code you didn't write
- ~60-70% production ready out of the box; debugging burns 80% of credits
- Gets expensive: $200-500/mo for active projects beyond $25 base
- **No CMS.** Client cannot self-manage content
- Source: [Lovable Review](https://hackceleration.com/lovable-review/), [Lovable AI Overview](https://max-productive.ai/ai-tools/lovable/)

### Manus — Too Unreliable
- Impressive demos: full task management apps in ~10 minutes
- **25% error rate** on factual data in independent testing
- MIT Tech Review: "a highly intuitive intern" — not reliable without supervision
- Burns credits fast, doesn't ask clarifying questions on vague prompts
- Acquired by Meta for ~$2B (Reddit reports) — future direction unclear
- Source: [Manus Max Review](https://cybernews.com/ai-tools/manus-max-review/), [Manus AI Review](https://www.lindy.ai/blog/manus-ai-review)

## Competitive Landscape

The ecosystem is moving fast but agencies aren't widely doing AI-built WordPress via MCP yet:

- **Claude Cowork** (Feb 13, 2026) — WordPress.com's own AI theme builder, just announced
- **InstaWP** — Provides staging environment + MCP server for agencies to sandbox AI builds before going live
- **Individual developers** — Medium posts about custom Claude-to-WordPress MCP servers appearing
- **No major agency** has publicly announced an AI-via-MCP WordPress build workflow yet

**This is early-mover territory.** The tooling just landed. Spark could be ahead of the curve.

## Theme Templating Strategy

**Kadence WP** is the strongest option for a base theme approach:
- AI-powered starter templates with Gutenberg blocks
- Agency-friendly (reusable patterns across client sites)
- Block patterns are maintainable and teachable to clients
- No long-term technical debt like custom blocks

**Workflow possibility:** Kadence base theme per client type (restaurant, coaching, retail) → MCP populates content from reference files → client manages via WordPress dashboard.

**Claude Cowork alternative:** If it matures, generate entire custom block themes conversationally, deploy to Pressable. Currently developer preview — watch closely.

## SEO Plugin Compatibility

Both **Yoast** and **RankMath** integrate deeply with Gutenberg. Content created via MCP gets SEO treatment automatically — meta tags, sitemaps, readability scoring. The SEO layer sits on top of content; it doesn't need its own MCP integration.

RankMath has a slight edge for AI workflows: more features in free tier, Content AI for optimization suggestions, better REST API support historically.

## Key Dimensions to Resolve

### 1. Client Need Segmentation
What percentage of website clients need CMS vs. brochure-only? This determines whether we tier the offering or go all-in on WordPress.

### 2. What "AI-Driven" Means for Our Workflow
Three possible models:
- **AI builds the whole site** — client describes, AI generates (Lovable/Manus approach) — **evaluated and rejected**
- **AI accelerates our build** — we architect, AI does heavy lifting via MCP (Pressable approach) — **frontrunner**
- **Hybrid** — simple sites via /site + Netlify, complex sites via Pressable + MCP

### 3. Business Model Implications
Current website pricing: $500-$3,500+. If AI cuts build time by 70%:
- Keep pricing, pocket the margin?
- Lower price, increase volume?
- Shift to higher-value services (strategy, ongoing growth) and use fast sites as an entry point?
- Recurring revenue from managed WordPress hosting (no added cost vs. current hosting)?

## Open Questions

### Answered
- [x] ~~What does WordPress.com MCP actually enable?~~ **Read-only, not sufficient**
- [x] ~~Pressable pricing per client site~~ **$2.75/mo Y1, ~$5.50 renewal — cheaper or same as current $5.25**
- [x] ~~Lovable handoff story~~ **No CMS, brittle post-export, not for client deliverables**
- [x] ~~Manus reliability~~ **25% error rate, "intuitive intern," too unreliable**
- [x] ~~Competitive landscape~~ **Early-mover territory — tooling just landing, no agencies doing this publicly yet**
- [x] ~~SEO plugins + MCP~~ **Yoast/RankMath work natively with Gutenberg content, no special MCP needed**
- [x] ~~Theme templating~~ **Kadence WP for base themes + block patterns, Claude Cowork as future option**

### Needs Testing (Not Research)
- [ ] How mature is Pressable's MCP beta in practice? Stable enough for client work?
- [ ] Does the markdown export include Gutenberg block structure or just content?
- [ ] Can Claude Cowork themes deploy directly to Pressable?
- [ ] End-to-end test: reference files → content generation → MCP push → live WordPress page
- [ ] What's the base theme/setup step look like? Can it be templatized per client type?

## Projected Workflow: Claude Code + Pressable MCP

### One-Time Agency Setup (Do Once)
1. Pressable account with annual plan
2. Configure Claude Code to connect to Pressable's MCP
3. Pick base theme (Kadence, or eventually Claude Cowork-generated)

### Per-Client Minimum Steps

| Step | Where | Who | Automatable? |
|------|-------|-----|-------------|
| 1. Spin up new WordPress install | Pressable dashboard | You | Possibly via API |
| 2. Toggle MCP on | Pressable dashboard | You | Unknown |
| 3. Install theme + SEO plugin | Dashboard or MCP | You | Likely via MCP |
| 4. Generate content from reference/conversation | Claude Code | You + AI | This is the AI part |
| 5. Push content to site via MCP | Claude Code | AI | Yes — the whole point |
| 6. Client reviews, iterate | Claude Code | You + client | Partially |
| 7. Point domain | Pressable dashboard | You | Manual |

### Analysis

**Minimum manual touchpoints:** 2 dashboard visits (spin up install, point domain). Everything else happens in Claude Code.

**Key unknown:** Steps 1-3. If Pressable exposes site provisioning through their API or MCP, the entire build could happen without leaving Claude Code except to point the domain. If not, there's 5-10 minutes of dashboard setup per client.

**The critical test:** Step 4→5 — does generating content from reference files and pushing via MCP actually work end-to-end? This is the first thing to verify with a test site.

### Claude Cowork Detail

Claude Cowork (announced Feb 13, 2026) is a WordPress.com plugin in developer preview:

**Workflow:**
1. Describe site in conversation (e.g., `/create-site A website for my fitness coaching business...`)
2. Claude asks clarifying questions
3. Presents multiple design options (fonts, colors, styling)
4. Iterate until satisfied
5. Generates a working Gutenberg block theme in minutes

**Three skills:**
- **Site Specification** — gathers context about the site
- **Site Design** — creates design options
- **Theme Creation** — generates block theme following best practices

**Current state:** Deploys to WordPress Studio (local dev), but output theme works on any WordPress site including Pressable. Requires GitHub clone to access. "Rapid development and changing constantly."

**Why it matters:** Could solve the "base theme" gap in the Pressable workflow. Instead of picking a pre-made theme (step 3 above), generate a custom theme conversationally — both theme AND content via AI.

### Needs Internal Discussion
- [ ] Do we tier (brochure vs. full CMS) or go all-in on Pressable for everything?
- [ ] How do we price the transition — same rates, new packaging?
- [ ] Training: does the team need WordPress/Gutenberg skills, or does MCP abstract that away?

## Next Steps

1. **Get a Pressable test site** — spin up one install, toggle MCP on, test the workflow
2. **End-to-end test** — try building a page from reference files via Claude Code + MCP
3. **Test markdown round-trip** — push content, pull it back, verify fidelity
4. **Evaluate Claude Cowork** — can it generate a theme for Pressable directly?
5. **Internal discussion** — tiering strategy, pricing, team readiness
6. **Draft a decision** on platform strategy based on test results

## Sources

- [Pressable MCP Guide](https://pressable.com/knowledgebase/getting-started-with-model-context-protocol-mcp-on-pressable/)
- [Pressable Pricing](https://pressable.com/pricing/)
- [WordPress MCP Adapter — Official](https://developer.wordpress.org/news/2026/02/from-abilities-to-ai-agents-introducing-the-wordpress-mcp-adapter/)
- [WordPress.com Claude Connector](https://wordpress.com/blog/2026/02/05/claude-connector/)
- [WordPress.com MCP Docs](https://developer.wordpress.com/docs/mcp/)
- [WordPress MCP Adapter GitHub](https://github.com/WordPress/mcp-adapter)
- [Claude Cowork — Build WordPress Sites with AI](https://wordpress.com/blog/2026/02/13/new-plugin-and-skills-for-claude-cowork/)
- [What Actually Works and What's Missing](https://respira.love/p/wordpress-just-got-an-ai-layer-heres)
- [WordPress.com MCP Settings](https://wordpress.com/support/model-context-protocol-mcp-settings/)
- [Apify WordPress MCP Server](https://apify.com/extremescrapes/wordpress-mcp-server)
- [Lovable Review](https://hackceleration.com/lovable-review/)
- [Manus Max Review](https://cybernews.com/ai-tools/manus-max-review/)
- [Manus AI Review — Lindy](https://www.lindy.ai/blog/manus-ai-review)
- [Kadence WP](https://www.kadencewp.com/)
- [RankMath SEO](https://rankmath.com/)
