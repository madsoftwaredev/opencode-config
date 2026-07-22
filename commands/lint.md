---
description: Run linting and fix what can be auto-fixed
---

Run the project's lint command(s) and fix issues.

$ARGUMENTS

Workflow:

1. Detect the correct lint command from project conventions (package.json, Makefile, scripts).
2. Run lint.
3. Apply safe auto-fixes.
4. Re-run lint to confirm clean.
