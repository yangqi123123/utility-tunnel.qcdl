(function () {
  const data = window.DISPATCH_CONFIG_DATA;
  if (!data) return;

  const state = {
    tab: "repair",
    form: data.defaultConfig(),
    savedSnapshot: "",
    openMulti: null,
    picker: null,
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function snapshotOf(form) {
    return JSON.stringify(form);
  }

  function isDirty() {
    return snapshotOf(state.form) !== state.savedSnapshot;
  }

  function showToast(message) {
    let toast = $(".dispatch-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "dispatch-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function clearErrors() {
    $$(".form-error").forEach((el) => el.remove());
    $$(".error").forEach((el) => el.classList.remove("error"));
  }

  function markError(host, message) {
    if (!host) return;
    host.classList.add("error");
    const wrap = host.closest(".form-field") || host.closest(".dispatch-value") || host.parentElement;
    if (!wrap || wrap.querySelector(".form-error")) return;
    const error = document.createElement("span");
    error.className = "form-error";
    error.textContent = message;
    wrap.appendChild(error);
  }

  function avatarText(name) {
    const text = String(name || "").trim();
    return text.length <= 2 ? text : text.slice(-2);
  }

  function avatarColor(name) {
    const palette = ["#F56C6C", "#E6A23C", "#67C23A", "#409EFF", "#909399", "#13C2C2"];
    let hash = 0;
    String(name || "").split("").forEach((ch) => {
      hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    });
    return palette[hash % palette.length];
  }

  function deptById(id, nodes = data.ORG_DEPARTMENTS) {
    for (const node of nodes) {
      if (node.id === id) return node;
      const found = deptById(id, node.children || []);
      if (found) return found;
    }
    return null;
  }

  function deptNameList(node) {
    return node ? [node.name, ...(node.children || []).flatMap((child) => deptNameList(child))] : [];
  }

  function deptPersonCount(names) {
    return data.PERSONNEL.filter((person) => names.includes(person.dept)).length;
  }

  function closePersonPicker() {
    $$(".inspection-person-mask").forEach((mask) => mask.remove());
    state.picker = null;
  }

  function personListFiltered() {
    if (!state.picker) return [];
    const dept = state.picker.deptId ? deptById(state.picker.deptId) : null;
    const names = dept ? deptNameList(dept) : null;
    const keyword = state.picker.keyword.trim().toLowerCase();
    return data.PERSONNEL.filter(
      (person) =>
        (!names || names.includes(person.dept)) &&
        (!keyword || `${person.name} ${person.phone} ${person.dept}`.toLowerCase().includes(keyword))
    );
  }

  function renderPersonDeptTree() {
    const tree = $("#personDeptTree");
    if (!tree || !state.picker) return;
    const keyword = state.picker.deptKeyword.trim().toLowerCase();
    const selfMatched = (node) => !keyword || node.name.toLowerCase().includes(keyword);
    const matched = (node) => selfMatched(node) || (node.children || []).some((child) => matched(child));
    const nodeHtml = (node, level, force) => {
      if (!force && !matched(node)) return "";
      const deep = Boolean(keyword) && (force || selfMatched(node));
      const children = deep ? node.children || [] : (node.children || []).filter((child) => matched(child));
      const collapsed = !keyword && state.picker.deptCollapsed.has(node.id);
      const caret = children.length
        ? `<button class="person-dept-caret fa-solid fa-caret-down${collapsed ? " is-collapsed" : ""}" type="button" data-person-dept-toggle="${esc(node.id)}" aria-label="展开或收起" aria-expanded="${collapsed ? "false" : "true"}"></button>`
        : `<span class="person-dept-caret-placeholder"></span>`;
      const icon = level === 0 ? "fa-solid fa-building" : `fa-solid ${collapsed ? "fa-folder" : "fa-folder-open"}`;
      const head = `<div class="person-dept-node${state.picker.deptId === node.id ? " active" : ""}" data-person-dept="${esc(node.id)}" title="${esc(node.name)}">${caret}<i class="person-dept-icon ${icon}" aria-hidden="true"></i><span class="person-dept-name">${esc(node.name)}</span><span class="person-dept-count">${deptPersonCount(deptNameList(node))}</span></div>`;
      const body = children.length
        ? `<div class="person-dept-children" data-person-dept-children="${esc(node.id)}"${collapsed ? " hidden" : ""}>${children.map((child) => nodeHtml(child, level + 1, deep)).join("")}</div>`
        : "";
      return head + body;
    };
    const all = `<div class="person-dept-node person-dept-all${state.picker.deptId ? "" : " active"}" data-person-dept=""><span class="person-dept-caret-placeholder"></span><i class="person-dept-icon fa-solid fa-users" aria-hidden="true"></i><span class="person-dept-name">全部人员</span><span class="person-dept-count">${data.PERSONNEL.length}</span></div>`;
    tree.innerHTML = all + (data.ORG_DEPARTMENTS.map((node) => nodeHtml(node, 0)).join("") || `<div class="person-dept-empty">暂无匹配部门</div>`);
  }

  function isPersonSelected(id) {
    if (!state.picker) return false;
    if (state.picker.multi) return (state.picker.selectedIds || []).includes(id);
    return state.picker.selectedId === id;
  }

  function renderPersonList() {
    const body = $("#personListBody");
    if (!body || !state.picker) return;
    const list = personListFiltered();
    const inputType = state.picker.multi ? "checkbox" : "radio";
    body.innerHTML = list.length
      ? list
          .map(
            (person) =>
              `<tr class="${isPersonSelected(person.id) ? "active" : ""}"><td class="person-pick-cell"><input type="${inputType}" name="dispatch-person-pick" data-person-pick="${esc(person.id)}" ${isPersonSelected(person.id) ? "checked" : ""} aria-label="选择${esc(person.name)}"></td><td><div class="person-cell"><span class="person-avatar" style="background:${avatarColor(person.name)}">${esc(avatarText(person.name))}</span><div class="person-cell-info"><span class="person-cell-name">${esc(person.name)}</span><span class="person-cell-phone">${esc(person.phone)}</span></div></div></td></tr>`
          )
          .join("")
      : `<tr><td colspan="2"><div class="inspection-empty">暂无匹配人员</div></td></tr>`;
  }

  function renderPersonSelected() {
    const body = $("#personSelectedBody");
    if (!body || !state.picker) return;
    const ids = state.picker.multi
      ? state.picker.selectedIds || []
      : state.picker.selectedId
        ? [state.picker.selectedId]
        : [];
    const people = ids.map((id) => data.PERSONNEL.find((entry) => entry.id === id)).filter(Boolean);
    body.innerHTML = people.length
      ? people
          .map(
            (person) =>
              `<tr><td><div class="person-cell"><span class="person-avatar" style="background:${avatarColor(person.name)}">${esc(avatarText(person.name))}</span><span class="person-cell-name">${esc(person.name)}</span></div></td><td class="person-remove-cell"><button type="button" class="person-remove" data-person-remove="${esc(person.id)}">移除</button></td></tr>`
          )
          .join("")
      : `<tr><td colspan="2"><div class="inspection-empty">暂无选中人员</div></td></tr>`;
  }

  function openPersonPicker(fieldKey) {
    closePersonPicker();
    const multi = fieldKey === "otherCcIds";
    const current = state.form[fieldKey] || [];
    state.picker = {
      fieldKey,
      multi,
      deptId: "",
      keyword: "",
      deptKeyword: "",
      deptCollapsed: new Set(),
      selectedId: multi ? "" : current[0] || "",
      selectedIds: multi ? [...current] : [],
    };
    const mask = document.createElement("div");
    mask.className = "inspection-person-mask";
    mask.innerHTML = `<div class="inspection-person-modal" role="dialog" aria-modal="true" aria-label="选择人员"><div class="inspection-person-head"><h3>选择人员</h3><button class="inspection-person-close" type="button" data-person-close aria-label="关闭">×</button></div><div class="inspection-person-main"><aside class="inspection-person-dept"><div class="inspection-person-dept-head"><i class="fa-solid fa-sitemap" aria-hidden="true"></i><span>组织架构</span></div><div class="inspection-dept-search"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><input class="form-control" id="personDeptKeyword" data-person-dept-keyword placeholder="搜索部门" autocomplete="off"></div><div class="inspection-person-dept-tree" id="personDeptTree"></div></aside><section class="inspection-person-list"><div class="inspection-person-tools"><input class="form-control" id="personKeyword" placeholder="请输入"><button class="btn btn-primary" type="button" data-person-search>搜索</button><button class="btn btn-secondary" type="button" data-person-reset>重置</button></div><div class="inspection-person-table-wrap"><table class="table"><thead><tr><th colspan="2">用户</th></tr></thead><tbody id="personListBody"></tbody></table></div></section><section class="inspection-person-selected"><div class="inspection-person-selected-head"><h4>已选中人员</h4><button class="btn btn-secondary" type="button" data-person-clear>清空选中</button></div><div class="inspection-person-table-wrap"><table class="table"><thead><tr><th>昵称</th><th class="person-remove-cell">操作</th></tr></thead><tbody id="personSelectedBody"></tbody></table></div></section></div><div class="inspection-person-foot"><button class="btn btn-secondary" type="button" data-person-cancel>取消</button><button class="btn btn-primary" type="button" data-person-confirm>确定</button></div></div>`;
    document.body.append(mask);
    renderPersonDeptTree();
    renderPersonList();
    renderPersonSelected();
  }

  function renderRoleUserMode(typeKey, idsKey, roleAttr, userAttr) {
    const isUser = state.form[typeKey] === "user";
    const roleField = $(`[${roleAttr}]`);
    const userField = $(`[${userAttr}]`);
    if (roleField) roleField.hidden = isUser;
    if (userField) userField.hidden = !isUser;
    renderPersonLabel(idsKey);
  }

  function renderPersonLabel(fieldKey) {
    const label = $(`[data-person-label="${fieldKey}"]`);
    if (!label) return;
    const ids = state.form[fieldKey] || [];
    const people = ids.map((id) => data.PERSONNEL.find((item) => item.id === id)).filter(Boolean);
    if (people.length) {
      label.textContent = people.map((person) => person.name).join("、");
      label.classList.remove("is-placeholder");
    } else {
      label.textContent = "请选择用户";
      label.classList.add("is-placeholder");
    }
  }

  function renderAssigneeAcceptorModes() {
    renderRoleUserMode("dispatcherType", "dispatcherIds", "data-dispatcher-role-field", "data-dispatcher-user-field");
    renderRoleUserMode("acceptorType", "acceptorIds", "data-acceptor-role-field", "data-acceptor-user-field");
    renderPersonLabel("otherCcIds");
  }

  function entityNoun() {
    return state.tab === "emergency" ? "事件" : "工单";
  }

  function renderBizLabels() {
    const noun = entityNoun();
    $$("[data-biz-label]").forEach((el) => {
      el.textContent = `${noun}${el.dataset.bizLabel}`;
    });
    $$("[data-biz-assign-hint]").forEach((el) => {
      el.textContent = `期间，未调度的${noun}指派给`;
    });
  }

  function loadTab(tabKey) {
    state.tab = tabKey;
    state.form = clone(data.getTab(tabKey));
    state.savedSnapshot = snapshotOf(state.form);
    state.openMulti = null;
    bindFormControls();
    renderVisibility();
    renderAssigneeAcceptorModes();
    renderBizLabels();
    renderMultiSelects();
    $$("[data-dispatch-tab]").forEach((btn) => {
      const active = btn.dataset.dispatchTab === tabKey;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", String(active));
    });
  }

  function bindFormControls() {
    const form = state.form;
    const autoToggle = $('[data-field="autoDispatchEnabled"]');
    autoToggle?.classList.toggle("on", !!form.autoDispatchEnabled);
    autoToggle?.setAttribute("aria-pressed", String(!!form.autoDispatchEnabled));

    $$('input[name="dispatcherType"]').forEach((input) => {
      input.checked = input.value === form.dispatcherType;
    });
    $$('input[name="acceptorType"]').forEach((input) => {
      input.checked = input.value === form.acceptorType;
    });
    const ccAcceptor = $('[data-field="ccAcceptor"]');
    const ccAssignee = $('[data-field="ccAssignee"]');
    if (ccAcceptor) ccAcceptor.checked = !!form.ccAcceptor;
    if (ccAssignee) ccAssignee.checked = !!form.ccAssignee;
    const start = $('[data-field="startTime"]');
    const end = $('[data-field="endTime"]');
    const remark = $('[data-field="remark"]');
    if (start) start.value = form.startTime || "";
    if (end) end.value = form.endTime || "";
    if (remark) remark.value = form.remark || "";
    const count = $("[data-remark-count]");
    if (count) count.textContent = `${(form.remark || "").length} / 200`;
    clearErrors();
  }

  function renderVisibility() {
    const dispatchBody = $('[data-block="dispatch-body"]');
    const autoBody = $('[data-block="auto-body"]');
    dispatchBody?.classList.toggle("dispatch-section-hidden", !state.form.dispatchEnabled);
    autoBody?.classList.toggle(
      "dispatch-section-hidden",
      !(state.form.dispatchEnabled && state.form.autoDispatchEnabled)
    );
  }

  function sourceForKey(key) {
    if (key === "dispatcherIds" || key === "acceptorIds") return data.ROLES;
    if (key === "departmentIds") return data.DEPARTMENTS;
    if (key === "peopleIds") return data.peopleOfDepartments(state.form.departmentIds || []);
    return [];
  }

  function placeholderForKey(key) {
    if (key === "dispatcherIds" || key === "acceptorIds") return "请选择角色";
    if (key === "departmentIds") return "请选择部门（可多选）";
    if (key === "peopleIds") {
      return (state.form.departmentIds || []).length ? "请选择人员（可多选）" : "请先选择部门";
    }
    return "请选择";
  }

  function prunePeople() {
    const allowed = new Set(data.peopleOfDepartments(state.form.departmentIds || []).map((p) => p.id));
    state.form.peopleIds = (state.form.peopleIds || []).filter((id) => allowed.has(id));
  }

  function resolveItem(id) {
    return (
      data.USERS.find((item) => item.id === id) ||
      data.ROLES.find((item) => item.id === id) ||
      data.DEPARTMENTS.find((item) => item.id === id) ||
      data.PERSONNEL.find((item) => item.id === id)
    );
  }

  function renderMultiSelects() {
    prunePeople();
    const keys = [];
    if (state.form.dispatcherType === "role") keys.push("dispatcherIds");
    if (state.form.acceptorType === "role") keys.push("acceptorIds");
    keys.push("departmentIds", "peopleIds");
    keys.forEach((key) => {
      const component = $(`[data-multi-select="${key}"]`);
      if (!component || component.hidden) return;
      const source = sourceForKey(key);
      const selectedIds = state.form[key] || [];
      const value = component.querySelector(`[data-multi-value="${key}"]`);
      const dropdown = component.querySelector(`[data-multi-options="${key}"]`);
      const control = component.querySelector("[data-multi-trigger]");
      const selected = selectedIds.map((id) => source.find((item) => item.id === id) || resolveItem(id)).filter(Boolean);
      value.innerHTML = selected.length
        ? selected
            .map(
              (item) =>
                `<span class="dispatch-selection-tag">${item.name}<span role="button" tabindex="0" data-tag-remove="${key}" data-tag-id="${item.id}" aria-label="移除${item.name}">×</span></span>`
            )
            .join("")
        : `<span class="dispatch-tag-placeholder">${placeholderForKey(key)}</span>`;
      dropdown.innerHTML = source.length
        ? source
            .map(
              (item) =>
                `<button class="dispatch-tag-option ${selectedIds.includes(item.id) ? "selected" : ""}" type="button" data-multi-option="${key}" data-option-id="${item.id}"><span>${item.name}</span>${selectedIds.includes(item.id) ? '<i class="fa-solid fa-check"></i>' : ""}</button>`
            )
            .join("")
        : `<span class="dispatch-tag-empty">${placeholderForKey(key)}</span>`;
      const disablePeople = key === "peopleIds" && !(state.form.departmentIds || []).length;
      component.classList.toggle("is-disabled", disablePeople);
      component.classList.toggle("open", state.openMulti === key);
      control?.setAttribute("aria-expanded", String(state.openMulti === key));
    });
  }

  function captureSimpleFields() {
    const start = $('[data-field="startTime"]');
    const end = $('[data-field="endTime"]');
    const remark = $('[data-field="remark"]');
    if (start) state.form.startTime = start.value;
    if (end) state.form.endTime = end.value;
    if (remark) state.form.remark = remark.value.slice(0, 200);
    const count = $("[data-remark-count]");
    if (count) count.textContent = `${(state.form.remark || "").length} / 200`;
  }

  function personTriggerHost(fieldKey) {
    return $(`[data-open-person-picker="${fieldKey}"]`);
  }

  function validate() {
    clearErrors();
    captureSimpleFields();
    let valid = true;
    if (state.form.dispatchEnabled && !(state.form.dispatcherIds || []).length) {
      const host =
        state.form.dispatcherType === "user"
          ? personTriggerHost("dispatcherIds")
          : $('[data-multi-select="dispatcherIds"] .dispatch-tag-control');
      markError(host, `请选择${entityNoun()}指派人`);
      valid = false;
    }
    if (state.form.dispatchEnabled && !(state.form.acceptorIds || []).length) {
      const host =
        state.form.acceptorType === "user"
          ? personTriggerHost("acceptorIds")
          : $('[data-multi-select="acceptorIds"] .dispatch-tag-control');
      markError(host, `请选择${entityNoun()}验收人`);
      valid = false;
    }
    if (state.form.dispatchEnabled && state.form.autoDispatchEnabled) {
      if (!state.form.startTime) {
        markError($('[data-field="startTime"]'), "请选择开始时间");
        valid = false;
      }
      if (!state.form.endTime) {
        markError($('[data-field="endTime"]'), "请选择结束时间");
        valid = false;
      }
      if (state.form.startTime && state.form.endTime && state.form.startTime >= state.form.endTime) {
        markError($('[data-field="endTime"]'), "开始时间须早于结束时间");
        valid = false;
      }
      if (!(state.form.departmentIds || []).length) {
        markError($('[data-multi-select="departmentIds"] .dispatch-tag-control'), "请选择部门");
        valid = false;
      }
      if (!(state.form.peopleIds || []).length) {
        markError($('[data-multi-select="peopleIds"] .dispatch-tag-control'), "请选择人员");
        valid = false;
      }
    }
    return valid;
  }

  function save() {
    if (!validate()) return;
    data.saveTab(state.tab, clone(state.form));
    state.savedSnapshot = snapshotOf(state.form);
    showToast("保存成功");
  }

  function requestTabSwitch(nextTab) {
    if (nextTab === state.tab) return;
    const doSwitch = () => loadTab(nextTab);
    if (!isDirty()) {
      doSwitch();
      return;
    }
    if (typeof window.openAppConfirm === "function") {
      window.openAppConfirm({
        title: "提示",
        message: "有未保存的修改，是否放弃？",
        confirmText: "放弃",
        onConfirm: doSwitch,
      });
      return;
    }
    if (window.confirm("有未保存的修改，是否放弃？")) doSwitch();
  }

  document.addEventListener("click", (event) => {
    if (state.picker && $(".inspection-person-mask")) {
      const deptToggle = event.target.closest("[data-person-dept-toggle]");
      if (deptToggle) {
        const id = deptToggle.dataset.personDeptToggle;
        if (state.picker.deptCollapsed.has(id)) state.picker.deptCollapsed.delete(id);
        else state.picker.deptCollapsed.add(id);
        renderPersonDeptTree();
        return;
      }
      const deptNode = event.target.closest("[data-person-dept]");
      if (deptNode) {
        const id = deptNode.dataset.personDept;
        state.picker.deptId = id && state.picker.deptId !== id ? id : "";
        renderPersonDeptTree();
        renderPersonList();
        return;
      }
      if (event.target.closest("[data-person-search]")) {
        const keyword = $("#personKeyword");
        state.picker.keyword = keyword ? keyword.value.trim() : "";
        renderPersonList();
        return;
      }
      if (event.target.closest("[data-person-reset]")) {
        const keyword = $("#personKeyword");
        const deptKeyword = $("#personDeptKeyword");
        if (keyword) keyword.value = "";
        if (deptKeyword) deptKeyword.value = "";
        state.picker.deptId = "";
        state.picker.keyword = "";
        state.picker.deptKeyword = "";
        renderPersonDeptTree();
        renderPersonList();
        return;
      }
      if (event.target.closest("[data-person-clear]")) {
        if (state.picker.multi) state.picker.selectedIds = [];
        else state.picker.selectedId = "";
        renderPersonList();
        renderPersonSelected();
        return;
      }
      const removeBtn = event.target.closest("[data-person-remove]");
      if (removeBtn) {
        const id = removeBtn.dataset.personRemove;
        if (state.picker.multi) {
          state.picker.selectedIds = (state.picker.selectedIds || []).filter((item) => item !== id);
        } else {
          state.picker.selectedId = "";
        }
        renderPersonList();
        renderPersonSelected();
        return;
      }
      const personRow = event.target.closest("#personListBody tr");
      if (personRow) {
        const input = personRow.querySelector("[data-person-pick]");
        if (input) {
          const id = input.dataset.personPick;
          if (state.picker.multi) {
            const list = state.picker.selectedIds || [];
            state.picker.selectedIds = list.includes(id) ? list.filter((item) => item !== id) : list.concat(id);
          } else {
            state.picker.selectedId = id;
          }
          renderPersonList();
          renderPersonSelected();
        }
        return;
      }
      if (event.target.closest("[data-person-confirm]")) {
        const fieldKey = state.picker.fieldKey;
        state.form[fieldKey] = state.picker.multi
          ? [...(state.picker.selectedIds || [])]
          : state.picker.selectedId
            ? [state.picker.selectedId]
            : [];
        renderPersonLabel(fieldKey);
        clearErrors();
        closePersonPicker();
        return;
      }
      if (
        event.target.closest("[data-person-close]") ||
        event.target.closest("[data-person-cancel]") ||
        event.target.classList?.contains("inspection-person-mask")
      ) {
        closePersonPicker();
        return;
      }
      return;
    }

    const tabBtn = event.target.closest("[data-dispatch-tab]");
    if (tabBtn) {
      requestTabSwitch(tabBtn.dataset.dispatchTab);
      return;
    }

    if (event.target.closest('[data-action="save"]')) {
      save();
      return;
    }

    const personPickerBtn = event.target.closest("[data-open-person-picker]");
    if (personPickerBtn) {
      openPersonPicker(personPickerBtn.dataset.openPersonPicker);
      return;
    }

    const toggle = event.target.closest(".dispatch-toggle[data-field]");
    if (toggle) {
      const key = toggle.dataset.field;
      state.form[key] = !state.form[key];
      toggle.classList.toggle("on", !!state.form[key]);
      toggle.setAttribute("aria-pressed", String(!!state.form[key]));
      renderVisibility();
      return;
    }

    const tagRemove = event.target.closest("[data-tag-remove]");
    if (tagRemove) {
      event.stopPropagation();
      const key = tagRemove.dataset.tagRemove;
      const id = tagRemove.dataset.tagId;
      state.form[key] = (state.form[key] || []).filter((item) => item !== id);
      if (key === "departmentIds") prunePeople();
      renderMultiSelects();
      return;
    }

    const multiOption = event.target.closest("[data-multi-option]");
    if (multiOption) {
      const key = multiOption.dataset.multiOption;
      const id = multiOption.dataset.optionId;
      const list = state.form[key] || [];
      state.form[key] = list.includes(id) ? list.filter((item) => item !== id) : list.concat(id);
      state.openMulti = key;
      if (key === "departmentIds") prunePeople();
      renderMultiSelects();
      return;
    }

    const multiTrigger = event.target.closest("[data-multi-trigger]");
    if (multiTrigger && !tagRemove) {
      const key = multiTrigger.dataset.multiTrigger;
      if (key === "peopleIds" && !(state.form.departmentIds || []).length) return;
      if (key === "dispatcherIds" && state.form.dispatcherType === "user") return;
      if (key === "acceptorIds" && state.form.acceptorType === "user") return;
      state.openMulti = state.openMulti === key ? null : key;
      renderMultiSelects();
      return;
    }

    if (!event.target.closest("[data-multi-select]") && state.openMulti) {
      state.openMulti = null;
      renderMultiSelects();
    }
  });

  document.addEventListener("input", (event) => {
    if (event.target.matches("[data-person-dept-keyword]") && state.picker) {
      state.picker.deptKeyword = event.target.value.trim();
      renderPersonDeptTree();
      return;
    }
    if (event.target.matches('[data-field="remark"]')) captureSimpleFields();
  });

  document.addEventListener("change", (event) => {
    if (event.target.name === "dispatcherType") {
      state.form.dispatcherType = event.target.value;
      state.form.dispatcherIds = [];
      state.openMulti = null;
      renderAssigneeAcceptorModes();
      renderMultiSelects();
      return;
    }
    if (event.target.name === "acceptorType") {
      state.form.acceptorType = event.target.value;
      state.form.acceptorIds = [];
      state.openMulti = null;
      renderAssigneeAcceptorModes();
      renderMultiSelects();
      return;
    }
    if (event.target.matches('[data-field="ccAcceptor"]')) {
      state.form.ccAcceptor = event.target.checked;
      return;
    }
    if (event.target.matches('[data-field="ccAssignee"]')) {
      state.form.ccAssignee = event.target.checked;
      return;
    }
    if (event.target.matches('[data-field="startTime"], [data-field="endTime"], [data-field="remark"]')) {
      captureSimpleFields();
    }
  });

  loadTab("repair");
})();
