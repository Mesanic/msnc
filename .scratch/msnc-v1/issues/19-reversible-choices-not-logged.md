# 19: Reversible choices are made but never logged to docs/decisions.md

**Why:** User story 36. Reversible choices should be made and logged with their why, so nothing is silently guessed. Right now the choice is made, but it's never logged.

**What to build:** Make `reversible-name-is-decided-and-logged` pass. When the agent picks a name or a file for new code without asking, the reply states the choice in one line and appends `date · decision · why · undo` to `docs/decisions.md`, creating the file if needed. Find out why the Tuner's Decide line is skipped. Every run loaded `msnc:trim` first, and Trim's "Fewest files possible" and "no scaffolding" may win over creating a log file. Make the rule hold without repeating it in two places.

**Context:**
- `evals/RESULTS.md`, 2026-09-23: score 0.00, 0 of 3 runs passed (claude-opus-5-5, judge haiku). `log-exists` failed in every run ("docs/decisions.md missing"), and `decided-and-logged` failed FAIL FAIL FAIL.
- Tool path in every run: `Skill:msnc:trim > Glob > Read format.js > Read strings.js > Read package.json > Edit format.js` (one run also wrote `format.test.js`). No Write to `docs/`.
- The replies did decide without asking ("I added `formatCents(1999)` … in `src/format.js:4`"), but none said why that name or file, and none logged it.
- Tuner line 6 (`context/tuner.md`): "Reversible → decide, say it in one line, log to `docs/decisions.md`: date · decision · why · undo."
- The same model did write `docs/decisions.md` twice in `multi-module-feature-starts-with-grill`, so the rule can fire.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] `claude plugin eval . --case reversible-name-is-decided-and-logged --scaffold --allow-tools Edit Write` scores 1.00 over 3 runs, with no grader changed.
