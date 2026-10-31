# Exercise: use it as the user does

A product works when a person can use it. Prove that, at a low cost.

## Pick the driver

Run `S driver` first. It finds the cheapest installed driver, logs it as `build.driver`, and tells where axe-core is. If it finds none, go down the table. Log your choice with `S decide build.driver …`.

| Surface | Driver, in order of preference |
|---|---|
| web | 1. A CLI driver already on PATH: `playwright-cli` (snapshots stay on disk, act on refs) or `agent-browser` (`snapshot -i`, refs, `errors`).<br>2. The Playwright library already installed (Node or Python): write each journey directly as its replay script, with role or text locators, asserts for each `expect`, and listeners for console errors and failed requests.<br>3. `npx -y @playwright/cli`.<br>4. The Desktop Browser pane, or Claude in Chrome with `read_page filter: interactive`. |
| desktop | Electron or a webview → the Electron support of Playwright. A native app → computer use, with screenshots only at checkpoints. |
| cli / api | The real binary, or `curl` against the running server. The bundled `/verify` covers build and run. |

## Run the journeys

On medium and large runs, never walk the journeys yourself. You built the app, so you test what you meant, not what is there. In live tests, the independent exerciser found a bug that the builder missed: blank todos. Small runs can walk them directly.

Use one fresh `msnc:exerciser` worker per round, in the foreground. Use the Agent tool with `run_in_background: false`, and wait for its report. Do not poll for its files. It did not see the build, so its test is honest. Its brief lists the journey ids, the run recipe, the driver and the base URL. It does these steps:

1. **Start the app** with `S app start <port> -- "<start command from the run recipe>"`. S waits until the port answers, and logs to `.ship/logs/app.log`. Stop the app with `S app stop` before the report. Never start or stop a server in a different way.
2. **Walk each journey.**
   - Take a snapshot of the interactive elements only. Act on refs. Compare each `expect` with the snapshot text.
   - After every step, read the console errors and the failed network requests.
   - Take screenshots at half scale. Take them only of the end state of each journey and of one 390 px view.
3. **Save a replay.** Write the steps that worked to `.ship/journeys/<id>.sh`, as plain driver commands that exit non-zero on failure.
   - A replay takes the base URL from `$BASE`. It must pass against one fresh server on any port. `S replay` runs each replay that way.
   - A journey about the launch itself (a port, an environment variable, a flag) starts its server inside its replay. Use a free port, and stop the server on exit.
   - No other replay starts or stops a server.
   - To try one replay, run `S replay --only <id>`. Never run a replay file directly. Only S stops all that a replay starts.
4. **Scan accessibility.** Scan each different page once with axe-core, through the driver.
   - Inject `axe.min.js`. If axe-core is not installed, run `npm i --prefix .ship/tools axe-core`.
   - Write the raw `axe.run()` result to `.ship/evidence/a11y-<page>.json`.
   - For a web UI, `S phase verify` and `S done` refuse while a scan is missing. They also refuse while a scan shows a serious or critical violation, old ones included.
   - Report those violations as major findings. If axe does not load, report that. The run then ends with `S block`.
5. **Examine the UX** against the checklist below.
   - Give each finding evidence and a severity. Evidence is a ref, a screenshot path or a console line.
   - Only blocker and major findings become fix tickets. Minor findings go into the finish report.
6. **Report** in 25 lines or fewer: pass or fail for each journey with the evidence path, then the findings.

## Then you

1. Run `S journey pass <id> "<evidence>"` or `S journey fail <id> "<what broke>"`. The report is the evidence. Do not open its screenshots yourself.
2. Write a fix ticket for each failure and each serious or critical axe violation. Go back to Build.
3. After the fixes, run again only the replays of the failed journeys, and scan the fixed pages again. Run `S replay` once before Verify.
4. **Keep earned tests.** When a journey failed once and now passes, make it a permanent end-to-end test. Build a Playwright spec from its replay. A real failure earned this regression test.

## UX checklist (Nielsen's heuristics, short form)

- The status is visible after every action.
- The app uses the user's words, not internal terms.
- Destructive actions have undo or cancel.
- Controls are consistent.
- The app validates input before submit.
- The app shows choices, so the user does not have to remember them.
- Everything works by keyboard.
- The main path has no clutter.
- Error messages tell what happened and what to do next.
- Empty states point to the next step.
