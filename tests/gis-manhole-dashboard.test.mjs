import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../web/pages/gis/one-map.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../web/assets/css/gis-one-map.css", import.meta.url), "utf8");

test("manhole tab sits between power and security prevention", () => {
  const labels = [...html.matchAll(/data-gis-tab="(\d+)"[^>]*>[\s\S]*?<span>([^<]+)<\/span>/g)].map((m) => m[2]);
  const power = labels.indexOf("电力监控");
  const manhole = labels.indexOf("智能井盖");
  const prevention = labels.indexOf("安全防范");
  assert.ok(power > -1 && manhole > -1 && prevention > -1);
  assert.equal(manhole, power + 1);
  assert.equal(prevention, manhole + 1);
  assert.ok(html.includes('data-gis-tab="11"'));
  assert.ok(html.includes('id="gisPanel11"'));
});

test("manhole dashboard exposes the six approved cards", () => {
  const start = html.indexOf("/* manhole dashboard enhancement */");
  assert.ok(start > -1, "enhancement marker");
  const dashboard = html.slice(start, html.indexOf("</script>", start));
  for (const title of [
    "井盖设备运行状态统计",
    "分区统计",
    "井盖设备巡检",
    "井盖设备巡检状态分析",
    "开合状态分布",
    "设备报警",
  ]) {
    assert.ok(dashboard.includes(title), title);
  }
  assert.ok(dashboard.includes(">开</span>") || dashboard.includes("开</span>"));
  assert.ok(dashboard.includes(">关</span>") || dashboard.includes("关</span>"));
  assert.ok(dashboard.includes("未知"));
  assert.ok(dashboard.includes("故障"));
  assert.ok(dashboard.includes("data-manhole-period"));
});

test("manhole styles are scoped to gisPanel11", () => {
  assert.match(css, /#gisPanel11/);
  assert.match(css, /#gisPanel11 \.gis-fire-rail|#gisPanel11 \.gis-manhole-rail/);
});
