(function () {
  const ui = window.EMERGENCY_UI;
  const DEFAULT_EVENT_ID = "EVT-20260930-001";
  let state = { records: [], filtered: [], categories: [], page: 1, pageSize: 10, editId: "", stockId: "", stockAction: "", detailTab: "info" };
  const store = () => window.EMERGENCY_STORE;
  const text = (value) => ui.escapeHtml(value || "-");
  const attr = (value) => text(value).replaceAll("'", "&#39;");
  const DEFAULT_WAREHOUSES = ["东段应急仓", "中心应急仓", "西段应急仓", "北段应急仓"];

  function normalize(item) {
    return {
      ...item,
      category: item.category || item.type || "其他",
      model: item.model || item.spec || item.specification || "-",
      total: Number(item.total ?? item.quantity ?? 0),
      available: Number(item.available ?? item.stock ?? 0),
      occupied: Number(item.occupied ?? item.used ?? 0),
      warehouse: item.warehouse || item.storage || "",
      location: item.location || item.section || "",
      owner: item.owner || item.manager || "未分配",
      status: item.status || "可用",
      alert: item.alert || "",
      expiry: item.expiry || item.expiryDate || item.expireDate || "-",
      longitude: item.longitude != null ? Number(item.longitude) : "",
      latitude: item.latitude != null ? Number(item.latitude) : "",
    };
  }

  function isLowStock(item) {
    return Number(item.available) <= 0;
  }

  function warehouseOptions(selected) {
    const names = [...new Set([...DEFAULT_WAREHOUSES, ...state.records.map((item) => normalize(item).warehouse).filter(Boolean)])];
    return names.map((name) => `<option value="${attr(name)}" ${name === selected ? "selected" : ""}>${text(name)}</option>`).join("");
  }

  function getRecords() {
    try { return Array.isArray(store()?.listResources?.()) ? store().listResources() : []; }
    catch (error) { ui.showApiError(error); return []; }
  }

  function getCategories() {
    try { return Array.isArray(store()?.listResourceCategories?.()) ? store().listResourceCategories() : []; }
    catch { return []; }
  }

  function categoryNames() {
    const fromStore = state.categories.map((item) => item.name).filter(Boolean);
    if (fromStore.length) return fromStore.sort((a, b) => a.localeCompare(b, "zh"));
    return [...new Set(state.records.map((item) => normalize(item).category).filter(Boolean))];
  }

  function options() {
    const records = state.records.map(normalize);
    const categories = categoryNames();
    const warehouses = [...new Set(records.map((item) => item.warehouse).filter(Boolean))];
    document.getElementById("resourceCategory").innerHTML = `<option value="">全部分类</option>${categories.map((item) => `<option>${text(item)}</option>`).join("")}`;
    document.getElementById("resourceWarehouse").innerHTML = `<option value="">全部仓库</option>${warehouses.map((item) => `<option>${text(item)}</option>`).join("")}`;
  }

  function filtered() {
    const keyword = ui.value("resourceKeyword").toLowerCase();
    const category = ui.value("resourceCategory");
    const warehouse = ui.value("resourceWarehouse");
    const status = ui.value("resourceStatus");
    const alert = ui.value("resourceAlert");
    state.filtered = state.records.filter((raw) => {
      const item = normalize(raw);
      const haystack = `${item.name || ""} ${item.category || ""} ${item.model || ""}`.toLowerCase();
      const low = isLowStock(item) || item.alert === "低库存";
      const expiring = item.expiry !== "-" && !Number.isNaN(new Date(item.expiry).getTime()) && new Date(item.expiry).getTime() - Date.now() < 30 * 86400000;
      return (!keyword || haystack.includes(keyword))
        && (!category || item.category === category)
        && (!warehouse || item.warehouse === warehouse)
        && (!status || item.status === status)
        && (!alert || (alert === "low" ? low : expiring));
    });
    const pages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
    state.page = Math.min(state.page, pages);
  }

  function closeMoreMenu() {
    document.querySelectorAll(".emergency-more-menu").forEach((node) => node.remove());
  }

  function openMoreMenu(button, id) {
    closeMoreMenu();
    const bound = Boolean(store()?.isResourceBound?.(id));
    const menu = document.createElement("div");
    menu.className = "emergency-more-menu";
    menu.innerHTML = [
      ["edit", "编辑"],
      ["inbound", "入库"],
      ["outbound", "出库"],
      ["lock", "锁定"],
      ["release", "释放"],
      ["transfer", "调拨"],
      ["delete", "删除", true],
    ].map(([action, label, danger]) => `<button type="button" data-resource-action="${action}" data-resource-id="${attr(id)}" class="${danger ? "is-danger" : ""}" ${action === "delete" && bound ? "disabled title=\"该物资已被锁定或占用，不允许删除\"" : ""}>${label}</button>`).join("");
    document.body.appendChild(menu);
    const rect = button.getBoundingClientRect();
    const menuWidth = menu.offsetWidth || 80;
    const top = Math.min(rect.bottom + 4, window.innerHeight - menu.offsetHeight - 8);
    const left = Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8);
    menu.style.top = `${Math.max(8, top)}px`;
    menu.style.left = `${left}px`;
  }

  function render() {
    filtered();
    const start = (state.page - 1) * state.pageSize;
    const rows = state.filtered.slice(start, start + state.pageSize);
    document.getElementById("resourceBody").innerHTML = rows.length
      ? rows.map((raw) => {
        const item = normalize(raw);
        const low = isLowStock(item);
        return `<tr data-resource-id="${attr(item.resourceId)}">
          <td><strong>${text(item.name)}</strong>${low ? ` <span class="emergency-status warning">低库存</span>` : ""}</td>
          <td>${text(item.category)}</td>
          <td>${text(item.model)}</td>
          <td>${item.available} ${text(item.unit || "件")}</td>
          <td>${text(item.location)}</td>
          <td>${text(item.owner)}</td>
          <td>${ui.renderStatus(item.status)}</td>
          <td class="emergency-ledger-actions">
            <button class="table-action" type="button" data-resource-action="detail" data-resource-id="${attr(item.resourceId)}">详情</button>
            <button class="table-action" type="button" data-resource-action="more" data-resource-id="${attr(item.resourceId)}">更多</button>
          </td>
        </tr>`;
      }).join("")
      : `<tr><td colspan="8"><div class="emergency-empty">暂无匹配物资</div></td></tr>`;
    document.getElementById("resourceCount").innerHTML = ui.renderPagination({
      total: state.filtered.length, page: state.page, pageSize: state.pageSize, id: "resourcePagination",
    });
  }

  function refresh() {
    state.records = getRecords();
    state.categories = getCategories();
    options();
    render();
  }

  function categorySelect(selected) {
    const names = categoryNames();
    return names.map((name) => `<option value="${attr(name)}" ${name === selected ? "selected" : ""}>${text(name)}</option>`).join("");
  }

  function form(item = {}) {
    const record = normalize(item);
    const lng = record.longitude === "" ? "" : Number(record.longitude).toFixed(6);
    const lat = record.latitude === "" ? "" : Number(record.latitude).toFixed(6);
    return `<form id="resourceForm" class="emergency-form-grid" data-resource-form data-resource-id="${attr(record.resourceId || "")}">
      <label class="form-field"><span class="form-label">物资名称 <b class="form-required"></b></span><input class="form-control" name="name" required value="${text(record.name === "-" ? "" : record.name)}"></label>
      <label class="form-field"><span class="form-label">物资分类 <b class="form-required"></b></span><select class="form-control" name="category" required><option value="">请选择分类</option>${categorySelect(record.category)}</select></label>
      <label class="form-field"><span class="form-label">规格型号</span><input class="form-control" name="model" value="${text(record.model === "-" ? "" : record.model)}"></label>
      <label class="form-field"><span class="form-label">计量单位</span><input class="form-control" name="unit" value="${text(record.unit || "件")}"></label>
      <label class="form-field"><span class="form-label">总库存 <b class="form-required"></b></span><input class="form-control" name="total" type="number" min="0" step="1" required value="${record.total}"></label>
      <label class="form-field"><span class="form-label">可用数量 <b class="form-required"></b></span><input class="form-control" name="available" type="number" min="0" step="1" required value="${record.available}"></label>
      <label class="form-field"><span class="form-label">所在仓库 <b class="form-required"></b></span><input class="form-control" name="warehouse" required placeholder="请输入仓库名称" value="${text(record.warehouse)}"></label>
      <label class="form-field"><span class="form-label">具体位置 <b class="form-required"></b></span><input class="form-control" name="location" required value="${text(record.location)}"></label>
      <label class="form-field"><span class="form-label">负责人</span><input class="form-control" name="owner" value="${text(record.owner === "未分配" ? "" : record.owner)}"></label>
      <label class="form-field"><span class="form-label">有效期</span><input class="form-control" name="expiryDate" type="date" value="${record.expiry === "-" ? "" : text(record.expiry)}"></label>
      <label class="form-field"><span class="form-label">状态</span><select class="form-control" name="status">${["可用", "已占用", "维修中", "报废"].map((option) => `<option ${option === record.status ? "selected" : ""}>${option}</option>`).join("")}</select></label>
      <div class="emergency-form-section">点位信息</div>
      <div class="emergency-point-row form-field full">
        <label class="form-field"><span class="form-label">经度</span><input class="form-control" name="longitude" data-point-lng readonly placeholder="点位选择后回显" value="${lng}"></label>
        <label class="form-field"><span class="form-label">纬度</span><input class="form-control" name="latitude" data-point-lat readonly placeholder="点位选择后回显" value="${lat}"></label>
        <button class="btn btn-secondary" type="button" data-resource-action="point-select">点位选择</button>
      </div>
    </form>`;
  }

  function openForm(id = "") {
    state.editId = id;
    const item = id ? state.records.find((record) => record.resourceId === id) : {};
    ui.openEntityDrawer({
      title: id ? "编辑应急物资" : "新增应急物资",
      body: form(item),
      footer: `<button class="btn btn-secondary" type="button" data-drawer-close>取消</button><button class="btn btn-primary" type="button" data-resource-save>保存物资</button>`,
    });
  }

  function categoryMeta(name) {
    const colors = ["#135afa", "#00a870", "#ed7b2f", "#e34d59", "#8b5cf6", "#0f766e"];
    const found = state.categories.find((item) => item.name === name);
    const index = Math.max(0, categoryNames().indexOf(name));
    return {
      color: colors[index % colors.length],
      icon: found?.icon || "fa-box",
    };
  }

  function openPointPicker() {
    const formNode = document.querySelector("[data-resource-form]");
    if (!formNode) return;
    const currentId = formNode.dataset.resourceId;
    const name = formNode.querySelector('[name="name"]')?.value.trim() || "当前物资";
    const category = formNode.querySelector('[name="category"]')?.value || "";
    const peers = state.records
      .filter((item) => item.resourceId !== currentId)
      .map((item) => {
        const record = normalize(item);
        const meta = categoryMeta(record.category);
        return {
          id: record.resourceId,
          name: record.name,
          longitude: record.longitude,
          latitude: record.latitude,
          legend: record.category,
          color: meta.color,
          icon: meta.icon,
        };
      });
    const legend = categoryNames().map((label) => {
      const meta = categoryMeta(label);
      return { label, color: meta.color, icon: meta.icon };
    });
    window.EMERGENCY_POINT_PICKER.open({
      longitude: formNode.querySelector("[data-point-lng]")?.value,
      latitude: formNode.querySelector("[data-point-lat]")?.value,
      label: name,
      currentIcon: categoryMeta(category).icon,
      note: "点击管廊地图选择物资点位",
      peers,
      legend,
      onConfirm: (point) => {
        formNode.querySelector("[data-point-lng]").value = point.longitude.toFixed(6);
        formNode.querySelector("[data-point-lat]").value = point.latitude.toFixed(6);
      },
    });
  }

  function stockRecordsOf(item) {
    return [...(item.usageRecords || [])].sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  }

  function detailBody(item, tab = "info") {
    const unit = item.unit || "件";
    const pairs = [
      ["物资编号", item.resourceId], ["物资名称", item.name], ["分类", item.category], ["规格型号", item.model],
      ["库存总量", `${item.total} ${unit}`], ["可用数量", `${item.available} ${unit}`],
      ["已占用数量", `${item.occupied} ${unit}`],
      ["所在仓库", item.warehouse || "-"], ["具体位置", item.location || "-"], ["负责人", item.owner],
      ["有效期", item.expiry], ["状态", item.status],
      ["经度", item.longitude === "" ? "-" : Number(item.longitude).toFixed(6)],
      ["纬度", item.latitude === "" ? "-" : Number(item.latitude).toFixed(6)],
    ];
    const infoPanel = `<section class="emergency-detail-panel ${tab === "info" ? "" : "hidden"}" data-resource-detail-panel="info">
      <div class="emergency-detail-grid">${pairs.map(([label, value]) => `<div class="emergency-detail-item"><span class="emergency-detail-label">${label}</span><span class="emergency-detail-value">${label === "状态" ? ui.renderStatus(value) : text(value)}</span></div>`).join("")}</div>
    </section>`;
    const records = stockRecordsOf(item);
    const timeline = records.length
      ? records.map((record) => `<div class="emergency-timeline-item">
          <span class="emergency-timeline-dot"></span>
          <div class="emergency-timeline-body">
            <div class="emergency-timeline-head"><strong>${text(record.action)}</strong><time>${text(record.at)}</time></div>
            <div class="emergency-timeline-meta">${text(record.operator || "-")}</div>
            <p>${text(record.note || "-")}</p>
          </div>
        </div>`).join("")
      : `<div class="emergency-empty">暂无出入库记录</div>`;
    const recordPanel = `<section class="emergency-detail-panel ${tab === "records" ? "" : "hidden"}" data-resource-detail-panel="records">
      <div class="emergency-timeline">${timeline}</div>
    </section>`;
    const tabs = `<div class="emergency-detail-tabs">
      <button type="button" class="${tab === "info" ? "active" : ""}" data-resource-detail-tab="info" data-resource-id="${attr(item.resourceId)}">物资信息</button>
      <button type="button" class="${tab === "records" ? "active" : ""}" data-resource-detail-tab="records" data-resource-id="${attr(item.resourceId)}">出入库记录</button>
    </div>`;
    return tabs + infoPanel + recordPanel;
  }

  function detail(id, tab = "info") {
    const raw = state.records.find((record) => record.resourceId === id) || {};
    const item = normalize(raw);
    item.usageRecords = Array.isArray(raw.usageRecords) ? raw.usageRecords : [];
    state.detailTab = tab === "records" ? "records" : "info";
    ui.openEntityDrawer({
      title: `${item.name} · 物资详情`,
      body: detailBody(item, state.detailTab),
      footer: `<button class="btn btn-secondary" type="button" data-drawer-close>关闭</button><button class="btn btn-primary" type="button" data-resource-action="edit" data-resource-id="${attr(id)}">编辑</button>`,
    });
  }

  function appendUsageRecord(resourceId, entry) {
    const current = store()?.getResource?.(resourceId) || state.records.find((record) => record.resourceId === resourceId);
    if (!current) return;
    const usageRecords = [...(current.usageRecords || []), entry];
    store().saveResource({ ...current, usageRecords, updatedAt: entry.at || ui.nowText() });
  }

  function stockForm(action, item) {
    const labels = { inbound: "入库数量", outbound: "出库数量", lock: "锁定数量", release: "释放数量" };
    return `<form id="stockForm"><div class="emergency-call-highlight">${text(item.name)} · 当前可用 ${item.available} ${text(item.unit || "件")}</div><label class="form-field" style="margin-top:16px"><span class="form-label">${labels[action] || "数量"} <b class="form-required"></b></span><input class="form-control" name="quantity" type="number" min="1" step="1" required value="1"></label></form>`;
  }

  function openStock(id, action) {
    const item = normalize(state.records.find((record) => record.resourceId === id) || {});
    state.stockId = id;
    state.stockAction = action;
    const names = { inbound: "物资入库", outbound: "物资出库", lock: "锁定应急物资", release: "释放应急物资" };
    ui.openEntityDrawer({
      title: names[action] || "库存操作",
      body: stockForm(action, item),
      footer: `<button class="btn btn-secondary" type="button" data-drawer-close>取消</button><button class="btn btn-primary" type="button" data-stock-save>确认操作</button>`,
    });
  }

  function saveForm() {
    const formNode = document.getElementById("resourceForm");
    if (!formNode?.reportValidity()) return;
    const data = Object.fromEntries(new FormData(formNode).entries());
    if (["total", "available"].some((field) => !Number.isInteger(Number(data[field])) || Number(data[field]) < 0)) {
      ui.showToast("库存数量必须为非负整数", "error");
      return;
    }
    data.resourceId = state.editId || undefined;
    data.total = Number(data.total);
    data.available = Number(data.available);
    if (data.available > data.total) {
      ui.showToast("可用数量不能大于总库存", "error");
      return;
    }
    data.occupied = Math.max(0, data.total - data.available);
    data.alert = isLowStock(data) ? "低库存" : "";
    data.longitude = data.longitude ? Number(data.longitude) : "";
    data.latitude = data.latitude ? Number(data.latitude) : "";
    data.updatedAt = ui.nowText();
    if (!state.editId) {
      data.usageRecords = [{
        action: "入库",
        at: data.updatedAt,
        operator: data.owner || "系统",
        note: `新增物资入库 ${data.total} ${data.unit || "件"}`,
      }];
    }
    try {
      if (!store()?.saveResource) throw new Error("物资数据服务尚未就绪");
      store().saveResource(data);
      window.closeAppDrawer?.();
      refresh();
      ui.showToast(state.editId ? "物资信息已更新" : "物资已入库");
    } catch (error) { ui.showApiError(error); }
  }

  function saveStock() {
    const formNode = document.getElementById("stockForm");
    if (!formNode?.reportValidity()) return;
    const quantity = Number(new FormData(formNode).get("quantity"));
    if (!Number.isInteger(quantity) || quantity <= 0) { ui.showToast("数量必须大于 0", "error"); return; }
    const raw = state.records.find((record) => record.resourceId === state.stockId);
    const item = normalize({ ...raw, usageRecords: raw?.usageRecords || [] });
    item.usageRecords = Array.isArray(raw?.usageRecords) ? raw.usageRecords : [];
    const action = state.stockAction;
    if (action === "outbound" && quantity > item.available) { ui.showToast("可用库存不足", "error"); return; }
    const actionLabel = { inbound: "入库", outbound: "出库", lock: "锁定", release: "释放" }[action] || "库存操作";
    const at = ui.nowText();
    const note = `${actionLabel} ${quantity} ${item.unit || "件"}`;
    try {
      if (action === "lock" && store()?.lockResource) {
        store().lockResource(DEFAULT_EVENT_ID, item.resourceId, quantity);
        appendUsageRecord(item.resourceId, { action: actionLabel, at, operator: item.owner || "系统", note });
      } else if (action === "release" && store()?.releaseResource) {
        store().releaseResource(DEFAULT_EVENT_ID, item.resourceId, quantity);
        appendUsageRecord(item.resourceId, { action: actionLabel, at, operator: item.owner || "系统", note });
      } else {
        const next = { ...raw, ...item };
        if (action === "inbound") { next.total += quantity; next.available += quantity; }
        if (action === "outbound") { next.total = Math.max(0, next.total - quantity); next.available -= quantity; }
        if (action === "lock") { next.available -= quantity; next.occupied += quantity; }
        if (action === "release") { next.available += quantity; next.occupied = Math.max(0, next.occupied - quantity); }
        next.status = next.occupied > 0 && next.available <= 0 ? "已占用" : next.status === "报废" ? "报废" : "可用";
        next.alert = isLowStock(next) ? "低库存" : "";
        next.updatedAt = at;
        next.usageRecords = [...(item.usageRecords || []), { action: actionLabel, at, operator: item.owner || "系统", note }];
        if (!store()?.saveResource) throw new Error("物资数据服务尚未就绪");
        store().saveResource(next);
      }
      window.closeAppDrawer?.();
      refresh();
      ui.showToast("库存操作已完成");
    } catch (error) { ui.showApiError(error); }
  }

  function transfer(id) {
    const item = normalize(state.records.find((record) => record.resourceId === id) || {});
    ui.openEntityDrawer({
      title: "调拨物资",
      body: `<form id="transferForm" class="emergency-form-grid">
        <div class="emergency-call-highlight form-field full">${text(item.name)} · 当前仓库 ${text(item.warehouse || "-")} · ${text(item.location || "-")}</div>
        <label class="form-field"><span class="form-label">所在仓库 <b class="form-required"></b></span><select class="form-control" name="warehouse" required><option value="">请选择仓库</option>${warehouseOptions(item.warehouse)}</select></label>
        <label class="form-field"><span class="form-label">具体位置 <b class="form-required"></b></span><input class="form-control" name="location" required placeholder="填写舱段或货位位置" value=""></label>
      </form>`,
      footer: `<button class="btn btn-secondary" type="button" data-drawer-close>取消</button><button class="btn btn-primary" type="button" data-transfer-save data-resource-id="${attr(id)}">确认调拨</button>`,
    });
  }

  function saveTransfer(id) {
    const formNode = document.getElementById("transferForm");
    if (!formNode?.reportValidity()) return;
    const data = Object.fromEntries(new FormData(formNode).entries());
    const raw = state.records.find((record) => record.resourceId === id) || {};
    const item = normalize(raw);
    const at = ui.nowText();
    const from = `${item.warehouse || "-"} / ${item.location || "-"}`;
    const to = `${data.warehouse} / ${data.location}`;
    try {
      store().saveResource({
        ...raw,
        ...item,
        warehouse: data.warehouse,
        location: data.location,
        updatedAt: at,
        usageRecords: [...(raw.usageRecords || []), { action: "调拨", at, operator: item.owner || "系统", note: `由 ${from} 调拨至 ${to}` }],
      });
      window.closeAppDrawer?.();
      refresh();
      ui.showToast("物资已调拨");
    } catch (error) { ui.showApiError(error); }
  }

  function removeResource(id) {
    const item = normalize(state.records.find((record) => record.resourceId === id) || {});
    const run = () => {
      try {
        store().removeResource(id);
        refresh();
        ui.showToast("物资已删除");
      } catch (error) { ui.showApiError(error); }
    };
    if (typeof window.openAppConfirm === "function") {
      window.openAppConfirm({ title: "删除物资", message: `确认删除物资「${item.name}」吗？`, confirmText: "确认删除", onConfirm: run });
    } else if (window.confirm(`确认删除物资「${item.name}」吗？`)) run();
  }

  function exportResources() {
    if (!window.XLSX) { ui.showToast("Excel 组件加载失败，请刷新页面后重试", "error"); return; }
    const rows = state.filtered.map((raw) => {
      const item = normalize(raw);
      return {
        物资名称: item.name,
        分类: item.category,
        规格型号: item.model,
        计量单位: item.unit || "件",
        总库存: item.total,
        可用数量: item.available,
        已占用: item.occupied,
        所在仓库: item.warehouse,
        具体位置: item.location,
        负责人: item.owner,
        有效期: item.expiry,
        状态: item.status,
        经度: item.longitude === "" ? "" : Number(item.longitude).toFixed(6),
        纬度: item.latitude === "" ? "" : Number(item.latitude).toFixed(6),
      };
    });
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "应急物资");
    const content = XLSX.write(book, { bookType: "xlsx", type: "array" });
    const blob = new Blob([content], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "应急物资.xlsx";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function categoryForm(item = {}) {
    return `<form id="resourceCategoryForm" class="emergency-category-form" data-category-id="${attr(item.categoryId || "")}">
      <label class="form-field"><span class="form-label">分类名称 <b class="form-required"></b></span><input class="form-control" name="name" required value="${text(item.name || "")}"></label>
      <label class="form-field"><span class="form-label">分类编码 <b class="form-required"></b></span><input class="form-control" name="code" required value="${text(item.code || "")}"></label>
      <label class="form-field"><span class="form-label">显示排序</span><input class="form-control" name="sort" type="number" min="0" step="1" value="${Number(item.sort || 0)}"></label>
      ${ui.renderCategoryIconField(item.icon || "fa-box")}
      <label class="form-field full"><span class="form-label">备注</span><textarea class="form-control" name="remark" rows="3">${text(item.remark || "")}</textarea></label>
    </form>`;
  }

  function categoryTableHtml() {
    const list = getCategories().slice().sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0));
    const rows = list.length
      ? list.map((item) => `<tr data-category-id="${attr(item.categoryId)}"><td>${text(item.name)}</td><td>${text(item.code)}</td><td>${Number(item.sort || 0)}</td><td>${item.icon ? `<i class="fa-solid ${attr(item.icon)}"></i>` : "-"}</td><td>${text(item.remark || "-")}</td><td><button class="table-action" type="button" data-cat-action="edit" data-category-id="${attr(item.categoryId)}">编辑</button> <button class="table-action" type="button" data-cat-action="delete" data-category-id="${attr(item.categoryId)}">删除</button></td></tr>`).join("")
      : `<tr><td colspan="6"><div class="emergency-empty">暂无分类</div></td></tr>`;
    return `<div class="emergency-category-toolbar"><span>维护物资分类，供列表筛选与表单选择</span><button class="btn btn-primary" type="button" data-cat-action="create"><i class="fa-solid fa-plus"></i> 新增分类</button></div>
      <div class="table-wrap"><table class="table emergency-category-table"><thead><tr><th>分类名称</th><th>分类编码</th><th>排序</th><th>图标</th><th>备注</th><th>操作</th></tr></thead><tbody data-cat-body>${rows}</tbody></table></div>`;
  }

  function openCategoryFormModal(item = {}) {
    document.querySelectorAll(".emergency-category-form-mask").forEach((node) => node.remove());
    const isEdit = Boolean(item.categoryId);
    const mask = document.createElement("div");
    mask.className = "emergency-category-form-mask";
    mask.innerHTML = `<div class="emergency-category-form-modal" role="dialog" aria-modal="true">
      <div class="em-cat-head"><h2>${isEdit ? "编辑分类" : "新增分类"}</h2><button type="button" class="em-cat-close" data-cat-form-close aria-label="关闭">×</button></div>
      <div class="em-cat-body">${categoryForm(item)}</div>
      <div class="em-cat-foot"><button class="btn btn-secondary" type="button" data-cat-form-close>取消</button><button class="btn btn-primary" type="button" data-cat-action="save">保存</button></div>
    </div>`;
    document.body.appendChild(mask);
    mask.addEventListener("click", (event) => {
      if (event.target === mask || event.target.closest("[data-cat-form-close]")) {
        mask.remove();
        return;
      }
      if (!event.target.closest('[data-cat-action="save"]')) return;
      const formNode = document.getElementById("resourceCategoryForm");
      if (!formNode?.reportValidity()) return;
      const data = Object.fromEntries(new FormData(formNode).entries());
      data.categoryId = formNode.dataset.categoryId || undefined;
      data.sort = Number(data.sort || 0);
      try {
        store().saveResourceCategory(data);
        mask.remove();
        state.categories = getCategories();
        const host = document.querySelector("[data-cat-manager]");
        if (host) host.innerHTML = categoryTableHtml();
        options();
        ui.showToast("分类已保存");
      } catch (error) { ui.showApiError(error); }
    });
  }

  function openCategoryManager() {
    ui.openEntityDrawer({
      title: "物资分类",
      body: `<div data-cat-manager>${categoryTableHtml()}</div>`,
      footer: `<button class="btn btn-secondary" type="button" data-drawer-close>关闭</button>`,
    });
  }

  function init() {
    if (!document.getElementById("resourceBody") || !ui) return;
    refresh();
    document.addEventListener("click", (event) => {
      const moreBtn = event.target.closest('[data-resource-action="more"]');
      if (moreBtn) {
        event.stopPropagation();
        openMoreMenu(moreBtn, moreBtn.dataset.resourceId);
        return;
      }
      if (!event.target.closest(".emergency-more-menu")) closeMoreMenu();

      const catAction = event.target.closest("[data-cat-action]");
      if (catAction && document.querySelector("[data-cat-manager]") && !event.target.closest(".emergency-category-form-mask")) {
        const type = catAction.dataset.catAction;
        const id = catAction.dataset.categoryId;
        if (type === "create") openCategoryFormModal({});
        else if (type === "edit") openCategoryFormModal(getCategories().find((item) => item.categoryId === id) || {});
        else if (type === "delete") {
          const item = getCategories().find((entry) => entry.categoryId === id);
          const used = state.records.some((record) => normalize(record).category === item?.name);
          if (used) { ui.showToast("该分类下仍有物资，无法删除", "error"); return; }
          store().removeResourceCategory(id);
          state.categories = getCategories();
          const host = document.querySelector("[data-cat-manager]");
          if (host) host.innerHTML = categoryTableHtml();
          options();
          ui.showToast("分类已删除");
        }
      }

      const detailTab = event.target.closest("[data-resource-detail-tab]");
      if (detailTab) {
        detail(detailTab.dataset.resourceId, detailTab.dataset.resourceDetailTab);
        return;
      }

      const action = event.target.closest("[data-resource-action]");
      if (action) {
        const type = action.dataset.resourceAction;
        const id = action.dataset.resourceId;
        closeMoreMenu();
        if (type === "create") openForm();
        else if (type === "edit") openForm(id);
        else if (type === "detail") detail(id);
        else if (["inbound", "outbound", "lock", "release"].includes(type)) openStock(id, type);
        else if (type === "transfer") transfer(id);
        else if (type === "delete") removeResource(id);
        else if (type === "export") exportResources();
        else if (type === "categories") openCategoryManager();
        else if (type === "point-select") openPointPicker();
        else if (type === "filter") { state.page = 1; render(); }
        else if (type === "reset") {
          ["resourceKeyword", "resourceCategory", "resourceWarehouse", "resourceStatus", "resourceAlert"].forEach((field) => ui.setValue(field, ""));
          state.page = 1;
          render();
        }
      }
      if (event.target.closest("[data-resource-save]")) saveForm();
      if (event.target.closest("[data-stock-save]")) saveStock();
      const transferButton = event.target.closest("[data-transfer-save]");
      if (transferButton) saveTransfer(transferButton.dataset.resourceId);
      if (event.target.closest("[data-page-prev]")) { state.page = Math.max(1, state.page - 1); render(); }
      if (event.target.closest("[data-page-next]")) { state.page += 1; render(); }
    });
    ["resourceKeyword", "resourceCategory", "resourceWarehouse", "resourceStatus", "resourceAlert"].forEach((id) => {
      document.getElementById(id)?.addEventListener("change", () => { state.page = 1; render(); });
    });
    document.getElementById("resourceKeyword")?.addEventListener("input", () => { state.page = 1; render(); });
    window.addEventListener("storage", (event) => { if (!event.key || event.key.includes("emergency")) refresh(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
