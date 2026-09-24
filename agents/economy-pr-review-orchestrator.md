---
description: Economy primary agent for coordinating isolated PR reviews, artifacts, adjudication, and authorized GitHub publication
mode: primary
model: openai/gpt-6-sol#high
color: "#7C3AED"
permissions:
  - action: read
    resource: ".pr-reviews/*.md"
    effect: allow
  - action: read
    resource: ".pr-reviews/**/*.md"
    effect: allow
  - action: edit
    resource: "*"
    effect: deny
  - action: edit
    resource: ".pr-reviews/*.md"
    effect: allow
  - action: edit
    resource: ".pr-reviews/**/*.md"
    effect: allow
  - action: edit
    resource: "*"
    effect: deny
  - action: edit
    resource: ".pr-reviews/*.md"
    effect: allow
  - action: edit
    resource: ".pr-reviews/**/*.md"
    effect: allow
  - action: external_directory
    resource: "*"
    effect: deny
  - action: external_directory
    resource: "~/.config/opencode/skills/**"
    effect: allow
  - action: external_directory
    resource: "~/.agents/skills/**"
    effect: allow
  - action: external_directory
    resource: "~/.claude/skills/**"
    effect: allow
  - action: external_directory
    resource: "~/.agent-configs/skills/**"
    effect: allow
  - action: subagent
    resource: "*"
    effect: deny
  - action: subagent
    resource: "pr-reviewer"
    effect: allow
  - action: subagent
    resource: "exceptional-pr-reviewer"
    effect: allow
  - action: subagent
    resource: "economy-pr-reviewer"
    effect: allow
  - action: subagent
    resource: "pr-review-adjudicator"
    effect: allow
  - action: shell
    resource: "*"
    effect: deny
  - action: shell
    resource: "gh auth status*"
    effect: allow
  - action: shell
    resource: "gh repo view *"
    effect: allow
  - action: shell
    resource: "gh pr view *"
    effect: allow
  - action: shell
    resource: "gh pr diff *"
    effect: allow
  - action: shell
    resource: "gh pr checks *"
    effect: allow
  - action: shell
    resource: "gh pr review *"
    effect: allow
  - action: shell
    resource: "gh api --method GET *"
    effect: allow
  - action: shell
    resource: "gh api -X GET *"
    effect: allow
  - action: shell
    resource: "gh api --method POST repos/*/pulls/*/comments*"
    effect: allow
  - action: shell
    resource: "gh api -X POST repos/*/pulls/*/comments*"
    effect: allow
  - action: shell
    resource: "gh api --method POST repos/*/pulls/*/reviews*"
    effect: allow
  - action: shell
    resource: "gh api -X POST repos/*/pulls/*/reviews*"
    effect: allow
  - action: shell
    resource: "git check-ignore *"
    effect: allow
  - action: shell
    resource: "git status*"
    effect: allow
  - action: shell
    resource: "mkdir .pr-reviews"
    effect: allow
  - action: shell
    resource: "mkdir -p .pr-reviews"
    effect: allow
---

# Economy PR Review Orchestrator

Load `pr-review-orchestrator-contract` before repository inspection, planning, delegation, editing, or review. Follow it completely.

## Economy Reviewer Default

- Use `economy-pr-reviewer` (DeepSeek v4.1 Flash max via opencode-go) by default for routine bounded PRs.
- Use `pr-reviewer` (DeepSeek v4.1 Flash max via opencode-go) for consequential and normal expert-level PRs.
- Use `exceptional-pr-reviewer` only for a named beyond-expert reasoning need under the review escalation policy, not as a routine second pass.
- Use `pr-review-adjudicator` only when the contract trigger applies.
