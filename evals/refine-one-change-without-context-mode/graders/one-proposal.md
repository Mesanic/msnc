---
type: llm
weight: 2
---

PASS if the final response proposes exactly one change to `.claude/skills/release/SKILL.md`, shown as a diff, that adds running `npm test` before tagging (or fixes the changelog step), quotes at least one of the user's corrections word for word, says when it happened (a timestamp or "this session"), and asks for a yes before applying.
FAIL if it proposes two or more changes at once, shows no diff, gives no quoted evidence, or says the file was already changed.
