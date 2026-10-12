# goal

A real `/goal` for OpenCode: a durable objective that survives compaction and
restarts, stays in front of the model, and re-prompts the session until the goal
is verified done or the loop is stopped.

Unlike a Markdown command (which injects one prompt and disappears), this plugin
owns state and mechanics:

| Piece | What it does |
| --- | --- |
| `/goal` command | Set and manage the goal lifecycle |
| `context` hook | Re-injects the goal into every model call (compaction-proof) |
| `goal_*` tools | The agent records progress and ends the loop honestly |
| `session.idle` loop | Re-prompts the session while the goal is open |
| Plugin storage | Goal state persists across restarts and reloads |

## Commands

| Command | Effect |
| --- | --- |
| `/goal <text>` or `/goal set <text>` | Set (replace) the goal and start working |
| `/goal status` | Show the goal, progress notes, and loop state |
| `/goal update <text>` | Reword the goal; reopens a done goal |
| `/goal done [summary]` | Mark done and stop the loop |
| `/goal pause [reason]` / `/goal resume` | Stop / re-arm loop nudges |
| `/goal clear` | Remove the goal |
| `/goal budget <n>` | Set the loop budget for this goal |

## Agent tools

- `goal_status` — read the goal and loop state.
- `goal_progress(note)` — record a checkpoint, decision, or blocker.
- `goal_done(summary)` — end the loop; only valid once the goal is verified.

## Loop mechanics

1. `/goal ...` stores the goal and kicks off a turn.
2. Every model call in that session gets the goal block injected (goal text,
   progress notes, remaining budget, protocol), so compaction cannot drop it.
3. When the session goes idle and the goal is still open, the plugin sends a
   `[goal loop]` nudge and counts it against the budget.
4. The loop pauses with a notice when the budget is spent, on `/goal pause`, or
   when the goal is marked done. `/goal resume` resets the counter and re-arms.

Subtask sessions inherit their parent's goal as context only; the parent session
owns the goal and its tools.

## Options

```jsonc
{
  "plugins": [
    {
      "package": "./plugins/goal",
      "options": {
        "budget": 12,          // loop nudges per goal before auto-pause
        "resumeOnStart": true, // re-arm open goals when the plugin loads
        "inherit": true        // inject the parent goal into subtask sessions
      }
    }
  ]
}
```

The plugin loads from `plugins/goal` without options; the defaults above apply.

## Notes

- `/gauntlet` remains for a one-shot prose loop in the current chat. `/goal` is
  the persistent version: state, tools, and an actual loop.
- A goal is scoped to its session. Set it in the session that should work on it.
- Loop nudges are synthetic messages (`[goal loop] ...`), visible in the
  transcript and queued behind anything you have already typed.

## Tests

```sh
bun test plugins/goal
```
