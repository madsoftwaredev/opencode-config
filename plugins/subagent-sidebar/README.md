# Subagent sidebar for OpenCode V2

`local.subagent-sidebar` is a CLI/TUI-only plugin. It adds a live `SUBAGENTS`
section to the session sidebar without changing server-side subagent execution.

- Shows child and nested subagent sessions with live status.
- Shows a shortened current task or tool activity.
- Click a row to open that session.
- Click `+N more` to expand all children into a scrollable list.
- Use the button below the list to collapse it.
- Clickable rows and controls have a subtle theme-colored hover highlight.

It is auto-discovered from `~/.config/opencode/plugins/` and does not need a
server reload. Restart the OpenCode TUI after changing the plugin.

## Local check

```sh
bun test ./plugins/subagent-sidebar/subagent-view.test.js
bun build ./plugins/subagent-sidebar/tui.tsx --target=bun --external '@opencode/*' --external '@opentui/*' --external 'solid-js'
```
