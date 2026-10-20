(function () {
  const ui = window.EMERGENCY_UI;
  const store = () => window.EMERGENCY_STORE;
  const charts = {};
  const EVENT_STATUSES = ["待指派", "待处理", "处理中", "验收中", "已完成", "已关闭"];
  const OPEN_STATUSES = ["待指派", "待处理", "处理中", "验收中"];
  const EVENT_TYPES = ["燃气泄漏", "火灾", "积水", "设备故障", "入侵告警", "其他"];
  const LOW_STOCK_THRESHOLD = 5;

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

  const normalizeEventStatus = (status) => {
    const map = { 待确认: "待指派", 已确认: "待处理", 待复核: "验收中", 误报关闭: "已关闭", 已撤回: "已关闭", 已升级: "处理中", 处置失败: "处理中" };
    return map[status] || status || "待指派";
  };

  function parseDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function inRange(date, start, end) {
    if (!date) return false;
    return date >= start && date <= end;
  }

  function rangeBounds(state) {
    const end = new Date();
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

  function countBy(list, keyFn) {
    const map = new Map();
    list.forEach((item) => {
      const key = keyFn(item) || "未分类";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }

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

  function miniHtml(items) {
    return items.map(([label, value]) => `<div class="analysis-mini-metric"><span>${ui.escapeHtml(label)}</span><strong>${ui.escapeHtml(value)}</strong></div>`).join("");
  }

  function palette(n) {
    const colors = ["#3B82F6", "#F59E0B", "#EF4444", "#10B981", "#8B5CF6", "#06B6D4", "#64748B", "#EC4899"];
    return Array.from({ length: n }, (_, i) => colors[i % colors.length]);
  }

  function formatDuration(totalSeconds) {
    const sec = Math.max(0, Math.round(Number(totalSeconds) || 0));
    if (!sec) return "0秒";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const parts = [];
    if (h) parts.push(`${h}小时`);
    if (m) parts.push(`${m}分`);
    if (s || !parts.length) parts.push(`${s}秒`);
    return parts.join("");
  }

  function inferRiskEventType(risk, eventsById) {
    if (risk.eventType) return risk.eventType;
    if (risk.linkedEventId && eventsById[risk.linkedEventId]?.eventType) {
      return eventsById[risk.linkedEventId].eventType;
    }
    const text = `${risk.title || ""} ${risk.objectName || ""} ${risk.objectType || ""} ${risk.source || ""}`;
    if (/燃气|泄漏/.test(text)) return "燃气泄漏";
    if (/火|烟|灭火/.test(text)) return "火灾";
    if (/积水|排水/.test(text)) return "积水";
    if (/入侵|门禁/.test(text)) return "入侵告警";
    if (/配电|电力|设备|健康|维保/.test(text)) return "设备故障";
    return "其他";
  }

  function matchLocationFields(item, loc) {
    if (loc.project && item.project && item.project !== loc.project) return false;
    if (loc.corridor && item.corridor && item.corridor !== loc.corridor) return false;
    if (loc.room && item.room && item.room !== loc.room) return false;
    if (loc.section && item.section && item.section !== loc.section) return false;
    if (loc.pipeline && item.pipeline && item.pipeline !== loc.pipeline) return false;
    if (loc.project && !item.project && !String(item.location || "").includes(loc.project)) return false;
    if (loc.corridor && !item.corridor && !String(item.location || "").includes(loc.corridor)) return false;
    if (loc.room && !item.room && !String(item.location || "").includes(loc.room)) return false;
    if (loc.section && !item.section && !String(item.location || item.area || "").includes(loc.section)) return false;
    if (loc.pipeline && !item.pipeline && !String(item.location || item.objectName || "").includes(loc.pipeline)) return false;
    return true;
  }

  function matchLooseLocation(text, loc) {
    const hay = String(text || "");
    if (loc.project && !hay.includes(loc.project) && !/东段|西段|南段|北段|中段/.test(hay)) {
      /* 风险仅有区段关键字时，不强制项目名命中，交由更深层级过滤 */
    }
    if (loc.pipeline && !hay.includes(loc.pipeline)) return false;
    if (loc.section && !hay.includes(loc.section) && !hay.includes(loc.section.replace(/分区|口$/, ""))) {
      // 区段名如「防火分区」与风险 area「东段」不完全一致时，允许仅有区段关键字通过上级
      if (!/(东段|西段|南段|北段|中段)/.test(hay)) return false;
    }
    if (loc.room && !hay.includes(loc.room) && !/(舱|室)/.test(hay)) {
      /* 无舱室信息则不剔除（风险种子常无舱室） */
    }
    if (loc.corridor && !hay.includes(loc.corridor) && !/(管廊)/.test(hay)) {
      /* 无管廊信息则不剔除 */
    }
    return true;
  }

  function hasLocationFilter(loc) {
    return !!(loc.project || loc.corridor || loc.room || loc.section || loc.pipeline);
  }

  function collect(state) {
    const { start, end } = rangeBounds(state);
    const loc = {
      project: state.project || "",
      corridor: state.corridor || "",
      room: state.room || "",
      section: state.section || "",
      pipeline: state.pipeline || "",
    };
    const risksAll = store()?.listRisks?.() || [];
    const eventsAll = store()?.listEvents?.() || [];
    const resourcesAll = store()?.listResources?.() || [];
    const personnelAll = store()?.listPersonnel?.() || [];
    const plansAll = store()?.listPlans?.() || [];
    const callsAll = store()?.listCalls?.() || [];
    const eventsById = Object.fromEntries(eventsAll.map((item) => [item.eventId, item]));

    const events = eventsAll.filter((item) => {
      const t = parseDate(item.occurrenceTime || item.createdAt || item.updatedAt);
      return inRange(t, start, end) && matchLocationFields(item, loc);
    }).map((item) => ({ ...item, status: normalizeEventStatus(item.status) }));

    const risks = risksAll.filter((item) => {
      const t = parseDate(item.predictedAt || item.createdAt);
      if (!inRange(t, start, end)) return false;
      if (!hasLocationFilter(loc)) return true;
      if (item.linkedEventId && eventsById[item.linkedEventId]) {
        return matchLocationFields(eventsById[item.linkedEventId], loc);
      }
      const text = [item.area, item.title, item.objectName, item.objectType, item.location].join(" ");
      return matchLooseLocation(text, loc);
    }).map((item) => ({ ...item, eventType: inferRiskEventType(item, eventsById) }));

    const locText = [loc.project, loc.corridor, loc.room, loc.section, loc.pipeline].filter(Boolean).join(" ");
    const resources = resourcesAll.filter((item) => {
      if (!hasLocationFilter(loc)) return true;
      return matchLooseLocation([item.warehouse, item.location].join(" "), loc)
        || (locText && [item.warehouse, item.location].join(" ").includes(loc.section || loc.corridor || loc.project || ""));
    });
    const personnel = personnelAll.filter((item) => {
      if (!hasLocationFilter(loc)) return true;
      return matchLooseLocation(item.section, loc)
        || (loc.section && String(item.section || "").includes(loc.section))
        || (loc.corridor && String(item.section || "").includes(loc.corridor));
    });
    const plans = plansAll.filter((item) => {
      if (!hasLocationFilter(loc)) return true;
      if (item.area === "全域") return true;
      return matchLooseLocation(item.area, loc) || String(item.area || "").includes(loc.section || loc.corridor || "");
    });

    const eventIds = new Set(events.map((item) => item.eventId));
    const calls = callsAll.filter((item) => {
      const t = parseDate(item.startedAt);
      if (!inRange(t, start, end)) return false;
      if (!hasLocationFilter(loc)) return true;
      if (!item.eventId) return true;
      return eventIds.has(item.eventId);
    });

    return { start, end, risks, events, resources, personnel, plans, calls };
  }

  /* ---------- location cascade ---------- */
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
      if (level === "project") {
        /* keep project, reset children handled below */
      }
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

  function renderKpis(data) {
    const openEvents = data.events.filter((i) => OPEN_STATUSES.includes(i.status)).length;
    const dispatchable = data.personnel.filter((i) => i.dispatchStatus === "可调度").length;
    const availableQty = data.resources.reduce((sum, i) => sum + Number(i.available || 0), 0);
    const enabledPlans = data.plans.filter((i) => i.enabled === "启用" && (i.status === "已发布" || !i.status)).length;
    const el = document.getElementById("riskAnalysisKpis");
    if (!el) return;
    const cards = [
      ["事件总数", data.events.length, "fa-solid fa-bolt", "is-blue"],
      ["在办事件（待指派~验收中）", openEvents, "fa-solid fa-spinner", "is-amber"],
      ["可调度人员", dispatchable, "fa-solid fa-user-check", "is-green"],
      ["可用物资", availableQty, "fa-solid fa-box-open", "is-cyan"],
      ["启用预案", enabledPlans, "fa-solid fa-file-shield", "is-purple"],
      ["通话次数", data.calls.length, "fa-solid fa-phone", "is-red"],
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

  function buildTrendSeries(items, dateFn, bounds) {
    const dayMs = 86400000;
    const labels = [];
    const values = [];
    const cursor = new Date(bounds.start);
    cursor.setHours(0, 0, 0, 0);
    const endDay = new Date(bounds.end);
    endDay.setHours(0, 0, 0, 0);
    while (cursor <= endDay) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      labels.push(key.slice(5));
      values.push(items.filter((item) => {
        const d = dateFn(item);
        if (!d) return false;
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return k === key;
      }).length);
      cursor.setTime(cursor.getTime() + dayMs);
      if (labels.length > 90) break;
    }
    if (labels.length > 45) {
      const tLabels = [];
      const tValues = [];
      for (let i = 0; i < labels.length; i += 7) {
        tLabels.push(labels[i]);
        tValues.push(values.slice(i, i + 7).reduce((a, b) => a + b, 0));
      }
      return { labels: tLabels, values: tValues };
    }
    return { labels, values };
  }

  function renderRisk(data) {
    const typeMap = countBy(data.risks, (i) => i.eventType || "其他");
    const typeLabels = EVENT_TYPES.filter((t) => (typeMap.get(t) || 0) > 0);
    const labels = typeLabels.length ? typeLabels : [...typeMap.keys()];
    renderChart("wrapRiskLevel", "chartRiskLevel", {
      type: "pie",
      data: {
        labels,
        datasets: [{ data: labels.map((k) => typeMap.get(k) || 0), backgroundColor: palette(labels.length) }],
      },
    });

    const trend = buildTrendSeries(
      data.risks,
      (item) => parseDate(item.predictedAt || item.createdAt),
      { start: data.start, end: data.end },
    );
    renderChart("wrapRiskTrend", "chartRiskTrend", {
      type: "line",
      data: {
        labels: trend.labels,
        datasets: [{
          label: "风险次数",
          data: trend.values,
          borderColor: "#EF4444",
          backgroundColor: "rgba(239,68,68,.12)",
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

    const mini = document.getElementById("miniRisk");
    if (mini) {
      const statusCounts = ["待指派", "待处理", "处理中", "已完成", "已关闭"].map((status) => [
        status,
        data.events.filter((i) => i.status === status).length,
      ]);
      mini.innerHTML = miniHtml(statusCounts);
    }
  }

  function renderEvents(data) {
    const statusMap = countBy(data.events, (i) => i.status);
    renderChart("wrapEventStatus", "chartEventStatus", {
      type: "bar",
      data: { labels: EVENT_STATUSES, datasets: [{ label: "事件数", data: EVENT_STATUSES.map((k) => statusMap.get(k) || 0), backgroundColor: palette(6) }] },
      options: { plugins: { legend: { display: false } } },
    });
    const levelMap = countBy(data.events, (i) => i.level || "未分级");
    const levelLabels = [...levelMap.keys()];
    renderChart("wrapEventLevel", "chartEventLevel", {
      type: "pie",
      data: { labels: levelLabels, datasets: [{ data: levelLabels.map((k) => levelMap.get(k) || 0), backgroundColor: palette(levelLabels.length) }] },
    });
    const open = data.events.filter((i) => OPEN_STATUSES.includes(i.status)).length;
    const completed = data.events.filter((i) => i.status === "已完成" || i.status === "已关闭").length;
    const rate = data.events.length ? `${Math.round((completed / data.events.length) * 100)}%` : "-";
    const mini = document.getElementById("miniEvent");
    if (mini) mini.innerHTML = miniHtml([["在办合计", open], ["完成率", rate], ["事件总数", data.events.length]]);
  }

  function renderResources(data) {
    const cats = [...new Set(data.resources.map((i) => i.category || "未分类"))];
    const available = cats.map((c) => data.resources.filter((i) => (i.category || "未分类") === c).reduce((s, i) => s + Number(i.available || 0), 0));
    const occupied = cats.map((c) => data.resources.filter((i) => (i.category || "未分类") === c).reduce((s, i) => s + Number(i.occupied || 0), 0));
    renderChart("wrapResourceCategory", "chartResourceCategory", {
      type: "bar",
      data: {
        labels: cats,
        datasets: [
          { label: "可用", data: available, backgroundColor: "#10B981" },
          { label: "已占用", data: occupied, backgroundColor: "#F59E0B" },
        ],
      },
    });
    const whMap = countBy(data.resources, (i) => i.warehouse || "未分配仓库");
    const whLabels = [...whMap.keys()].slice(0, 6);
    renderChart("wrapResourceWarehouse", "chartResourceWarehouse", {
      type: "bar",
      data: { labels: whLabels, datasets: [{ label: "物资条数", data: whLabels.map((k) => whMap.get(k) || 0), backgroundColor: "#06B6D4" }] },
      options: { plugins: { legend: { display: false } } },
    });
    const low = data.resources.filter((i) => Number(i.available || 0) < LOW_STOCK_THRESHOLD).length;
    const now = Date.now();
    const expiring = data.resources.filter((i) => {
      const d = parseDate(i.expiryDate);
      if (!d) return false;
      const days = (d.getTime() - now) / 86400000;
      return days >= 0 && days <= 90;
    }).length;
    const mini = document.getElementById("miniResource");
    if (mini) mini.innerHTML = miniHtml([["低库存（小于5）", low], ["临期(90天)", expiring], ["物资种类", data.resources.length]]);
  }

  function renderPersonnel(data) {
    const typeMap = countBy(data.personnel, (i) => i.type || "未分类");
    const typeLabels = [...typeMap.keys()];
    renderChart("wrapPersonnelType", "chartPersonnelType", {
      type: "doughnut",
      data: { labels: typeLabels, datasets: [{ data: typeLabels.map((k) => typeMap.get(k) || 0), backgroundColor: palette(typeLabels.length) }] },
    });
    const dispatchLabels = ["可调度", "已调度", "不可调度"];
    const dispatchMap = countBy(data.personnel, (i) => i.dispatchStatus || "不可调度");
    renderChart("wrapPersonnelDispatch", "chartPersonnelDispatch", {
      type: "bar",
      data: { labels: dispatchLabels, datasets: [{ label: "人数", data: dispatchLabels.map((k) => dispatchMap.get(k) || 0), backgroundColor: ["#10B981", "#F59E0B", "#94A3B8"] }] },
      options: { plugins: { legend: { display: false } } },
    });
    const mini = document.getElementById("miniPersonnel");
    if (mini) {
      mini.innerHTML = miniHtml([
        ["在册总数", data.personnel.length],
        ["可调度", data.personnel.filter((i) => i.dispatchStatus === "可调度").length],
        ["在线", data.personnel.filter((i) => i.onlineStatus === "在线").length],
      ]);
    }
  }

  function renderPlans(data) {
    const typeMap = countBy(data.plans, (i) => i.eventType || "未分类");
    const typeLabels = [...typeMap.keys()];
    renderChart("wrapPlanType", "chartPlanType", {
      type: "bar",
      data: { labels: typeLabels, datasets: [{ label: "预案数", data: typeLabels.map((k) => typeMap.get(k) || 0), backgroundColor: "#8B5CF6" }] },
      options: { plugins: { legend: { display: false } } },
    });
    const enabledMap = countBy(data.plans, (i) => i.enabled || "停用");
    const enLabels = ["启用", "停用"];
    renderChart("wrapPlanEnabled", "chartPlanEnabled", {
      type: "doughnut",
      data: { labels: enLabels, datasets: [{ data: enLabels.map((k) => enabledMap.get(k) || 0), backgroundColor: ["#10B981", "#94A3B8"] }] },
    });
    const publishedEnabled = data.plans.filter((i) => i.enabled === "启用" && (i.status === "已发布" || !i.status)).length;
    const mini = document.getElementById("miniPlan");
    if (mini) mini.innerHTML = miniHtml([["预案总数", data.plans.length], ["已发布且启用", publishedEnabled]]);
  }

  function renderCalls(data, bounds) {
    const trend = buildTrendSeries(data.calls, (c) => parseDate(c.startedAt), bounds);
    renderChart("wrapCallTrend", "chartCallTrend", {
      type: "line",
      data: { labels: trend.labels, datasets: [{ label: "通话量", data: trend.values, borderColor: "#3B82F6", tension: 0.3, fill: false }] },
      options: { plugins: { legend: { display: false } } },
    });
    const resultMap = countBy(data.calls, (i) => i.result || "未知");
    const resultLabels = [...resultMap.keys()];
    renderChart("wrapCallResult", "chartCallResult", {
      type: "pie",
      data: { labels: resultLabels, datasets: [{ data: resultLabels.map((k) => resultMap.get(k) || 0), backgroundColor: palette(resultLabels.length) }] },
    });
    const totalDuration = data.calls.reduce((sum, i) => sum + Number(i.durationSeconds || 0), 0);
    const connected = data.calls.filter((i) => i.result === "已接通");
    const avg = connected.length
      ? formatDuration(connected.reduce((s, i) => s + Number(i.durationSeconds || 0), 0) / connected.length)
      : "-";
    const mini = document.getElementById("miniCall");
    if (mini) mini.innerHTML = miniHtml([["通话总数", data.calls.length], ["通话总时长", formatDuration(totalDuration)], ["平均时长", avg]]);
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

  function refresh() {
    try {
      const filtered = collect(readFilterState());
      renderKpis(filtered);
      renderRisk(filtered);
      renderEvents(filtered);
      renderResources(filtered);
      renderPersonnel(filtered);
      renderPlans(filtered);
      renderCalls(filtered, { start: filtered.start, end: filtered.end });
    } catch (error) {
      ui.showApiError(error);
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
