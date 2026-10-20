(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.INSPECTION_STATS_LOGIC = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const GRACE_MINUTES = 15;
  const SUBMITTED_STATUSES = ["验收中", "已完成"];
  const MISS_STATUSES = ["待巡检", "巡检中"];
  const DEMO_NOW = new Date("2026-10-04T12:00:00");

  function parseDate(value) {
    if (value == null || value === "" || value === "-") return null;
    const date = new Date(String(value).replace(/-/g, "/"));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function judgeExecution(task, nowInput) {
    const now = nowInput instanceof Date ? nowInput : parseDate(nowInput) || DEMO_NOW;
    const plannedAt = parseDate(task?.plannedAt);
    const startedAt = parseDate(task?.startedAt);
    const deadline = parseDate(task?.deadline);
    const status = task?.status || "";

    if (startedAt && plannedAt) {
      const latestStart = new Date(plannedAt.getTime() + GRACE_MINUTES * 60 * 1000);
      return startedAt.getTime() <= latestStart.getTime() ? "正点" : "误点";
    }
    // 已关闭不计入漏检；仅待巡检/巡检中且已过截止视为漏检
    if (deadline && now > deadline && MISS_STATUSES.includes(status)) {
      return "漏检";
    }
    return "未判定";
  }

  function pct(num, den) {
    if (!den) return "0%";
    return `${Math.round((num / den) * 100)}%`;
  }

  function summarize(tasks, nowInput) {
    const now = nowInput instanceof Date ? nowInput : DEMO_NOW;
    const rows = (tasks || []).map((task) => ({
      ...task,
      executionJudge: judgeExecution(task, now),
    }));
    const judged = rows.filter((row) => ["正点", "误点", "漏检"].includes(row.executionJudge));
    const onTime = judged.filter((row) => row.executionJudge === "正点").length;
    const late = judged.filter((row) => row.executionJudge === "误点").length;
    const missed = judged.filter((row) => row.executionJudge === "漏检").length;
    const completed = rows.filter((row) => row.status === "已完成").length;
    const abnormalEvents = rows.reduce((sum, row) => {
      if (Number(row.abnormalCount) > 0) return sum + Number(row.abnormalCount);
      return sum + (Array.isArray(row.abnormalReports) ? row.abnormalReports.length : 0);
    }, 0);
    const planDone = rows.filter((row) => row.planId && row.status === "已完成").length;
    return {
      rows,
      total: rows.length,
      onTime,
      late,
      missed,
      judgedCount: judged.length,
      onTimeRate: pct(onTime, judged.length),
      lateRate: pct(late, judged.length),
      completeRate: pct(completed, rows.length),
      abnormalEvents,
      planExecRate: pct(planDone, rows.length),
    };
  }

  return {
    GRACE_MINUTES,
    DEMO_NOW,
    SUBMITTED_STATUSES,
    MISS_STATUSES,
    parseDate,
    judgeExecution,
    pct,
    summarize,
  };
});
