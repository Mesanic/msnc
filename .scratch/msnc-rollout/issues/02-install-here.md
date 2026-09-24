# 02: Install MSNC on this machine

**What to build:** MSNC running on the author's machine from the published marketplace, alongside the old hand-built blend. The old blend gets retired in ticket 03.

**Blocked by:** 01

**Status:** done

- [x] A new session shows Tuner and Clear, and `/config` shows the three MSNC options.
- [x] `/msnc:doctor` runs and lists what the old blend duplicates, which is the input for ticket 03.

## Comments

- 2026-09-23 · Installed at user scope from the published marketplace with Claude Code 2.1.280: `claude plugin marketplace add Mesanic/msnc` + `claude plugin install msnc@msnc` → v0.1.0 enabled (settings backed up to `~/.claude/backups/pre-msnc-install-2026-09-23/`). A fresh `claude -p` session quoted "MSNC is active." and "Clear: replies shaped for a reader who needs focus…". The plugin has four options, not three: `clear`, `trim_default`, `scope_gate`, `pace` (pace came with msnc-v1 ticket 15); not viewed in the `/config` UI.
- Doctor (`skills/doctor/doctor.mjs` from the installed plugin), the input for ticket 03:
  - Options: clear on, trim_default off, scope_gate on, pace 3. Always loaded: ~693 tokens (Tuner ~152, Clear ~395, 5 skill descriptions ~146).
  - Duplicate skills: plugin `ponytail@ponytail` (ponytail, ponytail-audit, ponytail-debt, ponytail-review); `~/.claude/skills` (aside, codebase-design, config-gc, context-budget, grilling, handoff, implement, setup-matt-pocock-skills, tdd, to-spec, to-tickets, verification-loop, wait-what: 13, not the 14 the ticket expected).
  - Project settings: `Jarvis/.claude/settings.json` turns on mattpocock-skills; `Hackathon/.claude/settings.local.json` (and its `ecc-ux-review-polish` worktree) turns on ecc@ecc. ECC must stay for Hackathon.
  - Old Scope layout: none. Recipes unused 30+ days: none.
