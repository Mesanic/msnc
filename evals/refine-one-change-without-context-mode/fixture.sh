#!/usr/bin/env bash
# A project recipe for releases that lacks the test step the history keeps correcting.
set -euo pipefail
mkdir -p .claude/skills/release
cat > .claude/skills/release/SKILL.md <<'MD'
---
name: release
description: Cut a release of this package.
disable-model-invocation: true
---

# Release

**Why:** releases should be tagged the same way every time.

**When to use:** the user asks for a release.

## Steps

1. `npm version <patch|minor|major>`
2. `git push --follow-tags`

## Done-check

`git tag --list` shows the new tag.
MD
