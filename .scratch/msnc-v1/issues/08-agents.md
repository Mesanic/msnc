# 08: Agents (explorer, planner, implementer)

**What to build:** Three plugin agents.
- **explorer:** read-only (`disallowedTools: Write, Edit, NotebookEdit`). Uses Scope's `query`, `locate` and `context` before grep, and `slice` before reading whole files. Uses `ctx_*` tools for big output, except in plan mode. Never scans.
- **planner:** loads `msnc:trim`. Scopes with `impact --depth 2` when the repo is indexed. Uses Read, Grep and Glob in plan mode. Its plan lists the covering tests.
- **implementer:** the per-ticket brief from `/msnc:implement`, as an agent:
  - one ticket only
  - loads trim and tdd
  - impact before editing when indexed
  - typecheck and the affected test after every change
  - never commits
  - reports: files changed, which test covers each acceptance criterion, the last line of each check, open questions

None of the three sets `model` or `effort`, so each user's `CLAUDE_CODE_SUBAGENT_MODEL` default and session effort apply.

**Context:**
- Model resolution order, which is per-invocation parameter, then the definition's `model`, then `CLAUDE_CODE_SUBAGENT_MODEL`, then the main model: https://code.claude.com/docs/en/sub-agents.md
- The author's current agents: `C:\Users\User\.claude\agents\Explore.md` and `Plan.md`.
- The brief in `C:\Users\User\.claude\skills\implement\SKILL.md`.

**Blocked by:** 05, 07

**Status:** done

- [x] `/msnc:implement` dispatches `msnc:implementer`.
- [x] explorer's tool list cannot write files.
- [x] Tuner names `msnc:explorer` for plan-mode sweeps.

## Comments

- 2026-09-23 · explorer: `disallowedTools: Write, Edit, MultiEdit, NotebookEdit, Agent, EnterWorktree`; Bash/PowerShell stay for the Scope CLI, so a Bash write is blocked only by its instructions · a dispatcher PreToolUse deny on `agent_type` = `msnc:explorer` could close it once that field is confirmed to reach the hook.
- planner is read-only by instructions only (like the author's `Plan.md`); its `impact --depth 2` appends to `.atlas/`'s impact log, so plan mode may prompt.
- `skills/implement/SKILL.md` now sends a one-line brief; the rules live in `agents/implementer.md`. `test/references.test.mjs` `PENDING` is empty.
- Not verified live: `skills:` preload with namespaced names (`msnc:trim`), `${CLAUDE_PLUGIN_ROOT}` substitution in agent bodies. doctor's always-loaded estimate doesn't count agent descriptions yet.
