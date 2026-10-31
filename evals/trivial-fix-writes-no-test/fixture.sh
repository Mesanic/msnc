#!/usr/bin/env bash
set -euo pipefail
echo '{ "name": "greet", "type": "module", "scripts": { "test": "node --test" } }' > package.json
echo 'export const greet = (n) => `Helo, ${n}!`;' > greet.js
git init -q -b main && git config user.email "eval@example.com" && git config user.name "Eval" && git add -A && git commit -qm init
