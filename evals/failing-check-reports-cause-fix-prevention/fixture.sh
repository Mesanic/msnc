#!/usr/bin/env bash
# A committed git repo with one ready ticket and a forced failing check: greet() drifted from its test,
# so the baseline test run is red and /msnc:implement must stop and report before any ticket work.
set -euo pipefail
mkdir -p src test .scratch/greet/issues
cat > package.json <<'JSON'
{ "name": "greeter", "type": "module", "scripts": { "typecheck": "node --check src/greet.js", "test": "node --test" } }
JSON
cat > src/greet.js <<'JS'
export const greet = (name) => `Hi, ${name}`;
JS
cat > test/greet.test.js <<'JS'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { greet } from '../src/greet.js';
test('greet says hello', () => assert.equal(greet('Ada'), 'Hello, Ada!'));
JS
cat > .scratch/greet/issues/01-shout.md <<'MD'
# 01 — Shout

**Why:** User story 1. The kiosk banner reads from across the lobby.

**What to build:** `shout(name)` in `src/greet.js` returns the greeting in capitals: `shout('Ada')` → `HELLO, ADA!`.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] `shout('Ada')` returns `HELLO, ADA!`, covered by a test.
MD
git init -q -b main
git config user.name "Eval"
git config user.email "eval@example.com"
git add -A
git commit -qm "chore: greeter with a drifted greeting"
