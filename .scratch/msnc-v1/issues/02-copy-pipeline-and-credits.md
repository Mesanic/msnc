# 02: Copy pipeline, notices and credits

**What to build:** A repeatable way to copy upstream pieces with credit.
- **Vendor manifest.** One entry per upstream: repo, pinned full commit sha, copied paths, license, local changes.
- **Sync script.** Fetches each upstream at its pinned commit and reports differences against the copies. It never overwrites anything.
- **Notices file.** Holds each upstream license text and copyright line, copied verbatim from that upstream's LICENSE.
- **Per-folder rule.** Every copied folder carries the upstream LICENSE plus an `UPSTREAM.md` (repo, commit, date, what MSNC changed).

The upstreams are `DietrichGebert/ponytail`, `ayghri/i-have-adhd`, `mattpocock/skills`, `affaan-m/ECC` and `Mesanic/msnc-scope`. Pin each one to the commit you copy from. Use the latest release tag where one exists (ponytail: `v4.10.0`).

**Context:** local copies to compare against, already on this machine:
- ponytail 4.9.0: `C:\Users\User\.claude\plugins\cache\ponytail\ponytail\4.9.0\`
- i-have-adhd 0.3.0: `C:\Users\User\.claude\plugins\cache\i-have-adhd\i-have-adhd\0.3.0\`
- mattpocock/skills clone (HEAD `c55ee46`): `C:\Users\User\.claude\plugins\marketplaces\mattpocock\`
- ECC 2.2.0: `C:\Users\User\.claude\plugins\cache\ecc\ecc\2.2.0\`
- Scope v2.0.0 with the merge.mjs fix: `C:\Users\User\Desktop\AI Projects\Tool Comparison\tools\scope\`

**Blocked by:** 01

**Status:** done

- [x] `node scripts/sync-upstream.mjs --check` lists every upstream and reports "in sync" or the differing files.
- [x] The notices file contains all five upstream licenses with exact copyright lines.
- [x] A `node:test` case fails if any copied folder lacks LICENSE or UPSTREAM.md.
- [x] Runs with Node only, on Windows and POSIX.

## Comments

- 2026-09-23 · Pins: ponytail v4.10.0 `1d95ff7`, i-have-adhd main `839872f`, mattpocock/skills v1.2.3 `6acc160`, ECC v2.2.1 `5064474`, Scope main `2fa30a3` (private; reachable with local git credentials) · latest release tag per the ticket · move a pin in `vendor.json` and regenerate its notices section.
- mattpocock v1.2.3 differs from the local clone `c55ee46` in 13 files of the skills ticket 05 copies; ticket 05 copies from the pinned commit or moves the pin.
- `paths` entries are folders only; a single-file copy (ticket 12) needs a small change. Scope's own tree-sitter notices must travel with the engine in ticket 07.
- Sync/test code uses `import.meta.main` (Node 24.2+). Only run on Windows so far.
