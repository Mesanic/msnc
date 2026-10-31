#!/usr/bin/env bash
# A static page served by Node, with a test script; enough for a UI journey.
set -euo pipefail
mkdir -p public
cat > package.json <<'JSON'
{ "name": "counter", "type": "module", "scripts": { "start": "node server.js", "test": "node --test" } }
JSON
cat > server.js <<'JS'
import { createServer } from "node:http"; import { readFileSync } from "node:fs";
createServer((q, s) => { s.setHeader("content-type", "text/html"); s.end(readFileSync("public/index.html")); }).listen(process.env.PORT || 3000);
JS
cat > public/index.html <<'HTML'
<!doctype html><title>Counter</title><h1>Counter</h1><p id="count">0</p>
HTML
git init -q -b main && git config user.email "eval@example.com" && git config user.name "Eval" && git add -A && git commit -qm init
