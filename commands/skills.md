---
description: Mandatory skill loading workflow (project-local first)
---

Before making non-trivial code changes, load the smallest set of skills that constrain the work.

Rules:

- Project-local skills under `.opencode/skills/` take priority over global skills.
- Load router skill(s) first, then 1-2 relevant leaf docs.
- If behavior changes: load `testing` and the stack test leaf.
- If public API changes: load `documentation` and the language doc style.

Workflow:

1. Identify the stack: language + framework + cross-cutting concerns (`security`, `database`, `devops`).
2. Check for project-local routers: `.opencode/skills/<name>/SKILL.md`.
3. Load those routers; follow their routing tables.
4. Load global routers only if local routers don't exist.

Examples:

- Next.js mutation: load `nextjs` + `testing` (+ `security` if auth/input risk)
- Rails endpoint: load `rails` + `database` + `testing`
- Capacitor plugin: load `capacitor` + `security` (+ `devops` if CI/build)
