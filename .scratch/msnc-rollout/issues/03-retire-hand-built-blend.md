# 03: Retire the hand-built blend on this machine

**What to build:** One source of truth on this machine: MSNC. Back up first, as done on 2026-09-23 in `C:\Users\User\.claude\backups\blend-2026-09-23\`. Then remove what MSNC now provides:
- the `adhd-lazy` output style and the `outputStyle` setting
- `hooks\subagent-style.mjs` and its SubagentStart entry
- the `PONYTAIL_DEFAULT_MODE` env setting
- the 14 personal skill copies in `~\.claude\skills\`
- the ponytail plugin (Trim replaces it)

Trim the global `CLAUDE.md` down to personal notes, because Tuner now carries the routing. Decide whether to keep the personal `Explore.md` and `Plan.md` overrides, or rely on `msnc:explorer` and `msnc:planner`. Keep context-mode as the Quiet companion.

**Blocked by:** 02

**Status:** ready-for-human

- [ ] `/msnc:doctor` reports no duplicates.
- [ ] A fresh session costs no more always-loaded tokens than before the switch (compare with `/context`).
