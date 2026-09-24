# 09: Evals

**What to build:** `claude plugin eval` cases for the routing promises:
- A code task loads Trim before the first edit.
- A non-code question never loads Trim.
- Plan mode makes no `ctx_*` calls.
- An indexed repo runs impact before an edit.
- `/msnc:implement` on a two-ticket fixture makes two commits, in order.
- Turning Clear on or off changes the reply's first line.
- A subagent receives Clear.

Record the results.

**Context:**
- https://code.claude.com/docs/en/plugin-evals.md
- Spec section "Testing Decisions".

**Blocked by:** 03, 04, 05, 07, 08

**Status:** ready-for-agent

- [ ] `claude plugin eval` runs every case, and the results are committed in `evals/RESULTS.md`.
- [x] Each failing case gets a follow-up ticket; no threshold is lowered to make it pass.

## Comments

- 2026-09-23 · Ran on native Windows with the desktop-bundled Claude Code 2.1.280. The PATH `claude` (2.1.268) has no `plugin eval`, and the npm copy (2.1.278) can't start opus-5-5 subagents. Results are in `evals/RESULTS.md`: 12 of 16 cases ran, 6 pass, 6 fail (tickets 17–21).
- Shell grants are refused on native Windows (no sandbox backend), so the 4 git/impact cases haven't run: ticket 16 (WSL2/Linux). The first box stays open until they run.
- Not expressible: plan mode and context-mode can't be set up in a run (the no-ctx case checks the Read/Grep/Glob fallback instead). Nor can the `clear` option: workspace `pluginConfigs` is ignored, so the no-plugin baseline stands in for "Clear off".
- Fixed a broken case: `file_exists` only sees files created during the run, so deleting-data's keep-checks now read the file contents. `implement-commits-carry-each-why` gained a `commits-in-order` grader instead of a duplicate case.
- Live checks: exec-form hooks, typed `/msnc:trim`, namespaced `command_name`, `skills:` preload, SubagentStart context and the PreToolUse deny are all confirmed. `${user_config.pace}` arrives literally when the option is unset (step 9's fallback gives 3). Bash `if` filters are still unverified.
