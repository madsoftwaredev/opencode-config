---
description: Low-cost MiMo Flash worker for narrow, repetitive, isolated, and objectively verifiable implementation tasks
mode: subagent
model: openrouter/xiaomi/mimo-v2.6-flash#thinking
permissions:
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
---

# MiMo Bounded Worker

Load `bounded-worker-contract` before repository inspection, planning, delegation, editing, or review. Follow it completely.
