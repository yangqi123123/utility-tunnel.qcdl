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

test("菜单含门禁设备控制且位于监控与人员管理之间", async () => {
  const menu = await read("app/config/menu.js");
  assert.match(menu, /access-control\.control/);
  assert.match(menu, /label:\s*"门禁设备控制"/);
  assert.match(menu, /access-control\/device-control\.html/);
  const devicesIdx = menu.indexOf("access-control.devices");
  const controlIdx = menu.indexOf("access-control.control");
  const personnelIdx = menu.indexOf("access-control.personnel");
  assert.ok(devicesIdx >= 0 && controlIdx > devicesIdx && personnelIdx > controlIdx);
});

test("门禁设备控制页仅控制器可控", async () => {
  assert.equal(await exists("web/pages/access-control/device-control.html"), true);
  const page = await read("web/pages/access-control/device-control.html");
  assert.match(page, /data-menu-key="access-control\.control"/);
  assert.match(page, /data-page-title="门禁设备控制"/);
  assert.match(page, /ACCESS_CONTROL_DATA/);
  assert.match(page, /CONTROLLABLE_TYPES = \["门禁控制器"\]/);
  assert.match(page, /door-open|远程开门/);
  assert.match(page, /door-hold|常开/);
  assert.match(page, /door-lock|锁定/);
  assert.match(page, /data-fdc-tab="smart"/);
  assert.match(page, /data-fdc-tab="records"/);
  assert.match(page, /openAppConfirm/);
  assert.match(page, /openDeviceDetail|DEVICE_DETAIL_INFO/);
  assert.match(page, /data-fdc-detail-tab="control"/);
  assert.doesNotMatch(page, /CONTROLLABLE_TYPES = \[[^\]]*读卡器/);
});

test("Mock 含门禁控制记录", async () => {
  const data = await read("app/data/access-control-data.js");
  assert.match(data, /controlRecords/);
  assert.match(data, /category:\s*"门禁控制器"/);
});
