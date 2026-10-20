(function () {
  const MOCK_TODAY = "2026-10-14";
  const MAP_CENTER = [30.4680, 114.4240];
  const VIDEO_POSTER = "../../assets/images/corridor-monitor.jpg";
  const $ = (id) => document.getElementById(id);
  const emergency = () => window.EMERGENCY_STORE;
  const ui = () => window.EMERGENCY_UI;
  const comm = () => window.COMMUNICATION_STORE;
  const eventOps = () => window.EMERGENCY_EVENT_OPS;

  const VIDEO_CAMERAS = [
    { cameraId: "CAM-001", name: "综合舱 F0102", latitude: 30.4672, longitude: 114.4232, status: "在线", distance: "180m", kind: "video" },
    { cameraId: "CAM-002", name: "电力舱 F0103", latitude: 30.4688, longitude: 114.4255, status: "在线", distance: "46m", kind: "video" },
    { cameraId: "CAM-003", name: "水信舱 F0301", latitude: 30.4696, longitude: 114.4268, status: "在线", distance: "95m", kind: "video" },
    { cameraId: "CAM-004", name: "出入口 K1+280", latitude: 30.4660, longitude: 114.4220, status: "在线", distance: "210m", kind: "video" },
  ];

  let mapApi = null;
  let deviceLayer = null;
  let panelApi = null;
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

  function openPersonnelDetail(id) {
    const item = (emergency()?.listPersonnel?.() || []).find((entry) => entry.personId === id);
    if (!item) return ui()?.showToast?.("未找到人员", "warning");
    const tags = Array.isArray(item.specialties) ? item.specialties.join("、") : (item.tags || "-");
    const pairs = [
      ["人员编号", escapeHtml(item.personId)], ["所属部门", escapeHtml(item.unit || "-")],
      ["人员分类", escapeHtml(item.type || "-")], ["部门 / 岗位", escapeHtml(item.position || item.role || "-")],
      ["手机号", escapeHtml(item.mobile || "-")], ["座机 / 分机", escapeHtml(item.phone || "-")],
      ["当前状态", statusHtml(item.onlineStatus)], ["可调度状态", statusHtml(item.dispatchStatus)],
      ["值班时间", escapeHtml(item.dutyTime || "-")], ["所在位置", escapeHtml(item.section || item.location || "-")],
      ["经度", formatCoord(item.longitude)], ["纬度", formatCoord(item.latitude)],
      ["专业标签", escapeHtml(tags || "-")], ["最近更新", escapeHtml(formatTime(item.updatedAt))],
    ];
    openDrawerDetail(`${item.name} · 应急通讯录`, pairsToDetailGrid(pairs));
  }

  function openResourceDetail(id) {
    const item = (emergency()?.listResources?.() || []).find((entry) => entry.resourceId === id);
    if (!item) return ui()?.showToast?.("未找到物资", "warning");
    const unit = item.unit || "件";
    const pairs = [
      ["物资编号", escapeHtml(item.resourceId)], ["分类", escapeHtml(item.category)],
      ["规格型号", escapeHtml(item.model || "-")],
      ["库存总量", escapeHtml(`${item.total} ${unit}`)],
      ["可用数量", escapeHtml(`${item.available} ${unit}`)],
      ["已占用数量", escapeHtml(`${item.occupied || 0} ${unit}`)],
      ["所在仓库", escapeHtml(item.warehouse || "-")], ["具体位置", escapeHtml(item.location || "-")],
      ["负责人", escapeHtml(item.owner || "-")], ["有效期", escapeHtml(item.expiryDate || item.expiry || "-")],
      ["状态", statusHtml(item.status)],
      ["经度", formatCoord(item.longitude)],
      ["纬度", formatCoord(item.latitude)],
    ];
    openDrawerDetail(`${item.name} · 物资详情`, pairsToDetailGrid(pairs));
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

  function openEventDetail(eventId, tab = "info") {
    const item = emergency()?.getEvent?.(eventId) || eventOps()?.getEvent?.(eventId);
    if (!item) return ui()?.showToast?.("未找到事件", "warning");
    const body = typeof eventOps()?.detailBody === "function"
      ? eventOps().detailBody(item, tab)
      : `<div class="emergency-empty">事件详情组件未就绪</div>`;
    openDrawerDetail(
      "应急事件详情",
      body,
      `<button class="btn btn-primary" type="button" data-desk-event-assign="${escapeHtml(item.eventId)}">指派</button>
       <button class="btn btn-secondary" type="button" data-drawer-close>关闭</button>`,
    );
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
    const showEvents = $("layerEvents")?.checked !== false;

    const personnel = showPersonnel ? mappable(emergency()?.listPersonnel?.() || []) : [];
    const resources = showResources ? mappable(emergency()?.listResources?.() || []) : [];
    const events = showEvents ? mappable(emergency()?.listEvents?.() || []) : [];
    const cameras = showDevices ? mappable(VIDEO_CAMERAS) : [];

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

  function focusPersonIds(ids) {
    const id = ids?.[0];
    const person = id ? emergency()?.getPerson?.(id) : null;
    if (!person || !hasCoords(person)) return;
    mapApi?.focusPoint?.(person, 17);
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

  function mountPanel() {
    const host = $("deskCommandHost");
    panelApi?.destroy?.();
    panelApi = window.mountCommandDispatchPanel?.(host, {
      getStore: () => emergency(),
      getEventId: () => "",
      source: "通信值班台",
      headerExtra: `<button class="btn btn-plain" type="button" data-desk-action="to-dispatch"><i class="fa-solid fa-tower-broadcast"></i> 转应急调度台</button>`,
      onCall: ({ personIds }) => {
        focusPersonIds(personIds);
        renderKpis();
        renderRecentCalls();
      },
    });
  }

  function toDispatch(eventId) {
    const q = eventId ? `?eventId=${encodeURIComponent(eventId)}` : "";
    location.href = `../emergency/dispatch.html${q}`;
  }

  function bind() {
    document.addEventListener("click", (event) => {
      const assign = event.target.closest("[data-desk-event-assign]");
      if (assign) {
        toDispatch(assign.dataset.deskEventAssign);
        return;
      }
      const eventTab = event.target.closest("#drawer [data-event-detail-tab]");
      if (eventTab) {
        openEventDetail(eventTab.dataset.eventId, eventTab.dataset.eventDetailTab || "info");
        return;
      }
      if (event.target.closest('[data-desk-action="to-dispatch"]')) {
        toDispatch();
        return;
      }
      const detail = event.target.closest("[data-record-detail]");
      if (detail) {
        openRecordDetail(detail.dataset.recordDetail);
        return;
      }
      const recordEvent = event.target.closest("[data-record-event]");
      if (recordEvent) {
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

    ["layerDevices", "layerPersonnel", "layerResources", "layerEvents"].forEach((id) => {
      $(id)?.addEventListener("change", rebuildLayers);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    bind();
    initMap();
    mountPanel();
    renderKpis();
    renderRecentCalls();
  });
})();
