/** @jsxImportSource @opentui/solid */

import { Plugin } from "@opencode/plugin/tui";
import { BoxRenderable, ScrollBoxRenderable, Yoga } from "@opentui/core";
import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import { attachSidebarResize } from "./sidebar";
import { DEFAULT_WIDTH, parseWidth, preferredWidth } from "./width";

export default Plugin.define({
  id: "sidebar-resize",
  setup(context) {
    const [settings, update] = context.storage.store<{ width: number }>("settings", {
      initial: { width: DEFAULT_WIDTH },
    });
    const [width, setWidth] = createSignal(preferredWidth(settings.width));
    createEffect(() => setWidth(preferredWidth(settings.width)));
    const save = async (width: number) => {
      setWidth(width);
      try {
        await update((draft) => {
          draft.width = width;
        });
      } catch (error) {
        setWidth(preferredWidth(settings.width));
        console.warn("[sidebar-resize] Could not save width", error);
        context.ui.toast.show({ message: "Could not save sidebar width.", variant: "error" });
      }
    };
    const unregister = context.ui.slot({
      append: "sidebar.footer",
      render: () => {
        // Hidden anchor adds no row or footer gap. The drag handle is attached
        // directly to the original sidebar, outside its scrolling contents.
        let anchor: BoxRenderable | undefined;
        let attachment: ReturnType<typeof attachSidebarResize>;
        onMount(() => {
          if (!anchor) return;
          attachment = attachSidebarResize({
            core: { BoxRenderable, ScrollBoxRenderable, Yoga },
            anchor,
            renderer: context.renderer,
            width,
            save: (width) => {
              void save(width);
            },
            highlight: () => context.theme.background.raised.high,
          });
          if (!attachment) {
            context.ui.toast.show({
              message: "Sidebar resize: unsupported OpenCode layout; sidebar left unchanged.",
              variant: "warning",
            });
          }
        });
        createEffect(() => {
          width();
          attachment?.refresh();
        });
        onCleanup(() => attachment?.dispose());
        return (
          <box
            ref={(node) => {
              anchor = node;
            }}
            id="sidebar-resize.anchor"
            visible={false}
            width={0}
            height={0}
          />
        );
      },
    });

    context.keymap.layer(() => ({
      mode: "global",
      commands: [
        {
          id: "sidebar-resize.width",
          title: "Set sidebar width",
          group: "Appearance",
          palette: true,
          slash: { name: "sidebar-width", arguments: true },
          run: async (input) => {
            const value =
              input ??
              (await context.ui.dialog.prompt({
                title: "Sidebar width (columns)",
                value: String(width()),
              }));
            if (value === undefined) return;
            const nextWidth = value.trim() === "reset" ? DEFAULT_WIDTH : parseWidth(value);
            if (nextWidth === undefined) {
              context.ui.toast.show({
                message: "Use a positive whole number, or /sidebar-width reset.",
                variant: "error",
              });
              return;
            }
            await save(nextWidth);
          },
        },
      ],
      bindings: ["sidebar-resize.width"],
    }));
    return unregister;
  },
});
