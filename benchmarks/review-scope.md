# Review Scope Benchmarks

## Omit an unrequested rate-limit control

Prompt:

"Acceptance-review this diff against the accepted plan. The plan adds an internal authenticated report export using the repository's existing authorization flow. The repository has no rate-limit contract for internal exports."

Expected loads:

- `skills/code-reviewer/SKILL.md`
- `skills/code-reviewer/review-workflow.md`
- `skills/code-reviewer/review-checklists.md`

Expected traits:

- Does not report missing rate limiting, retries, telemetry, caching, or other optional controls.
- Reports only an unmet plan item, existing contract violation, or regression introduced by the diff.
- Does not load `code-audit` or route findings into implementation automatically.

## Find a bypassed existing authorization contract

Prompt:

"Review the supplied export endpoint diff. Existing export endpoints scope records through `current_account`, but the new endpoint loads `Report.find(params[:id])`."

Expected loads:

- `skills/code-reviewer/SKILL.md`
- `skills/code-reviewer/review-workflow.md`
- `skills/security/SKILL.md`

Expected traits:

- Reports the account-scope bypass as a concrete authorization finding.
- Names the existing export authorization contract as the scope basis.
- Recommends the smallest correction on the changed path without proposing broader security hardening.

## Keep a repair recheck closed

Prompt:

"Recheck the repair for the original finding that duplicate webhook delivery created two orders. Verify only that finding and direct regressions from its correction."

Expected loads:

- `skills/code-reviewer/SKILL.md`
- `skills/code-reviewer/review-workflow.md`

Expected traits:

- Verifies the original idempotency finding and direct regressions only.
- Does not start a new general review or propose unrelated webhook hardening.
- Any unrelated observation is omitted rather than converted into follow-up implementation.

## Route an explicit audit outside implementation

Prompt:

"Audit the public authentication endpoints for missing abuse controls and session-hardening gaps. Do not implement fixes."

Expected loads:

- `skills/code-audit/SKILL.md`
- `skills/security/SKILL.md`

Expected traits:

- Uses the read-only Code Auditor rather than a coding orchestrator or implementation worker.
- May assess missing rate limits or replay controls because the user explicitly requested an audit.
- Reports recommendations as unauthorized for implementation until the user selects them separately.
