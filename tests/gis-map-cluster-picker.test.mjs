import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../web/pages/gis/one-map.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../web/assets/css/gis-one-map.css", import.meta.url), "utf8");

test("GIS map exposes shared zone drawer, clustering and stack picker", () => {
  assert.ok(html.includes("window.GIS_MAP_UX"));
  assert.ok(html.includes("openZoneDrawer"));
  assert.ok(html.includes("renderClusteredPoints"));
  assert.ok(html.includes("attachZoneClicks"));
  assert.ok(html.includes('id="gisStackModal"'));
  assert.ok(html.includes("查看详情"));
  assert.ok(html.includes("防火分区编号"));
  assert.ok(html.includes("区段编码"));
  assert.ok(html.includes("起始桩号"));
});

test("all map inits attach zone clicks and clustered render", () => {
  assert.equal((html.match(/attachZoneClicks/g) || []).length, 15);
  assert.equal((html.match(/renderClusteredPoints/g) || []).length, 15);
  assert.equal((html.match(/map\.on\('zoomend',renderPoints\)/g) || []).length, 14);
});

test("stack picker styles are fixed size and scrollable", () => {
  assert.match(css, /\.gis-stack-panel\{[^}]*width:800px/);
  assert.match(css, /\.gis-stack-panel\{[^}]*height:540px/);
  assert.match(css, /\.gis-cluster\{/);
  assert.match(css, /\.gis-stack-fields\{[^}]*overflow:auto/);
  assert.match(css, /\.gis-stack-cats\{[^}]*overflow-x:auto/);
  assert.match(css, /\.gis-stack-cats\{[^}]*overflow-y:hidden/);
  assert.match(css, /\.gis-stack-cats\{[^}]*flex-wrap:nowrap/);
});

test("zone drawer hides corridor subtitle and stack has name/code filters", () => {
  assert.match(html, /gisDrawerSub[\s\S]{0,80}hidden=true/);
  assert.ok(html.includes('id="gisStackNameFilter"'));
  assert.ok(html.includes('id="gisStackCodeFilter"'));
  assert.ok(html.includes("请输入设备名称"));
  assert.ok(html.includes("请输入设备编码"));
});
