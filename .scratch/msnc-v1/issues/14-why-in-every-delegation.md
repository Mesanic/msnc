# 14: A why in every delegation

**Why:** User story 37. Delegated work makes better judgment calls when it knows the purpose, and history explains itself.

**What to build:**
- **Tickets:** the tickets skill adds a `**Why:**` line linked to a user story, and refuses to publish a ticket without one.
- **Implementer brief:** every brief (the `msnc:implementer` agent and `/msnc:implement`) carries the outcome, the why, the recipe to follow, the done-check and the report format.
- **Commits:** each ticket's commit message body carries `Why: <the ticket's why>`.
- **Trim:** asks for the why behind every new file, dependency or abstraction. Record this change in Trim's UPSTREAM.md.

**Context:**
- Spec section "A why in every delegation".
- This plan's tickets already carry Why lines from 11 onward; tickets 01–10 get theirs when `/msnc:tickets` regenerates them, or by hand.

**Blocked by:** 04, 05, 08

**Status:** done

- [x] (Eval written, run in ticket 09) A fixture run of `/msnc:implement` produces commits whose bodies contain each ticket's why.
- [x] The tickets skill refuses a ticket with no Why line.
- [x] Trim's text contains the why question, and UPSTREAM.md lists the change.

## Comments

- 2026-09-23 · A ticket with no Why line gets one derived (linked user story, else "What to build"), written into the ticket as `**Why:** … (derived)` in that ticket's commit · keeps runs from stalling on older tickets · switch to asking in `skills/implement/SKILL.md`.
- The brief passes the recipe as a path to its SKILL.md (recipes are typed-only, so the implementer can't invoke them via the Skill tool). Side effect: recipe notes (added after a Skill call) don't reach the implementer.
- Trim level files regenerated with ponytail's `filterSkillBodyForMode` at `1d95ff7` (verified byte-for-byte against the previous files first); ultra SubagentStart output 8,313 chars.
- The eval checks the `git commit` command in the trace, so `git commit -F file` would not match. ProcessDriven credit for the why rule is left to ticket 10.
