// Usage: node doctor.mjs   (run from the repo to check; reads only, never writes)
// /msnc:doctor's mechanical checks, one report line (or more) per check.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { readEvents } from '../refine/corrections.mjs';

const read = (p) => { try { return readFileSync(p, 'utf8').replace(/\r\n/g, '\n'); } catch { return ''; } };
const dirs = (p) => { try { return readdirSync(p, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name); } catch { return []; } };
const files = (p) => { try { return readdirSync(p, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name); } catch { return []; } };
const skillDirs = (p) => dirs(p).filter((d) => existsSync(join(p, d, 'SKILL.md')));
const readJson = (p) => { try { return JSON.parse(read(p).replace(/^﻿/, '')); } catch { return undefined; } };

// userConfig values live in ~/.claude/settings.json pluginConfigs["msnc@<marketplace>"].options; the rest are defaults.
function options(home, root) {
  const config = readJson(join(root, '.claude-plugin', 'plugin.json'))?.userConfig ?? {};
  const configs = readJson(join(home, '.claude', 'settings.json'))?.pluginConfigs ?? {};
  const set = Object.entries(configs).find(([id]) => id.startsWith('msnc@'))?.[1]?.options ?? {};
  return Object.fromEntries(Object.entries(config).map(([k, { default: d }]) => [k, set[k] ?? d]));
}
const show = (v) => (v === true ? 'on' : v === false ? 'off' : String(v));

// context-budget's estimate: words × 1.3.
const tokens = (text) => Math.round((text.match(/\S+/g) ?? []).length * 1.3);

// What the dispatcher injects every session (Tuner, Clear unless off, Trim at its default level) plus the
// descriptions of skills without disable-model-invocation, which stay loaded.
function alwaysLoaded(root, opts) {
  const parts = [['Tuner', tokens(read(join(root, 'context', 'tuner.md')))]];
  if (!['false', '0'].includes(String(opts.clear))) parts.push(['Clear', tokens(read(join(root, 'context', 'clear.md')))]);
  const level = String(opts.trim_default);
  if (['lite', 'full', 'ultra'].includes(level)) parts.push([`Trim ${level}`, tokens(read(join(root, 'skills', 'trim', 'levels', `${level}.md`)))]);
  const loaded = dirs(join(root, 'skills'))
    .map((d) => /^---\n([\s\S]*?)\n---/.exec(read(join(root, 'skills', d, 'SKILL.md')))?.[1])
    .filter((fm) => fm && !/^disable-model-invocation: true$/m.test(fm));
  const described = loaded.reduce((n, fm) => n + tokens(/^description: (.*)$/m.exec(fm)?.[1] ?? ''), 0);
  parts.push([`${loaded.length} skill description${loaded.length === 1 ? '' : 's'}`, described]);
  const total = parts.reduce((n, [, t]) => n + t, 0);
  return `Always loaded: ~${total} tokens (${parts.map(([k, t]) => `${k} ~${t}`).join(', ')})`;
}

// MSNC's skill names plus the upstream names they were copied from (vendor.json paths): grilling, verification-loop, ...
function msncNames(root) {
  const upstream = (readJson(join(root, 'vendor.json')) ?? []).flatMap((e) => Object.values(e.paths ?? {}));
  return new Set([...skillDirs(join(root, 'skills')), ...upstream.map((p) => basename(p, '.md'))]);
}

// Plugins on for this repo: user settings, then the project's settings.json, then settings.local.json (last wins).
const layers = (dir) => ['settings.json', 'settings.local.json'].map((f) => [f, readJson(join(dir, '.claude', f)) ?? {}]);
function enabledPlugins(home, cwd) {
  const on = Object.assign({}, readJson(join(home, '.claude', 'settings.json'))?.enabledPlugins, ...layers(cwd).map(([, s]) => s.enabledPlugins));
  return Object.keys(on).filter((id) => on[id] === true && !id.startsWith('msnc@'));
}

// The install a project uses: its own local/project install, else the user-scope one.
function installPath(home, id, project) {
  const entries = readJson(join(home, '.claude', 'plugins', 'installed_plugins.json'))?.plugins?.[id] ?? [];
  const here = entries.find((e) => e.projectPath && resolve(e.projectPath) === resolve(project));
  return (here ?? entries.find((e) => e.scope === 'user') ?? entries[0])?.installPath;
}

// Skill and command names a plugin ships: skills/ plus its manifest's skill paths, commands/*.md plus its manifest's.
function pluginSkills(dir) {
  if (!dir) return [];
  const m = readJson(join(dir, '.claude-plugin', 'plugin.json')) ?? {};
  const names = [];
  for (const p of ['skills', ...[m.skills ?? []].flat()])
    names.push(...(existsSync(join(dir, p, 'SKILL.md')) ? [basename(join(dir, p))] : skillDirs(join(dir, p))));
  for (const p of ['commands', ...[m.commands ?? []].flat()])
    names.push(...(p.endsWith('.md') ? [p] : files(join(dir, p))).filter((f) => f.endsWith('.md')).map((f) => basename(f, '.md')));
  return names;
}

function duplicates(home, cwd, names) {
  const sources = [
    ...enabledPlugins(home, cwd).map((id) => [`plugin ${id}`, pluginSkills(installPath(home, id, cwd))]),
    ...[home, cwd].map((d) => join(d, '.claude', 'skills')).map((d) => [d, skillDirs(d)]),
  ];
  const out = sources
    .map(([where, have]) => [where, [...new Set(have.filter((n) => names.has(n)))].sort()])
    .filter(([, dupes]) => dupes.length)
    .map(([where, dupes]) => `Duplicate skills: ${where} has ${dupes.join(', ')}`);
  return out.length ? out : ['Duplicate skills: none'];
}

// Every project Claude Code knows (~/.claude.json): project-level enabledPlugins that turn on a plugin duplicating
// MSNC skills, or turn off MSNC or such a plugin (an override to review once MSNC replaces it).
function projectSettings(home, names) {
  const projects = new Map(Object.keys(readJson(join(home, '.claude.json'))?.projects ?? {}).map((p) => [resolve(p).toLowerCase(), resolve(p)]));
  const out = [];
  for (const project of projects.values())
    for (const [file, s] of layers(project)) {
      const dupes = (id) => [...new Set(pluginSkills(installPath(home, id, project)).filter((n) => names.has(n)))].sort();
      const on = [], off = [];
      for (const [id, v] of Object.entries(s.enabledPlugins ?? {})) {
        if (v === true && dupes(id).length) on.push(`${id} (duplicates MSNC: ${dupes(id).join(', ')})`);
        if (v === false && (id.startsWith('msnc@') || dupes(id).length)) off.push(id);
      }
      const parts = [on.length && `turns on ${on.join(', ')}`, off.length && `turns off ${off.join(', ')}`].filter(Boolean);
      if (parts.length) out.push(`Project settings: ${join(project, '.claude', file)} ${parts.join('; ')}`);
    }
  return out.length ? out : ['Project settings: no conflicts'];
}

// Pre-rename Scope in this repo: vendored skill folders, the atlas CLAUDE.md routing block, and the index folders
// .atlas/ and .map/ that now live under .scope/.
function oldScope(cwd) {
  const vendored = ['atlas', 'scalpel'].map((d) => `.claude/skills/${d}`).filter((d) => existsSync(join(cwd, d)));
  const indexes = ['.atlas', '.map'].filter((d) => existsSync(join(cwd, d))).map((d) => `${d}/`);
  const claudeMd = read(join(cwd, 'CLAUDE.md'));
  const out = [
    vendored.length && vendored.join(', '),
    indexes.length && `${indexes.join(', ')} index folders (move them into .scope/)`,
    claudeMd.includes('<!-- atlas:begin -->') && 'CLAUDE.md has a <!-- atlas:begin --> block',
  ].filter(Boolean);
  return (out.length ? out : ['none']).map((l) => `Old Scope layout: ${l}`);
}

// Recipes: typed-only skills (disable-model-invocation: true) in the project's and the personal .claude/skills.
// Use and corrections come from every project's transcripts touched in the last 30 days (a personal recipe runs
// anywhere): a typed /name or a Skill call is a use; a correction, rejected tool call or failed check counts against
// the skill used last before it in that session. Unused = no use in 30 days and SKILL.md not changed in 30 days.
const MONTH = 30 * 864e5;
function recipeUse(home, cwd, now) {
  const recipes = [['project', cwd], ['personal', home]].flatMap(([where, dir]) => skillDirs(join(dir, '.claude', 'skills'))
    .filter((d) => /^disable-model-invocation: true$/m.test(/^---\n([\s\S]*?)\n---/.exec(read(join(dir, '.claude', 'skills', d, 'SKILL.md')))?.[1] ?? ''))
    .sort().map((name) => ({ name, where, changed: statSync(join(dir, '.claude', 'skills', name, 'SKILL.md')).mtimeMs })));
  const since = now - MONTH;
  const projects = join(home, '.claude', 'projects');
  const events = dirs(projects).flatMap((p) => readEvents(join(projects, p), since)).filter((e) => Date.parse(e.ts) >= since);
  const used = new Set(events.filter((e) => e.kind === 'use').map((e) => e.skill));
  const unused = recipes.filter((r) => !used.has(r.name) && r.changed < since).map((r) => `${r.name} (${r.where})`);
  const names = new Set(recipes.map((r) => r.name));
  const counts = new Map();
  for (const e of events) if (e.kind !== 'use' && names.has(e.skill)) counts.set(e.skill, (counts.get(e.skill) ?? 0) + 1);
  const top = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([n, c]) => `${n} ${c}`);
  return [
    `Recipes unused 30+ days: ${unused.join(', ') || 'none'}`,
    `Most-corrected recipes: ${top.length ? `${top.join(', ')} (last 30 days)` : 'none'}`,
  ];
}

export function doctor({ home, cwd, root, now = Date.now() }) {
  const opts = options(home, root);
  const names = msncNames(root);
  return [
    `Options: ${Object.entries(opts).map(([k, v]) => `${k} ${show(v)}`).join(', ')}`,
    alwaysLoaded(root, opts),
    ...duplicates(home, cwd, names),
    ...projectSettings(home, names),
    ...oldScope(cwd),
    ...recipeUse(home, cwd, now),
  ];
}

if (import.meta.main) {
  for (const l of doctor({ home: homedir(), cwd: process.cwd(), root: join(import.meta.dirname, '..', '..') })) console.log(l);
}
