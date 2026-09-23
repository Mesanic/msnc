#!/usr/bin/env bash
# Two helper modules with different naming styles, so the new helper's name and home are a real (reversible) choice.
set -euo pipefail
mkdir -p src
cat > package.json <<'JSON'
{ "name": "shop", "type": "module", "scripts": { "test": "node --test" } }
JSON
cat > src/format.js <<'JS'
export const formatDate = (d) => d.toISOString().slice(0, 10);
JS
cat > src/strings.js <<'JS'
export const toTitle = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());
JS
