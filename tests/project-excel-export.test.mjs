import assert from "node:assert/strict";
import fs from "node:fs";

const projectPage = fs.readFileSync("web/pages/project/project-management.html", "utf8");
const corridorPage = fs.readFileSync("web/pages/project/building.html", "utf8");

const projectHeaders = [
  "项目编码", "项目名称", "项目简称", "项目类型", "项目状态", "所在区域",
  "项目地址", "详细地址", "经度", "纬度", "建设单位", "设计单位", "施工单位",
  "监理单位", "运营单位", "项目负责人", "联系电话", "舱室数量", "管廊数量",
  "区段数量", "管线数量", "设备数量", "建设开始日期", "计划完工日期",
  "实际完工日期", "最后更新时间", "项目简介",
];

const corridorHeaders = [
  "管廊编码", "管廊名称", "所属项目", "管廊类型", "总长度（m）", "舱室数量",
  "区段数量", "管线数量", "设备数量", "运行状态", "责任单位", "管廊负责人",
  "投运日期", "起点", "终点", "设计等级", "断面类型", "结构类型",
  "建设单位", "运营单位", "备注",
];

assert.match(projectPage, /xlsx\.full\.min\.js/);
assert.match(projectPage, /function exportProjects\s*\(/);
assert.match(projectPage, /项目管理\.xlsx/);
assert.doesNotMatch(projectPage, /已按当前筛选条件生成项目列表导出任务/);
for (const h of projectHeaders) assert.match(projectPage, new RegExp(h.replace(/[()（）]/g, "\\$&")));

assert.match(corridorPage, /xlsx\.full\.min\.js/);
assert.match(corridorPage, /function exportCorridors\s*\(/);
assert.match(corridorPage, /管廊管理\.xlsx/);
assert.doesNotMatch(corridorPage, /已按当前筛选条件生成管廊列表导出任务/);
for (const h of corridorHeaders) assert.match(corridorPage, new RegExp(h.replace(/[()（）]/g, "\\$&")));

console.log("project excel export static checks passed");
