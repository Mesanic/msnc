# 15: Human pacing

**Why:** User stories 38–39. Long runs should fit the user's energy, and mistakes should improve the system.

**What to build:**
- **`pace` option:** a `userConfig` option, default 3; 0 means never offer a stop.
- **Stopping points:** after every `pace` tickets, `/msnc:implement` offers to stop. Stopping writes a handoff through `/msnc:handoff` and shows the state line ("Ticket 6 of 11 done: … Next: …").
- **Failure reports:** every failure is reported as cause, fix, and prevention. Prevention is a recipe change proposed through `/msnc:refine`, or a recipe note. No blame wording.

**Context:**
- Spec section "Human pacing".
- Ticket 11 (refine and notes), ticket 06 (handoff).

**Blocked by:** 05, 06, 11

**Status:** ready-for-agent

- [ ] With `pace` 2 and a 3-ticket fixture, implement offers a stop after ticket 2, and choosing stop writes a handoff.
- [ ] A forced failing check produces a report with cause, fix and prevention, and no blame wording.
- [ ] `pace` shows as a `/config` row.
