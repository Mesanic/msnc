# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`, never a single combined tickets file
- Triage state is a `**Status:**` line near the top of each issue file: `ready-for-agent` (an agent can take it) or `ready-for-human` (needs the maintainer)
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## Current features

- `.scratch/msnc-v1/`: build MSNC v1 (agent tickets, work them with `/implement msnc-v1`)
- `.scratch/msnc-rollout/`: publish and migrate (human-in-the-loop tickets, not for `/implement`)
- `.scratch/scope-rename/`: rename Scope's three old names to Scope (01 is for `/msnc:implement`; 02 and 03 are human-in-the-loop). Decisions in `docs/decisions.md`

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.
