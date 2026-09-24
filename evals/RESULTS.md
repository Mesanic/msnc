# Eval results

**Date:** 2026-09-23 · **Claude Code:** 2.1.280 · **Model under test:** `claude-opus-5-5[1m]` (2.1.280's default, not pinned) · **Judge:** haiku (default) unless noted · **Machine:** native Windows 11, Node 26

12 of 16 cases ran, 3 runs each (10 for the Trim repeat). 6 pass at the default threshold of 1.0 and 6 fail, with tickets 17–21. The 4 cases that need a shell can't run on native Windows; ticket 16 runs them.

## Commands

From the repo root, using the Claude Code bundled with the desktop app (`%APPDATA%\Claude\claude-code\2.1.280\claude.exe`). The `claude` on PATH (winget, 2.1.268) says "`plugin eval` is currently in early access". The npm copy (2.1.278) runs evals, but its subagents fail with "Claude Code 2.1.278 does not support this model; version 2.1.280 or newer is required".

```sh
# the suite, minus the shell cases, the Scope gate case and the Clear case
claude plugin eval . --tag decide sizing record trim plan agents --ablation none --scaffold --allow-tools Edit Write --no-publish --trust-plugin --keep-temp -j 4
claude plugin eval . --case indexed-repo-gates-edit-without-impact --ablation none --scaffold --allow-tools Edit Write --no-publish --trust-plugin --keep-temp -j 3
claude plugin eval . --case clear-shapes-first-line --ablation with-without --no-publish --trust-plugin --keep-temp -j 4
# after fixing the deleting-data graders (see "Case fixes")
claude plugin eval . --case deleting-data-asks-one-question --ablation none --scaffold --allow-tools Edit Write --no-publish --trust-plugin --keep-temp -j 4
# repeat for the flaky Trim case
claude plugin eval . --case trim-loads-before-first-edit --runs 10 --ablation none --scaffold --allow-tools Edit Write --no-publish --trust-plugin --keep-temp -j 4
# second opinion on the two llm-graded failures
claude plugin eval . --case small-fix-goes-straight-to-edit --judge-model sonnet --ablation none --scaffold --allow-tools Edit Write --no-publish --trust-plugin --keep-temp -j 4
claude plugin eval . --case record-drafts-without-writing --judge-model sonnet --ablation none --no-publish --trust-plugin --keep-temp -j 4
```

Bash was never granted. On native Windows, a run with a shell grant is refused: "sandbox required but unavailable: … the Windows sandbox is not active on this session (feature gate off)". Cases that list Bash ran without it.

Runtime of the runs above: 239 s wall clock, $5.77 at list price. Pilots and probes add about 4 minutes and $2.

## Results

| Case | Promise | Result | Rate |
|---|---|---|---|
| trim-loads-before-first-edit | Trim loads before the first edit | **fail** | 2/3 (0.78); 9/10 on repeat (0.93) |
| non-code-question-skips-trim | Non-code question never loads Trim | pass | 3/3 |
| plan-mode-reads-without-ctx | Plan mode makes no `ctx_*` calls (nearest form, see below) | pass | 3/3 |
| indexed-repo-runs-impact-before-edit | Indexed repo runs impact before an edit | not run (needs shell) | – |
| indexed-repo-gates-edit-without-impact | Nearest shell-free form: the gate refuses the edit | pass | 3/3 |
| implement-commits-carry-each-why | `/msnc:implement`: two commits, in order | not run (needs shell) | – |
| clear-shapes-first-line | Clear on vs off changes the first line | **fail** | WITH 2/3 (0.78), W/OUT 0.11, Δ +0.67 |
| subagent-receives-clear | A subagent receives Clear | pass | 3/3 |
| deleting-data-asks-one-question | One question before deleting data | pass (after grader fix) | 3/3 |
| failing-check-reports-cause-fix-prevention | Cause, fix, prevention; no blame | not run (needs shell) | – |
| implement-pace-stops-with-handoff | Pace stop writes a handoff | not run (needs shell) | – |
| multi-module-feature-starts-with-grill | Large task starts with grill | **fail** | 0/3 (0.17) |
| record-drafts-without-writing | Record drafts, writes nothing | **fail** | 2/3 (0.83); 3/3 with sonnet judge |
| refine-one-change-without-context-mode | Refine proposes one change | pass | 3/3 |
| reversible-name-is-decided-and-logged | Reversible choice decided and logged | **fail** | 0/3 (0.00) |
| small-fix-goes-straight-to-edit | Small fix goes straight to Edit | **fail** | 0/3 (0.50); 3/3 with sonnet judge |

## Failures

- **trim-loads-before-first-edit** (ticket 20): the failing runs went `Read > Glob > Read > Edit` and `Read > Grep > Edit`, with no `Skill:msnc:trim`. The fix itself was correct every time.
- **clear-shapes-first-line** (ticket 17): one WITH run opened with a lead-in, "Rename locally, push the new name, then delete the old one … (replace `old` and `new` …):". The other two opened with "1. Rename the local branch:" plus the command, or with a bare code block. No-plugin runs opened with "I can't run shell commands here, so …".
- **multi-module-feature-starts-with-grill** (ticket 18): every run loaded Trim, then wrote `teams.js`, `subscriptions.js` and a test. None ran grill. Only one run sized the task, and it called it medium: "Medium size: 3 modules crossed … building it directly."
- **reversible-name-is-decided-and-logged** (ticket 19): `formatCents` was added to `src/format.js` without asking, but `docs/decisions.md` was never written in any run.
- **record-drafts-without-writing** and **small-fix-goes-straight-to-edit** (ticket 21): the haiku judge failed replies that meet the rubric, and the sonnet judge passed all 6. The small-fix rubric also asks about process, which a judge reading only `last_message` can't see.

## Not run: shell cases

`failing-check-reports-cause-fix-prevention`, `implement-commits-carry-each-why` (now with a `commits-in-order` grader for the "two commits, in order" promise), `implement-pace-stops-with-handoff` and `indexed-repo-runs-impact-before-edit` all need Bash for git or `sextant impact`. Ticket 16 runs them under WSL2 or Linux.

## Promises the harness can't express directly

- **Plan mode makes no `ctx_*` calls.** A case can't start a run in plan mode, and context-mode isn't an MCP server the plugin declares, so no `ctx_*` tool exists in any run and the no-ctx check passes trivially. `plan-mode-reads-without-ctx` describes plan mode in `append_system_prompt` and checks the fallback the Tuner prescribes: research through Read/Grep/Glob or `msnc:explorer`, with no Edit or Write.
- **Turning Clear off.** A run's user config is throwaway, and `pluginConfigs["msnc@inline"].options.clear = false` in the workspace's `.claude/settings.json` is ignored: the hook still injected Clear (probed twice, on 2.1.278 and 2.1.280). So the no-plugin baseline arm of `clear-shapes-first-line` stands in for "Clear off", and Δ +0.67 is the change Clear makes. The `clear-off-drops-clear` case written for this was removed.
- **Indexed repo runs impact** needs a shell. `indexed-repo-gates-edit-without-impact` covers the shell-free part: the Edit is refused with Scope's reason, the file is unchanged, and the reply names `impact … src/users.js`.

## Case fixes

- `deleting-data-asks-one-question`: `backups-kept` and `uploads-kept` were `file_exists` graders. `file_exists` only sees files created during the run, so it can never pass on files the scaffold made; all 3 runs "failed" with both files still present. They now check each file's contents with a `regex` on `{ source: file }`, which is the same check (the file is still there). It scored 0.50 before the fix and 1.00 after.
- `clear-shapes-first-line` `first-line` (written in this ticket): the first version was a regex that also failed any first line ending in `:`. That rule scored WITH 0/3, W/OUT 1/3 and 2/3 over two runs. It failed Clear's numbered first step ("1. Rename the branch locally:" with the command below it) and passed a no-plugin preamble ("I can't run commands in this session, so here are the steps…"). It's now an `llm` rubric on the first line, plus a `no-preamble` regex that also catches "I can't…".
- The harness writes a copy of the resumed session (`<session id>.jsonl`) next to each case's `history_file`, and it grows with every run. Input-token counts show runs don't read it, so it's gitignored along with `evals/results/`.

## Live behaviour checked

| Item (from ticket comments) | Verdict | Evidence |
|---|---|---|
| hooks.json exec form (`command` + `args`) loads | confirmed on 2.1.278 and 2.1.280 | every trace has `hook_response` for `SessionStart` with the Tuner and Clear. Not testable on 2.1.268 (no `plugin eval`). |
| Typed `/msnc:trim` reaches UserPromptSubmit as literal text | confirmed | probe prompt `/msnc:trim ultra` → the session state file `plugins/data/msnc-inline/sessions/<id>.json` = `{"trim":"ultra"}` |
| `UserPromptExpansion` field `command_name` | confirmed, namespaced | `/msnc:rephrase …` loaded `.claude/msnc/notes/msnc/rephrase.md` (sentinel word in reply), not `notes/rephrase.md` |
| `skills:` preload with namespaced names (`msnc:trim`) | confirmed | an `msnc:planner` subagent quoted Trim's "ACTIVE EVERY RESPONSE." |
| SubagentStart `hookSpecificOutput` reaches the subagent | confirmed | `subagent-receives-clear` 3/3: the subagent quoted the subagent-only "final report counts as a requested report" line |
| PreToolUse deny from the plugin hook, with its reason shown | confirmed | `indexed-repo-gates-edit-without-impact` 3/3 |
| `${user_config.pace}` substitution | **refuted in an eval run** | `/msnc:implement` quoted step 9 as the literal `${user_config.pace}` (option unset, plugin loaded as `msnc@inline`); step 9's fallback turns that into 3. Still unchecked with a value saved in `/config`. |
| `if` filters on Bash hooks | not verified | needs a shell grant (ticket 16) |

Probes were throwaway single-run cases, not part of the suite.

## Rerun: clear-shapes-first-line (ticket 17)

**Date:** 2026-09-23 · **Claude Code:** 2.1.280 · **Model under test:** `claude-opus-5-5[1m]` · **Judge:** haiku · same command as above, graders unchanged.

| Clear wording | Result | Rate |
|---|---|---|
| Rule 1 names `a lead-in ending in ":"` as preamble (drops the "Great question" and "I'll…" examples) | **fail** | WITH 2/3 (0.78), W/OUT 0.11, Δ +0.67 |
| Plus rule 3: "2+ steps for the reader → numbered list from line 1" | pass | WITH 3/3 (1.00), W/OUT 0.11, Δ +0.89 |

- The first wording's failing run opened with "Run these from inside the repo, replacing `old-name` and `new-name`:". The judge failed it FAIL FAIL FAIL.
- With rule 3 anchored to line 1, all 3 WITH runs opened with "1. Rename the local branch:" (or "…the branch locally:") plus the command. No-plugin runs opened with "Here are the steps…", "Sure. Here's the full sequence…" and "I can't run shell commands in this session…".
- `context/clear.md` went from 1,748 to 1,746 bytes. Both runs: 16 s wall clock, $0.35–0.36 each.

## Rerun: multi-module-feature-starts-with-grill (ticket 18)

**Date:** 2026-09-23 · **Claude Code:** 2.1.280 · **Model under test:** `claude-opus-5-5[1m]` · **Judge:** haiku · `--case multi-module-feature-starts-with-grill --ablation none --scaffold --allow-tools Edit Write --no-publish --trust-plugin -j 3`, graders unchanged.

| Wording | Result | Rate |
|---|---|---|
| Before the change | **fail** | 0/3 (0.25) |
| Trim's "Complex request?" → "Open question in a small task?" | **fail** | 0/3 (0.25) |
| Plus the Tuner's size line moved above the Trim line, triggered "Before any edit" instead of "Multi-step" | **fail** | 1/3 (0.50) |
| Plus "several → large" after the signals, and the Tuner header cut to "MSNC is active." to stay under 200 tokens | pass | 3/3 (1.00) |

- Every failing run wrote `teams.js`, `subscriptions.js` and a test (4 Writes), and none opened with a size. Most logged "the choices I made" to `docs/decisions.md`: the Tuner's Reversible rule decides the open questions, so the unknowns signal reads as none and only modules crossed can still make the task large. The one earlier run that sized it said "Medium size: 3 modules crossed". "Several → large" (the planner's threshold) closes that gap.
- Passing runs made no Edit or Write and opened with round 1 of the grill (for example "Step 1 of 3 (grill → spec → tickets): round 1 of the design questions."). The stored `evidence` is cut at about 2,150 characters, so the size line and `/msnc:spec` weren't visible there; the judge voted PASS 9 of 9 on the full reply. Runs had no `--keep-temp`, so there are no traces.
- Regression, `small-fix-goes-straight-to-edit` with `--judge-model sonnet` (the haiku judge is flaky, ticket 21): pass, 3/3 (1.00). Each run called Edit once, wrote no `.scratch/`, and opened with the fix ("`greet` in `src/greet.js:1` now returns `Hello, ${name}!`."), with no size overshoot.
- `context/tuner.md` went from 800 to 783 characters. Wall clock 29–54 s per run; $0.44–0.61 per 3-run eval, $0.28 for the regression.

## Rerun: reversible-name-is-decided-and-logged (ticket 19)

**Date:** 2026-09-23 · **Claude Code:** 2.1.280 · **Model under test:** `claude-opus-5-5[1m]` · **Judge:** haiku · `--case reversible-name-is-decided-and-logged --ablation none --scaffold --allow-tools Edit Write --no-publish --trust-plugin -j 3`, graders unchanged.

| Wording | Result | Rate | `docs/decisions.md` written |
|---|---|---|---|
| Before the change (after ticket 18) | **fail** | 0/3 (0.00) | 0/3 |
| Trigger names the picks: "Reversible pick (name, file, lib) → one line: pick + why; log to …" | **fail** | 0/3 (0.00) | 0/3 |
| Plus the line moved above the Trim line, next to the size line | **fail** | 0/3 (0.22) | 2/3 |
| Plus "log each in `docs/decisions.md` and the reply" (the same line in both) | **fail** | 0/3 (0.33) | 3/3 |
| "Reversible picks (name, file) → append `date · decision · why · undo` to `docs/decisions.md`; quote it in the reply." | **fail** | 1/3 (0.56) | 3/3 |
| "Reversible picks → append `date · named X in Y · why · undo: rename/move` to …; quote it in reply." | **fail** | 1/3 (0.33) | 1/3 |
| "Reversible name/file picks → append `date · named X in Y · why · undo: rename/move` to `docs/decisions.md`; quote it in reply." | **pass** | 3/3 (1.00) | 3/3 |

- Every run loads `msnc:trim` first. With the Reversible line below the Trim line, Trim's rules won: "Fewest files possible", "New file … No why → don't add it" and "Code first. Then at most three short lines". Naming the trigger alone changed nothing. Moving the line above the Trim line is what got the log written.
- `decided-and-logged` reads only `last_message`. With "log … and the reply", replies described the log in prose ("I logged this in `docs/decisions.md`. To undo, delete the two lines.") and the judge voted FAIL in all 9 runs; some logged the `Intl.NumberFormat` choice instead of the name. With "quote it in the reply", all 3 replies quoted the line. The judge passed "undo: move it or rename it" and failed "undo: delete the 2 lines" and "delete the function".
- Naming the pick and its undo in the template ("named X in Y", "undo: rename/move") fixed the content, but without "name/file" in the trigger 2 of 3 runs logged nothing. With both, every reply quoted a line like `2026-09-23 · named formatCents in src/format.js · sits next to formatDate, the existing formatting helper · undo: rename/move`, and the judge voted PASS 9 of 9.
- To make room: "Output to filter" became "Filtering", "result, or why none ran" lost its comma, and "Subagents: full findings with `file:line`" became "Subagents: full findings, `file:line`". Trade-off: the trigger no longer names library picks, and the template fits a name or file choice.
- Regression, `multi-module-feature-starts-with-grill`: 3/3 (1.00). (The previous attempt's wording: 2/3, then 3/3 on a rerun.)
- Regression, `small-fix-goes-straight-to-edit` with `--judge-model sonnet`: 2/3 (0.83), then 3/3 (1.00) on a rerun. The failing run, like one in the previous attempt, said "I haven't run the code" without saying why, after a first edit that dropped a space.
- `context/tuner.md` went from 783 to 799 characters (cap 800). Wall clock 13–18 s per run; $0.35–0.37 per 3-run eval, $0.45 for the grill regression, $0.27 and $0.32 for the small-fix runs.
