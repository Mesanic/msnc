---
name: implement
description: Work a feature's tickets one at a time, one foreground subagent per ticket, each verified and committed before the next. Run after /msnc:tickets.
argument-hint: "Feature slug or ticket numbers (default: every ready ticket); pace <n> sets the stop interval"
disable-model-invocation: true
---

Work the tickets that `/msnc:tickets` published, **one at a time**, until none are left or a stop condition hits. You pick, brief, verify and commit; subagents write the code. If the user named a feature or tickets, work only those.

Every stop below ends the run with one message saying why and what the user can do. Never hang: run commands non-interactively, and never wait on a prompt, an editor or a pager.

## 1. Start check

- Plan mode → stop: this skill edits files.
- Not inside a git repo (`git rev-parse --is-inside-work-tree` fails) → stop: say `/msnc:implement` commits once per ticket, so it needs a git repo; run `git init` and commit first.
- Uncommitted changes (`(cd "$(git rev-parse --show-toplevel)" && git status --porcelain -uall | while read -r s p; do [ "$s" = '??' ] && [ -c "$p" ] || echo "$s $p"; done)` prints anything) → stop and ask the user to commit or stash. The Bash sandbox's stubs (untracked character devices such as `.bashrc`, `.mcp.json`, `.claude/settings.json`) don't count and are never staged: stage by name, never `git add -A`. On the default branch → create `feature/<slug>`.
- Find the tickets through `docs/agents/issue-tracker.md`. Local tracker (the default when that file is missing): `.scratch/<feature>/issues/NN-*.md`. GitHub: open issues labelled `ready-for-agent`.
- Find the typecheck and test commands (`package.json`, `pyproject.toml`, `Makefile`, the repo's `CLAUDE.md`). None found → ask.
- Scope index: the repo uses Scope when `.scope/` exists or `.gitignore` lists `.scope/…` entries. `.gitignore` lists `.scope/…` entries but `.scope/` is missing → run `/msnc:scope init`, then commit its output alone as `chore: build Scope index` (`git add .scope .gitignore`), so the tree is clean before the first ticket. Neither → leave Scope alone: no init, no index.
- Run the test suite once. Failing before you start → stop and report it as below (section 3); never build on a red baseline.

## 2. Loop, one ticket at a time

1. Pick the next ticket on the frontier: the lowest-numbered one whose "Blocked by" tickets are all done. A ticket is done once its commit is on this branch. No Why line (older tickets) → derive it from the user story the ticket or its spec links, else from its What to build, and add it to the ticket as `**Why:** … (derived)` in that ticket's commit.
2. Run ONE `msnc:implementer` subagent in the foreground (never two at once, never in the background). The agent carries the per-ticket rules (Trim, test-first, impact before edits, checks after every change, no commits, the report); brief it with:
   > Implement ticket `<path or #N>`. Outcome: <its What to build, one line>. Why: <its Why line>. Recipe: <path to the matching recipe's SKILL.md, or none>. Done-check: its acceptance boxes, typecheck `<typecheck>`, tests `<test command>`.

   A recipe is a skill `/msnc:record` wrote (project `.claude/skills/` or personal `~/.claude/skills/`) whose **When to use:** fits the ticket.
3. Verify it yourself: rerun the typecheck and that ticket's tests. With a Scope index, those are the covering tests `scope impact` named, plus `scope check`. Don't trust the report alone.
4. Checks fail → brief one fresh subagent with the same brief plus the failure output. Fails again → stop (section 3).
5. Record the decisions the subagent reported: one line each in that ticket's `## Comments` (added if missing; local file, or a comment on the GitHub issue) and appended to `docs/decisions.md` (created if missing), as `date · decision · why · undo`.
6. With a Scope index, rescan (`/msnc:scope init` again) so the next ticket's impact is current.
7. Commit this ticket alone: stage the files the subagent reported plus `docs/decisions.md`, and with a Scope index stage the rescan's `.scope/` changes too (`git add .scope` takes only what `.gitignore` leaves tracked), so the tree is clean after the commit (other stray changes in `git status` → ask; sandbox stubs don't count), message `<feat|fix|refactor>: <ticket title>`, then a body line `Why: <the ticket's Why line>`, plus `Closes #N` for GitHub tickets. Local tickets: set `**Status:** done`, tick the acceptance boxes and add the comments in the same commit. Never close or edit a parent issue.
8. Tell the user one line, the state line: `Ticket 3 of 7 done: <title>. Next: <title>.`
9. Pace is `${user_config.pace}` (the `/config` option); `pace <n>` in the arguments overrides it for this run. 0 → never offer a stop; not a whole number → 3. After every `pace` tickets done in this run, and another ticket is left, offer a stop: add `Stop here? A handoff keeps your place. (stop / go on)` under the state line and end the turn. Go on → next ticket. Stop → write the handoff by following `${CLAUDE_SKILL_DIR}/../handoff/SKILL.md` (typed-only: read it, don't invoke it), focused on continuing `/msnc:implement` at the next ticket, then show the state line and the handoff's path. The run ends there.

## 3. Stop and ask when

- A ticket's checks fail after the retry.
- A ticket needs an irreversible or destructive decision it doesn't make, or depends on something outside the repo.
- Every remaining ticket is blocked.

Say which ticket and the one decision you need, with your recommended answer. Report a failure (a red baseline, checks still failing after the retry) in three parts:

- **Cause**: what failed and why, with `file:line`, expected vs got.
- **Fix**: what makes it pass; your recommended answer when it needs a decision.
- **Prevention**: the recipe change that stops a repeat by guarding what let the failure in (such as running the tests before committing), not a better stop report, as one line to propose through `/msnc:refine <recipe>` (the ticket's recipe, else `msnc:implement`), which lands as a recipe edit or a recipe note. Proposed, not applied.

Say what happened, not who did it.

## 4. Finish

Run the full test suite once, then the built-in `/code-review` on the branch; fix what it raises with one more subagent. Report what now works, list the commits, and suggest `/msnc:verify` before opening the PR.
