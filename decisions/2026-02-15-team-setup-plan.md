---
type: decision
date: 2026-02-15
status: accepted
urgency: normal
---
# Team Setup Plan — Nicole Rhea & Amber Beardmore

## Situation

Grant is the sole contributor to spark-sites. Nicole and Amber need their own Claude Code + Git environments so they can contribute to reference files, research, and outputs — with every edit attributed to the right person.

## Decision

Each team member gets their own full setup: GitHub account, Git identity, Claude Code subscription, and (optionally) Main Branch membership for vip access.

## Per-Person Setup Steps

### 1. GitHub Account (Free)

- Create at github.com/signup
- Share username with Grant to be added as collaborator on spark-sites

### 2. Repo Access

Grant adds them as collaborators:
- Go to github.com/grantspark/spark-sites → Settings → Collaborators → Add people
- Add by GitHub username

### 3. Install GitHub Desktop

- Download from desktop.github.com
- Sign in with their GitHub account
- Clone spark-sites from GitHub.com tab

### 4. Git Identity (Per-Repo)

Open Git Bash inside the spark-sites folder and run:

**Nicole:**
```bash
git config user.name "Nicole Rhea"
git config user.email "nicole@[email]"
```

**Amber:**
```bash
git config user.name "Amber Beardmore"
git config user.email "amber@[email]"
```

This is repo-level config — only affects spark-sites commits, not other repos on their machine.

### 5. Install Claude Code

**Windows (PowerShell):**
```powershell
irm https://claude.ai/install.ps1 | iex
```

Authenticate with their own Claude account (separate Pro subscriptions recommended — $20/mo each — to avoid shared usage limits).

### 6. Main Branch Access (Optional but Recommended)

If they join Main Branch on Skool:
- Share GitHub username with Devon for vip repo access
- Clone vip via GitHub Desktop
- Run `/mb-setup` from spark-sites to link vip as skill engine

Without vip access, they can still edit reference files and use plain Claude Code — they just won't have `/mb-start`, `/mb-ads`, `/mb-think`, etc.

### 7. Verify Setup

After setup, each person runs in Git Bash from spark-sites:
```bash
git config user.name   # Should show their name
git config user.email  # Should show their email
```

Then make a test commit to confirm attribution shows correctly in GitHub Desktop and on github.com.

## What This Enables

- Every commit shows who made the edit (Grant, Nicole, or Amber)
- Each person can run Claude Code independently without affecting others
- Reference files, research, and outputs are all attributed
- Git history becomes a clear audit trail of who contributed what

## Cost

- GitHub accounts: Free
- Claude Pro subscriptions: $20/mo each ($40/mo for both, $60/mo total with Grant)
- Main Branch membership: Per Skool pricing (optional)

## What Changes

- `core/soul.md` — Team section already documents Grant, Nicole, Amber
- No structural changes to the repo needed — collaborator access is the only prerequisite
