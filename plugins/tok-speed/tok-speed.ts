type Model = { readonly id: string; readonly providerID: string; readonly variant?: string }

type Message = {
  readonly type: string
  readonly model?: Model
  readonly time?: { readonly streamed?: number; readonly completed?: number }
  readonly tokens?: { readonly output: number }
}

function sameModel(left: Model, right: Model): boolean {
  return left.providerID === right.providerID && left.id === right.id && left.variant === right.variant
}

/** Returns the most recent completed generation speed for the selected session model. */
export function latestSpeed(messages: readonly Message[], selectedModel?: Model): number | undefined {
  let model = selectedModel
  if (!model) {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].type !== "assistant") continue
      model = messages[index].model
      break
    }
  }
  if (!model) return undefined

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message.type !== "assistant" || !message.model || !sameModel(message.model, model)) continue

    const output = message.tokens?.output
    const start = message.time?.streamed
    const end = message.time?.completed
    if (output === undefined || start === undefined || end === undefined) continue

    const duration = (end - start) / 1000
    if (!Number.isFinite(output) || output < 0 || !Number.isFinite(duration) || duration <= 0) continue
    return output / duration
  }

  return undefined
}

export function formatSpeed(speed: number | undefined): string {
  return speed === undefined || !Number.isFinite(speed) || speed < 0
    ? "— tok/s"
    : `${Math.round(speed)} tok/s`
}
