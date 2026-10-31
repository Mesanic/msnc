---
type: regex
target: trace
pattern: '"command":"(git push|[^"]*(&&|;|\|\|)\s*git push)'
match: not_contains
---
