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

test('implementer decides reversible choices and reports them for the caller to log; stops on irreversible ones', () => {
  const { body } = agent('implementer');
  assert.match(body, /A reversible choice the ticket leaves open → decide it; don't ask/);
  assert.match(body, /Don't write `docs\/decisions\.md` or the ticket: the caller records them/);
  assert.match(body, /irreversible or destructive decision.*→ stop and report it; don't guess/);
  assert.match(body, /^- Decisions: one line each, `decision · why · undo`\.$/m);
});

test('/msnc:implement dispatches msnc:implementer and leaves the per-ticket rules to the agent', () => {
  const skill = read('skills/implement/SKILL.md');
  assert.match(skill, /ONE `msnc:implementer` subagent in the foreground/);
  const brief = /^ {3}> (.+)$/m.exec(skill)[1];
  assert.match(brief, /ticket `<path or #N>`/);
  assert.match(brief, /`<typecheck>`/);
  assert.doesNotMatch(brief, /commit|msnc:trim|msnc:tdd|Report:/i, 'the agent carries these');
});

// Spec "A why in every delegation" (ticket 14): outcome, why, recipe, done-check in the brief; report format in the agent.
test('every implementer brief carries the outcome, the why, the recipe, the done-check and the report format', () => {
  const skill = read('skills/implement/SKILL.md');
  const brief = /^ {3}> (.+)$/m.exec(skill)[1];
  for (const part of ['Outcome: ', 'Why: ', 'Recipe: ', 'Done-check: ']) assert.ok(brief.includes(part), `brief: ${part}`);
  assert.match(skill, /fresh subagent with the same brief plus the failure output/, 'the retry brief too');
  const { body } = agent('implementer');
  assert.match(body, /Your brief gives the outcome, the why, the recipe to follow and the done-check/);
  assert.match(body, /Use the why for the judgment calls the ticket leaves open/);
  assert.match(body, /^Report:$/m, 'report format');
});

// Spec "Just enough sizing" (ticket 12): Tuner and the planner size the same way, with ECC orch-pipeline's signals.
const assertSizing = (text, who) => {
  assert.match(text, /^(?=.*one line)(?=.*size)(?=.*why)/im,`${who}: states size and why in one line`);
  for (const signal of ['files', 'unknowns', 'irreversible steps', 'modules crossed'])
    assert.ok(text.includes(signal), `${who}: signal ${signal}`);
  assert.match(text, /Small: [^.]*do it/, `${who}: small`);
  assert.match(text, /Medium: \/msnc:tickets → \/msnc:implement/, `${who}: medium`);
  assert.match(text, /Large: \/msnc:grill → \/msnc:spec → medium/, `${who}: large`);
};

test('Tuner sizes multi-step work before planning', () => {
  assertSizing(read('context/tuner.md'), 'Tuner');
});

// Ticket 18: "Multi-step → one line first", below the Trim line, lost: runs loaded Trim and built a large feature
// unsized. Sizing now gates the first edit, ahead of the Trim line.
test('Tuner sizes a task before any edit, ahead of loading Trim', () => {
  const lines = read('context/tuner.md').split('\n');
  const size = lines.findIndex((l) => /^Before any edit → one line: size \+ why/.test(l));
  assert.ok(size > 0, 'sizing gates every edit');
  // A run that sized "Medium: 3 modules crossed" built straight away; the planner's "several → large" settles it.
  assert.match(lines[size], /\(worst of files, unknowns, irreversible steps, modules crossed; several → large\)/);
  assert.ok(size < lines.findIndex((l) => l.includes('`msnc:trim`')), 'sizing comes before the Trim line');
});

test('the planner sizes the task the same way and opens its plan with the size', () => {
  const { body } = agent('planner');
  assertSizing(body, 'planner');
  assert.match(body, /Return:\n1\. The size and why, in one line\./);
});

// Spec "Decide to Decide" (ticket 13): decide and log reversible choices; ask only about irreversible ones.
test('Tuner decides reversible choices and logs them, and asks one question with a recommendation otherwise', () => {
  const tuner = read('context/tuner.md');
  assert.match(tuner, /^Reversible → decide, say it in one line, log to `docs\/decisions\.md`: date · decision · why · undo\./m);
  assert.match(tuner, /Irreversible\/destructive → one question \+ recommended answer\./);
  assert.match(read('context/clear.md'), /^- Destructive step → confirm first\.$/m, 'Clear keeps its override');
});

// Ticket 17: a how-to reply's first line is step 1 itself, not a colon line introducing the steps.
test('Clear starts steps on line 1 and counts a lead-in ending in ":" as preamble, within 1,748 bytes', () => {
  const clear = read('context/clear.md');
  assert.match(clear, /^1\. First line = [^\n]*No preamble \([^\n]*a lead-in ending in ":"\)/m);
  assert.match(clear, /^3\. [^\n]*→ numbered list from line 1,/m);
  assert.ok(Buffer.byteLength(clear) <= 1748, `${Buffer.byteLength(clear)} bytes`);
});

test('Tuner sends plan-mode sweeps to msnc:explorer', () => {
  assert.match(read('context/tuner.md'), /In plan mode ctx calls need approval: use Read\/Grep\/Glob or the `msnc:explorer` agent/);
});
