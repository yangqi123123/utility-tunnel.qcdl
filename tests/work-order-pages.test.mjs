import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("menu exposes work-order after inspection", async () => {
  const source = await read("app/config/menu.js");
  const inspectionIndex = source.indexOf('key: "inspection"');
  const workOrderIndex = source.indexOf('key: "work-order"');
  assert.ok(inspectionIndex >= 0);
  assert.ok(workOrderIndex > inspectionIndex);
  assert.match(source, /work-order\.report-repair/);
  assert.match(source, /work-order\.device-abnormal/);
  assert.match(source, /work-order\.category/);
  const repair = source.indexOf("work-order.report-repair");
  const device = source.indexOf("work-order.device-abnormal");
  const category = source.indexOf("work-order.category");
  assert.ok(repair < device && device < category);
});

test("work-order data exposes store and fixtures", async () => {
  const source = await read("app/data/work-order-data.js");
  assert.match(source, /WORK_ORDER_DATA/);
  assert.match(source, /WORK_ORDER_STORE/);
  assert.match(source, /seedCategories|categories/);
  assert.match(source, /locationTree/);
  assert.match(source, /personnel/);
  assert.match(source, /bizType/);
  assert.match(source, /abnormalDevice/);
  assert.match(source, /工单列表每次刷新回到种子初始状态/);
  assert.match(source, /seedOrders\.map\(cloneSeedOrder\)/);
  assert.match(source, /work-order\.pending\.abnormal/);
  assert.match(source, /workItems/);
});

test("device-abnormal seed has one order per status", async () => {
  const source = await read("app/data/work-order-data.js");
  const statuses = ["待指派", "待处理", "处理中", "验收中", "已完成", "已撤回"];
  for (const status of statuses) {
    assert.match(source, new RegExp(`bizType:\\s*"设备异常"[\\s\\S]*?status:\\s*"${status}"`));
  }
  assert.match(source, /WO-D-001/);
  assert.match(source, /WO-D-002/);
  assert.match(source, /WO-D-003/);
  assert.match(source, /WO-D-004/);
  assert.match(source, /WO-D-005/);
  assert.match(source, /WO-D-006/);
});

test("assign drawer labels assignee as task executor", async () => {
  const source = await read("app/components/work-order.js");
  assert.match(source, /任务执行人/);
  assert.match(source, /请选择任务执行人/);
  assert.doesNotMatch(source, /form-required">指派人</);
});

const pages = [
  ["report-repair", "work-order.report-repair", "报事报修", "workOrderBody"],
  ["device-abnormal", "work-order.device-abnormal", "设备异常", "workOrderBody"],
  ["category", "work-order.category", "分类维护", "categoryBody"],
];

for (const [page, key, title, bodyId] of pages) {
  test(`${page} page uses the shared work-order shell`, async () => {
    const source = await read(`web/pages/work-order/${page}.html`);
    assert.match(source, /class="app-shell"/);
    assert.match(source, new RegExp(`data-menu-key="${key.replace(".", "\\.")}"`));
    assert.match(source, new RegExp(`<title>${title}`));
    assert.match(source, /inspection\.css/);
    assert.match(source, /work-order\.css/);
    assert.match(source, /work-order-data\.js/);
    assert.match(source, /work-order\.js/);
    assert.match(source, new RegExp(`id="${bodyId}"`));
  });
}

test("device-abnormal page hides create and shows abnormal device column", async () => {
  const source = await read("web/pages/work-order/device-abnormal.html");
  assert.doesNotMatch(source, /data-wo-action="create"/);
  assert.match(source, /异常设备/);
  assert.match(source, /异常等级/);
  assert.match(source, /data-work-order-page="device-abnormal"/);
});
