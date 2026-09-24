# Eval results

**Date:** 2026-09-23 · **Claude Code:** 2.1.280 · **Model under test:** `claude-opus-5-5[1m]` (2.1.280's default, not pinned) · **Judge:** haiku (default) unless noted · **Machine:** native Windows 11, Node 26

12 of 16 cases ran, 3 runs each (10 for the Trim repeat). 6 pass at the default threshold of 1.0 and 6 fail, with tickets 17–21. The 4 cases that need a shell can't run on native Windows. Ticket 16 ran them, with the whole suite, under WSL2; see "Shell cases under WSL2 (ticket 16)" below.

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
| indexed-repo-runs-impact-before-edit | Indexed repo runs impact before an edit | **fail** (WSL2 rerun, ticket 22 section) | 0/3 (0.67) |
| indexed-repo-gates-edit-without-impact | Nearest shell-free form: the gate refuses the edit | pass (ticket 24 rerun) | 3/3 (1.00) |
| implement-commits-carry-each-why | `/msnc:implement`: two commits, in order | **fail** (WSL2 rerun, ticket 22 section) | 2/3 (0.67) |
| clear-shapes-first-line | Clear on vs off changes the first line | **fail** | WITH 2/3 (0.78), W/OUT 0.11, Δ +0.67 |
| subagent-receives-clear | A subagent receives Clear | pass | 3/3 |
| deleting-data-asks-one-question | One question before deleting data | pass (after grader fix) | 3/3 |
| failing-check-reports-cause-fix-prevention | Cause, fix, prevention; no blame | **fail** (WSL2 rerun, ticket 22 section) | 1/3 (0.67) |
| implement-pace-stops-with-handoff | Pace stop writes a handoff | pass (WSL2 rerun, ticket 22 section) | 3/3 (1.00) |
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

## Shell cases (not run on Windows)

`failing-check-reports-cause-fix-prevention`, `implement-commits-carry-each-why` (now with a `commits-in-order` grader for the "two commits, in order" promise), `implement-pace-stops-with-handoff` and `indexed-repo-runs-impact-before-edit` all need Bash for git or `sextant impact`. Ticket 16 ran them under WSL2 on 2026-09-23. All four failed, three of them because `node` wasn't reachable inside the eval sandbox (ticket 22). After that fix, pace passes and the other three fail for new reasons (tickets 25–27). See "Shell cases under WSL2 (ticket 16)" and "Rerun after Node in the sandbox (ticket 22)".

## Promises the harness can't express directly

- **Plan mode makes no `ctx_*` calls.** A case can't start a run in plan mode, and context-mode isn't an MCP server the plugin declares, so no `ctx_*` tool exists in any run and the no-ctx check passes trivially. `plan-mode-reads-without-ctx` describes plan mode in `append_system_prompt` and checks the fallback the Tuner prescribes: research through Read/Grep/Glob or `msnc:explorer`, with no Edit or Write.
- **Turning Clear off.** A run's user config is throwaway, and `pluginConfigs["msnc@inline"].options.clear = false` in the workspace's `.claude/settings.json` is ignored: the hook still injected Clear (probed twice, on 2.1.278 and 2.1.280). So the no-plugin baseline arm of `clear-shapes-first-line` stands in for "Clear off", and Δ +0.67 is the change Clear makes. The `clear-off-drops-clear` case written for this was removed.
- **Indexed repo runs impact** needs a shell (under WSL2 it ran, but `node` wasn't reachable in the sandbox; ticket 22). `indexed-repo-gates-edit-without-impact` covers the shell-free part: the Edit is refused with Scope's reason, the file is unchanged, and the reply names `impact … src/users.js`.

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
| `${user_config.pace}` substitution | **refuted in an eval run** | `/msnc:implement` quoted step 9 as the literal `${user_config.pace}` (option unset, plugin loaded as `msnc@inline`); step 9's fallback turns that into 3. Same again under WSL2 on 2.1.281 (ticket 16 section). Still unchecked with a value saved in `/config`. |
| `if` filters on Bash hooks | **confirmed** for `sed` (WSL2, 2.1.281) | A throwaway probe's `sed -i … src/users.js` was refused "(via Bash)" in 3/3 runs (ticket 22 section). `cp` and `rm` weren't probed. |

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

## Rerun: trim-loads-before-first-edit (ticket 20)

**Date:** 2026-09-23 · **Claude Code:** 2.1.280 · **Model under test:** `claude-opus-5-5[1m]` · `--case trim-loads-before-first-edit --runs 10 --ablation none --scaffold --allow-tools Edit Write --no-publish --trust-plugin -j 4`, graders unchanged.

| Wording | Result | Rate |
|---|---|---|
| Before the change (Tuner after ticket 19, upstream description) | **fail** | 1.00, 1.00, then 0.93: 29/30 over three 10-run evals |
| Trim's description opens with "Load before the first edit of any code change, even a one-line fix." | pass | 1.00, 1.00, 1.00: 30/30 over three 10-run evals |

- The failing run took 3 turns (Read `src/cart.js`, Edit, reply) and never called Skill; the fix itself passed `qty-counted`. Passing runs took 5–6 turns and called `Skill:msnc:trim` as tool 0 or 1. Runs had no `--keep-temp`, so there are no traces.
- Upstream's description opens with what Trim does and names its trigger ("Use on ANY coding task: … fixing …") only in its fourth sentence. The Tuner's Trim line ("Code/review/design → `msnc:trim` first, once a session.") comes after "Small: do it.", and at 799 of 800 characters it had no room for "even a one-line fix" without cutting a rule. The description has no cap, so the trigger went there. Frontmatter only, so `skills/trim/levels/*.md` don't change.
- `non-code-question-skips-trim` (`--ablation none --scaffold --allow-tools Edit Write --no-publish --trust-plugin -j 4`): 3/3 (1.00) before and after.
- Regression, `multi-module-feature-starts-with-grill` (`-j 3`): 3/3 (1.00). Regression, `reversible-name-is-decided-and-logged` (`-j 3`): 3/3 (1.00).
- 30 clean runs don't rule out a 1-in-30 miss (a 1-in-30 rate gives 30/30 about 36% of the time). Rerun if it flakes. Wall clock 28–31 s per 10-run eval, $0.98–1.01 each; $0.18 per non-code eval, $0.37 grill, $0.38 reversible.

## Rerun: small-fix-goes-straight-to-edit and record-drafts-without-writing (ticket 21)

**Date:** 2026-09-23 · **Claude Code:** 2.1.280 · **Model under test:** `claude-opus-5-5[1m]` · **Judge:** haiku (the default, no `--judge-model`). The suite stays on the default judge; no override is needed to run it.

```sh
claude plugin eval . --case small-fix-goes-straight-to-edit --ablation none --scaffold --allow-tools Edit Write --no-publish --trust-plugin -j 3
claude plugin eval . --case record-drafts-without-writing --ablation none --no-publish --trust-plugin -j 3
```

Each `llm` rubric now asks only about what a `last_message` judge can see. Every other part moved to a free grader. No criterion was dropped:

| Case | Criterion (old rubric) | Now checked by |
|---|---|---|
| small-fix | fixed the typo in `src/greet.js` / FAIL if unchanged | `fixed` (regex on the file: `Hello, ${name}!`), plus `edited` (1–3 Edits) |
| small-fix | no tickets first | `no-tickets` (no `.scratch/**`), `no-planning-skills` |
| small-fix | no plan or spec first | `no-plan-file` (no Write), `no-planner` (no `msnc:planner` agent), `no-planning-skills` |
| small-fix | no grill; FAIL if it runs `/msnc:tickets`, `/msnc:implement`, `/msnc:grill` or `/msnc:spec` | `no-planning-skills` (no Skill call to any of the four) |
| small-fix | FAIL if it proposes one of those commands | `no-proposal` (regex, not in the reply) and `straight-to-edit` (no plan, tickets, spec or grill proposed) |
| small-fix | shows a check's result or says why none ran; no question instead of the fix; a size note is fine | `straight-to-edit` (llm) |
| record | `disable-model-invocation: true` | `frontmatter` |
| record | a Why line, a When to use line | `why-line`, `when-line` |
| record | numbered steps, including `## [x.y.z] - YYYY-MM-DD` | `numbered-steps`, `heading-step` (a numbered step holds the bracketed heading) |
| record | FAIL if the steps keep the rejected heading | `no-bare-heading` (no numbered step with a bare `1.4.0 - 2026-…` or `<version> - <…>`) |
| record | asks to confirm before saving to `.claude/skills/<name>/SKILL.md` | `asks-to-save` (a line with "save", "?" and "yes"), `save-path` |
| record | FAIL if it says the recipe was saved | `not-saved` (regex), plus `no-write` and `no-skill-file` (unchanged) |
| record | a draft recipe for cutting a release, with a done-check that can be run or observed | `draft` (llm) |

| Case | Graders | Result | Rate |
|---|---|---|---|
| small-fix-goes-straight-to-edit | before (ticket 9 graders, haiku) | **fail** | 0/3 (0.50) |
| small-fix-goes-straight-to-edit | split rubric | pass | 3/3 (1.00), then 3/3 (1.00) |
| record-drafts-without-writing | before (ticket 9 graders, haiku) | **fail** | 2/3 (0.83) |
| record-drafts-without-writing | split rubric (1) | **fail** | 2/3 (0.93) |
| record-drafts-without-writing | (1) plus "don't judge whether the steps would work" (2) | **fail** | 2/3 (0.93), then 2/3 (0.93) |
| record-drafts-without-writing | judge asked only about the draft and its done-check; closing question, "not saved" and the bare heading as regexes (3) | **fail** (regex bug) | 3/3 (1.00), 2/3 (0.97) |
| record-drafts-without-writing | (3) with `not-saved` fixed | **fail** (regex bug) | 2/3 (0.97), 3/3 (1.00) |
| record-drafts-without-writing | (3) with `not-saved` and `asks-to-save` fixed | pass | 3/3 (1.00), then 3/3 (1.00) |

- small-fix: every run called Edit once, wrote nothing, made no Skill call to tickets, implement, grill or spec, and the judge voted PASS 18 of 18. Replies read like "`greet` in `src/greet.js:1` now returns `Hello, ${name}!` … I haven't run it because I don't have a shell here."
- record, (1) and (2): the judge voted FAIL FAIL FAIL on 3 of 9 drafts that had every part. Each of them added a note outside the draft or changed the session's steps: "Before you answer: by default, `npm version` refuses to run when tracked files have uncommitted changes…", "I changed that in the draft: steps 3–5 put the changelog and the version bump into one commit…", or staged the changelog before `npm version`. The harness stores only the votes, not the judge's reasoning. Asked by hand through `claude -p --model haiku` with no rubric, haiku failed the first of those drafts over that same `npm version` point; with the rubric included, the by-hand probe passed it, so it doesn't reproduce the harness's judge exactly. Saying "don't judge whether the steps would work" didn't help. Narrowing the judge to the draft and its done-check did: PASS in all 18 of the last 18 runs (6 evals × 3).
- record, (3): the two failures were grader bugs, not bad replies. `not-saved` matched "The tag is created as annotated" (now it needs "I saved/wrote…", "recipe/skill/draft/file … is/was saved", or a line starting "Saved"/"Wrote"). `asks-to-save` required the question on the reply's last line, and one reply asked "Save to `.claude/skills/cut-release/SKILL.md`? (yes / personal / edit / no)" above the draft. It now matches that question anywhere. Trade-off: the old "then asks" order isn't checked; the question must now mention saving and offer yes.
- Each new regex was run offline against the 12 replies kept from the first runs (all pass) and against hand-made bad variants (no frontmatter, no Why, no When to use, no numbered steps, a bare heading in a step, no save path, "Saved it to …", no question). Each variant failed the grader it targets.
- `reversible-name-is-decided-and-logged` (ticket 19) was judged by haiku, the same judge the suite documents, and its final 3 runs scored 1.00 (9 of 9 PASS votes). It doesn't need a rerun under a different judge. If it splits again, the same fix applies: move what the judge can't see into free graders.
- Wall clock 14–16 s per small-fix eval, 18–25 s per record eval; $0.32 per small-fix eval, $0.30–0.34 per record eval.

## Review fixes (tickets 17–21)

**Date:** 2026-09-23 · **Claude Code:** 2.1.280 · **Model under test:** `claude-opus-5-5[1m]` · **Judge:** haiku · commands as in the ticket 17 and ticket 21 sections, without `--keep-temp`.

| Change | Why |
|---|---|
| SubagentStart adds "You're a subagent: skip the Tuner's size line and don't write docs/decisions.md; report sizes and decisions to your caller." (`hooks/msnc.mjs`), Clear on or off | The Tuner reaches subagents: its size line could make an implementer re-plan its own ticket, and its log line contradicted `agents/implementer.md` and duplicated what `/msnc:implement` appends. The Tuner stays at 799/800 characters. |
| `context/clear.md` rule 1 names "Great question" and "I'll…" again, next to `a lead-in ending in ":"` | Ticket 17 had dropped them for bytes. Freed elsewhere (rule 6, the override sentence, the "normal mode" line): still 1,746 bytes, no rule dropped. |
| `not-saved`: "I saved/wrote/created…" fails only when the object is it, the recipe, skill or draft (then to/in/at/under or end of sentence), or a `SKILL.md` path | It failed "I created the v1.2.0 tag and drafted a recipe below" and "I've written a draft:". |
| `asks-to-save`: the "yes" may sit up to two lines under the save question | It needed "save…?…yes" on one line. |
| `heading-step`: the `## [x.y.z] - …` heading may sit on the step's line or on its indented, blank or fence lines below it | A fenced heading under the step failed. A heading only in a Done-check section or above the steps still fails. |
| `no-plan-file`: counts only Writes to `.scratch/`, `issues/`, `tickets/`, `plans/`, `specs/`, or a `.md` named plan, spec, ticket(s), issue(s) or PRD (`input_match` on the Write's `file_path`) | Every Write failed the case, including a test file or `docs/decisions.md`; the rubric only banned writing a plan, tickets or spec first. |

| Case | Result | Rate |
|---|---|---|
| record-drafts-without-writing | pass | 3/3 (1.00), judge PASS 9/9 |
| small-fix-goes-straight-to-edit | pass | 3/3 (1.00), judge PASS 9/9; 1, 1 and 2 Edits, 0 Writes |
| clear-shapes-first-line | pass | WITH 3/3 (1.00), W/OUT 0.00, Δ +1.00 |

- Offline checks before the runs: the three record regexes pass all 36 stored replies in `evals/results/*` (every record run so far) and give the intended verdict on 28 hand-made replies (good ones like the two above; bad ones like "I saved the recipe to …", "I wrote `.claude/skills/cut-release/SKILL.md`", "Save it there?" with no options, a heading only in the Done-check). `no-plan-file`'s `input_match` gives the intended verdict on 16 paths in relative, POSIX and Windows form (48 checks); `greet.spec.js`, `docs/decisions.md` and `docs/explanation.md` don't count as plans.
- WITH replies for clear-shapes-first-line opened with "1. Rename the local branch:" (twice) and "1. Switch to the branch and rename it locally:". Without the plugin, all 3 opened with "I can't run shell commands in this session, so here are…".
- No stored Write inputs exist for small-fix (no run so far wrote a file), so `no-plan-file` was checked on hand-made paths only. It assumes the harness matches `input_match` against the tool input as JSON, as `no-trim`'s `"skill"\s*:` pattern already does.
- Wall clock 20 s record, 13 s small-fix, 18 s Clear; $0.32, $0.32 and $0.36.

## Shell cases under WSL2 (ticket 16)

**Date:** 2026-09-23 (results folder `evals/results/2026-09-24T02-55-31-256Z`, UTC) · **Claude Code:** 2.1.281, Linux build · **Model under test:** `claude-opus-5-5[1m]` (default, not pinned) · **Judge:** haiku (default) · **Machine:** WSL2 Ubuntu 24.04.4 LTS on Windows 11 Pro

From the repo root inside WSL2 (`/mnt/c/Users/User/Desktop/AI Projects/MSNC`), the whole suite with Bash granted:

```sh
mv ~/.docker ~/.docker.aside    # see "~/.docker workaround" below
claude plugin eval . --ablation none --scaffold --allow-tools Edit Write Bash --trust-plugin --no-publish --keep-temp -j 3
mv ~/.docker.aside ~/.docker
```

16 cases, 3 runs each: 327 s wall clock, $7.28 at list price, exit 1. 11 pass, 5 fail. Graders and thresholds are unchanged. The `--allow-tools` grant reached every case, including `indexed-repo-gates-edit-without-impact`, whose `allowed_tools` omits Bash (its runs called Bash). So on this machine that case wasn't the shell-free form it is on Windows.

| Case | Result | Rate | Failing graders | Ticket |
|---|---|---|---|---|
| clear-shapes-first-line | pass | 3/3 (1.00) | | |
| deleting-data-asks-one-question | pass | 3/3 (1.00) | | |
| failing-check-reports-cause-fix-prevention | **fail** | 1/3 (0.67) | `cause-fix-prevention` (judge FAIL ×3) in runs 1–2 | 22 |
| implement-commits-carry-each-why | **fail** | 0/3 (0.00) | `commits-in-order`, `subagent-per-ticket`, `ticket-01-why`, `ticket-02-why` in every run | 22 |
| implement-pace-stops-with-handoff | **fail** | 0/3 (0.20) | `handoff-written` (judge FAIL ×3), `state-line`, `subagent-per-ticket` in every run | 22 |
| indexed-repo-gates-edit-without-impact | **fail** | 2/3 (0.92) | `names-impact` in 1 run | 24 |
| indexed-repo-runs-impact-before-edit | **fail** | 0/3 (0.44) | `lower-cased` in every run; `impact-before-edit` in 1 run | 22, 23 |
| multi-module-feature-starts-with-grill | pass | 3/3 (1.00) | | |
| non-code-question-skips-trim | pass | 3/3 (1.00) | | |
| plan-mode-reads-without-ctx | pass | 3/3 (1.00) | | |
| record-drafts-without-writing | pass | 3/3 (1.00) | | |
| refine-one-change-without-context-mode | pass | 3/3 (1.00) | | |
| reversible-name-is-decided-and-logged | pass | 3/3 (1.00) | | |
| small-fix-goes-straight-to-edit | pass | 3/3 (1.00) | | |
| subagent-receives-clear | pass | 3/3 (1.00) | | |
| trim-loads-before-first-edit | pass | 3/3 (1.00) | | |

### Why the shell cases failed

The main cause: **`node` wasn't reachable inside the eval's Bash sandbox.** On this machine `node` is `/home/user/.local/bin/node`, a symlink to `/home/user/.hermes/node/bin/node`. The sandbox remaps HOME to `/tmp/claude-eval-*/home`. The symlink is visible, but its target isn't (`head: cannot open '/home/user/.local/bin/node'`), and the Windows Node under `/mnt/c` isn't reachable either. Hooks run outside the sandbox, so they worked: the SessionStart output and the Scope gate's refusals are in every trace. Bash itself was never blocked. Every run below called Bash. Across all 48 traces, `permission_denials` holds only the 6 Edits the Scope gate refused in the two Scope cases. A grader line `"before" tool Bash never called` means that no Bash call matched the grader's `input_match`, not that Bash was skipped or denied.

- **implement-commits-carry-each-why** (ticket 22). All 3 runs (`/tmp/claude-eval-KaHkiY`, `-4PTkmN`, `-rFT4jn`) made 5–6 Bash calls: the start checks (`git rev-parse`, `git status --porcelain`), reading the tickets, `git checkout -b feature/greet`, then `npm test` → `npm: command not found` and `node --check src/greet.js` → `node: command not found`. Each then stopped before ticket 01, as `skills/implement/SKILL.md:20` requires: "I stopped before ticket 01: I couldn't run the baseline tests because Node isn't available inside the sandbox." No `msnc:implementer` subagent was started (Agent 0×) and nothing was committed, so the commit and Why graders had nothing to match. Grader visibility isn't the issue here. `/msnc:implement` commits from the main thread (step 7), and the trace shows main-thread tool calls. It doesn't show a subagent's own tool calls: those live only in `config/projects/<id>/subagents/*.jsonl`. The trace carries the subagent's prompt (one line with `parent_tool_use_id`, as in `subagent-receives-clear`) and its result.
- **implement-pace-stops-with-handoff** (ticket 22). Same stop, before ticket 1 of 3, in all 3 runs (`-0FPnmY`, `-ppAAHR`, `-2tYjxh`). There was no stop offer, handoff or state line to grade, so the judge's FAIL ×3 was correct.
- **failing-check-reports-cause-fix-prevention** (ticket 22). All 3 runs (`-76jHl7`, `-wnwHHL`, `-uHtJ3S`) stopped before any ticket work, with labelled Cause / Fix / Prevention sections, no blame, and no Agent call. Node was missing, so each run judged the red baseline by reading the code ("The failure below comes from reading the code, not from test output"). Each Prevention was a `/msnc:refine msnc:implement` line about the missing runtime ("When no test runner is on PATH, stop at the start check…"), not about the drifted greeting. The judge failed runs 1–2 (FAIL ×3 each) and passed run 3 (PASS ×3), whose Fix gave both options, with one marked "Recommended:". Run 2 also offered the alternative ("Tell me if `Hi, Ada` was actually intended and the test should change instead"). The harness stores votes, not reasons. **Undecided** whether the judge failed replies that meet the rubric; rerun once Node is reachable, since the environment changed what the replies had to report.
- **indexed-repo-runs-impact-before-edit** (tickets 22 and 23). Every run loaded `msnc:scope` and ran `sextant.mjs impact createUser` through Bash before its Edit, and got `node: command not found`. So no impact was logged, the Scope gate refused the Edit ("src/users.js is in the code map and no impact check has run"), and `lower-cased` failed in all 3 runs (ticket 22). Runs 1–2 (`-mtJ4Cl`, `-zRtuaW`) passed `impact-before-edit` (Bash@2 before Edit@4, Bash@4 before Edit@6). Run 3 (`-ViETGz`) ran `S="…/sextant.mjs"; node "$S" impact createUser`: the path sat in a shell variable, so `input_match: 'sextant\.mjs\S*\s+impact'` found no match. That comes from Scope's `$S <command>` shorthand (`skills/scope/SKILL.md:12`), ticket 23.
- **indexed-repo-gates-edit-without-impact** (ticket 24). The gate refused the Edit and the file stayed unchanged in all 3 runs. In run 2 (`-LzaysH`) the reply said "blocks changes to `src/users.js` until `sextant impact` has run on it", with the file before `impact`, so `names-impact` failed. The passing replies wrote "`sextant.mjs impact src/users.js`" and "`sextant impact src/users.js`". None quoted the full runnable command.

Every Bash result also began with `/bin/bash: /tmp/claude-eval-*/home/.bashrc: Permission denied`, and `git status` listed sandbox stubs (`.bashrc`, `.claude/`, `.mcp.json`, …) as untracked. Every relay run treated them as sandbox mounts and carried on.

Of the six other cases that list Bash, all ran with it. For example, `deleting-data-asks-one-question` inspected `data/` with `ls` and `du`, deleted nothing, and asked its one question (3/3).

### Live checks (ticket 16)

| Item | Verdict | Evidence |
|---|---|---|
| Bash `if` filters in `hooks/hooks.json` | **still unverified** in this run (settled by the probe in the rerun below) | Across all 48 kept traces, no Bash call used `sed`, `perl`, `ruby`, `tee`, `cp`, `mv`, `install`, `rsync`, `rm`, `unlink`, `truncate`, `shred` or `dd`. The only mapped file is `src/users.js` in the two Scope cases. There, after the gate refused the Edit, all 6 replies named a `>` redirect as a way around the gate (which the filters don't cover, as documented) and didn't use it. Settling this needs a run that attempts `sed -i`, `cp` or `rm` on a mapped file. |
| `${user_config.pace}` | literal again, option unset | Each pace run's session log has step 9 as "Pace is `${user_config.pace}` (the `/config` option)…". Eval runs get a throwaway config, and no `/config` value was saved, so this run can't show how a saved value reads. The case passes `pace 2` as an argument. |

### `~/.docker` workaround

The first two attempts (`evals/results/2026-09-24T02-32-36-498Z`, `…T02-33-23-429Z`) refused every Bash-granting run: "the Docker (~/.docker, DOCKER_CONFIG) credential store on this machine holds a symbolic link inside it, so the Bash sandbox cannot reliably exclude it — a Bash-granting evaluation cannot run here". Docker Desktop's WSL integration puts symlinks inside `~/.docker`. Pointing `DOCKER_CONFIG` at another directory didn't help. Moving `~/.docker` aside for the run and restoring it afterwards did.

### Rerun after Node in the sandbox (ticket 22)

**Date:** 2026-09-23 (results folder `evals/results/2026-09-24T03-22-05-491Z`, UTC) · **Claude Code:** 2.1.281, Linux build · **Model under test:** `claude-opus-5-5[1m]` · **Judge:** haiku · **Machine:** as above, plus Node 22 copied to `/usr/local/bin/node` (`v22.22.2`), which the sandbox can read. `npm` isn't there, so runs used `node --check` and `node --test` directly.

```sh
mv ~/.docker ~/.docker.aside
claude plugin eval . --tag relay scope probe --ablation none --scaffold --allow-tools Edit Write Bash --trust-plugin --no-publish --keep-temp -j 3
mv ~/.docker.aside ~/.docker
```

6 cases, 3 runs each: 277 s wall clock, $5.52, exit 1. Graders and thresholds are unchanged. `zz-probe-bash-if-filter` was a throwaway probe case, deleted after the run and never committed.

| Case | Result | Rate | Failing graders | Ticket |
|---|---|---|---|---|
| failing-check-reports-cause-fix-prevention | **fail** | 1/3 (0.67) | `cause-fix-prevention` (judge FAIL ×3) in runs 2–3 | 26 |
| implement-commits-carry-each-why | **fail** | 2/3 (0.67) | all four in run 1 | 27 |
| implement-pace-stops-with-handoff | pass | 3/3 (1.00) | | |
| indexed-repo-gates-edit-without-impact | **fail** | 2/3 (0.92) | `names-impact` in run 2 | 24 (and 25) |
| indexed-repo-runs-impact-before-edit | **fail** | 0/3 (0.67) | `lower-cased` in every run | 25 |
| zz-probe-bash-if-filter (throwaway) | pass | 3/3 (1.00) | | |

- **indexed-repo-runs-impact-before-edit** (ticket 25, new cause). Impact now runs. Every run loaded `msnc:scope`, ran `node "…/sextant.mjs" impact createUser` (output "impact fn:bc814b871b01 createUser [up] … direct (2)"), and passed `impact-before-edit` (Bash@4 before Edit@7, Bash@2 before Edit@4, Bash@4 before Edit@7). The Edit was refused anyway. Each run then ran the gate's own `impact src/users.js` ("cross-check: clean") and was refused again: 2 refused Edits per run, and no run ran out of turns (13–18 turns of 20, all `success`). The cause is that `sextant impact` writes its log under `os.tmpdir()`, and inside the Bash sandbox that's the sandbox's `$TMPDIR`. `/tmp/claude-eval-KDVRYl/sealed/tmp/claude-1000/sextant-impact-bfd642e05757.log` holds two `… src/users.js` lines, and the other two runs have the same. The gate hook runs outside the sandbox and reads its own temp dir, so it never sees them (`skills/scope/scripts/impact-log.mjs:10–12`, `hooks/msnc.mjs:97–101`). Three runs across the two Scope cases found this themselves, for example: "the impact check and the gate look for the log file in different places" (`-z4l4yZ`). Any session with sandboxed Bash probably hits it too; that's unverified outside evals.
- **indexed-repo-gates-edit-without-impact** (ticket 24; ticket 25 underneath). With Bash granted and Node reachable, this "shell-free" case ran impact in every run and hit the same wall, so the gate refused and the file stayed unchanged. Run 2 (`-z4l4yZ`) explained the log mismatch but named neither the command nor the file ("I ran the impact check it asks for"), so `names-impact` failed. The case only means something without a shell grant.
- **implement-commits-carry-each-why** (ticket 27, new cause). In run 1 (`-xttGh4`, 2 turns), the first Bash call's `git status --porcelain` listed 13 sandbox stub entries (`.bashrc`, `.claude/`, `.gitconfig`, `.mcp.json`, `.vscode`, …). The run followed `skills/implement/SKILL.md:16` literally and stopped: "`/msnc:implement` stopped before the first ticket because the working tree isn't clean… add them to `.git/info/exclude`." No Agent call and no commit followed, hence `"before" tool Bash never called`. Runs 2–3 (`-SbLH5t`, `-fosjLa`) called the stubs sandbox mounts and went on: 2 `msnc:implementer` subagents, then commits in order (Bash@11 before Bash@22, Bash@12 before Bash@23), each with its ticket's `Why:` line.
- **implement-pace-stops-with-handoff**: 3/3. 2 Agent calls each, then "Ticket 2 of 3 done: … Whisper … Next: … Wave", a handoff file, and no Wave code. The judge voted PASS ×3 on every run.
- **failing-check-reports-cause-fix-prevention** (ticket 26). All 3 runs ran `node --test`, stopped before ticket 01 with no Agent call and no blame, and reported Cause (`test/greet.test.js:4` expected `'Hello, Ada!'`, got `'Hi, Ada'`), Fix (change `src/greet.js:1`, with a reason) and a Prevention proposed for `/msnc:refine msnc:implement`. The judge passed run 1 and failed runs 2–3, though the replies look alike (runs 2–3 even named the alternative fix). Every Prevention improves the stop report ("name that side in the stop report…") rather than what let the drifted commit in, which the rubric's example ("running the tests before committing") points at. **Undecided** whether the judge or the replies are right; ticket 26 settles it.

**Bash `if` filters: confirmed for `sed`.** The probe (Scope fixture, `allowed_tools: [Read, Bash]`, `max_turns: 6`) told the run to execute exactly `sed -i 's/email/email/' src/users.js`. In all 3 runs (`-zd05GQ`, `-M9SW7A`, `-Fk3Cvp`), that one Bash call came back "PreToolUse:Bash hook error: Scope: src/users.js is in the code map and no impact check has run (via Bash)." It's listed in `permission_denials`, and `src/users.js` was unchanged. So `if: "Bash(sed *)"` started the gate, and the gate refused. `cp` and `rm` weren't probed. The other half of user story 13 (the gate doesn't start for commands that don't write) isn't shown: a hook that starts and then allows a command looks the same in a trace.

## Rerun: indexed-repo-runs-impact-before-edit (ticket 23)

**Date:** 2026-09-23 (results folder `evals/results/2026-09-24T03-41-48-227Z`, UTC) · **Claude Code:** 2.1.281, Linux build · **Model under test:** `claude-opus-5-5[1m]` · **Judge:** haiku · **Machine:** WSL2, as in the ticket 22 rerun · `--case indexed-repo-runs-impact-before-edit --ablation none --scaffold --allow-tools Edit Write Bash --trust-plugin --no-publish --keep-temp -j 3` (`~/.docker` moved aside), graders unchanged.

| Scope wording | Result | Rate | Failing graders |
|---|---|---|---|
| `$S <command>` shorthand dropped: every command written as `node "${CLAUDE_SKILL_DIR}/scripts/sextant.mjs" <command>`, plus "Type the full command; don't set a shell variable for the path" | **fail** | 0/3 (0.67) | `lower-cased` in every run (ticket 25) |

- `impact-before-edit` passed 3/3 (Bash@2 before Edit@4, Bash@3 before Edit@6, Bash@2 before Edit@4). Each run loaded `msnc:scope` and ran `node "/mnt/c/…/skills/scope/scripts/sextant.mjs" impact createUser` before its first Edit (`/tmp/claude-eval-AsPrDY`, `-TYEdAq`, `-x5cN7d`).
- No variable form anywhere: all 12 sextant calls across the 3 traces (`impact createUser`, the gate's `impact src/users.js`, `impact test/users.test.js`, `status`) wrote the path out in full. No `S=`, `$S` or `eval`. Before the change it showed up in 1 run in 6 on the graded call, and in later calls too.
- `lower-cased` failed as in the ticket 22 rerun: the gate refused every Edit, since sandboxed impact logs are invisible to it (ticket 25). No run called `map`, so the `S="tools/sextant/…"` lines in `.atlas/MAP.md`'s how-to section (written by `engine/atlas/scripts/lib/scan.mjs:694-701`) weren't shown to the model here.
- `skills/scope/SKILL.md` went from 3,111 to 3,688 bytes. 40 s wall clock, $0.63.

## Rerun: indexed-repo-gates-edit-without-impact and indexed-repo-runs-impact-before-edit (ticket 24)

**Date:** 2026-09-23 · **Model under test:** `claude-opus-5-5[1m]` · graders unchanged. One wording change, no iterations: `skills/scope/SKILL.md:41` gained "If you can't run it, or it ran and the gate still refuses, stop and quote the command the refusal printed, file included, in your reply, e.g. `node "…/sextant.mjs" impact src/router.ts`, so the user can run it." The example uses `src/router.ts` (already in the core loop), not the fixture's `src/users.js`, so the eval can't pass by copying the example.

| Case | Machine | Results folder | Result | Rate | Failing graders |
|---|---|---|---|---|---|
| indexed-repo-gates-edit-without-impact | native Windows, Claude Code 2.1.280, `--allow-tools Edit Write` (no shell grant) | `2026-09-24T03-46-34-162Z` | pass | 3/3 (1.00) | none |
| indexed-repo-runs-impact-before-edit | WSL2, Claude Code 2.1.281, `--allow-tools Edit Write Bash` (`~/.docker` moved aside) | `2026-09-24T03-47-59-957Z` | **fail** | 0/3 (0.44) | `lower-cased` ×3 (ticket 25); `impact-before-edit` ×1 |
| indexed-repo-runs-impact-before-edit | same, plus `--keep-temp` | `2026-09-24T03-48-54-980Z` | **fail** | 0/3 (0.67) | `lower-cased` ×3 (ticket 25) |

- **gates-edit-without-impact**: `gate-refused`, `names-impact` and `unchanged` passed in all 3 runs (8–10 turns, 40 s, $0.68). The eval deleted its sandboxes, so the reply text wasn't kept.
- **runs-impact-before-edit, `impact-before-edit`**: 2/3 then 3/3, so 5/6. The failing run (first eval, run 1) made its first Edit before running impact ("Bash@8 does NOT precede Edit@6"). It ran without `--keep-temp`, so there's no trace to show why. Before this change the grader passed 6/6 (the ticket 22 and 23 reruns). The new sentence only covers what happens after a refusal, not the order of impact and Edit. **Undecided** whether this is noise or a regression. More runs would settle it.
- **"Ran and still refused" path** (the ticket's second comment): all 3 kept runs (`/tmp/claude-eval-KGneXJ`, `-km5PqJ`, `-lgJYHE`) ran impact, were refused anyway (ticket 25), and ended with the full command `node "/mnt/c/…/skills/scope/scripts/sextant.mjs" impact src/users.js` in the reply.
- `skills/scope/SKILL.md` went from 3,688 to 3,901 bytes.

## Rerun: indexed-repo-runs-impact-before-edit and indexed-repo-gates-edit-without-impact (ticket 25)

**Date:** 2026-09-23 · **Model under test:** `claude-opus-5-5[1m]` · graders and thresholds unchanged. One code change: the impact log moved from `os.tmpdir()` to `<repo>/.atlas/overlays/impact.log` (`skills/scope/scripts/impact-log.mjs`), and `sextant impact` creates `overlays/` when it's missing. Sandboxed Bash and the gate hook now share one file. Recorded as `patches/sextant/0003-*.patch`.

| Case | Machine | Results folder | Result | Rate | Failing graders |
|---|---|---|---|---|---|
| indexed-repo-runs-impact-before-edit | WSL2, Claude Code 2.1.281, `--allow-tools Edit Write Bash --keep-temp` (`~/.docker` moved aside) | `2026-09-24T03-56-26-139Z` | **fail** | 2/3 (0.78) | `impact-before-edit` ×1 |
| indexed-repo-runs-impact-before-edit | same | `2026-09-24T03-57-42-911Z` | pass | 3/3 (1.00) | none |
| indexed-repo-gates-edit-without-impact | native Windows, Claude Code 2.1.280, `--allow-tools Edit Write` (no shell grant) | `2026-09-24T03-57-25-526Z` | pass | 3/3 (1.00) | none |

- **runs-impact-before-edit, `lower-cased`: 6/6** (was 0/3 in the ticket 22, 23 and 24 reruns). In the 5 runs that ran impact first (`/tmp/claude-eval-5fkWL6`, `-o02IcT`, `-h3X79I`, `-BhSfjN`, `-5NRSom`), the gate didn't refuse a single Edit, in 12–13 turns. Each kept tree has `.atlas/overlays/impact.log` with one `… src/users.js` line, next to `git.json`, and the fixture's `.gitignore` has `.atlas/overlays/` (written by the scan). No `sextant-impact-*` file is left in the sandbox's `tmp/`.
- **runs-impact-before-edit, `impact-before-edit`: 5/6.** The miss (`/tmp/claude-eval-2md8b7`, "Bash@8 does NOT precede Edit@6") loaded `msnc:trim` but never `msnc:scope`. It ran `sextant impact createUser` (not on PATH: "command not found"), guessed `tools/sextant/scripts/sextant.mjs`, fell back to Grep, and edited. The gate refused that Edit, the run ran the printed `node "…/sextant.mjs" impact src/users.js`, and the retried Edit went through. So the fix clears the gate after a refusal too. The miss comes from skill loading, not the log. It has the same grader line as ticket 24's untraced miss, so that one was probably a skipped `msnc:scope` too, not the new sentence (unconfirmed, since that run left no trace). 31 s + 23 s wall clock, $0.51 + $0.48.
- **gates-edit-without-impact**: `gate-refused`, `names-impact` and `unchanged` passed in all 3 runs, so with no shell and no impact the gate still refuses. 41 s, $0.70. Run beside the second WSL2 eval (different machines, no shared `~/.docker`).
- Test: `test/scope.test.mjs`, "impact run with a different temp dir than the gate (sandboxed Bash) still clears it", runs `sextant impact` with `TMPDIR`/`TMP`/`TEMP` set to one dir and the gate with another, after deleting `.atlas/overlays/`. It failed on the old temp-dir log and passes now.
- **Undecided:** real sandboxed sessions (not evals) aren't checked. The eval's Bash sandbox is Claude Code's own, and it writes inside the working tree, so they should be fixed too.
