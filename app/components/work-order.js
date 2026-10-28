(function () {
  const page = document.body?.dataset?.workOrderPage;
  if (!page || !window.WORK_ORDER_STORE) return;

  const data = window.WORK_ORDER_DATA;
  const store = window.WORK_ORDER_STORE;
  const state = {
    page,
    filters: {},
    pageIndex: 1,
    pageSize: 10,
    catTab: "报事报修",
    expanded: new Set(),
    picker: { open: false, selectedId: "", target: null, deptId: "", keyword: "" },
  };

  const isDeviceAbnormalPage = page === "device-abnormal";
  const pageBizType = isDeviceAbnormalPage ? "设备异常" : "报事报修";

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));

  const now = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  };

  const toast = (msg) => {
    if (typeof window.showAppToast === "function") {
      window.showAppToast(msg);
      return;
    }
    let el = document.querySelector(".inspection-toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "inspection-toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => el.classList.remove("show"), 2200);
  };

  const locationText = (item) => [item.corridor, item.room, item.section, item.pipeline].filter(Boolean).join(" / ") || "-";

  const STATUS_CLASS = {
    待指派: "assign",
    待处理: "pending",
    处理中: "processing",
    验收中: "review",
    已完成: "done",
    已撤回: "withdrawn",
    正常: "normal",
    停用: "disabled",
  };

  const statusTag = (text) => {
    const type = STATUS_CLASS[text] || "disabled";
    return `<span class="wo-status wo-status-${type}">${esc(text)}</span>`;
  };

  const LEVEL_CLASS = { 重大: "danger", 较大: "warning", 一般: "muted" };
  const abnormalLevelTag = (level) => {
    const text = String(level || "").trim();
    if (!text) return "-";
    const type = LEVEL_CLASS[text] || "muted";
    return `<span class="inspection-status inspection-status-${type}">${esc(text)}</span>`;
  };

  const formatPhone = (phone) => {
    const digits = String(phone || "").replace(/\D/g, "");
    if (digits.length === 11) return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
    return phone || "-";
  };

  const hideMoreMenus = () => document.querySelectorAll(".inspection-more-menu").forEach((menu) => menu.remove());
  window.addEventListener("scroll", hideMoreMenus, true);
  window.addEventListener("resize", hideMoreMenus);

  function bindLocationCascade(root, { includeProject = true } = {}) {
    if (!root || root.dataset.locationBound) return;
    root.dataset.locationBound = "true";
    const locationTree = data.locationTree || [];
    const levels = includeProject
      ? ["project", "corridor", "room", "section", "pipeline"]
      : ["corridor", "room", "section", "pipeline"];
    const labels = {
      project: "所属项目",
      corridor: "所属管廊",
      room: "所属舱室",
      section: "所属区段",
      pipeline: "所属管线",
    };
    const isFilter = root.hasAttribute("data-wo-location-filter");
    const values = Object.fromEntries(levels.map((key) => [key, root.querySelector(`[data-location-level="${key}"]`)?.dataset.locationValue || ""]));

    const findCorridor = (name) => {
      for (const project of locationTree) {
        const corridor = (project.corridors || []).find((item) => item.name === name);
        if (corridor) return { project, corridor };
      }
      return null;
    };

    const externalProject = () => root.closest(".drawer-body, [data-wo-form], form")?.querySelector('[data-wo-field="project"]')?.value || "";

    const optionsFor = (index) => {
      const key = levels[index];
      if (includeProject) {
        if (key === "project") return locationTree;
        const project = locationTree.find((item) => item.name === values.project);
        if (key === "corridor") return project?.corridors || [];
        const corridor = project?.corridors?.find((item) => item.name === values.corridor);
        if (key === "room") return corridor?.rooms || [];
        const room = corridor?.rooms?.find((item) => item.name === values.room);
        if (key === "section") return room?.sections || [];
        const section = room?.sections?.find((item) => item.name === values.section);
        return (section?.pipelines || []).map((name) => ({ name }));
      }

      const projectName = externalProject();
      if (key === "corridor") {
        if (projectName) return locationTree.find((item) => item.name === projectName)?.corridors || [];
        return locationTree.flatMap((item) => item.corridors || []);
      }
      const found = findCorridor(values.corridor);
      if (key === "room") return found?.corridor?.rooms || [];
      const room = found?.corridor?.rooms?.find((item) => item.name === values.room);
      if (key === "section") return room?.sections || [];
      const section = room?.sections?.find((item) => item.name === values.section);
      return (section?.pipelines || []).map((name) => ({ name }));
    };

    const render = () => levels.forEach((key, index) => {
      const field = root.querySelector(`[data-location-level="${key}"]`);
      if (!field) return;
      const options = optionsFor(index);
      const emptyLabel = isFilter ? "全部" : `请选择${labels[key]}`;
      field.innerHTML = `<option value="">${esc(emptyLabel)}</option>${options.map((item) => `<option value="${esc(item.name)}">${esc(item.name)}</option>`).join("")}`;
      field.value = values[key] || "";
      field.disabled = index > 0 && !values[levels[index - 1]];
    });

    render();
    root.addEventListener("change", (event) => {
      const field = event.target.closest("[data-location-level]");
      if (!field) return;
      const index = levels.indexOf(field.dataset.locationLevel);
      if (index < 0) return;
      values[field.dataset.locationLevel] = field.value;
      levels.slice(index + 1).forEach((key) => { values[key] = ""; });
      render();
    });
  }

  function categoriesOfType(workType) {
    return store.getCategories()
      .filter((c) => c.workType === workType)
      .sort((a, b) => a.sort - b.sort || a.code.localeCompare(b.code));
  }

  function childrenOf(id) {
    return store.getCategories()
      .filter((c) => c.parentId === id)
      .sort((a, b) => a.sort - b.sort || a.code.localeCompare(b.code));
  }

  function flattenTree(workType, expandedSet) {
    const roots = categoriesOfType(workType).filter((c) => !c.parentId);
    const rows = [];
    const walk = (node, depth) => {
      rows.push({ ...node, depth });
      if (expandedSet.has(node.id)) childrenOf(node.id).forEach((child) => walk(child, depth + 1));
    };
    roots.forEach((r) => walk(r, 0));
    return rows;
  }

  function activeCategoriesForPage() {
    return store.getCategories().filter((c) => c.workType === pageBizType && c.status === "正常");
  }

  function activeReportCategories() {
    return activeCategoriesForPage();
  }

  function formatAbnormalDeviceText(abnormalDevice) {
    const d = abnormalDevice || {};
    return `来源：${d.source || ""}；任务编码：${d.taskCode || ""}；任务名称：${d.taskName || ""}；异常设备：${d.deviceName || ""}；设备编码：${d.deviceCode || ""}`;
  }

  function categoryById(id) {
    return store.getCategories().find((c) => c.id === id) || null;
  }

  function parentNameOf(parentId) {
    if (!parentId) return "-";
    return categoryById(parentId)?.name || "-";
  }

  function descendantIds(id) {
    const ids = [];
    const walk = (parentId) => {
      childrenOf(parentId).forEach((child) => {
        ids.push(child.id);
        walk(child.id);
      });
    };
    walk(id);
    return ids;
  }

  function expandableIds(workType) {
    return categoriesOfType(workType).filter((c) => childrenOf(c.id).length).map((c) => c.id);
  }

  function nextCategoryId() {
    return `CAT-${Date.now()}`;
  }

  function nextCategoryCode() {
    return `BX${Date.now()}`;
  }

  function calcLevel(parentId) {
    if (!parentId) return 1;
    return (categoryById(parentId)?.level || 1) + 1;
  }

  function parentOptionsHtml(workType, selectedId = "", excludeId = "") {
    const blocked = new Set(excludeId ? [excludeId, ...descendantIds(excludeId)] : []);
    const options = [];
    const walk = (nodes, depth) => {
      nodes.forEach((node) => {
        if (!blocked.has(node.id)) {
          const pad = "　".repeat(depth);
          options.push(`<option value="${esc(node.id)}" ${node.id === selectedId ? "selected" : ""}>${pad}${esc(node.name)}</option>`);
        }
        walk(childrenOf(node.id), depth + 1);
      });
    };
    walk(categoriesOfType(workType).filter((c) => !c.parentId), 0);
    return `<option value="">无（根分类）</option>${options.join("")}`;
  }

  function renderCategoryTable() {
    const body = document.getElementById("categoryBody");
    if (!body) return;
    const rows = flattenTree(state.catTab, state.expanded);
    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="7"><div class="inspection-empty">暂无分类数据</div></td></tr>`;
      return;
    }
    body.innerHTML = rows.map((row) => {
      const hasChildren = childrenOf(row.id).length > 0;
      const expanded = state.expanded.has(row.id);
      const toggleClass = hasChildren
        ? `wo-tree-toggle${expanded ? "" : " is-collapsed"}`
        : "wo-tree-toggle is-leaf";
      return `<tr data-wo-cat-id="${esc(row.id)}">
        <td>
          <div class="wo-tree-cell">
            <span class="wo-tree-indent" style="--wo-depth:${row.depth}"></span>
            <button class="${toggleClass}" type="button" data-wo-cat-toggle="${esc(row.id)}" aria-label="${expanded ? "折叠" : "展开"}"${hasChildren ? "" : " tabindex=\"-1\""}>
              <i class="fa-solid fa-caret-down" aria-hidden="true"></i>
            </button>
            <span class="wo-tree-name" title="${esc(row.name)}">${esc(row.name)}</span>
          </div>
        </td>
        <td title="${esc(row.code)}">${esc(row.code)}</td>
        <td>${esc(row.level)}</td>
        <td title="${esc(parentNameOf(row.parentId))}">${esc(parentNameOf(row.parentId))}</td>
        <td>${esc(row.sort)}</td>
        <td>${statusTag(row.status)}</td>
        <td class="action-cell">
          <button class="table-action" type="button" data-wo-cat-edit="${esc(row.id)}">编辑</button>
          <button class="table-action" type="button" data-wo-cat-more="${esc(row.id)}">更多</button>
        </td>
      </tr>`;
    }).join("");
  }

  function syncCategoryTabs() {
    document.querySelectorAll("[data-wo-cat-tab]").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.woCatTab === state.catTab);
    });
  }

  function categoryFormHtml(item = {}, { parentId = "" } = {}) {
    const workType = item.workType || state.catTab;
    const selectedParent = item.parentId ?? parentId;
    return `<form class="wo-form-grid" data-wo-cat-form data-mode="${item.id ? "edit" : "create"}" data-id="${esc(item.id || "")}">
      <label class="form-field">
        <span class="form-label form-required">工单类型</span>
        <select class="form-control" data-wo-cat-field="workType" required>
          ${(data.CATEGORY_WORK_TYPES || ["报事报修", "设备异常"]).map((type) => `<option value="${esc(type)}" ${type === workType ? "selected" : ""}>${esc(type)}</option>`).join("")}
        </select>
      </label>
      <label class="form-field">
        <span class="form-label">上级分类</span>
        <select class="form-control" data-wo-cat-field="parentId">${parentOptionsHtml(workType, selectedParent, item.id || "")}</select>
      </label>
      <label class="form-field form-span-2">
        <span class="form-label form-required">分类名称</span>
        <input class="form-control" data-wo-cat-field="name" value="${esc(item.name || "")}" maxlength="20" placeholder="请输入分类名称" required>
      </label>
      <label class="form-field">
        <span class="form-label">排序</span>
        <input class="form-control" data-wo-cat-field="sort" type="number" value="${esc(item.sort ?? 0)}">
      </label>
      <div class="form-field">
        <span class="form-label">状态</span>
        <div class="inspection-radio-row">
          <label><input type="radio" name="wo-cat-status" value="正常" ${item.status !== "停用" ? "checked" : ""}> 正常</label>
          <label><input type="radio" name="wo-cat-status" value="停用" ${item.status === "停用" ? "checked" : ""}> 停用</label>
        </div>
      </div>
      <label class="form-field form-span-2">
        <span class="form-label">备注</span>
        <textarea class="form-control textarea" data-wo-cat-field="remark" maxlength="200" rows="3" placeholder="选填，不超过200字">${esc(item.remark || "")}</textarea>
      </label>
    </form>`;
  }

  function refreshParentOptions() {
    const form = document.querySelector("[data-wo-cat-form]");
    if (!form) return;
    const workType = form.querySelector('[data-wo-cat-field="workType"]')?.value || state.catTab;
    const parentField = form.querySelector('[data-wo-cat-field="parentId"]');
    if (!parentField) return;
    const current = parentField.value;
    const excludeId = form.dataset.id || "";
    parentField.innerHTML = parentOptionsHtml(workType, current, excludeId);
    if (![...parentField.options].some((opt) => opt.value === current)) parentField.value = "";
  }

  function openCategoryDrawer(item = {}, options = {}) {
    const isEdit = !!item.id;
    window.openAppDrawer({
      title: isEdit ? "编辑分类" : "新增分类",
      body: categoryFormHtml(item, options),
      footer: `<button class="btn btn-secondary" type="button" data-drawer-close>取消</button>
        <button class="btn btn-primary" type="button" data-wo-cat-save>${isEdit ? "保存" : "确定"}</button>`,
    });
  }

  function saveCategory() {
    const form = document.querySelector("[data-wo-cat-form]");
    if (!form) return;
    const workType = form.querySelector('[data-wo-cat-field="workType"]')?.value?.trim() || "";
    const parentId = form.querySelector('[data-wo-cat-field="parentId"]')?.value || "";
    const name = form.querySelector('[data-wo-cat-field="name"]')?.value?.trim() || "";
    const sortRaw = form.querySelector('[data-wo-cat-field="sort"]')?.value;
    const sort = Number.isFinite(Number(sortRaw)) ? Number(sortRaw) : 0;
    const status = form.querySelector('input[name="wo-cat-status"]:checked')?.value || "正常";
    const remark = form.querySelector('[data-wo-cat-field="remark"]')?.value?.trim() || "";

    form.querySelectorAll(".form-control.error").forEach((field) => field.classList.remove("error"));
    if (!workType || !name) {
      if (!workType) form.querySelector('[data-wo-cat-field="workType"]')?.classList.add("error");
      if (!name) form.querySelector('[data-wo-cat-field="name"]')?.classList.add("error");
      toast("请填写必填项");
      return;
    }
    if (name.length > 20) {
      form.querySelector('[data-wo-cat-field="name"]')?.classList.add("error");
      toast("分类名称不能超过20字");
      return;
    }
    if (remark.length > 200) {
      form.querySelector('[data-wo-cat-field="remark"]')?.classList.add("error");
      toast("备注不能超过200字");
      return;
    }
    if (parentId) {
      const parent = categoryById(parentId);
      if (!parent || parent.workType !== workType) {
        toast("上级分类须与工单类型一致");
        return;
      }
    }

    const list = store.getCategories().map((entry) => ({ ...entry }));
    const id = form.dataset.id;
    if (id) {
      const index = list.findIndex((entry) => entry.id === id);
      if (index < 0) {
        toast("分类不存在");
        return;
      }
      if (parentId === id || descendantIds(id).includes(parentId)) {
        toast("不能选择自身或子分类作为上级");
        return;
      }
      list[index] = {
        ...list[index],
        workType,
        parentId,
        name,
        sort,
        status,
        remark,
        level: calcLevel(parentId),
      };
    } else {
      list.push({
        id: nextCategoryId(),
        code: nextCategoryCode(),
        name,
        workType,
        parentId,
        level: calcLevel(parentId),
        sort,
        status,
        remark,
        createdAt: now(),
      });
    }

    store.setCategories(list);
    if (parentId) state.expanded.add(parentId);
    if (workType !== state.catTab) {
      state.catTab = workType;
      state.expanded = new Set(expandableIds(state.catTab));
      syncCategoryTabs();
    }
    window.closeAppDrawer();
    renderCategoryTable();
    toast(id ? "分类已保存" : "分类已创建");
  }

  function deleteCategory(id) {
    if (childrenOf(id).length) {
      toast("存在子分类，无法删除");
      return;
    }
    const item = categoryById(id);
    if (!item) return;
    window.openAppConfirm({
      title: "删除分类",
      message: `确认删除分类「${item.name}」吗？`,
      confirmText: "确认删除",
      onConfirm: () => {
        store.setCategories(store.getCategories().filter((entry) => entry.id !== id));
        state.expanded.delete(id);
        renderCategoryTable();
        toast("分类已删除");
      },
    });
  }

  function showCategoryMore(button) {
    hideMoreMenus();
    const id = button.dataset.woCatMore;
    const menu = document.createElement("div");
    menu.className = "inspection-more-menu";
    menu.innerHTML = `
      <button type="button" data-wo-cat-more-action="add-child" data-id="${esc(id)}">新增子级</button>
      <button type="button" data-wo-cat-more-action="delete" data-id="${esc(id)}">删除</button>`;
    document.body.append(menu);
    const rect = button.getBoundingClientRect();
    const width = menu.offsetWidth || 116;
    let left = Math.round(rect.left);
    if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8);
    menu.style.left = `${left}px`;
    let top = Math.round(rect.bottom + 4);
    const height = menu.offsetHeight || 80;
    if (top + height > window.innerHeight - 8) top = Math.max(8, Math.round(rect.top - height - 4));
    menu.style.top = `${top}px`;
  }

  function initCategoryPage() {
    state.expanded = new Set(expandableIds(state.catTab));
    syncCategoryTabs();
    renderCategoryTable();

    document.addEventListener("click", (event) => {
      const tab = event.target.closest("[data-wo-cat-tab]");
      if (tab) {
        hideMoreMenus();
        state.catTab = tab.dataset.woCatTab;
        state.expanded = new Set(expandableIds(state.catTab));
        syncCategoryTabs();
        renderCategoryTable();
        return;
      }

      const action = event.target.closest("[data-wo-action]")?.dataset.woAction;
      if (action === "collapse-all") {
        hideMoreMenus();
        state.expanded.clear();
        renderCategoryTable();
        return;
      }
      if (action === "expand-all") {
        hideMoreMenus();
        state.expanded = new Set(expandableIds(state.catTab));
        renderCategoryTable();
        return;
      }
      if (action === "cat-create") {
        hideMoreMenus();
        openCategoryDrawer();
        return;
      }

      const toggle = event.target.closest("[data-wo-cat-toggle]");
      if (toggle) {
        const id = toggle.dataset.woCatToggle;
        if (!childrenOf(id).length) return;
        if (state.expanded.has(id)) state.expanded.delete(id);
        else state.expanded.add(id);
        renderCategoryTable();
        return;
      }

      const edit = event.target.closest("[data-wo-cat-edit]");
      if (edit) {
        hideMoreMenus();
        const item = categoryById(edit.dataset.woCatEdit);
        if (item) openCategoryDrawer(item);
        return;
      }

      const more = event.target.closest("[data-wo-cat-more]");
      if (more) {
        event.stopPropagation();
        showCategoryMore(more);
        return;
      }

      const moreAction = event.target.closest("[data-wo-cat-more-action]");
      if (moreAction) {
        const id = moreAction.dataset.id;
        const type = moreAction.dataset.woCatMoreAction;
        hideMoreMenus();
        if (type === "add-child") {
          const parent = categoryById(id);
          if (parent) {
            state.expanded.add(parent.id);
            openCategoryDrawer({ workType: parent.workType }, { parentId: parent.id });
          }
        }
        if (type === "delete") deleteCategory(id);
        return;
      }

      if (event.target.closest("[data-wo-cat-save]")) {
        saveCategory();
        return;
      }

      if (!event.target.closest(".inspection-more-menu") && !event.target.closest("[data-wo-cat-more]")) {
        hideMoreMenus();
      }
    });

    document.addEventListener("change", (event) => {
      if (event.target.matches('[data-wo-cat-field="workType"]')) refreshParentOptions();
    });
  }

  const orderById = (id) => store.getOrders().find((item) => item.id === id);
  const projectOptions = () => (data.locationTree || []).map((item) => item.name);
  const ALLOWED_IMAGE = /\.(jpe?g|png|gif|webp)$/i;
  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
  const PERSON_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];
  const avatarText = (name) => {
    const text = String(name || "人员");
    return text.length > 2 ? text.slice(-2) : text;
  };
  const avatarColor = (name) => PERSON_COLORS[[...String(name || "人员")].reduce((sum, char) => sum + char.charCodeAt(0), 0) % PERSON_COLORS.length];
  const personnel = () => data.personnel || [];
  const departments = () => data.departments || [];

  function pushRecord(item, action, note, photos = [], operator = "管理员") {
    item.records = item.records || [];
    item.records.unshift({
      id: `R-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action,
      operator,
      at: now(),
      note: note || "",
      photos: [...photos],
    });
  }

  function updateOrder(id, mutator) {
    const list = store.getOrders().map((entry) => ({ ...entry, photos: [...(entry.photos || [])], records: (entry.records || []).map((r) => ({ ...r, photos: [...(r.photos || [])] })) }));
    const index = list.findIndex((entry) => entry.id === id);
    if (index < 0) return null;
    mutator(list[index]);
    store.setOrders(list);
    return list[index];
  }

  function filteredOrders() {
    const f = state.filters;
    return store.getOrders().filter((item) => {
      if ((item.bizType || "报事报修") !== pageBizType) return false;
      if (f.code && !String(item.code || "").includes(f.code.trim())) return false;
      if (f.content && !String(item.content || "").includes(f.content.trim())) return false;
      if (f.orderType && item.orderType !== f.orderType) return false;
      if (f.categoryId && item.categoryId !== f.categoryId) return false;
      if (f.status && item.status !== f.status) return false;
      for (const key of ["project", "corridor", "room", "section", "pipeline"]) {
        if (f[key] && item[key] !== f[key]) return false;
      }
      return true;
    });
  }

  function rowActions(item) {
    const id = esc(item.id);
    if (item.status === "待指派") {
      return `<button class="table-action" type="button" data-wo-row="detail" data-id="${id}">详情</button>
        <button class="table-action" type="button" data-wo-row="more" data-id="${id}">更多</button>`;
    }
    if (item.status === "待处理") {
      return `<button class="table-action" type="button" data-wo-row="detail" data-id="${id}">详情</button>
        <button class="table-action" type="button" data-wo-row="start" data-id="${id}">开始</button>`;
    }
    if (item.status === "处理中") {
      return `<button class="table-action" type="button" data-wo-row="detail" data-id="${id}">详情</button>
        <button class="table-action" type="button" data-wo-row="submit" data-id="${id}">提交</button>`;
    }
    if (item.status === "验收中") {
      return `<button class="table-action" type="button" data-wo-row="detail" data-id="${id}">详情</button>
        <button class="table-action" type="button" data-wo-row="accept" data-id="${id}">验收</button>`;
    }
    return `<button class="table-action" type="button" data-wo-row="detail" data-id="${id}">详情</button>`;
  }

  function thumbHtml(item) {
    const src = (item.photos || [])[0];
    if (!src) return `<span class="wo-thumb wo-thumb-empty" title="暂无图片"><i class="fa-regular fa-image" aria-hidden="true"></i></span>`;
    return `<img class="wo-thumb" src="${esc(src)}" alt="现场图片">`;
  }

  function renderOrderPagination(total) {
    const el = document.getElementById("workOrderPagination");
    if (!el) return;
    const pages = Math.max(1, Math.ceil(total / state.pageSize));
    if (state.pageIndex > pages) state.pageIndex = pages;
    const page = state.pageIndex;
    el.innerHTML = `<div class="pagination-info">共 ${total} 条</div>
      <div class="pagination-actions">
        <button class="btn btn-secondary" type="button" data-wo-page="prev" ${page <= 1 ? "disabled" : ""}>上一页</button>
        <span class="pagination-current">${page} / ${pages}</span>
        <button class="btn btn-secondary" type="button" data-wo-page="next" ${page >= pages ? "disabled" : ""}>下一页</button>
      </div>`;
  }

  function renderOrderTable() {
    const body = document.getElementById("workOrderBody");
    if (!body) return;
    const list = filteredOrders();
    const start = (state.pageIndex - 1) * state.pageSize;
    const pageRows = list.slice(start, start + state.pageSize);
    renderOrderPagination(list.length);
    const colSpan = isDeviceAbnormalPage ? 20 : 18;
    if (!pageRows.length) {
      body.innerHTML = `<tr><td colspan="${colSpan}"><div class="inspection-empty">暂无工单数据</div></td></tr>`;
      return;
    }
    body.innerHTML = pageRows.map((item) => {
      const abnormalText = formatAbnormalDeviceText(item.abnormalDevice);
      const abnormalCell = isDeviceAbnormalPage
        ? `<td class="wo-abnormal-device-cell" title="${esc(abnormalText)}">${esc(abnormalText)}</td><td>${abnormalLevelTag(item.abnormalLevel)}</td>`
        : "";
      return `<tr data-wo-id="${esc(item.id)}">
      <td title="${esc(item.code)}">${esc(item.code)}</td>
      <td title="${esc(item.name)}">${esc(item.name)}</td>
      <td>${thumbHtml(item)}</td>
      <td class="wo-content-cell" title="${esc(item.content)}">${esc(item.content)}</td>
      <td>${esc(item.orderType)}</td>
      <td title="${esc(item.categoryName)}">${esc(item.categoryName || "-")}</td>
      ${abnormalCell}
      <td title="${esc(item.project)}">${esc(item.project || "-")}</td>
      <td title="${esc(item.corridor)}">${esc(item.corridor || "-")}</td>
      <td title="${esc(item.room)}">${esc(item.room || "-")}</td>
      <td title="${esc(item.section)}">${esc(item.section || "-")}</td>
      <td title="${esc(item.pipeline)}">${esc(item.pipeline || "-")}</td>
      <td title="${esc(locationText(item))}">${esc(locationText(item))}</td>
      <td>${statusTag(item.status)}</td>
      <td>${esc(item.handler || "-")}</td>
      <td>${esc(item.contact || "-")}</td>
      <td>${esc(formatPhone(item.contactPhone))}</td>
      <td>${esc(item.submittedAt || "-")}</td>
      <td class="action-cell">${rowActions(item)}</td>
    </tr>`;
    }).join("");
  }

  function fillFilterSelects() {
    const typeSel = document.querySelector('[data-wo-filter="orderType"]');
    const catSel = document.querySelector('[data-wo-filter="categoryId"]');
    const statusSel = document.querySelector('[data-wo-filter="status"]');
    if (typeSel && typeSel.options.length <= 1) {
      (data.WORK_ORDER_TYPES || []).forEach((type) => {
        typeSel.insertAdjacentHTML("beforeend", `<option value="${esc(type)}">${esc(type)}</option>`);
      });
    }
    if (catSel) {
      const current = catSel.value;
      catSel.innerHTML = `<option value="">全部</option>${activeCategoriesForPage().map((cat) => `<option value="${esc(cat.id)}">${esc(cat.name)}</option>`).join("")}`;
      catSel.value = current;
    }
    if (statusSel && statusSel.options.length <= 1) {
      (data.ORDER_STATUSES || []).forEach((status) => {
        statusSel.insertAdjacentHTML("beforeend", `<option value="${esc(status)}">${esc(status)}</option>`);
      });
    }
  }

  function readFiltersFromDom() {
    const next = {};
    document.querySelectorAll("[data-wo-filter]").forEach((field) => {
      next[field.dataset.woFilter] = field.value || "";
    });
    state.filters = next;
  }

  function resetFilters() {
    document.querySelectorAll("[data-wo-filter]").forEach((field) => { field.value = ""; });
    const cascade = document.querySelector("[data-wo-location-filter]");
    if (cascade) {
      delete cascade.dataset.locationBound;
      cascade.querySelectorAll("[data-location-level]").forEach((sel) => {
        sel.dataset.locationValue = "";
        sel.value = "";
      });
      bindLocationCascade(cascade, { includeProject: true });
    }
    state.filters = {};
    state.pageIndex = 1;
    fillFilterSelects();
    renderOrderTable();
  }

  function photosHtml(photos = []) {
    if (!photos.length) return `<div class="inspection-empty">暂无图片</div>`;
    return `<div class="wo-photo-grid">${photos.map((src) => `<img class="wo-thumb" src="${esc(src)}" alt="照片">`).join("")}</div>`;
  }

  function createFormHtml() {
    const cats = activeReportCategories();
    return `<form class="wo-form-grid" data-wo-form="create">
      <label class="form-field"><span class="form-label form-required">工单名称</span><input class="form-control" data-wo-field="name" maxlength="50" placeholder="请输入"></label>
      <label class="form-field"><span class="form-label form-required">所属项目</span><select class="form-control" data-wo-field="project"><option value="">请选择</option>${projectOptions().map((name) => `<option value="${esc(name)}">${esc(name)}</option>`).join("")}</select></label>
      <div class="device-location-cascade" data-wo-location-form data-location-cascade>
        <label class="form-field"><span class="form-label">所属管廊</span><select class="form-control" data-location-level="corridor" data-wo-field="corridor"><option value="">请选择</option></select></label>
        <label class="form-field"><span class="form-label">所属舱室</span><select class="form-control" data-location-level="room" data-wo-field="room"><option value="">请选择</option></select></label>
        <label class="form-field"><span class="form-label">所属区段</span><select class="form-control" data-location-level="section" data-wo-field="section"><option value="">请选择</option></select></label>
        <label class="form-field"><span class="form-label">所属管线</span><select class="form-control" data-location-level="pipeline" data-wo-field="pipeline"><option value="">请选择</option></select></label>
      </div>
      <label class="form-field"><span class="form-label form-required">联系人</span><input class="form-control" data-wo-field="contact" maxlength="20" placeholder="请输入"></label>
      <label class="form-field"><span class="form-label form-required">联系电话</span><input class="form-control" data-wo-field="contactPhone" maxlength="20" placeholder="请输入手机号"></label>
      <label class="form-field"><span class="form-label form-required">工单类型</span><select class="form-control" data-wo-field="orderType"><option value="">请选择</option>${(data.WORK_ORDER_TYPES || []).map((type) => `<option value="${esc(type)}">${esc(type)}</option>`).join("")}</select></label>
      <label class="form-field"><span class="form-label form-required">工单分类</span><select class="form-control" data-wo-field="categoryId"><option value="">请选择</option>${cats.map((cat) => `<option value="${esc(cat.id)}">${esc(cat.name)}</option>`).join("")}</select></label>
      <label class="form-field form-span-2"><span class="form-label form-required">报修内容</span><textarea class="form-control textarea" data-wo-field="content" maxlength="500" rows="4" placeholder="请输入报修内容"></textarea></label>
      <div class="form-field form-span-2"><span class="form-label">上传照片</span>
        <input class="form-control" type="file" accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp" multiple data-wo-photos>
        <div class="form-hint">请上传不超过 5MB 的 jpg、jpeg、png、gif、webp 格式文件，最多 6 张</div>
        <div class="wo-photo-grid" data-wo-photo-preview></div>
      </div>
    </form>`;
  }

  function readPhotosFromInput(input) {
    return new Promise((resolve) => {
      const files = [...(input?.files || [])];
      if (!files.length) { resolve([]); return; }
      if (files.length > 6) { toast("最多上传 6 张照片"); resolve(null); return; }
      const result = [];
      let pending = files.length;
      files.forEach((file) => {
        if (!ALLOWED_IMAGE.test(file.name) && !/^image\/(jpeg|png|gif|webp)$/i.test(file.type)) {
          toast("仅支持 jpg、jpeg、png、gif、webp");
          resolve(null);
          return;
        }
        if (file.size > MAX_IMAGE_BYTES) {
          toast("单张图片不能超过 5MB");
          resolve(null);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          result.push(reader.result);
          pending -= 1;
          if (pending <= 0) resolve(result);
        };
        reader.onerror = () => { toast("图片读取失败"); resolve(null); };
        reader.readAsDataURL(file);
      });
    });
  }

  async function saveCreateOrder() {
    const form = document.querySelector('[data-wo-form="create"]');
    if (!form) return;
    const get = (key) => form.querySelector(`[data-wo-field="${key}"]`)?.value?.trim() || "";
    const name = get("name");
    const project = get("project");
    const contact = get("contact");
    const contactPhone = get("contactPhone");
    const orderType = get("orderType");
    const categoryId = get("categoryId");
    const content = get("content");
    const corridor = get("corridor");
    const room = get("room");
    const section = get("section");
    const pipeline = get("pipeline");
    form.querySelectorAll(".form-control.error").forEach((field) => field.classList.remove("error"));
    const required = { name, project, contact, contactPhone, orderType, categoryId, content };
    let ok = true;
    Object.entries(required).forEach(([key, value]) => {
      if (!value) {
        form.querySelector(`[data-wo-field="${key}"]`)?.classList.add("error");
        ok = false;
      }
    });
    if (!ok) { toast("请填写必填项"); return; }
    if (!/^1\d{10}$/.test(contactPhone.replace(/\s/g, ""))) {
      form.querySelector('[data-wo-field="contactPhone"]')?.classList.add("error");
      toast("请输入正确的手机号");
      return;
    }
    const category = activeReportCategories().find((cat) => cat.id === categoryId);
    if (!category) { toast("请选择有效的工单分类"); return; }
    const photos = await readPhotosFromInput(form.querySelector("[data-wo-photos]"));
    if (photos === null) return;
    const stamp = Date.now();
    const order = {
      id: `WO-${stamp}`,
      code: `WO${stamp}`,
      name,
      content,
      photos,
      orderType,
      bizType: "报事报修",
      categoryId,
      categoryName: category.name,
      project,
      corridor,
      room,
      section,
      pipeline,
      status: "待指派",
      handler: "",
      contact,
      contactPhone: contactPhone.replace(/\s/g, ""),
      submittedAt: now(),
      startedAt: "",
      finishedAt: "",
      records: [{ id: `R-${stamp}`, action: "创建", operator: contact || "管理员", at: now(), note: "新建报事报修", photos: [] }],
    };
    const list = store.getOrders();
    list.unshift(order);
    store.setOrders(list);
    window.closeAppDrawer();
    state.pageIndex = 1;
    fillFilterSelects();
    renderOrderTable();
    toast("工单已创建");
  }

  function openCreateDrawer() {
    if (isDeviceAbnormalPage) return;
    window.openAppDrawer({
      title: "新增报事报修",
      body: createFormHtml(),
      footer: `<button class="btn btn-secondary" type="button" data-drawer-close>取消</button>
        <button class="btn btn-primary" type="button" data-wo-save-create>确定</button>`,
    });
    const formRoot = document.querySelector("[data-wo-location-form]");
    bindLocationCascade(formRoot, { includeProject: false });
    const projectField = document.querySelector('[data-wo-field="project"]');
    projectField?.addEventListener("change", () => {
      if (!formRoot) return;
      delete formRoot.dataset.locationBound;
      formRoot.querySelectorAll("[data-location-level]").forEach((sel) => {
        sel.dataset.locationValue = "";
        sel.innerHTML = `<option value="">请选择</option>`;
        sel.value = "";
      });
      bindLocationCascade(formRoot, { includeProject: false });
    });
  }

  function detailBody(item, tab = "basic") {
    const records = [...(item.records || [])].sort((a, b) => String(b.at).localeCompare(String(a.at)));
    const showAbnormal = isDeviceAbnormalPage || item.bizType === "设备异常";
    const abnormalText = formatAbnormalDeviceText(item.abnormalDevice);
    const FULL_ROW_LABELS = new Set(["异常设备", "备注", "报修内容"]);
    const basicPairs = [
      ["工单编号", item.code], ["工单名称", item.name], ["工单状态", statusTag(item.status)],
      ["工单类型", item.orderType], ["工单分类", item.categoryName || "-"],
      ...(showAbnormal ? [["异常设备", abnormalText], ["异常等级", abnormalLevelTag(item.abnormalLevel)]] : []),
      ["所属项目", item.project || "-"], ["所属管廊", item.corridor || "-"], ["所属舱室", item.room || "-"],
      ["所属区段", item.section || "-"], ["所属管线", item.pipeline || "-"], ["报修位置", locationText(item)],
      ["当前处理人", item.handler || "-"], ["联系人", item.contact || "-"], ["联系电话", formatPhone(item.contactPhone)],
      ["提交时间", item.submittedAt || "-"], ["开始时间", item.startedAt || "-"], ["完成时间", item.finishedAt || "-"],
      ["报修内容", item.content || "-"],
      ...(showAbnormal ? [["备注", abnormalText]] : []),
    ];
    const basic = `<section class="inspection-task-panel ${tab === "basic" ? "" : "hidden"}" data-wo-detail-panel="basic">
      <div class="detail-grid">${basicPairs.map(([label, content]) => `<div class="info-item${FULL_ROW_LABELS.has(label) ? " info-item-full" : ""}"><span class="info-label">${label}</span><span class="info-value">${typeof content === "string" && (content.startsWith("<span") || content === "-") ? content : esc(content)}</span></div>`).join("")}</div>
      <div class="detail-section"><h3 class="detail-title">现场图片</h3>${photosHtml(item.photos || [])}</div>
    </section>`;
    const timeline = records.length
      ? records.map((record) => `<div class="wo-timeline-item">
          <span class="wo-timeline-dot"></span>
          <div class="wo-timeline-body">
            <div class="wo-timeline-head"><strong>${esc(record.action)}</strong><time>${esc(record.at)}</time></div>
            <div class="wo-timeline-meta">${esc(record.operator || "-")}</div>
            <p>${esc(record.note || "-")}</p>
            ${(record.photos || []).length ? photosHtml(record.photos) : ""}
          </div>
        </div>`).join("")
      : `<div class="inspection-empty">暂无处理记录</div>`;
    const recordPanel = `<section class="inspection-task-panel ${tab === "records" ? "" : "hidden"}" data-wo-detail-panel="records"><div class="wo-timeline">${timeline}</div></section>`;
    const tabs = `<div class="inspection-task-tabs">
      <button type="button" class="${tab === "basic" ? "active" : ""}" data-wo-detail-tab="basic" data-id="${esc(item.id)}">基本信息</button>
      <button type="button" class="${tab === "records" ? "active" : ""}" data-wo-detail-tab="records" data-id="${esc(item.id)}">处理记录</button>
    </div>`;
    return tabs + basic + recordPanel;
  }

  function openDetailDrawer(item, tab = "basic") {
    window.openAppDrawer({
      title: "工单详情",
      body: detailBody(item, tab),
      footer: `<button class="btn btn-secondary" type="button" data-drawer-close>关闭</button>`,
    });
  }

  function showOrderMore(button, id) {
    hideMoreMenus();
    const menu = document.createElement("div");
    menu.className = "inspection-more-menu";
    menu.innerHTML = `
      <button type="button" data-wo-row="assign" data-id="${esc(id)}">指派</button>
      <button type="button" data-wo-row="withdraw" data-id="${esc(id)}">撤回</button>`;
    document.body.append(menu);
    const rect = button.getBoundingClientRect();
    const width = menu.offsetWidth || 116;
    let left = Math.round(rect.left);
    if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8);
    menu.style.left = `${left}px`;
    let top = Math.round(rect.bottom + 4);
    const height = menu.offsetHeight || 80;
    if (top + height > window.innerHeight - 8) top = Math.max(8, Math.round(rect.top - height - 4));
    menu.style.top = `${top}px`;
  }

  function deptById(id, nodes = departments()) {
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

  function closePersonPicker() {
    document.querySelectorAll(".inspection-person-mask").forEach((mask) => mask.remove());
    state.picker.open = false;
  }

  function renderPersonDeptTree() {
    const tree = document.getElementById("personDeptTree");
    if (!tree) return;
    const keyword = (state.picker.deptKeyword || "").trim().toLowerCase();
    const selfMatched = (node) => !keyword || node.name.toLowerCase().includes(keyword);
    const matched = (node) => selfMatched(node) || (node.children || []).some((child) => matched(child));
    const countOf = (node) => personnel().filter((person) => deptNameList(node).includes(person.dept)).length;
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
    tree.innerHTML = `<div class="person-dept-node person-dept-all${state.picker.deptId ? "" : " active"}" data-person-dept=""><span class="person-dept-caret-placeholder"></span><i class="person-dept-icon fa-solid fa-users" aria-hidden="true"></i><span class="person-dept-name">全部人员</span><span class="person-dept-count">${personnel().length}</span></div>${departments().map((node) => nodeHtml(node, 0)).join("")}`;
  }

  function personListFiltered() {
    const dept = state.picker.deptId ? deptById(state.picker.deptId) : null;
    const names = dept ? deptNameList(dept) : null;
    const keyword = (state.picker.keyword || "").trim().toLowerCase();
    return personnel().filter((person) => (!names || names.includes(person.dept)) && (!keyword || `${person.name} ${person.phone} ${person.dept}`.toLowerCase().includes(keyword)));
  }

  function renderPersonList() {
    const body = document.getElementById("personListBody");
    if (!body) return;
    const list = personListFiltered();
    body.innerHTML = list.length
      ? list.map((person) => `<tr class="${state.picker.selectedId === person.id ? "active" : ""}"><td class="person-pick-cell"><input type="radio" name="wo-person-pick" data-person-pick="${esc(person.id)}" ${state.picker.selectedId === person.id ? "checked" : ""}></td><td><div class="person-cell"><span class="person-avatar" style="background:${avatarColor(person.name)}">${esc(avatarText(person.name))}</span><div class="person-cell-info"><span class="person-cell-name">${esc(person.name)}</span><span class="person-cell-phone">${esc(person.phone)}</span></div></div></td></tr>`).join("")
      : `<tr><td colspan="2"><div class="inspection-empty">暂无匹配人员</div></td></tr>`;
  }

  function renderPersonSelected() {
    const body = document.getElementById("personSelectedBody");
    if (!body) return;
    const person = personnel().find((entry) => entry.id === state.picker.selectedId);
    body.innerHTML = person
      ? `<tr><td><div class="person-cell"><span class="person-avatar" style="background:${avatarColor(person.name)}">${esc(avatarText(person.name))}</span><span class="person-cell-name">${esc(person.name)}</span></div></td><td class="person-remove-cell"><button type="button" class="person-remove" data-person-remove="${esc(person.id)}">移除</button></td></tr>`
      : `<tr><td colspan="2"><div class="inspection-empty">暂无选中人员</div></td></tr>`;
  }

  function openPersonPicker(trigger) {
    closePersonPicker();
    const input = trigger.querySelector("input") || document.querySelector('[data-wo-field="assignee"]');
    const current = personnel().find((person) => person.name === String(input?.value || "").trim());
    state.picker = { open: true, target: input || null, deptId: "", keyword: "", deptKeyword: "", deptCollapsed: new Set(), selectedId: current?.id || "" };
    const mask = document.createElement("div");
    mask.className = "inspection-person-mask";
    mask.innerHTML = `<div class="inspection-person-modal" role="dialog" aria-modal="true" aria-label="选择人员"><div class="inspection-person-head"><h3>选择人员</h3><button class="inspection-person-close" type="button" data-person-close aria-label="关闭">×</button></div><div class="inspection-person-main"><aside class="inspection-person-dept"><div class="inspection-person-dept-head"><i class="fa-solid fa-sitemap" aria-hidden="true"></i><span>组织架构</span></div><div class="inspection-dept-search"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><input class="form-control" data-person-dept-keyword placeholder="搜索部门"></div><div class="inspection-person-dept-tree" id="personDeptTree"></div></aside><section class="inspection-person-list"><div class="inspection-person-tools"><input class="form-control" id="personKeyword" placeholder="请输入"><button class="btn btn-primary" type="button" data-person-search>搜索</button><button class="btn btn-secondary" type="button" data-person-reset>重置</button></div><div class="inspection-person-table-wrap"><table class="table"><thead><tr><th colspan="2">用户</th></tr></thead><tbody id="personListBody"></tbody></table></div></section><section class="inspection-person-selected"><div class="inspection-person-selected-head"><h4>已选中人员</h4><button class="btn btn-secondary" type="button" data-person-clear>清空选中</button></div><div class="inspection-person-table-wrap"><table class="table"><thead><tr><th>昵称</th><th class="person-remove-cell">操作</th></tr></thead><tbody id="personSelectedBody"></tbody></table></div></section></div><div class="inspection-person-foot"><button class="btn btn-secondary" type="button" data-person-cancel>取消</button><button class="btn btn-primary" type="button" data-person-confirm>确定</button></div></div>`;
    document.body.append(mask);
    renderPersonDeptTree();
    renderPersonList();
    renderPersonSelected();
  }

  function openAssignDrawer(item) {
    window.openAppDrawer({
      title: "指派工单",
      body: `<form class="wo-form-grid" data-wo-form="assign" data-id="${esc(item.id)}">
        <div class="form-field form-span-2"><span class="form-label">工单编号</span><div class="info-value">${esc(item.code)}</div></div>
        <div class="form-field form-span-2"><span class="form-label form-required">任务执行人</span>
          <div class="inspection-person-field" data-wo-person-trigger>
            <input class="form-control inspection-person-input" data-wo-field="assignee" readonly placeholder="请选择任务执行人" value="" autocomplete="off">
            <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
          </div>
        </div>
        <label class="form-field form-span-2"><span class="form-label">指派说明</span><textarea class="form-control textarea" data-wo-field="assignNote" maxlength="200" rows="4" placeholder="请输入指派说明"></textarea></label>
      </form>`,
      footer: `<button class="btn btn-secondary" type="button" data-drawer-close>取消</button>
        <button class="btn btn-primary" type="button" data-wo-confirm-assign>确认</button>`,
    });
  }

  function confirmAssign() {
    const form = document.querySelector('[data-wo-form="assign"]');
    if (!form) return;
    const id = form.dataset.id;
    const assignee = form.querySelector('[data-wo-field="assignee"]')?.value?.trim() || "";
    const note = form.querySelector('[data-wo-field="assignNote"]')?.value?.trim() || "";
    if (!assignee) { toast("请选择任务执行人"); return; }
    updateOrder(id, (item) => {
      item.status = "待处理";
      item.handler = assignee;
      pushRecord(item, "指派", note || `指派给 ${assignee}`);
    });
    window.closeAppDrawer();
    renderOrderTable();
    toast("已指派");
  }

  function openWithdrawDrawer(item) {
    window.openAppDrawer({
      title: "撤回工单",
      body: `<form class="wo-form-grid" data-wo-form="withdraw" data-id="${esc(item.id)}">
        <label class="form-field form-span-2"><span class="form-label form-required">撤回原因</span>
          <textarea class="form-control textarea" data-wo-field="withdrawReason" maxlength="200" rows="5" placeholder="请输入撤回原因">发起人撤回</textarea>
        </label>
      </form>`,
      footer: `<button class="btn btn-secondary" type="button" data-drawer-close>取消</button>
        <button class="btn btn-primary" type="button" data-wo-confirm-withdraw>确认</button>`,
    });
  }

  function confirmWithdraw() {
    const form = document.querySelector('[data-wo-form="withdraw"]');
    if (!form) return;
    const reason = form.querySelector('[data-wo-field="withdrawReason"]')?.value?.trim() || "";
    if (!reason) { toast("请输入撤回原因"); return; }
    updateOrder(form.dataset.id, (item) => {
      item.status = "已撤回";
      pushRecord(item, "撤回", reason);
    });
    window.closeAppDrawer();
    renderOrderTable();
    toast("工单已撤回");
  }

  function startOrder(item) {
    window.openAppConfirm({
      title: "提示",
      message: "确认开始处理工单？",
      confirmText: "确定",
      okClass: "btn-primary",
      onConfirm: () => {
        updateOrder(item.id, (entry) => {
          entry.status = "处理中";
          entry.startedAt = now();
          pushRecord(entry, "开始", "开始处理工单", [], entry.handler || "处理人");
        });
        renderOrderTable();
        toast("已开始处理");
      },
    });
  }

  function workItemsFillHtml(items) {
    if (!items.length) {
      return `<div class="form-field form-span-2 wo-submit-section">
        <div class="wo-submit-section-head"><h3>关联检查项条目</h3></div>
        <div class="inspection-empty">暂无关联检查项条目</div>
      </div>`;
    }
    const cards = items.map((entry, index) => {
      const key = `wo-work-${index}`;
      const checkedNormal = entry.result !== "异常" ? "checked" : "";
      const checkedAbnormal = entry.result === "异常" ? "checked" : "";
      return `<section class="inspection-fill-item" data-wo-work-item="${esc(entry.name)}">
        <div class="inspection-fill-item-head"><div><strong>${esc(entry.name)}</strong><span class="inspection-fill-type">${esc(entry.inputType || "单选")}</span></div><span class="inspection-fill-index">${index + 1} / ${items.length}</span></div>
        ${entry.remark ? `<p class="inspection-fill-help">${esc(entry.remark)}</p>` : ""}
        <div class="inspection-fill-options">
          <label><input type="radio" name="${esc(key)}" value="正常" ${checkedNormal}> <span>正常</span></label>
          <label><input type="radio" name="${esc(key)}" value="异常" ${checkedAbnormal}> <span>异常</span></label>
        </div>
      </section>`;
    }).join("");
    return `<div class="form-field form-span-2 wo-submit-section wo-work-items-block">
      <div class="wo-submit-section-head"><h3>关联检查项条目</h3><span>检查项 ${items.length}</span></div>
      <div class="wo-work-items-scroll"><div class="inspection-fill-list">${cards}</div></div>
    </div>`;
  }

  function processResultFieldsHtml() {
    return `<div class="form-field form-span-2 wo-submit-section">
        <div class="wo-submit-section-head"><h3>处理结果</h3></div>
        <div class="wo-submit-section-body">
          <label class="form-field"><span class="form-label form-required">事件原因</span><input class="form-control" data-wo-field="cause" maxlength="100" placeholder="请输入"></label>
          <label class="form-field"><span class="form-label form-required">处理过程</span><textarea class="form-control textarea" data-wo-field="process" maxlength="500" rows="4" placeholder="请输入处理过程"></textarea></label>
          <label class="form-field"><span class="form-label">处理结果说明</span><textarea class="form-control textarea" data-wo-field="resultNote" maxlength="200" rows="3" placeholder="选填"></textarea></label>
          <div class="form-field"><span class="form-label">维修前照片</span><input class="form-control" type="file" accept=".jpg,.jpeg,.png,.gif,.webp,image/*" multiple data-wo-photos-before><div class="form-hint">支持 JPG、JPEG、PNG、GIF、WEBP；最多 5 张，单文件 ≤5MB</div></div>
          <div class="form-field"><span class="form-label">维修后照片</span><input class="form-control" type="file" accept=".jpg,.jpeg,.png,.gif,.webp,image/*" multiple data-wo-photos-after><div class="form-hint">支持 JPG、JPEG、PNG、GIF、WEBP；最多 5 张，单文件 ≤5MB</div></div>
        </div>
      </div>`;
  }

  function openSubmitDrawer(item) {
    const workItems = isDeviceAbnormalPage ? (item.workItems || []) : [];
    const body = isDeviceAbnormalPage
      ? `<form class="wo-form-grid wo-submit-form" data-wo-form="submit" data-id="${esc(item.id)}">
        ${workItemsFillHtml(workItems)}
        ${processResultFieldsHtml()}
      </form>`
      : `<form class="wo-form-grid" data-wo-form="submit" data-id="${esc(item.id)}">
        <label class="form-field form-span-2"><span class="form-label form-required">事件原因</span><input class="form-control" data-wo-field="cause" maxlength="100" placeholder="请输入"></label>
        <label class="form-field form-span-2"><span class="form-label form-required">处理过程</span><textarea class="form-control textarea" data-wo-field="process" maxlength="500" rows="4" placeholder="请输入处理过程"></textarea></label>
        <label class="form-field form-span-2"><span class="form-label">处理结果说明</span><textarea class="form-control textarea" data-wo-field="resultNote" maxlength="200" rows="3" placeholder="选填"></textarea></label>
        <div class="form-field form-span-2"><span class="form-label">维修前照片</span><input class="form-control" type="file" accept=".jpg,.jpeg,.png,.gif,.webp,image/*" multiple data-wo-photos-before><div class="form-hint">支持 JPG、JPEG、PNG、GIF、WEBP；最多 5 张，单文件 ≤5MB</div></div>
        <div class="form-field form-span-2"><span class="form-label">维修后照片</span><input class="form-control" type="file" accept=".jpg,.jpeg,.png,.gif,.webp,image/*" multiple data-wo-photos-after><div class="form-hint">支持 JPG、JPEG、PNG、GIF、WEBP；最多 5 张，单文件 ≤5MB</div></div>
      </form>`;
    window.openAppDrawer({
      title: "提交处理结果",
      body,
      footer: `<button class="btn btn-secondary" type="button" data-drawer-close>取消</button>
        <button class="btn btn-primary" type="button" data-wo-confirm-submit>提交</button>`,
    });
  }

  async function confirmSubmit() {
    const form = document.querySelector('[data-wo-form="submit"]');
    if (!form) return;
    const cause = form.querySelector('[data-wo-field="cause"]')?.value?.trim() || "";
    const process = form.querySelector('[data-wo-field="process"]')?.value?.trim() || "";
    const resultNote = form.querySelector('[data-wo-field="resultNote"]')?.value?.trim() || "";
    if (!cause || !process) { toast("请填写事件原因和处理过程"); return; }
    const beforeInput = form.querySelector("[data-wo-photos-before]");
    const afterInput = form.querySelector("[data-wo-photos-after]");
    if ((beforeInput?.files?.length || 0) > 5 || (afterInput?.files?.length || 0) > 5) {
      toast("维修前/后照片各最多 5 张");
      return;
    }
    const before = await readPhotosFromInput(beforeInput);
    if (before === null) return;
    const after = await readPhotosFromInput(afterInput);
    if (after === null) return;
    const filledWorkItems = [...form.querySelectorAll("[data-wo-work-item]")].map((card, index) => {
      const name = card.dataset.woWorkItem || "";
      const result = card.querySelector(`input[name="wo-work-${index}"]:checked`)?.value || "正常";
      const remark = card.querySelector(".inspection-fill-help")?.textContent || "";
      const inputType = card.querySelector(".inspection-fill-type")?.textContent || "单选";
      return { name, remark, inputType, result };
    });
    const workSummary = filledWorkItems.length
      ? `关联检查项：${filledWorkItems.map((entry) => `${entry.name}=${entry.result}`).join("、")}`
      : "";
    const note = [`事件原因：${cause}`, `处理过程：${process}`, resultNote ? `处理结果：${resultNote}` : "", workSummary].filter(Boolean).join("；");
    updateOrder(form.dataset.id, (item) => {
      item.status = "验收中";
      item.processCause = cause;
      item.processDetail = process;
      item.processResult = resultNote;
      item.beforePhotos = before;
      item.afterPhotos = after;
      if (filledWorkItems.length) item.workItems = filledWorkItems;
      pushRecord(item, "提交处理", note, [...before, ...after], item.handler || "处理人");
    });
    window.closeAppDrawer();
    renderOrderTable();
    toast("已提交，进入验收");
  }

  function openAcceptDrawer(item) {
    window.openAppDrawer({
      title: "工单验收",
      body: `<form class="wo-form-grid" data-wo-form="accept" data-id="${esc(item.id)}">
        <div class="form-field form-span-2"><span class="form-label form-required">验收结果</span>
          <div class="inspection-radio-row">
            <label><input type="radio" name="wo-accept-result" value="通过" checked> 通过</label>
            <label><input type="radio" name="wo-accept-result" value="驳回"> 驳回</label>
          </div>
        </div>
        <label class="form-field form-span-2"><span class="form-label">验收意见</span><textarea class="form-control textarea" data-wo-field="acceptNote" maxlength="200" rows="4" placeholder="请输入验收意见"></textarea></label>
      </form>`,
      footer: `<button class="btn btn-secondary" type="button" data-drawer-close>取消</button>
        <button class="btn btn-primary" type="button" data-wo-confirm-accept>确认</button>`,
    });
  }

  function confirmAccept() {
    const form = document.querySelector('[data-wo-form="accept"]');
    if (!form) return;
    const result = form.querySelector('input[name="wo-accept-result"]:checked')?.value || "通过";
    const note = form.querySelector('[data-wo-field="acceptNote"]')?.value?.trim() || "";
    updateOrder(form.dataset.id, (item) => {
      if (result === "通过") {
        item.status = "已完成";
        item.finishedAt = now();
        pushRecord(item, "验收通过", note || "验收通过");
      } else {
        item.status = "待指派";
        item.handler = "";
        pushRecord(item, "验收驳回", note || "验收驳回，重新指派");
      }
    });
    window.closeAppDrawer();
    renderOrderTable();
    toast(result === "通过" ? "验收通过" : "已驳回至待指派");
  }

  function initReportRepairPage() {
    fillFilterSelects();
    bindLocationCascade(document.querySelector("[data-wo-location-filter]"), { includeProject: true });
    renderOrderTable();

    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-person-close], [data-person-cancel]")) { closePersonPicker(); return; }
      if (event.target.closest("[data-person-confirm]")) {
        const person = personnel().find((entry) => entry.id === state.picker.selectedId);
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
      if (deptNode && !event.target.closest("[data-person-dept-toggle]")) {
        state.picker.deptId = deptNode.dataset.personDept || "";
        renderPersonDeptTree();
        renderPersonList();
        return;
      }
      const personPick = event.target.closest("[data-person-pick]");
      if (personPick) {
        state.picker.selectedId = personPick.dataset.personPick;
        renderPersonList();
        renderPersonSelected();
        return;
      }

      const action = event.target.closest("[data-wo-action]")?.dataset.woAction;
      if (action === "expand") {
        const card = document.querySelector("[data-wo-filter-card]") || document.querySelector(".inspection-filters");
        const button = event.target.closest("[data-wo-action='expand']");
        const expanded = card?.classList.toggle("expanded");
        if (button) {
          const label = button.querySelector("span");
          const icon = button.querySelector("i");
          if (label) label.textContent = expanded ? "收起" : "展开";
          if (icon) icon.className = expanded ? "fa-solid fa-chevron-up" : "fa-solid fa-chevron-down";
        }
        return;
      }
      if (action === "search") {
        readFiltersFromDom();
        state.pageIndex = 1;
        renderOrderTable();
        return;
      }
      if (action === "reset") { resetFilters(); return; }
      if (action === "create") { openCreateDrawer(); return; }

      const pageBtn = event.target.closest("[data-wo-page]");
      if (pageBtn) {
        if (pageBtn.dataset.woPage === "prev" && state.pageIndex > 1) state.pageIndex -= 1;
        if (pageBtn.dataset.woPage === "next") state.pageIndex += 1;
        renderOrderTable();
        return;
      }

      const detailTab = event.target.closest("[data-wo-detail-tab]");
      if (detailTab) {
        const item = orderById(detailTab.dataset.id);
        if (item) openDetailDrawer(item, detailTab.dataset.woDetailTab);
        return;
      }

      if (event.target.closest("[data-wo-save-create]")) { saveCreateOrder(); return; }
      if (event.target.closest("[data-wo-confirm-assign]")) { confirmAssign(); return; }
      if (event.target.closest("[data-wo-confirm-withdraw]")) { confirmWithdraw(); return; }
      if (event.target.closest("[data-wo-confirm-submit]")) { confirmSubmit(); return; }
      if (event.target.closest("[data-wo-confirm-accept]")) { confirmAccept(); return; }

      const personTrigger = event.target.closest("[data-wo-person-trigger]");
      if (personTrigger) { openPersonPicker(personTrigger); return; }

      const rowBtn = event.target.closest("[data-wo-row]");
      if (rowBtn) {
        const id = rowBtn.dataset.id;
        const type = rowBtn.dataset.woRow;
        const item = orderById(id);
        if (!item && type !== "more") return;
        if (type === "more") { showOrderMore(rowBtn, id); return; }
        hideMoreMenus();
        if (type === "detail") openDetailDrawer(item);
        if (type === "assign") openAssignDrawer(item);
        if (type === "withdraw") openWithdrawDrawer(item);
        if (type === "start") startOrder(item);
        if (type === "submit") openSubmitDrawer(item);
        if (type === "accept") openAcceptDrawer(item);
        return;
      }

      if (!event.target.closest(".inspection-more-menu") && !event.target.closest('[data-wo-row="more"]')) {
        hideMoreMenus();
      }
    });

    document.addEventListener("input", (event) => {
      if (event.target.matches("[data-person-dept-keyword]")) {
        state.picker.deptKeyword = event.target.value || "";
        renderPersonDeptTree();
      }
    });
  }

  window.WORK_ORDER_HELPERS = {
    esc, now, toast, locationText, statusTag, formatPhone,
    bindLocationCascade, categoriesOfType, childrenOf, flattenTree, activeReportCategories, activeCategoriesForPage,
  };

  if (page === "category") {
    initCategoryPage();
    return;
  }

  if (page === "report-repair" || page === "device-abnormal") {
    initReportRepairPage();
  }
})();
