---
description: Bounded code review for explicitly supplied diffs/files
---

Review the following scoped code, diff, PR excerpt, or file list:

$ARGUMENTS

If the scope identifies a live GitHub PR by number or URL, do not use the bounded inline-review path below. Always delegate it to the active family's permitted reviewer: `pr-reviewer`, `economy-pr-reviewer`, or `flash-pr-reviewer`. Require a `.pr-reviews/<number>--<sanitized-title>.md` artifact and use `pr-review-adjudicator` when the active orchestrator's PR-review rules require validation or filtering.

If no concrete scope is provided, ask for the diff or file list and stop. Do not perform a repository-wide audit.

This is a general review, not an audit. If the request asks what additional security, performance, resilience, observability, architecture, or hardening controls should exist, stop and direct the user to `/audit`.

Budget:

1. Review only the supplied scope and directly related context.
2. For non-PR scoped reviews, do not launch other agents.
3. Report the top 5 findings by default.
4. A deep review may inspect more context only when the user explicitly requests it; it remains tied to existing intent and contracts and reports up to 10 findings.
5. Group repeated issues instead of listing every occurrence.

Every finding must cite one scope basis: an explicit requirement, accepted-plan item, existing contract on the reviewed path, or regression introduced by the supplied change.

Focus on concrete defects and gaps:

1. Incorrect behavior or regressions against the supplied intent.
2. Existing boundary, authorization, data, API, migration, or error contracts bypassed by the scoped code.
3. Concrete race, duplicate-write, unsafe-query, or changed hot-path risks.
4. Missing proportionate coverage for material behavior introduced or changed by the scope.
5. Maintainability problems only when they create demonstrated drift, misuse, or fragile changes inside the reviewed boundary.

Do not report optional refactors, documentation improvements, hardening, generalized missing controls, or personal preferences. Provide specific findings with file and line references. If there are no high-confidence findings, say that directly.
