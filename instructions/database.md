# Database Instructions

- **NEVER drop, reset, or destroy a database as a first option.** Exhaust safe alternatives first (fix the failing migration, skip it, or backfill). Warn and get explicit user consent before any destructive operation.
- Prefer migrations for schema changes.
- Index for query patterns.
- Be explicit about transactional boundaries.
