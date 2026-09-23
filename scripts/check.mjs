// Typecheck stand-in: `node --check` every .mjs file outside node_modules and .git.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const files = readdirSync('.', { recursive: true })
  .filter((f) => f.endsWith('.mjs') && !/(^|[\\/])(node_modules|\.git)([\\/]|$)/.test(f));

let failed = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, ['--check', f], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}
console.log(`checked ${files.length} files, ${failed} failed`);
process.exit(failed ? 1 : 0);
