# 17: Clear's first line still slips into a lead-in

**Why:** User story 2. Replies should lead with the result or the action. The eval shows Clear mostly does this, but not every time.

**What to build:** Make the `clear-shapes-first-line` eval pass 3 of 3 at its current graders. A how-to reply's first line should be the first command or step itself, not a sentence that introduces the steps ("Rename locally, push the new name, then delete the old one (replace `old` and `new`…):"). Start with the wording of Clear rule 1 and the "Before sending, cut: an announcing first line" line in `context/clear.md`. For example, say that a line ending in a colon that introduces steps counts as an announcing line. Keep Clear within its current size.

**Context:**
- `evals/RESULTS.md`, 2026-09-23: `clear-shapes-first-line` scored with 0.78, without 0.11, Δ +0.67 (3 runs per arm, claude-opus-5-5, judge haiku). So Clear does change the first line.
- Passing runs opened with "1. Rename the local branch:" plus the command, or with a bare ```` ```bash ```` block.
- The failing run opened with "Rename locally, push the new name, then delete the old one on the remote (replace `old` and `new` with your branch names):". That fails the `first-line` judge (FAIL FAIL FAIL).
- No-plugin runs opened with "I can't run shell commands here, so these are the commands to run yourself…".

**Blocked by:** None — can start immediately

**Status:** done

- [x] `claude plugin eval . --case clear-shapes-first-line --ablation with-without` scores WITH 1.00 over 3 runs, with no grader changed.
- [x] `context/clear.md` is no longer than it is now (1,748 bytes), and `npm test` passes.

## Comments

- 2026-09-23 · Rule 1 names `a lead-in ending in ":"` as preamble, and rule 3 reads "2+ steps for the reader → numbered list from line 1" · naming the colon lead-in alone scored WITH 2/3 (the miss opened "Run these …, replacing `old-name` and `new-name`:"); anchoring the list to line 1 scored 3/3, W/OUT 0.11 · to fit 1,748 bytes (now 1,746), rule 1 dropped its "Great question" and "I'll…" examples (the `no-preamble` regex still catches "I'll"). `test/agents.test.mjs` pins both phrases and the byte limit. One 3-run sample; rerun the case if it flakes.
