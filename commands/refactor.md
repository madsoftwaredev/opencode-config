---
description: Refactor code for simplicity and maintainability
---

Refactor the following:

$ARGUMENTS

Goals:

1. Reduce complexity without changing behavior
2. Eliminate duplication when the copies share ownership and change together
3. Improve readability and make ownership explicit
4. Preserve existing seams unless a concrete integration, ownership, reuse, or
   complexity problem justifies a new boundary

Do not extract a service, repository, or utility solely for testability. Summarize
the ownership decisions and meaningful changes rather than requiring a before/after
ceremony for every edit.

Run proportionate checks at logical checkpoints; broaden only when shared or
high-risk boundaries change.
