---
type: llm
weight: 2
---

Judge only the first line of the response.
PASS if the first line is itself an action or a result: a command, a numbered step that names a concrete action (for example "1. Rename the branch locally:" with the command right below it), or a direct answer.
FAIL if the first line is preamble or an announcing line: an acknowledgement ("Sure", "Happy to help"), a statement about what the assistant can or can't do ("I can't run commands in this session, so…"), or a lead-in that introduces the steps instead of being one ("Here's how to rename a branch:", "Run these, replacing old-name and new-name:").
