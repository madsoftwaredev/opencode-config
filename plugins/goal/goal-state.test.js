import { expect, test } from "bun:test";
import {
  applyCommand,
  asGoalState,
  asInflightSnapshot,
  goalSystemBlock,
  inheritedSystemBlock,
  inflightSessions,
  kickoffPrompt,
  loopDecision,
  nudgePrompt,
  parseCommand,
  statusReport,
  withNote,
  DEFAULT_BUDGET,
  NOTE_CAP,
} from "./goal-state";

const ctx = { sessionID: "ses_1", owner: "/proj", now: 1000, defaultBudget: 12 };

function setGoal(text, commandCtx = ctx) {
  return applyCommand(undefined, parseCommand(`set ${text}`), commandCtx).state;
}

test("parseCommand treats empty input as status", () => {
  expect(parseCommand("")).toEqual({ verb: "status" });
  expect(parseCommand("   ")).toEqual({ verb: "status" });
  expect(parseCommand("/goal")).toEqual({ verb: "status" });
  expect(parseCommand("/goal status")).toEqual({ verb: "status" });
  expect(parseCommand("show")).toEqual({ verb: "status" });
});

test("parseCommand strips a leading /goal but not the word goal", () => {
  expect(parseCommand("/goal fix the flaky test")).toEqual({ verb: "set", text: "fix the flaky test" });
  expect(parseCommand("goal: fix the flaky test")).toEqual({ verb: "set", text: "goal: fix the flaky test" });
});

test("parseCommand maps verbs and keeps trailing text", () => {
  expect(parseCommand("set ship the release")).toEqual({ verb: "set", text: "ship the release" });
  expect(parseCommand("update ship it Friday")).toEqual({ verb: "update", text: "ship it Friday" });
  expect(parseCommand("done tests are green")).toEqual({ verb: "done", summary: "tests are green" });
  expect(parseCommand("finish")).toEqual({ verb: "done", summary: undefined });
  expect(parseCommand("pause waiting on review")).toEqual({ verb: "pause", reason: "waiting on review" });
  expect(parseCommand("budget 5")).toEqual({ verb: "budget", budget: 5 });
});

test("parseCommand maps bare lifecycle words to their verbs", () => {
  expect(parseCommand("continue")).toEqual({ verb: "resume" });
  expect(parseCommand("resume")).toEqual({ verb: "resume" });
  expect(parseCommand("stop")).toEqual({ verb: "clear" });
  expect(parseCommand("clear")).toEqual({ verb: "clear" });
  expect(parseCommand("show")).toEqual({ verb: "status" });
});

test("bare lifecycle words with trailing text stay goal text", () => {
  expect(parseCommand("continue the refactor")).toEqual({ verb: "set", text: "continue the refactor" });
  expect(parseCommand("stop the bleeding")).toEqual({ verb: "set", text: "stop the bleeding" });
  expect(parseCommand("clear the cache")).toEqual({ verb: "set", text: "clear the cache" });
  expect(parseCommand("status report for the team")).toEqual({ verb: "set", text: "status report for the team" });
});

test("parseCommand treats unknown first words as goal text", () => {
  expect(parseCommand("make the sidebar resizable")).toEqual({ verb: "set", text: "make the sidebar resizable" });
});

test("parseCommand rejects a bad budget", () => {
  expect(parseCommand("budget zero").verb).toBe("error");
  expect(parseCommand("budget 2.5").verb).toBe("error");
});

test("set creates an active goal and kicks off work", () => {
  const result = applyCommand(undefined, parseCommand("set land the migration"), ctx);
  expect(result.kickoff).toBe(true);
  expect(result.state).toMatchObject({
    sessionID: "ses_1",
    owner: "/proj",
    text: "land the migration",
    status: "active",
    nudges: 0,
    budget: DEFAULT_BUDGET,
    notes: [],
  });
});

test("set replaces an existing goal but keeps its budget", () => {
  const first = setGoal("first");
  const result = applyCommand({ ...first, budget: 3 }, parseCommand("set second"), ctx);
  expect(result.state.text).toBe("second");
  expect(result.state.budget).toBe(3);
});

test("done stops the loop with a summary", () => {
  const goal = setGoal("ship it");
  const result = applyCommand(goal, parseCommand("done all checks green"), ctx);
  expect(result.state.status).toBe("done");
  expect(result.state.doneSummary).toBe("all checks green");
  expect(loopDecision(result.state)).toBe("skip");
});

test("done without a summary records a user completion", () => {
  const goal = setGoal("ship it");
  const result = applyCommand(goal, parseCommand("done"), ctx);
  expect(result.state.doneSummary).toBe("Marked done by the user.");
});

test("pause stops nudges and resume re-arms with a fresh budget", () => {
  const goal = setGoal("ship it");
  const paused = applyCommand({ ...goal, nudges: 4 }, parseCommand("pause"), ctx);
  expect(paused.state.status).toBe("paused");
  expect(loopDecision(paused.state)).toBe("skip");

  const resumed = applyCommand(paused.state, parseCommand("resume"), ctx);
  expect(resumed.nudge).toBe(true);
  expect(resumed.state.status).toBe("active");
  expect(resumed.state.nudges).toBe(0);
});

test("update rewrites the goal text and reopens a done goal", () => {
  const goal = setGoal("ship it");
  const updated = applyCommand(goal, parseCommand("update ship it on Friday"), ctx);
  expect(updated.state.text).toBe("ship it on Friday");
  expect(updated.notice).toContain("updated");

  const done = applyCommand(goal, parseCommand("done"), ctx).state;
  const reopened = applyCommand(done, parseCommand("update ship it Monday"), ctx);
  expect(reopened.state.status).toBe("active");
  expect(reopened.state.nudges).toBe(0);
  expect(reopened.state.doneSummary).toBeUndefined();
});

test("update without a goal sets one", () => {
  const result = applyCommand(undefined, parseCommand("update ship it"), ctx);
  expect(result.state.text).toBe("ship it");
  expect(result.kickoff).toBe(true);
});

test("raising the budget past spent nudges re-arms a budget-paused loop", () => {
  const goal = { ...setGoal("ship it"), nudges: 12, status: "paused", pauseReason: "budget" };
  const raised = applyCommand(goal, parseCommand("budget 20"), ctx);
  expect(raised.state.status).toBe("active");
  expect(raised.state.budget).toBe(20);
  expect(raised.nudge).toBe(true);

  const lowered = applyCommand(goal, parseCommand("budget 2"), ctx);
  expect(lowered.state.status).toBe("paused");
  expect(lowered.nudge).toBeUndefined();
});

test("clear and state commands guard against a missing goal", () => {
  expect(applyCommand(undefined, parseCommand("clear"), ctx).error).toContain("No goal");
  expect(applyCommand(undefined, parseCommand("done"), ctx).error).toContain("No goal");
  expect(applyCommand(undefined, parseCommand("resume"), ctx).error).toContain("No goal");
  expect(applyCommand(setGoal("x"), parseCommand("clear"), ctx).clear).toBe(true);
});

test("loopDecision pauses only when the budget is spent", () => {
  expect(loopDecision(undefined)).toBe("skip");
  expect(loopDecision(setGoal("ship it"))).toBe("nudge");
  expect(loopDecision({ ...setGoal("ship it"), nudges: 12 })).toBe("pause-budget");
  expect(loopDecision({ ...setGoal("ship it"), status: "done" })).toBe("skip");
  expect(loopDecision({ ...setGoal("ship it"), status: "paused" })).toBe("skip");
});

test("withNote appends and caps the ledger, newest kept", () => {
  let goal = setGoal("ship it");
  for (let i = 0; i < NOTE_CAP + 5; i += 1) goal = withNote(goal, `note ${i}`, 2000 + i);
  expect(goal.notes).toHaveLength(NOTE_CAP);
  expect(goal.notes.at(-1).text).toBe(`note ${NOTE_CAP + 4}`);
  expect(goal.notes[0].text).toBe("note 5");
});

test("system block carries the goal, notes, and remaining budget", () => {
  const goal = withNote({ ...setGoal("ship it"), nudges: 2 }, "unblocked the fixture", 2000);
  const block = goalSystemBlock(goal);
  expect(block).toContain("ship it");
  expect(block).toContain("- unblocked the fixture");
  expect(block).toContain("10 of 12 loop nudges remaining");
  expect(block).toContain("goal_progress");
  expect(block).toContain("goal_done");
});

test("kickoff and nudge prompts reference the goal and the loop", () => {
  const goal = setGoal("ship it");
  expect(kickoffPrompt(goal)).toContain("ship it");
  expect(kickoffPrompt(goal)).toContain("goal_done");
  expect(nudgePrompt(goal)).toContain("ship it");
  expect(nudgePrompt(goal)).toContain("[goal loop]");
  expect(nudgePrompt(goal, "resumed")).toContain("[goal resumed]");
});

test("statusReport covers missing, active, and done goals", () => {
  expect(statusReport(undefined)).toContain("No active goal");

  const goal = withNote(setGoal("ship it"), "opened the PR", 2000);
  const report = statusReport(goal);
  expect(report).toContain("status: active");
  expect(report).toContain("ship it");
  expect(report).toContain("- opened the PR");
  expect(report).toContain("0 of 12 nudges used");

  const done = applyCommand(goal, parseCommand("done merged"), ctx).state;
  expect(statusReport(done)).toContain("Done: merged");
});

test("asGoalState rejects junk and repairs partial state", () => {
  expect(asGoalState(undefined)).toBeUndefined();
  expect(asGoalState(null)).toBeUndefined();
  expect(asGoalState("goal")).toBeUndefined();
  expect(asGoalState({ text: "no session" })).toBeUndefined();
  expect(asGoalState({ sessionID: "ses_1", text: "x", status: "weird" })).toBeUndefined();

  const state = asGoalState({ sessionID: "ses_1", text: "x", status: "active", notes: [{ at: 1, text: "ok" }, 7] });
  expect(state.nudges).toBe(0);
  expect(state.budget).toBe(DEFAULT_BUDGET);
  expect(state.notes).toHaveLength(1);
});

test("asInflightSnapshot rejects junk and keeps only string IDs", () => {
  expect(asInflightSnapshot(undefined)).toEqual({ executing: [], shells: {} });
  expect(asInflightSnapshot("junk")).toEqual({ executing: [], shells: {} });
  expect(asInflightSnapshot({ executing: "ses_1", shells: [] })).toEqual({ executing: [], shells: {} });

  const snapshot = asInflightSnapshot({
    executing: ["ses_1", 7, null],
    shells: { sh_1: "ses_2", sh_2: 9, bad: { deep: true } },
  });
  expect(snapshot.executing).toEqual(["ses_1"]);
  expect(snapshot.shells).toEqual({ sh_1: "ses_2" });
});

test("inflightSessions joins mid-turn sessions and shell owners", () => {
  const sessions = inflightSessions({
    executing: ["ses_1", "ses_2"],
    shells: { sh_1: "ses_3", sh_2: "ses_2" },
  });
  expect([...sessions].sort()).toEqual(["ses_1", "ses_2", "ses_3"]);
});
