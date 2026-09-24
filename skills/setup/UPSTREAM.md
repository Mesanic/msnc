# Upstream

- Repo: https://github.com/mattpocock/skills (Matt Pocock, MIT, see `LICENSE`)
- Path: `skills/engineering/setup-matt-pocock-skills/` (`SKILL.md`, `issue-tracker-local.md`, `issue-tracker-github.md`, `issue-tracker-gitlab.md`)
- Commit: `6acc160e4e0cd062dbbbd7a1b26ae92855edf07e` (tag v1.2.3, committed 2026-08-06)
- Copied: 2026-09-23

## Local changes

- Skill renamed `setup-matt-pocock-skills` → `setup` (typed as `/msnc:setup`; `disable-model-invocation: true` kept from upstream).
- `SKILL.md` rewritten around MSNC, keeping upstream's explore → present → confirm → write flow and its tracker section: sections for MSNC's options (`/config`, never written), context-mode and its `ask` rules, the tracker (local markdown now the default), `/msnc:scope init`, and the subagent model (`CLAUDE_CODE_SUBAGENT_MODEL`). New rule: every change is shown first and written only after its own yes.
- Dropped from `SKILL.md`: the triage-label and domain-docs sections and the `## Agent skills` block in `CLAUDE.md`/`AGENTS.md` (MSNC ships no triage or domain-modeling skill; its skills read `docs/agents/issue-tracker.md` directly).
- `issue-tracker-local.md`: now matches MSNC's own `docs/agents/issue-tracker.md` (Status line names `ready-for-agent`/`ready-for-human`); the Wayfinding section dropped (no wayfinder skill).
- `issue-tracker-github.md`, `issue-tracker-gitlab.md`: the PR/MR triage-surface and Wayfinding sections dropped (they serve `/triage` and `/wayfinder`, which MSNC doesn't ship).
- Line endings normalized to LF.
- Not copied: `domain.md`, `triage-labels.md`, `agents/openai.yaml`.
