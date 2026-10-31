# Writing style for /msnc:ship instructions

For authors only. The skill never loads this file, so it costs no tokens at run time. `ship.test.mjs` enforces the checkable rules on every instruction file: `SKILL.md`, `phases/*.md`, `rules/*.md` and the three agents.

## ASD-STE100, applied

- Write one instruction per sentence, as a command: "Run `S check`."
- Keep every sentence to 20 words or fewer. Code spans count as one word.
- Use the active voice. Write "S refuses", not "it is refused".
- Use one word for one meaning, as the glossary below gives it.
- Do not use contractions, "may", "should", "ensure", "via", "e.g.", "i.e." or "etc." Write "can", "must", "make sure", "through", "for example" and "and more".
- Use a vertical list for steps in sequence, and a numbered list when the order matters.
- Give the reason for a rule in a separate sentence, after the rule.

## EARS, for every rule

Each rule follows one EARS pattern (Easy Approach to Requirements Syntax), written as a command:

| Pattern | Form |
|---|---|
| Always | `<Do X>.` |
| Event | `When <trigger>, <do X>.` |
| State | `While <state>, <do X>.` |
| Unwanted case | `If <condition>, <do X>.` |
| Option | `Where <feature exists>, <do X>.` |

Put the trigger first, so the reader can skip rules that do not apply.

## Fixed shapes

- **S output:** `ship: <result>` on one line, or `<command>: <result>`, then at most 8 lines of detail.
- **Subagent reports:** the exact template in each agent file, with no preamble. The orchestrator reads only what the template asks for.

## Glossary

| Term | Meaning only this |
|---|---|
| run | One `/msnc:ship` goal, from `S init` to `S done` or `S block`. Also: execute a command. |
| phase | One of research, define, build, exercise, verify, finish. Capitalized when it names the phase: Build. |
| size | small, medium or large, set with `S size`. |
| feature | MSNC's unit in the tracker: `.scratch/<slug>/`, with a spec and tickets. |
| spec | The feature's spec file, or `.ship/spec.md` on small runs. |
| ticket | One file in `.scratch/<slug>/issues/`. One `msnc:implementer` builds it. |
| journey | One entry in `.ship/journeys.json`: what a user does to decide that it works. |
| replay | `.ship/journeys/<id>.sh`: a journey as a script that exits non-zero on failure. |
| check | Only `S check`: the repo's typecheck, lint, build and tests. For anything else, write "make sure". |
| probe | Only `S probe`: break one spot, run one test, restore the file. |
| gate | A condition that `S phase` or `S done` enforces in code. |
| decide | Log a reversible choice with `S decide`. |
| ask | Queue a one-way-door question with `S ask`. |
| block | Stop the run with `S block`, because only questions or an outside dependency remain. |
| one-way door | A step that is hard to undo. `rules/decide.md` lists them. |
| worker | A subagent: researcher, respondent, exerciser, reviewer or implementer. |
| evidence | A file path, a ref or an output line that proves a result. |
