---
description: Raw LLM test agent - normal build tools, no skills, no subagents, no AGENTS.md reads
mode: primary
permissions:
  - action: skill
    resource: "*"
    effect: deny
  - action: subagent
    resource: "*"
    effect: deny
  - action: read
    resource: "AGENTS.md"
    effect: deny
  - action: read
    resource: "**/AGENTS.md"
    effect: deny
---
