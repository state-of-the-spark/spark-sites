---
type: research
date: 2026-02-20
topic: Static Dashboard Architecture for Client Reporting
method: web-research
---

# Static Dashboard Architecture for Client Reporting

## Context

Spark Sites needs a lightweight, branded client dashboard to display Meta/Facebook ads reach and organic reach metrics. Requirements: zero monthly software cost, weekly/biweekly updates, Netlify deploy, Next.js static export, and per-client sub-pages.

---

## 1. Repo Structure

### Recommendation: Separate repo (`spark-dashboards` or `client-dashboards`)

**Why separate:**
- Different deploy target (its own Netlify site, e.g., `dashboards.startwithspark.com`)
- Different build pipeline (data fetching + static export vs. normal site)
- Keeps the spark-sites repo clean for business operations and content
- GitHub Actions cron lives alongside the code it triggers
- Client data (API tokens, account IDs) stays isolated

**Proposed repo structure:**
```
spark-dashboards/
├── .github/
│   └── workflows/
│       └── update-metrics.yml        # Cron: fetch data + trigger Netlify build
├── scripts/
│   └── fetch-metrics.ts              # Node script: Meta API → JSON files
├── data/
│   ├── clients.json                  # Client registry (names, IDs, slugs, config)
│   └── metrics/
│       ├── client-slug-1.json        # Per-client metric snapshots
│       ├── client-slug-2.json
│       └── ...
├── public/
│   └── logos/                        # Client logos (small PNGs)
├── src/
│   └── app/
│       ├── layout.tsx                # Spark-branded shell
│       ├── page.tsx                  # Home: grid of all client cards
│       └── [slug]/
│           └── page.tsx              # Client detail page
├── next.config.js                    # output: 'export'
├── tailwind.config.ts
├── postcss.config.js                 # Must add manually (per v0 build notes)
├── tsconfig.json                     # Must add manually for @/ aliases
├── package.json
└── .env.local                        # META_ACCESS_TOKEN (gitignored)
```

**Link back to spark-sites:** Add a reference in `spark-sites/core/operations/` pointing to the dashboard repo, and optionally add it to `additionalDirectories` in `.claude/settings.local.json` if you want Claude to have context across both.

---

## 2. Site Structure

### Home Page (`/`)

A grid of client cards — each card shows:
- Client logo (or initial avatar fallback)
- Client name
- Hero metric: **Total Reach (last 30 days)** — ads + organic combined
- Trend indicator: up/down arrow + percentage vs. prior 30 days
- Status dot: green (active campaigns), gray (paused)
- Click through to `/[slug]`

**Implementation:** Read `data/clients.json` at build time, render a responsive CSS Grid (3-col desktop, 2-col tablet, 1-col mobile). Use shadcn/ui `Card` component for each client.

### Client Sub-Page (`/[slug]`)

Above-the-fold hero section:
- Client name + logo
- **Hero number:** Total Reach (last 30 days), large font
- **Trend sparkline** or percentage change vs. prior period
- **Date range** of the data shown

Below the fold:
- **Ads vs. Organic breakdown** — side-by-side metric cards or stacked bar
- **30-day trend chart** — area chart showing daily reach (two series: paid + organic)
- **Campaign-level table** (if multiple campaigns) — name, spend, reach, CPM
- **Monthly summary** — optional bar chart for month-over-month comparison

**Implementation with shadcn/ui + Recharts:**
```tsx
// src/app/[slug]/page.tsx
import { readFileSync } from 'fs';
import path from 'path';

export async function generateStaticParams() {
  const clients = JSON.parse(
    readFileSync(path.join(process.cwd(), 'data/clients.json'), 'utf-8')
  );
  return clients.map((c: any) => ({ slug: c.slug }));
}

export default async function ClientPage({ params }: { params: { slug: string } }) {
  const metrics = JSON.parse(
    readFileSync(
      path.join(process.cwd(), 'data/metrics', `${params.slug}.json`),
      'utf-8'
    )
  );
  // Render hero number, charts, etc.
}
```

This pattern works with `output: 'export'` because `generateStaticParams` runs at build time and `fs.readFileSync` is available during the build (Server Components run during `next build` for static export). The result is pure static HTML per client.

---

## 3. Data Pipeline

### Recommended: GitHub Actions cron → fetch script → commit JSON → Netlify build hook

This is the most reliable pattern for zero-cost static dashboards. It separates data fetching from site building.

#### Step 1: Fetch Script (`scripts/fetch-metrics.ts`)

Uses the official `facebook-nodejs-business-sdk` (npm package):

```ts
import bizSdk from 'facebook-nodejs-business-sdk';

const { FacebookAdsApi, AdAccount, Page } = bizSdk;
const api = FacebookAdsApi.init(process.env.META_ACCESS_TOKEN!);

// Per-client: fetch ad account insights
async function fetchAdInsights(adAccountId: string) {
  const account = new AdAccount(`act_${adAccountId}`);
  const insights = await account.getInsights(
    ['reach', 'impressions', 'spend', 'cpm', 'campaign_name'],
    {
      level: 'campaign',
      date_preset: 'last_30d',
      time_increment: 1,  // daily breakdown
    }
  );
  return insights;
}

// Per-client: fetch page organic reach
async function fetchPageInsights(pageId: string, pageToken: string) {
  const page = new Page(pageId);
  // Note: As of Nov 2025, 'page_impressions' replaced by 'page_views_total'
  // and 'page_post_engagements' still available
  const insights = await page.getInsights(
    ['page_views_total', 'page_post_engagements', 'page_fans'],
    {
      period: 'day',
      since: thirtyDaysAgo(),
      until: today(),
    }
  );
  return insights;
}
```

**Important 2025 API change:** Meta deprecated `page_impressions` and `page_fans` metrics in November 2025. Use `page_views_total` (replaces impressions) and the follower count endpoint instead. Always check [Meta's deprecation docs](https://docs.supermetrics.com/docs/facebook-insights-updates).

The script reads `data/clients.json`, loops through each client, fetches both ad account insights and page insights, then writes the results to `data/metrics/{slug}.json`.

#### Step 2: GitHub Actions Workflow

```yaml
# .github/workflows/update-metrics.yml
name: Update Dashboard Metrics

on:
  schedule:
    - cron: '0 6 * * 1'    # Every Monday at 6 AM UTC (2 AM ET)
    # For biweekly: '0 6 1,15 * *'
  workflow_dispatch:          # Manual trigger button

jobs:
  fetch-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci

      - name: Fetch Meta metrics
        env:
          META_ACCESS_TOKEN: ${{ secrets.META_ACCESS_TOKEN }}
        run: npx tsx scripts/fetch-metrics.ts

      - name: Commit updated data
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/metrics/
          git diff --staged --quiet || git commit -m "chore: update metrics $(date +%F)"
          git push

      - name: Trigger Netlify build
        run: curl -X POST -d '{}' ${{ secrets.NETLIFY_BUILD_HOOK }}
```

**How it works:**
1. Cron runs weekly (Monday 6 AM UTC)
2. Checks out repo, runs the fetch script
3. Commits updated JSON files to the repo (data is version-controlled — you get a history of every metric snapshot for free)
4. POSTs to a Netlify build hook URL, which triggers a fresh `next build` + deploy
5. Netlify reads the committed JSON files during build, generates static HTML

**Netlify build hook setup:** Settings > Build & deploy > Build hooks > Add build hook. Save the URL as a GitHub Actions secret (`NETLIFY_BUILD_HOOK`).

#### Alternative: Build-time fetch (not recommended)

You could fetch Meta API data inside `generateStaticParams` or Server Components during `next build`. Problems:
- Netlify build environment needs the Meta token as an env var (less isolated)
- If the Meta API is slow or rate-limited, your build times balloon
- No version-controlled data history
- Harder to debug when a fetch fails mid-build

**Verdict:** The commit-JSON-then-build approach is cleaner, more debuggable, and gives you free data history in Git.

---

## 4. Client Config / Onboarding

### `data/clients.json` — The Client Registry

```json
[
  {
    "slug": "acme-plumbing",
    "name": "Acme Plumbing",
    "logo": "/logos/acme-plumbing.png",
    "adAccountId": "123456789",
    "pageId": "987654321",
    "pageAccessToken": "STORED_IN_GITHUB_SECRETS_NOT_HERE",
    "active": true,
    "dashboardPassword": "STORED_IN_GITHUB_SECRETS_NOT_HERE",
    "onboardedDate": "2026-02-20"
  }
]
```

**Onboarding a new client checklist:**
1. Add entry to `data/clients.json` (slug, name, ad account ID, page ID)
2. Drop their logo in `public/logos/{slug}.png`
3. Generate a never-expiring Page Access Token for their Facebook Page:
   - Get short-lived user token from Graph API Explorer
   - Exchange for long-lived user token via API call
   - Call `/{user-id}/accounts` to get the never-expiring page token
   - Verify with Access Token Debugger (should show "Expires: Never")
4. Store tokens in GitHub Actions secrets: `META_PAGE_TOKEN_{SLUG}` or use a single JSON secret
5. Optionally: set a per-client password for their dashboard page
6. Push commit — next cron run (or manual `workflow_dispatch`) picks them up

**Token management approach:** Store all client tokens as a single GitHub Actions secret (`CLIENT_TOKENS`) containing a JSON object:
```json
{
  "acme-plumbing": { "pageToken": "EAA...", "adAccountId": "act_123" },
  "bobs-auto": { "pageToken": "EAA...", "adAccountId": "act_456" }
}
```
The fetch script reads this secret and merges with `clients.json` for the non-sensitive fields.

---

## 5. Auth / Security

### Tiered approach (recommended)

For a small agency with < 20 clients, full authentication is overkill. Use a layered strategy:

#### Layer 1: Unguessable URL slugs (baseline)

Instead of `/acme-plumbing`, use `/acme-plumbing-x7k9m2` — append a random 6-character suffix. This creates a "capability URL" (a W3C-recognized pattern). Anyone with the URL can view it, but it is not discoverable.

**Pros:** Zero infrastructure, zero cost, works perfectly with static export.
**Cons:** Security through obscurity — if a URL leaks, it is accessible. Not suitable for highly sensitive financial data.

For a reach/impressions dashboard? This is more than adequate. These are vanity metrics, not financial records.

#### Layer 2: StatiCrypt per-page encryption (recommended upgrade)

[StatiCrypt](https://github.com/robinmoisson/staticrypt) encrypts each HTML page with AES-256. The client enters a password in-browser and the page decrypts client-side. No server needed.

**Integration with the build:**
```json
// package.json scripts
{
  "build": "next build",
  "postbuild": "node scripts/encrypt-pages.js"
}
```

```js
// scripts/encrypt-pages.js
const { execSync } = require('child_process');
const clients = require('../data/clients.json');

clients.forEach(client => {
  if (client.dashboardPassword) {
    execSync(
      `npx staticrypt out/${client.slug}/index.html ` +
      `-p "${client.dashboardPassword}" ` +
      `-d out/${client.slug} ` +
      `--template-title "Spark Sites Dashboard" ` +
      `--template-color-primary "#FF6B35"`,  // Spark brand color
      { stdio: 'inherit' }
    );
  }
});
```

**Pros:** Works with Netlify free tier, per-client passwords, "Remember Me" checkbox persists in browser, zero ongoing cost.
**Cons:** Passwords stored in build env (GitHub Secrets). Client must enter password once per browser.

**Password delivery:** Text or email the client their password. They bookmark the URL + enter password once. The "Remember Me" feature uses localStorage so they rarely need to re-enter.

#### Layer 3: Netlify Identity (if you scale)

Netlify Identity provides actual user accounts with email/password or social login. Free tier includes 5 users + 1,000 invite-only sign-ups. But this adds complexity and requires client-side JS for auth gating.

**Verdict for Spark Sites:** Start with Layer 1 (unguessable slugs) for launch. Add Layer 2 (StatiCrypt) when the first client asks "can I password-protect this?" It takes 30 minutes to integrate.

---

## 6. Existing Tools & Templates

### Chart & UI Components

| Tool | What It Is | Best For | Bundle Size |
|------|-----------|----------|-------------|
| **[shadcn/ui + Recharts](https://v3.shadcn.com/docs/components/chart)** | Copy-paste chart components wrapping Recharts | Full brand control, lightweight | ~50KB gzipped |
| **[Tremor](https://www.tremor.so/)** | 35+ dashboard components (KPI cards, charts, trackers) | Speed to ship, pre-built KPI cards | ~200KB gzipped |
| **[next-shadcn-dashboard-starter](https://github.com/Kiranism/next-shadcn-dashboard-starter)** | Full App Router dashboard with auth, tables, charts | Reference architecture (strip what you need) | Heavy (Clerk, etc.) |
| **[shadcnblocks.com](https://www.shadcnblocks.com/admin-dashboard)** | Pre-built dashboard blocks | Grab individual card/chart blocks | Varies |

### Recommended stack for this project

```
Next.js 15+ (App Router, output: 'export')
├── Tailwind CSS v4
├── shadcn/ui (Card, Badge, Skeleton components)
├── shadcn/ui Chart (wraps Recharts — AreaChart, BarChart)
├── Lucide React (icons)
└── No auth library (StatiCrypt post-build)
```

**Why shadcn/ui over Tremor:** Tremor ships faster out of the box, but shadcn/ui gives you full Tailwind control for Spark branding (solarpunk colors, warm tones) at a fraction of the bundle size. Since this is a branded deliverable clients see, visual control matters more than speed-to-prototype.

### Specific components to grab

From shadcn/ui:
- `Card` — client cards on home page
- `Badge` — status indicators (active/paused)
- `Chart` — area charts (daily reach trend), bar charts (ads vs organic)
- `Table` — campaign breakdown table
- `Skeleton` — loading states (if you ever add client-side fetching)

From Tremor (if you want faster KPI cards):
- `KpiCard` — hero metric display with delta indicator
- `AreaChart` — 30-day trend with tooltips
- `BarList` — ranked campaign list

### Reference: shadcn/ui chart installation

```bash
pnpm dlx shadcn@latest add chart card badge table
```

---

## 7. Cost Analysis

| Component | Cost |
|-----------|------|
| Meta Marketing API | Free (rate-limited, sufficient for weekly pulls) |
| Meta Page Insights API | Free |
| GitHub Actions | Free (2,000 min/month on free tier; this uses ~2 min/week) |
| Netlify hosting | Free (100GB bandwidth, 300 build min/month) |
| Netlify build hooks | Free |
| Domain (subdomain of startwithspark.com) | Free (already own domain) |
| StatiCrypt | Free (open source, npm) |
| **Total monthly cost** | **$0** |

---

## 8. Implementation Phases

### Phase 1: MVP (1-2 days)
- Set up repo with Next.js + shadcn/ui + static export
- Create home page with hardcoded sample data
- Create one client sub-page with sample data
- Deploy to Netlify manually
- Validate the static export + deploy flow

### Phase 2: Data Pipeline (1 day)
- Write the Meta API fetch script
- Set up one test client with real ad account + page data
- Run locally, validate JSON output
- Set up GitHub Actions cron + Netlify build hook

### Phase 3: Polish + Auth (half day)
- Add StatiCrypt post-build encryption
- Add unguessable URL slugs
- Brand the password prompt page
- Send first client their dashboard link

### Phase 4: Scale
- Onboard remaining VIP clients
- Add month-over-month comparison charts
- Consider adding Instagram insights (same Meta API)
- Consider PDF export per client (for email reports)

---

## 9. Key Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Meta API token expiration | Use never-expiring page tokens (see Section 4). For ad accounts, use System User tokens via Business Manager — these do not expire. |
| Meta API metric deprecation | Pin to a specific Graph API version. Monitor Meta's changelog. The Nov 2025 deprecation of `page_impressions` is the most recent breaking change. |
| Client sees stale data | Show "Last updated: {date}" prominently. The cron commit history provides an audit trail. |
| Too many clients for free tier | Netlify free tier handles 100+ static pages easily. GitHub Actions free tier covers weekly runs for 50+ clients. |
| Client shares their URL | StatiCrypt password is the safety net. For truly sensitive clients, rotate the URL slug. |

---

## Sources

- [Next.js Static Exports Guide](https://nextjs.org/docs/app/guides/static-exports)
- [Next.js generateStaticParams](https://nextjs.org/docs/app/api-reference/functions/generate-static-params)
- [facebook-nodejs-business-sdk (npm)](https://www.npmjs.com/package/facebook-nodejs-business-sdk)
- [facebook-nodejs-business-sdk (GitHub)](https://github.com/facebook/facebook-nodejs-business-sdk)
- [Meta Ads API Guide (AdManage)](https://admanage.ai/blog/meta-ads-api)
- [Meta Page Insights Deprecation (Nov 2025)](https://docs.supermetrics.com/docs/facebook-insights-updates)
- [Scheduling Netlify Deploys with GitHub Actions](https://www.voorhoede.nl/en/blog/scheduling-netlify-deploys-with-github-actions/)
- [Trigger Netlify Builds on Schedule (GitHub)](https://github.com/Jinksi/netlify-build-github-actions)
- [StatiCrypt (GitHub)](https://github.com/robinmoisson/staticrypt)
- [Netlify Password Protection Docs](https://docs.netlify.com/manage/security/secure-access-to-sites/password-protection/)
- [shadcn/ui Chart Component](https://v3.shadcn.com/docs/components/chart)
- [shadcn/ui Dashboard Example](https://ui.shadcn.com/examples/dashboard)
- [Tremor Dashboard Components](https://www.tremor.so/)
- [next-shadcn-dashboard-starter (GitHub)](https://github.com/Kiranism/next-shadcn-dashboard-starter)
- [W3C Capability URLs](https://www.w3.org/2001/tag/doc/capability-urls/)
- [Never-Expiring Facebook Page Token Guide](https://gist.github.com/msramalho/4fc4bbc2f7ca58e0f6dc4d6de6215dc0)
- [Build a Dashboard with shadcn/ui (2026)](https://designrevision.com/blog/shadcn-dashboard-tutorial)
