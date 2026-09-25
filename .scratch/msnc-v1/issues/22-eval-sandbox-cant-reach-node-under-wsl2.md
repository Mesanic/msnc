# 22: The eval sandbox can't reach Node under WSL2

**Why:** User story 30. As the maintainer, I want the shell cases to run where `node` works, so that their scores measure MSNC's implement, pacing, failure-report and impact promises (stories 18, 37, 38, 39, 11) instead of the machine. In the first WSL2 run every relay run stopped at the baseline because `node` wasn't found, so three cases scored on a promise they never reached.

**What to build:** Make `node` resolvable inside the eval's Bash sandbox on this machine, then rerun the affected cases and record them. This one ticket covers three failing cases that share this cause (`implement-commits-carry-each-why`, `implement-pace-stops-with-handoff`, `failing-check-reports-cause-fix-prevention`) and the `lower-cased` half of `indexed-repo-runs-impact-before-edit` (its other half is ticket 23).
- Install Node at a system path the sandbox can read, for example `/usr/bin/node`. Recommended: Node 22 (the version the hooks already run on here, v22.22.2), for example from NodeSource. Ubuntu 24.04's own `nodejs` package is 18.19.1: it has `node --test`, but `scope.mjs` hasn't been tried on it.
- Check it inside a run: the first Bash call in a trace, or a throwaway probe case, prints a path for `command -v node`.
- Rerun the four cases above, 3 runs each (the command and the `~/.docker` workaround are in `evals/RESULTS.md`, "Shell cases under WSL2 (ticket 16)"), and record them there.

**Context:**
- `evals/RESULTS.md`, "Shell cases under WSL2 (ticket 16)", 2026-09-23, Claude Code 2.1.281 on WSL2 Ubuntu 24.04.
- Outside the sandbox, `node` is `/home/user/.local/bin/node` → `/home/user/.hermes/node/bin/node`. The sandbox remaps HOME to `/tmp/claude-eval-*/home`. The symlink is visible inside it, but its target isn't (`head: cannot open '/home/user/.local/bin/node'`, `-4PTkmN`), and the Windows `node` under `/mnt/c/Program Files/nodejs` isn't reachable either (`-rFT4jn`). There is no `/usr/bin/node`. Hooks run outside the sandbox, so they still work (every trace has the SessionStart hook output, and the Scope gate refused Edits).
- Evidence (kept sandboxes, `out/trace.jsonl`):
  - `implement-commits-carry-each-why`, all 3 runs (`/tmp/claude-eval-KaHkiY`, `-4PTkmN`, `-rFT4jn`): 5–6 Bash calls each (`git status`, `git checkout -b feature/greet`, `npm test`), then `node: command not found` (exit 127). Each run stopped before ticket 01, as `skills/implement/SKILL.md:20` says ("never build on a red baseline"): "I stopped before ticket 01: I couldn't run the baseline tests because Node isn't available inside the sandbox." No Agent call, no commit. The grader's `"before" tool Bash never called` means that no Bash call matched `git commit…`; Bash itself was called and not denied (`permission_denials: []`).
  - `implement-pace-stops-with-handoff`, all 3 runs (`-0FPnmY`, `-ppAAHR`, `-2tYjxh`): same stop before ticket 1 of 3, so there was no stop offer, handoff or state line to grade.
  - `failing-check-reports-cause-fix-prevention` (`-76jHl7` FAIL, `-wnwHHL` FAIL, `-uHtJ3S` PASS): each run stopped before any ticket work and reported Cause / Fix / Prevention with no blame. But it judged the red baseline by reading the code ("The failure below comes from reading the code, not from test output"), and every Prevention was about the missing runtime ("When no test runner is on PATH, stop at the start check…") rather than the drifted greeting. The judge voted FAIL ×3 on runs 1–2 and PASS ×3 on run 3, whose Fix gave both options with "Recommended:". The harness stores votes, not reasons, so it's unclear whether the judge failed a reply that meets the rubric.
  - `indexed-repo-runs-impact-before-edit` (`-mtJ4Cl`, `-zRtuaW`, `-ViETGz`): `node …/scope.mjs impact createUser` → `node: command not found`, so the impact log stayed empty, the Scope gate refused the Edit ("src/users.js is in the code map and no impact check has run"), and `lower-cased` failed in all 3 runs.
- Every Bash result also starts with `/bin/bash: /tmp/claude-eval-*/home/.bashrc: Permission denied`, and `git status` lists sandbox stubs (`.bashrc`, `.claude/`, `.mcp.json`, …) as untracked. Every relay run treated those as sandbox mounts and carried on, but one reply noted they "would trip the clean-tree check". Watch for that in the rerun.

**Blocked by:** None — can start immediately

**Status:** done

- [x] Inside an eval run, `command -v node` prints a path and `node --test` runs.
- [x] `implement-commits-carry-each-why`, `implement-pace-stops-with-handoff`, `failing-check-reports-cause-fix-prevention` and `indexed-repo-runs-impact-before-edit` have rerun 3 times each with Node reachable, and the results are in `evals/RESULTS.md`, with no grader or threshold changed.
- [x] Each case that still fails has its own follow-up ticket, with the cause taken from its traces. If `failing-check-reports-cause-fix-prevention` still splits on the judge, handle it the way ticket 21 did.

## Comments

- 2026-09-23 · Fix applied by the user: Node 22 copied to `/usr/local/bin/node` in WSL (`v22.22.2`), which the sandbox can read. Rerun with `--tag relay scope probe` (Claude Code 2.1.281, `evals/results/2026-09-24T03-22-05-491Z`). Node now runs inside the sandbox: `node --test` → "# tests 1 … # pass 1" (`/tmp/claude-eval-KDVRYl` line 28), and `scope.mjs impact` printed its report in every Scope run. `npm` still isn't there (only `node` was copied), and runs fell back to `node --check` and `node --test`. Results: `implement-pace-stops-with-handoff` 1.00 (3/3); `implement-commits-carry-each-why` 0.67 (2/3, the failing run stopped on sandbox stub files → ticket 27); `failing-check-reports-cause-fix-prevention` 0.67 (judge split on replies that look alike → ticket 26); `indexed-repo-runs-impact-before-edit` 0.67 (0/3: impact ran, but the gate can't see a log written in sandboxed Bash → ticket 25). No grader or threshold changed. Details in `evals/RESULTS.md`, "Rerun after Node in the sandbox (ticket 22)".
