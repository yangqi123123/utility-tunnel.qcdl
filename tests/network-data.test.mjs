import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("app/data/network-data.js", "utf8");
const sandbox = { window: {}, localStorage: (() => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
})() };
vm.runInNewContext(source, sandbox);
const API = sandbox.window.NETWORK_STORE;

test("exposes devices host topology alarms", () => {
  assert.ok(API.listDevices().length >= 3);
  assert.equal(API.getHost().cpu.usage, 35);
  assert.ok(API.listTopologyNodes().length >= 4);
  assert.ok(API.listAlarmEvents().length >= 1);
});

test("alarm rules persist enable toggle", () => {
  const rules = API.listAlarmRules();
  const id = rules[0].id;
  const before = rules[0].enabled;
  API.setRuleEnabled(id, !before);
  assert.equal(API.listAlarmRules().find((r) => r.id === id).enabled, !before);
  API.setRuleEnabled(id, before);
});

test("alarm events include fault and support process/close", () => {
  const events = API.listAlarmEvents();
  assert.ok(events.some((e) => e.type === "故障检测"));
  assert.ok(events.every((e) => ["告警", "预警", "提醒"].includes(e.level)));
  assert.ok(events.every((e) => ["未处理", "已处理"].includes(e.status)));
  const open = events.find((e) => e.status === "未处理");
  assert.ok(open);
  API.processAlarm(open.id, { handler: "运维甲", handledAt: "2026-10-15 12:00:00", remark: "已排查恢复" });
  const processed = API.listAlarmEvents().find((e) => e.id === open.id);
  assert.equal(processed.status, "已处理");
  assert.ok(processed.history.some((h) => h.action === "已排查恢复"));

  const open2 = API.listAlarmEvents().find((e) => e.status === "未处理");
  assert.ok(open2);
  API.closeAlarm(open2.id, { reason: "误报关闭" });
  const closed = API.listAlarmEvents().find((e) => e.id === open2.id);
  assert.equal(closed.status, "已处理");
  assert.equal(closed.closeReason, "误报关闭");
});

test("alarm rule CRUD", () => {
  const before = API.listAlarmRules().length;
  API.saveAlarmRule({
    name: "测试规则",
    metric: "cpu",
    operator: "大于等于",
    threshold: "99%",
    level: "提醒",
    filter: "periodic",
    period: 60,
    method: "站内信",
    departments: ["equipment"],
    people: ["zhao"],
    enabled: true,
  });
  assert.equal(API.listAlarmRules().length, before + 1);
  const created = API.listAlarmRules().find((r) => r.name === "测试规则");
  assert.ok(created);
  assert.equal(created.method, "站内信");
  assert.equal(created.operator, "大于等于");
  assert.equal(created.period, 60);
  API.deleteAlarmRule(created.id);
  assert.equal(API.listAlarmRules().length, before);
});

test("host summary matches host fields", () => {
  const s = API.getHostSummary();
  assert.equal(s.cpuUsage, 35);
  assert.equal(s.memUsage, 75);
  assert.ok(s.diskMax >= 90);
});
