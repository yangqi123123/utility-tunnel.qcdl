import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../web/pages/gis/one-map.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../web/assets/css/gis-one-map.css", import.meta.url), "utf8");

test("security prevention tab sits after manhole", () => {
  const labels = [...html.matchAll(/data-gis-tab="(\d+)"[^>]*>[\s\S]*?<span>([^<]+)<\/span>/g)].map((m) => m[2]);
  const manhole = labels.indexOf("智能井盖");
  const security = labels.indexOf("安全防范");
  const inspection = labels.indexOf("设备巡检");
  assert.ok(manhole > -1 && security > -1 && inspection > -1);
  assert.equal(security, manhole + 1);
  assert.equal(inspection, security + 1);
  assert.ok(html.includes('data-gis-tab="13"'));
  assert.ok(html.includes('id="gisPanel13"'));
});

test("security prevention dashboard exposes the six approved cards", () => {
  const start = html.indexOf("/* security prevention dashboard enhancement */");
  assert.ok(start > -1, "enhancement marker");
  const dashboard = html.slice(start, html.indexOf("</script>", start));
  for (const title of [
    "设备概览",
    "设备状态统计",
    "入侵报警事件记录",
    "门禁状态监测",
    "电子巡更记录",
    "周边视频",
  ]) {
    assert.ok(dashboard.includes(title), title);
  }
  for (const label of ["入侵报警事件", "通信系统设备", "视频监控设备", "电子巡更记录", "报警设备", "报警类型", "报警描述", "报警时间", "全局监控", "查看"]) {
    assert.ok(dashboard.includes(label), label);
  }
  assert.ok(dashboard.includes("查看更多"));
  assert.ok(dashboard.includes("未处理"));
  assert.ok((dashboard.match(/红外对射|振动光纤|紧急按钮|电子围栏/g) || []).length >= 10);
  assert.ok(!dashboard.includes("今日通行"));
  assert.ok(dashboard.includes("openDeviceDetailFor"));
  assert.ok(dashboard.includes("data-sp-global-video"));
  assert.ok(dashboard.includes("data-gis-global-video"));
  assert.ok(dashboard.includes("title="));
});

test("security prevention map points reuse shared device detail modal", () => {
  const start = html.indexOf("<!-- 安全防范 -->");
  assert.ok(start > -1);
  const block = html.slice(start, html.indexOf("<!-- 智能井盖 -->", start));
  assert.ok(block.includes("openDeviceDetail"));
  assert.ok(html.includes('id="gisDeviceModalMask"'));
  assert.match(css, /#gisDeviceModalMask\s*\{\s*z-index:\s*1800/);
});

test("security prevention styles are scoped to gisPanel13", () => {
  assert.match(css, /#gisPanel13/);
  assert.match(css, /#gisPanel13 \.gis-sp-ov/);
});
