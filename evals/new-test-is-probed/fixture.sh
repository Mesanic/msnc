#!/usr/bin/env bash
set -euo pipefail
echo '{ "name": "dur", "type": "module", "scripts": { "test": "node --test" } }' > package.json
echo '// parseDuration("1h30m") should return minutes' > duration.js
git init -q -b main && git config user.email "eval@example.com" && git config user.name "Eval" && git add -A && git commit -qm init
