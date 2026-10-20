# Compaction model (OpenCode V2)

Uses `opencode-go/deepseek-v4.1-flash#max` for local checkpoint summaries while the
session keeps its selected working model, except for the `claude-code` provider.
Global plugin discovery loads this directory.

## Claude Code compatibility

Claude Code sessions use the bridge's normal summary request instead of this plugin.
In `@openchamber/opencode-claude` 1.3.4, that request stops the parked Claude turn and
clears its resume binding before generating a one-shot Haiku summary. The next working
request starts a fresh Claude session from OpenCode's checkpoint and recent context.

Installing an external summary through `event.result` bypasses that reset: OpenCode
can report a completed compaction while the Claude bridge continues reading its old,
full history. This plugin therefore leaves `result` unset for `claude-code`, regardless
of the configured summarizer. Other providers, including native `anthropic`, keep
using the configured summarizer. No stored transcript is deleted.

## Why the Go adapter exists

In OpenCode 2.0.8–2.0.9, `ctx.generate.text()` made a stateless request without
`x-opencode-session`, which Go rejected. The plugin's Go adapter uses the existing
OpenCode connection, catalog endpoint, model ID, and variant, and sends the
**originating session ID** to the chat-completions endpoint. It does not store a
credential or change the session's model. Other providers use the native
`ctx.generate.text()` API.

Credential lookup follows the provider's **declared integration ID**, defaulting
to the provider ID only when no integration ID is declared. Both API keys and
resolved OAuth access tokens are supported; OpenCode owns OAuth refresh.

In the inspected OpenCode 2.1.0 configuration, Console discovery routes Go to
`https://opencode.ai/inference/go/openai/v1` through the `opencode` integration,
with an organization header. The old adapter instead preferred a legacy
`opencode-go` API key and ignored OAuth, sending the wrong credential to that
endpoint. Logs show HTTP 401 fallbacks beginning on 2026-10-17. The adapter now
keeps the discovered endpoint, headers, and integration together, matching
OpenCode's model resolver. It never borrows a different integration's credential
when the declared connection is missing.

The Go adapter currently supports models using
`@opencode/ai/providers/openai-compatible` (including the default DeepSeek model).
Other Go protocols produce a diagnostic and fall back to normal compaction.

## Check a compaction

Successful checkpoints carry this metadata:

```json
{
  "compactionModel": "opencode-go/deepseek-v4.1-flash#max",
  "compactionPlugin": "compaction-model"
}
```

OpenCode still stamps the checkpoint's top-level `model` with the session's working
model. Check `metadata.compactionModel` to identify the actual summarizer:

```sh
opencode api get '/api/session/SESSION_ID/message?type=compaction&order=desc&limit=1'
```

Successes and fallbacks are logged in
`~/.local/share/opencode/log/compaction-model.log` (or beneath `$XDG_DATA_HOME`).
The log does not include transcripts, summaries, credentials, or Go response bodies.

## Summary and failure behavior

- Sends the full supplied text/tool transcript, including prior checkpoints. Binary
  media is represented by a filename/type descriptor.
- Requires the checkpoint headings and retries an invalid summary once with the
  original transcript. Empty, truncated, or twice-invalid summaries are not installed.
- Go requests have a three-minute timeout and a 32,768-token output ceiling.
- On failure, logs the reason and lets OpenCode use the session's normal compaction.
- OpenCode owns automatic scheduling, recent-context retention, and checkpoint installation.
  The plugin handles requests delivered to the `compaction` hook; native provider checkpoint
  routes are outside this adapter's verification.

## Options

Optional entry in `opencode.json` (the default needs no config entry):

```json
{
  "plugins": [
    {
      "package": "./plugins/compaction-model",
      "options": { "model": "opencode-go/deepseek-v4.1-flash#max" }
    }
  ]
}
```

`model` accepts `provider/model#variant` (variant optional). The earlier separate
`providerID`, `modelID`, and `variant` options remain supported.

There is no default character cutoff. Optional `maxTranscriptChars` is now a guard:
exceeding it logs a fallback rather than silently deleting the middle of the history.

## Verification

```sh
bun test plugins/compaction-model/index.test.js
```

The regression suite covers Claude Code delegation, Go session routing, Console OAuth
and service-account credentials, concurrent sessions, variant selection, long-history
preservation, invalid/truncated results, and logged fallback. The credential fix was
checked against the running 2.1.0 server's provider, integration, and model metadata
using authenticated read-only API calls; no paid generation was run for this fix.

References: [V2 plugin hooks](https://opencode.ai/v2/docs/build/plugins/),
[V2 compaction](https://opencode.ai/v2/docs/compaction/).
