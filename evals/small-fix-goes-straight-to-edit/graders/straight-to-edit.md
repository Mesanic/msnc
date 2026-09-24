---
type: llm
weight: 2
---

Claude was asked to fix a typo ("Helo" instead of "Hello") in `greet`. Judge only what this final response says; tool calls and files are checked elsewhere.
PASS if the response reports the typo fixed in `src/greet.js` (or in `greet`), and either shows the result of a check Claude ran (such as `npm test` or `node --test` output) or gives a reason it couldn't run one (for example, no shell or no Bash tool in this session). A one-line size note (such as "Small") is fine. A command for the user to run is fine alongside the result or the reason, not instead of it.
FAIL if the response says no check was run without giving a reason, asks the user a question instead of reporting the fix, proposes a plan, tickets, a spec or a grill before fixing, or says `src/greet.js` was left unchanged.
