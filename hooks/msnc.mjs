// MSNC's one hook dispatcher: event JSON on stdin → context on stdout.
// Never blocks on stdin, never exits non-zero: a broken hook must not break a session.
// New events (PostToolUse for recipe notes) add a case to handle().
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, join, relative, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = process.env.CLAUDE_PLUGIN_ROOT || fileURLToPath(new URL('..', import.meta.url));
const DATA = process.env.CLAUDE_PLUGIN_DATA || join(tmpdir(), 'msnc');
const LEVELS = ['lite', 'full', 'ultra'];

const text = (p) => { try { return readFileSync(join(ROOT, p), 'utf8').trim(); } catch { return ''; } };
const opt = (key) => (process.env[`CLAUDE_PLUGIN_OPTION_${key}`] ?? '').trim().toLowerCase();

// Per-session state { trim?: level|'off', normal?: true } in <data>/sessions/<session id>.json.
// trim: files are never pruned; add an age sweep if the data dir ever grows noticeably.
const stateFile = (sid) => join(DATA, 'sessions', `${String(sid).replace(/[^\w-]/g, '-')}.json`);
const readState = (sid) => { try { return JSON.parse(readFileSync(stateFile(sid), 'utf8')); } catch { return {}; } };
function saveState(sid, patch) {
  mkdirSync(join(DATA, 'sessions'), { recursive: true });
  writeFileSync(stateFile(sid), JSON.stringify({ ...readState(sid), ...patch }));
}
const trimLevel = (s) => {
  const level = s.trim ?? opt('TRIM_DEFAULT');
  return LEVELS.includes(level) ? level : 'off';
};

// Tuner always; Clear unless opted out or in normal mode; Trim at its level. Per-level Trim text is
// ticket 04's skills/trim/levels/<level>.md; a missing file injects nothing.
function context(sid, subagent) {
  const s = sid ? readState(sid) : {};
  const clear = !['false', '0'].includes(opt('CLEAR')) && !s.normal;
  const level = trimLevel(s);
  return [
    text('context/tuner.md'),
    clear && subagent && 'Your final report counts as a requested report: keep it complete, in the Clear shape below.',
    clear && text('context/clear.md'),
    level !== 'off' && text(`skills/trim/levels/${level}.md`),
  ].filter(Boolean).join('\n\n');
}

// Whole-message commands only. Case, repeated spaces and trailing . ! ? are ignored.
function onPrompt(sid, prompt) {
  const p = String(prompt ?? '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.!?]+$/, '');
  const m = /^\/msnc:trim(?: (lite|full|ultra|off))?$/.exec(p);
  if (!sid || !(m || p === 'stop trim' || p === 'normal mode')) return;
  if (p === 'normal mode') {
    saveState(sid, { normal: true, trim: 'off' });
    return 'MSNC: normal mode for this session. Clear and Trim no longer apply; replies use the usual style. Confirm in one line.';
  }
  if (m?.[1] || p === 'stop trim') saveState(sid, { trim: m?.[1] ?? 'off' });
  return `MSNC: Trim is ${trimLevel(readState(sid))} for this session. Subagents and /compact keep this level.`;
}

// --- Scope gate: refuse an edit to a file in the code map until `sextant impact` has run on it.
// Ported from sextant scripts/pre-edit-hook.mjs (bashTargets and the lookup at lines 90-99); the
// impact log's location comes from the engine itself so the CLI and the gate always agree.
const SCOPE = join(fileURLToPath(new URL('..', import.meta.url)), 'skills', 'scope', 'scripts');
const unquote = (s) => s.replace(/^["']|["']$/g, '');

// Files a Bash command writes. Regex, not a shell parser: an exotic write is missed, and a miss
// falls open. `>` redirects are parsed here but hooks.json's `if` filters never start the gate for them.
function bashTargets(cmd) {
  if (typeof cmd !== 'string') return [];
  const out = [];
  for (const m of cmd.matchAll(/(?<![0-9&])>>?\s*(?![&(])("[^"]+"|'[^']+'|[^\s;|&()<>]+)/g)) out.push(unquote(m[1]));
  for (const seg of cmd.split(/[;|&]{1,2}|\n/)) {
    const toks = seg.trim().match(/("[^"]+"|'[^']+'|[^\s]+)/g);
    if (!toks) continue;
    const word = basename(unquote(toks[0]));
    const args = toks.slice(1).map(unquote);
    const files = args.filter((a) => !a.startsWith('-'));
    if (/^(sed|perl|ruby)$/.test(word) && args.some((a) => /^-.*i/.test(a))) out.push(...files);
    else if (word === 'tee') out.push(...files);
    else if (/^(cp|mv|install|rsync)$/.test(word) && files.length >= 2) out.push(files.at(-1));
    else if (/^(rm|unlink|truncate|shred)$/.test(word)) out.push(...files);
    else if (word === 'dd') for (const a of args) if (a.startsWith('of=')) out.push(a.slice(3));
  }
  return out;
}

async function scopeGate(e) {
  if (['false', '0'].includes(opt('SCOPE_GATE'))) return;
  const root = e.cwd || process.cwd();
  let graph;
  try { graph = readFileSync(join(root, '.atlas', 'graph', 'nodes.jsonl'), 'utf8'); } catch { return; } // no index: nothing to gate
  const ti = e.tool_input || {};
  const raw = e.tool_name === 'Bash' ? bashTargets(ti.command) : [ti.file_path || ti.notebook_path].filter(Boolean);
  const targets = [...new Set(raw)]
    .map((t) => relative(root, resolve(root, t)).split(sep).join('/'))
    .filter((r) => r && !r.startsWith('..') && existsSync(resolve(root, r))) // outside the repo, or new: not gated
    .filter((r) => graph.includes(`"k":"${r}"`));
  if (!targets.length) return;
  const { impactLogPath, IMPACT_TTL_MS } = await import(pathToFileURL(join(SCOPE, 'impact-log.mjs')).href);
  const analysed = new Set();
  try {
    const cutoff = Date.now() - IMPACT_TTL_MS;
    for (const line of readFileSync(impactLogPath(root), 'utf8').split('\n')) {
      const sp = line.indexOf(' ');
      if (sp > 0 && Number(line.slice(0, sp)) >= cutoff) analysed.add(line.slice(sp + 1).trim());
    }
  } catch { /* no log yet */ }
  const stale = targets.filter((t) => !analysed.has(t));
  if (!stale.length) return;
  const cli = join(SCOPE, 'sextant.mjs').split(sep).join('/');
  const reason = `Scope: ${stale.join(', ')} ${stale.length === 1 ? 'is' : 'are'} in the code map and no impact check has run${e.tool_name === 'Bash' ? ' (via Bash)' : ''}.\n`
    + 'Run this first, then repeat the edit:\n'
    + stale.map((t) => `  node "${cli}" impact ${t}\n`).join('')
    + 'Resolve every entry in its cross-check list before editing: those are the callers symbol analysis cannot see.';
  return JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } });
}

function handle(e) {
  switch (e.hook_event_name) {
    case 'PreToolUse': return scopeGate(e);
    case 'SessionStart': return context(e.session_id);
    // SubagentStart drops plain stdout; only the hookSpecificOutput form reaches the subagent.
    case 'SubagentStart': return JSON.stringify({ hookSpecificOutput: { hookEventName: 'SubagentStart', additionalContext: context(e.session_id, true) } });
    case 'UserPromptSubmit': return onPrompt(e.session_id, e.prompt);
  }
}

let input = '';
let done = false;
async function finish() {
  if (done) return;
  done = true;
  try {
    const out = await handle(JSON.parse(input.replace(/^﻿/, '')));
    if (out) process.stdout.write(out);
  } catch { /* bad input or unwritable data dir: say nothing */ }
  process.stdin.destroy();
}
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', finish);
process.stdin.on('error', finish);
// Windows can swallow piped stdin so 'end' never fires (ponytail #443): answer with what arrived.
setTimeout(finish, 1000).unref();
