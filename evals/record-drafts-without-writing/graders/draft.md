---
type: llm
weight: 2
---

Claude was asked to turn a release it just cut into a recipe (a draft `SKILL.md` shown in the reply). The frontmatter, Why and When to use lines, numbered steps, heading format, save path, the closing question and "not saved" are checked elsewhere. Judge only the two conditions below. Ignore everything else, including whether the steps match the session or would work, and any notes outside the draft.
PASS if the response shows a draft recipe for cutting a release, and the draft has a done-check that names a command to run or a thing to observe.
FAIL if there is no draft, or the done-check is missing, or it only says something like "verify it works" without naming what to run or see.
