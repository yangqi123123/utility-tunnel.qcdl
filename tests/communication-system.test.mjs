import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("communication-system is top-level after video-monitoring with children", async () => {
  const source = await read("app/config/menu.js");
  const videoIndex = source.indexOf('key: "video-monitoring"');
  const communicationIndex = source.indexOf('key: "communication-system"');
  assert.ok(videoIndex >= 0);
  assert.ok(communicationIndex > videoIndex);
  for (const key of [
    "communication.desk",
    "communication.devices",
    "communication.console",
    "communication.tasks",
    "communication.resources",
    "communication.logs",
    "communication.stats",
  ]) {
    assert.match(source, new RegExp(`key:\\s*["']${key}["']`));
  }
  assert.match(source, /key:\s*["']communication\.zones["'][\s\S]*?hidden:\s*true/);
  const subsystemsStart = source.indexOf('key: "subsystems"');
  assert.ok(subsystemsStart >= 0);
  const subsystemsSlice = source.slice(subsystemsStart, subsystemsStart + 2500);
  assert.equal(subsystemsSlice.includes('key: "communication-system"'), false);
});

test("communication pages exist with correct menu keys", async () => {
  const pages = [
    ["web/pages/communication/communication.html", "communication.desk"],
    ["web/pages/communication/devices.html", "communication.devices"],
    ["web/pages/communication/console.html", "communication.console"],
    ["web/pages/communication/tasks.html", "communication.tasks"],
    ["web/pages/communication/resources.html", "communication.resources"],
    ["web/pages/communication/logs.html", "communication.logs"],
    ["web/pages/communication/stats.html", "communication.stats"],
  ];
  for (const [path, key] of pages) {
    const html = await read(path);
    assert.match(html, new RegExp(`data-menu-key="${key}"`));
    assert.match(html, /class="app-shell"/);
  }
});

test("communication devices filter collapses second row like device list", async () => {
  const html = await read("web/pages/communication/devices.html");
  assert.match(html, /id="deviceFilterCard"/);
  assert.match(html, /id="deviceCollapse"/);
  assert.match(html, /extra-filter/);
  assert.match(html, /filterSmart/);
  assert.match(html, /filterSource/);
  const css = await read("web/assets/css/communication.css");
  assert.match(css, /\.communication-device-filter \.extra-filter\s*\{\s*display:\s*none/);
  assert.match(css, /\.communication-device-filter\.expanded \.extra-filter\s*\{\s*display:\s*block/);
  const js = await read("app/components/communication-devices.js");
  assert.match(js, /deviceCollapse/);
  assert.match(js, /classList\.toggle\("expanded"\)/);
});

test("broadcast console drops manual tab and priority field", async () => {
  const html = await read("web/pages/communication/console.html");
  assert.match(html, /服务器音乐/);
  assert.match(html, /HTTP流媒体/);
  assert.match(html, /TTS文本/);
  assert.equal(html.includes("人工广播"), false);
  assert.equal(html.includes("优先级"), false);
  assert.match(html, /data-terminal-select-host/);
  assert.match(html, /communication-terminal-select\.js/);
});

test("communication logs page has broadcast and calls tabs", async () => {
  const html = await read("web/pages/communication/logs.html");
  assert.match(html, /广播日志/);
  assert.match(html, /通话记录/);
  assert.match(html, /emergency-calls\.js/);
  assert.match(html, /id="callBody"/);
});

test("communication data store exposes devices zones queue channels", async () => {
  const source = await read("app/data/communication-data.js");
  for (const token of ["COMMUNICATION_STORE", "listDevices", "listZones", "listInboundQueue", "listChannels", "updateInboundStatus"]) {
    assert.match(source, new RegExp(token));
  }
});

test("communication desk layout drops queue and reuses command + logs", async () => {
  const html = await read("web/pages/communication/communication.html");
  assert.match(html, /emergency-data\.js/);
  assert.match(html, /communication-data\.js/);
  assert.match(html, /communication-desk\.js/);
  assert.match(html, /command-dispatch-panel\.js/);
  assert.match(html, /emergency-map\.js/);
  assert.match(html, /class="[^"]*\bdm-metrics\b[^"]*"/);
  assert.match(html, /id="deskCommandHost"/);
  assert.match(html, /id="deskMap"/);
  assert.match(html, /GIS地图/);
  assert.match(html, /id="layerDevices"/);
  assert.match(html, /id="layerResources"/);
  assert.match(html, /id="layerEvents"/);
  assert.match(html, /data-desk-map="fullscreen"/);
  assert.match(html, /id="recordBody"/);
  assert.match(html, /id="recordPager"/);
  assert.match(html, /logs\.html\?tab=calls/);
  assert.match(html, /emergency-events\.js/);
  assert.equal(html.includes("communication-page-head"), false);
  assert.equal(html.includes("data-desk-action=\"answer\""), false);
  assert.equal(html.includes("data-desk-action=\"hangup\""), false);
  assert.equal(html.includes("data-desk-action=\"callback\""), false);
  assert.equal(html.includes("id=\"callList\""), false);
  assert.equal(html.includes("通讯录快呼"), false);

  const desk = await read("app/components/communication-desk.js");
  assert.match(desk, /mountCommandDispatchPanel/);
  assert.match(desk, /listCalls/);
  assert.match(desk, /deviceStats/);
  assert.match(desk, /EMERGENCY_MAP/);
  assert.match(desk, /headerExtra/);
  assert.match(desk, /to-dispatch/);
  assert.match(desk, /openVideoModal|视频预览/);
  assert.match(desk, /openPersonnelDetail|应急通讯录/);
  assert.match(desk, /openResourceDetail|物资详情/);
  assert.match(desk, /openEventDetail|应急事件详情/);
  assert.match(desk, /通话详情/);
  assert.match(desk, /call-recording-mock/);
  assert.match(desk, /fullscreen/);
  assert.equal(desk.includes("listInboundQueue"), false);
  assert.equal(desk.includes("data-desk-action=\"answer\"") || /function answer\(/.test(desk), false);
});

test("communication logs supports tab=calls deep link", async () => {
  const html = await read("web/pages/communication/logs.html");
  assert.match(html, /activateLogTab/);
  assert.match(html, /URLSearchParams\(location\.search\)\.get\("tab"\)/);
});
