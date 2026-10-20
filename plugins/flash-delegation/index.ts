import type { Plugin } from "@opencode/plugin";
import { Error as ToolError, type Info } from "@opencode/plugin/promise/tool";

const workers = new Set([
  "flash-implementation-engineer",
  "flash-bounded-worker",
  "flash-repository-analyst",
  "flash-vision-scout",
  "flash-pr-reviewer",
  "flash-3d-modeler",
]);
const orchestrators = new Set(["flash-orchestrator", "yolo-flash-orchestrator"]);
const helpers = new Set(["general", "explore"]);
const readOnlyWorkers = new Set([
  "flash-repository-analyst",
  "flash-vision-scout",
  "flash-pr-reviewer",
]);
const providerID = "deepseek";
const modelID = "deepseek-flash";
const limit = 5;

function deny(message: string): never {
  throw new ToolError({ message: `Flash delegation: ${message}` });
}

function isFlash(model: { providerID: string; id: string } | undefined): boolean {
  return model?.providerID === providerID && model.id === modelID;
}

export default {
  id: "flash-delegation",
  async setup(ctx) {
    type SessionInfo = Awaited<ReturnType<typeof ctx.session.get>>;

    const isDirectWorker = async (session: SessionInfo): Promise<boolean> => {
      if (!workers.has(session.agent ?? "") || !session.parentID) return false;
      const parent = await ctx.session.get({ sessionID: session.parentID });
      return !parent.parentID && orchestrators.has(parent.agent ?? "");
    };

    const helperOwner = async (session: SessionInfo): Promise<SessionInfo | undefined> => {
      if (!session.parentID) return undefined;
      const parent = await ctx.session.get({ sessionID: session.parentID });
      return await isDirectWorker(parent) ? parent : undefined;
    };

    // Only admission is serialized; foreground children must still be able to run in parallel.
    const admissions = new Map<string, Promise<void>>();

    const reserve = async (sessionID: Parameters<typeof ctx.session.get>[0]["sessionID"]) => {
      const previous = admissions.get(sessionID) ?? Promise.resolve();
      let release!: () => void;
      const current = new Promise<void>((resolve) => { release = resolve; });
      admissions.set(sessionID, current);
      await previous;
      try {
        const key = `admissions/${sessionID}`;
        const saved = await ctx.storage.get(key);
        if (saved !== undefined && (typeof saved !== "number" || !Number.isInteger(saved) || saved < 0)) {
          deny("invalid saved child budget; cannot safely admit another child.");
        }
        const count = typeof saved === "number" ? saved : 0;
        if (count >= limit) deny("this worker has used its five child slots; resume an existing child.");
        // Reserve durably before dispatch, including across reloads or an ambiguous launch failure.
        await ctx.storage.set(key, count + 1);
      } finally {
        release();
        if (admissions.get(sessionID) === current) admissions.delete(sessionID);
      }
    };

    await ctx.tool.transform((editor) => {
      editor.update("subagent", (tool) => {
        const execute: Info["execute"] = tool.execute;
        tool.execute = async (input, context) => {
          if (helpers.has(context.agent)) {
            const caller = await ctx.session.get({ sessionID: context.sessionID });
            if (await helperOwner(caller)) deny("generic helpers are leaves and cannot delegate.");
          }
          if (!workers.has(context.agent)) return execute(input, context);
          if (typeof input !== "object" || input === null || Array.isArray(input)) {
            deny("expected a child-agent request.");
          }
          const request = input as Record<string, unknown>;
          const caller = await ctx.session.get({ sessionID: context.sessionID });
          if (!await isDirectWorker(caller)) {
            deny("only direct DeepSeek workers of a Flash orchestrator may delegate; children are leaves.");
          }
          if (!isFlash(caller.model)) deny("the calling worker must use deepseek/deepseek-flash.");
          if (typeof request.agent !== "string" || !helpers.has(request.agent)) {
            deny("choose a generic general or explore helper, not a named specialist.");
          }
          if (readOnlyWorkers.has(context.agent) && request.agent !== "explore") {
            deny("read-only workers may launch only explore helpers.");
          }
          const target = await ctx.agent.get({ agentID: request.agent });
          if (target.data.model && !isFlash(target.data.model)) {
            deny("the generic helper's configured model conflicts with DeepSeek inheritance.");
          }
          const model = `${providerID}/${modelID}#${caller.model?.variant ?? "max"}`;
          if (request.model !== undefined && request.model !== model && request.model !== `${providerID}/${modelID}`) {
            deny("model overrides must use the same DeepSeek Flash model.");
          }
          if (request.sessionID !== undefined) {
            if (typeof request.sessionID !== "string") deny("invalid child session ID.");
            const child = await ctx.session.get({ sessionID: request.sessionID });
            if (child.parentID !== caller.id || child.agent !== request.agent || !isFlash(child.model)) {
              deny("resume only this worker's own child with its original agent and DeepSeek model.");
            }
          } else {
            await reserve(context.sessionID);
          }
          return execute({ ...request, model }, context);
        };
      });
    });

    await ctx.session.hook("context", async (event) => {
      if (helpers.has(event.agent)) {
        const caller = await ctx.session.get({ sessionID: event.sessionID });
        const owner = await helperOwner(caller);
        if (!owner) return;
        if (!isFlash(event.model) || !isFlash(owner.model)) {
          deny("generic helpers must stay on their owner's DeepSeek Flash model.");
        }
        if (caller.metadata?.flashHelperBounded !== true) {
          const ownerAgent = await ctx.agent.get({ agentID: owner.agent! });
          // Generic profiles must not bypass the owning role's file/shell restrictions.
          await ctx.session.update({
            sessionID: caller.id,
            permissions: [
              ...ownerAgent.data.permissions,
              ...(owner.permissions ?? []),
              ...(caller.permissions ?? []),
              { action: "subagent", resource: "*", effect: "deny" },
              { action: "question", resource: "*", effect: "deny" },
              ...(event.agent === "explore" || readOnlyWorkers.has(owner.agent ?? "")
                ? [{ action: "edit", resource: "*", effect: "deny" } as const]
                : []),
            ],
            metadata: { ...caller.metadata, flashHelperBounded: true },
          });
        }
        event.system.push({
          type: "text",
          text: `You are a generic leaf helper owned by ${owner.agent}. Complete only the delegated bounded mission. Do not launch subagents or route to named specialists. Preserve your owner's scope, read-only restrictions, and exclusive Blender scene ownership. Return evidence and blockers to your owner; do not assume ownership of the whole project.`,
        });
        delete event.tools.subagent;
        return;
      }
      if (!workers.has(event.agent)) return;
      const caller = await ctx.session.get({ sessionID: event.sessionID });
      const mayDelegate = await isDirectWorker(caller) && isFlash(event.model);
      event.system.push({ type: "text", text: mayDelegate
        ? "Flash-only delegation exception: you may launch at most five generic helpers total, using general for implementation or explore for read-only evidence. Read-only roles may use only explore. Helpers inherit your DeepSeek Flash model and cannot delegate. Do not launch named specialist agents. Retain ownership, give disjoint bounded missions, preserve read-only and scene restrictions, verify and integrate their work, and resume existing helpers for corrections. This exception overrides generic flat-tree/non-delegation defaults only."
        : "You are a leaf worker. Do not launch subagents; return blockers to your parent." });
      if (!mayDelegate) delete event.tools.subagent;
    });
  },
} satisfies Plugin.Plugin;
