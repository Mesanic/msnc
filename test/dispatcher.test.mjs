// The dispatcher's contract: given event JSON on stdin, option env vars and session state,
// expect this stdout. Every case spawns hooks/msnc.mjs as Claude Code would.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../hooks/msnc.mjs', import.meta.url));

// Fixture plugin root: marker texts, so tests check what gets composed, not the prose.
const root = mkdtempSync(join(tmpdir(), 'msnc-root-'));
mkdirSync(join(root, 'context'));
mkdirSync(join(root, 'skills', 'trim', 'levels'), { recursive: true });
writeFileSync(join(root, 'context', 'tuner.md'), 'TUNER-TEXT\n');
writeFileSync(join(root, 'context', 'clear.md'), 'CLEAR-TEXT\n');
for (const l of ['lite', 'full', 'ultra']) writeFileSync(join(root, 'skills', 'trim', 'levels', `${l}.md`), `TRIM-${l.toUpperCase()}\n`);

// Real CLAUDE_PLUGIN_* vars from a host session must not leak into the cases.
const baseEnv = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('CLAUDE_PLUGIN_')));

function run(event, { env = {}, data = mkdtempSync(join(tmpdir(), 'msnc-data-')) } = {}) {
  const r = spawnSync(process.execPath, [SCRIPT], {
    input: typeof event === 'string' ? event : JSON.stringify(event),
    env: { ...baseEnv, CLAUDE_PLUGIN_ROOT: root, CLAUDE_PLUGIN_DATA: data, ...env },
    encoding: 'utf8',
    timeout: 5000,
  });
  return { code: r.status, out: r.stdout, data };
}

const start = (source = 'startup', session_id = 's1') => ({ hook_event_name: 'SessionStart', source, session_id });

test('session start injects Tuner and Clear by default, no Trim', () => {
  const { code, out } = run(start());
  assert.equal(code, 0);
  assert.equal(out, 'TUNER-TEXT\n\nCLEAR-TEXT');
});

test('session start with clear off injects Tuner only', () => {
  for (const v of ['false', 'FALSE', '0']) {
    assert.equal(run(start(), { env: { CLAUDE_PLUGIN_OPTION_CLEAR: v } }).out, 'TUNER-TEXT');
  }
  assert.equal(run(start(), { env: { CLAUDE_PLUGIN_OPTION_CLEAR: 'true' } }).out, 'TUNER-TEXT\n\nCLEAR-TEXT');
});

test('trim_default picks the Trim level at session start; unknown values mean off', () => {
  const at = (v) => run(start('compact'), { env: { CLAUDE_PLUGIN_OPTION_TRIM_DEFAULT: v } }).out;
  assert.equal(at('full'), 'TUNER-TEXT\n\nCLEAR-TEXT\n\nTRIM-FULL');
  assert.equal(at(' Ultra '), 'TUNER-TEXT\n\nCLEAR-TEXT\n\nTRIM-ULTRA');
  assert.equal(at('off'), 'TUNER-TEXT\n\nCLEAR-TEXT');
  assert.equal(at('max'), 'TUNER-TEXT\n\nCLEAR-TEXT');
});

const sub = (session_id = 's1') => ({ hook_event_name: 'SubagentStart', session_id, agent_id: 'a1', agent_type: 'Explore' });
const subContext = (r) => {
  const o = JSON.parse(r.out);
  assert.equal(o.hookSpecificOutput.hookEventName, 'SubagentStart');
  return o.hookSpecificOutput.additionalContext;
};

test('subagent start injects the same set as hookSpecificOutput JSON', () => {
  const ctx = subContext(run(sub(), { env: { CLAUDE_PLUGIN_OPTION_TRIM_DEFAULT: 'lite' } }));
  assert.match(ctx, /^TUNER-TEXT\n\n/);
  assert.match(ctx, /CLEAR-TEXT/);
  assert.match(ctx, /requested report/, 'subagents learn their final report is a requested report');
  assert.match(ctx, /TRIM-LITE$/);
});

const say = (prompt, session_id = 's1') => ({ hook_event_name: 'UserPromptSubmit', session_id, prompt });

test('/msnc:trim full confirms in one line and reaches later compacts and subagents', () => {
  const { code, out, data } = run(say('/msnc:trim full'));
  assert.equal(code, 0);
  assert.match(out, /^MSNC: Trim is full for this session\.[^\n]*$/);
  assert.equal(run(start('compact'), { data }).out, 'TUNER-TEXT\n\nCLEAR-TEXT\n\nTRIM-FULL');
  assert.match(subContext(run(sub(), { data })), /TRIM-FULL$/);
});

test('/msnc:trim off and "stop trim" override trim_default for the session', () => {
  const env = { CLAUDE_PLUGIN_OPTION_TRIM_DEFAULT: 'ultra' };
  for (const msg of ['/msnc:trim off', 'stop trim']) {
    const { out, data } = run(say(msg), { env });
    assert.match(out, /^MSNC: Trim is off for this session\./);
    assert.equal(run(start('clear'), { env, data }).out, 'TUNER-TEXT\n\nCLEAR-TEXT');
  }
});

test('bare /msnc:trim reports the current level without changing it', () => {
  const { out, data } = run(say('/msnc:trim'), { env: { CLAUDE_PLUGIN_OPTION_TRIM_DEFAULT: 'lite' } });
  assert.match(out, /^MSNC: Trim is lite for this session\./);
  assert.equal(run(say('/msnc:trim'), { data }).out.split('.')[0], 'MSNC: Trim is off for this session');
});

test('state is kept per session id', () => {
  const { data } = run(say('/msnc:trim ultra', 'a'));
  run(say('normal mode', 'b'), { data });
  assert.equal(run(start('resume', 'a'), { data }).out, 'TUNER-TEXT\n\nCLEAR-TEXT\n\nTRIM-ULTRA');
  assert.equal(run(start('resume', 'b'), { data }).out, 'TUNER-TEXT');
  assert.equal(run(start('startup', 'c'), { data }).out, 'TUNER-TEXT\n\nCLEAR-TEXT');
});

test('"normal mode" drops Clear and Trim for this session, main and subagents', () => {
  const env = { CLAUDE_PLUGIN_OPTION_TRIM_DEFAULT: 'full' };
  const { out, data } = run(say('normal mode'), { env });
  assert.match(out, /^MSNC: normal mode for this session\.[^\n]*$/);
  assert.equal(run(start('compact'), { env, data }).out, 'TUNER-TEXT');
  assert.equal(subContext(run(sub(), { env, data })), 'TUNER-TEXT');
  // An explicit Trim switch afterwards still wins; Clear stays off.
  run(say('/msnc:trim lite'), { env, data });
  assert.equal(run(start('compact'), { env, data }).out, 'TUNER-TEXT\n\nTRIM-LITE');
});

test('commands match the whole message only, ignoring case, spacing and end punctuation', () => {
  for (const msg of ['Normal Mode', '  normal   mode. ', 'NORMAL MODE!']) {
    assert.match(run(say(msg)).out, /^MSNC: normal mode/, msg);
  }
  for (const msg of ['/MSNC:Trim  Full', ' /msnc:trim full ']) {
    assert.match(run(say(msg)).out, /^MSNC: Trim is full/, msg);
  }
  for (const msg of ['switch to normal mode', 'normal mode please', 'what is normal mode?', '/msnc:trim max',
    '/msnc:trim full now', 'please /msnc:trim full', '/msnc:trimfull', 'stop trimming', '/trim full', '']) {
    const { code, out, data } = run(say(msg));
    assert.equal(code, 0);
    assert.equal(out, '', msg);
    assert.equal(run(start('compact'), { data }).out, 'TUNER-TEXT\n\nCLEAR-TEXT', `${msg} left state alone`);
  }
});

test('bad input exits 0 with no output', () => {
  for (const input of ['', 'not json', '{', '[]', 'null', '{}', '{"hook_event_name":"Nope"}',
    '{"hook_event_name":"UserPromptSubmit","prompt":"normal mode"}']) {
    const { code, out } = run(input);
    assert.equal(code, 0, input);
    assert.equal(out, '', input);
  }
});

test('an unwritable data dir still exits 0', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'msnc-')), 'plain-file');
  writeFileSync(file, '');
  const { code } = run(say('/msnc:trim full'), { data: file });
  assert.equal(code, 0);
});

test('stdin that never closes: answers with what arrived and exits 0', async () => {
  const child = spawn(process.execPath, [SCRIPT], { env: { ...baseEnv, CLAUDE_PLUGIN_ROOT: root, CLAUDE_PLUGIN_DATA: mkdtempSync(join(tmpdir(), 'msnc-data-')) } });
  let out = '';
  child.stdout.on('data', (c) => { out += c; });
  child.stdin.write(JSON.stringify(start())); // no end()
  const code = await new Promise((resolve, reject) => {
    const t = setTimeout(() => { child.kill(); reject(new Error('hook blocked on stdin')); }, 4000);
    child.on('exit', (c) => { clearTimeout(t); resolve(c); });
  });
  assert.equal(code, 0);
  assert.equal(out, 'TUNER-TEXT\n\nCLEAR-TEXT');
});

test('the shipped Tuner and Clear texts load from the plugin root, with credits', () => {
  const r = spawnSync(process.execPath, [SCRIPT], {
    input: JSON.stringify(start()),
    env: { ...baseEnv, CLAUDE_PLUGIN_DATA: mkdtempSync(join(tmpdir(), 'msnc-data-')) },
    encoding: 'utf8',
  });
  assert.match(r.stdout, /^MSNC is active\.\n/);
  assert.match(r.stdout, /`msnc:trim`/);
  assert.match(r.stdout, /i-have-adhd/);
  assert.match(r.stdout, /ponytail/);
  assert.match(r.stdout, /First line = the action or the result/);
  assert.ok(r.stdout.length < 10000, 'Claude Code moves hook output over 10,000 characters to a file');
});

// Spec "Tuner": a ~150-token always-loaded list. Ticket 12 caps it at 200 tokens (characters ÷ 4).
test('the shipped Tuner stays at 200 tokens or fewer', () => {
  const chars = readFileSync(new URL('../context/tuner.md', import.meta.url), 'utf8').length;
  assert.ok(chars / 4 <= 200, `Tuner is ~${chars / 4} tokens (${chars} characters)`);
});

test('the shipped Trim texts load per level and keep Tuner + Clear + Trim under the 10,000-character cap', () => {
  for (const level of ['lite', 'full', 'ultra']) {
    const env = { ...baseEnv, CLAUDE_PLUGIN_DATA: mkdtempSync(join(tmpdir(), 'msnc-data-')), CLAUDE_PLUGIN_OPTION_TRIM_DEFAULT: level };
    const main = spawnSync(process.execPath, [SCRIPT], { input: JSON.stringify(start('compact')), env, encoding: 'utf8' }).stdout;
    const subOut = spawnSync(process.execPath, [SCRIPT], { input: JSON.stringify(sub()), env, encoding: 'utf8' }).stdout;
    assert.match(main, new RegExp(`TRIM ACTIVE — level: ${level}\\n`), level);
    assert.match(main, /Scope index → `sextant impact`/, level);
    assert.match(subContext({ out: subOut }), new RegExp(`TRIM ACTIVE — level: ${level}\\n`), level);
    for (const out of [main, subOut]) assert.ok(out.length < 10000, `${level}: ${out.length} characters`);
  }
});

test('hooks.json sends exactly the ticket-03, Scope gate and recipe-note events to the dispatcher, exec form', () => {
  const { hooks } = JSON.parse(readFileSync(new URL('../hooks/hooks.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(hooks).sort(), ['PostToolUse', 'PreToolUse', 'SessionStart', 'SubagentStart', 'UserPromptExpansion', 'UserPromptSubmit']);
  assert.deepEqual(hooks.PostToolUse.map((g) => g.matcher), ['Skill']);
  assert.deepEqual(hooks.UserPromptExpansion.map((g) => g.matcher), [undefined]);
  assert.equal(hooks.SessionStart[0].matcher, 'startup|resume|clear|compact');
  // The gate: every file-writing tool call, and only the Bash calls whose command word writes files.
  const [files, bash] = hooks.PreToolUse;
  assert.equal(files.matcher, 'Edit|Write|MultiEdit|NotebookEdit');
  assert.equal(files.hooks.length, 1);
  assert.equal(files.hooks[0].if, undefined);
  assert.equal(bash.matcher, 'Bash');
  assert.deepEqual(bash.hooks.map((h) => h.if),
    ['sed', 'perl', 'ruby', 'tee', 'cp', 'mv', 'install', 'rsync', 'rm', 'unlink', 'truncate', 'shred', 'dd'].map((w) => `Bash(${w} *)`));
  for (const [event, groups] of Object.entries(hooks)) {
    for (const h of groups.flatMap((g) => g.hooks)) {
      assert.equal(h.command, 'node', event);
      assert.deepEqual(h.args, ['${CLAUDE_PLUGIN_ROOT}/hooks/msnc.mjs'], event);
    }
  }
});

test('with clear off, subagent output contains no Clear', () => {
  const ctx = subContext(run(sub(), { env: { CLAUDE_PLUGIN_OPTION_CLEAR: 'false' } }));
  assert.equal(ctx, 'TUNER-TEXT');
});

// Recipe notes: after a Skill call, project notes (<cwd>/.claude/msnc/notes/) and personal notes
// (<home>/.claude/msnc/notes/) for that skill come back next to the result. `plugin:skill` → `<plugin>/<skill>.md`.
function notesFixture(files) {
  const dir = mkdtempSync(join(tmpdir(), 'msnc-notes-'));
  for (const [p, v] of Object.entries(files)) {
    mkdirSync(join(dir, p, '..'), { recursive: true });
    writeFileSync(join(dir, p), v);
  }
  return dir;
}
const homeEnv = (home) => ({ HOME: home, USERPROFILE: home });
const skillUsed = (skill, cwd) => ({ hook_event_name: 'PostToolUse', session_id: 's1', cwd, tool_name: 'Skill', tool_input: { skill }, tool_response: {} });
const postContext = (r) => {
  const o = JSON.parse(r.out);
  assert.equal(o.hookSpecificOutput.hookEventName, 'PostToolUse');
  return o.hookSpecificOutput.additionalContext;
};

test('after a Skill call, project and personal notes for that skill come back next to the result', () => {
  const cwd = notesFixture({ '.claude/msnc/notes/deploy.md': 'PROJECT-NOTE\n', '.claude/msnc/notes/msnc/trim.md': 'TRIM-PROJECT-NOTE\n' });
  const home = notesFixture({ '.claude/msnc/notes/deploy.md': 'PERSONAL-NOTE\n' });
  const ctx = postContext(run(skillUsed('deploy', cwd), { env: homeEnv(home) }));
  assert.match(ctx, /deploy/);
  assert.match(ctx, /PROJECT-NOTE[\s\S]*PERSONAL-NOTE/);
  assert.match(ctx, /\.claude\/msnc\/notes\/deploy\.md/);
  // Namespaced skills live in a folder named after the plugin; only one side has notes here.
  const trim = postContext(run(skillUsed('msnc:trim', cwd), { env: homeEnv(home) }));
  assert.match(trim, /TRIM-PROJECT-NOTE/);
  assert.doesNotMatch(trim, /PERSONAL-NOTE|PROJECT-NOTE\n[\s\S]*deploy/);
});

test('no notes, another tool, or a name that escapes the notes folder: no output', () => {
  const cwd = notesFixture({ '.claude/msnc/notes/other.md': 'x', '.claude/secret.md': 'SECRET' });
  const home = notesFixture({});
  for (const e of [skillUsed('deploy', cwd), skillUsed('msnc:trim', cwd), skillUsed('../secret', cwd), skillUsed('..:secret', cwd),
    skillUsed('', cwd), { ...skillUsed('other', cwd), tool_name: 'Read' }, { ...skillUsed('other', cwd), tool_input: {} }]) {
    const { code, out } = run(e, { env: homeEnv(home) });
    assert.equal(code, 0);
    assert.equal(out, '', JSON.stringify(e.tool_input));
  }
});

test('a typed slash command gets its notes too (UserPromptExpansion bypasses the Skill tool)', () => {
  const cwd = notesFixture({ '.claude/msnc/notes/msnc/record.md': 'RECORD-NOTE\n' });
  const e = { hook_event_name: 'UserPromptExpansion', session_id: 's1', cwd, expansion_type: 'slash_command', command_name: 'msnc:record', command_args: '', prompt: '/msnc:record' };
  const o = JSON.parse(run(e, { env: homeEnv(notesFixture({})) }).out);
  assert.equal(o.hookSpecificOutput.hookEventName, 'UserPromptExpansion');
  assert.match(o.hookSpecificOutput.additionalContext, /RECORD-NOTE/);
  assert.equal(run({ ...e, command_name: 'msnc:trim' }, { env: homeEnv(notesFixture({})) }).out, '');
});
