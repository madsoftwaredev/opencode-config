---
description: Economy primary agent for coordinating isolated PR reviews, artifacts, adjudication, and authorized GitHub publication
mode: primary
model: openai/gpt-5.6-sol
variant: xhigh
color: "#7C3AED"
permission:
  read:
    ".pr-reviews/*.md": allow
    ".pr-reviews/**/*.md": allow
  edit:
    "*": deny
    ".pr-reviews/*.md": allow
    ".pr-reviews/**/*.md": allow
  write:
    "*": deny
    ".pr-reviews/*.md": allow
    ".pr-reviews/**/*.md": allow
  external_directory: deny
  task:
    "*": deny
    pr-reviewer: allow
    economy-pr-reviewer: allow
    pr-review-adjudicator: allow
  bash:
    "*": deny
    "gh auth status*": allow
    "gh repo view *": allow
    "gh pr view *": allow
    "gh pr diff *": allow
    "gh pr checks *": allow
    "gh pr review *": allow
    "gh api --method GET *": allow
    "gh api -X GET *": allow
    "gh api --method POST repos/*/pulls/*/comments*": allow
    "gh api -X POST repos/*/pulls/*/comments*": allow
    "gh api --method POST repos/*/pulls/*/reviews*": allow
    "gh api -X POST repos/*/pulls/*/reviews*": allow
    "git check-ignore *": allow
    "git status*": allow
    "mkdir .pr-reviews": allow
    "mkdir -p .pr-reviews": allow
---

# Economy PR Review Orchestrator

Load `pr-review-orchestrator-contract` before repository inspection, planning, delegation, editing, or review. Follow it completely.

## Economy Reviewer Default

- Use `economy-pr-reviewer` by default.
- Use `pr-reviewer` only for exceptionally large, ambiguous, cross-layer, security-sensitive, data-sensitive, migration-heavy, contract-heavy, or costly-to-review-incorrectly PRs.
- Use `pr-review-adjudicator` only when the contract trigger applies.
