(function () {
  const data = window.BIG_DATA_GOVERNANCE_DATA || {};
  const charts = {};
  const DAY_BAR_WIDTH = 56;
  let filterApi = null;

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

  function parseDate(value) {
    if (!value) return null;
    const d = new Date(String(value).replace(/-/g, "/"));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function pad(n) { return String(n).padStart(2, "0"); }

  function dayKeysFromFilter() {
    const v = filterApi?.values?.() || {};
    let start = parseDate(v.start);
    let end = parseDate(v.end);
    if (!start || !end) {
      const bounds = filterApi?.defaultMonthBounds?.() || { start: "2026-10-01", end: "2026-10-19" };
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
    return keys.length ? keys : ["2026-10-01"];
  }

  function applyScrollWidth(wrapId, dayCount) {
    const wrap = document.getElementById(wrapId);
    if (!wrap) return;
    const width = Math.max(wrap.parentElement?.clientWidth || 0, dayCount * DAY_BAR_WIDTH);
    wrap.style.width = `${width}px`;
    wrap.style.minWidth = `${width}px`;
  }

  function mapTrendByDays(trend) {
    const days = dayKeysFromFilter();
    const mapCount = new Map((trend.labels || []).map((d, i) => [d, trend.counts[i]]));
    const mapStore = new Map((trend.labels || []).map((d, i) => [d, trend.storage[i]]));
    return {
      labels: days,
      counts: days.map((d, i) => mapCount.get(d) ?? Math.round((10 + Math.sin(i * 0.5) * 2) * 100) / 100),
      storage: days.map((d, i) => mapStore.get(d) ?? Math.round((0.5 + Math.sin(i * 0.4) * 0.1) * 100) / 100),
    };
  }

  /* ---------- KPI ---------- */
  function renderKpis() {
    const host = document.getElementById("bdGovKpis");
    if (!host) return;
    const k = data.kpis || {};
    const items = [
      { label: "数据源", value: k.sources ?? "—", unit: "个", icon: "fa-plug", tone: "is-blue" },
      { label: "数据采集", value: k.collectWan ?? "—", unit: "万条", icon: "fa-download", tone: "is-cyan" },
      { label: "数据上报", value: k.reportWan ?? "—", unit: "万条", icon: "fa-upload", tone: "is-green" },
      { label: "数据存储", value: k.storageTb ?? "—", unit: "TB", icon: "fa-hard-drive", tone: "is-amber" },
    ];
    host.innerHTML = items.map((item) => `
      <article class="analysis-kpi ${item.tone}">
        <div class="analysis-kpi-icon"><i class="fa-solid ${item.icon}"></i></div>
        <div class="analysis-kpi-body">
          <span class="analysis-kpi-label">${escapeHtml(item.label)}</span>
          <strong class="analysis-kpi-value">${escapeHtml(String(item.value))}<small style="font-size:12px;margin-left:4px;font-weight:500">${escapeHtml(item.unit)}</small></strong>
        </div>
      </article>
    `).join("");
  }

  /* ---------- 饼图 + 中心总数 + 图例 ---------- */
  function renderPieCenter(centerId, total, label) {
    const el = document.getElementById(centerId);
    if (!el) return;
    el.innerHTML = `<strong>${escapeHtml(String(total))}</strong><span>${escapeHtml(label || "总计")}</span>`;
  }

  function renderPieBlock(wrapId, canvasId, legendId, share, options = {}) {
    const valueKey = options.valueKey || "value";
    const centerId = options.centerId || "";
    const centerLabel = options.centerLabel || "总计";
    const list = share || [];
    const total = list.reduce((s, x) => s + (Number(x[valueKey]) || 0), 0);
    renderChart(wrapId, canvasId, {
      type: "doughnut",
      data: {
        labels: list.map((x) => x.name),
        datasets: [{
          data: list.map((x) => x[valueKey]),
          backgroundColor: list.map((x) => x.color),
          borderColor: "#fff",
          borderWidth: 2,
        }],
      },
      options: {
        maintainAspectRatio: true,
        aspectRatio: 1,
        cutout: "68%",
        plugins: { legend: { display: false } },
      },
    });
    if (centerId) renderPieCenter(centerId, total, centerLabel);
    const legend = document.getElementById(legendId);
    if (!legend) return;
    legend.innerHTML = list.map((x) => {
      const pct = total ? Math.round((x[valueKey] / total) * 100) : 0;
      const tip = x.domain ? `${x.name}（${x.domain}）` : x.name;
      return `<div class="bd-legend-row">
        <span class="bd-legend-dot" style="background:${x.color}"></span>
        <span class="bd-legend-name" title="${escapeHtml(tip)}">${escapeHtml(x.name)}</span>
        <span class="bd-legend-value">${x[valueKey]}</span>
        <span class="bd-legend-pct">${pct}%</span>
      </div>`;
    }).join("");
  }

  /* ---------- 双轴趋势 ---------- */
  function renderDualTrend(wrapId, canvasId, trend, countLabel) {
    const series = mapTrendByDays(trend || { labels: [], counts: [], storage: [] });
    applyScrollWidth(wrapId, series.labels.length);
    renderChart(wrapId, canvasId, {
      type: "line",
      data: {
        labels: series.labels,
        datasets: [
          {
            label: countLabel,
            data: series.counts,
            borderColor: "#3B82F6",
            backgroundColor: "rgba(59,130,246,.08)",
            tension: 0.35,
            yAxisID: "y",
            pointRadius: 2,
          },
          {
            label: "存储量(TB)",
            data: series.storage,
            borderColor: "#14C9BA",
            backgroundColor: "rgba(20,201,186,.08)",
            tension: 0.35,
            yAxisID: "y1",
            pointRadius: 2,
          },
        ],
      },
      options: {
        plugins: {
          legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } },
        },
        scales: {
          x: {
            title: { display: true, text: "时间", font: { size: 11 } },
            ticks: { maxRotation: 45, minRotation: 30, font: { size: 10 } },
          },
          y: {
            beginAtZero: true,
            position: "left",
            title: { display: true, text: "条数(万)", font: { size: 11 } },
          },
          y1: {
            beginAtZero: true,
            position: "right",
            grid: { drawOnChartArea: false },
            title: { display: true, text: "存储量(TB)", font: { size: 11 } },
          },
        },
      },
    });
  }

  function renderSouth() {
    renderPieBlock("wrapSouthPie", "chartSouthPie", "legendSouthPie", data.southPie, {
      centerId: "centerSouthPie",
      centerLabel: "总计",
    });
    renderDualTrend("wrapSouthTrend", "chartSouthTrend", data.southTrend, "入库条数(万)");
  }

  function renderNorth() {
    renderPieBlock("wrapNorthPie", "chartNorthPie", "legendNorthPie", data.northPie, {
      centerId: "centerNorthPie",
      centerLabel: "总计",
    });
    renderDualTrend("wrapNorthTrend", "chartNorthTrend", data.northTrend, "上报条数(万)");
  }

  /* ---------- 质量监测：11 子系统报警次数 ---------- */
  function renderQuality() {
    const rows = data.qualityAlarms || [];
    renderChart("wrapGovQuality", "chartGovQuality", {
      type: "bar",
      data: {
        labels: rows.map((r) => r.system),
        datasets: [{
          label: "报警数据次数",
          data: rows.map((r) => r.count),
          backgroundColor: "#3B82F6",
          borderRadius: 2,
          barPercentage: 0.65,
        }],
      },
      options: {
        plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } },
        scales: {
          x: {
            ticks: { maxRotation: 40, minRotation: 30, font: { size: 10 } },
            title: { display: true, text: "子系统", font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            ticks: { precision: 0 },
            title: { display: true, text: "报警次数", font: { size: 11 } },
          },
        },
      },
    });
  }

  /* ---------- 标准数据集占比 ---------- */
  function renderDatasets() {
    const list = (data.datasets || []).map((d) => ({
      name: d.name,
      domain: d.domain,
      value: d.volume,
      color: d.color,
    }));
    renderPieBlock("wrapDatasetPie", "chartDatasetPie", "legendDatasetPie", list, {
      valueKey: "value",
      centerId: "centerDatasetPie",
      centerLabel: "总计",
    });
  }

  function refreshAll() {
    renderKpis();
    renderSouth();
    renderNorth();
    renderQuality();
    renderDatasets();
  }

  function bind() {
    document.addEventListener("click", (event) => {
      const action = event.target.closest("[data-bd-action]")?.getAttribute("data-bd-action");
      if (action === "query") refreshAll();
      if (action === "reset") {
        filterApi?.reset();
        refreshAll();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    filterApi = window.BIG_DATA_FILTERS?.mount({ prefix: "bd" }) || null;
    bind();
    refreshAll();
  });
})();
