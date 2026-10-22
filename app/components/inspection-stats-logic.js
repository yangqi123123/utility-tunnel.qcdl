(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.INSPECTION_STATS_LOGIC = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const OPEN_STATUSES = ["待巡检", "巡检中"];
  const DEMO_NOW = new Date("2026-10-04T12:00:00");

  function parseDate(value) {
    if (value == null || value === "" || value === "-") return null;
    const date = new Date(String(value).replace(/-/g, "/"));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function isOverdue(task, nowInput) {
    if (task?.overdue === "已逾期") return true;
    if (task?.overdue === "未逾期" || task?.overdue === "未超期") return false;
    const now = nowInput instanceof Date ? nowInput : parseDate(nowInput) || DEMO_NOW;
    const deadline = parseDate(task?.deadline);
    const status = task?.status || "";
    return !!(deadline && now > deadline && OPEN_STATUSES.includes(status));
  }

  /** 正点=未逾期，误点=已逾期；不再使用漏检口径 */
  function judgeExecution(task, nowInput) {
    return isOverdue(task, nowInput) ? "误点" : "正点";
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
    const judged = rows.filter((row) => ["正点", "误点"].includes(row.executionJudge));
    const onTime = judged.filter((row) => row.executionJudge === "正点").length;
    const late = judged.filter((row) => row.executionJudge === "误点").length;
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
      judgedCount: judged.length,
      onTimeRate: pct(onTime, judged.length),
      lateRate: pct(late, judged.length),
      completeRate: pct(completed, rows.length),
      abnormalEvents,
      planExecRate: pct(planDone, rows.length),
    };
  }

  return {
    DEMO_NOW,
    OPEN_STATUSES,
    parseDate,
    isOverdue,
    judgeExecution,
    pct,
    summarize,
  };
});
