---
type: signal
status: active
date: 2026-05-10
topics: [main-branch, mb-cli, migration, windows, onedrive, tooling]
---
# Migrated to Main Branch v0.2

## What Happened

Migrated spark-sites from the legacy v0.1 `reference/` layout to Main Branch
v0.2. `mb migrate --apply` moved 29 files from `reference/<dir>/` into
`core/<dir>/` (audience, offer, soul, voice, offers, proof, brand, strategy,
domain → operations) and added the v0.2 working folders (`bets/`, `pushes/`,
`log/`, `documents/`).

Side cleanup (same session): consolidated duplicate working trees from
`~/Documents/GitHub/` into the canonical `~/OneDrive/Documents/GitHub/` path,
pulled all upstream commits, deleted the duplicate Documents copies, and
preserved the one untracked research file as commit `1411055`.

## Why It Matters

This is the v0.1 → v0.2 line for spark-sites. Going forward, slash commands use
the `mb-` prefix (`/mb-start`, `/mb-think`, `/mb-ads`, `/mb-site`,
`/mb-organic`), and reference content lives at `core/...` instead of
`reference/...`. The `mb` CLI (v0.3.15) is now the deterministic control
plane; Claude Code skills are the judgment layer on top.

## Windows Quirk Worth Remembering

`mb migrate` failed at the compatibility-symlink step:

```
[WinError 1314] A required privilege is not held by the client
```

Windows blocks symlink creation for non-admin users unless Developer Mode is
on. Even with Developer Mode, OneDrive sync historically mangles symlinks.
Resolved by skipping the symlinks entirely and instead doing a repo-wide
sweep of `reference/...` references → `core/...` paths in CLAUDE.md, README,
skills, decisions, research, signals, outputs, and moved files. Cross-repo
references to `grant-sparks/reference/...` were preserved (hub repo not
migrated).

## What's Next

- spark-coaching gets the same migration (still on v0.1; also has stale
  `Nova Prime orchestrator` → should be `Lumen` in CLAUDE.md)
- grant-sparks (Lumen orchestration hub) stays on v0.1 — not a business repo
- spark-sales, morgan-for-congress, writing — out of migration scope

## Tools Used

| Tool | Role |
|------|------|
| `mb` CLI v0.3.15 | Schema migration, file moves |
| Custom Python sweeper | Path + slash-command sweep across 18 files |
| Git safety branch (`migrate/v01-to-v02`) | One-revert rollback if needed |
