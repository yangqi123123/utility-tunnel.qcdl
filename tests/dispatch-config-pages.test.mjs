import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("menu exposes dispatch under work-order after category", async () => {
  const source = await read("app/config/menu.js");
  const categoryIndex = source.indexOf('key: "work-order.category"');
  const dispatchIndex = source.indexOf('key: "work-order.dispatch"');
  assert.ok(categoryIndex >= 0);
  assert.ok(dispatchIndex > categoryIndex);
  assert.match(source, /dispatch-config\.html/);
});

test("dispatch-config data exposes store helpers", async () => {
  const source = await read("app/data/dispatch-config-data.js");
  assert.match(source, /DISPATCH_CONFIG_DATA/);
  assert.match(source, /saveTab/);
  assert.match(source, /peopleOfDepartments/);
  assert.match(source, /work-order\.dispatch-config\.v1/);
  assert.match(source, /emergency:\s*Object\.assign\(defaultConfig\(\),\s*parsed\.emergency/);
  assert.match(source, /next\.dispatchEnabled\s*=\s*true/);
  assert.match(source, /acceptorType/);
  assert.match(source, /acceptorIds/);
  assert.match(source, /ccAcceptor/);
});

test("dispatch-config page wires menu key and assets", async () => {
  const source = await read("web/pages/work-order/dispatch-config.html");
  assert.match(source, /data-menu-key="work-order\.dispatch"/);
  assert.match(source, /dispatch-config\.css/);
  assert.match(source, /dispatch-config-data\.js/);
  assert.match(source, /dispatch-config\.js/);
  assert.match(source, /data-dispatch-tab="repair"/);
  assert.match(source, /data-dispatch-tab="device"/);
  assert.match(source, /data-dispatch-tab="emergency"/);
  assert.match(source, /应急事件/);
  assert.match(source, /工单指派人/);
  assert.match(source, /name="acceptorType"/);
  assert.match(source, /data-field="ccAcceptor"/);
  assert.match(source, />验收人</);
  assert.match(source, /data-open-person-picker="otherCcIds"/);
  assert.doesNotMatch(source, /data-field="dispatchEnabled"/);
  assert.doesNotMatch(source, /工单调度人/);
  assert.doesNotMatch(source, /name="acceptor"/);
  assert.doesNotMatch(source, /data-multi-select="otherCcIds"/);
  assert.doesNotMatch(source, /投诉建议|公区报修|室内报修|当日值班人员/);
});

test("dispatch-config component covers tab isolation and tag cascade", async () => {
  const source = await read("app/components/dispatch-config.js");
  assert.match(source, /requestTabSwitch|有未保存的修改/);
  assert.match(source, /peopleOfDepartments|prunePeople/);
  assert.match(source, /保存成功/);
  assert.match(source, /startTime/);
  assert.match(source, /openPersonPicker|inspection-person-mask/);
  assert.match(source, /acceptorIds/);
  assert.match(source, /请选择\$\{entityNoun\(\)\}指派人/);
  assert.doesNotMatch(source, /当日值班人员/);
});

test("dispatch-config page opens person picker for assignee and acceptor", async () => {
  const source = await read("web/pages/work-order/dispatch-config.html");
  assert.match(source, /data-open-person-picker="dispatcherIds"/);
  assert.match(source, /data-open-person-picker="acceptorIds"/);
  assert.match(source, /inspection\.css/);
  assert.match(source, /data-dispatcher-user-field/);
  assert.match(source, /data-acceptor-user-field/);
});

test("emergency tab swaps 工单 labels to 事件", async () => {
  const html = await read("web/pages/work-order/dispatch-config.html");
  const js = await read("app/components/dispatch-config.js");
  assert.match(html, /data-biz-label="指派人"/);
  assert.match(html, /data-biz-label="验收人"/);
  assert.match(html, /data-biz-label="抄送人"/);
  assert.match(html, /data-biz-assign-hint/);
  assert.match(js, /entityNoun|renderBizLabels/);
  assert.match(js, /state\.tab === "emergency" \? "事件" : "工单"/);
  assert.match(js, /请选择\$\{entityNoun\(\)\}指派人/);
});
