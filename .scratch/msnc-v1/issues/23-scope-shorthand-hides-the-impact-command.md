# 23: Scope's `$S` shorthand becomes a shell variable that hides the impact command

**Why:** User stories 11 and 30. As a user, I want the impact check before an edit to be a plain, visible `sextant.mjs impact …` command, so that I (and the eval) can see it ran. Scope's skill writes its commands as `$S <command>`, and in 3 of 6 runs the model turned that into a real shell variable. One of those runs did run impact before the Edit and still scored 0 on `impact-before-edit`.

**What to build:** Change `skills/scope/SKILL.md` so a run calls sextant with the full path written out, `node "<skill dir>/scripts/sextant.mjs" impact <target>`, and not through a variable (`S=…; node "$S" …` or `eval $S …`). For example, drop the `$S` shorthand and write each command in full, or keep the table but say "type the full command; don't set a shell variable". Update the pin in `test/skills.test.mjs:232` (it asserts `$S <cmd>` for map, query, locate, impact, slice, check and scan) to match. The grader stays as it is.

**Context:**
- `evals/RESULTS.md`, "Shell cases under WSL2 (ticket 16)", 2026-09-23. `skills/scope/SKILL.md:12`: "Run every command as `node "${CLAUDE_SKILL_DIR}/scripts/sextant.mjs" <command>` from the repo root, written `$S <command>` below."
- `indexed-repo-runs-impact-before-edit` run 3 (`/tmp/claude-eval-ViETGz`, score 0.00): trace line 12 is the Bash call `S="/mnt/c/…/skills/scope/scripts/sextant.mjs"; node "$S" impact createUser 2>&1 | grep -v bashrc`, before the Edit at line 19. The `impact-before-edit` grader (`input_match: 'sextant\.mjs\S*\s+impact'`) can't see the path next to `impact`, so it reported `"before" tool Bash never called`. Bash was called and not denied; the grader's wording means no Bash call matched.
- Runs 1 and 2 (`-mtJ4Cl`, `-zRtuaW`) wrote `node "/mnt/c/…/sextant.mjs" impact createUser` and passed `impact-before-edit` (Bash@2 before Edit@4, Bash@4 before Edit@6). In `indexed-repo-gates-edit-without-impact`, 2 of 3 runs used the variable form too (`-08Zod8`: `S="node '…/sextant.mjs'"; eval $S impact createUser`; `-rGihN0`: the same).
- `node` wasn't reachable in that sandbox (ticket 22), so no impact run succeeded. That caused `lower-cased` to fail, not this ticket.

**Blocked by:** None — can start immediately (ticket 22 is needed to see the case pass end to end)

**Status:** ready-for-agent

- [ ] `skills/scope/SKILL.md` no longer leads runs to call sextant through a shell variable, and `npm test` and `npm run check` pass.
- [ ] With ticket 22 done, `indexed-repo-runs-impact-before-edit` passes `impact-before-edit` in 3 of 3 runs, with the grader unchanged.
