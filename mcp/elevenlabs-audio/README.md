# ElevenLabs audio MCP

Small local MCP for game SFX and music. Complements the OAuth-based `elevenlabs` hosted server; it does not replace it.

## Tools

| Tool             | Inputs                                                                                                                                                                  | Result                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `get_status`     | None                                                                                                                                                                    | Whether the process has an API key, and its output directory. No API call or charge. |
| `generate_sfx`   | `prompt`, optional `duration_seconds` (0.5–30, default 3), `loop` (default false), `prompt_influence` (0–1, default 0.3)                                                | MP3 SFX or ambience, with native seamless-loop support.                              |
| `generate_music` | `prompt`, optional `duration_seconds` (3–300, default 60), `force_instrumental` (default true), `model_id` (`music_v1`, `music_v2`, `music_v2_5`; default `music_v2_5`) | MP3 soundtrack. The wrapper limits music to five minutes.                            |

Both generation tools also accept `name` (a filename label, not a path) and `output_format` (`mp3_44100_128`, the default, or `mp3_44100_192`). A unique ID is appended so generations never overwrite earlier output. Results include an absolute `path`, byte count, model, format, and **requested**, not measured, duration. Copy the returned file into your game's asset directory.

Music has no native seamless-loop flag. Describe the tempo, instrumentation, mood, and loop-friendly structure in the prompt, then trim/crossfade the generated track if necessary. No audio conversion or loop post-processing is performed by this MCP.

## Setup

Requires Node.js 22+:

```sh
cd ~/.config/opencode/mcp/elevenlabs-audio
npm ci
```

The global OpenCode config registers this as `elevenlabs-audio`, passing `ELEVENLABS_API_KEY` via `{env:ELEVENLABS_API_KEY}`. No key is stored here. If the background service does not have the key, this MCP's launcher sources `~/.zshrc` before starting Node. Shell startup output goes to stderr so it cannot corrupt MCP's stdout protocol. The key must be **exported** by your shell configuration.

After changing the key in `~/.zshrc`, reconnect **only `elevenlabs-audio`** through OpenCode's `/mcps` interface. No whole-service restart is needed. Check its connection with:

```sh
opencode mcp list
```

Ask OpenCode to call `elevenlabs-audio.get_status` to verify key availability without spending credits. This confirms only that the variable is present, not that the key is valid or has Music/SFX permissions.

Output defaults to `~/Music/ElevenLabs`. To override it, set `ELEVENLABS_AUDIO_OUTPUT_DIR` in the MCP server's `environment` config to an absolute directory. Only files within that configured directory are written. Output is streamed to a private partial file, limited to 64 MiB, then renamed on success; failed partial files are removed. Requests time out after ten minutes, support MCP cancellation, and never retry automatically because retries could duplicate charges. A failed download may still have spent credits.

Generation tools request approval under the global config. Approving a call spends credits. Music requires a paid plan with Music API access; verify your plan's [music licensing terms](https://elevenlabs.io/music-terms) before shipping a game. Higher MP3 bitrates may have additional plan restrictions.

## Examples

- “Generate a 1-second retro arcade coin pickup SFX named `coin-pickup`.”
- “Generate a 10-second seamless loop of quiet cave ambience named `cave`.”
- “Generate 60 seconds of instrumental, 110 BPM chiptune exploration music named `forest-theme`, with a steady arrangement suitable for looping.”

## Verification

```sh
npm test
```

Tests use mocked HTTP with real MCP clients and filesystem output. No real audio generation or credits are used.

## API references

- [Create sound effect](https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert)
- [Compose music](https://elevenlabs.io/docs/api-reference/music/compose)
- [Music capabilities and plan access](https://elevenlabs.io/docs/overview/capabilities/music)

To remove this integration, delete only the `mcp.servers.elevenlabs-audio` entry and its `elevenlabs-audio_generate_*` permission rule from the global config. The hosted `elevenlabs` connection is independent.
