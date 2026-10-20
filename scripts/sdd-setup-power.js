const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
const base = path.join(root, ".superpowers", "sdd");
const dir = path.join(base, "2026-10-14-power-monitor-system");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(base, ".gitignore"), "*\n");

const plan = path.join(root, "docs", "superpowers", "plans", "2026-10-14-power-monitor-system.md");
const text = fs.readFileSync(plan, "utf8");
const lines = text.split(/\r?\n/);

function extractTask(n) {
  let intask = false;
  let infence = false;
  const out = [];
  for (const line of lines) {
    if (line.startsWith("```")) infence = !infence;
    const m = !infence && line.match(/^#+[ \t]+Task[ \t]+([0-9]+)/);
    if (m) intask = Number(m[1]) === n;
    if (intask) out.push(line);
  }
  return out;
}

const brief = path.join(dir, "task-1-brief.md");
const out = extractTask(1);
fs.writeFileSync(brief, out.join("\n") + "\n", "utf8");

const head = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
const ledger = path.join(dir, "progress.md");
fs.writeFileSync(
  ledger,
  [
    "# SDD ledger — plan: docs/superpowers/plans/2026-10-14-power-monitor-system.md",
    "",
    "## Preflight scan",
    "| Pair / Task | Shared interface | Check |",
    "|-------------|------------------|-------|",
    "| T1→T3/T4/T5 | POWER_MONITOR_DATA fields | T1 produces monitorDevices/statusDevices/chartSeries/alarms; later tasks consume — aligned |",
    "| T2→T3/T4/T5 | menu keys power-monitor.* | T2 inserts keys matching page data-menu-key in T3-5 — aligned |",
    "| T4 charts | chartSeries envIndex/upsVoltage/upsCurrent/alarmTrend | T1 defines same keys T4 renderCharts reads — aligned |",
    "| T1 self | test asserts vs data file content | test wants POWER_MONITOR_DATA + chartSeries + alarm types — plan code provides — aligned |",
    "| Old power-monitoring | File Structure forbids modify | T1-6 do not touch — aligned |",
    "",
    "Ruling: Preflight clean — no conflicts found.",
    "",
    `BASE before Task 1: ${head}`,
    "",
  ].join("\n"),
  "utf8"
);

console.log(dir);
console.log("brief lines", out.length);
console.log("brief", brief);
console.log("ledger", ledger);
