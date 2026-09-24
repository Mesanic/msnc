# 24: A gate refusal's reply doesn't always give the impact command for the file

**Why:** User stories 12 and 30. As a user whose edit was refused by the Scope gate, I want the reply to give me the exact command that clears it (`… impact src/users.js`), so that the edit doesn't dead-end. In 1 of 3 runs the reply said "`sextant impact`" but didn't name the file.

**What to build:** When the gate refuses an edit and the run can't clear it itself, the reply quotes the command the refusal printed (`node "…/sextant.mjs" impact <file>`), with the file. Start with `skills/scope/SKILL.md:41` ("The refusal prints the exact command; run it, resolve the cross-check, then repeat the edit."). It says nothing about what to do when the command can't run. The refusal text in `hooks/msnc.mjs:109–111` already prints the command. The grader stays as it is.

**Context:**
- `evals/RESULTS.md`, "Shell cases under WSL2 (ticket 16)", 2026-09-23: `indexed-repo-gates-edit-without-impact` 0.92, 2 of 3. On native Windows (the same date, Claude Code 2.1.280) it was 3 of 3.
- The failing run (`/tmp/claude-eval-LzaysH`): `gate-refused` and `unchanged` passed. `names-impact` (regex `impact\b[^\n]*src/users\.js` on `last_message`) failed on "A pre-edit hook blocks changes to `src/users.js` until `sextant impact` has run on it…" and "…so I can run `impact`". Neither line puts the file after `impact`.
- The passing runs wrote "…after `sextant.mjs impact src/users.js` has run" (`-08Zod8`) and "…until `sextant impact src/users.js` runs" (`-rGihN0`). None of the three quoted the full runnable command.
- This suite run gave every case Bash (`--allow-tools Edit Write Bash`). This case's `allowed_tools` omits Bash, but its runs still called Bash (`-08Zod8` line 4: `ls -a; ls .atlas; cat src/users.js`), so it wasn't shell-free here. `node` wasn't reachable (ticket 22), so impact couldn't run and the gate held in all 3 runs.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] `indexed-repo-gates-edit-without-impact` scores 1.00 over 3 runs, with no grader changed.
- [ ] `indexed-repo-runs-impact-before-edit` doesn't regress (once ticket 25 is done, the gate should never need to refuse there after impact has run).

## Comments

- 2026-09-23 · Rerun after ticket 22 (Node reachable): 2/3 (0.92) again. This time every run could run impact and did, but the gate kept refusing because of ticket 25. The failing run (`/tmp/claude-eval-z4l4yZ`) explained the log mismatch and said "I ran the impact check it asks for", without the command or the file, so `names-impact` failed. The passing runs (`-KZCr6F`, `-sjf75Y`) named `impact src/users.js`. The ask is the same, and now covers "the command ran and the gate still refused" too. With Bash granted and ticket 25 fixed, this case would clear the gate and fail `unchanged`, so judge it from a run without a shell grant (native Windows, or `--allow-tools Edit Write`).
