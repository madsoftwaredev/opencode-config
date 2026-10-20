import { expect, test } from "bun:test"
import { displayWidth, fitTitle } from "./title"

test("displayWidth counts graphemes, not code units", () => {
  expect(displayWidth("abc")).toBe(3)
  expect(displayWidth("👩‍👩‍👧‍👦")).toBe(2)
})

test("displayWidth counts wide characters as two cells", () => {
  expect(displayWidth("日本語")).toBe(6)
})

test("fitTitle collapses whitespace the way a generated title does", () => {
  expect(fitTitle("  fix   the\n  plugin loader  ", 40)).toBe("fix the plugin loader")
})

test("fitTitle leaves a short title alone", () => {
  expect(fitTitle("refactor sidebar", 40)).toBe("refactor sidebar")
})

test("fitTitle shortens with an ellipsis at the cell limit", () => {
  expect(fitTitle("refactor the sidebar plugin", 12)).toBe("refactor th…")
  expect(displayWidth(fitTitle("refactor the sidebar plugin", 12))).toBe(12)
})

test("fitTitle never exceeds the width with wide characters", () => {
  const fitted = fitTitle("日本語のチャットタイトル", 9)
  expect(fitted.endsWith("…")).toBe(true)
  expect(displayWidth(fitted)).toBeLessThanOrEqual(9)
})

test("fitTitle splits on grapheme boundaries", () => {
  expect(fitTitle("👩‍👩‍👧‍👦 family chat", 3)).toBe("👩‍👩‍👧‍👦…")
})

test("fitTitle returns nothing when there is no room", () => {
  expect(fitTitle("refactor", 0)).toBe("")
  expect(fitTitle("", 10)).toBe("")
})