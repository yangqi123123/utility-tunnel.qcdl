(function () {
  const state = { filters: {}, page: 1 };
  const pageSize = 10;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function rows() {
    const filters = state.filters;
    return window.CARBON_SETTING_DATA.filter((item) => (!filters.factorName || item.factorName.includes(filters.factorName)) && (!filters.energyType || item.energyType === filters.energyType));
  }

  function normalizeDefaults() {
    window.CARBON_SETTING_OPTIONS.forEach((energyType) => {
      const group = window.CARBON_SETTING_DATA.filter((item) => item.energyType === energyType);
      if (!group.length) return;
      const selected = group.find((item) => item.isDefault) || group[0];
      group.forEach((item) => { item.isDefault = item.id === selected.id; });
    });
  }

  function renderFilters() {
    document.getElementById("carbonSettingFilters").innerHTML = `<section class="card setting-filter-card"><div class="setting-filter-fields"><label class="form-field"><span class="form-label">因子名称</span><input class="form-control" data-setting-filter="factorName" value="${escapeHtml(state.filters.factorName || "")}" placeholder="请输入"></label><label class="form-field"><span class="form-label">能源类型</span><select class="form-control" data-setting-filter="energyType"><option value="">请选择</option>${window.CARBON_SETTING_OPTIONS.map((item) => `<option value="${item}" ${item === state.filters.energyType ? "selected" : ""}>${item}</option>`).join("")}</select></label><div class="setting-filter-actions"><button class="btn btn-secondary" type="button" data-setting-action="reset">重置</button><button class="btn btn-primary" type="button" data-setting-action="search">搜索</button></div></div></section>`;
  }

  function renderTable() {
    const filtered = rows();
    const start = (state.page - 1) * pageSize;
    const visible = filtered.slice(start, start + pageSize);
    document.getElementById("carbonSettingTableBody").innerHTML = visible.length ? visible.map((item) => `<tr><td>${escapeHtml(item.factorName)}${item.isDefault ? '<span class="setting-default-tag">默认</span>' : ""}</td><td>${escapeHtml(item.energyType)}</td><td>${escapeHtml(item.industry)}</td><td>${item.coefficient}</td><td>${escapeHtml(item.unit)}</td><td>${escapeHtml(item.sourceInfo)}</td><td>${item.sourceYear}</td><td class="setting-actions"><button class="table-action" type="button" data-setting-row-action="edit" data-setting-id="${item.id}">编辑</button><button class="table-action ${item.isDefault ? "is-disabled" : "status-danger"}" type="button" data-setting-row-action="delete" data-setting-id="${item.id}" ${item.isDefault ? "disabled" : ""}>删除</button>${item.isDefault ? '<span class="setting-default-hint">当前默认</span>' : `<button class="table-action" type="button" data-setting-row-action="default" data-setting-id="${item.id}">设为默认</button>`}</td></tr>`).join("") : `<tr><td colspan="8"><div class="setting-empty"><i class="fa-solid fa-sliders" aria-hidden="true"></i><span>暂无数据</span></div></td></tr>`;
    renderPagination(filtered.length);
  }

  function renderPagination(total) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    state.page = Math.min(state.page, totalPages);
    document.getElementById("carbonSettingPagination").innerHTML = `<div class="pagination setting-pagination"><span>共 <strong>${total}</strong> 条</span><span class="setting-page-size">10条/页</span><button class="page-item" type="button" data-setting-page="prev" ${state.page === 1 ? "disabled" : ""}>‹</button><span class="page-item active">${state.page}</span><button class="page-item" type="button" data-setting-page="next" ${state.page === totalPages ? "disabled" : ""}>›</button></div>`;
  }

  function fieldValue(selector) {
    return document.querySelector(selector)?.value?.trim() || "";
  }

  function openFactorDrawer(mode, item) {
    const editing = mode === "edit";
    const current = item || { energyType: "", factorName: "", coefficient: "", unit: "", industry: "", sourceInfo: "", sourceYear: "" };
    const body = `<form class="setting-form" data-setting-form><label class="form-field form-item"><span class="form-label form-required">能源分类</span><select class="form-control" data-setting-field="energyType"><option value="">请选择</option>${window.CARBON_SETTING_OPTIONS.map((option) => `<option value="${option}" ${option === current.energyType ? "selected" : ""}>${option}</option>`).join("")}</select></label><label class="form-field form-item"><span class="form-label form-required">因子名称</span><input class="form-control" data-setting-field="factorName" value="${escapeHtml(current.factorName)}" placeholder="请输入"></label><label class="form-field form-item"><span class="form-label form-required">二氧化碳当量</span><input class="form-control" type="number" step="0.0001" data-setting-field="coefficient" value="${escapeHtml(current.coefficient)}" placeholder="请输入"></label><label class="form-field form-item"><span class="form-label form-required">因子单位</span><input class="form-control" data-setting-field="unit" value="${escapeHtml(current.unit)}" placeholder="请输入"></label><label class="form-field form-item"><span class="form-label form-required">适用行业</span><input class="form-control" data-setting-field="industry" value="${escapeHtml(current.industry)}" placeholder="请输入"></label><label class="form-field form-item"><span class="form-label form-required">来源信息</span><textarea class="form-control textarea" maxlength="200" data-setting-field="sourceInfo" placeholder="请输入">${escapeHtml(current.sourceInfo)}</textarea><span class="setting-char-count" data-setting-count>0 / 200</span></label><label class="form-field form-item"><span class="form-label form-required">来源年份</span><input class="form-control" type="number" min="2000" max="2100" data-setting-field="sourceYear" value="${escapeHtml(current.sourceYear)}" placeholder="选择年份"></label></form>`;
    window.openAppDrawer({ title: editing ? "编辑" : "新增", subtitle: "能源管理 · 碳排放设置", body, footer: `<button class="btn btn-secondary" type="button" data-drawer-close>取消</button><button class="btn btn-primary" type="button" data-setting-drawer-action="save">确定</button>` });
    document.querySelector("[data-setting-drawer-action=save]").dataset.settingMode = mode;
    document.querySelector("[data-setting-drawer-action=save]").dataset.settingId = item?.id || "";
    const sourceInfo = document.querySelector("[data-setting-field=sourceInfo]");
    const count = document.querySelector("[data-setting-count]");
    const updateCount = () => { count.textContent = `${sourceInfo.value.length} / 200`; };
    sourceInfo.addEventListener("input", updateCount);
    updateCount();
  }

  function saveFactor(button) {
    const values = Object.fromEntries([...document.querySelectorAll("[data-setting-field]")].map((field) => [field.dataset.settingField, field.value.trim()]));
    if (!values.energyType || !values.factorName || !values.coefficient || !values.unit || !values.industry || !values.sourceInfo || !values.sourceYear) return;
    const mode = button.dataset.settingMode;
    const id = Number(button.dataset.settingId);
    if (mode === "edit") {
      const item = window.CARBON_SETTING_DATA.find((entry) => entry.id === id);
      if (item) Object.assign(item, { ...values, coefficient: Number(values.coefficient), sourceYear: Number(values.sourceYear) });
    } else {
      window.CARBON_SETTING_DATA.push({ id: Date.now(), ...values, coefficient: Number(values.coefficient), sourceYear: Number(values.sourceYear), isDefault: !window.CARBON_SETTING_DATA.some((entry) => entry.energyType === values.energyType) });
    }
    normalizeDefaults();
    window.closeAppDrawer();
    state.page = 1;
    renderTable();
  }

  function setDefault(id) {
    const target = window.CARBON_SETTING_DATA.find((item) => item.id === id);
    if (!target) return;
    window.CARBON_SETTING_DATA.forEach((item) => { if (item.energyType === target.energyType) item.isDefault = item.id === target.id; });
    renderTable();
  }

  function removeItem(id) {
    const index = window.CARBON_SETTING_DATA.findIndex((item) => item.id === id);
    if (index >= 0 && !window.CARBON_SETTING_DATA[index].isDefault) window.CARBON_SETTING_DATA.splice(index, 1);
    renderTable();
  }

  function render() { renderFilters(); renderTable(); }

  document.addEventListener("DOMContentLoaded", () => {
    normalizeDefaults();
    render();
    document.addEventListener("click", (event) => {
      const action = event.target.closest("[data-setting-action]")?.dataset.settingAction;
      const rowAction = event.target.closest("[data-setting-row-action]");
      const drawerAction = event.target.closest("[data-setting-drawer-action]");
      const pageAction = event.target.closest("[data-setting-page]")?.dataset.settingPage;
      if (action === "search") { state.filters = Object.fromEntries([...document.querySelectorAll("[data-setting-filter]")].map((field) => [field.dataset.settingFilter, field.value.trim()])); state.page = 1; renderTable(); }
      if (action === "reset") { state.filters = {}; state.page = 1; renderFilters(); renderTable(); }
      if (action === "create") openFactorDrawer("create");
      if (rowAction) { const item = window.CARBON_SETTING_DATA.find((entry) => entry.id === Number(rowAction.dataset.settingId)); if (rowAction.dataset.settingRowAction === "edit") openFactorDrawer("edit", item); if (rowAction.dataset.settingRowAction === "default") setDefault(item?.id); if (rowAction.dataset.settingRowAction === "delete") window.openAppConfirm({ title: "提示", message: `确认删除因子「${item?.factorName || ""}」吗？`, onConfirm: () => removeItem(item?.id) }); }
      if (drawerAction?.dataset.settingDrawerAction === "save") saveFactor(drawerAction);
      if (pageAction) { const totalPages = Math.max(1, Math.ceil(rows().length / pageSize)); state.page = pageAction === "prev" ? Math.max(1, state.page - 1) : Math.min(totalPages, state.page + 1); renderTable(); }
    });
  });
})();
