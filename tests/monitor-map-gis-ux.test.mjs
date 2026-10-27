import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pages = [
  "web/pages/monitoring/environment-quality.html",
  "web/pages/monitoring/intrusion-monitor.html",
  "web/pages/access-control/devices.html",
  "web/pages/monitoring/manhole-monitor.html",
  "web/pages/monitoring/power-realtime.html",
  "web/pages/monitoring/fire-monitor.html",
  "web/pages/monitoring/fire-supervision.html",
];

test("shared GIS map UX helpers exist", () => {
  const js = readFileSync(join(root, "web/assets/js/gis-map-ux.js"), "utf8");
  const css = readFileSync(join(root, "web/assets/css/gis-map-ux.css"), "utf8");
  assert.ok(js.includes("attachCorridor"));
  assert.ok(js.includes("renderDeviceMarkers"));
  assert.ok(js.includes("openZoneDrawer"));
  assert.ok(js.includes("openStack"));
  assert.ok(js.includes("请输入设备名称"));
  assert.match(css, /\.gis-cluster\{/);
  assert.match(css, /\.gis-stack-cats\{[^}]*overflow-x:auto/);
  assert.match(css, /\.gis-drawer\{/);
});

test("seven monitor map views wire corridor, clustering and stack picker", () => {
  pages.forEach((rel) => {
    const html = readFileSync(join(root, rel), "utf8");
    assert.ok(html.includes("gis-map-ux.css"), rel + " missing css");
    assert.ok(html.includes("gis-map-ux.js"), rel + " missing js");
    assert.ok(html.includes("attachCorridor"), rel + " missing corridor");
    assert.ok(html.includes("renderDeviceMarkers"), rel + " missing clustered markers");
    assert.ok(html.includes('map.on("zoomend"') || html.includes("map.on(\"zoomend\""), rel + " missing zoomend");
  });
});
