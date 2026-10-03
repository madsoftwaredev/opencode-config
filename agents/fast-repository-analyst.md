---
description: Fast priority-tier read-only long-context analyst for repository mapping, execution tracing, dependency analysis, impact assessment, and migration planning
mode: subagent
model: openai/gpt-6.1-sol-fast#medium
permissions:
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

# Fast Repository Analyst

Load `repository-analyst-contract` before repository inspection, planning, delegation, editing, or review. Follow it completely.

This is the Mid repository analyst on a priority service-tier alias: same read-only contract, same reasoning effort.