// Contract tests for ship.mjs: argv/stdin in, stdout and .ship/ files out. node --test
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SHIP = fileURLToPath(new URL('./ship.mjs', import.meta.url));
// Every repo that started an app; stopped after the suite so no test leaves a server running.
const apps = new Set();
after(() => { for (const d of apps) spawnSync(process.execPath, [SHIP, 'app', 'stop'], { cwd: d }); });
const run = (cwd, args, input, env = {}) => {
  if (args[0] === 'app' || args[0] === 'replay') apps.add(cwd);
  return spawnSync(process.execPath, [SHIP, ...args], { cwd, input, encoding: 'utf8', env: { ...process.env, ...env } });
};
const g = (cwd, ...a) => spawnSync('git', a, { cwd, encoding: 'utf8' });
const repo = () => {
  const d = mkdtempSync(join(tmpdir(), 'ship-'));
  g(d, 'init', '-q', '-b', 'main'); g(d, 'config', 'user.email', 't@t'); g(d, 'config', 'user.name', 't');
  writeFileSync(join(d, 'package.json'), JSON.stringify({ scripts: { test: 'node --test' } }));
  g(d, 'add', '-A'); g(d, 'commit', '-qm', 'init');
  return d;
};
const started = (size) => {
  const d = repo();
  run(d, ['init', '--session', 's1', ...(size ? ['--size', size] : []), 'build a habit tracker']);
  writeFileSync(join(d, '.ship', 'checks.json'), JSON.stringify([{ name: 'ok', cmd: 'node -e 1' }]));
  return d;
};
// A port the OS says is free right now, instead of a random guess that can collide.
const freePort = () => spawnSync(process.execPath, ['-e', "const s=require('net').createServer().listen(0,()=>{console.log(s.address().port);s.close()})"], { encoding: 'utf8' }).stdout.trim();
const J = (d, f) => JSON.parse(readFileSync(join(d, '.ship', f), 'utf8'));
const journey = { id: 'j1', goal: 'add a habit', steps: ['open /'], expect: ['habit listed'] };
const stop = (d, sid = 's1', env) => run(d, ['hook'], JSON.stringify({ hook_event_name: 'Stop', session_id: sid, cwd: d }), env).stdout;

test('init: needs a session, branches off main, excludes .ship/, refuses a second active run', () => {
  const d = repo();
  assert.equal(run(d, ['init', 'no session']).status, 1);
  assert.match(run(d, ['init', '--session', 's1', 'Build a habit tracker']).stdout, /ship\/build-a-habit-tracker · base \w{7} · checks: test/);
  assert.equal(g(d, 'branch', '--show-current').stdout.trim(), 'ship/build-a-habit-tracker');
  assert.equal(g(d, 'status', '--porcelain').stdout, '', '.ship/ never dirties the tree');
  assert.equal(run(d, ['init', '--session', 's1', 'again']).status, 1);
});

test('init never writes under .git (sandboxes mount it read-only)', () => {
  const d = repo();
  const info = join(d, '.git', 'info');
  spawnSync('chmod', ['-R', 'a-w', info]);
  const out = run(d, ['init', '--session', 's1', 'goal']);
  spawnSync('chmod', ['-R', 'u+w', info]);
  assert.equal(out.status, 0, out.stdout + out.stderr);
  assert.equal(g(d, 'status', '--porcelain').stdout, '', '.ship/ hidden by its own .gitignore');
});

test('re-init archives the previous run instead of inheriting its passes', () => {
  const d = started('small');
  writeFileSync(join(d, '.ship', 'journeys.json'), JSON.stringify([{ ...journey, passes: true, evidence: 'x' }]));
  run(d, ['pause']);
  run(d, ['init', '--session', 's2', 'a new goal']);
  assert.deepEqual(J(d, 'journeys.json'), []);
  assert.equal(readdirSync(join(d, '.ship', 'runs')).length, 1);
});

test('journeys: lock once, evidence required, tamper caught and restorable', () => {
  const d = started();
  writeFileSync(join(d, '.ship', 'journeys.json'), JSON.stringify([journey]));
  assert.equal(run(d, ['phase', 'exercise']).status, 1, 'unlocked journeys block exercise');
  assert.match(run(d, ['lock']).stdout, /1 journeys locked/);
  assert.equal(run(d, ['lock']).status, 1, 'no silent re-baseline');
  assert.equal(run(d, ['journey', 'pass', 'j1']).status, 1, 'pass without evidence');
  run(d, ['journey', 'pass', 'j1', '.ship/evidence/j1.png']);
  const edited = J(d, 'journeys.json'); edited[0].expect = ['anything'];
  writeFileSync(join(d, '.ship', 'journeys.json'), JSON.stringify(edited));
  assert.match(run(d, ['status']).stdout, /JOURNEYS CHANGED AFTER LOCK/);
  assert.equal(run(d, ['phase', 'verify']).status, 1);
  run(d, ['restore']);
  assert.deepEqual(J(d, 'journeys.json')[0].expect, journey.expect);
  assert.equal(J(d, 'journeys.json')[0].passes, true, 'restore keeps earned passes');
});

test('done needs passing journeys, a green check and a review on the current code', () => {
  const d = started('small'); // two journeys: not trivial, so the review is required
  writeFileSync(join(d, '.ship', 'journeys.json'), JSON.stringify([journey, { ...journey, id: 'j2' }]));
  run(d, ['lock']);
  assert.match(run(d, ['done']).stdout, /journeys failing: j1, j2.*green S check.*reviewer pass/);
  run(d, ['journey', 'pass', 'j1', 'snap.yml:12']); run(d, ['journey', 'pass', 'j2', 'snap.yml:20']);
  run(d, ['check']);
  run(d, ['review', 'pass', 'No findings']);
  writeFileSync(join(d, 'app.js'), 'changed after review');
  assert.match(run(d, ['done']).stdout, /green S check.*reviewer pass.*uncommitted changes/, 'gates are tied to the code they saw');
  g(d, 'add', '-A'); g(d, 'commit', '-qm', 'work');
  run(d, ['check']); run(d, ['review', 'pass', 'No findings']);
  assert.match(run(d, ['done']).stdout, /ship: done/);
});

test('small runs skip review only when trivial (no probes, at most one journey)', () => {
  const d = started('small');
  assert.match(run(d, ['done']).stdout, /green S check/);
  run(d, ['check']);
  run(d, ['decide', 'finish.push', 'push ship/x', 'the goal asked for it', 'git push origin --delete ship/x', '--by', 'user']);
  assert.match(run(d, ['done']).stdout, /uncommitted changes/, 'docs/decisions.md must be committed too');
  assert.equal(JSON.parse(readFileSync(join(d, '.ship', 'decisions.jsonl'), 'utf8')).by, 'user');
  assert.equal(run(d, ['decide', 'a.b', 'c', 'd', 'e', '--by', 'bob']).status, 1);
  g(d, 'add', '-A'); g(d, 'commit', '-qm', 'decisions');
  writeFileSync(join(d, '.ship', 'probes.log'), 'x KILLED a.mjs :: node t\n');
  assert.match(run(d, ['done']).stdout, /reviewer pass/);
  run(d, ['review', 'pass', 'No findings']);
  assert.match(run(d, ['done']).stdout, /ship: done/);
});

test('diff covers every commit since base, not just the last', () => {
  const d = started();
  writeFileSync(join(d, 'a.js'), 'one\n'); g(d, 'add', '-A'); g(d, 'commit', '-qm', 'a');
  writeFileSync(join(d, 'b.js'), 'two\n'); g(d, 'add', '-A'); g(d, 'commit', '-qm', 'b');
  assert.match(run(d, ['diff']).stdout, /2 changed lines/);
  const diff = readFileSync(join(d, '.ship', 'review.diff'), 'utf8');
  assert.match(diff, /a\.js/); assert.match(diff, /b\.js/);
});

test('decide, ask, answer, digest', () => {
  const d = started();
  assert.match(run(d, ['digest']).stdout, /no decisions logged/);
  run(d, ['decide', 'define.db', 'SQLite', 'local and reversible', 'swap the adapter', '--options', 'SQLite|Postgres']);
  const row = JSON.parse(readFileSync(join(d, '.ship', 'decisions.jsonl'), 'utf8'));
  assert.deepEqual([row.point, row.by, row.options.length], ['define.db', 'claude', 2]);
  assert.match(readFileSync(join(d, 'docs', 'decisions.md'), 'utf8'), /define\.db: SQLite · local and reversible · undo: swap the adapter/);
  run(d, ['ask', 'Push to origin?', 'No, keep local', '--blocking']);
  run(d, ['block', 'waiting on q1']);
  run(d, ['answer', '1', 'yes, push']);
  assert.equal(J(d, 'state.json').status, 'running');
  assert.doesNotMatch(run(d, ['digest']).stdout, /question\.1/, 'digest lists only Claude\'s own decisions');
});

test('probe: KILLED, SURVIVED, ERROR on a broken baseline, literal replacement, file always restored', () => {
  const d = started();
  const src = 'export const add = (a, b) => a + b;\n';
  writeFileSync(join(d, 'add.mjs'), src);
  mkdirSync(join(d, 't dir'));
  writeFileSync(join(d, 't dir', 'good.test.mjs'), "import {add} from '../add.mjs'; import a from 'node:assert'; a.equal(add(2,2),4);\n");
  writeFileSync(join(d, 'weak.test.mjs'), "import {add} from './add.mjs'; import a from 'node:assert'; a.ok(typeof add(2,2)==='number');\n");
  assert.match(run(d, ['probe', 'add.mjs', 'a + b', 'a - b', '--', 'node "t dir/good.test.mjs"']).stdout, /KILLED/);
  assert.match(run(d, ['probe', 'add.mjs', 'a + b', 'a - b', '--', 'node weak.test.mjs']).stdout, /SURVIVED/);
  assert.match(run(d, ['probe', 'add.mjs', 'a + b', 'a - b', '--', 'node missing.test.mjs']).stdout, /ERROR, the test command fails before any break/);
  assert.match(run(d, ['probe', 'add.mjs', 'a + b', '$&$&', '--', 'node weak.test.mjs']).stdout, /KILLED/, '$& is not expanded, so the file no longer parses');
  assert.equal(readFileSync(join(d, 'add.mjs'), 'utf8'), src);
  assert.equal(run(d, ['probe', 'add.mjs', 'a', 'b', '--', 'node weak.test.mjs']).status, 1, 'ambiguous text refused');
  assert.equal(run(d, ['probe', 'nope.mjs', 'a', 'b', '--', 'node weak.test.mjs']).status, 1);
});

test('an interrupted probe is undone by the next command', () => {
  const d = started();
  writeFileSync(join(d, 'add.mjs'), 'BROKEN');
  writeFileSync(join(d, '.ship', 'probe.bak.json'), JSON.stringify({ file: 'add.mjs', content: 'original' }));
  const out = run(d, ['status']);
  assert.match(out.stderr, /restored add\.mjs/);
  assert.equal(readFileSync(join(d, 'add.mjs'), 'utf8'), 'original');
  assert.ok(!existsSync(join(d, '.ship', 'probe.bak.json')));
});

test('app start/stop owns the whole process tree; done stops it too', { skip: process.platform === 'win32' }, () => {
  const d = started('small');
  // A server that also spawns a grandchild, the way npm start → node server.js does.
  writeFileSync(join(d, 'srv.mjs'), "import {createServer} from 'node:http'; import {spawn} from 'node:child_process'; spawn(process.execPath, ['-e','setInterval(()=>{},1e3)'], {stdio:'ignore'}); createServer((q,s)=>s.end('ok')).listen(process.env.PORT);");
  const port = freePort();
  assert.match(run(d, ['app', 'start', port, '--', 'node srv.mjs']).stdout, /app: up on http:\/\/localhost:\d+/);
  assert.match(run(d, ['app', 'start', port, '--', 'node srv.mjs']).stdout, /already in use/);
  const pid = J(d, 'app.json').pid;
  const alive = () => spawnSync('sh', ['-c', `ps -o stat= -g ${pid} | grep -vc '^Z'`], { encoding: 'utf8' }).stdout.trim(); // zombies are dead, just unreaped
  assert.ok(Number(alive()) >= 2, 'server and grandchild running');
  g(d, 'add', '-A'); g(d, 'commit', '-qm', 'srv');
  run(d, ['check']);
  assert.match(run(d, ['done']).stdout, /ship: done/);
  spawnSync('sleep', ['0.5']);
  assert.equal(alive(), '0', 'done stopped the whole group');
  assert.ok(!existsSync(join(d, '.ship', 'app.json')));
});

test('a web UI needs a clean axe scan before verify, finish or done; other apps do not', () => {
  const serve = (type, code = 200) => { // a committed, checked, reviewed run whose app answers / with this status and content type
    const d = started('small');
    writeFileSync(join(d, 'srv.mjs'), `import {createServer} from 'node:http'; createServer((q,s)=>{s.statusCode=${code};s.setHeader('content-type','${type}');s.end('<!doctype html><title>x</title>')}).listen(process.env.PORT);`);
    g(d, 'add', '-A'); g(d, 'commit', '-qm', 'srv');
    run(d, ['app', 'start', freePort(), '--', 'node srv.mjs']);
    run(d, ['check']); run(d, ['review', 'pass', 'No findings']);
    return d;
  };
  const api = serve('application/json');
  assert.match(run(api, ['done']).stdout, /ship: done/, 'no scan asked of a non-HTML app');
  assert.match(run(serve('text/html', 404), ['done']).stdout, /ship: done/, 'an HTML error page at / is not a web UI');
  const mute = started('small'); // an app whose port is open but / never answers must not hang app start
  writeFileSync(join(mute, 'srv.mjs'), "import {createServer} from 'node:http'; createServer(()=>{}).listen(process.env.PORT);");
  apps.add(mute);
  const up = spawnSync(process.execPath, [SHIP, 'app', 'start', freePort(), '--', 'node srv.mjs'], { cwd: mute, encoding: 'utf8', timeout: 15000 });
  run(mute, ['app', 'stop']);
  assert.match(up.stdout ?? '', /app: up/);
  const d = serve('text/html; charset=utf-8');
  assert.match(run(d, ['phase', 'verify']).stdout, /axe scan.*\.ship\/evidence\/a11y-<page>\.json/, 'leaving exercise needs the scan');
  assert.match(run(d, ['done']).stdout, /not done.*axe scan/);
  const scan = (violations) => { mkdirSync(join(d, '.ship', 'evidence'), { recursive: true }); writeFileSync(join(d, '.ship', 'evidence', 'a11y-home.json'), JSON.stringify({ url: '/', violations })); };
  scan([{ id: 'html-has-lang', impact: 'serious', nodes: [{}] }, { id: 'region', impact: 'moderate', nodes: [{}] }]);
  const out = run(d, ['done']).stdout;
  assert.match(out, /html-has-lang/); assert.match(out, /a11y-home\.json/); assert.doesNotMatch(out, /region/, 'only serious and critical count');
  writeFileSync(join(d, '.ship', 'evidence', 'a11y-home.json'), JSON.stringify({ error: 'axe failed to load' }));
  assert.match(run(d, ['done']).stdout, /a11y-home\.json: not an axe\.run\(\) result/, 'a failed scan is not a clean one');
  scan([{ id: 'region', impact: 'minor', nodes: [{}] }]);
  assert.match(run(d, ['phase', 'verify']).stdout, /phase verify/);
  assert.match(run(d, ['done']).stdout, /ship: done/);
});

test('check: green summary on pass; failing lines plus a saved log on fail', () => {
  const d = started();
  writeFileSync(join(d, '.ship', 'checks.json'), JSON.stringify([{ name: 'ok', cmd: 'node -e 1' }, { name: 'test', cmd: 'node -e "console.log(\'noise\');console.error(\'AssertionError: expected 4, got 5\');process.exit(1)"' }]));
  const out = run(d, ['check']);
  assert.equal(out.status, 1);
  assert.match(out.stdout, /ok ✓ test ✗/);
  assert.match(out.stdout, /expected 4, got 5/);
  assert.doesNotMatch(out.stdout, /noise/);
  assert.ok(existsSync(join(d, '.ship', 'logs', 'test.log')));
});

test('check: with none configured, detects the checks the repo has gained since init', () => {
  const d = mkdtempSync(join(tmpdir(), 'ship-'));
  g(d, 'init', '-q', '-b', 'main'); g(d, 'config', 'user.email', 't@t'); g(d, 'config', 'user.name', 't');
  writeFileSync(join(d, 'README.md'), 'x'); g(d, 'add', '-A'); g(d, 'commit', '-qm', 'init');
  assert.match(run(d, ['init', '--session', 's1', 'goal']).stdout, /checks: none yet \(S check detects/);
  const none = run(d, ['check']);
  assert.equal(none.status, 1);
  assert.match(none.stdout, /no checks configured/);
  writeFileSync(join(d, 'package.json'), JSON.stringify({ scripts: { test: 'node -e "console.log(1)"' } }));
  const out = run(d, ['check']);
  assert.equal(out.status, 0, out.stdout);
  assert.match(out.stdout, /check: test ✓/);
  assert.deepEqual(J(d, 'checks.json').map((c) => c.name), ['test']);
  writeFileSync(join(d, '.ship', 'checks.json'), JSON.stringify([{ name: 'mine', cmd: 'node -e 1' }]));
  assert.match(run(d, ['check']).stdout, /check: mine ✓/, 'configured checks are never replaced');
});

test('Stop hook: blocks only its own running session; real work is progress; stalls and caps end it', () => {
  const d = started();
  assert.equal(stop(d, 'other'), '', 'another session in the same repo can stop freely');
  assert.match(stop(d), /"decision":"block"/);
  for (let i = 0; i < 4; i++) { writeFileSync(join(d, '.ship', 'spec.md'), `draft ${i}`); assert.match(stop(d), /"decision":"block"/, 'writing run artifacts is progress'); }
  writeFileSync(join(d, 'package.json'), '{}');
  for (let i = 0; i < 4; i++) { writeFileSync(join(d, 'package.json'), `{"v":${i}}`); assert.match(stop(d), /"decision":"block"/, 're-editing a modified file is progress'); }
  stop(d); stop(d);
  assert.match(JSON.parse(stop(d)).systemMessage, /no progress/);
  assert.equal(J(d, 'state.json').status, 'blocked');
  assert.equal(stop(d), '', 'a blocked run lets the session stop');
  const e = started();
  let last = '';
  for (let i = 0; i < 4; i++) { writeFileSync(join(e, `f${i}`), 'x'); last = stop(e, 's1', { SHIP_MAX_STOPS: '3' }); }
  assert.match(last, /stop cap 3/);
});

test('SessionStart re-injects the status line for the active run only', () => {
  const d = started();
  const ss = (sid) => run(d, ['hook'], JSON.stringify({ hook_event_name: 'SessionStart', session_id: sid, cwd: d })).stdout;
  assert.match(ss('s1'), /phase intake[\s\S]*Re-read its SKILL.md/);
  assert.equal(ss('s2'), '');
  assert.equal(run(d, ['adopt']).status, 1, 'adopt needs a session id');
  run(d, ['adopt', 's2']);
  assert.match(ss('s2'), /phase intake/);
});

test('review: --defer logs each beyond-spec item; the 4th failed round blocks the run', () => {
  const d = started('medium');
  const pass = run(d, ['review', 'pass', 'No in-scope findings', '--defer', 'nested markers', '--defer', 'huge input']);
  assert.equal(pass.status, 0, pass.stdout);
  assert.equal(J(d, 'state.json').review.ok, true);
  assert.match(run(d, ['digest']).stdout, /review\.defer: nested markers[^\n]*\n- review\.defer: huge input/);
  assert.match(readFileSync(join(d, 'docs', 'decisions.md'), 'utf8'), /review\.defer: huge input/);
  assert.equal(run(d, ['review', 'fail', '--defer', 'x', '2 findings']).status, 1, 'a deferral belongs to a pass');
  for (let i = 1; i <= 3; i++) assert.match(run(d, ['review', 'fail', `${i} finding`]).stdout, new RegExp(`running .*review fails ${i}/3`));
  const capped = run(d, ['review', 'fail', 'still 1 finding']);
  assert.equal(capped.status, 1, 'the blocking fail exits non-zero');
  assert.match(capped.stdout, /blocked · .*review cap: 4 failed reviews, 3 fix rounds used: still 1 finding/);
  assert.equal(run(d, ['review', 'pass', 'ok']).status, 1, 'a blocked run takes no new verdict');
  assert.equal(J(d, 'state.json').review.ok, false);
  assert.match(run(d, ['status']).stdout, /review cap: .*still 1 finding/);
  assert.match(run(d, ['adopt', 's1'], '').stdout, /^ship: running/);
  assert.match(run(d, ['review', 'pass', 'fixed']).stdout, /^ship: running/, 'a resumed run can still pass');
  assert.equal(J(d, 'state.json').review.ok, true);
  assert.match(run(d, ['review', 'fail', 'new finding']).stdout, /^ship: running .*review fails 1\/3/, 'a resume restores the fix rounds');
  run(d, ['pause']); run(d, ['adopt', 's1'], '');
  run(d, ['block', 'waiting on an API key']); run(d, ['adopt', 's1'], '');
  assert.match(run(d, ['status']).stdout, /review fails 1\/3/, 'only a review-cap block restores the rounds');
});

test('Stop hook lets an idle stop through, uncounted, only while a subagent runs in the background', () => {
  const d = started();
  const ev = (background_tasks) => run(d, ['hook'], JSON.stringify({ hook_event_name: 'Stop', session_id: 's1', cwd: d, background_tasks })).stdout;
  assert.equal(ev([{ id: 'a1', type: 'subagent', status: 'running' }]), '', 'the subagent report wakes the session');
  assert.equal(J(d, 'state.json').stops, 0, 'a waiting stop is not a push');
  assert.match(ev([{ id: 'b1', type: 'shell', status: 'running' }]), /"decision":"block"/, 'a background shell (a server) never reports, so it gets no pass');
  assert.match(ev([{ id: 'a1', type: 'subagent', status: 'completed' }]), /"decision":"block"/);
  assert.equal(J(d, 'state.json').stops, 2);
});

test('replay: every saved replay against one fresh server on a free port; done needs it green on the current code', () => {
  const d = started('small');
  writeFileSync(join(d, 'srv.mjs'), "import {createServer} from 'node:http'; createServer((q,s)=>s.end('ok')).listen(process.env.PORT);");
  g(d, 'add', '-A'); g(d, 'commit', '-qm', 'srv');
  writeFileSync(join(d, '.ship', 'journeys.json'), JSON.stringify([journey]));
  run(d, ['lock']); run(d, ['journey', 'pass', 'j1', 'snap.yml:12']); run(d, ['check']); run(d, ['review', 'pass', 'No findings']);
  const used = freePort();
  run(d, ['app', 'start', used, '--', 'node srv.mjs']); // the exercise server, still up
  const jdir = join(d, '.ship', 'journeys');
  mkdirSync(jdir, { recursive: true });
  const get = (base) => `node -e "fetch(${base}).then(r=>process.exit(r.ok?0:1),()=>{console.log('no answer at '+${base});process.exit(1)})"\n`;
  writeFileSync(join(jdir, 'j1.sh'), get('process.env.BASE'));
  writeFileSync(join(jdir, 'j2.sh'), get(`'http://localhost:${used}'`)); // leans on the exercise server's port
  assert.match(run(d, ['done']).stdout, /not done.*green replays on a fresh server.*S replay/, 'saved replays must be re-run before done');
  const bad = run(d, ['replay']);
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /j2\.sh ✗ \(exit 1\): no answer at http:\/\/localhost:\d+/);
  assert.match(bad.stdout, /app: stopped \(pid \d+\)/, 'says it replaced the running app');
  assert.match(bad.stdout, /must pass using only BASE=http:\/\/localhost:\d+/, 'a failure says what a replay may rely on');
  assert.doesNotMatch(bad.stdout, /j1\.sh ✗/);
  assert.match(bad.stdout, /replay: 1\/2 green on a fresh server \(node srv\.mjs\)/, 'defaults to the last S app start command');
  assert.ok(!existsSync(join(d, '.ship', 'app.json')), 'the replay server is stopped, and so is the one it replaced');
  assert.match(run(d, ['done']).stdout, /S replay/);
  writeFileSync(join(jdir, 'j2.sh'), get('process.env.BASE'));
  assert.match(run(d, ['replay', '--', 'node srv.mjs']).stdout, /replay: 2\/2 green/);
  writeFileSync(join(jdir, 'j3.sh'), 'exit 1\n');
  assert.match(run(d, ['done']).stdout, /S replay/, 'a replay added after a green run re-opens the gate');
  writeFileSync(join(jdir, 'j3.sh'), get('process.env.BASE'));
  run(d, ['replay']);
  writeFileSync(join(jdir, 'j3.sh'), 'exit 1\n# edited\n');
  assert.match(run(d, ['done']).stdout, /S replay/, 'so does editing one');
  writeFileSync(join(jdir, 'j3.sh'), get('process.env.BASE'));
  run(d, ['replay']);
  assert.match(run(d, ['done']).stdout, /ship: done/);
  const e = started('small');
  assert.match(run(e, ['replay']).stdout, /no \.ship\/journeys\/\*\.sh/);
  mkdirSync(join(e, '.ship', 'journeys'));
  writeFileSync(join(e, '.ship', 'journeys', 'j1.sh'), 'exit 3\n');
  assert.match(run(e, ['replay']).stdout, /j1\.sh ✗ \(exit 3\): \(no output\)/, 'a silent failure still says something');
  writeFileSync(join(e, '.ship', 'journeys', 'j1.sh'), '[ -z "$BASE" ]\n');
  assert.match(run(e, ['replay'], undefined, { BASE: 'http://localhost:1' }).stdout, /1\/1 green/, 'without a start command the caller\'s BASE is not passed on');
  writeFileSync(join(e, '.ship', 'journeys', 'j1.sh'), 'exit 0\n');
  assert.match(run(e, ['replay']).stdout, /replay: 1\/1 green \(no server\)/, 'a CLI run replays without a server');
  run(e, ['check']);
  writeFileSync(join(e, 'app.js'), 'changed after replay');
  g(e, 'add', '-A'); g(e, 'commit', '-qm', 'x'); run(e, ['check']);
  assert.match(run(e, ['done']).stdout, /S replay/, 'a replay is tied to the code it ran on');
});

test('app start and replay refuse a start command that hard-codes the port, since replay picks its own', () => {
  const d = started('small');
  writeFileSync(join(d, 'srv.mjs'), "import {createServer} from 'node:http'; const p = process.argv[3] ?? process.env.PORT; createServer((q,s)=>s.end('ok')).listen(p);");
  const port = freePort();
  for (const cmd of [`PORT=${port} node srv.mjs`, `node srv.mjs --port ${port}`, `node srv.mjs --port 0${port}`, 'PORT=8080 node srv.mjs']) {
    const res = run(d, ['app', 'start', port, '--', cmd]);
    assert.equal(res.status, 1, cmd);
    assert.match(res.stdout, /hard-codes the port[^]*\$PORT/, cmd);
    assert.ok(!existsSync(join(d, '.ship', 'app.json')), `nothing started for ${cmd}`);
  }
  mkdirSync(join(d, '.ship', 'journeys'), { recursive: true });
  writeFileSync(join(d, '.ship', 'journeys', 'j1.sh'), 'node -e "fetch(process.env.BASE).then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"\n');
  assert.match(run(d, ['replay', '--', 'PORT=8080 node srv.mjs']).stdout, /hard-codes the port/);
  // A port that only appears inside a longer number or word, or through $PORT, is not hard-coded.
  assert.match(run(d, ['app', 'start', port, '--', `node srv.mjs --port $PORT # ${port}9 v${port}x ${port}.5 a${port}`]).stdout, /app: up on/);
  run(d, ['app', 'stop']);
  assert.match(run(d, ['replay', '--', 'node srv.mjs --port $PORT']).stdout, /replay: 1\/1 green on a fresh server/);
});

test('replay --only tries one replay and never opens the replay gate', () => {
  const d = started('small');
  mkdirSync(join(d, '.ship', 'journeys'), { recursive: true });
  writeFileSync(join(d, '.ship', 'journeys', 'j1.sh'), 'exit 0\n');
  writeFileSync(join(d, '.ship', 'journeys', 'j2.sh'), 'exit 4\n');
  assert.match(run(d, ['replay', '--only', 'j1']).stdout, /replay: 1\/1 green/);
  assert.equal(J(d, 'state.json').replay, undefined, 'a single try records nothing');
  assert.match(run(d, ['replay', '--only', 'j3']).stdout, /no \.ship\/journeys\/j3\.sh/);
  assert.match(run(d, ['replay']).stdout, /j2\.sh ✗ \(exit 4\)/);
});

// --- Provable process ownership: S signals only what it can prove it started.
const posix = process.platform !== 'win32';
const isAlive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
const waitGone = (pid) => { for (let i = 0; i < 40 && isAlive(pid); i++) spawnSync('sleep', ['0.1']); return !isAlive(pid); };

test('replay: a server a replay leaves running is stopped with it; exit codes are kept', { skip: !posix }, () => {
  const d = started();
  mkdirSync(join(d, '.ship', 'journeys'), { recursive: true });
  // j1 starts a background server and passes; j2 fails with its own code.
  writeFileSync(join(d, '.ship', 'journeys', 'j1.sh'), `node -e "require('http').createServer(()=>{}).listen(0)" & echo $! > "${join(d, 'left.pid')}"; sleep 0.3; exit 0\n`);
  writeFileSync(join(d, '.ship', 'journeys', 'j2.sh'), 'exit 3\n');
  let left;
  try {
    const out = run(d, ['replay']).stdout;
    left = Number(readFileSync(join(d, 'left.pid'), 'utf8'));
    assert.match(out, /j2\.sh ✗ \(exit 3\)/, 'a failing replay keeps its exit code');
    assert.doesNotMatch(out, /j1\.sh ✗/, 'a passing replay is not turned into a failure by the cleanup');
    assert.ok(waitGone(left), 'the server the replay started is gone');
  } finally { if (left && isAlive(left)) process.kill(left, 'SIGKILL'); }
});

test('replay: a timed-out replay and everything it started are killed', { skip: !posix }, () => {
  const d = started();
  mkdirSync(join(d, '.ship', 'journeys'), { recursive: true });
  writeFileSync(join(d, '.ship', 'journeys', 'j1.sh'), `node -e "process.on('SIGTERM',()=>{});setInterval(()=>{},1e3)" & echo $! > "${join(d, 'left.pid')}"; sleep 30\n`);
  let left;
  try {
    const out = run(d, ['replay'], undefined, { SHIP_REPLAY_TIMEOUT: '1500' }).stdout;
    left = Number(readFileSync(join(d, 'left.pid'), 'utf8'));
    assert.match(out, /j1\.sh ✗ \(exit timeout\)/);
    assert.ok(waitGone(left), 'a leftover that ignores TERM is killed with the group');
  } finally { if (left && isAlive(left)) process.kill(left, 'SIGKILL'); }
});

test('app stop never signals a pid it cannot prove is its app', { skip: !posix }, () => {
  const d = started();
  // An unrelated process that leads its own group, standing in for a reused pid.
  const other = spawn('sleep', ['30'], { detached: true, stdio: 'ignore' }); other.unref();
  try {
    writeFileSync(join(d, '.ship', 'app.json'), JSON.stringify({ pid: other.pid, id: 'some-other-start', port: 1, cmd: 'x' }));
    assert.match(run(d, ['app', 'stop']).stdout, /left alone/);
    assert.ok(isAlive(other.pid), 'the unrelated process survives');
    writeFileSync(join(d, '.ship', 'app.json'), JSON.stringify({ pid: other.pid, port: 1, cmd: 'x' })); // an old record with no identity
    run(d, ['app', 'stop']);
    assert.ok(isAlive(other.pid), 'no recorded identity, no signal');
  } finally { try { process.kill(-other.pid, 'SIGKILL'); } catch { /* gone */ } }
});

test('S running inside the app never stops its own group', { skip: !posix }, () => {
  const d = started();
  const port = freePort();
  // The app runs S app stop itself, then keeps serving.
  writeFileSync(join(d, 'srv.mjs'), `import {createServer} from 'node:http'; import {spawnSync} from 'node:child_process'; createServer((q,s)=>s.end('ok')).listen(process.env.PORT, () => { const r = spawnSync(process.execPath, [${JSON.stringify(SHIP)}, 'app', 'stop'], { encoding: 'utf8' }); require('node:fs').writeFileSync('inner.txt', r.stdout); });`.replace("require('node:fs').writeFileSync", "(await import('node:fs')).writeFileSync").replace('() => {', 'async () => {'));
  try {
    assert.match(run(d, ['app', 'start', port, '--', 'node srv.mjs']).stdout, /app: up/);
    for (let i = 0; i < 40 && !existsSync(join(d, 'inner.txt')); i++) spawnSync('sleep', ['0.1']);
    assert.match(readFileSync(join(d, 'inner.txt'), 'utf8'), /running inside that app/);
    assert.equal(spawnSync('curl', ['-s', `http://127.0.0.1:${port}/`], { encoding: 'utf8' }).stdout, 'ok', 'the app is still serving');
    const pid = JSON.parse(readFileSync(join(d, '.ship', 'app.json'), 'utf8')).pid;
    assert.match(run(d, ['app', 'stop']).stdout, /app: stopped/, 'a stop from outside still works');
    assert.ok(waitGone(pid), 'and the app is gone');
  } finally { run(d, ['app', 'stop']); }
});

test('replay: a detached process holding the pipes never hangs S; leftovers that dodge the trap are swept; $0 is the script', { skip: !posix }, () => {
  const d = started();
  mkdirSync(join(d, '.ship', 'journeys'), { recursive: true });
  // j1: escapes into its own session and keeps the pipes open. j2: replaces S's trap and leaves a TERM-ignoring
  // process with its output redirected. j3: relies on $0 being the script's own path.
  writeFileSync(join(d, '.ship', 'journeys', 'j1.sh'), `setsid sleep 20 & echo $! > "${join(d, 'escaped.pid')}"; sleep 0.5; exit 0\n`);
  writeFileSync(join(d, '.ship', 'journeys', 'j2.sh'), `trap 'true' EXIT; node -e "process.on('SIGTERM',()=>{});setInterval(()=>{},1e3)" >/dev/null 2>&1 & echo $! > "${join(d, 'stubborn.pid')}"; exit 0\n`);
  writeFileSync(join(d, '.ship', 'journeys', 'j3.sh'), `[ "$(basename "$0")" = j3.sh ] || { echo "\\$0 is $0"; exit 7; }\n`);
  let escaped, stubborn;
  try {
    const t0 = Date.now();
    const out = run(d, ['replay'], undefined, { SHIP_REPLAY_TIMEOUT: '20000' }).stdout;
    escaped = Number(readFileSync(join(d, 'escaped.pid'), 'utf8')); stubborn = Number(readFileSync(join(d, 'stubborn.pid'), 'utf8'));
    assert.ok(Date.now() - t0 < 10000, `replay returned in ${Date.now() - t0} ms, not after the pipes were released`);
    assert.match(out, /replay: 3\/3 green/, out);
    assert.ok(waitGone(stubborn), 'a leftover in the replay group is swept even when the trap was replaced');
    assert.ok(isAlive(escaped), 'a process that left the group is not S\'s to prove, so it is left alone');
  } finally { for (const p of [escaped, stubborn]) if (p && isAlive(p)) process.kill(p, 'SIGKILL'); }
});

test('driver: an installed CLI first, else a Playwright library that launches; axe located; the pick is logged', { skip: !posix }, () => {
  const d = started();
  const bin = mkdtempSync(join(tmpdir(), 'ship-bin-'));
  const env = { PATH: `${bin}:${dirname(process.execPath)}:/usr/bin:/bin`, NPM_CONFIG_PREFIX: mkdtempSync(join(tmpdir(), 'ship-npm-')) };
  const lib = (dir, launch) => { mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'package.json'), '{"main":"index.js"}'); writeFileSync(join(dir, 'index.js'), `exports.chromium = { launch: async () => { ${launch} } };`); };
  const none = run(d, ['driver'], '', env);
  assert.equal(none.status, 1);
  assert.match(none.stdout, /no installed browser driver works.*npx -y @playwright\/cli/s);
  assert.match(none.stdout, /axe: not installed · npm i --prefix \.ship\/tools axe-core/);
  lib(join(env.NPM_CONFIG_PREFIX, 'lib', 'node_modules', 'playwright'), "throw new Error('no browser')");
  assert.equal(run(d, ['driver'], '', env).status, 1, 'a library whose Chromium fails to launch is no driver');
  const broken = join(d, 'node_modules', 'playwright');
  lib(broken, "throw new Error('no browser')");
  lib(join(env.NPM_CONFIG_PREFIX, 'lib', 'node_modules', 'playwright'), 'console.log("noise"); return { close: async () => {} };');
  const next = run(d, ['driver'], '', env);
  assert.match(next.stdout, /driver: Playwright library .*ship-npm-.*lib\/node_modules\/playwright/, 'a library that cannot launch falls through to the next one');
  spawnSync('rm', ['-rf', join(d, 'docs'), join(d, '.ship', 'decisions.jsonl'), env.NPM_CONFIG_PREFIX]);
  assert.ok(!existsSync(join(d, 'docs', 'decisions.md')), 'nothing logged without a driver');
  const local = join(d, 'node_modules', 'playwright');
  lib(local, 'return { close: async () => {} };');
  mkdirSync(join(d, '.ship', 'tools', 'node_modules', 'axe-core'), { recursive: true });
  writeFileSync(join(d, '.ship', 'tools', 'node_modules', 'axe-core', 'axe.min.js'), '');
  const out = run(d, ['driver'], '', env);
  assert.equal(out.status, 0, out.stdout);
  assert.match(out.stdout, new RegExp(`driver: Playwright library ${local}`));
  assert.match(out.stdout, /axe: .*\.ship\/tools\/node_modules\/axe-core\/axe\.min\.js/);
  assert.match(readFileSync(join(d, 'docs', 'decisions.md'), 'utf8'), /build\.driver: Playwright library/);
  run(d, ['driver'], '', env);
  assert.equal(readFileSync(join(d, 'docs', 'decisions.md'), 'utf8').match(/build\.driver/g).length, 1, 'the same pick is logged once');
  lib(local, 'process.exit(0);');
  assert.equal(run(d, ['driver'], '', env).status, 1, 'a clean exit without a launched browser is no driver');
  lib(local, 'return { close: async () => {} };');
  writeFileSync(join(bin, 'agent-browser'), '#!/bin/sh\n'); spawnSync('chmod', ['+x', join(bin, 'agent-browser')]);
  assert.match(run(d, ['driver'], '', env).stdout, /driver: agent-browser \(CLI on PATH\)/);
});

test('review pass: says which later edits keep it, and done holds it to that', () => {
  const d = started();
  run(d, ['check']);
  const out = run(d, ['review', 'pass', 'No findings']).stdout;
  assert.match(out, /From here, edit only docs\/decisions\.md and docs\/solutions\/: any other change needs another check, replay and review/);
  mkdirSync(join(d, 'docs', 'solutions'), { recursive: true });
  writeFileSync(join(d, 'docs', 'solutions', 'lesson.md'), 'x');
  assert.doesNotMatch(run(d, ['done']).stdout, /reviewer pass/, 'a lesson keeps the pass');
  writeFileSync(join(d, 'README.md'), 'usage');
  assert.match(run(d, ['done']).stdout, /a reviewer pass on the current code/, 'a README edit does not');
});

// --- MSNC cycle: pick up what grill/spec/tickets already produced; grill mode; pace 0.
const ticket = (d, f, n, status) => { mkdirSync(join(d, '.scratch', f, 'issues'), { recursive: true }); writeFileSync(join(d, '.scratch', f, 'issues', `${n}-t.md`), `# T\n\n**Status:** ${status}\n`); };

test('intake lists MSNC features with how far each got; feature binds one and says where to continue', () => {
  const d = started('medium');
  assert.match(run(d, ['intake']).stdout, /tracker Local Markdown \(\.scratch\/\)[^]*no features yet → new feature/);
  mkdirSync(join(d, '.scratch', 'todo-v2'), { recursive: true }); writeFileSync(join(d, '.scratch', 'todo-v2', 'spec.md'), '# spec');
  ticket(d, 'todo-v2', '01', 'done'); ticket(d, 'todo-v2', '02', 'ready-for-agent'); ticket(d, 'todo-v2', '03', 'ready-for-human');
  mkdirSync(join(d, '.scratch', 'notes'), { recursive: true }); writeFileSync(join(d, '.scratch', 'notes', 'spec.md'), '# spec');
  ticket(d, 'done-one', '01', 'done');
  mkdirSync(join(d, 'docs'), { recursive: true }); writeFileSync(join(d, 'docs', 'decisions.md'), '- 2026-10-01 · storage: localStorage · simplest · undo: swap\n- 2026-10-01 · ids: uuid · unique · undo: ints\n');
  const out = run(d, ['intake']).stdout;
  assert.match(out, /docs\/decisions\.md 2 settled decisions/);
  assert.match(out, /todo-v2: spec ✓ · tickets 1\/3 done \(1 for a human\) → continue at define step 3 \(journeys\), then build/);
  assert.match(out, /notes: spec ✓ · tickets 0\/0 done → continue at define step 3 \(spec done: journeys, then tickets\)/);
  assert.match(out, /done-one: spec ✗ · tickets 1\/1 done → continue at define step 3 \(journeys\), then exercise/);
  assert.equal(run(d, ['feature', 'Bad Slug']).status, 1);
  assert.match(run(d, ['feature', 'todo-v2']).stdout, /feature todo-v2[^]*continue at define step 3 \(journeys\), then build/);
  assert.match(run(d, ['feature', 'fresh']).stdout, /feature fresh: new → define/);
  mkdirSync(join(d, 'docs', 'agents'), { recursive: true }); writeFileSync(join(d, 'docs', 'agents', 'issue-tracker.md'), '# Issue tracker: GitHub\n');
  assert.match(run(d, ['intake']).stdout, /tracker GitHub \(not scanned here: list it with its CLI\)/);
});

test('medium and large runs build only from a committed MSNC spec and tickets; small runs skip the gate', () => {
  const d = started('medium');
  run(d, ['size', 'medium']);
  assert.match(run(d, ['phase', 'build']).stdout, /S intake, then S feature <slug>/);
  run(d, ['feature', 'habits']);
  assert.match(run(d, ['phase', 'build']).stdout, /spec at \.scratch\/habits\/spec\.md/);
  mkdirSync(join(d, '.scratch', 'habits'), { recursive: true }); writeFileSync(join(d, '.scratch', 'habits', 'spec.md'), '# spec');
  assert.match(run(d, ['phase', 'build']).stdout, /tickets in \.scratch\/habits\/issues/);
  ticket(d, 'habits', '01', 'ready-for-agent');
  assert.match(run(d, ['phase', 'build']).stdout, /build needs the spec and tickets committed: \.scratch\/habits\//);
  g(d, 'add', '.scratch'); g(d, 'commit', '-qm', 'spec and tickets');
  assert.match(run(d, ['phase', 'build']).stdout, /phase build/);
  const e = started('small'); run(e, ['size', 'small']);
  assert.match(run(e, ['phase', 'build']).stdout, /phase build/, 'small runs have no spec or tickets');
  const f = started('large'); run(f, ['size', 'large']);
  mkdirSync(join(f, 'docs', 'agents'), { recursive: true }); writeFileSync(join(f, 'docs', 'agents', 'issue-tracker.md'), '# Issue tracker: GitHub\n');
  writeFileSync(join(f, '.ship', 'spec.md'), '# fetched with gh'); g(f, 'add', 'docs'); g(f, 'commit', '-qm', 'tracker');
  run(f, ['feature', 'gh-feature', '--spec', '.ship/spec.md']);
  assert.match(run(f, ['phase', 'build']).stdout, /phase build/, 'GitHub tickets are not on disk to count');
});

test('grill mode: stops wait for the user until S go, then the run is autonomous', () => {
  const d = repo();
  assert.match(run(d, ['init', '--session', 's1', '--grill', 'build a habit tracker']).stdout, /grill mode[^]*S go/);
  assert.match(run(d, ['status']).stdout, /ship: grilling · phase define/);
  assert.equal(run(d, ['init', '--session', 's1', 'again']).status, 1, 'a grilling run is an active run');
  assert.equal(stop(d), '', 'waiting for grill answers is allowed');
  assert.match(run(d, ['hook'], JSON.stringify({ hook_event_name: 'SessionStart', session_id: 's1', cwd: d })).stdout, /grill mode[^]*ask the next round/);
  run(d, ['decide', 'define.storage', 'localStorage', 'user answered Q1', 'swap store', '--by', 'user']);
  assert.match(readFileSync(join(d, 'docs', 'decisions.md'), 'utf8'), /define\.storage: localStorage · user answered Q1/);
  run(d, ['adopt', 's2']);
  assert.match(run(d, ['status']).stdout, /ship: grilling/, 'resuming in another session keeps grilling');
  assert.match(run(d, ['go']).stdout, /ship: running · phase define/);
  assert.match(stop(d, 's2'), /"decision":"block"/, 'after S go, the Stop hook keeps it working');
  assert.equal(run(d, ['go']).status, 1, 'go only leaves grill mode');
});

test('pace 0: a mid-build stop offer is sent back to work, and build.md always passes pace 0 to implement', () => {
  const d = started('small');
  run(d, ['phase', 'build']);
  writeFileSync(join(d, 'a.js'), '1'); // ticket 1 of 3 done; the session ends its turn with "Stop here?"
  assert.match(stop(d), /"decision":"block"[^]*isn't finished/);
  const build = readFileSync(join(dirname(SHIP), '..', 'phases', 'build.md'), 'utf8');
  assert.match(build, /implement\/SKILL\.md[^]*?Always use `pace 0`/);
  assert.match(build, /never offer a stop/i);
});

test('medium tickets must be built by msnc:implementer; the SubagentStart hook counts the workers', () => {
  const d = started('medium'); run(d, ['size', 'medium']);
  mkdirSync(join(d, '.scratch', 'habits'), { recursive: true }); writeFileSync(join(d, '.scratch', 'habits', 'spec.md'), '# spec');
  ticket(d, 'habits', '01', 'done'); ticket(d, 'habits', '02', 'ready-for-agent');
  g(d, 'add', '-A'); g(d, 'commit', '-qm', 'spec');
  run(d, ['feature', 'habits']); run(d, ['phase', 'build']);
  assert.match(run(d, ['phase', 'exercise']).stdout, /phase exercise/, 'nothing built yet, nothing to prove');
  run(d, ['phase', 'build']);
  ticket(d, 'habits', '02', 'done'); g(d, 'add', '-A'); g(d, 'commit', '-qm', 'built inline');
  assert.match(run(d, ['phase', 'exercise']).stdout, /1 ticket\(s\) done in this run but 0 msnc:implementer/);
  const sub = (sid, type) => run(d, ['hook'], JSON.stringify({ hook_event_name: 'SubagentStart', session_id: sid, agent_type: type, cwd: d }));
  sub('other', 'msnc:implementer'); sub('s1', 'msnc:exerciser');
  assert.match(run(d, ['phase', 'exercise']).stdout, /done in this run but 0/, 'another session or another worker does not count');
  assert.equal(sub('s1', 'msnc:implementer').stdout, '', 'the hook prints nothing');
  assert.match(run(d, ['phase', 'exercise']).stdout, /phase exercise/);
  assert.equal(J(d, 'state.json').agents['msnc:implementer'], 1);
});

test('a survived probe blocks review and done until the test is strengthened or deleted', () => {
  const d = started('small');
  writeFileSync(join(d, 'm.js'), 'export const f = (x) => x > 1;\n');
  writeFileSync(join(d, 'weak.test.mjs'), "import {f} from './m.js'; f(5);\n");
  const cmd = 'node weak.test.mjs'; // plain node: a nested node --test inherits this runner's NODE_TEST_CONTEXT
  assert.match(run(d, ['probe', 'm.js', 'x > 1', 'x >= 1', '--', cmd]).stdout, /SURVIVED/);
  assert.match(run(d, ['diff']).stdout, /resolve survived probes before review[^]*#1 m\.js :: node weak\.test\.mjs/);
  run(d, ['decide', 'test.weak', 'keep as is', 'it runs', 'delete it']);
  assert.match(run(d, ['diff']).stdout, /resolve survived probes/, 'keeping it does not resolve it');
  writeFileSync(join(d, 'weak.test.mjs'), "import {f} from './m.js'; import a from 'node:assert'; a.equal(f(1), false);\n");
  writeFileSync(join(d, 'm.js'), 'export const f = (x) => x > 1;\nexport const g = 1;\n');
  writeFileSync(join(d, 'g.mjs'), "import {g} from './m.js'; process.exit(g === 1 ? 0 : 1);\n");
  assert.match(run(d, ['probe', 'm.js', 'g = 1', 'g = 2', '--', 'node g.mjs']).stdout, /KILLED/);
  assert.match(run(d, ['diff']).stdout, /resolve survived probes/, 'a KILLED probe of another break does not resolve it');
  assert.match(run(d, ['probe', 'm.js', 'x > 1', 'x >= 1', '--', cmd]).stdout, /probe #3: KILLED/);
  assert.match(run(d, ['diff']).stdout, /review\.diff/, 'strengthened and re-probed');
  // The code moved after the survivor: a declared re-probe of the same behavior in the same file answers it.
  const e2 = started('small');
  writeFileSync(join(e2, 'm.js'), 'export const f = (x) => x > 1;\n');
  writeFileSync(join(e2, 'weak.test.mjs'), "import {f} from './m.js'; f(5);\n");
  assert.match(run(e2, ['probe', 'm.js', 'x > 1', 'x >= 1', '--', cmd]).stdout, /SURVIVED[^]*--for 1/);
  writeFileSync(join(e2, 'm.js'), 'export const f = (y) => (y > 1);\n');
  writeFileSync(join(e2, 'weak.test.mjs'), "import {f} from './m.js'; import a from 'node:assert'; a.equal(f(1), false);\n");
  assert.match(run(e2, ['probe', '--for', '1', 'm.js', '(y > 1)', '(y >= 1)', '--', 'node other.mjs']).stdout, /ERROR|KILLED|SURVIVED/);
  assert.match(run(e2, ['diff']).stdout, /resolve survived probes/, 'another test command does not answer it');
  assert.match(run(e2, ['probe', '--for', '1', 'm.js', '(y > 1)', '(y >= 1)', '--', cmd]).stdout, /KILLED/);
  assert.match(run(e2, ['diff']).stdout, /review\.diff/, 'answered with --for');
  const e = started('small');
  writeFileSync(join(e, 'm.js'), 'export const f = (x) => x > 1;\n');
  writeFileSync(join(e, 'weak.test.mjs'), "import {f} from './m.js'; f(5);\n");
  run(e, ['probe', 'm.js', 'x > 1', 'x >= 1', '--', cmd]);
  g(e, 'add', '-A'); g(e, 'commit', '-qm', 'x'); run(e, ['check']);
  assert.match(run(e, ['done']).stdout, /survived probes resolved/);
  run(e, ['decide', 'test.other', 'deleted #12 other.test.mjs', 'x', 'y']);
  assert.match(run(e, ['done']).stdout, /survived probes resolved/, 'deleting another test does not resolve it');
  run(e, ['decide', 'test.weak', 'deleted #1 weak.test.mjs', 'no input separates the break', 'restore it']);
  assert.match(run(e, ['diff']).stdout, /review\.diff/, 'deleted and logged');
});

test('replay: its server is its own, so a concurrent S app stop cannot take it down', async () => {
  const d = started('small');
  writeFileSync(join(d, 'srv.mjs'), "import {createServer} from 'node:http'; createServer((q,s)=>s.end('ok')).listen(process.env.PORT);");
  mkdirSync(join(d, '.ship', 'journeys'), { recursive: true });
  writeFileSync(join(d, '.ship', 'journeys', 'j1.sh'), 'sleep 2\nnode -e "fetch(process.env.BASE).then(r=>process.exit(r.ok?0:1),()=>{console.log(\'refused\');process.exit(1)})"\n');
  apps.add(d);
  const out = await new Promise((ok) => {
    const p = spawn(process.execPath, [SHIP, 'replay', '--', 'node srv.mjs'], { cwd: d });
    let o = ''; p.stdout.on('data', (x) => { o += x; if (/app: up/.test(o) && !p.stopped) { p.stopped = true; run(d, ['app', 'stop']); } });
    p.on('close', () => ok(o));
  });
  assert.match(out, /replay: 1\/1 green/, out);
  assert.ok(!existsSync(join(d, '.ship', 'replay-app.json')), 'and the replay stopped its own server');
});

test('done needs every agent ticket marked done; plain and bold Status lines both count', () => {
  const d = started('medium'); run(d, ['size', 'medium']);
  mkdirSync(join(d, '.scratch', 'c', 'issues'), { recursive: true }); writeFileSync(join(d, '.scratch', 'c', 'spec.md'), '# spec');
  writeFileSync(join(d, '.scratch', 'c', 'issues', '01-a.md'), '# A\n\nStatus: done · Blocked by: none\n');
  writeFileSync(join(d, '.scratch', 'c', 'issues', '02-b.md'), '# B\n\n**Status:** ready-for-agent\n');
  writeFileSync(join(d, '.scratch', 'c', 'issues', '03-c.md'), '# C\n\n- **Status**: `ready-for-human`\n');
  g(d, 'add', '-A'); g(d, 'commit', '-qm', 'spec');
  assert.match(run(d, ['intake']).stdout, /c: spec ✓ · tickets 1\/3 done \(1 for a human\)/);
  run(d, ['feature', 'c']); run(d, ['check']); run(d, ['review', 'pass', 'x']);
  assert.match(run(d, ['done']).stdout, /each new ready-for-human ticket put to the user with S ask, naming its file: 03-c\.md/);
  run(d, ['ask', 'Ticket 03-c.md needs you: do it?', 'yes']);
  assert.match(run(d, ['done']).stdout, /marked \*\*Status:\*\* done[^]*Open: 02-b\.md/);
  writeFileSync(join(d, '.scratch', 'c', 'issues', '02-b.md'), '# B\n\n**Status:** done\n');
  run(d, ['hook'], JSON.stringify({ hook_event_name: 'SubagentStart', session_id: 's1', agent_type: 'msnc:implementer', cwd: d }));
  g(d, 'add', '-A'); g(d, 'commit', '-qm', 'b'); run(d, ['check']); run(d, ['review', 'pass', 'x']);
  assert.match(run(d, ['done']).stdout, /ship: done/);
});

test('MSNC gates fail closed: unsized runs, skipped build, rebinding, one worker for many tickets, a stray --spec', () => {
  const d = started();
  run(d, ['check']); run(d, ['review', 'pass', 'x']);
  assert.match(run(d, ['done']).stdout, /the run sized first/, 'an unsized run is not a small one');
  run(d, ['size', 'medium']);
  assert.match(run(d, ['phase', 'exercise']).stdout, /exercise needs the feature bound first/, 'skipping build skips no gate');
  assert.equal(run(d, ['feature', 'x', '--spec', 'README.md']).status, 1, '--spec must be a tracker copy');
  mkdirSync(join(d, '.scratch', 'f'), { recursive: true }); writeFileSync(join(d, '.scratch', 'f', 'spec.md'), '# spec');
  ticket(d, 'f', '01', 'ready-for-agent'); ticket(d, 'f', '02', 'ready-for-agent');
  g(d, 'add', '-A'); g(d, 'commit', '-qm', 'spec');
  run(d, ['feature', 'f']); run(d, ['phase', 'build']);
  ticket(d, 'f', '01', 'done'); ticket(d, 'f', '02', 'done'); g(d, 'add', '-A'); g(d, 'commit', '-qm', 'built');
  run(d, ['hook'], JSON.stringify({ hook_event_name: 'SubagentStart', session_id: 's1', agent_type: 'msnc:implementer', cwd: d }));
  assert.match(run(d, ['phase', 'exercise']).stdout, /2 ticket\(s\) done in this run but 1/, 'one worker for two tickets');
  run(d, ['feature', 'f']);
  assert.match(run(d, ['phase', 'exercise']).stdout, /2 ticket\(s\) done in this run but 1/, 're-binding the same feature keeps its starting point');
  assert.match(run(d, ['feature', 'other']).stdout, /already being built/, 'a run builds one feature');
  run(d, ['hook'], JSON.stringify({ hook_event_name: 'SubagentStart', session_id: 's1', agent_type: 'other-plugin:implementer', cwd: d }));
  assert.match(run(d, ['phase', 'exercise']).stdout, /but 1/, "another plugin's implementer does not count");
  run(d, ['hook'], JSON.stringify({ hook_event_name: 'SubagentStart', session_id: 's1', agent_type: 'msnc:implementer', cwd: d }));
  assert.match(run(d, ['phase', 'exercise']).stdout, /phase exercise/);
  const e = repo();
  run(e, ['init', '--session', 's1', '--grill', 'goal']); run(e, ['pause']); run(e, ['adopt', 's2']);
  assert.match(run(e, ['status']).stdout, /ship: grilling/, 'a paused grill resumes as a grill, not autonomously');
});

// --- Windows: no process groups. Trees are walked from a root S provably owns.
const win = process.platform === 'win32';
const pidFile = (d, name) => JSON.stringify(join(d, name).replace(/\\/g, '/'));
const nodeLeft = (d, name, extra = '') => `node -e "require('fs').writeFileSync(${pidFile(d, name).replace(/"/g, "'")}, String(process.pid));${extra}setInterval(()=>{},1e3)"`;
const readPid = (d, name) => { for (let i = 0; i < 50 && !existsSync(join(d, name)); i++) nap(100); return Number(readFileSync(join(d, name), 'utf8')); };
function nap(ms) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }
const gone = (pid) => { for (let i = 0; i < 50; i++) { try { process.kill(pid, 0); } catch { return true; } nap(100); } return false; };
const kill = (pid) => { try { process.kill(pid, 'SIGKILL'); } catch { /* gone */ } };

test('Windows: app stop kills the app and what it spawned; done does too', { skip: !win }, () => {
  const d = started('small');
  writeFileSync(join(d, 'srv.mjs'), `import {createServer} from 'node:http'; import {spawn} from 'node:child_process'; spawn(process.execPath, ['-e', "require('fs').writeFileSync('kid.pid', String(process.pid)); setInterval(()=>{},1e3)"], {stdio:'ignore'}); createServer((q,s)=>s.end('ok')).listen(process.env.PORT);`);
  const port = freePort();
  assert.match(run(d, ['app', 'start', port, '--', 'node srv.mjs']).stdout, /app: up on/);
  const kid = readPid(d, 'kid.pid');
  try {
    assert.match(run(d, ['app', 'stop']).stdout, /app: stopped/);
    assert.ok(gone(kid), 'the grandchild went with the app');
    run(d, ['app', 'start', port, '--', 'node srv.mjs']);
    g(d, 'add', '-A'); g(d, 'commit', '-qm', 'srv'); run(d, ['check']);
    assert.match(run(d, ['done']).stdout, /ship: done/);
    assert.ok(!existsSync(join(d, '.ship', 'app.json')));
  } finally { kill(kid); }
});

test('Windows: an npm start app is stopped whole, through its job; S inside the app leaves it running', { skip: !win }, () => {
  const d = started('small');
  writeFileSync(join(d, 'package.json'), JSON.stringify({ type: 'module', scripts: { start: 'node srv.mjs' } }));
  writeFileSync(join(d, 'srv.mjs'), `import {createServer} from 'node:http'; import {spawnSync} from 'node:child_process'; import {writeFileSync} from 'node:fs';
writeFileSync('srv.pid', String(process.pid));
createServer((q,s)=>{ if (q.url === '/inner') { const r = spawnSync(process.execPath, [${JSON.stringify(SHIP)}, 'app', 'stop'], { encoding: 'utf8' }); s.end(r.stdout); } else s.end('ok'); }).listen(process.env.PORT);`);
  const port = freePort();
  assert.match(run(d, ['app', 'start', port, '--', 'npm start']).stdout, /app: up on/);
  assert.match(readFileSync(join(d, '.ship', 'app.json'), 'utf8'), /"job": "Local\\\\ship-app-/);
  const srv = readPid(d, 'srv.pid');
  try {
    const inner = spawnSync(process.execPath, ['-e', `fetch('http://127.0.0.1:${port}/inner').then(r=>r.text()).then(t=>console.log(t))`], { encoding: 'utf8', timeout: 60000 }).stdout;
    assert.match(inner, /running inside that app/);
    assert.doesNotThrow(() => process.kill(srv, 0), 'the app survives a stop from inside it');
    assert.match(run(d, ['app', 'stop']).stdout, /app: stopped/);
    assert.ok(gone(srv), 'node srv.mjs, under npm and Git Bash, is gone');
  } finally { kill(srv); }
});

test('Windows: app stop never kills a pid it cannot prove is its app', { skip: !win }, () => {
  const d = started();
  const other = spawn(process.execPath, ['-e', 'setInterval(()=>{},1e3)'], { detached: true, stdio: 'ignore' }); other.unref();
  try {
    writeFileSync(join(d, '.ship', 'app.json'), JSON.stringify({ pid: other.pid, id: '1', port: 1, cmd: 'x' }));
    assert.match(run(d, ['app', 'stop']).stdout, /left alone/);
    writeFileSync(join(d, '.ship', 'app.json'), JSON.stringify({ pid: other.pid, port: 1, cmd: 'x' }));
    assert.match(run(d, ['app', 'stop']).stdout, /no recorded identity/);
    nap(300);
    assert.doesNotThrow(() => process.kill(other.pid, 0), 'the unrelated process survives');
  } finally { kill(other.pid); }
});

test('Windows: replays run in Git Bash; leftovers die with them; exit codes and $0 are kept; timeouts kill the tree', { skip: !win }, () => {
  const d = started();
  const jd = join(d, '.ship', 'journeys');
  mkdirSync(jd, { recursive: true });
  writeFileSync(join(jd, 'j1.sh'), `${nodeLeft(d, 'left.pid')} &\nsleep 1; exit 0\n`);
  writeFileSync(join(jd, 'j2.sh'), 'exit 3\n');
  writeFileSync(join(jd, 'j3.sh'), `[ "$(basename "$0")" = j3.sh ] || { echo "\\$0 is $0"; exit 7; }\n`);
  writeFileSync(join(jd, 'j4.sh'), `exec ${nodeLeft(d, 'exec.pid')}\n`);
  writeFileSync(join(jd, 'j5.sh'), `trap 'echo bye' EXIT\n( ${nodeLeft(d, 'orphan.pid')} & )\nsleep 3; exit 0\n`); // its own trap, and an orphan
  let pids = [];
  try {
    const out = run(d, ['replay'], undefined, { SHIP_REPLAY_TIMEOUT: '8000' }).stdout;
    pids = [readPid(d, 'left.pid'), readPid(d, 'exec.pid'), readPid(d, 'orphan.pid')];
    assert.match(out, /j2\.sh ✗ \(exit 3\)/, out);
    assert.doesNotMatch(out, /j1\.sh ✗|j3\.sh ✗/, out);
    assert.match(out, /j4\.sh ✗ \(exit timeout\)/, 'a replay that never exits times out');
    assert.ok(gone(pids[0]), 'the server j1 left running is gone');
    assert.ok(gone(pids[1]), 'the process j4 exec-ed into is gone');
    assert.doesNotMatch(out, /j5\.sh ✗/, out);
    assert.ok(gone(pids[2]), 'an orphan whose parent exited is still found and stopped');
  } finally { pids.forEach(kill); }
});

// --- Writing style (skills/ship/STYLE.md): ASD-STE100 sentences and words, and token caps, on every instruction file.
test('instructions follow STYLE.md: sentences of 20 words or fewer, active voice, no banned words, under the token caps', () => {
  const dir = join(dirname(SHIP), '..');
  const agents = join(dir, '..', '..', 'agents');
  const files = [join(dir, 'SKILL.md'), ...['phases', 'rules'].flatMap((s) => readdirSync(join(dir, s)).map((f) => join(dir, s, f))),
    ...['researcher', 'exerciser', 'reviewer'].map((a) => join(agents, `${a}.md`))];
  const problems = [];
  const banned = /\b(may|should|ensure|via|utilize)\b|\be\.g\.|\bi\.e\.|\betc\.|\b\w+n't\b|\b\w+'(re|ll|ve|m|d)\b|\b(it|that|there|here|what|who|let)'s\b/i;
  const passive = /\b(is|are|was|were|be|been|being)\s+(\w+ed|done|made|run|written|given|taken|seen|shown|known|kept|built|found|left|put|read|sent|told)\b/i;
  let bytes = 0;
  for (const f of files) {
    const text = readFileSync(f, 'utf8').replace(/\r/g, '');
    bytes += text.length;
    const name = f.slice(dir.length - 'ship'.length).replace(/\\/g, '/');
    const body = text.replace(/^---\n[\s\S]*?\n---\n/, '').replace(/```[\s\S]*?```/g, '');
    for (const raw of body.split('\n')) {
      if (!raw.trim() || /^\s*(\||#)/.test(raw)) continue; // tables and headings hold names, not sentences
      const line = raw.replace(/`[^`]*`/g, 'CODE').replace(/\*\*/g, '').replace(/^\s*(?:[-*]|\d+\.)\s+/, '');
      for (const s of line.split(/(?<=[.!?;:])\s+/)) {
        const n = s.split(/\s+/).filter(Boolean).length;
        if (n > 20) problems.push(`${name}: ${n} words: "${s.slice(0, 70)}…"`);
      }
      if (banned.test(line)) problems.push(`${name}: banned word "${line.match(banned)[0]}": "${line.slice(0, 70)}…"`);
      if (passive.test(line)) problems.push(`${name}: passive "${line.match(passive)[0]}": "${line.slice(0, 70)}…"`);
    }
  }
  assert.equal(problems.length, 0, `${problems.length} style problems:\n${problems.join('\n')}`);
  assert.ok(readFileSync(join(dir, 'SKILL.md'), 'utf8').length / 4 <= 5000, 'SKILL.md over 5000 tokens');
  assert.ok(bytes / 4 <= 9000, `instructions are ${Math.round(bytes / 4)} tokens, over 9000`);
});
