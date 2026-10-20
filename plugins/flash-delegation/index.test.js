import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import plugin from "./index";

const model = { providerID: "deepseek", id: "deepseek-flash", variant: "max" };
const context = {
  sessionID: "ses_worker", agent: "flash-implementation-engineer",
  messageID: "msg_worker", id: "call_child", progress: async () => {},
};
const request = { agent: "general", prompt: "Complete the bounded task", background: true };

async function setup(storage = new Map()) {
  const sessions = new Map([
    ["ses_root", { id: "ses_root", agent: "flash-orchestrator" }],
    ["ses_worker", { id: "ses_worker", parentID: "ses_root", agent: context.agent, model }],
  ]);
  const agents = new Map([
    ["general", { id: "general" }],
    ["explore", { id: "explore" }],
    [context.agent, { id: context.agent, model, permissions: [
      { action: "shell", resource: "restricted-command *", effect: "deny" },
    ] }],
  ]);
  const calls = [];
  const updates = [];
  const state = { failure: undefined };
  let hook;
  const tool = { async execute(input, receivedContext) {
    if (state.failure) throw state.failure;
    calls.push({ input, context: receivedContext });
    const id = `ses_child_${calls.length}`;
    sessions.set(id, { id, parentID: receivedContext.sessionID, agent: input.agent, model });
    return { content: id };
  } };
  const api = {
    storage: { get: async (key) => storage.get(key), set: async (key, value) => storage.set(key, value) },
    agent: { get: async ({ agentID }) => ({ data: agents.get(agentID) }) },
    session: {
      get: async ({ sessionID }) => {
        if (!sessions.has(sessionID)) throw new Error("Session not found");
        return sessions.get(sessionID);
      },
      update: async ({ sessionID, ...changes }) => {
        updates.push({ sessionID, ...changes });
        Object.assign(sessions.get(sessionID), changes);
      },
      hook: async (_name, callback) => { hook = callback; },
    },
    tool: { transform: async (callback) => callback({ update: (_id, update) => update(tool) }) },
  };
  await plugin.setup(api);
  return { tool, calls, sessions, agents, storage, api, state, updates, hook: (event) => hook(event) };
}

test("launches generic helpers on the inherited model and preserves native context/background", async () => {
  const h = await setup();
  await h.tool.execute(request, context);
  expect(h.calls).toEqual([{ input: { ...request, model: "deepseek/deepseek-flash#max" }, context }]);
  expect(request).not.toHaveProperty("model");
  await h.tool.execute({ ...request, agent: "explore", background: false }, context);
  expect(h.calls[1].input).toEqual({ ...request, agent: "explore", background: false, model: "deepseek/deepseek-flash#max" });
});

test("admits only five children even when calls race, and keeps the budget after reload/removal", async () => {
  const h = await setup();
  const results = await Promise.allSettled(Array.from({ length: 10 }, () => h.tool.execute(request, context)));
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(5);
  expect(h.calls).toHaveLength(5);
  for (const [id, session] of h.sessions) if (session.parentID === "ses_worker") h.sessions.delete(id);
  await plugin.setup(h.api);
  await expect(h.tool.execute(request, context)).rejects.toThrow("five child slots");
  expect(h.calls).toHaveLength(5);
});

test("resumes an owned same-model child without spending another slot; rejects foreign children", async () => {
  const h = await setup(new Map([["admissions/ses_worker", 5]]));
  h.sessions.set("ses_owned", { id: "ses_owned", parentID: "ses_worker", agent: request.agent, model });
  await h.tool.execute({ ...request, sessionID: "ses_owned" }, context);
  expect(h.storage.get("admissions/ses_worker")).toBe(5);
  h.sessions.get("ses_owned").parentID = "ses_other";
  await expect(h.tool.execute({ ...request, sessionID: "ses_owned" }, context)).rejects.toThrow("own child");
});

test("rejects deeper delegation and workers outside the two Flash orchestrators", async () => {
  const h = await setup();
  h.sessions.get("ses_root").agent = "orchestrator";
  await expect(h.tool.execute(request, context)).rejects.toThrow("direct DeepSeek workers");
  h.sessions.get("ses_root").agent = "yolo-flash-orchestrator";
  await h.tool.execute(request, context);
  await expect(h.tool.execute(request, { ...context, sessionID: "ses_child_1", agent: request.agent })).rejects.toThrow("helpers are leaves");
});

test("rejects named specialists, explicit overrides, and generic-agent/session model drift", async () => {
  const h = await setup();
  for (const agent of ["flash-principal-engineer", "flash-bounded-worker", "flash-implementation-engineer"]) {
    await expect(h.tool.execute({ ...request, agent }, context)).rejects.toThrow("generic general or explore");
  }
  await expect(h.tool.execute({ ...request, model: "openai/gpt-6.1-sol" }, context)).rejects.toThrow("model overrides");
  h.agents.get(request.agent).model = { providerID: "openai", id: "gpt-6.1-sol" };
  await expect(h.tool.execute(request, context)).rejects.toThrow("configured model");
  delete h.agents.get(request.agent).model;
  h.sessions.get("ses_worker").model = { providerID: "openai", id: "gpt-6.1-sol" };
  await expect(h.tool.execute(request, context)).rejects.toThrow("calling worker");
  expect(h.calls).toHaveLength(0);
});

test("read-only worker roles can launch only generic explore helpers", async () => {
  for (const agent of ["flash-repository-analyst", "flash-vision-scout", "flash-pr-reviewer"]) {
    const h = await setup();
    h.sessions.get("ses_worker").agent = agent;
    const caller = { ...context, agent };
    await expect(h.tool.execute(request, caller)).rejects.toThrow("only explore");
    await h.tool.execute({ ...request, agent: "explore" }, caller);
    expect(h.calls).toHaveLength(1);
  }
});

test("generic leaves retain owner/session restrictions and cannot edit in explore mode", async () => {
  const h = await setup();
  await h.tool.execute({ ...request, agent: "explore" }, context);
  const child = h.sessions.get("ses_child_1");
  child.permissions = [{ action: "read", resource: "private/**", effect: "deny" }];
  const event = { sessionID: child.id, agent: "explore", model, system: [], tools: { subagent: {}, read: {} } };
  await h.hook(event);
  expect(child.permissions).toContainEqual({ action: "shell", resource: "restricted-command *", effect: "deny" });
  expect(child.permissions).toContainEqual({ action: "read", resource: "private/**", effect: "deny" });
  expect(child.permissions).toContainEqual({ action: "edit", resource: "*", effect: "deny" });
  expect(child.permissions).toContainEqual({ action: "subagent", resource: "*", effect: "deny" });
  expect(event.tools).not.toHaveProperty("subagent");
  await h.hook(event);
  expect(h.updates).toHaveLength(1);
  await expect(h.hook({ ...event, model: { providerID: "openai", id: "gpt-6.1-sol" } })).rejects.toThrow("owner's DeepSeek");
});

test("general helpers remain writable within owner restrictions and unrelated generic sessions are untouched", async () => {
  const h = await setup();
  await h.tool.execute(request, context);
  const child = h.sessions.get("ses_child_1");
  const event = { sessionID: child.id, agent: "general", model, system: [], tools: { subagent: {}, edit: {} } };
  await h.hook(event);
  expect(child.permissions).not.toContainEqual({ action: "edit", resource: "*", effect: "deny" });
  expect(event.tools).toHaveProperty("edit");
  h.sessions.get("ses_root").agent = "build";
  const unrelated = { ...event, system: [], tools: { subagent: {} } };
  await h.hook(unrelated);
  expect(unrelated.system).toEqual([]);
  expect(unrelated.tools).toHaveProperty("subagent");
});

test("removes the tool for leaf requests and leaves unrelated agents untouched", async () => {
  const h = await setup();
  const event = { ...context, model, system: [], tools: { subagent: {}, read: {} } };
  await h.hook(event);
  expect(event.tools).toHaveProperty("subagent");
  h.sessions.get("ses_worker").parentID = "ses_nested_parent";
  h.sessions.set("ses_nested_parent", { id: "ses_nested_parent", parentID: "ses_root", agent: context.agent });
  await h.hook(event);
  expect(event.tools).not.toHaveProperty("subagent");
  expect(event.tools).toHaveProperty("read");
  const input = { agent: "general" };
  await h.tool.execute(input, { ...context, agent: "build" });
  expect(h.calls[0].input).toBe(input);
});

test("fails closed on storage failures", async () => {
  const h = await setup(new Map([["admissions/ses_worker", "corrupt"]]));
  await expect(h.tool.execute(request, context)).rejects.toThrow("invalid saved child budget");
  h.storage.clear();
  h.api.storage.set = async () => { throw new Error("storage unavailable"); };
  await expect(h.tool.execute(request, context)).rejects.toThrow("storage unavailable");
  expect(h.calls).toHaveLength(0);
});

test("conservatively retains a failed launch reservation", async () => {
  const h = await setup();
  h.state.failure = new Error("ambiguous native dispatch failure");
  await expect(h.tool.execute(request, context)).rejects.toThrow("native dispatch failure");
  expect(h.storage.get("admissions/ses_worker")).toBe(1);
});

test("all six worker allowlists expose only generic helpers and preserve read-only boundaries", () => {
  const names = ["flash-implementation-engineer", "flash-bounded-worker", "flash-repository-analyst", "flash-vision-scout", "flash-pr-reviewer", "flash-3d-modeler"];
  const definitions = new Map(names.map((name) => {
    const text = readFileSync(new URL(`../../agents/${name}.md`, import.meta.url), "utf8");
    return [name, parse(text.split("---")[1])];
  }));
  for (const [name, definition] of definitions) {
    const allowed = definition.permissions.filter((p) => p.action === "subagent" && p.effect === "allow");
    expect(allowed.length).toBeGreaterThan(0);
    for (const edge of allowed) expect(["general", "explore"]).toContain(edge.resource);
    if (["flash-repository-analyst", "flash-vision-scout", "flash-pr-reviewer"].includes(name)) {
      expect(allowed.map((p) => p.resource)).toEqual(["explore"]);
    } else expect(allowed.map((p) => p.resource)).toEqual(["general", "explore"]);
  }
});
