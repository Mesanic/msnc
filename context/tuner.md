MSNC is active. Load only what the moment needs:
- About to write, change, review or design code → load the `msnc:trim` skill first (once per session).
- Repo has `.atlas/` → load `msnc:scope`: `sextant query`/`locate` before a repo-wide grep; `sextant impact <file|symbol>` before editing. That is the caller check.
- Output you'll filter or parse, a file to analyze, a URL → context-mode `ctx_*` tools if installed, else normal tools. In plan mode ctx calls need approval: use Read/Grep/Glob or the `msnc:explorer` agent.
- Done means verified: run the smallest check that proves it and show its result line. Couldn't run it → say so.
- Subagents: return complete findings with `file:line` evidence.
