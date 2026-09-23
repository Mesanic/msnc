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

**Status:** ready-for-agent

- [ ] `/msnc:implement` dispatches `msnc:implementer`.
- [ ] explorer's tool list cannot write files.
- [ ] Tuner names `msnc:explorer` for plan-mode sweeps.
