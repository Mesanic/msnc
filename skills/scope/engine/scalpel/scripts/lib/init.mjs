import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  MAP_DIRNAME,
  META_FILE,
  SCHEMA_VERSION,
  TOOL_ID,
  mapDirFor,
  ledgerDirFor,
  storeDirFor,
} from './store.mjs';
import { LEDGER_SCHEMA_VERSION, NOTES_FILE } from './ledger.mjs';
import { toPosix } from './util.mjs';

export const GITIGNORE_LINE = '.map/index/';

export const HOOK_SNIPPET = Object.freeze([
  '# sextant pre-commit hook — paste into .git/hooks/pre-commit (or your hook manager)',
  'node tools/sextant/scripts/sextant.mjs check || exit 1',
]);

/**
 * Initialize the .map/ skeleton (idempotent):
 *   .map/index/            — store dir (+ placeholder meta.json if absent)
 *   .map/ledger/           — notes dir (+ empty notes.jsonl if absent)
 *   .gitignore             — gains `.map/index/`; `.map/ledger/` stays tracked
 *
 * Never clobbers existing meta.json / notes.jsonl / .gitignore content.
 */
export async function initProject(rootAbs) {
  const indexDir = storeDirFor(rootAbs);
  const ledDir = ledgerDirFor(rootAbs);
  await mkdir(indexDir, { recursive: true });
  await mkdir(ledDir, { recursive: true });

  const notesPath = path.join(ledDir, NOTES_FILE);
  let notesCreated = false;
  try {
    await writeFile(notesPath, '', { flag: 'wx' });
    notesCreated = true;
  } catch (err) {
    if (!err || err.code !== 'EEXIST') throw err;
  }

  const metaPath = path.join(indexDir, META_FILE);
  let metaWritten = false;
  try {
    const placeholder = {
      _: 'meta',
      schemaVersion: SCHEMA_VERSION,
      tool: TOOL_ID,
      placeholder: true,
      complete: false,
    };
    await writeFile(metaPath, `${JSON.stringify(placeholder)}\n`, { flag: 'wx' });
    metaWritten = true;
  } catch (err) {
    if (!err || err.code !== 'EEXIST') throw err;
  }

  const gitignorePath = path.join(rootAbs, '.gitignore');
  let gitignore = null;
  try {
    gitignore = await readFile(gitignorePath, 'utf8');
  } catch (err) {
    if (!err || err.code !== 'ENOENT') throw err;
  }

  let gitignoreStatus = 'present';
  let wholesaleMapIgnore = false;
  if (gitignore === null) {
    await writeFile(gitignorePath, `${GITIGNORE_LINE}\n`);
    gitignoreStatus = 'created';
  } else {
    const lines = gitignore.split('\n').map((l) => l.trim());
    wholesaleMapIgnore = lines.some((l) => l === MAP_DIRNAME || l === `${MAP_DIRNAME}/`);
    const alreadyIgnored = lines.some(
      (l) => l === GITIGNORE_LINE || l === GITIGNORE_LINE.replace(/\/$/, ''),
    );
    // wholesaleMapIgnore means the repo ignores `.map/` entirely -- appending the narrower
    // `.map/index/` under it changes nothing except leaving .gitignore dirty after a scan.
    if (!alreadyIgnored && !wholesaleMapIgnore) {
      let out = gitignore;
      if (out.length > 0 && !out.endsWith('\n')) out += '\n';
      out += `${GITIGNORE_LINE}\n`;
      await writeFile(gitignorePath, out);
      gitignoreStatus = 'appended';
    }
  }

  return {
    mapDirPosix: toPosix(mapDirFor(rootAbs)),
    ledgerSchemaVersion: LEDGER_SCHEMA_VERSION,
    notesCreated,
    metaWritten,
    gitignoreStatus,
    wholesaleMapIgnore,
  };
}
