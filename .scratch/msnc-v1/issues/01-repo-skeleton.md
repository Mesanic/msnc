# 01: Repo skeleton, marketplace and plugin manifest

**What to build:** An installable, valid, still-empty MSNC. It has:
- an MIT license for Mesanic
- a marketplace named `msnc` that lists one plugin named `msnc`
- a plugin manifest: name, version `0.1.0`, description "More Signal, No Clutter", author Mesanic, repository `https://github.com/Mesanic/msnc`, license
- three `userConfig` options:
  - `clear`: default on
  - `trim_default`: choices off, lite, full, ultra; default off
  - `scope_gate`: default on
- a README stub and a `.gitignore`
- a `package.json` with no dependencies: `npm test` runs `node --test`, and `npm run check` runs `node --check` over every `.mjs` file as the typecheck stand-in

Use `userConfig` field types the docs actually support.

**Context:**
- Spec sections "Distribution", "Clear is on by default" and "Trim is ponytail".
- https://code.claude.com/docs/en/plugins-reference.md (manifest, "User configuration")
- https://code.claude.com/docs/en/plugin-marketplaces.md

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `claude plugin validate .` passes at the repo root.
- [ ] The three options exist with the stated defaults and show as `/config` rows.
- [ ] LICENSE is MIT with "Copyright (c) 2026 Mesanic".
- [ ] `npm test` and `npm run check` both exit 0 on the skeleton.
