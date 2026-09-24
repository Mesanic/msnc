// Usage: node scripts/sync-upstream.mjs --check   (checking is the only mode)
// Compares every copied folder, and THIRD_PARTY_NOTICES.md, against its upstream at the pinned commit (vendor.json).
// Read-only: upstreams are fetched into a temp dir; nothing in this repo is ever written. Exit 1 on any difference.
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const norm = (s) => s.replace(/\r\n/g, '\n');
const read = (p) => norm(readFileSync(p, 'latin1'));

// Files under dir as '/'-separated relative paths; the folder's own credit files and a checkout's .git are not upstream content.
const files = (dir) =>
  existsSync(dir)
    ? readdirSync(dir, { recursive: true, withFileTypes: true })
        .filter((e) => e.isFile())
        .map((e) => relative(dir, join(e.parentPath, e.name)).replaceAll('\\', '/'))
        .filter((f) => f !== 'LICENSE' && f !== 'UPSTREAM.md' && !f.startsWith('.git/'))
    : [];

// A single upstream file (an upstream command) is copied as the folder's SKILL.md.
function diffDirs(upDir, localDir) {
  const single = existsSync(upDir) && statSync(upDir).isFile();
  const upFile = (f) => (single ? upDir : join(upDir, f));
  const up = new Set(single ? ['SKILL.md'] : files(upDir));
  const local = new Set(files(localDir));
  const out = [];
  for (const f of [...new Set([...up, ...local])].sort()) {
    if (!local.has(f)) out.push(`upstream only: ${f}`);
    else if (!up.has(f)) out.push(`local only: ${f}`);
    else if (read(upFile(f)) !== read(join(localDir, f))) out.push(`changed: ${f}`);
  }
  return out;
}

// entry: one vendor.json item; upstreamDir: its checkout at entry.commit; notices: THIRD_PARTY_NOTICES.md text.
export function checkUpstream(entry, upstreamDir, localRoot, notices) {
  const lines = [];
  if (!norm(notices).includes(norm(readFileSync(join(upstreamDir, 'LICENSE'), 'utf8')).trim()))
    lines.push('LICENSE text missing from THIRD_PARTY_NOTICES.md');
  const paths = Object.entries(entry.paths);
  for (const [local, up] of paths)
    for (const d of diffDirs(join(upstreamDir, up), join(localRoot, local))) lines.push(`${local}: ${d}`);
  return lines.length ? lines : [paths.length ? 'in sync' : 'nothing copied yet'];
}

function git(cwd, ...args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
  if (r.status !== 0) throw new Error((r.stderr || r.error?.message || `git ${args[0]} failed`).trim());
}

// Shallow, blob-filtered fetch of the pinned commit; only LICENSE and the copied paths are checked out.
function fetchUpstream({ repo, commit, paths }, dir) {
  git(dir, 'init', '-q');
  git(dir, 'remote', 'add', 'origin', `https://github.com/${repo}`); // named remote so checkout can lazy-load blobs
  git(dir, 'fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', commit);
  // Sparse + full checkout, not `checkout -- <paths>`: only a full checkout lazy-loads the filtered blobs.
  // No trailing slash: a path may be a file. '.' is the whole repo.
  git(dir, 'sparse-checkout', 'set', '--no-cone', '/LICENSE', ...Object.values(paths).map((p) => (p === '.' ? '/*' : `/${p}`)));
  git(dir, 'checkout', '-q', 'FETCH_HEAD');
}

if (import.meta.main) {
  const root = join(import.meta.dirname, '..');
  const vendor = JSON.parse(readFileSync(join(root, 'vendor.json'), 'utf8'));
  const notices = readFileSync(join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8');
  let differs = false;
  for (const entry of vendor) {
    const tmp = mkdtempSync(join(tmpdir(), 'msnc-sync-'));
    let lines;
    try {
      fetchUpstream(entry, tmp);
      lines = checkUpstream(entry, tmp, root, notices);
    } catch (e) {
      lines = [`fetch failed: ${e.message}`];
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
    differs ||= lines.some((l) => l !== 'in sync' && l !== 'nothing copied yet');
    console.log(`${entry.repo} @ ${entry.commit.slice(0, 7)} (${entry.ref})`);
    for (const l of lines) console.log(`  ${l}`);
  }
  process.exit(differs ? 1 : 0);
}
