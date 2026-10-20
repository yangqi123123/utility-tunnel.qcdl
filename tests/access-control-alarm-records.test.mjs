import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("menu label is 门禁告警记录", async () => {
  const source = await read("app/config/menu.js");
  assert.match(source, /key:\s*"access-control\.alarms"[\s\S]*?label:\s*"门禁告警记录"/);
  assert.doesNotMatch(source, /label:\s*"门禁告警事件"/);
});

test("alarms page reuses alarm-info interaction shell", async () => {
  const page = await read("web/pages/access-control/alarms.html");
  assert.match(page, /data-menu-key="access-control\.alarms"/);
  assert.match(page, /data-page-title="门禁告警记录"/);
  assert.match(page, /alarm-center\.css/);
  assert.match(page, /id="alarmInfoBody"/);
  assert.match(page, /system:\s*"门禁系统"/);
  assert.match(page, /门禁系统 · 门禁告警记录/);
  assert.doesNotMatch(page, /access-control\.js/);
  assert.doesNotMatch(page, /access-control-data\.js/);
});

test("alarm-info page is unchanged regarding access-control scope", async () => {
  const page = await read("web/pages/alarm-center/alarm-info.html");
  assert.match(page, /data-menu-key="alarm-center\.info"/);
  assert.doesNotMatch(page, /SYSTEM_SCOPE/);
});
