// VS Code terminals on Windows may report a lowercase drive letter, which makes Node load Vitest
// twice and every suite fail. Start it from a normalised path instead.
import { spawnSync } from "node:child_process";
import path from "node:path";

const cwd = process.cwd().replace(/^[a-z]:/, (d) => d.toUpperCase());
const result = spawnSync(
  process.execPath,
  [path.join(cwd, "node_modules", "vitest", "vitest.mjs"), ...process.argv.slice(2)],
  { cwd, stdio: "inherit" },
);
process.exit(result.status ?? 1);
