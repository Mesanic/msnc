# 10: README and docs

**What to build:** The public front door. It covers:
- what MSNC is (More Signal, No Clutter)
- the modules table
- the commands, grouped by phase
- install: `/plugin marketplace add Mesanic/msnc`, then `/plugin install msnc@msnc`, then `/msnc:setup`
- the three `/config` options and how to opt out of Clear
- the context-mode companion
- Windows notes
- two diagrams: when each skill loads, and which typed skill to use in each phase
- a "Built on" section crediting authors, with links and licenses
- the license

**Context:**
- The two diagrams drawn on 2026-09-23 in the planning session; recreate them as SVG or Mermaid.
- `.scratch/msnc-v1/spec.md`.

The README also covers Record (`/msnc:record`, `/msnc:refine`, recipe notes), sizing, Decide to Decide, the why rule and pacing. Credit them as "principles inspired by ProcessDriven by Layla Pomper", with a link and no implied endorsement.

**Blocked by:** 03, 04, 05, 06, 07, 08, 11, 12, 13, 14, 15

**Status:** done

- [x] Every command and option the README names exists in the plugin (the references test also covers README).
- [x] The credits name all five upstreams, with repo links and licenses.

## Comments

- 2026-09-23 · One ProcessDriven credit paragraph in "Built on" covers Record, recipe notes, sizing, Decide to Decide, the why rule and pacing; sizing is also credited to ECC orch-pipeline.
- Links: `Mesanic/msnc` doesn't exist yet (install works after rollout ticket 01); `Mesanic/sextant` is private, so its credit link 404s for readers until it's public.
- README's status section says evals haven't run and `/config` rows and hook `if` filters are unverified live. Mermaid diagrams not rendered yet.
- Fixed in passing: `skills/setup/SKILL.md` described `scope_gate` as search routing; now matches `plugin.json` (edit gate).
