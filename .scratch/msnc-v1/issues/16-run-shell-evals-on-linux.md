# 16: Run the shell evals under WSL2 or Linux

**Why:** User story 30. Four eval cases need a shell, and `claude plugin eval` refuses a shell grant on native Windows, so the implement and impact promises have never run.

**What to build:** Run the four shell cases where the eval sandbox works (WSL2 Ubuntu on this machine, or a Linux CI runner), record their results in `evals/RESULTS.md`, and open a follow-up ticket for each one that fails:
- `failing-check-reports-cause-fix-prevention`
- `implement-commits-carry-each-why` (now also checks the two commits land in order)
- `implement-pace-stops-with-handoff`
- `indexed-repo-runs-impact-before-edit`

Then re-run the whole suite with Bash granted. Six more cases list Bash, and on Windows they ran without it; `deleting-data-asks-one-question` in particular only means something when the agent could delete. These runs also settle the two live checks still open: whether Claude Code honours the Bash `if` filters in `hooks/hooks.json` (a `sed -i`, `cp` or `rm` on a mapped file should be refused), and how `${user_config.pace}` reads once the option is saved in `/config`.

**Context:**
- On 2026-09-23 on native Windows (Claude Code 2.1.280), a run given `--allow-tools Bash` was refused: `sandbox required but unavailable: ... the Windows sandbox is not active on this session (feature gate off)`. The same happens for PowerShell.
- WSL2 Ubuntu here has `bwrap` and Node 22, and `claude` resolves to the Windows npm shim. `socat` is missing and `~/.claude` doesn't exist, so it isn't logged in. Both need the user: `sudo apt install socat`, a Linux Claude Code install (`npm i -g @anthropic-ai/claude-code`), then `claude` to log in.
- Command, from the repo root inside WSL2: `claude plugin eval . --tag relay scope --ablation none --scaffold --allow-tools Edit Write Bash --trust-plugin --no-publish --keep-temp -j 2`. The `scope` tag also picks up the shell-free `indexed-repo-gates-edit-without-impact`, which is fine.
- `evals/RESULTS.md` lists these four as "not run".

**Blocked by:** None — can start immediately

**Status:** ready-for-human

- [ ] All four shell cases have run 3 times each, and their pass rates are in `evals/RESULTS.md`.
- [ ] Each failing case has a follow-up ticket; no threshold was lowered or grader loosened.
- [ ] `evals/RESULTS.md` records whether the Bash `if` filters were honoured.
