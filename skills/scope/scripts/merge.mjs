// merge.mjs — add scalpel's symbol tier to atlas's graph.
//
// Direction matters. Atlas's viewer is the full-featured one: node-type toggles, git
// state, tag facets, impact mode, flow, search over summaries. It also already reserves
// everything a symbol tier needs -- `sym` in its type/colour/label maps, `y` in its id
// prefixes, `calls` in its edge types -- and never fills them, because atlas does not
// extract symbols. Scalpel does. So scalpel's symbols go INTO atlas's graph, and the
// viewer needs no changes to show them.
//
//     mod ◀─part-of── file ◀─part-of── sym ──calls──▶ sym
//      (atlas)        (atlas)        (scalpel)
//
// The join is the file path: atlas file nodes carry it in `k`, scalpel module nodes in
// `path`, both repo-relative posix. A symbol hangs off the atlas file node it lives in,
// so atlas's existing overlays reach it -- a symbol in a modified file sits under a
// modified parent, and the tags that file carries are copied onto the symbol so the tag
// facet keeps working one tier down.

import fs from 'node:fs';
import path from 'node:path';

/** Scalpel kinds that are not worth a node of their own in a whole-project picture. */
const SKIP_KINDS = new Set(['module']);

function readJsonl(file, label, die) {
  if (!fs.existsSync(file)) die(`${label} missing (${file})`);
  return fs
    .readFileSync(file, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l, i) => {
      try {
        return JSON.parse(l);
      } catch {
        return die(`${label} corrupt at line ${i + 1}. Run: sextant scan`);
      }
    });
}

/**
 * Fold scalpel's symbols into an atlas graph, in place.
 *
 * @param {{nodes: Map, edges: Map}} atlasGraph  as returned by atlas's loadGraph
 * @returns {object} stats
 */
export function mergeIntoAtlas({ atlasGraph, scalpelDir, die }) {
  const sNodes = readJsonl(path.join(scalpelDir, 'nodes-000.jsonl'), 'scalpel nodes', die);
  const sEdges = readJsonl(path.join(scalpelDir, 'edges-000.jsonl'), 'scalpel edges', die);

  // --- the join -------------------------------------------------------------
  const atlasFileByPath = new Map();
  for (const n of atlasGraph.nodes.values()) {
    // `entry` is atlas's type for a configured entrypoint. It is a file node in every way
    // that matters here, and matching only `file` silently drops the symbols in exactly
    // the files whose symbols matter most.
    if ((n.t === 'file' || n.t === 'entry') && n.st !== 'dead') atlasFileByPath.set(n.k, n);
  }

  const symId = (id) => 'y' + id.split(':')[1];

  // Atlas keys its edge Map with store.mjs `edgeKey`: tab-separated, not pipe. Building a
  // pipe key here made every `has()` against atlas's own edges miss, so each file-tier edge
  // both tools knew about was re-added under a second key -- 149 duplicates on axiom-v2.
  const eKey = (a, type, b) => a + '\t' + type + '\t' + b;
  const scalpelById = new Map(sNodes.map((n) => [n.id, n]));
  const fileOfModule = new Map(); // scalpel module id -> atlas file node
  let unjoined = 0;

  for (const n of sNodes) {
    if (n.kind !== 'module') continue;
    const f = atlasFileByPath.get(n.path);
    if (f) fileOfModule.set(n.id, f);
    else unjoined++;
  }
  // Own the symbol by its own `path`, not by walking `contains` up to a module.
  // `contains` is hierarchical -- a method is contained by its CLASS, not by the file --
  // so a module-parent-only lookup silently drops every method and nested function.
  // Each node already records the file it came from, which is the answer directly.
  const ownerFile = new Map(); // scalpel symbol id -> atlas file node
  for (const n of sNodes) {
    if (n.kind === 'module') continue;
    const f = atlasFileByPath.get(n.path);
    if (f) ownerFile.set(n.id, f);
  }

  // --- degree, for node size ------------------------------------------------
  const degree = new Map();
  for (const e of sEdges) {
    if (e.type === 'contains') continue;
    degree.set(e.src, (degree.get(e.src) || 0) + 1);
    degree.set(e.dst, (degree.get(e.dst) || 0) + 1);
  }

  // --- (2) symbol nodes, connected ones only --------------------------------
  // A symbol with no call/heritage/test edge contributes exactly one `part-of` to its
  // file and nothing else. On one repo that was 732 of 1249 symbol nodes -- 59% of the
  // tier -- inflating the picture 3x while carrying no relational information. The file
  // node's `a` anchor list already renders that inventory as text in the inspector, so a
  // leaf symbol duplicates as a dot what the file already says in words.
  //
  // Connected symbols become nodes. Leaves are folded into their file's anchors, which
  // is what `a` is for. Nothing is lost; the graph shows structure instead of inventory.
  const ANCHOR_CAP = 40;
  const atlasSymByKey = new Map();
  for (const n of atlasGraph.nodes.values()) if (n.t === 'sym') atlasSymByKey.set(n.k, n);

  let added = 0;
  let folded = 0;
  let skippedNoFile = 0;
  const extraAnchors = new Map(); // atlas file node -> [[name, line], ...]

  for (const n of sNodes) {
    if (SKIP_KINDS.has(n.kind)) continue;
    const file = ownerFile.get(n.id);
    if (!file) {
      skippedNoFile++;
      continue;
    }
    const key = `${n.path}#${n.name}`;
    // Atlas parses exports into its own sym nodes with this identical key. Enrich that
    // node rather than adding a second dot for the same symbol.
    const existing = atlasSymByKey.get(key);
    if (existing) {
      if (!existing.s) existing.s = n.summary || n.sig || '';
      if (!existing.a || !existing.a.length) existing.a = [[n.name, n.span.sl]];
      existing.by = 'scalpel';
      continue;
    }
    if (!degree.get(n.id)) {
      if (!extraAnchors.has(file)) extraAnchors.set(file, []);
      extraAnchors.get(file).push([n.name, n.span.sl]);
      folded++;
      continue;
    }
    const id = symId(n.id);
    if (atlasGraph.nodes.has(id)) continue;
    atlasGraph.nodes.set(id, {
      id,
      t: 'sym',
      k: key,
      s: n.summary || n.sig || '',
      g: [...new Set([...(file.g || []), n.kind, n.lang].filter(Boolean))],
      a: [[n.name, n.span.sl]],
      w: Math.min(6, 1 + (degree.get(n.id) || 0) / 3),
      st: file.st === 'dead' ? 'dead' : null,
      by: 'scalpel',
    });
    added++;
  }

  // Merge folded symbols into their file's anchor list, sorted by line so the inspector
  // reads top-to-bottom. Capped: a 200-symbol file would otherwise bury the panel.
  let anchorsTruncated = 0;
  for (const [file, anchors] of extraAnchors) {
    const all = [...(file.a || []), ...anchors].sort((x, y) => x[1] - y[1]);
    if (all.length > ANCHOR_CAP) anchorsTruncated++;
    file.a = all.slice(0, ANCHOR_CAP);
  }

  // --- edges ----------------------------------------------------------------
  // Only types atlas's viewer already understands; `calls` and `part-of` are both in its
  // EDGE_TYPES, and part-of gets a shorter spring so symbols cluster tight to their file.
  const EDGE_MAP = { call: 'calls', extends: 'implements', implements: 'implements', tests: 'tested-by' };
  const edgeStats = { 'part-of': 0, calls: 0, implements: 0, 'tested-by': 0 };
  const put = (a, type, b) => {
    const key = eKey(a, type, b);
    if (atlasGraph.edges.has(key)) return false;
    atlasGraph.edges.set(key, [a, type, b]);
    edgeStats[type]++;
    return true;
  };

  for (const [sid, file] of ownerFile) {
    if (atlasGraph.nodes.has(symId(sid))) put(symId(sid), 'part-of', file.id);
  }
  for (const e of sEdges) {
    const type = EDGE_MAP[e.type];
    if (!type) continue;
    const a = symId(e.src);
    const b = symId(e.dst);
    if (!atlasGraph.nodes.has(a) || !atlasGraph.nodes.has(b) || a === b) continue;
    put(a, type, b);
  }

  // --- (1) test coverage ----------------------------------------------------
  // Scalpel's `tests` edges are module -> module (test FILE -> source FILE), not
  // symbol -> symbol. Routing them through symId dropped every one, which is why the
  // merged graph reported 0 of them while both stores had the data. Route them through
  // fileOfModule like imports, and the file tier gains the test edges atlas never saw.
  let testsAdded = 0;
  for (const e of sEdges) {
    if (e.type !== 'tests') continue;
    const a = fileOfModule.get(e.src);
    const b = fileOfModule.get(e.dst);
    if (!a || !b || a.id === b.id) continue;
    // Atlas's direction is source --tested-by--> test; scalpel's is test --tests--> source.
    const key = eKey(b.id, 'tested-by', a.id);
    if (atlasGraph.edges.has(key)) continue;
    atlasGraph.edges.set(key, [b.id, 'tested-by', a.id]);
    testsAdded++;
  }

  // --- imports atlas missed -------------------------------------------------
  // The reverse of the usual cross-check: scalpel resolved a file-to-file import that
  // atlas did not. Rare, but it is free to fold in and it is the same graph either way.
  let importsAdded = 0;
  for (const e of sEdges) {
    if (e.type !== 'import') continue;
    const a = fileOfModule.get(e.src);
    const b = fileOfModule.get(e.dst);
    if (!a || !b || a.id === b.id) continue;
    const key = eKey(a.id, 'imports', b.id);
    if (atlasGraph.edges.has(key)) continue;
    atlasGraph.edges.set(key, [a.id, 'imports', b.id]);
    importsAdded++;
  }

  // --- (1) connect the concept tier -----------------------------------------
  // Concepts are hand-written domain invariants -- the most expensive knowledge in the
  // repo to rediscover -- and on one project 14 of 17 had ZERO edges: recorded, never
  // linked, so no traversal could ever surface them. Their text is not prose-only; it
  // names issues (#55), symbols (LimitGuard, terminationStands) and files
  // (CONTEXT.md:203). Atlas already parses #N out of issue bodies; concepts never got
  // the same treatment. Extract the same references and the tier joins the graph.
  const conceptStats = { linked: 0, edges: 0, stillIsolated: 0 };
  {
    const issueByNum = new Map();
    const symByName = new Map();
    const fileByBase = new Map();
    for (const n of atlasGraph.nodes.values()) {
      if (n.t === 'issue') issueByNum.set(String(n.k).replace(/^#/, ''), n);
      else if (n.t === 'sym') {
        const nm = n.k.split('#')[1];
        // Ambiguous names link nowhere rather than link wrongly.
        if (nm) symByName.set(nm, symByName.has(nm) ? null : n);
      } else if (n.t === 'file' || n.t === 'entry') {
        const b = n.k.split('/').pop();
        if (b) fileByBase.set(b, fileByBase.has(b) ? null : n);
      }
    }
    const degreeOf = new Map();
    for (const e of atlasGraph.edges.values()) {
      degreeOf.set(e[0], (degreeOf.get(e[0]) || 0) + 1);
      degreeOf.set(e[2], (degreeOf.get(e[2]) || 0) + 1);
    }
    for (const c of atlasGraph.nodes.values()) {
      if (c.t !== 'concept') continue;
      const text = `${c.k} ${c.s || ''}`;
      const targets = new Set();
      for (const m of text.matchAll(/#(\d+)/g)) {
        const t = issueByNum.get(m[1]);
        if (t) targets.add(t.id);
      }
      // A filename with an extension, optionally followed by :line.
      for (const m of text.matchAll(/\b([\w.-]+\.[A-Za-z][\w]*)\b/g)) {
        const t = fileByBase.get(m[1]);
        if (t) targets.add(t.id);
      }
      // Identifiers: CamelCase or camelCase of at least 5 chars. Short/lowercase words
      // are ordinary prose and would link noise.
      for (const m of text.matchAll(/\b([A-Za-z][a-zA-Z0-9]{4,})\b/g)) {
        if (!/[a-z][A-Z]/.test(m[1])) continue;
        const t = symByName.get(m[1]);
        if (t) targets.add(t.id);
      }
      targets.delete(c.id);
      for (const t of targets) {
        const key = eKey(c.id, 'mentions', t);
        if (atlasGraph.edges.has(key)) continue;
        atlasGraph.edges.set(key, [c.id, 'mentions', t]);
        conceptStats.edges++;
      }
      if (targets.size) conceptStats.linked++;
      else if (!degreeOf.get(c.id)) conceptStats.stillIsolated++;
    }
  }

  // --- (3) make the module tier earn its place ------------------------------
  // `mod` nodes are path prefixes: every node's module is already derivable from its `k`,
  // and moduleDepth slicing produces pass-through links (a dir with no files of its own
  // and a single child) that restate the path twice. Two changes: drop the pass-throughs,
  // and give what remains an aggregate the path cannot carry -- how much code is in it,
  // and how much of that is under test.
  const modStats = { collapsed: 0, enriched: 0 };
  {
    const mods = new Map();
    for (const n of atlasGraph.nodes.values()) if (n.t === 'mod') mods.set(n.id, n);
    const childrenOf = new Map();
    const parentOf = new Map();
    for (const e of atlasGraph.edges.values()) {
      if (e[1] !== 'part-of' || !mods.has(e[2])) continue;
      if (!childrenOf.has(e[2])) childrenOf.set(e[2], []);
      childrenOf.get(e[2]).push(e[0]);
      parentOf.set(e[0], e[2]);
    }
    for (const [id, mod] of mods) {
      const kids = childrenOf.get(id) || [];
      const files = kids.filter((k) => !mods.has(k));
      const subs = kids.filter((k) => mods.has(k));
      // Pass-through: holds no files itself and forwards to exactly one child module.
      if (files.length === 0 && subs.length === 1) {
        const parent = parentOf.get(id);
        atlasGraph.nodes.delete(id);
        for (const [key, e] of [...atlasGraph.edges]) {
          if (e[0] !== id && e[2] !== id) continue;
          atlasGraph.edges.delete(key);
          if (!parent) continue;
          const a = e[0] === id ? parent : e[0];
          const b = e[2] === id ? parent : e[2];
          if (a !== b) atlasGraph.edges.set(eKey(a, e[1], b), [a, e[1], b]);
        }
        modStats.collapsed++;
        continue;
      }
      // Aggregate: files, symbols underneath them, and the tested fraction.
      let syms = 0;
      let tested = 0;
      for (const f of files) {
        const fn = atlasGraph.nodes.get(f);
        if (!fn) continue;
        syms += (fn.a || []).length;
        for (const e of atlasGraph.edges.values()) {
          if (e[1] === 'tested-by' && e[0] === f) { tested++; break; }
        }
      }
      mod.s = `${files.length} files · ${syms} symbols · ${files.length ? Math.round((tested / files.length) * 100) : 0}% have tests`;
      mod.w = Math.min(8, 1 + files.length / 4);
      modStats.enriched++;
    }
  }

  // --- (2) provenance -------------------------------------------------------
  // Which tool knows this node? The whole reason sextant exists is that the two stores
  // disagree, and until now that was invisible in the picture: every merged node just
  // said "scalpel" and every atlas node said "scan". Marking the JOIN explicitly gives
  // the viewer a third answer -- `both` -- and makes "what does only one tool see?" a
  // question the graph can answer.
  const joinedIds = new Set([...fileOfModule.values()].map((f) => f.id));
  const provenance = { atlas: 0, scalpel: 0, both: 0 };
  for (const n of atlasGraph.nodes.values()) {
    if (n.t === 'sym' && n.by === 'scalpel') n.src = 'scalpel';
    else if (joinedIds.has(n.id)) n.src = 'both';
    else n.src = 'atlas';
    provenance[n.src]++;
  }

  // --- (4) check lens -------------------------------------------------------
  // `scalpel check` writes drift/dangling/orphans/ambiguous to check-latest.json. Scalpel's
  // own viewer had a Change Lens tab for it; atlas's viewer has no concept of it, so
  // folding the state onto nodes is what lets the existing facet machinery show it.
  // Entries do not share one shape, hence pathOf.
  const check = readCheckLatest(scalpelDir);
  const checkCounts = { drift: 0, dangling: 0, orphan: 0, ambiguous: 0 };
  if (check) {
    const byPath = new Map();
    for (const n of atlasGraph.nodes.values()) {
      const p = n.t === 'sym' ? n.k.split('#')[0] : n.k;
      if (!byPath.has(p)) byPath.set(p, []);
      byPath.get(p).push(n);
    }
    // Worst state wins, so a file that both drifted and holds an orphan note reads as
    // drifted -- the more urgent fact.
    const RANK = { drift: 3, dangling: 2, orphan: 1, ambiguous: 1 };
    const flag = (p, state) => {
      for (const n of byPath.get(p) || []) {
        if (n.chk && RANK[n.chk] >= RANK[state]) continue;
        if (n.chk) checkCounts[n.chk]--;
        n.chk = state;
        checkCounts[state]++;
      }
    };
    const pathOf = (e) => e?.path || e?.sp || e?.ref?.path || e?.from?.path || null;
    for (const [key, state] of [['drift', 'drift'], ['dangling', 'dangling'], ['orphans', 'orphan'], ['ambiguous', 'ambiguous']]) {
      for (const e of check[key] || []) {
        const p = pathOf(e);
        if (p) flag(p, state);
      }
    }
  }

  // --- (5) notes ------------------------------------------------------------
  // Scalpel's ledger is the most durable knowledge in either store -- notes are anchored
  // to a source hash, so they survive a symbol moving. They never reached the graph.
  // Last record per key wins, matching how scalpel itself reads the ledger.
  const notes = readLedgerNotes(scalpelDir, die);
  const orphanKeys = new Set((check?.orphans || []).map((o) => o.key).filter(Boolean));
  let notesAttached = 0;
  let notesStale = 0;
  if (notes.size) {
    const byPathSpan = new Map();
    for (const n of atlasGraph.nodes.values()) {
      if (n.t === 'sym' && n.a && n.a.length) byPathSpan.set(`${n.k}`, n);
    }
    for (const note of notes.values()) {
      if (!note.path || !note.name) continue;
      const target = byPathSpan.get(`${note.path}#${note.name}`);
      if (!target) continue;
      // A note whose source hash no longer matches is an ORPHAN in scalpel's terms: it
      // still describes this symbol by name, but scalpel has not re-bound it and will
      // not until `check` rebinds. Show it, say it is unverified -- hiding it loses real
      // knowledge, presenting it as bound would overstate what scalpel actually asserts.
      const stale = orphanKeys.has(note.key);
      target.note = stale ? `(unbound — the code changed since this was written) ${note.text}` : note.text;
      target.g = [...new Set([...(target.g || []), stale ? 'stale-note' : 'has-note'])];
      if (stale) notesStale++;
      notesAttached++;
    }
  }

  return {
    symbols: added,
    foldedLeaves: folded,
    anchorsTruncated,
    concepts: conceptStats,
    mods: modStats,
    joinedFiles: fileOfModule.size,
    unjoinedModules: unjoined,
    skippedNoFile,
    edges: edgeStats,
    importsAdded,
    testsAdded,
    provenance,
    check: check ? { ...checkCounts, ran: true } : { ran: false },
    notesAttached,
    notesStale,
    scalpelNodes: scalpelById.size,
  };
}

/** `scalpel check` output. Absent or corrupt = no lens; never a hard failure. */
function readCheckLatest(scalpelDir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(scalpelDir, 'check-latest.json'), 'utf8'));
  } catch {
    return null;
  }
}

/** Ledger notes keyed by note key; append-only file, last record per key wins. */
function readLedgerNotes(scalpelDir, die) {
  const p = path.join(path.dirname(scalpelDir), 'ledger', 'notes.jsonl');
  if (!fs.existsSync(p)) return new Map();
  const out = new Map();
  const lines = fs.readFileSync(p, 'utf8').trim().split('\n').filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    let rec;
    try {
      rec = JSON.parse(lines[i]);
    } catch {
      die(`scalpel ledger corrupt at notes.jsonl:${i + 1}`);
    }
    if (rec.kind !== 'symbol' || !rec.key) continue;
    if (rec.op === 'del') out.delete(rec.key);
    else out.set(rec.key, rec);
  }
  return out;
}
