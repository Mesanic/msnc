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

test('pending names are not built yet (drop a name from PENDING when its ticket lands)', () => {
  assert.deepEqual(Object.keys(PENDING).filter(exists), []);
});

test('no /ponytail command or "stop ponytail" phrase ships', () => {
  const hits = [];
  for (const f of shipped.filter((f) => !/(^vendor\.json|UPSTREAM\.md)$/.test(f) && !/\.(png|jpe?g|gif|ico)$/.test(f)))
    for (const m of read(f).matchAll(/(?<![\w/.-])\/ponytail\b|stop ponytail/gi)) hits.push(`${f}: ${m[0]}`);
  assert.deepEqual(hits, []);
});
