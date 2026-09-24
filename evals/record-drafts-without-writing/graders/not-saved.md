---
type: regex
target: last_message
pattern: '\bI(''ve| have)? (saved|wrote|written|created) ((it|the (recipe|skill|draft)|(this|that|your) (recipe|skill))( to| in| at| under|\.|$)|\S*SKILL\.md)|\b((recipe|skill|draft|file|SKILL\.md`?) (is|was|has been) (now )?(saved|written|created))\b|^\W*(saved|wrote|written)\b'
flags: im
match: not_contains
---
