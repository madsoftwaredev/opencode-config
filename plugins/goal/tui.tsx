/** @jsxImportSource @opentui/solid */

import { Plugin } from "@opencode/plugin/tui";
import type { Context } from "@opencode/plugin/tui/context";
import { Show, createEffect, createSignal, onCleanup } from "solid-js";
import { GoalRpc, islandModel, type GoalView } from "./goal-rpc";

/**
 * A fixed island above the message composer showing the session's active goal
 * and loop state. It reads goal state from the server plugin over goal RPC.
 */
function GoalIsland(props: { context: Context; sessionID: string }) {
  const [view, setView] = createSignal<GoalView>({ active: false });
  const goal = props.context.client.rpc(GoalRpc);

  const refresh = (sessionID: string) => {
    goal
      .state({ sessionID })
      .then((next) => setView(next as GoalView))
      .catch(() => setView({ active: false }));
  };

  createEffect(() => refresh(props.sessionID));

  // Live updates from the server plugin. Deliberately not filtered by session:
  // subtask islands show an inherited parent goal and still need refreshes.
  const offUpdated = goal.events.on("updated", () => refresh(props.sessionID));
  const offStatus = props.context.data.on("session.status", (event) => {
    if (event.data.sessionID === props.sessionID) refresh(props.sessionID);
  });

  onCleanup(() => {
    offUpdated();
    offStatus();
  });

  const model = () => islandModel(view());

  return (
    <Show when={model().visible}>
      <box
        width="100%"
        backgroundColor={props.context.theme.background.raised.base}
        paddingLeft={1}
        paddingRight={1}
      >
        <text
          fg={view().status === "paused" ? props.context.theme.text.muted : props.context.theme.text.base}
          wrapMode="none"
        >
          {model().line}
        </text>
      </box>
    </Show>
  );
}

export default Plugin.define({
  id: "goal.tui",
  setup(context) {
    return context.ui.slot({
      append: "session.composer.top",
      render: ({ sessionID }) => <GoalIsland context={context} sessionID={sessionID} />,
    });
  },
});
