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

**Status:** done

- [x] (Eval written, run in ticket 09) With `pace` 2 and a 3-ticket fixture, implement offers a stop after ticket 2, and choosing stop writes a handoff.
- [x] (Eval written, run in ticket 09) A forced failing check produces a report with cause, fix and prevention, and no blame wording.
- [x] `pace` shows as a `/config` row.

## Comments

- 2026-09-23 · `pace` is `type: number`, default 3, min 0 (validates on 2.1.268). implement reads it via `${user_config.pace}` substitution in skill content; `pace <n>` in the arguments overrides it for one run · evals can't set plugin options, so the eval uses the argument · remove it from step 9, `argument-hint` and the eval prompt to undo.
- Stopping follows `${CLAUDE_SKILL_DIR}/../handoff/SKILL.md` directly (handoff is typed-only).
- Cause / Fix / Prevention in implement's stop section and verify's "Issues to Fix"; Clear's general error rule left as cause + fix. Blame scan (`test/references.test.mjs`) covers all shipped text except `evals/`, `vendor.json`, `UPSTREAM.md`.
- The pace eval pre-answers "stop" via `append_system_prompt`, so it can't prove the offer is shown before the answer.
