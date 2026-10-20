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

const LEGEND_TYPES = [
  "感烟",
  "感温",
  "手动报警器",
  "防火门",
  "消防电源",
  "电气火灾",
  "应急照明",
  "感温光纤",
];

test("一级菜单消防监控系统在火灾报警下方、安全防范上方且含两个二级入口", async () => {
  const menu = await read("app/config/menu.js");
  assert.match(menu, /key:\s*"fire-monitor"/);
  assert.match(menu, /label:\s*"消防监控系统"/);
  assert.match(menu, /fire-monitor\.monitor/);
  assert.match(menu, /label:\s*"消防监测"/);
  assert.match(menu, /fire-monitor\.alarms/);
  assert.match(menu, /label:\s*"消防报警记录"/);
  assert.match(menu, /fire-supervision\.html/);
  assert.match(menu, /fire-supervision-alarms\.html/);

  const fireAlarmIdx = menu.indexOf('key: "fire-alarm"');
  const fireMonitorIdx = menu.indexOf('key: "fire-monitor"');
  const secIdx = menu.indexOf('key: "security-prevention"');
  assert.ok(fireAlarmIdx >= 0 && fireMonitorIdx > fireAlarmIdx && secIdx > fireMonitorIdx);

  const subsystemsBlock = menu.slice(
    menu.indexOf('key: "subsystems"'),
    menu.indexOf('key: "data-storage"')
  );
  assert.match(subsystemsBlock, /key:\s*"fire-system"/);
  assert.doesNotMatch(subsystemsBlock, /key:\s*"fire-monitor"/);
});

test("共享数据与两页文件存在且覆盖 8 类设备", async () => {
  assert.equal(await exists("app/data/fire-monitor-data.js"), true);
  assert.equal(await exists("web/pages/monitoring/fire-supervision.html"), true);
  assert.equal(await exists("web/pages/monitoring/fire-supervision-alarms.html"), true);
  const data = await read("app/data/fire-monitor-data.js");
  assert.match(data, /FIRE_MONITOR_DATA/);
  assert.match(data, /monitorDevices/);
  assert.match(data, /alarms/);
  for (const name of LEGEND_TYPES) {
    assert.match(data, new RegExp(name));
  }
  assert.doesNotMatch(data, /布防/);
  assert.doesNotMatch(data, /撤防/);
});

test("监测页支持地图列表切换、视频内嵌与固定 8 类图例", async () => {
  const page = await read("web/pages/monitoring/fire-supervision.html");
  assert.match(page, /data-menu-key="fire-monitor\.monitor"/);
  assert.match(page, /data-page-title="消防监测"/);
  assert.match(page, /FIRE_MONITOR_DATA/);
  assert.match(page, /data-ias-view="map"/);
  assert.match(page, /data-ias-view="list"/);
  assert.match(page, /消防监控系统/);
  assert.match(page, /视频监控系统/);
  assert.match(page, /embedded=panel/);
  assert.match(page, /LEGEND_ORDER/);
  for (const name of LEGEND_TYPES) {
    assert.match(page, new RegExp(name));
  }
  assert.doesNotMatch(page, /INTRUSION_ALARM_DATA/);
  assert.doesNotMatch(page, /FIRE_ALARM_DATA/);
});

test("报警记录页具备处置能力且 system 为消防监控", async () => {
  const page = await read("web/pages/monitoring/fire-supervision-alarms.html");
  assert.match(page, /data-menu-key="fire-monitor\.alarms"/);
  assert.match(page, /FIRE_MONITOR_DATA/);
  assert.match(page, /误报/);
  assert.match(page, /转工单/);
  assert.match(page, /SYSTEM_SCOPE\s*=\s*"消防监控"/);
  assert.match(page, /消防监控系统 · 消防报警记录/);
  assert.doesNotMatch(page, /INTRUSION_ALARM_DATA/);
  assert.doesNotMatch(page, /FIRE_ALARM_DATA/);
});

test("侧栏含 fire-monitor 图标且火灾报警模块文件未被本需求改名占用", async () => {
  const sidebar = await read("app/components/sidebar.js");
  assert.match(sidebar, /"fire-monitor":/);
  assert.equal(await exists("web/pages/monitoring/fire-monitor.html"), true);
  assert.equal(await exists("web/pages/monitoring/fire-alarms.html"), true);
  assert.equal(await exists("app/data/fire-alarm-data.js"), true);
});
