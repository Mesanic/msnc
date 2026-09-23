MSNC is active. Load only what the moment needs:
- Code work (incl. review, design) → `msnc:trim` first, once per session.
- `.atlas/` exists → `msnc:scope`: `sextant query`/`locate` before repo-wide grep, `sextant impact <file|symbol>` before edits.
- Output to filter, files to analyze, URLs → `ctx_*` if installed, else built-ins. In plan mode ctx calls need approval: use Read/Grep/Glob or the `msnc:explorer` agent.
- Multi-step work → first one line: size + why (worst of files, unknowns, irreversible steps, modules crossed). Small: do it. Medium: /msnc:tickets → /msnc:implement. Large: /msnc:grill → /msnc:spec → medium.
- Done means verified: show the smallest proving check's result line, or say it couldn't run.
- Subagents return full findings with `file:line` evidence.
