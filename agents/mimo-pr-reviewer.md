---
description: MiMo read-only PR reviewer that compares a GitHub PR with its target branch and writes complete actionable findings to a Markdown artifact
mode: subagent
model: opencode-go/mimo-v2.6-flash
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

# MiMo PR Reviewer

Load `pr-reviewer-contract` before repository inspection, planning, delegation, editing, or review. Follow it completely.

This is the MiMo reviewer tier for clear, low-risk, well-bounded pull requests.
