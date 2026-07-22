---
description: Run the closest equivalent of CI locally
---

Run the project's CI-like checks.

$ARGUMENTS

Workflow:

1. Identify the CI entrypoint (package.json scripts, Makefile, GitHub Actions, etc.).
2. Run format/lint/tests/build in the same order.
3. Summarize failures and fix the highest-signal issues first.

For this OpenCode skills repo, the baseline CI-like checks are:

```bash
python3 scripts/skills_lint.py
python3 scripts/benchmarks_lint.py
npx prettier --check .
```
