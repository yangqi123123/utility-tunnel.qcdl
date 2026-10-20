import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import fs from "node:fs";
import vm from "node:vm";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const exists = async (path) => {
  try {
    await access(new URL(`../${path}`, import.meta.url), constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

function loadSecurityData(mutate) {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync("app/data/intrusion-alarm-data.js", "utf8"), sandbox);
  vm.runInNewContext(fs.readFileSync("app/data/access-control-data.js", "utf8"), sandbox);
  if (typeof mutate === "function") mutate(sandbox.window);
  vm.runInNewContext(fs.readFileSync("app/data/security-prevention-data.js", "utf8"), sandbox);
  return sandbox.window.SECURITY_PREVENTION_DATA;
}

test("一级菜单安全防范系统无二级且排在消防监控之后", async () => {
  const menu = await read("app/config/menu.js");
  assert.match(menu, /key:\s*"security-prevention"/);
  assert.match(menu, /label:\s*"安全防范系统"/);
  assert.match(menu, /security-monitor\.html/);
  const fireMonIdx = menu.indexOf('key: "fire-monitor"');
  const secIdx = menu.indexOf('key: "security-prevention"');
  const inspIdx = menu.indexOf('key: "inspection"');
  assert.ok(fireMonIdx > -1 && secIdx > -1 && inspIdx > -1);
  assert.ok(fireMonIdx < secIdx && secIdx < inspIdx);
  const slice = menu.slice(secIdx, inspIdx);
  assert.doesNotMatch(slice, /children:\s*\[/);
  assert.match(menu, /key:\s*"video-monitoring"/);
  assert.match(menu, /key:\s*"intrusion-alarm"/);
  assert.match(menu, /key:\s*"access-control"/);
  assert.match(menu, /key:\s*"inspection"/);
});

test("监测页为值班台布局且无旧点位表明细", async () => {
  assert.equal(await exists("web/pages/monitoring/security-monitor.html"), true);
  assert.equal(await exists("app/data/security-prevention-data.js"), true);
  assert.equal(await exists("web/assets/css/security-monitor.css"), true);
  const page = await read("web/pages/monitoring/security-monitor.html");
  assert.match(page, /data-menu-key="security-prevention"/);
  assert.match(page, /data-page-section="安全防范系统"/);
  assert.match(page, /入侵报警事件/);
  assert.match(page, /通信系统设备/);
  assert.match(page, /视频监控设备/);
  assert.match(page, /电子巡更记录/);
  assert.match(page, /未处理/);
  assert.match(page, /未巡检/);
  assert.match(page, /GIS地图/);
  assert.match(page, /周边视频/);
  assert.match(page, /门禁状态/);
  assert.match(page, /入侵报警详情/);
  assert.match(page, /id="secMap"/);
  assert.match(page, /id="secContextBar"/);
  assert.match(page, /id="secGisVideoModal"/);
  assert.match(page, /id="secDoorModal"/);
  assert.match(page, /当前：/);
  assert.match(page, /全局监控/);
  assert.match(page, /video-monitor\.html\?embedded=1/);
  assert.match(page, /id="secFilterSearch"/);
  assert.match(page, /id="secFilterReset"/);
  assert.match(page, /security-door-grid|env-device-card/);
  assert.match(page, /data-sec-module-fs/);
  assert.match(page, /id="secModuleFullscreen"/);
  assert.match(page, /table-actions-sticky/);
  assert.match(page, />查看</);
  assert.match(page, /security-video-grid/);
  assert.match(page, /data-sec-alarm-action/);
  assert.match(page, /误报/);
  assert.match(page, /转工单/);
  assert.match(page, /data-sec-detail-tab/);
  assert.match(page, /处理记录/);
  assert.match(page, /openGlobalVideo|closeGlobalVideo/);
  assert.match(page, /openDoorDetail|closeDoorDetail/);
  assert.match(page, /openPatrolDetail/);
  assert.match(page, /任务编码/);
  assert.match(page, /巡检时长/);
  assert.match(page, /巡检任务详情/);
  assert.match(page, /DEVICE_DETAIL_INFO/);
  assert.match(page, /COMMUNICATION_STORE/);
  assert.match(page, /selectAlarm|findAlarmByPointId|applyFilter/);
  assert.doesNotMatch(page, /安防点位明细|返回点位表|附近门禁|fa-circle-question/);
  assert.doesNotMatch(page, /ias-view-switch|iasListView|列表视图/);
  assert.doesNotMatch(page, /data-(?:arm|disarm|open-door|ptz)|远程开门|云台控制|录像回放/);
  assert.doesNotMatch(page, /location\.href\s*=\s*["'][^"']*(?:video-monitor|intrusion-monitor|access-control|inspection)/);
});

test("出入口区段至少有 4 路周边视频", () => {
  const API = loadSecurityData();
  const alarms = API.listAlarms();
  const zone = alarms.find((a) => a.deviceCode === "IAS-ZONE-01" || a.deviceCode === "IAS-HOST-01");
  assert.ok(zone);
  const link = API.linkageForAlarm(zone.id);
  assert.ok(link.cameras.length >= 4);
});

test("linkageForAlarm 对 IAS-ZONE-01 返回详情视频门禁与巡更", () => {
  const API = loadSecurityData();
  assert.equal(typeof API.listAlarms, "function");
  assert.equal(typeof API.linkageForAlarm, "function");
  assert.equal(typeof API.resolveSection, "function");
  assert.equal(typeof API.locatePoint, "function");
  const alarms = API.listAlarms();
  const zone = alarms.find((a) => a.deviceCode === "IAS-ZONE-01" || a.deviceCode === "IAS-HOST-01");
  assert.ok(zone, "demo alarm with entrance section");
  const link = API.linkageForAlarm(zone.id);
  assert.ok(link);
  assert.ok(link.alarm);
  assert.ok(link.cameras.some((c) => c.name === "管廊枪式摄像机 01"));
  assert.ok(link.doors.some((d) => d.name === "北区主入口门禁"));
  assert.ok(Array.isArray(link.patrolTasks));
  assert.ok(link.patrolTasks.length >= 1);
  const section = API.resolveSection(zone);
  assert.equal(section.corridor, "高新大道综合管廊");
  assert.equal(section.room, "综合舱");
  assert.equal(section.section, "出入口");
  const loc = API.locatePoint(zone);
  assert.ok(loc && typeof loc.lat === "number" && typeof loc.lng === "number");
});

test("linkageForAlarm 对不存在 id 返回 null", () => {
  const API = loadSecurityData();
  assert.equal(API.linkageForAlarm("__missing__"), null);
});

test("同区段摄像机超过 4 路时 linkageForAlarm 只返回前 4 路", () => {
  const API = loadSecurityData((win) => {
    const extras = ["摄像A", "摄像B", "摄像C", "摄像D", "摄像E"].map((name) => ({
      name,
      status: "在线",
      corridor: "高新大道综合管廊",
      cabin: "综合舱",
      section: "出入口",
    }));
    win.INTRUSION_ALARM_DATA.cameras = (win.INTRUSION_ALARM_DATA.cameras || []).concat(extras);
  });
  const alarms = API.listAlarms();
  const zone = alarms.find((a) => a.deviceCode === "IAS-ZONE-01" || a.deviceCode === "IAS-HOST-01");
  const cams = API.linkageForAlarm(zone.id).cameras;
  assert.equal(cams.length, 4);
  const names = cams.map((c) => c.name);
  const sorted = names.slice().sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  assert.deepEqual(names, sorted);
});
