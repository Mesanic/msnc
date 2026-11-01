# Define

Turn the goal into a contract: what will exist, and how a user can tell that it works. Write the contract before the code.

This phase is MSNC's grill → spec → tickets cycle. It uses MSNC's tracker, so `/msnc:implement` and the user see the same files.

0. **Pick up.** Run `S intake`. It lists the features in MSNC's tracker and how far each one got.
   - When a feature matches the goal, run `S feature <slug>`. Skip each step that it already did. A spec skips steps 1–2. Tickets skip step 5. Always write the journeys (steps 3–4).
   - When no feature matches, run `S feature <slug>` with a new slug from the goal.
   - Log it: `S decide intake.pickup "<slug> from <step>" "<what exists>" "S feature <other>"`.
1. **Grill.** Walk the design tree, one frontier at a time, as `${CLAUDE_SKILL_DIR}/../grill/SKILL.md` shows. Read that file, but do not invoke it. Decisions in `docs/decisions.md` or earlier in this conversation are final. Grill only the frontier that they leave open.
   - **Normal run:** an `msnc:respondent` answers the grill for the user. It never sees your recommendations. Do these steps for each round:
     1. Find the facts that the frontier needs.
     2. Write the frontier to `.ship/grill/round-<n>.md` in the grill skill's format, without the `➡️` lines.
     3. Write your recommended answers to `.ship/grill/round-<n>.rec.md`. Do this before you start the respondent.
     4. Start one `msnc:respondent` in the foreground. Give it the round file, the goal and the paths of the source documents.
     5. Take each answer as the decision: `S decide define.<topic> "<answer>" "<its reason>" "<undo>" --by respondent --rec "<your recommendation>"`.
     6. When it answers `fact`, find the fact and put the question in the next round. When it answers `user`, run `S ask` with its recommendation.
   - Send one-way doors to `S ask` yourself. Never give them to the respondent. If a reversible stand-in exists, continue with it.
   - Use 4 rounds or fewer. Then decide the rest yourself, and log them without `--by`.
   - If the frontier is empty at the start, log `S decide define.grill "none open" "<why>" "grill again"`. Without a respondent or this line, `S phase build` refuses.
   - **Grill mode** (`S status` shows `grilling`): ask the user each round, in the grill skill's format. End your turn to wait. Log each answer with `S decide define.<topic> … --by user`. You still find the facts yourself. When the frontier is empty and the user agrees, run `S go`. After that, decide everything yourself.
2. **Spec.** Write the spec as `${CLAUDE_SKILL_DIR}/../spec/SKILL.md` shows. Read that file, but do not invoke it. Put the spec in `.scratch/<slug>/spec.md`, or where `docs/agents/issue-tracker.md` says.
   - Decide the test seams yourself, without the user's check-in. Use 3 or fewer, at the highest public interface. Log `S decide define.seams …`.
   - Write a user story only for what the goal asks. Write one story per behavior that a user can do or see.
   - Each story needs a journey or a test that can prove it. Put extra hardening under Out of Scope, not into a story. The reviewer holds the code to every story.
   - A GitHub tracker sends data off the machine (`rules/decide.md`). If the goal did not ask to publish, write the spec and tickets to `.scratch/<slug>/` as the stand-in. Then `S ask` about publishing them.
   - Commit the spec: `docs: spec <slug>`.
3. **Write `.ship/journeys.json`.** Write 3–7 journeys: the things that a real user does to decide that it works.

   ```json
   [{"id":"j1","story":1,"persona":"first-time user","goal":"add a habit and tick it off",
     "steps":["open /","add habit 'Read'","tick today"],
     "expect":["'Read' is listed","today shows ticked","still ticked after reload"],"surface":"web"}]
   ```

   - Set `surface` to web, desktop, cli or api.
   - Give each story one journey or more. If using the app cannot prove a story, name the test that proves it in the spec.
   - Small work without a UI can have zero journeys. Then the proof is `S check` plus the bundled `/verify`.
4. **Lock them.** Run `S lock`. After that, journeys change only through `S journey pass|fail`. If a journey contradicts the goal, run `S ask`. Never edit it.
5. **Tickets.** Do this step for medium and large runs only.
   - Cut them as `${CLAUDE_SKILL_DIR}/../tickets/SKILL.md` shows. Read that file, but do not invoke it. Use the same tracker as the spec.
   - Cut the fewest slices that you can each demo. Each ticket costs a worker and a commit cycle.
   - Skip its quiz step. Examine the breakdown yourself. Each slice must work alone, each blocker must truly block, and each slice must fit one context.
   - Log the breakdown: `S decide plan.tickets "<n tickets>" "<why this cut>" "re-cut"`.
   - When the tickets skill marks a ticket `ready-for-human`, send it to the user with `S ask`, and name its file. `S done` looks for it.
   - Each ticket names the journeys that it moves forward. It also names its proof: a journey, a test at a seam, or the typecheck.
   - Commit them: `docs: tickets <slug>`. `S phase build` refuses until you commit the spec and the tickets.
