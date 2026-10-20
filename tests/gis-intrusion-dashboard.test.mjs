import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../web/pages/gis/one-map.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../web/assets/css/gis-one-map.css", import.meta.url), "utf8");

test("intrusion tab sits between communication and power", () => {
  const tabs = [...html.matchAll(/data-gis-tab="(\d+)"[^>]*>[\s\S]*?<span>([^<]+)<\/span>/g)].map((m) => [m[1], m[2]]);
  const labels = tabs.map((t) => t[1]);
  const comm = labels.indexOf("通信广播");
  const intrusion = labels.indexOf("入侵报警");
  const power = labels.indexOf("电力监控");
  assert.ok(comm > -1 && intrusion > -1 && power > -1);
  assert.equal(intrusion, comm + 1);
  assert.equal(power, intrusion + 1);
  assert.ok(html.includes('data-gis-tab="10"'));
  assert.ok(html.includes('id="gisPanel10"'));
});

test("intrusion dashboard exposes the six approved cards", () => {
  const start = html.indexOf("/* intrusion dashboard enhancement */");
  assert.ok(start > -1, "enhancement marker");
  const dashboard = html.slice(start, html.indexOf("</script>", start));
  const expected = [
    "入侵设备运行状态统计",
    "分区入侵报警统计",
    "入侵设备巡检",
    "入侵设备巡检状态分析",
    "布防状态分布",
    "设备报警",
  ];
  for (const title of expected) assert.ok(dashboard.includes(title), title);
  assert.ok(dashboard.includes("布防"));
  assert.ok(dashboard.includes("撤防"));
  assert.ok(dashboard.includes("故障"));
  assert.ok(dashboard.includes("data-intrusion-period"));
});

test("intrusion styles are scoped to gisPanel10", () => {
  assert.match(css, /#gisPanel10 \.gis-fire-rail|#gisPanel10 \.gis-intrusion-rail/);
  assert.match(css, /#gisPanel10/);
});

test("tab switcher matches panels by data-gis-tab id", () => {
  assert.match(html, /dataset\.gisTab|data-gis-tab/);
  assert.match(html, /dataset\.gisPanel|data-gis-panel/);
  assert.doesNotMatch(
    html.slice(html.indexOf("var tabs=document.querySelectorAll('.gis-tab')"), html.indexOf("show(0)")),
    /panels\[i\]\.classList\.toggle\('active', i===idx\)/
  );
});
