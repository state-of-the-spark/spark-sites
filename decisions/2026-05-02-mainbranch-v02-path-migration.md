---
type: decision
date: 2026-05-02
status: accepted
topic: Main Branch v0.2 path migration
linked_issues:
  - https://github.com/noontide-co/mainbranch/issues/175
---

# Main Branch v0.2 Path Migration

This repo was migrated from the legacy v0.1 reference layout to the current
v0.2 layout. The file moves were performed by `mb migrate --apply` on
2026-05-10. The remaining writes (CLAUDE.md path replacements, `.gitignore`
update, schema-version marker, and a repo-wide reference-path sweep) were
completed manually because Windows symlink permissions blocked `mb migrate`
from finishing the run.

## Changes

- Moved `reference/core/*` into `core/`.
- Moved `reference/offers/*` into `core/offers/`.
- Moved `reference/proof/*` into `core/proof/`.
- Moved `reference/brand/*` and `reference/visual-identity/*` into `core/brand/`.
- Moved `reference/strategy/*` into `core/strategy/`.
- Moved brand-level `reference/domain/content-strategy.md` and
  `reference/domain/product-ladder.md` into `core/`.
- Moved remaining `reference/domain/*` operating context into `core/operations/`.
- Added current Main Branch working folders (`bets/`, `pushes/`, `log/`,
  `documents/`).
- Wrote `.mb/schema_version` (`0.2`).
- Appended `.mb/backups/` to `.gitignore`.
- Skipped the `reference/core` and `reference/offers` compatibility symlinks
  because Windows blocks symlink creation for non-admin users without Developer
  Mode, and OneDrive sync historically mangles symlinks. Instead, swept all
  `reference/...` references throughout the repo (CLAUDE.md, skills,
  decisions, research, signals, outputs, and moved files) to point at the
  new `core/...` paths. Cross-repo references to `grant-sparks/reference/...`
  were preserved because that hub repo has not been migrated.
- `reference/clients/inspire-more-travel/design-feedback.md` was left in place
  because v0.2 has no canonical home for client notes; relocate manually if
  desired.
