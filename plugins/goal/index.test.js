import { afterEach, expect, test } from "bun:test";
import plugin from "./index";

const cleanups = [];

function makeEventStream() {
  const queue = [];
  const waiters = [];
  return {
    push(event) {
      queue.push(event);
      waiters.shift()?.();
    },
    async *subscribe() {
      while (true) {
        if (queue.length) {
          yield queue.shift();
          continue;
        }
        await new Promise((resolve) => waiters.push(resolve));
      }
    },
  };
}

async function makeCtx({ options = {}, parents = {}, startGoals = [] } = {}) {
  const store = new Map(startGoals.map((goal) => [`goal/${goal.sessionID}`, structuredClone(goal)]));
  const hooks = {};
  const commands = [];
  const tools = [];
  const sent = [];
  const rpcEvents = [];
  let rpcHandlers;
  const events = makeEventStream();

  const ctx = {
    options,
    location: { directory: "/proj", workspaceID: "ws_1", project: { id: "prj", directory: "/proj", canonical: "/proj" } },
    storage: {
      get: async (key) => store.get(key),
      set: async (key, value) => {
        store.set(key, structuredClone(value));
      },
      remove: async (key) => {
        store.delete(key);
      },
      scan: async ({ prefix, limit }) => ({
        entries: [...store.entries()]
          .filter(([key]) => key.startsWith(prefix))
          .slice(0, limit ?? 100)
          .map(([key, value]) => ({ key, value: structuredClone(value) })),
      }),
    },
    session: {
      hook: async (name, fn) => {
        hooks[name] = fn;
        return { dispose: async () => {} };
      },
      prompt: async (input) => {
        sent.push({ kind: "prompt", ...input });
        return {};
      },
      synthetic: async (input) => {
        sent.push({ kind: "synthetic", ...input });
        return {};
      },
      get: async ({ sessionID }) => {
        if (!(sessionID in parents)) throw new Error(`unknown session ${sessionID}`);
        return { id: sessionID, parentID: parents[sessionID] };
      },
    },
    command: {
      transform: async (fn) => {
        fn({ add: (definition) => commands.push(definition) });
        return { dispose: async () => {} };
      },
    },
    rpc: Object.assign(() => ({}), {
      register: async (_definition, handlers) => {
        rpcHandlers = handlers;
        return {
          events: {
            emit: async (type, data) => {
              rpcEvents.push({ type, data: structuredClone(data) });
            },
          },
          dispose: async () => {},
        };
      },
    }),
    tool: {
      transform: async (fn) => {
        fn({
          namespace: () => {},
          add: (tool) => tools.push(tool),
          update: () => {},
          remove: () => {},
          list: () => [],
          get: () => undefined,
        });
        return { dispose: async () => {} };
      },
    },
    event: { subscribe: () => events.subscribe() },
  };

  cleanups.push(await plugin.setup(ctx));

  return {
    store,
    hooks,
    commands,
    tools,
    sent,
    events,
    rpc: { handlers: () => rpcHandlers, events: rpcEvents },
    command: (name) => commands.find((entry) => entry.name === name),
    tool: (name) => tools.find((entry) => entry.name === name),
  };
}

const settle = async (ms = 10) => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

afterEach(() => {
  while (cleanups.length) cleanups.pop()();
});

test("registers the goal command and the goal tools", async () => {
  const harness = await makeCtx();
  expect(harness.command("goal")).toBeDefined();
  expect(harness.tool("status").options.namespace).toBe("goal");
  expect(harness.tool("progress").options.namespace).toBe("goal");
  expect(harness.tool("done").options.namespace).toBe("goal");
});

test("set stores the goal, kicks off work, and injects context", async () => {
  const harness = await makeCtx();
  await harness.command("goal").execute({
    sessionID: "ses_1",
    prompt: { text: "set land the migration" },
    delivery: "steer",
  });

  const goal = harness.store.get("goal/ses_1");
  expect(goal.text).toBe("land the migration");
  expect(goal.status).toBe("active");

  const kickoff = harness.sent.find((entry) => entry.kind === "prompt");
  expect(kickoff.text).toContain("land the migration");
  expect(kickoff.delivery).toBe("steer");

  const system = [];
  await harness.hooks.context({ sessionID: "ses_1", system });
  expect(system).toHaveLength(1);
  expect(system[0].text).toContain("land the migration");
  expect(system[0].text).toContain("goal_progress");
});

test("progress and done tools move the goal through its lifecycle", async () => {
  const harness = await makeCtx();
  await harness.command("goal").execute({
    sessionID: "ses_1",
    prompt: { text: "land the migration" },
    delivery: "steer",
  });

  const progress = await harness.tool("progress").execute({ note: "unblocked the fixture" }, { sessionID: "ses_1" });
  expect(progress.content).toContain("Recorded");
  expect(harness.store.get("goal/ses_1").notes[0].text).toBe("unblocked the fixture");

  await harness.tool("done").execute({ summary: "all checks green" }, { sessionID: "ses_1" });
  expect(harness.store.get("goal/ses_1").status).toBe("done");

  const system = [];
  await harness.hooks.context({ sessionID: "ses_1", system });
  expect(system).toHaveLength(0);
});

test("idle nudges an open goal and pauses on a spent budget", async () => {
  const harness = await makeCtx({ options: { budget: 2 } });
  await harness.command("goal").execute({
    sessionID: "ses_1",
    prompt: { text: "land the migration" },
    delivery: "steer",
  });

  harness.events.push({ type: "session.idle", data: { sessionID: "ses_1" } });
  await settle();
  expect(harness.store.get("goal/ses_1").nudges).toBe(1);
  expect(harness.sent.filter((entry) => entry.text.includes("[goal loop]"))).toHaveLength(1);

  // The nudge's own turn finishing counts as idle again.
  harness.events.push({ type: "session.idle", data: { sessionID: "ses_1" } });
  await settle();
  harness.events.push({ type: "session.idle", data: { sessionID: "ses_1" } });
  await settle();

  const goal = harness.store.get("goal/ses_1");
  expect(goal.nudges).toBe(2);
  expect(goal.status).toBe("paused");
  expect(goal.pauseReason).toBe("budget");
  expect(harness.sent.filter((entry) => entry.text.includes("paused after 2 of 2"))).toHaveLength(1);
});

test("a done goal is never nudged", async () => {
  const harness = await makeCtx();
  await harness.command("goal").execute({
    sessionID: "ses_1",
    prompt: { text: "land the migration" },
    delivery: "steer",
  });
  await harness.tool("done").execute({ summary: "shipped" }, { sessionID: "ses_1" });

  harness.events.push({ type: "session.idle", data: { sessionID: "ses_1" } });
  await settle();
  expect(harness.sent.filter((entry) => entry.text.includes("[goal loop]"))).toHaveLength(0);
});

test("the loop ignores sessions without a goal and foreign goals", async () => {
  const foreign = {
    sessionID: "ses_2",
    owner: "elsewhere:/other",
    text: "foreign",
    notes: [],
    status: "active",
    createdAt: 1,
    updatedAt: 1,
    nudges: 0,
    budget: 12,
  };
  const harness = await makeCtx({ startGoals: [foreign] });

  harness.events.push({ type: "session.idle", data: { sessionID: "ses_none" } });
  harness.events.push({ type: "session.idle", data: { sessionID: "ses_2" } });
  await settle();
  expect(harness.store.get("goal/ses_2").nudges).toBe(0);
});

test("status is reported without scheduling a turn", async () => {
  const harness = await makeCtx();
  await harness.command("goal").execute({ sessionID: "ses_1", prompt: { text: "status" }, delivery: "steer" });
  const notice = harness.sent.find((entry) => entry.text.includes("[goal]"));
  expect(notice.kind).toBe("synthetic");
  expect(notice.resume).toBe(false);
  expect(notice.text).toContain("No active goal");
});

test("resume re-arms the loop and nudges immediately", async () => {
  const harness = await makeCtx();
  await harness.command("goal").execute({
    sessionID: "ses_1",
    prompt: { text: "set land the migration" },
    delivery: "steer",
  });
  await harness.command("goal").execute({
    sessionID: "ses_1",
    prompt: { text: "pause checking CI" },
    delivery: "steer",
  });
  await harness.command("goal").execute({ sessionID: "ses_1", prompt: { text: "resume" }, delivery: "steer" });

  const goal = harness.store.get("goal/ses_1");
  expect(goal.status).toBe("active");
  expect(goal.nudges).toBe(1);
  expect(harness.sent.filter((entry) => entry.text.includes("[goal loop]"))).toHaveLength(1);
});

test("subtask sessions inherit the parent goal as context", async () => {
  const harness = await makeCtx({ parents: { ses_child: "ses_1" } });
  await harness.command("goal").execute({
    sessionID: "ses_1",
    prompt: { text: "land the migration" },
    delivery: "steer",
  });

  const system = [];
  await harness.hooks.context({ sessionID: "ses_child", system });
  expect(system).toHaveLength(1);
  expect(system[0].text).toContain("inherited from the parent session");
  expect(system[0].text).toContain("land the migration");
});

test("resumeOnStart re-arms open goals when the plugin loads", async () => {
  const open = {
    sessionID: "ses_3",
    owner: "ws_1:/proj",
    text: "land the migration",
    notes: [],
    status: "active",
    createdAt: 1,
    updatedAt: 1,
    nudges: 0,
    budget: 12,
  };
  const harness = await makeCtx({ startGoals: [open] });
  await settle();
  expect(harness.store.get("goal/ses_3").nudges).toBe(1);
  expect(harness.sent.filter((entry) => entry.text.includes("[goal resumed]"))).toHaveLength(1);
});

test("bad options are rejected", async () => {
  await expect(makeCtx({ options: { budget: 0 } })).rejects.toThrow("budget");
  await expect(makeCtx({ options: { inherit: "yes" } })).rejects.toThrow("inherit");
});

test("the goal RPC serves state for owners, subtasks, and empty sessions", async () => {
  const harness = await makeCtx({ parents: { ses_child: "ses_1" } });
  await harness.command("goal").execute({
    sessionID: "ses_1",
    prompt: { text: "set land the migration" },
    delivery: "steer",
  });

  const own = await harness.rpc.handlers().state({ sessionID: "ses_1" });
  expect(own).toMatchObject({ active: true, text: "land the migration", status: "active", nudges: 0 });

  const child = await harness.rpc.handlers().state({ sessionID: "ses_child" });
  expect(child).toMatchObject({ active: true, text: "land the migration", inherited: true });

  expect(await harness.rpc.handlers().state({ sessionID: "ses_none" })).toEqual({ active: false });
});

test("every state change emits goal.updated for the island", async () => {
  const harness = await makeCtx();
  await harness.command("goal").execute({
    sessionID: "ses_1",
    prompt: { text: "set land the migration" },
    delivery: "steer",
  });

  const afterSet = harness.rpc.events.at(-1);
  expect(afterSet.type).toBe("updated");
  expect(afterSet.data).toMatchObject({ sessionID: "ses_1", active: true, text: "land the migration" });

  await harness.tool("progress").execute({ note: "unblocked" }, { sessionID: "ses_1" });
  expect(harness.rpc.events.at(-1).data).toMatchObject({ sessionID: "ses_1", active: true, nudges: 0 });

  await harness.tool("done").execute({ summary: "shipped" }, { sessionID: "ses_1" });
  expect(harness.rpc.events.at(-1).data).toMatchObject({ sessionID: "ses_1", active: false, status: "done" });

  await harness.command("goal").execute({ sessionID: "ses_1", prompt: { text: "clear" }, delivery: "steer" });
  expect(harness.rpc.events.at(-1).data).toEqual({ sessionID: "ses_1", active: false });
});

test("loop nudges update the island counters", async () => {
  const harness = await makeCtx();
  await harness.command("goal").execute({
    sessionID: "ses_1",
    prompt: { text: "set land the migration" },
    delivery: "steer",
  });
  harness.events.push({ type: "session.idle", data: { sessionID: "ses_1" } });
  await settle();
  expect(harness.rpc.events.at(-1).data).toMatchObject({ sessionID: "ses_1", active: true, nudges: 1 });
});
