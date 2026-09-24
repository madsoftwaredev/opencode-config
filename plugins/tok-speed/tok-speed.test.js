import assert from "node:assert/strict"
import { test } from "node:test"
import { formatSpeed, latestSpeed } from "./tok-speed.ts"

const fast = { providerID: "example", id: "fast" }
const slow = { providerID: "example", id: "slow" }

const assistant = (model, output, streamed, completed) => ({
  type: "assistant",
  model,
  tokens: { output },
  time: { streamed, completed },
})

test("uses output tokens and streaming time, not prompt time or input tokens", () => {
  const messages = [{ ...assistant(fast, 84, 5000, 7000), time: { created: 0, streamed: 5000, completed: 7000 }, tokens: { input: 900, output: 84 } }]
  assert.equal(latestSpeed(messages), 42)
  assert.equal(formatSpeed(latestSpeed(messages)), "42 tok/s")
})

test("keeps the last completed speed while a new response is streaming", () => {
  const messages = [assistant(fast, 40, 1000, 2000), { type: "assistant", model: fast, time: { streamed: 3000 } }]
  assert.equal(latestSpeed(messages, fast), 40)
  assert.equal(latestSpeed([...messages, assistant(fast, 90, 4000, 6000)], fast), 45)
})

test("does not show another model's speed after a model switch", () => {
  const messages = [assistant(fast, 40, 1000, 2000), { type: "assistant", model: slow, time: { streamed: 3000 } }]
  assert.equal(latestSpeed(messages), undefined)
  assert.equal(latestSpeed(messages, slow), undefined)
  assert.equal(latestSpeed([...messages, assistant(slow, 60, 4000, 6000)], slow), 30)
})

test("skips invalid timings and keeps a valid zero-token measurement", () => {
  const messages = [assistant(fast, 20, 1000, 2000), assistant(fast, 80, 4000, 4000)]
  assert.equal(latestSpeed(messages), 20)
  assert.equal(latestSpeed([]), undefined)
  assert.equal(latestSpeed([assistant(fast, 0, 1000, 2000)]), 0)
  assert.equal(latestSpeed([assistant(fast, -1, 1000, 2000)]), undefined)
  assert.equal(formatSpeed(undefined), "— tok/s")
  assert.equal(formatSpeed(0), "0 tok/s")
  assert.equal(formatSpeed(42.4), "42 tok/s")
})
