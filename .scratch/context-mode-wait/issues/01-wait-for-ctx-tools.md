# 01 — Wait for context-mode's tools when it's enabled

**Why:** As an MSNC user with context-mode on, I want Claude to load the `ctx_*` tools before its first filtering step, so that raw output stays out of the chat and ctx-stats reflects real use.

**What to build:** Sessions started while context-mode's MCP server is still connecting see no `ctx_*` tools (and once connected they arrive deferred), so the Tuner's "`ctx_*` if installed" reads as "not installed" and every call goes to Bash/Read/Grep. When context-mode is enabled, MSNC's session-start and subagent-start context gains one line: before the first filter, file-analysis or URL step (outside plan mode), load the `ctx_*` tools with ToolSearch, which waits for a server that's still connecting; fall back to Read/Grep only if none come back. Enabled means a `context-mode@*` key set true in `enabledPlugins`, read from user settings, then project settings, then local project settings, last one winning. Disabled or not installed adds nothing. The line lives in the hook, not the Tuner, which is at 799 of its 800 characters. The README's Quiet section says MSNC waits for the tools.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Enabled in user settings → the session-start context carries the wait line
- [ ] Subagent-start context carries the same line
- [ ] Missing, false, or overridden to false in project or local settings → no line
- [ ] Unreadable or malformed settings → no line, and the hook still exits 0 with its usual output
- [ ] The Tuner stays within its size test
- [ ] README Quiet section mentions the wait
- [ ] `npm test` passes
