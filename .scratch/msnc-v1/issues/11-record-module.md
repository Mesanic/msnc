# 11: Record module (recipes, refine, recipe notes)

**Why:** User stories 32–34. Good work should become repeatable, and each correction should improve the system once instead of being repeated. (Principles inspired by ProcessDriven, Layla Pomper.)

**What to build:**
- **`/msnc:record`** (typed-only). From the current session, it drafts a recipe: a typed-only skill stating its why, when to use it, the steps (one path to one outcome) and a done-check. It shows the draft and waits for a yes. It saves to the project's `.claude/skills/<name>/` (shared through git) or, on request, to `~/.claude/skills/<name>/`.
- **`/msnc:refine`** (typed-only). It gathers recent corrections, failed checks and rejected approaches. The source is context-mode's session memory when installed, otherwise the project's transcript files. It proposes one recipe change at a time, as a diff, with the evidence (the quoted correction and when it happened), and applies it after a yes.
- **Recipe notes.** The dispatcher handles PostToolUse for the `Skill` tool. When notes exist for the skill that just loaded, it adds them next to the result: project notes in `.claude/msnc/notes/<skill>.md` and personal notes in `~/.claude/msnc/notes/<skill>.md`. This lets anyone improve a recipe they don't own, MSNC's included. `/msnc:refine` writes a note instead of editing when the skill isn't the user's own.
- **Recipe use in `/msnc:doctor`:** recipes unused for 30 days, and the most-corrected ones.

Credit ProcessDriven as "principles inspired by ProcessDriven by Layla Pomper", with a link. Copy none of her templates or course material.

**Context:**
- Spec sections "Record" and "ProcessDriven credit".
- Hook placement of PostToolUse context: https://code.claude.com/docs/en/hooks.md
- context-mode's `ctx_search` with `sort: "timeline"` returns errors, rejected approaches and decisions.

**Blocked by:** 03, 06

**Status:** ready-for-agent

- [ ] In a fixture session, `/msnc:record` produces a recipe with why, when to use, steps and done-check, as a typed-only skill, and writes nothing before a yes.
- [ ] `/msnc:refine` proposes exactly one change with its evidence, both with and without context-mode installed.
- [ ] A `node:test` case shows notes returned next to the result after a `Skill` call, and no output when no notes exist.
- [ ] `/msnc:doctor` lists recipes unused for 30 days and the most-corrected ones.
