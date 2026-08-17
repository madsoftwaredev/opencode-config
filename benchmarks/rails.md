# Rails Benchmarks

## Admin batch archive with external sync

Prompt:

"An existing Rails admin endpoint archives several projects at once. It checks
authorization, validates each selected record, updates related rows and a durable
outbox event in one transaction, then lets a dispatcher schedule external sync
after commit. Validation can produce errors on multiple records plus a base error
for a workflow-wide rule. Implement the demonstrated workflow using the
repository's Rails conventions. Use uniform `Data` Success/Failure contracts for
the application service and preserve an API failure envelope with an errors
hash-of-arrays. Prove one material risk with the lowest truthful check. Do not add
a service or test matrix when the existing owner already expresses the behavior
clearly."

Expected loads:

- `skills/rails/SKILL.md`
- `skills/rails/application-services-and-results.md`
- `skills/rails/api-contracts-and-responses.md`

Expected traits:

- An application service is used because the demonstrated workflow spans records,
  a transaction, and an external handoff; it is not extracted by default.
- Ruby 3.2+ `Data` contracts distinguish `Success(value, meta)` from
  `Failure(code, errors, error_details, meta)`; expected failures return Failure
  and unexpected errors raise.
- API failures preserve multiple field/record and base errors rather than one
  message or scalar field value.
- One proportionate integration or request proof covers the material transaction,
  durable external handoff, or response-contract risk.

## Authorized searchable collection

Prompt:

"Add a JSON projects index with Pundit visibility, allowlisted user filters and
sorts, deterministic offset pagination, eager-loaded owners, and the standard API
response. Use the shared collection wrapper rather than a controller concern or a
model-specific query object."

Expected loads:

- `skills/rails/SKILL.md`
- `skills/rails/collection-search-and-pagination.md`
- `skills/rails/api-contracts-and-responses.md`

Expected traits:

- `policy_scope(Project)` produces the authorized relation before strict Ransack.
- Model attributes, associations, scopes, and sorts are explicitly allowlisted.
- Stable sorting precedes bounded Kaminari pagination; eager loading, distinct,
  and exact counts are intentional.
- `Collections::Page` is rendered as `data` plus `meta.pagination`; invalid query
  or pagination uses keyed error hashes through the shared responder.
