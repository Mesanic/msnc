---
name: record
description: Turn a task that just went well into a recipe, a small typed-only skill with its why, when to use it, the steps and a done-check. Shows the draft and writes nothing before a yes.
argument-hint: "[recipe name] [personal]"
disable-model-invocation: true
---

# Record

Good work becomes repeatable: this turns what just worked in this session into a recipe the next session can follow.

Record's principles are inspired by ProcessDriven; see Credit at the end.

## 1. Find the recipe in this session

Read back over the conversation. Pick the one task that ended with a passing check or the user's approval. Keep only the path that worked:

- Drop the dead ends, retries and rejected approaches. Where one of them taught something, turn it into a step ("Run X before Y") or a line in the done-check.
- One path to one outcome. When the session held two outcomes, record the one the user named in `$ARGUMENTS`, or ask which one in a single question.
- Use the exact commands, file paths and names from the session. Replace one-off values (a ticket number, a branch name) with `<placeholders>`.

Nothing in the session went well yet → say so in one line and stop.

## 2. Draft

Name: short kebab-case, the outcome not the tool (`release-notes`, not `run-git-log`). Before using it, check that `.claude/skills/<name>/` and `~/.claude/skills/<name>/` don't exist; if one does, pick another name and say why.

```markdown
---
name: <name>
description: <what it produces, and the situation it is for, in one sentence>
disable-model-invocation: true
---

# <Title>

**Why:** <the outcome this protects, and what went wrong or took long without it>

**When to use:** <the trigger: the request or situation that calls for it>. Not for <the nearest case it doesn't cover>.

## Steps

1. <one action, with the exact command or file>
2. ...

## Done-check

<the command to run or the thing to see that proves it worked, and what a pass looks like>
```

Rules for the draft:
- `disable-model-invocation: true` always: a recipe runs when typed as `/<name>`, and costs nothing until then.
- Steps are imperative, one action each, at most 10. No step that only says "be careful".
- The done-check is something to run or observe, never "verify it works".

## 3. Show, then ask

Show the full draft in a code block, then the path it will go to:

- Default: `.claude/skills/<name>/SKILL.md` in this project (shared through git).
- On request (`personal` in `$ARGUMENTS`, or the user asks): `~/.claude/skills/<name>/SKILL.md`.

Ask one question: "Save it there? (yes / personal / edit / no)". Write nothing before the user says yes:

- yes → create the folder and write `SKILL.md`. Never overwrite an existing file.
- personal → same, under `~/.claude/skills/<name>/`.
- edit → apply the requested changes, show the draft again, ask again.
- anything but yes → write nothing.

After writing, give the path and one line: "Type `/<name>` to run it. `/msnc:refine` improves it from later corrections."

## Credit

Record, and `/msnc:refine` beside it, follow principles inspired by [ProcessDriven](https://processdriven.co) by Layla Pomper. ProcessDriven® is a registered trademark. MSNC is not affiliated with or endorsed by ProcessDriven or Layla Pomper, and copies none of its templates or course material.
