# Chat title header

Pins the current session title to a one-row header at the top of the chat
conversation, directly under the session tab strip.

- Shown only while the session sidebar is **not** on screen. The sidebar already
  shows the session title at its own top, so the plugin stays out of the way
  there rather than printing the title twice.
- The header returns for every reason the sidebar is absent: hidden by terminal
  width or `session.sidebar` in `cli.json`, closed because the terminal or
  panel pane took its place, and subagent sessions.
- Sits above the transcript, not over it. The host column is a flexbox, so the
  header takes one row from the transcript.
- Spans only the chat column, so the sidebar and the right-hand pane are
  unchanged.
- Follows the live title. OpenCode renames a new session once it generates a
  title, and the header updates with it.
- Shortens to the available width with a trailing `…`. Widths are measured in
  terminal cells, so CJK and emoji titles do not overflow.
- Use `/chat-title` or **Toggle the chat title header** in `Ctrl+P` to turn it
  off and on. The choice is saved across restarts and synced across TUI
  instances.

Auto-discovered from `~/.config/opencode/plugins/chat-title/tui.tsx`.
Restart the TUI to load it; no server restart or `cli.json` changes are needed.

## Compatibility

OpenCode V2 publishes no slot above the transcript. This plugin uses the exposed
OpenTUI renderer to insert the header into the session column that owns the
`session.composer.top` slot.

Sidebar visibility is read through the documented `sidebar.content` slot, which
mounts only while the sidebar renders. No private API is involved in that check.

Requires **OpenCode 2.1.0** and **OpenTUI 0.6.6** or later. The adapter uses
renderable style getters instead of the removed `getLayoutNode()` API.

The adapter for the insert matches the layout inspected in **OpenCode 2.0.27**:
the column must hold exactly three rows — the transcript (a box wrapping the
scrollbox), the one-row "jump to latest" bar, and the composer block containing
the plugin's own anchor. Anything else is left alone and reported with a warning
toast rather than painting a header in the wrong place. Initial layout-discovery
errors also leave the transcript intact rather than crashing the composer slot.
An OpenCode update may require updating the adapter. No installed binaries or
OpenCode source files are patched.

The header requests a frame after insertion and uses `onSizeChange` to refit its
text after native layout and terminal resizes. It never accesses or modifies a
raw Yoga node. Host structure remains an implementation dependency, not a public
layout guarantee.

## Development checks

From this directory:

```sh
bun install
bun run test
bun run typecheck
```

Unit tests cover title fitting and render-tree matching. Headless OpenTUI 0.6.6
integration tests cover rendering, title updates, narrow-terminal resizing,
sidebar visibility, saved-toggle wiring, disposal, and safe layout rejection.
They use the inspected host shape, not a live installed OpenCode release.
Development dependencies are not needed to load the plugin in OpenCode.
