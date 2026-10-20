/** @jsxImportSource @opentui/solid */

import { Plugin } from "@opencode/plugin/tui";
import type { Context } from "@opencode/plugin/tui/context";
import { useTerminalDimensions } from "@opentui/solid";
import type { ScrollBoxRenderable } from "@opentui/core";
import { For, Show, createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { createUsageTracker, type Snapshot } from "./data";
import {
  cacheHitRate,
  formatCost,
  formatApiCost,
  formatPercent,
  formatTokens,
  modelLabel,
  totalTokens,
  type ModelRow,
} from "./usage";
import {
  metricTable,
  modelTable,
  splitModelTables,
  providerCostTable,
  readOptions,
  type Table,
} from "./view";

function DataTable(props: { context: Context; data: Table }) {
  const row = (cells: readonly string[], header = false) => (
    <box flexDirection="row" alignItems="flex-start" width={props.data.width}>
      <For each={cells}>
        {(cell, index) => (
          <text
            width={props.data.widths[index()] + 2}
            flexShrink={0}
            fg={header ? props.context.theme.text.muted : props.context.theme.text.base}
            wrapMode={index() === 0 ? "word" : "none"}
          >
            {index() === 0 ? cell : cell.padStart(props.data.widths[index()])}
          </text>
        )}
      </For>
    </box>
  );
  return (
    <box flexDirection="column" width={props.data.width}>
      {row(props.data.headers, true)}
      <For each={props.data.rows}>{(cells) => row(cells)}</For>
    </box>
  );
}

function ModelBreakdown(props: {
  context: Context;
  models: readonly ModelRow[];
  availableWidth: number;
}) {
  const matrix = createMemo(() => modelTable(props.models));
  const split = createMemo(() => splitModelTables(props.models));
  return (
    <Show
      when={matrix().width <= props.availableWidth}
      fallback={
        <Show
          when={Math.max(split().tokens.width, split().accounting.width) <= props.availableWidth}
          fallback={
            <For each={props.models}>
              {(model) => (
                <box flexDirection="column" marginBottom={1}>
                  <text fg={props.context.theme.text.base}>{modelLabel(model.model)}</text>
                  <DataTable
                    context={props.context}
                    data={metricTable([
                      { label: "Recorded", metrics: model, missingCost: model.missingCosts > 0 },
                    ])}
                  />
                  <text fg={props.context.theme.text.muted}>
                    {model.steps} assistant steps · {model.compactions} compactions
                  </text>
                </box>
              )}
            </For>
          }
        >
          <box flexDirection="column">
            <DataTable context={props.context} data={split().tokens} />
            <box marginTop={1}>
              <DataTable context={props.context} data={split().accounting} />
            </box>
          </box>
        </Show>
      }
    >
      <DataTable context={props.context} data={matrix()} />
    </Show>
  );
}

function UsageDialog(props: {
  context: Context;
  sessionID: string;
  snapshot: () => Snapshot | undefined;
  includeSubagents: boolean;
  refresh: () => void;
  loaded: () => void;
}) {
  const { context } = props;
  const dimensions = useTerminalDimensions();
  const [availableWidth, setAvailableWidth] = createSignal(40);
  const liveSnapshot = () => {
    const value = props.snapshot();
    return value?.sessionID === props.sessionID ? value : undefined;
  };
  const [snapshot, setSnapshot] = createSignal<Snapshot>();
  const [waiting, setWaiting] = createSignal(true);
  createEffect(() => {
    const value = liveSnapshot();
    if (!waiting() || !value || value.loading || !value.detailed) return;
    setSnapshot(value);
    setWaiting(false);
    props.loaded();
  });
  const report = () => snapshot()?.report;
  const [expanded, setExpanded] = createSignal(false);
  const [variants, setVariants] = createSignal(false);
  let scroll: ScrollBoxRenderable | undefined;

  context.keymap.layer(() => ({
    mode: "global",
    bindings: ["opencode-usage.refresh", "opencode-usage.expand", "opencode-usage.variants"],
    commands: [
      {
        id: "opencode-usage.refresh",
        bind: "r",
        title: "Refresh usage",
        run: () => {
          setWaiting(true);
          props.refresh();
        },
      },
      {
        id: "opencode-usage.expand",
        bind: "s",
        title: "Toggle per-chat model breakdown",
        run: () => {
          setExpanded(!expanded());
        },
      },
      {
        id: "opencode-usage.variants",
        bind: "v",
        title: "Toggle model variant breakdown",
        run: () => {
          setVariants(!variants());
        },
      },
      {
        bind: "up",
        run: () => {
          scroll?.scrollBy(-1);
        },
      },
      {
        bind: "down",
        run: () => {
          scroll?.scrollBy(1);
        },
      },
      {
        bind: "pageup",
        run: () => {
          scroll?.scrollBy(-10);
        },
      },
      {
        bind: "pagedown",
        run: () => {
          scroll?.scrollBy(10);
        },
      },
      {
        bind: "left",
        run: () => {
          scroll?.scrollBy({ x: -4, y: 0 });
        },
      },
      {
        bind: "right",
        run: () => {
          scroll?.scrollBy({ x: 4, y: 0 });
        },
      },
    ],
  }));

  const comparison = () => {
    const value = report();
    return value
      ? metricTable([
          { label: "This chat", metrics: value.main },
          ...(props.includeSubagents
            ? [{ label: "Subagent chats", metrics: value.subagents }]
            : []),
          { label: props.includeSubagents ? "Combined total" : "Chat total", metrics: value.total },
        ])
      : undefined;
  };

  return (
    <box
      flexDirection="column"
      paddingLeft={2}
      paddingRight={2}
      paddingBottom={1}
      onSizeChange={function () {
        setAvailableWidth(Math.max(20, this.width - 6));
      }}
    >
      <box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <text fg={context.theme.text.base}>CHAT USAGE</text>
        <text
          fg={context.theme.text.muted}
          onMouseDown={(event) => {
            if (event.button === 0) context.ui.dialog.clear();
          }}
        >
          esc close
        </text>
      </box>
      <text fg={context.theme.text.base} wrapMode="none">
        {report()?.sessions[0]?.session.title ?? props.sessionID}
      </text>
      <text fg={context.theme.text.muted}>
        {props.includeSubagents
          ? "Scope: this chat + subagent chats (including nested)"
          : "Scope: this chat only"}
        {report()
          ? `${props.includeSubagents ? ` · Subagent chats: ${report()!.sessions.length - 1}` : ""} · ${report()!.modelTotals.length} models · ${report()!.models.length} variants`
          : ""}
      </text>
      <text fg={context.theme.text.muted}>
        {waiting()
          ? "Loading / refreshing…"
          : snapshot()?.updatedAt
            ? `Snapshot ${new Date(snapshot()!.updatedAt!).toLocaleTimeString()} · r refresh`
            : "Usage unavailable · r retry"}
      </text>
      <scrollbox
        ref={(value) => {
          scroll = value;
        }}
        scrollY={true}
        scrollX={true}
        height={Math.max(4, dimensions().height - 14)}
        marginTop={1}
      >
        <box flexDirection="column" width={availableWidth()} minWidth={0}>
          <For each={snapshot()?.warnings ?? []}>
            {(warning) => <text fg={context.theme.text.muted}>{warning}</text>}
          </For>
          <Show when={report()}>
            {(value) => (
              <>
                <Show when={comparison()}>
                  {(data) => (
                    <Show
                      when={data().width <= availableWidth()}
                      fallback={
                        <For
                          each={[
                            {
                              label: props.includeSubagents ? "COMBINED TOTAL" : "CHAT TOTAL",
                              metrics: value().total,
                            },
                            { label: "THIS CHAT", metrics: value().main },
                            ...(props.includeSubagents
                              ? [{ label: "SUBAGENT CHATS", metrics: value().subagents }]
                              : []),
                          ]}
                        >
                          {(entry) => (
                            <box flexDirection="column" marginBottom={1}>
                              <text fg={context.theme.text.base}>{entry.label}</text>
                              <DataTable
                                context={context}
                                data={metricTable([{ label: "Recorded", metrics: entry.metrics }])}
                              />
                            </box>
                          )}
                        </For>
                      }
                    >
                      <DataTable context={context} data={data()} />
                    </Show>
                  )}
                </Show>

                <box flexDirection="column" marginTop={1}>
                  <text fg={context.theme.text.base}>
                    BY PROVIDER / PLAN · MODEL-ATTRIBUTED USAGE
                  </text>
                  <DataTable context={context} data={providerCostTable(value().modelTotals)} />
                </box>

                <box flexDirection="column" marginTop={1}>
                  <text fg={context.theme.text.base}>
                    {variants() ? "BY MODEL VARIANT" : "BY MODEL"} ·{" "}
                    {props.includeSubagents ? "THIS CHAT + SUBAGENT CHATS" : "THIS CHAT"}
                  </text>
                  <ModelBreakdown
                    context={context}
                    models={variants() ? value().models : value().modelTotals}
                    availableWidth={availableWidth()}
                  />
                  <Show when={!waiting() && value().models.length === 0}>
                    <text fg={context.theme.text.muted}>
                      No model-attributed usage recorded yet.
                    </text>
                  </Show>
                </box>

                <Show
                  when={
                    totalTokens(value().unattributed.tokens) > 0 || value().unattributed.cost > 1e-8
                  }
                >
                  <box flexDirection="column" marginTop={1}>
                    <text fg={context.theme.text.base}>UNATTRIBUTED / AUXILIARY</text>
                    <DataTable
                      context={context}
                      data={metricTable([{ label: "Recorded", metrics: value().unattributed }])}
                    />
                    <text fg={context.theme.text.muted}>
                      Included in totals; no reliable model attribution (for example title
                      generation).
                    </text>
                  </box>
                </Show>
                <Show when={value().mismatch}>
                  <text fg={context.theme.text.muted}>
                    Model detail differs from session accounting. Totals use OpenCode's recorded
                    session usage.
                  </text>
                </Show>

                <box flexDirection="column" marginTop={1}>
                  <text fg={context.theme.text.base}>BY CHAT · INDIVIDUAL USAGE</text>
                  <For each={value().sessions}>
                    {(session, index) => (
                      <box flexDirection="column" marginTop={1}>
                        <text fg={context.theme.text.base}>
                          {index() === 0
                            ? "This chat"
                            : `Subagent chat${session.session.agent ? ` · ${session.session.agent}` : ""}`}
                          {session.session.title ? ` · ${session.session.title}` : ""}
                        </text>
                        <text fg={context.theme.text.muted}>
                          {session.session.id}
                          {session.session.parentID
                            ? ` · parent chat ${session.session.parentID}`
                            : ""}
                        </text>
                        <DataTable
                          context={context}
                          data={metricTable([{ label: "Recorded", metrics: session }])}
                        />
                        <Show when={expanded()}>
                          <Show
                            when={session.loaded}
                            fallback={
                              <text fg={context.theme.text.muted}>Model detail not loaded.</text>
                            }
                          >
                            <ModelBreakdown
                              context={context}
                              models={session.models}
                              availableWidth={availableWidth()}
                            />
                          </Show>
                        </Show>
                      </box>
                    )}
                  </For>
                </box>
                <Show when={value().sessions.some((session) => session.session.fork)}>
                  <text fg={context.theme.text.muted}>
                    Fork totals follow OpenCode and may contain inherited history. Separate forks
                    are not counted as subagents.
                  </text>
                </Show>
                <text fg={context.theme.text.muted} marginTop={1}>
                  Total = input + output + reasoning + cache read + cache write. Input excludes
                  cached tokens.
                </text>
                <text fg={context.theme.text.muted}>
                  API equivalent = tokens × current API rates, including cache discounts and
                  reasoning. Each request uses its own context tier. + means a known subtotal with
                  unpriced usage; — means unavailable.
                </text>
                <Show when={value().total.api.missingTokens > 0}>
                  <text fg={context.theme.text.muted}>
                    {formatTokens(value().total.api.missingTokens)} tokens could not be API-priced
                    (missing model attribution, rates, or cache-write lifetime).
                  </text>
                </Show>
                <text fg={context.theme.text.muted}>
                  Actual USD is OpenCode's recorded usage charge. Coding plans can record $0 while
                  API equivalent is positive. Fixed subscription fees are not per-chat charges and
                  are not included.
                </text>
                <box flexDirection="column" marginTop={1}>
                  <text fg={context.theme.text.base}>API PRICE REFERENCES · CURRENT CATALOG</text>
                  <For each={value().modelTotals}>
                    {(model) => (
                      <box flexDirection="column">
                        <text fg={context.theme.text.muted}>
                          {modelLabel(model.model)} →{" "}
                          {model.apiPrice?.source ?? "No matching API rate"}
                          {model.apiPrice?.note ? ` · ${model.apiPrice.note}` : ""}
                        </text>
                        <Show
                          when={
                            model.apiPrice?.cacheWriteDurationUnknown &&
                            model.tokens.cache.write > 0
                          }
                        >
                          <text fg={context.theme.text.muted}>
                            {formatTokens(model.tokens.cache.write)} Claude cache-write tokens are
                            unpriced: OpenCode does not record their 5-minute / 1-hour lifetime.
                          </text>
                        </Show>
                      </box>
                    )}
                  </For>
                  <text fg={context.theme.text.muted}>
                    Published OpenAI Fast / Ultrafast premiums are included. Speed aliases without a
                    matching API rate remain unpriced.
                  </text>
                </box>
              </>
            )}
          </Show>
        </box>
      </scrollbox>
      <text fg={context.theme.text.muted} marginTop={1}>
        r refresh · s per-chat models · v variants · ↑/↓ scroll · esc
      </text>
    </box>
  );
}

function UsageSidebar(props: {
  context: Context;
  sessionID: string;
  snapshot: () => Snapshot | undefined;
  enabled: () => boolean;
  open: (sessionID: string) => void;
  includeSubagents: boolean;
}) {
  const value = () => {
    const saved = props.snapshot();
    return saved?.sessionID === props.sessionID ? saved : undefined;
  };
  const total = () => value()?.report?.total;
  const fields = () => {
    const usage = total();
    if (!usage) return [];
    return [
      ["Total tok", formatTokens(totalTokens(usage.tokens), true)],
      ["API equiv", formatApiCost(usage.api)],
      ["Actual USD", formatCost(usage.cost)],
      ["Input", formatTokens(usage.tokens.input, true)],
      ["Output", formatTokens(usage.tokens.output, true)],
      ["Reasoning", formatTokens(usage.tokens.reasoning, true)],
      ["Cache read", formatTokens(usage.tokens.cache.read, true)],
      ["Cache write", formatTokens(usage.tokens.cache.write, true)],
      ["Cache hit", formatPercent(cacheHitRate(usage.tokens))],
    ];
  };
  return (
    <Show when={props.enabled()}>
      <box
        flexDirection="column"
        marginTop={1}
        paddingBottom={1}
        onMouseDown={(event) => {
          if (event.button === 0) props.open(props.sessionID);
        }}
      >
        <text fg={props.context.theme.text.base}>CHAT USAGE</text>
        <Show
          when={total()}
          fallback={
            <text fg={props.context.theme.text.muted}>
              {value()?.warnings.length ? "Usage unavailable · /usage" : "Loading usage…"}
            </text>
          }
        >
          <For each={fields()}>
            {(field) => (
              <box flexDirection="row" justifyContent="space-between">
                <text fg={props.context.theme.text.muted}>{field[0]}</text>
                <text fg={props.context.theme.text.base}>{field[1]}</text>
              </box>
            )}
          </For>
          <text fg={props.context.theme.text.muted}>
            {props.includeSubagents
              ? `Subagent chats included: ${value()?.report?.sessions.length ? value()!.report!.sessions.length - 1 : 0}`
              : "This chat only"}
          </text>
          <Show when={value()?.warnings.length}>
            <text fg={props.context.theme.text.muted}>Partial / stale · /usage to retry</text>
          </Show>
        </Show>
        <text fg={props.context.theme.text.muted}>/usage · full breakdown</text>
      </box>
    </Show>
  );
}

export default Plugin.define({
  id: "opencode-usage",
  setup(context) {
    const options = readOptions(context.options);
    const [preferences, updatePreferences] = context.storage.store<{ sidebar?: boolean }>(
      "settings",
      { initial: {} }
    );
    const sidebarEnabled = () => preferences.sidebar ?? options.sidebar;
    const [snapshot, setSnapshot] = createSignal<Snapshot>();
    const tracker = createUsageTracker(
      context.client,
      setSnapshot,
      context.location ?? context.data.location.default()
    );

    const open = (sessionID: string) => {
      tracker.select(sessionID, options.includeSubagents);
      tracker.details();
      context.ui.dialog.show(
        () => (
          <UsageDialog
            context={context}
            sessionID={sessionID}
            snapshot={snapshot}
            includeSubagents={options.includeSubagents}
            refresh={tracker.refresh}
            loaded={tracker.closeDetails}
          />
        ),
        tracker.closeDetails
      );
      context.ui.dialog.set({ size: "xlarge", centered: true });
    };

    const unregisterApp = context.ui.slot({
      append: "app",
      render: () => {
        createEffect(() => {
          const route = context.ui.router.current();
          tracker.select(
            route.type === "session" ? route.sessionID : undefined,
            options.includeSubagents
          );
        });
        const stop = context.data.listen(({ details }) => {
          if (!details.type.startsWith("session.") || !("sessionID" in details.data)) return;
          const id = details.data.sessionID;
          if (typeof id !== "string") return;
          const parentID =
            "parentID" in details.data && typeof details.data.parentID === "string"
              ? details.data.parentID
              : undefined;
          tracker.changed(details.type, id, parentID);
        });
        onCleanup(stop);
        // Recover missed events from reconnects or sessions run by another SDK process.
        const resync = setInterval(tracker.resync, 15_000);
        onCleanup(() => clearInterval(resync));
        context.keymap.layer(() => ({
          mode: "global",
          commands: [
            {
              id: "opencode-usage.show",
              title: "Show chat token and cost breakdown",
              group: "Session",
              palette: true,
              slash: { name: "usage", aliases: ["chat-usage"] },
              run: () => {
                const route = context.ui.router.current();
                if (route.type === "session") open(route.sessionID);
                else
                  context.ui.toast.show({
                    title: "Chat usage",
                    message: "Open a chat first.",
                    variant: "info",
                  });
              },
            },
            {
              id: "opencode-usage.sidebar",
              title: "Toggle chat usage sidebar",
              group: "Appearance",
              palette: true,
              slash: { name: "usage-sidebar" },
              run: async () => {
                try {
                  await updatePreferences((draft) => {
                    draft.sidebar = !sidebarEnabled();
                  });
                } catch (error) {
                  console.warn("[opencode-usage] Could not save sidebar setting", error);
                  context.ui.toast.show({
                    title: "Chat usage",
                    message: "Could not save sidebar setting.",
                    variant: "error",
                  });
                }
              },
            },
          ],
          bindings: ["opencode-usage.show", "opencode-usage.sidebar"],
        }));
        return null;
      },
    });
    const unregisterSidebar = context.ui.slot({
      append: "sidebar.content",
      render: ({ sessionID }) => (
        <UsageSidebar
          context={context}
          sessionID={sessionID}
          snapshot={snapshot}
          enabled={sidebarEnabled}
          open={open}
          includeSubagents={options.includeSubagents}
        />
      ),
    });

    return () => {
      tracker.dispose();
      unregisterSidebar();
      unregisterApp();
    };
  },
});
