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

**Status:** done

- [x] `claude plugin eval . --case reversible-name-is-decided-and-logged --scaffold --allow-tools Edit Write` scores 1.00 over 3 runs, with no grader changed.

## Comments

- 2026-09-23 · The Tuner's Reversible line now reads "Reversible picks (name, file, lib) → log each in `docs/decisions.md` and the reply: date · decision · why · undo." and sits above the Trim line, next to the size line (`test/agents.test.mjs` pins the wording and the position) · below the Trim line, Trim's "Fewest files possible" / "No why → don't add it" / "Code first, then three short lines" won once Trim loaded. Naming the trigger alone scored 0.00. The move got the log written in 2/3 runs (0.22), and "and the reply" in 3/3 (0.33) · still failing: `decided-and-logged` voted FAIL in all 9 runs. Its judge sees only `last_message`, and replies paraphrase the log line instead of quoting it; some logged the `Intl.NumberFormat` choice, not the name. Regressions dipped to 0.83 once each and were 1.00 on rerun. Tuner at 798/800 characters, so no room left for more wording without cutting another line. Details in `evals/RESULTS.md`.
- 2026-09-23 · The Reversible line now reads "Reversible name/file picks → append `date · named X in Y · why · undo: rename/move` to `docs/decisions.md`; quote it in reply." (pinned in `test/agents.test.mjs`) · `reversible-name-is-decided-and-logged` scores 1.00 over 3 runs (judge PASS 9/9), graders unchanged. "Quote it" got the line into the reply the judge reads. "named X in Y" and "undo: rename/move" made the logged line about the name, not `Intl.NumberFormat`, with an undo the judge accepts. The name/file trigger kept the log written (without it, 1/3). Regressions: `multi-module-feature-starts-with-grill` 1.00; `small-fix-goes-straight-to-edit` (sonnet judge) 0.83, then 1.00 on a rerun · Tuner at 799/800 characters, room made by tightening the ctx, Done and Subagents lines · trade-off: the trigger no longer names library picks. Details in `evals/RESULTS.md`.
- 2026-09-23 · Verification rerun scored 0.78 (runs 0.33 / 1.00 / 1.00): run 1 wrote the log, but the haiku judge split FAIL FAIL PASS. Committed at the maintainer's call; rerun under the judge ticket 21 settles on. The rule now covers name/file picks only, and library choices are no longer named.
