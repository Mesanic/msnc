# Upstream

- Repo: https://github.com/DietrichGebert/ponytail (Dietrich Gebert, MIT, see `LICENSE`)
- Path: `skills/ponytail/SKILL.md`
- Commit: `1d95ff7d39de12d87014ea40d4e22201bddc501b` (tag v4.10.0, committed 2026-09-14)
- Copied: 2026-09-23

## Local changes

- Skill renamed `ponytail` → `trim`; heading `# Ponytail` → `# Trim`; description trigger word "ponytail" → "trim".
- Command `/ponytail lite|full|ultra` → `/msnc:trim lite|full|ultra`. Levels lite, full, ultra kept.
- Phrase "stop ponytail" → "stop trim" (Persistence and Boundaries).
- Caller check: "grep every caller of the function you're about to touch" → "find every caller of the function you're about to touch: repo has a Scope index → `scope impact`; otherwise grep every caller."
- Marker comment `ponytail:` → `trim:` (example `# trim: global lock, ...`).
- Boundaries: "(pair with Caveman for terse prose)" → "(Clear owns reply shape)".
- Why rule (MSNC ticket 14): a Rules bullet after "No unrequested abstractions" asks why every new file, dependency or abstraction has to exist, states the why in one line with the change, and drops it when there is none. The level texts carry it.
- Sizing (MSNC ticket 18): "Complex request?" → "Open question in a small task?" at the head of the ship-the-lazy-version Rules bullet. Upstream's wording told the model to build a large feature straight away, over the Tuner's size line; the Tuner owns what medium and large work does. The level texts carry it.
- Trigger (MSNC ticket 20): the description opens with "Load before the first edit of any code change, even a one-line fix." Upstream names its trigger only in the fourth sentence, and about 1 code task in 10 (a one-line bug fix) edited without loading the skill. Frontmatter only, so the level texts don't change.
- Line endings normalized to LF.
- Added `levels/lite.md`, `levels/full.md`, `levels/ultra.md`: the SKILL.md body filtered per level by upstream `hooks/ponytail-instructions.js` (`filterSkillBodyForMode`), headed `TRIM ACTIVE — level: <level>` (upstream: `PONYTAIL MODE ACTIVE — level: <level>`). MSNC's dispatcher injects them at SessionStart and SubagentStart while Trim is on. Regenerate them whenever SKILL.md changes; `test/skills.test.mjs` fails until they match.
- Not copied: upstream's hooks (their three jobs are rebuilt in `hooks/msnc.mjs`), `ponytail-gain`, `ponytail-help`, commands and other harness files.
