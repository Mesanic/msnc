import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (p) => readFileSync(fileURLToPath(new URL(`../${p}`, import.meta.url)), 'utf8').replace(/\r\n/g, '\n');
const skills = readdirSync(new URL('../skills', import.meta.url), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
const frontmatter = (name) => /^---\n([\s\S]*?)\n---\n/.exec(read(`skills/${name}/SKILL.md`))[1];

// Spec "Invocation": these stay model-invoked (short descriptions loaded); every other skill is typed-only.
const MODEL_INVOKED = ['trim', 'grill', 'tdd', 'codebase-design', 'scope'];

test('each skill is named after its folder and is model-invoked or typed-only per the spec', () => {
  assert.ok(skills.includes('trim'));
  for (const name of skills) {
    const fm = frontmatter(name);
    assert.match(fm, new RegExp(`^name: ${name}$`, 'm'), name);
    assert.equal(/^disable-model-invocation: true$/m.test(fm), !MODEL_INVOKED.includes(name), name);
  }
});

test('Relay ships grill, tdd and codebase-design model-invoked; spec, tickets and implement typed-only', () => {
  for (const name of ['grill', 'tdd', 'codebase-design']) assert.doesNotMatch(frontmatter(name), /disable-model-invocation/, name);
  for (const name of ['spec', 'tickets', 'implement']) assert.match(frontmatter(name), /^disable-model-invocation: true$/m, name);
  assert.match(frontmatter('grill'), /grill|stress-test/);
});

test('Calibrate, Proof and the helpers ship as seven typed-only skills', () => {
  for (const name of ['aside', 'rephrase', 'handoff', 'verify', 'doctor', 'declutter', 'setup'])
    assert.match(frontmatter(name), /^disable-model-invocation: true$/m, name);
});

test('setup shows every settings change and writes only after a yes, and pins no model itself', () => {
  const body = read('skills/setup/SKILL.md');
  assert.match(body, /Before changing any file.*show the exact change/);
  assert.match(body, /anything but yes → write nothing/);
  assert.match(body, /one yes per change/i);
  for (const s of ['`clear`', '`trim_default`', '`scope_gate`', '`pace` (default 3)', 'context-mode', 'ctx_purge', 'ctx_upgrade', 'docs/agents/issue-tracker.md', '/msnc:scope init', 'CLAUDE_CODE_SUBAGENT_MODEL', 'claude-opus-5-5'])
    assert.ok(body.includes(s), s);
  assert.match(body, /MSNC itself pins no model/);
});

test('setup\'s local tracker template is this repo\'s tracker file without its feature list', () => {
  const repo = read('docs/agents/issue-tracker.md').replace(/## Current features\n[\s\S]*?\n(?=## )/, '');
  assert.equal(read('skills/setup/issue-tracker-local.md'), repo);
});

// Spec "A why in every delegation" (ticket 14): each ticket's Why links a user story; none → not published.
test('tickets gives every ticket a Why line linked to a user story and refuses to publish one without it', () => {
  const body = read('skills/tickets/SKILL.md');
  const local = /<local-ticket-template>([\s\S]*?)<\/local-ticket-template>/.exec(body)[1];
  const issue = /<issue-template>([\s\S]*?)<\/issue-template>/.exec(body)[1];
  assert.match(local, /^\*\*Why:\*\* User story <N>\. /m, 'local template');
  assert.match(issue, /^## Why\n\nUser story <N>\. /m, 'issue template');
  assert.match(body, /- \*\*Why\*\*: the user story it serves/, 'shown in the quiz');
  assert.match(body, /Never publish a ticket without a Why line linked to a user story/);
});

test('rephrase uses CONTEXT.md only when the repo has one', () => {
  assert.match(read('skills/rephrase/SKILL.md'), /when the repo has a `CONTEXT\.md`, use its ubiquitous language/);
});

test('verify adds sextant check only in a repo with a Scope index', () => {
  const body = read('skills/verify/SKILL.md');
  assert.match(body, /Only when the repo has a Scope index \(`\.atlas\/` exists\)/);
  assert.match(body, /sextant check/);
  assert.match(body, /No `\.atlas\/` → report Scope as SKIPPED/);
});

test('doctor runs its script and only reads; declutter moves to trash first and asks per item', () => {
  const doctor = read('skills/doctor/SKILL.md');
  assert.match(doctor, /node "\$\{CLAUDE_SKILL_DIR\}\/doctor\.mjs"/);
  assert.match(doctor, /Doctor only reads\. It never edits/);
  const declutter = read('skills/declutter/SKILL.md');
  assert.match(declutter, /Every candidate gets its own `\[y\/n\/skip\]` confirmation\. No "yes to all" shortcut\./);
  assert.match(declutter, /move to `~\/\.claude\/_gc_trash\/`/);
  assert.match(declutter, /Only hard-delete when the user explicitly asks\./);
});

test('implement stops with a message, never waits, outside a git repo or with uncommitted changes', () => {
  const body = read('skills/implement/SKILL.md');
  assert.match(body, /^- Not inside a git repo.*→ stop: say/im);
  assert.match(body, /^- Uncommitted changes.*→ stop and ask/im);
  assert.match(body, /never (hang|wait)/i);
});

test('implement runs one foreground msnc:implementer per ticket and uses the Scope index when present', () => {
  const body = read('skills/implement/SKILL.md');
  assert.match(body, /ONE `msnc:implementer` subagent in the foreground/);
  assert.match(body, /\/msnc:scope init/);
  assert.match(body, /sextant impact/);
  assert.match(body, /sextant check/);
});

test('implement builds a missing Scope index only in a repo that uses Scope, committed on its own', () => {
  const body = read('skills/implement/SKILL.md');
  assert.match(body, /`\.gitignore` lists `\.atlas\/…` entries but `\.atlas\/` is missing → run `\/msnc:scope init`/);
  assert.match(body, /Neither → leave Scope alone/);
  assert.match(body, /then commit its output alone as `chore: build Scope index`/);
  assert.doesNotMatch(body, /^- Scope index:.*`\.atlas\/` missing → run/m);
});

test('implement rescans before each ticket\'s commit and stages the index in it, so the tree is clean after every commit', () => {
  const body = read('skills/implement/SKILL.md');
  const rescan = body.indexOf('rescan (`/msnc:scope init` again)');
  const commit = body.indexOf('Commit this ticket alone');
  assert.ok(rescan > 0 && rescan < commit, 'rescan comes before the commit step');
  assert.match(body, /stage the rescan's `\.atlas\/` and `\.map\/` changes/);
  assert.doesNotMatch(body, /rescan after the commit/i);
});

test('implement records the decisions made inside a ticket in its ## Comments and docs/decisions.md, in that ticket\'s commit', () => {
  const body = read('skills/implement/SKILL.md');
  assert.match(body, /decisions the subagent reported.*that ticket's `## Comments`.*`docs\/decisions\.md`.*`date · decision · why · undo`/);
  assert.match(body, /in the same commit/);
  assert.match(body, /needs an irreversible or destructive decision it doesn't make/);
  assert.match(body, /the one decision you need, with your recommended answer/);
});

// Spec "A why in every delegation" (ticket 14): history explains itself.
test('implement puts the ticket\'s why in each commit body, deriving it for a ticket without a Why line', () => {
  const body = read('skills/implement/SKILL.md');
  assert.match(body, /message `<feat\|fix\|refactor>: <ticket title>`, then a body line `Why: <the ticket's Why line>`/);
  assert.match(body, /No Why line \(older tickets\) → derive it from the user story the ticket or its spec links, else from its What to build/);
  assert.match(body, /`\*\*Why:\*\* … \(derived\)`/);
});

// Spec "Human pacing" (ticket 15): a stop offered every `pace` tickets; stopping writes a handoff.
test('implement offers a stop every pace tickets and stopping writes a handoff and shows the state line', () => {
  const body = read('skills/implement/SKILL.md');
  assert.ok(body.includes('`${user_config.pace}`'), 'pace from /config');
  assert.match(body, /`pace <n>` in the arguments overrides it for this run/);
  assert.match(body, /0 → never offer a stop/);
  assert.match(body, /every `pace` tickets done in this run, and another ticket is left/);
  assert.ok(body.includes('`${CLAUDE_SKILL_DIR}/../handoff/SKILL.md`'), 'handoff is typed-only: read, not invoked');
  assert.match(body, /Stop → write the handoff .*then show the state line and the handoff's path/);
  assert.match(frontmatter('implement'), /^argument-hint: .*pace <n>/m);
});

// Spec "Human pacing" (ticket 15): a failure improves the system; prevention is a recipe change.
const PREVENTION = /\*\*Prevention\*\*.*`\/msnc:refine <recipe>`.*recipe note/;

test('implement and verify report every failure as cause, fix and prevention', () => {
  const implement = read('skills/implement/SKILL.md');
  assert.match(implement, /Failing before you start → stop and report it as below/);
  assert.match(implement, /^- \*\*Cause\*\*: .*`file:line`, expected vs got/m);
  assert.match(implement, /^- \*\*Fix\*\*: .*recommended answer/m);
  assert.match(implement, PREVENTION);
  assert.match(implement, /Say what happened, not who did it/);
  const verify = read('skills/verify/SKILL.md');
  assert.match(verify, /1\. <cause> · <fix> · <prevention>/);
  assert.match(verify, PREVENTION);
  assert.match(read('skills/verify/UPSTREAM.md'), /^- Issues to Fix .*cause · fix · prevention/m);
});

// Spec "Decide to Decide" (ticket 13): one reply takes every recommendation; every accepted answer is logged.
test('grill offers "accept all" each round and logs every accepted answer in docs/decisions.md', () => {
  const body = read('skills/grill/SKILL.md');
  assert.match(body, /Close every round with: `Reply "accept all" to take every recommendation\.`/);
  assert.match(body, /"accept all" reply settles every question in the round with its recommended answer/);
  assert.match(body, /append each settled answer to `docs\/decisions\.md` as `date · decision · why · undo`/);
  assert.match(body, /create the file if missing/);
});

test('trim triggers on code work', () => {
  assert.match(frontmatter('trim'), /coding task: writing, adding, refactoring, fixing, reviewing, or designing/);
});

// Ticket 20: about 1 run in 10 (then 1 in 30) fixed a one-line bug with no Skill call. Upstream's description opens
// with what Trim does and names its trigger only in its fourth sentence; it now opens with when to load it.
test('trim description opens with loading before the first edit, one-line fixes included, as a local change', () => {
  assert.match(frontmatter('trim'), /^description: >\n  Load before the first edit of any code change, even a one-line fix\. Forces/m);
  assert.match(read('skills/trim/UPSTREAM.md'), /^- Trigger \(MSNC ticket 20\): .*"Load before the first edit of any code change, even a one-line fix\."/m);
  const changes = JSON.parse(read('vendor.json')).find((u) => u.repo === 'DietrichGebert/ponytail').changes;
  assert.ok(changes.some((c) => c.startsWith('trim: ') && c.includes('"Load before the first edit')), 'vendor.json change');
});

// Spec "A why in every delegation" (ticket 14): Trim asks for the why; a local change, so UPSTREAM.md lists it.
const TRIM_WHY = '- New file, dependency or abstraction? Ask why it has to exist and state the why in one line with the change. No why → don\'t add it.';

test('trim asks for the why behind every new file, dependency or abstraction, recorded as a local change', () => {
  assert.ok(read('skills/trim/SKILL.md').includes(`\n${TRIM_WHY}\n`), 'a Rules bullet');
  assert.match(read('skills/trim/UPSTREAM.md'), /^- Why rule \(MSNC ticket 14\): .*new file, dependency or abstraction/m);
});

// Ticket 18: upstream's "Complex request? Ship the lazy version" beat the Tuner's sizing line, so large work was
// built straight away. Trim keeps "never stall" for small work only; the Tuner alone says what large work does.
test('trim defaults open questions only in small work and leaves large work to the Tuner', () => {
  const skill = read('skills/trim/SKILL.md');
  assert.doesNotMatch(skill, /Complex request\?/, 'no push to ship a complex request');
  assert.match(skill, /^- Open question in a small task\? Ship the lazy version and question it in the same response,.* Never stall on an answer you can default\.$/m);
  assert.doesNotMatch(skill, /grill|\/msnc:spec|Large:/, 'the sizing rule lives in the Tuner only');
  assert.match(read('context/tuner.md'), /Large: \/msnc:grill → \/msnc:spec/);
  assert.match(read('skills/trim/UPSTREAM.md'), /^- Sizing \(MSNC ticket 18\): "Complex request\?" → "Open question in a small task\?"/m);
  const changes = JSON.parse(read('vendor.json')).find((u) => u.repo === 'DietrichGebert/ponytail').changes;
  assert.ok(changes.some((c) => c.startsWith('trim: ') && c.includes('"Open question in a small task?"')), 'vendor.json change');
});

// ponytail's hooks/ponytail-instructions.js at the pinned commit: drop the frontmatter, keep only this
// level's intensity-table row and worked example (`- <level>: "..."`), keep every other line.
function forLevel(skill, level) {
  const other = (label) => ['lite', 'full', 'ultra'].includes(label.trim().toLowerCase()) && label.trim().toLowerCase() !== level;
  return skill.replace(/^---[\s\S]*?---\s*/, '').split('\n').filter((line) => {
    const row = line.match(/^\|\s*\*\*(.+?)\*\*\s*\|/) || line.match(/^-\s*([^:]+):\s*"/);
    return !(row && other(row[1]));
  }).join('\n');
}

test('each level text is the trim skill filtered to that level, as ponytail injects it', () => {
  const skill = read('skills/trim/SKILL.md');
  for (const level of ['lite', 'full', 'ultra']) {
    const text = read(`skills/trim/levels/${level}.md`);
    assert.equal(text.trim(), `TRIM ACTIVE — level: ${level}\n\n${forLevel(skill, level)}`.trim(), level);
    for (const l of ['lite', 'full', 'ultra']) {
      assert.equal(text.includes(`| **${l}** |`), l === level, `${level}: intensity row ${l}`);
      assert.equal(text.includes(`\n- ${l}: "`), l === level, `${level}: example ${l}`);
    }
    assert.match(text, /Scope index → `sextant impact`; otherwise grep every caller/);
    assert.ok(text.includes(TRIM_WHY), `${level}: the why question`);
    assert.doesNotMatch(text, /^name:/m);
  }
});

test('scope is model-invoked with a short description and gives the CLI path, init mode and core loop', () => {
  const fm = frontmatter('scope');
  const description = /^description: (.+)$/m.exec(fm)[1];
  assert.ok(description.length <= 200, `${description.length} characters`);
  const body = read('skills/scope/SKILL.md');
  assert.ok(body.includes('node "${CLAUDE_SKILL_DIR}/scripts/sextant.mjs"'), 'CLI path');
  assert.match(body, /`\/msnc:scope init`/);
  assert.match(body, /\$ARGUMENTS/);
  // Each command written out in full: a `$S` shorthand gets turned into a shell variable that hides `sextant.mjs impact` (ticket 23).
  for (const cmd of ['map', 'query', 'locate', 'impact', 'slice', 'check', 'scan'])
    assert.ok(body.includes(`node "\${CLAUDE_SKILL_DIR}/scripts/sextant.mjs" ${cmd}`), cmd);
  assert.doesNotMatch(body, /\$S\b/, 'no $S shorthand');
  assert.match(body, /don't set a shell variable/i);
  assert.match(body, /no hooks? and no `CLAUDE\.md` block/i);
  assert.match(body, /CSS|HTML/);
});

test('scope: when the gate refusal cannot be cleared, the reply quotes the printed impact command with the file (ticket 24)', () => {
  const gate = read('skills/scope/SKILL.md').split('## The gate')[1];
  // Both dead ends: the command can't run, or it ran and the gate still refuses.
  assert.match(gate, /can't run/i);
  assert.match(gate, /still refuses/i);
  assert.match(gate, /quote the command the refusal printed/i);
  assert.ok(gate.includes('`node "…/sextant.mjs" impact src/router.ts`'), 'worked example with the file after impact');
});

// Record: spec "Record" and "ProcessDriven credit".
const CREDIT = 'principles inspired by [ProcessDriven](https://processdriven.co) by Layla Pomper';

test('record and refine ship typed-only and credit ProcessDriven without implying endorsement', () => {
  for (const name of ['record', 'refine']) {
    assert.match(frontmatter(name), /^disable-model-invocation: true$/m, name);
    const body = read(`skills/${name}/SKILL.md`);
    assert.ok(body.includes(CREDIT), `${name}: credit line`);
    assert.match(body, /ProcessDriven® is a registered trademark/, name);
    assert.match(body, /not affiliated with or endorsed by/, name);
  }
});

test('record drafts a typed-only recipe with why, when to use, steps and done-check, and writes nothing before a yes', () => {
  const body = read('skills/record/SKILL.md');
  for (const s of ['**Why:**', '**When to use:**', '## Steps', '## Done-check', 'disable-model-invocation: true'])
    assert.ok(body.includes(s), s);
  assert.match(body, /one path to one outcome/i);
  assert.match(body, /Show the full draft/);
  assert.match(body, /Write nothing before the user says yes/);
  assert.match(body, /anything but yes → write nothing/);
  assert.ok(body.includes('.claude/skills/<name>/SKILL.md'), 'project path');
  assert.ok(body.includes('~/.claude/skills/<name>/SKILL.md'), 'personal path on request');
  assert.match(body, /never overwrite/i);
});

test('refine reads context-mode memory or the transcripts, proposes exactly one change with evidence, and notes what the user does not own', () => {
  const body = read('skills/refine/SKILL.md');
  assert.ok(body.includes('`ctx_search`') && body.includes('sort: "timeline"'), 'context-mode source');
  assert.ok(body.includes('node "${CLAUDE_SKILL_DIR}/corrections.mjs"'), 'transcript fallback');
  assert.match(body, /exactly one change/i);
  assert.match(body, /as a diff/);
  assert.match(body, /quoted, with the kind \(correction.*when it happened/);
  assert.match(body, /Apply it only after a yes/);
  assert.ok(body.includes('.claude/msnc/notes/'), 'writes a note');
  assert.match(body, /Not the user's own: .*never edit it\. The fix goes into a recipe note instead/);
  assert.match(body, /`msnc:trim` → `\.claude\/msnc\/notes\/msnc\/trim\.md`/);
});

test('doctor explains the recipe-use lines', () => {
  const body = read('skills/doctor/SKILL.md');
  assert.match(body, /`Options:` MSNC's four options/);
  assert.match(body, /`Recipes unused 30\+ days:`/);
  assert.match(body, /`Most-corrected recipes:`/);
  assert.match(body, /\/msnc:refine/);
});
