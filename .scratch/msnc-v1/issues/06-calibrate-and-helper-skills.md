# 06: Calibrate and helper skills

**What to build:** Seven typed-only skills:
- **aside:** from ECC `commands\aside.md`.
- **rephrase:** from mattpocock `wait-what`. It should work without a `CONTEXT.md` when the repo has none.
- **handoff:** from mattpocock.
- **verify:** ECC verification-loop, plus a `scope check` step when the repo is indexed.
- **doctor:** ECC context-budget, plus MSNC checks:
  - which MSNC options are on
  - an estimate of the always-loaded tokens
  - duplicate skills from other enabled plugins, such as `mattpocock-skills` or `ecc`
  - project-level plugin settings that conflict with MSNC
  - old three-folder atlas/scalpel/scope layouts in the current repo
- **declutter:** ECC config-gc. Keep its rules: move to trash first, ask per item.
- **setup:**
  - walks through the three options
  - offers the context-mode install and `ask` rules for `ctx_purge` and `ctx_upgrade`
  - writes the local tracker config to `docs/agents/`
  - offers `/msnc:scope init` for the current repo
  - explains how subagent models are chosen and, after a yes, sets a default with `CLAUDE_CODE_SUBAGENT_MODEL` in the user's `env`. A model id such as `claude-opus-5-5` pins a version; an alias follows the family. MSNC itself pins nothing.

**Context:**
- ECC 2.2.0 cache: `skills\verification-loop`, `skills\context-budget`, `skills\config-gc`, `commands\aside.md`.
- mattpocock clone: `skills\productivity\wait-what`, `skills\productivity\handoff`, and `skills\engineering\setup-matt-pocock-skills` (including `issue-tracker-local.md`).
- The duplicates and conflicts doctor should find on this machine: project settings in `Desktop\AI Projects\Jarvis` (full mattpocock-skills plugin on) and `Hackathon` (ecc on, ponytail off).

**Blocked by:** 02

**Status:** done

- [x] All seven skills have `disable-model-invocation: true`.
- [x] Run on this machine, doctor flags the Jarvis and Hackathon project settings.
- [x] setup shows every settings change and waits for a yes before writing.
- [x] Every copied folder has LICENSE and UPSTREAM.md.

## Comments

- 2026-09-23 · Copied from pinned ECC v2.2.1 `5064474` and mattpocock v1.2.3 `6acc160`; `sync-upstream` now also handles a single-file upstream path (aside).
- doctor's mechanical checks live in `skills/doctor/doctor.mjs` (read-only). Option values come from `~/.claude/settings.json` `pluginConfigs["msnc@…"].options`, falling back to `plugin.json` defaults. Projects come from `~/.claude.json` `projects`. A project that turns a duplicating plugin off is reported as an override, not a conflict.
- A duplicate is a skill or command named like an MSNC skill or like the upstream folder it was copied from (`vendor.json` `paths`); `~/.claude/skills` and the repo's `.claude/skills` are checked too.
- Old layout = `.claude/skills/{atlas,scalpel,scope}`, Scope project hooks, or a `scope:begin` block.
- setup explains options but never writes them (`/config` does); dropped upstream's CLAUDE.md block, triage labels, domain docs, PR triage and Wayfinding. Unconfirmed against docs: subagent model fallback wording and `/plugin marketplace add mksglu/context-mode`.
- Real run: always-loaded ~655 tokens (Tuner ~148, Clear ~395, 4 model-invoked descriptions ~112). Skills not run live (CLI auth expired).
