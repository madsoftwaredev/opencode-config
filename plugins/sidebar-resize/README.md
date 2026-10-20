# Resizable OpenCode sidebar

Resizes the **whole existing right-hand session sidebar**, including its title,
context, MCP, subagents, usage, and footer. It does not create a panel or replace
any sidebar content. The left-hand session tabs are unchanged.

- Drag the sidebar's **left edge**. Its two-cell handle highlights on hover.
- Use `/sidebar-width 60` to set its width in terminal columns, or select
  **Set sidebar width** from `Ctrl+P`.
- Use `/sidebar-width reset` to restore the original 42-column width.
- Width is saved across restarts and synced across TUI instances.
- Keeps at least 64 columns for the transcript when displayed side by side.
  In narrow terminals, OpenCode's existing overlay behavior is preserved.

Auto-discovered from `~/.config/opencode/plugins/sidebar-resize/tui.tsx`.
Restart the TUI to load it; no server restart or `cli.json` changes are needed.

## Compatibility

OpenCode V2 has no public sidebar-width API. This plugin uses the exposed
OpenTUI renderer to locate and resize the original sidebar and its host pane.
The adapter targets **OpenCode 2.1.0 / OpenTUI 0.6.6**, matches the inspected host layout, refuses
unrecognized layouts with a warning, and restores original widths when unloaded.
An OpenCode update may require updating the adapter. No installed binaries or
OpenCode source files are patched.

Existing sections keep their own text-formatting limits; widening the container
does not remove truncation explicitly applied by another plugin.

## Development checks

From this directory:

```sh
bun install
bun run test
bun run typecheck
```

Tests use **OpenTUI 0.6.6** and Solid lifecycle mounting against a structural fixture
of the inspected host sidebar. They cover whole-sidebar resizing, mouse dragging,
persistence, terminal resizing, and cleanup; they do not launch OpenCode or prove
live-host behavior. The layout reference is `packages/tui/src/routes/session/sidebar.tsx`
and `packages/tui/src/component/session-frame.tsx` in the OpenCode checkout at
`32b41bab136f02b17d285825d36b213798f67cb6`.

### Actual-host verification

On 2026-10-20, the installed **OpenCode 2.1.0** binary was checked in an isolated
headless PTY at **180 × 50**, using its actual render tree (not a fixture).
The plugin was auto-discovered through a controlled global `plugins` symlink,
not an explicit CLI package entry.
The run used disposable HOME/XDG directories, a private `--standalone` server
and database, and a fake local provider endpoint. Sounds and notifications were
disabled; no prompts or generations were sent and no existing user sessions changed.

| Action | Sidebar width | Session pane width | Handle x |
| --- | ---: | ---: | ---: |
| Initial layout | 42 | 138 | 138 |
| Dispatch `sidebar-resize.width` with `60` | 60 | 120 | 120 |
| SGR mouse press/drag/release through the PTY | 80 | 100 | 100 |
| Dispatch reset | 42 | 138 | 138 |

Resizing the PTY from 180 to 100 columns unmounted the sidebar handle and expanded
the session pane to 100 columns. Restoring 180 columns remounted the handle at
x=138, with sidebar width 42 and session pane width 138.

Evidence: `probe.jsonl` and `terminal.ansi` under
`/private/var/folders/z1/0qhm22zd4ks8gcb4sf89k0y00000gp/T/opencode/sidebar-host-probe-20261020/run-1792504177862262000/`.
Physical-terminal behavior and a human-operated drag remain unverified.

OpenTUI 0.6.6 removed `getLayoutNode()`. The adapter uses Renderable's direct
`getWidth()`, `getPadding()`, and `getPositionType()` style getters instead;
`getLayout()` returns computed geometry and is not a replacement for these getters.
Development dependencies are not needed to load the plugin in OpenCode.
