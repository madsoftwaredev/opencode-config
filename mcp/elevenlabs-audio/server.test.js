import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "./server.mjs";

const AUDIO = new Uint8Array([0x49, 0x44, 0x33, 0, 1, 2, 3]);
const TEST_KEY = "test-key-not-a-real-secret";

function audioResponse() {
  return new Response(AUDIO, { headers: { "content-type": "audio/mpeg" } });
}

async function withServer(options, run) {
  const outputDir = await mkdtemp(join(tmpdir(), "elevenlabs-audio-"));
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, ...init, body: JSON.parse(init.body) });
    return options.respond ? options.respond(url, init) : audioResponse();
  };
  let server;
  const client = new Client({ name: "audio-test", version: "1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  try {
    server = createServer({ apiKey: TEST_KEY, outputDir, fetchImpl, ...options });
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    await run({ client, calls, outputDir });
  } finally {
    await client.close();
    await server?.close();
    await rm(outputDir, { recursive: true, force: true });
  }
}

test("lists tools and checks key availability without calling ElevenLabs", async () => {
  await withServer({}, async ({ client, calls, outputDir }) => {
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((tool) => tool.name).sort(), [
      "generate_music",
      "generate_sfx",
      "get_status",
    ]);
    assert.equal(
      tools.find((tool) => tool.name === "generate_sfx").annotations.idempotentHint,
      false
    );
    const status = await client.callTool({ name: "get_status" });
    assert.deepEqual(status.structuredContent, {
      api_key_available: true,
      output_directory: outputDir,
    });
    assert.ok(!JSON.stringify(status).includes(TEST_KEY));
    assert.equal(calls.length, 0);
  });
});

test("SFX uses the documented API fields and saves private MP3 bytes", async () => {
  await withServer({}, async ({ client, calls, outputDir }) => {
    const output = await client.callTool({
      name: "generate_sfx",
      arguments: { prompt: "Cave ambience", name: "cave", duration_seconds: 10, loop: true },
    });
    assert.notEqual(output.isError, true);
    assert.equal(calls.length, 1);
    assert.equal(
      calls[0].url,
      "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128"
    );
    assert.equal(calls[0].method, "POST");
    assert.equal(calls[0].redirect, "error");
    assert.equal(calls[0].headers["xi-api-key"], TEST_KEY);
    assert.deepEqual(calls[0].body, {
      text: "Cave ambience",
      duration_seconds: 10,
      loop: true,
      prompt_influence: 0.3,
      model_id: "eleven_text_to_sound_v2",
    });
    assert.ok(output.structuredContent.path.startsWith(join(outputDir, "cave-")));
    assert.equal(output.structuredContent.bytes, AUDIO.length);
    assert.deepEqual(new Uint8Array(await readFile(output.structuredContent.path)), AUDIO);
    assert.equal((await stat(output.structuredContent.path)).mode & 0o777, 0o600);
    assert.equal((await readdir(outputDir)).length, 1);
    assert.ok(!JSON.stringify(output).includes(TEST_KEY));
  });
});

test("music converts seconds to milliseconds and defaults to instrumental v2.5", async () => {
  await withServer({}, async ({ client, calls }) => {
    const output = await client.callTool({
      name: "generate_music",
      arguments: { prompt: "Chiptune exploration theme", duration_seconds: 12.345 },
    });
    assert.notEqual(output.isError, true);
    assert.equal(calls[0].url, "https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128");
    assert.deepEqual(calls[0].body, {
      prompt: "Chiptune exploration theme",
      music_length_ms: 12345,
      force_instrumental: true,
      model_id: "music_v2_5",
    });
    assert.ok(output.structuredContent.note.includes("no native seamless-loop option"));
    assert.equal(output.structuredContent.requested_duration_seconds, 12.345);
    assert.ok(!Object.hasOwn(output.structuredContent, "loop"));
  });
});

test("allows music model, vocal, bitrate overrides and applies duration defaults", async () => {
  await withServer({}, async ({ client, calls }) => {
    await client.callTool({
      name: "generate_music",
      arguments: {
        prompt: "Victory song",
        model_id: "music_v1",
        force_instrumental: false,
        output_format: "mp3_44100_192",
      },
    });
    assert.equal(calls[0].body.music_length_ms, 60000);
    assert.equal(calls[0].body.force_instrumental, false);
    assert.equal(calls[0].body.model_id, "music_v1");
    assert.ok(calls[0].url.endsWith("output_format=mp3_44100_192"));
    await client.callTool({ name: "generate_sfx", arguments: { prompt: "Coin pickup" } });
    assert.equal(calls[1].body.duration_seconds, 3);
    assert.equal(calls[1].body.loop, false);
  });
});

test("rejects invalid prompts, ranges, formats, models and path traversal before HTTP", async () => {
  await withServer({}, async ({ client, calls, outputDir }) => {
    const invalidInputs = [
      ["generate_sfx", { prompt: " " }],
      ["generate_sfx", { duration_seconds: 0.49 }],
      ["generate_sfx", { duration_seconds: 31 }],
      ["generate_sfx", { prompt_influence: 2 }],
      ["generate_sfx", { name: "../escape" }],
      ["generate_sfx", { output_format: "wav" }],
      ["generate_music", { duration_seconds: 2 }],
      ["generate_music", { duration_seconds: 301 }],
      ["generate_music", { model_id: "unknown" }],
    ];
    for (const [name, input] of invalidInputs) {
      const output = await client.callTool({ name, arguments: { prompt: "Audio", ...input } });
      assert.equal(output.isError, true);
    }
    assert.equal(calls.length, 0);
    assert.deepEqual(await readdir(outputDir), []);
  });
});

test("missing credentials give an actionable error without network calls", async () => {
  await withServer({ apiKey: "" }, async ({ client, calls, outputDir }) => {
    const status = await client.callTool({ name: "get_status" });
    assert.equal(status.structuredContent.api_key_available, false);
    const output = await client.callTool({ name: "generate_sfx", arguments: { prompt: "Zap" } });
    assert.equal(output.isError, true);
    assert.ok(output.content[0].text.includes("ELEVENLABS_API_KEY is missing"));
    assert.equal(calls.length, 0);
    assert.deepEqual(await readdir(outputDir), []);
  });
});

for (const status of [401, 403, 429, 500]) {
  test(`HTTP ${status} errors are redacted, cleaned up and never retried`, async () => {
    await withServer(
      { respond: () => new Response(JSON.stringify({ detail: TEST_KEY }), { status }) },
      async ({ client, calls, outputDir }) => {
        const output = await client.callTool({
          name: "generate_music",
          arguments: { prompt: "Battle" },
        });
        assert.equal(output.isError, true);
        assert.ok(output.content[0].text.includes(`HTTP ${status}`));
        assert.ok(!output.content[0].text.includes(TEST_KEY));
        assert.equal(calls.length, 1);
        assert.deepEqual(await readdir(outputDir), []);
      }
    );
  });
}

for (const [label, respond] of [
  ["non-audio", () => new Response("{}", { headers: { "content-type": "application/json" } })],
  ["empty", () => new Response(null, { headers: { "content-type": "audio/mpeg" } })],
  [
    "zero bytes",
    () => new Response(new Uint8Array(), { headers: { "content-type": "audio/mpeg" } }),
  ],
  [
    "network failure",
    () => {
      throw new Error(`Connection failed: ${TEST_KEY}`);
    },
  ],
  [
    "oversized",
    () =>
      new Response(new Uint8Array(64 * 1024 * 1024 + 1), {
        headers: { "content-type": "audio/mpeg" },
      }),
  ],
  [
    "broken stream",
    () => ({
      ok: true,
      headers: new Headers({ "content-type": "audio/mpeg" }),
      body: new ReadableStream({
        pull(controller) {
          controller.error(new Error("Download interrupted"));
        },
      }),
    }),
  ],
]) {
  test(`rejects ${label} output and removes partial files`, async () => {
    await withServer({ respond }, async ({ client, calls, outputDir }) => {
      const output = await client.callTool({
        name: "generate_sfx",
        arguments: { prompt: "Thunder" },
      });
      assert.equal(output.isError, true);
      assert.ok(!output.content[0].text.includes(TEST_KEY));
      assert.equal(calls.length, 1);
      assert.deepEqual(await readdir(outputDir), []);
    });
  });
}

test("same labels generate distinct files without overwriting previous audio", async () => {
  await withServer({}, async ({ client, outputDir }) => {
    const generate = () =>
      client.callTool({ name: "generate_sfx", arguments: { prompt: "Zap", name: "zap" } });
    const [first, second] = await Promise.all([generate(), generate()]);
    assert.notEqual(first.structuredContent.path, second.structuredContent.path);
    assert.equal((await readdir(outputDir)).length, 2);
  });
});

test("actual Node stdio server starts without credentials and exposes tools", async () => {
  const client = new Client({ name: "stdio-test", version: "1" });
  const transport = new StdioClientTransport({
    command: "node",
    args: [fileURLToPath(new URL("./server.mjs", import.meta.url))],
    env: { PATH: process.env.PATH, ELEVENLABS_API_KEY: "" },
    stderr: "pipe",
  });
  try {
    await client.connect(transport);
    const { tools } = await client.listTools();
    assert.equal(tools.length, 3);
    const status = await client.callTool({ name: "get_status" });
    assert.equal(status.structuredContent.api_key_available, false);
  } finally {
    await client.close();
  }
});
