---
description: Bounded code review for explicitly supplied diffs/files
---

Review the following scoped code, diff, PR excerpt, or file list:

$ARGUMENTS

If no concrete scope is provided, ask for the diff or file list and stop. Do not perform a repository-wide audit.

Budget:

1. Review only the supplied scope and directly related context.
2. Do not launch other agents.
3. Report the top 5 findings by default.
4. If the user explicitly asks for a deep/full/security/performance/API/data/migration review, report up to 10 findings.
5. Group repeated issues instead of listing every occurrence.

Focus on:

1. Simplicity - could this be simpler?
2. DRY violations - any repeated logic?
3. Documentation - are public APIs documented?
4. Type safety - explicit types, proper error handling?
5. Data access - any N+1 DB calls, query-in-loop patterns, or chatty I/O?
6. Correctness at boundaries - null/error states, transactions, race conditions?
7. Security basics - auth/authz gaps, input validation, sensitive data exposure?
8. Concurrency/idempotency - duplicate writes, retry safety, race-prone flows?
9. API and migration safety - contract drift, unsafe schema/data rollout?
10. File length - only flag it when changed code creates a specific maintainability risk.

Provide specific, actionable feedback with file and line references. If there are no high-confidence findings, say that directly.
