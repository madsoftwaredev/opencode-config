---
description: DeepSeek Fast read-only analyst for repository mapping, execution tracing, dependency analysis, and impact assessment
mode: subagent
model: opencode-go/deepseek-v4.1-flash#high
permissions:
  - action: edit
    resource: "*"
    effect: deny
  - action: edit
    resource: "*"
    effect: deny
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

# Eco Fast Repository Analyst

Load `repository-analyst-contract` before repository inspection, planning, delegation, editing, or review. Follow it completely.
