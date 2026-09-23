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

**Status:** ready-for-agent

- [ ] A fixture run of `/msnc:implement` produces commits whose bodies contain each ticket's why.
- [ ] The tickets skill refuses a ticket with no Why line.
- [ ] Trim's text contains the why question, and UPSTREAM.md lists the change.
