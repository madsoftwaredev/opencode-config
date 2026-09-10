import type { Config, Plugin } from "@opencode-ai/plugin";

// TODO: Remove this plugin and scripts/compaction-variant.test.js once OpenCode honors
// agent.compaction.variant for both automatic and manual compaction. Keep the model/variant config.
export const CompactionVariantPlugin = (async () => {
  let compaction: NonNullable<Config["agent"]>["compaction"];

  return {
    async config(config) {
      compaction = config.agent?.compaction;
    },
    async "chat.params"(input, output) {
      if (input.agent !== "compaction" || typeof compaction?.variant !== "string") return;
      if (compaction.model !== `${input.model.providerID}/${input.model.id}`) return;

      const variants = "variants" in input.model ? input.model.variants : undefined;
      const variant: unknown =
        variants && typeof variants === "object"
          ? Reflect.get(variants, compaction.variant)
          : undefined;
      if (!variant || typeof variant !== "object" || Array.isArray(variant)) {
        throw new Error(`Unknown compaction variant: ${compaction.model}/${compaction.variant}`);
      }

      // OpenCode 1.18.29 otherwise applies the conversation's variant during compaction.
      Object.assign(output.options, variant);
    },
  };
}) satisfies Plugin;
