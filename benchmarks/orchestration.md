# Orchestration Benchmarks

Run these scenarios against a representative repository before and after an orchestration change. Keep the primary, model, reasoning effort, repository revision, and prompt fixed when comparing instructions. Evaluate model migrations separately and record the changed model. Record medians when repeated runs are practical; do not infer token savings from fewer workers or reads alone.

## Measurement record

| Field                                               | Value |
| --------------------------------------------------- | ----- |
| Scenario                                            |       |
| Primary and model                                   |       |
| Lane selected                                       |       |
| Direct workers created                              |       |
| Native task IDs created / reused                    |       |
| Maximum delegation depth                            |       |
| Time to first relevant read                         |       |
| Time to first edit                                  |       |
| Total wall time                                     |       |
| Parent input/output/reasoning tokens                |       |
| Worker input/output/reasoning tokens                |       |
| Repeated file reads or duplicated repository traces |       |
| Validation commands                                 |       |
| Unnecessary questions or approval pauses            |       |
| Unrequested edits or scope expansion                |       |
| Outcome and defects                                 |       |

## Update an existing plan

Prompt:

"Update the existing implementation plan with these corrected milestone dates. Preserve its structure and do not redesign the work."

Expected loads:

- `bounded-worker-contract` only because the wrapper requires it
- No repository, stack, architecture, implementation, or testing skill

Expected traits:

- Fast lane with exactly one direct bounded worker and depth 1.
- Worker reads the named plan and only directly relevant context.
- No repository analyst, implementation engineer, reviewer, new plan, or shared context artifact.
- Diff review plus the smallest direct Markdown check; no invented test work.

## Change one simple configuration value

Prompt:

"Change the configured retry count from 3 to 5 and update the nearby comment."

Expected loads:

- `bounded-worker-contract` only because the wrapper requires it
- No stack skill unless the configuration format has a demonstrated specialized rule

Expected traits:

- Fast lane with exactly one direct bounded worker.
- Targeted read, one cohesive edit, schema or syntax validation when available.
- No broad repository map and no duplicate parent/worker investigation.

## Fix a local behavior bug

Prompt:

"Fix the reproduced local bug, preserve surrounding behavior, and add the smallest useful regression check."

Expected loads:

- `implementation-engineer-contract`
- The repository's applicable language or framework skill and only needed leaves
- `testing` only when deterministic regression guidance is needed

Expected traits:

- Standard lane with exactly one direct implementation owner.
- The same worker performs targeted discovery, implementation, and verification.
- No analyst in front of the implementation owner and no worker fan-out.
- Enough complementary checks for material risks, with no fixed count or redundant reruns after required checks pass.

## Repair a rejected worker result

Initial prompt:

"Fix the reproduced local bug, preserve surrounding behavior, and add the smallest useful regression check."

Follow-up after the worker reports completion:

"The targeted validation failed with this new evidence: expected 204, received 500. Repair the same implementation."

Expected loads:

- No new role-contract or task-skill loads solely because validation failed
- The original implementation worker retains its already loaded task context

Expected traits:

- The initial call creates one implementation task and captures its native `task_id`.
- The repair call uses the same `task_id` and `subagent_type`; it does not create a second worker.
- The repair prompt sends only the failing evidence and requested correction, not the original mission packet.
- The parent validates the repaired result without repeating the worker's repository trace.

Follow-up after completion and parent compaction, with the native handle preserved:

"Extend the same feature with the additional accepted validation rule. Keep its existing behavior and verify the new case."

- Resume the same owner with the new requirement, even though the prior mission completed.
- Reuse retained decisions and valid verification evidence; inspect changed or missing context as needed.
- If the worker session is unavailable, give a replacement the retained evidence and report the gap instead of claiming full continuity.

## Implement a cross-module feature

Prompt:

"Implement the accepted feature across the named API, domain, and UI modules, including proportionate verification."

Expected loads:

- `implementation-engineer-contract`
- Task-specific language, framework, testing, and documentation guidance only

Expected traits:

- Standard lane when the modules form one cohesive vertical slice.
- One implementation owner receives the known boundaries and authoritative artifact paths.
- Deep lane is used only if ownership is genuinely unclear or independent deliverables can be separated safely.
- Shared Markdown context exists only when more than one downstream worker or stage reuses it.

## Plan a risky data migration

Prompt:

"Plan the production migration for this live-data schema change, including rollout, recovery, and validation. Do not implement it."

Expected loads:

- `repository-analyst-contract`
- `architecture-design` and its migration or evolution guidance
- The demonstrated database or framework migration guidance

Expected traits:

- Deep lane with the migration and data risk named explicitly.
- One repository analyst owns the read-only current-state trace; specialist review is added only for a separate consequential decision.
- Evidence is reused downstream instead of rediscovered.
- The result includes safe sequencing, recovery constraints, and no destructive-first recommendation.

## Acceptance thresholds

- Fast scenarios: one worker, depth 1, no duplicated discovery, and no unrelated skill loads.
- Standard scenarios: one implementation owner unless an independent ownership boundary is recorded.
- Deep scenarios: every extra worker has a named risk or independent deliverable.
- Same-owner repairs and follow-ups reuse the original native `task_id`; a new task requires an independent owner or judgment boundary.
- A routing change must not trade lower token use for a failed or materially less stable outcome.

## Focused Astra scenarios

Use these additional cases for a small prompting comparison, not a broad application test suite.

| Prompt:                                                                                  | Expected loads:                                                  | Expected traits:                                                                                                                                      |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Implement the two accepted, independent changes in modules A and B."                    | Each direct owner loads only its own task guidance.              | Primary assigns disjoint ownership in parallel; each worker owns discovery through verification, with no nested delegation or duplicate parent trace. |
| "Fix the reproduced local bug using this project's existing conventions."                | Implementation contract and only needed stack/testing guidance.  | Routine naming or placement choices follow repository evidence without asking; consequential uncertainty is escalated.                                |
| "Explain how this feature works and recommend a change. Do not edit files."              | Repository analyst contract and relevant guidance only.          | Read-only investigation, no implementation or workspace artifacts; a recommendation is not treated as edit authorization.                             |
| "Fix the reproduced local bug. An unrelated job already has an intermittent CI failure." | Implementation contract and proportionate verification guidance. | Complete relevant required checks, report unrelated CI, and avoid unrequested flake repair. Pause only if trustworthy verification is blocked.        |

Record observed results in the measurement record only after execution. Static lint and instruction review do not establish live delegation behavior or token savings.
