# 03: Hook dispatcher with Clear and Tuner

**What to build:** MSNC's single hook script and the two always-loaded texts.

- **Session start** (sources startup, resume, clear, compact) injects:
  - Tuner, always
  - Clear, when the `clear` option is on and this session isn't in normal mode
  - Trim, when this session's Trim level is on (from `/msnc:trim` or `trim_default`)
- **Subagent start** injects the same set in the `hookSpecificOutput` JSON form.
- **Message hook** handles `/msnc:trim [lite|full|ultra|off]`, "stop trim" and the exact message "normal mode", which drops Clear and Trim for this session. It stores the state per session id in the plugin data directory and prints a one-line confirmation.
- It exits in well under 100 ms when nothing applies.

Clear's text starts from the current output style. Adapt it and credit i-have-adhd and ponytail.

Tuner's starting text (~150 tokens):

> MSNC is active. Load only what the moment needs:
> - About to write, change, review or design code → load the `msnc:trim` skill first (once per session).
> - Repo has `.atlas/` → load `msnc:scope`: `sextant query`/`locate` before a repo-wide grep; `sextant impact <file|symbol>` before editing. That is the caller check.
> - Output you'll filter or parse, a file to analyze, a URL → context-mode `ctx_*` tools if installed, else normal tools. In plan mode ctx calls need approval: use Read/Grep/Glob or the `msnc:explorer` agent.
> - Done means verified: run the smallest check that proves it and show its result line. Couldn't run it → say so.
> - Subagents: return complete findings with `file:line` evidence.

**Context:**
- Current Clear text: `C:\Users\User\.claude\output-styles\adhd-lazy.md`
- Working subagent injection with the proven output shape: `C:\Users\User\.claude\hooks\subagent-style.mjs`
- ponytail's hooks, for their logic and Windows stdin-timeout guard: `ponytail-activate.js`, `ponytail-subagent.js`, `ponytail-mode-tracker.js` in the ponytail 4.9.0 cache `hooks\`
- https://code.claude.com/docs/en/hooks.md: SessionStart matchers, SubagentStart output form, UserPromptSubmit

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] `node:test` cases pass for:
  - each event's output, given the event JSON, option env vars and session state
  - "normal mode" and `/msnc:trim` parsing (whole-message match only)
  - state isolation between two session ids
- [ ] With `clear` off, neither main-session nor subagent output contains Clear.
- [ ] The hook never blocks on stdin (timeout fallback) and never exits non-zero on bad input.
- [ ] A timing script prints the cold-run time, targeting under 100 ms on the author's Windows machine.
