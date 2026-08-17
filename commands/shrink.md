---
description: Review a large file for meaningful ownership boundaries
---

Review this file and simplify or split it only where a meaningful ownership,
responsibility, or reuse boundary exists:

$ARGUMENTS

Strategies:

1. Identify distinct responsibilities and their real owners
2. Extract only cohesive classes/modules with clear boundaries
3. Remove dead code and simplify confusing control flow
4. Remove duplication only when copies change for the same reason
5. Keep cohesive code together even when the file remains large

Maintain all behavior. Do not create utilities, services, or fragments merely to
reduce line count. Run proportionate checks for the affected boundaries.
