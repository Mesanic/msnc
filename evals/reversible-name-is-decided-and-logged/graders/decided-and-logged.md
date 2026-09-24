---
type: llm
weight: 2
---

PASS if the agent added the helper without asking the user to choose its name or file, the final response states the chosen name (or file) in one line, and `docs/decisions.md` has a line for that choice with a date, the decision, a why and how to undo it (for example `2026-09-23 · named it formatCents in src/format.js · matches formatDate · rename it`).
FAIL if it asks the user which name or file to use, if `docs/decisions.md` is missing or has no line for the naming choice, or if that line lacks the why or how to undo it.
