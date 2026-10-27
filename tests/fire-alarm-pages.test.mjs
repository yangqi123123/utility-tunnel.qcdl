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

test("一级菜单火灾报警系统在通信下方、消防监控上方且含二级入口", async () => {
  const menu = await read("app/config/menu.js");
  assert.match(menu, /key:\s*"fire-alarm"/);
  assert.match(menu, /label:\s*"火灾报警系统"/);
  assert.match(menu, /fire-alarm\.monitor/);
  assert.match(menu, /label:\s*"火灾报警监测"/);
  assert.match(menu, /fire-alarm\.control/);
  assert.match(menu, /label:\s*"火灾设备控制"/);
  assert.match(menu, /fire-alarm\.alarms/);
  assert.match(menu, /label:\s*"火灾报警记录"/);
  assert.match(menu, /fire-monitor\.html/);
  assert.match(menu, /fire-alarm-device-control\.html/);
  assert.match(menu, /fire-alarms\.html/);
  const monitorIdx = menu.indexOf("fire-alarm.monitor");
  const controlIdx = menu.indexOf("fire-alarm.control");
  const alarmsIdx = menu.indexOf("fire-alarm.alarms");
  assert.ok(monitorIdx >= 0 && controlIdx > monitorIdx && alarmsIdx > controlIdx);

  const commIdx = menu.indexOf('key: "communication-system"');
  const fireIdx = menu.indexOf('key: "fire-alarm"');
  const fireMonIdx = menu.indexOf('key: "fire-monitor"');
  assert.ok(commIdx >= 0 && fireIdx > commIdx && fireMonIdx > fireIdx);

  // 子系统内不得再挂火灾报警单链（顶级 fire-alarm 的 children 不算）
  const subsystemsBlock = menu.slice(
    menu.indexOf('key: "subsystems"'),
    menu.indexOf('key: "data-storage"')
  );
  assert.doesNotMatch(subsystemsBlock, /label:\s*"火灾报警系统"/);
});

test("共享数据与两页文件存在且设备类型正确", async () => {
  assert.equal(await exists("app/data/fire-alarm-data.js"), true);
  assert.equal(await exists("web/pages/monitoring/fire-monitor.html"), true);
  assert.equal(await exists("web/pages/monitoring/fire-alarms.html"), true);
  const data = await read("app/data/fire-alarm-data.js");
  assert.match(data, /FIRE_ALARM_DATA/);
  assert.match(data, /monitorDevices/);
  assert.match(data, /感烟探测器/);
  assert.match(data, /感温光纤/);
  assert.match(data, /手动报警器/);
  assert.doesNotMatch(data, /布防/);
  assert.doesNotMatch(data, /撤防/);
});

test("监测页支持地图列表切换与视频内嵌", async () => {
  const page = await read("web/pages/monitoring/fire-monitor.html");
  assert.match(page, /data-menu-key="fire-alarm\.monitor"/);
  assert.match(page, /data-page-title="火灾报警监测"/);
  assert.match(page, /FIRE_ALARM_DATA/);
  assert.match(page, /data-ias-view="map"/);
  assert.match(page, /data-ias-view="list"/);
  assert.match(page, /火灾报警/);
  assert.match(page, /视频监控系统/);
  assert.match(page, /embedded=panel/);
  assert.match(page, /data-eq-filter="category"/);
  assert.match(page, /data-eq-filter="name"/);
  assert.match(page, /data-eq-filter="code"/);
  assert.match(page, /data-eq-filter="from"/);
  assert.match(page, /data-eq-filter="to"/);
  assert.match(page, /data-ias-mode="system"/);
  assert.match(page, /data-ias-mode="space"/);
  assert.doesNotMatch(page, /INTRUSION_ALARM_DATA/);
});

test("报警记录页具备处置能力且 system 为火灾报警", async () => {
  const page = await read("web/pages/monitoring/fire-alarms.html");
  assert.match(page, /data-menu-key="fire-alarm\.alarms"/);
  assert.match(page, /FIRE_ALARM_DATA/);
  assert.match(page, /误报/);
  assert.match(page, /转工单/);
  assert.match(page, /SYSTEM_SCOPE\s*=\s*"火灾报警"/);
  assert.doesNotMatch(page, /INTRUSION_ALARM_DATA/);
});

test("旧入口重定向到监测页", async () => {
  const page = await read("web/pages/monitoring/fire-alarm.html");
  assert.match(page, /fire-monitor\.html/);
});
