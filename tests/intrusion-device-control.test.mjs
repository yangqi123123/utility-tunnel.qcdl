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

test("菜单含入侵设备控制且位于设备状态与算法管理之间", async () => {
  const menu = await read("app/config/menu.js");
  assert.match(menu, /intrusion-alarm\.control/);
  assert.match(menu, /label:\s*"入侵设备控制"/);
  assert.match(menu, /intrusion-device-control\.html/);
  const devicesIdx = menu.indexOf("intrusion-alarm.devices");
  const controlIdx = menu.indexOf("intrusion-alarm.control");
  const algorithmsIdx = menu.indexOf("intrusion-alarm.algorithms");
  assert.ok(devicesIdx >= 0 && controlIdx > devicesIdx && algorithmsIdx > controlIdx);
});

test("入侵设备控制页对齐消防控制能力", async () => {
  assert.equal(await exists("web/pages/monitoring/intrusion-device-control.html"), true);
  const page = await read("web/pages/monitoring/intrusion-device-control.html");
  assert.match(page, /data-menu-key="intrusion-alarm\.control"/);
  assert.match(page, /data-page-title="入侵设备控制"/);
  assert.match(page, /INTRUSION_ALARM_DATA/);
  assert.match(page, /CONTROLLABLE_TYPES/);
  assert.match(page, /报警主机/);
  assert.match(page, /防区/);
  assert.match(page, /探测器/);
  assert.match(page, /host-arm|主机布防/);
  assert.match(page, /zone-arm|防区布防/);
  assert.match(page, /host-reset|消警复位/);
  assert.match(page, /data-fdc-tab="smart"/);
  assert.match(page, /data-fdc-tab="records"/);
  assert.match(page, /openAppConfirm/);
  assert.match(page, /openDeviceDetail|DEVICE_DETAIL_INFO/);
  assert.match(page, /data-fdc-detail-tab="control"/);
  assert.match(page, /data-rec-filter="category"/);
  assert.doesNotMatch(page, /CONTROLLABLE_TYPES = \[[^\]]*探测器/);
});

test("Mock 含入侵控制记录", async () => {
  const data = await read("app/data/intrusion-alarm-data.js");
  assert.match(data, /controlRecords/);
  assert.match(data, /category:\s*"报警主机"/);
});
