# 01: Publish Mesanic/msnc and the sextant fixes

**What to build:** MSNC is public and installable from GitHub.
- Create `Mesanic/msnc` and push.
- Tag `v0.1.0`.
- Push the two sextant fixes from msnc-v1 ticket 07 to `Mesanic/sextant`, and point the vendor manifest at the resulting commit.

**Blocked by:** every ticket in `.scratch/msnc-v1/`

**Status:** ready-for-human

- [ ] `/plugin marketplace add Mesanic/msnc` then `/plugin install msnc@msnc` works on a machine that never had MSNC.
- [ ] `node scripts/sync-upstream.mjs --check` reports sextant in sync with the pushed commit.
