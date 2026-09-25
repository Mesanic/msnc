// Every `msnc:<name>` the plugin ships must resolve to one of its skills, commands or agents,
// and no ponytail command survives the rename to Trim.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

// Referenced before the ticket that builds them lands. Each ticket deletes its own names from here.
const PENDING = {};

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
const BUILTIN = new Set(['plugin', 'code-review', 'config']);

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

// The Scope engine's own reference docs are upstream engine internals, not text MSNC routes by.
test('every slash command and skill named in skills, context and the README is MSNC or a Claude Code built-in', () => {
  const hits = [];
  for (const f of shipped.filter((f) => /^(skills|context|agents|commands)\/.*\.md$|^README\.md$/.test(f) && !f.endsWith('UPSTREAM.md') && !f.startsWith('skills/scope/engine/')))
    for (const s of strayRefs(read(f))) hits.push(`${f}: ${s}`);
  assert.deepEqual(hits, []);
});

// Spec "Human pacing" (ticket 15): failures are reported without blame. Phrases that pin a failure on a person.
const BLAME = /\b(you should have|you should've|you forgot|you failed to|you broke|your fault|whose fault|mistake by|fault of)\b/gi;
const blame = (text) => [...text.matchAll(BLAME)].map((m) => m[0].toLowerCase());

test('blame check flags wording that pins a failure on someone, not neutral failure reports', () => {
  const text = [
    'You should have run the tests. That was your fault. A mistake by the implementer. You forgot the import.',
    'Cause: the import is missing at src/a.js:3. Fix: add it. Prevention: a recipe note. `git blame` shows the line.',
  ].join('\n');
  assert.deepEqual(blame(text), ['you should have', 'your fault', 'mistake by', 'you forgot']);
});

// Upstream copies are scanned too: they ship under MSNC's name. A sync that brings blame wording in fails
// here and gets a local change. Exempt: evals (graders name the phrases they reject) and the credit records.
test('no shipped text uses blame wording', () => {
  const hits = [];
  for (const f of shipped.filter((f) => /\.(md|mjs|json|html)$/.test(f) && !/^evals\//.test(f) && !/(^vendor\.json|UPSTREAM\.md)$/.test(f)))
    for (const b of blame(read(f))) hits.push(`${f}: ${b}`);
  assert.deepEqual(hits, []);
});

// README (ticket 10): its sections are cut at `## ` headings.
const section = (heading) => read('README.md').split(/^## /m).find((s) => s.startsWith(heading)) ?? '';

test('the README options table lists exactly the options plugin.json declares', () => {
  const declared = Object.keys(JSON.parse(read('.claude-plugin/plugin.json')).userConfig).sort();
  const documented = [...section('Options').matchAll(/^\| `([a-z_]+)` \|/gm)].map((m) => m[1]).sort();
  assert.deepEqual(documented, declared);
});

// Authors are not in vendor.json; the spec's module table names them.
const AUTHORS = {
  'DietrichGebert/ponytail': 'Dietrich Gebert',
  'ayghri/i-have-adhd': 'Ayoub Ghriss',
  'mattpocock/skills': 'Matt Pocock',
  'affaan-m/ECC': 'Affaan Mustafa',
};

test('README "Built on" credits every pinned upstream with author, repo link and license on one line', () => {
  const vendor = JSON.parse(read('vendor.json'));
  assert.deepEqual(vendor.map((v) => v.repo).sort(), Object.keys(AUTHORS).sort(), 'four upstreams');
  const lines = section('Built on').split('\n');
  for (const { repo, license } of vendor) {
    const line = lines.find((l) => l.includes(`](https://github.com/${repo})`)) ?? '';
    assert.ok(line.includes(AUTHORS[repo]), `${repo}: author`);
    assert.match(line, new RegExp(`\\b${license}\\b`), `${repo}: license`);
  }
  // MSNC is Scope's only source now; the archived repo it began as is named, not pinned.
  assert.ok(lines.includes('Scope began as a standalone repo, now an archived snapshot at [Mesanic/msnc-scope](https://github.com/Mesanic/msnc-scope).'), 'Scope origin line');
  const companion = lines.find((l) => l.includes('](https://github.com/mksglu/context-mode)')) ?? '';
  assert.match(companion, /\bELv2\b/, 'context-mode companion and its license');
});

test('README credits ProcessDriven exactly, with the trademark notice and no implied endorsement', () => {
  const credits = section('Built on');
  assert.ok(credits.includes('principles inspired by [ProcessDriven](https://processdriven.co) by Layla Pomper'));
  assert.match(credits, /ProcessDriven® is a registered trademark/);
  assert.match(credits, /not affiliated with or endorsed by/);
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
