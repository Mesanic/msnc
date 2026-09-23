# Upstream

- Repo: https://github.com/mattpocock/skills (Matt Pocock, MIT, see `LICENSE`)
- Paths: `skills/productivity/grilling/SKILL.md`, merged with `skills/productivity/grill-me/SKILL.md`
- Commit: `6acc160e4e0cd062dbbbd7a1b26ae92855edf07e` (tag v1.2.3, committed 2026-08-06)
- Copied: 2026-09-23

## Local changes

- Skill renamed `grilling` → `grill`. Body and description unchanged; it stays model-invoked on "grill" and stress-test phrasing.
- `grill-me` merged in: upstream it was a typed-only alias whose whole body was "Run a `/grilling` session". Typing `/msnc:grill` now does that, so no separate folder is kept.
- Line endings normalized to LF.
- Not copied: `agents/openai.yaml` (Codex harness metadata; MSNC targets Claude Code only).
