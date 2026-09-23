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

**Status:** ready-for-agent

- [ ] In a fixture repo, `sextant impact styles.css` clears the gate for that file.
- [ ] In the same repo, editing a mapped `.ts` file without impact is refused with the exact command to run.
- [ ] `/msnc:scope init` writes only `.atlas/`, `.map/` and one `.gitignore` line: no hooks and no CLAUDE.md block.
- [ ] sextant's own tests pass, plus a new CSS fallback test and `merge.test.mjs` on the fixture.
- [ ] The two upstream fixes exist as a patch file ready for rollout ticket 01.
