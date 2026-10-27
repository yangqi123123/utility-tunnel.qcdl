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

test("菜单含电力设备控制且位于实时监测与状态监测之间", async () => {
  const menu = await read("app/config/menu.js");
  assert.match(menu, /power-monitor\.control/);
  assert.match(menu, /label:\s*"电力设备控制"/);
  assert.match(menu, /power-device-control\.html/);
});

test("电力设备控制页 UPS/配电柜可控", async () => {
  assert.equal(await exists("web/pages/monitoring/power-device-control.html"), true);
  const page = await read("web/pages/monitoring/power-device-control.html");
  assert.match(page, /data-menu-key="power-monitor\.control"/);
  assert.match(page, /data-page-title="电力设备控制"/);
  assert.match(page, /POWER_MONITOR_DATA/);
  assert.match(page, /CONTROLLABLE_TYPES = \["UPS", "配电柜"\]/);
  assert.match(page, /ups-bypass|市电旁路/);
  assert.match(page, /cab-on|合闸/);
  assert.match(page, /openAppConfirm/);
  assert.match(page, /data-fdc-detail-tab="control"/);
});

test("Mock 含电力控制记录", async () => {
  const data = await read("app/data/power-monitor-data.js");
  assert.match(data, /controlRecords/);
  assert.match(data, /category:\s*"UPS"/);
});
