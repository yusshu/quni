import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const supportedPlatforms = new Set(["ios", "android"]);
const platform = process.argv[2];
const skipBuild = process.argv.includes("--skip-build");

if (!supportedPlatforms.has(platform)) {
  console.error("Usage: node scripts/package-native.mjs <ios|android> [--skip-build]");
  process.exit(1);
}

const nextCli = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const capacitorCli = fileURLToPath(new URL("../node_modules/@capacitor/cli/bin/capacitor", import.meta.url));

function run(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], { stdio: "inherit" });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!skipBuild) run(nextCli, ["build"]);
run(capacitorCli, ["sync", platform]);
