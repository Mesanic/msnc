#!/usr/bin/env bash
set -euo pipefail
mkdir -p src
echo '{ "name": "shop", "type": "module", "scripts": { "test": "node --test" } }' > package.json
echo 'export const formatDate = (d) => d.toISOString().slice(0, 10);' > src/format.js
echo 'export const toTitle = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());' > src/strings.js
git init -q -b main && git config user.email "eval@example.com" && git config user.name "Eval" && git add -A && git commit -qm init
