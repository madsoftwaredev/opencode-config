import {
  cacheHitRate,
  formatCost,
  formatApiCost,
  formatPercent,
  formatTokens,
  modelLabel,
  totalTokens,
  type Metrics,
  type ModelRow,
} from "./usage.ts";
import { emptyApiCost } from "./pricing.ts";

export type Table = {
  readonly headers: readonly string[];
  readonly rows: readonly (readonly string[])[];
  readonly widths: readonly number[];
  readonly width: number;
};

export function table(headers: readonly string[], rows: readonly (readonly string[])[]): Table {
  const widths = headers.map((header, index) =>
    Math.max(
      header.length,
      ...rows.map((row) => (index === 0 ? Math.min(38, row[index].length) : row[index].length))
    )
  );
  return { headers, rows, widths, width: widths.reduce((sum, width) => sum + width + 2, 0) };
}

function metricValues(metrics: Metrics, missingCost = false): string[] {
  return [
    formatTokens(totalTokens(metrics.tokens)),
    formatApiCost(metrics.api),
    formatCost(metrics.cost, missingCost),
    formatTokens(metrics.tokens.input),
    formatTokens(metrics.tokens.output),
    formatTokens(metrics.tokens.reasoning),
    formatTokens(metrics.tokens.cache.read),
    formatTokens(metrics.tokens.cache.write),
    formatPercent(cacheHitRate(metrics.tokens)),
  ];
}

const METRICS = [
  "Total tokens",
  "API equiv USD",
  "Actual USD",
  "Input (uncached)",
  "Output",
  "Reasoning",
  "Cache read",
  "Cache write",
  "Cache hit",
];

/** A vertical comparison keeps the total and every token bucket visible in compact terminals. */
export function metricTable(
  entries: readonly { label: string; metrics: Metrics; missingCost?: boolean }[]
): Table {
  const values = entries.map((entry) => metricValues(entry.metrics, entry.missingCost));
  return table(
    ["Metric", ...entries.map((entry) => entry.label)],
    METRICS.map((metric, index) => [metric, ...values.map((entry) => entry[index])])
  );
}

export function modelTable(rows: readonly ModelRow[]): Table {
  return table(
    [
      "Provider / model",
      "Total",
      "API USD",
      "Actual USD",
      "Input",
      "Output",
      "Reason",
      "Cache read",
      "Cache write",
      "Hit",
      "Steps",
      "Compacts",
    ],
    rows.map((row) => [
      modelLabel(row.model),
      ...metricValues(row, row.missingCosts > 0),
      String(row.steps),
      String(row.compactions),
    ])
  );
}

/** Two aligned tables keep model comparisons usable when all columns will not fit together. */
export function splitModelTables(rows: readonly ModelRow[]): { tokens: Table; accounting: Table } {
  return {
    tokens: table(
      ["Provider / model", "Input", "Output", "Reason", "Cache read", "Cache write", "Total"],
      rows.map((row) => [
        modelLabel(row.model),
        formatTokens(row.tokens.input),
        formatTokens(row.tokens.output),
        formatTokens(row.tokens.reasoning),
        formatTokens(row.tokens.cache.read),
        formatTokens(row.tokens.cache.write),
        formatTokens(totalTokens(row.tokens)),
      ])
    ),
    accounting: table(
      ["Provider / model", "API USD", "Actual USD", "Steps", "Compacts", "Hit"],
      rows.map((row) => [
        modelLabel(row.model),
        formatApiCost(row.api),
        formatCost(row.cost, row.missingCosts > 0),
        String(row.steps),
        String(row.compactions),
        formatPercent(cacheHitRate(row.tokens)),
      ])
    ),
  };
}

/** Coding-plan providers stay separate so their API-equivalent value is not hidden by recorded zeroes. */
export function providerCostTable(rows: readonly ModelRow[]): Table {
  const providers = new Map<
    string,
    { api: Metrics["api"]; actual: number; missingCosts: number }
  >();
  for (const row of rows) {
    let provider = providers.get(row.model.providerID);
    if (!provider) {
      provider = { api: emptyApiCost(), actual: 0, missingCosts: 0 };
      providers.set(row.model.providerID, provider);
    }
    provider.api.usd += row.api.usd;
    provider.api.missingTokens += row.api.missingTokens;
    provider.api.missingEntries += row.api.missingEntries;
    provider.actual += row.cost;
    provider.missingCosts += row.missingCosts;
  }
  return table(
    ["Provider / plan", "API equiv USD", "Actual USD"],
    [...providers]
      .sort((a, b) => b[1].api.usd - a[1].api.usd)
      .map(([id, usage]) => [
        id,
        formatApiCost(usage.api),
        formatCost(usage.actual, usage.missingCosts > 0),
      ])
  );
}

/** Strict boolean options avoid silently accepting configuration typos. */
export function readOptions(options: Readonly<Record<string, unknown>>): {
  sidebar: boolean;
  includeSubagents: boolean;
} {
  const boolean = (key: string) => {
    if (options[key] === undefined) return true;
    if (typeof options[key] !== "boolean")
      throw new TypeError(`opencode-usage: ${key} must be a boolean`);
    return options[key];
  };
  return { sidebar: boolean("sidebar"), includeSubagents: boolean("includeSubagents") };
}
