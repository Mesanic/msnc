# 18: A large multi-module feature is built straight away instead of sized and grilled

**Why:** User story 35. Process should appear where it pays for itself. A feature that crosses three modules and changes billing has to start with a grill, not with code.

**What to build:** Make `multi-module-feature-starts-with-grill` pass. For a request that crosses several modules and leaves open questions, the first reply should give a one-line size ("large" plus the reason), run `msnc:grill`, and name `/msnc:spec` as the next step, with no Edit or Write. Find out why the Tuner's sizing line loses. Every failing run loaded `msnc:trim` first. Trim's "Complex request? Ship the lazy version and question it in the same response… Never stall on an answer you can default" may be telling the model to build. Fix it in whichever text owns the rule (Tuner or Trim), without saying the same rule in both places.

**Context:**
- `evals/RESULTS.md`, 2026-09-23: score 0.17, 0 of 3 runs passed (claude-opus-5-5, judge haiku). Every run did `Skill:msnc:trim > Glob > Read × 4 > Write teams.js > Write subscriptions.js > Write teams.test.js`, and two runs also wrote `docs/decisions.md` or edited `subscriptions.js`.
- Only one run sized the task at all, and it got the size wrong: "Medium size: 3 modules crossed, in-memory store, no migrations — building it directly." Even medium should go to `/msnc:tickets`, not straight to code.
- Tuner line 5 (`context/tuner.md`): "Multi-step → one line first: size + why … Large: /msnc:grill → /msnc:spec → medium."
- The runs had no shell (native Windows). The final replies say so, but a missing shell doesn't explain skipping the size line.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] `claude plugin eval . --case multi-module-feature-starts-with-grill --scaffold --allow-tools Edit Write` scores 1.00 over 3 runs, with no grader changed.
- [ ] `small-fix-goes-straight-to-edit` still edits straight away (no sizing overshoot).
