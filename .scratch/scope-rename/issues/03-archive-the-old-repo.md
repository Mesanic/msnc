# 03 — Archive the old repo

**Why:** Story: as anyone who lands on the old repo, I want it to point to MSNC and be read-only, so that nobody builds on a dead copy.

**What to build:** the old repo is renamed to `Mesanic/msnc-scope`, its README opens with a pointer saying Scope now lives in `Mesanic/msnc` (as the `msnc:scope` skill), and the repo is archived. GitHub keeps redirecting the old URL to the renamed repo.

In order: rename, push the README pointer, update the repo description to match, archive. The only local clone (inside the tool-comparison backup) is stale; a fresh temporary clone is fine for the README commit.

**Blocked by:** 01 — Rename Scope inside MSNC; 02 — Move the four indexed repos to the `.scope/` layout.

**Status:** done

- [x] `gh repo view Mesanic/msnc-scope` shows it archived, with the pointer README and description.
- [x] The old repo URL redirects to `Mesanic/msnc-scope`.
- [x] Nothing in MSNC outside `docs/decisions.md`, the README "began as" line and `.scratch/` names the old repo.

## Comments

- 2026-09-24 · the old repo renamed to `Mesanic/msnc-scope`; README pointer pushed as `35a696a` ("Moved. This tool is now Scope, the `msnc:scope` skill in Mesanic/msnc…"); description "Archived: now Scope, the msnc:scope skill in Mesanic/msnc."; archived. `gh api` on the old repo name resolves to `Mesanic/msnc-scope`. In MSNC, the old repo name appears only in `docs/decisions.md`, `.scratch/`, the README "began as" line and the test that checks that line.
- The first push was rejected by GitHub's email privacy setting (the commit used a private address); it was re-authored with the repo's noreply identity, `7865719+Mesanic@users.noreply.github.com`.
