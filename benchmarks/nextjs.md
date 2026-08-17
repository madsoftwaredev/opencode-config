# Next.js Benchmarks

## Add a server action mutation with revalidation

Prompt:

"Add a Server Action to create a project. Validate inputs, return an explicit result shape, and invalidate the right cache tag. Keep UI components thin and colocate feature code under features/projects."

Expected loads:

- `skills/nextjs/SKILL.md`
- `skills/nextjs/server-actions-and-mutations.md`
- `skills/nextjs/data-fetching-cache-and-revalidation.md`
- `skills/testing/node-nextjs.md`

Expected traits:

- Server Action returns typed ok/error result.
- Invalidation uses tags aligned with reads.
- Client component is a small island and does not fetch directly.
- Smallest meaningful deterministic test proves a material mutation risk.
