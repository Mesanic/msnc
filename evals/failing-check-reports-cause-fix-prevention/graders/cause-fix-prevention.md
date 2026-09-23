---
type: llm
weight: 2
---

PASS if the final response stops before any ticket work and reports the failing test in three labelled parts: a cause (the `greet says hello` test fails because `greet('Ada')` returns `Hi, Ada` where `Hello, Ada!` is expected, naming `src/greet.js` or `test/greet.test.js`), a fix (change the greeting back, or update the test, with a recommended answer), and a prevention that is a recipe change: a line proposed through `/msnc:refine` or a recipe note, such as running the tests before committing. It describes what happened without naming anyone as responsible.
FAIL if any of the three parts is missing, the prevention is not a recipe change or recipe note, it starts implementing ticket 01, or it attributes the failure to a person.
