import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (p) => readFileSync(fileURLToPath(new URL(`../${p}`, import.meta.url)), 'utf8').replace(/\r\n/g, '\n');
const skills = readdirSync(new URL('../skills', import.meta.url), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
const frontmatter = (name) => /^---\n([\s\S]*?)\n---\n/.exec(read(`skills/${name}/SKILL.md`))[1];

// Spec "Invocation": these stay model-invoked (short descriptions loaded); every other skill is typed-only.
const MODEL_INVOKED = ['trim', 'grill', 'tdd', 'codebase-design', 'scope'];

test('each skill is named after its folder and is model-invoked or typed-only per the spec', () => {
  assert.ok(skills.includes('trim'));
  for (const name of skills) {
    const fm = frontmatter(name);
    assert.match(fm, new RegExp(`^name: ${name}$`, 'm'), name);
    assert.equal(/^disable-model-invocation: true$/m.test(fm), !MODEL_INVOKED.includes(name), name);
  }
});

test('Relay ships grill, tdd and codebase-design model-invoked; spec, tickets and implement typed-only', () => {
  for (const name of ['grill', 'tdd', 'codebase-design']) assert.doesNotMatch(frontmatter(name), /disable-model-invocation/, name);
  for (const name of ['spec', 'tickets', 'implement']) assert.match(frontmatter(name), /^disable-model-invocation: true$/m, name);
  assert.match(frontmatter('grill'), /grill|stress-test/);
});

test('Calibrate, Proof and the helpers ship as seven typed-only skills', () => {
  for (const name of ['aside', 'rephrase', 'handoff', 'verify', 'doctor', 'declutter', 'setup'])
    assert.match(frontmatter(name), /^disable-model-invocation: true$/m, name);
});

test('setup shows every settings change and writes only after a yes, and pins no model itself', () => {
  const body = read('skills/setup/SKILL.md');
  assert.match(body, /Before changing any file.*show the exact change/);
  assert.match(body, /anything but yes → write nothing/);
  assert.match(body, /one yes per change/i);
  for (const s of ['`clear`', '`trim_default`', '`scope_gate`', 'context-mode', 'ctx_purge', 'ctx_upgrade', 'docs/agents/issue-tracker.md', '/msnc:scope init', 'CLAUDE_CODE_SUBAGENT_MODEL', 'claude-opus-5-5'])
    assert.ok(body.includes(s), s);
  assert.match(body, /MSNC itself pins no model/);
});

test('setup\'s local tracker template is this repo\'s tracker file without its feature list', () => {
  const repo = read('docs/agents/issue-tracker.md').replace(/## Current features\n[\s\S]*?\n(?=## )/, '');
  assert.equal(read('skills/setup/issue-tracker-local.md'), repo);
});

test('rephrase uses CONTEXT.md only when the repo has one', () => {
  assert.match(read('skills/rephrase/SKILL.md'), /when the repo has a `CONTEXT\.md`, use its ubiquitous language/);
});

test('verify adds sextant check only in a repo with a Scope index', () => {
  const body = read('skills/verify/SKILL.md');
  assert.match(body, /Only when the repo has a Scope index \(`\.atlas\/` exists\)/);
  assert.match(body, /sextant check/);
  assert.match(body, /No `\.atlas\/` → report Scope as SKIPPED/);
});

test('doctor runs its script and only reads; declutter moves to trash first and asks per item', () => {
  const doctor = read('skills/doctor/SKILL.md');
  assert.match(doctor, /node "\$\{CLAUDE_SKILL_DIR\}\/doctor\.mjs"/);
  assert.match(doctor, /Doctor only reads\. It never edits/);
  const declutter = read('skills/declutter/SKILL.md');
  assert.match(declutter, /Every candidate gets its own `\[y\/n\/skip\]` confirmation\. No "yes to all" shortcut\./);
  assert.match(declutter, /move to `~\/\.claude\/_gc_trash\/`/);
  assert.match(declutter, /Only hard-delete when the user explicitly asks\./);
});

test('implement stops with a message, never waits, outside a git repo or with uncommitted changes', () => {
  const body = read('skills/implement/SKILL.md');
  assert.match(body, /^- Not inside a git repo.*→ stop: say/im);
  assert.match(body, /^- Uncommitted changes.*→ stop and ask/im);
  assert.match(body, /never (hang|wait)/i);
});

test('implement runs one foreground msnc:implementer per ticket and uses the Scope index when present', () => {
  const body = read('skills/implement/SKILL.md');
  assert.match(body, /ONE `msnc:implementer` subagent in the foreground/);
  assert.match(body, /\/msnc:scope init/);
  assert.match(body, /sextant impact/);
  assert.match(body, /sextant check/);
});

test('trim triggers on code work', () => {
  assert.match(frontmatter('trim'), /coding task: writing, adding, refactoring, fixing, reviewing, or designing/);
});

// ponytail's hooks/ponytail-instructions.js at the pinned commit: drop the frontmatter, keep only this
// level's intensity-table row and worked example (`- <level>: "..."`), keep every other line.
function forLevel(skill, level) {
  const other = (label) => ['lite', 'full', 'ultra'].includes(label.trim().toLowerCase()) && label.trim().toLowerCase() !== level;
  return skill.replace(/^---[\s\S]*?---\s*/, '').split('\n').filter((line) => {
    const row = line.match(/^\|\s*\*\*(.+?)\*\*\s*\|/) || line.match(/^-\s*([^:]+):\s*"/);
    return !(row && other(row[1]));
  }).join('\n');
}

test('each level text is the trim skill filtered to that level, as ponytail injects it', () => {
  const skill = read('skills/trim/SKILL.md');
  for (const level of ['lite', 'full', 'ultra']) {
    const text = read(`skills/trim/levels/${level}.md`);
    assert.equal(text.trim(), `TRIM ACTIVE — level: ${level}\n\n${forLevel(skill, level)}`.trim(), level);
    for (const l of ['lite', 'full', 'ultra']) {
      assert.equal(text.includes(`| **${l}** |`), l === level, `${level}: intensity row ${l}`);
      assert.equal(text.includes(`\n- ${l}: "`), l === level, `${level}: example ${l}`);
    }
    assert.match(text, /Scope index → `sextant impact`; otherwise grep every caller/);
    assert.doesNotMatch(text, /^name:/m);
  }
});

test('scope is model-invoked with a short description and gives the CLI path, init mode and core loop', () => {
  const fm = frontmatter('scope');
  const description = /^description: (.+)$/m.exec(fm)[1];
  assert.ok(description.length <= 200, `${description.length} characters`);
  const body = read('skills/scope/SKILL.md');
  assert.ok(body.includes('node "${CLAUDE_SKILL_DIR}/scripts/sextant.mjs"'), 'CLI path');
  assert.match(body, /`\/msnc:scope init`/);
  assert.match(body, /\$ARGUMENTS/);
  for (const cmd of ['map', 'query', 'locate', 'impact', 'slice', 'check', 'scan']) assert.match(body, new RegExp(`\\$S ${cmd}\\b`), cmd);
  assert.match(body, /no hooks? and no `CLAUDE\.md` block/i);
  assert.match(body, /CSS|HTML/);
});
