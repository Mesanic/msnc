---
name: setup
description: Set up MSNC for this user and repo — its options, the context-mode companion and its ask rules, the issue tracker, the Scope index and the default subagent model. Shows every change and writes only after a yes.
disable-model-invocation: true
---

# Setup MSNC

Walk the user through the choices MSNC leaves to them:

- **Options** — MSNC's three `/config` switches
- **Quiet** — the optional context-mode companion, and `ask` rules for its two destructive tools
- **Issue tracker** — where `/msnc:spec`, `/msnc:tickets` and `/msnc:implement` read and write tickets (local markdown by default)
- **Scope index** — `/msnc:scope init` for the current repo
- **Subagent model** — how subagents pick a model, and an optional default

This is a prompt-driven skill, not a deterministic script. Explore, present what you found, confirm with the user, then write.

**Every write waits for a yes.** Before changing any file (a settings file, `docs/agents/`), show the exact change: the file path, and the JSON keys with old and new values or the full new file contents. Then ask. A yes → write that change and nothing else. No reply, or anything but yes → write nothing and move on. One yes per change; never bundle several changes behind one question. Edit JSON settings in place: change only the named keys and keep everything else.

## Process

### 1. Explore

Read whatever exists; don't assume:

- `~/.claude/settings.json` — `enabledPlugins`, `permissions.ask`, `env.CLAUDE_CODE_SUBAGENT_MODEL`, and `pluginConfigs` for `msnc@…` (MSNC's option values)
- Is context-mode installed? (`ctx_*` tools available, or a `context-mode@…` entry in `enabledPlugins`)
- `git remote -v` and `.git/config` — is this a GitHub or GitLab repo, or has it no remote?
- `docs/agents/issue-tracker.md` — does this skill's prior output already exist?
- `.scratch/` — sign that a local-markdown issue tracker convention is already in use
- `.atlas/` — the repo already has a Scope index
- Other plugins that overlap MSNC (`mattpocock-skills`, `ecc`, `ponytail`) on → mention `/msnc:doctor`, which lists duplicates and conflicting project settings

### 2. Present findings and ask

Summarise what's present and what's missing. Then take the sections in order — one section, one answer, then the next.

Lead each section with the recommended answer so the user can accept it in a word. Give a one-line explainer only when the choice genuinely branches; skip a section entirely when exploration already settled it.

**Section A — Options.** Show the current value of each and recommend the defaults:

- `clear` (default on) — the focus reply shape in the main session and in subagents. The exact message "normal mode" drops it for one session.
- `trim_default` (default off) — Trim's level at session start. off = Trim loads when code work starts; lite, full or ultra = on from the first message.
- `scope_gate` (default on) — route code searches through the Scope index when a repo has one.

The user changes these in `/config` (the MSNC rows). This skill never writes them.

**Section B — Quiet (context-mode).** Optional companion that keeps raw tool output out of the chat. MSNC doesn't bundle it (ELv2 license, ~140 MB with native parts).

- Not installed → offer the install and give the commands for the user to run: `/plugin marketplace add mksglu/context-mode`, then `/plugin install context-mode@context-mode`. Recommended when sessions often read big outputs; fine to skip.
- Installed (now or after the install) → offer `ask` rules so its two destructive tools always prompt first. The change: add `mcp__plugin_context-mode_context-mode__ctx_purge` and `mcp__plugin_context-mode_context-mode__ctx_upgrade` to `permissions.ask` in `~/.claude/settings.json`, skipping any entry already there. Recommended: **yes**.

**Section C — Issue tracker.**

> Explainer: The "issue tracker" is where issues live for this repo. `/msnc:spec`, `/msnc:tickets` and `/msnc:implement` read from and write to it — they need to know whether to write a markdown file under `.scratch/`, call `gh issue create`, or follow some other workflow you describe. Pick the place you actually track work for this repo.

Default posture: **local markdown** — MSNC's skills use it when no tracker is configured. Offer:

- **Local markdown** (recommended) — issues live as files under `.scratch/<feature>/` in this repo (good for solo projects or repos without a remote)
- **GitHub** — issues live in the repo's GitHub Issues (uses the `gh` CLI). Offer it first when a `git remote` points at GitHub and the user already tracks work there.
- **GitLab** — issues live in the repo's GitLab Issues (uses the [`glab`](https://gitlab.com/gitlab-org/cli) CLI)
- **Other** (Jira, Linear, etc.) — ask the user to describe the workflow in one paragraph; the skill will record it as freeform prose

Record the choice in `docs/agents/issue-tracker.md`.

**Section D — Scope index.** Skip when `.atlas/` exists or the repo has no code. Otherwise offer `/msnc:scope init` for the current repo: it builds the code map that impact checks and searches use, writes only index data (`.atlas/`, `.map/` and their `.gitignore` lines), and adds no hooks and no `CLAUDE.md` block. Recommended: **yes** for a code repo. Run it only after the yes.

**Section E — Subagent model.** Explain how the model is chosen: MSNC's agents pin no `model` or `effort`, so every subagent uses `CLAUDE_CODE_SUBAGENT_MODEL` when it is set, and otherwise Claude Code's own default for subagents; effort follows the session. Show the current value.

Offer to set a default: `env.CLAUDE_CODE_SUBAGENT_MODEL` in `~/.claude/settings.json`. A model id such as `claude-opus-5-5` pins that exact version; an alias such as `opus` or `sonnet` follows the family to newer versions. MSNC itself pins no model. Recommended: leave it as it is unless the user wants subagents on a different model than the session.

### 3. Confirm and edit

For each change the user said yes to, show the draft first:

- Settings changes (Sections B and E) — the file, and each key with its old and new value
- The contents of `docs/agents/issue-tracker.md` (Section C)

Let them edit before writing. Then write each confirmed change on its own yes, as the rule at the top says.

### 4. Write

Write `docs/agents/issue-tracker.md` using the seed template in this skill folder as a starting point:

- [issue-tracker-local.md](./issue-tracker-local.md) — local-markdown issue tracker
- [issue-tracker-github.md](./issue-tracker-github.md) — GitHub issue tracker
- [issue-tracker-gitlab.md](./issue-tracker-gitlab.md) — GitLab issue tracker

For "other" issue trackers, write `docs/agents/issue-tracker.md` from scratch using the user's description. If the file already exists, update it in place rather than replacing it, and don't overwrite the user's own edits.

### 5. Done

Tell the user what changed and where, and what they skipped. Mention they can edit `docs/agents/issue-tracker.md` directly later — re-running this skill is only necessary if they want to switch issue trackers or restart from scratch.
