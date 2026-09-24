# 01 — Rename Scope inside MSNC

**Why:** Story: as the MSNC maintainer, I want one name, Scope, in code, commands and data, so that I don't juggle four names (sextant, atlas, scalpel, Scope).

**What to build:** After this PR, MSNC calls the tool Scope everywhere. The CLI is `scope.mjs` (run as `scope.mjs impact <file>`), the two engines are `files` (was atlas) and `symbols` (was scalpel), env vars are `SCOPE_*`, and a scanned repo holds its index in `.scope/files/` and `.scope/symbols/` with one map at `.scope/MAP.md`. No old name keeps working: no forwarding `sextant.mjs`, no `SEXTANT_*` fallback. Every decision is in `docs/decisions.md` (the 2026-09-24 lines).

One PR, three commits, in this order:
1. A pure move: engine folders and the CLI file renamed with `git mv`, no content edits, so history follows the files. This commit alone is not green.
2. Content edits: everything that names the tool, including identifiers (e.g. `atlasDir`), the stored tool ID, viewer file names and placeholders, `MAP.md` auto markers (`scope:auto:`), comments, test names, the edit gate and its refusal text, the impact log path and TTL env var, `.gitignore` lines the scan writes (`.scope/files/overlays/`, `.scope/files/view/`, `.scope/symbols/index/`), the default ignore (`.scope/**`), the agents, the Tuner text, the Trim text ("Scope index → `scope impact`"), the setup/implement/verify skills, `plugin.json`, README and the evals (the impact-before-edit grader matches the new command).
3. Bookkeeping: MSNC is now Scope's only source. Remove the sextant entry from `vendor.json` and the upstream sync check, delete `skills/scope/UPSTREAM.md` and `skills/scope/LICENSE`, remove the sextant section from `THIRD_PARTY_NOTICES.md` and its README credits row, add the README line "Scope began as Mesanic/sextant (archived)". Keep `skills/scope/THIRD-PARTY-NOTICES.md` (tree-sitter grammars).

Keep the old names where they detect or record the past: doctor's old-layout checks (`.claude/skills/{atlas,scalpel,sextant}`, sextant hooks, `sextant:begin`/`atlas:begin` blocks) and should also flag an old `.atlas/` or `.map/` folder; past entries in `evals/RESULTS.md`; everything under `.scratch/`. Don't rename the `.map` sourcemap extension or the `*.map` ignore glob.

No version bump: MSNC stays 0.1.0.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `npm test` and `npm run check` pass at the end of the PR.
- [ ] Outside doctor's legacy checks, `evals/RESULTS.md` history and `.scratch/`, a case-insensitive search for sextant, atlas and scalpel finds nothing in MSNC.
- [ ] A scan of a fresh fixture repo creates only `.scope/` (with `files/`, `symbols/`, `MAP.md`) and the new `.gitignore` lines; `scope.mjs impact` clears the edit gate for a mapped file.
- [ ] doctor reports an old `.atlas/` or `.map/` folder as an old Scope layout.
- [ ] The three commits are in the order above, and the first is moves only.
