// Times the dispatcher on the path where nothing applies (an ordinary prompt), the one that runs
// on every message. Prints the first (cold) run, then the best of 10 warm runs. Target: under 100 ms.
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../hooks/msnc.mjs', import.meta.url));
const input = JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: 'timing', prompt: 'fix the login bug' });
const env = { ...process.env, CLAUDE_PLUGIN_DATA: mkdtempSync(join(tmpdir(), 'msnc-time-')) };

const once = () => {
  const t = performance.now();
  spawnSync(process.execPath, [script], { input, env });
  return performance.now() - t;
};
const cold = once();
const warm = Math.min(...Array.from({ length: 10 }, once));
console.log(`cold run: ${cold.toFixed(1)} ms, best warm: ${warm.toFixed(1)} ms (target < 100 ms)`);
