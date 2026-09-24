---
type: regex
target: last_message
pattern: '^\s*\d+\.[^\n]*(?<![\[\w.<])(\d+\.\d+\.\d+|<version>|x\.y\.z) - (<|\d{4}|yyyy)'
flags: im
match: not_contains
---
