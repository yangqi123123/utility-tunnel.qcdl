import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const logic = require("../app/components/inspection-stats-logic.js");

const now = new Date("2026-10-04T12:00:00");

test("judgeExecution marks on-time within grace window", () => {
  assert.equal(
    logic.judgeExecution(
      { plannedAt: "2026-09-09 09:00:00", startedAt: "2026-09-09 09:10:00", deadline: "2026-09-10 09:00:00", status: "巡检中" },
      now,
    ),
    "正点",
  );
});

test("judgeExecution marks late after grace window", () => {
  assert.equal(
    logic.judgeExecution(
      { plannedAt: "2026-09-09 09:00:00", startedAt: "2026-09-09 09:20:00", deadline: "2026-09-10 09:00:00", status: "巡检中" },
      now,
    ),
    "误点",
  );
});

test("judgeExecution marks miss when past deadline without submit", () => {
  assert.equal(
    logic.judgeExecution(
      { plannedAt: "2026-10-02 09:00:00", startedAt: "-", deadline: "2026-10-03 09:00:00", status: "待巡检" },
      now,
    ),
    "漏检",
  );
});

test("judgeExecution marks pending before deadline without start", () => {
  assert.equal(
    logic.judgeExecution(
      { plannedAt: "2026-10-05 09:00:00", startedAt: "-", deadline: "2026-10-06 09:00:00", status: "待巡检" },
      now,
    ),
    "未判定",
  );
});

test("judgeExecution does not treat closed tasks as miss", () => {
  assert.equal(
    logic.judgeExecution(
      { plannedAt: "2026-09-09 09:00:00", startedAt: "-", deadline: "2026-09-10 09:00:00", status: "已关闭" },
      now,
    ),
    "未判定",
  );
});

test("summarize computes rates from judged set", () => {
  const summary = logic.summarize(
    [
      { plannedAt: "2026-09-09 09:00:00", startedAt: "2026-09-09 09:05:00", deadline: "2026-09-10 09:00:00", status: "已完成", planId: "P1", abnormalCount: 0 },
      { plannedAt: "2026-09-09 09:00:00", startedAt: "2026-09-09 09:30:00", deadline: "2026-09-10 09:00:00", status: "已完成", planId: "P1", abnormalCount: 2 },
      { plannedAt: "2026-10-02 09:00:00", startedAt: "-", deadline: "2026-10-03 09:00:00", status: "待巡检", planId: "P1", abnormalCount: 0 },
    ],
    now,
  );
  assert.equal(summary.onTime, 1);
  assert.equal(summary.late, 1);
  assert.equal(summary.missed, 1);
  assert.equal(summary.onTimeRate, "33%");
  assert.equal(summary.lateRate, "33%");
  assert.equal(summary.abnormalEvents, 2);
});
