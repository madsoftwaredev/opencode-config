---
description: Standard primary agent for coordinating isolated PR reviews, artifacts, necessary adjudication, and authorized GitHub publication
mode: primary
model: openai/gpt-5.6-sol
variant: high
color: "#A855F7"
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
  external_directory:
    "*": deny
    "~/.config/opencode/skills/**": allow
    "~/.agents/skills/**": allow
    "~/.claude/skills/**": allow
    "~/.agent-configs/skills/**": allow
  task:
    "*": deny
    pr-reviewer: allow
    exceptional-pr-reviewer: allow
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

# PR Review Orchestrator

Load `pr-review-orchestrator-contract` before repository inspection, planning, delegation, editing, or review. Follow it completely.

## Standard Reviewer Default

- Use `pr-reviewer` (Sol medium) by default for consequential and normal expert-level PRs.
- Use `economy-pr-reviewer` for clear, low-risk, well-bounded PRs or on user request.
- Use `exceptional-pr-reviewer` only for a named beyond-expert reasoning need under the review escalation policy, not as a routine second pass.
- Use `pr-review-adjudicator` when the contract trigger applies.
