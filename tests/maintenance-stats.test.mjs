import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const logic = require("../app/components/maintenance-stats-logic.js");

const now = new Date("2026-10-04T12:00:00");

test("judgeExecution marks on-time when not overdue", () => {
  assert.equal(
    logic.judgeExecution(
      { overdue: "未逾期", plannedAt: "2026-09-09 09:00:00", startedAt: "2026-09-09 09:20:00", deadline: "2026-09-10 09:00:00", status: "保养中" },
      now,
    ),
    "正点",
  );
});

test("judgeExecution marks late when overdue", () => {
  assert.equal(
    logic.judgeExecution(
      { overdue: "已逾期", plannedAt: "2026-09-09 09:00:00", startedAt: "2026-09-09 09:05:00", deadline: "2026-09-10 09:00:00", status: "保养中" },
      now,
    ),
    "误点",
  );
});

test("judgeExecution marks late when past deadline without submit", () => {
  assert.equal(
    logic.judgeExecution(
      { plannedAt: "2026-10-02 09:00:00", startedAt: "-", deadline: "2026-10-03 09:00:00", status: "待保养" },
      now,
    ),
    "误点",
  );
});

test("judgeExecution marks on-time before deadline without start", () => {
  assert.equal(
    logic.judgeExecution(
      { plannedAt: "2026-10-05 09:00:00", startedAt: "-", deadline: "2026-10-06 09:00:00", status: "待保养" },
      now,
    ),
    "正点",
  );
});

test("judgeExecution does not treat closed tasks as late by deadline alone", () => {
  assert.equal(
    logic.judgeExecution(
      { plannedAt: "2026-09-09 09:00:00", startedAt: "-", deadline: "2026-09-10 09:00:00", status: "已关闭" },
      now,
    ),
    "正点",
  );
});

test("summarize computes rates from on-time and late only", () => {
  const summary = logic.summarize(
    [
      { overdue: "未逾期", plannedAt: "2026-09-09 09:00:00", startedAt: "2026-09-09 09:05:00", deadline: "2026-09-10 09:00:00", status: "已完成", planId: "P1", abnormalCount: 0 },
      { overdue: "已逾期", plannedAt: "2026-09-09 09:00:00", startedAt: "2026-09-09 09:30:00", deadline: "2026-09-10 09:00:00", status: "已完成", planId: "P1", abnormalCount: 2 },
      { plannedAt: "2026-10-02 09:00:00", startedAt: "-", deadline: "2026-10-03 09:00:00", status: "待保养", planId: "P1", abnormalCount: 0 },
    ],
    now,
  );
  assert.equal(summary.onTime, 1);
  assert.equal(summary.late, 2);
  assert.equal(summary.missed, undefined);
  assert.equal(summary.onTimeRate, "33%");
  assert.equal(summary.lateRate, "67%");
  assert.equal(summary.abnormalEvents, 2);
});

test("exports OPEN_STATUSES without miss labels", () => {
  assert.equal(logic.OPEN_STATUSES.includes("待保养"), true);
  assert.equal(logic.OPEN_STATUSES.includes("保养中"), true);
  assert.equal(logic.OPEN_STATUSES.includes("待巡检"), false);
  assert.equal(logic.GRACE_MINUTES, undefined);
});
