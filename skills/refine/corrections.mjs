// Usage: node corrections.mjs [days=30]   (run from the repo; reads only, never writes)
// /msnc:refine's source when context-mode isn't installed: this repo's Claude Code transcripts
// (~/.claude/projects/<cwd slug>/*.jsonl). Prints one line per correction, rejected tool call or failed
// check, oldest first, with when it happened, the skill used last before it in that session, and the quote.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

// Claude Code names a project's transcript folder after its path, every non-alphanumeric as '-'.
export const transcriptDir = (home, cwd) => join(home, '.claude', 'projects', resolve(cwd).replace(/[^a-zA-Z0-9]/g, '-'));

// trim: naive start-of-message match; a correction phrased any other way is missed. Widen the list if refine misses real ones.
const CORRECTION = /^(please\s+)?(no\b|nope\b|don'?t\b|do not\b|stop\b|wrong\b|actually\b|instead\b|not (that|like that|what)\b|that'?s (not|wrong)\b|why did you\b|you (forgot|missed|didn'?t|should)\b|undo\b|revert\b)/i;
const REJECTED = "The user doesn't want to proceed with this tool use.";
const oneLine = (s) => s.replace(/\s+/g, ' ').trim().slice(0, 300);
const textOf = (c) => (typeof c === 'string' ? c : Array.isArray(c) ? c.map((b) => b.text ?? '').join('\n') : '');

// Transcript files modified at or after `since` (ms), each read in order. Events are
// { session, ts, kind: 'use' | 'correction' | 'rejected' | 'failed', skill, text }; `skill` on a
// non-use event is the skill used last before it in the same session (a typed /command counts as a use).
export function readEvents(dir, since = 0) {
  let names = [];
  try { names = readdirSync(dir).filter((f) => f.endsWith('.jsonl')); } catch { return []; }
  const out = [];
  const seen = new Set();
  for (const name of names) {
    const file = join(dir, name);
    try { if (statSync(file).mtimeMs < since) continue; } catch { continue; }
    const session = name.slice(0, -'.jsonl'.length);
    let skill;
    // Parallel tool calls rejected at once, and resumed or forked sessions (which copy earlier history
    // into their own file), repeat an event: keep the first.
    const add = (kind, text, ts) => {
      const key = `${ts} ${kind} ${oneLine(text)}`;
      if (!seen.has(key)) seen.add(key) && out.push({ session, ts, kind, skill, text: oneLine(text) });
    };
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      if (!line.includes('"type":"user"') && !line.includes('"Skill"')) continue;
      let e;
      try { e = JSON.parse(line); } catch { continue; }
      if (e.isSidechain || e.isMeta) continue;
      const c = e.message?.content;
      if (e.type === 'assistant' && Array.isArray(c)) {
        for (const b of c) if (b.type === 'tool_use' && b.name === 'Skill' && b.input?.skill) add('use', skill = b.input.skill, e.timestamp);
      }
      if (e.type !== 'user') continue;
      const typed = typeof c === 'string' && /<command-name>\/?([^<\s]+)<\/command-name>/.exec(c);
      if (typed) { add('use', skill = typed[1], e.timestamp); continue; }
      for (const b of Array.isArray(c) ? c : [{ type: 'text', text: textOf(c) }]) {
        if (b.type === 'tool_result') {
          const t = textOf(b.content);
          if (t.includes(REJECTED)) add('rejected', t.split('the user said:\n')[1] ?? '(no reason given)', e.timestamp);
          else if (b.is_error && /^Exit code [1-9]/.test(t)) add('failed', t, e.timestamp);
        } else if (b.type === 'text' && !b.text.startsWith('<') && CORRECTION.test(b.text.trim())) add('correction', b.text, e.timestamp);
      }
    }
  }
  return out;
}

if (import.meta.main) {
  const days = Number(process.argv[2]) || 30;
  const since = Date.now() - days * 864e5;
  const events = readEvents(transcriptDir(homedir(), process.cwd()), since)
    .filter((e) => e.kind !== 'use' && Date.parse(e.ts) >= since)
    .sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
  if (!events.length) console.log(`No corrections, rejected tool calls or failed checks in the last ${days} days.`);
  for (const e of events) console.log(`${e.ts} ${e.kind}${e.skill ? ` after ${e.skill}` : ''}: "${e.text}"`);
}
