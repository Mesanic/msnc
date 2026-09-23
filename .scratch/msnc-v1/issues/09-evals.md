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
- [ ] Each failing case gets a follow-up ticket; no threshold is lowered to make it pass.
