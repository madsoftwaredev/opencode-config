---
description: Bootstrap project-local skills from the repo (project skill)
---

Bootstrap project-local skills for this repo under `.opencode/skills/`.

Goals:

- Create a `project` skill router that captures repo-specific conventions.
- Prefer observation over guesswork: read files to detect stack and commands.
- Keep the skill small and high-signal.
- Do not overwrite existing `.opencode/skills/project/*` files without warning.

Non-goals:

- Do not invent commands, paths, versions, or conventions that are not present in the repo.
- Do not add a large skill tree on day 1; start with `project` only.

Process:

1. Discover the repo and detect the stack by reading (in order, if present):

- JS/TS: `package.json`, `pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`, `bun.lockb`
- Ruby/Rails: `Gemfile`, `Gemfile.lock`
- Python: `pyproject.toml`, `requirements.txt`
- Go: `go.mod`
- Rust: `Cargo.toml`
- Flutter/Dart: `pubspec.yaml`
- CI: `.github/workflows/*.yml`, `.gitlab-ci.yml`

2. Extract _actual_ developer commands (copy-pastable) from the repo:

- Prefer `package.json` scripts.
- Otherwise: Makefile targets, README, or existing CI steps.
- If nothing exists, propose a minimal default _and mark it as proposed_.

3. Create only these two files:

- `.opencode/skills/project/SKILL.md` (router)
- `.opencode/skills/project/conventions.md` (leaf)

Do not create additional skills unless the repo clearly has non-standard conventions.

4. Generate `.opencode/skills/project/SKILL.md` using this exact skeleton:

```md
---
name: project
description: Repo-specific conventions (commands, structure, boundaries) for <repo-name>
---

# Project Skill Router

Use this skill first for any non-trivial change in this repo.

## When to load

- You are making any non-trivial change.
- You need the repo's command and structure conventions.

## When NOT to load

- You are answering a pure conceptual question with no repo changes.

## Routing table

| If the task is about...                 | Load file        |
| --------------------------------------- | ---------------- |
| Commands, structure, boundaries, and QA | `conventions.md` |
```

5. Generate `.opencode/skills/project/conventions.md` with real, repo-derived content:

Required sections:

- `## Stack`
- `## Repo Structure`
- `## Commands (Copy/Paste)`
- `## Boundaries and Ownership`
- `## Testing Strategy`
- `## Docs and Public APIs`
- `## Security Notes`
- `## Load Order`

Rules for `conventions.md`:

- Commands must be copy-pastable code blocks.
- If you propose commands (because none exist), label them `Proposed`.
- Repo structure should name the real top-level directories and what they own.
- Include one short checklist for "before you commit".

6. Validate:

```bash
python3 "$HOME/.config/opencode/scripts/skills_lint.py" --skills-dir .opencode/skills
```

Output:

- List the created files.
- Summarize detected stack and the extracted commands.
- If anything required was missing, list what was missing and what you assumed (if any).
