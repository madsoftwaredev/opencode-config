import type { Model, Tokens } from "./usage.ts";

/** Current catalog rates in USD per million tokens, including whole-request context tiers. */
export type ApiRate = {
  readonly tier?: { readonly type: "context"; readonly size: number };
  readonly input: number;
  readonly output: number;
  readonly cache: { readonly read: number; readonly write: number };
};

/** Pricing discovery keeps no provider settings, credentials, headers, or prompt contents. */
export type PricingModel = {
  readonly id: string;
  readonly modelID: string;
  readonly providerID: string;
  readonly canonical?: string;
  readonly cost: readonly ApiRate[];
};

export type ApiPrice = {
  readonly source: string;
  readonly rates: readonly ApiRate[];
  readonly note?: string;
  readonly maxInput?: number;
  readonly cacheWriteDurationUnknown: boolean;
};
export type PriceBook = { resolve(model: Model): ApiPrice | undefined };
export type ApiCost = { usd: number; missingTokens: number; missingEntries: number };

export function priceKey(model: Model): string {
  return JSON.stringify([model.providerID, model.id]);
}

export function emptyApiCost(): ApiCost {
  return { usd: 0, missingTokens: 0, missingEntries: 0 };
}

const API_PROVIDER: Readonly<Record<string, string>> = {
  "opencode-go": "opencode",
  "zai-coding-plan": "zai",
  "claude-code": "anthropic",
  openai: "openai",
  anthropic: "anthropic",
};

// Published service-tier multipliers, checked 2026-10-03:
// https://developers.openai.com/api/docs/pricing#latest-models
// Use an explicit list: not every Fast model costs 2×, and future models must not inherit a guess.
const OPENAI_FAST: ReadonlyMap<string, number> = new Map([
  ["gpt-6-astra", 2],
  ["gpt-6.1-sol", 2],
  ["gpt-6-luna", 2],
  ["gpt-6-sol", 2],
  ["gpt-5.6-sol", 2],
  ["gpt-5.6-terra", 2],
  ["gpt-5.6-luna", 2],
  ["gpt-5.5", 2.5],
  ["gpt-5.4", 2],
  ["gpt-5.4-mini", 2],
  ["gpt-5.2", 2],
  ["gpt-5.1", 2],
  ["gpt-5", 2],
]);

function speed(model: PricingModel): "fast" | "ultrafast" | undefined {
  if (model.providerID !== "openai") return undefined;
  if (model.id.endsWith("-ultrafast") || model.modelID.endsWith("-ultrafast")) return "ultrafast";
  if (model.id.endsWith("-fast") || model.modelID.endsWith("-fast")) return "fast";
  return undefined;
}

function underlyingID(model: PricingModel): string {
  if (model.providerID === "claude-code") return model.modelID.replace(/\[1m\]$/, "");
  if (speed(model)) return model.modelID.replace(/-(?:ultrafast|fast)$/, "");
  return model.modelID;
}

function paid(model: PricingModel): boolean {
  return model.cost.some(
    (rate) => rate.input + rate.output + rate.cache.read + rate.cache.write > 0
  );
}

function sameModelID(actual: string, expected: string): boolean {
  if (actual === expected) return true;
  // OpenRouter spells Claude version separators with dots instead of the native API's dashes.
  if (!/(?:^|\/)claude-/.test(expected)) return false;
  return actual.replace(/(\d)\.(?=\d)/g, "$1-") === expected.replace(/(\d)\.(?=\d)/g, "$1-");
}

function resolvePrice(model: PricingModel, catalog: readonly PricingModel[]): ApiPrice | undefined {
  const provider = API_PROVIDER[model.providerID] ?? model.canonical ?? model.providerID;
  const tier = speed(model);
  const id = underlyingID(model);
  const multiplier =
    tier === "ultrafast"
      ? id === "gpt-6-astra"
        ? 6
        : undefined
      : tier === "fast"
        ? OPENAI_FAST.get(id)
        : 1;
  if (multiplier === undefined) return undefined;

  let source: PricingModel | undefined = model.cost.length ? model : undefined;
  if (!source || !paid(model) || provider !== model.providerID || tier) {
    // Prefer the exact dated Claude snapshot; only then use the current version's alias.
    const ids = [id];
    if (model.providerID === "claude-code" && /-\d{8}$/.test(id))
      ids.push(id.replace(/-\d{8}$/, ""));
    source = undefined;
    for (const candidateID of ids) {
      const candidates = catalog.filter((entry) => {
        if (
          !entry.cost.length ||
          speed(entry) ||
          (entry.providerID === model.providerID && !paid(entry))
        )
          return false;
        if (entry.providerID === provider || entry.providerID === "opencode")
          return sameModelID(entry.modelID, candidateID);
        if (entry.providerID === "openrouter")
          return sameModelID(entry.modelID, `${provider}/${candidateID}`);
        return false;
      });
      source =
        candidates.find((entry) => entry.providerID === provider) ??
        candidates.find((entry) => entry.providerID === "opencode") ??
        candidates[0];
      if (source) break;
    }
    if (!source && !tier && paid(model)) source = model;
    // A native free API model remains free; a coding-plan zero is not an API quote.
    if (
      !source &&
      !tier &&
      model.cost.length &&
      (/(?:^|[-:])free$/.test(model.id) || !API_PROVIDER[model.providerID])
    )
      source = model;
  }
  if (!source) return undefined;

  return {
    source: `${source.providerID}/${source.id}`,
    note: tier ? `${tier === "fast" ? "Fast" : "Ultrafast"} ${multiplier}× API rates` : undefined,
    maxInput: tier === "fast" && (id === "gpt-5.5" || id === "gpt-5.4") ? 272_000 : undefined,
    // OpenCode's normalized message schema has no 5-minute / 1-hour write breakdown.
    // Those have different API prices: do not silently value all writes at the cheaper rate.
    cacheWriteDurationUnknown: /(?:^|\/)claude-/.test(id) && paid(source),
    rates: source.cost.map((rate) => ({
      tier: rate.tier ? { ...rate.tier } : undefined,
      input: rate.input * multiplier,
      output: rate.output * multiplier,
      cache: { read: rate.cache.read * multiplier, write: rate.cache.write * multiplier },
    })),
  };
}

/** Resolve message model references, including models no longer listed by the subscription provider. */
export function createPriceBook(catalog: readonly PricingModel[]): PriceBook {
  // Retain only pricing fields, never the host's provider settings or credentials.
  const models = catalog.map(({ id, modelID, providerID, canonical, cost }) => ({
    id,
    modelID,
    providerID,
    canonical,
    cost: cost.map((rate) => {
      const values = [rate.input, rate.output, rate.cache.read, rate.cache.write];
      if (
        values.some((value) => !Number.isFinite(value) || value < 0) ||
        (rate.tier && (!Number.isFinite(rate.tier.size) || rate.tier.size < 0))
      ) {
        throw new TypeError("opencode-usage: invalid API pricing");
      }
      return { ...rate, tier: rate.tier ? { ...rate.tier } : undefined, cache: { ...rate.cache } };
    }),
  }));
  const catalogByKey = new Map(models.map((model) => [priceKey(model), model]));
  const resolved = new Map<string, ApiPrice | undefined>();
  return {
    resolve(model) {
      const key = priceKey(model);
      if (!resolved.has(key)) {
        const entry = catalogByKey.get(key) ?? { ...model, modelID: model.id, cost: [] };
        resolved.set(key, resolvePrice(entry, models));
      }
      return resolved.get(key);
    },
  };
}

/** Price each request separately: a chat's accumulated input must not trigger long-context pricing. */
export function estimateApiCost(tokens: Tokens, price?: ApiPrice): ApiCost {
  const input = tokens.input + tokens.cache.read + tokens.cache.write;
  const total = input + tokens.output + tokens.reasoning;
  let selected = price?.rates.find((rate) => !rate.tier);
  for (const rate of price?.rates ?? []) {
    if (!rate.tier || input <= rate.tier.size) continue;
    if (!selected?.tier || rate.tier.size > selected.tier.size) selected = rate;
  }
  if (!selected || (price?.maxInput !== undefined && input > price.maxInput))
    return { usd: 0, missingTokens: total, missingEntries: total > 0 ? 1 : 0 };
  const unpricedWrites = price?.cacheWriteDurationUnknown ? tokens.cache.write : 0;
  return {
    usd:
      (tokens.input * selected.input +
        (tokens.output + tokens.reasoning) * selected.output +
        tokens.cache.read * selected.cache.read +
        (tokens.cache.write - unpricedWrites) * selected.cache.write) /
      1_000_000,
    missingTokens: unpricedWrites,
    missingEntries: unpricedWrites > 0 ? 1 : 0,
  };
}
