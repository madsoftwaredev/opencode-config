---
description: Loop on a goal in the current agent and chat
subagent: false
---

Work toward this goal in the current agent and chat:

$ARGUMENTS

If the arguments identify an existing local Markdown file (for example, `PROMPT.md`, `./prompts/task.md`, or `@PROMPT.md`), read it relative to the active working directory and use its contents as the goal. Treat any accompanying text as additional constraints. If a specified file does not exist, report the missing path instead of treating the path as a goal. Otherwise, use the arguments as the inline goal. If neither the arguments nor the current conversation contain a clear goal, ask for one.

Keep the original goal and constraints as the source of truth. Establish an observable definition of done. If the goal calls for a quality comparison, inspect a specific, accessible reference rather than imagining one; ask one focused question only if the choice materially changes the outcome. For functional work, use relevant tests and other direct checks.

Work on the goal yourself, inspect the actual result, identify the biggest remaining gap, improve it, and recheck. Repeat while changes make concrete progress. Stop when the goal is verified, the user stops the run, or a blocker or lack of progress prevents an honest pass. Report the result and evidence without claiming independent review or a blind comparison.

This is a single-agent loop. Do not switch agents, spawn subagents, or start other agent sessions for this command. Keep your current tools, model, permissions, and project instructions. If a higher-priority rule of your active agent requires delegation or prevents the work, explain the conflict instead of quietly delegating or claiming success.
