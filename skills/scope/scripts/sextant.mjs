#!/usr/bin/env node
// sextant — runs atlas and scalpel as one instrument.
//
// It owns exactly two things neither tool can do alone:
//   scan    keep both stores in step (forgetting one silently degrades `impact`)
//   impact  cross-check symbol-level dependents against file-level importers
//
// Everything else is better done by calling atlas/scalpel directly — see SKILL.md.
// Scalpel is driven only through its CLI. Atlas has no complete machine-readable
// output (`context` truncates its importer list), so its graph store is read
// directly; that is the one coupling point, and readAtlasImporters() fails loudly
// rather than returning an empty set, because an empty set here reads as "nothing
// else to check" — the most dangerous possible wrong answer.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mergeIntoAtlas } from './merge.mjs';
import { impactLogPath } from './impact-log.mjs';

const HELP = `sextant — one instrument for reading and changing a codebase

  it drives two graphs of your repo and reconciles them:
    file graph    modules, files, imports, git state, GitHub issues
    symbol graph  functions, calls, signatures, tests, notes

sextant's own commands (these need both graphs)
  sextant scan               refresh both graphs; installs the impact-first gate
  sextant impact <name|id>   dependents, cross-checked for blind spots
  sextant impact <path>      same, at file altitude (whole-file dependents)
  sextant view [--out f]     ONE interactive graph: module -> file -> symbol
  sextant status             what is installed, what is indexed
  sextant map                the repo's orientation card

read (routed to whichever graph owns the answer)
  sextant query "terms"      ranked retrieval across the file graph
  sextant context <path|id>  one card: upstream, downstream, tests, docs, issues, git
  sextant locate <name>      exact file, line span and signature for a symbol
  sextant slice <id>         the definition itself, token-budgeted
  sextant brief <id>         compact orientation card for a symbol
  sextant neighbors <id>     adjacency by edge type   [--depth 1-3] [--dir in|out|both]
  sextant path <a> <b>       how two nodes connect
  sextant expand <path>      symbol nodes with line anchors, for ranged reads
  sextant issues             GitHub issues, blockers and frontier

write back / verify
  sextant check              exits 1 if anything dangles after an edit
  sextant note symbol <...>  anchored symbol note (survives moves)
  sextant note file <...>    file summary or edge in the file graph
  sextant verify             find summaries that drifted and files that vanished
  sextant prune              drop dead nodes, orphan edges, duplicates
  sextant stats              size and counts for both graphs

options
  --root <dir>   project root (default: cwd)
  --no-hook      scan: do not install the impact-first PreToolUse hook
  --no-claude-md scan: do not write the CLAUDE.md routing block
  --depth <n>    impact / neighbors
  --out <file>   view: where to write the HTML

everything ships inside this folder (engine/). Overrides, if you keep the engines
elsewhere: $SEXTANT_ATLAS and $SEXTANT_SCALPEL, absolute paths to their CLIs.`;

// fileURLToPath, not url.pathname: pathname is percent-encoded, so any space in the
// install path (e.g. "AI Projects") silently breaks tool discovery.
const here = path.dirname(fileURLToPath(import.meta.url));

function die(msg, code = 2) {
  console.error(`sextant: ${msg}`);
  process.exit(code);
}

function findTool(envVar, bundledRel, siblingRel, vendoredRel, root) {
  // An explicit env var is an override, not a hint: if it is set and wrong, say so
  // rather than quietly using a different install than the one that was asked for.
  const pinned = process.env[envVar];
  if (pinned) {
    if (fs.existsSync(pinned)) return pinned;
    die(`$${envVar} points at ${pinned}, which does not exist`);
  }
  // Bundled first: a sextant folder is meant to be copied into a repo whole, and an
  // engine sitting next to it in some older layout must not silently win over the one
  // that shipped with this copy.
  for (const t of [
    path.resolve(here, '..', 'engine', bundledRel),
    path.resolve(here, '..', '..', siblingRel),
    path.resolve(root, vendoredRel),
  ]) {
    if (fs.existsSync(t)) return t;
  }
  return null;
}

function tools(root) {
  const atlas = findTool(
    'SEXTANT_ATLAS',
    'atlas/scripts/atlas.mjs',
    'atlas/scripts/atlas.mjs',
    '.claude/skills/atlas/scripts/atlas.mjs',
    root,
  );
  const scalpel = findTool(
    'SEXTANT_SCALPEL',
    'scalpel/scripts/map.mjs',
    'scalpel/scripts/map.mjs',
    'skills/scalpel/scripts/map.mjs',
    root,
  );
  return { atlas, scalpel };
}

// spawnSync, not execFileSync: the two tools disagree about which stream is for
// humans (scalpel writes its scan summary to stderr, atlas to stdout), and on
// failure both put the useful message on whichever they prefer. spawnSync hands
// back both plus a status, with no exception to unpack.
function run(script, args, root, { merge = false } = {}) {
  const r = spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  if (r.error) return die(`could not run ${path.basename(script)}: ${r.error.message}`);
  const out = r.stdout || '';
  const err = r.stderr || '';
  if (r.status !== 0) {
    const said = out.trim() || err.trim() || `exit ${r.status}`;
    return die(`${path.basename(script)} ${args[0]} failed —\n  ${said.replace(/\n/g, '\n  ')}`);
  }
  return merge ? out + err : out;
}

// --- atlas store ------------------------------------------------------------
// Returns the set of files importing `targetFile`, per atlas's file-level graph.
// Dies on anything unexpected: a silent empty set would read as "no blind spots".
const atlasStore = new Map();
function readAtlasImporters(root, targetFile) {
  const dir = path.join(root, '.atlas', 'graph');
  const nodesPath = path.join(dir, 'nodes.jsonl');
  const edgesPath = path.join(dir, 'edges.jsonl');
  for (const p of [nodesPath, edgesPath]) {
    if (!fs.existsSync(p)) {
      die(`file graph missing (${path.relative(root, p)}). Run: sextant scan`);
    }
  }
  const parse = (p) =>
    fs
      .readFileSync(p, 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((l, i) => {
        try {
          return JSON.parse(l);
        } catch {
          return die(`file graph corrupt at ${path.basename(p)}:${i + 1}. Run: sextant scan`);
        }
      });

  // Cached: the file-graph fallback in impact calls this once per importer it walks.
  if (!atlasStore.has(root)) atlasStore.set(root, [parse(nodesPath), parse(edgesPath)]);
  const [nodes, edges] = atlasStore.get(root);
  if (!nodes.length || typeof nodes[0].id !== 'string' || !('k' in nodes[0])) {
    die('file graph node format not recognised — expected {id,t,k}. Reinstall this skill whole.');
  }
  if (!Array.isArray(edges[0]) || edges[0].length !== 3) {
    die('file graph edge format not recognised — expected ["src","type","dst"] triples. Reinstall this skill whole.');
  }

  const byId = new Map(nodes.map((n) => [n.id, n.k]));
  const fileNode = nodes.find((n) => n.k === targetFile && n.t !== 'sym');
  if (!fileNode) return null; // atlas does not know this file — reported, not silently empty
  return new Set(
    edges
      .filter((e) => e[1] === 'imports' && e[2] === fileNode.id)
      .map((e) => byId.get(e[0]))
      .filter(Boolean),
  );
}

// --- commands ---------------------------------------------------------------

// --- CLAUDE.md routing block -------------------------------------------------
// Written once, when both stores exist, because the routing it describes is only
// correct then: with one tool installed, `sextant impact` cannot answer at all.
//
// Unlike atlas's equivalent this does NOT rewrite an existing block. Atlas writes its
// block from `init`, which runs about once per repo; this runs on every `scan`, and
// silently reverting a routing rule someone deliberately tuned would be worse than
// carrying a stale one. Delete the block to regenerate it.
const CLAUDE_BEGIN = '<!-- sextant:begin -->';
const CLAUDE_END = '<!-- sextant:end -->';

const CLAUDE_BLOCK = [
  CLAUDE_BEGIN,
  '## sextant — impact before you edit',
  '',
  'This repo is indexed by `sextant`, one tool that keeps two graphs of the code in step:',
  'a file graph (modules, imports, git state, issues) and a symbol graph (functions, calls,',
  'signatures, tests). One CLI covers both:',
  '',
  '```bash',
  'S="tools/sextant/scripts/sextant.mjs"   # or .claude/skills/sextant/scripts/...',
  '```',
  '',
  '| Job | Command |',
  '|---|---|',
  '| Orient at session start | `node $S map`, then `node $S query "nouns of the task"` |',
  '| Before ANY edit to a file the graph knows | `node $S impact <symbol\\\|path>` |',
  '| Read a definition | `node $S locate <name>` then `node $S slice <id>` |',
  '| After an edit | `node $S check`, then `node $S scan` |',
  '| See or show how the project fits together | `node $S view` |',
  '',
  '**Impact first, every time** — not "when it looks risky". The edits that break something are',
  'exactly the ones that did not look risky. A PreToolUse hook enforces it: an edit to a file that',
  'has a node in the graph is refused until `sextant impact` has been run on it. New files, files',
  'outside the graph, and repos with no index are never gated. Bypass: `SEXTANT_HOOK=off`.',
  '',
  '`impact` is the one that matters, because the two graphs fail in opposite directions. Symbol',
  'analysis cannot resolve a call made through a variable and reports the dependent as simply',
  'absent; the file graph sees that importer but not the line. `sextant impact` runs both and',
  'hands you the difference as a short triage list instead of a confident "no dependents found".',
  'Pass a symbol for exact line spans, a file path for whole-file dependents.',
  '',
  'Refreshing one graph and not the other degrades `impact` silently, with nothing on screen to',
  'say so — which is why `node $S scan` is the only scan command; run it after multi-file edits.',
  '',
  '`node $S` with no arguments lists every command.',
  '',
  'sextant wrote this block. Edit it freely — it is only regenerated if you delete it entirely.',
  CLAUDE_END,
].join('\n');

// Returns 'created' | 'appended' | null (already present, or unchanged).
function ensureClaudeBlock(root) {
  const p = path.join(root, 'CLAUDE.md');
  const existed = fs.existsSync(p);
  const cm = existed ? fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n') : '';
  if (cm.includes(CLAUDE_BEGIN)) return null;
  const next = cm.trimEnd() + (cm.trim() ? '\n\n' : '') + CLAUDE_BLOCK + '\n';
  fs.writeFileSync(p, next);
  return existed && cm.trim() ? 'appended' : 'created';
}

// The CLAUDE.md block routes; this enforces. Installed on scan for the same reason the block
// is: a rule that each project has to wire up by hand is a rule that holds in the project
// someone remembered. Written only when absent -- and re-added if deleted, which is the point.
// Opt out with SEXTANT_NO_HOOK=1 or `sextant scan --no-hook`.
// Returns 'created' | 'added' | null (already wired, or settings.json unreadable).
function hookPath(root, file) {
  // Relative when the skill lives inside the repo, which is the normal case. This lands in
  // settings.json -- the SHARED project settings, not settings.local.json -- so an absolute
  // path here would commit one machine's home directory and break for everyone else. Hooks
  // run with cwd at the project root, so the relative form resolves. Absolute only when the
  // skill genuinely sits outside the repo, where nothing relative could work.
  // Forward slashes: node accepts them on Windows and they need no escaping in JSON.
  const abs = path.join(here, file);
  const rel = path.relative(root, abs).split(path.sep).join('/');
  return rel.startsWith('..') ? abs.split(path.sep).join('/') : rel;
}

function ensureHooks(root) {
  const p = path.join(root, '.claude', 'settings.json');
  let settings = {};
  const existed = fs.existsSync(p);
  if (existed) {
    try { settings = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
    if (!settings || typeof settings !== 'object') return null;
  }
  const hooks = settings.hooks || (settings.hooks = {});
  const added = [];

  // The gate. Bash is in the matcher because it is the widest hole: an in-place edit or a
  // `>` redirect is as permanent as the Edit tool, and harnesses reach for the shell
  // constantly. The hook parses the command and falls open when it cannot tell.
  const pre = hooks.PreToolUse || (hooks.PreToolUse = []);
  if (!Array.isArray(pre)) return null;
  const wired = JSON.stringify(pre);
  if (!wired.includes('pre-edit-hook.mjs')) {
    pre.push({
      matcher: 'Edit|Write|MultiEdit|NotebookEdit|Bash',
      hooks: [{ type: 'command', command: `node "${hookPath(root, 'pre-edit-hook.mjs')}"`, timeout: 10 }],
    });
    added.push('PreToolUse gate (edits, including via Bash)');
  } else if (!wired.includes('|Bash')) {
    // An install predating Bash coverage: widen it rather than leaving the hole open, since
    // the whole point of the gate is that it does not depend on anyone remembering.
    for (const entry of pre) {
      if (JSON.stringify(entry).includes('pre-edit-hook.mjs') && !String(entry.matcher).includes('Bash')) {
        entry.matcher = `${entry.matcher}|Bash`;
        added.push('PreToolUse gate widened to cover Bash');
      }
    }
  }

  // The nudge. Fires once per session, on a repo-wide grep for a bare identifier, and never
  // on the scoped greps the cross-check itself prescribes. Separate hook, separate entry, so
  // it can be removed without touching the gate that actually protects anything.
  if (!wired.includes('grep-nudge-hook.mjs')) {
    pre.push({
      matcher: 'Grep',
      hooks: [{ type: 'command', command: `node "${hookPath(root, 'grep-nudge-hook.mjs')}"`, timeout: 10 }],
    });
    added.push('Grep nudge (once per session)');
  }

  // The announcement. Soft, but it is what puts sextant in context before the first Grep --
  // the gate cannot help there, because reads are not gated.
  const start = hooks.SessionStart || (hooks.SessionStart = []);
  if (Array.isArray(start) && !JSON.stringify(start).includes('session-hook.mjs')) {
    start.push({
      hooks: [{ type: 'command', command: `node "${hookPath(root, 'session-hook.mjs')}"`, timeout: 10 }],
    });
    added.push('SessionStart announcement');
  }

  if (!added.length) return null;
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(settings, null, 2) + '\n');
  return { how: existed ? 'updated' : 'created', added };
}

function cmdScan(root, { atlas, scalpel }) {
  // msnc: MSNC's dispatcher is the gate and its Tuner the routing, so this copy never
  // writes project hooks or a CLAUDE.md block, whatever flags scan is run with.
  process.env.SEXTANT_NO_HOOK = process.env.SEXTANT_NO_CLAUDE_MD = '1';
  if (!atlas && !scalpel) die('no engine found — this install is incomplete. See `sextant status`');
  // Both inits are documented idempotent and additive, but atlas's also appends to
  // CLAUDE.md and .gitignore — so only run it when the store is genuinely absent,
  // and say so rather than editing the repo silently.
  if (scalpel && !fs.existsSync(path.join(root, '.map', 'index'))) {
    console.log('symbol graph  init (first run — creating .map/)');
    run(scalpel, ['init'], root);
  }
  if (atlas && !fs.existsSync(path.join(root, '.atlas', 'graph'))) {
    console.log('file graph    init (first run — creates .atlas/, appends to .gitignore)');
    run(atlas, ['init'], root);
  }
  // Both tools put warnings on the same stream as their summary, and either may emit one
  // FIRST -- so taking the first line reports "warn: ..." and nothing else, which reads as
  // a scan that did not run. Report the summary, then the notes; but cap them, because
  // scalpel emits one line per oversize file and the summary already carries the count.
  const NOTE = /^(warn|note|warning):/i;
  const NOTE_CAP = 3;
  const summarize = (label, out) => {
    const lines = out.trim().split('\n').map((l) => l.trim()).filter(Boolean);
    const pad = ' '.repeat(label.length);
    console.log(`${label} ${lines.find((l) => !NOTE.test(l)) || '(no output)'}`);
    const notes = lines.filter((l) => NOTE.test(l));
    for (const n of notes.slice(0, NOTE_CAP)) console.log(`${pad} ${n}`);
    if (notes.length > NOTE_CAP) {
      console.log(`${pad} +${notes.length - NOTE_CAP} more (run that tool's scan directly for the full list)`);
    }
  };
  if (scalpel) summarize('symbol graph ', run(scalpel, ['scan'], root, { merge: true }));
  if (atlas) summarize('file graph   ', run(atlas, ['scan'], root, { merge: true }));
  // Only with both tools present: the block routes impact and view through sextant, and
  // neither works with one store. Skipped when something else already does the routing
  // (a harness plugin, a hand-written CLAUDE.md): two routing texts disagree eventually.
  if (atlas && scalpel && !process.env.SEXTANT_NO_CLAUDE_MD && !process.argv.includes('--no-claude-md')) {
    const wrote = ensureClaudeBlock(root);
    if (wrote) console.log(`CLAUDE.md ${wrote} sextant routing block (edit freely; delete it to regenerate)`);
  }
  if (!process.env.SEXTANT_NO_HOOK && !process.argv.includes('--no-hook')) {
    const hooked = ensureHooks(root);
    if (hooked) console.log(`.claude/settings.json ${hooked.how}: ${hooked.added.join(', ')} (SEXTANT_HOOK=off to bypass)`);
  }
}

// One picture, both tiers. Atlas's viewer is the full-featured one -- node-type toggles,
// git state, tag facets, impact mode, flow, search over summaries -- and it already
// reserves `sym`/`calls`/`y` for a symbol tier it cannot populate. So the merge runs in
// that direction: scalpel's symbols go into atlas's graph and atlas's own renderer draws
// it, unchanged. sextant owns the fold (merge.mjs) and nothing else.
async function cmdView(root, { atlas, scalpel }, outArg) {
  if (!atlas) die('file graph engine missing — it draws the viewer and every tier above the symbol');
  if (!scalpel) die('symbol graph engine missing — without symbols there is no call tier to draw');
  const scalpelDir = path.join(root, '.map', 'index');
  const atlasDir = path.join(root, '.atlas');
  if (!fs.existsSync(scalpelDir) || !fs.existsSync(path.join(atlasDir, 'graph'))) {
    die('a store is missing. Run: sextant scan');
  }

  const lib = path.resolve(path.dirname(atlas), 'lib');
  const load = async (f, name) => {
    const p = path.join(lib, f);
    if (!fs.existsSync(p)) die(`file graph engine ${f} not found at ${p} — incomplete install?`);
    const m = await import(pathToFileURL(p).href);
    if (typeof m[name] !== 'function') die(`file graph engine ${f} has no ${name} — version mismatch; reinstall this skill whole.`);
    return m;
  };
  const { loadGraph } = await load('store.mjs', 'loadGraph');
  const { graphHtml } = await load('html.mjs', 'graphHtml');

  const graph = loadGraph(atlasDir);
  for (const w of graph.warnings) console.log(`warn: ${w}`);
  const before = graph.nodes.size;
  const stats = mergeIntoAtlas({ atlasGraph: graph, scalpelDir, die });

  const out = outArg ? path.resolve(root, outArg) : null;
  const r = graphHtml({ root, dir: atlasDir }, graph, out);
  const where = r.file || path.join(atlasDir, 'view', 'atlas.html');

  console.log(`view ${path.relative(root, where)} (${r.nodes} nodes, ${r.edges} edges, ${Math.round(r.bytes / 1024)} KB)`);
  console.log(`files  ${before} nodes — files, modules, decisions, and their overlays`);
  console.log(`syms   +${stats.symbols} connected symbols across ${stats.joinedFiles} files`);
  console.log(`       ${stats.foldedLeaves} unconnected symbols folded into their file's anchor list, not drawn as dots`);
  console.log(`concepts ${stats.concepts.linked} linked by ${stats.concepts.edges} references parsed from their text, ${stats.concepts.stillIsolated} still isolated`);
  console.log(`modules  ${stats.mods.collapsed} pass-through nodes collapsed, ${stats.mods.enriched} given file/symbol/test aggregates`);
  console.log(`edges  +${stats.edges['part-of']} part-of, +${stats.edges.calls} calls, +${stats.edges.implements} implements`);
  console.log(`cross  +${stats.importsAdded} imports and +${stats.testsAdded} test links the file graph did not have`);
  const pv = stats.provenance;
  console.log(`seen by  both ${pv.both}, file graph only ${pv.atlas}, symbol graph only ${pv.scalpel}  (filter in the sidebar)`);
  if (stats.check.ran) {
    const c = stats.check;
    console.log(`check  ${c.drift} drifted, ${c.dangling} dangling, ${c.orphan} orphaned notes, ${c.ambiguous} ambiguous (from \`sextant check\`)`);
  } else {
    console.log('check  no lens — run `sextant check` to overlay drift and dangling refs');
  }
  console.log(`notes  ${stats.notesAttached} attached from the symbol ledger${stats.notesStale ? `, ${stats.notesStale} unbound (code changed since written)` : ''}`);
  if (stats.skippedNoFile) {
    console.log(`note   ${stats.skippedNoFile} symbols skipped — in files the file graph does not track (different ignore rules)`);
  }
  console.log(`overlays git ${r.hasGit ? 'on' : 'off'}, issues ${r.hasIssues ? 'on' : "off (run: sextant issues)"}`);
  console.log('');
  console.log('zoom is the tier control — modules zoomed out, then files, then symbols as you go in.');
}

function cmdStatus(root, { atlas, scalpel }) {
  const mark = (b) => (b ? 'ok     ' : 'MISSING');
  const aStore = fs.existsSync(path.join(root, '.atlas', 'graph', 'nodes.jsonl'));
  const sStore = fs.existsSync(path.join(root, '.map', 'index'));
  console.log(`root           ${root}`);
  console.log(`file engine    ${mark(!!atlas)} ${atlas || '(bundled copy missing — set $SEXTANT_ATLAS)'}`);
  console.log(`symbol engine  ${mark(!!scalpel)} ${scalpel || '(bundled copy missing — set $SEXTANT_SCALPEL)'}`);
  console.log(`file graph     ${mark(aStore)} .atlas/`);
  console.log(`symbol graph   ${mark(sStore)} .map/`);
  if (!aStore || !sStore) console.log('\nrun: sextant scan');
}

// Resolve the target to {id, name, path}. Ambiguity is surfaced, never guessed.
// Only `name` and `path` are used downstream, for the cross-check.
// `onMiss` handles "no such symbol": impact passes one that falls back to the file graph.
function resolveTarget(scalpel, root, key, onMiss = die) {
  // An id cannot be looked up with `locate` (that searches names, and an id's hex
  // suffix is not a name). `brief` takes an id and prints "brief <name> <id>" then
  // "def: <path>:<sl>-<el>", which is all the cross-check needs.
  if (/^[a-z]+:[0-9a-f]{6,}$/.test(key)) {
    const brief = run(scalpel, ['brief', key], root, { merge: true });
    const name = /^brief\s+(\S+)\s/m.exec(brief)?.[1];
    const p = /^def:\s+(\S+?):\d+-\d+/m.exec(brief)?.[1];
    if (!name || !p) return die(`unknown id ${key} — the index may be stale. Run: sextant scan`);
    return { id: key, name, path: p };
  }

  const raw = run(scalpel, ['locate', key, '--json'], root).trim();
  if (!raw.startsWith('{')) {
    // scalpel reports "no results for ..." as plain text on a zero exit.
    return onMiss(`no symbol named "${key}" in the index. Try: sextant locate ${key}`);
  }
  const hits = JSON.parse(raw).hits || [];
  // Modules match on path OR module name, so `impact kernel/router.py` resolves.
  // A module node is scalpel's file altitude: import edges connect modules and
  // collectImpact walks import, so this is a file-level dependency walk with --depth.
  const exact = hits.filter((h) =>
    h.kind === 'module' ? h.path === key || h.name === key : h.name === key,
  );
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) {
    console.error(`sextant: "${key}" is ambiguous — pass one of these ids:`);
    for (const h of exact) {
      console.error(`  ${h.id}  ${h.kind} ${h.path}:${h.span.sl}-${h.span.el}`);
    }
    process.exit(2);
  }
  if (!hits.length) return onMiss(`no symbol named "${key}" — try: sextant locate ${key}`);
  return onMiss(`no exact match for "${key}" — closest is ${hits[0].name} (${hits[0].id})`);
}

// A file only the file graph knows — CSS, HTML, anything without a grammar — has no
// symbol node, so the symbol walk cannot answer. Dying there left the pre-edit gate
// unsatisfiable for exactly those files. Answer from the file graph instead: its
// importers, transitively to --depth, and record the entry the gate reads.
function fileGraphImpact(root, file, depth) {
  try { fs.appendFileSync(impactLogPath(root), `${Date.now()} ${file}\n`); } catch { /* gate falls back to blocking */ }
  console.log(`impact ${file} [up] (file graph only — no symbols for this file, so no line spans or tests)`);
  const max = Number(depth) || 32;
  const seen = new Set([file]);
  let frontier = [file];
  for (let hop = 1; hop <= max && frontier.length; hop++) {
    const next = [...new Set(frontier.flatMap((f) => [...(readAtlasImporters(root, f) || [])]))]
      .filter((f) => !seen.has(f))
      .sort();
    if (!next.length) break;
    console.log(hop === 1 ? `importers (${next.length})` : `depth ${hop} (${next.length})`);
    for (const f of next) { seen.add(f); console.log(`  ${f}`); }
    frontier = next;
  }
  if (seen.size === 1) console.log('no importers in the file graph.');
  // Import edges are all the file graph has. A stylesheet linked from HTML or a class name
  // used in markup is a reference it cannot see, so say where to look rather than imply "safe".
  console.log(`\nnot covered: references by name (<link>, <script>, class names). Check with: grep -rn "${path.basename(file)}" .`);
}

function cmdImpact(root, { atlas, scalpel }, key, depth) {
  if (!scalpel) die('symbol graph engine missing — it provides the symbol-level answer');
  const file = path.relative(root, path.resolve(root, key)).split(path.sep).join('/');
  const target = resolveTarget(scalpel, root, key, (msg) =>
    (atlas && fs.existsSync(path.resolve(root, key)) && readAtlasImporters(root, file) !== null ? null : die(msg)));
  if (!target) return fileGraphImpact(root, file, depth);
  // Record the file this answer covers, so the pre-edit hook can tell an edit that was
  // analysed from one that was not. Best-effort: a read-only temp dir must not fail impact.
  try { fs.appendFileSync(impactLogPath(root), `${Date.now()} ${target.path}\n`); } catch { /* gate falls back to blocking */ }

  // 1. Scalpel's report, passed through verbatim — it is budgeted, carries
  //    confidence labels and the test list, and must not be re-implemented here.
  const args = ['impact', target.id, '--up'];
  if (depth) args.push('--depth', depth);
  const report = run(scalpel, args, root);
  process.stdout.write(report);

  // 2. Cross-check. Every repo-relative path scalpel printed is a file it reached.
  if (!atlas) {
    console.log('\ncross-check: skipped (file graph engine missing — no blind-spot triage)');
    return;
  }
  const importers = readAtlasImporters(root, target.path);
  if (importers === null) {
    console.log(`\ncross-check: skipped (the file graph has no node for ${target.path} — rescan?)`);
    return;
  }
  const covered = new Set(report.match(/[\w./-]+\.[A-Za-z]\w*/g) || []);
  const delta = [...importers].filter((f) => !covered.has(f) && f !== target.path).sort();

  console.log('');
  // `covered` is scraped from scalpel's report, which is capped at 600 tokens. When it
  // truncates, files scalpel DID reach are absent from the scrape and appear below as
  // phantom blind spots. Say so rather than hand over a list that is quietly padded.
  if (report.includes(' more (narrow with --depth')) {
    console.log('note: the symbol report was truncated — this list may over-report.');
    console.log('      re-run with a smaller --depth for an exact cross-check.');
  }
  if (!delta.length) {
    console.log('cross-check: clean — every importer the file graph sees is accounted for.');
    return;
  }
  console.log(`cross-check (${delta.length}) — the file graph sees these importing ${target.path},`);
  if (target.id.startsWith('mod:')) {
    // File altitude: both sides are import graphs, so the "imports some other name"
    // case cannot arise. A delta entry means scalpel's resolver dropped an import
    // atlas resolved — an alias, a re-export, or a dynamic import. All are real.
    console.log('but the symbol graph did not resolve that import. Each is a REAL dependent whose');
    console.log('import could not be resolved (alias, re-export, dynamic import).');
    for (const f of delta) console.log(`  ${f}`);
    console.log('');
    console.log(`resolve by opening each file and finding the import of ${target.path}.`);
    return;
  }
  console.log('but symbol analysis did not reach them. Each is one of:');
  console.log('  (a) a dynamic call symbol analysis cannot resolve  -> a REAL dependent');
  console.log(`  (b) an import of some other name from ${path.basename(target.path)} -> ignore`);
  for (const f of delta) console.log(`  ${f}`);
  console.log(`\nresolve with: grep -n "${target.name}" <file>`);
}

// --- passthrough ------------------------------------------------------------
// sextant is the only CLI a user of this skill learns. Commands it does not own are
// forwarded, unchanged, to whichever engine owns that answer -- so nothing is lost by
// never calling the engines directly, and there is no second command surface to explain.
// Flags and output are the engine's; only the name on the front is sextant's.
const ROUTE = {
  // file graph: modules, imports, git and issue overlays, orientation
  query: 'atlas', context: 'atlas', neighbors: 'atlas', path: 'atlas',
  expand: 'atlas', issues: 'atlas', verify: 'atlas', prune: 'atlas', index: 'atlas',
  'git-overlay': 'atlas',
  // symbol graph: spans, definitions, drift
  locate: 'scalpel', slice: 'scalpel', brief: 'scalpel', check: 'scalpel',
};

const GRAPH_NAME = { atlas: 'file', scalpel: 'symbol' };

function cmdPassthrough(root, found, cmd, rest, which = ROUTE[cmd]) {
  const tool = found[which];
  if (!tool) die(`the ${GRAPH_NAME[which]} graph engine is missing -- see \`sextant status\``);
  process.stdout.write(run(tool, [cmd, ...rest], root, { merge: true }));
}

// `note` exists on both engines and means different things: a symbol note is anchored to
// a source hash and survives a move, a file note is a summary or an edge in the file
// graph. Guessing between them from the arguments would be a coin flip, so the altitude
// is named -- the same symbol/file split `impact` already uses.
function cmdNote(root, found, rest) {
  const at = rest[0];
  if (at === 'symbol') return cmdPassthrough(root, found, 'note', rest.slice(1), 'scalpel');
  if (at === 'file') return cmdPassthrough(root, found, 'note', rest.slice(1), 'atlas');
  die([
    'usage: sextant note symbol set <key> --text "..."',
    '       sextant note file set-summary <path> --text "..."',
    '       sextant note file edge <a> <b> --type <t>',
  ].join('\n'));
}

function cmdStats(root, { atlas, scalpel }) {
  if (scalpel) { console.log('symbol graph'); process.stdout.write(run(scalpel, ['stats'], root, { merge: true })); }
  if (atlas) { console.log('\n' + 'file graph'); process.stdout.write(run(atlas, ['stats'], root, { merge: true })); }
}

// The orientation card, printed rather than pointed at: a path into a store directory is
// one more thing to remember, and reading this is the first move of a session.
function cmdMap(root) {
  const f = path.join(root, '.atlas', 'MAP.md');
  if (!fs.existsSync(f)) die('no orientation card yet. Run: sextant scan');
  process.stdout.write(fs.readFileSync(f, 'utf8'));
}

// --- main -------------------------------------------------------------------

const argv = process.argv.slice(2);
if (!argv.length || argv[0] === '--help' || argv[0] === '-h') {
  console.log(HELP);
  process.exit(0);
}
const flag = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : null;
};
const root = path.resolve(flag('--root') || process.cwd());
if (!fs.existsSync(root)) die(`no such root: ${root}`);
const found = tools(root);
const cmd = argv[0];
const rest = argv.slice(1);
const positional = rest.filter((a, i) => {
  if (a.startsWith('--')) return false;
  return !(i > 0 && ['--root', '--depth', '--out'].includes(rest[i - 1]));
});

if (cmd === 'scan') cmdScan(root, found);
else if (cmd === 'status') cmdStatus(root, found);
else if (cmd === 'view') await cmdView(root, found, flag('--out'));
else if (cmd === 'impact') {
  if (!positional.length) die('usage: sextant impact <name|id>');
  cmdImpact(root, found, positional[0], flag('--depth'));
} else if (cmd === 'map') cmdMap(root);
else if (cmd === 'note') cmdNote(root, found, rest);
else if (cmd === 'stats') cmdStats(root, found);
else if (ROUTE[cmd]) cmdPassthrough(root, found, cmd, rest);
else die(`unknown command "${cmd}"\n\n${HELP}`);
