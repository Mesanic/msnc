#!/usr/bin/env node
// /msnc:ship state machine. All run state lives in <repo>/.ship/; the model changes it only through
// these commands, so phases, journeys, gates and caps can't drift. Node built-ins only (Windows-safe).
// Every command prints at most a few lines: this script exists to keep raw output out of context.
import { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync, readdirSync, renameSync, statSync, unlinkSync, openSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync, spawn } from 'node:child_process';
import { connect, createServer } from 'node:net';

const PHASES = ['intake', 'research', 'define', 'build', 'exercise', 'verify', 'finish'];
const MAX_STOPS = Number(process.env.SHIP_MAX_STOPS) || 40; // Stop-hook continuations per run
const STALL = 3; // identical progress fingerprints in a row → blocked
const REVIEW_CAP = 3; // failed review rounds that get a fix round; the next failure blocks
const PROBE_TIMEOUT = 100000; // under the Bash tool's 120 s default, so the restore always runs
const REPLAY_TIMEOUT = Number(process.env.SHIP_REPLAY_TIMEOUT) || 60000; // per replay script

const root = (start = process.cwd()) => {
  for (let d = start; ; d = dirname(d)) {
    if (existsSync(join(d, '.ship', 'state.json'))) return d;
    if (dirname(d) === d) return null;
  }
};
const P = (r, ...f) => join(r, '.ship', ...f);
const readJ = (f, dflt) => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return dflt; } };
// Write to a temp file, then rename: hooks and commands run concurrently, and a reader must never see a half-written file.
const writeJ = (f, v) => { mkdirSync(dirname(f), { recursive: true }); const t = `${f}.${process.pid}.tmp`; writeFileSync(t, JSON.stringify(v, null, 2) + '\n'); renameSync(t, f); };
const read = (f) => { try { return readFileSync(f, 'utf8'); } catch { return ''; } };
const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);
const today = () => new Date().toISOString().slice(0, 10);
const die = (msg) => { console.log(`ship: ${msg}`); process.exit(1); };
const need = (r) => r || die('no run here. Start one with /msnc:ship <goal>.');
const WIN = process.platform === 'win32';
// Commands the model writes are bash (Claude Code runs Git Bash on Windows), so S runs them in bash everywhere.
let bashPath;
function gitBash() {
  if (bashPath !== undefined) return bashPath;
  if (!WIN) return (bashPath = 'bash');
  const gits = (spawnSync('where', ['git'], { encoding: 'utf8', windowsHide: true }).stdout ?? '').split(/\r?\n/).filter(Boolean);
  const tries = [process.env.CLAUDE_CODE_GIT_BASH_PATH, ...gits.flatMap((g) => [join(dirname(dirname(g)), 'bin', 'bash.exe'), join(dirname(dirname(dirname(g))), 'bin', 'bash.exe')]),
    join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Git', 'bin', 'bash.exe')];
  return (bashPath = tries.find((p) => p && existsSync(p)) ?? null);
}
const shell = () => (WIN ? gitBash() ?? die('Git Bash not found: install Git for Windows or set CLAUDE_CODE_GIT_BASH_PATH.') : true);
const sh = (cmd, cwd, timeout = 600000) => spawnSync(cmd, { cwd, shell: shell(), encoding: 'utf8', timeout, maxBuffer: 64 << 20, windowsHide: true });
const git = (r, args) => spawnSync('git', args, { cwd: r, encoding: 'utf8', maxBuffer: 64 << 20, windowsHide: true }).stdout ?? '';

// Journeys hash ignores the two fields the run may change, so any other edit after `lock` shows up.
const jHash = (js) => sha(JSON.stringify(js.map(({ passes, evidence, ...rest }) => rest)));

// Sandboxed sessions mount stub files (untracked character devices such as .bashrc, .mcp.json) that aren't the user's.
const isStub = (r, f) => { try { return statSync(join(r, f)).isCharacterDevice(); } catch { return false; } };
function dirty(r) {
  return git(r, ['status', '--porcelain', '-z', '-uall']).split('\0').filter(Boolean)
    .filter((e) => !(e.startsWith('?? ') && isStub(r, e.slice(3))));
}

// The code as it stands: its content difference from the run's base commit, plus untracked files (with mtimes).
// Content, not HEAD, so committing checked code doesn't invalidate the check. `.ship/` is excluded from git.
const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
const NOT_CODE = [':(exclude)docs/decisions.md', ':(exclude)docs/solutions']; // run logs written after checks
function codeFp(r) {
  const untracked = git(r, ['ls-files', '--others', '--exclude-standard', '-z', '--', '.', ...NOT_CODE]).split('\0').filter((f) => f && !isStub(r, f))
    .map((f) => { try { return `${f}:${statSync(join(r, f)).mtimeMs}`; } catch { return f; } }).join('|');
  return sha([git(r, ['diff', state(r).base || EMPTY_TREE, '--', '.', ...NOT_CODE]), untracked].join('\n'));
}
// Run artifacts the model writes (spec, research, journeys, decisions), not the state file the hook itself writes.
function shipFp(r) {
  const files = [];
  const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) { if (e.name !== 'runs') walk(p); } else if (e.name !== 'state.json') files.push(`${p}:${statSync(p).mtimeMs}:${statSync(p).size}`);
  } };
  try { walk(P(r)); } catch { /* none */ }
  return sha(files.sort().join('|'));
}

function detectChecks(r) {
  const checks = [];
  const pkg = readJ(join(r, 'package.json'), null);
  if (pkg?.scripts) {
    for (const name of ['typecheck', 'lint', 'build', 'test']) if (pkg.scripts[name]) checks.push({ name, cmd: `npm run ${name} --silent` });
    if (!pkg.scripts.typecheck && existsSync(join(r, 'tsconfig.json'))) checks.unshift({ name: 'typecheck', cmd: 'npx --no-install tsc --noEmit' });
  }
  if (existsSync(join(r, 'pyproject.toml'))) {
    const py = read(join(r, 'pyproject.toml'));
    if (/ruff/.test(py)) checks.push({ name: 'lint', cmd: 'ruff check .' });
    if (/pytest/.test(py)) checks.push({ name: 'test', cmd: 'pytest -q' });
  }
  if (!checks.length && /^test:/m.test(read(join(r, 'Makefile')))) checks.push({ name: 'test', cmd: 'make test' });
  return checks;
}

const journeys = (r) => readJ(P(r, 'journeys.json'), []);
const replays = (r) => { try { return readdirSync(P(r, 'journeys')).filter((f) => f.endsWith('.sh')).sort(); } catch { return []; } };
// The code plus every file under .ship/journeys/ (replays and their helpers), so editing a replay re-opens the gate.
const replayFp = (r) => { let fs = []; try { fs = readdirSync(P(r, 'journeys')).sort(); } catch { /* none */ } return sha([codeFp(r), ...fs.map((f) => `${f}:${read(P(r, 'journeys', f))}`)].join('\n')); };
const state = (r) => readJ(P(r, 'state.json'), {});
const save = (r, patch) => writeJ(P(r, 'state.json'), { ...state(r), ...patch });
const log = (r, line) => appendFileSync(P(r, 'progress.md'), `- ${new Date().toISOString().slice(0, 16)} ${line}\n`);

// A run whose app served HTML must leave a clean axe scan: every saved axe.run() result free of serious/critical violations.
function a11yGap(r) {
  if (!state(r).ui) return null;
  const ev = P(r, 'evidence');
  const files = existsSync(ev) ? readdirSync(ev).filter((f) => /a11y|axe/i.test(f) && f.endsWith('.json')) : [];
  if (!files.length) return 'an axe scan of each page saved as .ship/evidence/a11y-<page>.json (exercise.md step 4)';
  const results = files.map((f) => [f, [readJ(join(ev, f), null)].flat()]); // one axe.run() result, or an array of them
  const broken = results.filter(([, rs]) => !rs.length || rs.some((x) => !Array.isArray(x?.violations))).map(([f]) => `${f}: not an axe.run() result`);
  if (broken.length) return `a completed axe scan (rescan, or S block if axe can't load): ${broken.join('; ')}`;
  const bad = results.flatMap(([f, rs]) => {
    const ids = rs.flatMap((x) => x.violations).filter((v) => ['serious', 'critical'].includes(v?.impact)).map((v) => v.id);
    return ids.length ? [`${f}: ${ids.join(', ')}`] : [];
  });
  return bad.length ? `no serious/critical axe violations, pre-existing included (fix, then rescan): ${bad.join('; ')}` : null;
}

// A probe that SURVIVED is a weak test. It is resolved only by a later KILLED under the same test command in the same
// file, of the same break (exact text and replacement) or of a break declared `--for <n>` (the code it broke has moved),
// or by a later `test.*` decision "deleted #<n>" naming its probe number.
function weakTests(r) {
  const lines = read(P(r, 'probes.log')).split('\n').filter(Boolean).map((l, i) => {
    const m = /^(\S+) (\w+) (.*?) :: (.*?)(?: :: m=(\w+))?(?: :: for=(\d+))?$/.exec(l);
    return m && { n: i + 1, ts: m[1], v: m[2], file: m[3], cmd: m[4], mut: m[5] ?? '', for: Number(m[6] ?? 0) };
  }).filter(Boolean);
  const dels = read(P(r, 'decisions.jsonl')).split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return {}; } })
    .filter((d) => /^test\./.test(d.point ?? '') && /^delet/i.test(d.choice ?? ''));
  return lines.filter((x) => x.v === 'SURVIVED'
    && !lines.some((y) => y.v === 'KILLED' && y.file === x.file && y.cmd === x.cmd && y.ts > x.ts && (y.mut === x.mut || y.for === x.n))
    && !dels.some((d) => d.ts > x.ts && new RegExp(`#${x.n}(?!\\d)`).test(d.choice)))
    .map((x) => `#${x.n} ${x.file} :: ${x.cmd}`);
}

// What `done` still needs, given the current code. Empty list = done is allowed.
function missing(r) {
  const s = state(r);
  const js = journeys(r);
  const fp = codeFp(r);
  const out = [];
  if (s.lock && s.lock !== jHash(js)) out.push('journeys changed after lock (S restore)');
  const gap = msncGap(r, { atDone: true });
  if (gap) out.push(gap);
  if (inlineBuild(r)) out.push(inlineBuild(r));
  if (weakTests(r).length) out.push(`survived probes resolved: strengthen the test and re-run the same probe until KILLED, or delete it and log S decide test.<name> "deleted #<n> <file>" (${weakTests(r).join('; ')})`);
  const a11y = a11yGap(r);
  if (a11y) out.push(a11y);
  if (js.some((j) => !j.passes)) out.push(`journeys failing: ${js.filter((j) => !j.passes).map((j) => j.id).join(', ')}`);
  if (s.check?.fp !== fp) out.push('a green S check on the current code');
  if (replays(r).length && s.replay?.fp !== replayFp(r)) out.push('green replays on a fresh server for the current code (S replay)');
  // Small runs skip review only for trivial work: no probed tests and at most one journey.
  const trivial = s.size === 'small' && !existsSync(P(r, 'probes.log')) && js.length <= 1;
  if (!trivial && s.review?.fp !== fp) out.push('a reviewer pass on the current code (S review pass)');
  const changed = dirty(r);
  if (changed.length) out.push(`uncommitted changes (commit them, docs/decisions.md included): ${changed.slice(0, 5).map((e) => e.slice(3)).join(', ')}`);
  return out;
}

// MSNC's tracker (docs/agents/issue-tracker.md; local Markdown under .scratch/ by default): the features already
// grilled, specced or ticketed, so a run continues from the furthest point instead of redoing it.
const trackerKind = (r) => (/^#\s*Issue tracker:\s*(.+)$/mi.exec(read(join(r, 'docs', 'agents', 'issue-tracker.md')))?.[1].trim() ?? 'Local Markdown');
const localTracker = (r) => /local|markdown/i.test(trackerKind(r));
// `**Status:** done`, as MSNC writes it; plain `Status: done` and list or backtick forms count too.
const STATUS = /^[\s*_>-]*Status[*_]*\s*:[*_]*\s*`?([\w-]+)/mi;
function feature(r, slug) {
  const d = join(r, '.scratch', slug);
  let issues = []; try { issues = readdirSync(join(d, 'issues')).filter((f) => /^\d+-.*\.md$/.test(f)).sort(); } catch { /* none */ }
  const st = issues.map((f) => STATUS.exec(read(join(d, 'issues', f)))?.[1].toLowerCase() ?? 'unknown');
  const done = st.filter((x) => x === 'done').length, human = st.filter((x) => x === 'ready-for-human').length;
  const spec = existsSync(join(d, 'spec.md')) ? `.scratch/${slug}/spec.md` : null;
  const next = !issues.length ? (spec ? 'define step 3 (spec done: journeys, then tickets)' : 'define') : done + human < issues.length ? 'define step 3 (journeys), then build' : 'define step 3 (journeys), then exercise';
  return { slug, spec, tickets: issues.length, done, human, next, open: issues.filter((f, i) => !['done', 'ready-for-human'].includes(st[i])), humanFiles: issues.filter((f, i) => st[i] === 'ready-for-human') };
}
// Medium and large tickets are built by msnc:implementer subagents (build.md); the SubagentStart hook counts them.
// Unsized counts as not small: the MSNC gates fail closed.
const msncRun = (s) => s.size !== 'small';
const implementers = (s) => s.agents?.['msnc:implementer'] ?? 0;
function inlineBuild(r) {
  const s = state(r);
  if (!msncRun(s) || !s.feature) return null;
  if (!localTracker(r)) return s.built && !implementers(s) ? 'tickets built without an msnc:implementer subagent (build.md step 2)' : null;
  const built = feature(r, s.feature).done - (s.doneAtBind ?? 0);
  return built > implementers(s) ? `${built} ticket(s) done in this run but ${implementers(s)} msnc:implementer subagent(s) started: one per ticket (build.md step 2)` : null;
}
// An autonomous run's grill is answered by a blind msnc:respondent, not by the orchestrator (define.md step 1).
// A spec at bind skipped the grill; a logged define.grill decision says the frontier was empty.
function grillGap(r) {
  const s = state(r);
  if (s.grillBy !== 'respondent' || s.specAtBind || (s.agents?.['msnc:respondent'] ?? 0) > 0) return null;
  const logged = read(P(r, 'decisions.jsonl')).split('\n').some((l) => { try { return JSON.parse(l).point === 'define.grill'; } catch { return false; } });
  return logged ? null : 'the grill answered by an msnc:respondent, or S decide define.grill when the frontier is empty (define.md step 1)';
}
// What medium and large runs owe MSNC's cycle before build, and again at done.
function msncGap(r, { atDone } = {}) {
  const s = state(r);
  if (!msncRun(s)) return null;
  if (!s.size) return 'the run sized first (S size)';
  if (!s.feature) return 'the feature bound first: S intake, then S feature <slug> (define.md step 0)';
  if (!existsSync(join(r, s.spec))) return `the spec at ${s.spec} (define.md step 2)`;
  if (!localTracker(r)) return null;
  const f = feature(r, s.feature);
  if (!f.tickets) return `tickets in .scratch/${s.feature}/issues/ (define.md step 5)`;
  const prefix = git(r, ['rev-parse', '--show-prefix']).trim();
  const unsaved = dirty(r).map((e) => e.slice(3)).filter((x) => x.startsWith(`${prefix}.scratch/${s.feature}/`));
  if (unsaved.length) return `the spec and tickets committed: ${unsaved.slice(0, 5).join(', ')}`;
  const atBase = (x) => s.base && spawnSync('git', ['cat-file', '-e', `${s.base}:${prefix}.scratch/${s.feature}/issues/${x}`], { cwd: r, windowsHide: true }).status === 0;
  const hitl = f.humanFiles.filter((x) => !atBase(x))
    .filter((x) => !readJ(P(r, 'questions.json'), []).some((q) => q.q.includes(x)));
  if (hitl.length) return `each new ready-for-human ticket put to the user with S ask, naming its file: ${hitl.join(', ')}`;
  if (atDone && f.open.length) return `every agent ticket marked **Status:** done in its commit (implement step 7). Open: ${f.open.join(', ')}`;
  return null;
}
const features = (r) => { try { return readdirSync(join(r, '.scratch'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => feature(r, e.name)); } catch { return []; } };

function status(r) {
  const s = state(r);
  const js = journeys(r);
  const open = readJ(P(r, 'questions.json'), []).filter((q) => !q.answer);
  const tampered = s.lock && s.lock !== jHash(js) ? ' · JOURNEYS CHANGED AFTER LOCK' : '';
  // Only fields that carry news: zero counts and default paths are left out, because the model reads this line often.
  const f = [`ship: ${s.status} · phase ${s.phase} · size ${s.size ?? '?'} · journeys ${js.filter((j) => j.passes).length}/${js.length} pass`];
  if (open.length) f.push(`questions ${open.length} open${open.some((q) => q.blocking) ? ' (blocking)' : ''}`);
  if (s.stops) f.push(`stops ${s.stops}/${MAX_STOPS}`);
  if (s.reviewFails) f.push(`review fails ${s.reviewFails}/${REVIEW_CAP}`);
  if (s.feature) f.push(`feature ${s.feature}${s.spec !== `.scratch/${s.feature}/spec.md` ? ` (spec ${s.spec})` : ''}`);
  if (s.reason) f.push(s.reason);
  return f.join(' · ') + tampered;
}

// Resuming a run the review cap blocked restores its fix rounds; any other resume keeps the count.
const capReset = (r) => (state(r).status === 'blocked' && state(r).reason?.startsWith('review cap') ? 0 : state(r).reviewFails);
function flag(args, name) { const i = args.indexOf(`--${name}`); if (i < 0) return undefined; const v = args[i + 1]; args.splice(i, 2); return v; }

function decide(r, [point, choice, why, undo, ...rest], extra = {}) {
  if (!point || !choice || !why || !undo) die('usage: decide <phase.topic> "<choice>" "<why>" "<undo>" [--options "a|b"] [--by user|respondent [--rec "<your recommendation>"]]');
  const options = flag(rest, 'options');
  const by = flag(rest, 'by');
  const rec = flag(rest, 'rec');
  if (by && !['user', 'respondent'].includes(by)) die('--by takes "user" (a decision the user made, such as a one-way door the goal asked for) or "respondent" (an msnc:respondent grill answer).');
  if (rec && by !== 'respondent') die('--rec goes with --by respondent: your recommendation, written before the respondent answered.');
  // JSONL keeps a stable, machine-readable record: it doubles as training data for a separate decider (PiLaya/Laya).
  appendFileSync(P(r, 'decisions.jsonl'), JSON.stringify({ ts: new Date().toISOString(), phase: state(r).phase, point, choice,
    options: options ? options.split('|') : undefined, why, undo, by: by ?? 'claude', rec, agreed: rec === undefined ? undefined : rec.trim() === choice.trim(), ...extra }) + '\n');
  mkdirSync(join(r, 'docs'), { recursive: true });
  const who = by === 'respondent' ? ` · by respondent${rec !== undefined && rec.trim() !== choice.trim() ? ` (overrode: ${rec})` : ''}` : '';
  appendFileSync(join(r, 'docs', 'decisions.md'), `- ${today()} · ${point}: ${choice} · ${why} · undo: ${undo}${who}\n`);
  console.log(`ship: logged ${point} = ${choice}`);
}

// A probe interrupted by a timeout or kill leaves .ship/probe.bak.json; every command restores it first.
function restoreProbe(r) {
  const bak = r && readJ(P(r, 'probe.bak.json'), null);
  if (!bak) return;
  writeFileSync(join(r, bak.file), bak.content);
  unlinkSync(P(r, 'probe.bak.json'));
  console.error(`ship: restored ${bak.file} from an interrupted probe`); // stderr: hook stdout must stay JSON
}

// Break one spot, run one test command, always restore. KILLED = the test guards that behavior.
function probe(r, args) {
  const forN = flag(args, 'for'); // the survivor this re-probe answers, after the code it broke has moved
  if (forN !== undefined && !/^\d+$/.test(forN)) die('--for takes the number of a SURVIVED probe.');
  const sep = args.indexOf('--');
  const [file, find, replace] = args.slice(0, sep);
  const cmd = args.slice(sep + 1).join(' ');
  if (sep < 0 || !file || !find || replace === undefined || !cmd) die('usage: probe [--for <n>] <file> "<exact text>" "<broken text>" -- "<test command>"');
  if (!existsSync(join(r, file))) die(`probe: ${file} not found (paths are relative to ${r}).`);
  const original = readFileSync(join(r, file), 'utf8');
  const hits = original.split(find).length - 1;
  if (hits !== 1) die(`probe: the text occurs ${hits} times in ${file}; give text that occurs once.`);
  const base = sh(cmd, r, PROBE_TIMEOUT);
  if (base.status !== 0) die(`probe: ERROR, the test command fails before any break (exit ${base.status ?? 'timeout'}). Fix the command first.`);
  writeJ(P(r, 'probe.bak.json'), { file, content: original });
  let res;
  const restore = () => { writeFileSync(join(r, file), original); try { unlinkSync(P(r, 'probe.bak.json')); } catch { /* gone */ } };
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { restore(); process.exit(130); });
  try { writeFileSync(join(r, file), original.replace(find, () => replace)); res = sh(cmd, r, PROBE_TIMEOUT); } finally { restore(); }
  const verdict = res.status === null ? 'ERROR: the test timed out or was killed with the break in place; no verdict.'
    : res.status === 0 ? `SURVIVED: the test passes with the behavior broken. Strengthen it, then probe the same behavior again with --for ${read(P(r, 'probes.log')).split('\n').filter(Boolean).length + 1}, or delete it.`
    : `KILLED (exit ${res.status})`;
  const n = read(P(r, 'probes.log')).split('\n').filter(Boolean).length + 1;
  appendFileSync(P(r, 'probes.log'), `${new Date().toISOString()} ${verdict.split(/[ :]/)[0]} ${file} :: ${cmd} :: m=${sha(`${find}\0${replace}`)}${forN ? ` :: for=${forN}` : ''}\n`);
  console.log(`probe #${n}: ${verdict}`);
}

function check(r) {
  let checks = readJ(P(r, 'checks.json'), null);
  if (!checks?.length && (checks = detectChecks(r)).length) writeJ(P(r, 'checks.json'), checks); // the repo may have gained them since init
  if (!checks.length) die('no checks configured or detected (package.json scripts, pyproject.toml, Makefile test:). Write .ship/checks.json as [{"name":"test","cmd":"..."}] (decide it, log it).');
  const done = [];
  const t0 = Date.now();
  for (const { name, cmd } of checks) {
    const res = sh(cmd, r);
    const out = `${res.stdout ?? ''}${res.stderr ?? ''}`;
    mkdirSync(P(r, 'logs'), { recursive: true });
    writeFileSync(P(r, 'logs', `${name}.log`), out);
    if (res.status !== 0) {
      const lines = out.split(/\r?\n/).filter(Boolean);
      const hot = lines.filter((l) => /error|fail|✗|✖|expected|assert|exception|traceback|not ok/i.test(l));
      console.log(`check: ${done.map((n) => `${n} ✓`).join(' ')} ${name} ✗ (exit ${res.status ?? 'timeout'}) · full log .ship/logs/${name}.log`.replace(/\s+/g, ' '));
      console.log((hot.length ? hot.slice(0, 8) : lines.slice(-8)).map((l) => `  ${l.slice(0, 200)}`).join('\n'));
      save(r, { check: { ok: false } });
      log(r, `check ${name} failed`);
      process.exit(1);
    }
    done.push(name);
  }
  save(r, { check: { ok: true, fp: codeFp(r) } });
  console.log(`check: ${done.map((n) => `${n} ✓`).join(' ')} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

// The cheapest browser driver already installed (exercise.md rows 1–2): a CLI on PATH, else a Playwright library
// (repo, .ship/tools, global npm root) proven by launching Chromium. One call instead of several turns of searching.
function driver(r) {
  const dirs = [join(r, 'node_modules'), P(r, 'tools', 'node_modules'), sh('npm root -g', r, 15000).stdout?.trim()].filter(Boolean);
  const found = (m) => dirs.map((d) => join(d, m)).filter((p) => existsSync(p));
  const cli = ['playwright-cli', 'agent-browser'].find((b) => (WIN ? spawnSync('where', [b], { windowsHide: true }) : sh(`command -v ${b}`, r, 5000)).status === 0);
  const libs = cli ? [] : found('playwright');
  const lib = libs.find((l) => spawnSync(process.execPath, ['-e', 'require(process.argv[1]).chromium.launch().then((b) => b.close()).then(() => console.log("launched"))', l], { encoding: 'utf8', timeout: 30000, windowsHide: true }).stdout?.split(/\r?\n/).includes('launched'));
  const pick = cli ? `${cli} (CLI on PATH)` : lib ? `Playwright library ${lib}` : null;
  const axe = found(join('axe-core', 'axe.min.js'))[0];
  if (pick && !read(P(r, 'decisions.jsonl')).includes(JSON.stringify(pick))) decide(r, ['build.driver', pick, 'cheapest browser driver already installed (S driver)', 'the next row of the exercise.md driver table']);
  console.log(`${pick ? `driver: ${pick}` : `driver: no installed browser driver works${libs.length ? ` (${libs.join(', ')} can't launch Chromium)` : ''}. Next: npx -y @playwright/cli, then exercise.md row 4`}`
    + ` · axe: ${axe ?? 'not installed · npm i --prefix .ship/tools axe-core'}`);
  if (!pick) process.exitCode = 1;
}

// The app under test: one detached process group, so stop kills the server and anything it spawned.
const portUp = (port) => new Promise((ok) => { const s = connect(Number(port), '127.0.0.1'); s.once('connect', () => { s.destroy(); ok(true); }); s.once('error', () => ok(false)); });
// rec: the record file. The exercise server is app.json; S replay's own server is replay-app.json, so a concurrent
// `S app stop` (a worker finishing late) can never take down the server a replay is using.
async function appStart(r, port, cmd, rec = 'app.json') {
  if (!port || !cmd) die('usage: app start <port> -- "<start command>"');
  // S replay reruns this command on a port it picks, so a literal port in it can never replay.
  if (new RegExp(`(^|[^\\w.])0*${Number(port)}([^\\w.]|$)`).test(cmd) || /\bPORT=\d/.test(cmd)) die(`the start command hard-codes the port: ${cmd}\nDrop it (S sets PORT) or write $PORT where the app needs it.`);
  if (await portUp(port)) die(`port ${port} is already in use. Run S app stop, or pick another port.`);
  mkdirSync(P(r, 'logs'), { recursive: true });
  const fd = openSync(P(r, 'logs', 'app.log'), 'a');
  // detached: its own group on POSIX; on Windows, out of Node's kill-on-exit job, so the app outlives this command.
  let job;
  if (WIN) job = await winAppStart(r, cmd, port, fd);
  const child = job?.child ?? spawn(cmd, { cwd: r, shell: shell(), detached: true, windowsHide: true, stdio: ['ignore', fd, fd], env: { ...process.env, PORT: String(port) } });
  child.unref();
  writeJ(P(r, rec), { pid: child.pid, id: identity(child.pid), port: Number(port), cmd, job: job?.name });
  save(r, { appCmd: cmd });
  for (let i = 0; i < 60; i++) { if (await portUp(port)) {
    const html = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(3000) }).then((res) => res.ok && /html/.test(res.headers.get('content-type') ?? ''), () => false);
    if (html) save(r, { ui: true });
    console.log(`app: up on http://localhost:${port} (pid ${child.pid}) · log .ship/logs/app.log${html ? ' · web UI: S done needs a clean axe scan' : ''}`); return; } await new Promise((w) => setTimeout(w, 500)); }
  appStop(r, false, rec);
  die(`app: nothing listening on ${port} after 30s. Last log lines:\n${read(P(r, 'logs', 'app.log')).split('\n').slice(-6).join('\n')}`);
}
// Windows: the app's shell prints its Windows pid and waits; S puts it in a named job, then lets the command run.
// Everything the app starts is then in the job, even when Git Bash's fork and exec leave no parent chain to walk.
async function winAppStart(r, cmd, port, fd) {
  const wrap = P(r, 'logs', 'app-wrap.sh'), pidFile = P(r, 'logs', `app-${process.pid}.winpid`);
  writeFileSync(wrap, 'cat /proc/$$/winpid > "$SHIP_PIDFILE"\nread -r _\nexec </dev/null\neval "$SHIP_CMD"\n');
  const child = spawn(gitBash() ?? die('Git Bash not found: install Git for Windows or set CLAUDE_CODE_GIT_BASH_PATH.'), [wrap.replace(/\\/g, '/')],
    { cwd: r, detached: true, windowsHide: true, stdio: ['pipe', fd, fd], env: { ...process.env, PORT: String(port), SHIP_CMD: cmd, SHIP_PIDFILE: pidFile.replace(/\\/g, '/') } });
  let w = '';
  for (let i = 0; i < 100 && !(w = read(pidFile).trim()); i++) await new Promise((ok) => setTimeout(ok, 100));
  try { unlinkSync(pidFile); } catch { /* none */ }
  const name = `Local\\ship-app-${sha(r)}-${child.pid}`;
  const ok = /^\d+$/.test(w) && /^ok$/m.test(ps1(psJob(w, child.pid, { name, wait: false })));
  child.stdin.end('go\n');
  return { child, name: ok ? name : undefined };
}

// A process's start identity, so a reused pid is never mistaken for ours: Linux start ticks, macOS/BSD lstart,
// Windows start time. null = no such process (or it can't be read).
const ps1 = (script) => spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { encoding: 'utf8', windowsHide: true, timeout: 60000 }).stdout?.trim() ?? '';
function identity(pid) {
  if (process.platform === 'linux') { const st = read(`/proc/${pid}/stat`); return st ? st.slice(st.lastIndexOf(')') + 2).split(' ')[19] : null; }
  const out = WIN
    ? ps1(`try { [Diagnostics.Process]::GetProcessById(${Number(pid)}).StartTime.ToUniversalTime().Ticks } catch {}`)
    : spawnSync('ps', ['-o', 'lstart=', '-p', String(pid)], { encoding: 'utf8', env: { ...process.env, TZ: 'UTC', LC_ALL: 'C' } }).stdout;
  return out?.trim() || null;
}
// Windows has no process groups. Kill a tree only from a root that is provably S's: alive with the start time S
// recorded (`id`, digits only), or a child whose handle S still holds (`held`: its pid can't be reused). A descendant
// counts only if it started after its parent (an older process naming a reused pid as parent is not ours). `seen` adds
// processes an earlier walk found while their ancestors were alive (orphans now). Every kill goes through one opened
// handle whose start time is re-checked, so a pid reused since is never hit.
// Prints "killed <n>", gone or notours; anything else (PowerShell failed) means nothing was proven or done.
const WIN_TOL = 10000; // 1 ms in 100 ns ticks: WMI keeps microseconds, the process handle keeps ticks
const psWalk = (pid, id, held) => `$ErrorActionPreference='SilentlyContinue'
$all=@(Get-CimInstance Win32_Process | % { [pscustomobject]@{id=[int]$_.ProcessId;pp=[int]$_.ParentProcessId;t=$(if ($_.CreationDate) { $_.CreationDate.ToUniversalTime().Ticks } else { 0 })} })
$r=$all | ? { $_.id -eq ${Number(pid)} } | select -First 1
$todo=New-Object Collections.ArrayList
if ($r -and ${held ? '$true' : `[math]::Abs($r.t - ${id}) -le ${WIN_TOL}`}) {
  $q=New-Object Collections.Queue; $q.Enqueue($r); [void]$todo.Add($r)
  while ($q.Count) { $p=$q.Dequeue(); foreach ($c in $all) { if ($c.pp -eq $p.id -and $c.id -ne $p.id -and $c.t -ge $p.t) { [void]$todo.Add($c); $q.Enqueue($c) } } }
}
$state=$(if (-not $r) { 'gone' } elseif (-not $todo.Count) { 'notours' } else { 'ours' })`;
function winReap(pid, id, held = false, seen = []) {
  const valid = held || /^\d+$/.test(String(id ?? ''));
  if (!valid && !seen.length) return 'notours';
  return ps1(`${valid ? psWalk(pid, id, held) : "$todo=New-Object Collections.ArrayList; $state='notours'"}
foreach ($s in @(${seen.map((x) => `@{id=${Number(x.id)};t=${Number(x.t)}}`).join(',')})) { [void]$todo.Add([pscustomobject]$s) }
if (-not $todo.Count) { $state; exit }
$n=0; foreach ($c in $todo) { try { $h=[Diagnostics.Process]::GetProcessById($c.id); $null=$h.Handle; if ([math]::Abs($h.StartTime.ToUniversalTime().Ticks - $c.t) -le ${WIN_TOL}) { $h.Kill(); $n++ } } catch {} }
"killed $n"`);
}
// The current tree under a held root, as [{id,t}], without killing anything (async: replays keep running meanwhile).
const winSeen = (pid) => new Promise((ok) => {
  const p = spawn('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(`${psWalk(pid, null, true)}\n@($todo | select id,t) | ConvertTo-Json -Compress`, 'utf16le').toString('base64')], { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
  let o = ''; p.stdout.on('data', (d) => { o += d; });
  p.on('close', () => { try { ok([JSON.parse(o || '[]')].flat().filter((x) => x && x.id && x.id !== pid)); } catch { ok([]); } });
});
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
// S's own process group; NaN when ps is missing (slim images without procps), which counts as "can't prove it's safe".
const ownGroup = () => WIN ? null : Number(spawnSync('ps', ['-o', 'pgid=', '-p', String(process.pid)], { encoding: 'utf8' }).stdout?.trim() || NaN);
const hasMembers = (pgid) => spawnSync('pgrep', ['-g', String(pgid)], { encoding: 'utf8' }).status === 0;
// Signal the app's process group only when it is provably S's: its leader is alive with the identity recorded at start,
// or the leader is gone but the group still has members (a group id can't be reused while the group exists).
// Never the group S itself runs in. Anything else is left alone and reported.
function appStop(r, quiet, rec = 'app.json') {
  const app = readJ(P(r, rec), null);
  if (!app) { if (!quiet) console.log('app: not running'); return; }
  const leaderOurs = !WIN && alive(app.pid) && app.id && identity(app.pid) === app.id;
  let note = 'stopped';
  if (WIN && app.job) {
    const res = ps1(psStopJob(app.job));
    if (res === 'self') { if (!quiet) console.log(`app: not stopped: S is running inside that app (pid ${app.pid})`); return; }
    if (!/^(killed|gone)/.test(res)) { if (!quiet) console.log(`app: not stopped: PowerShell couldn't end the app's job; the record is kept, so run S app stop again`); return; }
    if (res === 'gone') note = 'already gone';
  } else if (WIN) {
    if (!/^\d+$/.test(String(app.id ?? ''))) { if (!quiet) console.log(`app: not stopped: ${app.pid} has no recorded identity, so S can't prove it's the app (stop it yourself if it is)`); return; }
    const res = winReap(app.pid, app.id);
    if (!/^(killed|gone|notours)/.test(res)) { if (!quiet) console.log(`app: not stopped: PowerShell couldn't check pid ${app.pid}; the record is kept, so run S app stop again`); return; }
    if (!res.startsWith('killed')) note = 'already gone (pid not ours now; left alone)';
  } else if (!app.id) { if (!quiet) console.log(`app: not stopped: ${app.pid} has no recorded identity, so S can't prove it's the app (stop it yourself if it is)`); return; }
  else if (!(ownGroup() !== app.pid && Number.isFinite(ownGroup()))) { if (!quiet) console.log(`app: not stopped: S may be running inside that app (pid ${app.pid})`); return; } // keep app.json: a later stop from outside still works
  else if (leaderOurs || (!alive(app.pid) && hasMembers(app.pid))) { try { process.kill(-app.pid, 'SIGTERM'); } catch { /* group gone */ } }
  else note = 'already gone (pid not ours now; left alone)';
  try { unlinkSync(P(r, rec)); } catch { /* gone */ }
  if (!quiet) console.log(`app: ${note} (pid ${app.pid})`);
}

const stopAll = (r) => { appStop(r, true); appStop(r, true, 'replay-app.json'); };

// One replay in its own process group: the EXIT trap kills the group while bash, its leader, is still alive, so whatever
// the replay started is provably S's and goes with it. On timeout S kills the group while the leader is still running.
function runReplay(file, cwd, env) {
  return WIN ? runReplayWin(file, cwd, env) : new Promise((ok) => {
    const win = false;
    const child = spawn('bash', ['-c', 'trap \'c=$?; trap "" TERM; kill 0 2>/dev/null; exit $c\' EXIT; . "$0"', file], { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', timedOut = false, settled = false;
    child.stdout.on('data', (d) => { out += d; }); child.stderr.on('data', (d) => { out += d; });
    // Anything still in the replay's own group is provably S's (a group id can't be reused while the group exists).
    const sweep = () => { if (!win && hasMembers(child.pid)) { try { process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ } } };
    const finish = (code) => { if (settled) return; settled = true; clearTimeout(t); child.stdout.destroy(); child.stderr.destroy(); ok({ status: timedOut ? null : code, out }); };
    const t = setTimeout(() => {
      timedOut = true;
      if (win) { if (child.exitCode === null) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F']); } else if (child.exitCode === null) { try { process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ } } else sweep();
      setTimeout(() => finish(null), 2000); // a process outside the group may still hold the pipes: don't wait on it
    }, REPLAY_TIMEOUT);
    child.on('exit', (code) => { sweep(); setTimeout(() => finish(code), 300); }); // leftovers that ignored TERM or replaced the trap
    child.on('close', (code) => finish(code ?? child.exitCode));
  });
}

// Windows: no groups and no `kill 0` for native processes, so each replay runs inside a Job Object. The wrapper bash
// prints its Windows pid and waits; a PowerShell helper checks that pid is the child of the launcher S holds, puts it in
// a job that kills every member when closed, and S then lets the replay start. Everything the replay starts, orphans
// included, is in the job by construction. The replay runs in a subshell, so its own traps, exec and redirections
// can't touch the wrapper, which prints the exit code and waits until S closes the job. If the job can't be made, S
// falls back to walking the tree it can prove (held root, plus processes seen while their parents lived).
const JOB_DLL = join(process.env.LOCALAPPDATA ?? process.env.TEMP ?? '.', 'ship', 'shipjob-3.dll'); // compiled once, then loaded
const psJobLib = `$ErrorActionPreference='Stop'
$dll = '${JOB_DLL.replace(/'/g, "''")}'
if (Test-Path $dll) { Add-Type -Path $dll } else {
$src = @'
using System; using System.Runtime.InteropServices;
public static class ShipJob {
  [DllImport("kernel32.dll", SetLastError=true, CharSet=CharSet.Unicode)] public static extern IntPtr CreateJobObject(IntPtr a, string n);
  [DllImport("kernel32.dll", SetLastError=true, CharSet=CharSet.Unicode)] public static extern IntPtr OpenJobObject(uint access, bool inherit, string n);
  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool SetInformationJobObject(IntPtr j, int c, ref Ext i, uint l);
  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool AssignProcessToJobObject(IntPtr j, IntPtr p);
  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool TerminateJobObject(IntPtr j, uint c);
  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool IsProcessInJob(IntPtr p, IntPtr j, out bool r);
  [DllImport("kernel32.dll")] public static extern IntPtr GetCurrentProcess();
  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool DuplicateHandle(IntPtr sp, IntPtr h, IntPtr tp, out IntPtr th, uint a, bool i, uint o);
  [StructLayout(LayoutKind.Sequential)] public struct Ext { public long a, b; public uint LimitFlags; public UIntPtr c, d; public uint e; public UIntPtr f; public uint g, h; public ulong i1, i2, i3, i4, i5, i6; public UIntPtr m1, m2, m3, m4; }
}
'@
$tmp = "$dll.$PID.tmp"
try { New-Item -ItemType Directory -Force (Split-Path $dll) | Out-Null; Add-Type -TypeDefinition $src -OutputAssembly $tmp; Move-Item $tmp $dll -Force; Add-Type -Path $dll } catch { Add-Type -TypeDefinition $src }
}`;
// Put `pid` (a shell that waits for S) into a new job. Only a direct child of `root`, a process S still holds, qualifies.
// A replay's job kills its members when this helper ends (wait). An app's job is named, and the app's own shell gets a
// handle to it: a name lives only while a handle is open, so it lives while the app does. `S app stop` ends it by name.
const psJob = (pid, root, { name, wait } = { wait: true }) => `${psJobLib}
try {
$w = Get-CimInstance Win32_Process -Filter "ProcessId=${Number(pid)}"
$l = Get-CimInstance Win32_Process -Filter "ProcessId=${Number(root)}"
if (-not $w -or -not $l -or (${Number(pid)} -ne ${Number(root)} -and ($w.ParentProcessId -ne ${Number(root)} -or $w.CreationDate -lt $l.CreationDate))) { 'fail: not the shell S started'; exit }
$h = [Diagnostics.Process]::GetProcessById(${Number(pid)}); $null = $h.Handle
$job = [ShipJob]::CreateJobObject([IntPtr]::Zero, ${name ? `'${name}'` : '$null'})
if ($job -eq [IntPtr]::Zero) { 'fail: create job'; exit }
${wait ? `$x = New-Object ShipJob+Ext; $x.LimitFlags = 0x2000
if (-not [ShipJob]::SetInformationJobObject($job, 9, [ref]$x, [Runtime.InteropServices.Marshal]::SizeOf($x))) { 'fail: job limits'; exit }` : ''}
if (-not [ShipJob]::AssignProcessToJobObject($job, $h.Handle)) { 'fail: assign'; exit }
${name ? `$held = [IntPtr]::Zero
if (-not [ShipJob]::DuplicateHandle([ShipJob]::GetCurrentProcess(), $job, $h.Handle, [ref]$held, 0, $false, 2)) { 'fail: hand the job to the app'; exit }` : ''}
'ok'
${wait ? `[void][Console]::In.ReadToEnd()
[void][ShipJob]::TerminateJobObject($job, 1)` : ''}
} catch { "fail: $_" }`;
// End a named app job. Prints killed, gone (no such job now) or self (S runs inside it, so it must not end it).
const psStopJob = (name) => `${psJobLib}
try {
$job = [ShipJob]::OpenJobObject(0x1F001F, $false, '${name}')
if ($job -eq [IntPtr]::Zero) { 'gone'; exit }
$in = $false; $me = [Diagnostics.Process]::GetProcessById(${process.pid})
[void][ShipJob]::IsProcessInJob($me.Handle, $job, [ref]$in)
if ($in) { 'self'; exit }
if ([ShipJob]::TerminateJobObject($job, 1)) { 'killed' } else { 'fail: terminate' }
} catch { "fail: $_" }`;
function runReplayWin(file, cwd, env) {
  const tag = `@@ship-${process.pid}-${Date.now()}`;
  const wrap = join(dirname(file), '..', 'logs', `replay-wrap-${process.pid}.sh`);
  mkdirSync(dirname(wrap), { recursive: true });
  writeFileSync(wrap, 'BASH_ARGV0=$1; shift\nexec 3<&0 </dev/null\nprintf "%s-pid %s\\n" "$SHIP_TAG" "$(cat /proc/$$/winpid)"\nread -r -u 3 _\n( . "$0" ); c=$?\nprintf "\\n%s-end %s\\n" "$SHIP_TAG" "$c"\nread -r -u 3 _\nexit $c\n');
  return new Promise((ok) => {
    const child = spawn(gitBash() ?? die('replays need Git Bash: install Git for Windows or set CLAUDE_CODE_GIT_BASH_PATH.'), [wrap.replace(/\\/g, '/'), file.replace(/\\/g, '/')],
      { cwd, env: { ...env, SHIP_TAG: tag }, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', code, settled = false, job = null, jobOk = false;
    const seen = new Map(); // fallback only: the tree seen while parents lived
    let busy = false;
    const watch = setInterval(() => { if (jobOk || child.exitCode !== null || busy) return; busy = true; winSeen(child.pid).then((xs) => { busy = false; xs.forEach((x) => seen.set(`${x.id}:${x.t}`, x)); }); }, 1000);
    let went = false;
    const go = () => { if (went) return; went = true; try { child.stdin.write('go\n'); } catch { /* gone */ } };
    const finish = (status) => {
      if (settled) return; settled = true; clearTimeout(t); clearInterval(watch);
      const held = child.exitCode === null && child.signalCode === null;
      if (job) job.stdin.end(); // the helper terminates the job: the replay shell and everything in it
      if (!jobOk) winReap(child.pid, null, held, [...seen.values()]);
      const done = () => { try { unlinkSync(wrap); } catch { /* gone */ } child.stdin.destroy(); child.stdout.destroy(); child.stderr.destroy();
        ok({ status, out: out.replace(new RegExp(`${tag}-pid \\d+\\r?\\n`), '').replace(new RegExp(`\\r?\\n?${tag}-end \\d+\\r?\\n?`), '\n') }); };
      if (jobOk) { job.once('close', done); setTimeout(done, 15000); } else done();
    };
    child.stdout.on('data', (d) => {
      out += d;
      const p = !job && new RegExp(`${tag}-pid (\\d+)`).exec(out);
      if (p) {
        job = spawn('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(psJob(p[1], child.pid), 'utf16le').toString('base64')], { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
        let jo = '';
        job.stdout.on('data', (x) => { jo += x; if (!jobOk && /^ok\r?$/m.test(jo)) { jobOk = true; go(); } else if (/fail/.test(jo)) go(); });
        job.on('close', () => { if (!jobOk) go(); });
      }
      const m = new RegExp(`${tag}-end (\\d+)`).exec(out);
      if (m && code === undefined) { code = Number(m[1]); finish(code); }
    });
    child.stderr.on('data', (d) => { out += d; });
    const t = setTimeout(() => finish(null), REPLAY_TIMEOUT);
    child.on('exit', (c) => setTimeout(() => finish(code ?? c), 300));
  });
}

// Every saved replay against one fresh server on a port the OS picks, the way someone else would re-run them:
// a replay that needs a hard-coded port, leftover data or a server started by hand fails here.
const freePort = () => new Promise((ok) => { const s = createServer().listen(0, () => { const { port } = s.address(); s.close(() => ok(port)); }); });
// `only`: try one replay while writing it, the same safe way. It never opens the replay gate.
async function replay(r, cmd, only) {
  const all = replays(r);
  const files = only ? all.filter((f) => f === `${only}.sh`) : all;
  if (!files.length) die(only ? `replay: no .ship/journeys/${only}.sh.` : 'replay: no .ship/journeys/*.sh to run.');
  const { BASE, ...env } = process.env; // only a server this command started counts, never one the caller points at
  if (cmd) { appStop(r, !existsSync(P(r, 'app.json'))); appStop(r, true, 'replay-app.json'); const port = await freePort(); await appStart(r, port, cmd, 'replay-app.json'); env.BASE = `http://localhost:${port}`; }
  mkdirSync(P(r, 'logs'), { recursive: true });
  const failed = [];
  for (const f of files) {
    const res = await runReplay(P(r, 'journeys', f), r, env);
    const out = res.out;
    writeFileSync(P(r, 'logs', `replay-${f}.log`), out);
    if (res.status !== 0) { failed.push(f); console.log(`  ${f} ✗ (exit ${res.status ?? 'timeout'}): ${out.trim().split(/\r?\n/).pop()?.slice(0, 200) || '(no output)'}`); }
  }
  if (cmd) appStop(r, true, 'replay-app.json');
  if (!only) save(r, { replay: failed.length ? { ok: false } : { ok: true, fp: replayFp(r) } });
  log(r, `replay: ${files.length - failed.length}/${files.length} green`);
  console.log(`replay: ${files.length - failed.length}/${files.length} green${cmd ? ` on a fresh server (${cmd})` : ' (no server)'}${failed.length ? ` · logs .ship/logs/replay-<file>.log` : ''}`);
  if (failed.length) console.log(`A replay must pass using only ${cmd ? `BASE=${env.BASE}` : 'its own setup'}; one about the launch itself starts its own server (exercise.md step 3). A failing replay is a failing journey.`);
  if (failed.length) process.exitCode = 1;
}

// Stop: keep the run's own session going while it is running. SessionStart (compact/resume): re-inject state.
function hook() {
  let ev = {};
  try { ev = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { /* no event */ }
  const r = root(typeof ev.cwd === 'string' && ev.cwd ? ev.cwd : process.cwd());
  if (!r) return;
  const s = state(r);
  if (!['running', 'grilling'].includes(s.status) || !s.session || s.session !== ev.session_id) return;
  if (ev.hook_event_name === 'SubagentStart') { // which workers the run used, for the build gate
    const kind = String(ev.agent_type ?? '?');
    save(r, { agents: { ...s.agents, [kind]: (s.agents?.[kind] ?? 0) + 1 } });
    return;
  }
  if (s.status === 'grilling') { // the user is answering the grill: stops wait for them, a resume asks the next round
    if (ev.hook_event_name === 'SessionStart') console.log(`${status(r)}\nA /msnc:ship run is in grill mode. Re-read its SKILL.md and phases/define.md step 1, then ask the next round, or run S go if the user confirmed.`);
    return;
  }
  if (ev.hook_event_name === 'SessionStart') {
    console.log(`${status(r)}\nA /msnc:ship run is active. Re-read its SKILL.md and the current phase file, then continue.`);
    return;
  }
  if (ev.hook_event_name !== 'Stop') return;
  // A subagent the harness moved to the background wakes the session itself when it reports: let this idle stop through, uncounted.
  if ([ev.background_tasks].flat().some((t) => t?.type === 'subagent' && t.status === 'running')) return;
  const stops = (s.stops ?? 0) + 1;
  const fp = sha([s.phase, codeFp(r), shipFp(r)].join('|'));
  const same = fp === s.fp ? (s.same ?? 0) + 1 : 0;
  if (stops > MAX_STOPS || same >= STALL) {
    const reason = stops > MAX_STOPS ? `stop cap ${MAX_STOPS} reached` : `no progress for ${STALL} turns`;
    save(r, { status: 'blocked', reason, stops, fp, same });
    log(r, `blocked: ${reason}`);
    process.stdout.write(JSON.stringify({ systemMessage: `ship: blocked (${reason}). Resume with /msnc:ship resume.` }));
    return;
  }
  save(r, { stops, fp, same });
  const left = missing(r);
  process.stdout.write(JSON.stringify({ decision: 'block', reason:
    `${status(r)}\nThe run isn't finished${left.length ? ` (still needs: ${left.join('; ')})` : ''}. Continue the current phase. Stop on purpose only with \`ship.mjs done\` or \`ship.mjs block "<reason>"\` (only one-way-door questions or an outside dependency remain).` }));
}

const [cmd, ...args] = process.argv.slice(2);
const r = root();
restoreProbe(r);
switch (cmd) {
  case 'init': {
    const session = flag(args, 'session');
    const size = flag(args, 'size');
    const grill = args.includes('--grill');
    const goal = args.filter((a) => a !== '--grill').join(' ').trim();
    if (!session || !goal) die('usage: init --session <id> [--size small|medium|large] [--grill] "<goal>"');
    const here = process.cwd();
    if (['running', 'grilling'].includes(state(here).status)) die('a run is already active here. Use /msnc:ship resume, or pause it first.');
    if (existsSync(P(here))) { // keep earlier runs, start this one clean
      const dest = P(here, 'runs', new Date().toISOString().replace(/[:.]/g, '-'));
      mkdirSync(dest, { recursive: true });
      for (const e of readdirSync(P(here))) if (e !== 'runs' && e !== '.gitignore') renameSync(P(here, e), join(dest, e));
    }
    const isGit = existsSync(join(here, '.git'));
    // .ship/ is run state, never committed. A .gitignore inside it hides it from git without writing under .git/,
    // which sandboxes mount read-only.
    mkdirSync(P(here), { recursive: true });
    writeFileSync(P(here, '.gitignore'), '*\n');
    const base = isGit ? git(here, ['rev-parse', 'HEAD']).trim() || undefined : undefined;
    let branch = isGit ? git(here, ['branch', '--show-current']).trim() : '';
    if (base && ['main', 'master'].includes(branch)) {
      const slug = goal.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'run';
      branch = `ship/${slug}`;
      if (spawnSync('git', ['switch', '-q', '-c', branch], { cwd: here }).status !== 0) branch = git(here, ['branch', '--show-current']).trim();
    }
    // --grill: the user answers the grill (define.md step 1); the run is autonomous only after S go.
    // Otherwise a blind msnc:respondent answers it (grillBy), and the build gate checks that one started.
    writeJ(P(here, 'state.json'), { goal, status: grill ? 'grilling' : 'running', grill, grillBy: grill ? 'user' : 'respondent', phase: grill ? 'define' : 'intake', size, session, base, branch, started: new Date().toISOString(), stops: 0 });
    writeJ(P(here, 'checks.json'), detectChecks(here));
    writeJ(P(here, 'journeys.json'), []);
    writeJ(P(here, 'questions.json'), []);
    log(here, `init: ${goal}`);
    const checks = readJ(P(here, 'checks.json'), []);
    console.log(`ship: run started on ${branch || '(no git)'} · base ${base?.slice(0, 7) ?? 'none'} · checks: ${checks.map((c) => c.name).join(', ') || 'none yet (S check detects package.json, pyproject.toml or Makefile ones, or write .ship/checks.json)'}`);
    if (grill) console.log('ship: grill mode. Ask the user the grill rounds (define.md step 1); run S go once they confirm. Until then stopping to wait for answers is allowed.');
    if (features(here).length) console.log('ship: MSNC features already in this repo; run S intake before sizing.');
    break;
  }
  case 'status': console.log(status(need(r))); break;
  case 'intake': {
    const fs = features(need(r));
    const decisions = read(join(r, 'docs', 'decisions.md')).split('\n').filter((l) => / · /.test(l)).length;
    console.log(`intake: tracker ${trackerKind(r)}${localTracker(r) ? ' (.scratch/)' : ' (not scanned here: list it with its CLI)'} · docs/decisions.md ${decisions} settled decisions`);
    for (const f of fs) console.log(`  ${f.slug}: spec ${f.spec ? '✓' : '✗'} · tickets ${f.done}/${f.tickets} done${f.human ? ` (${f.human} for a human)` : ''} → continue at ${f.next}`);
    if (!fs.length) console.log('  no features yet → new feature: S feature <slug>');
    break;
  }
  case 'feature': {
    const spec = flag(args, 'spec');
    const slug = args[0];
    if (!/^[a-z0-9][a-z0-9-]*$/.test(slug ?? '')) die('usage: feature <slug> [--spec <path, when the spec lives outside .scratch/<slug>/spec.md>]');
    const f = feature(need(r), slug), s = state(r);
    if (s.built && s.feature && s.feature !== slug) die(`feature ${s.feature} is already being built; a run builds one feature.`);
    if (spec && !/^\.(ship|scratch)\//.test(spec.replace(/\\/g, '/'))) die('--spec takes a copy under .ship/ (a remote tracker\'s spec, fetched with its CLI) or a file under .scratch/.');
    save(r, { feature: slug, spec: spec ?? `.scratch/${slug}/spec.md`, doneAtBind: s.feature === slug ? s.doneAtBind : f.done,
      specAtBind: s.feature === slug ? s.specAtBind : Boolean(spec || f.spec) });
    log(r, `feature: ${slug}`);
    console.log(`${status(r)}\nfeature ${slug}: ${f.spec || f.tickets ? `spec ${f.spec ? '✓' : '✗'} · tickets ${f.done}/${f.tickets} done → continue at ${f.next}` : 'new → define'}`);
    break;
  }
  case 'go': {
    if (state(need(r)).status !== 'grilling') die(`nothing to start: the run is ${state(r).status}, not grilling.`);
    save(r, { status: 'running', grill: false, stops: 0, same: 0 }); log(r, 'grill settled: autonomous from here'); console.log(status(r)); break;
  }
  case 'phase': {
    const to = args[0];
    if (!PHASES.includes(to)) die(`phase must be one of ${PHASES.join(', ')}`);
    const s = state(need(r));
    if (['exercise', 'verify', 'finish'].includes(to) && journeys(r).length) {
      if (!s.lock) die('lock the journeys first (S lock).');
      if (s.lock !== jHash(journeys(r))) die('journeys changed after lock. Run S restore; if a journey is wrong, S ask.');
    }
    if (['verify', 'finish'].includes(to) && a11yGap(r)) die(`${to} needs ${a11yGap(r)}`);
    if (['exercise', 'verify', 'finish'].includes(to) && inlineBuild(r)) die(`${to} needs every ticket built the MSNC way: ${inlineBuild(r)}`);
    // Medium and large runs build from MSNC's spec and tickets, in the tracker, committed (define.md steps 0, 2, 5).
    if (['build', 'exercise', 'verify', 'finish'].includes(to) && msncGap(r)) die(`${to} needs ${msncGap(r)}.`);
    if (['build', 'exercise', 'verify', 'finish'].includes(to) && msncRun(state(r)) && grillGap(r)) die(`${to} needs ${grillGap(r)}.`);
    if (to === 'finish' && journeys(r).some((j) => !j.passes)) die('finish needs every journey passing. Failing: ' + journeys(r).filter((j) => !j.passes).map((j) => j.id).join(', '));
    save(r, { phase: to, reason: undefined, ...(to === 'build' ? { built: true } : {}) });
    log(r, `phase → ${to}`);
    console.log(status(r));
    break;
  }
  case 'size':
    if (!['small', 'medium', 'large'].includes(args[0])) die('size must be small, medium or large');
    save(need(r), { size: args[0] }); console.log(status(r)); break;
  case 'lock': {
    if (state(need(r)).lock) die('journeys are already locked. A wrong journey is a question for the user (S ask), not an edit.');
    const js = journeys(r);
    if (!js.length) die('no journeys in .ship/journeys.json.');
    const bad = js.filter((j) => !j.id || !j.goal || !Array.isArray(j.steps) || !Array.isArray(j.expect));
    if (bad.length) die(`each journey needs id, goal, steps[], expect[]. Fix: ${bad.map((j) => j.id ?? '?').join(', ')}`);
    writeJ(P(r, 'journeys.locked.json'), js);
    save(r, { lock: jHash(js) });
    console.log(`ship: ${js.length} journeys locked`);
    break;
  }
  case 'restore': {
    const locked = readJ(P(need(r), 'journeys.locked.json'), null) ?? die('nothing locked to restore.');
    const now = Object.fromEntries(journeys(r).map((j) => [j.id, j]));
    writeJ(P(r, 'journeys.json'), locked.map((j) => ({ ...j, passes: now[j.id]?.passes, evidence: now[j.id]?.evidence })));
    console.log(status(r));
    break;
  }
  case 'journey': {
    const [verdict, id, ...ev] = args;
    const js = journeys(need(r));
    const j = js.find((x) => x.id === id);
    if (!['pass', 'fail'].includes(verdict) || !j) die('usage: journey pass|fail <id> "<evidence: file, ref or output line>"');
    if (verdict === 'pass' && !ev.join(' ').trim()) die('a pass needs evidence.');
    j.passes = verdict === 'pass';
    j.evidence = ev.join(' ');
    writeJ(P(r, 'journeys.json'), js);
    log(r, `journey ${id} ${verdict}: ${j.evidence}`);
    console.log(status(r));
    break;
  }
  case 'review': {
    const defers = [];
    for (let v; (v = flag(args, 'defer')) !== undefined;) defers.push(v);
    const [verdict, ...note] = args;
    if (!['pass', 'fail'].includes(verdict)) die('usage: review pass|fail "<reviewer summary>" [--defer "<beyond-spec item>"]...');
    if (defers.length && verdict !== 'pass') die('--defer goes with a pass: fix in-scope findings first.');
    if (state(need(r)).status === 'blocked') die(`the run is blocked (${state(r).reason}). Resume with S answer or S adopt first.`);
    // Beyond-spec items the reviewer listed become logged decisions, so they reach the digest and the report.
    for (const d of new Set(defers)) decide(need(r), ['review.defer', d, 'beyond the spec: no story or base behavior covers it', 'add a story and a fix ticket']);
    const fails = (state(need(r)).reviewFails ?? 0) + (verdict === 'fail');
    save(r, { review: verdict === 'pass' ? { ok: true, fp: codeFp(r) } : { ok: false }, reviewFails: fails });
    log(r, `review ${verdict}: ${note.join(' ')}`);
    if (verdict === 'fail' && fails > REVIEW_CAP) { stopAll(r); save(r, { status: 'blocked', reason: `review cap: ${fails} failed reviews, ${REVIEW_CAP} fix rounds used: ${note.join(' ')}` }); process.exitCode = 1; }
    console.log(status(r));
    if (verdict === 'pass') console.log('ship: From here, edit only docs/decisions.md and docs/solutions/: any other change needs another check, replay and review.');
    break;
  }
  case 'diff': { // everything the run changed since its base commit, for the reviewer
    if (weakTests(need(r)).length) die(`resolve survived probes before review: strengthen the test and re-run the same probe until KILLED, or delete it and log S decide test.<name> "deleted #<n> <file>". Keeping it is not an option. Open: ${weakTests(r).join('; ')}`);
    const out = git(r, ['diff', state(r).base || EMPTY_TREE, '--', '.', ...NOT_CODE]);
    writeFileSync(P(r, 'review.diff'), out);
    console.log(`ship: .ship/review.diff · ${out.split('\n').filter((l) => /^[+-][^+-]/.test(l)).length} changed lines since ${state(r).base?.slice(0, 7) ?? 'the empty tree'} · spec ${state(r).spec ?? '.ship/spec.md'}`);
    break;
  }
  case 'app': {
    const [sub, port] = args;
    if (sub === 'start') await appStart(need(r), port, args.slice(args.indexOf('--') + 1).join(' '));
    else if (sub === 'stop') appStop(need(r));
    else die('usage: app start <port> -- "<start command>" | app stop');
    break;
  }
  case 'replay': {
    const only = flag(args, 'only');
    const sep = args.indexOf('--');
    await replay(need(r), sep < 0 ? state(r).appCmd : args.slice(sep + 1).join(' '), only);
    break;
  }
  case 'driver': driver(need(r)); break;
  case 'decide': decide(need(r), args); break;
  case 'ask': {
    const blocking = args.includes('--blocking');
    const [q, rec] = args.filter((a) => a !== '--blocking');
    if (!q || !rec) die('usage: ask "<question>" "<recommended answer>" [--blocking]');
    const qs = readJ(P(need(r), 'questions.json'), []);
    qs.push({ n: qs.length + 1, q, rec, blocking, asked: new Date().toISOString() });
    writeJ(P(r, 'questions.json'), qs);
    log(r, `asked q${qs.length}: ${q}`);
    console.log(`ship: queued question ${qs.length}. Keep working on anything it doesn't block.`);
    break;
  }
  case 'answer': {
    const [n, ...a] = args;
    const qs = readJ(P(need(r), 'questions.json'), []);
    const q = qs.find((x) => String(x.n) === n) ?? die(`no question ${n}`);
    if (!a.join(' ').trim()) die('usage: answer <n> "<answer>"');
    q.answer = a.join(' ');
    writeJ(P(r, 'questions.json'), qs);
    decide(r, [`question.${n}`, q.answer, `user answered: ${q.q}`, 'ask again'], { by: 'user' });
    if (state(r).status === 'blocked') save(r, { status: 'running', reason: undefined, same: 0, reviewFails: capReset(r) });
    break;
  }
  case 'questions': for (const q of readJ(P(need(r), 'questions.json'), []).filter((x) => !x.answer)) console.log(`${q.n}. ${q.q} → recommended: ${q.rec}${q.blocking ? ' (blocking)' : ''}`); break;
  case 'digest': {
    const rows = read(P(need(r), 'decisions.jsonl')).split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((x) => x.by !== 'user');
    if (!rows.length) console.log('ship: no decisions logged.');
    for (const d of rows) console.log(`- ${d.point}: ${d.choice} · ${d.why} · undo: ${d.undo}`);
    break;
  }
  case 'check': check(need(r)); break;
  case 'probe': probe(need(r), args); break;
  case 'done': {
    const left = missing(need(r));
    if (left.length) die(`not done. Still needs: ${left.join('; ')}`);
    stopAll(r);
    save(r, { status: 'done', phase: 'finish', reason: undefined });
    log(r, 'done');
    console.log(status(r));
    break;
  }
  case 'block': stopAll(need(r)); save(r, { status: 'blocked', reason: args.join(' ') || 'blocked' }); log(r, `blocked: ${args.join(' ')}`); console.log(status(r)); break;
  case 'pause': save(need(r), { status: 'paused' }); log(r, 'paused'); console.log(status(r)); break;
  case 'adopt':
    if (!args[0]) die('usage: adopt <session id>');
    save(need(r), { session: args[0], status: state(r).grill ? 'grilling' : 'running', stops: 0, same: 0, reason: undefined, reviewFails: capReset(r) }); log(r, 'resumed'); console.log(status(r)); break;
  case 'hook': hook(); break;
  default:
    console.log('usage: ship.mjs init|status|intake|feature|go|phase|size|lock|restore|journey|review|diff|app|replay|driver|decide|ask|answer|questions|digest|check|probe|done|block|pause|adopt|hook');
    process.exit(cmd ? 1 : 0);
}
