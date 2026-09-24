#!/usr/bin/env bash
# A cart whose total ignores quantity, with a test that catches it: a code task that needs one Edit.
set -euo pipefail
mkdir -p src test
cat > package.json <<'JSON'
{ "name": "cart", "type": "module", "scripts": { "test": "node --test" } }
JSON
cat > src/cart.js <<'JS'
export const total = (items) => items.reduce((sum, item) => sum + item.price, 0);
JS
cat > test/cart.test.js <<'JS'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { total } from '../src/cart.js';

test('total counts quantity', () => assert.equal(total([{ price: 2, qty: 3 }, { price: 5, qty: 1 }]), 11));
JS
