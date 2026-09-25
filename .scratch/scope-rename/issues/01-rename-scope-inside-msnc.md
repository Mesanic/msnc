# 01 — Rename Scope inside MSNC

**Why:** Story: as the MSNC maintainer, I want one name, Scope, in code, commands and data, so that I don't juggle four names (the old CLI name, atlas, scalpel and Scope).

**What to build:** After this PR, MSNC calls the tool Scope everywhere. The CLI is `scope.mjs` (run as `scope.mjs impact <file>`), the two engines are `files` (was atlas) and `symbols` (was scalpel), env vars are `SCOPE_*`, and a scanned repo holds its index in `.scope/files/` and `.scope/symbols/` with one map at `.scope/MAP.md`. No old name keeps working: no forwarding script under the old CLI name, no fallback for its old env vars. Every decision is in `docs/decisions.md` (the 2026-09-24 lines).

One PR, three commits, in this order:
1. A pure move: engine folders and the CLI file renamed with `git mv`, no content edits, so history follows the files. This commit alone is not green.
2. Content edits: everything that names the tool, including identifiers (e.g. `atlasDir`), the stored tool ID, viewer file names and placeholders, `MAP.md` auto markers (`scope:auto:`), comments, test names, the edit gate and its refusal text, the impact log path and TTL env var, `.gitignore` lines the scan writes (`.scope/files/overlays/`, `.scope/files/view/`, `.scope/symbols/index/`), the default ignore (`.scope/**`), the agents, the Tuner text, the Trim text ("Scope index → `scope impact`"), the setup/implement/verify skills, `plugin.json`, README and the evals (the impact-before-edit grader matches the new command).
3. Bookkeeping: MSNC is now Scope's only source. Remove the Scope entry from `vendor.json` and the upstream sync check, delete `skills/scope/UPSTREAM.md` and `skills/scope/LICENSE`, remove the Scope section from `THIRD_PARTY_NOTICES.md` and its README credits row, add the README line "Scope began as Mesanic/msnc-scope (archived)". Keep `skills/scope/THIRD-PARTY-NOTICES.md` (tree-sitter grammars).

Keep the old names where they detect or record the past: doctor's old-layout checks (`.claude/skills/{atlas,scalpel,scope}`, Scope hooks, `scope:begin`/`atlas:begin` blocks) and should also flag an old `.atlas/` or `.map/` folder; past entries in `evals/RESULTS.md`; everything under `.scratch/`. Don't rename the `.map` sourcemap extension or the `*.map` ignore glob.

No version bump: MSNC stays 0.1.0.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] `npm test` and `npm run check` pass at the end of the PR.
- [x] Outside doctor's legacy checks, `evals/RESULTS.md` history and `.scratch/`, a case-insensitive search for the old names finds nothing in MSNC.
- [x] A scan of a fresh fixture repo creates only `.scope/` (with `files/`, `symbols/`, `MAP.md`) and the new `.gitignore` lines; `scope.mjs impact` clears the edit gate for a mapped file.
- [x] doctor reports an old `.atlas/` or `.map/` folder as an old Scope layout.
- [x] The three commits are in the order above, and the first is moves only.

## Comments

- 2026-09-24 · Three commits: `0e56afd` pure `git mv` (71 renames), `3a860a1` content edits (76 files), then the bookkeeping commit. `npm test` 116 pass, `npm run check` 62 files clean. Old names remain only in doctor's legacy detection and the README "began as" line (plus its test).
- Decisions (also in `docs/decisions.md`): engine env vars `SCOPE_FILES`/`SCOPE_SYMBOLS`; `scope.mjs` finds engines only in the bundled `engine/`; identifiers such as `atlasDir`→`filesDir`, `mergeIntoAtlas`→`mergeIntoFileGraph`; in-memory provenance `files`/`symbols`; tool ID `scope-symbols@0.0.1`; viewer `view/scope.html`; the dead files-engine CLAUDE.md block deleted; the removed Scope notices section became a `## tree-sitter` pointer.
- Open: `scope.mjs`'s `ensureClaudeBlock`, `ensureHooks` and `CLAUDE_BLOCK` can never run under MSNC (scan always sets `SCOPE_NO_HOOK` and `SCOPE_NO_CLAUDE_MD`), so `--no-hook` and `--no-claude-md` do nothing. Renamed, not deleted; a follow-up can remove them.
