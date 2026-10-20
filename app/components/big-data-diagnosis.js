(function () {
  const data = window.BIG_DATA_DIAGNOSIS_DATA || {};
  const charts = {};
  let deviceHealthMode = "system";
  const DAY_BAR_WIDTH = 56;
  let filterApi = null;

  const HEALTH_SYSTEM_ORDER = [
    "视频监控系统",
    "环境与设备监控",
    "入侵报警系统",
    "门禁系统",
    "智能井盖系统",
    "电力监测系统",
    "通信系统",
    "火灾报警系统",
    "消防监控系统",
    "安全防范系统",
    "电子巡更系统",
  ];

  const BAR_COLORS = {
    pending: "#1D4ED8",
    doing: "#60A5FA",
    accept: "#14C9BA",
    done: "#3B82F6",
    closed: "#0F766E",
    withdrawn: "#64748B",
    rate: "#F59E0B",
  };

  // 管廊状态：五种资产类型固定配色
  const CORRIDOR_TYPE_COLORS = {
    project: "#3B82F6",
    corridor: "#14C9BA",
    cabin: "#F7BA1E",
    section: "#8B5CF6",
    pipeline: "#F53F57",
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function destroyChart(id) {
    if (charts[id]) {
      charts[id].destroy();
      delete charts[id];
    }
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
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...(config.options || {}),
      },
    });
  }

  /* ---------- 1 环境监测总览 ---------- */
  function cellClass(key, value) {
    const th = data.envThresholds || {};
    const rule = th[key];
    if (!rule) return "";
    if (rule.max != null && value > rule.max) return key === "water" ? "is-warn-val" : "is-danger-val";
    if (rule.min != null && value < rule.min) return "is-danger-val";
    return "";
  }

  function renderEnvTable() {
    const body = document.getElementById("bdEnvBody");
    if (!body) return;
    const zones = data.envZones || [];
    if (!zones.length) {
      body.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#86909C;padding:24px">暂无数据</td></tr>`;
      return;
    }
    body.innerHTML = zones.map((row) => {
      const danger = cellClass("ch4", row.ch4) || cellClass("water", row.water) || cellClass("h2s", row.h2s) || cellClass("o2", row.o2);
      const trClass = danger ? "is-alert-row" : "";
      return `<tr class="${trClass}">
        <td>${escapeHtml(row.zone)}</td>
        <td class="${cellClass("temp", row.temp)}">${row.temp}</td>
        <td class="${cellClass("humidity", row.humidity)}">${row.humidity}</td>
        <td class="${cellClass("o2", row.o2)}">${row.o2}</td>
        <td class="${cellClass("ch4", row.ch4)}">${row.ch4}</td>
        <td class="${cellClass("h2s", row.h2s)}">${row.h2s}</td>
        <td class="${cellClass("water", row.water)}">${row.water}</td>
      </tr>`;
    }).join("");
  }

  /* ---------- 设备状态快照 ---------- */
  function collectDeviceSnapshot() {
    const counts = { online: 0, offline: 0, warn: 0, fault: 0 };
    const monitor = window.DEVICE_MONITOR_DATA?.devices || window.DEVICE_MONITOR_DATA?.list || [];
    if (monitor.length) {
      monitor.forEach((d) => {
        const s = String(d.status || "").toLowerCase();
        if (s === "offline" || s === "离线") counts.offline += 1;
        else if (s === "fault" || s === "故障" || s === "alarm") counts.fault += 1;
        else if (s === "warn" || s === "warning" || s === "预警") counts.warn += 1;
        else counts.online += 1;
      });
      return counts;
    }

    (window.ENVIRONMENT_DATA?.devices || []).forEach((d) => {
      if (d.power === "off") counts.offline += 1;
      else if (d.run === "fault") counts.fault += 1;
      else if (d.run === "stopped") counts.warn += 1;
      else counts.online += 1;
    });
    (window.POWER_MONITOR_DATA?.monitorDevices || []).forEach((d) => {
      if (d.status === "offline") counts.offline += 1;
      else if (d.status === "fault" || d.status === "alarm") counts.fault += 1;
      else if (d.status === "warn") counts.warn += 1;
      else counts.online += 1;
    });
    return counts;
  }

  function pad(n) { return String(n).padStart(2, "0"); }

  function valueOf(id) { return document.getElementById(id)?.value || ""; }
  function setValue(id, v) { const el = document.getElementById(id); if (el) el.value = v; }

  function parseDate(value) {
    if (!value) return null;
    const d = new Date(String(value).replace(/-/g, "/"));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function monthBounds(base = new Date()) {
    const y = base.getFullYear();
    const m = base.getMonth();
    const start = `${y}-${pad(m + 1)}-01`;
    const endDate = new Date(y, m + 1, 0);
    const end = `${y}-${pad(m + 1)}-${pad(endDate.getDate())}`;
    return { start, end };
  }

  function defaultMonthBounds() {
    const now = new Date();
    if (now.getFullYear() === 2026 && now.getMonth() === 9) return monthBounds(now);
    return monthBounds(new Date(2026, 9, 1));
  }

  function dayKeysFromFilter() {
    const v = filterApi?.values?.() || {};
    let start = parseDate(v.start || valueOf("bdStart"));
    let end = parseDate(v.end || valueOf("bdEnd"));
    if (!start || !end) {
      const bounds = (filterApi?.defaultMonthBounds || defaultMonthBounds)();
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
    return keys.length ? keys : [v.start || valueOf("bdStart") || "2026-10-01"];
  }

  function applyScrollWidth(wrapId, dayCount) {
    const wrap = document.getElementById(wrapId);
    if (!wrap) return;
    const width = Math.max(wrap.parentElement?.clientWidth || 0, dayCount * DAY_BAR_WIDTH);
    wrap.style.width = `${width}px`;
    wrap.style.minWidth = `${width}px`;
  }

  function waveSeries(base, length, amp, phase) {
    return Array.from({ length }, (_, i) =>
      Math.max(0, Math.round(base + Math.sin(i * 0.9 + phase) * amp + ((i % 3) - 1)))
    );
  }

  function resetFilters() {
    if (filterApi?.reset) filterApi.reset();
  }

  function filterLoc(item) {
    if (filterApi?.matchLoc) return filterApi.matchLoc(item);
    const project = valueOf("bdProject");
    const corridor = valueOf("bdCorridor");
    const room = valueOf("bdRoom");
    const section = valueOf("bdSection");
    const pipeline = valueOf("bdPipeline");
    if (project && item.project && item.project !== project) return false;
    if (corridor && item.corridor && item.corridor !== corridor) return false;
    if (room && (item.room || item.cabin) && (item.room || item.cabin) !== room) return false;
    if (section && item.section && item.section !== section) return false;
    if (pipeline && item.pipeline && item.pipeline !== pipeline) return false;
    return true;
  }

  function inDateRange(raw) {
    const t = parseDate(raw);
    if (!t) return true;
    const start = parseDate(valueOf("bdStart"));
    const end = parseDate(valueOf("bdEnd"));
    if (start) { start.setHours(0, 0, 0, 0); if (t < start) return false; }
    if (end) { end.setHours(23, 59, 59, 999); if (t > end) return false; }
    return true;
  }

  /* ---------- 2 设备健康状态 ---------- */
  function syncDeviceHealthTabs() {
    document.querySelectorAll("#deviceHealthModeTabs .bd-range-tab").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-health-mode") === deviceHealthMode);
    });
    const scroll = document.getElementById("scrollDeviceHealth");
    if (scroll) scroll.classList.toggle("is-system-mode", deviceHealthMode === "system");
  }

  function systemHealthRows() {
    const catalog = window.DEVICE_MONITOR_DATA?.systems || [];
    const byName = new Map(catalog.map((s) => [s.name, s]));
    return HEALTH_SYSTEM_ORDER.map((name) => {
      const row = byName.get(name);
      if (row) {
        return {
          name,
          online: Number(row.online) || 0,
          offline: Number(row.offline) || 0,
          warn: Number(row.warn) || 0,
          fault: Number(row.fault) || 0,
        };
      }
      return { name, online: 0, offline: 0, warn: 0, fault: 0 };
    });
  }

  function renderDeviceHealthByTime() {
    const snap = collectDeviceSnapshot();
    const labels = dayKeysFromFilter();
    const n = labels.length;
    applyScrollWidth("wrapDeviceHealth", n);
    renderChart("wrapDeviceHealth", "chartDeviceHealth", {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "在线", data: waveSeries(snap.online, n, Math.max(1, snap.online * 0.08), 0.2), borderColor: "#14C9BA", backgroundColor: "rgba(20,201,186,.08)", tension: 0.35, fill: false },
          { label: "离线", data: waveSeries(snap.offline, n, Math.max(0.5, snap.offline * 0.3 || 0.6), 1.1), borderColor: "#86909C", tension: 0.35, fill: false },
          { label: "预警", data: waveSeries(snap.warn, n, Math.max(0.5, snap.warn * 0.35 || 0.6), 0.6), borderColor: "#F7BA1E", tension: 0.35, fill: false },
          { label: "故障", data: waveSeries(snap.fault, n, Math.max(0.5, snap.fault * 0.4 || 0.5), 1.4), borderColor: "#F53F57", tension: 0.35, fill: false },
        ],
      },
      options: {
        plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } },
        scales: {
          x: { title: { display: true, text: "时间", font: { size: 11 } }, ticks: { maxRotation: 45, minRotation: 30, font: { size: 10 } } },
          y: { beginAtZero: true, title: { display: true, text: "数量", font: { size: 11 } }, ticks: { precision: 0 } },
        },
      },
    });
  }

  function renderDeviceHealthBySystem() {
    const rows = systemHealthRows();
    const labels = rows.map((r) => r.name);
    const wrap = document.getElementById("wrapDeviceHealth");
    if (wrap) { wrap.style.width = ""; wrap.style.minWidth = ""; }
    renderChart("wrapDeviceHealth", "chartDeviceHealth", {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: "在线", data: rows.map((r) => r.online), backgroundColor: "#14C9BA", stack: "health" },
          { label: "离线", data: rows.map((r) => r.offline), backgroundColor: "#86909C", stack: "health" },
          { label: "预警", data: rows.map((r) => r.warn), backgroundColor: "#F7BA1E", stack: "health" },
          { label: "故障", data: rows.map((r) => r.fault), backgroundColor: "#F53F57", stack: "health" },
        ],
      },
      options: {
        plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } },
        scales: {
          x: {
            stacked: true,
            ticks: { maxRotation: 40, minRotation: 30, font: { size: 10 } },
            title: { display: true, text: "子系统", font: { size: 11 } },
          },
          y: {
            stacked: true,
            beginAtZero: true,
            title: { display: true, text: "数量", font: { size: 11 } },
            ticks: { precision: 0 },
          },
        },
      },
    });
  }

  function renderDeviceHealth() {
    syncDeviceHealthTabs();
    if (deviceHealthMode === "system") renderDeviceHealthBySystem();
    else renderDeviceHealthByTime();
  }

  /* ---------- 3 管廊状态横向分组条形图 ---------- */
  function corridorStatusCounts() {
    const statusKeys = data.STATUS_KEYS || ["建设中", "待完善", "已完工", "停用"];
    const tabs = data.CORRIDOR_TABS || [];
    const source = data.corridorStatus || {};
    const base = {};
    tabs.forEach((tab) => {
      const list = source[tab.key] || [];
      base[tab.key] = statusKeys.map((status) => list.filter((item) => item.status === status).length);
    });
    return { statusKeys, tabs, base };
  }

  function renderCorridorStatus() {
    const { statusKeys, tabs, base } = corridorStatusCounts();
    const datasets = tabs.map((tab) => ({
      label: tab.label,
      data: base[tab.key] || [],
      backgroundColor: CORRIDOR_TYPE_COLORS[tab.key] || "#86909C",
      borderRadius: 0,
      barThickness: 22,
    }));

    renderChart("wrapCorridorStatus", "chartCorridorStatus", {
      type: "bar",
      data: { labels: statusKeys, datasets },
      options: {
        indexAxis: "y",
        plugins: {
          legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } },
        },
        scales: {
          x: {
            stacked: true,
            beginAtZero: true,
            ticks: { precision: 0 },
            title: { display: true, text: "数量", font: { size: 11 } },
          },
          y: {
            stacked: true,
            title: { display: false },
          },
        },
      },
    });
  }

  /* ---------- 状态×时间 混合图 ---------- */
  function countByStatus(items, statuses) {
    const map = Object.fromEntries(statuses.map((s) => [s, 0]));
    items.forEach((item) => {
      const s = item.status;
      if (Object.prototype.hasOwnProperty.call(map, s)) map[s] += 1;
    });
    return map;
  }

  function distributeAcross(labels, total) {
    if (!labels.length) return [];
    if (total <= 0) return labels.map(() => 0);
    const base = Math.floor(total / labels.length);
    let rest = total - base * labels.length;
    return labels.map((_, i) => {
      const bump = (i % 3 === 0 ? 1 : 0) + (rest > 0 ? 1 : 0);
      if (rest > 0) rest -= 1;
      return base + bump;
    });
  }

  function buildMixedSeries(items, statuses, doneKeys) {
    const labels = dayKeysFromFilter();
    const totals = countByStatus(items, statuses);
    const series = statuses.map((status, idx) => ({
      type: "bar",
      label: status,
      data: distributeAcross(labels, totals[status] || 0),
      backgroundColor: Object.values(BAR_COLORS)[idx % 5],
      borderRadius: 1,
      barPercentage: 0.7,
      categoryPercentage: 0.75,
      yAxisID: "y",
      order: 2,
    }));

    const rateData = labels.map((_, i) => {
      const done = (doneKeys || ["已完成"]).reduce((sum, key) => {
        const ds = series.find((s) => s.label === key);
        return sum + (ds?.data[i] || 0);
      }, 0);
      const all = series.reduce((sum, ds) => sum + (ds.data[i] || 0), 0);
      return all ? Math.round((done / all) * 100) : 0;
    });

    series.push({
      type: "line",
      label: "完成率",
      data: rateData,
      borderColor: BAR_COLORS.rate,
      backgroundColor: BAR_COLORS.rate,
      pointBackgroundColor: "#fff",
      pointBorderColor: BAR_COLORS.rate,
      pointRadius: 4,
      tension: 0.3,
      yAxisID: "y1",
      order: 1,
    });

    return { labels, series };
  }

  function renderMixedChart(wrapId, canvasId, items, statuses, doneKeys, barColors) {
    const { labels, series } = buildMixedSeries(items, statuses, doneKeys);
    if (barColors) {
      series.forEach((ds, i) => {
        if (ds.type === "bar" && barColors[i]) ds.backgroundColor = barColors[i];
      });
    }
    applyScrollWidth(wrapId, labels.length);
    const hasData = series.some((ds) => ds.type === "bar" && ds.data.some((n) => n > 0));
    if (!hasData) {
      destroyChart(canvasId);
      showEmpty(wrapId, "暂无数据");
      return;
    }
    renderChart(wrapId, canvasId, {
      type: "bar",
      data: { labels, datasets: series },
      options: {
        plugins: {
          legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } },
        },
        scales: {
          x: {
            title: { display: true, text: "时间", font: { size: 11 } },
            stacked: false,
            ticks: { maxRotation: 45, minRotation: 30, font: { size: 10 } },
          },
          y: {
            beginAtZero: true,
            position: "left",
            title: { display: true, text: "数量", font: { size: 11 } },
            ticks: { precision: 0 },
          },
          y1: {
            beginAtZero: true,
            max: 100,
            position: "right",
            grid: { drawOnChartArea: false },
            title: { display: true, text: "完成率", font: { size: 11 } },
            ticks: { callback: (v) => `${v}%` },
          },
        },
      },
    });
  }

  function itemDate(item) {
    return item.planDate || item.createdAt || item.createTime || item.updatedAt || item.startTime || "";
  }

  function filterBizItems(items) {
    return (items || []).filter((item) => filterLoc(item) && inDateRange(itemDate(item)));
  }

  function inspectionTasks() {
    return filterBizItems(window.INSPECTION_DATA?.tasks || []);
  }

  function maintenanceTasks() {
    return filterBizItems(window.MAINTENANCE_DATA?.tasks || []);
  }

  function workOrders(bizType) {
    const orders = window.WORK_ORDER_STORE?.getOrders?.() || window.WORK_ORDER_DATA?.seedOrders || [];
    return filterBizItems(orders.filter((o) => o.bizType === bizType));
  }

  function renderInspection() {
    renderMixedChart(
      "wrapInspection",
      "chartInspection",
      inspectionTasks(),
      ["待巡检", "巡检中", "验收中", "已完成", "已关闭"],
      ["已完成"],
      [BAR_COLORS.pending, BAR_COLORS.doing, BAR_COLORS.accept, BAR_COLORS.done, BAR_COLORS.closed],
    );
  }

  function renderMaintenance() {
    renderMixedChart(
      "wrapMaintenance",
      "chartMaintenance",
      maintenanceTasks(),
      ["待保养", "保养中", "验收中", "已完成", "已关闭"],
      ["已完成"],
      [BAR_COLORS.pending, BAR_COLORS.doing, BAR_COLORS.accept, BAR_COLORS.done, BAR_COLORS.closed],
    );
  }

  function renderRepair() {
    renderMixedChart(
      "wrapRepair",
      "chartRepair",
      workOrders("报事报修"),
      ["待指派", "待处理", "验收中", "已完成", "已撤回"],
      ["已完成"],
      [BAR_COLORS.pending, BAR_COLORS.doing, BAR_COLORS.accept, BAR_COLORS.done, BAR_COLORS.withdrawn],
    );
  }

  function renderAbnormal() {
    renderMixedChart(
      "wrapAbnormal",
      "chartAbnormal",
      workOrders("设备异常"),
      ["待指派", "待处理", "验收中", "已完成", "已撤回"],
      ["已完成"],
      [BAR_COLORS.pending, BAR_COLORS.doing, BAR_COLORS.accept, BAR_COLORS.done, BAR_COLORS.withdrawn],
    );
  }

  function bind() {
    document.addEventListener("click", (event) => {
      const actionBtn = event.target.closest("[data-bd-action]");
      if (actionBtn) {
        const action = actionBtn.getAttribute("data-bd-action");
        if (action === "query") refreshAll();
        if (action === "reset") { resetFilters(); refreshAll(); }
        return;
      }

      const modeBtn = event.target.closest("[data-health-mode]");
      if (modeBtn) {
        deviceHealthMode = modeBtn.getAttribute("data-health-mode") || "time";
        renderDeviceHealth();
      }
    });
  }

  function refreshAll() {
    renderEnvTable();
    renderDeviceHealth();
    renderCorridorStatus();
    renderInspection();
    renderMaintenance();
    renderRepair();
    renderAbnormal();
  }

  document.addEventListener("DOMContentLoaded", () => {
    filterApi = window.BIG_DATA_FILTERS?.mount({ prefix: "bd" }) || null;
    bind();
    refreshAll();
  });
})();
