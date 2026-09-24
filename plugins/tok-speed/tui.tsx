/** @jsxImportSource @opentui/solid */

import { Plugin } from "@opencode/plugin/tui"
import type { Context } from "@opencode/plugin/tui/context"
import { createEffect } from "solid-js"
import { formatSpeed, latestSpeed } from "./tok-speed"

function SpeedStatus(props: { context: Context; sessionID?: string }) {
  const { context } = props

  createEffect(() => {
    if (!props.sessionID) return
    void context.data.session.message.sync(props.sessionID).catch((error: unknown) => {
      console.warn("[tok-speed] Could not load session messages", error)
    })
  })

  const label = () => {
    if (!props.sessionID) return formatSpeed(undefined)
    const messages = context.data.session.message.list(props.sessionID)
    const model = context.data.session.get(props.sessionID)?.model
    return formatSpeed(latestSpeed(messages, model))
  }

  return (
    <text fg={context.theme.text.muted} wrapMode="none">
      {label()}
    </text>
  )
}

export default Plugin.define({
  id: "local.tok-speed",
  setup(context) {
    const refresh = (sessionID: string) => {
      const route = context.ui.router.current()
      if (route.type !== "session" || route.sessionID !== sessionID) return
      void context.data.session.message.sync(sessionID).catch((error: unknown) => {
        console.warn("[tok-speed] Could not refresh session messages", error)
      })
    }

    const stopUsage = context.data.on("session.usage.updated", (event) => refresh(event.data.sessionID))
    const stopStep = context.data.on("session.step.ended", (event) => refresh(event.data.sessionID))
    const unregister = context.ui.slot({
      append: "prompt.footer.status",
      render: ({ sessionID }) => <SpeedStatus context={context} sessionID={sessionID} />,
    })

    return () => {
      stopUsage()
      stopStep()
      unregister()
    }
  },
})
