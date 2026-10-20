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

test("共享电力监测数据文件存在且含关键字段", async () => {
  assert.equal(await exists("app/data/power-monitor-data.js"), true);
  const data = await read("app/data/power-monitor-data.js");
  assert.match(data, /POWER_MONITOR_DATA/);
  assert.match(data, /monitorDevices/);
  assert.match(data, /statusDevices/);
  assert.match(data, /chartSeries/);
  assert.match(data, /alarms/);
  assert.match(data, /ups|cabinet|transformer|meter/);
  assert.match(data, /过压|欠压|过流|设备离线/);
  assert.match(data, /envIndex|upsVoltage|upsCurrent|alarmTrend/);
});

test("一级菜单电力监测系统在井盖下方且含三个二级入口", async () => {
  const menu = await read("app/config/menu.js");
  assert.match(menu, /key:\s*"power-monitor"/);
  assert.match(menu, /label:\s*"电力监测系统"/);
  assert.match(menu, /power-monitor\.realtime/);
  assert.match(menu, /label:\s*"电力实时监测"/);
  assert.match(menu, /label:\s*"电力状态监测"/);
  assert.match(menu, /label:\s*"电力报警记录"/);
  assert.match(menu, /power-realtime\.html/);
  assert.match(menu, /power-status\.html/);
  assert.match(menu, /power-alarms\.html/);
  const mhcIdx = menu.indexOf('key: "manhole-cover"');
  const pwrIdx = menu.indexOf('key: "power-monitor"');
  const commIdx = menu.indexOf('key: "communication-system"');
  assert.ok(mhcIdx < pwrIdx && pwrIdx < commIdx);
});

test("电力实时监测页复用井盖/入侵监测结构且文案电力化", async () => {
  assert.equal(await exists("web/pages/monitoring/power-realtime.html"), true);
  const page = await read("web/pages/monitoring/power-realtime.html");
  assert.match(page, /data-menu-key="power-monitor\.realtime"/);
  assert.match(page, /data-page-section="电力监测系统"/);
  assert.match(page, /data-page-title="电力实时监测"/);
  assert.match(page, /power-monitor-data\.js/);
  assert.match(page, /POWER_MONITOR_DATA/);
  assert.match(page, /data-ias-view="panorama"/);
  assert.match(page, /全景可视化监测/);
  assert.match(page, /configuration\.html\?embed=power/);
  assert.match(page, /data-ias-view="map"/);
  assert.match(page, /data-ias-view="list"/);
  assert.match(page, /电力监测/);
  assert.match(page, /视频监控系统/);
  assert.match(page, /embedded=panel/);
  assert.match(page, /UPS|配电柜|变压器|电表/);
  assert.doesNotMatch(page, /INTRUSION_ALARM_DATA/);
  assert.doesNotMatch(page, /MANHOLE_COVER_DATA/);
  assert.doesNotMatch(page, /data-menu-key="manhole-cover/);
  assert.doesNotMatch(page, /data-menu-key="intrusion-alarm/);
});

test("电力状态监测页含四张图与电力列表字段", async () => {
  assert.equal(await exists("web/pages/monitoring/power-status.html"), true);
  const page = await read("web/pages/monitoring/power-status.html");
  assert.match(page, /data-menu-key="power-monitor\.status"/);
  assert.match(page, /data-page-title="电力状态监测"/);
  assert.match(page, /POWER_MONITOR_DATA/);
  assert.match(page, /近24h环境指数变化趋势/);
  assert.match(page, /近24hUPS电压变化趋势/);
  assert.match(page, /近24hUPS电流变化趋势/);
  assert.match(page, /报警趋势分析/);
  assert.match(page, /通信状态/);
  assert.match(page, /输出电压|回路电流|油温|有功功率|关键运行值/);
  assert.doesNotMatch(page, /开合状态/);
  assert.doesNotMatch(page, /布防状态/);
  assert.doesNotMatch(page, /INTRUSION_ALARM_DATA/);
  assert.doesNotMatch(page, /MANHOLE_COVER_DATA/);
});

test("电力报警记录页具备处置能力且 system 为电力监测", async () => {
  assert.equal(await exists("web/pages/monitoring/power-alarms.html"), true);
  const page = await read("web/pages/monitoring/power-alarms.html");
  assert.match(page, /data-menu-key="power-monitor\.alarms"/);
  assert.match(page, /data-page-title="电力报警记录"/);
  assert.match(page, /POWER_MONITOR_DATA/);
  assert.match(page, /SYSTEM_SCOPE\s*=\s*"电力监测"/);
  assert.match(page, /误报/);
  assert.match(page, /转工单/);
  assert.match(page, /过压|欠压|过流|设备离线/);
  assert.match(page, /电力监测系统 · 电力报警记录/);
  assert.doesNotMatch(page, /INTRUSION_ALARM_DATA/);
  assert.doesNotMatch(page, /MANHOLE_COVER_DATA/);
});

test("三页与数据文件均存在", async () => {
  assert.equal(await exists("app/data/power-monitor-data.js"), true);
  assert.equal(await exists("web/pages/monitoring/power-realtime.html"), true);
  assert.equal(await exists("web/pages/monitoring/power-status.html"), true);
  assert.equal(await exists("web/pages/monitoring/power-alarms.html"), true);
});
