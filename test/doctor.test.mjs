// /msnc:doctor's mechanical checks: given a home dir, a repo dir and an MSNC root, expect these report lines.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { doctor } from '../skills/doctor/doctor.mjs';

const base = mkdtempSync(join(tmpdir(), 'msnc-doctor-'));
after(() => rmSync(base, { recursive: true, force: true }));

// Writes { 'rel/path': string | object } under a fresh temp dir (objects as JSON) and returns it.
function fixture(files = {}) {
  const root = mkdtempSync(join(base, 'f-'));
  for (const [p, v] of Object.entries(files)) {
    mkdirSync(dirname(join(root, p)), { recursive: true });
    writeFileSync(join(root, p), typeof v === 'string' ? v : JSON.stringify(v));
  }
  return root;
}

// A small MSNC: three options, Tuner and Clear texts, one model-invoked and one typed-only skill.
const msnc = (extra = {}) => fixture({
  '.claude-plugin/plugin.json': { name: 'msnc', userConfig: {
    clear: { type: 'boolean', default: true },
    trim_default: { type: 'string', default: 'off' },
    scope_gate: { type: 'boolean', default: true },
  } },
  'vendor.json': [{ repo: 'x/y', paths: { 'skills/aside': 'commands/aside.md', 'skills/grill': 'skills/productivity/grilling' } }],
  'context/tuner.md': 'one two three four five six seven eight nine ten',
  'context/clear.md': 'a b c d e f g h i j k l m n o p q r s t',
  'skills/grill/SKILL.md': '---\nname: grill\ndescription: w1 w2 w3 w4 w5 w6 w7 w8 w9 w10\n---\nbody words never count\n',
  'skills/aside/SKILL.md': '---\nname: aside\ndescription: typed only so not loaded\ndisable-model-invocation: true\n---\n',
  'skills/trim/levels/full.md': 'x '.repeat(100),
  ...extra,
});
const line = (lines, prefix) => lines.find((l) => l.startsWith(prefix));

test('options line shows each MSNC option, the user\'s value over the default', () => {
  const home = fixture({ '.claude/settings.json': { pluginConfigs: { 'msnc@msnc': { options: { trim_default: 'full', clear: false } } } } });
  assert.equal(line(doctor({ home, cwd: fixture(), root: msnc() }), 'Options:'), 'Options: clear off, trim_default full, scope_gate on');
  assert.equal(line(doctor({ home: fixture(), cwd: fixture(), root: msnc() }), 'Options:'), 'Options: clear on, trim_default off, scope_gate on');
});

test('options line lists every option the shipped manifest declares, pace included', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  assert.equal(line(doctor({ home: fixture(), cwd: fixture(), root }), 'Options:'), 'Options: clear on, trim_default off, scope_gate on, pace 3');
  const home = fixture({ '.claude/settings.json': { pluginConfigs: { 'msnc@msnc': { options: { pace: 0 } } } } });
  assert.match(line(doctor({ home, cwd: fixture(), root }), 'Options:'), /, pace 0$/);
});

test('always-loaded estimate counts Tuner, Clear when on, Trim when on by default, and model-invoked skill descriptions', () => {
  // words × 1.3: Tuner 10 → 13, Clear 20 → 26, grill's description 10 → 13, Trim full 100 → 130; aside is typed-only.
  assert.equal(line(doctor({ home: fixture(), cwd: fixture(), root: msnc() }), 'Always loaded:'),
    'Always loaded: ~52 tokens (Tuner ~13, Clear ~26, 1 skill description ~13)');
  const home = fixture({ '.claude/settings.json': { pluginConfigs: { 'msnc@msnc': { options: { trim_default: 'full', clear: false } } } } });
  assert.equal(line(doctor({ home, cwd: fixture(), root: msnc() }), 'Always loaded:'),
    'Always loaded: ~156 tokens (Tuner ~13, Trim full ~130, 1 skill description ~13)');
});

// A plugin install: skills in the default skills/ folder, extra skill paths from its manifest, commands/*.md.
const plugin = (files) => fixture(files);
const installed = (map) => ({ plugins: Object.fromEntries(Object.entries(map).map(([id, dir]) => [id, [{ scope: 'user', installPath: dir }]])) });

test('duplicate check lists MSNC skills (by MSNC or upstream name) that enabled plugins, personal or project skills also ship', () => {
  const x = plugin({
    '.claude-plugin/plugin.json': { name: 'x', skills: ['./skills/productivity/grilling'] },
    'skills/productivity/grilling/SKILL.md': '---\nname: grilling\n---\n',
    'skills/unrelated/SKILL.md': '---\nname: unrelated\n---\n',
    'commands/aside.md': 'aside\n',
  });
  const y = plugin({ 'skills/aside/SKILL.md': '---\nname: aside\n---\n' });
  const off = plugin({ 'skills/grill/SKILL.md': '---\nname: grill\n---\n' });
  const home = fixture({
    '.claude/settings.json': { enabledPlugins: { 'x@m': true, 'off@m': false, 'y@m': false, 'msnc@msnc': true } },
    '.claude/plugins/installed_plugins.json': installed({ 'x@m': x, 'y@m': y, 'off@m': off, 'msnc@msnc': msnc() }),
    '.claude/skills/grill/SKILL.md': '---\nname: grill\n---\n',
  });
  const cwd = fixture({
    '.claude/settings.local.json': { enabledPlugins: { 'y@m': true } }, // project-local wins over the user's off
    '.claude/skills/tdd/SKILL.md': '---\nname: tdd\n---\n',
  });
  const dupes = doctor({ home, cwd, root: msnc() }).filter((l) => l.startsWith('Duplicate skills:'));
  assert.deepEqual(dupes, [
    'Duplicate skills: plugin x@m has aside, grilling',
    'Duplicate skills: plugin y@m has aside',
    `Duplicate skills: ${join(home, '.claude', 'skills')} has grill`,
  ]);
  assert.deepEqual(doctor({ home: fixture(), cwd: fixture(), root: msnc() }).filter((l) => l.startsWith('Duplicate skills:')), ['Duplicate skills: none']);
});

test('project check flags project settings that turn on a plugin duplicating MSNC, or turn off MSNC or such a plugin', () => {
  const x = plugin({ 'commands/aside.md': 'aside\n' });
  const z = plugin({ 'skills/other/SKILL.md': '---\nname: other\n---\n' });
  const p1 = fixture({ '.claude/settings.json': { enabledPlugins: { 'x@m': true, 'z@m': true } } });
  const p2 = fixture({
    '.claude/settings.json': { hooks: {} },
    '.claude/settings.local.json': { enabledPlugins: { 'x@m': false, 'z@m': false, 'msnc@msnc': false } },
  });
  const quiet = fixture({ '.claude/settings.json': { enabledPlugins: { 'z@m': true } } });
  const home = fixture({
    '.claude.json': { projects: { [p1]: {}, [p1.replaceAll('\\', '/')]: {}, [p2]: {}, [quiet]: {}, [join(base, 'gone')]: {} } },
    '.claude/plugins/installed_plugins.json': installed({ 'x@m': x, 'z@m': z }),
  });
  const lines = doctor({ home, cwd: fixture(), root: msnc() }).filter((l) => l.startsWith('Project settings:'));
  assert.deepEqual(lines, [
    `Project settings: ${join(p1, '.claude', 'settings.json')} turns on x@m (duplicates MSNC: aside)`,
    `Project settings: ${join(p2, '.claude', 'settings.local.json')} turns off x@m, msnc@msnc`,
  ]);
  assert.deepEqual(doctor({ home: fixture(), cwd: fixture(), root: msnc() }).filter((l) => l.startsWith('Project settings:')), ['Project settings: no conflicts']);
});

test('layout check flags vendored atlas/scalpel skill folders and the atlas CLAUDE.md block', () => {
  const cwd = fixture({
    '.claude/skills/atlas/SKILL.md': 'x', '.claude/skills/scalpel/SKILL.md': 'x', '.claude/skills/mine/SKILL.md': 'x',
    'CLAUDE.md': '# Repo\n\n<!-- atlas:begin -->\natlas-first\n<!-- atlas:end -->\n',
  });
  assert.deepEqual(doctor({ home: fixture(), cwd, root: msnc() }).filter((l) => l.startsWith('Old Scope layout:')), [
    'Old Scope layout: .claude/skills/atlas, .claude/skills/scalpel',
    'Old Scope layout: CLAUDE.md has a <!-- atlas:begin --> block',
  ]);
  const clean = fixture({ '.scope/files/graph/nodes.jsonl': '', '.claude/settings.json': { hooks: {} } });
  assert.deepEqual(doctor({ home: fixture(), cwd: clean, root: msnc() }).filter((l) => l.startsWith('Old Scope layout:')), ['Old Scope layout: none']);
});

test('layout check flags an old .atlas/ or .map/ index folder', () => {
  const layout = (files) => doctor({ home: fixture(), cwd: fixture(files), root: msnc() }).filter((l) => l.startsWith('Old Scope layout:'));
  assert.deepEqual(layout({ '.atlas/graph/nodes.jsonl': '', '.map/index/meta.json': '{}' }),
    ['Old Scope layout: .atlas/, .map/ index folders (move them into .scope/)']);
  assert.deepEqual(layout({ '.map/index/meta.json': '{}' }), ['Old Scope layout: .map/ index folders (move them into .scope/)']);
});

// Recipe use. A recipe is a typed-only skill (disable-model-invocation: true) in the project's or the personal
// .claude/skills. A use is a typed /name or a Skill call in any project's transcript; a correction, rejected tool
// call or failed check counts against the skill used last before it in that session (skills/refine/corrections.mjs).
test('recipe use lists recipes unused for 30 days and the most-corrected ones', () => {
  const now = Date.now();
  const day = (n) => new Date(now - n * 864e5).toISOString();
  const jsonl = (...lines) => lines.map((l) => JSON.stringify(l)).join('\n');
  const user = (ts, content) => ({ type: 'user', timestamp: ts, message: { role: 'user', content } });
  const typed = (ts, name) => user(ts, `<command-message>${name}</command-message>\n<command-name>/${name}</command-name>`);
  const skillCall = (ts, skill) => ({ type: 'assistant', timestamp: ts, message: { role: 'assistant', content: [{ type: 'tool_use', name: 'Skill', input: { skill } }] } });
  const recipe = (name) => `---\nname: ${name}\ndescription: x\ndisable-model-invocation: true\n---\n`;
  const cwd = fixture({
    '.claude/skills/deploy/SKILL.md': recipe('deploy'),
    '.claude/skills/stale/SKILL.md': recipe('stale'),
    '.claude/skills/fresh/SKILL.md': recipe('fresh'), // never used, but made this week
    '.claude/skills/helper/SKILL.md': '---\nname: helper\ndescription: x\n---\n', // model-invoked: not a recipe
  });
  const home = fixture({
    '.claude/skills/release/SKILL.md': recipe('release'),
    '.claude/skills/old/SKILL.md': recipe('old'),
    '.claude/projects/p1/a.jsonl': jsonl(
      typed(day(3), 'deploy'), user(day(3), 'no, use the staging branch'), user(day(3), "don't skip the tests"),
      skillCall(day(2), 'release'), user(day(2), 'stop, wrong version'),
      skillCall(day(1), 'msnc:trim'), user(day(1), 'actually, not that'), // not a recipe
    ),
    '.claude/projects/p2/b.jsonl': jsonl(typed(day(40), 'old'), user(day(40), 'no, wrong')), // too long ago
  });
  const old = new Date(now - 60 * 864e5);
  for (const [dir, names] of [[cwd, ['deploy', 'stale', 'helper']], [home, ['release', 'old']]])
    for (const n of names) utimesSync(join(dir, '.claude', 'skills', n, 'SKILL.md'), old, old);
  const lines = doctor({ home, cwd, root: msnc() });
  assert.equal(line(lines, 'Recipes unused 30+ days:'), 'Recipes unused 30+ days: stale (project), old (personal)');
  assert.equal(line(lines, 'Most-corrected recipes:'), 'Most-corrected recipes: deploy 2, release 1 (last 30 days)');
  const empty = doctor({ home: fixture(), cwd: fixture(), root: msnc() });
  assert.equal(line(empty, 'Recipes unused 30+ days:'), 'Recipes unused 30+ days: none');
  assert.equal(line(empty, 'Most-corrected recipes:'), 'Most-corrected recipes: none');
});
