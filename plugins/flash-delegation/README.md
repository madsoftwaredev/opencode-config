# Bounded Flash worker delegation

The six direct DeepSeek workers of `flash-orchestrator` and
`yolo-flash-orchestrator` may create up to **five child sessions per worker**.
Children are generic built-in `general` or `explore` helpers, not named Flash
specialists. They inherit the owner's `deepseek/deepseek-flash` model and effort.
Read-only workers (analyst, scout, reviewer) may use only `explore`.

- The native global depth ceiling is 2: orchestrator → worker → leaf.
- Agent allowlists expose only generic helpers. Before a helper's first model
  request, session rules retain the owner's file/shell restrictions and existing
  session restrictions. Explore helpers additionally deny all file edits. The
  reviewer alone writes the final review artifact; helpers return evidence.
- The native `subagent` tool is wrapped to check ancestry, generic-agent models,
  explicit model overrides, and ownership/model on resume.
- Admission is serialized per worker and reserved in durable plugin storage
  before dispatch. Five is a total budget, not merely a concurrency limit.
  A failed/ambiguous launch conservatively consumes a slot. Completed or removed
  children do not replenish the budget; resuming an owned child costs no slot.
- Generic leaf requests hide `subagent`; the execution guard also rejects deeper
  calls. Other workers and specialists retain their existing permissions.
- Native execution still owns permission checks, child creation, execution,
  results, and background/foreground behavior. This plugin does not create a
  parallel subagent implementation.

Auto-discovered from the global `plugins/` directory. After changing the plugin,
reload with `opencode api post /api/location/reload`.

```sh
bun test ./plugins/flash-delegation/index.test.js
bun build ./plugins/flash-delegation/index.ts --target=bun --external '@opencode/*'
```
