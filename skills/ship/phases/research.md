# Research

Answer only what the repo and its docs cannot answer. Each question unblocks one decision. Stop when no decision waits on research.

1. **Write the questions.** Put them in `.ship/research.md` under `## Questions`. Number them, 8 or fewer. Name the decision that each question unblocks. For example: "Which auth library fits this stack? → define.auth".
2. **Answer locally first.** Look in the code, lockfiles, READMEs and `--help`, or run the tool. Mark each answer with its evidence: a `path:line` or a command.
3. **Research the rest.** Run up to 3 `msnc:researcher` workers at the same time, with 3 questions or fewer each. Each brief contains:
   - the questions;
   - the decision that each question unblocks;
   - the facts that you know already;
   - the stack and its versions.
4. **Record the findings.** Add them under `## Findings`, each with its source URL and date.
   - Write the version that you found. APIs change.
   - When sources disagree, prefer the primary source, then the newer source. Write down the disagreement.
5. **Gate.** Give each question a sourced answer, or make it a decision: `S decide research.<topic> "<default>" "<why, and what stays unknown>" "<undo>"`.
6. **Log sufficiency.** Run `S decide research.sufficient yes|no "<why>" "research again"`. You can run one more round, not more. After that, make each unknown a decision with a reversible default.
