# Finish

1. **Learn.** Do this step only if the run had a correction, a failed retry or a reversed decision.
   - Write the lesson to `docs/solutions/<slug>.md`: the problem, how to see it, and the fix. Define reads this folder on the next run.
   - Suggest `/msnc:refine` for a recipe fix. Suggest `/msnc:record` when the full run is worth repeating.
2. **Commit** everything on the branch of the run, with `docs/decisions.md` and `docs/solutions/`. `S init` made `ship/<slug>` if you started on `main` or `master`.
   - `S done` refuses while the tree has uncommitted changes.
   - Change nothing else here. Any other edit cancels the review pass and sends the run back to Verify.
   - Push or open a PR only in one of these cases: `.ship/config.json` has `"push": "allow"`, the goal asks for it (`rules/decide.md`), or the user said yes.
   - In all other cases, do not push, and do not queue a question about it. Give the push command as the next step of the report.
3. **Close the run.** When every gate passed, run `S done`. If not, run `S block "<reason>"`.
4. **Report to the user.** The user asked for this report, so it can be long. Use the shape that Clear gives. Include:
   - What works now and how to try it: the run command, and the journeys with their pass marks.
   - Decisions to review: the output of `S digest`. Each entry has its undo.
   - Open questions: the output of `S questions`. Each one has a recommended answer. The user replies with `/msnc:ship answer <n> <text>`.
   - Tests: how many the run added, how many probes killed them, and which journeys became end-to-end tests.
   - In a separate part: the minor UX findings.
