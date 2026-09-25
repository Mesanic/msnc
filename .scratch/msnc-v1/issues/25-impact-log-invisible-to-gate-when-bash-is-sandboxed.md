# 25: The Scope gate never sees an impact check run in sandboxed Bash

**Why:** User stories 11 and 12. As a user whose Bash runs in Claude Code's sandbox, I want an impact check to clear the gate for that file, so that an edit to a mapped file isn't refused forever. Right now `scope impact` runs, but the gate keeps saying "no impact check has run", and every edit to a mapped file dead-ends.

**What to build:** Make `scope impact` (run through Bash) and the pre-edit gate (`hooks/msnc.mjs`, run by Claude Code outside the sandbox) agree on where the impact log lives. Both call `impactLogPath(root)` in `skills/scope/scripts/impact-log.mjs`, which builds the path from `os.tmpdir()`. Inside the sandbox, `os.tmpdir()` is the sandbox's own `$TMPDIR`, so the two processes read and write different files. Options, to be decided in the ticket:
- a location both processes share and the sandbox lets Bash write to, derived from the repo root rather than `os.tmpdir()` (the file's header explains why it avoids the repo: an accidental commit), or
- the gate also reads the log from where sandboxed Bash writes it.
Keep the 2-hour TTL, and keep blocking when no log is found. Add a test with two different temp dirs for writer and reader.

**Context:**
- `evals/RESULTS.md`, "Rerun after Node in the sandbox (ticket 22)", 2026-09-23, Claude Code 2.1.281 on WSL2 Ubuntu 24.04.
- `indexed-repo-runs-impact-before-edit`, all 3 runs (`/tmp/claude-eval-KDVRYl`, `-sK45ek`, `-qz4kib`): `node …/scope.mjs impact createUser` and then the gate's own `impact src/users.js` both ran and printed "cross-check: clean", then the Edit was refused again ("src/users.js is in the code map and no impact check has run"). 2 refused Edits per run, so `lower-cased` failed 3/3.
- The log was written, just not where the gate looks. `KDVRYl` has `sealed/tmp/claude-1000/scope-impact-bfd642e05757.log` with 2 lines `… src/users.js`, and the other two runs have the same. Inside the sandbox, `echo $TMPDIR` printed `/tmp/claude-eval-KDVRYl/tmp/claude-1000` (trace line 48). There was no `scope-impact-*` log in the host's `/tmp`.
- `indexed-repo-gates-edit-without-impact` hit the same wall in all 3 runs (`-KZCr6F`, `-z4l4yZ`, `-sjf75Y`): with Node reachable and Bash granted, each ran impact, and the gate still refused. Three runs across the two cases diagnosed it themselves (`-KDVRYl`, `-qz4kib`, `-z4l4yZ`), for example: "the impact check and the gate look for the log file in different places" (`-z4l4yZ`).
- Once this is fixed, a Bash-granted gate-case run can clear the gate and make the edit, so its `unchanged` grader would fail. That case only means something without a shell: run it on its own, without `Bash` in `--allow-tools`, or on native Windows.
- Probably not eval-only. Claude Code's Bash sandbox gives commands their own `TMPDIR` (`/tmp/claude-<uid>` here), and hooks run outside it, so any session with the Bash sandbox on should hit this. Not yet checked outside an eval. On native Windows there's no sandbox, so the paths agree there.

**Blocked by:** None — can start immediately

**Status:** done

- [x] With the Bash sandbox on, running the command the gate prints clears the gate for that file (shown by a test, and by `indexed-repo-runs-impact-before-edit` passing `lower-cased` in 3 of 3 runs under WSL2).
- [x] With no impact run, the gate still refuses: a test, plus `indexed-repo-gates-edit-without-impact` run without a shell grant still passing `gate-refused` and `unchanged`. No grader or threshold changed.
- [x] `npm test` and `npm run check` pass.

## Comments

- 2026-09-23 · Implemented. **Decision:** the log moves to `<repo>/.atlas/overlays/impact.log`, because the working tree is the one place that sandboxed Bash can write and the hook can read. `.atlas/overlays/` is already machine state (`git.json`), and every scan re-adds it to `.gitignore`, so it isn't committed by accident. It also works with no `.git` at all, with worktrees and on native Windows, which `.git/` wouldn't. `recordImpact` creates `overlays/` when a fresh clone lacks it. TTL (2 h) unchanged; no log still blocks. Recorded upstream-side as `patches/scope/0003-*.patch`. Test: `test/scope.test.mjs` (impact and gate with different temp dirs; red before, green after). WSL2 `indexed-repo-runs-impact-before-edit`: `lower-cased` 3/3 twice (6/6), `impact-before-edit` 2/3 then 3/3; the miss skipped `msnc:scope`, got refused, ran the printed command, and then the gate cleared. Native Windows `indexed-repo-gates-edit-without-impact`, no shell: 3/3, all graders. `npm test` 111/111, `npm run check` 0 failed. Real (non-eval) sandboxed sessions not checked. Details: `evals/RESULTS.md`, "Rerun: … (ticket 25)".
