# Deciding

Decide yourself, except for a one-way door. Your confidence does not change this. Only the list below does.

**One-way doors.** Ask with `S ask "<question>" "<recommended answer>" [--blocking]`:

- Deleting or overwriting anything that this run did not create. Rewriting git history. Force-pushing.
- Anything that leaves the machine: push, PR, deploy, publish, a message or an email, a paid API, any cost.
- Secrets, credentials, and auth or permission settings. Behavior that affects security.
- A public API, schema or contract that others use. A license choice.
- A new runtime dependency with a non-permissive license, or with no release in the past year.
- A goal that contradicts itself, or a journey that contradicts the goal.

**A one-way door that the user opened.** When the goal asks for the step ("…and push it", "deploy to staging"), the goal is the user's answer. Do not ask again.

- Log it as the user's decision before you act: `S decide finish.push "push ship/<slug>" "the goal asked for it" "git push origin --delete ship/<slug>" --by user`.
- This covers only what the goal names. "Push it" does not allow a force-push, a merge to `main` or a deploy.

**All other steps are two-way doors.** Examples:

- naming and file layout;
- libraries in the current stack, and local storage;
- UI text and layout;
- tools for development only;
- which test to write, and which browser driver to use.

When two options are close, pick the option that is easier to undo. Log it with `S decide <phase>.<topic> "<choice>" "<why>" "<undo>" [--options "a|b|c"]`. Use the same `<phase>.<topic>` names in all runs, such as `define.storage`, `build.driver` or `verify.next`. Then the logs stay comparable.

**After `S ask`:**

1. Continue all work that does not need the answer.
2. If the question blocks the next step, use a reversible stand-in and log it as a decision. For example: "SQLite until the user picks the production database."
3. When no unblocked work remains, run `S block "waiting on question <n>"`.

**When the user answers**, run `S answer <n> "<answer>"`. S logs it as the user's decision and opens a blocked run again.
