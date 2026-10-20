import assert from "node:assert/strict";
import fs from "node:fs";

const menu = fs.readFileSync("app/config/menu.js", "utf8");

assert.match(menu, /key: "network"/);
assert.match(menu, /label:\s*"网络管理"/);
assert.match(menu, /network\.overview/);
assert.match(menu, /network\.devices/);
assert.match(menu, /network\.host/);
assert.match(menu, /network\.performance/);
assert.match(menu, /network\.alarms/);
assert.match(menu, /network\.fault/);
assert.match(menu, /network\.config/);
assert.match(menu, /network\.topology/);
assert.match(menu, /network\.security/);
assert.match(menu, /label:\s*"监控总览"/);
assert.match(menu, /label:\s*"服务主机"/);
assert.match(menu, /label:\s*"网络安全"/);
assert.doesNotMatch(menu, /key: "service-center"/);
assert.doesNotMatch(menu, /label:\s*"网络管理平台"/);

const pages = [
  ["overview", "network.overview", "监控总览"],
  ["host", "network.host", "服务主机"],
  ["devices", "network.devices", "网络设备"],
  ["alarms", "network.alarms", "网络告警"],
  ["topology", "network.topology", "网络拓扑"],
  ["performance", "network.performance", "性能分析"],
  ["fault", "network.fault", "故障诊断"],
  ["config", "network.config", "配置管理"],
  ["security", "network.security", "网络安全"],
];

for (const [file, key, title] of pages) {
  const html = fs.readFileSync(`web/pages/network/${file}.html`, "utf8");
  assert.match(html, new RegExp(`data-menu-key="${key.replace(".", "\\.")}"`));
  assert.match(html, new RegExp(title));
  assert.match(html, /network-data\.js/);
}

const host = fs.readFileSync("web/pages/network/host.html", "utf8");
assert.match(host, /核心数/);
assert.match(host, /总内存|已用内存/);
assert.match(host, /服务器名称/);
assert.match(host, /应用环境|应用版本/);
assert.match(host, /盘符路径|磁盘/);

const overview = fs.readFileSync("web/pages/network/overview.html", "utf8");
assert.match(overview, /受监控设备|当前网络流量|平均链路延迟/);
assert.match(overview, /服务主机摘要|host\.html/);
assert.match(overview, /analysis-kpi/);
assert.match(overview, /导出 Excel|XLSX/);
assert.doesNotMatch(overview, /性能趋势/);
assert.doesNotMatch(overview, /安装路径/);

const devices = fs.readFileSync("web/pages/network/devices.html", "utf8");
assert.doesNotMatch(devices, /data-detail|详情<\/button>/);
assert.match(devices, /更新时间/);

const alarms = fs.readFileSync("web/pages/network/alarms.html", "utf8");
assert.match(alarms, /告警事件/);
assert.match(alarms, /阈值规则/);
assert.match(alarms, /network-rule-wizard|填写基本信息/);
assert.match(alarms, /选择发送方式/);
assert.match(alarms, /保存预览/);
assert.match(alarms, /周期性报警/);
assert.match(alarms, /站内信/);
assert.match(alarms, /请选择运算符/);
assert.match(alarms, /大于等于/);
assert.match(alarms, /data-multi-select="methods"|邮件/);
assert.match(alarms, /收件邮箱/);
assert.match(alarms, /data-email-field/);
assert.match(alarms, /处理确认/);
assert.match(alarms, /关闭原因/);
assert.match(alarms, /data-detail-tab="info"|报警信息/);
assert.match(alarms, /data-detail-tab="records"|处理记录/);
assert.doesNotMatch(alarms, /通知状态/);
assert.doesNotMatch(alarms, /处理中/);
assert.doesNotMatch(alarms, /持续报警合并报警一次|立即报警，不过滤/);
assert.doesNotMatch(alarms, /通知方式<\/button>|data-tab="notify"/);
assert.doesNotMatch(alarms, /可同步至「报警中心」/);

assert.match(menu, /network\.fault[\s\S]*hidden:\s*true/);

const sidebar = fs.readFileSync("app/components/sidebar.js", "utf8");
assert.match(sidebar, /network:\s*'/);

console.log("network pages static checks passed");
