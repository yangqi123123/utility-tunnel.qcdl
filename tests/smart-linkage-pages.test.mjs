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

test("联动管理系统含智能联动与联动执行台且位于联动记录上方", async () => {
  const menu = await read("app/config/menu.js");
  assert.match(menu, /key:\s*"linkage\.smart"/);
  assert.match(menu, /label:\s*"智能联动"/);
  assert.match(menu, /linkage\/smart\.html/);
  assert.match(menu, /key:\s*"linkage\.execute"/);
  assert.match(menu, /label:\s*"联动执行台"/);
  assert.match(menu, /smart-linkage\/execute\.html/);

  const smartIdx = menu.indexOf('key: "linkage.smart"');
  const execIdx = menu.indexOf('key: "linkage.execute"');
  const recordsIdx = menu.indexOf('key: "linkage.records"');
  assert.ok(smartIdx >= 0 && execIdx > smartIdx && recordsIdx > execIdx);

  assert.doesNotMatch(menu, /key:\s*"smart-linkage"/);
  assert.doesNotMatch(menu, /label:\s*"指令审计"/);
  assert.doesNotMatch(menu, /label:\s*"预案执行台"/);
});

test("智能联动规则页含三步向导与手动执行跳转", async () => {
  assert.equal(await exists("web/pages/linkage/smart.html"), true);
  const page = await read("web/pages/linkage/smart.html");
  assert.match(page, /data-menu-key="linkage\.smart"/);
  assert.match(page, /基本信息/);
  assert.match(page, /联动规则/);
  assert.match(page, /保存预览/);
  assert.match(page, /触发条件/);
  assert.match(page, /执行模式/);
  assert.match(page, /手动执行/);
  assert.match(page, /自动执行/);
  assert.match(page, /data-rule-action="execute"/);
  assert.match(page, /smart-linkage\/execute\.html/);
  assert.match(page, /data-cascade="project"/);
  assert.match(page, /data-cascade="corridor"/);
  assert.match(page, /data-cascade="cabin"/);
  assert.match(page, /data-cascade="section"/);
  assert.match(page, /data-cascade="pipeline"/);
  assert.match(page, /data-trigger-action="add"/);
  assert.match(page, /满足以下任一条件/);
  assert.match(page, /满足以下全部条件/);
  assert.match(page, /添加条件/);
  assert.match(page, /条件至多可添加五项/);
  assert.match(page, /执行时长/);
  assert.match(page, /持续至触发条件解除/);
  assert.match(page, /自定义/);
  assert.match(page, />min</);
  assert.match(page, /sl-duration-wrap/);
  assert.match(page, /resolveExecTime|execTime === "自定义"/);
  assert.match(page, /请先选择设备/);
  assert.match(page, /在什么场景/);
  assert.match(page, /什么条件触发/);
});

test("联动执行台承接智能联动规则并形成执行闭环", async () => {
  assert.equal(await exists("web/pages/smart-linkage/execute.html"), true);
  const page = await read("web/pages/smart-linkage/execute.html");
  assert.match(page, /data-menu-key="linkage\.execute"/);
  assert.match(page, /联动执行台/);
  assert.match(page, /SMART_LINKAGE_DATA/);
  assert.match(page, /id="planStepList"/);
  assert.match(page, /id="ruleSelect"/);
  assert.match(page, /ruleId/);
  assert.match(page, /ruleResults|linkageRules/);
  assert.match(page, /SMART_LINKAGE_RUNS/);
  assert.match(page, /返回智能联动/);
  assert.match(page, /载入联动/);
  assert.doesNotMatch(page, /模拟双人授权|dualAuth/);
  assert.doesNotMatch(page, /承接智能联动/);
  assert.match(page, /startStepCountdown|demoSeconds|countdown/);
  assert.match(page, /openAppConfirm/);
  assert.match(page, /data-video-fs|openVideoFullscreen/);
  assert.match(page, /is-hidden|stepToolbar/);
  assert.match(page, /corridor-monitor\.jpg|access-gate\.jpg/);
});

test("联动记录页含联动记录与操作日志双 Tab", async () => {
  assert.equal(await exists("web/pages/linkage/records.html"), true);
  const page = await read("web/pages/linkage/records.html");
  assert.match(page, /data-linkage-tab="records"/);
  assert.match(page, /data-linkage-tab="oplog"/);
  assert.match(page, /操作日志/);
  assert.match(page, /id="oplogTableBody"/);
  assert.match(page, /操作人/);
  assert.match(page, /操作时间/);

  const script = await read("app/components/linkage-records.js");
  assert.match(script, /SMART_LINKAGE_OP_LOGS|operationLogs/);
  assert.match(script, /switchTab|data-linkage-tab/);

  const data = await read("app/data/linkage-data.js");
  assert.match(data, /operationLogs/);
  assert.match(data, /手动执行/);
});

test("共享数据含联动规则与火灾预案步骤", async () => {
  const data = await read("app/data/smart-linkage-data.js");
  assert.match(data, /linkageRules/);
  assert.match(data, /甲烷/);
  assert.match(data, /手动执行/);
  assert.match(data, /START_EXTINGUISH|启动本区灭火/);
  assert.match(data, /spatialTree/);
  assert.match(data, /pipelines/);
  assert.match(data, /deviceCatalog/);
  assert.match(data, /triggers/);
  assert.match(data, /results/);
  assert.match(data, /本区灭火装置/);
});
