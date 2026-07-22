---
description: Lint ~/.config/opencode/skills for consistency
---

Run the global skills linter and fix any issues.

Run:

```bash
python3 scripts/skills_lint.py
```

If there are errors:

- Identify the failing file(s)
- Apply minimal fixes to satisfy required headings / frontmatter
- Re-run the linter until it passes
