import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

function transform(source, { isHtml = false } = {}) {
  let text = source;
  const steps = [
    [/INSPECTION_STATS_LOGIC/g, "MAINTENANCE_STATS_LOGIC"],
    [/INSPECTION_DATA/g, "MAINTENANCE_DATA"],
    [/inspection\.generatedTasks/g, "maintenance.generatedTasks"],
    [/inspectionStatsKpis/g, "maintenanceStatsKpis"],
    [/data-inspection/g, "data-maintenance"],
    [/dataset\.inspection/g, "dataset.maintenance"],
    [/inspection\./g, "maintenance."],
    [/inspection-data\.js/g, "maintenance-data.js"],
    [/inspection-stats-logic\.js/g, "maintenance-stats-logic.js"],
    [/inspection-stats\.js/g, "maintenance-stats.js"],
    [/KCDS_INSP/g, "KCDS_MAIN"],
    [/漏检/g, "漏保养"],
    [/巡检/g, "保养"],
  ];
  for (const [pattern, replacement] of steps) text = text.replace(pattern, replacement);

  // HTML: 脚本 inspection.js → maintenance.js；章节文案修正；保留 inspection.css / class
  if (isHtml) {
    text = text.replace(/src="(\.\.\/)+app\/components\/inspection\.js([^"]*)"/g, 'src="$1app/components/maintenance.js$2"');
    text = text.replace(/data-page-section="电子巡更系统"/g, 'data-page-section="设备维保管理"');
    // 标准作业页标题本身无「巡检」，但 section 已在上一步处理；plans/tasks/stats 标题已由「巡检→保养」覆盖
    // 修正可能被误伤的路径：../maintenance/ 来自 menu href，HTML 内目录复制后自洽
  }
  return text;
}

const copies = [
  ["app/data/inspection-data.js", "app/data/maintenance-data.js", false],
  ["app/components/inspection.js", "app/components/maintenance.js", false],
  ["app/components/inspection-stats-logic.js", "app/components/maintenance-stats-logic.js", false],
  ["app/components/inspection-stats.js", "app/components/maintenance-stats.js", false],
  ["web/pages/inspection/standard-works.html", "web/pages/maintenance/standard-works.html", true],
  ["web/pages/inspection/plans.html", "web/pages/maintenance/plans.html", true],
  ["web/pages/inspection/tasks.html", "web/pages/maintenance/tasks.html", true],
  ["web/pages/inspection/stats.html", "web/pages/maintenance/stats.html", true],
];

await mkdir(path.join(root, "web/pages/maintenance"), { recursive: true });

for (const [fromRel, toRel, isHtml] of copies) {
  const raw = await readFile(path.join(root, fromRel), "utf8");
  let out = transform(raw, { isHtml });
  if (isHtml) {
    // 确保 menu key / page title 与规格一致（transform 后二次校正）
    out = out.replace(/data-menu-key="maintenance\.standard-works"/, 'data-menu-key="maintenance.standard-works"');
    if (toRel.endsWith("standard-works.html")) {
      out = out.replace(/data-page-title="[^"]*"/, 'data-page-title="标准作业"');
      out = out.replace(/<title>[^<]*<\/title>/, "<title>标准作业 - 科学岛管廊监控中心</title>");
    }
    if (toRel.endsWith("plans.html")) {
      out = out.replace(/data-page-title="[^"]*"/, 'data-page-title="保养计划"');
      out = out.replace(/<title>[^<]*<\/title>/, "<title>保养计划 - 科学岛管廊监控中心</title>");
    }
    if (toRel.endsWith("tasks.html")) {
      out = out.replace(/data-page-title="[^"]*"/, 'data-page-title="保养任务"');
      out = out.replace(/<title>[^<]*<\/title>/, "<title>保养任务 - 科学岛管廊监控中心</title>");
    }
    if (toRel.endsWith("stats.html")) {
      out = out.replace(/data-page-title="[^"]*"/, 'data-page-title="保养统计"');
      out = out.replace(/<title>[^<]*<\/title>/, "<title>保养统计 - 科学岛管廊监控中心</title>");
    }
  }
  await writeFile(path.join(root, toRel), out, "utf8");
  console.log("wrote", toRel);
}
