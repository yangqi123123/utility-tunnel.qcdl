import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("permissions tabs ordered schedule → group → grant", async () => {
  const page = await read("web/pages/access-control/permissions.html");
  const schedules = page.indexOf('data-access-tab="schedules"');
  const groups = page.indexOf('data-access-tab="groups"');
  const grants = page.indexOf('data-access-tab="grants"');
  assert.ok(schedules > -1 && groups > -1 && grants > -1);
  assert.ok(schedules < groups && groups < grants);
  assert.match(page, /个人授权列表[\s\S]*用于检修\/访客/);
  assert.match(page, /data-action="sync-schedule"/);
  assert.match(page, /同步时间计划/);
  assert.match(page, /<!--[\s\S]*data-action="add-schedule"[\s\S]*-->/);
  assert.doesNotMatch(page, /权限判定顺序/);
  assert.doesNotMatch(page, /有效期/);
  assert.doesNotMatch(page, /节假日/);
});

test("schedule form supports daily weekly monthly modes", async () => {
  const script = await read("app/components/access-control.js");
  assert.match(script, /openScheduleForm/);
  assert.match(script, /每日/);
  assert.match(script, /每周/);
  assert.match(script, /每月/);
  assert.match(script, /data-sch-weekday/);
  assert.match(script, /data-sch-monthday/);
  assert.match(script, /access-schedule-window/);
  assert.match(script, /适用日期/);
  assert.doesNotMatch(script, /按住 Ctrl/);
  assert.doesNotMatch(script, /holiday|节假日/);
});

test("permission pickers and more menus are wired", async () => {
  const script = await read("app/components/access-control.js");
  assert.match(script, /openDevicePicker/);
  assert.match(script, /openMemberPicker/);
  assert.match(script, /data-group-door-select/);
  assert.match(script, /data-group-member-select/);
  assert.match(script, /data-grant-door-select/);
  assert.match(script, /data-grant-person-search/);
  assert.match(script, /data-action="sync-schedule"/);
  assert.match(script, /start-schedule-sync/);
  assert.match(script, /data-schedule-detail/);
  assert.match(script, /编辑\/删除入口暂隐藏[\s\S]*data-schedule-more/);
  assert.match(script, /data-group-more/);
  assert.match(script, /data-grant-more/);
  assert.match(script, /deleteSchedule/);
  assert.match(script, /该时间计划已关联权限组/);
  assert.match(script, /scheduleEchoMarkup/);
  assert.doesNotMatch(script, /periodStart|periodEnd/);
  assert.doesNotMatch(script, /个人授权用于检修\/访客等短期通行，不绑定时间计划；判定时优先于权限组/);
});

test("permissions requirement describes schedule one-way sync", async () => {
  const req = await read("app/components/requirement.js");
  assert.match(req, /docs\["access-control\.permissions"\]/);
  assert.match(req, /同步时间计划/);
  assert.match(req, /单向拉取时间计划/);
  assert.match(req, /不支持手工新增、编辑或删除时间计划/);
});

test("permission data closes group-schedule-grant loop", async () => {
  const data = await read("app/data/access-control-data.js");
  assert.match(data, /repeat:\s*"每周"/);
  assert.match(data, /memberIds:\s*\[/);
  assert.match(data, /doorIds:\s*\[/);
  assert.match(data, /scheduleId:\s*"SCH/);
  assert.doesNotMatch(data, /holiday:/);
  assert.doesNotMatch(data, /periodStart|periodEnd/);
  assert.doesNotMatch(data, /grants:[\s\S]*?schedule:/);
});
