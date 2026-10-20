(function () {
  const MOCK_TODAY = "2026-10-14";
  const MAP_CENTER = [30.4680, 114.4240];
  const VIDEO_POSTER = "../../assets/images/corridor-monitor.jpg";
  const STATUS_FILTERS = ["全部", "待指派", "待处理", "处理中", "验收中", "已完成", "已关闭"];
  const PRIORITY_STATUS = new Set(["待指派", "待处理"]);
  const EVENT_COORDS = {
    "EVT-20261012-001": { latitude: 30.4680, longitude: 114.4240 },
    "EVT-20261012-002": { latitude: 30.4656, longitude: 114.4268 },
    "EVT-20261012-003": { latitude: 30.4702, longitude: 114.4212 },
    "EVT-20261012-004": { latitude: 30.4630, longitude: 114.4296 },
    "EVT-20261012-005": { latitude: 30.4668, longitude: 114.4275 },
    "EVT-20261012-006": { latitude: 30.4690, longitude: 114.4228 },
  };

  const $ = (id) => document.getElementById(id);
  const emergency = () => window.EMERGENCY_STORE;
  const ui = () => window.EMERGENCY_UI;
  const comm = () => window.COMMUNICATION_STORE;
  const eventOps = () => window.EMERGENCY_EVENT_OPS;
  const planOps = () => window.EMERGENCY_PLAN_OPS;

  const VIDEO_CAMERAS = [
    { cameraId: "CAM-001", name: "综合舱 F0102", latitude: 30.4672, longitude: 114.4232, status: "在线", distance: "180m", kind: "video" },
    { cameraId: "CAM-002", name: "电力舱 F0103", latitude: 30.4688, longitude: 114.4255, status: "在线", distance: "46m", kind: "video" },
    { cameraId: "CAM-003", name: "水信舱 F0301", latitude: 30.4696, longitude: 114.4268, status: "在线", distance: "95m", kind: "video" },
    { cameraId: "CAM-004", name: "出入口 K1+280", latitude: 30.4660, longitude: 114.4220, status: "在线", distance: "210m", kind: "video" },
  ];

  const state = {
    eventId: new URLSearchParams(location.search).get("eventId") || "",
    eventKeyword: "",
    statusFilter: "全部",
    activeMode: "",
    planTab: "basic",
    resourceCategory: "all",
    personnelType: "all",
  };

  let mapApi = null;
  let deviceLayer = null;
  // 原语音对讲 / 内嵌指挥调度面板 API（恢复时取消注释）
  // let panelApi = null;
  let isFullscreen = false;
  let recordPage = 1;
  const RECORD_PAGE_SIZE = 10;

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]
    ));
  }

  function personName(id, fallback) {
    return emergency()?.getPerson?.(id)?.name || fallback || id || "-";
  }

  function callTime(item) {
    return item.startedAt || item.createdAt || item.connectedAt || "-";
  }

  function formatTime(value) {
    if (!value) return "-";
    return String(value).replace("T", " ").replace(/\.\d+Z?$/, "").slice(0, 19);
  }

  function formatCoord(value) {
    if (value === "" || value == null) return "-";
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(6) : "-";
  }

  function pct(num, den) {
    if (!den) return "—";
    return `${Math.round((num / den) * 100)}%`;
  }

  function hasCoords(item) {
    if (item == null) return false;
    const lat = Number(item.latitude ?? item.lat);
    const lng = Number(item.longitude ?? item.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    if (Math.abs(lat) < 0.000001 && Math.abs(lng) < 0.000001) return false;
    return true;
  }

  function mappable(list) {
    return (list || []).filter(hasCoords);
  }

  function statusHtml(value) {
    if (typeof ui()?.renderStatus === "function") return ui().renderStatus(value);
    return escapeHtml(value || "-");
  }

  function withCoords(event) {
    if (!event) return null;
    if (hasCoords(event)) return event;
    const fallback = EVENT_COORDS[event.eventId] || { latitude: MAP_CENTER[0], longitude: MAP_CENTER[1] };
    return { ...event, ...fallback };
  }

  function allEvents() {
    const list = typeof eventOps()?.list === "function"
      ? eventOps().list()
      : (emergency()?.listEvents?.() || []);
    return list.map(withCoords);
  }

  function currentEvent() {
    const fromOps = typeof eventOps()?.getEvent === "function" ? eventOps().getEvent(state.eventId) : null;
    return withCoords(fromOps || emergency()?.getEvent?.(state.eventId) || null);
  }

  function eventPlan(event) {
    if (!event) return null;
    return emergency()?.getPlan?.(event.planId) || emergency()?.matchPlans?.(event)?.[0] || null;
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
        const rankA = PRIORITY_STATUS.has(a.status) ? 0 : 1;
        const rankB = PRIORITY_STATUS.has(b.status) ? 0 : 1;
        if (rankA !== rankB) return rankA - rankB;
        return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
      });
  }

  function relatedResources(event) {
    const map = Object.fromEntries((emergency()?.listResources?.() || []).map((item) => [item.resourceId, item]));
    return (event?.relatedResources || []).map((entry) => {
      const item = map[entry.resourceId || entry];
      if (!item) return null;
      return { ...item, requiredQty: entry.quantity || 1 };
    }).filter(Boolean);
  }

  function relatedPeople(event) {
    const ids = new Set(event?.relatedPersonIds || []);
    return (emergency()?.listPersonnel?.() || []).filter((item) => ids.has(item.personId));
  }

  function resourceCategories() {
    return emergency()?.listResourceCategories?.() || [];
  }

  function personnelCategories() {
    return emergency()?.listPersonnelCategories?.() || [];
  }

  function categoryIcon(kind, name) {
    if (name === "all" || name === "全部") return "fa-border-all";
    const list = kind === "resource" ? resourceCategories() : personnelCategories();
    const found = list.find((item) => item.name === name);
    return found?.icon || (kind === "resource" ? "fa-box" : "fa-user");
  }

  function typeCardsHtml(kind, types, selected, counts) {
    const allCount = Object.values(counts).reduce((sum, n) => sum + n, 0);
    const cards = [{ key: "all", label: "全部", count: allCount }, ...types.map((name) => ({ key: name, label: name, count: counts[name] || 0 }))];
    return `<div class="ds-type-grid">${cards.map((card) => {
      const active = selected === card.key ? "active" : "";
      const icon = categoryIcon(kind, card.key === "all" ? "全部" : card.key);
      return `<button type="button" class="ds-type-card ${active}" data-${kind}-type="${escapeHtml(card.key)}">
        <i class="fa-solid ${escapeHtml(icon)}" aria-hidden="true"></i>
        <span>${escapeHtml(card.label)}</span>
        <strong>${card.count}</strong>
      </button>`;
    }).join("")}</div>`;
  }

  /* 顶部 4 个统计指标已按需求移除
  function renderKpis() {
    const calls = (emergency()?.listCalls?.() || []).filter((c) => String(callTime(c)).startsWith(MOCK_TODAY));
    const connected = calls.filter((c) => c.result === "已接通").length;
    const ds = comm()?.deviceStats?.() || { total: 0, online: 0, offline: 0, fault: 0 };
    if ($("statTodayCalls")) $("statTodayCalls").textContent = String(calls.length);
    if ($("statConnected")) $("statConnected").textContent = String(connected);
    if ($("statConnectRate")) $("statConnectRate").textContent = pct(connected, calls.length);
    if ($("statOnline")) $("statOnline").textContent = String(ds.online || 0);
    if ($("statOnlineRate")) $("statOnlineRate").textContent = pct(ds.online || 0, ds.total || 0);
    if ($("statFault")) $("statFault").textContent = String((ds.offline || 0) + (ds.fault || 0));
  }
  */

  function sortedCalls() {
    return (emergency()?.listCalls?.() || [])
      .slice()
      .sort((a, b) => String(callTime(b)).localeCompare(String(callTime(a))));
  }

  function renderRecentCalls() {
    const calls = sortedCalls();
    const pages = Math.max(1, Math.ceil(calls.length / RECORD_PAGE_SIZE));
    recordPage = Math.min(Math.max(1, recordPage), pages);
    const start = (recordPage - 1) * RECORD_PAGE_SIZE;
    const rows = calls.slice(start, start + RECORD_PAGE_SIZE);
    if (!$("recordBody")) return;
    $("recordBody").innerHTML = rows.length
      ? rows.map((record) => {
        const eventCell = record.eventId
          ? `<button class="table-action" type="button" data-record-event="${escapeHtml(record.eventId)}">${escapeHtml(record.eventId)}</button>`
          : escapeHtml("未关联");
        return `<tr>
          <td>${escapeHtml(callTime(record))}</td>
          <td>${eventCell}</td>
          <td>${escapeHtml(record.callerName || personName(record.callerId))}</td>
          <td>${escapeHtml((record.calleeNames || []).join("、") || (record.calleeIds || []).map((id) => personName(id)).join("、") || "-")}</td>
          <td>${escapeHtml(record.type || "-")}</td>
          <td>${statusHtml(record.result || "-")}</td>
          <td>${Number(record.durationSeconds || 0)}s</td>
          <td class="device-actions"><button class="table-action" type="button" data-record-detail="${escapeHtml(record.callId)}">详情</button></td>
        </tr>`;
      }).join("")
      : `<tr><td colspan="8"><div class="communication-empty">暂无通话记录</div></td></tr>`;
    if ($("recordPager")) {
      $("recordPager").innerHTML = typeof ui()?.renderPagination === "function"
        ? ui().renderPagination({ total: calls.length, page: recordPage, pageSize: RECORD_PAGE_SIZE, id: "deskCallPagination" })
        : `<span>共 ${calls.length} 条记录，每页 ${RECORD_PAGE_SIZE} 条</span><span class="page-item active">${recordPage}</span>`;
    }
  }

  function openDrawerDetail(title, body, footer) {
    const closeBtn = '<button class="btn btn-secondary" type="button" data-drawer-close>关闭</button>';
    if (typeof ui()?.openEntityDrawer === "function") {
      ui().openEntityDrawer({ title, body, footer: footer || closeBtn });
      return;
    }
    window.openAppDrawer?.({ title, body, footer: footer || closeBtn });
  }

  function pairsToDetailGrid(pairs) {
    return `<div class="emergency-detail-grid">${pairs.map(([label, value]) => `
      <div class="emergency-detail-item"><span class="emergency-detail-label">${escapeHtml(label)}</span><span class="emergency-detail-value">${value}</span></div>`).join("")}
    </div>`;
  }

  function openCenterDetail(title, pairs) {
    document.querySelector(".emergency-center-mask[data-desk-detail]")?.remove();
    const mask = document.createElement("div");
    mask.className = "emergency-center-mask";
    mask.dataset.deskDetail = "1";
    mask.innerHTML = `<div class="emergency-center-modal" role="dialog" aria-modal="true">
      <div class="emergency-center-head"><h3>${escapeHtml(title)}</h3><button type="button" data-desk-detail-close aria-label="关闭">×</button></div>
      <div class="emergency-center-body">
        <div class="emergency-detail-grid">${pairs.map(([label, value]) => `
          <div class="emergency-detail-item"><span class="emergency-detail-label">${escapeHtml(label)}</span><span class="emergency-detail-value">${value}</span></div>`).join("")}
        </div>
      </div>
      <div class="emergency-center-foot"><button class="btn btn-secondary" type="button" data-desk-detail-close>关闭</button></div>
    </div>`;
    document.body.appendChild(mask);
  }

  function locateOnMap(item, label) {
    if (!hasCoords(item)) return ui()?.showToast?.(`${label || "目标"}暂无定位信息`, "warning");
    mapApi?.focusPoint?.(item, 17);
    ui()?.showToast?.(`已定位到${label || item.name || ""}`);
  }

  function openPersonnelDetail(id) {
    const item = (emergency()?.listPersonnel?.() || []).find((entry) => entry.personId === id);
    if (!item) return ui()?.showToast?.("未找到人员", "warning");
    const tags = Array.isArray(item.specialties) ? item.specialties.join("、") : (item.tags || "-");
    const pairs = [
      ["人员编号", escapeHtml(item.personId)], ["所属部门", escapeHtml(item.unit || "-")], ["人员分类", escapeHtml(item.type || "-")],
      ["部门 / 岗位", escapeHtml(item.position || item.role || "-")], ["手机号", escapeHtml(item.mobile || "-")], ["座机 / 分机", escapeHtml(item.phone || "-")],
      ["当前状态", statusHtml(item.onlineStatus)], ["可调度状态", statusHtml(item.dispatchStatus)],
      ["值班时间", escapeHtml(item.dutyTime || "-")], ["所在位置", escapeHtml(item.section || item.location || "-")],
      ["经度", formatCoord(item.longitude)], ["纬度", formatCoord(item.latitude)],
      ["专业标签", escapeHtml(tags || "-")], ["最近更新", escapeHtml(formatTime(item.updatedAt))],
    ];
    openCenterDetail(`${item.name} · 应急通讯录`, pairs);
  }

  function openResourceDetail(id) {
    const item = (emergency()?.listResources?.() || []).find((entry) => entry.resourceId === id);
    if (!item) return ui()?.showToast?.("未找到物资", "warning");
    const unit = item.unit || "件";
    const pairs = [
      ["物资编号", escapeHtml(item.resourceId)], ["分类", escapeHtml(item.category)], ["规格型号", escapeHtml(item.model || "-")],
      ["库存总量", escapeHtml(`${item.total} ${unit}`)], ["可用数量", escapeHtml(`${item.available} ${unit}`)],
      ["已占用数量", escapeHtml(`${item.occupied || 0} ${unit}`)],
      ["所在仓库", escapeHtml(item.warehouse || "-")], ["具体位置", escapeHtml(item.location || "-")], ["负责人", escapeHtml(item.owner || "-")],
      ["有效期", escapeHtml(item.expiryDate || item.expiry || "-")],
      ["状态", statusHtml(item.status)],
      ["经度", formatCoord(item.longitude)],
      ["纬度", formatCoord(item.latitude)],
    ];
    openCenterDetail(`${item.name} · 物资详情`, pairs);
  }

  function openVideoModal(camera) {
    if (!camera) return;
    const live = new Date().toTimeString().slice(0, 8);
    const body = `<div class="communication-desk-video-body ds-video-body">
      <div class="ds-video-screen">
        <img src="${VIDEO_POSTER}" alt="${escapeHtml(camera.name)}">
        <span class="ds-video-live">LIVE · ${live}</span>
        <span class="ds-video-status">${escapeHtml(camera.status || "在线")}</span>
      </div>
      <p class="ds-video-meta">摄像头编号：${escapeHtml(camera.cameraId)}</p>
    </div>`;
    openDrawerDetail(`${camera.name} · 视频预览`, body);
  }

  function enrichCommDevice(device, index = 0) {
    return {
      id: device.deviceId,
      system: "通信系统",
      type: device.type || "通信设备",
      project: "光谷科学岛综合管廊一期",
      corridor: device.corridor || "-",
      room: device.cabin || "-",
      section: device.section || "-",
      pipeline: "通信光缆管线",
      brand: device.brand || "-",
      model: device.model || device.type || "-",
      name: device.name,
      code: device.code || device.deviceId,
      location: device.locationText || "-",
      vendor: device.vendor || "-",
      supplierPhone: "400-800-0000",
      manufacturer: device.manufacturer || "-",
      manufactureDate: "2026-06-20",
      deliveryDate: "2026-07-05",
      installDate: "2026-07-11",
      acceptDate: "2026-07-10",
      scrapDate: "",
      factoryCode: `FC-${device.deviceId}`,
      cadCode: `CAD-${device.deviceId}`,
      sourceModule: "通信系统",
      service: "通信接入、语音调度与广播联动服务",
      remark: device.remark || "暂无备注",
      smart: "是",
      thirdPartyCode: `THIRD-${String(index + 1).padStart(4, "0")}`,
      coordinate: `${device.lon ?? "-"}, ${device.lat ?? "-"}`,
      createdAt: "2026-07-11 14:01:25",
      ...device,
    };
  }

  function openCommDeviceDetail(deviceId) {
    const raw = (comm()?.listDevices?.() || []).find((d) => d.deviceId === deviceId);
    if (!raw) return ui()?.showToast?.("未找到设备", "warning");
    const device = enrichCommDevice(raw);
    const fields = [
      ["所属系统", device.system], ["设备分类", device.type],
      ["所属项目", device.project], ["所属管廊", device.corridor],
      ["所属舱室", device.room], ["所属区段", device.section],
      ["所属管线", device.pipeline], ["设备品牌", device.brand],
      ["设备型号", device.model], ["设备名称", device.name],
      ["设备编码", device.code], ["安装位置", device.location],
      ["供应商", device.vendor], ["供应商联系方式", device.supplierPhone || "-"],
      ["生产厂家", device.manufacturer || "-"], ["出厂日期", device.manufactureDate],
      ["到货日期", device.deliveryDate], ["安装日期", device.installDate],
      ["验收日期", device.acceptDate], ["报废日期", device.scrapDate || "-"],
      ["厂家编码", device.factoryCode], ["CAD编码", device.cadCode],
      ["来源模块", device.sourceModule], ["服务范围", device.service],
      ["备注", device.remark], ["是否智能化", device.smart],
      ["第三方编码", device.thirdPartyCode], ["设备坐标", device.coordinate],
      ["创建时间", device.createdAt],
    ];
    const body = `<div class="communication-desk-device-detail"><div class="detail-grid">
      ${fields.map(([label, value]) => `<div class="info-item"><span class="info-label">${escapeHtml(label)}</span><span class="info-value">${escapeHtml(value) || "-"}</span></div>`).join("")}
    </div></div>`;
    openDrawerDetail("设备详情", body);
  }

  function dispatchActionsHtml(item) {
    if (!item) return "";
    const id = escapeHtml(item.eventId);
    if (item.status === "待指派") {
      return `<button class="btn btn-primary" type="button" data-event-action="assign" data-event-id="${id}">指派</button>
        <button class="btn btn-secondary" type="button" data-event-action="close" data-event-id="${id}">关闭</button>`;
    }
    if (item.status === "待处理") {
      return `<button class="btn btn-primary" type="button" data-event-action="start" data-event-id="${id}">开始</button>
        <button class="btn btn-secondary" type="button" data-drawer-close>关闭</button>`;
    }
    if (item.status === "处理中") {
      return `<button class="btn btn-primary" type="button" data-event-action="submit" data-event-id="${id}">提交</button>
        <button class="btn btn-secondary" type="button" data-drawer-close>关闭</button>`;
    }
    if (item.status === "验收中") {
      return `<button class="btn btn-primary" type="button" data-event-action="accept" data-event-id="${id}">验收</button>
        <button class="btn btn-secondary" type="button" data-drawer-close>关闭</button>`;
    }
    return `<button class="btn btn-secondary" type="button" data-drawer-close>关闭</button>`;
  }

  function openEventDetail(eventId, tab = "info") {
    const item = withCoords(emergency()?.getEvent?.(eventId) || eventOps()?.getEvent?.(eventId));
    if (!item) return ui()?.showToast?.("未找到事件", "warning");
    const body = typeof eventOps()?.detailBody === "function"
      ? eventOps().detailBody(item, tab)
      : `<div class="emergency-empty">事件详情组件未就绪</div>`;
    openDrawerDetail("应急事件详情", `<div class="dispatch-event-detail">${body}</div>`, dispatchActionsHtml(item));
  }

  function openRecordDetail(callId) {
    const item = (emergency()?.listCalls?.() || []).find((record) => record.callId === callId);
    if (!item) return;
    const pairs = [
      ["通话类型", item.type || "-"],
      ["通话结果", item.result || "-"],
      ["主叫人", item.callerName || personName(item.callerId)],
      ["被叫人", (item.calleeNames || []).join("、") || (item.calleeIds || []).map(personName).join("、") || "-"],
      ["发起来源", item.source || "-"],
      ["通话时间", callTime(item)],
      ["通话时长", `${Number(item.durationSeconds || 0)}s`],
      ["关联事件", item.eventId || "未关联事件"],
    ];
    const eventValue = item.eventId
      ? `<button class="table-action" type="button" data-record-event="${escapeHtml(item.eventId)}">${escapeHtml(item.eventId)}</button>`
      : escapeHtml("未关联事件");
    openDrawerDetail(
      "通话详情",
      `<div class="emergency-detail-grid">${pairs.map(([label, value]) => {
        let display = escapeHtml(value);
        if (label === "通话结果") display = statusHtml(value);
        if (label === "关联事件") display = eventValue;
        return `<div class="emergency-detail-item"><span class="emergency-detail-label">${escapeHtml(label)}</span><span class="emergency-detail-value">${display}</span></div>`;
      }).join("")}</div>
        <div class="emergency-subsection"><h3 class="emergency-subsection-title">录音</h3>
          <div class="call-recording-mock">
            <button class="icon-btn" type="button" aria-label="播放录音"><i class="fa-solid fa-play"></i></button>
            <span>录音文件 Mock · ${Number(item.durationSeconds || 0)}s</span>
            <div class="call-recording-progress"><span style="width:36%"></span></div>
          </div>
        </div>`,
    );
  }

  function deviceMarkerIcon() {
    return window.L.divIcon({
      className: "emergency-map-marker",
      html: `<span style="--marker-color:#0EA5E9">通</span>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  }

  function rebuildLayers() {
    if (!mapApi?.map || !window.L) return;

    const showDevices = $("layerDevices")?.checked !== false;
    const showPersonnel = $("layerPersonnel")?.checked !== false;
    const showResources = $("layerResources")?.checked !== false;
    const showVideo = $("layerVideo")?.checked !== false;
    const showEvents = $("layerEvents")?.checked !== false;

    const selected = currentEvent();
    const personnel = showPersonnel ? mappable(emergency()?.listPersonnel?.() || []) : [];
    const resources = showResources ? mappable(emergency()?.listResources?.() || []) : [];
    const events = showEvents
      ? (selected && hasCoords(selected) ? [selected] : mappable(allEvents()))
      : [];
    const cameras = showVideo ? mappable(VIDEO_CAMERAS) : [];

    mapApi.setLayers?.(
      { events, personnel, resources, vehicles: [], cameras },
      {
        event: (item) => openEventDetail(item.eventId),
        personnel: (item) => openPersonnelDetail(item.personId),
        resource: (item) => openResourceDetail(item.resourceId),
        camera: (item) => openVideoModal(item),
      },
    );

    if (deviceLayer) {
      try { mapApi.map.removeLayer(deviceLayer); } catch { /* ignore */ }
    }
    deviceLayer = window.L.layerGroup();
    if (showDevices) {
      (comm()?.listDevices?.() || []).forEach((device, index) => {
        if (!hasCoords({ latitude: device.lat, longitude: device.lon })) return;
        const marker = window.L.marker([Number(device.lat), Number(device.lon)], { icon: deviceMarkerIcon() });
        if (window.BASE_MAP) window.BASE_MAP.bindTip(marker, device.name);
        marker.on("click", () => openCommDeviceDetail(device.deviceId || index));
        marker.addTo(deviceLayer);
      });
      deviceLayer.addTo(mapApi.map);
    }
  }

  function focusSelectedEvent() {
    const event = currentEvent();
    if (!event) return;
    if (!hasCoords(event)) {
      ui()?.showToast?.("当前事件暂无定位信息", "warning");
      return;
    }
    requestAnimationFrame(() => {
      mapApi?.focusPoint?.(event, 17);
      setTimeout(() => mapApi?.focusPoint?.(event, 17), 120);
    });
  }

  function selectEvent(eventId, { focus = true, openDetail = true } = {}) {
    state.eventId = eventId || "";
    state.activeMode = "";
    state.resourceCategory = "all";
    state.personnelType = "all";
    renderEventList();
    renderModeBar();
    rebuildLayers();
    if (focus) focusSelectedEvent();
    if (openDetail && state.eventId) openEventDetail(state.eventId);
  }

  function renderStatusFilter() {
    const target = $("deskStatusFilter");
    if (!target) return;
    target.innerHTML = STATUS_FILTERS.map((status) => `
      <button type="button" class="ds-chip ${state.statusFilter === status ? "is-active" : ""}" data-desk-status="${escapeHtml(status)}">${escapeHtml(status)}</button>
    `).join("");
  }

  function renderEventList() {
    const target = $("deskEventList");
    if (!target) return;
    const list = sortedEvents();
    if (!list.length) {
      target.innerHTML = `<div class="dispatch-right-empty">暂无匹配事件</div>`;
      return;
    }
    if (!state.eventId || !list.some((item) => item.eventId === state.eventId)) {
      state.eventId = list[0].eventId;
    }
    target.innerHTML = list.map((item) => {
      const active = item.eventId === state.eventId ? "active" : "";
      const time = formatTime(item.updatedAt);
      const desc = item.description || "-";
      return `<button type="button" class="dispatch-event-card ${active}" data-desk-event-id="${escapeHtml(item.eventId)}">
        <div class="dispatch-event-card-top">
          <strong>${escapeHtml(time)}</strong>
          ${statusHtml(item.status)}
        </div>
        <div class="dispatch-event-card-title">${escapeHtml(item.title || "-")}</div>
        <div class="dispatch-event-card-meta">
          <div>事件类型：<b>${escapeHtml(item.eventType || "-")}</b></div>
          <div>事件等级：<b>${escapeHtml(item.level || "-")}</b></div>
          <div class="dispatch-event-desc">事件描述：<b>${escapeHtml(desc)}</b></div>
        </div>
      </button>`;
    }).join("");
  }

  function renderModeBar() {
    const hasEvent = !!currentEvent();
    document.querySelectorAll("[data-desk-mode]").forEach((btn) => {
      btn.disabled = !hasEvent;
      btn.classList.toggle("active", hasEvent && btn.dataset.deskMode === state.activeMode);
    });
  }

  function modeVideoBody() {
    const live = new Date().toTimeString().slice(0, 8);
    return `<div class="dispatch-video-home-grid">${VIDEO_CAMERAS.map((camera) => `
      <button type="button" class="dispatch-video-feed" data-desk-camera="${escapeHtml(camera.cameraId)}" style="text-align:left;cursor:pointer;width:100%;padding:0;border:0;background:transparent">
        <div class="dispatch-video-feed-title"><span>${escapeHtml(camera.name)}</span><b>${escapeHtml(camera.status)}</b></div>
        <div class="dispatch-video-feed-screen"><img src="${VIDEO_POSTER}" alt="${escapeHtml(camera.name)}"><span>LIVE · ${live}</span></div>
      </button>`).join("")}</div>`;
  }

  function modeResourcesBody(event) {
    const list = relatedResources(event);
    const counts = {};
    list.forEach((item) => { counts[item.category || "其他"] = (counts[item.category || "其他"] || 0) + 1; });
    const types = Object.keys(counts);
    if (state.resourceCategory !== "all" && !types.includes(state.resourceCategory)) state.resourceCategory = "all";
    const filtered = state.resourceCategory === "all" ? list : list.filter((item) => item.category === state.resourceCategory);
    return `${typeCardsHtml("resource", types, state.resourceCategory, counts)}
      <div class="emergency-table-wrap ds-ops-wrap" style="margin-top:12px"><table class="emergency-table ds-ops-table">
        <thead><tr><th>物资名称</th><th>分类</th><th>规格</th><th>所在位置</th><th>所需数量</th><th class="ds-ops-col">操作</th></tr></thead>
        <tbody>${filtered.length ? filtered.map((item) => `<tr>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.category || "-")}</td>
          <td>${escapeHtml(item.model || "-")}</td>
          <td>${escapeHtml(item.location || item.warehouse || "-")}</td>
          <td>${escapeHtml(item.requiredQty)}${item.unit ? ` ${escapeHtml(item.unit)}` : ""}</td>
          <td class="ds-ops-col"><button class="table-action" type="button" data-locate-resource="${escapeHtml(item.resourceId)}">查看</button></td>
        </tr>`).join("") : `<tr><td colspan="6" class="empty-cell">暂无关联物资</td></tr>`}</tbody>
      </table></div>`;
  }

  function modePersonnelBody(event) {
    const list = relatedPeople(event);
    const counts = {};
    list.forEach((item) => { counts[item.type || "其他"] = (counts[item.type || "其他"] || 0) + 1; });
    const types = Object.keys(counts);
    if (state.personnelType !== "all" && !types.includes(state.personnelType)) state.personnelType = "all";
    const filtered = state.personnelType === "all" ? list : list.filter((item) => item.type === state.personnelType);
    return `${typeCardsHtml("personnel", types, state.personnelType, counts)}
      <div class="emergency-table-wrap ds-ops-wrap" style="margin-top:12px"><table class="emergency-table ds-ops-table">
        <thead><tr><th>人员名称</th><th>分类</th><th>所属部门</th><th>联系方式</th><th class="ds-ops-col">操作</th></tr></thead>
        <tbody>${filtered.length ? filtered.map((item) => `<tr>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.type || "-")}</td>
          <td>${escapeHtml(item.unit || item.department || "-")}</td>
          <td>${escapeHtml(item.mobile || item.phone || "-")}</td>
          <td class="ds-ops-col"><button class="table-action" type="button" data-locate-person="${escapeHtml(item.personId)}">查看</button></td>
        </tr>`).join("") : `<tr><td colspan="5" class="empty-cell">暂无关联人员</td></tr>`}</tbody>
      </table></div>`;
  }

  function modePlanBody(event) {
    const plan = eventPlan(event);
    if (plan && typeof planOps()?.detailBody === "function") {
      return `<div class="dispatch-plan-detail">${planOps().detailBody(plan, state.planTab)}</div>`;
    }
    return `<div class="dispatch-right-empty">当前事件未关联应急预案</div>`;
  }

  function openModePanel(mode) {
    const event = currentEvent();
    if (!event) return ui()?.showToast?.("请先选择事件", "warning");
    state.activeMode = mode;
    if (mode === "resources") state.resourceCategory = state.resourceCategory || "all";
    if (mode === "personnel") state.personnelType = state.personnelType || "all";
    renderModeBar();
    const titles = { video: "视频监控", resources: "应急物资", personnel: "应急人员", plan: "应急预案" };
    const bodies = {
      video: modeVideoBody,
      resources: () => modeResourcesBody(event),
      personnel: () => modePersonnelBody(event),
      plan: () => modePlanBody(event),
    };
    openDrawerDetail(titles[mode] || "详情", bodies[mode]?.() || "");
  }

  function refreshModePanel() {
    if (state.activeMode === "resources" || state.activeMode === "personnel") {
      openModePanel(state.activeMode);
    }
  }

  function initMap() {
    const host = $("deskMap");
    if (!host) return;
    mapApi = window.EMERGENCY_MAP?.create(host, { center: MAP_CENTER, zoom: 15 });
    rebuildLayers();
  }

  function toggleFullscreen() {
    const stage = $("deskMapStage");
    if (!stage) return;
    isFullscreen = !isFullscreen;
    stage.classList.toggle("is-fullscreen", isFullscreen);
    const btn = document.querySelector('[data-desk-map="fullscreen"] i');
    if (btn) btn.className = isFullscreen ? "fa-solid fa-compress" : "fa-solid fa-expand";
    setTimeout(() => {
      mapApi?.map?.invalidateSize?.();
      mapApi?.base?.invalidate?.();
    }, 200);
  }

  /* 原语音对讲 / 内嵌指挥调度面板挂载（恢复时取消注释，并恢复 deskCommandHost 与脚本引用）
  function mountPanel() {
    const host = $("deskCommandHost");
    panelApi?.destroy?.();
    panelApi = window.mountCommandDispatchPanel?.(host, {
      getStore: () => emergency(),
      getEventId: () => state.eventId || "",
      source: "通信值班台",
      headerExtra: `<button class="btn btn-plain" type="button" data-desk-action="to-dispatch"><i class="fa-solid fa-tower-broadcast"></i> 转应急调度台</button>`,
      onCall: ({ personIds }) => {
        const id = personIds?.[0];
        const person = id ? emergency()?.getPerson?.(id) : null;
        if (person && hasCoords(person)) mapApi?.focusPoint?.(person, 17);
        renderRecentCalls();
      },
    });
  }
  */

  function toDispatch(eventId) {
    const q = eventId ? `?eventId=${encodeURIComponent(eventId)}` : "";
    location.href = `../emergency/dispatch.html${q}`;
  }

  function openVoiceDispatch() {
    const url = "../emergency/voice-dispatch.html" + (state.eventId ? `?eventId=${encodeURIComponent(state.eventId)}` : "");
    window.open(url, "_blank");
  }

  function bind() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-desk-detail-close]")) {
        document.querySelector(".emergency-center-mask[data-desk-detail]")?.remove();
        return;
      }

      const statusChip = event.target.closest("[data-desk-status]");
      if (statusChip) {
        state.statusFilter = statusChip.dataset.deskStatus || "全部";
        renderStatusFilter();
        renderEventList();
        renderModeBar();
        rebuildLayers();
        return;
      }

      const eventCard = event.target.closest("[data-desk-event-id]");
      if (eventCard) {
        selectEvent(eventCard.dataset.deskEventId, { focus: true, openDetail: true });
        return;
      }

      const resourceType = event.target.closest("[data-resource-type]");
      if (resourceType) {
        state.resourceCategory = resourceType.dataset.resourceType || "all";
        refreshModePanel();
        return;
      }

      const personnelType = event.target.closest("[data-personnel-type]");
      if (personnelType) {
        state.personnelType = personnelType.dataset.personnelType || "all";
        refreshModePanel();
        return;
      }

      const modeBtn = event.target.closest("[data-desk-mode]");
      if (modeBtn) {
        if (modeBtn.disabled) return ui()?.showToast?.("请先选择事件", "warning");
        if (modeBtn.dataset.deskMode === "resources") state.resourceCategory = "all";
        if (modeBtn.dataset.deskMode === "personnel") state.personnelType = "all";
        openModePanel(modeBtn.dataset.deskMode);
        return;
      }

      if (event.target.closest('[data-desk-action="open-voice-dispatch"]')) {
        openVoiceDispatch();
        return;
      }

      const eventTab = event.target.closest(".dispatch-event-detail [data-event-detail-tab], #drawer [data-event-detail-tab]");
      if (eventTab) {
        openEventDetail(eventTab.dataset.eventId, eventTab.dataset.eventDetailTab || "info");
        return;
      }

      const planTab = event.target.closest(".dispatch-plan-detail [data-plan-detail-tab]");
      if (planTab) {
        state.planTab = planTab.dataset.planDetailTab || "basic";
        openModePanel("plan");
        return;
      }

      if (event.target.closest('[data-desk-action="to-dispatch"]')) {
        toDispatch(state.eventId);
        return;
      }

      const cameraBtn = event.target.closest("[data-desk-camera]");
      if (cameraBtn) {
        const camera = VIDEO_CAMERAS.find((item) => item.cameraId === cameraBtn.dataset.deskCamera);
        openVideoModal(camera);
        return;
      }

      const locateResource = event.target.closest("[data-locate-resource]");
      if (locateResource) {
        const item = (emergency()?.listResources?.() || []).find((entry) => entry.resourceId === locateResource.dataset.locateResource);
        if (item) {
          openResourceDetail(item.resourceId);
          locateOnMap(item, item.name);
        }
        return;
      }

      const locatePerson = event.target.closest("[data-locate-person]");
      if (locatePerson) {
        const item = (emergency()?.listPersonnel?.() || []).find((entry) => entry.personId === locatePerson.dataset.locatePerson);
        if (item) {
          openPersonnelDetail(item.personId);
          locateOnMap(item, item.name);
        }
        return;
      }

      const detail = event.target.closest("[data-record-detail]");
      if (detail) {
        openRecordDetail(detail.dataset.recordDetail);
        return;
      }

      const recordEvent = event.target.closest("[data-record-event]");
      if (recordEvent) {
        selectEvent(recordEvent.dataset.recordEvent, { focus: true });
        openEventDetail(recordEvent.dataset.recordEvent);
        return;
      }

      if (event.target.closest("#deskCallPagination [data-page-prev]")) {
        recordPage -= 1;
        renderRecentCalls();
        return;
      }
      if (event.target.closest("#deskCallPagination [data-page-next]")) {
        recordPage += 1;
        renderRecentCalls();
        return;
      }

      const mapAct = event.target.closest("[data-desk-map]")?.dataset.deskMap;
      if (mapAct === "zoom-in") { if (mapApi?.zoomIn) mapApi.zoomIn(); else mapApi?.map?.zoomIn?.(); }
      if (mapAct === "zoom-out") { if (mapApi?.zoomOut) mapApi.zoomOut(); else mapApi?.map?.zoomOut?.(); }
      if (mapAct === "reset") { if (mapApi?.resetView) mapApi.resetView(); else mapApi?.map?.setView?.(MAP_CENTER, 15); }
      if (mapAct === "fullscreen") toggleFullscreen();
    });

    $("deskEventKeyword")?.addEventListener("input", (event) => {
      state.eventKeyword = event.target.value || "";
      renderEventList();
      renderModeBar();
    });

    ["layerDevices", "layerPersonnel", "layerResources", "layerVideo", "layerEvents"].forEach((id) => {
      $(id)?.addEventListener("change", rebuildLayers);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    bind();
    renderStatusFilter();
    renderEventList();
    renderModeBar();
    initMap();
    // mountPanel(); // 原语音对讲面板
    if (eventOps()) {
      eventOps().onChanged = () => {
        renderEventList();
        renderModeBar();
        rebuildLayers();
      };
    }
    if (state.eventId || currentEvent()) focusSelectedEvent();
    renderRecentCalls();
  });
})();
