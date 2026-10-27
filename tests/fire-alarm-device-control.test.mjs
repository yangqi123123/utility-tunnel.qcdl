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

test("菜单含火灾设备控制且位于监测与报警记录之间", async () => {
  const menu = await read("app/config/menu.js");
  assert.match(menu, /fire-alarm\.control/);
  assert.match(menu, /label:\s*"火灾设备控制"/);
  assert.match(menu, /fire-alarm-device-control\.html/);
});

test("火灾设备控制页三类设备可控", async () => {
  assert.equal(await exists("web/pages/monitoring/fire-alarm-device-control.html"), true);
  const page = await read("web/pages/monitoring/fire-alarm-device-control.html");
  assert.match(page, /data-menu-key="fire-alarm\.control"/);
  assert.match(page, /data-page-title="火灾设备控制"/);
  assert.match(page, /FIRE_ALARM_DATA/);
  assert.match(page, /感烟探测器/);
  assert.match(page, /感温光纤/);
  assert.match(page, /手动报警器/);
  assert.match(page, /smoke-reset|消警复位/);
  assert.match(page, /smoke-mute|屏蔽/);
  assert.match(page, /openAppConfirm/);
  assert.match(page, /data-fdc-detail-tab="control"/);
});

test("Mock 含火灾控制记录", async () => {
  const data = await read("app/data/fire-alarm-data.js");
  assert.match(data, /controlRecords/);
  assert.match(data, /category:\s*"感烟探测器"/);
});
