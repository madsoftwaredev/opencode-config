---
description: Debug and fix a bug with minimal, targeted changes
---

Debug the following issue:

$ARGUMENTS

Workflow:

1. Clarify expected vs actual behavior and how to reproduce.
2. Reproduce the bug using existing tests or commands.
3. Trace the code path to find the true root cause.
4. Propose the smallest, safest code change that fixes the bug.
5. Add or update a regression test only when it is stable, proportionate, and protects against material recurrence; otherwise record targeted/manual verification and why no test was added.
6. Run the relevant tests and verify the fix.

Prefer minimal, well-documented fixes over broad refactors.
