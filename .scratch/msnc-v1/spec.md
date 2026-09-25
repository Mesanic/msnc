# MSNC v1: More Signal, No Clutter

**Status:** ready-for-agent

## Problem Statement

People who run Claude Code with community add-ons pay for them three ways.

1. **Everything loads every time.** Each add-on puts its rules into every session whether or not the task needs them. On the author's machine that was about 5.1k tokens before any work started, plus about 2.3k per subagent.
2. **Add-ons contradict and repeat each other.** One says "code first, at most three lines", another "action first, numbered steps", a third "file path plus one line". Two restated each other's rules in CLAUDE.md.
3. **The good parts are scattered.** They sit in six projects with different install methods, separate hooks that each start their own process, and no shared on/off switches.

Getting "minimal code, lean context, focused replies, safe edits, one ticket at a time" means hand-assembling a blend that nobody else can install.

## Solution

MSNC is one Claude Code plugin, installed from one marketplace (`Mesanic/msnc`), that delivers the blend as named modules:

| Module | What the user gets | Built on |
|---|---|---|
| Clear | Replies shaped for focus (result first, numbered steps, one next action) in the main session and in subagents. On by default, one switch to opt out | i-have-adhd (ayghri), ponytail's output rule |
| Tuner | A ~150-token always-loaded list that loads only the skill the moment needs | New |
| Trim | Smallest change that works. Loads when code work starts; `/msnc:trim full` forces it for the session, subagents included | ponytail (Dietrich Gebert) |
| Quiet | Raw tool output stays out of the chat when the optional context-mode plugin is installed | context-mode (mksglu), companion only |
| Relay | Grill, spec, tickets, then one ticket per subagent | skills (Matt Pocock), MSNC implement |
| Scope | A code map and a what-breaks check before every edit | Scope (Mesanic) |
| Proof | Nothing counts as done until a check proves it | ECC verification-loop (affaan-m), scope check |
| Calibrate | Setup, health check, token audit, cleanup | ECC context-budget and config-gc (affaan-m) |
| Record | Turns a task that went well into a recipe (a small skill), and turns later corrections into recipe fixes | Principles inspired by ProcessDriven (Layla Pomper); no ProcessDriven material copied |

Only Clear and Tuner are always loaded. Everything else loads on demand. Every borrowed piece keeps its license and names its author.

## User Stories

1. As a new user, I want to install MSNC with two commands, so that I get the whole suite without assembling it.
2. As a new user, I want the focus reply style on by default, so that replies lead with the result or the action.
3. As a user who prefers my usual replies, I want one `/config` switch that turns Clear off in the main session and in subagents, so that I can opt out without uninstalling.
4. As a user, I want the exact message "normal mode" to drop Clear and Trim for the current session only, so that I can read one long explanation my way.
5. As a user, I want rules to load only when a task needs them, so that my sessions start small.
6. As a user starting code work, I want Trim loaded before the first edit, so that changes stay minimal.
7. As a user, I want `/msnc:trim full` to apply Trim to every subagent for the rest of the session and to survive `/compact`, so that delegated work stays minimal.
8. As a user, I want Trim's default level (off, lite, full, ultra) as a `/config` option, so that I choose between on-demand and always-on.
9. As a user, I want Trim's on/off state kept per session, so that one session never switches it off in another.
10. As a user in a repo with a Scope index, I want `scope query` or `locate` used before repo-wide greps, so that searches cost less.
11. As a user, I want an impact check before any edit to a mapped file, so that callers made through variables are not missed.
12. As a user editing CSS or HTML, I want the impact gate to be clearable, so that edits never dead-end.
13. As a user, I want Scope's gate to start only for commands that write files, so that ordinary Bash calls stay fast.
14. As a user, I want `/msnc:scope init` to index a repo without writing hooks or routing blocks into it, so that MSNC's hook and Tuner stay the single source.
15. As a user with context-mode installed, I want big outputs routed through it, except in plan mode, where Read, Grep and Glob avoid approval prompts.
16. As a user, I want `/msnc:grill` to interview me one decision at a time with a recommended answer for each, so that plans settle fast.
17. As a user, I want `/msnc:spec` and `/msnc:tickets` to turn a conversation into a spec and dependency-ordered tickets in a local tracker by default, so that I don't need GitHub Issues.
18. As a user, I want `/msnc:implement` to work tickets one at a time, one fresh subagent per ticket, each verified and committed before the next, so that the code never sits broken.
19. As a user, I want a one-line state after every ticket ("Ticket 3 of 7 done: … Next: …"), so that I always know where things stand.
20. As a user, I want `/msnc:implement` to stop and ask when a check fails after a retry or a ticket needs a decision, so that it never guesses.
21. As a user, I want `/msnc:verify` to run the full pre-PR gate, so that "done" means proven.
22. As a user, I want `/msnc:aside` to answer a side question and resume the task, so that tangents don't derail me.
23. As a user, I want `/msnc:rephrase` to re-explain the last reply more plainly, so that a reply that didn't land gets a second try.
24. As a user, I want `/msnc:handoff` to write a document a new session can resume from, so that stopping mid-task is safe.
25. As a user, I want `/msnc:doctor` to show what is always loaded, duplicate skills, conflicting plugin settings per project, and outdated Scope layouts, so that clutter can't creep back unnoticed.
26. As a user, I want `/msnc:declutter` to clean stale config by moving items to a trash folder and asking per item, so that cleanup is safe.
27. As a user, I want `/msnc:setup` to walk me through the options, the context-mode companion, safe permission rules and tracker setup, so that I start correctly.
28. As an upstream author, I want my license, name and repo credited in every copied folder and in the README, so that reuse is visible and compliant.
29. As the maintainer, I want a sync script that compares every copied piece against its pinned upstream commit, so that upstream fixes reach MSNC deliberately.
30. As the maintainer, I want eval cases proving the routing works, so that a release can't silently break behavior.
31. As a Windows user, I want every hook to be Node-only and to exit fast, so that MSNC works without bash and adds little delay.
32. As a user, I want `/msnc:record` to turn a task that just went well into a recipe with its why, when to use it, steps and a done-check, so that good work becomes repeatable.
33. As a user, I want `/msnc:refine` to propose one recipe fix at a time from my recent corrections, failed checks and rejected approaches, so that the same mistake is fixed once instead of repeated.
34. As a user, I want my own notes for a skill to appear whenever that skill loads, so that I can improve recipes, including MSNC's, without forking anything.
35. As a user, I want a task sized before planning (small: just do it; medium: tickets; large: grill, spec, tickets), so that process only appears where it pays for itself.
36. As a user, I want reversible choices made and logged with their why, and only irreversible ones asked about with a recommended answer, so that I'm interrupted less and nothing is silently guessed.
37. As a user, I want every subagent brief and commit to carry the why, so that delegated work makes better judgment calls and history explains itself.
38. As a user, I want `/msnc:implement` to offer a stopping point every few tickets with an automatic handoff, so that long runs fit my energy.
39. As a user, I want failures reported as cause, fix and the recipe change that prevents a repeat, never as blame, so that mistakes improve the system.

## Implementation Decisions

- **Distribution.** The GitHub repo `Mesanic/msnc` is a plugin marketplace named `msnc` holding one plugin named `msnc`, so commands read `/msnc:<name>`. License MIT. Install: add the marketplace, install `msnc@msnc`, run `/msnc:setup`.
- **One owner per concern.** Clear owns reply shape, Tuner routing, Trim what to build, Quiet tool output, Scope the code map, Relay the workflow, Proof verification, Calibrate upkeep. No rule appears in two places.
- **Always loaded: Clear and Tuner only.** MSNC's hook injects both at session start (sources startup, resume, clear, compact) and at subagent start. Everything else is a skill.
- **Clear is on by default, with opt-out.** A `userConfig` option `clear` (default on) shows as a `/config` row (Claude Code 2.1.269+). The hook reads it from `CLAUDE_PLUGIN_OPTION_CLEAR`. `force-for-plugin` is not used because it blocks opting out. The exact message "normal mode" drops Clear and Trim for the current session.
- **One hook script.** Every MSNC hook event goes to a single Node dispatcher: SessionStart, SubagentStart, UserPromptSubmit and PreToolUse (Scope gate). It exits fast when nothing applies. Per-session state (Trim level, normal mode) is keyed by session id in the plugin's data directory, never in a machine-wide flag.
- **Trim is ponytail, copied in.** ponytail's skill family is copied (MIT) and renamed. Its three hook jobs are rebuilt in the dispatcher: re-add Trim after `/compact` or `/clear` while it's on, push it into subagents while it's on, and the switch itself. The default level is a `userConfig` option `trim_default` (default off, meaning on demand). The caller check becomes "repo has a Scope index → `scope impact`; otherwise grep every caller". `/msnc:trim-debt` harvests `trim:` and legacy `ponytail:` marker comments.
- **Quiet is a companion, not bundled.** context-mode is ELv2 and ~140 MB with native parts, so MSNC never copies it and doesn't declare it as a dependency. Tuner routes to `ctx_*` tools only when they exist, and never in plan mode. `/msnc:setup` offers the install and suggests `ask` rules for `ctx_purge` and `ctx_upgrade`.
- **Scope ships inside the core.** The Scope engine (file graph, symbol graph, all seven grammars) ships in the plugin. Repos keep only their index data. Two fixes land in `Mesanic/msnc-scope` first, then get copied: (1) `impact` on a file known only to the file graph (CSS, HTML) answers from the file graph and records the impact entry, so the gate can clear; (2) `scan` can skip writing its CLAUDE.md routing block. MSNC always scans with no project hook and no routing block. The edit gate runs in the dispatcher with `if` filters so only writing commands start it; `>` redirects are not caught (a miss falls open, as upstream). The grep nudge hook is dropped; Tuner carries that rule.
- **Relay.** grill (grill-me and grilling merged), spec, tickets, tdd and codebase-design are copied from mattpocock/skills. Tracker setup moves into `/msnc:setup`, with the local Markdown tracker as the default. `/msnc:implement` runs one foreground `msnc:implementer` subagent per ticket; the main agent verifies and makes one commit per ticket, and stops on repeated failure or a missing decision. With a Scope index it scans first, runs impact before edits, uses impact's covering tests, adds `scope check` to verification, and rescans after each commit.
- **Agents.** `explorer`: read-only; Scope and Quiet first; never scans. `planner`: loads Trim; scopes with `impact --depth 2`; Read, Grep and Glob in plan mode. `implementer`: one ticket, test-first, typecheck after every change, never commits.
- **Proof.** Tuner carries "done means verified". `/msnc:verify` is ECC's verification loop plus `scope check` when the repo is indexed.
- **Calibrate.** `/msnc:setup`, `/msnc:doctor` (ECC context-budget plus MSNC checks) and `/msnc:declutter` (ECC config-gc).
- **Record.** `/msnc:record` writes a recipe from the current session: a typed-only skill with its why, when to use it, the steps and a done-check, saved to the project's skills (shared through git) or to the user's personal skills. `/msnc:refine` reads recent corrections, failed checks and rejected approaches (context-mode session memory when installed, the transcript otherwise) and proposes one recipe fix at a time. Recipe notes: after any Skill tool call, the dispatcher adds the user's notes for that skill next to the result, so any recipe, MSNC's included, improves without a fork. `/msnc:doctor` reports recipe use: unused recipes are clutter, often-corrected ones are refine candidates.
- **"Just enough" sizing.** Before planning, Tuner has the task sized: small means just do it with Trim and Proof; medium means tickets, then `/msnc:implement`; large means grill, spec, tickets, then implement. The planner agent applies the same sizing. The size-classifier idea comes from ECC's orch-pipeline.
- **Decide to Decide.** A Tuner rule: for reversible choices, pick one, state it in one line and log it with its why in `docs/decisions.md`; for irreversible or destructive choices, ask one question with a recommended answer. `/msnc:grill` offers to accept all its recommendations at once.
- **A why in every delegation.** Tickets carry a Why line linked to a user story. Every implementer brief carries the outcome, the why, the recipe to follow, the done-check and the report format. Commit messages carry the why. Trim asks for the why behind every new file, dependency or abstraction.
- **Human pacing.** `/msnc:implement` offers a stopping point every 3 tickets (a `userConfig` option), writing a handoff when you stop. Failures are reported as cause, fix and the recipe change that prevents a repeat; there is no blame language.
- **Models.** MSNC's agents don't pin a `model` or `effort`, so each user's `CLAUDE_CODE_SUBAGENT_MODEL` default and session effort apply. `/msnc:setup` explains the choice and can set the default for them.
- **ProcessDriven credit.** Record, sizing, Decide to Decide, the why rule and pacing are principles inspired by ProcessDriven by Layla Pomper. ProcessDriven® is a registered trademark. MSNC credits it as "principles inspired by ProcessDriven by Layla Pomper" with a link, paraphrases rather than copies her material, and never implies her endorsement.
- **Invocation.** Model-invoked (short descriptions stay loaded): trim, grill, tdd, codebase-design, scope. Typed-only (zero cost until typed): spec, tickets, implement, aside, rephrase, handoff, verify, doctor, declutter, setup, trim-review, trim-audit, trim-debt, record, refine.
- **Credit and upkeep.** Each copied folder keeps the upstream LICENSE and an UPSTREAM.md (repo, commit, date, local changes). A root third-party notices file carries every upstream license text. A vendor manifest plus a sync script compares copies against pinned upstream commits and never overwrites on its own. The README has a "Built on" section.

## Testing Decisions

- Test behavior at the highest seam: the dispatcher's stdin-to-stdout contract per event (given the event JSON, option env vars and session state, expect this output), not its internals.
- Unit tests use `node:test` only, with no frameworks. Cover: the dispatcher per event; per-session state; message parsing (whole-message match only); Scope gate target detection; and a references test that every `/msnc:<name>`, skill name and README command resolves to something that exists.
- Scope keeps its own tests, plus a new one for the CSS/HTML impact fallback.
- Behavior evals with `claude plugin eval`:
  - Trim loads before the first edit on a code task, and never on a non-code question.
  - Plan mode makes no `ctx_*` calls.
  - An indexed repo runs impact before an edit.
  - `/msnc:implement` on a two-ticket fixture makes two commits in order.
  - Clear on vs off changes the reply's first line.
  - A subagent receives Clear.
- Prior art: Scope's `merge.test.mjs`; the author's subagent-style hook, verified live on 2026-09-23.

## Out of Scope

- Harnesses other than Claude Code (Codex, Cursor, OpenCode and others).
- Bundling context-mode or any ELv2 code.
- The rest of ECC (282 more skills, 68 agents, 94 commands, its hooks and rules) and mattpocock skills not listed above.
- Telemetry, dashboards, hosted services.
- Automatically migrating other people's existing setups.

## Further Notes

- Origin: the 2026-09-23 assessment and hand-built blend on the author's machine (`~/.claude/plans/assess-https-github-com-mattpocock-skill-fizzy-globe.md`).
- Publishing and migrating the author's machine and five repos are human-in-the-loop tickets in `.scratch/msnc-rollout/`.
- MSNC also reads as "Mesanic" with the vowels removed.
