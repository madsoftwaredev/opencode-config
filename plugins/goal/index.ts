import type { Plugin } from "@opencode/plugin";
import { GoalRpc, toGoalView, type GoalView } from "./goal-rpc";
import {
  applyCommand,
  asGoalState,
  goalSystemBlock,
  inheritedSystemBlock,
  kickoffPrompt,
  loopDecision,
  nudgePrompt,
  parseCommand,
  statusReport,
  withNote,
  DEFAULT_BUDGET,
  type GoalState,
} from "./goal-state";

interface GoalOptions {
  /** Maximum loop nudges per goal before the loop pauses on a spent budget. */
  budget: number;
  /** Nudge sessions whose goal is still open when the plugin loads. */
  resumeOnStart: boolean;
  /** Inject the parent goal into subtask sessions. */
  inherit: boolean;
}

function optionBudget(options: Record<string, unknown>): number {
  const value = options.budget;
  if (value === undefined) return DEFAULT_BUDGET;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error("goal: budget must be a positive integer.");
  }
  return value;
}

function optionBool(options: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const value = options[key];
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") throw new Error(`goal: ${key} must be a boolean.`);
  return value;
}

export default {
  id: "goal",
  async setup(ctx) {
    const options = (ctx.options ?? {}) as Record<string, unknown>;
    const settings: GoalOptions = {
      budget: optionBudget(options),
      resumeOnStart: optionBool(options, "resumeOnStart", true),
      inherit: optionBool(options, "inherit", true),
    };

    const owner = `${ctx.location.workspaceID ?? ""}:${ctx.location.directory}`;
    const storageKey = (sessionID: string) => `goal/${sessionID}`;

    // Write-through cache: the context hook runs on every model call.
    const cache = new Map<string, GoalState | undefined>();

    const readGoal = async (sessionID: string): Promise<GoalState | undefined> => {
      if (cache.has(sessionID)) return cache.get(sessionID);
      const state = asGoalState(await ctx.storage.get(storageKey(sessionID)));
      cache.set(sessionID, state);
      return state;
    };

    const clearGoal = async (sessionID: string): Promise<void> => {
      cache.set(sessionID, undefined);
      await ctx.storage.remove(storageKey(sessionID));
      emitGoalUpdate(sessionID, { active: false });
    };

    // Subtask sessions inherit their parent's goal as context.
    const parentOf = new Map<string, string | undefined>();

    const findAncestorGoal = async (sessionID: string): Promise<GoalState | undefined> => {
      let current: string | undefined = sessionID;
      for (let depth = 0; depth < 5 && current; depth += 1) {
        if (!parentOf.has(current)) {
          try {
            const session = await ctx.session.get({ sessionID: current });
            parentOf.set(current, session.parentID);
          } catch {
            parentOf.set(current, undefined);
          }
        }
        current = parentOf.get(current);
        if (!current) return undefined;
        const goal = await readGoal(current);
        if (goal && goal.status !== "done" && settings.inherit) return goal;
      }
      return undefined;
    };

    // 1. RPC for the TUI goal island: state reads plus `updated` events.
    const rpcRegistration = await ctx.rpc.register(GoalRpc, {
      state: async (input) => {
        const { sessionID } = input as { sessionID: string };
        const goal = await readGoal(sessionID);
        if (goal && owns(goal)) return toGoalView(goal, false);
        const inherited = await findAncestorGoal(sessionID);
        return inherited ? toGoalView(inherited, true) : { active: false };
      },
    });

    const emitGoalUpdate = (sessionID: string, view: GoalView): void => {
      void rpcRegistration.events
        .emit("updated", { sessionID, ...view })
        .catch(() => {});
    };

    const writeGoal = async (state: GoalState): Promise<void> => {
      cache.set(state.sessionID, state);
      await ctx.storage.set(storageKey(state.sessionID), state);
      emitGoalUpdate(state.sessionID, toGoalView(state, false));
    };

    /** This instance owns the loop only for goals it created. */
    const owns = (state: GoalState): boolean => !state.owner || state.owner === owner;

    const sendNudge = async (state: GoalState, label: string): Promise<void> => {
      await writeGoal({ ...state, nudges: state.nudges + 1, updatedAt: Date.now() });
      await ctx.session.synthetic({
        sessionID: state.sessionID,
        text: nudgePrompt(state, label),
        delivery: "queue",
        resume: true,
      });
    };

    const sendNotice = async (sessionID: string, text: string): Promise<void> => {
      await ctx.session.synthetic({ sessionID, text, resume: false });
    };

    // 1. Keep the goal in front of the model on every call, so it survives
    //    compaction and long turns.
    await ctx.session.hook("context", async (event) => {
      const goal = await readGoal(event.sessionID);
      if (goal && goal.status !== "done" && owns(goal)) {
        event.system.push({ type: "text", text: goalSystemBlock(goal) });
        return;
      }
      if (!goal) {
        const inherited = await findAncestorGoal(event.sessionID);
        if (inherited) event.system.push({ type: "text", text: inheritedSystemBlock(inherited) });
      }
    });

    // 2. Agent-side tools to report progress and end the loop honestly.
    await ctx.tool.transform((editor) => {
      editor.namespace({
        name: "goal",
        description: "Track progress toward this session's active goal",
      });

      editor.add({
        name: "status",
        description: "Read this session's active goal, progress notes, and goal loop state.",
        input: { type: "object", properties: {}, additionalProperties: false },
        options: { namespace: "goal" },
        execute: async (_input, context) => ({ content: statusReport(await readGoal(context.sessionID)) }),
      });

      editor.add({
        name: "progress",
        description:
          "Record a checkpoint of progress, a decision, or a blocker toward this session's active goal. Use it at meaningful checkpoints so progress survives compaction.",
        input: {
          type: "object",
          properties: {
            note: { type: "string", description: "What changed, what was learned, or what blocks progress." },
          },
          required: ["note"],
          additionalProperties: false,
        },
        options: { namespace: "goal" },
        execute: async (input, context) => {
          const note = (input as { note?: unknown }).note;
          if (typeof note !== "string" || !note.trim()) {
            return { content: "goal_progress requires a non-empty note." };
          }
          const goal = await readGoal(context.sessionID);
          if (!goal || !owns(goal)) {
            return { content: "No active goal in this session. Set one with /goal <text>." };
          }
          const updated = withNote(goal, note, Date.now());
          await writeGoal(updated);
          return { content: `Recorded. Goal state: ${statusReport(updated)}` };
        },
      });

      editor.add({
        name: "done",
        description:
          "Mark this session's active goal as verified complete and end the goal loop. Call only when the definition of done is met with direct evidence.",
        input: {
          type: "object",
          properties: {
            summary: {
              type: "string",
              description: "What was achieved and the evidence that the goal is complete.",
            },
          },
          required: ["summary"],
          additionalProperties: false,
        },
        options: { namespace: "goal" },
        execute: async (input, context) => {
          const summary = (input as { summary?: unknown }).summary;
          if (typeof summary !== "string" || !summary.trim()) {
            return { content: "goal_done requires a summary of the achieved result and its evidence." };
          }
          const goal = await readGoal(context.sessionID);
          if (!goal || !owns(goal)) {
            return { content: "No active goal in this session." };
          }
          const now = Date.now();
          const done: GoalState = {
            ...goal,
            status: "done",
            updatedAt: now,
            doneAt: now,
            doneSummary: summary.trim(),
            pauseReason: undefined,
          };
          await writeGoal(done);
          return { content: "Goal marked done. The goal loop is stopped." };
        },
      });
    });

    // 3. `/goal` lifecycle command.
    await ctx.command.transform((editor) => {
      editor.add({
        name: "goal",
        description:
          "Set or manage this session's goal: /goal <text>, set|update|status|done|pause|resume|clear|budget",
        execute: async ({ sessionID, prompt, delivery }) => {
          const command = parseCommand(prompt.text ?? "");
          const result = applyCommand(await readGoal(sessionID), command, {
            sessionID,
            owner,
            now: Date.now(),
            defaultBudget: settings.budget,
          });

          if (result.error) {
            await sendNotice(sessionID, `[goal] ${result.error}`);
            return;
          }
          if (result.clear) {
            await clearGoal(sessionID);
          }
          if (result.state) {
            await writeGoal(result.state);
          }
          if (result.notice) {
            await sendNotice(sessionID, `[goal] ${result.notice}`);
          }
          if (result.kickoff && result.state) {
            await ctx.session.prompt({
              ...prompt,
              sessionID,
              text: kickoffPrompt(result.state),
              delivery,
            });
          }
          if (result.nudge && result.state) {
            await sendNudge(result.state, "loop");
          }
        },
      });
    });

    // 4. The loop: when a session with an open goal stalls, re-prompt it.
    // Every idle event ends a turn, so every idle event is a chance to re-prompt.
    // The nudge budget is what bounds the loop; duplicate events at worst cost
    // one extra nudge against it.
    const onIdle = async (sessionID: string): Promise<void> => {
      const goal = await readGoal(sessionID);
      if (!goal || !owns(goal)) return;

      const decision = loopDecision(goal);
      if (decision === "pause-budget") {
        await writeGoal({
          ...goal,
          status: "paused",
          pauseReason: "budget",
          updatedAt: Date.now(),
        });
        await sendNotice(
          sessionID,
          `[goal] The goal loop paused after ${goal.nudges} of ${goal.budget} nudges and the goal is still open. Raise the budget with /goal budget <n> or re-arm with /goal resume.`,
        );
        return;
      }
      if (decision === "nudge") {
        await sendNudge(goal, "loop").catch((error) =>
          console.error("[goal] failed to send loop nudge:", error),
        );
      }
    };

    const controller = new AbortController();
    void (async () => {
      for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
        if (event.type === "session.idle") {
          await onIdle(event.data.sessionID).catch((error) =>
            console.error("[goal] idle handler failed:", error),
          );
        }
      }
    })().catch((error) => console.error("[goal] event stream ended:", error));

    // 5. Re-arm open goals after a restart or reload.
    if (settings.resumeOnStart) {
      const page = await ctx.storage.scan({ prefix: "goal/", limit: 100 });
      for (const entry of page.entries) {
        const goal = asGoalState(entry.value);
        if (!goal || !owns(goal)) continue;
        if (loopDecision(goal) !== "nudge") continue;
        await sendNudge(goal, "resumed").catch((error) =>
          console.error("[goal] failed to resume goal loop:", error),
        );
      }
    }

    return () => {
      void rpcRegistration.dispose();
      controller.abort();
    };
  },
} satisfies Plugin.Plugin;
