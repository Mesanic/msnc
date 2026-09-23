# 13: Decide to Decide

**Why:** User story 36. Fewer interruptions for the user, and nothing silently guessed.

**What to build:**
- **Tuner rule.**
  - For a reversible choice: decide, state it in one line, and append it to `docs/decisions.md` as date · decision · why · how to reverse.
  - For an irreversible or destructive choice: ask one question with a recommended answer.
- **`/msnc:grill`:** each round offers "accept all recommendations", and records each accepted answer in the decisions log.
- **`/msnc:implement`:** decisions made inside a ticket go into that ticket's `## Comments` and the decisions log.

**Context:**
- Spec section "Decide to Decide".
- Clear's existing override "Destructive step → confirm first", which stays as it is.

**Blocked by:** 03, 05

**Status:** ready-for-agent

- [ ] Eval: a reversible naming choice is decided and logged, not asked.
- [ ] Eval: deleting data triggers exactly one question, with a recommended answer.
- [ ] `/msnc:grill` accepts "accept all" and logs every accepted recommendation.
