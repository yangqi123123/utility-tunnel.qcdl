import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../web/pages/gis/one-map.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../web/assets/css/gis-one-map.css", import.meta.url), "utf8");

test("fire alarm tab sits between fire and security", () => {
  const labels = [...html.matchAll(/data-gis-tab="(\d+)"[^>]*>[\s\S]*?<span>([^<]+)<\/span>/g)].map((m) => m[2]);
  const fire = labels.indexOf("消防监控");
  const fireAlarm = labels.indexOf("火灾报警");
  const security = labels.indexOf("安防监控");
  assert.ok(fire > -1 && fireAlarm > -1 && security > -1);
  assert.equal(fireAlarm, fire + 1);
  assert.equal(security, fireAlarm + 1);
  assert.ok(html.includes('data-gis-tab="12"'));
  assert.ok(html.includes('id="gisPanel12"'));
});

test("fire alarm dashboard exposes the six approved cards", () => {
  const start = html.indexOf("/* fire alarm dashboard enhancement */");
  assert.ok(start > -1, "enhancement marker");
  const dashboard = html.slice(start, html.indexOf("</script>", start));
  for (const title of [
    "火灾设备运行状态统计",
    "分区统计",
    "火灾设备巡检",
    "火灾设备保养",
    "设备异常工单分析",
    "设备报警",
  ]) {
    assert.ok(dashboard.includes(title), title);
  }
  for (const label of ["待指派", "待处理", "验收中", "已完成", "已撤回", "完成率"]) {
    assert.ok(dashboard.includes(label), label);
  }
  assert.ok(dashboard.includes("data-hz-wo-period"));
  assert.ok(dashboard.includes("HZ-XJ-") || dashboard.includes("HZ-XJ"));
  assert.ok(dashboard.includes("HZ-BY-") || dashboard.includes("HZ-BY"));
  assert.ok(dashboard.includes("故障"));
});

test("fire alarm styles are scoped to gisPanel12", () => {
  assert.match(css, /#gisPanel12/);
  assert.match(css, /#gisPanel12 \.gis-fire-rail|#gisPanel12 \.gis-hz-rail/);
});
