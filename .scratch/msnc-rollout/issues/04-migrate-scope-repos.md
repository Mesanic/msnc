# 04: Move the five Scope repos onto Scope

**What to build:** Maji, Roundwell, Roundwell v2, Map v2 and Hackathon use MSNC's Scope instead of per-repo Scope copies. In each repo:
- remove the vendored `scope`, `atlas` and `scalpel` skill folders
- remove Scope's project hooks and the `<!-- scope:begin -->` block in `CLAUDE.md`
- run `/msnc:scope init` twice, which fully clears old skill nodes
- keep the `.atlas/` and `.map/` data

Hackathon keeps its local ECC install. Its `SCOPE_HOOK=off` allow rule can go once the CSS/HTML fix is in.

**Blocked by:** 02

**Status:** done

- [x] `scope impact` works in each repo through MSNC.
- [x] No repo still contains a copied Scope engine or Scope hook entries.

## Comments

- 2026-09-23 · Everything was moved, not deleted, to `~/.claude/backups/scope-migration-2026-09-23/<repo>/` (relative paths mirrored, with pre-edit copies of every `settings*.json` and `CLAUDE.md` touched). Nothing committed in the five repos; all changes are left uncommitted.
- **Maji**, **Roundwell**, **Roundwell v2**: moved `.claude/skills/{scope,atlas,scalpel}`. `.claude/settings.json` held only the dead SessionStart hook (`~/.claude/skills/atlas/scripts/session-hook.mjs`), so it is now `{}`. The `CLAUDE.md` Scope block is gone (the `<!-- atlas:begin -->` block stays), so `CLAUDE.md` matches HEAD again. Roundwell v2's `roundwell-design` skill and its `impeccable` hooks in `settings.local.json` are untouched. `impact maji/config.py` lists 10 direct importers; `impact decide` (Roundwell) and `impact apps/engine/src/trpc.ts` (Roundwell v2, 16 direct) work too.
- **Hackathon** (`claude/audit-remediation`): moved the tracked `.claude/skills/scope` (80 files, left as an uncommitted deletion). `settings.json` lost its three Scope hooks and is now `{}`. `settings.local.json` lost the `SCOPE_HOOK=off sed -i` allow rule and its now-empty `permissions` key, while ECC's `enabledPlugins` stays. The whole of `CLAUDE.md` was the Scope block, so it is now an empty file. `impact src/engine/cadence.ts` lists 10 direct dependents.
- **Map v2**: moved `.claude/skills/atlas`. There was no `.claude/skills/scalpel` and no `.claude/settings*.json`. The `CLAUDE.md` Scope block is gone. `skills/scope/` stays: it is a pre-release prototype, not a Scope version. `merge.mjs` is byte-identical to every commit, but `scope.mjs` (431 lines vs 568 at `cde84ba`) still differs by 273 lines at the initial commit even ignoring whitespace, and `SKILL.md` by 388. `skills/scalpel/` (the repo's own source) is untouched.
- Scans: `scope scan` ran twice per repo. The second run showed 0 dead everywhere and 0 changed in all but Roundwell, which keeps reporting 9 changed: those are 9 stale summaries that `scope verify` should clear. No scan wrote a `CLAUDE.md` block or project hooks, and `grep -rn "scope\|atlas/scripts\|scalpel" .claude/settings*.json` finds nothing in any repo.
- **Box 1 left open because of Map v2.** Scope skips any folder that holds a `SKILL.md` (`engine/atlas/scripts/lib/scan.mjs` `skillTreeMatcher`, `engine/scalpel/scripts/lib/walk.mjs:119`). Map v2's product *is* `skills/scalpel/`, so its symbol graph is empty (0 files) and its file graph only sees `.superpowers/sdd` and `.map/index`. `impact` runs through MSNC but has no code to answer about (`no symbol named "skills/scalpel/scripts/lib/walk.mjs"`). Before this passes, Scope needs a way to index a repo whose own source is a skill folder.
- Left: the `atlas` blocks in the `CLAUDE.md` files still point at the removed `atlas` skill. MSNC's generated `.atlas/MAP.md` howto still says `tools/scope/scripts/scope.mjs  # or .claude/skills/scope/...`. The empty `.claude/skills/` folders were left in place.
- 2026-09-24 · Done, with Map v2 dropped: it was archived as `Mesanic/map-v2`. Each of the other four repos got a commit for this ticket (Maji `aba8ec5`, Roundwell `cc983b6`, Roundwell v2 `38153be`, Hackathon `5242c10`), then the Scope rename's move to `.scope/` (scope-rename ticket 02). The `atlas:begin` blocks became `## Scope records` sections that keep the project rules they carried. `scope impact` works and the edit gate refuses and then clears in all four.
