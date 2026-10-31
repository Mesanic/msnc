---
max_turns: 80
timeout_seconds: 1800
allowed_tools: [Read, Glob, Grep, Edit, Write, Skill, Bash, Agent, TaskCreate, TaskUpdate]
---

/msnc:ship implement parseDuration in duration.js: "1h30m" → 90, "45m" → 45, "2h" → 120, anything else throws
