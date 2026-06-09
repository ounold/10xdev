import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const repoHookStatePath = path.join(repoRoot, ".tmp", "posttooluse-last-run.json");

function runPowerShell(command) {
  return spawnSync(
    "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
    {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
}

function isBlockedProcessSpawn(result) {
  return result?.error?.code === "EPERM" || result?.error?.code === "EINVAL";
}

function warnSkippedGate(label, result) {
  const reason = result?.error?.message ?? "Process spawning is blocked in this runtime.";
  console.warn(`PostToolUse skipped ${label}: ${reason}`);
}

function fail(message, details = "") {
  console.error(message);
  if (details.trim().length > 0) {
    console.error(details.trim());
  }
  process.exit(2);
}

function parseApplyPatchPaths(commandText) {
  const changedPaths = new Set();
  const fileDirectivePattern = /^\*\*\* (?:Update|Add|Delete) File: (.+)$/gm;

  for (const match of commandText.matchAll(fileDirectivePattern)) {
    const candidate = match[1]?.trim();
    if (!candidate) {
      continue;
    }

    const normalized = candidate.replace(/^\.?[\\/]/, "").split(path.sep).join("/").replace(/\\/g, "/");
    changedPaths.add(normalized);
  }

  return [...changedPaths];
}

function resolveRelevantPaths(payload) {
  if (payload?.tool_name !== "apply_patch") {
    return [];
  }

  const commandText = payload?.tool_input?.command;
  if (typeof commandText !== "string" || commandText.length === 0) {
    return [];
  }

  return parseApplyPatchPaths(commandText)
    .map((candidate) => path.relative(repoRoot, path.resolve(repoRoot, candidate)).split(path.sep).join("/"))
    .filter((candidate) => !candidate.startsWith(".."));
}

const rawInput = await new Promise((resolve) => {
  let buffer = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    buffer += chunk;
  });
  process.stdin.on("end", () => resolve(buffer));
});

if (rawInput.trim().length === 0) {
  process.exit(0);
}

let payload;
try {
  payload = JSON.parse(rawInput);
} catch {
  process.exit(0);
}

const relevantPaths = resolveRelevantPaths(payload);
if (relevantPaths.length === 0) {
  process.exit(0);
}

fs.mkdirSync(path.dirname(repoHookStatePath), { recursive: true });
fs.writeFileSync(
  repoHookStatePath,
  JSON.stringify(
    {
      hookEventName: payload.hook_event_name ?? null,
      relevantPaths,
      timestamp: new Date().toISOString(),
      toolName: payload.tool_name ?? null,
    },
    null,
    2,
  ),
);

const lintTargets = [...new Set(relevantPaths.filter((filePath) => {
  return /^(src|tests)\/.*\.(ts|tsx|astro)$/.test(filePath) ||
    /^(astro\.config\.mjs|eslint\.config\.js|playwright\.config\.ts|vitest\.config\.ts)$/.test(filePath);
}))];

for (const target of lintTargets) {
  const lintResult = runPowerShell(`& 'C:\\Program Files\\nodejs\\npm.cmd' exec -- eslint "${target}"`);
  if (isBlockedProcessSpawn(lintResult)) {
    warnSkippedGate(`lint for ${target}`, lintResult);
    continue;
  }

  if (lintResult.status !== 0) {
    fail(`PostToolUse lint failed for ${target}`, `${lintResult.stdout}\n${lintResult.stderr}`);
  }
}

const integrationRelevant = relevantPaths.some((filePath) =>
  filePath === "src/lib/supervision.ts" ||
  filePath === "src/lib/database.ts" ||
  filePath === "vitest.config.ts" ||
  filePath.startsWith("tests/integration/"),
);

if (integrationRelevant) {
  const integrationResult = runPowerShell("& 'C:\\Program Files\\nodejs\\npm.cmd' run test:integration");
  if (isBlockedProcessSpawn(integrationResult)) {
    warnSkippedGate("integration gate", integrationResult);
    process.exit(0);
  }

  if (integrationResult.status !== 0) {
    fail("PostToolUse integration gate failed.", `${integrationResult.stdout}\n${integrationResult.stderr}`);
  }
}
