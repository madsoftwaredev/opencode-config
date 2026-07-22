---
description: Create a GitHub PR with a high-quality summary
---

Create a PR for the current branch.

First, check for a PR template and follow it:

- Look for templates in these locations (in order):
  - `PULL_REQUEST_TEMPLATE.md`
  - `pull_request_template.md`
  - `.github/PULL_REQUEST_TEMPLATE.md`
  - `.github/pull_request_template.md`
  - `.github/PULL_REQUEST_TEMPLATE/*.md`

If a template exists, use it as the PR body (fill in the sections).
If multiple templates exist, pick the best match based on the change type.

Workflow:

1. Inspect branch status and recent commits.
2. Inspect any PR template(s) and adopt that structure.
3. Summarize changes, test plan, and risks in the template format.
4. Ensure the branch is pushed.
5. Create PR via `gh pr create`.
