import { expect, test } from "bun:test";
import { islandModel, toGoalView } from "./goal-rpc";

const goal = {
  sessionID: "ses_1",
  owner: "/proj",
  text: "land the migration",
  notes: [],
  status: "active",
  createdAt: 1,
  updatedAt: 1,
  nudges: 3,
  budget: 12,
};

test("toGoalView maps state and hides done goals behind active", () => {
  expect(toGoalView(goal, false)).toEqual({
    active: true,
    text: "land the migration",
    status: "active",
    nudges: 3,
    budget: 12,
  });

  const paused = toGoalView({ ...goal, status: "paused", pauseReason: "budget" }, false);
  expect(paused.active).toBe(true);
  expect(paused.pauseReason).toBe("budget");

  const done = toGoalView({ ...goal, status: "done", doneSummary: "shipped" }, false);
  expect(done.active).toBe(false);
  expect(done.status).toBe("done");

  expect(toGoalView(goal, true).inherited).toBe(true);
  expect(toGoalView(goal, false).inherited).toBeUndefined();
});

test("islandModel hides when there is no live goal", () => {
  expect(islandModel({ active: false })).toEqual({ visible: false, line: "" });
  expect(islandModel({ active: true })).toEqual({ visible: false, line: "" });
});

test("islandModel shows the goal with its loop counters", () => {
  const model = islandModel(toGoalView(goal, false));
  expect(model.visible).toBe(true);
  expect(model.line).toBe("⚑ GOAL · land the migration · loop 3/12");
});

test("islandModel marks paused goals and their reason", () => {
  const view = toGoalView({ ...goal, status: "paused", pauseReason: "budget" }, false);
  expect(islandModel(view).line).toBe("⏸ GOAL · land the migration · paused (budget)");
});

test("islandModel marks inherited goals", () => {
  const view = toGoalView(goal, true);
  expect(islandModel(view).line).toBe("⚑ GOAL (parent) · land the migration · loop 3/12");
});

test("islandModel truncates long goal text to fit the width", () => {
  const view = toGoalView({ ...goal, text: "word ".repeat(60).trim() }, false);
  const model = islandModel(view, 40);
  expect(model.line.length).toBeLessThanOrEqual(40);
  expect(model.line.endsWith("loop 3/12")).toBe(true);
  expect(model.line).toContain("…");
});

test("islandModel collapses whitespace in goal text", () => {
  const view = toGoalView({ ...goal, text: "land   the\n\nmigration" }, false);
  expect(islandModel(view).line).toContain("land the migration");
});
