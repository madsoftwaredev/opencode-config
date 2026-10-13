import type { Plugin } from "@opencode/plugin";
import { GoalRpc, toGoalView, type GoalView } from "./goal-rpc";
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

    // Session parent links, resolved on demand and cached.
    const parentOf = new Map<string, string | undefined>();

    const resolveParent = async (sessionID: string): Promise<string | undefined> => {
      if (!parentOf.has(sessionID)) {
        try {
          const session = await ctx.session.get({ sessionID });
          parentOf.set(sessionID, session.parentID);
        } catch {
          parentOf.set(sessionID, undefined);
        }
      }
      return parentOf.get(sessionID);
    };

    // Subtask sessions inherit their parent's goal as context.
    const findAncestorGoal = async (sessionID: string): Promise<GoalState | undefined> => {
      let current: string | undefined = sessionID;
      for (let depth = 0; depth < 5 && current; depth += 1) {
        current = await resolveParent(current);
        if (!current) return undefined;
        const goal = await readGoal(current);
        if (goal && goal.status !== "done" && settings.inherit) return goal;
      }
      return undefined;
    };

    // In-flight work inventory: sessions mid-turn and running background
    // shells. Persisted so the fully-idle rule survives reload; live lifecycle
    // events correct it from there.
    const executing = new Set<string>();
    const shells = new Map<string, string>();

    const saveInflight = async (): Promise<void> => {
      await ctx.storage.set("inflight", {
        executing: [...executing],
        shells: Object.fromEntries(shells),
      });
    };

    const seeded = asInflightSnapshot(await ctx.storage.get("inflight"));
    for (const id of seeded.executing) executing.add(id);
    for (const [id, sessionID] of Object.entries(seeded.shells)) shells.set(id, sessionID);

    /** True when the session or anything beneath it still has work in flight. */
    const busyUnder = async (ownerID: string): Promise<boolean> => {
      const inflight = inflightSessions({ executing: [...executing], shells: Object.fromEntries(shells) });
      for (const sessionID of inflight) {
        if (sessionID === ownerID) return true;
        let current: string | undefined = sessionID;
        for (let depth = 0; depth < 8 && current; depth += 1) {
          current = await resolveParent(current);
          if (current === ownerID) return true;
        }
      }
      return false;
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
          "Set or manage this session's goal: /goal <text>, set|update|status|continue|pause|done|stop|budget",
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
            await requestDrive(sessionID);
          }
        },
      });
    });

    // 4. The loop: nudge a goal owner only when it is FULLY idle — its own turn
    // over and no work still in flight beneath it (executing descendant
    // sessions, running background shells). Otherwise the nudge is held and
    // fires when the tree settles. The nudge budget bounds the loop. Held
    // owners keep their nudge label (loop vs resumed) until released.
    const pending = new Map<string, string>();

    const driveGoal = async (sessionID: string, label = "loop"): Promise<void> => {
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
        await sendNudge(goal, label).catch((error) =>
          console.error("[goal] failed to send loop nudge:", error),
        );
      }
    };

    /** Nudge every held goal owner whose work has now fully settled. */
    const settleCheck = async (): Promise<void> => {
      for (const [sessionID, label] of [...pending]) {
        if (await busyUnder(sessionID)) continue;
        pending.delete(sessionID);
        await driveGoal(sessionID, label);
      }
    };

    /** User-invoked re-arm (resume / budget raise): hold if work is in flight. */
    const requestDrive = async (sessionID: string): Promise<void> => {
      if (await busyUnder(sessionID)) {
        pending.set(sessionID, "loop");
        await sendNotice(
          sessionID,
          "[goal] Loop re-armed. A nudge is held until in-flight work (subtasks or background shells) settles.",
        );
        return;
      }
      await driveGoal(sessionID);
    };

    const onIdle = async (sessionID: string): Promise<void> => {
      const goal = await readGoal(sessionID);
      if (goal && owns(goal)) {
        if (await busyUnder(sessionID)) {
          pending.set(sessionID, "loop");
          return;
        }
        await driveGoal(sessionID);
        return;
      }
      // A subtask (or any other session) settled; release held owners.
      await settleCheck();
    };

    const controller = new AbortController();
    void (async () => {
      for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
        if (event.type === "session.idle") {
          executing.delete(event.data.sessionID);
          await saveInflight().catch(() => {});
          await onIdle(event.data.sessionID).catch((error) =>
            console.error("[goal] idle handler failed:", error),
          );
          continue;
        }
        if (event.type === "session.execution.started") {
          executing.add(event.data.sessionID);
          await saveInflight().catch(() => {});
          continue;
        }
        if (
          event.type === "session.execution.succeeded" ||
          event.type === "session.execution.failed" ||
          event.type === "session.execution.interrupted"
        ) {
          executing.delete(event.data.sessionID);
          await saveInflight().catch(() => {});
          await settleCheck().catch((error) => console.error("[goal] settle check failed:", error));
          continue;
        }
        if (event.type === "session.shell.started") {
          if (event.data.shell.status === "running") {
            shells.set(event.data.shell.id, event.data.sessionID);
            await saveInflight().catch(() => {});
          }
          continue;
        }
        if (event.type === "session.shell.ended") {
          shells.delete(event.data.shell.id);
          await saveInflight().catch(() => {});
          await settleCheck().catch((error) => console.error("[goal] settle check failed:", error));
        }
      }
    })().catch((error) => console.error("[goal] event stream ended:", error));

    // 5. Re-arm open goals after a restart or reload. Owners with work still in
    //    flight are held until their tree settles.
    if (settings.resumeOnStart) {
      const page = await ctx.storage.scan({ prefix: "goal/", limit: 100 });
      for (const entry of page.entries) {
        const goal = asGoalState(entry.value);
        if (!goal || !owns(goal)) continue;
        if (loopDecision(goal) === "skip") continue;
        if (await busyUnder(goal.sessionID)) {
          pending.set(goal.sessionID, "resumed");
          continue;
        }
        await driveGoal(goal.sessionID, "resumed").catch((error) =>
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
