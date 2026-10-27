import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { constants } from "node:fs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const exists = async (path) => {
  try {
    await access(new URL(`../${path}`, import.meta.url), constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

test("菜单含消防设备控制且位于消防监测与报警记录之间", async () => {
  const menu = await read("app/config/menu.js");
  assert.match(menu, /fire-monitor\.control/);
  assert.match(menu, /label:\s*"消防设备控制"/);
  assert.match(menu, /fire-device-control\.html/);

  const monitorIdx = menu.indexOf("fire-monitor.monitor");
  const controlIdx = menu.indexOf("fire-monitor.control");
  const alarmsIdx = menu.indexOf("fire-monitor.alarms");
  assert.ok(monitorIdx >= 0 && controlIdx > monitorIdx && alarmsIdx > controlIdx);
});

test("消防设备控制页含智能控制与控制记录两个 tab", async () => {
  assert.equal(await exists("web/pages/monitoring/fire-device-control.html"), true);
  const page = await read("web/pages/monitoring/fire-device-control.html");
  assert.match(page, /data-menu-key="fire-monitor\.control"/);
  assert.match(page, /data-page-title="消防设备控制"/);
  assert.match(page, /data-fdc-tab="smart"/);
  assert.match(page, /设备智能控制/);
  assert.match(page, /data-fdc-tab="records"/);
  assert.match(page, /设备控制记录/);
  assert.match(page, /FIRE_MONITOR_DATA/);
  assert.match(page, /CONTROLLABLE_TYPES/);
  assert.match(page, /data-fm-filter="category"/);
  assert.match(page, /data-fm-select-all/);
  assert.match(page, /data-fm-batch|批量/);
  assert.match(page, /openAppConfirm/);
  assert.match(page, /controlRecords|fdcRecordBody/);
  assert.match(page, /fdc-tabs/);
  assert.match(page, /操作人/);
  assert.match(page, /执行动作/);
  assert.match(page, /所属系统/);
  assert.match(page, /data-rec-filter="category"/);
  assert.doesNotMatch(page, /data-rec-filter="action"/);
  assert.doesNotMatch(page, /data-rec-filter="system"/);
  assert.match(page, /fdc-filter-actions/);
  assert.match(page, /设备编码/);
  assert.match(page, /openDeviceDetail|DEVICE_DETAIL_INFO/);
  assert.match(page, /data-fdc-detail-tab="control"/);
  assert.match(page, /设备控制/);
  assert.match(page, /data-fm-stop/);
  assert.match(page, /lock-door|强制闭锁/);
});

test("卡片控制区支持一行高度纵向滚动", async () => {
  const css = await read("web/assets/css/fire-graphic-monitor.css");
  assert.match(css, /\.fm-graphic-actions/);
  assert.match(css, /max-height:\s*30px/);
  assert.match(css, /overflow-y:\s*auto/);
});

test("消防监测仅保留地图与列表且含设备分类筛选", async () => {
  const page = await read("web/pages/monitoring/fire-supervision.html");
  assert.match(page, /data-ias-view="map"/);
  assert.match(page, /data-ias-view="list"/);
  assert.doesNotMatch(page, /data-ias-view="graphic"/);
  assert.doesNotMatch(page, /id="iasGraphicView"/);
  assert.doesNotMatch(page, /CONTROLLABLE_TYPES/);
  assert.match(page, /data-eq-filter="category"/);
  assert.match(page, /data-eq-filter="name"/);
  assert.match(page, /data-eq-filter="code"/);
  assert.match(page, /data-eq-filter="from"/);
  assert.match(page, /data-eq-filter="to"/);
  assert.match(page, /function bindEvents/);
});

test("Mock 数据含 controlRecords", async () => {
  const data = await read("app/data/fire-monitor-data.js");
  assert.match(data, /controlRecords/);
  assert.match(data, /operator/);
  assert.match(data, /deviceCode/);
  assert.match(data, /category:\s*"防火门"/);
});

test("图形监控样式可供设备控制页复用", async () => {
  const css = await read("web/assets/css/fire-graphic-monitor.css");
  assert.match(css, /\.fm-graphic/);
});
