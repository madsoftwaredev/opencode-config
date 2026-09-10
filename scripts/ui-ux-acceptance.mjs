import { readFile, realpath } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const hasText = (value) => typeof value === "string" && value.trim().length > 0;
const isRevision = (value) => Number.isSafeInteger(value) && value > 0;
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const hasEvidence = (value) => Array.isArray(value) && value.length > 0 && value.every(hasText);

/**
 * Check the documented Markdown handoff format without reading evidence paths or executing content.
 * Returns structural/completion errors, not a judgment of UX quality or authorization authenticity.
 * @param {string} markdown
 * @param {number} expectedRevision The artifact revision named by the parent mission.
 * @returns {string[]}
 */
export function validateAcceptance(markdown, expectedRevision) {
  if (typeof markdown !== "string" || !isRevision(expectedRevision)) {
    return ["Expected Markdown text and a positive integer artifact revision."];
  }

  const errors = [];
  const requirements = new Map();
  const ledgers = [];
  let fence;
  let current;

  // Only real headings outside fenced examples define requirements.
  for (const line of markdown.split(/\r?\n/)) {
    if (fence) {
      if (new RegExp(`^ {0,3}${fence.character}{${fence.length},}[ \\t]*$`).test(line)) {
        if (fence.acceptance) ledgers.push(fence.lines.join("\n"));
        fence = undefined;
      } else {
        if (fence.acceptance) fence.lines.push(line);
        if (current && !fence.acceptance) current.body.push(line);
      }
      continue;
    }

    const opening = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (opening) {
      fence = {
        character: opening[1][0],
        length: opening[1].length,
        acceptance: opening[2].trim() === "ux-acceptance",
        lines: [],
      };
      if (fence.acceptance && current) {
        errors.push("The acceptance fence must be outside requirement sections.");
      }
      continue;
    }

    if (/^ {0,3}#{1,3}\s/.test(line)) current = undefined;
    const heading = line.match(/^### (UX-\d{2,}) \| (required|suggestion) \| r([1-9]\d*)\s*$/);
    if (heading) {
      const [, id, kind, revision] = heading;
      if (requirements.has(id)) errors.push(`${id}: duplicate requirement heading.`);
      current = { kind, revision: Number(revision), body: [] };
      if (!isRevision(current.revision)) errors.push(`${id}: invalid requirement revision.`);
      requirements.set(id, current);
    } else if (/^ {0,3}#{1,6}\s+UX-/i.test(line)) {
      errors.push(`Malformed requirement heading: ${line}`);
    } else if (current) {
      current.body.push(line);
    }
  }

  if (fence) errors.push("Unclosed Markdown fence.");
  if (!requirements.size) errors.push("No requirement headings found.");
  for (const [id, requirement] of requirements) {
    if (!hasText(requirement.body.join("\n"))) errors.push(`${id}: specification is empty.`);
  }
  if (ledgers.length !== 1) return [...errors, "Expected exactly one ux-acceptance fence."];

  let ledger;
  try {
    ledger = JSON.parse(ledgers[0]);
  } catch {
    return [...errors, "The ux-acceptance fence must contain valid JSON."];
  }
  if (!isObject(ledger) || !isRevision(ledger.revision) || !Array.isArray(ledger.items)) {
    return [...errors, "Acceptance JSON requires a positive integer revision and an items array."];
  }
  if (ledger.revision !== expectedRevision) {
    errors.push(
      `Artifact revision ${ledger.revision} does not match expected ${expectedRevision}.`
    );
  }

  const seen = new Set();
  for (const item of ledger.items) {
    if (!isObject(item) || typeof item.id !== "string" || !/^UX-\d{2,}$/.test(item.id)) {
      errors.push("Every acceptance item needs a valid UX ID.");
      continue;
    }
    const { id } = item;
    if (seen.has(id)) errors.push(`${id}: duplicate acceptance item.`);
    seen.add(id);
    const source = requirements.get(id);
    if (!source) {
      errors.push(`${id}: acceptance item has no source requirement.`);
      continue;
    }
    if (!["accepted", "deferred", "rejected"].includes(item.decision)) {
      errors.push(`${id}: decision is unresolved or invalid.`);
      continue;
    }
    if (item.decision !== "accepted") {
      if (!hasText(item.reason)) errors.push(`${id}: ${item.decision} needs a reason.`);
      if (source.kind === "required" && !hasText(item.authorization)) {
        errors.push(`${id}: excluding a required item needs a user scope-change reference.`);
      }
      continue;
    }

    if (!hasText(item.worker)) errors.push(`${id}: missing native worker task ID.`);
    if (item.read !== source.revision) errors.push(`${id}: missing or stale worker read revision.`);
    if (!isObject(item.evidence) || item.evidence.revision !== source.revision) {
      errors.push(`${id}: missing or stale implementation evidence revision.`);
    }
    if (!isObject(item.evidence) || !hasEvidence(item.evidence.refs)) {
      errors.push(`${id}: implementation evidence references are required.`);
    }
    if (!isObject(item.review) || item.review.revision !== source.revision) {
      errors.push(`${id}: missing or stale UI/UX review revision.`);
    }
    if (!isObject(item.review) || item.review.status !== "pass") {
      errors.push(
        `${id}: UI/UX review must pass; pending, conditional, or revise is not complete.`
      );
    }
    if (!isObject(item.review) || !hasEvidence(item.review.evidence)) {
      errors.push(`${id}: UI/UX review evidence is required.`);
    }
  }

  for (const id of requirements.keys()) {
    if (!seen.has(id)) errors.push(`${id}: missing acceptance item.`);
  }
  return errors;
}

async function main(args) {
  const usage =
    "Usage: node scripts/ui-ux-acceptance.mjs <artifact.md> --revision <positive-integer>";
  if (args.length === 1 && args[0] === "--help") {
    console.log(usage);
    return 0;
  }
  const [file, flag, revision] = args;
  if (args.length !== 3 || flag !== "--revision" || !/^[1-9]\d*$/.test(revision)) {
    console.error(usage);
    return 2;
  }
  if (!isRevision(Number(revision))) {
    console.error("Revision must be a safe positive integer.");
    return 2;
  }

  let markdown;
  try {
    markdown = await readFile(file, "utf8");
  } catch (error) {
    console.error(`Cannot read artifact: ${error.message}`);
    return 2;
  }
  const errors = validateAcceptance(markdown, Number(revision));
  if (errors.length) {
    console.error(errors.map((error) => `- ${error}`).join("\n"));
    return 1;
  }
  console.log(`UI/UX acceptance: PASS (revision ${revision}; structural check only).`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(await realpath(process.argv[1])).href) {
  process.exitCode = await main(process.argv.slice(2));
}
