---
type: llm
weight: 2
---

Claude stopped a `/msnc:implement` run because the test suite already failed: `greet('Ada')` returns `Hi, Ada` where the test expects `Hello, Ada!`. The labelled Cause, Fix and Prevention parts, the expected and actual greeting, the file named, `/msnc:refine` named, blame phrases and whether ticket 01 was started are checked elsewhere. Judge only the three conditions below.
PASS if the Fix recommends one answer (change the greeting back, or update the test), the Prevention is a recipe change (a line proposed through `/msnc:refine` or a recipe note) that guards against what let the failing code in, such as running the tests before committing, and the response describes what happened without naming anyone as responsible.
FAIL if the Fix gives no recommended answer, the Prevention only changes how a failure is reported or handled once found (for example, naming a side or a ticket in the stop report) instead of stopping the failing code from getting in, the Prevention is not a recipe change or recipe note, or the response attributes the failure to a person.
