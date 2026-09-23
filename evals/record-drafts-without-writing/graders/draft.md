---
type: llm
weight: 2
---

PASS if the final response shows a draft recipe for cutting a release that has frontmatter with `disable-model-invocation: true`, a Why line, a When to use line, numbered steps (including the changelog heading format `## [x.y.z] - YYYY-MM-DD`) and a done-check that can be run or observed, and then asks the user to confirm before saving it to `.claude/skills/<name>/SKILL.md`.
FAIL if any of those parts is missing, if the steps keep the rejected heading format, or if the response says the recipe was saved.
