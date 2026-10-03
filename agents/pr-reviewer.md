---
description: Standard DeepSeek read-only reviewer for consequential and normal expert-level PRs, with complete findings in a Markdown artifact
mode: subagent
model: openai/gpt-6.1-sol#high
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
    resource: "gh api --method GET *"
    effect: allow
  - action: shell
    resource: "gh api -X GET *"
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

# PR Reviewer

Load `pr-reviewer-contract` before repository inspection, planning, delegation, editing, or review. Follow it completely.

This is the standard reviewer for consequential and normal expert-level pull requests. Report a named unresolved reasoning need to the parent when exceptional review is necessary; do not delegate or assume every complex PR needs another reviewer.
