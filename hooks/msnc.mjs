// MSNC's one hook dispatcher: event JSON on stdin → context on stdout.
// Never blocks on stdin, never exits non-zero: a broken hook must not break a session.
// New events add a case to handle().
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, join, relative, resolve, sep } from 'node:path';
import { homedir, tmpdir } from 'node:os';
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

// context-mode's server can still be connecting at session start, so its tools look absent. Enabled = a
// `context-mode@*` key true in enabledPlugins: user, then project, then local settings, later keys win.
// An unreadable or malformed file counts as absent.
function ctxEnabled(cwd) {
  const plugins = {};
  const project = typeof cwd === 'string' && cwd ? cwd : process.cwd();
  for (const f of [join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude'), 'settings.json'),
    join(project, '.claude', 'settings.json'), join(project, '.claude', 'settings.local.json')]) {
    try { Object.assign(plugins, JSON.parse(readFileSync(f, 'utf8').replace(/^\uFEFF/, '')).enabledPlugins); } catch { /* absent */ }
  }
  return Object.entries(plugins).some(([k, v]) => k.startsWith('context-mode@') && v === true);
}

// Tuner always (subagents: minus sizing and the decisions log, which their caller owns); Clear unless
// opted out or in normal mode; Trim at its level. Per-level Trim text is ticket 04's
// skills/trim/levels/<level>.md; a missing file injects nothing.
function context(sid, subagent, cwd) {
  const s = sid ? readState(sid) : {};
  const clear = !['false', '0'].includes(opt('CLEAR')) && !s.normal;
  const level = trimLevel(s);
  return [
    text('context/tuner.md'),
    ctxEnabled(cwd) && 'context-mode is on: before the first filter, file-analysis or URL step (outside plan mode), load the `ctx_*` tools with ToolSearch; it waits for a server still connecting. Only if none come back, use Read/Grep.',
    subagent && "You're a subagent: skip the Tuner's size line and don't write docs/decisions.md; report sizes and decisions to your caller.",
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

// --- Scope gate: refuse an edit to a file in the code map until `scope impact` has run on it.
// Ported from Scope's old pre-edit hook (bashTargets and the graph lookup); the
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
  try { graph = readFileSync(join(root, '.scope', 'files', 'graph', 'nodes.jsonl'), 'utf8'); } catch { return; } // no index: nothing to gate
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
  const cli = join(SCOPE, 'scope.mjs').split(sep).join('/');
  const reason = `Scope: ${stale.join(', ')} ${stale.length === 1 ? 'is' : 'are'} in the code map and no impact check has run${e.tool_name === 'Bash' ? ' (via Bash)' : ''}.\n`
    + 'Run this first, then repeat the edit:\n'
    + stale.map((t) => `  node "${cli}" impact ${t}\n`).join('')
    + 'Resolve every entry in its cross-check list before editing: those are the callers symbol analysis cannot see.';
  return JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } });
}

// --- Recipe notes: the user's notes for a skill, added next to it whenever it loads. Project notes
// <cwd>/.claude/msnc/notes/<name>.md, then personal ~/.claude/msnc/notes/<name>.md. A namespaced skill
// `plugin:skill` maps to <plugin>/<skill>.md (':' can't be in a Windows file name).
function notes(e, name, event) {
  const parts = String(name ?? '').split(':');
  if (!parts.every((p) => /^[\w.-]+$/.test(p) && !/^\.+$/.test(p))) return;
  const rel = `.claude/msnc/notes/${parts.join('/')}.md`;
  const found = [['Project', e.cwd || process.cwd(), rel], ['Personal', homedir(), `~/${rel}`]]
    .map(([who, dir, shown]) => {
      let t = '';
      try { t = readFileSync(join(dir, rel), 'utf8').trim(); } catch { /* no notes here */ }
      return t && `${who} notes (${shown}):\n${t}`;
    })
    .filter(Boolean);
  if (!found.length) return;
  const additionalContext = [`Recipe notes for ${name}. Where they differ from the skill, follow the notes.`, ...found].join('\n\n');
  return JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext } });
}

function handle(e) {
  switch (e.hook_event_name) {
    case 'PreToolUse': return scopeGate(e);
    case 'PostToolUse': return e.tool_name === 'Skill' ? notes(e, e.tool_input?.skill, 'PostToolUse') : undefined;
    // A typed /name never goes through the Skill tool; this is where typed-only recipes load.
    case 'UserPromptExpansion': return notes(e, e.command_name, 'UserPromptExpansion');
    case 'SessionStart': return context(e.session_id, false, e.cwd);
    // SubagentStart drops plain stdout; only the hookSpecificOutput form reaches the subagent.
    case 'SubagentStart': return JSON.stringify({ hookSpecificOutput: { hookEventName: 'SubagentStart', additionalContext: context(e.session_id, true, e.cwd) } });
    case 'UserPromptSubmit': return onPrompt(e.session_id, e.prompt);
  }
}

let input = '';
let done = false;
async function finish() {
  if (done) return;
  done = true;
  try {
    const out = await handle(JSON.parse(input.replace(/^\uFEFF/, '')));
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
