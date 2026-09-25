# 01 — Wait for context-mode's tools when it's enabled

**Why:** As an MSNC user with context-mode on, I want Claude to load the `ctx_*` tools before its first filtering step, so that raw output stays out of the chat and ctx-stats reflects real use.

**What to build:** Sessions started while context-mode's MCP server is still connecting see no `ctx_*` tools (and once connected they arrive deferred), so the Tuner's "`ctx_*` if installed" reads as "not installed" and every call goes to Bash/Read/Grep. When context-mode is enabled, MSNC's session-start and subagent-start context gains one line: before the first filter, file-analysis or URL step (outside plan mode), load the `ctx_*` tools with ToolSearch, which waits for a server that's still connecting; fall back to Read/Grep only if none come back. Enabled means a `context-mode@*` key set true in `enabledPlugins`, read from user settings, then project settings, then local project settings, last one winning. Disabled or not installed adds nothing. The line lives in the hook, not the Tuner, which is at 799 of its 800 characters. The README's Quiet section says MSNC waits for the tools.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] Enabled in user settings → the session-start context carries the wait line
- [x] Subagent-start context carries the same line
- [x] Missing, false, or overridden to false in project or local settings → no line
- [x] Unreadable or malformed settings → no line, and the hook still exits 0 with its usual output
- [x] The Tuner stays within its size test
- [x] README Quiet section mentions the wait
- [x] `npm test` passes

## Comments

- 2026-09-25 · the wait line sits right after the Tuner, before the subagent note · it extends the Tuner's routing rule · undo: move the entry in `context()`'s array
- 2026-09-25 · only `enabledPlugins` values of exactly `true` count · that's what Claude Code writes · undo: `v === true` → `v` in `ctxEnabled`
- 2026-09-25 · a missing or non-string `cwd` falls back to `process.cwd()` · a bad `cwd` would make `join` throw and drop all hook output · undo: remove the guard in `ctxEnabled`
- 2026-09-25 · a UTF-8 BOM is stripped before parsing settings · Windows editors can save one · undo: drop the `.replace`
- 2026-09-25 · every spawned hook in `test/dispatcher.test.mjs` gets an empty config dir, home and cwd · the real user settings enable context-mode and broke exact-output tests · undo: revert the `baseEnv` and `run()` changes
- Not read: managed/policy settings and `--settings` files; the ticket named user, project and local only.
