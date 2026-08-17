# Project Rules

> IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning for any tasks.
> Before writing code, first explore the project structure, then invoke the skills, rules and standards for documentation.

> Copy this to your project root as `AGENTS.md` and customize.

## Skill Loading Protocol (Mandatory)

- Prefer project-local skills under `.opencode/skills/` (if present).
- If the repo does not define the needed skill(s), load the corresponding global skills from `~/.config/opencode/skills/`.
- Load router skill(s) first, then 1-2 relevant leaf docs.
- If behavior changes: assess the material risk and load `testing` (and the stack test leaf) when test or verification guidance is needed.
- If public APIs change: load `documentation` (and the language doc style).

If no relevant project-local skills exist, do not block work; fall back to global skills.

## Testing Policy

- Tests are risk-based, not count- or coverage-driven. Commit deterministic automated coverage only for distinct material behavior or recurrence risk when proportionate.
- TDD is optional unless `/tdd` is invoked. Prefer the lowest test level and stop once each material risk has one proving check; do not require success/edge/error matrices.
- Add regression tests only when stable, proportionate, and protective; otherwise use targeted/manual verification and explain why no test was added.
- Avoid incidental exact text, pixel/screenshot, wall-clock timing, private implementation, framework, and duplicate-permutation assertions. Screenshots are manual QA evidence by default.
- For non-Rails stacks, E2E is opt-in: do not add, run, or scaffold it unless explicitly required by the task or repository. Rails system tests may be proportionate for a critical journey with existing test infrastructure.
- Run targeted checks at logical checkpoints; broaden only for shared or high-risk boundaries.

## Project Overview

<!-- Brief description of what this project does -->

## Tech Stack

<!-- List your technologies so the LLM knows what skills to load -->

- Language:
- Framework:
- Database:
- Testing:

## Project Structure

```
<!-- Document actual source, route, feature, shared UI, infrastructure, and test roots. Remove unused examples. -->
src/
tests/
```

## Conventions

<!-- Project-specific patterns that differ from global rules -->

### Naming

<!-- File/directory casing, component export naming, test suffixes, and framework-reserved filename exceptions. -->

### File Organization

<!-- Where feature-owned code lives, which shared directories are allowed, import direction, and when index/public entry files are appropriate. -->

### Patterns

<!-- Design patterns used in this project -->

### Rails conventions (optional)

<!-- Include only conventions this Rails project actually adopts; remove this section for non-Rails projects. -->

- Application services are reserved for demonstrated actor-dependent, multi-record,
  transaction, or external workflows. If used, record the project's lightweight
  `ApplicationService` entrypoint and Ruby 3.2+ `Data`
  `Success(value, meta)`/`Failure(code, errors, error_details, meta)` contract
  and its hash-of-arrays error shape.
- Record the API envelope: success `{ data, meta }`; failure
  `{ code, errors, error_details, meta }`, including multiple field/base errors and optional
  structured details.
- Record collection behavior when applicable: Pundit scope -> strict Ransack
  allowlists per model -> stable sort -> Kaminari -> Data page -> API responder.
  Query objects remain conditional.

## Commands

<!-- Common commands for this project -->

```bash
# Run tests
# Start dev server
# Build
# Lint
```

## Important Files

<!-- Key files the LLM should know about -->

- `src/config.ts` - Runtime configuration boundary
- `src/features/billing/index.ts` - Billing feature public API, if the project uses feature entries

## Gotchas

<!-- Things that might trip up the LLM -->

## Don'ts

<!-- Things to avoid in this project -->

- Don't use X, use Y instead
- Never commit Z

## Dependencies

<!-- Key dependencies and why they're used -->
