import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const logic = require("../app/components/linkage-analysis-logic.js");

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const SYSTEMS = [
  "视频监控系统", "环境与设备监控", "入侵报警系统", "门禁系统", "智能井盖系统",
  "电力监测系统", "通信系统", "火灾报警系统", "智慧消防", "安全防范系统", "电子巡更系统",
];

test("menu places linkage management above big-data", async () => {
  const source = await read("app/config/menu.js");
  assert.match(source, /key:\s*"linkage"/);
  assert.match(source, /label:\s*"联动管理系统"/);
  assert.match(source, /key:\s*"linkage\.records"/);
  assert.match(source, /key:\s*"linkage\.analysis"/);
  assert.match(source, /label:\s*"联动记录"/);
  assert.match(source, /label:\s*"联动分析"/);
  const linkageIdx = source.indexOf('key: "linkage"');
  const bigDataIdx = source.indexOf('key: "big-data"');
  assert.ok(linkageIdx > -1 && bigDataIdx > -1 && linkageIdx < bigDataIdx, "联动管理系统应在大数据分析上方");
  assert.match(source, /environment-monitoring\.linkage/);
  assert.match(source, /intrusion-alarm\.linkage/);
});

test("sidebar has linkage nav icon", async () => {
  const source = await read("app/components/sidebar.js");
  assert.match(source, /linkage:\s*['"]/);
});

test("linkage data covers 11 systems", async () => {
  const source = await read("app/data/linkage-data.js");
  for (const name of SYSTEMS) assert.match(source, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("records page reuses linkage shell", async () => {
  const page = await read("web/pages/linkage/records.html");
  assert.match(page, /data-menu-key="linkage\.records"/);
  assert.match(page, /data-page-title="联动记录"/);
  assert.match(page, /linkage-records\.js/);
  assert.match(page, /linkage-data\.js/);
  assert.match(page, /id="linkageTableBody"/);
  assert.match(page, /data-filter="system"/);
});

test("analysis page uses risk-analysis skeleton", async () => {
  const page = await read("web/pages/linkage/analysis.html");
  assert.match(page, /data-menu-key="linkage\.analysis"/);
  assert.match(page, /data-page-title="联动分析"/);
  assert.match(page, /linkage-analysis\.js/);
  assert.match(page, /emergency\.css/);
  assert.match(page, /analysis-chart-grid/);
  assert.match(page, /id="chartSystemShare"/);
  assert.match(page, /id="chartLinkageTrend"/);
  assert.match(page, /id="chartResultShare"/);
  assert.match(page, /id="chartCorridorShare"/);
  assert.match(page, /管廊联动统计/);
});

test("summarize and system share", () => {
  const list = [
    { system: "门禁系统", result: "成功", startTime: "2026-10-15 10:00:00", corridor: "高新大道综合管廊" },
    { system: "门禁系统", result: "失败", startTime: "2026-10-14 10:00:00", corridor: "高新大道综合管廊" },
    { system: "视频监控系统", result: "成功", startTime: "2026-10-13 10:00:00", corridor: "科学岛大道综合管廊" },
  ];
  const s = logic.summarize(list);
  assert.equal(s.total, 3);
  assert.equal(s.ok, 2);
  assert.equal(s.fail, 1);
  assert.equal(s.rate, "67%");
  const bySys = logic.countBySystem(list, ["门禁系统", "视频监控系统"]);
  assert.equal(bySys.get("门禁系统"), 2);
  assert.equal(bySys.get("视频监控系统"), 1);
  const bySysResult = logic.countBySystemResult(list, ["门禁系统", "视频监控系统"]);
  assert.equal(bySysResult.get("门禁系统").成功, 1);
  assert.equal(bySysResult.get("门禁系统").失败, 1);
  assert.equal(logic.countByCorridor(list).get("高新大道综合管廊"), 2);
});

test("filterRecords respects range and project", () => {
  const now = new Date("2026-10-16T12:00:00");
  const list = [
    { system: "门禁系统", result: "成功", startTime: "2026-10-15 10:00:00", project: "A" },
    { system: "门禁系统", result: "成功", startTime: "2026-09-01 10:00:00", project: "A" },
    { system: "门禁系统", result: "成功", startTime: "2026-10-15 10:00:00", project: "B" },
  ];
  const filtered = logic.filterRecords(list, { range: "7", project: "A", corridor: "", room: "", section: "", pipeline: "" }, now);
  assert.equal(filtered.length, 1);
});

test("trendByDay buckets by local calendar date", () => {
  const start = new Date(2026, 9, 15);
  const end = new Date(2026, 9, 15);
  const list = [{ startTime: "2026-10-15 01:00:00", result: "成功" }];
  const trend = logic.trendByDay(list, start, end);
  assert.equal(trend.labels.length, 1);
  assert.equal(trend.labels[0], "10-15");
  assert.equal(trend.values[0], 1);
});
