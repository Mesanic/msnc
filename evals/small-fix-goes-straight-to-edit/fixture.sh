#!/usr/bin/env bash
# One module with a one-character typo and a test that catches it.
set -euo pipefail
mkdir -p src test
cat > package.json <<'JSON'
{ "name": "greet", "type": "module", "scripts": { "test": "node --test" } }
JSON
cat > src/greet.js <<'JS'
export const greet = (name) => `Helo, ${name}!`;
JS
cat > test/greet.test.js <<'JS'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { greet } from '../src/greet.js';

test('greets by name', () => assert.equal(greet('Ada'), 'Hello, Ada!'));
JS
