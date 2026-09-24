# 01: Publish Mesanic/msnc and the sextant fixes

**What to build:** MSNC is public and installable from GitHub.
- Create `Mesanic/msnc` and push.
- Tag `v0.1.0`.
- Push the two sextant fixes from msnc-v1 ticket 07 to `Mesanic/sextant`, and point the vendor manifest at the resulting commit.

**Blocked by:** every ticket in `.scratch/msnc-v1/`

**Status:** done

- [x] `/plugin marketplace add Mesanic/msnc` then `/plugin install msnc@msnc` works on a machine that never had MSNC.
- [x] `node scripts/sync-upstream.mjs --check` reports sextant in sync with the pushed commit.

## Comments

- 2026-09-23 · Sextant: MSNC's three fixes pushed to `Mesanic/sextant` main (`bc8b321`, `9f16c18`, `bf4ceb7`; 8/8 upstream tests), vendor pin moved to `bf4ceb7`, `patches/sextant/` removed; `sync-upstream --check` lists only sextant's documented local changes. Sextant made public (its history has no private email). MSNC: history rewritten to scrub the maintainer's private email from old patch files, the repo deleted and recreated (the old PRs #1–#3 are gone; their merge commits remain), made public, tagged `v0.1.0` (`581264e`). Install test on WSL2 Claude Code 2.1.281 with no prior MSNC: `claude plugin marketplace add Mesanic/msnc` + `claude plugin install msnc@msnc` → v0.1.0 enabled; a fresh session got "MSNC is active." from the SessionStart hook. Uninstalled afterwards.
