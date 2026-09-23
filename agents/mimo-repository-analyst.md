---
description: Read-only MiMo analyst for repository mapping, execution tracing, dependency analysis, and impact assessment
mode: subagent
model: openrouter/xiaomi/mimo-v2.6-pro#thinking
permissions:
  - action: edit
    resource: "*"
    effect: deny
  - action: external_directory
    resource: "~/.config/opencode/skills/**"
    effect: allow
  - action: external_directory
    resource: "~/.agent-configs/skills/**"
    effect: allow
  - action: external_directory
    resource: "~/.agents/skills/**"
    effect: allow
  - action: external_directory
    resource: "~/.claude/skills/**"
    effect: allow
  - action: subagent
    resource: "*"
    effect: deny
  - action: shell
    resource: "*"
    effect: deny
  - action: shell
    resource: "git diff*"
    effect: allow
  - action: shell
    resource: "git log*"
    effect: allow
  - action: shell
    resource: "git show*"
    effect: allow
  - action: shell
    resource: "git status*"
    effect: allow
  - action: shell
    resource: "ls*"
    effect: allow
  - action: shell
    resource: "rg*"
    effect: allow
---

# MiMo Repository Analyst

Load `repository-analyst-contract` before repository inspection, planning, delegation, editing, or review. Follow it completely.
