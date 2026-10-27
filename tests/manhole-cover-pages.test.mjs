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

test("共享井盖数据文件存在且含关键字段", async () => {
  assert.equal(await exists("app/data/manhole-cover-data.js"), true);
  const data = await read("app/data/manhole-cover-data.js");
  assert.match(data, /MANHOLE_COVER_DATA/);
  assert.match(data, /monitorDevices/);
  assert.match(data, /statusDevices/);
  assert.match(data, /alarms/);
  assert.match(data, /开合状态|倾角|信号/);
  assert.match(data, /非法开启|倾角异常/);
});

test("一级菜单智能井盖系统在门禁下方、电力上方且含二级入口", async () => {
  const menu = await read("app/config/menu.js");
  assert.match(menu, /key:\s*"manhole-cover"/);
  assert.match(menu, /label:\s*"智能井盖系统"/);
  assert.match(menu, /manhole-cover\.monitor/);
  assert.match(menu, /label:\s*"井盖实时监测"/);
  assert.match(menu, /label:\s*"井盖状态监测"/);
  assert.match(menu, /label:\s*"井盖设备控制"/);
  assert.match(menu, /label:\s*"井盖报警记录"/);
  assert.match(menu, /manhole-monitor\.html/);
  assert.match(menu, /manhole-devices\.html/);
  assert.match(menu, /manhole-device-control\.html/);
  assert.match(menu, /manhole-alarms\.html/);
  const devicesIdx = menu.indexOf("manhole-cover.devices");
  const controlIdx = menu.indexOf("manhole-cover.control");
  const alarmsIdx = menu.indexOf("manhole-cover.alarms");
  assert.ok(devicesIdx >= 0 && controlIdx > devicesIdx && alarmsIdx > controlIdx);
  const accessIdx = menu.indexOf('key: "access-control"');
  const mhcIdx = menu.indexOf('key: "manhole-cover"');
  const pwrIdx = menu.indexOf('key: "power-monitor"');
  assert.ok(accessIdx < mhcIdx && mhcIdx < pwrIdx);
});

test("井盖实时监测页复用入侵监测结构且文案井盖化", async () => {
  assert.equal(await exists("web/pages/monitoring/manhole-monitor.html"), true);
  const page = await read("web/pages/monitoring/manhole-monitor.html");
  assert.match(page, /data-menu-key="manhole-cover\.monitor"/);
  assert.match(page, /data-page-section="智能井盖系统"/);
  assert.match(page, /data-page-title="井盖实时监测"/);
  assert.match(page, /manhole-cover-data\.js/);
  assert.match(page, /MANHOLE_COVER_DATA/);
  assert.match(page, /data-ias-view="map"/);
  assert.match(page, /data-ias-view="list"/);
  assert.match(page, /智能井盖/);
  assert.match(page, /视频监控系统/);
  assert.match(page, /embedded=panel/);
  assert.match(page, /开合状态|倾角|信号/);
  assert.match(page, /data-eq-filter="category"/);
  assert.match(page, /data-eq-filter="name"/);
  assert.match(page, /data-eq-filter="code"/);
  assert.match(page, /data-eq-filter="from"/);
  assert.match(page, /data-eq-filter="to"/);
  assert.match(page, /data-ias-mode="system"/);
  assert.match(page, /data-ias-mode="space"/);
  assert.doesNotMatch(page, /INTRUSION_ALARM_DATA/);
  assert.doesNotMatch(page, /data-menu-key="intrusion-alarm/);
});

test("井盖状态监测页字段为开合倾角信号", async () => {
  assert.equal(await exists("web/pages/monitoring/manhole-devices.html"), true);
  const page = await read("web/pages/monitoring/manhole-devices.html");
  assert.match(page, /data-menu-key="manhole-cover\.devices"/);
  assert.match(page, /data-page-title="井盖状态监测"/);
  assert.match(page, /MANHOLE_COVER_DATA/);
  assert.match(page, /开合状态/);
  assert.match(page, /倾角/);
  assert.match(page, /信号强度/);
  assert.match(page, /通信状态/);
  assert.doesNotMatch(page, /布防状态/);
  assert.doesNotMatch(page, /防区状态/);
  assert.doesNotMatch(page, /INTRUSION_ALARM_DATA/);
});

test("井盖报警记录页具备处置能力且 system 为智能井盖", async () => {
  assert.equal(await exists("web/pages/monitoring/manhole-alarms.html"), true);
  const page = await read("web/pages/monitoring/manhole-alarms.html");
  assert.match(page, /data-menu-key="manhole-cover\.alarms"/);
  assert.match(page, /data-page-title="井盖报警记录"/);
  assert.match(page, /MANHOLE_COVER_DATA/);
  assert.match(page, /SYSTEM_SCOPE\s*=\s*"智能井盖"/);
  assert.match(page, /误报/);
  assert.match(page, /转工单/);
  assert.match(page, /非法开启|倾角异常/);
  assert.match(page, /智能井盖系统 · 井盖报警记录/);
  assert.doesNotMatch(page, /INTRUSION_ALARM_DATA/);
});

test("三页与数据文件均存在", async () => {
  assert.equal(await exists("app/data/manhole-cover-data.js"), true);
  assert.equal(await exists("web/pages/monitoring/manhole-monitor.html"), true);
  assert.equal(await exists("web/pages/monitoring/manhole-devices.html"), true);
  assert.equal(await exists("web/pages/monitoring/manhole-alarms.html"), true);
});
