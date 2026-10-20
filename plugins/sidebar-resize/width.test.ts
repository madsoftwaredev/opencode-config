import { expect, test } from "bun:test";
import { clampWidth, DEFAULT_WIDTH, parseWidth, preferredWidth } from "./width";

test("validates stored preferences and command input", () => {
  for (const value of [undefined, null, "60", NaN, Infinity, -1, 0]) {
    expect(preferredWidth(value)).toBe(DEFAULT_WIDTH);
  }
  expect(preferredWidth(60.4)).toBe(60);
  expect(parseWidth(" 60 ")).toBe(60);
  for (const value of ["", "0", "-1", "abc", "12px", "1.5", "Infinity"]) {
    expect(parseWidth(value)).toBeUndefined();
  }
});

test("keeps transcript space in side-by-side mode and fits narrow overlays", () => {
  expect(clampWidth(60, 160, false)).toBe(60);
  expect(clampWidth(200, 140, false)).toBe(76);
  expect(clampWidth(10, 140, false)).toBe(28);
  expect(clampWidth(60, 50, true)).toBe(48);
  expect(clampWidth(60, 20, true)).toBe(18);
});
