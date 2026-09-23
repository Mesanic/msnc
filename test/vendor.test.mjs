import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { checkUpstream } from '../scripts/sync-upstream.mjs';

const MIT = 'MIT License\n\nCopyright (c) 2026 Sömeone\n\nPermission is hereby granted...\n';

const base = mkdtempSync(join(tmpdir(), 'msnc-test-'));
after(() => rmSync(base, { recursive: true, force: true }));

// Writes { 'rel/path': 'content' } under a fresh temp dir and returns it.
function fixture(files) {
  const root = mkdtempSync(join(base, 'f-'));
  for (const [p, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, p)), { recursive: true });
    writeFileSync(join(root, p), text);
  }
  return root;
}

const entry = (paths) => ({ repo: 'someone/thing', commit: 'a'.repeat(40), paths });

test('check reports "in sync" when the copy matches upstream apart from its LICENSE and UPSTREAM.md', () => {
  const up = fixture({ LICENSE: MIT, 'skills/x/SKILL.md': 'hi\n', 'skills/x/ref/a.md': 'a\n' });
  const local = fixture({
    'skills/y/SKILL.md': 'hi\r\n', // CRLF checkout on Windows is not a difference
    'skills/y/ref/a.md': 'a\n',
    'skills/y/LICENSE': MIT,
    'skills/y/UPSTREAM.md': 'notes\n',
  });
  assert.deepEqual(checkUpstream(entry({ 'skills/y': 'skills/x' }), up, local, `# Notices\n\n${MIT}`), ['in sync']);
});

test('check lists every differing file per copied folder', () => {
  const up = fixture({ LICENSE: MIT, 'a/SKILL.md': 'upstream text\n', 'a/new.md': 'added upstream\n', 'b/same.md': 's\n' });
  const local = fixture({ 'x/SKILL.md': 'our edit\n', 'x/ours.md': 'msnc only\n', 'y/same.md': 's\n' });
  assert.deepEqual(checkUpstream(entry({ x: 'a', y: 'b' }), up, local, MIT), [
    'x: changed: SKILL.md',
    'x: upstream only: new.md',
    'x: local only: ours.md',
  ]);
});

test('check compares a single upstream file (a command) with the copy folder\'s SKILL.md', () => {
  const up = fixture({ LICENSE: MIT, 'commands/aside.md': 'aside\n', 'commands/other.md': 'not copied\n' });
  const same = fixture({ 'skills/aside/SKILL.md': 'aside\r\n', 'skills/aside/LICENSE': MIT, 'skills/aside/UPSTREAM.md': 'n\n' });
  const edited = fixture({ 'skills/aside/SKILL.md': 'our aside\n', 'skills/aside/extra.md': 'x\n' });
  const aside = entry({ 'skills/aside': 'commands/aside.md' });
  assert.deepEqual(checkUpstream(aside, up, same, MIT), ['in sync']);
  assert.deepEqual(checkUpstream(aside, up, edited, MIT), ['skills/aside: changed: SKILL.md', 'skills/aside: local only: extra.md']);
});

test('check says "nothing copied yet" for an upstream with no copied paths', () => {
  assert.deepEqual(checkUpstream(entry({}), fixture({ LICENSE: MIT }), fixture({}), MIT), ['nothing copied yet']);
});

test('check flags a notices file that lacks the upstream LICENSE text verbatim', () => {
  const up = fixture({ LICENSE: MIT });
  const altered = MIT.replace('2026 Sömeone', '2026 Someone Else');
  assert.deepEqual(checkUpstream(entry({}), up, fixture({}), `# Notices\n\n${altered}`), [
    'LICENSE text missing from THIRD_PARTY_NOTICES.md',
  ]);
  assert.deepEqual(checkUpstream(entry({}), up, fixture({}), MIT.replaceAll('\n', '\r\n')), ['nothing copied yet']);
});

// Every folder vendor.json says was copied must carry the upstream LICENSE and an UPSTREAM.md naming repo and commit.
function missingCredits(root, upstreams) {
  const out = [];
  for (const { repo, commit, paths } of upstreams)
    for (const dir of Object.keys(paths)) {
      if (!existsSync(join(root, dir, 'LICENSE'))) out.push(`${dir}/LICENSE`);
      const md = join(root, dir, 'UPSTREAM.md');
      const notes = existsSync(md) && readFileSync(md, 'utf8');
      if (!notes) out.push(`${dir}/UPSTREAM.md`);
      else if (!notes.includes(repo) || !notes.includes(commit))
        out.push(`${dir}/UPSTREAM.md does not name ${repo} @ ${commit}`);
    }
  return out;
}

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const vendor = JSON.parse(readFileSync(join(repoRoot, 'vendor.json'), 'utf8'));

test('every copied folder carries LICENSE and UPSTREAM.md', () => {
  assert.deepEqual(missingCredits(repoRoot, vendor), []);
});

test('the credit rule goes red when a copied folder lacks LICENSE or UPSTREAM.md', () => {
  const c = 'b'.repeat(40);
  const root = fixture({
    'good/LICENSE': MIT, 'good/UPSTREAM.md': `someone/thing @ ${c}`,
    'nolicense/UPSTREAM.md': `someone/thing @ ${c}`,
    'nonotes/LICENSE': MIT,
    'stale/LICENSE': MIT, 'stale/UPSTREAM.md': `someone/thing @ ${'c'.repeat(40)}`,
  });
  const paths = { good: 'x', nolicense: 'x', nonotes: 'x', stale: 'x' };
  assert.deepEqual(missingCredits(root, [{ repo: 'someone/thing', commit: c, paths }]), [
    'nolicense/LICENSE',
    'nonotes/UPSTREAM.md',
    `stale/UPSTREAM.md does not name someone/thing @ ${c}`,
  ]);
});

test('THIRD_PARTY_NOTICES.md has a section per upstream with its copyright line and pinned commit', () => {
  const notices = readFileSync(join(repoRoot, 'THIRD_PARTY_NOTICES.md'), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(vendor.length, 5);
  for (const { repo, commit } of vendor) {
    assert.match(commit, /^[0-9a-f]{40}$/, `${repo}: pin a full commit sha`);
    const section = notices.split(/^## /m).find((s) => s.startsWith(`${repo}\n`));
    assert.ok(section, `no "## ${repo}" section`);
    assert.ok(section.includes(commit), `${repo}: section does not name ${commit}`);
    assert.match(section, /^Copyright \(c\) .+$/m, `${repo}: no copyright line`);
  }
});
