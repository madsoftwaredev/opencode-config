import assert from "node:assert/strict";
import { test } from "node:test";
import { createPriceBook, estimateApiCost } from "./pricing.ts";
import { buildReport, formatApiCost } from "./usage.ts";
import { providerCostTable } from "./view.ts";

const tokens = (input = 0, output = 0, reasoning = 0, read = 0, write = 0) => ({
  input,
  output,
  reasoning,
  cache: { read, write },
});
const rates = { input: 2, output: 10, cache: { read: 0.1, write: 2.5 } };
const zero = { input: 0, output: 0, cache: { read: 0, write: 0 } };
const model = (providerID, id, cost = [rates], modelID = id) => ({ providerID, id, modelID, cost });
const get = (book, providerID, id) => book.resolve({ providerID, id });

test("API pricing covers ChatGPT, OpenCode Go, Z.ai coding plans, and Claude Code without changing actual zeroes", () => {
  const book = createPriceBook([
    model("openai", "reasoner", []),
    model("opencode", "reasoner"),
    model("opencode-go", "reasoner", [{ ...rates, input: 0.5 }]),
    model("zai-coding-plan", "glm", [zero]),
    model("zai", "glm"),
    model("claude-code", "claude-sonnet-5-5[1m]", []),
    model("opencode", "claude-sonnet-5-5"),
    model("claude-code", "claude-haiku-4-5-20251001", []),
    model("opencode", "claude-haiku-4-5"),
  ]);
  assert.equal(get(book, "openai", "reasoner").source, "opencode/reasoner");
  assert.equal(get(book, "opencode-go", "reasoner").source, "opencode/reasoner");
  assert.equal(get(book, "zai-coding-plan", "glm").source, "zai/glm");
  assert.equal(
    get(book, "claude-code", "claude-sonnet-5-5[1m]").source,
    "opencode/claude-sonnet-5-5"
  );
  assert.equal(
    get(book, "claude-code", "claude-haiku-4-5-20251001").source,
    "opencode/claude-haiku-4-5"
  );

  const usage = tokens(100, 10, 10, 200, 50);
  const report = buildReport(
    [{ id: "main", cost: 0, tokens: usage }],
    new Map([
      [
        "main",
        [
          {
            id: "1",
            type: "assistant",
            model: { providerID: "openai", id: "reasoner" },
            tokens: usage,
            cost: 0,
          },
        ],
      ],
    ]),
    book
  );
  assert.ok(Math.abs(report.total.api.usd - 0.000545) < 1e-12);
  assert.equal(report.total.api.missingTokens, 0);
  assert.equal(report.total.cost, 0);
  assert.equal(report.models[0].cost, 0);
  assert.equal(providerCostTable(report.modelTotals).rows[0][1], "$0.0005");
  assert.equal(providerCostTable(report.modelTotals).rows[0][2], "$0.0000");
});

test("context tiers are selected per request, including cached input, never on the accumulated chat total", () => {
  const tiers = [
    rates,
    { ...rates, tier: { type: "context", size: 200_000 }, input: 4, output: 15 },
  ];
  const book = createPriceBook([model("opencode", "tiered", tiers)]);
  const price = get(book, "opencode", "tiered");
  assert.equal(estimateApiCost(tokens(200_000), price).usd, 0.4);
  assert.equal(estimateApiCost(tokens(200_001), price).usd, 0.800004);
  assert.ok(Math.abs(estimateApiCost(tokens(1, 10, 10, 200_000), price).usd - 0.020304) < 1e-12);
  const usage = tokens(150_000);
  const ref = { providerID: "opencode", id: "tiered" };
  const report = buildReport(
    [{ id: "main", tokens: tokens(300_000), cost: 0 }],
    new Map([
      [
        "main",
        [
          { id: "1", type: "assistant", model: ref, tokens: usage, cost: 0 },
          { id: "2", type: "assistant", model: ref, tokens: usage, cost: 0 },
        ],
      ],
    ]),
    book
  );
  assert.equal(report.total.api.usd, 0.6);
});

test("real free models remain zero, but subscription placeholders and unidentified models are not priced as free", () => {
  const book = createPriceBook([
    model("opencode-go", "space-bunny-free", [zero]),
    model("zai-coding-plan", "unpriced", [zero]),
    model("zai-coding-plan", "flash", [zero]),
    model("zai", "flash", [zero]),
    model("openai", "unknown", []),
    model("opencode", "different-model"),
  ]);
  assert.equal(estimateApiCost(tokens(100), get(book, "opencode-go", "space-bunny-free")).usd, 0);
  assert.equal(
    estimateApiCost(tokens(100), get(book, "zai-coding-plan", "flash")).missingTokens,
    0
  );
  assert.equal(get(book, "zai-coding-plan", "unpriced"), undefined);
  assert.equal(get(book, "openai", "unknown"), undefined);
  assert.equal(formatApiCost(estimateApiCost(tokens(100))), "—");
  assert.throws(
    () => createPriceBook([model("bad", "negative", [{ ...rates, input: -1 }])]),
    /invalid API pricing/
  );
});

test("API totals include subagents and compactions once, and label unknown auxiliary usage as a partial subtotal", () => {
  const book = createPriceBook([model("opencode", "reasoner"), model("openai", "reasoner", [])]);
  const ref = { providerID: "openai", id: "reasoner" };
  const one = { id: "1", type: "assistant", model: ref, tokens: tokens(1_000_000), cost: 0 };
  const report = buildReport(
    [
      { id: "main", tokens: tokens(1_000_005), cost: 0 },
      { id: "child", parentID: "main", tokens: tokens(0, 10, 20), cost: 0 },
    ],
    new Map([
      ["main", [one, one]],
      ["child", [{ id: "2", type: "compaction", model: ref, tokens: tokens(0, 10, 20), cost: 0 }]],
    ]),
    book
  );
  assert.equal(report.main.api.usd, 2);
  assert.equal(report.subagents.api.usd, 0.0003);
  assert.equal(report.total.api.usd, 2.0003);
  assert.equal(report.total.api.missingTokens, 5);
  assert.equal(report.unattributed.api.missingTokens, 5);
  assert.equal(report.modelTotals[0].api.usd, 2.0003);
  assert.equal(formatApiCost(report.total.api), "$2.00+");
  assert.equal(report.total.cost, 0);
});

test("Fast and Ultrafast prices include premiums on every token bucket and request context tier", () => {
  const base = { input: 10, output: 50, cache: { read: 1, write: 12.5 } };
  const long = {
    tier: { type: "context", size: 272_000 },
    input: 20,
    output: 75,
    cache: { read: 2, write: 25 },
  };
  const catalog = [
    model("openai", "gpt-6-astra", []),
    model("openai", "gpt-6-astra-fast", [], "gpt-6-astra"),
    model("openai", "gpt-6-astra-ultrafast", [], "gpt-6-astra"),
    model("opencode", "gpt-6-astra", [base, long]),
  ];
  const book = createPriceBook(catalog);
  const standard = get(book, "openai", "gpt-6-astra");
  const fast = get(book, "openai", "gpt-6-astra-fast");
  const ultra = get(book, "openai", "gpt-6-astra-ultrafast");
  for (const usage of [
    tokens(1),
    tokens(0, 1),
    tokens(0, 0, 1),
    tokens(0, 0, 0, 1),
    tokens(0, 0, 0, 0, 1),
    tokens(100_000, 10_000, 20_000, 100_000, 100_000),
  ]) {
    const usd = estimateApiCost(usage, standard).usd;
    assert.ok(Math.abs(estimateApiCost(usage, fast).usd - usd * 2) < 1e-12);
    assert.ok(Math.abs(estimateApiCost(usage, ultra).usd - usd * 6) < 1e-12);
  }
  assert.equal(estimateApiCost(tokens(272_000), fast).usd, 5.44);
  assert.equal(estimateApiCost(tokens(272_001), fast).usd, 10.88004);
  assert.match(fast.note, /Fast 2×/);
  assert.match(ultra.note, /Ultrafast 6×/);
  assert.equal(catalog[3].cost[0].input, 10);
});

test("model-specific Fast premiums and unsupported speed/context combinations do not silently use Standard rates", () => {
  const book = createPriceBook([
    model("opencode", "gpt-5.5", [{ input: 5, output: 30, cache: { read: 0.5, write: 0 } }]),
    model("opencode", "future-model"),
    model("zai", "glm"),
    model("zai-coding-plan", "glm-highspeed", [zero]),
  ]);
  const fast = get(book, "openai", "gpt-5.5-fast");
  assert.equal(estimateApiCost(tokens(100_000), fast).usd, 1.25);
  assert.equal(estimateApiCost(tokens(0, 0, 0, 100_000), fast).usd, 0.125);
  assert.equal(estimateApiCost(tokens(272_001), fast).missingTokens, 272_001);
  assert.equal(get(book, "openai", "future-model-fast"), undefined);
  assert.equal(get(book, "openai", "gpt-5.5-ultrafast"), undefined);
  assert.equal(get(book, "zai-coding-plan", "glm-highspeed"), undefined);
});

test("historical subscription models resolve without a current subscription catalog entry", () => {
  const book = createPriceBook([
    model("opencode", "gpt-5.4", [{ input: 2.5, output: 15, cache: { read: 0.25, write: 0 } }]),
    model("openrouter", "openai/gpt-6-luna", [
      { input: 0.1, output: 0.5, cache: { read: 0.01, write: 0.125 } },
    ]),
    model("zai", "glm-5"),
    model("opencode", "claude-haiku-4-5"),
    model("openrouter", "anthropic/claude-sonnet-5.5"),
    model("anthropic", "claude-haiku-4-5-20251001", [{ ...rates, input: 1 }]),
  ]);
  assert.equal(estimateApiCost(tokens(1_000_000), get(book, "openai", "gpt-5.4")).usd, 2.5);
  const fast = get(book, "openai", "gpt-6-luna-fast");
  assert.equal(fast.source, "openrouter/openai/gpt-6-luna");
  assert.equal(estimateApiCost(tokens(1_000_000), fast).usd, 0.2);
  assert.equal(get(book, "zai-coding-plan", "glm-5").source, "zai/glm-5");
  assert.equal(get(book, "opencode-go", "gpt-5.4").source, "opencode/gpt-5.4");
  assert.equal(
    get(book, "claude-code", "claude-sonnet-5-5[1m]").source,
    "openrouter/anthropic/claude-sonnet-5.5"
  );
  assert.equal(
    get(book, "claude-code", "claude-haiku-4-5-20251001[1m]").source,
    "anthropic/claude-haiku-4-5-20251001"
  );
  assert.equal(get(book, "openai", "nonexistent"), undefined);
});

test("Claude cache writes with unknown lifetimes stay unpriced while known token costs roll up", () => {
  const claude = { providerID: "claude-code", id: "claude-sonnet-5-5[1m]" };
  const book = createPriceBook([
    model("opencode", "claude-sonnet-5-5", [
      { input: 3, output: 15, cache: { read: 0.3, write: 3.75 } },
    ]),
  ]);
  const usage = tokens(1_000_000, 100_000, 200_000, 1_000_000, 1_000_000);
  const estimate = estimateApiCost(usage, book.resolve(claude));
  assert.equal(estimate.usd, 7.8);
  assert.equal(estimate.missingTokens, 1_000_000);
  assert.equal(estimate.missingEntries, 1);
  assert.equal(formatApiCost(estimate), "$7.80+");
  const readOnly = estimateApiCost(tokens(0, 0, 0, 1_000_000), book.resolve(claude));
  assert.equal(readOnly.usd, 0.3);
  assert.equal(readOnly.missingTokens, 0);
  const report = buildReport(
    [{ id: "main", tokens: usage, cost: 0 }],
    new Map([["main", [{ id: "1", type: "assistant", model: claude, tokens: usage, cost: 0 }]]]),
    book
  );
  assert.equal(report.total.api.usd, 7.8);
  assert.equal(report.total.api.missingTokens, 1_000_000);
  assert.equal(report.models[0].api.missingTokens, 1_000_000);
  assert.equal(providerCostTable(report.modelTotals).rows[0][1], "$7.80+");
  assert.equal(report.total.cost, 0);
});
