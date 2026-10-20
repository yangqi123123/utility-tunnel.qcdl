(function () {
  const logic = window.MAINTENANCE_STATS_LOGIC;
  if (!logic) return;

  const charts = {};
  const dataRoot = () => window.MAINTENANCE_DATA || {};
  const detailState = { page: 1, pageSize: 10, rows: [] };

  /* 仅统计页补充演示样本，不改动保养任务列表数据源 */
  const STATS_EXTRA_TASKS = [
    {
      id: "STATS-DEMO-001",
      code: "IT202609200900901001",
      name: "低压配电设备运行保养-202609200900",
      planId: "PLAN-002",
      planName: "低压配电设备运行保养",
      project: "光谷科学岛综合管廊一期",
      inspector: "潘隆坤",
      status: "已完成",
      result: "正常",
      abnormalCount: 0,
      plannedAt: "2026-09-20 09:00:00",
      deadline: "2026-09-21 09:00:00",
      startedAt: "2026-09-20 09:28:00",
      submittedAt: "2026-09-20 11:00:00",
      abnormalReports: [],
    },
    {
      id: "STATS-DEMO-002",
      code: "IT202609220900901002",
      name: "综合舱气体报警设备日保养-202609220900",
      planId: "PLAN-001",
      planName: "综合舱气体报警设备日保养",
      project: "光谷科学岛综合管廊一期",
      inspector: "物管员",
      status: "已完成",
      result: "正常",
      abnormalCount: 1,
      plannedAt: "2026-09-22 09:00:00",
      deadline: "2026-09-23 09:00:00",
      startedAt: "2026-09-22 09:40:00",
      submittedAt: "2026-09-22 12:10:00",
      abnormalReports: [{ category: "设备故障", handleStatus: "已处理" }],
    },
    {
      id: "STATS-DEMO-003",
      code: "IT202609250900901003",
      name: "每周综合保养计划-202609250900",
      planId: "PLAN-003",
      planName: "每周综合保养计划",
      project: "光谷科学岛综合管廊一期",
      inspector: "黄志深",
      status: "保养中",
      result: "-",
      abnormalCount: 2,
      plannedAt: "2026-09-25 09:00:00",
      deadline: "2026-09-25 17:00:00",
      startedAt: "2026-09-25 09:08:00",
      submittedAt: "-",
      abnormalReports: [{ category: "运行异常", handleStatus: "处理中" }, { category: "环境异常", handleStatus: "处理中" }],
    },
    {
      id: "STATS-DEMO-004",
      code: "IT202609280900901004",
      name: "低压配电设备运行保养-202609280900",
      planId: "PLAN-002",
      planName: "低压配电设备运行保养",
      project: "光谷科学岛综合管廊一期",
      inspector: "潘隆坤",
      status: "待保养",
      result: "-",
      abnormalCount: 1,
      plannedAt: "2026-09-28 09:00:00",
      deadline: "2026-09-29 09:00:00",
      startedAt: "-",
      submittedAt: "-",
      abnormalReports: [{ category: "外观异常", handleStatus: "未处理" }],
    },
    {
      id: "STATS-DEMO-005",
      code: "IT202610010900901005",
      name: "综合舱气体报警设备日保养-202610010900",
      planId: "PLAN-001",
      planName: "综合舱气体报警设备日保养",
      project: "光谷科学岛综合管廊一期",
      inspector: "物管员",
      status: "验收中",
      result: "-",
      abnormalCount: 0,
      plannedAt: "2026-10-01 09:00:00",
      deadline: "2026-10-02 09:00:00",
      startedAt: "2026-10-01 09:03:00",
      submittedAt: "2026-10-01 10:20:00",
      abnormalReports: [],
    },
  ];

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function valueOf(id) {
    return document.getElementById(id)?.value ?? "";
  }

  function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
  }

  function planProjectMap() {
    const map = new Map();
    (dataRoot().plans || []).forEach((plan) => map.set(plan.id, plan.project || ""));
    return map;
  }

  function allTasks() {
    const projectByPlan = planProjectMap();
    const base = (dataRoot().tasks || []).map((task) => ({
      ...task,
      project: task.project || projectByPlan.get(task.planId) || "",
    }));
    return base.concat(STATS_EXTRA_TASKS);
  }

  function uniqueSorted(values) {
    return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "zh-CN"));
  }

  function fillSelect(id, values, placeholder) {
    const select = document.getElementById(id);
    if (!select) return;
    const current = select.value;
    select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>${values
      .map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
      .join("")}`;
    select.value = values.includes(current) ? current : "";
  }

  function initFilterOptions() {
    const tasks = allTasks();
    fillSelect("statsProject", uniqueSorted(tasks.map((t) => t.project)), "全部项目");
    fillSelect("statsInspector", uniqueSorted(tasks.map((t) => t.inspector)), "全部人员");
    fillSelect(
      "statsPlan",
      uniqueSorted(tasks.map((t) => t.planName)),
      "全部计划",
    );
  }

  function rangeBounds(state) {
    const end = new Date(logic.DEMO_NOW.getTime());
    end.setHours(23, 59, 59, 999);
    if (state.range === "custom") {
      const start = logic.parseDate(state.start) || new Date(end.getTime() - 29 * 86400000);
      start.setHours(0, 0, 0, 0);
      const customEnd = logic.parseDate(state.end) || end;
      customEnd.setHours(23, 59, 59, 999);
      return { start, end: customEnd };
    }
    const days = Number(state.range) || 30;
    const start = new Date(end.getTime() - (days - 1) * 86400000);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  function inRange(date, start, end) {
    if (!date) return false;
    return date >= start && date <= end;
  }

  function readFilterState() {
    return {
      range: valueOf("statsRange") || "30",
      start: valueOf("statsStart"),
      end: valueOf("statsEnd"),
      project: valueOf("statsProject"),
      inspector: valueOf("statsInspector"),
      planName: valueOf("statsPlan"),
      overdue: valueOf("statsOverdue"),
    };
  }

  function collect(state) {
    const bounds = rangeBounds(state);
    const enriched = allTasks().map((task) => ({
      ...task,
      executionJudge: logic.judgeExecution(task, logic.DEMO_NOW),
    }));
    const filtered = enriched.filter((task) => {
      const planned = logic.parseDate(task.plannedAt);
      if (!inRange(planned, bounds.start, bounds.end)) return false;
      if (state.project && task.project !== state.project) return false;
      if (state.inspector && task.inspector !== state.inspector) return false;
      if (state.planName && task.planName !== state.planName) return false;
      if (state.overdue && displayOverdue(task) !== state.overdue) return false;
      return true;
    });
    return { ...logic.summarize(filtered, logic.DEMO_NOW), start: bounds.start, end: bounds.end };
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

  function miniHtml(items) {
    return items
      .map(
        ([label, value]) =>
          `<div class="analysis-mini-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`,
      )
      .join("");
  }

  function judgeClass(judge) {
    if (judge === "正点") return "inspection-status-normal";
    if (judge === "误点") return "inspection-status-warning";
    if (judge === "漏保养") return "inspection-status-danger";
    return "inspection-status-muted";
  }

  const TASK_STATUSES = ["待保养", "保养中", "验收中", "已完成", "已关闭"];
  const STATUS_COLORS = {
    待保养: "#5B83FF",
    保养中: "#F7BA1E",
    验收中: "#8B5CF6",
    已完成: "#14C9BA",
    已关闭: "#94A3B8",
  };

  function countStatus(rows, status) {
    return rows.filter((row) => row.status === status).length;
  }

  function completeRateNumber(rows) {
    if (!rows.length) return 0;
    return Math.round((rows.filter((row) => row.status === "已完成").length / rows.length) * 100);
  }

  function isOverdueTask(task) {
    if (task.overdue === "已逾期") return true;
    if (task.overdue === "未逾期" || task.overdue === "未超期") return false;
    const deadline = logic.parseDate(task.deadline);
    return !!(deadline && logic.DEMO_NOW > deadline && ["待保养", "保养中"].includes(task.status));
  }

  function displayOverdue(task) {
    return isOverdueTask(task) ? "已逾期" : "未逾期";
  }

  function statusClass(status) {
    if (status === "已完成") return "inspection-status-normal";
    if (status === "已关闭") return "inspection-status-muted";
    return "inspection-status-warning";
  }

  function levelClass(level) {
    return level === "高" ? "inspection-status-danger" : "inspection-status-warning";
  }

  function eventCategories(rows) {
    const map = new Map();
    rows.forEach((row) => {
      if (Array.isArray(row.abnormalReports) && row.abnormalReports.length) {
        row.abnormalReports.forEach((item) => {
          const name = item.category || "未分类";
          map.set(name, (map.get(name) || 0) + 1);
        });
      } else if (Number(row.abnormalCount) > 0) {
        map.set("未分类异常", (map.get("未分类异常") || 0) + Number(row.abnormalCount));
      }
    });
    return map;
  }

  function isAbnormalTask(row) {
    return Number(row.abnormalCount) > 0 || (row.abnormalReports || []).length > 0;
  }

  function eventHandleStatus(row) {
    const reports = row.abnormalReports || [];
    if (reports.some((item) => item.handleStatus)) {
      if (reports.some((item) => item.handleStatus === "未处理")) return "未处理";
      if (reports.some((item) => item.handleStatus === "处理中")) return "处理中";
      return "已处理";
    }
    if (row.status === "已完成" || row.status === "已关闭") return "已处理";
    if (row.status === "保养中" || row.status === "验收中") return "处理中";
    return "未处理";
  }

  function dualAxisOptions() {
    return {
      scales: {
        x: { stacked: true },
        y: { stacked: true, beginAtZero: true, position: "left", title: { display: true, text: "数量" }, ticks: { precision: 0 } },
        y1: {
          beginAtZero: true,
          position: "right",
          min: 0,
          max: 100,
          title: { display: true, text: "%" },
          grid: { drawOnChartArea: false },
          ticks: { callback: (value) => `${value}%` },
        },
      },
    };
  }

  function renderKpis(summary) {
    const root = document.getElementById("maintenanceStatsKpis");
    if (!root) return;
    const rows = summary.rows || [];
    const cards = [
      ["待保养", countStatus(rows, "待保养"), "fa-solid fa-hourglass-half", "is-blue"],
      ["已完成", countStatus(rows, "已完成"), "fa-solid fa-circle-check", "is-green"],
      ["异常事件数", summary.abnormalEvents, "fa-solid fa-bolt", "is-purple"],
      ["任务完成率", summary.completeRate, "fa-solid fa-chart-pie", "is-cyan"],
      ["正点率", summary.onTimeRate, "fa-solid fa-clock", "is-amber"],
      ["误点率", summary.lateRate, "fa-solid fa-clock-rotate-left", "is-red"],
    ];
    root.innerHTML = cards
      .map(
        ([label, value, icon, tone]) => `
      <article class="analysis-kpi ${tone}">
        <div class="analysis-kpi-icon"><i class="${icon}" aria-hidden="true"></i></div>
        <div class="analysis-kpi-body">
          <span class="analysis-kpi-label">${escapeHtml(label)}</span>
          <strong class="analysis-kpi-value">${escapeHtml(value)}</strong>
        </div>
      </article>`,
      )
      .join("");
  }

  function renderPersonChart(rows) {
    const inspectors = uniqueSorted(rows.map((r) => r.inspector));
    const onTime = inspectors.map((name) => rows.filter((r) => r.inspector === name && r.executionJudge === "正点").length);
    const late = inspectors.map((name) => rows.filter((r) => r.inspector === name && r.executionJudge === "误点").length);
    const rates = inspectors.map((name) => completeRateNumber(rows.filter((r) => r.inspector === name)));
    renderChart("wrapPersonQuality", "chartPersonQuality", {
      type: "bar",
      data: {
        labels: inspectors,
        datasets: [
          { label: "正点", data: onTime, backgroundColor: "#14C9BA", stack: "quality", yAxisID: "y", order: 2 },
          { label: "误点", data: late, backgroundColor: "#F7BA1E", stack: "quality", yAxisID: "y", order: 2 },
          { type: "line", label: "完成率", data: rates, borderColor: "#5B83FF", backgroundColor: "#5B83FF", yAxisID: "y1", tension: 0.3, order: 1 },
        ],
      },
      options: dualAxisOptions(),
    });
    let best = "—";
    let bestRate = -1;
    inspectors.forEach((name, index) => {
      if (rates[index] > bestRate) {
        bestRate = rates[index];
        best = name;
      }
    });
    const mini = document.getElementById("miniPerson");
    if (mini) mini.innerHTML = miniHtml([["完成率最高", best], ["保养人数", inspectors.length]]);
  }

  function dayKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function bucketDays(rows, bounds) {
    const buckets = [];
    const cursor = new Date(bounds.start);
    cursor.setHours(0, 0, 0, 0);
    const endDay = new Date(bounds.end);
    endDay.setHours(0, 0, 0, 0);
    while (cursor <= endDay) {
      const key = dayKey(cursor);
      buckets.push({
        label: key.slice(5),
        rows: rows.filter((row) => {
          const planned = logic.parseDate(row.plannedAt);
          return planned && dayKey(planned) === key;
        }),
      });
      cursor.setDate(cursor.getDate() + 1);
      if (buckets.length > 90) break;
    }
    if (buckets.length <= 45) return buckets;
    const grouped = [];
    for (let index = 0; index < buckets.length; index += 7) {
      const slice = buckets.slice(index, index + 7);
      grouped.push({
        label: slice[0].label,
        rows: slice.flatMap((item) => item.rows),
      });
    }
    return grouped;
  }

  function renderTrend(rows, bounds) {
    const buckets = bucketDays(rows, bounds);
    const labels = buckets.map((item) => item.label);
    const datasets = TASK_STATUSES.map((status) => ({
      label: status,
      data: buckets.map((item) => countStatus(item.rows, status)),
      backgroundColor: STATUS_COLORS[status],
      stack: "status",
      yAxisID: "y",
      order: 2,
    }));
    datasets.push({
      type: "line",
      label: "完成率",
      data: buckets.map((item) => completeRateNumber(item.rows)),
      borderColor: "#135AFA",
      backgroundColor: "#135AFA",
      yAxisID: "y1",
      tension: 0.3,
      order: 1,
    });
    renderChart("wrapExecTrend", "chartExecTrend", {
      type: "bar",
      data: { labels, datasets },
      options: dualAxisOptions(),
    });
    const mini = document.getElementById("miniTrend");
    if (mini) {
      mini.innerHTML = miniHtml([
        ...TASK_STATUSES.map((status) => [status, countStatus(rows, status)]),
        ["完成率", `${completeRateNumber(rows)}%`],
      ]);
    }
  }

  function renderPlanCheck(rows) {
    const plans = uniqueSorted(rows.map((r) => r.planName));
    const totals = plans.map((name) => rows.filter((r) => r.planName === name).length);
    const done = plans.map((name) => rows.filter((r) => r.planName === name && r.status === "已完成").length);
    const overdue = plans.map((name) => rows.filter((r) => r.planName === name && isOverdueTask(r)).length);
    renderChart("wrapPlanCheck", "chartPlanCheck", {
      type: "bar",
      data: {
        labels: plans,
        datasets: [
          { label: "任务数", data: totals, backgroundColor: "#5B83FF" },
          { label: "已完成", data: done, backgroundColor: "#14C9BA" },
          { label: "任务逾期数", data: overdue, backgroundColor: "#F53F57" },
        ],
      },
      options: { scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } },
    });
    let worst = "—";
    let worstRate = 2;
    plans.forEach((name, index) => {
      const rate = totals[index] ? done[index] / totals[index] : 1;
      if (rate < worstRate) {
        worstRate = rate;
        worst = name;
      }
    });
    const mini = document.getElementById("miniPlan");
    if (mini) mini.innerHTML = miniHtml([["完成率最低计划", worst], ["计划数", plans.length]]);
  }

  function renderEvents(rows) {
    const catMap = eventCategories(rows);
    const catLabels = [...catMap.keys()];
    const colors = ["#8B5CF6", "#F59E0B", "#EF4444", "#06B6D4", "#64748B"];
    if (!catLabels.length) {
      destroyChart("chartEventCategory");
      showEmpty("wrapEventCategory", "暂无异常事件");
      destroyChart("chartEventTrend");
      showEmpty("wrapEventTrend", "暂无异常事件");
    } else {
      renderChart("wrapEventCategory", "chartEventCategory", {
        type: "doughnut",
        data: {
          labels: catLabels,
          datasets: [{ data: catLabels.map((key) => catMap.get(key) || 0), backgroundColor: colors }],
        },
      });
      renderChart("wrapEventTrend", "chartEventTrend", {
        type: "line",
        data: {
          labels: catLabels,
          datasets: [{
            label: "数量",
            data: catLabels.map((key) => catMap.get(key) || 0),
            borderColor: "#8B5CF6",
            backgroundColor: "rgba(139,92,246,.12)",
            tension: 0.3,
            fill: true,
          }],
        },
        options: {
          plugins: { legend: { display: false } },
          scales: {
            x: { title: { display: true, text: "事件" } },
            y: { beginAtZero: true, title: { display: true, text: "数量" }, ticks: { precision: 0 } },
          },
        },
      });
    }
    const abnormalTasks = rows.filter(isAbnormalTask);
    const mini = document.getElementById("miniEvent");
    if (mini) {
      mini.innerHTML = miniHtml([
        ["异常任务数量", abnormalTasks.length],
        ["未处理", abnormalTasks.filter((row) => eventHandleStatus(row) === "未处理").length],
        ["处理中", abnormalTasks.filter((row) => eventHandleStatus(row) === "处理中").length],
        ["已处理", abnormalTasks.filter((row) => eventHandleStatus(row) === "已处理").length],
      ]);
    }
  }

  function renderDetailPagination(total) {
    const target = document.getElementById("statsDetailPagination");
    if (!target) return;
    const pages = Math.max(1, Math.ceil(total / detailState.pageSize));
    if (detailState.page > pages) detailState.page = pages;
    target.innerHTML = `<span>共 ${total} 条记录，每页 ${detailState.pageSize} 条</span><div class="pagination-controls"><button type="button" data-stats-page="prev" ${detailState.page <= 1 ? "disabled" : ""}>‹</button>${Array.from({ length: pages }, (_, index) => `<button type="button" class="${index + 1 === detailState.page ? "active" : ""}" data-stats-page="${index + 1}">${index + 1}</button>`).join("")}<button type="button" data-stats-page="next" ${detailState.page >= pages ? "disabled" : ""}>›</button></div>`;
  }

  function renderDetail(rows, resetPage) {
    if (resetPage) detailState.page = 1;
    detailState.rows = rows || [];
    const body = document.getElementById("statsDetailBody");
    if (!body) return;
    const total = detailState.rows.length;
    if (!total) {
      body.innerHTML = `<tr><td colspan="17" class="inspection-stats-empty">暂无符合条件的任务</td></tr>`;
      renderDetailPagination(0);
      return;
    }
    const pages = Math.max(1, Math.ceil(total / detailState.pageSize));
    if (detailState.page > pages) detailState.page = pages;
    const pageRows = detailState.rows.slice(
      (detailState.page - 1) * detailState.pageSize,
      detailState.page * detailState.pageSize,
    );
    body.innerHTML = pageRows
      .map((row) => {
        const overdue = displayOverdue(row);
        return `<tr>
        <td title="${escapeHtml(row.code)}">${escapeHtml(row.code || "-")}</td>
        <td title="${escapeHtml(row.name)}">${escapeHtml(row.name || "-")}</td>
        <td>${escapeHtml(row.planName || "-")}</td>
        <td><span class="inspection-status ${levelClass(row.level)}">${escapeHtml(row.level || "-")}</span></td>
        <td>${escapeHtml(row.inspector || "-")}</td>
        <td>${escapeHtml(row.owner || "-")}</td>
        <td><span class="inspection-status ${statusClass(row.status)}">${escapeHtml(row.status || "-")}</span></td>
        <td><span class="inspection-status inspection-status-muted">${escapeHtml(row.result || "-")}</span></td>
        <td><span class="inspection-status ${overdue === "未逾期" ? "inspection-status-normal" : "inspection-status-danger"}">${escapeHtml(overdue)}</span></td>
        <td>${escapeHtml(row.deviceCount ?? (row.deviceIds || []).length)}/${escapeHtml(row.itemCount ?? "-")}</td>
        <td>${escapeHtml(row.abnormalCount ?? (row.abnormalReports || []).length)}</td>
        <td>${escapeHtml(row.plannedAt || "-")}</td>
        <td>${escapeHtml(row.deadline || "-")}</td>
        <td>${escapeHtml(row.startedAt || "-")}</td>
        <td>${escapeHtml(row.submittedAt || "-")}</td>
        <td>${escapeHtml(row.duration || "-")}</td>
        <td class="action-cell"><button class="table-action" type="button" data-stats-detail="${escapeHtml(row.id)}">详情</button></td>
      </tr>`;
      })
      .join("");
    renderDetailPagination(total);
  }

  function openStatsDetail(row) {
    if (!row || typeof window.openMaintenanceTaskDetail !== "function") return;
    const plan = (dataRoot().plans || []).find((item) => item.id === row.planId);
    const deviceIds = row.deviceIds?.length ? row.deviceIds : (plan?.deviceIds || []);
    window.openMaintenanceTaskDetail({
      ...row,
      deviceIds,
      level: row.level || plan?.level || "中",
      owner: row.owner || plan?.owner || "-",
      overdue: displayOverdue(row),
      deviceCount: row.deviceCount ?? deviceIds.length,
      itemCount: row.itemCount ?? "-",
      duration: row.duration || "-",
      note: row.note || "-",
      project: row.project || plan?.project || "",
    });
  }

  function exportRows() {
    const headers = ["任务编码", "任务名称", "计划", "等级", "保养人", "负责人", "状态", "结果", "超期状态", "设备/检查项", "异常项", "计划执行", "截止时间", "开始时间", "提交时间", "保养时长"];
    const lines = detailState.rows.map((row) => [
      row.code,
      row.name,
      row.planName,
      row.level,
      row.inspector,
      row.owner,
      row.status,
      row.result,
      displayOverdue(row),
      `${row.deviceCount ?? (row.deviceIds || []).length}/${row.itemCount ?? "-"}`,
      row.abnormalCount ?? (row.abnormalReports || []).length,
      row.plannedAt,
      row.deadline,
      row.startedAt,
      row.submittedAt,
      row.duration,
    ]);
    const csv = [headers, ...lines]
      .map((cells) => cells.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "保养执行核查明细.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function syncCustomVisibility() {
    const row = document.getElementById("statsFilters");
    if (!row) return;
    row.classList.toggle("show-custom", valueOf("statsRange") === "custom");
  }

  function refresh(resetPage) {
    const summary = collect(readFilterState());
    renderKpis(summary);
    renderPersonChart(summary.rows);
    renderTrend(summary.rows, { start: summary.start, end: summary.end });
    renderPlanCheck(summary.rows);
    renderEvents(summary.rows);
    renderDetail(summary.rows, resetPage !== false);
  }

  function resetFilters() {
    setValue("statsRange", "30");
    setValue("statsStart", "");
    setValue("statsEnd", "");
    setValue("statsProject", "");
    setValue("statsInspector", "");
    setValue("statsPlan", "");
    setValue("statsOverdue", "");
    syncCustomVisibility();
  }

  function bind() {
    document.getElementById("statsRange")?.addEventListener("change", syncCustomVisibility);
    document.addEventListener("click", (event) => {
      const pageButton = event.target.closest("[data-stats-page]");
      if (pageButton && !pageButton.disabled) {
        const action = pageButton.getAttribute("data-stats-page");
        const pages = Math.max(1, Math.ceil(detailState.rows.length / detailState.pageSize));
        detailState.page =
          action === "prev"
            ? Math.max(1, detailState.page - 1)
            : action === "next"
              ? Math.min(pages, detailState.page + 1)
              : Number(action) || 1;
        renderDetail(detailState.rows, false);
        return;
      }
      const detailButton = event.target.closest("[data-stats-detail]");
      if (detailButton) {
        const row = detailState.rows.find((item) => item.id === detailButton.getAttribute("data-stats-detail"));
        openStatsDetail(row);
        return;
      }
      const action = event.target.closest("[data-stats-action]")?.getAttribute("data-stats-action");
      if (!action) return;
      if (action === "query") refresh(true);
      if (action === "export") exportRows();
      if (action === "reset") {
        resetFilters();
        refresh(true);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initFilterOptions();
    syncCustomVisibility();
    bind();
    refresh();
  });
})();
