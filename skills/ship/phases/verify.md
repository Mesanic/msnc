# Verify: a different reader decides that it is done

1. **Docs first.** Write and commit the user docs that the change needs, such as README usage and the run command. After this step, an edit outside `docs/decisions.md` and `docs/solutions/` cancels the check, the replays and the review.
2. **Checks green.** `S check` passes. Where the repo has `.scope/`, `node "${CLAUDE_SKILL_DIR}/../scope/scripts/scope.mjs" check` passes too.
3. **Probe each new test.** Do this for every test that this run added.
   - Run `S probe <source file> "<exact text>" "<broken text>" -- "<command that runs only that test>"`. It first runs the test on the unbroken code. It always restores the file.
   - The break must change the behavior that the test guards. Flip a condition, move a boundary by one, or remove a call.
   - SURVIVED means a weak test, not dead code. Make the test stronger with an input that the broken code gets wrong. Probe again until the probe shows KILLED. If your fix moved the code, probe the same behavior with `--for <n>`.
   - If no such input exists, delete the test. Log `S decide test.<name> "deleted #<n> <file>" …`, where `<n>` is the probe number that `S probe` showed.
   - `S diff` and `S done` refuse while a survivor has neither result.
   - Never delete or change source code because a probe survived. Code that looks unreachable is a question for the reviewer, not a probe result.
4. **Replays green.** Run `S replay -- "<start command from the run recipe>"`. It starts the app fresh on a free port, runs each `.ship/journeys/*.sh` with `BASE` set, and stops the app.
   - `S done` needs a green replay on the current code.
   - A failing replay is a failing journey. Write a fix ticket. Do not run it by hand on a different server.
5. **Fresh review.** Run `S diff`. It writes the full change since the base commit to `.ship/review.diff`, and shows the path of the spec.
   - Small runs have no spec. First write the goal and its acceptance, in 3–5 lines, to `.ship/spec.md`.
   - Then run one fresh `msnc:reviewer` worker in the foreground (`run_in_background: false`).
   - Give it only the spec, `.ship/review.diff`, the output of `S status`, and the journey evidence paths.
6. **Act on correctness only.** Act on correctness bugs, unmet stories and test-integrity flags. Each one names a story or a regression from the base commit.
   - Ignore style and speculative findings. Reviewers always report something, also when the work is good.
   - Record the verdict: `S review pass "No findings"` or `S review fail "<n findings>"`.
   - Items that the reviewer lists as beyond the spec do not fail the review. Add `--defer "<item>"` to the pass for each item.
7. **Loop.** Each finding becomes a fix ticket. Go to Build, then come back here. `S review` counts the failed rounds. After 3 fix rounds, the next failed review blocks the run.
8. **Log and leave.** Run `S decide verify.next finish "<gate evidence>" "S phase build"`, then `S phase finish`.
