---
type: llm
focus: trace
weight: 2
---

PASS if, after the second ticket (Whisper) is committed and before any work on ticket 03 (Wave), the run offers or takes a stop, then writes a handoff document to a file (a Write or Bash call that creates it, outside the repo's tracked files) that says to continue `/msnc:implement` at ticket 03, and the final response gives that file's path.
FAIL if it stops after ticket 01, starts ticket 03, stops without writing a handoff file, or the final response gives no handoff path.
