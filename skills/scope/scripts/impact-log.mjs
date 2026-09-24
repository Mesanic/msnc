// Where `sextant impact` records what it answered for, and where the pre-edit hook looks.
// In the repo's .atlas/overlays/, not the OS temp dir: a sandboxed Bash has its own TMPDIR
// while the hook runs outside the sandbox, so a temp-dir log is never seen by the gate. The
// repo is the one place both can reach. overlays/ is machine state that scan keeps
// gitignored (it re-adds the rule on every scan), so the log is never committed by accident.
import fs from 'node:fs';
import path from 'node:path';

export const IMPACT_TTL_MS = (Number(process.env.SEXTANT_IMPACT_TTL_MIN) || 120) * 60 * 1000;

export function impactLogPath(root) {
  return path.join(root, '.atlas', 'overlays', 'impact.log');
}

// Best-effort: a read-only tree must not fail impact; the gate then keeps blocking.
// mkdir because overlays/ is gitignored, so a fresh clone with a tracked .atlas/graph lacks it.
export function recordImpact(root, file) {
  try {
    fs.mkdirSync(path.dirname(impactLogPath(root)), { recursive: true });
    fs.appendFileSync(impactLogPath(root), `${Date.now()} ${file}\n`);
  } catch { /* gate falls back to blocking */ }
}
