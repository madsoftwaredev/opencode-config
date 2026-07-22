---
description: Create worktrees and automatically run isolated ticket subagents for safe parallel OpenCode work.
---

First action: load the `parallel-ticket-worktrees` skill, then follow its `workflow.md` guidance.

User input:

```text
$ARGUMENTS
```

Goal: create, implement, integrate, or clean up safe Git worktrees for ticket work. Treat this as a ticket-worktree orchestration workflow, not as a generic branch command.

Default behavior:

- If the user gives two or more actionable tickets and does not say setup-only, automatically create/check one worktree per ticket and launch one implementation subagent per ticket.
- If the user gives one actionable ticket and asks to work on it, create/check its worktree and launch one implementation subagent.
- If the user says setup-only, sandbox only, create only, inspect only, plan only, or no code, create/check worktrees but do not launch implementation subagents.
- If the user asks to merge, commit, move ticket state, or clean up, do only that requested integration/cleanup action with the safeguards from the skill.

Rules:

- Do not make code changes for the ticket in the current checkout.
- Ask for missing ticket ID/title, base branch, branch prefix, or action if unclear.
- Default the base branch to `main`.
- Default the worktree path to a sibling of the repo root named `<repo>-<ticket-slug>`.
- Default the branch prefix to `feature/`; use `fix/`, `refactor/`, `docs/`, or `chore/` when the user intent clearly matches.
- Before creating a worktree, inspect the repo root, current status, existing worktrees, and existing branches.
- If the branch or path already exists, stop and ask before reusing it.
- Create the sandbox with `git worktree add`; do not copy the repo manually.
- In setup-only mode, after creation, print the branch, path, and next command: `cd "<path>" && opencode`.
- In implementation mode, do not stop after printing paths. Launch the subagents automatically.
- Each implementation subagent must edit and run commands only inside its assigned worktree.
- Each implementation subagent must run a mandatory review/fix loop after coding: classify findings as MUST, SHOULD, or NICE; fix all valid MUST and SHOULD findings; rerun focused verification; repeat until clean or until 3 cycles have run.
- The main agent must review each subagent diff and rerun focused verification before bringing changes into the base checkout.

If the user asks to merge or clean up, do not do it unless they explicitly approve the merge or deletion step. Report conflicts instead of auto-resolving them.
