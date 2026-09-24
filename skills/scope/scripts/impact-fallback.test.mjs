// Files only the file graph knows (CSS, HTML): `impact` answers from the file graph and
// records the impact entry, so the pre-edit gate can clear. And `scan --no-claude-md`
// leaves CLAUDE.md alone.
//   node --test scripts/impact-fallback.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { impactLogPath } from './impact-log.mjs';

const CLI = path.join(import.meta.dirname, 'sextant.mjs');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sextant-fallback-'));
  const files = {
    'src/util.ts': 'export function greet(n) { return "hi " + n; }\n',
    'src/app.ts': 'import { greet } from "./util";\nimport "./styles.css";\nexport function main() { return greet("x"); }\n',
    'src/styles.css': '.btn { color: red; }\n',
    'index.html': '<link rel="stylesheet" href="src/styles.css">\n',
  };
  for (const [p, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true });
    fs.writeFileSync(path.join(root, p), text);
  }
  return root;
}

const sextant = (root, ...args) => spawnSync(process.execPath, [CLI, ...args], { cwd: root, encoding: 'utf8' });
const logged = (root) => {
  try { return fs.readFileSync(impactLogPath(root), 'utf8'); } catch { return ''; }
};

const root = fixture();
const scan = sextant(root, 'scan', '--no-hook', '--no-claude-md');

test('scan --no-claude-md writes no CLAUDE.md routing block', () => {
  assert.equal(scan.status, 0, scan.stderr);
  assert.ok(fs.existsSync(path.join(root, '.atlas', 'graph', 'nodes.jsonl')));
  assert.ok(fs.existsSync(path.join(root, '.map', 'index')));
  assert.equal(fs.existsSync(path.join(root, 'CLAUDE.md')), false);
  assert.equal(fs.existsSync(path.join(root, '.claude')), false);
});

test('impact on a CSS file answers from the file graph and records the entry', () => {
  const r = sextant(root, 'impact', 'src/styles.css');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /file graph only/);
  assert.match(r.stdout, /^ {2}src\/app\.ts$/m);
  assert.match(logged(root), /^\d+ src\/styles\.css$/m);
});

test('impact on an HTML file nothing imports says so and records the entry', () => {
  const r = sextant(root, 'impact', './index.html');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /no importers/);
  assert.match(logged(root), /^\d+ index\.html$/m);
});

test('a code file still goes through the symbol graph', () => {
  const r = sextant(root, 'impact', 'src/util.ts');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^impact mod:/m);
  assert.doesNotMatch(r.stdout, /file graph only/);
});

test('a path neither graph knows still fails, and records nothing', () => {
  const r = sextant(root, 'impact', 'nope.css');
  assert.equal(r.status, 2);
  assert.doesNotMatch(logged(root), /nope\.css/);
});
