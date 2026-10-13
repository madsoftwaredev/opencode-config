/**
 * Pure goal state machine for the goal plugin.
 *
 * Everything here is deterministic and side-effect free so the loop rules can
 * be tested without an OpenCode runtime. The plugin wiring in `index.ts` owns
 * storage and session I/O.
 */

export const DEFAULT_BUDGET = 12;
export const NOTE_CAP = 20;

export interface GoalNote {
  at: number;
  text: string;
}

export interface GoalState {
  sessionID: string;
  /** Plugin location key that owns this goal's loop. */
  owner: string;
  text: string;
  notes: GoalNote[];
  status: "active" | "paused" | "done";
  pauseReason?: string;
  createdAt: number;
  updatedAt: number;
  nudges: number;
  budget: number;
  doneAt?: number;
  doneSummary?: string;
}

export type GoalCommand =
  | { verb: "status" }
  | { verb: "set"; text: string }
  | { verb: "update"; text: string }
  | { verb: "done"; summary?: string }
  | { verb: "pause"; reason?: string }
  | { verb: "resume" }
  | { verb: "clear" }
  | { verb: "budget"; budget: number }
  | { verb: "error"; message: string };

export interface CommandContext {
  sessionID: string;
  owner: string;
  now: number;
  defaultBudget: number;
}

export interface CommandResult {
  state?: GoalState;
  clear?: boolean;
  notice?: string;
  /** Send the goal kickoff prompt and start working. */
  kickoff?: boolean;
  /** Send a loop nudge and keep working. */
  nudge?: boolean;
  error?: string;
}

const VERBS = new Set([
  "set",
  "status",
  "show",
  "update",
  "done",
  "finish",
  "pause",
  "stop",
  "resume",
  "clear",
  "remove",
  "budget",
]);

/** Parse `/goal ...` arguments. Unknown first words become goal text. */
export function parseCommand(raw: string): GoalCommand {
  let text = raw.trim();
  text = text.replace(/^\/goal\b\s*/i, "");
  text = text.trim();
  if (!text) return { verb: "status" };

  const firstSpace = text.indexOf(" ");
  const word = (firstSpace === -1 ? text : text.slice(0, firstSpace)).toLowerCase();
  const rest = firstSpace === -1 ? "" : text.slice(firstSpace + 1).trim();

  if (!VERBS.has(word)) return { verb: "set", text };

  switch (word) {
    case "status":
    case "show":
      return { verb: "status" };
    case "set":
      return rest ? { verb: "set", text: rest } : { verb: "error", message: "Usage: /goal set <goal text>" };
    case "update":
      return rest ? { verb: "update", text: rest } : { verb: "error", message: "Usage: /goal update <new goal text>" };
    case "done":
    case "finish":
      return { verb: "done", summary: rest || undefined };
    case "pause":
    case "stop":
      return { verb: "pause", reason: rest || undefined };
    case "resume":
      return { verb: "resume" };
    case "clear":
    case "remove":
      return { verb: "clear" };
    case "budget": {
      const budget = Number(rest);
      if (!Number.isInteger(budget) || budget < 1) {
        return { verb: "error", message: "Usage: /goal budget <positive integer>" };
      }
      return { verb: "budget", budget };
    }
  }

  /* c8 ignore next */
  return { verb: "set", text };
}

function freshGoal(text: string, ctx: CommandContext, budget: number): GoalState {
  return {
    sessionID: ctx.sessionID,
    owner: ctx.owner,
    text,
    notes: [],
    status: "active",
    createdAt: ctx.now,
    updatedAt: ctx.now,
    nudges: 0,
    budget,
  };
}

/** Reduce a parsed command against the current goal state. */
export function applyCommand(
  state: GoalState | undefined,
  command: GoalCommand,
  ctx: CommandContext,
): CommandResult {
  if (command.verb === "error") return { error: command.message };

  if (command.verb === "status") return { notice: statusReport(state) };

  if (command.verb === "set") {
    const budget = state?.budget ?? ctx.defaultBudget;
    return { state: freshGoal(command.text, ctx, budget), kickoff: true };
  }

  if (command.verb === "update") {
    if (!state) {
      return {
        state: freshGoal(command.text, ctx, ctx.defaultBudget),
        notice: "No goal was active, so this became the goal.",
        kickoff: true,
      };
    }
    const reopened = state.status === "done";
    return {
      state: {
        ...state,
        text: command.text,
        updatedAt: ctx.now,
        status: reopened ? "active" : state.status,
        nudges: reopened ? 0 : state.nudges,
        doneAt: undefined,
        doneSummary: undefined,
      },
      notice: reopened
        ? "Goal updated and reopened; the loop is re-armed."
        : "Goal updated. The loop keeps running against the new wording.",
    };
  }

  if (command.verb === "clear") {
    if (!state) return { error: "No goal is set for this session." };
    return { clear: true, notice: "Goal cleared. The loop is stopped." };
  }

  if (!state) return { error: "No goal is set for this session. Set one with /goal <text>." };

  switch (command.verb) {
    case "done":
      return {
        state: {
          ...state,
          status: "done",
          updatedAt: ctx.now,
          doneAt: ctx.now,
          doneSummary: command.summary || "Marked done by the user.",
          pauseReason: undefined,
        },
        notice: "Goal marked done. The loop is stopped.",
      };
    case "pause":
      return {
        state: {
          ...state,
          status: "paused",
          updatedAt: ctx.now,
          pauseReason: command.reason || "paused by the user",
        },
        notice: "Goal paused. The loop will not re-prompt until /goal resume.",
      };
    case "resume":
      return {
        state: {
          ...state,
          status: "active",
          updatedAt: ctx.now,
          nudges: 0,
          pauseReason: undefined,
          doneAt: undefined,
          doneSummary: undefined,
        },
        nudge: true,
      };
    case "budget": {
      const raised = state.status === "paused" && state.pauseReason === "budget" && state.nudges < command.budget;
      return {
        state: {
          ...state,
          budget: command.budget,
          updatedAt: ctx.now,
          status: raised ? "active" : state.status,
          pauseReason: raised ? undefined : state.pauseReason,
        },
        notice: raised
          ? `Budget raised to ${command.budget}. The loop was paused on a spent budget, so it is re-armed now.`
          : `Goal loop budget set to ${command.budget} nudges.`,
        ...(raised ? { nudge: true } : {}),
      };
    }
  }
}

/** Decide what the loop should do when a session goes idle. */
export function loopDecision(state: GoalState | undefined): "nudge" | "pause-budget" | "skip" {
  if (!state || state.status !== "active") return "skip";
  if (state.nudges >= state.budget) return "pause-budget";
  return "nudge";
}

/** Append a progress note, newest last; the ledger is capped. */
export function withNote(state: GoalState, note: string, now: number): GoalState {
  const notes = [...state.notes, { at: now, text: note.trim() }];
  return { ...state, notes: notes.slice(-NOTE_CAP), updatedAt: now };
}

function noteLines(state: GoalState): string {
  if (!state.notes.length) return "- none yet";
  return [...state.notes]
    .reverse()
    .map((note) => `- ${note.text}`)
    .join("\n");
}

function goalLabel(state: GoalState, limit = 200): string {
  const text = state.text.replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

/** The block injected into every model call of the goal-owning session. */
export function goalSystemBlock(state: GoalState): string {
  const remaining = Math.max(0, state.budget - state.nudges);
  return `## Active goal (managed by the goal plugin)
${state.text}

Progress notes (newest first):
${noteLines(state)}

Protocol:
- The goal above is the source of truth for what "done" means. Later user instructions override it; otherwise keep working toward it.
- Establish an observable definition of done and verify it with direct evidence before finishing.
- Record checkpoints with the goal_progress tool so progress survives compaction.
- Call goal_done only when the goal is verified complete; it ends the loop.
- If the goal is blocked or impossible as stated, say so plainly and record it with goal_progress. Do not fake progress.
- When a turn must end while the goal is still open, name the single biggest remaining gap and stop cleanly. The goal loop re-prompts you while the goal stays open (${remaining} of ${state.budget} loop nudges remaining).`;
}

/** The block injected into subtask sessions that serve a parent goal. */
export function inheritedSystemBlock(state: GoalState): string {
  return `## Active goal (inherited from the parent session)
${state.text}

This session is a subtask serving the goal above. Apply it as context for your work and report back through your normal result. The parent session owns the goal; the goal_progress and goal_done tools are not available here.`;
}

/** The user-visible kickoff sent when a goal is set. */
export function kickoffPrompt(state: GoalState): string {
  return `Goal set for this session:

${state.text}

Start working toward it now. First state an observable definition of done, then make progress toward it and verify with direct evidence. Record checkpoints with goal_progress and finish with goal_done(summary) only when the goal is verified complete. The goal loop re-prompts you while the goal stays open (budget: ${state.budget} loop nudges; /goal pause stops it).`;
}

/** The continuation nudge sent when a session with an open goal goes idle. */
export function nudgePrompt(state: GoalState, label = "loop"): string {
  return `[goal ${label}] The goal is still open: "${goalLabel(state)}"

Continue working toward it: take the single biggest remaining gap, close it, and verify. When the goal is verified complete, call goal_done(summary). If you are blocked, record the blocker with goal_progress(note) and explain it instead of looping pointlessly.`;
}

/** Status report shown by `/goal` and the goal_status tool. */
export function statusReport(state: GoalState | undefined): string {
  if (!state) {
    return "[goal] No active goal for this session. Set one with /goal <text> or /goal set <text>.";
  }

  const lines = [
    `[goal] status: ${state.status}${state.status === "paused" ? ` (${state.pauseReason ?? "no reason given"})` : ""}`,
    `Goal: ${state.text}`,
    "Progress notes (newest first):",
    noteLines(state),
    `Loop: ${state.nudges} of ${state.budget} nudges used.`,
  ];
  if (state.doneSummary) lines.push(`Done: ${state.doneSummary}`);
  lines.push(
    "Manage: /goal set <text> · /goal update <text> · /goal pause · /goal resume · /goal done [summary] · /goal clear · /goal budget <n>",
  );
  return lines.join("\n");
}

/** Defensive read of persisted state written by earlier versions. */
export function asGoalState(raw: unknown): GoalState | undefined {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return undefined;
  const value = raw as Record<string, unknown>;
  if (typeof value.sessionID !== "string" || typeof value.text !== "string") return undefined;
  if (value.status !== "active" && value.status !== "paused" && value.status !== "done") return undefined;

  const notes = Array.isArray(value.notes)
    ? value.notes.filter(
        (note): note is GoalNote =>
          typeof note === "object" &&
          note !== null &&
          typeof (note as GoalNote).text === "string" &&
          typeof (note as GoalNote).at === "number",
      )
    : [];

  return {
    sessionID: value.sessionID,
    owner: typeof value.owner === "string" ? value.owner : "",
    text: value.text,
    notes,
    status: value.status,
    pauseReason: typeof value.pauseReason === "string" ? value.pauseReason : undefined,
    createdAt: typeof value.createdAt === "number" ? value.createdAt : 0,
    updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : 0,
    nudges: typeof value.nudges === "number" && value.nudges >= 0 ? value.nudges : 0,
    budget:
      typeof value.budget === "number" && Number.isInteger(value.budget) && value.budget > 0
        ? value.budget
        : DEFAULT_BUDGET,
    doneAt: typeof value.doneAt === "number" ? value.doneAt : undefined,
    doneSummary: typeof value.doneSummary === "string" ? value.doneSummary : undefined,
  };
}

/** Persisted in-flight work: executing sessions and running background shells. */
export interface InflightSnapshot {
  executing: string[];
  /** shellID -> owning sessionID */
  shells: Record<string, string>;
}

export function asInflightSnapshot(raw: unknown): InflightSnapshot {
  const empty: InflightSnapshot = { executing: [], shells: {} };
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return empty;

  const value = raw as Record<string, unknown>;
  const executing = Array.isArray(value.executing)
    ? value.executing.filter((id): id is string => typeof id === "string")
    : [];

  const shells: Record<string, string> = {};
  if (typeof value.shells === "object" && value.shells !== null && !Array.isArray(value.shells)) {
    for (const [id, sessionID] of Object.entries(value.shells as Record<string, unknown>)) {
      if (typeof sessionID === "string") shells[id] = sessionID;
    }
  }
  return { executing, shells };
}

/** Session IDs with in-flight work: mid-turn sessions plus shell-owning sessions. */
export function inflightSessions(snapshot: InflightSnapshot): Set<string> {
  return new Set([...snapshot.executing, ...Object.values(snapshot.shells)]);
}