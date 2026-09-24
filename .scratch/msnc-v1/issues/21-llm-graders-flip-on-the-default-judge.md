# 21: Two llm graders fail good replies on the default judge

**Why:** User story 30. An eval that fails a correct reply can't guard a release, and people learn to ignore a red suite.

**What to build:** Make `small-fix-goes-straight-to-edit` and `record-drafts-without-writing` pass on the default judge, without making their rubrics easier to pass. Either:
- rewrite each rubric so it only asks about what the judge can see (the final message), and move the process checks ("fixed directly, no plan or tickets first", "src/greet.js changed") to free `tool_used`/`regex` graders; or
- pin a stronger judge where the rubric needs judgment, and note in `evals/RESULTS.md` and the README how to run the suite (`--judge-model sonnet`).

Then re-run both cases 3 times and record the results.

**Context:**
- `evals/RESULTS.md`, 2026-09-23 (claude-opus-5-5):
  - `small-fix-goes-straight-to-edit`: 0.50 (0 of 3) with the default haiku judge, 1.00 (3 of 3) with `--judge-model sonnet`.
  - `record-drafts-without-writing`: 0.83 (2 of 3) with haiku, 1.00 (3 of 3) with sonnet.
- small-fix: every haiku-failed reply was correct. For example: "`greet` in `src/greet.js:1` now returns `Hello, ${name}!` … I haven't run it because I don't have a shell here." The rubric also asks about process ("without first writing a plan"), which a `last_message` judge can't see.
- record run 1: the haiku-failed draft had frontmatter with `disable-model-invocation: true`, Why, When to use, numbered steps with `## [<version>] - <YYYY-MM-DD>`, a done-check, and "Save it to `.claude/skills/cut-release/SKILL.md`? (yes / personal / edit / no)". That's everything the rubric asks for.
- The docs' advice for this pattern (a correct answer scored low): suspect the judge first, re-run with `--judge-model sonnet`, and tighten the rubric.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] Both cases score 1.00 over 3 runs with the judge the suite documents, with no criterion removed.
- [ ] Any judge override is written down next to the run command in `evals/RESULTS.md`.
