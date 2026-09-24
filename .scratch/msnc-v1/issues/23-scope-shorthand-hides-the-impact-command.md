# 23: Scope's `$S` shorthand becomes a shell variable that hides the impact command

**Why:** User stories 11 and 30. As a user, I want the impact check before an edit to be a plain, visible `sextant.mjs impact …` command, so that I (and the eval) can see it ran. Scope's skill writes its commands as `$S <command>`, and in 3 of 6 runs the model turned that into a real shell variable. One of those runs did run impact before the Edit and still scored 0 on `impact-before-edit`.

**What to build:** Change `skills/scope/SKILL.md` so a run calls sextant with the full path written out, `node "<skill dir>/scripts/sextant.mjs" impact <target>`, and not through a variable (`S=…; node "$S" …` or `eval $S …`). For example, drop the `$S` shorthand and write each command in full, or keep the table but say "type the full command; don't set a shell variable". Update the pin in `test/skills.test.mjs:232` (it asserts `$S <cmd>` for map, query, locate, impact, slice, check and scan) to match. The grader stays as it is.

**Context:**
- `evals/RESULTS.md`, "Shell cases under WSL2 (ticket 16)", 2026-09-23. `skills/scope/SKILL.md:12`: "Run every command as `node "${CLAUDE_SKILL_DIR}/scripts/sextant.mjs" <command>` from the repo root, written `$S <command>` below."
- `indexed-repo-runs-impact-before-edit` run 3 (`/tmp/claude-eval-ViETGz`, score 0.00): trace line 12 is the Bash call `S="/mnt/c/…/skills/scope/scripts/sextant.mjs"; node "$S" impact createUser 2>&1 | grep -v bashrc`, before the Edit at line 19. The `impact-before-edit` grader (`input_match: 'sextant\.mjs\S*\s+impact'`) can't see the path next to `impact`, so it reported `"before" tool Bash never called`. Bash was called and not denied; the grader's wording means no Bash call matched.
- Runs 1 and 2 (`-mtJ4Cl`, `-zRtuaW`) wrote `node "/mnt/c/…/sextant.mjs" impact createUser` and passed `impact-before-edit` (Bash@2 before Edit@4, Bash@4 before Edit@6). In `indexed-repo-gates-edit-without-impact`, 2 of 3 runs used the variable form too (`-08Zod8`: `S="node '…/sextant.mjs'"; eval $S impact createUser`; `-rGihN0`: the same).
- `node` wasn't reachable in that sandbox (ticket 22), so no impact run succeeded. That caused `lower-cased` to fail, not this ticket.

**Blocked by:** None — can start immediately (ticket 22 is needed to see the case pass end to end)

**Status:** done

- [x] `skills/scope/SKILL.md` no longer leads runs to call sextant through a shell variable, and `npm test` and `npm run check` pass.
- [x] With ticket 22 done, `indexed-repo-runs-impact-before-edit` passes `impact-before-edit` in 3 of 3 runs, with the grader unchanged.

## Comments

- 2026-09-23 · Rerun after ticket 22 (Node reachable): `impact-before-edit` passed 3/3 without this change (Bash@4 before Edit@7, Bash@2 before Edit@4, Bash@4 before Edit@7). Each run's first impact call wrote the path out in full. The variable form still showed up in later calls: `S="…/sextant.mjs"; node "$S" status` (`/tmp/claude-eval-sK45ek` line 29, `-qz4kib` line 36), and `S=…; node "$S" impact src/users.js …` in the gate case (`-sjf75Y` line 22). So the risk stands: it now bit 1 run in 6 on the graded call. Box 2 was met once by chance and stays open until it holds with the change in.
- 2026-09-23 · Change in: `skills/scope/SKILL.md` drops the `$S` shorthand, writes each command as `node "${CLAUDE_SKILL_DIR}/scripts/sextant.mjs" <command>` and says "Type the full command; don't set a shell variable for the path". The pin in `test/skills.test.mjs` now asserts the full form for map, query, locate, impact, slice, check and scan, no `$S`, and that sentence. `npm test` 109/109, `npm run check` 0 failed. WSL2 rerun (`evals/results/2026-09-24T03-41-48-227Z`, first wording): `impact-before-edit` 3/3 (Bash@2 before Edit@4, Bash@3 before Edit@6, Bash@2 before Edit@4), grader unchanged. All 12 sextant calls across the 3 traces wrote the path out in full, no `S=`/`$S`/`eval`. `lower-cased` still fails in every run (ticket 25). Left open: `.atlas/MAP.md`'s how-to, printed by `sextant map`, still teaches `S="tools/sextant/scripts/sextant.mjs"` / `node $S impact …` (`skills/scope/engine/atlas/scripts/lib/scan.mjs:694-701`, vendored engine). No run called `map` here. See `evals/RESULTS.md`, "Rerun: indexed-repo-runs-impact-before-edit (ticket 23)".
