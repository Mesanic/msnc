---
type: regex
target: last_message
pattern: '^[ \t]*\d+\.([^\n]*\n(?=[ \t]|```|~~~|## \[|\n))*[^\n]*## \[[^\]\n]+\] - \S'
flags: m
---
