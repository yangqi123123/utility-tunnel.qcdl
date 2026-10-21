(function () {
  const store = window.EMERGENCY_STORE;
  const ui = window.EMERGENCY_UI;
  const ops = window.EMERGENCY_EVENT_OPS;
  const planOps = window.EMERGENCY_PLAN_OPS;
  if (!store || !ui) return;

  const STATUS_FILTERS = ["全部", "待指派", "待处理", "处理中", "验收中", "已完成", "已关闭"];
  const PRIORITY_STATUS = new Set(["待指派", "待处理"]);
  const MAP_CENTER = [30.4680, 114.4240];
  const VIDEO_POSTER = "../../assets/images/corridor-monitor.jpg";

  const state = {
    eventId: new URLSearchParams(location.search).get("eventId") || "",
    eventKeyword: "",
    statusFilter: "全部",
    rightMode: "detail",
    detailTab: "info",
    planTab: "basic",
    planExpandedId: "",
    planTabs: {},
    resourceCategory: "all",
    personnelType: "all",
    resourceMapOn: true,
    personnelMapOn: true,
    layerVisibility: { personnel: true, resources: true, cameras: true },
    map: null,
  };

  // 原内嵌指挥调度面板 API（恢复内嵌功能时取消注释）
  // let commandPanelApi = null;

  const cameras = [
    { cameraId: "CAM-001", name: "综合舱 F0102", latitude: 30.4672, longitude: 114.4232, status: "在线", distance: "180m" },
    { cameraId: "CAM-002", name: "电力舱 F0103", latitude: 30.4688, longitude: 114.4255, status: "在线", distance: "46m" },
    { cameraId: "CAM-003", name: "水信舱 F0301", latitude: 30.4696, longitude: 114.4268, status: "在线", distance: "95m" },
    { cameraId: "CAM-004", name: "出入口 K1+280", latitude: 30.4660, longitude: 114.4220, status: "在线", distance: "210m" },
  ];

  function hasCoords(item) {
    if (item == null) return false;
    if (item.latitude === "" || item.longitude === "" || item.latitude == null || item.longitude == null) return false;
    const lat = Number(item.latitude);
    const lng = Number(item.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    if (Math.abs(lat) < 0.000001 && Math.abs(lng) < 0.000001) return false;
    return true;
  }

  function mappable(list) {
    return (list || []).filter(hasCoords);
  }

  const EVENT_COORDS = {
    "EVT-20261012-001": { latitude: 30.4680, longitude: 114.4240 },
    "EVT-20261012-002": { latitude: 30.4656, longitude: 114.4268 },
    "EVT-20261012-003": { latitude: 30.4702, longitude: 114.4212 },
    "EVT-20261012-004": { latitude: 30.4630, longitude: 114.4296 },
    "EVT-20261012-005": { latitude: 30.4668, longitude: 114.4275 },
    "EVT-20261012-006": { latitude: 30.4690, longitude: 114.4228 },
  };

  function esc(value) { return ui.escapeHtml(value); }

  function withCoords(event) {
    if (!event) return null;
    if (event.latitude && event.longitude) return event;
    const fallback = EVENT_COORDS[event.eventId] || { latitude: MAP_CENTER[0], longitude: MAP_CENTER[1] };
    return { ...event, ...fallback };
  }

  function allEvents() {
    const list = typeof ops?.list === "function" ? ops.list() : (store.listEvents?.() || []);
    return list.map(withCoords);
  }

  function currentEvent() {
    const fromOps = typeof ops?.getEvent === "function" ? ops.getEvent(state.eventId) : null;
    return withCoords(fromOps || store.getEvent?.(state.eventId) || null);
  }

  function ensureEvent() {
    let event = currentEvent();
    if (!event) {
      event = sortedEvents()[0] || null;
      if (event) state.eventId = event.eventId;
    }
    return event;
  }

  const PERSON_COORDS = {
    "P-001": { latitude: 30.4680, longitude: 114.4240 },
    "P-002": { latitude: 30.4656, longitude: 114.4268 },
    "P-003": { latitude: 30.4702, longitude: 114.4212 },
    "P-004": { latitude: 30.4630, longitude: 114.4296 },
  };
  const RESOURCE_COORDS = {
    "R-001": { latitude: 30.4680, longitude: 114.4240 },
    "R-002": { latitude: 30.4656, longitude: 114.4268 },
    "R-003": { latitude: 30.4630, longitude: 114.4296 },
    "R-004": { latitude: 30.4675, longitude: 114.4255 },
    "R-005": { latitude: 30.4692, longitude: 114.4235 },
  };

  function withEntityCoords(item, fallbackMap, idKey) {
    if (!item) return null;
    if (hasCoords(item)) return item;
    const fallback = fallbackMap[item[idKey]] || null;
    return fallback ? { ...item, ...fallback } : item;
  }

  function people() {
    return (store.listPersonnel?.() || []).map((item) => withEntityCoords(item, PERSON_COORDS, "personId"));
  }
  function resources() {
    return (store.listResources?.() || []).map((item) => withEntityCoords(item, RESOURCE_COORDS, "resourceId"));
  }
  function resourceCategories() { return store.listResourceCategories?.() || []; }
  function personnelCategories() { return store.listPersonnelCategories?.() || []; }

  function eventPlan(event) {
    if (!event) return null;
    return store.getPlan?.(event.planId) || store.matchPlans?.(event)?.[0] || null;
  }

  function matchedPlans(event) {
    if (!event) return [];
    if (typeof planOps?.matchByEventType === "function") return planOps.matchByEventType(event);
    return (store.matchPlans?.(event) || []).filter((plan) => plan.eventType === event.eventType);
  }

  function ensurePlanExpanded(plans) {
    if (!plans.length) {
      state.planExpandedId = "";
      return;
    }
    if (!plans.some((plan) => String(plan.planId) === String(state.planExpandedId))) {
      state.planExpandedId = plans[0].planId;
    }
  }

  function formatTime(value) {
    if (!value) return "-";
    return String(value).replace("T", " ").replace(/\.\d+Z?$/, "").slice(0, 19);
  }

  function statusRank(status) {
    if (PRIORITY_STATUS.has(status)) return 0;
    return 1;
  }

  function sortedEvents() {
    const keyword = state.eventKeyword.trim();
    return allEvents()
      .filter((item) => {
        if (state.statusFilter !== "全部" && item.status !== state.statusFilter) return false;
        if (!keyword) return true;
        const plan = eventPlan(item);
        const hay = [item.eventId, item.title, item.eventType, item.location, item.description, plan?.name].join(" ");
        return hay.includes(keyword);
      })
      .sort((a, b) => {
        const rank = statusRank(a.status) - statusRank(b.status);
        if (rank !== 0) return rank;
        return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
      });
  }

  function relatedResources(event) {
    const map = Object.fromEntries(resources().map((item) => [item.resourceId, item]));
    return (event?.relatedResources || []).map((entry) => {
      const item = map[entry.resourceId || entry];
      if (!item) return null;
      return { ...item, requiredQty: entry.quantity || 1 };
    }).filter(Boolean);
  }

  function relatedPeople(event) {
    const ids = new Set(event?.relatedPersonIds || []);
    return people().filter((item) => ids.has(item.personId));
  }

  function categoryIcon(kind, name) {
    if (name === "all" || name === "全部") return "fa-border-all";
    const list = kind === "resource" ? resourceCategories() : personnelCategories();
    const found = list.find((item) => item.name === name);
    return found?.icon || (kind === "resource" ? "fa-box" : "fa-user");
  }

  function dispatchActionsHtml(item) {
    if (!item) return "";
    const id = esc(item.eventId);
    if (item.status === "待指派") {
      return `<button class="btn btn-primary" type="button" data-event-action="assign" data-event-id="${id}">指派</button>
        <button class="btn btn-secondary" type="button" data-event-action="close" data-event-id="${id}">关闭</button>`;
    }
    if (item.status === "待处理") {
      return `<button class="btn btn-primary" type="button" data-event-action="start" data-event-id="${id}">开始</button>`;
    }
    if (item.status === "处理中") {
      return `<button class="btn btn-primary" type="button" data-event-action="submit" data-event-id="${id}">提交</button>`;
    }
    if (item.status === "验收中") {
      return `<button class="btn btn-primary" type="button" data-event-action="accept" data-event-id="${id}">验收</button>`;
    }
    return "";
  }

  function renderStatusFilter() {
    const target = document.getElementById("dispatchStatusFilter");
    if (!target) return;
    target.innerHTML = STATUS_FILTERS.map((status) => {
      const active = state.statusFilter === status ? "is-active" : "";
      return `<button type="button" class="ds-chip ${active}" data-status-filter="${esc(status)}">${esc(status)}</button>`;
    }).join("");
  }

  function layerPersonnelList() {
    const event = currentEvent();
    if (state.rightMode === "personnel") {
      if (!state.personnelMapOn) return [];
      const list = relatedPeople(event);
      return state.personnelType === "all" ? list : list.filter((item) => item.type === state.personnelType);
    }
    return people();
  }

  function layerResourceList() {
    const event = currentEvent();
    if (state.rightMode === "resources") {
      if (!state.resourceMapOn) return [];
      const list = relatedResources(event);
      return state.resourceCategory === "all" ? list : list.filter((item) => item.category === state.resourceCategory);
    }
    return resources();
  }

  function layerCameraList() {
    return cameras.filter((item) => item.status === "在线");
  }

  function renderLayerPanel() {
    const target = document.getElementById("dispatchLayerPanel");
    if (!target) return;
    const entries = [
      { key: "personnel", label: "人员", count: mappable(layerPersonnelList()).length, color: "primary" },
      { key: "resources", label: "物资", count: mappable(layerResourceList()).length, color: "success" },
      { key: "cameras", label: "视频", count: mappable(layerCameraList()).length, color: "purple" },
    ];
    target.innerHTML = `<div class="dispatch-panel-title"><strong>地图图层</strong></div>${entries.map((item) => `
      <label class="dispatch-layer-option">
        <input type="checkbox" data-dispatch-layer="${item.key}" ${state.layerVisibility[item.key] ? "checked" : ""}>
        <span class="dispatch-layer-dot ${item.color}"></span>
        <span>${item.label}</span>
        <em>${item.count}</em>
      </label>`).join("")}`;
  }

  function updateMapLayers() {
    if (!state.map) return;
    const event = currentEvent();
    const personnel = state.layerVisibility.personnel ? mappable(layerPersonnelList()) : [];
    const resourceItems = state.layerVisibility.resources ? mappable(layerResourceList()) : [];
    const cameraItems = state.layerVisibility.cameras ? mappable(layerCameraList()) : [];
    const eventItems = event && hasCoords(event) ? [event] : [];

    state.map.setLayers(
      { events: eventItems, personnel, resources: resourceItems, vehicles: [], cameras: cameraItems },
      {
        resource: (item) => openResourceDetail(item.resourceId),
        personnel: (item) => openPersonnelDetail(item.personId),
        camera: (item) => openVideoModal(item),
      },
    );
    renderLayerPanel();
  }

  function renderEventList() {
    const target = document.getElementById("dispatchEventList");
    if (!target) return;
    const list = sortedEvents();
    if (!list.length) {
      target.innerHTML = `<div class="dispatch-right-empty">暂无匹配事件</div>`;
      return;
    }
    target.innerHTML = list.map((item) => {
      const active = item.eventId === state.eventId ? "active" : "";
      const time = formatTime(item.updatedAt);
      const desc = item.description || "-";
      return `<button type="button" class="dispatch-event-card ${active}" data-dispatch-event-id="${esc(item.eventId)}">
        <div class="dispatch-event-card-top">
          <strong>${esc(time)}</strong>
          ${typeof ui.renderStatus === "function" ? ui.renderStatus(item.status) : `<span class="status-tag">${esc(item.status || "-")}</span>`}
        </div>
        <div class="dispatch-event-card-title">${esc(item.title || "-")}</div>
        <div class="dispatch-event-card-meta">
          <div>事件类型：<b>${esc(item.eventType || "-")}</b></div>
          <div>事件等级：<b>${esc(item.level || "-")}</b></div>
          <div class="dispatch-event-desc">事件描述：<b>${esc(desc)}</b></div>
        </div>
      </button>`;
    }).join("");
  }

  function renderModeBar() {
    const hasEvent = !!currentEvent();
    document.querySelectorAll("[data-right-mode]").forEach((btn) => {
      btn.disabled = !hasEvent;
      btn.classList.toggle("active", hasEvent && btn.dataset.rightMode === state.rightMode);
    });
  }

  function renderRightPanel() {
    const target = document.getElementById("dispatchRightPanel");
    if (!target) return;
    const event = currentEvent();
    if (!event) {
      target.innerHTML = `<div class="ds-right-inner"><div class="dispatch-right-empty">请先在左侧选择应急事件</div></div>`;
      return;
    }
    const map = {
      detail: renderRightDetail,
      video: renderRightVideo,
      resources: renderRightResources,
      personnel: renderRightPersonnel,
      // command: renderRightCommand, // 原内嵌指挥调度；现改为 SSO 跳转第三方语音调度平台
      plan: renderRightPlan,
    };
    (map[state.rightMode] || renderRightDetail)(target, event);
  }

  function renderRightDetail(target, event) {
    const body = typeof ops?.detailBody === "function"
      ? ops.detailBody(event, state.detailTab)
      : `<div class="dispatch-right-empty">事件详情组件未就绪</div>`;
    const actions = dispatchActionsHtml(event);
    target.innerHTML = `<div class="ds-right-inner">
      <div class="ds-right-head"><h3>应急事件详情</h3></div>
      <div class="ds-right-scroll dispatch-event-detail">${body}</div>
      ${actions ? `<div class="ds-right-foot">${actions}</div>` : ""}
    </div>`;
  }

  function renderRightVideo(target) {
    const live = new Date().toTimeString().slice(0, 8);
    target.innerHTML = `<div class="ds-right-inner">
      <div class="ds-right-head"><h3>视频监控</h3><button class="btn btn-secondary" type="button" data-dispatch-action="open-video"><i class="fa-solid fa-table-cells-large"></i> 全局监控</button></div>
      <div class="ds-right-scroll">
        <div class="dispatch-video-home-grid">${cameras.map((camera) => `
          <div class="dispatch-video-feed">
            <div class="dispatch-video-feed-title"><span>${esc(camera.name)}</span><b>${esc(camera.status)}</b></div>
            <div class="dispatch-video-feed-screen"><img src="${VIDEO_POSTER}" alt="${esc(camera.name)}"><span>LIVE · ${live}</span></div>
          </div>`).join("")}</div>
      </div>
    </div>`;
  }

  function typeCardsHtml(kind, types, selected, counts) {
    const allCount = Object.values(counts).reduce((sum, n) => sum + n, 0);
    const cards = [{ key: "all", label: "全部", count: allCount }, ...types.map((name) => ({ key: name, label: name, count: counts[name] || 0 }))];
    return `<div class="ds-type-grid">${cards.map((card) => {
      const active = selected === card.key ? "active" : "";
      const icon = categoryIcon(kind, card.key === "all" ? "全部" : card.key);
      return `<button type="button" class="ds-type-card ${active}" data-${kind}-type="${esc(card.key)}">
        <i class="fa-solid ${esc(icon)}" aria-hidden="true"></i>
        <span>${esc(card.label)}</span>
        <strong>${card.count}</strong>
      </button>`;
    }).join("")}</div>`;
  }

  function renderRightResources(target, event) {
    const list = relatedResources(event);
    const counts = {};
    list.forEach((item) => { counts[item.category || "其他"] = (counts[item.category || "其他"] || 0) + 1; });
    const types = Object.keys(counts);
    if (state.resourceCategory !== "all" && !types.includes(state.resourceCategory)) state.resourceCategory = "all";
    const filtered = state.resourceCategory === "all" ? list : list.filter((item) => item.category === state.resourceCategory);
    target.innerHTML = `<div class="ds-right-inner">
      <div class="ds-right-head"><h3>应急物资</h3></div>
      <div class="ds-right-scroll">
        ${typeCardsHtml("resource", types, state.resourceCategory, counts)}
        <div class="emergency-table-wrap ds-ops-wrap" style="margin-top:12px">
          <table class="emergency-table ds-ops-table">
            <thead><tr><th>物资名称</th><th>分类</th><th>规格</th><th>所在位置</th><th>所需数量</th><th class="ds-ops-col">操作</th></tr></thead>
            <tbody>${filtered.length ? filtered.map((item) => `<tr>
              <td>${esc(item.name)}</td>
              <td>${esc(item.category || "-")}</td>
              <td>${esc(item.model || "-")}</td>
              <td>${esc(item.location || item.warehouse || "-")}</td>
              <td>${esc(item.requiredQty)}${item.unit ? ` ${esc(item.unit)}` : ""}</td>
              <td class="ds-ops-col"><button class="table-action" type="button" data-locate-resource="${esc(item.resourceId)}">查看</button></td>
            </tr>`).join("") : `<tr><td colspan="6" class="empty-cell">暂无关联物资</td></tr>`}</tbody>
          </table>
        </div>
        ${!state.resourceMapOn ? `<p class="ds-map-hint">地图点位已隐藏，再次点击类型卡片可显示</p>` : ""}
      </div>
    </div>`;
  }

  function renderRightPersonnel(target, event) {
    const list = relatedPeople(event);
    const counts = {};
    list.forEach((item) => { counts[item.type || "其他"] = (counts[item.type || "其他"] || 0) + 1; });
    const types = Object.keys(counts);
    if (state.personnelType !== "all" && !types.includes(state.personnelType)) state.personnelType = "all";
    const filtered = state.personnelType === "all" ? list : list.filter((item) => item.type === state.personnelType);
    target.innerHTML = `<div class="ds-right-inner">
      <div class="ds-right-head"><h3>应急人员</h3></div>
      <div class="ds-right-scroll">
        ${typeCardsHtml("personnel", types, state.personnelType, counts)}
        <div class="emergency-table-wrap ds-ops-wrap" style="margin-top:12px">
          <table class="emergency-table ds-ops-table">
            <thead><tr><th>人员名称</th><th>分类</th><th>所属部门</th><th>联系方式</th><th class="ds-ops-col">操作</th></tr></thead>
            <tbody>${filtered.length ? filtered.map((item) => `<tr>
              <td>${esc(item.name)}</td>
              <td>${esc(item.type || "-")}</td>
              <td>${esc(item.unit || item.department || "-")}</td>
              <td>${esc(item.mobile || item.phone || "-")}</td>
              <td class="ds-ops-col"><button class="table-action" type="button" data-locate-person="${esc(item.personId)}">查看</button></td>
            </tr>`).join("") : `<tr><td colspan="5" class="empty-cell">暂无关联人员</td></tr>`}</tbody>
          </table>
        </div>
        ${!state.personnelMapOn ? `<p class="ds-map-hint">地图点位已隐藏，再次点击类型卡片可显示</p>` : ""}
      </div>
    </div>`;
  }

  /* 原内嵌「指挥调度」右侧面板（恢复时取消注释，并恢复 mode map / commandPanelApi / 面板脚本引用）
  function renderRightCommand(target) {
    target.innerHTML = `<div id="dispatchCommandHost"></div>`;
    const host = target.querySelector("#dispatchCommandHost");
    commandPanelApi?.destroy?.();
    commandPanelApi = window.mountCommandDispatchPanel?.(host, {
      getStore: () => store,
      getEventId: () => currentEvent()?.eventId || "",
      source: "指挥调度",
      onCall: ({ personIds }) => {
        const eventItem = currentEvent();
        if (eventItem) {
          store.appendTimeline?.(eventItem.eventId, {
            action: "电话呼叫",
            title: `${personIds.length} 名人员`,
            operator: "当前指挥员",
            time: ui.nowText(),
          });
        }
        updateMapLayers();
      },
      onConferenceChange: () => updateMapLayers(),
    });
  }
  */

  function renderRightPlan(target, event) {
    const plans = matchedPlans(event);
    ensurePlanExpanded(plans);
    const body = typeof planOps?.accordionListBody === "function"
      ? planOps.accordionListBody(plans, {
        expandedId: state.planExpandedId,
        tabOf: (planId) => state.planTabs[planId] || state.planTab || "basic",
        emptyText: "暂无与当前事件类型匹配的应急预案",
      })
      : `<div class="dispatch-right-empty">预案组件未就绪</div>`;
    target.innerHTML = `<div class="ds-right-inner">
      <div class="ds-right-head"><h3>应急预案详情</h3></div>
      <div class="ds-right-scroll dispatch-plan-detail">${body}</div>
    </div>`;
  }

  function openCenterDetail(title, pairs) {
    document.querySelector(".emergency-center-mask[data-dispatch-detail]")?.remove();
    const mask = document.createElement("div");
    mask.className = "emergency-center-mask";
    mask.dataset.dispatchDetail = "1";
    mask.innerHTML = `<div class="emergency-center-modal" role="dialog" aria-modal="true">
      <div class="emergency-center-head"><h3>${esc(title)}</h3><button type="button" data-dispatch-detail-close aria-label="关闭">×</button></div>
      <div class="emergency-center-body">
        <div class="emergency-detail-grid">${pairs.map(([label, value]) => `
          <div class="emergency-detail-item"><span class="emergency-detail-label">${esc(label)}</span><span class="emergency-detail-value">${value}</span></div>`).join("")}
        </div>
      </div>
      <div class="emergency-center-foot"><button class="btn btn-secondary" type="button" data-dispatch-detail-close>关闭</button></div>
    </div>`;
    document.body.appendChild(mask);
  }

  function openResourceDetail(id) {
    const item = resources().find((entry) => entry.resourceId === id);
    if (!item) return ui.showToast("未找到物资", "warning");
    const pairs = [
      ["物资编号", esc(item.resourceId)], ["分类", esc(item.category)], ["规格型号", esc(item.model || "-")],
      ["库存总量", esc(`${item.total} ${item.unit || "件"}`)], ["可用数量", esc(`${item.available} ${item.unit || "件"}`)],
      ["已占用数量", esc(`${item.occupied || 0} ${item.unit || "件"}`)],
      ["所在仓库", esc(item.warehouse || "-")], ["具体位置", esc(item.location || "-")], ["负责人", esc(item.owner || "-")],
      ["有效期", esc(item.expiryDate || item.expiry || "-")],
      ["状态", typeof ui.renderStatus === "function" ? ui.renderStatus(item.status) : esc(item.status || "-")],
      ["经度", item.longitude === "" || item.longitude == null ? "-" : Number(item.longitude).toFixed(6)],
      ["纬度", item.latitude === "" || item.latitude == null ? "-" : Number(item.latitude).toFixed(6)],
    ];
    openCenterDetail(`${item.name} · 物资详情`, pairs);
  }

  function openPersonnelDetail(id) {
    const item = people().find((entry) => entry.personId === id);
    if (!item) return ui.showToast("未找到人员", "warning");
    const tags = Array.isArray(item.specialties) ? item.specialties.join("、") : (item.tags || "-");
    const pairs = [
      ["人员编号", esc(item.personId)], ["所属部门", esc(item.unit || "-")], ["人员分类", esc(item.type || "-")],
      ["部门 / 岗位", esc(item.position || item.role || "-")], ["手机号", esc(item.mobile || "-")], ["座机 / 分机", esc(item.phone || "-")],
      ["当前状态", typeof ui.renderStatus === "function" ? ui.renderStatus(item.onlineStatus) : esc(item.onlineStatus || "-")],
      ["可调度状态", typeof ui.renderStatus === "function" ? ui.renderStatus(item.dispatchStatus) : esc(item.dispatchStatus || "-")],
      ["值班时间", esc(item.dutyTime || "-")], ["所在位置", esc(item.section || item.location || "-")],
      ["经度", item.longitude === "" || item.longitude == null ? "-" : Number(item.longitude).toFixed(6)],
      ["纬度", item.latitude === "" || item.latitude == null ? "-" : Number(item.latitude).toFixed(6)],
      ["专业标签", esc(tags || "-")], ["最近更新", esc(formatTime(item.updatedAt))],
    ];
    openCenterDetail(`${item.name} · 应急通讯录`, pairs);
  }

  function locateOnMap(item, label) {
    if (!hasCoords(item)) return ui.showToast(`${label || "目标"}暂无定位信息`, "warning");
    state.layerVisibility.personnel = true;
    state.layerVisibility.resources = true;
    updateMapLayers();
    state.map?.focusPoint?.(item, 17);
    ui.showToast(`已定位到${label || item.name || ""}`);
  }

  function openVideoModal(camera) {
    if (!camera) return;
    document.querySelector(".emergency-center-mask[data-dispatch-video]")?.remove();
    const live = new Date().toTimeString().slice(0, 8);
    const mask = document.createElement("div");
    mask.className = "emergency-center-mask";
    mask.dataset.dispatchVideo = "1";
    mask.innerHTML = `<div class="emergency-center-modal ds-video-modal" role="dialog" aria-modal="true">
      <div class="emergency-center-head"><h3>${esc(camera.name)} · 视频预览</h3><button type="button" data-dispatch-video-close aria-label="关闭">×</button></div>
      <div class="emergency-center-body ds-video-body">
        <div class="ds-video-screen">
          <img src="${VIDEO_POSTER}" alt="${esc(camera.name)}">
          <span class="ds-video-live">LIVE · ${live}</span>
          <span class="ds-video-status">${esc(camera.status || "在线")}</span>
        </div>
        <p class="ds-video-meta">摄像头编号：${esc(camera.cameraId)} · 距离事件约 ${esc(camera.distance || "-")}</p>
      </div>
      <div class="emergency-center-foot"><button class="btn btn-secondary" type="button" data-dispatch-video-close>关闭</button></div>
    </div>`;
    document.body.appendChild(mask);
  }

  function refreshAll() {
    ensureEvent();
    renderStatusFilter();
    renderEventList();
    renderModeBar();
    renderLayerPanel();
    renderRightPanel();
    updateMapLayers();
  }

  function initMap() {
    const target = document.getElementById("dispatchMap");
    state.map = window.EMERGENCY_MAP?.create(target, { center: MAP_CENTER, zoom: 15 });
    updateMapLayers();
    const event = currentEvent();
    if (event) state.map?.focusEvent(event);
  }

  function initCollapse() {
    const stage = document.getElementById("dispatchStage");
    if (!stage) return;
    stage.querySelectorAll("[data-ds-collapse]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const side = btn.dataset.dsCollapse;
        stage.classList.toggle(side === "left" ? "is-left-collapsed" : "is-right-collapsed");
        const collapsed = stage.classList.contains(side === "left" ? "is-left-collapsed" : "is-right-collapsed");
        btn.title = collapsed ? "展开面板" : "收起面板";
        btn.setAttribute("aria-label", collapsed ? `展开${side === "left" ? "左侧" : "右侧"}面板` : `收起${side === "left" ? "左侧" : "右侧"}面板`);
        setTimeout(() => state.map?.map?.invalidateSize?.(), 240);
      });
    });
  }

  if (ops) {
    ops.onChanged = () => {
      refreshAll();
    };
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-dispatch-detail-close]")) {
      document.querySelector(".emergency-center-mask[data-dispatch-detail]")?.remove();
      return;
    }
    if (event.target.closest("[data-dispatch-video-close]")) {
      document.querySelector(".emergency-center-mask[data-dispatch-video]")?.remove();
      return;
    }
    const statusBtn = event.target.closest("[data-status-filter]");
    if (statusBtn) {
      state.statusFilter = statusBtn.dataset.statusFilter || "全部";
      renderStatusFilter();
      renderEventList();
      return;
    }

    const detailTab = event.target.closest(".dispatch-event-detail [data-event-detail-tab]");
    if (detailTab) {
      state.detailTab = detailTab.dataset.eventDetailTab || "info";
      renderRightPanel();
      return;
    }

    const planToggle = event.target.closest(".dispatch-plan-detail [data-plan-accordion-toggle]");
    if (planToggle) {
      const id = planToggle.dataset.planAccordionToggle || "";
      // 手风琴：一次仅展开一条；点当前展开项则收起
      state.planExpandedId = String(state.planExpandedId) === String(id) ? "" : id;
      if (state.planExpandedId && !state.planTabs[state.planExpandedId]) state.planTabs[state.planExpandedId] = "basic";
      renderRightPanel();
      return;
    }

    const planTab = event.target.closest(".dispatch-plan-detail [data-plan-detail-tab]");
    if (planTab) {
      const planId = planTab.dataset.planId || state.planExpandedId;
      const tab = planTab.dataset.planDetailTab || "basic";
      state.planTab = tab;
      if (planId) state.planTabs[planId] = tab;
      renderRightPanel();
      return;
    }

    const modeBtn = event.target.closest("[data-right-mode]");
    if (modeBtn) {
      if (modeBtn.disabled) return ui.showToast("请先选择事件", "warning");
      state.rightMode = modeBtn.dataset.rightMode;
      if (state.rightMode === "resources") { state.resourceCategory = "all"; state.resourceMapOn = true; }
      if (state.rightMode === "personnel") { state.personnelType = "all"; state.personnelMapOn = true; }
      if (state.rightMode === "plan") {
        state.planTab = "basic";
        state.planExpandedId = "";
        state.planTabs = {};
      }
      renderModeBar();
      renderRightPanel();
      updateMapLayers();
      return;
    }

    const row = event.target.closest("[data-dispatch-event-id]");
    if (row) {
      state.eventId = row.dataset.dispatchEventId;
      state.rightMode = "detail";
      state.detailTab = "info";
      state.planTab = "basic";
      state.planExpandedId = "";
      state.planTabs = {};
      state.resourceCategory = "all";
      state.personnelType = "all";
      state.resourceMapOn = true;
      state.personnelMapOn = true;
      refreshAll();
      const focused = currentEvent();
      if (focused && hasCoords(focused)) {
        requestAnimationFrame(() => {
          state.map?.focusPoint?.(focused, 17);
          setTimeout(() => state.map?.focusPoint?.(focused, 17), 120);
        });
      } else {
        ui.showToast("当前事件暂无定位信息", "warning");
      }
      return;
    }

    const resourceType = event.target.closest("[data-resource-type]");
    if (resourceType) {
      const key = resourceType.dataset.resourceType;
      if (state.resourceCategory === key) {
        state.resourceMapOn = !state.resourceMapOn;
      } else {
        state.resourceCategory = key;
        state.resourceMapOn = true;
      }
      renderRightPanel();
      updateMapLayers();
      return;
    }

    const personnelType = event.target.closest("[data-personnel-type]");
    if (personnelType) {
      const key = personnelType.dataset.personnelType;
      if (state.personnelType === key) {
        state.personnelMapOn = !state.personnelMapOn;
      } else {
        state.personnelType = key;
        state.personnelMapOn = true;
      }
      renderRightPanel();
      updateMapLayers();
      return;
    }

    const locateResource = event.target.closest("[data-locate-resource]");
    if (locateResource) {
      const item = resources().find((entry) => entry.resourceId === locateResource.dataset.locateResource);
      if (item) {
        state.layerVisibility.resources = true;
        state.resourceMapOn = true;
        locateOnMap(item, item.name);
      }
      return;
    }

    const locatePerson = event.target.closest("[data-locate-person]");
    if (locatePerson) {
      const item = people().find((entry) => entry.personId === locatePerson.dataset.locatePerson);
      if (item) {
        state.layerVisibility.personnel = true;
        state.personnelMapOn = true;
        locateOnMap(item, item.name);
      }
      return;
    }

    const action = event.target.closest("[data-dispatch-action]")?.dataset.dispatchAction;
    if (!action) return;

    if (action === "zoom-in") { state.map?.zoomIn(); return; }
    if (action === "zoom-out") { state.map?.zoomOut(); return; }
    if (action === "zoom-reset") { state.map?.resetView(); return; }
    if (action === "toggle-fullscreen") { document.querySelector(".ds-root")?.classList.toggle("is-fullscreen"); setTimeout(() => state.map?.map?.invalidateSize?.(), 200); return; }
    if (action === "open-video") { window.open("../monitoring/video-monitor.html?eventId=" + encodeURIComponent(state.eventId || ""), "_blank"); return; }
    if (action === "open-voice-dispatch") {
      const url = "voice-dispatch.html" + (state.eventId ? `?eventId=${encodeURIComponent(state.eventId)}` : "");
      window.open(url, "_blank");
      return;
    }
  });

  document.addEventListener("change", (event) => {
    if (event.target.matches("[data-dispatch-layer]")) {
      state.layerVisibility[event.target.dataset.dispatchLayer] = event.target.checked;
      updateMapLayers();
    }
  });

  document.addEventListener("input", (event) => {
    if (event.target.id === "dispatchEventKeyword") {
      state.eventKeyword = event.target.value || "";
      renderEventList();
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    ensureEvent();
    initCollapse();
    renderStatusFilter();
    renderEventList();
    renderModeBar();
    renderLayerPanel();
    initMap();
    renderRightPanel();
  });
})();
