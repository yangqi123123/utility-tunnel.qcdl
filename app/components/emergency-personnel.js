(function () {
  const ui = window.EMERGENCY_UI;
  let state = { records: [], filtered: [], categories: [], page: 1, pageSize: 10, editId: "" };
  const store = () => window.EMERGENCY_STORE;
  const text = (value) => ui.escapeHtml(value || "-");
  const attr = (value) => text(value).replaceAll("'", "&#39;");

  function normalize(item) {
    return {
      ...item,
      unit: item.unit || item.organization || "未分配部门",
      type: item.type || item.personType || "管廊运维",
      mobile: item.mobile || item.phone || "-",
      onlineStatus: item.onlineStatus || item.status || "离线",
      dispatchStatus: item.dispatchStatus || "不可调度",
      location: item.location || item.section || (item.longitude ? `${item.longitude}, ${item.latitude}` : "未定位"),
      position: item.position || item.post || item.role || "-",
      tags: Array.isArray(item.tags) ? item.tags : (Array.isArray(item.specialties) ? item.specialties : []),
      longitude: item.longitude != null ? Number(item.longitude) : "",
      latitude: item.latitude != null ? Number(item.latitude) : "",
    };
  }

  function getRecords() {
    try { return Array.isArray(store()?.listPersonnel?.()) ? store().listPersonnel() : []; }
    catch (error) { ui.showApiError(error); return []; }
  }

  function getCategories() {
    try { return Array.isArray(store()?.listPersonnelCategories?.()) ? store().listPersonnelCategories() : []; }
    catch { return []; }
  }

  function categoryNames() {
    const fromStore = state.categories.map((item) => item.name).filter(Boolean);
    if (fromStore.length) return fromStore.sort((a, b) => a.localeCompare(b, "zh"));
    return [...new Set(state.records.map((item) => normalize(item).type).filter(Boolean))];
  }

  function options() {
    const units = [...new Set(state.records.map((item) => normalize(item).unit).filter(Boolean))];
    const types = categoryNames();
    document.getElementById("personnelUnit").innerHTML = `<option value="">全部部门</option>${units.map((item) => `<option>${text(item)}</option>`).join("")}`;
    document.getElementById("personnelType").innerHTML = `<option value="">全部分类</option>${types.map((item) => `<option>${text(item)}</option>`).join("")}`;
  }

  function filtered() {
    const keyword = ui.value("personnelKeyword").toLowerCase();
    const unit = ui.value("personnelUnit");
    const type = ui.value("personnelType");
    const status = ui.value("personnelStatus");
    const dispatch = ui.value("personnelDispatch");
    state.filtered = state.records.filter((raw) => {
      const item = normalize(raw);
      const haystack = `${item.name || ""} ${item.mobile || ""} ${item.unit || ""}`.toLowerCase();
      return (!keyword || haystack.includes(keyword))
        && (!unit || item.unit === unit)
        && (!type || item.type === type)
        && (!status || item.onlineStatus === status)
        && (!dispatch || item.dispatchStatus === dispatch);
    });
    const pages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
    state.page = Math.min(state.page, pages);
  }

  function closeMoreMenu() {
    document.querySelectorAll(".emergency-more-menu").forEach((node) => node.remove());
  }

  function openMoreMenu(button, id) {
    closeMoreMenu();
    const bound = Boolean(store()?.isPersonBound?.(id));
    const menu = document.createElement("div");
    menu.className = "emergency-more-menu";
    menu.innerHTML = [
      ["edit", "编辑"],
      ["delete", "删除", true],
    ].map(([action, label, danger]) => `<button type="button" data-person-action="${action}" data-person-id="${attr(id)}" class="${danger ? "is-danger" : ""}" ${action === "delete" && bound ? "disabled title=\"该人员已被调度绑定，不允许删除\"" : ""}>${label}</button>`).join("");
    document.body.appendChild(menu);
    const rect = button.getBoundingClientRect();
    const top = Math.min(rect.bottom + 4, window.innerHeight - menu.offsetHeight - 8);
    const left = Math.min(Math.max(8, rect.right - menu.offsetWidth), window.innerWidth - menu.offsetWidth - 8);
    menu.style.top = `${Math.max(8, top)}px`;
    menu.style.left = `${left}px`;
  }

  function render() {
    filtered();
    const start = (state.page - 1) * state.pageSize;
    const rows = state.filtered.slice(start, start + state.pageSize);
    document.getElementById("personnelBody").innerHTML = rows.length
      ? rows.map((raw) => {
        const item = normalize(raw);
        return `<tr data-person-id="${attr(item.personId)}">
          <td><strong>${text(item.name)}</strong></td>
          <td>${text(item.unit)}</td>
          <td>${text(item.type)}</td>
          <td>${text(item.mobile)}</td>
          <td>${ui.renderStatus(item.onlineStatus)}</td>
          <td>${text(item.location)}</td>
          <td>${ui.renderStatus(item.dispatchStatus)}</td>
          <td class="emergency-ledger-actions">
            <button class="table-action" type="button" data-person-action="detail" data-person-id="${attr(item.personId)}">详情</button>
            <button class="table-action" type="button" data-person-action="more" data-person-id="${attr(item.personId)}">更多</button>
          </td>
        </tr>`;
      }).join("")
      : `<tr><td colspan="8"><div class="emergency-empty">暂无匹配人员</div></td></tr>`;
    document.getElementById("personnelCount").innerHTML = ui.renderPagination({
      total: state.filtered.length, page: state.page, pageSize: state.pageSize, id: "personnelPagination",
    });
  }

  function refresh() {
    state.records = getRecords();
    state.categories = getCategories();
    options();
    render();
  }

  function categorySelect(selected) {
    return categoryNames().map((name) => `<option value="${attr(name)}" ${name === selected ? "selected" : ""}>${text(name)}</option>`).join("");
  }

  function form(item = {}) {
    const record = normalize(item);
    const lng = record.longitude === "" ? "" : Number(record.longitude).toFixed(6);
    const lat = record.latitude === "" ? "" : Number(record.latitude).toFixed(6);
    return `<form id="personnelForm" class="emergency-form-grid" data-person-form data-person-id="${attr(record.personId || "")}">
      <label class="form-field"><span class="form-label">姓名 <b class="form-required"></b></span><input class="form-control" name="name" required value="${text(record.name === "-" ? "" : record.name)}"></label>
      <label class="form-field"><span class="form-label">手机号 <b class="form-required"></b></span><input class="form-control" name="mobile" required value="${text(record.mobile === "-" ? "" : record.mobile)}"></label>
      <label class="form-field"><span class="form-label">所属部门 <b class="form-required"></b></span><input class="form-control" name="unit" required value="${text(record.unit === "未分配部门" ? "" : record.unit)}"></label>
      <label class="form-field"><span class="form-label">人员分类 <b class="form-required"></b></span><select class="form-control" name="type" required><option value="">请选择分类</option>${categorySelect(record.type)}</select></label>
      <label class="form-field"><span class="form-label">当前状态 <b class="form-required"></b></span><select class="form-control" name="onlineStatus" required>${["在线", "离线", "忙碌", "休假"].map((option) => `<option ${option === record.onlineStatus ? "selected" : ""}>${option}</option>`).join("")}</select></label>
      <label class="form-field"><span class="form-label">可调度状态 <b class="form-required"></b></span><select class="form-control" name="dispatchStatus" required>${["可调度", "已调度", "不可调度"].map((option) => `<option ${option === record.dispatchStatus ? "selected" : ""}>${option}</option>`).join("")}</select></label>
      <label class="form-field"><span class="form-label">部门 / 岗位</span><input class="form-control" name="role" value="${text(record.position === "-" ? "" : record.position)}"></label>
      <label class="form-field"><span class="form-label">值班时间</span><input class="form-control" name="dutyTime" value="${text(record.dutyTime || "")}"></label>
      <label class="form-field full"><span class="form-label">所在位置 <b class="form-required"></b></span><input class="form-control" name="section" required value="${text(record.section || (record.location === "未定位" ? "" : record.location))}"></label>
      <div class="emergency-form-section">点位信息</div>
      <div class="emergency-point-row form-field full">
        <label class="form-field"><span class="form-label">经度</span><input class="form-control" name="longitude" data-point-lng readonly placeholder="点位选择后回显" value="${lng}"></label>
        <label class="form-field"><span class="form-label">纬度</span><input class="form-control" name="latitude" data-point-lat readonly placeholder="点位选择后回显" value="${lat}"></label>
        <button class="btn btn-secondary" type="button" data-person-action="point-select">点位选择</button>
      </div>
    </form>`;
  }

  function openForm(id = "") {
    state.editId = id;
    const item = id ? state.records.find((record) => record.personId === id) : {};
    ui.openEntityDrawer({
      title: id ? "编辑应急通讯录" : "新增应急通讯录",
      body: form(item),
      footer: `<button class="btn btn-secondary" type="button" data-drawer-close>取消</button><button class="btn btn-primary" type="button" data-person-save>保存人员</button>`,
    });
  }

  function categoryMeta(name) {
    const colors = ["#135afa", "#00a870", "#ed7b2f", "#e34d59", "#8b5cf6", "#0f766e"];
    const found = state.categories.find((item) => item.name === name);
    const index = Math.max(0, categoryNames().indexOf(name));
    return {
      color: colors[index % colors.length],
      icon: found?.icon || "fa-user",
    };
  }

  function openPointPicker() {
    const formNode = document.querySelector("[data-person-form]");
    if (!formNode) return;
    const currentId = formNode.dataset.personId;
    const name = formNode.querySelector('[name="name"]')?.value.trim() || "当前人员";
    const type = formNode.querySelector('[name="type"]')?.value || "";
    const peers = state.records
      .filter((item) => item.personId !== currentId)
      .map((item) => {
        const record = normalize(item);
        const meta = categoryMeta(record.type);
        return {
          id: record.personId,
          name: record.name,
          longitude: record.longitude,
          latitude: record.latitude,
          legend: record.type,
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
      currentIcon: categoryMeta(type).icon,
      note: "点击管廊地图选择人员点位",
      peers,
      legend,
      onConfirm: (point) => {
        formNode.querySelector("[data-point-lng]").value = point.longitude.toFixed(6);
        formNode.querySelector("[data-point-lat]").value = point.latitude.toFixed(6);
      },
    });
  }

  function detail(id) {
    const raw = state.records.find((record) => record.personId === id) || {};
    const item = normalize(raw);
    const pairs = [
      ["人员编号", item.personId], ["所属部门", item.unit], ["人员分类", item.type],
      ["部门 / 岗位", item.position], ["手机号", item.mobile], ["座机 / 分机", item.phone || "-"],
      ["当前状态", item.onlineStatus], ["可调度状态", item.dispatchStatus],
      ["值班时间", item.dutyTime || "-"], ["所在位置", item.location],
      ["经度", item.longitude === "" ? "-" : Number(item.longitude).toFixed(6)],
      ["纬度", item.latitude === "" ? "-" : Number(item.latitude).toFixed(6)],
      ["专业标签", item.tags.join("、") || "-"], ["最近更新", item.updatedAt || "-"],
    ];
    ui.openEntityDrawer({
      title: `${item.name} · 应急通讯录`,
      body: `<div class="emergency-detail-grid">${pairs.map(([label, value]) => `<div class="emergency-detail-item"><span class="emergency-detail-label">${label}</span><span class="emergency-detail-value">${label.includes("状态") ? ui.renderStatus(value) : text(value)}</span></div>`).join("")}</div>`,
      footer: `<button class="btn btn-secondary" type="button" data-drawer-close>关闭</button><button class="btn btn-primary" type="button" data-person-action="edit" data-person-id="${attr(id)}">编辑</button>`,
    });
  }

  function save() {
    const formNode = document.getElementById("personnelForm");
    if (!formNode?.reportValidity()) return;
    const data = Object.fromEntries(new FormData(formNode).entries());
    data.personId = state.editId || undefined;
    data.longitude = data.longitude ? Number(data.longitude) : "";
    data.latitude = data.latitude ? Number(data.latitude) : "";
    data.updatedAt = ui.nowText();
    try {
      if (!store()?.savePerson) throw new Error("人员数据服务尚未就绪");
      store().savePerson(data);
      window.closeAppDrawer?.();
      refresh();
      ui.showToast(state.editId ? "人员信息已更新" : "人员已加入通讯录");
    } catch (error) { ui.showApiError(error); }
  }

  function removePerson(id) {
    const item = normalize(state.records.find((record) => record.personId === id) || {});
    const run = () => {
      try {
        store().removePerson(id);
        refresh();
        ui.showToast("人员已删除");
      } catch (error) { ui.showApiError(error); }
    };
    if (typeof window.openAppConfirm === "function") {
      window.openAppConfirm({ title: "删除人员", message: `确认删除「${item.name}」吗？`, confirmText: "确认删除", onConfirm: run });
    } else if (window.confirm(`确认删除「${item.name}」吗？`)) run();
  }

  function exportPersonnel() {
    if (!window.XLSX) { ui.showToast("Excel 组件加载失败，请刷新页面后重试", "error"); return; }
    const rows = state.filtered.map((raw) => {
      const item = normalize(raw);
      return {
        姓名: item.name,
        所属部门: item.unit,
        人员分类: item.type,
        手机号: item.mobile,
        当前状态: item.onlineStatus,
        可调度状态: item.dispatchStatus,
        所在位置: item.location,
        部门岗位: item.position,
        值班时间: item.dutyTime || "",
        经度: item.longitude === "" ? "" : Number(item.longitude).toFixed(6),
        纬度: item.latitude === "" ? "" : Number(item.latitude).toFixed(6),
      };
    });
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "应急通讯录");
    const content = XLSX.write(book, { bookType: "xlsx", type: "array" });
    const blob = new Blob([content], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "应急通讯录.xlsx";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function categoryForm(item = {}) {
    return `<form id="personnelCategoryForm" class="emergency-category-form" data-category-id="${attr(item.categoryId || "")}">
      <label class="form-field"><span class="form-label">分类名称 <b class="form-required"></b></span><input class="form-control" name="name" required value="${text(item.name || "")}"></label>
      <label class="form-field"><span class="form-label">分类编码 <b class="form-required"></b></span><input class="form-control" name="code" required value="${text(item.code || "")}"></label>
      <label class="form-field"><span class="form-label">显示排序</span><input class="form-control" name="sort" type="number" min="0" step="1" value="${Number(item.sort || 0)}"></label>
      ${ui.renderCategoryIconField(item.icon || "fa-user")}
      <label class="form-field full"><span class="form-label">备注</span><textarea class="form-control" name="remark" rows="3">${text(item.remark || "")}</textarea></label>
    </form>`;
  }

  function categoryTableHtml() {
    const list = getCategories().slice().sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0));
    const rows = list.length
      ? list.map((item) => `<tr data-category-id="${attr(item.categoryId)}"><td>${text(item.name)}</td><td>${text(item.code)}</td><td>${Number(item.sort || 0)}</td><td>${item.icon ? `<i class="fa-solid ${attr(item.icon)}"></i>` : "-"}</td><td>${text(item.remark || "-")}</td><td><button class="table-action" type="button" data-cat-action="edit" data-category-id="${attr(item.categoryId)}">编辑</button> <button class="table-action" type="button" data-cat-action="delete" data-category-id="${attr(item.categoryId)}">删除</button></td></tr>`).join("")
      : `<tr><td colspan="6"><div class="emergency-empty">暂无分类</div></td></tr>`;
    return `<div class="emergency-category-toolbar"><span>维护人员分类，供列表筛选与表单选择</span><button class="btn btn-primary" type="button" data-cat-action="create"><i class="fa-solid fa-plus"></i> 新增分类</button></div>
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
      const formNode = document.getElementById("personnelCategoryForm");
      if (!formNode?.reportValidity()) return;
      const data = Object.fromEntries(new FormData(formNode).entries());
      data.categoryId = formNode.dataset.categoryId || undefined;
      data.sort = Number(data.sort || 0);
      try {
        store().savePersonnelCategory(data);
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
      title: "人员分类",
      body: `<div data-cat-manager>${categoryTableHtml()}</div>`,
      footer: `<button class="btn btn-secondary" type="button" data-drawer-close>关闭</button>`,
    });
  }

  function init() {
    if (!document.getElementById("personnelBody") || !ui) return;
    refresh();
    document.addEventListener("click", (event) => {
      const moreBtn = event.target.closest('[data-person-action="more"]');
      if (moreBtn) {
        event.stopPropagation();
        openMoreMenu(moreBtn, moreBtn.dataset.personId);
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
          const used = state.records.some((record) => normalize(record).type === item?.name);
          if (used) { ui.showToast("该分类下仍有人员，无法删除", "error"); return; }
          store().removePersonnelCategory(id);
          state.categories = getCategories();
          const host = document.querySelector("[data-cat-manager]");
          if (host) host.innerHTML = categoryTableHtml();
          options();
          ui.showToast("分类已删除");
        }
      }

      const action = event.target.closest("[data-person-action]");
      if (action) {
        const type = action.dataset.personAction;
        const id = action.dataset.personId;
        closeMoreMenu();
        if (type === "create") openForm();
        else if (type === "edit") openForm(id);
        else if (type === "detail") detail(id);
        else if (type === "delete") removePerson(id);
        else if (type === "export") exportPersonnel();
        else if (type === "categories") openCategoryManager();
        else if (type === "point-select") openPointPicker();
        else if (type === "filter") { state.page = 1; render(); }
        else if (type === "reset") {
          ["personnelKeyword", "personnelUnit", "personnelType", "personnelStatus", "personnelDispatch"].forEach((field) => ui.setValue(field, ""));
          state.page = 1;
          render();
        }
      }
      if (event.target.closest("[data-person-save]")) save();
      if (event.target.closest("[data-page-prev]")) { state.page = Math.max(1, state.page - 1); render(); }
      if (event.target.closest("[data-page-next]")) { state.page += 1; render(); }
    });
    ["personnelKeyword", "personnelUnit", "personnelType", "personnelStatus", "personnelDispatch"].forEach((id) => {
      document.getElementById(id)?.addEventListener("change", () => { state.page = 1; render(); });
    });
    document.getElementById("personnelKeyword")?.addEventListener("input", () => { state.page = 1; render(); });
    window.addEventListener("storage", (event) => { if (!event.key || event.key.includes("emergency")) refresh(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
