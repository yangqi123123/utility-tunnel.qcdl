(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.LINKAGE_ANALYSIS_LOGIC = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const RESULTS = ["成功", "部分成功", "失败"];

  function parseDate(value) {
    if (!value) return null;
    const date = new Date(String(value).replace(/-/g, "/"));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function rangeBounds(state, now = new Date()) {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    if (state.range === "custom") {
      const start = parseDate(state.start) || new Date(end.getTime() - 29 * 86400000);
      start.setHours(0, 0, 0, 0);
      const customEnd = parseDate(state.end) || end;
      customEnd.setHours(23, 59, 59, 999);
      return { start, end: customEnd };
    }
    const days = Number(state.range) || 30;
    const start = new Date(end.getTime() - (days - 1) * 86400000);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  function filterRecords(records, state, now = new Date()) {
    const { start, end } = rangeBounds(state, now);
    return (records || []).filter((item) => {
      const t = parseDate(item.startTime);
      if (!t || t < start || t > end) return false;
      if (state.project && item.project !== state.project) return false;
      if (state.corridor && item.corridor !== state.corridor) return false;
      if (state.room && item.room !== state.room) return false;
      if (state.section && item.section !== state.section) return false;
      if (state.pipeline && item.pipeline !== state.pipeline) return false;
      return true;
    });
  }

  function summarize(records) {
    const total = records.length;
    const ok = records.filter((r) => r.result === "成功").length;
    const fail = records.filter((r) => r.result === "失败").length;
    const partial = records.filter((r) => r.result === "部分成功").length;
    const rate = total ? Math.round((ok / total) * 100) + "%" : "0%";
    return { total, ok, partial, fail, rate };
  }

  function countBySystem(records, systems) {
    const map = new Map((systems || []).map((s) => [s, 0]));
    records.forEach((r) => {
      const key = r.system || "未分类";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }

  function countByResult(records) {
    const map = new Map(RESULTS.map((r) => [r, 0]));
    records.forEach((r) => {
      const key = RESULTS.includes(r.result) ? r.result : "失败";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }

  function countBySystemResult(records, systems) {
    const map = new Map((systems || []).map((s) => [s, { 成功: 0, 部分成功: 0, 失败: 0 }]));
    (records || []).forEach((r) => {
      const system = r.system || "未分类";
      if (!map.has(system)) map.set(system, { 成功: 0, 部分成功: 0, 失败: 0 });
      const key = RESULTS.includes(r.result) ? r.result : "失败";
      map.get(system)[key] += 1;
    });
    return map;
  }

  function countByCorridor(records) {
    const map = new Map();
    (records || []).forEach((r) => {
      const key = r.corridor || "未分区";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }

  function localDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function trendByDay(records, start, end) {
    const labels = [];
    const values = [];
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const last = new Date(end);
    last.setHours(0, 0, 0, 0);
    while (cursor <= last) {
      const key = localDateKey(cursor);
      labels.push(key.slice(5));
      const count = records.filter((r) => (r.startTime || "").slice(0, 10) === key).length;
      values.push(count);
      cursor.setDate(cursor.getDate() + 1);
    }
    return { labels, values };
  }

  return {
    RESULTS,
    parseDate,
    rangeBounds,
    filterRecords,
    summarize,
    countBySystem,
    countByResult,
    countBySystemResult,
    countByCorridor,
    trendByDay,
  };
});
