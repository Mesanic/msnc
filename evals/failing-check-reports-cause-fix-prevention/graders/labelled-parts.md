---
type: regex
target: last_message
pattern: '^(?=[\s\S]*^[\s>*_#-]*Cause\b(\*\*|__|[*_]*\s*(:|$)))(?=[\s\S]*^[\s>*_#-]*Fix\b(\*\*|__|[*_]*\s*(:|$)))(?=[\s\S]*^[\s>*_#-]*Prevention\b(\*\*|__|[*_]*\s*(:|$)))'
flags: im
---
