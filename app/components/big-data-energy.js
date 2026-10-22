(function () {
  const data = window.BIG_DATA_ENERGY_DATA || {};
  const charts = {};
  const PAGE_SIZE = 8;
  let filterApi = null;
  let detailMode = "region";
  let page = 1;

  const PHASE_COLORS = {
    A: "#F59E0B",
    B: "#3B82F6",
    C: "#8B5CF6",
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

  function parseDate(value) {
    if (!value) return null;
    const d = new Date(String(value).replace(/-/g, "/"));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function inDateRange(raw) {
    const t = parseDate(raw);
    if (!t) return true;
    const v = filterApi?.values?.() || {};
    const start = parseDate(v.start);
    const end = parseDate(v.end);
    if (start) { start.setHours(0, 0, 0, 0); if (t < start) return false; }
    if (end) { end.setHours(23, 59, 59, 999); if (t > end) return false; }
    return true;
  }

  function matchRow(row) {
    if (filterApi && !filterApi.matchLoc(row)) return false;
    return inDateRange(row.time);
  }

  /* ---------- 1 能耗概览 ---------- */
  function renderOverview() {
    const ov = data.overview || {};
    const monthEl = document.getElementById("bdEnergyMonthVal");
    const yearEl = document.getElementById("bdEnergyYearVal");
    const monthMom = document.getElementById("bdEnergyMonthMom");
    const yearMom = document.getElementById("bdEnergyYearMom");
    if (monthEl) monthEl.textContent = `${ov.monthTotalWan ?? "—"}万kW·h`;
    if (yearEl) yearEl.textContent = `${ov.yearTotalWan ?? "—"}万kW·h`;
    if (monthMom) monthMom.textContent = `环比 ↑${ov.monthMom ?? 0}%`;
    if (yearMom) yearMom.textContent = `环比 ↑${ov.yearMom ?? 0}%`;

    const series = ov.monthSeries || [];
    const labels = series.map((_, i) => String(i + 1));
    renderChart("wrapEnergyMonthBar", "chartEnergyMonthBar", {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "用电量",
          data: series,
          backgroundColor: series.map((_, i) => (i === 9 ? "#14C9BA" : "rgba(59,130,246,.45)")),
          borderRadius: 2,
          barPercentage: 0.7,
        }],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { title: { display: true, text: "月份", font: { size: 11 } } },
          y: {
            beginAtZero: true,
            title: { display: true, text: "万kW·h", font: { size: 11 } },
          },
        },
      },
    });
  }

  /* ---------- 2 分区统计 ---------- */
  function renderZoneStats() {
    const systems = data.systemBars || [];
    const zones = data.zoneBars || [];

    const pieColors = [
      "#3B82F6", "#14C9BA", "#F7BA1E", "#8B5CF6", "#F53F57",
      "#0EA5E9", "#22C55E", "#F97316", "#64748B", "#EC4899", "#06B6D4",
    ];
    const pieTotal = systems.reduce((sum, s) => sum + (Number(s.value) || 0), 0);
    const pieTotalText = Math.round(pieTotal * 100) / 100;
    renderChart("wrapEnergySystemPie", "chartEnergySystemPie", {
      type: "doughnut",
      data: {
        labels: systems.map((s) => s.name),
        datasets: [{
          data: systems.map((s) => s.value),
          backgroundColor: pieColors,
          borderColor: "#fff",
          borderWidth: 2,
          hoverOffset: 4,
        }],
      },
      options: {
        maintainAspectRatio: true,
        aspectRatio: 1,
        cutout: "68%",
        layout: { padding: 4 },
        plugins: { legend: { display: false } },
      },
    });
    const center = document.getElementById("centerEnergySystemPie");
    if (center) {
      center.innerHTML = `<strong>${escapeHtml(String(pieTotalText))}</strong><span>总计</span>`;
    }
    const legend = document.getElementById("legendEnergySystem");
    if (legend) {
      legend.innerHTML = systems.map((s, i) => {
        const pct = pieTotal ? Math.round((s.value / pieTotal) * 100) : 0;
        return `<div class="bd-legend-row">
          <span class="bd-legend-dot" style="background:${pieColors[i % pieColors.length]}"></span>
          <span class="bd-legend-name" title="${escapeHtml(s.name)}">${escapeHtml(s.name)}</span>
          <span class="bd-legend-value">${s.value}</span>
          <span class="bd-legend-pct">${pct}%</span>
        </div>`;
      }).join("");
    }

    renderChart("wrapEnergyZoneBar", "chartEnergyZoneBar", {
      type: "bar",
      data: {
        labels: zones.map((z) => z.name),
        datasets: [{
          label: "耗电量",
          data: zones.map((z) => z.value),
          backgroundColor: "#3B82F6",
          borderRadius: 2,
        }],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { font: { size: 11 } } },
          y: {
            beginAtZero: true,
            title: { display: true, text: "万kW·h", font: { size: 11 } },
          },
        },
      },
    });
  }

  /* ---------- 3/4 UPS ---------- */
  function hourLabels() {
    const labels = [];
    for (let h = 0; h <= 24; h += 2) labels.push(`${String(h).padStart(2, "0")}:00`);
    return labels;
  }

  function pickSeries(key, phaseKey, fallbackBase) {
    const series = window.POWER_MONITOR_DATA?.chartSeries?.[key];
    if (series?.[phaseKey]?.length) {
      const src = series[phaseKey];
      const labels = hourLabels();
      const step = Math.max(1, Math.floor(src.length / (labels.length - 1)));
      return labels.map((_, i) => {
        const idx = Math.min(src.length - 1, i * step);
        return src[idx];
      });
    }
    return hourLabels().map((_, i) =>
      Math.round(fallbackBase + Math.sin(i * 0.7) * 5 + ((i % 3) - 1))
    );
  }

  function renderUpsLine(wrapId, canvasId, key, bases) {
    const labels = hourLabels();
    renderChart(wrapId, canvasId, {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "A相" + (key === "upsVoltage" ? "电压" : "电流"), data: pickSeries(key, "phaseA", bases[0]), borderColor: PHASE_COLORS.A, tension: 0.35, pointRadius: 0, borderWidth: 2 },
          { label: "B相" + (key === "upsVoltage" ? "电压" : "电流"), data: pickSeries(key, "phaseB", bases[1]), borderColor: PHASE_COLORS.B, tension: 0.35, pointRadius: 0, borderWidth: 2 },
          { label: "C相" + (key === "upsVoltage" ? "电压" : "电流"), data: pickSeries(key, "phaseC", bases[2]), borderColor: PHASE_COLORS.C, tension: 0.35, pointRadius: 0, borderWidth: 2 },
        ],
      },
      options: {
        plugins: { legend: { position: "top", align: "end", labels: { boxWidth: 10, font: { size: 11 } } } },
        scales: {
          x: { ticks: { font: { size: 10 }, maxRotation: 0 } },
          y: { beginAtZero: true, max: 100, ticks: { stepSize: 25 } },
        },
      },
    });
  }

  function renderUpsVoltage() {
    renderUpsLine("wrapUpsVoltage", "chartUpsVoltage", "upsVoltage", [70, 62, 55]);
  }

  function renderUpsCurrent() {
    renderUpsLine("wrapUpsCurrent", "chartUpsCurrent", "upsCurrent", [48, 36, 28]);
  }

  /* ---------- 5 明细 ---------- */
  function syncDetailTabs() {
    document.querySelectorAll("#bdEnergyDetailTabs .bd-range-tab").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-detail-mode") === detailMode);
    });
  }

  function filteredDetailRows() {
    const source = detailMode === "region" ? (data.regionRows || []) : (data.deviceRows || []);
    return source.filter(matchRow);
  }

  function renderDetailHead() {
    const head = document.getElementById("bdEnergyDetailHead");
    if (!head) return;
    if (detailMode === "region") {
      head.innerHTML = `<tr>
        <th>获取时间</th><th>所属项目</th><th>所属管廊</th><th>所属舱室</th>
        <th>所属区段</th><th>所属管线</th>
        <th>当前读数（kW·h）</th><th>上次读数（kW·h）</th><th>用电量（kW·h）</th>
      </tr>`;
    } else {
      head.innerHTML = `<tr>
        <th>获取时间</th><th>设备名称</th><th>设备编码</th>
        <th>所属项目</th><th>所属管廊</th><th>所属舱室</th><th>所属区段</th><th>所属管线</th>
        <th>所属系统</th><th>设备分类</th>
        <th>当前读数（kW·h）</th><th>上次读数（kW·h）</th><th>用电量（kW·h）</th>
      </tr>`;
    }
  }

  function renderDetailBody() {
    const body = document.getElementById("bdEnergyDetailBody");
    const host = document.getElementById("bdEnergyDetailPagination");
    if (!body) return;
    const rows = filteredDetailRows();
    const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (page > pages) page = pages;
    const start = (page - 1) * PAGE_SIZE;
    const slice = rows.slice(start, start + PAGE_SIZE);

    if (!slice.length) {
      const cols = detailMode === "region" ? 9 : 13;
      body.innerHTML = `<tr><td colspan="${cols}" style="text-align:center;color:#86909C;padding:24px">暂无数据</td></tr>`;
    } else if (detailMode === "region") {
      body.innerHTML = slice.map((r) => `<tr>
        <td>${escapeHtml(r.time)}</td>
        <td>${escapeHtml(r.project)}</td>
        <td>${escapeHtml(r.corridor)}</td>
        <td>${escapeHtml(r.room)}</td>
        <td>${escapeHtml(r.section)}</td>
        <td>${escapeHtml(r.pipeline)}</td>
        <td>${r.current}</td>
        <td>${r.previous}</td>
        <td>${r.usage}</td>
      </tr>`).join("");
    } else {
      body.innerHTML = slice.map((r) => `<tr>
        <td>${escapeHtml(r.time)}</td>
        <td>${escapeHtml(r.name)}</td>
        <td>${escapeHtml(r.code)}</td>
        <td>${escapeHtml(r.project)}</td>
        <td>${escapeHtml(r.corridor)}</td>
        <td>${escapeHtml(r.room)}</td>
        <td>${escapeHtml(r.section)}</td>
        <td>${escapeHtml(r.pipeline)}</td>
        <td>${escapeHtml(r.system)}</td>
        <td>${escapeHtml(r.category)}</td>
        <td>${r.current}</td>
        <td>${r.previous}</td>
        <td>${r.usage}</td>
      </tr>`).join("");
    }

    if (host) {
      host.innerHTML = `<div class="bd-page-hint">共 ${total} 条 · 第 ${page}/${pages} 页
        <button type="button" class="btn btn-secondary btn-sm" data-page-nav="prev" ${page <= 1 ? "disabled" : ""}>上一页</button>
        <button type="button" class="btn btn-secondary btn-sm" data-page-nav="next" ${page >= pages ? "disabled" : ""}>下一页</button>
      </div>`;
    }
  }

  function renderDetail() {
    syncDetailTabs();
    renderDetailHead();
    renderDetailBody();
  }

  function exportCsv() {
    const rows = filteredDetailRows();
    const headers = detailMode === "region"
      ? ["获取时间", "所属项目", "所属管廊", "所属舱室", "所属区段", "所属管线", "当前读数", "上次读数", "用电量"]
      : ["获取时间", "设备名称", "设备编码", "所属项目", "所属管廊", "所属舱室", "所属区段", "所属管线", "所属系统", "设备分类", "当前读数", "上次读数", "用电量"];
    const lines = [headers.join(",")];
    rows.forEach((r) => {
      if (detailMode === "region") {
        lines.push([r.time, r.project, r.corridor, r.room, r.section, r.pipeline, r.current, r.previous, r.usage].join(","));
      } else {
        lines.push([r.time, r.name, r.code, r.project, r.corridor, r.room, r.section, r.pipeline, r.system, r.category, r.current, r.previous, r.usage].join(","));
      }
    });
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = detailMode === "region" ? "能耗概览明细-按区域.csv" : "能耗概览明细-按设备.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    window.EMERGENCY_UI?.showToast?.("导出成功") || console.log("导出成功");
  }

  function refreshAll() {
    renderOverview();
    renderZoneStats();
    renderUpsVoltage();
    renderUpsCurrent();
    page = 1;
    renderDetail();
  }

  function bind() {
    document.addEventListener("click", (event) => {
      const actionBtn = event.target.closest("[data-bd-action]");
      if (actionBtn) {
        const action = actionBtn.getAttribute("data-bd-action");
        if (action === "query") refreshAll();
        if (action === "reset") { filterApi?.reset(); refreshAll(); }
        if (action === "export") exportCsv();
        return;
      }

      const tab = event.target.closest("[data-detail-mode]");
      if (tab) {
        detailMode = tab.getAttribute("data-detail-mode") || "region";
        page = 1;
        renderDetail();
        return;
      }

      const nav = event.target.closest("[data-page-nav]");
      if (nav) {
        const dir = nav.getAttribute("data-page-nav");
        const rows = filteredDetailRows();
        const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
        if (dir === "prev" && page > 1) page -= 1;
        if (dir === "next" && page < pages) page += 1;
        renderDetailBody();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    filterApi = window.BIG_DATA_FILTERS?.mount({ prefix: "bd" }) || null;
    bind();
    refreshAll();
  });
})();
