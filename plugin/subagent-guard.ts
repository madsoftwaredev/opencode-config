import type { Plugin } from "@opencode-ai/plugin";

const MAX_DIRECT_SUBAGENTS = 10;

/** Enforces a single delegation level and a per-root-session subagent budget. */
const SubagentGuard: Plugin = async ({ client }) => {
  const initialCounts = new Map<string, Promise<number>>();
  const reservedCounts = new Map<string, number>();
  const countedCalls = new Set<string>();

  const getInitialCount = (sessionID: string): Promise<number> => {
    const existing = initialCounts.get(sessionID);
    if (existing) return existing;

    const pending = client.session
      .children({ path: { id: sessionID }, throwOnError: true })
      .then((response) => response.data.length)
      .catch((error) => {
        initialCounts.delete(sessionID);
        throw error;
      });

    initialCounts.set(sessionID, pending);
    return pending;
  };

  return {
    "tool.execute.before": async (input) => {
      if (input.tool !== "task") return;

      const response = await client.session.get({
        path: { id: input.sessionID },
        throwOnError: true,
      });

      if (response.data.parentID) {
        throw new Error(
          "SubagentGuard: nested delegation is disabled. Return findings to the primary agent instead."
        );
      }

      const callKey = `${input.sessionID}:${input.callID}`;
      if (countedCalls.has(callKey)) return;

      const initialCount = await getInitialCount(input.sessionID);
      const currentCount = reservedCounts.get(input.sessionID) ?? initialCount;

      if (currentCount >= MAX_DIRECT_SUBAGENTS) {
        throw new Error(
          `SubagentGuard: this session has reached the limit of ${MAX_DIRECT_SUBAGENTS} direct subagents.`
        );
      }

      reservedCounts.set(input.sessionID, currentCount + 1);
      countedCalls.add(callKey);
    },
  };
};

export default SubagentGuard;
