(function () {
  "use strict";
  const store = window.EMERGENCY_STORE;
  const ui = window.EMERGENCY_UI || {};
  const woData = window.WORK_ORDER_DATA || {};
  if (!store) return;

  const esc = ui.escapeHtml || ((value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])));
  const toast = ui.showToast || ((message) => window.alert(message));
  const nowText = () => (typeof ui.nowText === "function" ? ui.nowText() : new Date().toLocaleString("zh-CN", { hour12: false }).replace(/\//g, "-"));
  const EVENT_TYPES = ["燃气泄漏", "火灾", "积水", "设备故障", "入侵告警", "其他"];
  const EVENT_TYPE_META = {
    "燃气泄漏": { color: "#e34d59", icon: "fa-fire-flame-simple" },
    "火灾": { color: "#ed7b2f", icon: "fa-fire" },
    "积水": { color: "#135afa", icon: "fa-water" },
    "设备故障": { color: "#8b5cf6", icon: "fa-gear" },
    "入侵告警": { color: "#00a870", icon: "fa-shield-halved" },
    "其他": { color: "#86909c", icon: "fa-circle-exclamation" },
  };
  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
  const ALLOWED_IMAGE = /\.(jpe?g|png|gif|webp)$/i;

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

  const state = {
    page: 1,
    pageSize: 10,
    filtered: [],
    createStep: 1,
    draft: emptyDraft(),
    picker: { open: false, target: null, deptId: "", keyword: "", deptKeyword: "", deptCollapsed: new Set(), selectedId: "" },
    stepModalEventId: "",
    stepModalStepId: "",
  };

  function emptyDraft() {
    return {
      title: "", project: "", corridor: "", room: "", section: "", pipeline: "",
      eventType: "", level: "P2", contact: "", contactPhone: "", description: "",
      longitude: "", latitude: "",
      photos: [], attachments: [], relatedPersonIds: [], relatedResources: [], planId: "",
    };
  }

  function formatCoord(value) {
    if (value === "" || value == null) return "-";
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(6) : "-";
  }

  function eventTypeMeta(type) {
    return EVENT_TYPE_META[type] || EVENT_TYPE_META["其他"];
  }

  function normalizeRelatedResources(item) {
    if (Array.isArray(item?.relatedResources) && item.relatedResources.length) {
      return item.relatedResources.map((entry) => ({
        resourceId: entry.resourceId || entry.id || "",
        quantity: Math.max(1, Number(entry.quantity) || 1),
      })).filter((entry) => entry.resourceId);
    }
    return (Array.isArray(item?.relatedResourceIds) ? item.relatedResourceIds : []).map((id) => ({
      resourceId: id,
      quantity: 1,
    }));
  }

  function listRaw() { return typeof store.listEvents === "function" ? store.listEvents() : []; }
  function personnelList() { return typeof store.listPersonnel === "function" ? store.listPersonnel() : []; }
  function resourceList() { return typeof store.listResources === "function" ? store.listResources() : []; }
  function planList() { return (typeof store.listPlans === "function" ? store.listPlans() : []).filter((item) => item.status === "已发布"); }
  function getPlan(id) { return typeof store.getPlan === "function" ? store.getPlan(id) : planList().find((item) => item.planId === id) || null; }

  function normalizeStatus(status) {
    const map = { 待确认: "待指派", 已确认: "待处理", 待复核: "验收中", 误报关闭: "已关闭", 已撤回: "已关闭", 已升级: "处理中", 处置失败: "处理中" };
    return map[status] || status || "待指派";
  }

  function normalizeEvent(item) {
    if (!item) return null;
    const longitude = item.longitude === "" || item.longitude == null ? "" : Number(item.longitude);
    const latitude = item.latitude === "" || item.latitude == null ? "" : Number(item.latitude);
    return {
      ...item,
      status: normalizeStatus(item.status),
      location: item.location || [item.project, item.corridor, item.room, item.section, item.pipeline].filter(Boolean).join(" / ") || "待定位",
      handler: item.handler || "",
      longitude: Number.isFinite(longitude) ? longitude : "",
      latitude: Number.isFinite(latitude) ? latitude : "",
      photos: Array.isArray(item.photos) ? item.photos : [],
      attachments: Array.isArray(item.attachments) ? item.attachments : [],
      relatedPersonIds: Array.isArray(item.relatedPersonIds) ? item.relatedPersonIds : [],
      relatedResources: normalizeRelatedResources(item),
      stepRecords: Array.isArray(item.stepRecords) ? item.stepRecords : [],
      timeline: Array.isArray(item.timeline) ? item.timeline : [],
    };
  }

  function list() { return listRaw().map(normalizeEvent).filter(Boolean); }
  function eventById(id) { return list().find((item) => String(item.eventId) === String(id)); }

  function formatTime(value) {
    if (!value) return "-";
    const text = String(value);
    if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
      const date = new Date(text);
      if (!Number.isNaN(date.getTime())) {
        const pad = (n) => String(n).padStart(2, "0");
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
      }
    }
    return text.replace("T", " ").replace(/\.\d+Z?$/, "").slice(0, 19);
  }

  function notifyChanged() {
    if (document.getElementById("eventBody")) render();
    if (typeof window.EMERGENCY_EVENT_OPS?.onChanged === "function") window.EMERGENCY_EVENT_OPS.onChanged();
  }

  function isDispatchPage() {
    return document.body.classList.contains("emergency-dispatch-page");
  }

  function closeCenterOpsModal() {
    document.querySelector(".emergency-center-mask[data-event-ops-modal]")?.remove();
  }

  function openCenterDialog({ title, body, footer, wide = false }) {
    closeCenterOpsModal();
    const mask = document.createElement("div");
    mask.className = "emergency-center-mask";
    mask.dataset.eventOpsModal = "1";
    mask.innerHTML = `<div class="emergency-center-modal ${wide ? "emergency-step-modal" : ""}" role="dialog" aria-modal="true">
      <div class="emergency-center-head"><h3>${esc(title)}</h3><button type="button" data-center-close aria-label="关闭">×</button></div>
      <div class="emergency-center-body">${body}</div>
      <div class="emergency-center-foot">${footer}</div>
    </div>`;
    document.body.appendChild(mask);
  }

  function cancelActionAttr() {
    return isDispatchPage() ? "data-event-ops-cancel" : "data-drawer-close";
  }

  function presentForm({ title, body, footer, wide = false }) {
    if (isDispatchPage()) {
      openCenterDialog({ title, body, footer, wide });
      return;
    }
    clearWizardDrawerClass();
    window.openAppDrawer({ title, body, footer });
  }

  function persist(event, timelineEntry) {
    const stamp = nowText();
    store.saveEvent({ ...event, updatedAt: stamp });
    if (timelineEntry && typeof store.appendTimeline === "function") {
      store.appendTimeline(event.eventId, {
        title: timelineEntry.title || "事件更新",
        message: timelineEntry.message || "",
        operator: timelineEntry.operator || "当前用户",
        photos: timelineEntry.photos || [],
        at: stamp,
      });
    }
    return eventById(event.eventId);
  }

  function woPersonnel() { return woData.personnel || []; }
  function woDepartments() { return woData.departments || []; }
  function avatarText(name) { return String(name || "?").slice(-2); }
  function avatarColor(name) {
    const colors = ["#2f6bff", "#16c2b3", "#f59e0b", "#8b5cf6", "#ef4444", "#0ea5e9"];
    let hash = 0;
    String(name || "").split("").forEach((char) => { hash = (hash + char.charCodeAt(0)) % colors.length; });
    return colors[hash];
  }

  /* ---------- location cascade ---------- */
  function setSelectEnabled(select, enabled, placeholder) {
    if (!select) return;
    select.disabled = !enabled;
    if (!enabled) {
      select.value = "";
      select.dataset.locationValue = "";
      select.innerHTML = `<option value="">${esc(placeholder)}</option>`;
    }
  }

  function fillSelect(select, values, placeholder) {
    if (!select) return;
    const current = select.dataset.locationValue || select.value || "";
    select.innerHTML = `<option value="">${esc(placeholder)}</option>${values.map((name) => `<option value="${esc(name)}">${esc(name)}</option>`).join("")}`;
    select.disabled = false;
    select.value = values.includes(current) ? current : "";
    select.dataset.locationValue = select.value;
  }

  function bindLocationCascade(root) {
    if (!root) return;
    const form = root.closest("form") || root;
    const projectSel = form.querySelector('[data-event-field="project"]');
    const corridorSel = root.querySelector('[data-location-level="corridor"]');
    const roomSel = root.querySelector('[data-location-level="room"]');
    const sectionSel = root.querySelector('[data-location-level="section"]');
    const pipelineSel = root.querySelector('[data-location-level="pipeline"]');

    const projectNode = () => locationTree.find((item) => item.name === (projectSel?.value || "")) || null;
    const corridorNode = () => (projectNode()?.corridors || []).find((item) => item.name === (corridorSel?.value || "")) || null;
    const roomNode = () => (corridorNode()?.rooms || []).find((item) => item.name === (roomSel?.value || "")) || null;
    const sectionNode = () => (roomNode()?.sections || []).find((item) => item.name === (sectionSel?.value || "")) || null;

    function refreshFrom(level) {
      if (level === "project") {
        if (projectSel?.value) fillSelect(corridorSel, (projectNode()?.corridors || []).map((item) => item.name), "请选择所属管廊");
        else setSelectEnabled(corridorSel, false, "请先选择所属项目");
        setSelectEnabled(roomSel, false, "请先选择所属管廊");
        setSelectEnabled(sectionSel, false, "请先选择所属舱室");
        setSelectEnabled(pipelineSel, false, "请先选择所属区段");
      }
      if (level === "corridor") {
        if (corridorSel?.value) fillSelect(roomSel, (corridorNode()?.rooms || []).map((item) => item.name), "请选择所属舱室");
        else setSelectEnabled(roomSel, false, "请先选择所属管廊");
        setSelectEnabled(sectionSel, false, "请先选择所属舱室");
        setSelectEnabled(pipelineSel, false, "请先选择所属区段");
      }
      if (level === "room") {
        if (roomSel?.value) fillSelect(sectionSel, (roomNode()?.sections || []).map((item) => item.name), "请选择所属区段");
        else setSelectEnabled(sectionSel, false, "请先选择所属舱室");
        setSelectEnabled(pipelineSel, false, "请先选择所属区段");
      }
      if (level === "section") {
        if (sectionSel?.value) fillSelect(pipelineSel, sectionNode()?.pipelines || [], "请选择所属管线");
        else setSelectEnabled(pipelineSel, false, "请先选择所属区段");
      }
    }

    function cascadeRestore() {
      refreshFrom("project");
      if (corridorSel?.value) refreshFrom("corridor");
      if (roomSel?.value) refreshFrom("room");
      if (sectionSel?.value) refreshFrom("section");
    }

    if (root.dataset.locationBound === "1") {
      cascadeRestore();
      return;
    }
    root.dataset.locationBound = "1";

    projectSel?.addEventListener("change", () => {
      [corridorSel, roomSel, sectionSel, pipelineSel].forEach((sel) => { if (sel) sel.dataset.locationValue = ""; });
      refreshFrom("project");
    });
    corridorSel?.addEventListener("change", () => {
      corridorSel.dataset.locationValue = corridorSel.value;
      [roomSel, sectionSel, pipelineSel].forEach((sel) => { if (sel) sel.dataset.locationValue = ""; });
      refreshFrom("corridor");
    });
    roomSel?.addEventListener("change", () => {
      roomSel.dataset.locationValue = roomSel.value;
      [sectionSel, pipelineSel].forEach((sel) => { if (sel) sel.dataset.locationValue = ""; });
      refreshFrom("room");
    });
    sectionSel?.addEventListener("change", () => {
      sectionSel.dataset.locationValue = sectionSel.value;
      if (pipelineSel) pipelineSel.dataset.locationValue = "";
      refreshFrom("section");
    });
    pipelineSel?.addEventListener("change", () => { pipelineSel.dataset.locationValue = pipelineSel.value; });

    cascadeRestore();
  }

  /* ---------- list ---------- */
  function filtered() {
    const filter = Object.fromEntries([...document.querySelectorAll("[data-event-filter]")].map((field) => [field.dataset.eventFilter, field.value.trim()]));
    state.filtered = list().filter((item) =>
      (!filter.keyword || `${item.eventId} ${item.title}`.includes(filter.keyword))
      && (!filter.eventType || item.eventType === filter.eventType)
      && (!filter.level || item.level === filter.level)
      && (!filter.status || item.status === filter.status)
    );
    state.page = Math.min(state.page, Math.max(1, Math.ceil(state.filtered.length / state.pageSize) || 1));
    return state.filtered;
  }

  function renderTypeOptions() {
    const select = document.querySelector('[data-event-filter="eventType"]');
    if (!select) return;
    const current = select.value;
    const types = [...new Set([...EVENT_TYPES, ...list().map((item) => item.eventType).filter(Boolean)])];
    select.innerHTML = `<option value="">全部类型</option>${types.map((type) => `<option value="${esc(type)}">${esc(type)}</option>`).join("")}`;
    select.value = current;
  }

  function closeMoreMenu() { document.querySelectorAll(".emergency-more-menu").forEach((node) => node.remove()); }

  function openMoreMenu(button, item) {
    closeMoreMenu();
    const id = esc(item.eventId);
    const actions = item.status === "待指派"
      ? [["assign", "指派"], ["close", "关闭"], ["dispatch", "进入调度台"]]
      : (!["已完成", "已关闭"].includes(item.status) ? [["dispatch", "进入调度台"]] : []);
    if (!actions.length) return;
    const menu = document.createElement("div");
    menu.className = "emergency-more-menu";
    menu.style.width = "108px";
    menu.innerHTML = actions.map(([action, label]) => `<button type="button" data-event-action="${action}" data-event-id="${id}">${label}</button>`).join("");
    document.body.appendChild(menu);
    const rect = button.getBoundingClientRect();
    menu.style.top = `${Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - menu.offsetHeight - 8))}px`;
    menu.style.left = `${Math.min(Math.max(8, rect.right - menu.offsetWidth), window.innerWidth - menu.offsetWidth - 8)}px`;
  }

  function rowActions(item) {
    const id = esc(item.eventId);
    const detail = `<button class="table-action" type="button" data-event-action="detail" data-event-id="${id}">详情</button>`;
    if (item.status === "待指派") return `${detail}<button class="table-action" type="button" data-event-action="more" data-event-id="${id}">更多</button>`;
    if (item.status === "待处理") return `${detail}<button class="table-action" type="button" data-event-action="start" data-event-id="${id}">开始</button>`;
    if (item.status === "处理中") return `${detail}<button class="table-action" type="button" data-event-action="submit" data-event-id="${id}">提交</button>`;
    if (item.status === "验收中") return `${detail}<button class="table-action" type="button" data-event-action="accept" data-event-id="${id}">验收</button>`;
    return detail;
  }

  function render() {
    filtered();
    const body = document.getElementById("eventBody");
    if (!body) return;
    const start = (state.page - 1) * state.pageSize;
    const rows = state.filtered.slice(start, start + state.pageSize);
    body.innerHTML = rows.length
      ? rows.map((item) => `<tr data-event-id="${esc(item.eventId)}">
          <td><strong>${esc(item.eventId)}</strong></td>
          <td title="${esc(item.title || "")}">${esc(item.title || "未命名事件")}</td>
          <td>${esc(item.eventType || "-")}</td>
          <td><span class="status-tag status-${String(item.level || "").toLowerCase()}">${esc(item.level || "-")}</span></td>
          <td title="${esc(item.location || "")}">${esc(item.location || "待定位")}</td>
          <td>${esc(item.source || "人工上报")}</td>
          <td>${ui.renderStatus ? ui.renderStatus(item.status) : esc(item.status)}</td>
          <td>${esc(item.handler || "未指派")}</td>
          <td>${esc(formatTime(item.updatedAt || item.discoveredAt || item.occurrenceTime))}</td>
          <td class="emergency-ledger-actions">${rowActions(item)}</td>
        </tr>`).join("")
      : `<tr><td colspan="10"><div class="emergency-empty">暂无应急事件</div></td></tr>`;
    const count = document.getElementById("eventCount");
    if (count) {
      count.innerHTML = ui.renderPagination
        ? ui.renderPagination({ total: state.filtered.length, page: state.page, pageSize: state.pageSize, id: "eventPagination" })
        : "";
    }
  }

  function goDispatch(eventId) {
    if (typeof ui.navigate === "function") ui.navigate("dispatch", { eventId });
    else window.location.href = `dispatch.html?eventId=${encodeURIComponent(eventId)}`;
  }

  /* ---------- detail ---------- */
  function photosHtml(photos = []) {
    if (!photos.length) return `<span class="emergency-muted">暂无</span>`;
    return `<div class="emergency-photo-grid">${photos.map((src, index) => (
      typeof src === "string" && src.startsWith("data:")
        ? `<img class="emergency-thumb" src="${esc(src)}" alt="结果照片${index + 1}">`
        : `<span class="emergency-thumb emergency-thumb-empty"><i class="fa-regular fa-image"></i></span>`
    )).join("")}</div>`;
  }

  function relatedPersonRows(ids = []) {
    const map = Object.fromEntries(personnelList().map((item) => [item.personId, item]));
    const rows = ids.map((id) => map[id]).filter(Boolean);
    if (!rows.length) return `<div class="emergency-empty">暂无关联人员</div>`;
    return `<table class="table emergency-mini-table"><thead><tr><th>姓名</th><th>所属部门</th><th>人员分类</th><th>联系方式</th></tr></thead><tbody>${rows.map((item) => `<tr><td>${esc(item.name)}</td><td>${esc(item.unit || item.department || "-")}</td><td>${esc(item.type || "-")}</td><td>${esc(item.mobile || item.phone || "-")}</td></tr>`).join("")}</tbody></table>`;
  }

  function relatedResourceRows(resources = [], { withActions = false } = {}) {
    const map = Object.fromEntries(resourceList().map((item) => [item.resourceId, item]));
    const rows = (resources || []).map((entry) => {
      const item = map[entry.resourceId];
      if (!item) return null;
      return { ...item, quantity: entry.quantity || 1 };
    }).filter(Boolean);
    if (!rows.length) return `<div class="emergency-empty">暂无关联物资</div>`;
    const actionHead = withActions ? "<th>操作</th>" : "";
    return `<table class="table emergency-mini-table"><thead><tr><th>物资名称</th><th>分类</th><th>规格</th><th>所在位置</th><th>所需数量</th>${actionHead}</tr></thead><tbody>${rows.map((item) => `<tr>
      <td>${esc(item.name)}</td><td>${esc(item.category || "-")}</td><td>${esc(item.model || "-")}</td><td>${esc(item.location || item.warehouse || "-")}</td>
      <td>${esc(item.quantity)}${item.unit ? ` ${esc(item.unit)}` : ""}</td>
      ${withActions ? `<td><button class="table-action" type="button" data-remove-resource="${esc(item.resourceId)}">移除</button></td>` : ""}
    </tr>`).join("")}</tbody></table>`;
  }

  function detailBody(item, tab = "info") {
    const plan = item.planId ? getPlan(item.planId) : null;
    const pairs = [
      ["事件编号", item.eventId], ["事件标题", item.title || "-"], ["当前状态", item.status || "-"],
      ["事件类型", item.eventType || "-"], ["事件等级", item.level || "-"], ["来源", item.source || "人工上报"],
      ["所属项目", item.project || "-"], ["所属管廊", item.corridor || "-"], ["所属舱室", item.room || "-"],
      ["所属区段", item.section || "-"], ["所属管线", item.pipeline || "-"], ["发生位置", item.location || "待定位"],
      ["当前处理人", item.handler || "未指派"], ["联系人", item.contact || "-"], ["联系电话", item.contactPhone || "-"],
      ["发生时间", formatTime(item.occurrenceTime || item.occurredAt || item.discoveredAt)],
      ["开始时间", formatTime(item.startedAt)], ["完成时间", formatTime(item.finishedAt || item.closedAt)],
      ["更新时间", formatTime(item.updatedAt)],
      ["经度", formatCoord(item.longitude)], ["纬度", formatCoord(item.latitude)],
    ];
    const info = `<section class="emergency-detail-panel ${tab === "info" ? "" : "hidden"}" data-event-detail-panel="info">
      <div class="detail-grid">${pairs.map(([label, value]) => {
        const display = label === "当前状态" && typeof ui.renderStatus === "function" ? ui.renderStatus(value) : esc(value);
        return `<div class="info-item"><span class="info-label">${label}</span><span class="info-value">${display}</span></div>`;
      }).join("")}
        <div class="info-item info-item-full"><span class="info-label">事件描述</span><span class="info-value">${esc(item.description || "暂无事件描述")}</span></div>
      </div>
      <div class="detail-section"><h3 class="detail-title">现场照片</h3>${photosHtml(item.photos)}</div>
    </section>`;

    const resourcePanel = `<section class="emergency-detail-panel ${tab === "resources" ? "" : "hidden"}" data-event-detail-panel="resources">
      <div class="detail-section"><h3 class="detail-title">关联预案</h3>
        <div class="detail-grid">
          <div class="info-item"><span class="info-label">预案名称</span><span class="info-value">${esc(plan?.name || "未关联")}</span></div>
          <div class="info-item"><span class="info-label">预案编号</span><span class="info-value">${esc(plan?.code || plan?.planId || "-")}</span></div>
          <div class="info-item"><span class="info-label">预案类型</span><span class="info-value">${esc(plan?.eventType || "-")}</span></div>
          <div class="info-item"><span class="info-label">响应等级</span><span class="info-value">${esc(plan?.level || "-")}</span></div>
        </div>
      </div>
      <div class="detail-section"><h3 class="detail-title">关联应急人员</h3>${relatedPersonRows(item.relatedPersonIds)}</div>
      <div class="detail-section"><h3 class="detail-title">关联应急物资</h3>${relatedResourceRows(item.relatedResources)}</div>
    </section>`;

    const timelineItems = [];
    [...(item.timeline || [])].forEach((record) => {
      timelineItems.push({
        title: record.title || record.action || "事件更新",
        at: record.at || record.time,
        operator: record.operator || "-",
        message: record.message || record.note || "-",
        photos: record.photos || [],
      });
    });
    (item.stepRecords || []).forEach((record) => {
      const step = (plan?.steps || []).find((entry) => entry.stepId === record.stepId);
      const title = record.status === "已跳过" ? `跳过步骤：${step?.name || record.stepId}` : `完成步骤：${step?.name || record.stepId}`;
      if (!(item.timeline || []).some((entry) => entry.title === title && formatTime(entry.at) === formatTime(record.at))) {
        timelineItems.push({
          title,
          at: record.at,
          operator: record.operator || "-",
          message: [record.process ? `处理过程：${record.process}` : "", record.result ? `处理结果：${record.result}` : ""].filter(Boolean).join("；") || "-",
          photos: record.photos || [],
        });
      }
    });
    timelineItems.sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));

    const timeline = timelineItems.length
      ? timelineItems.map((record) => `<div class="emergency-timeline-item">
          <span class="emergency-timeline-dot"></span>
          <div class="emergency-timeline-body">
            <div class="emergency-timeline-head"><strong>${esc(record.title)}</strong><time>${esc(formatTime(record.at))}</time></div>
            <div class="emergency-timeline-meta">${esc(record.operator)}</div>
            <p>${esc(record.message)}</p>
            ${(record.photos || []).length ? photosHtml(record.photos) : ""}
          </div>
        </div>`).join("")
      : `<div class="emergency-empty">暂无处置记录</div>`;

    const recordPanel = `<section class="emergency-detail-panel ${tab === "records" ? "" : "hidden"}" data-event-detail-panel="records"><div class="emergency-timeline">${timeline}</div></section>`;
    const tabs = `<div class="emergency-detail-tabs">
      <button type="button" class="${tab === "info" ? "active" : ""}" data-event-detail-tab="info" data-event-id="${esc(item.eventId)}">事件信息</button>
      <button type="button" class="${tab === "resources" ? "active" : ""}" data-event-detail-tab="resources" data-event-id="${esc(item.eventId)}">应急资源</button>
      <button type="button" class="${tab === "records" ? "active" : ""}" data-event-detail-tab="records" data-event-id="${esc(item.eventId)}">处置记录</button>
    </div>`;
    return tabs + info + resourcePanel + recordPanel;
  }

  function clearWizardDrawerClass() {
    document.getElementById("drawer")?.classList.remove("emergency-wizard-drawer");
  }

  function openDetail(item, tab = "info") {
    if (!item) return;
    clearWizardDrawerClass();
    window.openAppDrawer({
      title: "应急事件详情",
      body: detailBody(item, tab),
      footer: `<button class="btn btn-secondary" type="button" data-drawer-close>关闭</button>`,
    });
  }

  /* ---------- create wizard ---------- */
  function draftLocationText() {
    const d = state.draft;
    return [d.project, d.corridor, d.room, d.section, d.pipeline].filter(Boolean).join(" / ") || "待定位";
  }

  function createWizardHtml() {
    const step = state.createStep;
    const d = state.draft;
    const steps = `<div class="emergency-wizard-steps">
      <div class="emergency-wizard-step ${step === 1 ? "active" : ""} ${step > 1 ? "done" : ""}" data-step="1">1. 基础信息</div>
      <div class="emergency-wizard-step ${step === 2 ? "active" : ""} ${step > 2 ? "done" : ""}" data-step="2">2. 应急资源</div>
      <div class="emergency-wizard-step ${step === 3 ? "active" : ""}" data-step="3">3. 保存预览</div>
    </div>`;

    const basic = `<section class="emergency-wizard-panel ${step === 1 ? "" : "hidden"}" data-create-panel="1">
      <form class="emergency-form-grid" data-event-form="create-basic">
        <label class="form-field"><span class="form-label form-required">事件标题</span><input class="form-control" data-event-field="title" maxlength="50" placeholder="请输入" value="${esc(d.title)}"></label>
        <label class="form-field"><span class="form-label form-required">所属项目</span><select class="form-control" data-event-field="project"><option value="">请选择</option>${locationTree.map((item) => `<option value="${esc(item.name)}" ${item.name === d.project ? "selected" : ""}>${esc(item.name)}</option>`).join("")}</select></label>
        <div class="emergency-location-cascade" data-event-location-form>
          <label class="form-field"><span class="form-label">所属管廊</span><select class="form-control" data-location-level="corridor" data-event-field="corridor" data-location-value="${esc(d.corridor)}" disabled><option value="">请先选择所属项目</option></select></label>
          <label class="form-field"><span class="form-label">所属舱室</span><select class="form-control" data-location-level="room" data-event-field="room" data-location-value="${esc(d.room)}" disabled><option value="">请先选择所属管廊</option></select></label>
          <label class="form-field"><span class="form-label">所属区段</span><select class="form-control" data-location-level="section" data-event-field="section" data-location-value="${esc(d.section)}" disabled><option value="">请先选择所属舱室</option></select></label>
          <label class="form-field"><span class="form-label">所属管线</span><select class="form-control" data-location-level="pipeline" data-event-field="pipeline" data-location-value="${esc(d.pipeline)}" disabled><option value="">请先选择所属区段</option></select></label>
        </div>
        <label class="form-field"><span class="form-label form-required">事件类型</span><select class="form-control" data-event-field="eventType"><option value="">请选择</option>${EVENT_TYPES.map((type) => `<option value="${esc(type)}" ${type === d.eventType ? "selected" : ""}>${esc(type)}</option>`).join("")}</select></label>
        <label class="form-field"><span class="form-label form-required">事件等级</span><select class="form-control" data-event-field="level">${["P1", "P2", "P3", "P4"].map((level) => `<option value="${level}" ${level === d.level ? "selected" : ""}>${level}</option>`).join("")}</select></label>
        <label class="form-field"><span class="form-label form-required">联系人</span><input class="form-control" data-event-field="contact" maxlength="20" placeholder="请输入" value="${esc(d.contact)}"></label>
        <label class="form-field"><span class="form-label form-required">联系电话</span><input class="form-control" data-event-field="contactPhone" maxlength="20" placeholder="请输入手机号" value="${esc(d.contactPhone)}"></label>
        <label class="form-field full"><span class="form-label form-required">事件描述</span><textarea class="form-control textarea" data-event-field="description" maxlength="500" rows="4" placeholder="请输入事件描述">${esc(d.description)}</textarea></label>
        <div class="form-field full"><span class="form-label">上传照片</span><input class="form-control" type="file" accept=".jpg,.jpeg,.png,.gif,.webp,image/*" multiple data-event-photos><div class="form-hint">请上传不超过 5MB 的 jpg、jpeg、png、gif、webp，最多 6 张</div></div>
        <div class="form-field full"><span class="form-label">上传附件</span><input class="form-control" type="file" multiple data-event-attachments><div class="form-hint">单文件不超过 10MB，最多 5 个</div></div>
        <div class="emergency-form-section">点位信息</div>
        <div class="emergency-point-row form-field full">
          <label class="form-field"><span class="form-label">经度</span><input class="form-control" data-event-field="longitude" data-point-lng readonly placeholder="点位选择后回显" value="${d.longitude === "" || d.longitude == null ? "" : esc(Number(d.longitude).toFixed(6))}"></label>
          <label class="form-field"><span class="form-label">纬度</span><input class="form-control" data-event-field="latitude" data-point-lat readonly placeholder="点位选择后回显" value="${d.latitude === "" || d.latitude == null ? "" : esc(Number(d.latitude).toFixed(6))}"></label>
          <button class="btn btn-secondary" type="button" data-event-point-select>点位选择</button>
        </div>
      </form>
    </section>`;

    const persons = personnelList().filter((item) => d.relatedPersonIds.includes(item.personId));
    const plan = d.planId ? getPlan(d.planId) : null;
    const resourcePanel = `<section class="emergency-wizard-panel ${step === 2 ? "" : "hidden"}" data-create-panel="2">
      <div class="emergency-assoc-block">
        <div class="emergency-assoc-head"><h3>应急人员</h3><button class="btn btn-secondary btn-sm" type="button" data-event-assoc="person">添加人员</button></div>
        <table class="table emergency-mini-table"><thead><tr><th>姓名</th><th>所属部门</th><th>人员分类</th><th>联系方式</th><th>操作</th></tr></thead>
          <tbody>${persons.length ? persons.map((item) => `<tr><td>${esc(item.name)}</td><td>${esc(item.unit || "-")}</td><td>${esc(item.type || "-")}</td><td>${esc(item.mobile || "-")}</td><td><button class="table-action" type="button" data-remove-person="${esc(item.personId)}">移除</button></td></tr>`).join("") : `<tr><td colspan="5"><div class="emergency-empty">请添加应急人员</div></td></tr>`}</tbody>
        </table>
      </div>
      <div class="emergency-assoc-block">
        <div class="emergency-assoc-head"><h3>应急物资</h3><button class="btn btn-secondary btn-sm" type="button" data-event-assoc="resource">添加物资</button></div>
        ${d.relatedResources.length
          ? relatedResourceRows(d.relatedResources, { withActions: true })
          : `<table class="table emergency-mini-table"><thead><tr><th>物资名称</th><th>分类</th><th>规格</th><th>所在位置</th><th>所需数量</th><th>操作</th></tr></thead><tbody><tr><td colspan="6"><div class="emergency-empty">请添加应急物资</div></td></tr></tbody></table>`}
      </div>
      <div class="emergency-assoc-block">
        <div class="emergency-assoc-head"><h3>应急预案</h3></div>
        <div class="form-field"><span class="form-label form-required">关联预案</span>
          <div class="emergency-plan-search" data-plan-search>
            <input class="form-control" data-plan-keyword placeholder="搜索预案名称 / 编号" value="${esc(plan?.name || "")}" autocomplete="off">
            <input type="hidden" data-event-field="planId" value="${esc(d.planId || "")}">
            <div class="emergency-plan-dropdown hidden" data-plan-dropdown></div>
          </div>
          <div class="form-hint">仅可关联一个已发布预案</div>
        </div>
      </div>
    </section>`;

    const preview = `<section class="emergency-wizard-panel ${step === 3 ? "" : "hidden"}" data-create-panel="3">
      <div class="detail-grid">
        <div class="info-item"><span class="info-label">事件标题</span><span class="info-value">${esc(d.title || "-")}</span></div>
        <div class="info-item"><span class="info-label">事件类型</span><span class="info-value">${esc(d.eventType || "-")}</span></div>
        <div class="info-item"><span class="info-label">事件等级</span><span class="info-value">${esc(d.level || "-")}</span></div>
        <div class="info-item"><span class="info-label">发生位置</span><span class="info-value">${esc(draftLocationText())}</span></div>
        <div class="info-item"><span class="info-label">联系人</span><span class="info-value">${esc(d.contact || "-")}</span></div>
        <div class="info-item"><span class="info-label">联系电话</span><span class="info-value">${esc(d.contactPhone || "-")}</span></div>
        <div class="info-item"><span class="info-label">经度</span><span class="info-value">${esc(formatCoord(d.longitude))}</span></div>
        <div class="info-item"><span class="info-label">纬度</span><span class="info-value">${esc(formatCoord(d.latitude))}</span></div>
        <div class="info-item"><span class="info-label">关联预案</span><span class="info-value">${esc(plan?.name || "未关联")}</span></div>
        <div class="info-item info-item-full"><span class="info-label">事件描述</span><span class="info-value">${esc(d.description || "-")}</span></div>
      </div>
      <div class="detail-section"><h3 class="detail-title">关联应急人员（${persons.length}）</h3>${relatedPersonRows(d.relatedPersonIds)}</div>
      <div class="detail-section"><h3 class="detail-title">关联应急物资（${d.relatedResources.length}）</h3>${relatedResourceRows(d.relatedResources)}</div>
    </section>`;

    return `<div class="emergency-wizard">${steps}<div class="emergency-wizard-content">${basic}${resourcePanel}${preview}</div></div>`;
  }

  function createFooter() {
    const step = state.createStep;
    return `<button class="btn btn-secondary" type="button" data-drawer-close>取消</button>
      ${step > 1 ? `<button class="btn btn-secondary" type="button" data-create-prev>上一步</button>` : ""}
      ${step < 3 ? `<button class="btn btn-primary" type="button" data-create-next>下一步</button>` : `<button class="btn btn-primary" type="button" data-event-drawer-save>保存</button>`}`;
  }

  function openCreate() {
    state.createStep = 1;
    state.draft = emptyDraft();
    window.openAppDrawer({ title: "新建应急事件", body: createWizardHtml(), footer: createFooter() });
    const drawer = document.getElementById("drawer");
    if (drawer) drawer.classList.add("emergency-wizard-drawer");
    bindLocationCascade(document.querySelector("[data-event-location-form]"));
  }

  function refreshCreateDrawer() {
    const drawer = document.getElementById("drawer");
    const body = drawer?.querySelector(".drawer-body");
    const footer = drawer?.querySelector(".drawer-footer");
    if (!body || !footer) return;
    body.innerHTML = createWizardHtml();
    footer.innerHTML = createFooter();
    drawer.classList.add("emergency-wizard-drawer");
    if (state.createStep === 1) bindLocationCascade(document.querySelector("[data-event-location-form]"));
  }

  async function readPhotosFromInput(input) {
    return new Promise((resolve) => {
      const files = [...(input?.files || [])];
      if (!files.length) { resolve([]); return; }
      if (files.length > 6) { toast("最多上传 6 张照片", "error"); resolve(null); return; }
      const result = [];
      let pending = files.length;
      let failed = false;
      files.forEach((file) => {
        if (failed) return;
        if (!ALLOWED_IMAGE.test(file.name) && !/^image\/(jpeg|png|gif|webp)$/i.test(file.type)) {
          toast("仅支持 jpg、jpeg、png、gif、webp", "error"); failed = true; resolve(null); return;
        }
        if (file.size > MAX_IMAGE_BYTES) { toast("单张图片不能超过 5MB", "error"); failed = true; resolve(null); return; }
        const reader = new FileReader();
        reader.onload = () => { result.push(reader.result); pending -= 1; if (pending <= 0 && !failed) resolve(result); };
        reader.onerror = () => { toast("图片读取失败", "error"); failed = true; resolve(null); };
        reader.readAsDataURL(file);
      });
    });
  }

  async function collectBasicDraft() {
    const form = document.querySelector('[data-event-form="create-basic"]');
    if (!form) return false;
    const read = (key) => form.querySelector(`[data-event-field="${key}"]`)?.value.trim() || "";
    const next = {
      title: read("title"), project: read("project"), corridor: read("corridor"), room: read("room"),
      section: read("section"), pipeline: read("pipeline"), eventType: read("eventType"), level: read("level") || "P2",
      contact: read("contact"), contactPhone: read("contactPhone"), description: read("description"),
      longitude: read("longitude"), latitude: read("latitude"),
    };
    form.querySelectorAll(".form-control.error").forEach((field) => field.classList.remove("error"));
    let ok = true;
    ["title", "project", "eventType", "contact", "contactPhone", "description"].forEach((key) => {
      if (!next[key]) { form.querySelector(`[data-event-field="${key}"]`)?.classList.add("error"); ok = false; }
    });
    if (!ok) { toast("请填写必填项", "error"); return false; }
    if (!/^1\d{10}$/.test(next.contactPhone.replace(/\s/g, ""))) {
      form.querySelector('[data-event-field="contactPhone"]')?.classList.add("error");
      toast("请输入正确的手机号", "error");
      return false;
    }
    const longitude = next.longitude === "" ? "" : Number(next.longitude);
    const latitude = next.latitude === "" ? "" : Number(next.latitude);
    if ((longitude === "" && latitude !== "") || (longitude !== "" && latitude === "")
      || (longitude !== "" && !Number.isFinite(longitude))
      || (latitude !== "" && !Number.isFinite(latitude))) {
      form.querySelector('[data-event-field="longitude"]')?.classList.add("error");
      form.querySelector('[data-event-field="latitude"]')?.classList.add("error");
      toast("请通过点位选择填写有效的经纬度", "error");
      return false;
    }
    const photos = await readPhotosFromInput(form.querySelector("[data-event-photos]"));
    if (photos === null) return false;
    const files = [...(form.querySelector("[data-event-attachments]")?.files || [])];
    if (files.length > 5) { toast("最多上传 5 个附件", "error"); return false; }
    Object.assign(state.draft, next, {
      contactPhone: next.contactPhone.replace(/\s/g, ""),
      longitude,
      latitude,
      photos: photos.length ? photos : state.draft.photos,
      attachments: files.length ? files.map((file) => file.name) : state.draft.attachments,
    });
    return true;
  }

  function openEventPointPicker() {
    if (!window.EMERGENCY_POINT_PICKER?.open) {
      toast("点位选择组件未加载", "error");
      return;
    }
    const formNode = document.querySelector('[data-event-form="create-basic"]');
    if (!formNode) return;
    const title = formNode.querySelector('[data-event-field="title"]')?.value.trim() || state.draft.title || "当前事件";
    const eventType = formNode.querySelector('[data-event-field="eventType"]')?.value || state.draft.eventType || "";
    const peers = list()
      .filter((item) => Number.isFinite(Number(item.longitude)) && Number.isFinite(Number(item.latitude)))
      .map((item) => {
        const meta = eventTypeMeta(item.eventType);
        return {
          id: item.eventId,
          name: item.title || item.eventId,
          longitude: item.longitude,
          latitude: item.latitude,
          legend: item.eventType || "其他",
          color: meta.color,
          icon: meta.icon,
        };
      });
    const legend = EVENT_TYPES.map((label) => {
      const meta = eventTypeMeta(label);
      return { label, color: meta.color, icon: meta.icon };
    });
    const currentMeta = eventTypeMeta(eventType);
    window.EMERGENCY_POINT_PICKER.open({
      longitude: formNode.querySelector("[data-point-lng]")?.value || state.draft.longitude,
      latitude: formNode.querySelector("[data-point-lat]")?.value || state.draft.latitude,
      label: title,
      currentIcon: currentMeta.icon,
      note: "点击管廊地图选择事件点位",
      peers,
      legend,
      onConfirm: (point) => {
        const lngInput = formNode.querySelector("[data-point-lng]");
        const latInput = formNode.querySelector("[data-point-lat]");
        if (lngInput) lngInput.value = point.longitude.toFixed(6);
        if (latInput) latInput.value = point.latitude.toFixed(6);
        state.draft.longitude = point.longitude;
        state.draft.latitude = point.latitude;
      },
    });
  }

  function collectResourceDraft() {
    const planId = document.querySelector('[data-event-field="planId"]')?.value || state.draft.planId || "";
    state.draft.planId = planId;
    if (!planId) { toast("请关联应急预案", "error"); return false; }
    return true;
  }

  async function saveCreate() {
    if (!(await collectBasicDraft())) { state.createStep = 1; refreshCreateDrawer(); return; }
    if (!collectResourceDraft()) { state.createStep = 2; refreshCreateDrawer(); return; }
    const d = state.draft;
    const stamp = Date.now();
    const occurrenceTime = nowText();
    const event = {
      eventId: `EVT-${stamp}`,
      title: d.title, eventType: d.eventType, level: d.level,
      project: d.project, corridor: d.corridor, room: d.room, section: d.section, pipeline: d.pipeline,
      location: draftLocationText(), contact: d.contact, contactPhone: d.contactPhone, description: d.description,
      longitude: d.longitude === "" ? "" : Number(d.longitude),
      latitude: d.latitude === "" ? "" : Number(d.latitude),
      photos: d.photos, attachments: d.attachments, planId: d.planId,
      relatedPersonIds: [...d.relatedPersonIds],
      relatedResources: d.relatedResources.map((entry) => ({ resourceId: entry.resourceId, quantity: Number(entry.quantity) || 1 })),
      relatedResourceIds: d.relatedResources.map((entry) => entry.resourceId),
      source: "人工上报", status: "待指派", handler: "", stepRecords: [],
      occurrenceTime, discoveredAt: occurrenceTime, startedAt: "", finishedAt: "",
      timeline: [{ timelineId: `TL-${stamp}`, at: occurrenceTime, title: "创建", operator: d.contact || "当前用户", message: "新建应急事件" }],
      updatedAt: occurrenceTime,
    };
    try {
      store.saveEvent(event);
      window.closeAppDrawer();
      state.page = 1;
      toast("事件已创建");
      renderTypeOptions();
      render();
    } catch (error) {
      toast(error.message || "创建失败", "error");
    }
  }

  /* ---------- associate pickers ---------- */
  function readPickerSelection(type) {
    if (type === "person") {
      return [...document.querySelectorAll(".emergency-center-mask [data-person-check]:checked")].map((input) => input.value);
    }
    return [...document.querySelectorAll(".emergency-center-mask [data-resource-check]:checked")].map((input) => {
      const qty = Number(document.querySelector(`.emergency-center-mask [data-resource-qty="${input.value}"]`)?.value || 1);
      return { resourceId: input.value, quantity: Math.max(1, qty) };
    });
  }

  function syncPickerDraft(type) {
    if (!document.querySelector(".emergency-center-mask")) return;
    if (type === "person") state.draft.relatedPersonIds = readPickerSelection("person");
    else state.draft.relatedResources = readPickerSelection("resource");
  }

  function personPickRows(filter = {}) {
    const selected = new Set(state.draft.relatedPersonIds);
    const name = (filter.name || "").trim().toLowerCase();
    const unit = (filter.unit || "").trim().toLowerCase();
    const type = (filter.type || "").trim();
    const rows = personnelList().filter((item) =>
      (!name || String(item.name || "").toLowerCase().includes(name))
      && (!unit || `${item.unit || ""} ${item.department || ""}`.toLowerCase().includes(unit))
      && (!type || item.type === type)
    );
    if (!rows.length) return `<div class="emergency-empty">暂无匹配人员</div>`;
    return rows.map((item) => `<label class="emergency-pick-row"><input type="checkbox" data-person-check value="${esc(item.personId)}" ${selected.has(item.personId) ? "checked" : ""}><span><strong>${esc(item.name)}</strong><small>${esc(item.unit || "-")} · ${esc(item.type || "-")} · ${esc(item.mobile || "-")}</small></span></label>`).join("");
  }

  function resourcePickRows(filter = {}) {
    const selectedMap = Object.fromEntries(state.draft.relatedResources.map((entry) => [entry.resourceId, entry.quantity]));
    const name = (filter.name || "").trim().toLowerCase();
    const category = (filter.category || "").trim();
    const rows = resourceList().filter((item) =>
      (!name || String(item.name || "").toLowerCase().includes(name))
      && (!category || item.category === category)
    );
    if (!rows.length) return `<div class="emergency-empty">暂无匹配物资</div>`;
    return rows.map((item) => {
      const available = Number(item.available || 0);
      const checked = Object.prototype.hasOwnProperty.call(selectedMap, item.resourceId);
      const quantity = checked ? selectedMap[item.resourceId] : 1;
      return `<div class="emergency-resource-pick-row" data-resource-pick-row="${esc(item.resourceId)}">
        <label class="emergency-pick-check"><input type="checkbox" data-resource-check value="${esc(item.resourceId)}" ${checked ? "checked" : ""} ${available <= 0 ? "disabled" : ""}>
          <span><strong>${esc(item.name)}</strong><small>${esc(item.category || "-")} · ${esc(item.model || "-")} · ${esc(item.location || "-")}</small></span>
        </label>
        <div class="emergency-resource-qty">
          <span class="emergency-muted">可用 ${esc(available)}${item.unit ? ` ${esc(item.unit)}` : ""}</span>
          <label>所需数量 <input class="form-control" type="number" min="1" max="${available}" step="1" data-resource-qty="${esc(item.resourceId)}" value="${esc(quantity)}" ${checked && available > 0 ? "" : "disabled"}></label>
        </div>
      </div>`;
    }).join("");
  }

  function refreshAssocPickerList(type) {
    const listRoot = document.querySelector("[data-assoc-list]");
    if (!listRoot) return;
    if (type === "person") {
      const filter = {
        name: document.querySelector("[data-assoc-filter='name']")?.value || "",
        unit: document.querySelector("[data-assoc-filter='unit']")?.value || "",
        type: document.querySelector("[data-assoc-filter='type']")?.value || "",
      };
      listRoot.innerHTML = personPickRows(filter);
      return;
    }
    const filter = {
      name: document.querySelector("[data-assoc-filter='name']")?.value || "",
      category: document.querySelector("[data-assoc-filter='category']")?.value || "",
    };
    listRoot.innerHTML = resourcePickRows(filter);
  }

  function openAssocPicker(type) {
    const isPerson = type === "person";
    const personTypes = [...new Set(personnelList().map((item) => item.type).filter(Boolean))];
    const categories = [...new Set(resourceList().map((item) => item.category).filter(Boolean))];
    const filterHtml = isPerson
      ? `<div class="emergency-assoc-filters">
          <label class="form-field"><span class="form-label">姓名</span><input class="form-control" data-assoc-filter="name" placeholder="请输入姓名"></label>
          <label class="form-field"><span class="form-label">部门</span><input class="form-control" data-assoc-filter="unit" placeholder="请输入部门"></label>
          <label class="form-field"><span class="form-label">人员分类</span><select class="form-control" data-assoc-filter="type"><option value="">全部分类</option>${personTypes.map((value) => `<option value="${esc(value)}">${esc(value)}</option>`).join("")}</select></label>
          <div class="emergency-assoc-filter-actions">
            <button class="btn btn-secondary" type="button" data-assoc-filter-reset="${type}">重置</button>
            <button class="btn btn-primary" type="button" data-assoc-filter-search="${type}">搜索</button>
          </div>
        </div>`
      : `<div class="emergency-assoc-filters">
          <label class="form-field"><span class="form-label">物资名称</span><input class="form-control" data-assoc-filter="name" placeholder="请输入物资名称"></label>
          <label class="form-field"><span class="form-label">物资分类</span><select class="form-control" data-assoc-filter="category"><option value="">全部分类</option>${categories.map((value) => `<option value="${esc(value)}">${esc(value)}</option>`).join("")}</select></label>
          <div class="emergency-assoc-filter-actions">
            <button class="btn btn-secondary" type="button" data-assoc-filter-reset="${type}">重置</button>
            <button class="btn btn-primary" type="button" data-assoc-filter-search="${type}">搜索</button>
          </div>
        </div>`;
    const mask = document.createElement("div");
    mask.className = "emergency-center-mask";
    mask.innerHTML = `<div class="emergency-center-modal ${isPerson ? "" : "emergency-resource-pick-modal"}" role="dialog">
      <div class="emergency-center-head"><h3>${isPerson ? "选择应急人员" : "选择应急物资"}</h3><button type="button" data-center-close>×</button></div>
      <div class="emergency-center-body">
        ${filterHtml}
        <div class="emergency-assoc-list" data-assoc-list>${isPerson ? personPickRows() : resourcePickRows()}</div>
      </div>
      <div class="emergency-center-foot">
        <button class="btn btn-secondary" type="button" data-center-close>取消</button>
        <button class="btn btn-primary" type="button" data-assoc-confirm="${type}">确定</button>
      </div>
    </div>`;
    document.body.appendChild(mask);
  }

  function renderPlanDropdown(keyword = "") {
    const dropdown = document.querySelector("[data-plan-dropdown]");
    if (!dropdown) return;
    const key = keyword.trim().toLowerCase();
    const plans = planList().filter((item) => !key || `${item.name} ${item.code || ""} ${item.eventType || ""}`.toLowerCase().includes(key));
    dropdown.classList.remove("hidden");
    dropdown.innerHTML = plans.length
      ? plans.map((item) => `<button type="button" data-plan-pick="${esc(item.planId)}"><strong>${esc(item.name)}</strong><small>${esc(item.code || item.planId)} · ${esc(item.eventType || "-")} · ${esc(item.level || "-")}</small></button>`).join("")
      : `<div class="emergency-empty">无匹配预案</div>`;
  }

  /* ---------- assign person picker (work-order style) ---------- */
  function closePersonPicker() {
    document.querySelectorAll(".inspection-person-mask").forEach((node) => node.remove());
    state.picker.open = false;
  }

  function deptById(id, nodes = woDepartments()) {
    for (const node of nodes) {
      if (node.id === id) return node;
      const found = deptById(id, node.children || []);
      if (found) return found;
    }
    return null;
  }

  function deptNameList(node) {
    if (!node) return [];
    const names = [node.name];
    (node.children || []).forEach((child) => names.push(...deptNameList(child)));
    return names;
  }

  function renderPersonDeptTree() {
    const tree = document.getElementById("personDeptTree");
    if (!tree) return;
    const keyword = (state.picker.deptKeyword || "").trim().toLowerCase();
    const selfMatched = (node) => !keyword || node.name.toLowerCase().includes(keyword);
    const matched = (node) => selfMatched(node) || (node.children || []).some((child) => matched(child));
    const countOf = (node) => woPersonnel().filter((person) => deptNameList(node).includes(person.dept)).length;
    const nodeHtml = (node, level, force) => {
      if (!force && !matched(node)) return "";
      const deep = Boolean(keyword) && (force || selfMatched(node));
      const children = deep ? (node.children || []) : (node.children || []).filter((child) => matched(child));
      const collapsed = !keyword && state.picker.deptCollapsed.has(node.id);
      const caret = children.length
        ? `<button class="person-dept-caret fa-solid fa-caret-down${collapsed ? " is-collapsed" : ""}" type="button" data-person-dept-toggle="${esc(node.id)}" aria-label="展开或收起"></button>`
        : `<span class="person-dept-caret-placeholder"></span>`;
      return `<div class="person-dept-node${state.picker.deptId === node.id ? " active" : ""}" data-person-dept="${esc(node.id)}">${caret}<i class="person-dept-icon fa-solid ${level === 0 ? "fa-building" : "fa-folder"}" aria-hidden="true"></i><span class="person-dept-name">${esc(node.name)}</span><span class="person-dept-count">${countOf(node)}</span></div>
        ${children.length ? `<div class="person-dept-children" data-person-dept-children="${esc(node.id)}"${collapsed ? " hidden" : ""}>${children.map((child) => nodeHtml(child, level + 1, deep)).join("")}</div>` : ""}`;
    };
    tree.innerHTML = `<div class="person-dept-node person-dept-all${state.picker.deptId ? "" : " active"}" data-person-dept=""><span class="person-dept-caret-placeholder"></span><i class="person-dept-icon fa-solid fa-users" aria-hidden="true"></i><span class="person-dept-name">全部人员</span><span class="person-dept-count">${woPersonnel().length}</span></div>${woDepartments().map((node) => nodeHtml(node, 0)).join("")}`;
  }

  function personListFiltered() {
    const dept = state.picker.deptId ? deptById(state.picker.deptId) : null;
    const names = dept ? deptNameList(dept) : null;
    const keyword = (state.picker.keyword || "").trim().toLowerCase();
    return woPersonnel().filter((person) => (!names || names.includes(person.dept)) && (!keyword || `${person.name} ${person.phone} ${person.dept}`.toLowerCase().includes(keyword)));
  }

  function renderPersonList() {
    const body = document.getElementById("personListBody");
    if (!body) return;
    const listData = personListFiltered();
    body.innerHTML = listData.length
      ? listData.map((person) => `<tr class="${state.picker.selectedId === person.id ? "active" : ""}"><td class="person-pick-cell"><input type="radio" name="event-person-pick" data-person-pick="${esc(person.id)}" ${state.picker.selectedId === person.id ? "checked" : ""}></td><td><div class="person-cell"><span class="person-avatar" style="background:${avatarColor(person.name)}">${esc(avatarText(person.name))}</span><div class="person-cell-info"><span class="person-cell-name">${esc(person.name)}</span><span class="person-cell-phone">${esc(person.phone)}</span></div></div></td></tr>`).join("")
      : `<tr><td colspan="2"><div class="inspection-empty">暂无匹配人员</div></td></tr>`;
  }

  function renderPersonSelected() {
    const body = document.getElementById("personSelectedBody");
    if (!body) return;
    const person = woPersonnel().find((entry) => entry.id === state.picker.selectedId);
    body.innerHTML = person
      ? `<tr><td><div class="person-cell"><span class="person-avatar" style="background:${avatarColor(person.name)}">${esc(avatarText(person.name))}</span><span class="person-cell-name">${esc(person.name)}</span></div></td><td class="person-remove-cell"><button type="button" class="person-remove" data-person-remove="${esc(person.id)}">移除</button></td></tr>`
      : `<tr><td colspan="2"><div class="inspection-empty">暂无选中人员</div></td></tr>`;
  }

  function openPersonPicker(trigger) {
    closePersonPicker();
    const input = trigger.querySelector("input");
    const current = woPersonnel().find((person) => person.name === String(input?.value || "").trim());
    state.picker = { open: true, target: input || null, deptId: "", keyword: "", deptKeyword: "", deptCollapsed: new Set(), selectedId: current?.id || "" };
    const mask = document.createElement("div");
    mask.className = "inspection-person-mask";
    mask.innerHTML = `<div class="inspection-person-modal" role="dialog" aria-modal="true" aria-label="选择人员"><div class="inspection-person-head"><h3>选择人员</h3><button class="inspection-person-close" type="button" data-person-close aria-label="关闭">×</button></div><div class="inspection-person-main"><aside class="inspection-person-dept"><div class="inspection-person-dept-head"><i class="fa-solid fa-sitemap" aria-hidden="true"></i><span>组织架构</span></div><div class="inspection-dept-search"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><input class="form-control" data-person-dept-keyword placeholder="搜索部门"></div><div class="inspection-person-dept-tree" id="personDeptTree"></div></aside><section class="inspection-person-list"><div class="inspection-person-tools"><input class="form-control" id="personKeyword" placeholder="请输入"><button class="btn btn-primary" type="button" data-person-search>搜索</button><button class="btn btn-secondary" type="button" data-person-reset>重置</button></div><div class="inspection-person-table-wrap"><table class="table"><thead><tr><th colspan="2">用户</th></tr></thead><tbody id="personListBody"></tbody></table></div></section><section class="inspection-person-selected"><div class="inspection-person-selected-head"><h4>已选中人员</h4><button class="btn btn-secondary" type="button" data-person-clear>清空选中</button></div><div class="inspection-person-table-wrap"><table class="table"><thead><tr><th>昵称</th><th class="person-remove-cell">操作</th></tr></thead><tbody id="personSelectedBody"></tbody></table></div></section></div><div class="inspection-person-foot"><button class="btn btn-secondary" type="button" data-person-cancel>取消</button><button class="btn btn-primary" type="button" data-person-confirm>确定</button></div></div>`;
    document.body.append(mask);
    renderPersonDeptTree();
    renderPersonList();
    renderPersonSelected();
  }

  function openAssign(item) {
    presentForm({
      title: "指派事件",
      body: `<form class="emergency-form-grid" data-event-form="assign" data-event-id="${esc(item.eventId)}">
        <div class="form-field full"><span class="form-label">事件编号</span><div class="info-value">${esc(item.eventId)}</div></div>
        <div class="form-field full"><span class="form-label form-required">指派人</span>
          <div class="inspection-person-field" data-event-person-trigger>
            <input class="form-control inspection-person-input" data-event-field="assignee" readonly placeholder="请选择指派人" value="" autocomplete="off">
            <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
          </div>
        </div>
        <label class="form-field full"><span class="form-label">指派说明</span><textarea class="form-control textarea" data-event-field="assignNote" maxlength="200" rows="4" placeholder="请输入指派说明"></textarea></label>
      </form>`,
      footer: `<button class="btn btn-secondary" type="button" ${cancelActionAttr()}>取消</button><button class="btn btn-primary" type="button" data-event-confirm-assign>确认</button>`,
    });
  }

  function confirmAssign() {
    const form = document.querySelector('[data-event-form="assign"]');
    if (!form) return;
    const item = eventById(form.dataset.eventId);
    if (!item || item.status !== "待指派") { toast("当前状态不支持指派", "error"); return; }
    const assignee = form.querySelector('[data-event-field="assignee"]')?.value.trim() || "";
    const note = form.querySelector('[data-event-field="assignNote"]')?.value.trim() || "";
    if (!assignee) { toast("请选择指派人", "error"); return; }
    persist({ ...item, status: "待处理", handler: assignee }, { title: "指派", message: note || `指派给${assignee}` });
    closeCenterOpsModal();
    window.closeAppDrawer?.();
    toast("已指派");
    notifyChanged();
  }

  function openClose(item) {
    presentForm({
      title: "关闭事件",
      body: `<form class="emergency-form-grid" data-event-form="close" data-event-id="${esc(item.eventId)}">
        <label class="form-field full"><span class="form-label form-required">撤回原因</span><textarea class="form-control textarea" data-event-field="closeReason" maxlength="200" rows="5" placeholder="请输入撤回原因">发起人关闭</textarea></label>
      </form>`,
      footer: `<button class="btn btn-secondary" type="button" ${cancelActionAttr()}>取消</button><button class="btn btn-primary" type="button" data-event-confirm-close>确认</button>`,
    });
  }

  function confirmClose() {
    const form = document.querySelector('[data-event-form="close"]');
    if (!form) return;
    const item = eventById(form.dataset.eventId);
    if (!item || item.status !== "待指派") { toast("当前状态不支持关闭", "error"); return; }
    const reason = form.querySelector('[data-event-field="closeReason"]')?.value.trim() || "";
    if (!reason) { toast("请输入撤回原因", "error"); return; }
    persist({ ...item, status: "已关闭", closedAt: nowText() }, { title: "关闭", message: reason });
    closeCenterOpsModal();
    window.closeAppDrawer?.();
    toast("事件已关闭");
    notifyChanged();
  }

  function startEvent(item) {
    if (!item || item.status !== "待处理") { toast("当前状态不支持开始处理", "error"); return; }
    const run = () => {
      persist({ ...item, status: "处理中", startedAt: nowText() }, { title: "开始处理", message: "开始处理事件", operator: item.handler || "当前用户" });
      toast("已开始处理");
      notifyChanged();
    };
    if (typeof window.openAppConfirm === "function") {
      window.openAppConfirm({ title: "提示", message: "确认开始处理该应急事件？", confirmText: "确定", okClass: "btn-primary", onConfirm: run });
    } else run();
  }

  /* ---------- submit with plan steps ---------- */
  function stepStatusOf(item, stepId) {
    return (item.stepRecords || []).find((entry) => entry.stepId === stepId)?.status || "未开始";
  }

  function allStepsDone(item, plan) {
    const steps = plan?.steps || [];
    if (!steps.length) return true;
    return steps.every((step) => ["已完成", "已跳过"].includes(stepStatusOf(item, step.stepId)));
  }

  function currentStepId(item, plan) {
    const steps = [...(plan?.steps || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
    const active = steps.find((step) => stepStatusOf(item, step.stepId) === "未开始");
    return active?.stepId || "";
  }

  function submitStepsHtml(item) {
    const plan = item.planId ? getPlan(item.planId) : null;
    if (!plan) return `<div class="emergency-empty">当前事件未关联预案，请先在新建时关联应急预案</div>`;
    const steps = [...(plan.steps || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
    const activeId = currentStepId(item, plan);
    return `<div class="emergency-step-panel" data-event-form="submit-steps" data-event-id="${esc(item.eventId)}">
      <div class="emergency-step-plan-name">关联预案：${esc(plan.name)}</div>
      <div class="emergency-step-list">${steps.map((step, index) => {
        const status = stepStatusOf(item, step.stepId);
        const isActive = step.stepId === activeId;
        const skipable = step.required === false;
        const actions = isActive
          ? `<button class="btn btn-primary btn-sm" type="button" data-step-complete="${esc(step.stepId)}">完成</button>${skipable ? `<button class="btn btn-secondary btn-sm" type="button" data-step-skip="${esc(step.stepId)}">跳过</button>` : ""}`
          : (status === "已完成" || status === "已跳过" ? `<span class="emergency-muted">${esc(status)}</span>` : "");
        return `<div class="emergency-step-card ${isActive ? "is-active" : ""}">
          <span class="emergency-step-index">${index + 1}</span>
          <div class="emergency-step-copy">
            <strong>${esc(step.name || `步骤${index + 1}`)}</strong>
            <small>步骤类型：${esc(step.type || "-")} · ${esc(status)}${skipable ? " · 可跳过" : " · 必须完成"}</small>
            <p>步骤内容：${esc(step.content || "-")}</p>
          </div>
          <div class="emergency-step-actions">${actions}</div>
        </div>`;
      }).join("")}</div>
    </div>`;
  }

  function openSubmit(item) {
    if (!item || item.status !== "处理中") { toast("当前状态不支持提交", "error"); return; }
    const plan = item.planId ? getPlan(item.planId) : null;
    const canSubmit = allStepsDone(item, plan);
    presentForm({
      title: "提交处理结果",
      wide: true,
      body: submitStepsHtml(item),
      footer: `<button class="btn btn-secondary" type="button" ${cancelActionAttr()}>取消</button>
        <button class="btn btn-primary" type="button" data-event-confirm-submit ${canSubmit ? "" : "disabled"} title="${canSubmit ? "" : "请先完成全部处置步骤"}">提交</button>`,
    });
  }

  function refreshSubmitDrawer(eventId) {
    const item = eventById(eventId);
    if (!item) return;
    openSubmit(item);
  }

  function openStepCompleteModal(eventId, stepId) {
    state.stepModalEventId = eventId;
    state.stepModalStepId = stepId;
    const item = eventById(eventId);
    const plan = item?.planId ? getPlan(item.planId) : null;
    const step = (plan?.steps || []).find((entry) => entry.stepId === stepId);
    const mask = document.createElement("div");
    mask.className = "emergency-center-mask";
    mask.innerHTML = `<div class="emergency-center-modal emergency-step-modal" role="dialog">
      <div class="emergency-center-head"><h3>完成步骤：${esc(step?.name || "")}</h3><button type="button" data-center-close>×</button></div>
      <div class="emergency-center-body">
        <form class="emergency-form-grid" data-step-complete-form>
          <label class="form-field full"><span class="form-label form-required">处理过程</span><textarea class="form-control textarea" data-step-field="process" rows="3" maxlength="500" placeholder="请输入处理过程"></textarea></label>
          <label class="form-field full"><span class="form-label form-required">处理结果说明</span><textarea class="form-control textarea" data-step-field="result" rows="3" maxlength="200" placeholder="请输入处理结果说明"></textarea></label>
          <div class="form-field full"><span class="form-label form-required">结果照片</span>
            <input class="form-control" type="file" accept=".jpg,.jpeg,.png,.gif,.webp,image/*" multiple data-step-photos>
            <div class="form-hint">请上传结果照片，最多 6 张，单张不超过 5MB</div>
          </div>
        </form>
      </div>
      <div class="emergency-center-foot">
        <button class="btn btn-secondary" type="button" data-center-close>取消</button>
        <button class="btn btn-primary" type="button" data-step-complete-save>确定</button>
      </div>
    </div>`;
    document.body.appendChild(mask);
  }

  async function saveStepComplete() {
    const item = eventById(state.stepModalEventId);
    const stepId = state.stepModalStepId;
    if (!item || !stepId) return;
    const process = document.querySelector('[data-step-field="process"]')?.value.trim() || "";
    const result = document.querySelector('[data-step-field="result"]')?.value.trim() || "";
    if (!process || !result) { toast("请填写处理过程和处理结果说明", "error"); return; }
    const photos = await readPhotosFromInput(document.querySelector("[data-step-photos]"));
    if (photos === null) return;
    if (!photos.length) { toast("请上传结果照片", "error"); return; }
    const plan = getPlan(item.planId);
    const step = (plan?.steps || []).find((entry) => entry.stepId === stepId);
    const stamp = nowText();
    const record = { stepId, status: "已完成", process, result, photos, operator: item.handler || "当前用户", at: stamp };
    const stepRecords = [...(item.stepRecords || []).filter((entry) => entry.stepId !== stepId), record];
    persist({ ...item, stepRecords }, {
      title: `完成步骤：${step?.name || stepId}`,
      message: `处理过程：${process}；处理结果：${result}`,
      operator: item.handler || "当前用户",
      photos,
    });
    document.querySelector(".emergency-center-mask:not([data-event-ops-modal])")?.remove();
    toast("步骤已完成");
    refreshSubmitDrawer(item.eventId);
    notifyChanged();
  }

  function skipStep(eventId, stepId) {
    const item = eventById(eventId);
    if (!item) return;
    const plan = getPlan(item.planId);
    const step = (plan?.steps || []).find((entry) => entry.stepId === stepId);
    if (step && step.required !== false) { toast("该步骤必须完成，不可跳过", "error"); return; }
    const stamp = nowText();
    const record = { stepId, status: "已跳过", process: "", result: "已跳过该步骤", photos: [], operator: item.handler || "当前用户", at: stamp };
    const stepRecords = [...(item.stepRecords || []).filter((entry) => entry.stepId !== stepId), record];
    persist({ ...item, stepRecords }, {
      title: `跳过步骤：${step?.name || stepId}`,
      message: "已跳过该步骤",
      operator: item.handler || "当前用户",
    });
    toast("已跳过");
    refreshSubmitDrawer(eventId);
    notifyChanged();
  }

  function confirmSubmit() {
    const form = document.querySelector('[data-event-form="submit-steps"]');
    if (!form) return;
    const item = eventById(form.dataset.eventId);
    if (!item || item.status !== "处理中") { toast("当前状态不支持提交", "error"); return; }
    const plan = item.planId ? getPlan(item.planId) : null;
    if (!allStepsDone(item, plan)) { toast("请先完成全部处置步骤", "error"); return; }
    persist({ ...item, status: "验收中" }, { title: "提交处理", message: "全部处置步骤已完成，提交验收", operator: item.handler || "当前用户" });
    closeCenterOpsModal();
    window.closeAppDrawer?.();
    toast("已提交，进入验收");
    notifyChanged();
  }

  function openAccept(item) {
    presentForm({
      title: "事件验收",
      body: `<form class="emergency-form-grid" data-event-form="accept" data-event-id="${esc(item.eventId)}">
        <div class="form-field full"><span class="form-label form-required">验收结果</span>
          <div class="emergency-radio-row">
            <label><input type="radio" name="event-accept-result" value="通过" checked> 通过</label>
            <label><input type="radio" name="event-accept-result" value="驳回"> 驳回</label>
          </div>
        </div>
        <label class="form-field full"><span class="form-label">验收意见</span><textarea class="form-control textarea" data-event-field="acceptNote" maxlength="200" rows="4" placeholder="请输入验收意见"></textarea></label>
      </form>`,
      footer: `<button class="btn btn-secondary" type="button" ${cancelActionAttr()}>取消</button><button class="btn btn-primary" type="button" data-event-confirm-accept>确认</button>`,
    });
  }

  function confirmAccept() {
    const form = document.querySelector('[data-event-form="accept"]');
    if (!form) return;
    const item = eventById(form.dataset.eventId);
    if (!item || item.status !== "验收中") { toast("当前状态不支持验收", "error"); return; }
    const result = form.querySelector('input[name="event-accept-result"]:checked')?.value || "通过";
    const note = form.querySelector('[data-event-field="acceptNote"]')?.value.trim() || "";
    if (result === "通过") {
      persist({ ...item, status: "已完成", finishedAt: nowText() }, { title: "验收通过", message: note || "验收合格，事件关闭" });
      toast("验收通过");
    } else {
      persist({ ...item, status: "待指派", handler: "", stepRecords: [] }, { title: "验收驳回", message: note || "验收驳回，重新指派" });
      toast("已驳回至待指派");
    }
    closeCenterOpsModal();
    window.closeAppDrawer?.();
    notifyChanged();
  }

  /* ---------- events ---------- */
  document.addEventListener("input", (event) => {
    if (event.target.matches("[data-person-dept-keyword]")) {
      state.picker.deptKeyword = event.target.value || "";
      renderPersonDeptTree();
    }
    if (event.target.matches("[data-plan-keyword]")) renderPlanDropdown(event.target.value || "");
  });

  document.addEventListener("click", async (event) => {
    const pageBtn = event.target.closest("#eventPagination [data-page-prev], #eventPagination [data-page-next]");
    if (pageBtn) {
      const root = document.getElementById("eventPagination");
      const pages = Number(root?.dataset.pages || 1);
      if (pageBtn.hasAttribute("data-page-prev") && state.page > 1) state.page -= 1;
      if (pageBtn.hasAttribute("data-page-next") && state.page < pages) state.page += 1;
      render();
      return;
    }

    if (event.target.closest("[data-event-ops-cancel]")) {
      closeCenterOpsModal();
      return;
    }
    if (event.target.closest("[data-center-close]")) {
      const opsModal = event.target.closest(".emergency-center-mask[data-event-ops-modal]");
      if (opsModal) { opsModal.remove(); return; }
      document.querySelector(".emergency-center-mask:not([data-event-ops-modal])")?.remove();
      return;
    }
    if (event.target.closest("[data-step-complete-save]")) { await saveStepComplete(); return; }

    const assocFilterSearch = event.target.closest("[data-assoc-filter-search]");
    if (assocFilterSearch) {
      const type = assocFilterSearch.dataset.assocFilterSearch;
      syncPickerDraft(type);
      refreshAssocPickerList(type);
      return;
    }
    const assocFilterReset = event.target.closest("[data-assoc-filter-reset]");
    if (assocFilterReset) {
      const type = assocFilterReset.dataset.assocFilterReset;
      syncPickerDraft(type);
      document.querySelectorAll(".emergency-center-mask [data-assoc-filter]").forEach((field) => { field.value = ""; });
      refreshAssocPickerList(type);
      return;
    }

    const assocConfirm = event.target.closest("[data-assoc-confirm]");
    if (assocConfirm) {
      const type = assocConfirm.dataset.assocConfirm;
      if (type === "person") {
        state.draft.relatedPersonIds = readPickerSelection("person");
      } else {
        const selected = [];
        let invalid = "";
        document.querySelectorAll(".emergency-center-mask [data-resource-check]:checked").forEach((input) => {
          const id = input.value;
          const resource = resourceList().find((item) => item.resourceId === id);
          const available = Number(resource?.available || 0);
          const qtyInput = document.querySelector(`.emergency-center-mask [data-resource-qty="${id}"]`);
          const quantity = Number(qtyInput?.value || 0);
          if (!Number.isInteger(quantity) || quantity < 1) invalid = `请为「${resource?.name || id}」填写有效所需数量`;
          else if (quantity > available) invalid = `「${resource?.name || id}」所需数量不能大于可用数量（${available}）`;
          else selected.push({ resourceId: id, quantity });
        });
        if (invalid) { toast(invalid, "error"); return; }
        state.draft.relatedResources = selected;
      }
      document.querySelector(".emergency-center-mask")?.remove();
      refreshCreateDrawer();
      return;
    }

    const personCheck = event.target.closest("[data-person-check]");
    if (personCheck) {
      syncPickerDraft("person");
      return;
    }

    const resourceCheck = event.target.closest("[data-resource-check]");
    if (resourceCheck) {
      const qty = document.querySelector(`.emergency-center-mask [data-resource-qty="${resourceCheck.value}"]`);
      if (qty) {
        qty.disabled = !resourceCheck.checked;
        if (resourceCheck.checked && (!qty.value || Number(qty.value) < 1)) qty.value = "1";
      }
      syncPickerDraft("resource");
      return;
    }

    if (event.target.closest("[data-person-close], [data-person-cancel]")) { closePersonPicker(); return; }
    if (event.target.closest("[data-person-confirm]")) {
      const person = woPersonnel().find((entry) => entry.id === state.picker.selectedId);
      if (state.picker.target) state.picker.target.value = person ? person.name : "";
      closePersonPicker();
      return;
    }
    if (event.target.closest("[data-person-clear], [data-person-remove]")) {
      state.picker.selectedId = "";
      renderPersonList();
      renderPersonSelected();
      return;
    }
    if (event.target.closest("[data-person-search]")) {
      state.picker.keyword = document.getElementById("personKeyword")?.value || "";
      renderPersonList();
      return;
    }
    if (event.target.closest("[data-person-reset]")) {
      const input = document.getElementById("personKeyword");
      if (input) input.value = "";
      state.picker.keyword = "";
      renderPersonList();
      return;
    }
    const deptToggle = event.target.closest("[data-person-dept-toggle]");
    if (deptToggle) {
      const id = deptToggle.dataset.personDeptToggle;
      if (state.picker.deptCollapsed.has(id)) state.picker.deptCollapsed.delete(id);
      else state.picker.deptCollapsed.add(id);
      renderPersonDeptTree();
      return;
    }
    const deptNode = event.target.closest("[data-person-dept]");
    if (deptNode && state.picker.open) {
      state.picker.deptId = deptNode.dataset.personDept || "";
      renderPersonDeptTree();
      renderPersonList();
      return;
    }
    const pick = event.target.closest("[data-person-pick]");
    if (pick) {
      state.picker.selectedId = pick.dataset.personPick;
      renderPersonList();
      renderPersonSelected();
      return;
    }

    const personTrigger = event.target.closest("[data-event-person-trigger]");
    if (personTrigger) { openPersonPicker(personTrigger); return; }

    const planPick = event.target.closest("[data-plan-pick]");
    if (planPick) {
      const plan = getPlan(planPick.dataset.planPick);
      state.draft.planId = plan?.planId || "";
      const keyword = document.querySelector("[data-plan-keyword]");
      const hidden = document.querySelector('[data-event-field="planId"]');
      if (keyword) keyword.value = plan?.name || "";
      if (hidden) hidden.value = plan?.planId || "";
      document.querySelector("[data-plan-dropdown]")?.classList.add("hidden");
      return;
    }

    if (event.target.closest("[data-event-assoc='person']")) { openAssocPicker("person"); return; }
    if (event.target.closest("[data-event-assoc='resource']")) { openAssocPicker("resource"); return; }
    const removePerson = event.target.closest("[data-remove-person]");
    if (removePerson) {
      state.draft.relatedPersonIds = state.draft.relatedPersonIds.filter((id) => id !== removePerson.dataset.removePerson);
      refreshCreateDrawer();
      return;
    }
    const removeResource = event.target.closest("[data-remove-resource]");
    if (removeResource) {
      state.draft.relatedResources = state.draft.relatedResources.filter((entry) => entry.resourceId !== removeResource.dataset.removeResource);
      refreshCreateDrawer();
      return;
    }

    if (event.target.closest("[data-create-next]")) {
      if (state.createStep === 1) {
        if (!(await collectBasicDraft())) return;
        state.createStep = 2;
      } else if (state.createStep === 2) {
        if (!collectResourceDraft()) return;
        state.createStep = 3;
      }
      refreshCreateDrawer();
      return;
    }
    if (event.target.closest("[data-create-prev]")) {
      if (state.createStep === 2) await collectBasicDraft().catch(() => false);
      if (state.createStep === 3) collectResourceDraft();
      state.createStep = Math.max(1, state.createStep - 1);
      refreshCreateDrawer();
      return;
    }

    if (event.target.closest("[data-event-point-select]")) {
      openEventPointPicker();
      return;
    }
    if (event.target.closest("[data-event-drawer-save]")) { await saveCreate(); return; }
    if (event.target.closest("[data-event-confirm-assign]")) { confirmAssign(); return; }
    if (event.target.closest("[data-event-confirm-close]")) { confirmClose(); return; }
    if (event.target.closest("[data-event-confirm-submit]")) { confirmSubmit(); return; }
    if (event.target.closest("[data-event-confirm-accept]")) { confirmAccept(); return; }

    const stepComplete = event.target.closest("[data-step-complete]");
    if (stepComplete) {
      const form = document.querySelector('[data-event-form="submit-steps"]');
      openStepCompleteModal(form?.dataset.eventId, stepComplete.dataset.stepComplete);
      return;
    }
    const stepSkip = event.target.closest("[data-step-skip]");
    if (stepSkip) {
      const form = document.querySelector('[data-event-form="submit-steps"]');
      skipStep(form?.dataset.eventId, stepSkip.dataset.stepSkip);
      return;
    }

    const tab = event.target.closest("[data-event-detail-tab]");
    if (tab) {
      if (isDispatchPage()) return;
      openDetail(eventById(tab.dataset.eventId), tab.dataset.eventDetailTab);
      return;
    }

    const action = event.target.closest("[data-event-action]");
    if (!action) {
      if (!event.target.closest(".emergency-more-menu") && !event.target.closest("[data-plan-search]")) {
        closeMoreMenu();
        document.querySelector("[data-plan-dropdown]")?.classList.add("hidden");
      }
      return;
    }
    const type = action.dataset.eventAction;
    const item = eventById(action.dataset.eventId);
    closeMoreMenu();
    if (type === "create") openCreate();
    if (type === "search") { state.page = 1; render(); }
    if (type === "reset") {
      document.querySelectorAll("[data-event-filter]").forEach((field) => { field.value = ""; });
      state.page = 1;
      render();
    }
    if (type === "detail" && item) openDetail(item);
    if (type === "more" && item) openMoreMenu(action, item);
    if (type === "dispatch" && item) goDispatch(item.eventId);
    if (type === "assign" && item) openAssign(item);
    if (type === "close" && item) openClose(item);
    if (type === "start" && item) startEvent(item);
    if (type === "submit" && item) openSubmit(item);
    if (type === "accept" && item) openAccept(item);
  });

  document.addEventListener("focusin", (event) => {
    if (event.target.matches("[data-plan-keyword]")) renderPlanDropdown(event.target.value || "");
  });

  window.EMERGENCY_EVENT_OPS = {
    detailBody,
    getEvent: eventById,
    list,
    onChanged: null,
  };

  if (document.getElementById("eventBody")) {
    renderTypeOptions();
    render();
    const queryEventId = new URLSearchParams(window.location.search).get("eventId");
    if (queryEventId) setTimeout(() => openDetail(eventById(queryEventId)), 0);
  }
})();
