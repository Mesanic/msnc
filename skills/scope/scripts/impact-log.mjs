// Where `sextant impact` records what it answered for, and where the pre-edit hook looks.
// In the OS temp dir, not the repo: it is machine state with a lifetime of hours, and a
// gitignored file in every project is a file someone eventually commits by accident.
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

export const IMPACT_TTL_MS = (Number(process.env.SEXTANT_IMPACT_TTL_MIN) || 120) * 60 * 1000;

export function impactLogPath(root) {
  const key = crypto.createHash('sha256').update(path.resolve(root)).digest('hex').slice(0, 12);
  return path.join(os.tmpdir(), `sextant-impact-${key}.log`);
}
