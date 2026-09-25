# 05: Relay skills (grill, spec, tickets, implement)

**What to build:**
- **Copied skills:**
  - `grill`: grill-me and grilling merged. Model-invoked on "grill" or stress-test phrasing, and typed as `/msnc:grill`.
  - `spec` and `tickets`: typed-only.
  - `tdd` and `codebase-design`: model-invoked, names unchanged.
- **`implement`**, rebuilt from the author's current skill:
  - It runs one foreground `msnc:implementer` subagent per ticket.
  - When the repo has a Scope index:
    - It runs `/msnc:scope init` if the index is missing.
    - The subagent brief says to run impact before each edit.
    - Verification uses the covering tests impact names, plus `scope check`.
    - It rescans after each commit.
  - Drop the CSS/HTML stop condition once ticket 07 lands.
- **Cross-references:** update every one to MSNC names:
  - `/grilling` → `/msnc:grill`
  - `/setup-matt-pocock-skills` → `/msnc:setup`
  - `/verification-loop` → `/msnc:verify`
  - `code-review` → the built-in `/code-review`
- **Compatibility:** keep the `docs/agents/*.md` conventions so existing repos keep working.

**Context:**
- mattpocock/skills clone (HEAD `c55ee46`) at `C:\Users\User\.claude\plugins\marketplaces\mattpocock\skills\`: `productivity\grill-me`, `productivity\grilling`, `engineering\to-spec`, `engineering\to-tickets`, `engineering\tdd`, `engineering\codebase-design`.
- The author's implement skill: `C:\Users\User\.claude\skills\implement\SKILL.md`.

**Blocked by:** 02

**Status:** done

- [x] The references test passes: every skill or command mentioned exists in MSNC or is a Claude Code built-in.
- [x] `implement` stops with a clear message, never hangs, when run outside a git repo or with uncommitted changes.
- [x] Every copied folder has LICENSE and UPSTREAM.md.

## Comments

- 2026-09-23 · Copied from pinned mattpocock v1.2.3 `6acc160` (all five folders exist there), not the local clone `c55ee46` · ticket 02 pins the latest release · move the pin in `vendor.json` and recopy.
- `agents/openai.yaml` (Codex metadata) not copied; shows as "upstream only" in sync reports.
- The author's implement skill had no CSS/HTML stop condition, so ticket 07 has nothing to drop.
- For ticket 07: "has a Scope index but it's missing" is read as `.gitignore` lists `.atlas/` but the folder is absent; the rescan is written as "`/msnc:scope init` again". Confirm or rename both.
- "Stops outside a git repo / with uncommitted changes" is covered by skill text plus a wording test; not run live (CLI auth expired).
