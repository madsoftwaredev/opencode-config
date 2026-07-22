---
description: Install SkillGuard plugin into the current repo
---

Install the project-local SkillGuard plugin in the current repo.

Goals:

- Copy `.opencode/plugins/skill-guard.ts` from the global template.
- Ensure the repo has the minimal plugin dependency setup.
- Do not overwrite existing files without an explicit warning.

Steps:

1. Ensure `.opencode/plugins` exists.
2. Copy the template plugin from:
   - `$HOME/.config/opencode/templates/project-local-plugins/.opencode/plugins/skill-guard.ts`
3. If `.opencode/package.json` does not exist, create it with:
   - dependency: `@opencode-ai/plugin`
   - keep it minimal; do not modify existing package.json files.
4. Print the exact files created/modified.

Validation:

- Show `ls -R .opencode/plugins`.
