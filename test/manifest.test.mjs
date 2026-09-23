import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));

test('plugin exposes clear, trim_default and scope_gate with the spec defaults', () => {
  const { userConfig } = read('.claude-plugin/plugin.json');
  assert.deepEqual(Object.keys(userConfig).sort(), ['clear', 'scope_gate', 'trim_default']);
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
