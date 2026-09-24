---
type: llm
weight: 2
---

PASS if the final response sizes the task as large in one line with a reason (for example several modules crossed, open questions, or billing changes that are hard to undo), then starts grilling: it runs `/msnc:grill` (or loads the grill skill) and asks its first round of design questions, each with a recommended answer, and it names `/msnc:spec` as the step after the grill, before tickets or code.
FAIL if it changes any file, writes an implementation plan or code, goes straight to `/msnc:tickets` or `/msnc:implement`, or never mentions grilling or a spec.
