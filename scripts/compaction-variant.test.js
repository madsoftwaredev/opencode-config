import { expect, test } from "bun:test";
import { CompactionVariantPlugin } from "../plugin/compaction-variant";

const model = {
  providerID: "openai",
  id: "gpt-5.6-sol",
  variants: {
    high: { reasoningEffort: "high", reasoningSummary: "auto" },
  },
};

async function configuredPlugin(compaction = { model: "openai/gpt-5.6-sol", variant: "high" }) {
  const hooks = await CompactionVariantPlugin();
  await hooks.config({ agent: { compaction } });
  return hooks;
}

test.each(["medium", "xhigh", undefined])(
  "compaction uses high instead of inherited %s reasoning",
  async (reasoningEffort) => {
    const hooks = await configuredPlugin();
    const input = { agent: "compaction", model, message: { model: { variant: reasoningEffort } } };
    const output = { options: { reasoningEffort, instructions: "Preserve the summary prompt" } };

    await hooks["chat.params"](input, output);

    expect(output.options).toEqual({
      reasoningEffort: "high",
      reasoningSummary: "auto",
      instructions: "Preserve the summary prompt",
    });
    expect(input.message.model.variant).toBe(reasoningEffort);
  }
);

test("coding, title, and summary agents keep their own reasoning settings", async () => {
  const hooks = await configuredPlugin();
  for (const agent of ["implementation-engineer", "title", "summary"]) {
    const output = { options: { reasoningEffort: "medium" } };
    await hooks["chat.params"]({ agent, model }, output);
    expect(output.options).toEqual({ reasoningEffort: "medium" });
  }
});

test("an unconfigured variant or different model is left unchanged", async () => {
  for (const compaction of [{}, { model: "openai/gpt-6-astra", variant: "high" }]) {
    const hooks = await configuredPlugin(compaction);
    const output = { options: { reasoningEffort: "medium" } };
    await hooks["chat.params"]({ agent: "compaction", model }, output);
    expect(output.options).toEqual({ reasoningEffort: "medium" });
  }
});

test("an unsupported configured variant fails rather than silently inheriting reasoning", async () => {
  const hooks = await configuredPlugin({ model: "openai/gpt-5.6-sol", variant: "unsupported" });
  await expect(
    hooks["chat.params"]({ agent: "compaction", model }, { options: {} })
  ).rejects.toThrow("Unknown compaction variant: openai/gpt-5.6-sol/unsupported");
});
