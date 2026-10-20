const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const n = Number(process.argv[2]);
if (!n) {
  console.error("usage: node scripts/sdd-extract-task.js <N>");
  process.exit(2);
}

const root = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
const dir = path.join(root, ".superpowers", "sdd", "2026-10-14-power-monitor-system");
const plan = path.join(root, "docs", "superpowers", "plans", "2026-10-14-power-monitor-system.md");
const lines = fs.readFileSync(plan, "utf8").split(/\r?\n/);

let intask = false;
let infence = false;
const out = [];
for (const line of lines) {
  if (line.startsWith("```")) infence = !infence;
  const m = !infence && line.match(/^#+[ \t]+Task[ \t]+([0-9]+)/);
  if (m) intask = Number(m[1]) === n;
  if (intask) out.push(line);
}

const brief = path.join(dir, `task-${n}-brief.md`);
fs.writeFileSync(brief, out.join("\n") + "\n", "utf8");
console.log(brief);
console.log("lines", out.length);
