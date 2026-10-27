import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const pages = [
  ["standard-works", "inspection.standard-works", "标准作业", "standardWorksBody", true],
  ["plans", "inspection.plans", "巡检计划", "plansBody", true],
  ["tasks", "inspection.tasks", "巡检任务", "tasksBody", true],
  ["stats", "inspection.stats", "巡检监控统计", "statsDetailBody", false],
];

test("menu exposes device inspection before emergency management", async () => {
  const source = await read("app/config/menu.js");
  const inspectionIndex = source.indexOf('key: "inspection"');
  const emergencyIndex = source.indexOf('key: "emergency"');
  const tasksIndex = source.indexOf('key: "inspection.tasks"');
  const statsIndex = source.indexOf('key: "inspection.stats"');
  assert.ok(inspectionIndex >= 0);
  assert.ok(emergencyIndex >= 0);
  assert.ok(inspectionIndex < emergencyIndex);
  assert.match(source, /inspection\.standard-works/);
  assert.match(source, /inspection\.plans/);
  assert.match(source, /inspection\.tasks/);
  assert.match(source, /inspection\.stats/);
  assert.ok(statsIndex > tasksIndex);
});

test("inspection data exposes the required fixture collections", async () => {
  const source = await read("app/data/inspection-data.js");
  for (const name of ["standardWorks", "inspectionItems", "plans", "tasks", "devices"]) assert.match(source, new RegExp(`\\b${name}\\b`));
  assert.match(source, /Array\.from\(\{ length: 10 \}/);
});

test("sidebar provides an inspection navigation icon", async () => {
  const source = await read("app/components/sidebar.js");
  assert.match(source, /inspection:\s*['"][\s\S]*?<path/);
});

test("task detail includes video tab before records", async () => {
  const source = await read("app/components/inspection.js");
  assert.match(source, /data-task-tab="video"[^>]*>视频监控/);
  assert.match(source, /data-task-panel="video"/);
  assert.match(source, /dispatch-video-home-grid/);
  assert.match(source, /data-task-video-fullscreen/);
  const videoIdx = source.indexOf('data-task-tab="video"');
  const recordsIdx = source.indexOf('data-task-tab="records"');
  assert.ok(videoIdx > 0 && recordsIdx > videoIdx);
});

for (const [page, key, title, bodyId, needsInspectionJs] of pages) {
  test(`${page} page uses the shared inspection shell`, async () => {
    const source = await read(`web/pages/inspection/${page}.html`);
    assert.match(source, /class="app-shell"/);
    assert.match(source, new RegExp(`data-menu-key="${key.replace(".", "\\.")}"`));
    assert.match(source, new RegExp(`<title>${title}`));
    assert.match(source, /inspection\.css/);
    assert.match(source, /inspection-data\.js/);
    assert.match(source, new RegExp(`id="${bodyId}"`));
    if (needsInspectionJs) {
      assert.match(source, /inspection\.js/);
    } else {
      assert.match(source, /inspection-stats\.js/);
      assert.match(source, /inspection\.js/);
      assert.match(source, /inspectionStatsKpis/);
      assert.match(source, /analysis-chart-grid/);
    }
  });
}
