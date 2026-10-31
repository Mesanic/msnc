# Build

1. **Record the launch recipe once.** Do this step when the app has a UI or a server and no `.claude/skills/run-*/` exists.
   - Run the bundled `/run-skill-generator`. After that, `/run`, `/verify` and Exercise can start the app without new work.
   - Log it with `S decide build.recipe …`.
2. **Build.**
   - **Small:** make the change here, with `msnc:trim` loaded.
   - **Medium or large:** work the feature's tickets as `${CLAUDE_SKILL_DIR}/../implement/SKILL.md` shows. Read that file, but do not invoke it.
     - Always use `pace 0`, whatever `/config` says. Never offer a stop or write a handoff between tickets. The Stop hook sends you back to work.
     - Give each ticket its own `msnc:implementer`, however small the ticket is. Building tickets here is for small runs only. `S phase exercise` refuses it on medium and large runs.
     - Skip its stops for questions that `rules/decide.md` lets you decide. Skip its branch step, because `S init` made the branch.
     - Skip its section 4. Verify replaces it.
     - Add this text to every implementer brief: "Tests: `${CLAUDE_SKILL_DIR}/rules/tests.md` decides which behaviors get a test. On that point it overrides the preloaded tdd skill. Work test-first only for behaviors that meet its three conditions. Prove the rest with the typecheck or a journey. Do not edit existing tests. Report any that look wrong. To try the app, start it only with `node \"${CLAUDE_SKILL_DIR}/scripts/ship.mjs\" app start <port> -- \"<start command>\"`. Stop it with `… app stop` before you report. Never start a server in a different way (no `&`, no `nohup`)."
3. **Run `S check` after every ticket.** If it fails, use the one retry of the implement loop. Then obey rule 6 (caps) in SKILL.md.
4. **Hand off.** When all tickets have the status done and `S check` is green, run `S phase exercise`. If there are no journeys, run `S phase verify`.
