import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const pages = ["dispatch", "events", "risks", "resources", "personnel", "calls"];

test("menu exposes emergency management as a top-level item", async () => {
  const source = await read("app/config/menu.js");
  assert.match(source, /key:\s*"emergency"[\s\S]*label:\s*"应急管理系统"/);
  for (const page of pages) assert.match(source, new RegExp(`emergency\\.${page}`));
  assert.match(source, /label:\s*"风险预警分析"/);
  assert.match(source, /label:\s*"应急通讯录"/);
  assert.doesNotMatch(source, /emergency\.plans/);
  // 通话记录在风险预警分析之前
  const callsIdx = source.indexOf('label: "通话记录"');
  const riskIdx = source.indexOf('label: "风险预警分析"');
  assert.ok(callsIdx > -1 && riskIdx > -1 && callsIdx < riskIdx, "风险预警分析应在通话记录下方");
});

test("sidebar provides an emergency navigation icon", async () => {
  const source = await read("app/components/sidebar.js");
  assert.match(source, /emergency:\s*['"][\s\S]*?<path/);
});

for (const page of pages) {
  test(`${page} page uses the shared app shell`, async () => {
    const source = await read(`web/pages/emergency/${page}.html`);
    assert.match(source, /class="app-shell"/);
    assert.match(source, new RegExp(`data-menu-key="emergency\\.${page}"`));
    assert.match(source, /emergency-data\.js/);
    assert.match(source, /emergency-common\.js/);
  });
}

test("risks page is read-only analysis dashboard", async () => {
  const page = await read("web/pages/emergency/risks.html");
  const script = await read("app/components/emergency-risk-analysis.js");
  assert.match(page, /风险预警分析/);
  assert.match(page, /emergency-risk-analysis\.js/);
  assert.match(page, /id="riskAnalysisKpis"/);
  assert.match(page, /id="chartRiskLevel"/);
  assert.match(page, /风险类型分析/);
  assert.match(page, /id="analysisProject"/);
  assert.match(page, /id="chartRiskTrend"/);
  assert.match(page, /id="chartEventStatus"/);
  assert.match(script, /完成率|通话总时长|低库存（小于5）|事件总数/);
  assert.match(page, /id="chartResourceCategory"/);
  assert.match(page, /id="chartPersonnelType"/);
  assert.match(page, /id="chartPlanType"/);
  assert.match(page, /id="chartCallTrend"/);
  assert.doesNotMatch(page, /新增人工评估|data-risk-action="create"/);
  assert.doesNotMatch(page, /转应急事件|saveRisk/);
  assert.match(script, /listRisks|listEvents|listResources|listPersonnel|listPlans|listCalls/);
  assert.doesNotMatch(script, /saveRisk|转应急事件/);
});

test("dispatch console uses three-column layout with right modes", async () => {
  // 断言对齐当前 ds-* 调度台骨架（已非 dispatch-workspace-v2 / view-*-dist）
  const page = await read("web/pages/emergency/dispatch.html");
  const script = await read("app/components/emergency-dispatch.js");
  assert.match(page, /ds-root/);
  assert.match(page, /ds-left/);
  assert.match(page, /ds-right|dispatchRightPanel/);
  assert.match(page, /data-right-mode="video"/);
  assert.match(page, /data-right-mode="resources"/);
  assert.match(page, /data-right-mode="personnel"/);
  assert.match(page, /data-right-mode="plan"/);
  assert.match(page, /data-dispatch-action="open-voice-dispatch"/);
  assert.match(page, /data-right-mode="command"/); // 注释保留，便于恢复内嵌指挥调度
  assert.doesNotMatch(page, /dispatch-bottom-panel/);
  assert.match(script, /renderRightVideo|renderRightResources|renderRightPersonnel|renderRightPlan/);
  assert.match(script, /open-voice-dispatch|voice-dispatch\.html/);
  assert.match(script, /function renderRightCommand/); // 注释保留原内嵌实现
});
