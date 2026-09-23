# 04: Move the five sextant repos onto Scope

**What to build:** Maji, Roundwell, Roundwell v2, Map v2 and Hackathon use MSNC's Scope instead of per-repo sextant copies. In each repo:
- remove the vendored `sextant`, `atlas` and `scalpel` skill folders
- remove sextant's project hooks and the `<!-- sextant:begin -->` block in `CLAUDE.md`
- run `/msnc:scope init` twice, which fully clears old skill nodes
- keep the `.atlas/` and `.map/` data

Hackathon keeps its local ECC install. Its `SEXTANT_HOOK=off` allow rule can go once the CSS/HTML fix is in.

**Blocked by:** 02

**Status:** ready-for-human

- [ ] `sextant impact` works in each repo through MSNC.
- [ ] No repo still contains a copied sextant engine or sextant hook entries.
