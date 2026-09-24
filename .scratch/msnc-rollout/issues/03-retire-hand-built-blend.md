# 03: Retire the hand-built blend on this machine

**What to build:** One source of truth on this machine: MSNC. Back up first, as done on 2026-09-23 in `C:\Users\User\.claude\backups\blend-2026-09-23\`. Then remove what MSNC now provides:
- the `adhd-lazy` output style and the `outputStyle` setting
- `hooks\subagent-style.mjs` and its SubagentStart entry
- the `PONYTAIL_DEFAULT_MODE` env setting
- the 14 personal skill copies in `~\.claude\skills\`
- the ponytail plugin (Trim replaces it)

Trim the global `CLAUDE.md` down to personal notes, because Tuner now carries the routing. Decide whether to keep the personal `Explore.md` and `Plan.md` overrides, or rely on `msnc:explorer` and `msnc:planner`. Keep context-mode as the Quiet companion.

**Blocked by:** 02

**Status:** done

- [x] `/msnc:doctor` reports no duplicates.
- [x] A fresh session costs no more always-loaded tokens than before the switch (compare with `/context`).

## Comments

- 2026-09-23 · Retired on this machine. Everything was moved, not deleted, to `~/.claude/backups/retire-blend-2026-09-23/` (with copies of `settings.json` and `CLAUDE.md`): the `adhd-lazy` output style, `hooks/subagent-style.mjs`, the Explore.md and Plan.md overrides (retired in favour of `msnc:explorer`/`msnc:planner`), and 14 personal skills (aside, codebase-design, config-gc, context-budget, grilling, grill-me, handoff, implement, setup-matt-pocock-skills, tdd, to-spec, to-tickets, verification-loop, wait-what). `settings.json` lost `outputStyle`, `PONYTAIL_DEFAULT_MODE` and the SubagentStart entry; the ponytail plugin is uninstalled; the global `CLAUDE.md` is now a pointer to the Tuner. Kept: context-mode, its cache-heal hook, find-skills, gepeto, pinokio, and ECC at local scope for Hackathon.
- Box 1: doctor reports `Duplicate skills: none`. Project settings still turn on duplicating plugins in `Jarvis` (mattpocock-skills) and `Hackathon` (ECC, which stays on purpose).
- Box 2, waived by the maintainer: a fresh session's `/context` is 28.5k tokens against 27.7k with only the old blend (MSNC disabled for the measurement), so 0.8k more (about 0.08% of the 1M window). By category: Messages +1.0k (Tuner and Clear at session start), System tools +0.5k (built-in agent descriptions return), Skills −0.5k, Memory files −135, Custom agents +29. A fresh session still quotes "MSNC is active." and Clear, and has no output style.
