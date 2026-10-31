---
name: ship
description: Run a project from goal to shipped without hand-holding. Researches unknowns, defines journeys a user would do, builds ticket by ticket, uses the running app like a user, has a fresh reviewer decide it's done, then reports. Decides reversible choices itself; queues only one-way doors.
argument-hint: "<goal> | grill <goal> | resume | status | pause | answer <n> <text>"
disable-model-invocation: true
model: claude-opus-5-5
---

# Ship

You own `$ARGUMENTS` from start to end. Nobody watches. Continue until every journey passes and the reviewer finds nothing. Stop earlier only when one-way-door questions are all that remain.

`S` is `node "${CLAUDE_SKILL_DIR}/scripts/ship.mjs"`. The run state is in `.ship/`, and only `S` changes it.

- Never edit `state.json` by hand.
- After `S lock`, change journeys only with `S journey`. `S restore` reverses any other edit.

## Start

- When the argument is `status`, run `S status` and `S questions`, then stop.
- When the argument is `pause`, run `S pause`, then stop.
- When the argument is `answer <n> <text>`, run `S answer <n> "<text>"`, then continue as `resume`.
- When the argument is `resume`, run `S adopt ${CLAUDE_SESSION_ID}` and `S status`. Continue in the phase that it shows.
- When the argument is `grill <goal>`, start a new goal with `--grill`. The user answers the grill. Set the size to medium or larger. The run continues alone after `S go`.
- For any other argument, start a new goal:
  - If plan mode is on, stop. This skill edits files.
  - If the folder is not a git repo, run `git init` and make an initial commit. Log this decision.
  - Run `S init --session ${CLAUDE_SESSION_ID} "<goal>"`. It moves you from `main` or `master` to `ship/<slug>`. It also records the base commit and keeps `.ship/` out of git.
  - If `S init` reports MSNC features, run `S intake`. Work that MSNC already specced or ticketed is medium or larger. Continue it from define.md step 0.

## Size, then route

Give the size of the worst factor: files touched, unknowns, irreversible steps, or modules crossed. Also count user-visible behaviors. A behavior is one thing that a user can do or see alone. All examples of one function or one control count as one behavior. Three or more behaviors make the run medium or larger.

Log the size with `S decide intake.size <size> "<why>" "S size <other>"`. Then run `S size <size>`.

| Size | Phases |
|---|---|
| small | build → verify → finish. Skip the reviewer only with no new tests and one journey or fewer. With a UI or a server: first write one journey per story (define.md step 3) and run `S lock`. Then build → exercise → verify → finish. |
| medium | define → build → exercise → verify → finish |
| large, or an unknown that the repo and its docs cannot answer | research, then the medium phases |

Before Define, read `docs/solutions/` if it exists. It holds lessons from earlier runs.

## Phases

Start a phase with `S phase <name>`. Then read only the file of that phase, in `${CLAUDE_SKILL_DIR}/phases/`.

| Phase | File | Leave when |
|---|---|---|
| research | research.md | each question has a sourced answer or a logged decision |
| define | define.md | `S feature` bound the feature, the spec and journeys exist, `S lock` ran, and tickets are committed (medium or large) |
| build | build.md | each ticket is committed and `S check` is green |
| exercise | exercise.md | each journey passes with evidence, and each axe scan of a web UI is clean |
| verify | verify.md | probes are killed, replays are green, and `S review pass` is recorded |
| finish | finish.md | `S done` or `S block` ran and the report is sent |

Going back is normal. When Exercise or Verify finds a failure, write a fix ticket, go back to Build, then come back.

## Rules for every phase

1. **Decide.** Obey `rules/decide.md`. For a two-way door, decide, run `S decide`, and continue. For a one-way door, run `S ask`, then continue with work that it does not block.
2. **Tests.** Before you write a test, read `rules/tests.md`.
3. **Facts.** Find facts yourself, from code, docs, commands or research. Never ask the user for a fact.
4. **Proof.** A gate passes only on command output, journey evidence or the reviewer's verdict. Your own summary is never proof.
5. **Tokens.**
   - Where Scope or `ctx_*` tools exist, use them.
   - Never read a full log. `S check` shows the failing lines and keeps the rest in `.ship/logs/`.
   - Read files by slices. Where `ctx_*` tools exist, context-mode cuts each result over 4 KB to an excerpt. Then read each phase, rule or MSNC skill file in slices of 25 lines, all in one turn. Keep the output of each command under 4 KB.
   - Keep worker reports to 25 lines or fewer.
   - Run one worker at a time, in the foreground: use the Agent tool with `run_in_background: false`. Research is the exception: up to 3 at the same time.
   - If the harness moves a worker to the background, do work that the worker does not touch. Then end your turn. The Stop hook lets this wait through, and the report starts your next turn. Never poll its output file.
   - Give diffs and long briefs as files, not as pasted text.
6. **Caps.**
   - Give the same failing check 3 attempts.
   - Then change one thing: make the scope smaller, or give the step to a fresh worker with only what it needs.
   - Then run `S block "<why>"`.
   - "Not possible as specified, because …" is a valid result. Never make a check weaker, special-case a test input, or edit an existing test to make it pass.
7. **State line.** After each phase, tell the user one line: the output of `S status`.

## Stopping

While the run is `running`, the Stop hook sends you back to work. Stop on purpose only in one of two ways:

- `S done`: every gate passed. If a gate is open, `S done` refuses and names it.
- `S block "<reason>"`: only one-way-door questions or an outside dependency remain.

Then do `phases/finish.md`.
