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

test("菜单含井盖设备控制且位于状态监测与报警记录之间", async () => {
  const menu = await read("app/config/menu.js");
  assert.match(menu, /manhole-cover\.control/);
  assert.match(menu, /label:\s*"井盖设备控制"/);
  assert.match(menu, /manhole-device-control\.html/);
});

test("井盖设备控制页仅智能井盖可控", async () => {
  assert.equal(await exists("web/pages/monitoring/manhole-device-control.html"), true);
  const page = await read("web/pages/monitoring/manhole-device-control.html");
  assert.match(page, /data-menu-key="manhole-cover\.control"/);
  assert.match(page, /data-page-title="井盖设备控制"/);
  assert.match(page, /MANHOLE_COVER_DATA/);
  assert.match(page, /CONTROLLABLE_TYPES = \["智能井盖"\]/);
  assert.match(page, /cover-close|远程关闭/);
  assert.match(page, /cover-lock|锁定/);
  assert.match(page, /cover-reset|消警复位/);
  assert.match(page, /data-fdc-tab="smart"/);
  assert.match(page, /data-fdc-tab="records"/);
  assert.match(page, /openAppConfirm/);
  assert.match(page, /openDeviceDetail|DEVICE_DETAIL_INFO/);
  assert.doesNotMatch(page, /CONTROLLABLE_TYPES = \[[^\]]*井盖网关/);
});

test("Mock 含井盖控制记录", async () => {
  const data = await read("app/data/manhole-cover-data.js");
  assert.match(data, /controlRecords/);
  assert.match(data, /category:\s*"智能井盖"/);
});
