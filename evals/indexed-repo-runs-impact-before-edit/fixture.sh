#!/usr/bin/env bash
# A committed git repo with a Scope index (built by this plugin's own sextant copy): users.js is in the
# code map and signup.js calls into it, so an edit to users.js must run impact first.
set -euo pipefail
PLUGIN="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
mkdir -p src test
cat > package.json <<'JSON'
{ "name": "accounts", "type": "module", "scripts": { "test": "node --test" } }
JSON
cat > src/users.js <<'JS'
const users = new Map();
export const createUser = (email) => { const u = { id: users.size + 1, email }; users.set(u.id, u); return u; };
export const getUser = (id) => users.get(id);
JS
cat > src/signup.js <<'JS'
import { createUser } from './users.js';
export const signup = (form) => createUser(form.email);
JS
cat > test/users.test.js <<'JS'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUser, getUser } from '../src/users.js';
test('stores the user', () => assert.equal(getUser(createUser('ada@example.com').id).email, 'ada@example.com'));
JS
git init -q -b main
git config user.name "Eval"
git config user.email "eval@example.com"
git add -A
git commit -qm "chore: accounts"
node "$PLUGIN/skills/scope/scripts/sextant.mjs" scan > /dev/null
git add -A
git commit -qm "chore: build Scope index"
