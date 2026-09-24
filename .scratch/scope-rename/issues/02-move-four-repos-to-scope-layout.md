# 02 — Move the four indexed repos to the `.scope/` layout

**Why:** Story: as someone working in Maji, Roundwell, Roundwell v2 and Hackathon, I want their indexes on the new layout with my notes intact, so that Scope keeps working there after the rename.

**What to build:** Each repo runs on MSNC's renamed Scope with its agent-written summaries, concept and note nodes, `relates` edges and hand-written `MAP.md` sections intact (a rescan would lose 288 agent nodes, 168 edges and 4 Orientation sections). Work on each repo's current branch: Maji `master`, Roundwell `phase-1-termination-reopen`, Roundwell v2 `main`, Hackathon `claude/audit-remediation`.

Per repo, in order:
1. **Ticket-04 commit:** commit rollout ticket 04's uncommitted changes (vendored sextant/atlas/scalpel folders removed, sextant hooks gone), and in the same commit remove the `<!-- atlas:begin -->` block from `CLAUDE.md` in Maji, Roundwell and Roundwell v2.
2. **Move commit:** `git mv` `.atlas/` → `.scope/files/` and `.map/` → `.scope/symbols/`, with `MAP.md` at `.scope/MAP.md`. Rewrite the `.atlas/**` ignore rule in the file-graph config to `.scope/**`, rewrite the `MAP.md` auto markers to the new `scope:auto:` form (so the next scan does not duplicate sections), replace the old `.gitignore` lines with the new ones, and track the symbol-graph config (Maji and Roundwell v2 had an untracked, hand-written one). Ignored data (overlays, view, symbol index) can be moved or left to rebuild.
3. **Push** to the current branch's remote. Roundwell v2 has no remote: commit only.
4. **Check:** a rescan shows 0 dead and keeps the agent-written counts, and `scope.mjs impact` on a mapped file lists its dependents and clears the edit gate.

Then close rollout ticket 04 (its progress commit is on MSNC's local branch `chore/rollout-04-done`): Map v2 is dropped because it is archived (`Mesanic/map-v2`); mark both boxes done. Tell the user the two backup folders (`~/.claude/backups/sextant-migration-2026-09-23/`, `~/.claude/backups/tool-comparison-engines-2026-09-24/`) can be deleted; the user deletes them.

**Blocked by:** 01 — Rename Scope inside MSNC (merged).

**Status:** done

- [x] Each of the four repos has a ticket-04 commit followed by a move commit on its current branch; the three with remotes are pushed.
- [x] No repo has an `.atlas/` or `.map/` folder, an `atlas:begin` block, or an ignore rule naming `.atlas`; `/msnc:doctor` reports no old Scope layout in any of them.
- [x] Agent-written node and `relates` edge counts after a rescan match the counts before the move.
- [x] `scope.mjs impact` works in each repo.
- [x] Rollout ticket 04 is marked done with Map v2 dropped, and the user has been told the backups can go.

## Comments

- 2026-09-24 · Per repo, on its current branch:

  | Repo | Ticket-04 commit | Move commit | Pushed |
  |---|---|---|---|
  | Maji (`master`) | `aba8ec5` | `04a28a9` | yes |
  | Roundwell (`phase-1-termination-reopen`) | `cc983b6` | `eacbe3a` | yes, no AI trailer (its `CLAUDE.md` forbids one) |
  | Roundwell v2 (`main`) | `38153be` | `087cda6` | local only |
  | Hackathon (`claude/audit-remediation`) | `5242c10` | `2c3e5e4` | yes |

- Agent-written nodes and `relates` edges are unchanged: Maji 29/11, Roundwell 104/105, Roundwell v2 149/52, Hackathon 6/0. `scope prune` dropped the dead `.map/` file nodes (the old file graph had indexed them), so 0 dead. No `.scope/` nodes are in any graph. Each `MAP.md` has one overview and one how-to section; the old "— atlas map" titles now read "— repo map", as the engine writes for new maps.
- The `atlas:begin` blocks were not deleted as first decided: they carried project rules. Each became a `## Scope records` section with the new command names (Roundwell keeps its founder-approval paragraph word for word); the routing lines went, since the Tuner owns routing.
- Checks with the installed plugin: the gate refuses an unchecked mapped file in each repo and clears after `scope impact` (Maji `maji/config.py` 10 direct, Roundwell `apps/api/src/app.ts` 2, Roundwell v2 `apps/engine/src/trpc.ts` 16, Hackathon `src/engine/cadence.ts` 10); doctor reports `Old Scope layout: none` in all four.
- The backups `~/.claude/backups/sextant-migration-2026-09-23/` and `~/.claude/backups/tool-comparison-engines-2026-09-24/` can now be deleted by the user.
