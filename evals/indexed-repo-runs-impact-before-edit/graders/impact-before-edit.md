---
type: tool_order
before: { tool: Bash, input_match: 'scope\.mjs\S*\s+impact' }
after: { tool: Edit, input_match: 'users\.js' }
weight: 2
---
