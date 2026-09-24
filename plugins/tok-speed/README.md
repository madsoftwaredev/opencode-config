# Token speed in the OpenCode V2 TUI

`local.tok-speed` adds a persistent `42 tok/s` indicator to the session prompt's
footer status row. It uses the latest completed assistant message for the
session's selected model: output tokens divided by the seconds between the
message's `time.streamed` and `time.completed`. It does not count prompt
processing time or input tokens. The last measurement remains visible during
the next response and after generation ends. New usage/step events refresh the
display; before a measurement exists (or after switching to an unmeasured
model), the indicator reads `— tok/s`. Outside a session it shows the same empty
state.

This package is auto-discovered under `~/.config/opencode/plugins/`; no config
entry is needed. To reload plugins after editing it:

```sh
opencode api post /api/location/reload
opencode api get /api/plugin
```

Look for `local.tok-speed`. Unit tests run with:

```sh
node --test plugins/tok-speed/
```
