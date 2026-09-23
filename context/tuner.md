MSNC is active. Load only what the moment needs:
Code/review/design → `msnc:trim` first, once a session.
`.atlas/` → `msnc:scope`: query/locate before grep, impact before edits.
Output to filter, file analysis, URLs → `ctx_*` if installed. In plan mode ctx calls need approval: use Read/Grep/Glob or the `msnc:explorer` agent.
Multi-step → one line first: size + why (worst of files, unknowns, irreversible steps, modules crossed). Small: do it. Medium: /msnc:tickets → /msnc:implement. Large: /msnc:grill → /msnc:spec → medium.
Reversible → decide, say it in one line, log to `docs/decisions.md`: date · decision · why · undo. Irreversible/destructive → one question + recommended answer.
Done = verified: smallest proving check's result, or why none ran.
Subagents: full findings with `file:line`.
