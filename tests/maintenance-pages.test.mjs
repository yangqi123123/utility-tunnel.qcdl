import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const pages = [
  ["standard-works", "maintenance.standard-works", "标准作业", "standardWorksBody", true],
  ["plans", "maintenance.plans", "保养计划", "plansBody", true],
  ["tasks", "maintenance.tasks", "保养任务", "tasksBody", true],
  ["stats", "maintenance.stats", "保养监控统计", "statsDetailBody", false],
];

test("menu places device maintenance after electronic patrol and before work-order", async () => {
  const source = await read("app/config/menu.js");
  const inspectionIndex = source.indexOf('key: "inspection"');
  const maintenanceIndex = source.indexOf('key: "maintenance"');
  const workOrderIndex = source.indexOf('key: "work-order"');
  assert.ok(inspectionIndex >= 0);
  assert.ok(maintenanceIndex >= 0);
  assert.ok(workOrderIndex >= 0);
  assert.ok(inspectionIndex < maintenanceIndex);
  assert.ok(maintenanceIndex < workOrderIndex);
  assert.match(source, /label:\s*"设备维保管理"/);
  assert.match(source, /maintenance\.standard-works/);
  assert.match(source, /maintenance\.plans/);
  assert.match(source, /maintenance\.tasks/);
  assert.match(source, /maintenance\.stats/);
  assert.match(source, /fa-solid fa-wrench/);
});

test("sidebar provides a maintenance navigation icon", async () => {
  const source = await read("app/components/sidebar.js");
  assert.match(source, /maintenance:\s*['"][\s\S]*?<path/);
});

test("task detail includes video tab before records", async () => {
  const source = await read("app/components/maintenance.js");
  assert.match(source, /data-task-tab="video"[^>]*>视频监控/);
  assert.match(source, /data-task-panel="video"/);
  assert.match(source, /dispatch-video-home-grid/);
  assert.match(source, /data-task-video-fullscreen/);
  const videoIdx = source.indexOf('data-task-tab="video"');
  const recordsIdx = source.indexOf('data-task-tab="records"');
  assert.ok(videoIdx > 0 && recordsIdx > videoIdx);
});

test("maintenance data exposes isolated fixture collections", async () => {
  const source = await read("app/data/maintenance-data.js");
  assert.match(source, /window\.MAINTENANCE_DATA/);
  assert.doesNotMatch(source, /window\.INSPECTION_DATA/);
  for (const name of ["standardWorks", "inspectionItems", "plans", "tasks", "devices"]) {
    assert.match(source, new RegExp(`\\b${name}\\b`));
  }
  assert.match(source, /保养/);
  assert.doesNotMatch(source, /巡检/);
  assert.doesNotMatch(source, /漏检/);
});

for (const [page, key, title, bodyId, needsMaintenanceJs] of pages) {
  test(`${page} page uses the maintenance shell`, async () => {
    const source = await read(`web/pages/maintenance/${page}.html`);
    assert.match(source, /class="app-shell"/);
    assert.match(source, new RegExp(`data-menu-key="${key.replace(".", "\\.")}"`));
    assert.match(source, /data-page-section="设备维保管理"/);
    assert.match(source, new RegExp(`data-page-title="${title}"`));
    assert.match(source, new RegExp(`<title>${title}`));
    assert.match(source, /inspection\.css/);
    assert.match(source, /maintenance-data\.js/);
    assert.match(source, new RegExp(`id="${bodyId}"`));
    assert.doesNotMatch(source, /巡检/);
    assert.doesNotMatch(source, /漏检/);
    if (needsMaintenanceJs) {
      assert.match(source, /maintenance\.js/);
      assert.doesNotMatch(source, /src="[^"]*inspection\.js"/);
    } else {
      assert.match(source, /maintenance-stats\.js/);
      assert.match(source, /maintenance\.js/);
      assert.match(source, /maintenanceStatsKpis/);
      assert.match(source, /analysis-chart-grid/);
      assert.match(source, /statsOverdue/);
      assert.match(source, /任务执行趋势/);
      assert.match(source, /计划执行统计/);
      assert.match(source, /事件状况分析/);
      assert.match(source, /data-stats-action="export"/);
      assert.doesNotMatch(source, /src="[^"]*inspection\.js"/);
      assert.doesNotMatch(source, /执行判定/);
    }
  });
}

test("maintenance.js gates on maintenance menu keys and MAINTENANCE_DATA", async () => {
  const source = await read("app/components/maintenance.js");
  assert.match(source, /window\.MAINTENANCE_DATA/);
  assert.match(source, /startsWith\("maintenance\."\)/);
  assert.match(source, /maintenance\.generatedTasks/);
  assert.match(source, /待保养/);
  assert.match(source, /保养中/);
  assert.doesNotMatch(source, /待巡检/);
  assert.doesNotMatch(source, /巡检中/);
  assert.doesNotMatch(source, /window\.INSPECTION_DATA/);
});
