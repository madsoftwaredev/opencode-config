import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateAcceptance } from "./ui-ux-acceptance.mjs";

const source = "### UX-01 | required | r1\nPreserve the form values after a failed submission.\n";

function accepted(id = "UX-01", revision = 1) {
  return {
    id,
    decision: "accepted",
    worker: "ses_fixture_owner",
    read: revision,
    evidence: { revision, refs: ["src/form.ts: retained values; failed-submit check passed"] },
    review: {
      revision,
      status: "pass",
      evidence: ["Reviewed mobile error-state screenshot and retry observation; values retained"],
    },
  };
}

function artifact(items = [accepted()], revision = 1, requirements = source) {
  return `# UI plan\n\n## Requirements\n${requirements}\n## Acceptance\n\n\`\`\`ux-acceptance\n${JSON.stringify({ revision, items }, null, 2)}\n\`\`\`\n`;
}

test("accepts a complete evidence-backed record and optional deferred suggestion", () => {
  const markdown = artifact(
    [accepted(), { id: "UX-02", decision: "deferred", reason: "Optional motion is out of scope" }],
    1,
    source + "\n### UX-02 | suggestion | r1\nAnimate success.\n"
  );
  expect(validateAcceptance(markdown, 1)).toEqual([]);
});

test("requires explicit scope-change references before excluding required items", () => {
  for (const decision of ["deferred", "rejected"]) {
    const item = { id: "UX-01", decision, reason: "Removed from this delivery" };
    expect(validateAcceptance(artifact([item]), 1).join("\n")).toContain("scope-change reference");
    item.authorization = "User message 12 explicitly removed input retention from scope";
    expect(validateAcceptance(artifact([item]), 1)).toEqual([]);
    item.reason = " ";
    expect(validateAcceptance(artifact([item]), 1).join("\n")).toContain("needs a reason");
  }
});

test.each([
  ["pending decisions", (item) => (item.decision = "pending"), /decision is unresolved/],
  ["unknown decisions", (item) => (item.decision = "done"), /decision is unresolved/],
  ["missing worker", (item) => delete item.worker, /native worker task ID/],
  ["blank worker", (item) => (item.worker = " "), /native worker task ID/],
  ["missing receipt", (item) => delete item.read, /worker read revision/],
  ["stale receipt", (item) => (item.read = 2), /worker read revision/],
  ["missing evidence", (item) => delete item.evidence, /implementation evidence/],
  ["stale evidence", (item) => (item.evidence.revision = 2), /evidence revision/],
  ["empty evidence", (item) => (item.evidence.refs = []), /evidence references/],
  ["blank evidence", (item) => (item.evidence.refs = [" "]), /evidence references/],
  ["non-text evidence", (item) => (item.evidence.refs = [{}]), /evidence references/],
  ["missing review", (item) => delete item.review, /UI\/UX review/],
  ["stale review", (item) => (item.review.revision = 2), /review revision/],
  ["failed review", (item) => (item.review.status = "revise"), /review must pass/],
  ["pending review", (item) => (item.review.status = "pending"), /review must pass/],
  ["conditional pass", (item) => (item.review.status = "conditional-pass"), /review must pass/],
  ["unsubstantiated review", (item) => (item.review.evidence = []), /review evidence/],
])("rejects %s", (_name, mutate, message) => {
  const item = accepted();
  mutate(item);
  expect(validateAcceptance(artifact([item]), 1).join("\n")).toMatch(message);
});

test("checks artifact revision without invalidating unaffected item evidence", () => {
  const requirements = source + "\n### UX-02 | required | r2\nKeep the mobile action visible.\n";
  const markdown = artifact([accepted(), accepted("UX-02", 2)], 3, requirements);
  expect(validateAcceptance(markdown, 3)).toEqual([]);
  expect(validateAcceptance(markdown, 2).join("\n")).toContain("does not match expected");
  const stale = artifact([accepted(), accepted("UX-02", 1)], 3, requirements);
  expect(validateAcceptance(stale, 3).filter((error) => error.includes("UX-02"))).toHaveLength(3);
});

test("checks both directions of ID coverage and duplicate IDs", () => {
  expect(validateAcceptance(artifact([]), 1).join("\n")).toContain("missing acceptance item");
  expect(validateAcceptance(artifact([accepted(), accepted("UX-02")]), 1).join("\n")).toContain(
    "no source requirement"
  );
  expect(validateAcceptance(artifact([accepted(), accepted()]), 1).join("\n")).toContain(
    "duplicate acceptance item"
  );
  expect(validateAcceptance(artifact([accepted()], 1, source + source), 1).join("\n")).toContain(
    "duplicate requirement heading"
  );
});

test.each([
  ["missing ledger", source, /exactly one/],
  ["invalid JSON", source + "\n```ux-acceptance\n{broken}\n```", /valid JSON/],
  ["non-object ledger", source + "\n```ux-acceptance\nnull\n```", /requires/],
  ["missing items", source + '\n```ux-acceptance\n{"revision":1}\n```', /items array/],
  ["empty specification", artifact([accepted()], 1, "### UX-01 | required | r1\n"), /empty/],
  ["no source declarations", artifact([accepted()], 1, ""), /No requirement/],
  ["invalid heading", artifact().replace("required | r1", "required | r0"), /Malformed/],
  ["duplicate ledgers", artifact() + "\n```ux-acceptance\n{}\n```", /exactly one/],
  ["unclosed fence", artifact().replace(/```\n$/, ""), /Unclosed/],
  ["null entry", artifact([null]), /valid UX ID/],
  ["invalid ID", artifact([{ id: "wrong" }]), /valid UX ID/],
  ["invalid revision", artifact([accepted()], 0), /positive integer/],
])("rejects %s", (_name, markdown, message) => {
  expect(validateAcceptance(markdown, 1).join("\n")).toMatch(message);
});

test("ignores example declarations and ledgers inside fences; accepts CRLF and longer fences", () => {
  const example = `~~~~markdown\n### UX-99 | required | r1\nExample only.\n${artifact()}\n~~~~\n`;
  expect(validateAcceptance(example + artifact(), 1)).toEqual([]);
  const crlf = artifact()
    .replace("```ux-acceptance", "````ux-acceptance")
    .replace(/```\n$/, "`````\n");
  expect(validateAcceptance(crlf.replaceAll("\n", "\r\n"), 1)).toEqual([]);
});

test("reports invalid validator arguments rather than throwing", () => {
  for (const revision of [0, -1, 1.5, "1", Number.MAX_SAFE_INTEGER + 1]) {
    expect(validateAcceptance(artifact(), revision)).not.toHaveLength(0);
  }
  expect(validateAcceptance(null, 1)).not.toHaveLength(0);
});

test("does not treat acceptance metadata as source specification text", () => {
  const markdown = artifact([accepted()], 1, "### UX-01 | required | r1\n").replace(
    "## Acceptance\n",
    ""
  );
  const errors = validateAcceptance(markdown, 1).join("\n");
  expect(errors).toContain("outside requirement sections");
  expect(errors).toContain("specification is empty");
});

test("CLI has distinct completion, validation, and invocation/read statuses and never writes the artifact", () => {
  const directory = mkdtempSync(join(tmpdir(), "ui-ux-acceptance-"));
  const file = join(directory, "UI plan.md");
  const script = fileURLToPath(new URL("./ui-ux-acceptance.mjs", import.meta.url));
  const run = (...args) =>
    spawnSync("node", [script, ...args], { encoding: "utf8", timeout: 10000 });
  try {
    writeFileSync(file, artifact());
    const passed = run(file, "--revision", "1");
    expect(passed.status).toBe(0);
    expect(passed.stdout).toContain("structural check only");
    expect(readFileSync(file, "utf8")).toBe(artifact());

    const invalid = artifact([{ id: "UX-01", decision: "pending" }]);
    writeFileSync(file, invalid);
    expect(run(file, "--revision", "1").status).toBe(1);
    expect(readFileSync(file, "utf8")).toBe(invalid);
    expect(run(join(directory, "missing.md"), "--revision", "1").status).toBe(2);
    expect(run(file).status).toBe(2);
    expect(run(file, "--revision", "1e2").status).toBe(2);
    expect(run(file, "--revision", "9007199254740992").status).toBe(2);
    expect(run("--help").status).toBe(0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
