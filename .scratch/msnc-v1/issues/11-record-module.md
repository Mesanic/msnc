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

**Status:** done

- [x] In a fixture session, `/msnc:record` produces a recipe with why, when to use, steps and done-check, as a typed-only skill, and writes nothing before a yes.
- [x] `/msnc:refine` proposes exactly one change with its evidence, both with and without context-mode installed.
- [x] A `node:test` case shows notes returned next to the result after a `Skill` call, and no output when no notes exist.
- [x] `/msnc:doctor` lists recipes unused for 30 days and the most-corrected ones.

## Comments

- 2026-09-23 · Also registered `UserPromptExpansion` (beyond PostToolUse `Skill`) · typing `/name` skips the Skill tool, and recipes are typed-only, so notes would never appear otherwise · drop the hooks.json entry and dispatcher case to reverse.
- Note files: `plugin:skill` → `notes/<plugin>/<skill>.md` (`:` is invalid on Windows); plain skills → `notes/<skill>.md`. Project notes first, then personal.
- doctor: a recipe is a skill with `disable-model-invocation: true` in project or personal `.claude/skills`; use and corrections come from all projects' transcripts changed in the last 30 days (via `skills/refine/corrections.mjs`); unused = no use and no `SKILL.md` change in 30 days. doctor now takes ~1.3 s here.
- Credit links https://processdriven.co (from its About page), with the ® notice and "not affiliated with or endorsed by".
- Open: `corrections.mjs` ignores `CLAUDE_CONFIG_DIR`; any typed command (even `/model`) counts as a skill use; eval transcripts are hand-built. The context-mode path of refine is covered by a wording test only. Evals written in `evals/`, not run (ticket 09).
