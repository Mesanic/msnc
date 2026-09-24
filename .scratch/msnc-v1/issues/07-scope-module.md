# 07: Scope module (sextant inside MSNC)

**What to build:** sextant inside MSNC:
- the engine (file graph, symbol graph, all seven grammars), copied from `Mesanic/sextant`
- a `scope` skill: model-invoked, short description, tells the model the CLI path and the core loop
- `/msnc:scope init`: a scan with no project hook and no routing block

First, prepare two fixes as a patch for `Mesanic/sextant`. Pushing the patch is rollout ticket 01. Then copy the fixed engine.
1. `impact` on a path known only to the file graph (CSS, HTML) answers from the file graph and records the impact entry, so the gate can clear.
2. A scan option that skips writing the CLAUDE.md routing block.

Then move the edit gate into the dispatcher:
- PreToolUse on Edit, Write, MultiEdit and NotebookEdit, and on Bash with `if` filters for writing commands (`sed -i`, `tee`, `cp`, `mv`, `rm` and similar)
- fast exit when there's no `.atlas/`
- honors the `scope_gate` option

Drop the grep nudge hook.

**Context:**
- Full v2 copy with the merge.mjs fix: `C:\Users\User\Desktop\AI Projects\Tool Comparison\tools\sextant\`
- Gate lookup code: `scripts\pre-edit-hook.mjs:90-99`. It checks `.atlas/graph/nodes.jsonl`, the file graph.
- The CSS/HTML dead-end write-up: `C:\Users\User\.claude\projects\C--Users-User-Desktop-AI-Projects-Hackathon\memory\sextant-supersedes-atlas-scalpel.md`
- Measured behavior: `C:\Users\User\Desktop\AI Projects\Tool Comparison\RESULTS.md`
- The hooks `if` field: https://code.claude.com/docs/en/hooks.md

**Blocked by:** 02, 03

**Status:** done

- [x] In a fixture repo, `sextant impact styles.css` clears the gate for that file.
- [x] In the same repo, editing a mapped `.ts` file without impact is refused with the exact command to run.
- [x] `/msnc:scope init` writes only `.atlas/`, `.map/` and one `.gitignore` line: no hooks and no CLAUDE.md block. (Met with three `.gitignore` lines; see Comments.)
- [x] sextant's own tests pass, plus a new CSS fallback test and `merge.test.mjs` on the fixture.
- [x] The two upstream fixes exist as a patch file ready for rollout ticket 01.

## Comments

- 2026-09-23 · Engine copied to `skills/scope/` from pinned `2fa30a3` + `patches/sextant/0001` (impact answers CSS/HTML from the file graph) and `0002` (`scan --no-claude-md`). The local sextant copy equals the pin, so the merge.mjs fix is already upstream; no third patch. 11.45 MB (wasm grammars 10.6 MB), Node built-ins only, no native binaries.
- The copy's `scan` always skips project hooks and the `CLAUDE.md` block (a two-line local change), so a bare `sextant scan` from any message or skill is safe. `/msnc:scope init` is a mode of the `scope` skill (`$ARGUMENTS` = `init`), not a separate skill.
- Init appends three `.gitignore` lines, not one: `.map/index/`, `.atlas/overlays/`, `.atlas/view/` (upstream's two inits). The test checks that only `.atlas/…`/`.map/…` entries are appended. `.atlas/graph` and `.map/ledger` stay tracked, as upstream.
- Ticket 05's reading confirmed: "index missing" = `.atlas/` absent while `.gitignore` lists `.atlas/…` entries; rescan = `/msnc:scope init` again (scan is the idempotent refresh). `skills/implement/SKILL.md` unchanged.
- Gate: deny via `hookSpecificOutput.permissionDecision`, exit 0. The refusal names `node "<plugin>/skills/scope/scripts/sextant.mjs" impact <path>`. Bash `if` filters: sed, perl, ruby, tee, cp, mv, install, rsync, rm, unlink, truncate, shred, dd. The atlas graph also maps docs (e.g. `CLAUDE.md`, `.gitignore`), so those are gated too; impact now clears them.
- `npm test` lists `test/*.test.mjs` and `skills/scope/scripts/impact-fallback.test.mjs` explicitly; `merge.test.mjs` runs from `test/scope.test.mjs` on the fixture. A bare `node --test` also finds `merge.test.mjs`, which prints `skip` without a root.
- Not verified in a live Claude Code session: that Claude Code honors the `if` filters from a plugin hooks.json and shows the deny reason.
