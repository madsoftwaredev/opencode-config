/** @jsxImportSource @opentui/solid */

import { BoxRenderable, ScrollBoxRenderable, TextRenderable, Yoga } from "@opentui/core"
import { Plugin } from "@opencode/plugin/tui"
import { createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js"
import { attachHeader, type Attachment, type Core } from "./header"

// OpenCode rewrites "@opentui/*" specifiers in this entrypoint and hands over
// the host's own constructors, so ./header.ts can stay free of those imports.
// TypeScript cannot check across that boundary, hence the single cast.
const core = { BoxRenderable, ScrollBoxRenderable, TextRenderable, Yoga } as unknown as Core

export default Plugin.define({
  id: "chat-title",
  setup(context) {
    const [settings, update] = context.storage.store<{ enabled: boolean }>("settings", {
      initial: { enabled: true },
    })
    // `override` applies a toggle immediately and is dropped once the store
    // catches up, so a failed write falls back to the persisted value.
    const [override, setOverride] = createSignal<boolean>()
    const enabled = createMemo(() => override() ?? settings.enabled !== false)

    const toggle = async () => {
      const next = !enabled()
      setOverride(next)
      try {
        await update((draft) => {
          draft.enabled = next
        })
      } catch (error) {
        setOverride(undefined)
        console.warn("[chat-title] Could not save setting", error)
        context.ui.toast.show({ message: "Could not save the chat title setting.", variant: "error" })
      }
    }

    // The session sidebar already shows the session title at its own top, so the
    // conversation header is only wanted while that sidebar is off screen. This
    // slot mounts only when the sidebar is rendered, which covers every reason
    // it can be absent: hidden by width or `session.sidebar`, replaced by the
    // terminal or panel pane, or a subagent session.
    const [sidebarOpen, setSidebarOpen] = createSignal(false)
    const trackSidebar = context.ui.slot({
      append: "sidebar.content",
      render: () => {
        onMount(() => setSidebarOpen(true))
        onCleanup(() => setSidebarOpen(false))
        return null
      },
    })

    // The host keys the session view by session ID, so this slot mounts once per
    // session. The zero-size anchor gives the render-tree walk a starting point
    // without costing the composer a row.
    const unregister = context.ui.slot({
      append: "session.composer.top",
      render: (input) => {
        let anchor: BoxRenderable | undefined
        const title = createMemo(() => context.data.session.get(input.sessionID)?.title ?? "")
        const [attachment, setAttachment] = createSignal<Attachment>()

        createEffect(() => {
          const node = anchor
          if (!node || !enabled() || sidebarOpen()) return
          const header = attachHeader({
            core,
            anchor: node,
            renderer: context.renderer,
            title,
            color: () => context.theme.text.base,
          })
          if (!header) {
            context.ui.toast.show({
              title: "Chat title",
              message: "Unsupported OpenCode layout; the chat title is hidden.",
              variant: "warning",
            })
            return
          }
          setAttachment(() => header)
          onCleanup(() => {
            header.dispose()
            setAttachment(undefined)
          })
        })

        createEffect(() => {
          title()
          attachment()?.refresh()
        })

        return (
          <box
            ref={(node) => {
              anchor = node
            }}
            id="chat-title.anchor"
            visible={false}
            width={0}
            height={0}
          />
        )
      },
    })

    context.keymap.layer(() => ({
      mode: "global",
      commands: [
        {
          id: "chat-title.toggle",
          title: "Toggle the chat title header",
          group: "Appearance",
          palette: true,
          slash: { name: "chat-title" },
          run: toggle,
        },
      ],
      bindings: ["chat-title.toggle"],
    }))

    return () => {
      unregister()
      trackSidebar()
    }
  },
})