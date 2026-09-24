# Upstream

- Repo: https://github.com/affaan-m/ECC (Affaan Mustafa, MIT, see `LICENSE`)
- Path: `skills/context-budget/SKILL.md`
- Commit: `5064474d4d762dc9640234a41617cccb79185cec` (tag v2.2.1, committed 2026-09-07)
- Copied: 2026-09-23

## Local changes

- Skill renamed `context-budget` → `doctor` (typed as `/msnc:doctor`); `disable-model-invocation: true` added; description rewritten; `/context-budget` → `/msnc:doctor` throughout.
- "Doctor only reads" rule and Phase 0 added: run `doctor.mjs` (MSNC's own script, not upstream) for the MSNC checks (options, always-loaded estimate, duplicate skills, project plugin settings, old Scope layouts), with the fix for each flagged line. The report opens with those lines.
- Line endings normalized to LF.
