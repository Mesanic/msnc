# Tests worth writing

Write a test only when all three conditions are true:

1. **It guards something real:** a user-visible behavior from the spec, a named risk, or a bug that occurred. Named risks are money, data loss, security, dates and time zones, and parsing.
2. **No cheaper proof exists.** Cheaper proofs are types, a lint rule, a journey, or an existing test.
3. **It uses an agreed seam.** Use one of the seams in the spec, and test through the public interface, never internals.

Do not test framework or library code, getters, config, UI layout or UI text, or one-off scripts. Exercise covers layout and text.

## How to write it

- Write one test per behavior, and one test or fewer per acceptance criterion.
- Take expected values from the spec, the docs or an example that you work out by hand. Never take them from the output of the code.
- Mock only at process edges: network, clock, randomness and paid APIs. If a test needs two mocks, test one level higher.
- For parsers, serializers, math and invariants, write one property test (round-trip, idempotence, order). Do not write many examples.

## What a failing test means

- **A new test fails.** It possibly found a bug, so fix the code, not the expectation. To change an expectation, run `S decide test.<name>` and cite the spec line that permits it.
- **An existing test looks wrong.** During a run, do not change existing tests. Report it and run `S ask`.
- **A probe survives.** The test is weak. Verify step 3 tells what to do. Never remove the code instead.

## Which check to run first

Run the cheapest first: types, lint, build, a smoke run, journeys, then unit tests.
