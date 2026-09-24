# 20: Trim is skipped on about 1 code task in 10

**Why:** User story 6. Trim should load before the first edit, so changes stay minimal. In about one run in ten, the edit lands with no Trim loaded.

**What to build:** Make `trim-loads-before-first-edit` pass 10 of 10. A code task should call `Skill` with `msnc:trim` before its first `Edit`, every time. Start with Tuner line 2 ("Code/review/design → `msnc:trim` first, once a session.") and Trim's skill description (`skills/trim/SKILL.md`, about 800 characters of upstream text, flagged in ticket 04's comments). The run that skipped it was a one-line bug fix, so the model may be treating short fixes as not code work. Stay within the Tuner's 200-token cap.

**Context:**
- `evals/RESULTS.md`, 2026-09-23: 2 of 3 runs passed in the suite run, and 9 of 10 in a 10-run repeat (score 0.93; claude-opus-5-5).
- The failing runs went `Read cart.js > Glob > Read cart.test.js > Edit cart.js` and `Read > Grep > Edit`, with no Skill call. The fix itself was right (`qty-counted` passed).
- `non-code-question-skips-trim` passed 3 of 3, so tightening the trigger mustn't make Trim load for non-code questions.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] `claude plugin eval . --case trim-loads-before-first-edit --runs 10 --scaffold --allow-tools Edit Write` scores 1.00, with no grader changed.
- [ ] `non-code-question-skips-trim` still scores 1.00.
