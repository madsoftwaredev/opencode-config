import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, rename, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { pathToFileURL } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_BASE = "https://api.elevenlabs.io/v1";
const REQUEST_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_AUDIO_BYTES = 64 * 1024 * 1024;

const sharedInput = {
  prompt: z.string().trim().min(1).max(10000).describe("Describe the desired audio."),
  name: z
    .string()
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/)
    .default("audio")
    .describe("Filename label without an extension or path. A unique ID is appended."),
  output_format: z
    .enum(["mp3_44100_128", "mp3_44100_192"])
    .default("mp3_44100_128")
    .describe("MP3 output; higher bitrates may require a higher subscription tier."),
};

function result(data) {
  return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: data };
}

function errorMessage(error, apiKey) {
  const message = error instanceof Error ? error.message : "Unknown audio generation error";
  return apiKey ? message.split(apiKey).join("[REDACTED]") : message;
}

/**
 * Create a stdio-compatible MCP server. Generation spends credits, never retries,
 * and returns paths to MP3 files rather than embedding audio in model context.
 * @param {{ apiKey?: string, outputDir?: string, fetchImpl?: typeof fetch }} [options]
 * @returns {McpServer}
 */
export function createServer({
  apiKey = process.env.ELEVENLABS_API_KEY ?? "",
  outputDir = process.env.ELEVENLABS_AUDIO_OUTPUT_DIR || join(homedir(), "Music", "ElevenLabs"),
  fetchImpl = fetch,
} = {}) {
  const directory = resolve(outputDir);
  const server = new McpServer({ name: "elevenlabs-audio", version: "1.0.0" });

  async function generate(endpoint, body, input, cancellationSignal) {
    if (!apiKey.trim()) {
      throw new Error("ELEVENLABS_API_KEY is missing from the MCP process environment.");
    }

    // Check the destination before spending credits; callers cannot choose arbitrary paths.
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const filename = `${input.name}-${randomUUID()}.mp3`;
    const path = join(directory, filename);
    const partialPath = `${path}.partial`;
    const file = createWriteStream(partialPath, { flags: "wx", mode: 0o600 });
    await new Promise((accept, reject) => {
      file.once("open", accept);
      file.once("error", reject);
    });

    const signals = [AbortSignal.timeout(REQUEST_TIMEOUT_MS)];
    if (cancellationSignal) signals.push(cancellationSignal);
    const signal = AbortSignal.any(signals);

    try {
      const response = await fetchImpl(
        `${API_BASE}/${endpoint}?output_format=${input.output_format}`,
        {
          method: "POST",
          redirect: "error",
          headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal,
        }
      );

      if (!response.ok) {
        const detail = (await response.text()).slice(0, 2000);
        throw new Error(
          `ElevenLabs HTTP ${response.status}: ${detail}. Not retried to avoid duplicate charges.`
        );
      }

      const contentType = response.headers.get("content-type")?.split(";")[0].trim();
      if (
        !response.body ||
        !["audio/mpeg", "audio/mp3", "application/octet-stream"].includes(contentType)
      ) {
        await response.body?.cancel();
        throw new Error(`Expected MP3 audio, received ${contentType || "no content type"}.`);
      }

      let byteLength = 0;
      const limit = new Transform({
        transform(chunk, encoding, callback) {
          byteLength += chunk.length;
          callback(
            byteLength > MAX_AUDIO_BYTES ? new Error("Audio exceeded the 64 MiB limit.") : null,
            chunk
          );
        },
      });
      await pipeline(Readable.fromWeb(response.body), limit, file, { signal });
      if (byteLength === 0) throw new Error("ElevenLabs returned empty audio.");
      await rename(partialPath, path);

      return {
        path,
        mime_type: "audio/mpeg",
        bytes: byteLength,
        output_format: input.output_format,
        model_id: body.model_id,
        requested_duration_seconds: input.duration_seconds,
        ...(endpoint === "sound-generation"
          ? { loop: body.loop }
          : {
              force_instrumental: body.force_instrumental,
              note: "Music has no native seamless-loop option. Trim or crossfade if needed.",
            }),
      };
    } catch (error) {
      file.destroy();
      if (!file.closed) await new Promise((accept) => file.once("close", accept));
      await rm(partialPath, { force: true });
      throw error;
    }
  }

  function registerGeneration(name, description, inputSchema, endpoint, toBody) {
    server.registerTool(
      name,
      {
        description,
        inputSchema,
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
      async (input, extra) => {
        try {
          return result(await generate(endpoint, toBody(input), input, extra.signal));
        } catch (error) {
          return {
            isError: true,
            content: [{ type: "text", text: errorMessage(error, apiKey) }],
          };
        }
      }
    );
  }

  server.registerTool(
    "get_status",
    {
      description:
        "Check API-key availability and the output directory without calling the API or spending credits.",
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => result({ api_key_available: Boolean(apiKey.trim()), output_directory: directory })
  );

  registerGeneration(
    "generate_sfx",
    "Generate a game sound effect or ambience as a local MP3. Spends ElevenLabs credits. Supports native seamless loops; never retries automatically.",
    {
      ...sharedInput,
      duration_seconds: z.number().min(0.5).max(30).default(3),
      loop: z.boolean().default(false).describe("Generate a seamless looping sound effect."),
      prompt_influence: z.number().min(0).max(1).default(0.3),
    },
    "sound-generation",
    (input) => ({
      text: input.prompt,
      duration_seconds: input.duration_seconds,
      loop: input.loop,
      prompt_influence: input.prompt_influence,
      model_id: "eleven_text_to_sound_v2",
    })
  );

  registerGeneration(
    "generate_music",
    "Compose game music as a local MP3, instrumental by default. Spends ElevenLabs credits and requires Music API access (paid plan). No guaranteed seamless loops; never retries automatically.",
    {
      ...sharedInput,
      duration_seconds: z.number().min(3).max(300).multipleOf(0.001).default(60),
      force_instrumental: z.boolean().default(true),
      model_id: z.enum(["music_v1", "music_v2", "music_v2_5"]).default("music_v2_5"),
    },
    "music",
    (input) => ({
      prompt: input.prompt,
      music_length_ms: Math.round(input.duration_seconds * 1000),
      force_instrumental: input.force_instrumental,
      model_id: input.model_id,
    })
  );

  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    await createServer().connect(new StdioServerTransport());
  } catch (error) {
    console.error(errorMessage(error, process.env.ELEVENLABS_API_KEY));
    process.exitCode = 1;
  }
}
