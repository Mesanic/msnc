# 26: The failing-check judge splits on replies that look alike

**Why:** User stories 39 and 30. As a user, I want a failure reported as cause, fix and a prevention that stops a repeat, and as the maintainer I want the eval to grade that consistently. Over two WSL2 evals, the judge passed 2 of 6 `failing-check-reports-cause-fix-prevention` replies whose shape is the same, so the case can't tell a good report from a bad one.

**What to build:** Find out what the judge is reacting to, then make the case consistent without making it easier to pass, as ticket 21 did:
- Run the 6 stored replies through haiku by hand with the rubric (the harness stores only votes) to see why runs fail.
- The likely split is the Prevention. `skills/implement/SKILL.md:47` asks for "the recipe change that stops a repeat". The rubric's example is "running the tests before committing". But every reply's Prevention improved the stop report instead ("…name that side in the stop report…"), not what let the drifted commit in. Decide which reading is right. If it's the rubric's, change the skill's Prevention line so runs aim at the cause. If it's the replies', make the rubric say so.
- Move whatever a free grader can check (labelled Cause / Fix / Prevention, `/msnc:refine` named, `src/greet.js` or `test/greet.test.js` named) out of the `llm` rubric, and leave the judge only the judgment. No criterion dropped.

**Context:**
- `evals/RESULTS.md`, "Rerun after Node in the sandbox (ticket 22)", 2026-09-23 (Node reachable, so the suite actually ran): 1/3 (0.67). PASS ×3 on `/tmp/claude-eval-95JJme`, FAIL ×3 on `-uiTL15` and `-at1EO4`. The first WSL2 run (no Node) also went 1/3, with the same kind of split.
- All three replies stopped before ticket 01, made no Agent call and no edit, and had no blame. Each gave `test/greet.test.js:4` expected `'Hello, Ada!'` vs got `'Hi, Ada'`, and the fix "change `src/greet.js:1` to `` `Hello, ${name}!` ``" with a reason. Runs 2 and 3 also named the alternative (update the test and ticket 01). Each gave a Prevention proposed for `/msnc:refine msnc:implement`:
  - PASS: "…name that side in the stop report so the fix is one approval, not a question."
  - FAIL: "When the baseline is red, check whether the failing test agrees with the tickets' expected output, and use that to recommend whether to fix the code or the test."
  - FAIL: "When the baseline fails, check whether a ticket's expected output depends on the failing behaviour, and name that ticket in the stop report."
- Ticket 21 had the same pattern (haiku failing replies that meet the rubric) and fixed it by moving checks to free graders and narrowing the judge.

**Blocked by:** None — can start immediately

**Status:** done

- [x] The cause of the split is written down in `evals/RESULTS.md` (judge reasoning from the by-hand run, and which reading of "prevention" was chosen).
- [x] `failing-check-reports-cause-fix-prevention` scores 1.00 over 3 runs under WSL2 with the default judge, with no criterion removed and no threshold lowered.

## Comments

- 2026-09-23 · Cause: the Prevention. By hand, with the harness's own judge prompt (copied from the 2.1.280 binary) plus a request for reasons, haiku's only FAIL reason on the stored replies was that a Prevention which improves the stop report "improves handling when tests fail, but doesn't prevent tests from failing in the first place". Minor extra noise: the harness counts any vote whose text contains the word "fail" as FAIL, even after PASS. Reading chosen: the rubric's, since a better stop report doesn't stop a repeat. `skills/implement/SKILL.md:47` now aims the Prevention at what let the failure in (such as running the tests before committing), "not a better stop report", pinned in `test/skills.test.mjs`. Free graders took the mechanical parts: `labelled-parts`, `expected-vs-got`, `names-file`, `refine-named`, `no-shout` (plus `no-blame` and `no-ticket-work`, unchanged). The judge keeps only the Fix's recommendation, the Prevention (now explicitly: guards what let the failing code in, not how it's reported) and blame. No criterion dropped, threshold unchanged. WSL2, default judge: 0.96 (a `labelled-parts` regex bug on "**Prevention** (to propose…):", fixed), then 1.00 and 1.00 (`evals/results/2026-09-24T04-15-07-420Z`, `…T04-15-39-322Z`), judge PASS 27/27 across all 9 runs. `npm test` 111/111, `npm run check` 0 failed. Left open: `skills/verify/SKILL.md:123` still has the old Prevention wording, and which recipe should carry the "tests before every commit" guard for hand commits. Details: `evals/RESULTS.md`, "Rerun: failing-check-reports-cause-fix-prevention (ticket 26)".
