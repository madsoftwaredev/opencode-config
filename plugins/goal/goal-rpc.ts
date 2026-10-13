import { Rpc } from "@opencode/plugin/rpc";
import type { GoalState } from "./goal-state";

/**
 * The display contract shared by the server plugin and the TUI goal island.
 *
 * `active` means "an island-visible goal exists" (set or paused, not done).
 * The RPC keeps the TUI out of the server plugin's storage.
 */

export interface GoalView {
  active: boolean;
  text?: string;
  status?: "active" | "paused" | "done";
  nudges?: number;
  budget?: number;
  pauseReason?: string;
  /** True when the goal belongs to an ancestor session. */
  inherited?: boolean;
}

const viewProperties = {
  active: { type: "boolean" },
  text: { type: "string" },
  status: { type: "string", enum: ["active", "paused", "done"] },
  nudges: { type: "integer" },
  budget: { type: "integer" },
  pauseReason: { type: "string" },
  inherited: { type: "boolean" },
};

export const GoalRpc = Rpc.define({
  id: "goal",
  methods: {
    state: {
      input: {
        type: "object",
        properties: { sessionID: { type: "string" } },
        required: ["sessionID"],
        additionalProperties: false,
      },
      output: {
        type: "object",
        properties: viewProperties,
        required: ["active"],
        additionalProperties: false,
      },
    },
  },
  events: {
    updated: {
      schema: {
        type: "object",
        properties: { sessionID: { type: "string" }, ...viewProperties },
        required: ["sessionID", "active"],
        additionalProperties: false,
      },
    },
  },
});

/** Map persisted state to the island view. Done goals hide the island. */
export function toGoalView(state: GoalState, inherited: boolean): GoalView {
  return {
    active: state.status !== "done",
    text: state.text,
    status: state.status,
    nudges: state.nudges,
    budget: state.budget,
    ...(state.pauseReason ? { pauseReason: state.pauseReason } : {}),
    ...(inherited ? { inherited: true } : {}),
  };
}

export interface IslandModel {
  visible: boolean;
  line: string;
}

function truncateText(text: string, limit: number): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed.length > limit ? `${collapsed.slice(0, Math.max(1, limit - 1))}…` : collapsed;
}

/**
 * The single line the goal island renders. `width` is the terminal width in
 * cells; the goal text gives up its space so the counters always fit.
 */
export function islandModel(view: GoalView, width = 120): IslandModel {
  if (!view.active || !view.text) return { visible: false, line: "" };

  const marker = view.status === "paused" ? "⏸" : "⚑";
  const label = view.inherited ? "GOAL (parent)" : "GOAL";
  const tail =
    view.status === "paused"
      ? `paused (${view.pauseReason ?? "stopped"})`
      : `loop ${view.nudges ?? 0}/${view.budget ?? 0}`;

  const head = `${marker} ${label}`;
  const text = truncateText(view.text, Math.max(16, width - head.length - tail.length - 6));
  return { visible: true, line: `${head} · ${text} · ${tail}` };
}
