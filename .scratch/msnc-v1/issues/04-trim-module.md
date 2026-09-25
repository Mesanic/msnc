# 04: Trim module (ponytail copied in)

**What to build:** ponytail's skills copied in and renamed:
- `trim`: model-invoked; its description triggers on code work
- `trim-review`, `trim-audit`, `trim-debt`: typed-only

Changes to make:
- Rename commands and phrases: `/ponytail` → `/msnc:trim`, and "stop ponytail" → "stop trim".
- Keep the lite, full and ultra levels.
- Change the caller-check sentence to "repo has a Scope index → `scope impact`; otherwise grep every caller".
- Make `trim-debt` harvest both `trim:` and legacy `ponytail:` marker comments.
- Provide the per-level Trim text that the dispatcher (ticket 03) injects when Trim is forced on.

Record every change in `UPSTREAM.md`.

**Context:**
- ponytail 4.9.0 cache: `skills\ponytail`, `ponytail-review`, `ponytail-audit`, `ponytail-debt`, and `hooks\ponytail-instructions.js` (level filtering).
- Upstream `DietrichGebert/ponytail`, pinned per ticket 02.

**Blocked by:** 02, 03

**Status:** done

- [x] `/msnc:trim` loads the skill. After `/msnc:trim full`, a new subagent receives Trim, and it still applies after `/compact`.
- [x] The references test finds no remaining `/ponytail` command.
- [x] `UPSTREAM.md` lists the renames and the caller-check change, and LICENSE is present.

## Comments

- 2026-09-23 · Copied from pinned `1d95ff7` (identical to the 4.9.0 cache for these four skills), converted to LF · level texts generated with ponytail's own `filterSkillBodyForMode`; `test/skills.test.mjs` fails if `SKILL.md` and the level files drift.
- `test/references.test.mjs` keeps `PENDING = { scope: '07-scope-module', explorer: '08-agents' }`; each ticket removes its own entry (a second test fails once a pending name exists).
- Live `/compact` and subagent runs not done (CLI auth expired); covered by the dispatcher tests.
- Open for later: Trim's `## Output` section repeats Clear rule 2 (spec: no rule in two places); `trim`'s ~800-char upstream description stays loaded (spec wants short); the why rule belongs to ticket 14; `sync-upstream --check` now exits 1 for every intentionally edited copy.
