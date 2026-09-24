// Scope: the sextant engine in skills/scope, run on a fixture repo, and the dispatcher's edit gate.
// One fixture: two TypeScript files the symbol graph knows, a CSS and an HTML file only the file graph knows.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../skills/scope/scripts/sextant.mjs', import.meta.url));
const FILES = {
  'src/util.ts': 'export function greet(n) { return "hi " + n; }\n',
  'src/format.ts': 'import { greet } from "./util";\nexport function shout(n) { return greet(n).toUpperCase(); }\n',
  'src/app.ts': 'import { shout } from "./format";\nimport "./styles.css";\nexport function main() { return shout("x"); }\n',
  'src/styles.css': '.btn { color: red; }\n',
  'index.html': '<link rel="stylesheet" href="src/styles.css">\n',
  '.gitignore': 'node_modules/\n',
  'CLAUDE.md': '# Project notes\n',
};

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'msnc-scope-'));
  for (const [p, text] of Object.entries(FILES)) {
    mkdirSync(dirname(join(root, p)), { recursive: true });
    writeFileSync(join(root, p), text);
  }
  return root;
}
const node = (args, cwd) => spawnSync(process.execPath, args, { cwd, encoding: 'utf8' });

const repo = fixture();
const before = readdirSync(repo).sort();
// What `/msnc:scope init` runs (skills/scope/SKILL.md): a plain scan, no flags.
const init = node([CLI, 'scan'], repo);

test('/msnc:scope init writes only .atlas/, .map/ and .gitignore entries: no hooks, no CLAUDE.md block', () => {
  assert.equal(init.status, 0, init.stderr);
  assert.deepEqual(readdirSync(repo).sort(), [...before, '.atlas', '.map'].sort());
  assert.equal(readFileSync(join(repo, 'CLAUDE.md'), 'utf8'), FILES['CLAUDE.md']);
  const gitignore = readFileSync(join(repo, '.gitignore'), 'utf8');
  assert.ok(gitignore.startsWith(FILES['.gitignore']), 'existing lines kept');
  for (const line of gitignore.slice(FILES['.gitignore'].length).split('\n').filter(Boolean))
    assert.match(line, /^\.(atlas|map)\//, 'only index entries appended');
});

test("sextant's merge.test.mjs passes on the fixture: symbols join the file graph", () => {
  const r = node([fileURLToPath(new URL('../skills/scope/scripts/merge.test.mjs', import.meta.url)), repo]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^ok {2}tiers joined: file\(src\/format\.ts\)/m);
});

// --- the edit gate: PreToolUse event on stdin → deny JSON on stdout, or nothing ---
const DISPATCHER = fileURLToPath(new URL('../hooks/msnc.mjs', import.meta.url));
const baseEnv = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('CLAUDE_PLUGIN_')));

function gate(tool_name, tool_input, { cwd = repo, env = {} } = {}) {
  const r = spawnSync(process.execPath, [DISPATCHER], {
    input: JSON.stringify({ hook_event_name: 'PreToolUse', session_id: 's1', cwd, tool_name, tool_input }),
    env: { ...baseEnv, CLAUDE_PLUGIN_DATA: mkdtempSync(join(tmpdir(), 'msnc-data-')), ...env },
    encoding: 'utf8',
  });
  assert.equal(r.status, 0);
  if (!r.stdout) return null;
  const o = JSON.parse(r.stdout).hookSpecificOutput;
  assert.equal(o.hookEventName, 'PreToolUse');
  assert.equal(o.permissionDecision, 'deny');
  return o.permissionDecisionReason;
}
const edit = (p) => ['Edit', { file_path: join(repo, p), old_string: 'a', new_string: 'b' }];
const impactCmd = (p) => `node "${CLI.replaceAll('\\', '/')}" impact ${p}`;

test('editing a mapped .ts file without impact is refused with the exact command to run', () => {
  const reason = gate(...edit('src/util.ts'));
  assert.ok(reason, 'refused');
  assert.ok(reason.includes(`\n  ${impactCmd('src/util.ts')}\n`), reason);
  for (const tool of ['Write', 'MultiEdit']) assert.ok(gate(tool, { file_path: join(repo, 'src/util.ts') }), tool);
});

test('`sextant impact styles.css` clears the gate for that file', () => {
  assert.ok(gate(...edit('src/styles.css')), 'refused before impact');
  const r = node([CLI, 'impact', 'src/styles.css'], repo);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(gate(...edit('src/styles.css')), null);
  assert.ok(gate(...edit('src/util.ts')), 'other files stay gated');
});

test('scope_gate off lets every edit through', () => {
  for (const v of ['false', 'FALSE', '0']) assert.equal(gate(...edit('src/util.ts'), { env: { CLAUDE_PLUGIN_OPTION_SCOPE_GATE: v } }), null, v);
  assert.ok(gate(...edit('src/util.ts'), { env: { CLAUDE_PLUGIN_OPTION_SCOPE_GATE: 'true' } }));
});

test('no .atlas/ → every edit passes', () => {
  const bare = mkdtempSync(join(tmpdir(), 'msnc-bare-'));
  writeFileSync(join(bare, 'a.ts'), 'x\n');
  assert.equal(gate('Edit', { file_path: join(bare, 'a.ts') }, { cwd: bare }), null);
  assert.equal(gate('Bash', { command: 'rm a.ts' }, { cwd: bare }), null);
});

test('new files, unmapped files and non-writing Bash pass; writing Bash to a mapped file is refused', () => {
  assert.equal(gate('Write', { file_path: join(repo, 'src/new.ts') }), null, 'new file');
  writeFileSync(join(repo, 'later.txt'), 'added after the scan\n');
  assert.equal(gate(...edit('later.txt')), null, 'file outside the graph');
  for (const command of ['cat src/util.ts', 'grep -n greet src/util.ts', 'cp src/util.ts /tmp/copy.ts', 'sed -n 1p src/util.ts', 'git status'])
    assert.equal(gate('Bash', { command }), null, command);
  for (const command of ['sed -i s/hi/yo/ src/util.ts', 'rm src/util.ts', 'mv src/app.ts src/util.ts', 'echo x | tee src/util.ts']) {
    const reason = gate('Bash', { command });
    assert.ok(reason?.includes(impactCmd('src/util.ts')), command);
  }
  assert.ok(gate('NotebookEdit', { notebook_path: join(repo, 'src/util.ts') }), 'notebook_path');
});
