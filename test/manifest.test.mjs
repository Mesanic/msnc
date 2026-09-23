import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));

test('plugin exposes clear, trim_default, scope_gate and pace with the spec defaults', () => {
  const { userConfig } = read('.claude-plugin/plugin.json');
  assert.deepEqual(Object.keys(userConfig).sort(), ['clear', 'pace', 'scope_gate', 'trim_default']);
  // Spec "Human pacing": a stop offered every 3 tickets by default; 0 never offers one.
  assert.equal(userConfig.pace.type, 'number');
  assert.equal(userConfig.pace.default, 3);
  assert.equal(userConfig.pace.min, 0);
  assert.match(userConfig.pace.description, /0 = never/);
  assert.equal(userConfig.clear.type, 'boolean');
  assert.equal(userConfig.clear.default, true);
  assert.equal(userConfig.scope_gate.type, 'boolean');
  assert.equal(userConfig.scope_gate.default, true);
  assert.equal(userConfig.trim_default.type, 'string');
  // No `options` picker: it needs Claude Code 2.1.271+ and older versions refuse to load the plugin.
  assert.equal(userConfig.trim_default.options, undefined);
  assert.match(userConfig.trim_default.description, /off.*lite.*full.*ultra/);
  assert.equal(userConfig.trim_default.default, 'off');
  for (const o of Object.values(userConfig)) {
    assert.ok(o.title && o.description, 'title and description are required');
    assert.ok(!o.sensitive && !o.multiple, 'sensitive/multiple fields get no /config row');
  }
});

// Claude Code substitutes ${user_config.KEY} in skill and agent content; an undeclared key throws at load.
test('every ${user_config.KEY} in skills and agents is a declared option, and implement reads pace that way', () => {
  const { userConfig } = read('.claude-plugin/plugin.json');
  const texts = ['skills', 'agents'].flatMap((d) => readdirSync(new URL(`../${d}`, import.meta.url), { recursive: true })
    .filter((f) => f.endsWith('.md')).map((f) => [`${d}/${f}`, readFileSync(new URL(`../${d}/${f}`, import.meta.url), 'utf8')]));
  const refs = texts.flatMap(([f, t]) => [...t.matchAll(/\$\{user_config\.([^}]+)\}/g)].map((m) => [f.replaceAll('\\', '/'), m[1]]));
  assert.deepEqual(refs.filter(([, k]) => !(k in userConfig)), []);
  assert.ok(refs.some(([f, k]) => f === 'skills/implement/SKILL.md' && k === 'pace'), 'implement reads pace');
});

test('marketplace msnc lists the msnc plugin from the repo root', () => {
  const m = read('.claude-plugin/marketplace.json');
  assert.equal(m.name, 'msnc');
  assert.deepEqual(m.plugins.map((p) => [p.name, p.source]), [['msnc', './']]);
});

test('LICENSE is MIT for Mesanic', () => {
  const text = readFileSync(new URL('../LICENSE', import.meta.url), 'utf8');
  assert.match(text, /^MIT License/);
  assert.match(text, /Copyright \(c\) 2026 Mesanic/);
});
