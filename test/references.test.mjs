// Every `msnc:<name>` the plugin ships must resolve to one of its skills, commands or agents,
// and no ponytail command survives the rename to Trim.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

// Referenced before the ticket that builds them lands. Each ticket deletes its own names from here.
const PENDING = {
  scope: '07-scope-module',
  explorer: '08-agents',
  implementer: '08-agents',
  setup: '06-calibrate-and-helper-skills',
  verify: '06-calibrate-and-helper-skills',
};

const exists = (name) =>
  [join('skills', name, 'SKILL.md'), join('commands', `${name}.md`), join('agents', `${name}.md`)]
    .some((p) => existsSync(join(root, p)));

// Everything that ships: the whole repo minus git, planning notes, tests and dependencies.
// The credit records (vendor.json, UPSTREAM.md) are exempt from the ponytail check: they record the rename on purpose.
const shipped = readdirSync(root, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile())
  .map((e) => relative(root, join(e.parentPath, e.name)).replaceAll('\\', '/'))
  .filter((f) => !/^(\.git|\.scratch|test|node_modules)\//.test(f));
const read = (f) => readFileSync(join(root, f), 'utf8');

test('every msnc:<name> in skills, context, hooks and the README resolves to a skill, command or agent', () => {
  const missing = [];
  for (const f of shipped.filter((f) => /^(skills|context|hooks|agents|commands)\/|^README\.md$/.test(f)))
    for (const [, name] of read(f).matchAll(/(?<![\w-])\/?msnc:([a-z][a-z0-9-]*)/g))
      if (!exists(name) && !PENDING[name]) missing.push(`${f}: msnc:${name}`);
  assert.deepEqual(missing, []);
});

// Claude Code built-ins that MSNC texts may name as bare slash commands.
const BUILTIN = new Set(['plugin', 'code-review']);

// Bare `/name` commands and `name` skills that are neither msnc:<name> nor a built-in: leftover upstream names.
function strayRefs(text) {
  const out = [];
  for (const [, name] of text.matchAll(/(?<=^|[\s`(])\/([a-z][a-z0-9-]*(?::[a-z][a-z0-9-]*)?)(?![\w:/-]|\.\w)/gm))
    if (!name.startsWith('msnc:') && !BUILTIN.has(name)) out.push(`/${name}`);
  for (const [list] of text.matchAll(/(?:`[^`\n]+`(?:,? (?:and|or) |, )?)+ skills?\b/g))
    for (const [, name] of list.matchAll(/`\/?([^`]+)`/g))
      if (!name.startsWith('msnc:')) out.push(`${name} skill`);
  return out;
}

test('stray reference check flags upstream commands and skills, not paths, code or built-ins', () => {
  const text = [
    'Run a `/grilling` session, then /setup-matt-pocock-skills. Suggest `/verification-loop`.',
    'See the `code-review` skill. Load the `ponytail:ponytail` and `tdd` skills.',
    'Fine: `/msnc:grill`, /msnc:trim-review. The built-in `/code-review`. /plugin install msnc@msnc',
    "Fine: .scratch/<feature>/issues, feature/<slug>, fetch('/orders'), /users/${id}, s.replace(/x/g, ''), the `msnc:tdd` skill.",
  ].join('\n');
  assert.deepEqual(strayRefs(text), [
    '/grilling', '/setup-matt-pocock-skills', '/verification-loop',
    'code-review skill', 'ponytail:ponytail skill', 'tdd skill',
  ]);
});

test('every slash command and skill named in skills, context and the README is MSNC or a Claude Code built-in', () => {
  const hits = [];
  for (const f of shipped.filter((f) => /^(skills|context|agents|commands)\/.*\.md$|^README\.md$/.test(f) && !f.endsWith('UPSTREAM.md')))
    for (const s of strayRefs(read(f))) hits.push(`${f}: ${s}`);
  assert.deepEqual(hits, []);
});

test('pending names are not built yet (drop a name from PENDING when its ticket lands)', () => {
  assert.deepEqual(Object.keys(PENDING).filter(exists), []);
});

test('no /ponytail command or "stop ponytail" phrase ships', () => {
  const hits = [];
  for (const f of shipped.filter((f) => !/(^vendor\.json|UPSTREAM\.md)$/.test(f) && !/\.(png|jpe?g|gif|ico)$/.test(f)))
    for (const m of read(f).matchAll(/(?<![\w/.-])\/ponytail\b|stop ponytail/gi)) hits.push(`${f}: ${m[0]}`);
  assert.deepEqual(hits, []);
});
