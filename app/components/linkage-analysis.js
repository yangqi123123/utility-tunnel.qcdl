(function () {
  const ui = window.EMERGENCY_UI || {
    escapeHtml: (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])),
    value: (id) => document.getElementById(id)?.value || "",
    setValue: (id, v) => { const el = document.getElementById(id); if (el) el.value = v; },
  };

  const logic = window.LINKAGE_ANALYSIS_LOGIC;
  const data = window.LINKAGE_DATA || {};
  const records = data.records || [];
  const systems = data.systems || [];
  const charts = {};

  const woData = window.WORK_ORDER_DATA || {};
  const locationTree = woData.locationTree || [
    {
      name: "光谷科学岛综合管廊一期",
      corridors: [
        {
          name: "高新大道综合管廊",
          rooms: [
            {
              name: "综合舱",
              sections: [
                { name: "防火分区", pipelines: ["科学岛通信光缆", "科学岛电力管线"] },
                { name: "出入口", pipelines: ["科学岛给水管线"] },
              ],
            },
            { name: "电力舱", sections: [{ name: "通风口", pipelines: ["科学岛电力管线"] }] },
            { name: "燃气舱", sections: [{ name: "防火分区", pipelines: ["科学岛燃气管线"] }] },
          ],
        },
        {
          name: "科学岛大道综合管廊",
          rooms: [{ name: "燃气舱", sections: [{ name: "防火分区", pipelines: ["科学岛燃气管线"] }] }],
        },
      ],
    },
    {
      name: "科学岛综合管廊",
      corridors: [
        { name: "环岛路管廊", rooms: [{ name: "综合舱", sections: [{ name: "吊装口", pipelines: ["科学岛通信光缆"] }] }] },
      ],
    },
  ];

  function destroyChart(id) {
    if (charts[id]) { charts[id].destroy(); delete charts[id]; }
  }

  function showEmpty(wrapId, message) {
    const wrap = document.getElementById(wrapId);
    if (!wrap) return;
    wrap.innerHTML = `<div class="analysis-empty">${ui.escapeHtml(message || "暂无数据")}</div>`;
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
    const labels = config.data?.labels || [];
    const values = (config.data?.datasets || []).flatMap((ds) => ds.data || []);
    const total = values.reduce((sum, n) => sum + Number(n || 0), 0);
    if (!labels.length || total === 0) {
      destroyChart(canvasId);
      showEmpty(wrapId, "暂无数据");
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
        plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } },
        ...(config.options || {}),
      },
    });
  }

  function palette(n) {
    const colors = ["#3B82F6", "#F59E0B", "#EF4444", "#10B981", "#8B5CF6", "#06B6D4", "#64748B", "#EC4899", "#14B8A6", "#F97316", "#6366F1"];
    return Array.from({ length: n }, (_, i) => colors[i % colors.length]);
  }

  function setSelectEnabled(select, enabled, placeholder) {
    if (!select) return;
    select.disabled = !enabled;
    if (!enabled) {
      select.value = "";
      select.innerHTML = `<option value="">${ui.escapeHtml(placeholder)}</option>`;
    }
  }

  function fillSelect(select, values, placeholder, keepValue) {
    if (!select) return;
    const current = keepValue ?? select.value ?? "";
    select.innerHTML = `<option value="">${ui.escapeHtml(placeholder)}</option>${values.map((name) => `<option value="${ui.escapeHtml(name)}">${ui.escapeHtml(name)}</option>`).join("")}`;
    select.disabled = false;
    select.value = values.includes(current) ? current : "";
  }

  function projectNode(name) {
    return locationTree.find((item) => item.name === name) || null;
  }
  function corridorNode(projectName, corridorName) {
    return (projectNode(projectName)?.corridors || []).find((item) => item.name === corridorName) || null;
  }
  function roomNode(projectName, corridorName, roomName) {
    return (corridorNode(projectName, corridorName)?.rooms || []).find((item) => item.name === roomName) || null;
  }
  function sectionNode(projectName, corridorName, roomName, sectionName) {
    return (roomNode(projectName, corridorName, roomName)?.sections || []).find((item) => item.name === sectionName) || null;
  }

  function refreshCascade(level) {
    const projectSel = document.getElementById("analysisProject");
    const corridorSel = document.getElementById("analysisCorridor");
    const roomSel = document.getElementById("analysisRoom");
    const sectionSel = document.getElementById("analysisSection");
    const pipelineSel = document.getElementById("analysisPipeline");
    const project = projectSel?.value || "";
    const corridor = corridorSel?.value || "";
    const room = roomSel?.value || "";
    const section = sectionSel?.value || "";

    if (level === "init" || level === "project") {
      if (project) {
        fillSelect(corridorSel, (projectNode(project)?.corridors || []).map((i) => i.name), "全部管廊", level === "init" ? corridor : "");
      } else {
        setSelectEnabled(corridorSel, false, "请先选择所属项目");
      }
      if (level !== "init") {
        setSelectEnabled(roomSel, false, "请先选择所属管廊");
        setSelectEnabled(sectionSel, false, "请先选择所属舱室");
        setSelectEnabled(pipelineSel, false, "请先选择所属区段");
        return;
      }
    }
    if (level === "init" || level === "corridor" || (level === "project" && project)) {
      const c = corridorSel?.value || "";
      if (c) fillSelect(roomSel, (corridorNode(project, c)?.rooms || []).map((i) => i.name), "全部舱室", level === "init" ? room : "");
      else if (level !== "init") setSelectEnabled(roomSel, false, "请先选择所属管廊");
      if (level === "corridor") {
        setSelectEnabled(sectionSel, false, "请先选择所属舱室");
        setSelectEnabled(pipelineSel, false, "请先选择所属区段");
        return;
      }
    }
    if (level === "init" || level === "room" || level === "corridor") {
      const r = roomSel?.value || "";
      const c = corridorSel?.value || "";
      if (r) fillSelect(sectionSel, (roomNode(project, c, r)?.sections || []).map((i) => i.name), "全部区段", level === "init" ? section : "");
      else if (level !== "init") setSelectEnabled(sectionSel, false, "请先选择所属舱室");
      if (level === "room") {
        setSelectEnabled(pipelineSel, false, "请先选择所属区段");
        return;
      }
    }
    if (level === "init" || level === "section" || level === "room") {
      const s = sectionSel?.value || "";
      const r = roomSel?.value || "";
      const c = corridorSel?.value || "";
      if (s) {
        fillSelect(pipelineSel, sectionNode(project, c, r, s)?.pipelines || [], "全部管线", level === "init" ? (pipelineSel?.value || "") : "");
      } else if (level !== "init") {
        setSelectEnabled(pipelineSel, false, "请先选择所属区段");
      }
    }
  }

  function initLocationCascade() {
    const projectSel = document.getElementById("analysisProject");
    if (!projectSel) return;
    fillSelect(projectSel, locationTree.map((i) => i.name), "全部项目", "");
    setSelectEnabled(document.getElementById("analysisCorridor"), false, "请先选择所属项目");
    setSelectEnabled(document.getElementById("analysisRoom"), false, "请先选择所属管廊");
    setSelectEnabled(document.getElementById("analysisSection"), false, "请先选择所属舱室");
    setSelectEnabled(document.getElementById("analysisPipeline"), false, "请先选择所属区段");

    projectSel.addEventListener("change", () => refreshCascade("project"));
    document.getElementById("analysisCorridor")?.addEventListener("change", () => refreshCascade("corridor"));
    document.getElementById("analysisRoom")?.addEventListener("change", () => refreshCascade("room"));
    document.getElementById("analysisSection")?.addEventListener("change", () => refreshCascade("section"));
  }

  function resetLocationCascade() {
    ui.setValue("analysisProject", "");
    setSelectEnabled(document.getElementById("analysisCorridor"), false, "请先选择所属项目");
    setSelectEnabled(document.getElementById("analysisRoom"), false, "请先选择所属管廊");
    setSelectEnabled(document.getElementById("analysisSection"), false, "请先选择所属舱室");
    setSelectEnabled(document.getElementById("analysisPipeline"), false, "请先选择所属区段");
    const projectSel = document.getElementById("analysisProject");
    if (projectSel) fillSelect(projectSel, locationTree.map((i) => i.name), "全部项目", "");
  }

  function readFilterState() {
    return {
      range: ui.value("analysisRange") || "30",
      start: ui.value("analysisStart"),
      end: ui.value("analysisEnd"),
      project: ui.value("analysisProject"),
      corridor: ui.value("analysisCorridor"),
      room: ui.value("analysisRoom"),
      section: ui.value("analysisSection"),
      pipeline: ui.value("analysisPipeline"),
    };
  }

  function syncCustomVisibility() {
    const row = document.getElementById("analysisFilters");
    if (!row) return;
    row.classList.toggle("show-custom", ui.value("analysisRange") === "custom");
  }

  function renderKpis(summary) {
    const el = document.getElementById("linkageAnalysisKpis");
    if (!el) return;
    const cards = [
      ["联动总次数", summary.total, "fa-solid fa-diagram-project", "is-blue"],
      ["成功", summary.ok, "fa-solid fa-circle-check", "is-green"],
      ["部分成功", summary.partial, "fa-solid fa-triangle-exclamation", "is-amber"],
      ["失败", summary.fail, "fa-solid fa-circle-xmark", "is-red"],
      ["成功率", summary.rate, "fa-solid fa-percent", "is-cyan"],
    ];
    el.innerHTML = cards.map(([label, value, icon, tone]) => `
      <article class="analysis-kpi ${tone}">
        <div class="analysis-kpi-icon"><i class="${icon}"></i></div>
        <div class="analysis-kpi-body">
          <span class="analysis-kpi-label">${ui.escapeHtml(label)}</span>
          <strong class="analysis-kpi-value">${ui.escapeHtml(value)}</strong>
        </div>
      </article>`).join("");
  }

  function systemLabel(name) {
    if (name === "环境与设备监控") return "环境与设备系统";
    return name || "";
  }

  function renderCharts(filtered, bounds) {
    if (!logic) return;

    const bySystem = logic.countBySystem(filtered, systems);
    const sysLabels = systems.filter((s) => (bySystem.get(s) || 0) > 0);
    renderChart("wrapSystemShare", "chartSystemShare", {
      type: "doughnut",
      data: {
        labels: sysLabels,
        datasets: [{ data: sysLabels.map((k) => bySystem.get(k) || 0), backgroundColor: palette(sysLabels.length) }],
      },
    });

    const trend = logic.trendByDay(filtered, bounds.start, bounds.end);
    renderChart("wrapLinkageTrend", "chartLinkageTrend", {
      type: "line",
      data: {
        labels: trend.labels,
        datasets: [{
          label: "联动次数",
          data: trend.values,
          borderColor: "#3B82F6",
          backgroundColor: "rgba(59,130,246,.12)",
          tension: 0.3,
          fill: true,
        }],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { title: { display: true, text: "时间", font: { size: 11 } } },
          y: { title: { display: true, text: "数量", font: { size: 11 } }, beginAtZero: true, ticks: { precision: 0 } },
        },
      },
    });

    const resultKeys = logic.RESULTS || ["成功", "部分成功", "失败"];
    const bySystemResult = logic.countBySystemResult
      ? logic.countBySystemResult(filtered, systems)
      : new Map(systems.map((s) => [s, { 成功: 0, 部分成功: 0, 失败: 0 }]));
    const resultColors = { 成功: "#10B981", 部分成功: "#F59E0B", 失败: "#EF4444" };
    renderChart("wrapResultShare", "chartResultShare", {
      type: "bar",
      data: {
        labels: systems.map(systemLabel),
        datasets: resultKeys.map((key) => ({
          label: key,
          data: systems.map((s) => (bySystemResult.get(s) || {})[key] || 0),
          backgroundColor: resultColors[key] || "#64748B",
          stack: "result",
        })),
      },
      options: {
        plugins: {
          legend: { display: true, position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } },
        },
        scales: {
          x: {
            stacked: true,
            ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 30 },
          },
          y: {
            stacked: true,
            beginAtZero: true,
            ticks: { precision: 0 },
            title: { display: true, text: "次数", font: { size: 11 } },
          },
        },
      },
    });

    const byCorridor = logic.countByCorridor ? logic.countByCorridor(filtered) : new Map();
    const corridorEntries = [...byCorridor.entries()].sort((a, b) => b[1] - a[1]);
    renderChart("wrapCorridorShare", "chartCorridorShare", {
      type: "bar",
      data: {
        labels: corridorEntries.map(([name]) => name),
        datasets: [{
          label: "联动次数",
          data: corridorEntries.map(([, count]) => count),
          backgroundColor: "#5B83FF",
          borderRadius: 2,
        }],
      },
      options: {
        indexAxis: "y",
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: "次数", font: { size: 11 } } },
          y: { ticks: { font: { size: 11 } } },
        },
      },
    });
  }

  function refresh() {
    if (!logic) return;
    try {
      const state = readFilterState();
      const bounds = logic.rangeBounds(state);
      const filtered = logic.filterRecords(records, state);
      const summary = logic.summarize(filtered);
      renderKpis(summary);
      renderCharts(filtered, bounds);
    } catch (error) {
      console.error(error);
    }
  }

  function bind() {
    document.getElementById("analysisRange")?.addEventListener("change", syncCustomVisibility);
    document.addEventListener("click", (event) => {
      const action = event.target.closest("[data-analysis-action]")?.getAttribute("data-analysis-action");
      if (!action) return;
      if (action === "query") refresh();
      if (action === "reset") {
        ui.setValue("analysisRange", "30");
        ui.setValue("analysisStart", "");
        ui.setValue("analysisEnd", "");
        resetLocationCascade();
        syncCustomVisibility();
        refresh();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    syncCustomVisibility();
    initLocationCascade();
    bind();
    refresh();
  });
})();
