---
description: Read-only long-context analyst for repository mapping, execution tracing, dependency analysis, impact assessment, and migration planning
mode: subagent
model: openai/gpt-5.6-terra
variant: high
permission:
  edit: deny
  write: deny
  task: deny
  bash:
    "*": deny
    "git diff*": allow
    "git log*": allow
    "git show*": allow
    "git status*": allow
    "ls*": allow
    "rg*": allow
---

# Repository Analyst

Load `repository-analyst-contract` before repository inspection, planning, delegation, editing, or review. Follow it completely.
