---
description: Format code using configured formatters
---

Format the files relevant to:

$ARGUMENTS

Workflow:

1. Inspect the relevant package/task configuration and project guidance. Prefer the repository's existing format/write command; use OpenCode's formatter only when it matches that toolchain and configuration or no project command exists.
2. Let the configured formatter write corrections for the requested files. Use supported scoped arguments rather than blindly appending flags to a broad script. Do not manually reproduce formatting changes. In read-only scope, use check mode only.
3. Inspect the diff, preserve pre-existing work, and remove only out-of-scope churn introduced by this formatting pass.
4. Run the relevant format/lint check. Add behavior checks only if the changes could affect behavior or the repository requires them.
