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

**Status:** done

- [x] Eval (written, run in ticket 09): a reversible naming choice is decided and logged, not asked.
- [x] Eval (written, run in ticket 09): deleting data triggers exactly one question, with a recommended answer.
- [x] `/msnc:grill` accepts "accept all" and logs every accepted recommendation.

## Comments

- 2026-09-23 · Tuner is at exactly 800 chars (~200 tokens, the cap): bullets removed and lines tightened; log format says `undo` for "how to reverse" · keeps the ticket 12 cap · any new Tuner rule must displace wording or raise the cap.
- grill logs every settled answer (including ones the user wrote), not only accepted recommendations; in plan mode the log lines wait until plan mode ends.
- implementer makes reversible choices itself and reports them on a `Decisions:` line; implement writes them to the ticket's `## Comments` and `docs/decisions.md` in the ticket's commit. No `docs/decisions.md` template shipped.
- Possible tension: Clear's "Real ambiguity → one short question" vs Tuner's "decide". Clear left unchanged.
