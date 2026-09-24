# Upstream

- Repo: https://github.com/affaan-m/ECC (Affaan Mustafa, MIT, see `LICENSE`)
- Path: `skills/verification-loop/SKILL.md`
- Commit: `5064474d4d762dc9640234a41617cccb79185cec` (tag v2.2.1, committed 2026-09-07)
- Copied: 2026-09-23

## Local changes

- Skill renamed `verification-loop` → `verify` (typed as `/msnc:verify`); `disable-model-invocation: true` added; description rewritten to name the gate.
- Phase 7 added: `scope check` only when the repo has a Scope index (`.scope/`), SKIPPED otherwise; the report gains a `Scope:` row.
- "Run: /verify" → "Run: /msnc:verify".
- Issues to Fix (MSNC ticket 15): each issue is cause · fix · prevention, prevention being a recipe change through `/msnc:refine` or a recipe note; no blame wording.
- Line endings normalized to LF.
