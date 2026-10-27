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

test("菜单顺序：监测→设备→算法→布控→联动→报警", async () => {
  const menu = await read("app/config/menu.js");
  const blockStart = menu.indexOf('key: "intrusion-alarm"');
  const blockEnd = menu.indexOf('key: "access-control"', blockStart);
  const block = menu.slice(blockStart, blockEnd);
  const order = [
    "intrusion-alarm.monitor",
    "intrusion-alarm.devices",
    "intrusion-alarm.algorithms",
    "intrusion-alarm.deployments",
    "intrusion-alarm.linkage",
    "intrusion-alarm.alarms",
  ];
  let last = -1;
  for (const key of order) {
    const idx = block.indexOf(key);
    assert.ok(idx > last, `missing or out of order: ${key}`);
    last = idx;
  }
  assert.match(block, /label:\s*"算法管理"/);
  assert.match(block, /label:\s*"布控管理"/);
  assert.match(block, /intrusion-algorithms\.html/);
  assert.match(block, /intrusion-deployments\.html/);
});

test("AI 数据与页面文件存在", async () => {
  assert.equal(await exists("app/data/intrusion-ai-data.js"), true);
  assert.equal(await exists("web/pages/monitoring/intrusion-algorithms.html"), true);
  assert.equal(await exists("web/pages/monitoring/intrusion-deployments.html"), true);
  assert.equal(await exists("web/pages/monitoring/intrusion-deployment-form.html"), true);
  assert.equal(await exists("web/pages/monitoring/intrusion-deployment-player.html"), true);
  assert.equal(await exists("web/assets/css/intrusion-ai.css"), true);
  const data = await read("app/data/intrusion-ai-data.js");
  assert.match(data, /AI_ALGORITHMS/);
  assert.match(data, /AI_DEPLOYMENTS/);
  assert.match(data, /AI_ALARM_CLIPS/);
  assert.match(data, /window\.INTRUSION_AI_DATA/);
});

test("算法页为抽屉表单", async () => {
  const page = await read("web/pages/monitoring/intrusion-algorithms.html");
  assert.match(page, /data-menu-key="intrusion-alarm\.algorithms"/);
  assert.match(page, /openAppDrawer/);
  assert.match(page, /intrusion-ai-data\.js/);
  assert.match(page, /算法编号/);
  assert.match(page, /API请求地址|API Key/);
  assert.match(page, /algo-tag-editor|data-tag-add/);
  assert.match(page, /status-danger/);
  assert.match(page, /openAppConfirm/);
  assert.match(page, /isReferenced|布控管理引用/);
});

test("布控表单含搜索选择与画框，列表含执行取消", async () => {
  const list = await read("web/pages/monitoring/intrusion-deployments.html");
  const form = await read("web/pages/monitoring/intrusion-deployment-form.html");
  const player = await read("web/pages/monitoring/intrusion-deployment-player.html");
  assert.match(list, /data-action="toggle-run"/);
  assert.match(list, /执行布控|取消布控/);
  assert.match(list, /布控编号/);
  assert.match(list, /算法流/);
  assert.match(list, /dep-status-tag/);
  assert.match(list, /intrusion-deployment-form\.html/);
  assert.match(list, /intrusion-deployment-player\.html/);
  assert.doesNotMatch(list, /流媒体运行中/);
  assert.match(form, /data-camera-search/);
  assert.match(form, /data-region-poly|data-region-svg/);
  assert.match(form, /暂无视频，请选择视频流/);
  assert.match(form, /框选布防区域/);
  assert.match(form, /清空算法识别区域/);
  assert.match(form, /选择目标/);
  assert.match(form, /deploy-form-scroll/);
  assert.match(player, /data-region-poly|data-region-overlay/);
  assert.match(player, /det-box|is-danger/);
});

test("报警记录双视图与关键帧", async () => {
  const page = await read("web/pages/monitoring/intrusion-alarms.html");
  assert.match(page, /data-alarm-view="list"/);
  assert.match(page, /data-alarm-view="video"/);
  assert.match(page, /AI_ALARM_CLIPS|INTRUSION_AI_DATA/);
  assert.match(page, /alarm-view-tabs-bar/);
  assert.match(page, /annotatedFrameMarkup|alarm-annot-thumb/);
  assert.match(page, /det-box is-danger/);
  assert.match(page, /corridor-monitor\.jpg/);
  assert.match(page, /data-action="card-more"|card-fullscreen/);
  assert.match(page, /videoActionMarkup/);
  assert.match(page, /alarm-keyframe|keyframeUrl/);
  assert.match(page, /data-action="download-clip"|download-clip/);
});
