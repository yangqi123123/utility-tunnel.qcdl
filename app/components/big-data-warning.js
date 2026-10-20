(function () {
  const seed = window.BIG_DATA_WARNING_DATA || { alarms: [], SYSTEM_SHORT: {} };
  const charts = {};
  let rankMode = "space";
  let filterApi = null;
  const DAY_BAR_WIDTH = 56;

  const STATUS_COLORS = { 未处理: "#F53F57", 处理中: "#F7BA1E", 已处理: "#14C9BA" };
  const LEVEL_COLORS = { 告警: "#F53F57", 预警: "#F7BA1E", 提醒: "#2BB7E0" };
  const DEVICE_COLORS = { 在线: "#14C9BA", 离线: "#86909C", 预警: "#F7BA1E", 故障: "#F53F57" };
  const HANDLE_COLORS = { 转工单: "#3B82F6", 误报: "#F7BA1E", 直接处理: "#14C9BA" };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function destroyChart(id) {
    if (charts[id]) { charts[id].destroy(); delete charts[id]; }
  }

  function showEmpty(wrapId, message) {
    const wrap = document.getElementById(wrapId);
    if (!wrap) return;
    wrap.innerHTML = `<div class="analysis-empty">${escapeHtml(message || "暂无数据")}</div>`;
  }

  function ensureCanvas(wrapId, canvasId) {
    const wrap = document.getElementById(wrapId);
    if (!wrap) return null;
    wrap.innerHTML = `<canvas id="${canvasId}"></canvas>`;
    return document.getElementById(canvasId);
  }

  function renderChart(wrapId, canvasId, config) {
    if (typeof window.Chart !== "function") {
      showEmpty(wrapId, "图表组件未加载");
      return;
    }
    const canvas = ensureCanvas(wrapId, canvasId);
    if (!canvas) return;
    destroyChart(canvasId);
    charts[canvasId] = new window.Chart(canvas, {
      ...config,
      options: { responsive: true, maintainAspectRatio: false, ...(config.options || {}) },
    });
  }

  function pad(n) { return String(n).padStart(2, "0"); }

  function monthBounds(base = new Date()) {
    const y = base.getFullYear();
    const m = base.getMonth();
    const start = `${y}-${pad(m + 1)}-01`;
    const endDate = new Date(y, m + 1, 0);
    const end = `${y}-${pad(m + 1)}-${pad(endDate.getDate())}`;
    return { start, end };
  }

  function parseDate(value) {
    if (!value) return null;
    const d = new Date(String(value).replace(/-/g, "/"));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function valueOf(id) { return document.getElementById(id)?.value || ""; }
  function setValue(id, v) { const el = document.getElementById(id); if (el) el.value = v; }

  function resetFilters() {
    if (filterApi?.reset) filterApi.reset();
  }

  function filteredAlarms() {
    const v = filterApi?.values?.() || {
      project: valueOf("bwProject"),
      corridor: valueOf("bwCorridor"),
      room: valueOf("bwRoom"),
      section: valueOf("bwSection"),
      pipeline: valueOf("bwPipeline"),
      start: valueOf("bwStart"),
      end: valueOf("bwEnd"),
    };
    const start = parseDate(v.start);
    const end = parseDate(v.end);
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);

    return (seed.alarms || []).filter((item) => {
      if (v.project && item.project && item.project !== v.project) return false;
      if (v.corridor && item.corridor && item.corridor !== v.corridor) return false;
      if (v.room && item.room && item.room !== v.room) return false;
      if (v.section && item.section && item.section !== v.section) return false;
      if (v.pipeline && item.pipeline && item.pipeline !== v.pipeline) return false;
      const t = parseDate(item.time);
      if (start && t && t < start) return false;
      if (end && t && t > end) return false;
      return true;
    });
  }

  function countBy(list, keyFn) {
    const map = new Map();
    list.forEach((item) => {
      const key = keyFn(item) || "未分类";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }

  function pct(part, total) {
    if (!total) return "0%";
    return `${(Math.round((part / total) * 1000) / 10).toFixed(1)}%`;
  }

  function renderDonutLegend(elId, rows) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.innerHTML = rows.map((row) => `
      <div class="bd-legend-row">
        <span class="bd-legend-dot" style="background:${row.color}"></span>
        <span class="bd-legend-name">${escapeHtml(row.label)}</span>
        <span class="bd-legend-value">${row.value}</span>
        <span class="bd-legend-pct">${escapeHtml(row.percent)}</span>
      </div>`).join("");
  }

  function renderDonutCenter(elId, value, label) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.innerHTML = `<strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span>`;
  }

  function renderDonut(wrapId, canvasId, centerId, legendId, labels, values, colors, centerLabel) {
    const total = values.reduce((s, n) => s + n, 0);
    if (!total) {
      destroyChart(canvasId);
      showEmpty(wrapId, "暂无数据");
      renderDonutCenter(centerId, "0", centerLabel);
      renderDonutLegend(legendId, []);
      return;
    }
    renderChart(wrapId, canvasId, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, cutout: "68%" }],
      },
      options: {
        plugins: { legend: { display: false } },
      },
    });
    renderDonutCenter(centerId, String(total), centerLabel);
    renderDonutLegend(legendId, labels.map((label, i) => ({
      label,
      value: values[i],
      percent: pct(values[i], total),
      color: colors[i],
    })));
  }

  /* ---------- 按天轴（跟顶部筛选） ---------- */
  function dayKeysFromFilter() {
    let start = parseDate(valueOf("bwStart"));
    let end = parseDate(valueOf("bwEnd"));
    if (!start || !end) {
      const bounds = window.BIG_DATA_FILTERS?.defaultMonthBounds?.() || { start: "2026-10-01", end: "2026-10-31" };
      start = parseDate(bounds.start);
      end = parseDate(bounds.end);
    }
    if (start > end) { const t = start; start = end; end = t; }
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const keys = [];
    const cursor = new Date(start);
    let guard = 0;
    while (cursor <= end && guard < 400) {
      keys.push(`${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`);
      cursor.setDate(cursor.getDate() + 1);
      guard += 1;
    }
    return keys.length ? keys : [valueOf("bwStart") || "2026-10-01"];
  }

  function dayKeyOf(alarm) {
    const t = parseDate(alarm.time);
    if (!t) return "";
    return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
  }

  function applyScrollWidth(wrapId, dayCount) {
    const wrap = document.getElementById(wrapId);
    if (!wrap) return;
    const width = Math.max(wrap.parentElement?.clientWidth || 0, dayCount * DAY_BAR_WIDTH);
    wrap.style.width = `${width}px`;
    wrap.style.minWidth = `${width}px`;
  }

  /* ---------- 1 报警状态 ---------- */
  function renderAlarmStatus(alarms) {
    const labels = ["未处理", "处理中", "已处理"];
    const values = labels.map((k) => alarms.filter((a) => a.status === k).length);
    renderDonut(
      "wrapAlarmStatus", "chartAlarmStatus", "centerAlarmStatus", "legendAlarmStatus",
      labels, values, labels.map((k) => STATUS_COLORS[k]), "报警状态",
    );

    const days = dayKeysFromFilter();
    applyScrollWidth("wrapAlarmStatusBar", days.length);
    const series = labels.map((status) => days.map((day) =>
      alarms.filter((a) => dayKeyOf(a) === day && a.status === status).length
    ));
    renderChart("wrapAlarmStatusBar", "chartAlarmStatusBar", {
      type: "bar",
      data: {
        labels: days,
        datasets: labels.map((status, i) => ({
          label: status,
          data: series[i],
          backgroundColor: STATUS_COLORS[status],
          borderRadius: 2,
        })),
      },
      options: {
        plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } },
        scales: {
          x: { title: { display: true, text: "时间", font: { size: 11 } }, ticks: { maxRotation: 45, minRotation: 30, font: { size: 10 } } },
          y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: "数量", font: { size: 11 } } },
        },
      },
    });
  }

  /* ---------- 2 报警趋势 ---------- */
  function renderAlarmTrend(alarms) {
    const labels = ["告警", "预警", "提醒"];
    const values = labels.map((k) => alarms.filter((a) => a.level === k).length);
    renderDonut(
      "wrapAlarmLevel", "chartAlarmLevel", "centerAlarmLevel", "legendAlarmLevel",
      labels, values, labels.map((k) => LEVEL_COLORS[k]), "报警趋势",
    );

    const days = dayKeysFromFilter();
    applyScrollWidth("wrapAlarmTrend", days.length);
    const counts = days.map((day) => alarms.filter((a) => dayKeyOf(a) === day).length);
    renderChart("wrapAlarmTrend", "chartAlarmTrend", {
      type: "line",
      data: {
        labels: days,
        datasets: [{
          label: "报警数量",
          data: counts,
          borderColor: "#3B82F6",
          backgroundColor: "#3B82F6",
          pointBackgroundColor: "#fff",
          pointBorderColor: "#3B82F6",
          pointRadius: 4,
          tension: 0.35,
          fill: false,
        }],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { title: { display: true, text: "时间", font: { size: 11 } }, ticks: { maxRotation: 45, minRotation: 30, font: { size: 10 } } },
          y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: "数量", font: { size: 11 } } },
        },
      },
    });
  }

  /* ---------- 3 设备数量及状态 ---------- */
  function deviceSnapshot() {
    const devices = window.DEVICE_MONITOR_DATA?.devices || [];
    const counts = { 在线: 0, 离线: 0, 预警: 0, 故障: 0 };
    devices.forEach((d) => {
      const s = String(d.status || "").toLowerCase();
      if (s === "offline" || s === "离线") counts["离线"] += 1;
      else if (s === "fault" || s === "故障" || s === "alarm") counts["故障"] += 1;
      else if (s === "warn" || s === "warning" || s === "预警") counts["预警"] += 1;
      else counts["在线"] += 1;
    });
    const total = devices.length || (counts["在线"] + counts["离线"] + counts["预警"] + counts["故障"]);
    const faultRate = total ? ((counts["故障"] / total) * 100).toFixed(1) : "0.0";
    return { total, counts, faultRate };
  }

  function renderDeviceStats() {
    const snap = deviceSnapshot();
    const cards = document.getElementById("deviceStatCards");
    if (cards) {
      cards.innerHTML = `
        <div class="bd-mini-card">
          <span class="bd-mini-dot is-ok"></span>
          <div><em>设备总数</em><strong>${snap.total}<small>台</small></strong></div>
        </div>
        <div class="bd-mini-card is-warn-card">
          <span class="bd-mini-dot is-warn"></span>
          <div><em>设备故障率</em><strong>${snap.faultRate}<small>%</small></strong></div>
        </div>`;
    }
    const labels = ["在线", "离线", "预警", "故障"];
    const values = labels.map((k) => snap.counts[k] || 0);
    renderDonut(
      "wrapDeviceStatus", "chartDeviceStatus", "centerDeviceStatus", "legendDeviceStatus",
      labels, values, labels.map((k) => DEVICE_COLORS[k]), "设备总数",
    );
  }

  /* ---------- 4 运行监测（率） ---------- */
  function renderRuntime() {
    const snap = deviceSnapshot();
    const total = snap.total || 1;
    const rates = {
      在线率: Math.round((snap.counts["在线"] / total) * 1000) / 10,
      离线率: Math.round((snap.counts["离线"] / total) * 1000) / 10,
      预警率: Math.round((snap.counts["预警"] / total) * 1000) / 10,
      故障率: Math.round((snap.counts["故障"] / total) * 1000) / 10,
    };
    const days = dayKeysFromFilter();
    applyScrollWidth("wrapRuntime", days.length);
    const n = days.length;
    const wave = (base, amp, phase) => Array.from({ length: n }, (_, i) =>
      Math.max(0, Math.min(100, +(base + Math.sin(i * 0.8 + phase) * amp).toFixed(1)))
    );

    renderChart("wrapRuntime", "chartRuntime", {
      type: "line",
      data: {
        labels: days,
        datasets: [
          { label: "在线率", data: wave(rates["在线率"], 2.5, 0.2), borderColor: "#14C9BA", tension: 0.35, fill: false, pointRadius: 3 },
          { label: "离线率", data: wave(rates["离线率"], 1.2, 1.1), borderColor: "#86909C", tension: 0.35, fill: false, pointRadius: 3 },
          { label: "预警率", data: wave(rates["预警率"], 1.5, 0.6), borderColor: "#F7BA1E", tension: 0.35, fill: false, pointRadius: 3 },
          { label: "故障率", data: wave(rates["故障率"], 1.2, 1.4), borderColor: "#F53F57", tension: 0.35, fill: false, pointRadius: 3 },
        ],
      },
      options: {
        plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } },
        scales: {
          x: { title: { display: true, text: "时间", font: { size: 11 } }, ticks: { maxRotation: 45, minRotation: 30, font: { size: 10 } } },
          y: { min: 0, max: 100, ticks: { callback: (v) => `${v}%` }, title: { display: true, text: "比率", font: { size: 11 } } },
        },
      },
    });
  }

  /* ---------- 5 预警排名 ---------- */
  function renderRank(alarms) {
    const list = document.getElementById("rankList");
    if (!list) return;
    let rows = [];
    if (rankMode === "space") {
      const map = countBy(alarms, (a) => a.section || "未分区");
      rows = [...map.entries()].sort((a, b) => b[1] - a[1]);
    } else {
      const map = new Map();
      alarms.forEach((a) => {
        const key = seed.SYSTEM_SHORT[a.system] || a.system || "其他";
        map.set(key, (map.get(key) || 0) + 1);
      });
      rows = [...map.entries()].sort((a, b) => b[1] - a[1]);
    }
    if (!rows.length) {
      list.innerHTML = `<div class="analysis-empty">暂无数据</div>`;
      return;
    }
    const max = rows[0][1] || 1;
    list.innerHTML = rows.map(([name, count]) => `
      <div class="bd-rank-row">
        <span class="bd-rank-name" title="${escapeHtml(name)}">${escapeHtml(name)}</span>
        <div class="bd-rank-track"><i style="width:${Math.max(6, (count / max) * 100)}%"></i></div>
        <span class="bd-rank-value">${count}</span>
      </div>`).join("");
  }

  /* ---------- 6 处理方式 ---------- */
  function resolveHandleMethod(alarm) {
    if (alarm.handleMethod) return alarm.handleMethod;
    if (alarm.process?.workOrderNo || alarm.workOrderNo) return "转工单";
    if (/误报/.test(String(alarm.closeReason || ""))) return "误报";
    if (alarm.status === "已处理") return "直接处理";
    return "";
  }

  function renderHandleMethod(alarms) {
    const handled = alarms
      .map((a) => ({ ...a, method: resolveHandleMethod(a) }))
      .filter((a) => a.method);
    const labels = ["转工单", "误报", "直接处理"];
    const values = labels.map((k) => handled.filter((a) => a.method === k).length);
    renderDonut(
      "wrapHandleMethod", "chartHandleMethod", "centerHandleMethod", "legendHandleMethod",
      labels, values, labels.map((k) => HANDLE_COLORS[k]), "处理方式",
    );
  }

  function refresh() {
    const alarms = filteredAlarms();
    renderAlarmStatus(alarms);
    renderAlarmTrend(alarms);
    renderDeviceStats();
    renderRuntime();
    renderRank(alarms);
    renderHandleMethod(alarms);
  }

  function bind() {
    document.addEventListener("click", (event) => {
      const action = event.target.closest("[data-bw-action]")?.getAttribute("data-bw-action");
      if (action === "query") refresh();
      if (action === "reset") { resetFilters(); refresh(); }

      const rankBtn = event.target.closest("#rankTabs .bd-range-tab");
      if (rankBtn) {
        rankMode = rankBtn.getAttribute("data-rank") || "space";
        rankBtn.parentElement.querySelectorAll(".bd-range-tab").forEach((b) => b.classList.remove("is-active"));
        rankBtn.classList.add("is-active");
        renderRank(filteredAlarms());
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    filterApi = window.BIG_DATA_FILTERS?.mount({ prefix: "bw" }) || null;
    bind();
    refresh();
  });
})();
