import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("environment-data exposes quality devices linkage and alarms", async () => {
  const source = await read("app/data/environment-data.js");
  assert.match(source, /window\.ENVIRONMENT_DATA/);
  assert.match(source, /H₂S|硫化氢/);
  assert.match(source, /linkageRecords/);
  assert.match(source, /alarmRecords/);
  assert.match(source, /controlMode/);
});

test("environment monitoring is a visible top-level menu with four visible children", async () => {
  const source = await read("app/config/menu.js");
  const topLevel = source.indexOf('key: "environment-monitoring"');
  const subsystems = source.indexOf('key: "subsystems"');
  assert.ok(topLevel >= 0);
  assert.match(source, /key: "video-monitoring"[\s\S]*?key: "environment-monitoring"[\s\S]*?key: "intrusion-alarm"/);
  assert.match(source, /environment-monitoring\.overview[\s\S]*?hidden:\s*true/);
  assert.match(source, /environment-monitoring\.quality/);
  assert.match(source, /environment-monitoring\.devices/);
  assert.match(source, /environment-monitoring\.linkage/);
  assert.match(source, /environment-monitoring\.alarms/);
  const subBlock = source.slice(subsystems, source.indexOf('key: "data-storage"'));
  assert.equal(subBlock.includes('key: "environment-monitoring"'), false);
});

test("environment overview page shell and sections exist", async () => {
  const source = await read("web/pages/monitoring/environment-overview.html");
  assert.match(source, /data-menu-key="environment-monitoring\.overview"/);
  assert.match(source, /环境与设备监控/);
  assert.match(source, /只读/);
  assert.match(source, /environment-data\.js/);
  assert.match(source, /id="envKpi"/);
  assert.match(source, /id="envZoneMatrix"/);
  assert.match(source, /id="envDeviceHealth"/);
  assert.match(source, /id="envPowerSummary"/);
  assert.match(source, /id="envRecentAlarms"/);
  assert.match(source, /id="envRecentLinkage"/);
  assert.doesNotMatch(source, /启停|远程控制|data-action="start"/);
});

test("environment quality page uses space filter and device cards", async () => {
  const source = await read("web/pages/monitoring/environment-quality.html");
  assert.match(source, /data-menu-key="environment-monitoring\.quality"/);
  assert.doesNotMatch(source, /<h1>环境质量监测<\/h1>/);
  assert.match(source, /id="qualityKpis"/);
  assert.match(source, /设备总数|在线数|离线数|预警数/);
  assert.doesNotMatch(source, /告警数/);
  assert.match(source, /id="eqTree"/);
  assert.doesNotMatch(source, /data-eq-mode=/);
  assert.match(source, /系统类型/);
  assert.match(source, /id="eqCardGrid"/);
  assert.match(source, /data-eq-view="map"/);
  assert.match(source, /data-eq-view="list"/);
  assert.match(source, /id="eqMapView"/);
  assert.match(source, /id="eqListView"/);
  assert.match(source, /id="dmMap"/);
  assert.match(source, /环境质量明细/);
  assert.match(source, /setView\("map"\)/);
  assert.match(source, /id="eqScopeBar"/);
  assert.doesNotMatch(source, /eqScopeBar" hidden/);
  assert.doesNotMatch(source, /共筛选到当前空间下的监测设备/);
  assert.match(source, /data-eq-filter="name"/);
  assert.match(source, /data-eq-filter="code"/);
  assert.match(source, /data-eq-project/);
  assert.match(source, /dm-modal-mask|dmModalMask/);
  assert.match(source, /data-dm-tab="info"/);
  assert.match(source, /data-dm-tab="live"/);
  assert.match(source, /data-dm-tab="history"/);
  assert.doesNotMatch(source, /openAppDrawer/);
  assert.match(source, /设备信息|实时数据|历史数据/);
  assert.match(source, /暂无数据/);
  assert.match(source, /is-offline/);
  assert.match(source, /isVideoDevice|env-device-video/);
  assert.match(source, /corridor-monitor\.jpg/);
  assert.doesNotMatch(source, /严重超限/);
  assert.match(source, /ENVIRONMENT_DATA\.qualityDevices/);
  assert.doesNotMatch(source, /id="environmentTableBody"/);
});

test("environment-data includes video quality device", async () => {
  const source = await read("app/data/environment-data.js");
  assert.match(source, /投料口枪式摄像机/);
  assert.match(source, /video:\s*true/);
  assert.match(source, /corridor-monitor\.jpg/);
});

test("environment-data exposes qualityDevices with location fields", async () => {
  const source = await read("app/data/environment-data.js");
  assert.match(source, /qualityDevices/);
  assert.match(source, /qualitySpatialTree/);
  assert.match(source, /project:/);
  assert.match(source, /corridor:/);
  assert.match(source, /pipeline:/);
  assert.match(source, /lat:\s*30\./);
  assert.match(source, /metrics:\s*\[/);
});

test("legacy environment-monitor redirects to overview", async () => {
  const source = await read("web/pages/monitoring/environment-monitor.html");
  assert.match(source, /environment-overview\.html/);
});

test("devices page is device status monitor list without controls", async () => {
  const source = await read("web/pages/monitoring/environment-devices.html");
  assert.match(source, /data-menu-key="environment-monitoring\.devices"/);
  assert.match(source, /data-page-title="设备状态监视"/);
  assert.doesNotMatch(source, /<h1>设备与参数监视<\/h1>/);
  assert.doesNotMatch(source, /data-env-tab=/);
  assert.match(source, /设备总数|运行中|停止|故障/);
  assert.match(source, /电源状态/);
  assert.match(source, /运行状态/);
  assert.match(source, /data-action="collapse"/);
  assert.match(source, /extra-filter/);
  assert.match(source, /data-view="chart"/);
  assert.match(source, /data-view="list"/);
  assert.match(source, /设备运行状态统计|运行状态趋势|电源状态统计|报警趋势分析/);
  assert.match(source, /data-period="today"|data-period="month"|data-period="year"/);
  assert.match(source, /chart\.umd\.min\.js/);
  assert.match(source, /设备分类[\s\S]*设备名称/);
  assert.doesNotMatch(source, /data-filter="system"/);
  assert.match(source, /chartPeriod[\s\S]*hidden/);
  assert.match(source, /device-name-cell[\s\S]*font-weight:\s*400/);
  assert.match(source, /device-detail-grid/);
  assert.match(source, /所属系统|设备分类|所属项目|所属管廊|所属舱室|所属区段|所属管线|安装位置|是否智能化/);
  assert.match(source, /data-open-detail/);
  assert.doesNotMatch(source, /二维码|data-open-qr/);
  assert.doesNotMatch(source, /data-action="export"|导出/);
  assert.match(source, /alarmRecords|alarmTrendSeries|告警数/);
  assert.doesNotMatch(source, /远程启停|二次确认下发/);
});

test("menu labels device status monitor", async () => {
  const source = await read("app/config/menu.js");
  assert.match(source, /environment-monitoring\.devices[\s\S]*设备状态监视/);
  assert.doesNotMatch(source, /设备与参数监视/);
});

test("linkage page is device-management style list with sync", async () => {
  const source = await read("web/pages/monitoring/environment-linkage.html");
  assert.match(source, /data-menu-key="environment-monitoring\.linkage"/);
  assert.match(source, /data-page-title="环境联动记录"/);
  assert.doesNotMatch(source, /<h1>联动与处置记录<\/h1>/);
  assert.match(source, /联动总数|成功|部分成功|失败/);
  assert.match(source, /data-action="collapse"/);
  assert.match(source, /同步联动记录/);
  assert.match(source, /首次全量同步|后续增量同步/);
  assert.match(source, /联动名称|联动编号|联动类型|联动系统|联动设备|执行结果|联动开始时间|联动结束时间|发送时间/);
  assert.match(source, /data-open-detail/);
  assert.match(source, /联动设备明细/);
  assert.match(source, /ENVIRONMENT_DATA\.linkageRecords/);
  assert.doesNotMatch(source, /配置规则|手动触发|新增联动/);
});

test("menu labels linkage record", async () => {
  const source = await read("app/config/menu.js");
  assert.match(source, /environment-monitoring\.linkage[\s\S]*环境联动记录/);
  assert.doesNotMatch(source, /联动与处置记录/);
});

test("alarms page reuses alarm-info UI scoped to environment system", async () => {
  const source = await read("web/pages/monitoring/environment-alarms.html");
  assert.match(source, /data-menu-key="environment-monitoring\.alarms"/);
  assert.match(source, /环境告警记录/);
  assert.match(source, /SYSTEM_SCOPE\s*=\s*"环境监测"/);
  assert.match(source, /scopedAlarmInfo/);
  assert.match(source, /system:\s*"环境监测"/);
  assert.doesNotMatch(source, /ENVIRONMENT_DATA\.alarmRecords/);
});

test("menu labels environment alarm record", async () => {
  const source = await read("app/config/menu.js");
  assert.match(source, /environment-monitoring\.alarms[\s\S]*环境告警记录/);
  assert.doesNotMatch(source, /告警与事件/);
});

test("gis environment view does not expose start-stop controls", async () => {
  const source = await read("web/pages/gis/gis-environment.html");
  assert.match(source, /设备状态/);
  assert.doesNotMatch(source, /需二次确认/);
  assert.doesNotMatch(source, /本分区群开|本分区群关/);
  assert.doesNotMatch(source, /<span class="gis-switch">[\s\S]*?<b class="on">启<\/b>/);
});
