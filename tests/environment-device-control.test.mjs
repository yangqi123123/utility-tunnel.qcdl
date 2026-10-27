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

test("环境设备控制页存在且对齐消防控制能力", async () => {
  assert.equal(await exists("web/pages/monitoring/environment-device-control.html"), true);
  const page = await read("web/pages/monitoring/environment-device-control.html");
  assert.match(page, /data-menu-key="environment-monitoring\.control"/);
  assert.match(page, /data-page-title="环境设备控制"/);
  assert.match(page, /ENVIRONMENT_DATA/);
  assert.match(page, /CONTROLLABLE_TYPES/);
  assert.match(page, /通风设备/);
  assert.match(page, /排水泵/);
  assert.match(page, /照明设备/);
  assert.doesNotMatch(page, /CONTROLLABLE_TYPES = \[[^\]]*供配电/);
  assert.match(page, /data-fdc-tab="smart"/);
  assert.match(page, /data-fdc-tab="records"/);
  assert.match(page, /openAppConfirm/);
  assert.match(page, /openDeviceDetail|DEVICE_DETAIL_INFO/);
  assert.match(page, /data-fdc-detail-tab="control"/);
  assert.match(page, /vent-on|pump-on|light-on/);
  assert.match(page, /data-rec-filter="category"/);
  assert.match(page, /fdc-filter-actions/);
});

test("Mock 含环境控制记录", async () => {
  const data = await read("app/data/environment-data.js");
  assert.match(data, /controlRecords/);
  assert.match(data, /category:\s*"通风设备"/);
});
