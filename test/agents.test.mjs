// The three plugin agents (spec "Agents", "Models"): frontmatter config and the rules each body carries.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (p) => readFileSync(fileURLToPath(new URL(`../${p}`, import.meta.url)), 'utf8').replace(/\r\n/g, '\n');
const agent = (name) => {
  const [, fm, body] = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(read(`agents/${name}.md`));
  const field = (key) => new RegExp(`^${key}: (.+)$`, 'm').exec(fm)?.[1];
  // A comma-separated value or a YAML block list.
  const list = (key) => field(key)?.split(',').map((s) => s.trim()) ??
    [...(new RegExp(`^${key}:\\n((?:  - .+\\n?)+)`, 'm').exec(fm)?.[1] ?? '').matchAll(/- (.+)/g)].map((m) => m[1].trim());
  return { fm, body, field, list };
};

// Every built-in tool that writes files or hands work to something that can: the file tools
// (MultiEdit for older Claude Code), a nested subagent, and a new git worktree.
const WRITERS = ['Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'Agent', 'EnterWorktree'];

test("explorer's tool config cannot write files", () => {
  const { field, list } = agent('explorer');
  assert.equal(field('tools'), undefined, 'no allowlist that could re-add a writer');
  assert.deepEqual(WRITERS.filter((t) => !list('disallowedTools').includes(t)), []);
});

test('explorer puts Scope reads before grep and whole files, ctx_* outside plan mode, and never scans', () => {
  const { body } = agent('explorer');
  assert.ok(body.includes('node "${CLAUDE_PLUGIN_ROOT}/skills/scope/scripts/sextant.mjs"'), 'Scope CLI path');
  assert.match(body, /`query "<nouns>"`, `locate <name>` and `context <path>` before any grep/);
  assert.match(body, /`slice <id>` before reading a whole file/);
  assert.match(body, /Never `scan`/);
  assert.match(body, /`ctx_\*` tools when installed/);
  assert.match(body, /In plan mode .*→ Read, Grep and Glob only/);
});

// Spec "Models": each user's CLAUDE_CODE_SUBAGENT_MODEL default and session effort apply.
test('each agent is named after its file and sets neither model nor effort', () => {
  for (const name of ['explorer', 'planner', 'implementer']) {
    const { field } = agent(name);
    assert.equal(field('name'), name);
    assert.ok(field('description'), `${name}: description`);
    assert.equal(field('model'), undefined, `${name}: model`);
    assert.equal(field('effort'), undefined, `${name}: effort`);
  }
});

test('planner loads Trim, scopes with impact --depth 2 when indexed, and lists the covering tests', () => {
  const { list, body } = agent('planner');
  assert.deepEqual(list('skills'), ['msnc:trim']);
  assert.match(body, /`\.atlas\/`.*`impact <file\|symbol> --depth 2`/);
  assert.match(body, /plan mode.*Read, Grep and Glob/);
  assert.match(body, /covering tests/);
});

test('implementer works one ticket test-first with Trim and tdd, checks after every change, never commits', () => {
  const { list, body } = agent('implementer');
  assert.deepEqual(list('skills'), ['msnc:trim', 'msnc:tdd']);
  assert.match(body, /the one ticket in your brief and nothing else/);
  assert.match(body, /`\.atlas\/`.*`impact <file\|symbol>` before each edit/);
  assert.match(body, /After every change, run the typecheck and the affected test file/);
  assert.match(body, /Never commit/);
  for (const item of ['Files changed', 'Which test covers each acceptance criterion', 'last result line of each check', 'Open questions'])
    assert.ok(body.includes(item), `report: ${item}`);
});

test('/msnc:implement dispatches msnc:implementer and leaves the per-ticket rules to the agent', () => {
  const skill = read('skills/implement/SKILL.md');
  assert.match(skill, /ONE `msnc:implementer` subagent in the foreground/);
  const brief = /^ {3}> (.+)$/m.exec(skill)[1];
  assert.match(brief, /ticket `<path or #N>`/);
  assert.match(brief, /`<typecheck>`/);
  assert.doesNotMatch(brief, /commit|msnc:trim|msnc:tdd|Report:/i, 'the agent carries these');
});

test('Tuner sends plan-mode sweeps to msnc:explorer', () => {
  assert.match(read('context/tuner.md'), /In plan mode ctx calls need approval: use Read\/Grep\/Glob or the `msnc:explorer` agent/);
});
