# 04: Trim module (ponytail copied in)

**What to build:** ponytail's skills copied in and renamed:
- `trim`: model-invoked; its description triggers on code work
- `trim-review`, `trim-audit`, `trim-debt`: typed-only

Changes to make:
- Rename commands and phrases: `/ponytail` → `/msnc:trim`, and "stop ponytail" → "stop trim".
- Keep the lite, full and ultra levels.
- Change the caller-check sentence to "repo has a Scope index → `sextant impact`; otherwise grep every caller".
- Make `trim-debt` harvest both `trim:` and legacy `ponytail:` marker comments.
- Provide the per-level Trim text that the dispatcher (ticket 03) injects when Trim is forced on.

Record every change in `UPSTREAM.md`.

**Context:**
- ponytail 4.9.0 cache: `skills\ponytail`, `ponytail-review`, `ponytail-audit`, `ponytail-debt`, and `hooks\ponytail-instructions.js` (level filtering).
- Upstream `DietrichGebert/ponytail`, pinned per ticket 02.

**Blocked by:** 02, 03

**Status:** ready-for-agent

- [ ] `/msnc:trim` loads the skill. After `/msnc:trim full`, a new subagent receives Trim, and it still applies after `/compact`.
- [ ] The references test finds no remaining `/ponytail` command.
- [ ] `UPSTREAM.md` lists the renames and the caller-check change, and LICENSE is present.
