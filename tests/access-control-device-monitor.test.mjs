import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("access-control data exposes monitorDevices with door metrics", async () => {
  const source = await read("app/data/access-control-data.js");
  assert.match(source, /deviceSpatialTree\s*:/);
  assert.match(source, /monitorDevices\s*:/);
  assert.match(source, /name:\s*"门状态"/);
  assert.match(source, /name:\s*"设备状态"/);
  assert.match(source, /name:\s*"今日通行"/);
  assert.match(source, /name:\s*"今日异常"/);
  assert.match(source, /system:\s*"门禁系统"/);
  assert.match(source, /video:\s*true/);
  assert.match(source, /system:\s*"视频监控系统"/);
});

test("devices page reuses environment-quality layout", async () => {
  const page = await read("web/pages/access-control/devices.html");
  assert.match(page, /data-menu-key="access-control\.devices"/);
  assert.match(page, /data-page-title="门禁设备监控"/);
  assert.match(page, /environment-monitor\.css/);
  assert.match(page, /env-quality-card-grid/);
  assert.match(page, /monitorDevices/);
  assert.match(page, /deviceSpatialTree/);
  assert.match(page, /formatMetricValue/);
  assert.match(page, /isVideoDevice/);
  assert.match(page, /env-device-video/);
  assert.doesNotMatch(page, /access-control\.js/);
});

test("devices page has map/list view switch like intrusion-monitor", async () => {
  const page = await read("web/pages/access-control/devices.html");
  assert.match(page, /data-ias-view="map"/);
  assert.match(page, /data-ias-view="list"/);
  assert.match(page, /id="iasMapView"/);
  assert.match(page, /id="iasListView"/);
  assert.match(page, /ias-list-view/);
  assert.match(page, /ias-view-hidden/);
  assert.match(page, /dmModalMask/);
  assert.match(page, /BASE_MAP|leaflet/);
  assert.match(page, /intrusion-monitor\.css/);
  assert.match(page, /base-map\.css/);
  assert.match(page, /门禁设备明细/);
  assert.match(page, /env-quality-kpi-grid/);
  assert.match(page, /qualityKpis/);
});
