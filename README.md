# OpenCode Config + Skill Library

> **Production-grade LLM coding configuration with router-first skill architecture**

This repository contains a comprehensive OpenCode configuration system designed to make AI coding assistants predictable, consistent, and production-quality across projects.

## Table of Contents

1. [Overview](#overview)
2. [Agent Types](#agent-types)
3. [Skills Inventory](#skills-inventory)
4. [Skill Structure & Philosophy](#skill-structure--philosophy)
5. [Commands](#commands)
6. [Configuration](#configuration)
7. [Workflow Guide](#workflow-guide)
8. [Project Setup](#project-setup)
9. [Quality Assurance](#quality-assurance)
10. [Contributing](#contributing)

---

## Overview

This repository provides a complete OpenCode configuration system with:

- **35+ specialized skills** covering languages, frameworks, and cross-cutting concerns
- **Router-first architecture** for precise, minimal context loading
- **Premium, Luna Fast economy, and direct DeepSeek coding families with shared specialist workers**
- **Isolated premium and economy PR-review pipelines with lossless artifacts**
- **Opt-in full-lifecycle YOLO mode with soft consequential-action gates**
- **25+ custom commands** for common workflows
- **Project-local skill support** for team conventions
- **Guardrails and linting** to prevent skill drift

### Core Philosophy

**Skills are the primary mechanism for consistent output.** Instead of relying on the model's training data, we explicitly load focused, versioned guidance that constrains behavior.

The system follows these principles:

1. **Route first, then implement** - Pick the smallest focused guide that fits
2. **Project-local wins** - Repo-specific conventions override global defaults
3. **Load only what you need** - Prevent context bloat with precise routing
4. **Explicit over implicit** - Decision rules, checklists, and anti-patterns over generic advice

### The Foundational Principle

> **IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning for any tasks.**
>
> **Before writing code, first explore the project structure, then invoke the skills, rules and standards for documentation.**

This principle, inspired by [Vercel's research](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals), is what makes this entire system work. Instead of letting the AI rely on its training data (which may be outdated, inconsistent, or wrong), we force it to **retrieve** specific, current, project-relevant guidance before acting.

**Why this matters:**

- **Consistency** - Every task follows the same conventions, regardless of which AI model is used
- **Accuracy** - Skills contain up-to-date patterns (2024-2026) rather than potentially stale training data
- **Predictability** - Same input produces same output because constraints are explicit
- **Team alignment** - Project-local skills encode team conventions that everyone follows

This is the glue that binds everything together: the router-first architecture, the skill loading protocol, the guardrails, and the quality checks all serve this single principle—**retrieve before you reason**.

---

## Agent Types

Agents define the model, execution boundary, permissions, and cost profile. Skills define reusable methods and constraints. Most skills are selected from the actual task; role-contract skills are the deliberate exception and must be loaded by their wrappers before any role work begins.

### Coding Army

#### Premium tier

| Agent                       | Model                  | Reasoning | Responsibility                                                |
| --------------------------- | ---------------------- | --------- | ------------------------------------------------------------- |
| **orchestrator**            | `openai/gpt-5.6-sol`   | `xhigh`   | Primary commander, integrator, and final validator            |
| **principal-engineer**      | `openai/gpt-5.6-sol`   | `xhigh`   | Architecture, high-risk work, deep debugging, and rescue work |
| **implementation-engineer** | `openai/gpt-5.6-terra` | `xhigh`   | Default implementation, bug fixing, testing, and integration  |
| **bounded-worker**          | `openai/gpt-5.6-luna`  | `xhigh`   | Narrow, repetitive, isolated, and testable work               |
| **repository-analyst**      | `openai/gpt-5.6-terra` | `xhigh`   | Read-only repository mapping and migration planning           |

#### Economy tier

| Agent                               | Model                      | Reasoning | Responsibility                             |
| ----------------------------------- | -------------------------- | --------- | ------------------------------------------ |
| **economy-orchestrator**            | `openai/gpt-5.6-terra`     | `xhigh`   | Vision-capable, delegation-default primary |
| **economy-implementation-engineer** | `openai/gpt-5.6-luna-fast` | `xhigh`   | Cost-efficient implementation              |
| **economy-bounded-worker**          | `openai/gpt-5.6-luna-fast` | `xhigh`   | Mechanical and tightly scoped work         |
| **economy-repository-analyst**      | `openai/gpt-5.6-luna-fast` | `xhigh`   | Read-only repository analysis              |

The economy workers use GPT-5.6 Luna Fast to draw from ChatGPT usage when OpenAI is authenticated through ChatGPT. OpenAI documents Fast mode as 1.5× model speed at 2.5× credit consumption for GPT-5.6; API-key authentication uses API Fast pricing instead. The Economy Implementation Engineer owns frontend implementation; visual product judgment and acceptance review belong with the UI/UX Analyst.

#### Flash tier

| Agent                             | Model                        | Reasoning | Responsibility                       |
| --------------------------------- | ---------------------------- | --------- | ------------------------------------ |
| **flash-orchestrator**            | `openai/gpt-5.6-sol`         | `xhigh`   | Sol coordinator for the Flash family |
| **flash-implementation-engineer** | `deepseek/deepseek-v4-flash` | `max`     | Direct DeepSeek implementation       |
| **flash-bounded-worker**          | `deepseek/deepseek-v4-flash` | `max`     | Direct DeepSeek mechanical work      |
| **flash-repository-analyst**      | `deepseek/deepseek-v4-flash` | `max`     | Direct DeepSeek read-only analysis   |
| **flash-vision-scout**            | `openai/gpt-5.6-luna-fast`   | `xhigh`   | Factual local visual inspection only |

Flash workers use `deepseek/deepseek-v4-flash` through the direct DeepSeek provider with the `max` reasoning variant. Direct DeepSeek V4 Flash remains the sole coding and implementation owner, including frontend work and browser validation. Luna Fast is used only by `flash-vision-scout` for factual inspection of exact supplied local images, screenshots, PDFs, and video frames; it never owns implementation, product judgment, or design decisions. The scout is exclusive to the direct DeepSeek Flash family. The Flash orchestrator uses the existing Principal Engineer, UI/UX Analyst, and PR Review Adjudicator for their narrow specialist triggers.

#### Shared UI specialist

| Agent             | Model              | Reasoning | Responsibility                                                                 |
| ----------------- | ------------------ | --------- | ------------------------------------------------------------------------------ |
| **ui-ux-analyst** | `opencode/kimi-k3` | `max`     | UI/UX consultation, planning, validation, and frontend review; no product code |

Substantial UI/UX plans and reviews are written to Markdown artifacts. Orchestrators pass the exact artifact path to implementation and review workers instead of compressing the plan into a handoff summary, and workers treat the file as the authoritative requirements and acceptance checklist.

#### PR review pipeline

| Agent                              | Mode     | Model                        | Reasoning | Responsibility                                     |
| ---------------------------------- | -------- | ---------------------------- | --------- | -------------------------------------------------- |
| **pr-review-orchestrator**         | primary  | `openai/gpt-5.6-sol`         | `xhigh`   | Premium single and batch PR-review coordination    |
| **economy-pr-review-orchestrator** | primary  | `openai/gpt-5.6-terra`       | `xhigh`   | Economy single and batch PR-review coordination    |
| **pr-reviewer**                    | subagent | `openai/gpt-5.6-terra`       | `xhigh`   | Premium target-branch review and findings artifact |
| **economy-pr-reviewer**            | subagent | `openai/gpt-5.6-luna-fast`   | `xhigh`   | Economy target-branch review and findings artifact |
| **flash-pr-reviewer**              | subagent | `deepseek/deepseek-v4-flash` | `max`     | Flash target-branch review and findings artifact   |
| **pr-review-adjudicator**          | subagent | `openai/gpt-5.6-sol`         | `xhigh`   | Independent finding validation and user filtering  |

PR reviewer subagents use read-only GitHub operations and never checkout or modify the reviewed source. A request to either premium or economy PR-review orchestrator to review an assigned live PR authorizes it to publish one summary review or set of inline comments, including approve and request-changes events, unless the user asks for a draft, local, or artifact-only review. Before posting, the orchestrator reconfirms the reviewed head SHA and checks for duplicates. Findings follow [Conventional Comments](https://conventionalcomments.org/) with explicit intent and blocking decorations, while using an empathetic, collaborative, non-blaming tone. Reviewers write `.pr-reviews/<number>--<sanitized-title>.md`; batch orchestrators also maintain `.pr-reviews/INDEX.md`. Because these are intentional workspace artifacts, they appear in `git status` unless `.pr-reviews/` is added to the repository's local `.git/info/exclude` or tracked ignore rules.

#### YOLO modes

| Agent                       | Command      | Default model        | Reasoning | Worker pool                                            |
| --------------------------- | ------------ | -------------------- | --------- | ------------------------------------------------------ |
| **yolo-orchestrator**       | `yolo`       | `openai/gpt-5.6-sol` | `xhigh`   | Premium and economy workers plus shared specialists    |
| **yolo-eco-orchestrator**   | `yolo-eco`   | `openai/gpt-5.6-sol` | `xhigh`   | Economy workers plus UI/UX and Principal Engineer only |
| **yolo-flash-orchestrator** | `yolo-flash` | `openai/gpt-5.6-sol` | `xhigh`   | Flash workers, vision scout, UI/UX, and Principal only |

Launch the desired mode from the project it should own:

```bash
yolo
yolo-eco
yolo-flash
```

Pass a project path or model override when needed:

```bash
yolo /path/to/project
yolo-eco /path/to/project
yolo-flash /path/to/project
yolo --model openai/gpt-5.6-terra --variant xhigh
```

The versioned `opencode-yolo`, `yolo`, `yolo-eco`, and `yolo-flash` launchers inject `profiles/yolo.json` as a late merged process-wide layer and enable OpenCode's `--auto` mode. Per-agent permissions still apply afterward. The profile allows routine work, marks consequential command patterns as `ask`, and reserves hard `deny` for raw token-display commands only; `--auto` approves those asks.

All YOLO primaries are orchestration-first: substantive investigation, implementation, tests, documentation, and UI work must be delegated. They retain triage, ownership, integration, conflict repair, final verification, and cleanup. The selected implementation engineer owns frontend work and browser validation. `yolo-eco` prevents premium implementation, bounded, and repository workers; `yolo-flash` prevents premium and Luna coding workers, with `flash-vision-scout` as the sole Luna Fast factual-vision exception.

YOLO mode authorizes routine local edits, dependency installation, downloads, project containers, local Git history operations, tests, formatting, linting, type checks, builds, browser verification, repair loops, and cleanup. Outside-worktree access, privileged commands, Git pushes and GitHub writes, remote shell and file transfer, cloud and deployment CLIs, infrastructure or data mutation, publishing, system package tools, and destructive cleanup are consequential `ask` gates when the profile is used without `--auto`.

An explicit user instruction in the current YOLO session authorizes its named outside-worktree, remote, publish, deploy, system-tool, infrastructure, data-mutation, or destructive action without a config restart or repeated confirmation. If a destructive target or scope is ambiguous, YOLO asks once before acting. It never retrieves, prints, copies, or exposes raw credentials or secrets; configured credentials may be used opaquely.

This is a permission boundary, not an operating-system sandbox: arbitrary project scripts and package lifecycle hooks can still execute with the OpenCode process's user privileges. Use least-privileged credentials and only trusted repositories, or run OpenCode in a disposable container or VM with only the project mounted.

The Orchestrator may recommend skills in a mission when a particular constraint matters. Each worker still inspects the task and repository instructions and makes the final skill selection.

Every delegation-capable primary must send a self-contained mission packet rather than a short task summary. The packet preserves the exact governing user request, verified repository context, decisions, ownership and protected areas, authoritative artifact paths, acceptance criteria, material risks, proportionate validation, cleanup, and report shape. Manual review or no automated test may be the correct validation choice; missions must not invent test work or broad command runs to fill the packet. Repair and dependent missions also carry predecessor evidence and the reason the prior result was rejected, so workers are never expected to know another agent's chat.

### Agent Selection Flow

```mermaid
flowchart TD
    A[User selects primary] --> T[Premium Orchestrator]
    A --> E[Economy Orchestrator]
    A --> F[Flash Orchestrator]
    T --> P[Premium workers]
    T --> C[Luna Fast economy workers]
    E --> C
    F --> D[Direct DeepSeek workers]
    F --> N[Luna Fast vision scout]
    T --> S[Shared specialists]
    E --> S
    F --> S
    P --> V[Primary integrates and validates]
    C --> V
    D --> V
    N --> V
    S --> V
```

The premium Orchestrator can choose either worker tier. The Economy Orchestrator uses economy workers for routine work but may invoke the Principal Engineer or UI/UX Analyst when their narrow escalation trigger applies. The Flash Orchestrator routes routine work only to Flash workers and its Flash PR reviewer, plus the Luna Fast scout for cheap factual visual evidence. Every implementation engineer owns its frontend work and browser validation. The Flash Implementation Engineer's only coding delegate is Flash Bounded Worker, while the scout may inspect exact supplied assets only. The premium Implementation Engineer may launch either Bounded Worker; the Economy Implementation Engineer may launch only the Economy Bounded Worker. Every other coding worker is denied subagent access, and depth 2 prevents delegation below a Bounded Worker.

To make the economy tier the default only in a high-consumption project, add this project-local configuration:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "default_agent": "economy-orchestrator"
}
```

---

## Skills Inventory

Skills are the heart of this system. Task skills are routers that point to focused leaf documents; role-contract skills are complete single-file contracts.

### Role-contract skills

Role-contract skills are complete behavioral contracts, not routers and not security boundaries. Each matching agent wrapper explicitly loads its contract before inspection, planning, delegation, editing, or review; the wrapper retains the explicit tool and task permissions plus its concrete family routing.

| Skill                                | Required by                                 |
| ------------------------------------ | ------------------------------------------- |
| **orchestrator-contract**            | Normal, economy, and Flash orchestrators    |
| **yolo-orchestrator-contract**       | All YOLO orchestrators                      |
| **implementation-engineer-contract** | Premium, economy, and Flash implementers    |
| **bounded-worker-contract**          | Premium, economy, and Flash bounded workers |
| **repository-analyst-contract**      | Premium, economy, and Flash analysts        |
| **vision-scout-contract**            | Flash vision scout                          |
| **pr-reviewer-contract**             | Premium, economy, and Flash PR reviewers    |
| **pr-review-orchestrator-contract**  | Premium and economy PR-review primaries     |

### Language Skills

| Skill          | Description                       | Leaf Docs                                                                                                                                                                                           |
| -------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ruby**       | Ruby 3.x conventions              | style-and-idioms, objects-and-design, errors-and-results, tooling-and-quality, documentation-and-comments                                                                                           |
| **python**     | Python 3.12+ strict typing        | project-structure, types-and-boundaries, errors-and-results, async-and-concurrency, http-clients-and-retries, tooling-and-quality, documentation-and-comments, recipes-cli-tool, recipes-agent-tool |
| **typescript** | TypeScript module and type design | module-structure, language-patterns, testing and documentation routes                                                                                                                               |
| **javascript** | JavaScript ES2022+ with JSDoc     | language-patterns, documentation-and-comments, module-structure and testing routes                                                                                                                  |
| **go**         | Go 1.22+ idioms                   | Complete conventions in single file                                                                                                                                                                 |
| **rust**       | Rust 2024 Edition                 | Complete conventions in single file                                                                                                                                                                 |
| **swift**      | Swift 5.9+ iOS/macOS              | swift-core, swift-testing, swift-config                                                                                                                                                             |
| **kotlin**     | Kotlin 2.0+ Android/JVM           | kotlin-core, kotlin-testing, kotlin-config                                                                                                                                                          |
| **dart**       | Dart 3.x null safety              | project-structure, tooling-and-quality, null-safety-and-types, async-and-streams, errors-and-results, testing                                                                                       |

### Framework Skills

| Skill            | Description                                                                                                     | Leaf Docs                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **rails**        | Rails conventions, uniform application services and Data contracts, safe persistence, API/collection boundaries | conventional-rails, application-services-and-results, api-contracts-and-responses, collection-search-and-pagination, form-objects, authorization-and-pundit, model-concerns, controller-concerns, callbacks-policy, jobs-and-idempotency, migrations-and-backfills, hotwire-and-browser-behavior, zeitwerk-and-project-structure, documentation-and-comments                  |
| **nextjs**       | App Router + RSC                                                                                                | architecture, auth-and-sessions, middleware-and-route-handlers, validation-and-forms, error-and-loading-boundaries, atomic-components, component-folder-structure, app-router-and-rsc-boundaries, data-fetching-cache-and-revalidation, server-actions-and-mutations, recipes-protected-routes, recipes-server-action-form                                                    |
| **react**        | React 18/19                                                                                                     | state-and-effects, component-design-and-performance, module-structure and testing routes                                                                                                                                                                                                                                                                                      |
| **fastapi**      | FastAPI + Pydantic                                                                                              | Complete conventions in single file                                                                                                                                                                                                                                                                                                                                           |
| **flutter**      | Flutter iOS/Android                                                                                             | project-structure, state-management, navigation-and-routing, widgets-layout-and-theming, platform-ux-ios-android, accessibility, performance, animations-and-motion, native-integration-and-permissions, testing, recipes-new-screen-flow, recipes-form-validation                                                                                                            |
| **react-native** | RN iOS/Android                                                                                                  | project-structure, platform-differences, ui-ux-and-design-system, accessibility, navigation, performance, animations-and-gestures, native-modules-and-bridging, testing, recipes-new-screen-flow                                                                                                                                                                              |
| **expo**         | Expo managed + dev client                                                                                       | expo-router, app-config-and-secrets, eas-build-and-dev-client, permissions-and-capabilities, updates-and-channels, assets-fonts-and-splash, push-notifications, native-modules-and-prebuild, debugging-and-devtools, recipes-protected-route, recipes-add-native-dependency                                                                                                   |
| **capacitor**    | Hybrid apps iOS/Android                                                                                         | project-structure, config-and-environments, native-platforms-ios-android, plugins-and-bridging, permissions-and-privacy, storage-and-secrets, networking-and-auth, deeplinks-and-app-links, push-notifications, performance-and-webview, debugging-and-devtools, builds-and-release, testing, recipes-add-capacitor-to-web-app, recipes-add-plugin, recipes-release-checklist |
| **ionic**        | Ionic React/Angular/Vue                                                                                         | framework-flavors, project-structure, routing-and-navigation, ui-components-and-patterns, forms-and-validation, state-and-data, design-system, accessibility, performance, capacitor-integration, testing, recipes-new-screen-flow, recipes-design-system-starter                                                                                                             |

### Cross-Cutting Skills

| Skill                 | Description                  | Leaf Docs                                                                                                                                                                                                                                                                                                        |
| --------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **testing**           | Risk-based testing router    | tdd-workflow, fixtures-and-test-data, test-doubles-and-mocking-discipline, e2e-playwright, ci-reliability-and-flake-control, contract-testing, property-based-testing, recipes-bug-fix, recipes-playwright-e2e, documentation-and-comments, node-nextjs, typescript, python, ruby-rails, go, rust, swift, kotlin |
| **security**          | Security checklist           | input-validation, secrets-and-logging, web-threats-csrf-xss, ssrf-and-outbound-http, file-uploads, dependency-hygiene, recipes-webhook-verification                                                                                                                                                              |
| **database**          | DB patterns                  | migrations-and-backfills, indexes-and-query-patterns, transactions-and-consistency, query-performance-and-n-plus-1, recipes-online-migration                                                                                                                                                                     |
| **api**               | REST/OpenAPI design          | errors-and-response-shapes, pagination-filtering-sorting, versioning-and-deprecation, openapi-and-examples, idempotency-and-retries, recipes-new-endpoint                                                                                                                                                        |
| **auth**              | Authentication/authorization | sessions-and-csrf, token-auth, authorization-models, recipes-protect-endpoint                                                                                                                                                                                                                                    |
| **git**               | Git workflows                | commits, staging-and-hygiene, branching-and-prs, troubleshooting                                                                                                                                                                                                                                                 |
| **gh**                | GitHub CLI                   | prs, issues, actions, repos, api, recipe-address-pr-comments, recipe-review-others-pr                                                                                                                                                                                                                            |
| **pr-reviews**        | PR review strategy           | review-strategy, coherence-checklist, review-comments                                                                                                                                                                                                                                                            |
| **devops**            | CI/CD and infra              | dockerfiles-and-images, ci-pipelines, secrets-in-ci, deploy-strategies, recipes-ci-checks                                                                                                                                                                                                                        |
| **observability**     | Logs, metrics, tracing       | logging-and-correlation-ids, metrics-and-slos, tracing-and-spans, error-tracking-and-release-health, recipes-debug-prod-issue                                                                                                                                                                                    |
| **performance**       | Optimization playbooks       | profiling-and-measurement, caching-strategies, latency-budgets-and-p99, backend-hot-paths, recipes-perf-investigation                                                                                                                                                                                            |
| **refactoring**       | Safe restructuring           | refactor-workflow, extract-boundaries, remove-duplication, naming-and-ownership, recipes-large-refactor                                                                                                                                                                                                          |
| **incident-response** | Production incidents         | triage-and-mitigation, rollback-and-feature-flags, communication-and-updates, postmortems-and-followups, recipes-incident-template                                                                                                                                                                               |

### Meta Skills

| Skill               | Description                   | Purpose                                                       |
| ------------------- | ----------------------------- | ------------------------------------------------------------- |
| **skill-authoring** | Standards for creating skills | authoring-standard, recipes-standard, benchmarks, skills-lint |
| **documentation**   | Doc style router              | Routes to language-specific doc formats                       |
| **system-design**   | Design patterns               | Architecture, data modeling, API design, UX flows, UI specs   |
| **web-design**      | UI/UX implementation          | Routing table for 100+ components across 8 categories         |

---

## Skill Structure & Philosophy

### Router-First Architecture

Every task skill follows a consistent router-first pattern:

```
skills/<name>/
├── SKILL.md          # Router with frontmatter and routing table
├── <leaf-1>.md       # Focused guide on one topic
├── <leaf-2>.md       # Another focused guide
└── ...
```

#### SKILL.md Structure

```yaml
---
name: skill-name
description: One sentence describing what this skill covers
---

# Skill Index

## When to load
- Specific scenarios for loading this skill

## When NOT to load
- Scenarios where this skill adds noise

## Routing table
| Task | Load file |
|------|-----------|
| Specific task | `leaf-file.md` |

## Typical load combos
- Common skill combinations for different scenarios

## Stop triggers
- When to route to cross-cutting skills

## Related skills
- Links to complementary skills
```

#### Leaf Document Structure

Every leaf document must include:

```markdown
# Topic Name

## When to load

- Specific scenarios

## When NOT to load

- Anti-scenarios

## Core rules

- Decision rules (if X then Y)

## Common patterns

- Conditional decision rules, not default libraries or folder ceremony

## Minimal examples

- One canonical good example and, when useful, one contrasting bad example

## Anti-patterns

- Explicit "don't do this"

## Checklist

- Short decision checklist; no ritual test or command matrix

## References

- External documentation links
```

### Why This Structure Works

1. **Precise Loading** - Agents load only the 1-2 leaf docs needed, not entire task-skill trees
2. **Consistent Format** - Every doc has the same sections, making them predictable
3. **Decision-Oriented** - "When to load / When NOT to load" prevents context bloat
4. **Model-Aware Detail** - Routers give strong models concise boundaries; on-demand leaves give lower-cost workers concrete decisions and examples
5. **Cross-References** - Routing tables link related skills for complete coverage

Use `MUST` only for safety, correctness, public contracts, and framework requirements. Use conditional `SHOULD` defaults for engineering judgment and `MAY` for optional techniques. Remove preference-only syntax rules instead of turning them into policy.

### Skill Loading Protocol

Skill selection is task-driven rather than agent-driven. The Orchestrator can include recommendations in a mission, but workers must inspect the actual stack and choose the smallest applicable guidance themselves.

```mermaid
sequenceDiagram
    participant User
    participant Agent
    participant Router as SKILL.md
    participant Leaf as Leaf Doc
    participant Cross as Cross-Cutting

    User->>Agent: Request task
    Agent->>Agent: Identify stack
    Agent->>Router: Load router skill
    Router->>Agent: Return routing table
    Agent->>Leaf: Load 1-2 relevant leaves
    Leaf->>Agent: Return guidance

    alt Security/DB/API concern
        Agent->>Cross: Load cross-cutting skill
        Cross->>Agent: Return safety guidance
    end

    alt Behavior changes
        Agent->>Cross: Load testing skill
        Cross->>Agent: Return test patterns
    end

    Agent->>User: Execute with constraints
```

---

## Commands

Commands are auto-discovered by OpenCode (no `opencode.json` wiring required).

### Development Commands

| Command             | Description                         |
| ------------------- | ----------------------------------- |
| `/skills`           | Skill loading workflow              |
| `/init-skills`      | Bootstrap project-local skills      |
| `/init-skill-guard` | Install SkillGuard plugin           |
| `/tdd`              | Start a TDD session                 |
| `/plan`             | Create an implementation plan       |
| `/refactor`         | Refactor for simplicity             |
| `/review`           | Perform a bounded code review       |
| `/security`         | Perform a security audit            |
| `/debug`            | Debug and fix bugs                  |
| `/optimize`         | Investigate and improve performance |
| `/docs`             | Generate documentation              |
| `/ui`               | Generate UI components              |
| `/story`            | Generate Storybook stories          |
| `/commit`           | Draft a commit message              |
| `/pr`               | Create a GitHub pull request        |
| `/ci`               | Run CI-like checks locally          |

Commands do not select an agent. The active Orchestrator session decides whether to execute directly or delegate.

### Utility Commands

| Command          | Description              |
| ---------------- | ------------------------ |
| `/test`          | Run test suite           |
| `/lint`          | Run linters              |
| `/format`        | Run formatters           |
| `/fix`           | Auto-fix issues          |
| `/explain`       | Explain code             |
| `/shrink`        | Reduce code size         |
| `/benchmarks`    | Run skill benchmarks     |
| `/skills-lint`   | Validate skill structure |
| `/release-notes` | Generate release notes   |
| `/design-system` | Setup design system      |

### Command Structure

```markdown
---
description: Brief description of what this command does
---

Command instructions here...

$ARGUMENTS will be replaced with user input
```

---

## Configuration

### opencode.json Structure

```json
{
  "$schema": "https://opencode.ai/config.json",
  "autoupdate": true,
  "share": "manual",
  "instructions": [
    "instructions/core.md",
    "instructions/documentation.md",
    "instructions/testing.md",
    "instructions/security.md",
    "instructions/git.md",
    "instructions/api.md",
    "instructions/database.md"
  ],
  "compaction": {
    "auto": true,
    "prune": true
  },
  "subagent_depth": 2,
  "plugin": ["opencode-openai-codex-auth"],
  "watcher": {
    "ignore": ["**/node_modules/**", "**/.git/**", "**/dist/**"]
  },
  "permission": {
    "read": { "*": "allow", "*.env": "deny" },
    "edit": { "*": "allow", "**/.env": "deny" },
    "bash": { "*": "allow", "sudo *": "ask" },
    "task": { "*": "deny" }
  },
  "formatter": {
    "prettier": { "command": [...], "extensions": [...] },
    "eslint": { "command": [...], "extensions": [...] },
    "ruff": { "command": [...], "extensions": [...] }
  },
  "agent": { /* agent definitions */ },
  "mcp": { /* MCP server configs */ },
  "provider": { /* LLM provider configs */ }
}
```

### Key Configuration Sections

| Section          | Purpose                                                                        |
| ---------------- | ------------------------------------------------------------------------------ |
| `instructions`   | Global rules files loaded into every context                                   |
| `permission`     | Fine-grained access control per tool type                                      |
| `subagent_depth` | Global maximum delegation depth; agent `task` permissions define allowed edges |
| `formatter`      | Auto-formatting on save per file type                                          |
| `agent`          | Agent definitions with tools and permissions                                   |
| `mcp`            | Model Context Protocol server configurations                                   |
| `provider`       | LLM provider settings (OpenAI, Anthropic, etc.)                                |

### MCP Servers Configured

| Server         | Purpose                              |
| -------------- | ------------------------------------ |
| **context7**   | Up-to-date library documentation     |
| **gh_grep**    | Search GitHub code examples          |
| **playwright** | Browser automation and E2E testing   |
| **sentry**     | Error tracking (disabled by default) |

---

## Workflow Guide

### Standard Development Workflow

```mermaid
flowchart LR
    A[Start Task] --> B[Orchestrator inspects scope and repository]
    B --> C{Delegate?}
    C -->|No| D[Orchestrator implements]
    C -->|Yes| E[Orchestrator assigns a bounded mission]
    E --> F[Worker inspects context and selects applicable skills]
    F --> G[Worker implements and verifies]
    G --> H[Worker reports evidence and risks]
    D --> I[Orchestrator inspects final changes]
    H --> I
    I --> J[Orchestrator runs integrated validation]
    J --> K[Clean task-created code and resources]
    K --> L[Inspect final state]
    L --> M[Deliver result]
```

Cleanup is mandatory for successful, failed, and partial work. The Orchestrator removes only task-created temporary code, files, processes, containers, worktrees, and safe-to-delete branches. Dirty worktrees, unique commits, persistent data, and resources owned by users or other sessions are preserved and reported instead of force-deleted.

### Skill-First Protocol

**Before making non-trivial code changes:**

1. **Identify the stack** - Language + framework + cross-cutting concerns
2. **Check project-local first** - Look in `.opencode/skills/`
3. **Load router skill(s)** - The `SKILL.md` for your stack
4. **Load 1-2 leaf docs** - Follow the routing table
5. **Load testing** - If behavior changes, load `testing` skill
6. **Load documentation** - If public APIs change, load `documentation` skill

### Example Workflows

**Next.js Feature Implementation:**

```
1. Load: nextjs/SKILL.md
2. Load: nextjs/architecture.md + nextjs/server-actions-and-mutations.md
3. Load: testing/SKILL.md + testing/node-nextjs.md
4. Load: security/SKILL.md (if auth/input handling)
5. The Orchestrator executes or delegates the implementation
```

**Rails API Endpoint:**

```
1. Load: rails/SKILL.md
2. Load: rails/conventional-rails.md + rails/api-contracts-and-responses.md
3. Load: rails/collection-search-and-pagination.md when the endpoint lists/searches; otherwise load the narrow Rails leaf for the demonstrated boundary
4. Load: api/SKILL.md + api/recipes-new-endpoint.md
5. Load: testing/SKILL.md + testing/ruby-rails.md when behavior changes
6. Load: database/SKILL.md (if DB changes)
7. The Orchestrator executes or delegates the implementation
```

**Python CLI Tool:**

```
1. Load: python/SKILL.md
2. Load: python/recipes-cli-tool.md + python/types-and-boundaries.md
3. Load: testing/SKILL.md + testing/python.md
4. The Orchestrator executes or delegates the implementation
```

---

## Project Setup

### Quick Start for New Projects

1. **Bootstrap project-local skills:**

   ```
   /init-skills
   ```

   This creates `.opencode/skills/project/SKILL.md` and `conventions.md`

2. **Install SkillGuard (optional but recommended):**

   ```
   /init-skill-guard
   ```

   This blocks file edits until skills are loaded

3. **Commit the `.opencode/` directory:**
   ```bash
   git add .opencode/
   git commit -m "Add OpenCode project-local configuration"
   ```

### Project Skill Template

The `project` skill should capture:

- **Stack** - Languages, frameworks, versions
- **Structure** - Where features live (e.g., `src/features/`, `app/`)
- **Commands** - How to format, lint, test, build (copy-pasteable)
- **Boundaries** - Architecture rules specific to this repo
- **Testing** - Test commands and risk-based verification expectations
- **Security** - Any repo-specific security notes

### SkillGuard Plugin

The SkillGuard plugin enforces skill loading:

```typescript
// Blocks file modifications until skills are loaded
if (loaded.size === 0 && isEditLikeTool(tool)) {
  throw new Error("SkillGuard: load skills before editing files");
}
```

This prevents agents from making changes without proper guidance loaded.

---

## Quality Assurance

### Linting Tools

| Script                 | Purpose                  | Command                              |
| ---------------------- | ------------------------ | ------------------------------------ |
| **skills_lint.py**     | Validate skill structure | `python3 scripts/skills_lint.py`     |
| **benchmarks_lint.py** | Validate benchmark files | `python3 scripts/benchmarks_lint.py` |

### Skills Lint Checks

The linter validates:

- ✅ Frontmatter has `name` and `description`
- ✅ Skill name matches directory name
- ✅ Name follows `^[a-z0-9]+(-[a-z0-9]+)*$` pattern
- ✅ Router references all leaf docs
- ✅ Leaf docs exist (no broken links)
- ✅ V2 skills have required sections:
  - `## When to load`
  - `## When NOT to load`
  - `## Core rules`
  - `## Minimal examples`
  - `## Anti-patterns`
  - `## Checklist`

### CI-Like Checks

For this repo specifically:

```bash
python3 scripts/skills_lint.py
python3 scripts/benchmarks_lint.py
npx prettier --check .
```

### Benchmarks

Benchmarks are regression tests for skills:

```markdown
Prompt: "Implement this demonstrated Rails multi-record workflow with a transaction and external handoff"
Expected loads:

- skills/rails/SKILL.md
- skills/rails/application-services-and-results.md
- skills/rails/api-contracts-and-responses.md
  Expected traits:
- Application service is used only for the demonstrated multi-record, transaction, or external workflow
- Ruby 3.2+ Data Success/Failure contracts preserve error hashes with field/base arrays
- API responses use the uniform success/failure envelopes and collection wrapper when relevant
- One proportionate deterministic check proves a material risk
```

---

## Contributing

### Adding a New Task Skill

1. **Create the directory:**

   ```bash
   mkdir skills/my-skill
   ```

2. **Create SKILL.md with frontmatter:**

   ```yaml
   ---
   name: my-skill
   description: Brief description of what this skill covers
   ---
   ```

3. **Follow the authoring standard:**
   - Load `skills/skill-authoring/SKILL.md`
   - Follow `authoring-standard.md` template
   - Include all required sections

4. **Create focused leaf docs:**
   - One topic per leaf
   - Include minimal examples
   - Add routing table entries

5. **Validate with linter:**
   ```bash
   python3 scripts/skills_lint.py
   ```

Role-contract skills intentionally have no leaves: their wrapper-gated `SKILL.md` contains the complete mandatory role behavior so it remains available to constrained modes such as YOLO.

### Task-Skill Authoring Principles

1. **Router-first** - Every task skill must have a routing table
2. **Narrow leaves** - One topic per leaf document
3. **Decision-oriented** - "When to load / When NOT to load"
4. **Example-rich** - 1-3 canonical code examples per leaf
5. **Cross-references** - Link to related skills
6. **Anti-patterns** - Explicit "don't do this" guidance

### File Organization

```
~/.config/opencode/
├── opencode.json          # Main configuration
├── AGENTS.md              # Global rules
├── instructions/            # Modular instruction files
│   ├── core.md
│   ├── testing.md
│   ├── security.md
│   └── ...
├── agents/                   # Coding, UI, and PR-review agent tiers
│   ├── orchestrator.md
│   ├── economy-orchestrator.md
│   ├── yolo-orchestrator.md
│   ├── yolo-eco-orchestrator.md
│   ├── yolo-flash-orchestrator.md
│   ├── flash-orchestrator.md
│   ├── pr-review-orchestrator.md
│   ├── economy-pr-review-orchestrator.md
│   ├── pr-reviewer.md
│   ├── economy-pr-reviewer.md
│   ├── flash-pr-reviewer.md
│   ├── pr-review-adjudicator.md
│   ├── principal-engineer.md
│   ├── implementation-engineer.md
│   ├── economy-implementation-engineer.md
│   ├── flash-implementation-engineer.md
│   ├── bounded-worker.md
│   ├── economy-bounded-worker.md
│   ├── flash-bounded-worker.md
│   ├── repository-analyst.md
│   ├── economy-repository-analyst.md
│   ├── flash-repository-analyst.md
│   ├── flash-vision-scout.md
│   └── ui-ux-analyst.md
├── skills/                  # Skill library
│   ├── orchestrator-contract/
│   ├── yolo-orchestrator-contract/
│   ├── implementation-engineer-contract/
│   ├── bounded-worker-contract/
│   ├── repository-analyst-contract/
│   ├── vision-scout-contract/
│   ├── pr-reviewer-contract/
│   ├── pr-review-orchestrator-contract/
│   ├── ruby/
│   ├── rails/
│   ├── python/
│   ├── nextjs/
│   └── ... (35+ skills)
├── commands/                # Custom commands
│   ├── skills.md
│   ├── init-skills.md
│   ├── tdd.md
│   └── ... (25+ commands)
├── profiles/
│   └── yolo.json            # Process-wide YOLO safety policy
├── scripts/                 # QA utilities
│   ├── skills_lint.py
│   ├── benchmarks_lint.py
│   ├── yolo                 # Full-stack YOLO launcher
│   ├── yolo-eco             # Economy-worker YOLO launcher
│   ├── yolo-flash           # Flash-worker YOLO launcher
│   └── opencode-yolo        # Backward-compatible full-stack alias
└── templates/               # Project templates
    ├── project-local-skills/
    └── project-local-plugins/
```

### Pull Request Guidelines

1. Run all linting checks before submitting
2. Follow the skill authoring standard
3. Include minimal examples in leaf docs
4. Update routing tables when adding leaves
5. Add benchmarks for new skills when applicable

---

## Summary

This OpenCode configuration provides:

- **35+ specialized skills** with router-first architecture
- **Premium, Luna Fast economy, and direct DeepSeek families with shared specialists**
- **25+ commands** for common workflows
- **Project-local support** for team conventions
- **Guardrails and linting** for quality assurance

The system is designed to make AI coding assistants:

1. **Predictable** - Same input produces same output
2. **Consistent** - Follows conventions across projects
3. **Production-quality** - Enforces best practices by default
4. **Efficient** - Loads only necessary context

**Start with `/skills` to see the skill loading workflow in action.**
