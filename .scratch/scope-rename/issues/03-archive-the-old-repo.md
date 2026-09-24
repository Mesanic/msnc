# 03 — Archive the old repo

**Why:** Story: as anyone who lands on the old repo, I want it to point to MSNC and be read-only, so that nobody builds on a dead copy.

**What to build:** `Mesanic/sextant` is renamed to `Mesanic/msnc-scope`, its README opens with a pointer saying Scope now lives in `Mesanic/msnc` (as the `msnc:scope` skill), and the repo is archived. GitHub keeps redirecting the old `sextant` URL to the renamed repo.

In order: rename, push the README pointer, update the repo description to match, archive. The only local clone (inside the tool-comparison backup) is stale; a fresh temporary clone is fine for the README commit.

**Blocked by:** 01 — Rename Scope inside MSNC; 02 — Move the four indexed repos to the `.scope/` layout.

**Status:** ready-for-human

- [ ] `gh repo view Mesanic/msnc-scope` shows it archived, with the pointer README and description.
- [ ] `https://github.com/Mesanic/sextant` redirects to `Mesanic/msnc-scope`.
- [ ] Nothing in MSNC outside `docs/decisions.md`, the README "began as" line and `.scratch/` names `Mesanic/sextant`.
