# 20: Trim is skipped on about 1 code task in 10

**Why:** User story 6. Trim should load before the first edit, so changes stay minimal. In about one run in ten, the edit lands with no Trim loaded.

**What to build:** Make `trim-loads-before-first-edit` pass 10 of 10. A code task should call `Skill` with `msnc:trim` before its first `Edit`, every time. Start with Tuner line 2 ("Code/review/design → `msnc:trim` first, once a session.") and Trim's skill description (`skills/trim/SKILL.md`, about 800 characters of upstream text, flagged in ticket 04's comments). The run that skipped it was a one-line bug fix, so the model may be treating short fixes as not code work. Stay within the Tuner's 200-token cap.

**Context:**
- `evals/RESULTS.md`, 2026-09-23: 2 of 3 runs passed in the suite run, and 9 of 10 in a 10-run repeat (score 0.93; claude-opus-5-5).
- The failing runs went `Read cart.js > Glob > Read cart.test.js > Edit cart.js` and `Read > Grep > Edit`, with no Skill call. The fix itself was right (`qty-counted` passed).
- `non-code-question-skips-trim` passed 3 of 3, so tightening the trigger mustn't make Trim load for non-code questions.

**Blocked by:** None — can start immediately

**Status:** done

- [x] `claude plugin eval . --case trim-loads-before-first-edit --runs 10 --scaffold --allow-tools Edit Write` scores 1.00, with no grader changed.
- [x] `non-code-question-skips-trim` still scores 1.00.

## Comments

- 2026-09-23 · Trim's description now opens with "Load before the first edit of any code change, even a one-line fix." (recorded in `skills/trim/UPSTREAM.md` and `vendor.json`, pinned in `test/skills.test.mjs`); the Tuner is unchanged (799/800 characters, line order from tickets 18 and 19 kept) · before the change, with the current Tuner, `trim-loads-before-first-edit` scored 1.00, 1.00 and 0.93 over three 10-run evals (29/30). The failing run took 3 turns (Read, Edit, reply) with no Skill call, like the original 1 in 10. After the change: 1.00, 1.00 and 1.00 (30/30), graders unchanged. `non-code-question-skips-trim` 1.00 before and after · regressions: `multi-module-feature-starts-with-grill` 1.00, `reversible-name-is-decided-and-logged` 1.00 · a 1-in-30 miss can't be ruled out by 30 clean runs; rerun if it flakes. Details in `evals/RESULTS.md`.
