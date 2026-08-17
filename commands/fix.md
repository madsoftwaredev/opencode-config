---
description: Fix a bug or issue
---

Fix the following issue:

$ARGUMENTS

Approach:

1. Understand the bug (reproduce if possible)
2. Identify the root cause (not just symptoms)
3. Add a failing regression test only when it is stable, proportionate, and protects against material recurrence; otherwise use targeted/manual verification and say why
4. Fix the bug
5. Verify the chosen automated or targeted/manual check passes
6. Check for similar issues elsewhere

Don't just patch - fix the root cause.
