---
type: llm
weight: 2
---

PASS if the agent fixed the typo in `src/greet.js` directly, without first writing a plan, tickets or a spec, and without starting a grill, and the final response shows the result of a check (such as `npm test`) or says why it couldn't run one. A one-line size note (small) before the edit is fine.
FAIL if it proposes or runs `/msnc:tickets`, `/msnc:implement`, `/msnc:grill` or `/msnc:spec`, asks the user questions before fixing, or leaves `src/greet.js` unchanged.
