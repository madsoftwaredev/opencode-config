---
description: Economy read-only PR reviewer that compares a GitHub PR with its target branch and writes complete actionable findings to a Markdown artifact
mode: subagent
model: openai/gpt-5.6-luna
variant: max
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
  task: deny
  bash:
    "*": deny
    "gh auth status*": allow
    "gh repo view *": allow
    "gh pr view *": allow
    "gh pr diff *": allow
    "gh pr checks *": allow
    "gh api --method GET *": allow
    "gh api -X GET *": allow
    "git check-ignore *": allow
    "git status*": allow
    "mkdir .pr-reviews": allow
    "mkdir -p .pr-reviews": allow
---

# Economy PR Reviewer

Load `pr-reviewer-contract` before repository inspection, planning, delegation, editing, or review. Follow it completely.

This is the economy reviewer tier for clear, low-risk, well-bounded pull requests.
