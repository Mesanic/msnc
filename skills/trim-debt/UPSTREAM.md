# Upstream

- Repo: https://github.com/DietrichGebert/ponytail (Dietrich Gebert, MIT, see `LICENSE`)
- Path: `skills/ponytail-debt/SKILL.md`
- Commit: `1d95ff7d39de12d87014ea40d4e22201bddc501b` (tag v4.10.0, committed 2026-09-14)
- Copied: 2026-09-23

## Local changes

- Skill renamed `ponytail-debt` → `trim-debt`; command `/ponytail-debt` → `/msnc:trim-debt`; triggers "ponytail debt", "what did ponytail defer", "ponytail ledger" → "trim debt", "what did trim defer", "trim ledger".
- Harvests both `trim:` and legacy `ponytail:` marker comments: grep `(#|//) ?ponytail:` → `(#|//) ?(trim|ponytail):`; the no-trigger check covers both; convention shown as `trim: <ceiling>, <upgrade path>`.
- Empty result `No ponytail: debt.` → `No trim: debt.`; suggested ledger file `PONYTAIL-DEBT.md` → `TRIM-DEBT.md`.
- Phrase "stop ponytail-debt" → "stop trim-debt".
- Added `disable-model-invocation: true`: typed-only, no description cost until typed.
- Line endings normalized to LF.
