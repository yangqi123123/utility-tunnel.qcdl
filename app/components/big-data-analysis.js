(function () {
  const ui = window.EMERGENCY_UI || {
    escapeHtml: (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])),
    value: (id) => document.getElementById(id)?.value || "",
    setValue: (id, v) => { const el = document.getElementById(id); if (el) el.value = v; },
    showToast: (msg) => console.log(msg),
  };

  const page = document.body.getAttribute("data-big-data-page") || "diagnosis";
  const charts = {};
  const PAGE_SIZE = 8;
  let state = { page: 1, rows: [] };

  const KIND_LABEL = { ups: "UPS", cabinet: "配电柜", transformer: "变压器", meter: "电表" };
  const ENERGY_SHARE = [
    { name: "通风", ratio: 0.403, color: "#2BB7E0" },
    { name: "照明", ratio: 0.276, color: "#14C9BA" },
    { name: "排水", ratio: 0.215, color: "#F7BA1E" },
    { name: "其他", ratio: 0.106, color: "#8B5CF6" },
  ];

  function escapeHtml(v) { return ui.escapeHtml(v); }

  function metricNum(device, name) {
    const m = (device.metrics || []).find((x) => x.name === name);
    if (!m) return null;
    const n = Number.parseFloat(String(m.value).replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }

  function metricText(device, name) {
    const m = (device.metrics || []).find((x) => x.name === name);
    if (!m) return "—";
    return m.unit ? `${m.value}${m.unit}` : String(m.value);
  }

  function openStatuses() {
    return ["待指派", "待处理", "处理中", "验收中"];
  }

  function openWorkOrders() {
    const orders = window.WORK_ORDER_STORE?.getOrders?.() || window.WORK_ORDER_DATA?.seedOrders || [];
    return orders.filter((o) => openStatuses().includes(o.status));
  }

  function overdueMaintenance() {
    const tasks = window.MAINTENANCE_DATA?.tasks || [];
    return tasks.filter((t) => t.overdue === "已逾期" || /逾期/.test(String(t.status || "")));
  }

  function matchWorkOrder(device, orders) {
    const name = String(device.name || "");
    const code = String(device.code || "");
    const type = String(device.type || device.kind || "");
    return orders.filter((o) => {
      const text = `${o.name || ""} ${o.content || ""}`;
      if (name && text.includes(name)) return true;
      if (code && text.includes(code)) return true;
      // 类型关键词弱匹配：仅当工单文案含类型，且位置舱室一致
      if (type && text.includes(type) && device.room && o.room && o.room === device.room) return true;
      if (/通风|风机/.test(name) && /通风|风机/.test(text)) return true;
      if (/排水|水泵/.test(name) && /排水|水泵|积水/.test(text)) return true;
      if (/UPS|配电|变压器|电表/.test(name) && /UPS|配电|变压器|电力|用电/.test(text)) return true;
      return false;
    });
  }

  function matchMaintenance(device, tasks) {
    const devices = window.MAINTENANCE_DATA?.devices || [];
    return tasks.filter((task) => {
      const ids = task.deviceIds || [];
      return ids.some((id) => {
        const d = devices.find((x) => x.id === id);
        if (!d) return false;
        if (d.name === device.name || d.code === device.code) return true;
        if (d.category && device.type && d.category === device.type) return true;
        if (d.room && device.room && d.room === device.room && d.category && String(device.type || "").includes(d.category.replace(/设备$/, ""))) return true;
        return false;
      });
    });
  }

  function scoreLevel(score) {
    if (score >= 80) return "健康";
    if (score >= 60) return "关注";
    if (score >= 40) return "预警";
    return "危险";
  }

  function levelClass(level) {
    if (level === "健康") return "is-ok";
    if (level === "关注") return "is-watch";
    if (level === "预警") return "is-warn";
    return "is-danger";
  }

  function diagnoseEnvDevice(device, orders, overdueTasks) {
    const factors = [];
    let score = 100;
    const run = device.run || "";
    const power = device.power || "";
    let runLabel = "未知";
    if (run === "fault") { score -= 50; factors.push("设备故障"); runLabel = "故障"; }
    else if (run === "stopped") { score -= 10; factors.push("设备停机"); runLabel = "停止"; }
    else if (run === "running") runLabel = "运行";
    if (power === "off") { score -= 30; factors.push("电源断开"); }
    else if (power === "") { score -= 8; factors.push("状态未回传"); }

    const matchedOrders = matchWorkOrder(device, orders);
    if (matchedOrders.length) {
      score -= Math.min(25, matchedOrders.length * 15);
      factors.push(`未闭环工单×${matchedOrders.length}`);
    }
    const matchedMaint = matchMaintenance(device, overdueTasks);
    if (matchedMaint.length) {
      score -= 10;
      factors.push("维保超期");
    }

    score = Math.max(0, Math.min(100, score));
    const level = scoreLevel(score);
    return {
      id: device.id,
      source: "环境设备",
      name: device.name,
      code: device.code,
      type: device.type || "附属设备",
      project: device.project || "",
      corridor: device.corridor || "",
      room: device.room || "",
      section: device.section || "",
      location: [device.corridor, device.room, device.section].filter(Boolean).join(" / ") || device.location || "—",
      runLabel,
      score,
      level,
      factors,
      raw: device,
      time: device.time || "",
    };
  }

  function diagnosePowerDevice(device, orders, overdueTasks) {
    const factors = [];
    let score = 100;
    const status = device.status || "";
    if (status === "fault") { score -= 50; factors.push("设备故障"); }
    else if (status === "offline") { score -= 40; factors.push("设备离线"); }
    else if (status === "alarm") { score -= 35; factors.push("电力报警"); }
    else if (status === "warn") { score -= 20; factors.push("运行预警"); }

    const load = metricNum(device, "负载率");
    if (load != null) {
      if (load >= 85) { score -= 15; factors.push(`负载率偏高(${load}%)`); }
      else if (load >= 70) { score -= 8; factors.push(`负载率关注(${load}%)`); }
    }
    const battery = metricNum(device, "电池电量");
    if (battery != null && battery < 70) {
      score -= 10;
      factors.push(`电池电量偏低(${battery}%)`);
    }

    const matchedOrders = matchWorkOrder(device, orders);
    if (matchedOrders.length) {
      score -= Math.min(25, matchedOrders.length * 15);
      factors.push(`未闭环工单×${matchedOrders.length}`);
    }
    const matchedMaint = matchMaintenance(device, overdueTasks);
    if (matchedMaint.length) {
      score -= 10;
      factors.push("维保超期");
    }

    score = Math.max(0, Math.min(100, score));
    const level = scoreLevel(score);
    return {
      id: device.id,
      source: "电力监测",
      name: device.name,
      code: device.code,
      type: KIND_LABEL[device.kind] || device.kind || "电力设备",
      kind: device.kind,
      project: device.project || "",
      corridor: device.corridor || "",
      room: device.room || "",
      section: device.section || "",
      location: [device.corridor, device.room, device.section].filter(Boolean).join(" / ") || "—",
      runLabel: device.statusLabel || status || "—",
      score,
      level,
      factors,
      raw: device,
      time: device.lastSeen || device.alarm?.time || "",
      loadRate: load,
      kwh: metricNum(device, "累计电量"),
      powerKw: metricNum(device, "有功功率"),
    };
  }

  function buildDiagnoses() {
    const orders = openWorkOrders();
    const overdueTasks = overdueMaintenance();
    const env = (window.ENVIRONMENT_DATA?.devices || []).map((d) => diagnoseEnvDevice(d, orders, overdueTasks));
    const power = (window.POWER_MONITOR_DATA?.monitorDevices || []).map((d) => diagnosePowerDevice(d, orders, overdueTasks));
    return [...env, ...power].sort((a, b) => a.score - b.score);
  }

  function buildWarnings(diagnoses) {
    const list = [];
    diagnoses.forEach((item) => {
      if (item.level === "健康") return;
      const primary = item.factors[0] || "健康度下降";
      let warnType = "健康度下降";
      if (/故障/.test(primary)) warnType = "设备故障";
      else if (/离线|电源断开|未回传/.test(primary)) warnType = "通信/电源异常";
      else if (/负载/.test(primary)) warnType = "负载异常";
      else if (/电池/.test(primary)) warnType = "电池异常";
      else if (/工单/.test(primary)) warnType = "工单未闭环";
      else if (/维保/.test(primary)) warnType = "维保超期";
      else if (/报警|预警/.test(primary)) warnType = "运行报警";

      list.push({
        id: `WARN-${item.id}`,
        deviceId: item.id,
        time: item.time || "—",
        name: item.name,
        code: item.code,
        location: item.location,
        project: item.project,
        corridor: item.corridor,
        room: item.room,
        section: item.section,
        type: warnType,
        level: item.level,
        score: item.score,
        message: factorsText(item.factors) || "规则评估触发预警",
        factors: item.factors,
        source: item.source,
        deviceType: item.type,
      });
    });
    return list;
  }

  function factorsText(factors) {
    return (factors || []).join("；") || "—";
  }

  function buildLocationTree(rows) {
    const tree = [];
    const projectMap = new Map();
    rows.forEach((row) => {
      const project = row.project || "未分配项目";
      const corridor = row.corridor || "未分配管廊";
      const room = row.room || "未分配舱室";
      if (!projectMap.has(project)) {
        const node = { name: project, corridors: [] };
        projectMap.set(project, node);
        tree.push(node);
      }
      const pNode = projectMap.get(project);
      let cNode = pNode.corridors.find((c) => c.name === corridor);
      if (!cNode) {
        cNode = { name: corridor, rooms: [] };
        pNode.corridors.push(cNode);
      }
      if (!cNode.rooms.includes(room)) cNode.rooms.push(room);
    });
    return tree;
  }

  function fillSelect(sel, options, placeholder, selected) {
    if (!sel) return;
    const list = options || [];
    sel.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>` +
      list.map((v) => `<option value="${escapeHtml(v)}" ${v === selected ? "selected" : ""}>${escapeHtml(v)}</option>`).join("");
  }

  function setEnabled(sel, enabled, placeholder) {
    if (!sel) return;
    sel.disabled = !enabled;
    if (!enabled) sel.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>`;
  }

  function initLocationCascade(tree) {
    const projectSel = document.getElementById("bdProject");
    const corridorSel = document.getElementById("bdCorridor");
    const roomSel = document.getElementById("bdRoom");
    fillSelect(projectSel, tree.map((p) => p.name), "全部项目", "");

    projectSel?.addEventListener("change", () => {
      const project = tree.find((p) => p.name === projectSel.value);
      if (!project) {
        setEnabled(corridorSel, false, "请先选择所属项目");
        setEnabled(roomSel, false, "请先选择所属管廊");
        return;
      }
      setEnabled(corridorSel, true, "全部管廊");
      fillSelect(corridorSel, project.corridors.map((c) => c.name), "全部管廊", "");
      setEnabled(roomSel, false, "请先选择所属管廊");
    });

    corridorSel?.addEventListener("change", () => {
      const project = tree.find((p) => p.name === projectSel.value);
      const corridor = project?.corridors.find((c) => c.name === corridorSel.value);
      if (!corridor) {
        setEnabled(roomSel, false, "请先选择所属管廊");
        return;
      }
      setEnabled(roomSel, true, "全部舱室");
      fillSelect(roomSel, corridor.rooms, "全部舱室", "");
    });
  }

  function resetLocationCascade(tree) {
    ui.setValue("bdProject", "");
    setEnabled(document.getElementById("bdCorridor"), false, "请先选择所属项目");
    setEnabled(document.getElementById("bdRoom"), false, "请先选择所属管廊");
    fillSelect(document.getElementById("bdProject"), tree.map((p) => p.name), "全部项目", "");
  }

  function matchLoc(row, loc) {
    if (loc.project && row.project && row.project !== loc.project) return false;
    if (loc.corridor && row.corridor && row.corridor !== loc.corridor) return false;
    if (loc.room && row.room && row.room !== loc.room) return false;
    return true;
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
    return items.map(([label, value]) =>
      `<div class="analysis-mini-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`
    ).join("");
  }

  function palette(n) {
    const colors = ["#3B82F6", "#F59E0B", "#EF4444", "#10B981", "#8B5CF6", "#06B6D4", "#64748B", "#EC4899"];
    return Array.from({ length: n }, (_, i) => colors[i % colors.length]);
  }

  function renderKpis(cards) {
    const el = document.getElementById("bdKpis");
    if (!el) return;
    el.innerHTML = cards.map(([label, value, icon, tone]) => `
      <article class="analysis-kpi ${tone}">
        <div class="analysis-kpi-icon"><i class="${icon}"></i></div>
        <div class="analysis-kpi-body">
          <span class="analysis-kpi-label">${escapeHtml(label)}</span>
          <strong class="analysis-kpi-value">${escapeHtml(value)}</strong>
        </div>
      </article>`).join("");
  }

  function renderPagination(total) {
    const host = document.getElementById("bdDetailPagination");
    if (!host) return;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (state.page > pages) state.page = pages;
    host.innerHTML = ui.renderPagination
      ? ui.renderPagination({ id: "bdDetailPaginationInner", page: state.page, total, pageSize: PAGE_SIZE })
      : `<div class="emergency-pagination"><span>共 ${total} 条</span></div>`;
    host.querySelector("[data-page-prev]")?.addEventListener("click", () => {
      if (state.page > 1) { state.page -= 1; renderDetailTable(); }
    });
    host.querySelector("[data-page-next]")?.addEventListener("click", () => {
      if (state.page < pages) { state.page += 1; renderDetailTable(); }
    });
  }

  function openDetailDrawer(title, rows) {
    if (!window.openAppDrawer) return;
    const body = `<section class="bd-drawer-detail"><div class="warning-detail-grid">${
      rows.map(([k, v]) =>
        `<div class="warning-detail-item"><span class="warning-detail-label">${escapeHtml(k)}</span><span class="warning-detail-value">${escapeHtml(v)}</span></div>`
      ).join("")
    }</div></section>`;
    window.openAppDrawer({
      title,
      body,
      footer: `<button class="btn btn-secondary" type="button" data-drawer-close>关闭</button>`,
    });
  }

  /* ---------- diagnosis ---------- */
  function filterDiagnoses(all) {
    const loc = {
      project: ui.value("bdProject"),
      corridor: ui.value("bdCorridor"),
      room: ui.value("bdRoom"),
    };
    const type = ui.value("bdType");
    const level = ui.value("bdLevel");
    return all.filter((row) => {
      if (!matchLoc(row, loc)) return false;
      if (type && row.type !== type) return false;
      if (level && row.level !== level) return false;
      return true;
    });
  }

  function renderDiagnosis(all) {
    const rows = filterDiagnoses(all);
    state.rows = rows;
    state.page = 1;
    const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length) : 0;
    const danger = rows.filter((r) => r.level === "危险").length;
    const warn = rows.filter((r) => r.level === "预警").length;
    const watch = rows.filter((r) => r.level === "关注").length;
    const healthy = rows.filter((r) => r.level === "健康").length;
    renderKpis([
      ["评估设备数", rows.length, "fa-solid fa-server", "is-blue"],
      ["平均健康分", avg, "fa-solid fa-heart-pulse", "is-green"],
      ["危险设备", danger, "fa-solid fa-triangle-exclamation", "is-red"],
      ["预警设备", warn, "fa-solid fa-bell", "is-amber"],
      ["关注设备", watch, "fa-solid fa-eye", "is-cyan"],
      ["健康设备", healthy, "fa-solid fa-circle-check", "is-purple"],
    ]);

    const levels = ["健康", "关注", "预警", "危险"];
    const levelMap = countBy(rows, (r) => r.level);
    renderChart("wrapHealthLevel", "chartHealthLevel", {
      type: "doughnut",
      data: {
        labels: levels,
        datasets: [{ data: levels.map((k) => levelMap.get(k) || 0), backgroundColor: ["#14C9BA", "#2BB7E0", "#F7BA1E", "#F53F57"] }],
      },
    });

    const typeMap = countBy(rows, (r) => r.type);
    const typeLabels = [...typeMap.keys()];
    const typeAvg = typeLabels.map((t) => {
      const list = rows.filter((r) => r.type === t);
      return list.length ? Math.round(list.reduce((s, r) => s + r.score, 0) / list.length) : 0;
    });
    renderChart("wrapHealthType", "chartHealthType", {
      type: "bar",
      data: { labels: typeLabels, datasets: [{ label: "平均健康分", data: typeAvg, backgroundColor: "#3B82F6" }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } },
    });

    const factorCount = new Map();
    rows.forEach((r) => r.factors.forEach((f) => {
      const key = f.replace(/\(.*?\)/g, "").replace(/×\d+$/, "");
      factorCount.set(key, (factorCount.get(key) || 0) + 1);
    }));
    const factorLabels = [...factorCount.keys()].slice(0, 6);
    renderChart("wrapHealthFactor", "chartHealthFactor", {
      type: "bar",
      data: { labels: factorLabels, datasets: [{ label: "次数", data: factorLabels.map((k) => factorCount.get(k) || 0), backgroundColor: "#F59E0B" }] },
      options: { indexAxis: "y", plugins: { legend: { display: false } } },
    });

    const roomMap = new Map();
    rows.forEach((r) => {
      const key = r.room || "未分区";
      if (!roomMap.has(key)) roomMap.set(key, []);
      roomMap.get(key).push(r.score);
    });
    const roomLabels = [...roomMap.keys()];
    const roomAvg = roomLabels.map((k) => {
      const list = roomMap.get(k);
      return Math.round(list.reduce((a, b) => a + b, 0) / list.length);
    });
    renderChart("wrapHealthRoom", "chartHealthRoom", {
      type: "bar",
      data: { labels: roomLabels, datasets: [{ label: "舱室均分", data: roomAvg, backgroundColor: "#8B5CF6" }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } },
    });

    const miniHealth = document.getElementById("miniHealth");
    if (miniHealth) miniHealth.innerHTML = miniHtml([["健康率", rows.length ? `${Math.round((healthy / rows.length) * 100)}%` : "-"], ["低分(<60)", rows.filter((r) => r.score < 60).length]]);
    const miniFactor = document.getElementById("miniFactor");
    if (miniFactor) miniFactor.innerHTML = miniHtml([["扣分因素种类", factorCount.size], ["舱室数", roomLabels.length]]);

    renderDetailTable();
  }

  function renderDiagnosisRow(row) {
    return `<tr>
      <td>${escapeHtml(row.name)}</td>
      <td>${escapeHtml(row.code)}</td>
      <td>${escapeHtml(row.type)}</td>
      <td>${escapeHtml(row.location)}</td>
      <td>${escapeHtml(row.runLabel)}</td>
      <td class="bd-score">${row.score}</td>
      <td><span class="bd-level ${levelClass(row.level)}">${escapeHtml(row.level)}</span></td>
      <td title="${escapeHtml(factorsText(row.factors))}">${escapeHtml(factorsText(row.factors))}</td>
      <td><button class="table-action" type="button" data-bd-detail="${escapeHtml(row.id)}">详情</button></td>
    </tr>`;
  }

  /* ---------- warning ---------- */
  function filterWarnings(all) {
    const loc = {
      project: ui.value("bdProject"),
      corridor: ui.value("bdCorridor"),
      room: ui.value("bdRoom"),
    };
    const level = ui.value("bdWarnLevel");
    const type = ui.value("bdWarnType");
    return all.filter((row) => {
      if (!matchLoc(row, loc)) return false;
      if (level && row.level !== level) return false;
      if (type && row.type !== type) return false;
      return true;
    });
  }

  function renderWarning(all) {
    const rows = filterWarnings(all);
    state.rows = rows;
    state.page = 1;
    const danger = rows.filter((r) => r.level === "危险").length;
    const warn = rows.filter((r) => r.level === "预警").length;
    const watch = rows.filter((r) => r.level === "关注").length;
    renderKpis([
      ["预警总数", rows.length, "fa-solid fa-bell", "is-blue"],
      ["危险", danger, "fa-solid fa-triangle-exclamation", "is-red"],
      ["预警", warn, "fa-solid fa-circle-exclamation", "is-amber"],
      ["关注", watch, "fa-solid fa-eye", "is-cyan"],
      ["涉及设备", new Set(rows.map((r) => r.deviceId)).size, "fa-solid fa-server", "is-purple"],
      ["涉及舱室", new Set(rows.map((r) => r.room || "未分区")).size, "fa-solid fa-map", "is-green"],
    ]);

    const levels = ["危险", "预警", "关注"];
    const levelMap = countBy(rows, (r) => r.level);
    renderChart("wrapWarnLevel", "chartWarnLevel", {
      type: "doughnut",
      data: {
        labels: levels,
        datasets: [{ data: levels.map((k) => levelMap.get(k) || 0), backgroundColor: ["#F53F57", "#F7BA1E", "#2BB7E0"] }],
      },
    });

    const typeMap = countBy(rows, (r) => r.type);
    const typeLabels = [...typeMap.keys()];
    renderChart("wrapWarnType", "chartWarnType", {
      type: "bar",
      data: { labels: typeLabels, datasets: [{ label: "条数", data: typeLabels.map((k) => typeMap.get(k) || 0), backgroundColor: palette(typeLabels.length) }] },
      options: { plugins: { legend: { display: false } } },
    });

    const roomMap = countBy(rows, (r) => r.room || "未分区");
    const roomLabels = [...roomMap.keys()];
    renderChart("wrapWarnRoom", "chartWarnRoom", {
      type: "bar",
      data: { labels: roomLabels, datasets: [{ label: "预警数", data: roomLabels.map((k) => roomMap.get(k) || 0), backgroundColor: "#EF4444" }] },
      options: { plugins: { legend: { display: false } } },
    });

    const miniWarn = document.getElementById("miniWarn");
    if (miniWarn) miniWarn.innerHTML = miniHtml([["类型数", typeLabels.length], ["危险占比", rows.length ? `${Math.round((danger / rows.length) * 100)}%` : "-"]]);
    const miniWarnRoom = document.getElementById("miniWarnRoom");
    if (miniWarnRoom) miniWarnRoom.innerHTML = miniHtml([["舱室数", roomLabels.length], ["最多舱室", roomLabels.sort((a, b) => (roomMap.get(b) || 0) - (roomMap.get(a) || 0))[0] || "-"]]);

    renderDetailTable();
  }

  function renderWarningRow(row) {
    return `<tr>
      <td>${escapeHtml(row.time)}</td>
      <td>${escapeHtml(row.name)}</td>
      <td>${escapeHtml(row.location)}</td>
      <td>${escapeHtml(row.type)}</td>
      <td><span class="bd-level ${levelClass(row.level)}">${escapeHtml(row.level)}</span></td>
      <td class="bd-score">${row.score}</td>
      <td title="${escapeHtml(row.message)}">${escapeHtml(row.message)}</td>
      <td><button class="table-action" type="button" data-bd-detail="${escapeHtml(row.id)}">详情</button></td>
    </tr>`;
  }

  /* ---------- energy ---------- */
  function filterEnergyDevices(all) {
    const loc = {
      project: ui.value("bdProject"),
      corridor: ui.value("bdCorridor"),
      room: ui.value("bdRoom"),
    };
    const kind = ui.value("bdEnergyKind");
    return all.filter((row) => {
      if (!matchLoc(row, loc)) return false;
      if (kind && row.kind !== kind) return false;
      return true;
    });
  }

  function renderEnergy() {
    const devices = (window.POWER_MONITOR_DATA?.monitorDevices || []).map((d) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      kind: d.kind,
      type: KIND_LABEL[d.kind] || d.kind,
      project: d.project || "",
      corridor: d.corridor || "",
      room: d.room || "",
      section: d.section || "",
      location: [d.corridor, d.room, d.section].filter(Boolean).join(" / ") || "—",
      statusLabel: d.statusLabel || d.status || "—",
      powerKw: metricNum(d, "有功功率"),
      kwh: metricNum(d, "累计电量"),
      loadRate: metricNum(d, "负载率"),
      raw: d,
    }));
    const rows = filterEnergyDevices(devices);
    state.rows = rows;
    state.page = 1;

    const meters = rows.filter((r) => r.kind === "meter");
    const totalKwh = meters.reduce((s, r) => s + (r.kwh || 0), 0);
    const loadDevices = rows.filter((r) => r.loadRate != null);
    const avgLoad = loadDevices.length
      ? Math.round(loadDevices.reduce((s, r) => s + r.loadRate, 0) / loadDevices.length)
      : 0;
    const highLoad = loadDevices.filter((r) => r.loadRate >= 70).length;
    const totalKw = meters.reduce((s, r) => s + (r.powerKw || 0), 0);

    renderKpis([
      ["监测设备", rows.length, "fa-solid fa-bolt", "is-blue"],
      ["电表数", meters.length, "fa-solid fa-gauge-high", "is-cyan"],
      ["累计电量(kWh)", totalKwh ? totalKwh.toLocaleString() : "—", "fa-solid fa-chart-area", "is-green"],
      ["当前功率(kW)", totalKw ? totalKw.toFixed(1) : "—", "fa-solid fa-plug", "is-purple"],
      ["平均负载率", loadDevices.length ? `${avgLoad}%` : "—", "fa-solid fa-percent", "is-amber"],
      ["高负载(≥70%)", highLoad, "fa-solid fa-temperature-high", "is-red"],
    ]);

    const shareLabels = ENERGY_SHARE.map((x) => x.name);
    const shareValues = ENERGY_SHARE.map((x) => Math.round(totalKwh * x.ratio) || Math.round(1000 * x.ratio));
    renderChart("wrapEnergyShare", "chartEnergyShare", {
      type: "doughnut",
      data: {
        labels: shareLabels,
        datasets: [{ data: shareValues, backgroundColor: ENERGY_SHARE.map((x) => x.color) }],
      },
    });

    const roomKwh = new Map();
    meters.forEach((m) => {
      const key = m.room || "未分区";
      roomKwh.set(key, (roomKwh.get(key) || 0) + (m.kwh || 0));
    });
    const roomLabels = [...roomKwh.keys()];
    renderChart("wrapEnergyRoom", "chartEnergyRoom", {
      type: "bar",
      data: { labels: roomLabels, datasets: [{ label: "累计电量 kWh", data: roomLabels.map((k) => roomKwh.get(k) || 0), backgroundColor: "#3B82F6" }] },
      options: { plugins: { legend: { display: false } } },
    });

    const loadLabels = loadDevices.map((d) => d.name.replace(/^(.{8}).+$/, "$1…"));
    renderChart("wrapEnergyLoad", "chartEnergyLoad", {
      type: "bar",
      data: {
        labels: loadLabels.length ? loadLabels : ["暂无"],
        datasets: [{ label: "负载率 %", data: loadDevices.map((d) => d.loadRate), backgroundColor: loadDevices.map((d) => (d.loadRate >= 85 ? "#F53F57" : d.loadRate >= 70 ? "#F7BA1E" : "#14C9BA")) }],
      },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } },
    });

    const series = window.POWER_MONITOR_DATA?.chartSeries?.upsCurrent;
    if (series) {
      renderChart("wrapEnergyUps", "chartEnergyUps", {
        type: "line",
        data: {
          labels: series.labels,
          datasets: [
            { label: "A相", data: series.phaseA, borderColor: "#F59E0B", tension: 0.3, fill: false },
            { label: "B相", data: series.phaseB, borderColor: "#3B82F6", tension: 0.3, fill: false },
            { label: "C相", data: series.phaseC, borderColor: "#8B5CF6", tension: 0.3, fill: false },
          ],
        },
        options: { scales: { y: { beginAtZero: true } } },
      });
    } else {
      showEmpty("wrapEnergyUps", "暂无 UPS 电流数据");
    }

    const miniEnergy = document.getElementById("miniEnergy");
    if (miniEnergy) {
      miniEnergy.innerHTML = miniHtml([
        ["分项说明", "快照占比"],
        ["通风占比", "40.3%"],
        ["照明占比", "27.6%"],
      ]);
    }
    const miniLoad = document.getElementById("miniLoad");
    if (miniLoad) {
      miniLoad.innerHTML = miniHtml([
        ["有负载设备", loadDevices.length],
        ["UPS 曲线", "近24h"],
      ]);
    }

    renderDetailTable();
  }

  function renderEnergyRow(row) {
    return `<tr>
      <td>${escapeHtml(row.name)}</td>
      <td>${escapeHtml(row.type)}</td>
      <td>${escapeHtml(row.location)}</td>
      <td>${row.powerKw != null ? `${row.powerKw} kW` : "—"}</td>
      <td>${row.kwh != null ? `${row.kwh.toLocaleString()} kWh` : "—"}</td>
      <td>${row.loadRate != null ? `${row.loadRate}%` : "—"}</td>
      <td>${escapeHtml(row.statusLabel)}</td>
      <td><button class="table-action" type="button" data-bd-detail="${escapeHtml(row.id)}">详情</button></td>
    </tr>`;
  }

  function renderDetailTable() {
    const body = document.getElementById("bdDetailBody");
    if (!body) return;
    const rows = state.rows || [];
    const start = (state.page - 1) * PAGE_SIZE;
    const pageRows = rows.slice(start, start + PAGE_SIZE);
    if (!pageRows.length) {
      body.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#86909C;padding:24px">暂无数据</td></tr>`;
      renderPagination(0);
      return;
    }
    if (page === "diagnosis") body.innerHTML = pageRows.map(renderDiagnosisRow).join("");
    else if (page === "warning") body.innerHTML = pageRows.map(renderWarningRow).join("");
    else body.innerHTML = pageRows.map(renderEnergyRow).join("");
    renderPagination(rows.length);
  }

  function onDetail(id) {
    if (page === "diagnosis") {
      const row = state.rows.find((r) => r.id === id) || cache.diagnoses.find((r) => r.id === id);
      if (!row) return;
      openDetailDrawer("设备诊断详情", [
        ["设备名称", row.name],
        ["设备编码", row.code],
        ["设备类型", row.type],
        ["数据来源", row.source],
        ["位置", row.location],
        ["运行状态", row.runLabel],
        ["健康分", String(row.score)],
        ["健康等级", row.level],
        ["扣分因素", factorsText(row.factors)],
        ["最近上报", row.time || "—"],
      ]);
      return;
    }
    if (page === "warning") {
      const row = state.rows.find((r) => r.id === id) || cache.warnings.find((r) => r.id === id);
      if (!row) return;
      openDetailDrawer("异常预警详情", [
        ["预警时间", row.time],
        ["设备名称", row.name],
        ["设备编码", row.code],
        ["位置", row.location],
        ["预警类型", row.type],
        ["预警等级", row.level],
        ["健康分", String(row.score)],
        ["数据来源", row.source],
        ["说明", row.message],
      ]);
      return;
    }
    const row = state.rows.find((r) => r.id === id);
    if (!row) return;
    openDetailDrawer("用电明细详情", [
      ["设备名称", row.name],
      ["设备编码", row.code],
      ["设备类型", row.type],
      ["位置", row.location],
      ["有功功率", row.powerKw != null ? `${row.powerKw} kW` : "—"],
      ["累计电量", row.kwh != null ? `${row.kwh} kWh` : "—"],
      ["负载率", row.loadRate != null ? `${row.loadRate}%` : "—"],
      ["运行状态", row.statusLabel],
    ]);
  }

  const cache = { diagnoses: [], warnings: [], tree: [] };

  function refresh() {
    if (page === "diagnosis") renderDiagnosis(cache.diagnoses);
    else if (page === "warning") renderWarning(cache.warnings);
    else renderEnergy();
  }

  function bind() {
    document.addEventListener("click", (event) => {
      const action = event.target.closest("[data-bd-action]")?.getAttribute("data-bd-action");
      if (action === "query") { state.page = 1; refresh(); }
      if (action === "reset") {
        resetLocationCascade(cache.tree);
        if (page === "diagnosis") {
          ui.setValue("bdType", "");
          ui.setValue("bdLevel", "");
        } else if (page === "warning") {
          ui.setValue("bdWarnLevel", "");
          ui.setValue("bdWarnType", "");
        } else {
          ui.setValue("bdEnergyKind", "");
        }
        state.page = 1;
        refresh();
      }
      const detailId = event.target.closest("[data-bd-detail]")?.getAttribute("data-bd-detail");
      if (detailId) onDetail(detailId);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    cache.diagnoses = buildDiagnoses();
    cache.warnings = buildWarnings(cache.diagnoses);
    cache.tree = buildLocationTree(
      page === "energy"
        ? (window.POWER_MONITOR_DATA?.monitorDevices || [])
        : cache.diagnoses
    );
    initLocationCascade(cache.tree);

    if (page === "diagnosis") {
      const types = [...new Set(cache.diagnoses.map((d) => d.type))];
      fillSelect(document.getElementById("bdType"), types, "全部类型", "");
    }
    if (page === "warning") {
      const types = [...new Set(cache.warnings.map((d) => d.type))];
      fillSelect(document.getElementById("bdWarnType"), types, "全部类型", "");
    }

    bind();
    refresh();
  });
})();
