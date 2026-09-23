---
name: refine
description: Turn recent corrections, failed checks and rejected approaches into recipe fixes, one change at a time, each shown as a diff with its evidence and applied only after a yes.
argument-hint: "[skill name] [days]"
disable-model-invocation: true
---

# Refine

Each correction should improve the system once instead of being repeated. Refine finds what the user had to correct, and proposes the recipe change that would have prevented it.

Refine's principles are inspired by ProcessDriven; see Credit at the end.

## 1. Gather candidates

A candidate is a correction the user typed, a tool call they rejected (with what they said), or a failed check (a command that exited non-zero). Window: `$ARGUMENTS` days if given, else 30.

- **context-mode installed** (the `ctx_search` tool exists): one `ctx_search` call with `sort: "timeline"` and queries such as `["correction", "rejected approach", "failed check", "error", "decision"]`. Its session memory holds errors, rejected approaches and decisions across sessions. In plan mode this call needs approval; ask once.
- **Otherwise**: run this from the repo root. It reads this project's Claude Code transcripts (`~/.claude/projects/<project>/*.jsonl`) and prints one line per candidate: when, kind, the skill used last before it, and the quote.

  ```bash
  node "${CLAUDE_SKILL_DIR}/corrections.mjs" 30
  ```

Also count corrections in the current conversation.

No candidates → say "Nothing to refine in the last <N> days." and stop.

## 2. Pick one recipe

- `$ARGUMENTS` names a skill → refine that one only.
- Otherwise group the candidates by the skill they followed and take the skill with the most; on a tie, the most recent. Candidates tied to no skill can still point at one (the user says "the deploy steps are wrong") → group them there; if none fits, list them in one line and stop, suggesting `/msnc:record` for a new recipe.

Find where the skill lives:

- The user's own: `.claude/skills/<name>/SKILL.md` in this project or `~/.claude/skills/<name>/SKILL.md`. The fix edits that file.
- Not the user's own: a plugin's skill (a namespaced name such as `msnc:trim`, MSNC's included). Read it to understand it, never edit it. The fix goes into a recipe note instead: project `.claude/msnc/notes/<plugin>/<skill>.md` (shared through git), or on request personal `~/.claude/msnc/notes/<plugin>/<skill>.md`. The name maps as `plugin:skill` → `<plugin>/<skill>.md`, so `msnc:trim` → `.claude/msnc/notes/msnc/trim.md`. A skill without a plugin maps to `<skill>.md`. MSNC's hook adds these notes next to the skill every time it loads, so the fix applies without a fork.

## 3. Propose exactly one change

The smallest edit that would have prevented the most frequent correction: a new or changed step, a line in the done-check, or a "Not for" line in when-to-use. One change, never a rewrite.

Show:

1. **Evidence**: each candidate it answers, quoted, with the kind (correction, rejected, failed check) and when it happened (timestamp or "this session").
2. **Change** as a diff against the file it touches (the SKILL.md, or the note file, new or existing):

   ```diff
   ## Steps
   -3. Push the branch.
   +3. Run `npm test`; stop if it fails.
   +4. Push the branch.
   ```

3. One question: "Apply this change? (yes / no)".

## 4. Apply only after a yes

Apply it only after a yes: edit exactly what the diff shows (for a note, create the folder and file if needed and append; never remove another note). Anything but yes → change nothing.

Then offer the next candidate the same way, one change per question, until the user stops or none are left. Close with one line: how many changes were applied, and to which files.

## Credit

Refine, and `/msnc:record` beside it, follow principles inspired by [ProcessDriven](https://processdriven.co) by Layla Pomper. ProcessDriven® is a registered trademark. MSNC is not affiliated with or endorsed by ProcessDriven or Layla Pomper, and copies none of its templates or course material.
