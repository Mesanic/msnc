#!/usr/bin/env bash
# A tiny CLI with an arg parser and a formatter, so a plan has two real files to name.
set -euo pipefail
mkdir -p src
cat > package.json <<'JSON'
{ "name": "wc-lite", "type": "module", "bin": { "wc-lite": "src/cli.js" } }
JSON
cat > src/cli.js <<'JS'
#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { format } from './format.js';

const [file] = process.argv.slice(2);
const text = readFileSync(file, 'utf8');
console.log(format({ file, lines: text.split('\n').length, words: text.split(/\s+/).filter(Boolean).length }));
JS
cat > src/format.js <<'JS'
export const format = ({ file, lines, words }) => `${lines} ${words} ${file}`;
JS
