// MSNC's one hook dispatcher: event JSON on stdin → context on stdout.
// Never blocks on stdin, never exits non-zero: a broken hook must not break a session.
// New events (PreToolUse for Scope, PostToolUse for recipe notes) add a case to handle().
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

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

function handle(e) {
  switch (e.hook_event_name) {
    case 'SessionStart': return context(e.session_id);
    // SubagentStart drops plain stdout; only the hookSpecificOutput form reaches the subagent.
    case 'SubagentStart': return JSON.stringify({ hookSpecificOutput: { hookEventName: 'SubagentStart', additionalContext: context(e.session_id, true) } });
    case 'UserPromptSubmit': return onPrompt(e.session_id, e.prompt);
  }
}

let input = '';
let done = false;
function finish() {
  if (done) return;
  done = true;
  try {
    const out = handle(JSON.parse(input.replace(/^﻿/, '')));
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
