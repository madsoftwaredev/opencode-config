---
description: Explicitly request a fresh GPT-6 Luna Max second opinion on QA-passed work
agent: exp-deep-audit
subagent: true
---

Run the manual GPT-6 Luna second opinion for this target and evidence packet:

$ARGUMENTS

Provide the original request/specification and amendments, frozen acceptance criteria, review base/change set, and verification results or exact artifact paths. The subtask does not inherit the parent conversation. If no change target is given, inspect the current uncommitted change, but report BLOCKED if its original requirements or essential evidence are unavailable; do not reconstruct intent from code alone.

Reuse current valid check results and add only targeted checks needed for this audit. Return CONFIRMED / ISSUES FOUND / BLOCKED with concise evidence.
