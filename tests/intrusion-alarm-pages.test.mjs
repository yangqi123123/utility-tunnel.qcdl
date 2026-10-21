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

test("一级菜单入侵报警系统含四个二级入口", async () => {
  const menu = await read("app/config/menu.js");
  assert.match(menu, /key:\s*"intrusion-alarm"/);
  assert.match(menu, /label:\s*"入侵报警系统"/);
  assert.match(menu, /intrusion-alarm\.monitor/);
  assert.match(menu, /label:\s*"入侵报警监测"/);
  assert.match(menu, /label:\s*"入侵设备状态"/);
  assert.match(menu, /label:\s*"入侵联动记录"/);
  assert.match(menu, /label:\s*"入侵报警记录"/);
  assert.match(menu, /intrusion-monitor\.html/);
  assert.match(menu, /intrusion-devices\.html/);
  assert.match(menu, /intrusion-linkage\.html/);
  assert.match(menu, /intrusion-alarms\.html/);
  const videoIdx = menu.indexOf('key: "video-monitoring"');
  const iasIdx = menu.indexOf('key: "intrusion-alarm"');
  const accessIdx = menu.indexOf('key: "access-control"');
  assert.ok(videoIdx < iasIdx && iasIdx < accessIdx);
});

test("共享数据与四页文件存在", async () => {
  assert.equal(await exists("app/data/intrusion-alarm-data.js"), true);
  assert.equal(await exists("web/pages/monitoring/intrusion-monitor.html"), true);
  assert.equal(await exists("web/pages/monitoring/intrusion-devices.html"), true);
  assert.equal(await exists("web/pages/monitoring/intrusion-linkage.html"), true);
  assert.equal(await exists("web/pages/monitoring/intrusion-alarms.html"), true);
  const data = await read("app/data/intrusion-alarm-data.js");
  assert.match(data, /INTRUSION_ALARM_DATA/);
  assert.match(data, /monitorDevices/);
  assert.match(data, /linkageRecords/);
  assert.match(data, /items:\s*\[/);
  assert.match(data, /startTime:/);
});

test("入侵设备状态图表为两列四图含报警趋势", async () => {
  const page = await read("web/pages/monitoring/intrusion-devices.html");
  assert.match(page, /data-page-title="入侵设备状态"/);
  assert.match(page, /报警趋势分析/);
  assert.match(page, /chartAlarmTrend/);
  assert.match(page, /data-period="today"/);
  assert.match(page, /grid-template-columns:\s*repeat\(2/);
  assert.match(page, /通信状态分布/);
  assert.match(page, /布防状态分布/);
  assert.match(page, /防区状态分布/);
});

test("入侵联动详情与同步对齐环境联动", async () => {
  const page = await read("web/pages/monitoring/intrusion-linkage.html");
  assert.match(page, /data-action="sync-linkage"/);
  assert.match(page, /同步联动记录/);
  assert.match(page, /start-linkage-sync/);
  assert.match(page, /联动名称/);
  assert.match(page, /联动编号/);
  assert.match(page, /联动设备明细/);
  assert.match(page, /执行动作/);
  assert.match(page, /system-types\.js/);
});

test("监测页支持地图列表切换与视频内嵌", async () => {
  const page = await read("web/pages/monitoring/intrusion-monitor.html");
  assert.match(page, /data-menu-key="intrusion-alarm\.monitor"/);
  assert.match(page, /data-ias-view="map"/);
  assert.match(page, /data-ias-view="list"/);
  assert.match(page, /视频监控系统/);
  assert.match(page, /embedded=panel/);
  assert.doesNotMatch(page, /window\.open\([^)]*video-monitor/);
  assert.match(page, /data-eq-detail-tab="info"/);
  assert.match(page, /data-eq-detail-tab="live"/);
  assert.match(page, /data-eq-detail-tab="history"/);
  assert.match(page, /renderListDetailBody/);
});

test("列表模式右侧主区滚动而非整页或仅卡片格", async () => {
  const css = await read("web/assets/css/intrusion-monitor.css");
  assert.match(css, /body\.ias-list-mode \.env-quality-main/);
  assert.match(css, /overflow-y:\s*auto/);
  assert.match(css, /body\.ias-list-mode #eqCardGrid[\s\S]*?overflow:\s*visible/);
});

test("视频监控切换时 [hidden] 不被 display:flex 盖掉", async () => {
  const css = await read("web/assets/css/intrusion-monitor.css");
  assert.match(css, /#iasListIntrusion\[hidden\]/);
  assert.match(css, /#iasListVideo\[hidden\]/);
  assert.match(css, /display:\s*none\s*!important/);
  const page = await read("web/pages/monitoring/intrusion-monitor.html");
  assert.match(page, /listState\.system === "video"/);
});

test("视频页支持 panel 嵌入", async () => {
  const page = await read("web/pages/monitoring/video-monitor.html");
  assert.match(page, /video-monitor-panel/);
  assert.match(page, /embedded/);
});

test("报警记录页具备处置能力且 system 为入侵报警", async () => {
  const page = await read("web/pages/monitoring/intrusion-alarms.html");
  assert.match(page, /data-menu-key="intrusion-alarm\.alarms"/);
  assert.match(page, /误报/);
  assert.match(page, /转工单/);
  assert.match(page, /入侵报警/);
  assert.match(page, /<th>图片<\/th>/);
  assert.match(page, /listImageMarkup|detailImagesMarkup|alarmImages/);
  assert.match(page, /data-alarm-image-preview/);
});

test("入侵报警数据含图片字段", async () => {
  const data = await read("app/data/intrusion-alarm-data.js");
  assert.match(data, /images:\s*\[/);
});

test("旧入口重定向到监测页", async () => {
  const page = await read("web/pages/monitoring/intrusion-alarm.html");
  assert.match(page, /intrusion-monitor\.html/);
});
