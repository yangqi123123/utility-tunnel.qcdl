import assert from "node:assert/strict";
import fs from "node:fs";

const overview = fs.readFileSync("web/pages/network/overview.html", "utf8");
assert.match(overview, /data-menu-key="network\.overview"/);
assert.match(overview, /data-page-section="网络管理"/);
assert.match(overview, /data-page-title="监控总览"/);
assert.match(overview, /network-data\.js/);
assert.match(overview, /受监控设备|当前网络流量|平均链路延迟/);
assert.match(overview, /服务主机摘要|host\.html/);
assert.match(overview, /alarms\.html/);
assert.doesNotMatch(overview, /安装路径/);
assert.match(fs.readFileSync("web/assets/css/network.css", "utf8"), /network-host-summary/);
console.log("task3 overview checks passed");
