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
