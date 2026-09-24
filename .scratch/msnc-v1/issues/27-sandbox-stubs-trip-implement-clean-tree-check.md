# 27: Sandbox stub files make `/msnc:implement`'s clean-tree check stop

**Why:** User stories 18 and 30. As a user running `/msnc:implement` with Claude Code's Bash sandbox on, I want the start check to ignore the placeholder files the sandbox mounts into the repo, so that the run starts instead of asking me about files I never made. In 1 of 3 runs, the run stopped at the start for that reason.

**What to build:** Make the start check in `skills/implement/SKILL.md:16` ("Uncommitted changes (`git status --porcelain` prints anything) → stop and ask…") tell sandbox mount stubs apart from real changes. For example: untracked entries that are character devices, or empty mount points, for the sandbox's protected names (`.bashrc`, `.bash_profile`, `.profile`, `.zprofile`, `.zshrc`, `.gitconfig`, `.gitmodules`, `.ripgreprc`, `.mcp.json`, `.idea`, `.vscode`, `.claude/`) don't count, and are never staged. Tracked changes and real untracked files still stop the run. Alternatively, if this only happens in eval sandboxes, have the case fixtures exclude the stubs (`.git/info/exclude`). That's a fixture change, not a grader change, and is only right if real sandboxed sessions don't show them. Check that first.

**Context:**
- `evals/RESULTS.md`, "Rerun after Node in the sandbox (ticket 22)", 2026-09-23: `implement-commits-carry-each-why` 2/3 (0.67).
- Failing run `/tmp/claude-eval-xttGh4` (2 turns): the first Bash call, `git status --porcelain && git ls-files …`, listed 13 untracked entries (`.bash_profile`, `.bashrc`, `.claude/`, `.eval-artifacts`, `.gitconfig`, `.gitmodules`, `.idea`, `.mcp.json`, `.profile`, `.ripgreprc`, `.vscode`, `.zprofile`, `.zshrc`). The reply was "`/msnc:implement` stopped before the first ticket because the working tree isn't clean… I recommend hiding them locally: add them to `.git/info/exclude`." So there was no Agent call and no commit, and the grader reported `"before" tool Bash never called` (no Bash call matched `git commit…`).
- The two passing runs (`-SbLH5t`, `-fosjLa`) saw the same list, called the entries sandbox mounts, and went on: 2 Agent calls, and commits in order (Bash@11 before Bash@22, Bash@12 before Bash@23) with both Why lines. `implement-pace-stops-with-handoff` (3/3) and every `failing-check` run did the same. Earlier runs described the entries as "sandbox device mounts (char devices → /dev/null)".
- `.eval-artifacts` and `.claude/` may come from the eval harness, not the Bash sandbox.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] `/msnc:implement` doesn't stop on the sandbox's stub entries and never stages them, and still stops on real uncommitted changes (a test or a skill pin).
- [ ] `implement-commits-carry-each-why` scores 1.00 over 3 runs under WSL2, with no grader or threshold changed.
