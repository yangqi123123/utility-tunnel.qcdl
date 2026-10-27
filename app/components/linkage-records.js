(function () {
  const data = window.LINKAGE_DATA;
  if (!data) return;

  const linkageRecords = data.records || [];
  const systemTypes = data.systems || [];
  const filterCard = document.getElementById("linkageFilterCard");
  const collapseButton = filterCard?.querySelector('[data-action="collapse"]');

  const state = {
    tab: "records",
    filters: { name: "", code: "", type: "", result: "", system: "", from: "", to: "" },
    oplogFilters: { name: "", code: "", system: "", operator: "" },
  };

  function loadSessionOpLogs() {
    try {
      const saved = JSON.parse(sessionStorage.getItem("SMART_LINKAGE_OP_LOGS") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  }

  function allOperationLogs() {
    const seeded = data.operationLogs || [];
    const session = loadSessionOpLogs();
    const map = new Map();
    [...session, ...seeded].forEach((item) => {
      if (!item || !item.id) return;
      if (!map.has(item.id)) map.set(item.id, item);
    });
    return [...map.values()].sort((a, b) => String(b.operateTime || "").localeCompare(String(a.operateTime || "")));
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }
  function attr(value) {
    return esc(value).replaceAll("'", "&#39;");
  }
  function resultClass(result) {
    if (result === "成功") return "normal";
    if (result === "部分成功") return "warning";
    if (result === "失败") return "danger";
    return "offline";
  }
  function itemList(record) {
    return Array.isArray(record.items) ? record.items : [];
  }
  function systemsOf(record) {
    if (record.system) return [record.system];
    return [...new Set(itemList(record).map((i) => i.system).filter(Boolean))];
  }
  function devicesOf(record) {
    return itemList(record).map((item) => item.deviceName).filter(Boolean);
  }
  function showMessage(title, message) {
    if (typeof window.openAppConfirm === "function") {
      window.openAppConfirm({ title, message, confirmText: "知道了" });
      return;
    }
    window.alert(`${title}\n${message}`);
  }

  function fillSystemFilter() {
    const options = `<option value="">全部系统</option>${systemTypes.map((name) => `<option value="${esc(name)}">${esc(name)}</option>`).join("")}`;
    document.querySelectorAll('[data-filter="system"], [data-oplog-filter="system"]').forEach((select) => {
      select.innerHTML = options;
    });
  }

  function switchTab(tab) {
    state.tab = tab;
    document.querySelectorAll("[data-linkage-tab]").forEach((btn) => {
      const active = btn.dataset.linkageTab === tab;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
    document.querySelectorAll("[data-linkage-panel]").forEach((panel) => {
      panel.classList.toggle("hidden", panel.dataset.linkagePanel !== tab);
    });
    if (tab === "oplog") renderOplogTable(filteredOpLogs());
  }

  function filteredOpLogs() {
    const f = state.oplogFilters;
    const nameQ = f.name.toLowerCase();
    const codeQ = f.code.toLowerCase();
    const operatorQ = f.operator.toLowerCase();
    return allOperationLogs().filter((item) =>
      (!nameQ || (item.name || "").toLowerCase().includes(nameQ)) &&
      (!codeQ || (item.code || "").toLowerCase().includes(codeQ)) &&
      (!f.system || item.system === f.system) &&
      (!operatorQ || (item.operator || "").toLowerCase().includes(operatorQ))
    );
  }

  function renderOplogTable(list) {
    const body = document.getElementById("oplogTableBody");
    const count = document.getElementById("oplogCount");
    if (!body || !count) return;
    count.textContent = String(list.length);
    body.innerHTML = list.map((item) => `
      <tr data-oplog-id="${attr(item.id)}">
        <td><span class="linkage-name-cell">${esc(item.name || "-")}</span></td>
        <td>${esc(item.code || "-")}</td>
        <td>${esc(item.type || "手动执行")}</td>
        <td>${esc(item.system || "-")}</td>
        <td><span class="linkage-devices" title="${attr(item.device || "")}">${esc(item.device || "-")}</span></td>
        <td>${esc(item.action || "-")}</td>
        <td>${esc(item.startTime || "-")}</td>
        <td>${esc(item.endTime || "-")}</td>
        <td>${esc(item.operator || "-")}</td>
        <td>${esc(item.operateTime || "-")}</td>
      </tr>
    `).join("") || `<tr><td colspan="10" class="empty-cell">暂无手动执行操作日志</td></tr>`;
  }

  function syncOplogFilters() {
    document.querySelectorAll("[data-oplog-filter]").forEach((field) => {
      state.oplogFilters[field.dataset.oplogFilter] = field.value.trim();
    });
  }

  function filteredRecords() {
    const f = state.filters;
    const nameQ = f.name.toLowerCase();
    const codeQ = f.code.toLowerCase();
    return linkageRecords.filter((item) => {
      const systems = systemsOf(item);
      const devices = devicesOf(item).join(" ");
      const day = (item.startTime || "").slice(0, 10);
      return (!nameQ || (item.name || "").toLowerCase().includes(nameQ) || devices.toLowerCase().includes(nameQ)) &&
        (!codeQ || (item.code || "").toLowerCase().includes(codeQ)) &&
        (!f.type || item.type === f.type) &&
        (!f.result || item.result === f.result) &&
        (!f.system || systems.includes(f.system) || item.system === f.system) &&
        (!f.from || (day && day >= f.from)) &&
        (!f.to || (day && day <= f.to));
    });
  }

  function renderTable(list) {
    document.getElementById("recordCount").textContent = list.length;
    document.getElementById("linkageTableBody").innerHTML = list.map((item) => {
      const systems = systemsOf(item);
      const devices = devicesOf(item);
      const deviceText = devices.join("、") || "-";
      const systemText = systems.join("、") || "-";
      return `
        <tr data-record-id="${attr(item.id)}">
          <td><span class="linkage-name-cell">${esc(item.name)}</span></td>
          <td>${esc(item.code)}</td>
          <td>${esc(item.type)}</td>
          <td title="${attr(systemText)}">${esc(systemText)}</td>
          <td><span class="linkage-devices" title="${attr(deviceText)}">${esc(deviceText)}</span></td>
          <td><span class="env-status ${resultClass(item.result)}">${esc(item.result)}</span></td>
          <td>${esc(item.startTime || "-")}</td>
          <td>${esc(item.endTime || "-")}</td>
          <td>${esc(item.sendTime || "-")}</td>
          <td class="linkage-actions">
            <button class="table-action" type="button" data-open-detail="${attr(item.id)}">详情</button>
          </td>
        </tr>
      `;
    }).join("") || `<tr><td colspan="10" class="empty-cell">暂无数据</td></tr>`;
  }

  function syncFilters() {
    document.querySelectorAll("[data-filter]").forEach((field) => {
      state.filters[field.dataset.filter] = field.value.trim();
    });
  }

  function render() {
    renderTable(filteredRecords());
  }

  function openExportOplogDrawer() {
    const count = filteredOpLogs().length;
    window.openAppDrawer({
      title: "导出操作日志",
      body: `<p>已按当前筛选条件生成操作日志文件（Mock），共 ${esc(count)} 条。</p>`,
      footer: `
        <button class="btn btn-secondary" type="button" data-drawer-close>取消</button>
        <button class="btn btn-primary" type="button" data-drawer-close>确认导出</button>
      `,
    });
  }

  function openDetail(id) {
    const item = linkageRecords.find((entry) => entry.id === id);
    if (!item || !window.openAppDrawer) return;
    const rows = itemList(item).map((row) => `
      <tr>
        <td>${esc(row.system || "-")}</td>
        <td>${esc(row.deviceName || "-")}</td>
        <td>${esc(row.deviceCode || "-")}</td>
        <td title="${attr(row.trigger || "")}">${esc(row.trigger || "-")}</td>
        <td title="${attr(row.action || "")}">${esc(row.action || "-")}</td>
        <td><span class="env-status ${resultClass(row.result)}">${esc(row.result || "-")}</span></td>
        <td>${esc(row.startTime || "-")}</td>
        <td>${esc(row.endTime || "-")}</td>
        <td>${esc(row.sendTime || "-")}</td>
      </tr>
    `).join("") || `<tr><td colspan="9" class="empty-cell">暂无联动设备</td></tr>`;

    const body = `
      <div class="linkage-detail">
        <section class="environment-detail-section">
          <h3>基本信息</h3>
          <div class="linkage-detail-grid">
            <div class="info-item"><span class="info-label">联动名称</span><span class="info-value">${esc(item.name)}</span></div>
            <div class="info-item"><span class="info-label">联动编号</span><span class="info-value">${esc(item.code)}</span></div>
            <div class="info-item"><span class="info-label">联动类型</span><span class="info-value">${esc(item.type)}</span></div>
            <div class="info-item"><span class="info-label">执行结果</span><span class="info-value"><span class="env-status ${resultClass(item.result)}">${esc(item.result)}</span></span></div>
            <div class="info-item"><span class="info-label">联动开始时间</span><span class="info-value">${esc(item.startTime || "-")}</span></div>
            <div class="info-item"><span class="info-label">联动结束时间</span><span class="info-value">${esc(item.endTime || "-")}</span></div>
            <div class="info-item"><span class="info-label">发送时间</span><span class="info-value">${esc(item.sendTime || "-")}</span></div>
          </div>
        </section>
        <section class="environment-detail-section">
          <h3>联动设备明细</h3>
          <div class="table-wrap">
            <table class="table linkage-detail-table">
              <thead>
                <tr>
                  <th>联动系统</th>
                  <th>联动设备</th>
                  <th>设备编码</th>
                  <th>触发条件</th>
                  <th>执行动作</th>
                  <th>执行结果</th>
                  <th>联动开始时间</th>
                  <th>联动结束时间</th>
                  <th>发送时间</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </section>
      </div>
    `;
    window.openAppDrawer({
      title: "联动详情",
      body,
      footer: `<button class="btn btn-secondary" type="button" data-drawer-close>关闭</button>`,
    });
  }

  function openSyncDrawer() {
    const options = systemTypes.map((name) => `<option value="${esc(name)}">${esc(name)}</option>`).join("");
    window.openAppDrawer({
      title: "同步联动记录",
      body: `
        <label class="form-field form-item">
          <span class="form-label form-required">同步模式</span>
          <select class="form-control" data-sync-mode>
            <option value="FULL">首次全量同步</option>
            <option value="INCREMENTAL">后续增量同步</option>
          </select>
        </label>
        <label class="form-field form-item">
          <span class="form-label form-required">同步系统</span>
          <select class="form-control" data-sync-system>
            <option value="">请选择系统</option>
            ${options}
          </select>
        </label>
      `,
      footer: `
        <button class="btn btn-secondary" type="button" data-drawer-close>取消</button>
        <button class="btn btn-primary" type="button" data-action="start-linkage-sync">开始同步</button>
      `,
    });
  }

  function startSync() {
    const mode = document.querySelector("[data-sync-mode]")?.value || "FULL";
    const system = document.querySelector("[data-sync-system]")?.value || "";
    if (!system) {
      showMessage("提示", "请选择同步系统后再开始同步。");
      return;
    }
    const modeLabel = mode === "FULL" ? "首次全量同步" : "后续增量同步";
    if (typeof window.closeAppDrawer === "function") window.closeAppDrawer();
    showMessage("联动同步任务已提交", `同步模式：${modeLabel}；同步系统：${system}。任务已在后台执行，稍后可刷新列表查看结果。`);
  }

  function openExportDrawer() {
    const count = filteredRecords().length;
    window.openAppDrawer({
      title: "导出联动记录",
      body: `<p>已按当前筛选条件生成联动记录文件（Mock），共 ${esc(count)} 条。</p>`,
      footer: `
        <button class="btn btn-secondary" type="button" data-drawer-close>取消</button>
        <button class="btn btn-primary" type="button" data-drawer-close>确认导出</button>
      `,
    });
  }

  document.addEventListener("click", (event) => {
    const tabBtn = event.target.closest("[data-linkage-tab]");
    if (tabBtn) {
      switchTab(tabBtn.dataset.linkageTab);
      return;
    }

    const oplogAction = event.target.closest("[data-oplog-action]")?.dataset.oplogAction;
    if (oplogAction === "search") {
      syncOplogFilters();
      renderOplogTable(filteredOpLogs());
      return;
    }
    if (oplogAction === "reset") {
      document.querySelectorAll("[data-oplog-filter]").forEach((field) => { field.value = ""; });
      state.oplogFilters = { name: "", code: "", system: "", operator: "" };
      renderOplogTable(filteredOpLogs());
      return;
    }
    if (oplogAction === "export") {
      openExportOplogDrawer();
      return;
    }

    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "collapse") {
      if (!filterCard || !collapseButton) return;
      const expanded = filterCard.classList.toggle("expanded");
      collapseButton.querySelector("span").textContent = expanded ? "收起" : "展开";
      collapseButton.querySelector("i").className = expanded ? "fa-solid fa-chevron-up" : "fa-solid fa-chevron-down";
      return;
    }
    if (action === "search") {
      syncFilters();
      renderTable(filteredRecords());
      return;
    }
    if (action === "reset") {
      document.querySelectorAll("[data-filter]").forEach((field) => { field.value = ""; });
      state.filters = { name: "", code: "", type: "", result: "", system: "", from: "", to: "" };
      renderTable(filteredRecords());
      return;
    }
    if (action === "sync-linkage") {
      openSyncDrawer();
      return;
    }
    if (action === "start-linkage-sync") {
      startSync();
      return;
    }
    if (action === "export") {
      openExportDrawer();
      return;
    }

    const detailId = event.target.closest("[data-open-detail]")?.dataset.openDetail;
    if (detailId) openDetail(detailId);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.matches("[data-filter]")) {
      syncFilters();
      renderTable(filteredRecords());
    }
    if (event.key === "Enter" && event.target.matches("[data-oplog-filter]")) {
      syncOplogFilters();
      renderOplogTable(filteredOpLogs());
    }
  });

  fillSystemFilter();
  render();
  renderOplogTable(filteredOpLogs());

  const params = new URLSearchParams(location.search);
  const openId = params.get("id");
  const tab = params.get("tab");
  if (tab === "oplog") switchTab("oplog");
  if (openId) openDetail(openId);
})();
