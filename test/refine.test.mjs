// /msnc:refine's transcript fallback: given Claude Code transcript files, expect these correction candidates.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transcriptDir, readEvents } from '../skills/refine/corrections.mjs';

const SCRIPT = fileURLToPath(new URL('../skills/refine/corrections.mjs', import.meta.url));
const base = mkdtempSync(join(tmpdir(), 'msnc-refine-'));
after(() => rmSync(base, { recursive: true, force: true }));

// Transcript lines as Claude Code writes them (fields trimmed to what matters).
const user = (ts, content, extra = {}) => ({ type: 'user', timestamp: ts, message: { role: 'user', content }, ...extra });
const typed = (ts, name) => user(ts, `<command-message>${name}</command-message>\n<command-name>/${name}</command-name>`);
const skillCall = (ts, skill) => ({ type: 'assistant', timestamp: ts, message: { role: 'assistant', content: [{ type: 'tool_use', name: 'Skill', input: { skill } }] } });
const result = (ts, text, is_error) => user(ts, [{ type: 'tool_result', tool_use_id: 't', content: text, is_error }]);
const REJECT = "The user doesn't want to proceed with this tool use. The tool use was rejected (eg. if it was a file edit, the new_string was NOT written to the file). To tell you how to proceed, the user said:\n";

const session = [
  user('2026-09-01T10:00:00.000Z', 'add a deploy step'),
  user('2026-09-01T10:00:30.000Z', 'No, that is wrong'), // correction before any skill: no skill
  typed('2026-09-01T10:01:00.000Z', 'deploy'),
  user('2026-09-01T10:02:00.000Z', "Don't push to main, open a PR instead"),
  result('2026-09-01T10:03:00.000Z', 'Exit code 1\nFAIL test/a.test.mjs', true),
  result('2026-09-01T10:03:30.000Z', 'Exit code 0\nok', false),
  result('2026-09-01T10:03:40.000Z', 'File does not exist.', true), // a tool error, not a failed check
  skillCall('2026-09-01T10:04:00.000Z', 'msnc:trim'),
  // Rejecting parallel tool calls answers each call with the same text: one candidate, not three.
  user('2026-09-01T10:05:00.000Z', [1, 2, 3].map((i) => ({ type: 'tool_result', tool_use_id: `t${i}`, content: `${REJECT}use the existing helper`, is_error: true }))),
  user('2026-09-01T10:06:00.000Z', [{ type: 'text', text: 'actually keep the old name' }]),
  user('2026-09-01T10:07:00.000Z', 'no, not that way', { isSidechain: true }), // a subagent's transcript line
  user('2026-09-01T10:08:00.000Z', 'looks good, ship it'),
];

function project(home, cwd, files) {
  const dir = transcriptDir(home, cwd);
  mkdirSync(dir, { recursive: true });
  for (const [name, lines] of Object.entries(files)) writeFileSync(join(dir, name), lines.map((l) => JSON.stringify(l)).join('\n') + '\nnot json\n');
  return dir;
}

test('transcripts live under ~/.claude/projects/<cwd with every non-alphanumeric as ->', () => {
  assert.equal(transcriptDir('/h', 'C:\\Users\\User\\Desktop\\AI Projects\\MSNC'), join('/h', '.claude', 'projects', 'C--Users-User-Desktop-AI-Projects-MSNC'));
});

test('events: skill uses, then corrections, rejected tool calls and failed checks, each tied to the last skill used', () => {
  const home = mkdtempSync(join(base, 'h-'));
  // A resumed or forked session copies the earlier history into its own file: each event counts once.
  const events = readEvents(project(home, '/repo', { 's1.jsonl': session, 's2.jsonl': session }));
  assert.deepEqual(events.map(({ kind, skill, text, session: s }) => [kind, skill, text, s]), [
    ['correction', undefined, 'No, that is wrong', 's1'],
    ['use', 'deploy', 'deploy', 's1'],
    ['correction', 'deploy', "Don't push to main, open a PR instead", 's1'],
    ['failed', 'deploy', 'Exit code 1 FAIL test/a.test.mjs', 's1'],
    ['use', 'msnc:trim', 'msnc:trim', 's1'],
    ['rejected', 'msnc:trim', 'use the existing helper', 's1'],
    ['correction', 'msnc:trim', 'actually keep the old name', 's1'],
  ]);
  assert.equal(events[2].ts, '2026-09-01T10:02:00.000Z');
});

test('the CLI prints recent candidates for the repo it runs in, newest last, with when and the quote', () => {
  const home = mkdtempSync(join(base, 'h-'));
  const cwd = mkdtempSync(join(base, 'repo-'));
  const now = new Date().toISOString();
  project(home, cwd, { 'old.jsonl': session, 'new.jsonl': [typed(now, 'release'), user(now, 'stop, you forgot the changelog')] });
  const r = spawnSync(process.execPath, [SCRIPT, '7'], { cwd, env: { ...process.env, HOME: home, USERPROFILE: home }, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, `${now} correction after release: "stop, you forgot the changelog"\n`);
  const none = spawnSync(process.execPath, [SCRIPT], { cwd: mkdtempSync(join(base, 'empty-')), env: { ...process.env, HOME: home, USERPROFILE: home }, encoding: 'utf8' });
  assert.equal(none.stdout, 'No corrections, rejected tool calls or failed checks in the last 30 days.\n');
});
