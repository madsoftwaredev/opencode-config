---
description: Lint benchmarks for consistent format
---

Run the benchmark linter and fix any issues.

Run:

```bash
python3 scripts/benchmarks_lint.py
```

If there are errors:

- Update the failing benchmark(s) to include:
  - `Prompt:`
  - `Expected loads:`
  - `Expected traits:`
