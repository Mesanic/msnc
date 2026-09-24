# Upstream

- Repo: https://github.com/Mesanic/sextant (Mesanic, MIT, see `LICENSE`)
- Path: the repo root (`engine/`, `scripts/`, `THIRD-PARTY-NOTICES.md`)
- Commit: `2fa30a379e707e959cae398a80c553c063b2a0df` (main, v2.0.0, committed 2026-08-31)
- Copied: 2026-09-23

## This copy = pin + three patches

Upstream at the pin plus `patches/sextant/0001-*.patch`, `0002-*.patch` and `0003-*.patch` (repo root), not yet pushed to `Mesanic/sextant` (rollout ticket 01). Until they land and the pin moves, `sync-upstream --check` reports `scripts/impact-fallback.test.mjs` as local only, and part of the `scripts/sextant.mjs` change and all of the `scripts/impact-log.mjs` change come from them.

1. `impact` on a file only the file graph knows (CSS, HTML, anything without a grammar) answers from the file graph: its importers, transitively to `--depth`, marked `file graph only`, and records the impact entry, so the edit gate can clear. Before, impact died at `locate` and the gate could never clear. New test `scripts/impact-fallback.test.mjs`.
2. `scan --no-claude-md` (or `SEXTANT_NO_CLAUDE_MD=1`) skips the `CLAUDE.md` routing block.
3. The impact log moves from the OS temp dir to `.atlas/overlays/impact.log` (`scripts/impact-log.mjs`), and impact creates `overlays/` when it's missing. Sandboxed Bash has its own `TMPDIR` and the gate hook runs outside the sandbox, so a temp-dir log never cleared the gate (MSNC ticket 25). Every scan keeps `.atlas/overlays/` gitignored. Test: this repo's `test/scope.test.mjs` (impact and the gate with different temp dirs).

The local copy at `Tool Comparison/tools/sextant` is byte-identical to the pin, so its merge.mjs fix is already in the pin; no separate patch.

## Local changes

- `scripts/sextant.mjs` `cmdScan`: sets `SEXTANT_NO_HOOK` and `SEXTANT_NO_CLAUDE_MD`, so scan never writes project hooks or a `CLAUDE.md` block whatever flags it gets. MSNC's dispatcher (`hooks/msnc.mjs`) is the gate and Tuner is the routing.
- `SKILL.md` rewritten for MSNC: named `scope`, short model-invoked description, the CLI path via `${CLAUDE_SKILL_DIR}`, `/msnc:scope init`, the core loop, impact triage and the MSNC gate.
- The edit gate is rebuilt in `hooks/msnc.mjs` from `scripts/pre-edit-hook.mjs` (`bashTargets` and the lookup at lines 90-99). It imports this copy's `scripts/impact-log.mjs` for the log location.
- Not copied: `scripts/grep-nudge-hook.mjs` (dropped; Tuner carries that rule), `scripts/pre-edit-hook.mjs` (rebuilt in the dispatcher), `scripts/session-hook.mjs` (Tuner announces Scope), `README.md`, `.gitignore`, `.gitattributes`.
- `THIRD-PARTY-NOTICES.md` kept: the tree-sitter runtime and grammars under `engine/scalpel/scripts/vendor/` are MIT, each under its own copyright.
