---
description: Run linting and fix what can be auto-fixed
---

Run the project's lint command(s) and fix issues.

$ARGUMENTS

Workflow:

1. Inspect the relevant package/task configuration and project guidance for existing check and fix commands, including what they execute. Use the repository's package manager and installed tools.
2. Run the existing safe autofix command for the requested scope, or the installed linter's supported correction mode with the same configuration. Do not blindly append flags or trigger unrelated repository-wide rewrites. In read-only scope, run check mode only.
3. Inspect the diff and preserve pre-existing work. Let the tool handle mechanical corrections; manually address only remaining diagnostics that require judgment or cannot be fixed automatically. Do not enable unsafe fixes, weaken rules, or add suppressions merely to pass.
4. Re-run the relevant lint check. Report remaining or unrelated failures without expanding scope.
