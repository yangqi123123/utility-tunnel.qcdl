(function () {
  const data = window.ACCESS_CONTROL_DATA;
  if (!data) return;
  const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const tag = (value) => {
    const danger = /\u5931\u8d25|\u79bb\u7ebf|\u6545\u969c|\u672a\u5904\u7406|\u751f\u6548\u4e2d/.test(value) && !/\u6388\u6743|\u6b63\u5e38/.test(value);
    const warning = /\u9884\u8b66|\u5904\u7406\u4e2d|\u5df2\u5230\u671f|\u5f00\u542f|\u672a\u77e5/.test(value);
    const success = /\u6210\u529f|\u5728\u7ebf|\u6b63\u5e38|\u542f\u7528|\u5df2\u5904\u7406|\u5df2\u786e\u8ba4|\u5173\u95ed/.test(value);
    return `<span class="access-tag ${danger ? "danger" : warning ? "warning" : success ? "success" : "primary"}">${esc(value)}</span>`;
  };
  const details = (items) => `<div class="access-detail-grid">${items.map(([label,value]) => `<div class="access-detail-item"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join("")}</div>`;
  const openDrawer = (title, subtitle, body, footer = '<button class="btn btn-secondary" data-drawer-close>\u5173\u95ed</button>') => window.openAppDrawer({ title, subtitle, body, footer });
  const emptyRow = (columns) => `<tr><td colspan="${columns}" class="empty-state">\u5f53\u524d\u7b5b\u9009\u6761\u4ef6\u4e0b\u6682\u65e0\u6570\u636e</td></tr>`;

  function renderOverview() {
    const online = data.devices.filter((item) => item.online === "\u5728\u7ebf").length;
    const unresolved = data.alarms.filter((item) => item.status !== "\u5df2\u5904\u7406").length;
    document.getElementById("overviewMetrics").innerHTML = [
      ["fa-id-card-clip","\u95e8\u7981\u70b9",data.devices.length,""], ["fa-wifi","\u5728\u7ebf\u8bbe\u5907",online,"is-green"],
      ["fa-right-to-bracket","\u4eca\u65e5\u901a\u884c",data.devices.reduce((sum,item)=>sum+item.today,0),"is-cyan"], ["fa-user-xmark","\u901a\u884c\u5931\u8d25",data.records.filter((item)=>item.result === "\u5931\u8d25").length,"is-yellow"],
      ["fa-triangle-exclamation","\u5f85\u5904\u7406告\u8b66",unresolved,"is-red"]
    ].map(([icon,label,value,klass]) => `<section class="card access-metric ${klass}"><span class="access-metric-icon"><i class="fa-solid ${icon}"></i></span><div><span>${label}</span><strong>${value}</strong></div></section>`).join("");
    document.getElementById("doorStatusList").innerHTML = data.devices.map((item,index) => `<button class="access-status-item" data-device-detail="${index}" type="button"><span class="access-status-top"><strong>${esc(item.name)}</strong>${tag(item.online)}</span><small>${esc(item.location)} \u00b7 \u95e8状态 ${esc(item.door)} \u00b7 \u4eca日 ${item.today} \u6b21</small></button>`).join("");
    document.getElementById("latestPassages").innerHTML = data.records.slice(0,4).map((item) => `<li><strong>${esc(item.name)} \u00b7 ${esc(item.device)} ${tag(item.result)}</strong><span>${esc(item.time)} \u00b7 ${esc(item.personType)}</span></li>`).join("");
    document.getElementById("latestAlarms").innerHTML = data.alarms.slice(0,4).map((item) => `<li><strong>${esc(item.type)} \u00b7 ${esc(item.device)}</strong><span>${esc(item.time)} \u00b7 ${esc(item.status)}</span></li>`).join("");
  }

  const CRED_TYPES = ["门禁卡", "人脸", "二维码"];
  function personCredentialTypes(item) {
    if (Array.isArray(item.credentialTypes) && item.credentialTypes.length) return item.credentialTypes;
    if (item.credential) return String(item.credential).split(/[、,，]/).map((x) => x.trim()).filter((x) => CRED_TYPES.includes(x));
    return [];
  }
  function personCredentials(item) {
    if (item.credentials && typeof item.credentials === "object") return { ...item.credentials };
    const types = personCredentialTypes(item);
    const map = {};
    types.forEach((type) => {
      if (type === "门禁卡") map[type] = item.credentialNo || "";
      else map[type] = item.credentialNo ? `已上传${type === "人脸" ? "人脸照片" : "二维码"}` : "";
    });
    return map;
  }
  function credentialTypeText(item) {
    const types = personCredentialTypes(item);
    return types.length ? types.join("、") : "-";
  }
  function credentialValueText(item) {
    const types = personCredentialTypes(item);
    const values = personCredentials(item);
    const parts = types.map((type) => {
      const value = values[type];
      if (!value) return "";
      if (type === "门禁卡") return value;
      return value;
    }).filter(Boolean);
    return parts.length ? parts.join("；") : "-";
  }
  function isPersonBound(item) {
    const hasGroup = (data.groups || []).some((group) => (group.memberIds || []).includes(item.id));
    const hasGrant = (data.grants || []).some((grant) => (grant.personId === item.id || grant.person === item.name) && grant.status === "生效中");
    return Boolean(hasGroup || hasGrant);
  }
  function closePersonMoreMenu() {
    document.querySelectorAll(".access-more-menu").forEach((node) => node.remove());
  }
  function openPersonMoreMenu(button, index) {
    closePersonMoreMenu();
    if (!data.personnel[index]) return;
    const menu = document.createElement("div");
    menu.className = "access-more-menu";
    menu.innerHTML = [
      `<button type="button" data-person-edit="${index}">编辑</button>`,
      `<button type="button" class="is-danger" data-person-delete="${index}">删除</button>`,
    ].join("");
    document.body.appendChild(menu);
    const rect = button.getBoundingClientRect();
    const top = Math.min(rect.bottom + 4, window.innerHeight - menu.offsetHeight - 8);
    const left = Math.min(Math.max(8, rect.right - menu.offsetWidth), window.innerWidth - menu.offsetWidth - 8);
    menu.style.top = `${Math.max(8, top)}px`;
    menu.style.left = `${left}px`;
  }
  function renderCredentialPanels(selected, values = {}) {
    return selected.map((type) => {
      if (type === "门禁卡") {
        return `<label class="form-field access-form-full" data-cred-panel="门禁卡"><span class="form-label form-required">通行凭证（门禁卡号）</span><input class="form-control" data-cred-value="门禁卡" value="${esc(values["门禁卡"] || "")}" placeholder="请输入门禁卡号"></label>`;
      }
      const label = type === "人脸" ? "通行凭证（人脸照片）" : "通行凭证（二维码）";
      const tip = type === "人脸" ? "上传人脸照片" : "上传二维码";
      const uploaded = Boolean(values[type]);
      return `<div class="form-field access-form-full" data-cred-panel="${esc(type)}"><span class="form-label form-required">${label}</span><button class="access-upload-box${uploaded ? " is-uploaded" : ""}" type="button" data-cred-upload="${esc(type)}"><span class="access-upload-plus">${uploaded ? "✓" : "+"}</span><span>${uploaded ? esc(values[type]) : tip}</span></button><span class="access-upload-help">仅支持上传 1 张，格式 jpg / png / webp</span></div>`;
    }).join("");
  }
  function syncCredentialPanels() {
    const host = document.querySelector("[data-cred-panels]");
    if (!host) return;
    const selected = [...document.querySelectorAll("[data-cred-type]:checked")].map((input) => input.value);
    const current = {};
    document.querySelectorAll("[data-cred-value]").forEach((input) => { current[input.dataset.credValue] = input.value.trim(); });
    document.querySelectorAll("[data-cred-upload].is-uploaded").forEach((btn) => { current[btn.dataset.credUpload] = btn.querySelector("span:last-child")?.textContent || `已上传${btn.dataset.credUpload}`; });
    host.innerHTML = renderCredentialPanels(selected, current);
  }

  function renderPersonnel(list = data.personnel) {
    const body = document.getElementById("personnelBody"); if (!body) return;
    body.innerHTML = list.map((item, index) => {
      const realIndex = data.personnel.indexOf(item);
      const idx = realIndex >= 0 ? realIndex : index;
      return `<tr><td><span class="access-primary">${esc(item.name)}</span></td><td>${tag(item.type)}</td><td>${esc(item.department)}</td><td>${esc(item.phone)}</td><td>${esc(credentialTypeText(item))}</td><td class="wrap" title="${esc(credentialValueText(item))}">${esc(credentialValueText(item))}</td><td>${tag(item.status)}</td><td class="access-ledger-actions"><button class="table-action" type="button" data-person-detail="${idx}">查看</button><button class="table-action" type="button" data-person-more="${idx}">更多</button></td></tr>`;
    }).join("") || emptyRow(8);
    document.getElementById("personnelCount").textContent = list.length;
    renderPagination("personnelPagination", list.length);
  }

  const WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
  const PERSON_TYPES = ["管廊运维员", "管线单位检修员", "临时访客", "其他人员"];
  const scheduleById = (id) => (data.schedules || []).find((item) => item.id === id);
  const scheduleUsedCount = (id) => (data.groups || []).filter((group) => group.scheduleId === id).length;
  const pickDevices = () => (data.monitorDevices || []).map((item) => ({
    id: item.id, name: item.name, code: item.code, system: item.system, category: item.type,
    project: item.project, corridor: item.corridor, room: item.room, section: item.section,
    pipeline: item.pipeline, location: item.location,
  }));
  const deviceById = (id) => pickDevices().find((item) => item.id === id);
  const doorsText = (ids = []) => ids.map((id) => deviceById(id)?.name || id).filter(Boolean).join("、") || "-";
  const normalPersonnel = () => (data.personnel || []).filter((item) => item.status === "正常");
  const personById = (id) => (data.personnel || []).find((item) => item.id === id);
  const ECHO_PAGE_SIZE = 5;
  const permDraft = { doorIds: [], memberIds: [], personId: "", personKeyword: "", doorPage: 1, memberPage: 1 };
  const devicePickerState = { keyword: "", code: "", category: "", selected: new Set(), target: "group" };
  const memberPickerState = { name: "", type: "", selected: new Set() };
  function schedulePeriodText(item) {
    const range = `${item.startTime || "00:00"}-${item.endTime || "23:59"}`;
    if (item.repeat === "每日") return range;
    if (item.repeat === "每周") return `${(item.weekdays || []).join("、") || "-"} ${range}`;
    if (item.repeat === "每月") return `${(item.monthDays || []).map((d) => `${d}号`).join("、") || "-"} ${range}`;
    return range;
  }
  function syncPersonnelGroups() {
    (data.personnel || []).forEach((person) => {
      const names = (data.groups || []).filter((group) => (group.memberIds || []).includes(person.id)).map((group) => group.name);
      person.groups = names.length ? names.join("、") : "-";
    });
  }
  function scheduleTimeRow(item = {}) {
    const start = item.startTime || "08:00";
    const end = item.endTime || "18:00";
    return `<div class="access-time-range"><label class="form-field"><span class="form-label form-required">开始时间</span><input class="form-control" type="time" data-sch-field="startTime" value="${esc(start)}"></label><label class="form-field"><span class="form-label form-required">结束时间</span><input class="form-control" type="time" data-sch-field="endTime" value="${esc(end)}"></label></div>`;
  }
  function scheduleDropLabel(labels) {
    return labels.length ? labels.join("、") : "请选择";
  }
  function scheduleMultiDrop(attr, options, selected, labelOf) {
    const picked = options.filter((option) => selected.includes(option));
    return `<div class="access-multi-drop" data-sch-drop>
      <button type="button" class="form-control access-multi-drop-trigger" data-sch-drop-toggle><span data-sch-drop-label>${esc(scheduleDropLabel(picked.map(labelOf)))}</span><i class="fa-solid fa-angle-down"></i></button>
      <div class="access-multi-drop-panel" hidden>${options.map((option) => `<label><input type="checkbox" ${attr} value="${esc(option)}" ${selected.includes(option) ? "checked" : ""}> ${esc(labelOf(option))}</label>`).join("")}</div>
    </div>`;
  }
  function scheduleWindowMarkup(repeat = "每日", item = {}) {
    const timeRow = scheduleTimeRow(item);
    if (repeat === "每周") {
      return `<div class="form-field"><span class="form-label form-required">通行时段</span>${scheduleMultiDrop("data-sch-weekday", WEEKDAYS, item.weekdays || [], (day) => day)}</div>${timeRow}`;
    }
    if (repeat === "每月") {
      const days = Array.from({ length: 31 }, (_, i) => String(i + 1));
      const selected = (item.monthDays || []).map(String);
      return `<div class="form-field"><span class="form-label form-required">通行时段</span>${scheduleMultiDrop("data-sch-monthday", days, selected, (day) => `${day}号`)}</div>${timeRow}`;
    }
    return timeRow;
  }
  function selectedCheckValues(root, selector) {
    return [...(root || document).querySelectorAll(`${selector}:checked`)].map((input) => input.value);
  }
  function syncScheduleDropLabel(drop) {
    const label = drop?.querySelector("[data-sch-drop-label]");
    if (!label) return;
    const values = [...drop.querySelectorAll("input:checked")].map((input) => input.closest("label")?.textContent.trim() || input.value);
    label.textContent = scheduleDropLabel(values);
  }
  function refreshScheduleWindow() {
    const host = document.querySelector("[data-sch-window]");
    const form = document.querySelector("[data-schedule-form]");
    const repeat = form?.querySelector('[data-sch-field="repeat"]')?.value || "每日";
    if (!host) return;
    const current = {
      startTime: form?.querySelector('[data-sch-field="startTime"]')?.value || "08:00",
      endTime: form?.querySelector('[data-sch-field="endTime"]')?.value || "18:00",
      weekdays: selectedCheckValues(form, "[data-sch-weekday]"),
      monthDays: selectedCheckValues(form, "[data-sch-monthday]").map(Number),
    };
    host.innerHTML = scheduleWindowMarkup(repeat, current);
  }
  function openScheduleForm(title, item = {}, index = -1) {
    const repeat = item.repeat || "每日";
    const body = `<form class="access-form-grid" data-schedule-form data-schedule-index="${index}">
      <label class="form-field"><span class="form-label form-required">计划名称</span><input class="form-control" data-sch-field="name" value="${esc(item.name || "")}" placeholder="请输入计划名称"></label>
      <label class="form-field"><span class="form-label form-required">适用日期</span><select class="form-control" data-sch-field="repeat">${["每日", "每周", "每月"].map((option) => `<option ${option === repeat ? "selected" : ""}>${option}</option>`).join("")}</select></label>
      <div class="access-form-full access-schedule-window" data-sch-window>${scheduleWindowMarkup(repeat, item)}</div>
      <label class="form-field"><span class="form-label form-required">状态</span><select class="form-control" data-sch-field="status"><option ${item.status !== "停用" ? "selected" : ""}>启用</option><option ${item.status === "停用" ? "selected" : ""}>停用</option></select></label>
    </form>`;
    openDrawer(title, "门禁系统 · 时间计划", body, '<button class="btn btn-secondary" type="button" data-drawer-close>取消</button><button class="btn btn-primary" type="button" data-schedule-save>保存</button>');
  }
  function saveScheduleForm() {
    const form = document.querySelector("[data-schedule-form]");
    if (!form) return;
    const index = Number(form.dataset.scheduleIndex);
    const name = form.querySelector('[data-sch-field="name"]')?.value.trim() || "";
    const repeat = form.querySelector('[data-sch-field="repeat"]')?.value || "每日";
    const status = form.querySelector('[data-sch-field="status"]')?.value || "启用";
    const startTime = form.querySelector('[data-sch-field="startTime"]')?.value || "";
    const endTime = form.querySelector('[data-sch-field="endTime"]')?.value || "";
    const weekdays = selectedCheckValues(form, "[data-sch-weekday]");
    const monthDays = selectedCheckValues(form, "[data-sch-monthday]").map(Number);
    if (!name || !startTime || !endTime) {
      window.openAppConfirm({ title: "提示", message: "请填写计划名称与通行时段。", confirmText: "知道了", okClass: "btn-primary" });
      return;
    }
    if (repeat === "每周" && !weekdays.length) {
      window.openAppConfirm({ title: "提示", message: "请至少选择一个星期。", confirmText: "知道了", okClass: "btn-primary" });
      return;
    }
    if (repeat === "每月" && !monthDays.length) {
      window.openAppConfirm({ title: "提示", message: "请至少选择一个日期。", confirmText: "知道了", okClass: "btn-primary" });
      return;
    }
    const scheduleId = index >= 0 ? data.schedules[index].id : `SCH${Date.now().toString().slice(-4)}`;
    const used = scheduleUsedCount(scheduleId);
    const commit = () => {
      const payload = { id: scheduleId, name, repeat, weekdays, monthDays, startTime, endTime, status };
      if (index >= 0) data.schedules[index] = payload;
      else data.schedules.unshift(payload);
      window.closeAppDrawer();
      renderPermissions();
    };
    if (status === "停用" && used > 0) {
      window.openAppConfirm({
        title: "确认停用",
        message: `该时间计划已被 ${used} 个权限组引用，停用后相关权限组将无法按计划通行。是否继续？`,
        confirmText: "确认停用",
        onConfirm: commit,
      });
      return;
    }
    commit();
  }
  function scheduleEchoMarkup(scheduleId) {
    const sch = scheduleById(scheduleId);
    return `<label class="form-field"><span class="form-label">适用日期</span><input class="form-control" value="${esc(sch?.repeat || "-")}" readonly></label>
      <label class="form-field"><span class="form-label">通行时段</span><input class="form-control" value="${esc(sch ? schedulePeriodText(sch) : "-")}" readonly></label>`;
  }
  function refreshScheduleEcho() {
    const host = document.querySelector("[data-group-schedule-echo]");
    const scheduleId = document.querySelector('[data-group-field="scheduleId"]')?.value || "";
    if (host) host.innerHTML = scheduleEchoMarkup(scheduleId);
  }
  function echoPageSlice(list, page) {
    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / ECHO_PAGE_SIZE) || 1);
    const safePage = Math.min(Math.max(1, page), totalPages);
    return {
      rows: list.slice((safePage - 1) * ECHO_PAGE_SIZE, safePage * ECHO_PAGE_SIZE),
      page: safePage,
      total,
      totalPages,
    };
  }
  function renderEchoPagination(id, total, page, pageKey) {
    const target = document.getElementById(id);
    if (!target) return page;
    const totalPages = Math.max(1, Math.ceil(total / ECHO_PAGE_SIZE) || 1);
    const safePage = Math.min(Math.max(1, page), totalPages);
    permDraft[pageKey] = safePage;
    target.innerHTML = `<span>共 ${total} 条，每页 ${ECHO_PAGE_SIZE} 条</span><button type="button" data-echo-page="${pageKey}" data-echo-to="${safePage - 1}" ${safePage <= 1 ? "disabled" : ""} aria-label="上一页">‹</button><strong>${safePage}</strong><button type="button" data-echo-page="${pageKey}" data-echo-to="${safePage + 1}" ${safePage >= totalPages ? "disabled" : ""} aria-label="下一页">›</button>`;
    return safePage;
  }
  function selectedDoorRows(ids, removeAttr, page) {
    const all = ids.map((id) => deviceById(id)).filter(Boolean);
    const sliced = echoPageSlice(all, page);
    if (!all.length) return { html: `<tr><td colspan="9"><div class="inspection-empty" style="padding:24px 12px">暂未选择门禁点</div></td></tr>`, ...sliced };
    return {
      ...sliced,
      html: sliced.rows.map((device) => `<tr><td>${esc(device.name)}</td><td>${esc(device.code)}</td><td>${esc(device.system)}</td><td>${esc(device.category)}</td><td>${esc(device.project)}</td><td>${esc(device.corridor)}</td><td>${esc(device.room)}</td><td>${esc(device.location)}</td><td><button class="table-action" type="button" ${removeAttr}="${esc(device.id)}">移除</button></td></tr>`).join(""),
    };
  }
  function selectedMemberRows(ids, page) {
    const all = ids.map((id) => personById(id)).filter(Boolean);
    const sliced = echoPageSlice(all, page);
    if (!all.length) return { html: `<tr><td colspan="8"><div class="inspection-empty" style="padding:24px 12px">暂未添加成员</div></td></tr>`, ...sliced };
    return {
      ...sliced,
      html: sliced.rows.map((person) => `<tr><td>${esc(person.name)}</td><td>${esc(person.type)}</td><td>${esc(person.company)}</td><td>${esc(person.department)}</td><td>${esc(person.phone)}</td><td>${esc(credentialTypeText(person))}</td><td>${tag(person.status)}</td><td><button class="table-action" type="button" data-group-member-remove="${esc(person.id)}">移除</button></td></tr>`).join(""),
    };
  }
  function renderGroupDoorTable() {
    const body = document.getElementById("groupDoorBody");
    if (!body) return;
    const result = selectedDoorRows(permDraft.doorIds, "data-group-door-remove", permDraft.doorPage);
    body.innerHTML = result.html;
    renderEchoPagination("groupDoorPagination", result.total, result.page, "doorPage");
  }
  function renderGroupMemberTable() {
    const body = document.getElementById("groupMemberBody");
    if (!body) return;
    const result = selectedMemberRows(permDraft.memberIds, permDraft.memberPage);
    body.innerHTML = result.html;
    renderEchoPagination("groupMemberPagination", result.total, result.page, "memberPage");
  }
  function renderGrantDoorTable() {
    const body = document.getElementById("grantDoorBody");
    if (!body) return;
    const result = selectedDoorRows(permDraft.doorIds, "data-grant-door-remove", permDraft.doorPage);
    body.innerHTML = result.html;
    renderEchoPagination("grantDoorPagination", result.total, result.page, "doorPage");
  }
  function grantPersonSearchMarkup(selectedId = "") {
    const selected = personById(selectedId);
    return `<div class="form-field access-person-search" data-grant-person-box>
      <span class="form-label form-required">人员</span>
      <input class="form-control" data-grant-person-search placeholder="搜索人员姓名" value="${esc(selected ? `${selected.name}（${selected.type}）` : "")}" autocomplete="off">
      <input type="hidden" data-grant-field="personId" value="${esc(selectedId)}">
      <div class="access-person-search-panel" data-grant-person-panel hidden></div>
    </div>`;
  }
  function renderGrantPersonPanel(keyword = "") {
    const panel = document.querySelector("[data-grant-person-panel]");
    if (!panel) return;
    const q = keyword.trim().toLowerCase();
    const list = normalPersonnel().filter((person) => !q || person.name.toLowerCase().includes(q) || person.type.toLowerCase().includes(q) || person.phone.includes(q));
    panel.hidden = false;
    panel.innerHTML = list.length
      ? list.map((person) => `<button type="button" data-grant-person-pick="${esc(person.id)}"><strong>${esc(person.name)}</strong><span>${esc(person.type)} · ${esc(person.department)} · ${esc(person.phone)}</span></button>`).join("")
      : `<div class="access-person-search-empty">暂无匹配人员</div>`;
  }
  function closeDevicePicker() {
    document.querySelectorAll(".inspection-device-mask").forEach((mask) => mask.remove());
  }
  function closeMemberPicker() {
    document.querySelectorAll(".access-member-mask").forEach((mask) => mask.remove());
  }
  function deviceCategoryOptions() {
    return [...new Set(pickDevices().map((item) => item.category).filter(Boolean))];
  }
  function devicePickerList() {
    const keyword = devicePickerState.keyword.trim().toLowerCase();
    const code = devicePickerState.code.trim().toLowerCase();
    return pickDevices().filter((device) => (!keyword || String(device.name).toLowerCase().includes(keyword)) && (!code || String(device.code).toLowerCase().includes(code)) && (!devicePickerState.category || device.category === devicePickerState.category));
  }
  function renderDevicePicker() {
    const body = document.getElementById("devicePickBody");
    if (!body) return;
    const list = devicePickerList();
    body.innerHTML = list.length
      ? list.map((device) => `<tr data-device-row="${esc(device.id)}"><td class="check-cell"><input type="checkbox" data-device-pick="${esc(device.id)}" ${devicePickerState.selected.has(device.id) ? "checked" : ""} aria-label="选择${esc(device.name)}"></td><td class="device-name-cell">${esc(device.name)}</td><td>${esc(device.code)}</td><td>${esc(device.system)}</td><td>${esc(device.category)}</td><td>${esc(device.project)}</td><td>${esc(device.corridor)}</td><td>${esc(device.room)}</td><td>${esc(device.section)}</td><td>${esc(device.pipeline)}</td><td>${esc(device.location)}</td></tr>`).join("")
      : `<tr><td colspan="11"><div class="inspection-empty">暂无匹配设备</div></td></tr>`;
    const count = document.getElementById("devicePickCount");
    if (count) count.textContent = `共 ${list.length} 条记录，已选 ${devicePickerState.selected.size} 条`;
    const selectAll = document.querySelector("[data-device-select-all]");
    if (selectAll) selectAll.checked = list.length > 0 && list.every((device) => devicePickerState.selected.has(device.id));
  }
  function openDevicePicker(target = "group") {
    closeDevicePicker();
    devicePickerState.target = target;
    devicePickerState.keyword = "";
    devicePickerState.code = "";
    devicePickerState.category = "";
    devicePickerState.selected = new Set(permDraft.doorIds);
    const mask = document.createElement("div");
    mask.className = "inspection-device-mask";
    mask.innerHTML = `<div class="inspection-device-modal" role="dialog" aria-modal="true" aria-label="选择设备"><div class="inspection-device-head"><h3>选择设备</h3><button class="inspection-device-close" type="button" data-device-close aria-label="关闭">×</button></div><div class="inspection-device-body"><div class="inspection-device-filters"><label class="form-field"><span class="form-label">设备名称</span><input class="form-control" id="devicePickName" placeholder="请输入设备名称"></label><label class="form-field"><span class="form-label">设备编码</span><input class="form-control" id="devicePickCode" placeholder="请输入设备编码"></label><label class="form-field"><span class="form-label">设备分类</span><select class="form-control" id="devicePickCategory"><option value="">请选择</option>${deviceCategoryOptions().map((category) => `<option value="${esc(category)}">${esc(category)}</option>`).join("")}</select></label><div class="inspection-device-filter-actions"><button class="btn btn-secondary" type="button" data-device-reset>重置</button><button class="btn btn-primary" type="button" data-device-search>搜索</button></div></div><div class="inspection-device-tablewrap"><table class="table inspection-device-pick-table"><thead><tr><th class="check-cell"><input type="checkbox" data-device-select-all aria-label="全选"></th><th>设备名称</th><th>设备编码</th><th>所属系统</th><th>设备分类</th><th>所属项目</th><th>所属管廊</th><th>所属舱室</th><th>所属区段</th><th>所属管线</th><th>安装位置</th></tr></thead><tbody id="devicePickBody"></tbody></table></div></div><div class="inspection-device-foot"><span class="inspection-device-count" id="devicePickCount"></span><div class="inspection-device-foot-actions"><button class="btn btn-secondary" type="button" data-device-cancel>取消</button><button class="btn btn-primary" type="button" data-device-confirm>确定</button></div></div></div>`;
    document.body.append(mask);
    renderDevicePicker();
  }
  function memberPickerList() {
    const name = memberPickerState.name.trim().toLowerCase();
    return normalPersonnel().filter((person) => (!name || person.name.toLowerCase().includes(name)) && (!memberPickerState.type || person.type === memberPickerState.type));
  }
  function renderMemberPicker() {
    const body = document.getElementById("memberPickBody");
    if (!body) return;
    const list = memberPickerList();
    body.innerHTML = list.length
      ? list.map((person) => `<tr data-member-row="${esc(person.id)}"><td class="check-cell"><input type="checkbox" data-member-pick="${esc(person.id)}" ${memberPickerState.selected.has(person.id) ? "checked" : ""}></td><td>${esc(person.name)}</td><td>${tag(person.type)}</td><td>${esc(person.department)}</td><td>${esc(person.phone)}</td><td>${esc(credentialTypeText(person))}</td><td>${tag(person.status)}</td></tr>`).join("")
      : `<tr><td colspan="7"><div class="inspection-empty">暂无匹配人员</div></td></tr>`;
    const count = document.getElementById("memberPickCount");
    if (count) count.textContent = `共 ${list.length} 条记录，已选 ${memberPickerState.selected.size} 条`;
    const selectAll = document.querySelector("[data-member-select-all]");
    if (selectAll) selectAll.checked = list.length > 0 && list.every((person) => memberPickerState.selected.has(person.id));
  }
  function openMemberPicker() {
    closeMemberPicker();
    memberPickerState.name = "";
    memberPickerState.type = "";
    memberPickerState.selected = new Set(permDraft.memberIds);
    const mask = document.createElement("div");
    mask.className = "access-member-mask";
    mask.innerHTML = `<div class="access-member-modal" role="dialog" aria-modal="true" aria-label="添加成员"><div class="inspection-device-head"><h3>添加成员</h3><button class="inspection-device-close" type="button" data-member-close aria-label="关闭">×</button></div><div class="inspection-device-body"><div class="access-member-filters"><label class="form-field"><span class="form-label">姓名</span><input class="form-control" id="memberPickName" placeholder="请输入姓名"></label><label class="form-field"><span class="form-label">人员类型</span><select class="form-control" id="memberPickType"><option value="">全部类型</option>${PERSON_TYPES.map((type) => `<option value="${esc(type)}">${esc(type)}</option>`).join("")}</select></label><div class="inspection-device-filter-actions"><button class="btn btn-secondary" type="button" data-member-reset>重置</button><button class="btn btn-primary" type="button" data-member-search>搜索</button></div></div><div class="inspection-device-tablewrap"><table class="table access-member-pick-table"><thead><tr><th class="check-cell"><input type="checkbox" data-member-select-all aria-label="全选"></th><th>姓名</th><th>人员类型</th><th>部门</th><th>联系方式</th><th>凭证类型</th><th>状态</th></tr></thead><tbody id="memberPickBody"></tbody></table></div></div><div class="inspection-device-foot"><span class="inspection-device-count" id="memberPickCount"></span><div class="inspection-device-foot-actions"><button class="btn btn-secondary" type="button" data-member-cancel>取消</button><button class="btn btn-primary" type="button" data-member-confirm>确定</button></div></div></div>`;
    document.body.append(mask);
    renderMemberPicker();
  }
  function openGroupForm(title, item = {}, index = -1) {
    const schedules = (data.schedules || []).filter((sch) => sch.status === "启用" || sch.id === item.scheduleId);
    permDraft.doorIds = [...(item.doorIds || [])];
    permDraft.memberIds = [...(item.memberIds || [])];
    permDraft.doorPage = 1;
    permDraft.memberPage = 1;
    const body = `<form class="access-form-grid" data-group-form data-group-index="${index}">
      <label class="form-field"><span class="form-label form-required">权限组名称</span><input class="form-control" data-group-field="name" value="${esc(item.name || "")}" placeholder="请输入权限组名称"></label>
      <label class="form-field"><span class="form-label form-required">时间计划</span><select class="form-control" data-group-field="scheduleId"><option value="">请选择时间计划</option>${schedules.map((sch) => `<option value="${esc(sch.id)}" ${sch.id === item.scheduleId ? "selected" : ""}>${esc(sch.name)}</option>`).join("")}</select></label>
      <div class="access-form-full access-schedule-echo" data-group-schedule-echo>${scheduleEchoMarkup(item.scheduleId)}</div>
      <label class="form-field"><span class="form-label form-required">状态</span><select class="form-control" data-group-field="status"><option ${item.status !== "停用" ? "selected" : ""}>启用</option><option ${item.status === "停用" ? "selected" : ""}>停用</option></select></label>
      <div class="form-field access-form-full"><span class="form-label form-required">门禁点范围</span>
        <div class="inspection-device-box"><div class="inspection-device-box-head"><span>已选门禁点</span><button class="btn btn-primary" type="button" data-group-door-select>选择设备</button></div>
        <div class="inspection-device-box-body access-pick-echo-panel"><div class="access-pick-echo-scroll"><table class="table access-pick-echo-table table-actions-sticky"><thead><tr><th>设备名称</th><th>设备编码</th><th>所属系统</th><th>设备分类</th><th>所属项目</th><th>所属管廊</th><th>所属舱室</th><th>安装位置</th><th>操作</th></tr></thead><tbody id="groupDoorBody"></tbody></table></div><div class="access-pagination access-pick-echo-page" id="groupDoorPagination"></div></div></div>
      </div>
      <div class="form-field access-form-full"><span class="form-label form-required">组成员</span>
        <div class="inspection-device-box"><div class="inspection-device-box-head"><span>已选成员</span><button class="btn btn-primary" type="button" data-group-member-select>添加成员</button></div>
        <div class="inspection-device-box-body access-pick-echo-panel"><div class="access-pick-echo-scroll"><table class="table access-pick-echo-table table-actions-sticky"><thead><tr><th>姓名</th><th>人员类型</th><th>所属单位</th><th>部门</th><th>联系方式</th><th>凭证类型</th><th>状态</th><th>操作</th></tr></thead><tbody id="groupMemberBody"></tbody></table></div><div class="access-pagination access-pick-echo-page" id="groupMemberPagination"></div></div></div>
      </div>
    </form>`;
    openDrawer(title, "门禁系统 · 权限组", body, '<button class="btn btn-secondary" type="button" data-drawer-close>取消</button><button class="btn btn-primary" type="button" data-group-save>保存</button>');
    renderGroupDoorTable();
    renderGroupMemberTable();
  }
  function saveGroupForm() {
    const form = document.querySelector("[data-group-form]");
    if (!form) return;
    const index = Number(form.dataset.groupIndex);
    const name = form.querySelector('[data-group-field="name"]')?.value.trim() || "";
    const scheduleId = form.querySelector('[data-group-field="scheduleId"]')?.value || "";
    const status = form.querySelector('[data-group-field="status"]')?.value || "启用";
    if (!name || !scheduleId || !permDraft.doorIds.length || !permDraft.memberIds.length) {
      window.openAppConfirm({ title: "提示", message: "请完整填写权限组信息，并至少选择一个门禁点和一名成员。", confirmText: "知道了", okClass: "btn-primary" });
      return;
    }
    const payload = {
      id: index >= 0 ? data.groups[index].id : `G${Date.now().toString().slice(-4)}`,
      name, memberIds: [...permDraft.memberIds], doorIds: [...permDraft.doorIds], scheduleId, status,
    };
    if (index >= 0) data.groups[index] = payload;
    else data.groups.unshift(payload);
    syncPersonnelGroups();
    window.closeAppDrawer();
    renderPermissions();
  }
  function openGrantForm(title, item = {}, index = -1) {
    permDraft.doorIds = [...(item.doorIds || [])];
    permDraft.personId = item.personId || "";
    permDraft.doorPage = 1;
    const body = `<form class="access-form-grid" data-grant-form data-grant-index="${index}">
      ${grantPersonSearchMarkup(item.personId || "")}
      <label class="form-field"><span class="form-label form-required">生效时间</span><input class="form-control" type="datetime-local" data-grant-field="start" value="${esc((item.start || "").replace(" ", "T"))}"></label>
      <label class="form-field"><span class="form-label form-required">失效时间</span><input class="form-control" type="datetime-local" data-grant-field="end" value="${esc((item.end || "").replace(" ", "T"))}"></label>
      <label class="form-field access-form-full"><span class="form-label form-required">授权原因</span><input class="form-control" data-grant-field="reason" value="${esc(item.reason || "")}" placeholder="请输入授权原因"></label>
      <div class="form-field access-form-full"><span class="form-label form-required">门禁点</span>
        <div class="inspection-device-box"><div class="inspection-device-box-head"><span>已选门禁点</span><button class="btn btn-primary" type="button" data-grant-door-select>选择设备</button></div>
        <div class="inspection-device-box-body access-pick-echo-panel"><div class="access-pick-echo-scroll"><table class="table access-pick-echo-table table-actions-sticky"><thead><tr><th>设备名称</th><th>设备编码</th><th>所属系统</th><th>设备分类</th><th>所属项目</th><th>所属管廊</th><th>所属舱室</th><th>安装位置</th><th>操作</th></tr></thead><tbody id="grantDoorBody"></tbody></table></div><div class="access-pagination access-pick-echo-page" id="grantDoorPagination"></div></div></div>
      </div>
    </form>`;
    openDrawer(title, "门禁系统 · 个人授权", body, '<button class="btn btn-secondary" type="button" data-drawer-close>取消</button><button class="btn btn-primary" type="button" data-grant-save>保存</button>');
    renderGrantDoorTable();
  }
  function saveGrantForm() {
    const form = document.querySelector("[data-grant-form]");
    if (!form) return;
    const index = Number(form.dataset.grantIndex);
    const personId = form.querySelector('[data-grant-field="personId"]')?.value || "";
    const person = personById(personId);
    const start = (form.querySelector('[data-grant-field="start"]')?.value || "").replace("T", " ");
    const end = (form.querySelector('[data-grant-field="end"]')?.value || "").replace("T", " ");
    const reason = form.querySelector('[data-grant-field="reason"]')?.value.trim() || "";
    if (!person || !permDraft.doorIds.length || !start || !end || !reason) {
      window.openAppConfirm({ title: "提示", message: "请完整填写个人授权信息，并至少选择一个门禁点。", confirmText: "知道了", okClass: "btn-primary" });
      return;
    }
    const status = end < "2026-10-14 00:00" ? "已到期" : "生效中";
    const payload = {
      id: index >= 0 ? data.grants[index].id : `GR${Date.now().toString().slice(-4)}`,
      personId, person: person.name, doorIds: [...permDraft.doorIds], start, end, reason, status,
    };
    if (index >= 0) data.grants[index] = payload;
    else data.grants.unshift(payload);
    window.closeAppDrawer();
    renderPermissions();
  }
  function openPermMoreMenu(button, editAttr, deleteAttr, index) {
    closePersonMoreMenu();
    const menu = document.createElement("div");
    menu.className = "access-more-menu";
    menu.innerHTML = `<button type="button" ${editAttr}="${index}">编辑</button><button type="button" class="is-danger" ${deleteAttr}="${index}">删除</button>`;
    document.body.appendChild(menu);
    const rect = button.getBoundingClientRect();
    const top = Math.min(rect.bottom + 4, window.innerHeight - menu.offsetHeight - 8);
    const left = Math.min(Math.max(8, rect.right - menu.offsetWidth), window.innerWidth - menu.offsetWidth - 8);
    menu.style.top = `${Math.max(8, top)}px`;
    menu.style.left = `${left}px`;
  }
  function deleteSchedule(index) {
    const item = data.schedules[index];
    if (!item) return;
    if (scheduleUsedCount(item.id) > 0) {
      window.openAppConfirm({ title: "无法删除", message: "该时间计划已关联权限组，不允许删除。", confirmText: "知道了", okClass: "btn-primary" });
      return;
    }
    window.openAppConfirm({
      title: "删除时间计划",
      message: `确认删除「${item.name}」吗？`,
      confirmText: "确认删除",
      onConfirm: () => { data.schedules.splice(index, 1); renderPermissions(); },
    });
  }
  function deleteGroup(index) {
    const item = data.groups[index];
    if (!item) return;
    window.openAppConfirm({
      title: "删除权限组",
      message: `确认删除「${item.name}」吗？`,
      confirmText: "确认删除",
      onConfirm: () => { data.groups.splice(index, 1); syncPersonnelGroups(); renderPermissions(); },
    });
  }
  function deleteGrant(index) {
    const item = data.grants[index];
    if (!item) return;
    window.openAppConfirm({
      title: "删除个人授权",
      message: `确认删除「${item.person}」的个人授权吗？`,
      confirmText: "确认删除",
      onConfirm: () => { data.grants.splice(index, 1); renderPermissions(); },
    });
  }

  function renderPermissions(groups = data.groups, grants = data.grants, schedules = data.schedules) {
    syncPersonnelGroups();
    const groupBody = document.getElementById("groupBody");
    const grantBody = document.getElementById("grantBody");
    const scheduleBody = document.getElementById("scheduleBody");
    if (scheduleBody) {
      scheduleBody.innerHTML = schedules.map((item, index) => {
        const realIndex = data.schedules.indexOf(item);
        const idx = realIndex >= 0 ? realIndex : index;
        return `<tr><td><span class="access-primary">${esc(item.name)}</span></td><td>${esc(item.repeat)}</td><td class="wrap" title="${esc(schedulePeriodText(item))}">${esc(schedulePeriodText(item))}</td><td>${scheduleUsedCount(item.id)}</td><td>${tag(item.status)}</td><td class="access-ledger-actions"><button class="table-action" type="button" data-schedule-detail="${idx}">查看</button><button class="table-action" type="button" data-schedule-more="${idx}">更多</button></td></tr>`;
      }).join("") || emptyRow(6);
      renderPagination("schedulePagination", schedules.length);
    }
    if (groupBody) {
      groupBody.innerHTML = groups.map((item, index) => {
        const realIndex = data.groups.indexOf(item);
        const idx = realIndex >= 0 ? realIndex : index;
        const sch = scheduleById(item.scheduleId);
        return `<tr><td><span class="access-primary">${esc(item.name)}</span></td><td>${(item.memberIds || []).length}</td><td class="wrap" title="${esc(doorsText(item.doorIds))}">${esc(doorsText(item.doorIds))}</td><td>${esc(sch?.name || "-")}</td><td>${tag(item.status)}</td><td class="access-ledger-actions"><button class="table-action" type="button" data-group-detail="${idx}">查看</button><button class="table-action" type="button" data-group-more="${idx}">更多</button></td></tr>`;
      }).join("") || emptyRow(6);
      renderPagination("groupPagination", groups.length);
    }
    if (grantBody) {
      grantBody.innerHTML = grants.map((item, index) => {
        const realIndex = data.grants.indexOf(item);
        const idx = realIndex >= 0 ? realIndex : index;
        const doors = doorsText(item.doorIds);
        return `<tr><td><span class="access-primary">${esc(item.person)}</span></td><td class="wrap" title="${esc(doors)}">${esc(doors)}</td><td>${esc(item.start)}</td><td>${esc(item.end)}</td><td class="wrap">${esc(item.reason)}</td><td>${tag(item.status)}</td><td class="access-ledger-actions"><button class="table-action" type="button" data-grant-detail="${idx}">查看</button><button class="table-action" type="button" data-grant-more="${idx}">更多</button></td></tr>`;
      }).join("") || emptyRow(7);
      renderPagination("grantPagination", grants.length);
    }
  }

  function renderBlacklist(list = data.blacklist) {
    const body = document.getElementById("blacklistBody"); if (!body) return;
    body.innerHTML = list.map((item,index) => `<tr><td><span class="access-primary">${esc(item.name)}</span></td><td>${esc(item.phone)}</td><td>${esc(item.department)}</td><td class="wrap">${esc(item.reason)}</td><td>${esc(item.start)}</td><td>${esc(item.end)}</td><td>${tag(item.status)}</td><td>${esc(item.creator)}</td><td><button class="table-action" data-black-detail="${index}">\u67e5\u770b</button></td></tr>`).join("") || emptyRow(9);
    document.getElementById("blacklistCount").textContent = list.length;
    renderPagination("blacklistPagination", list.length);
  }

  function renderDevices(list = data.devices) {
    const body = document.getElementById("deviceBody"); if (!body) return;
    body.innerHTML = list.map((item,index) => `<tr><td><span class="access-primary">${esc(item.name)}</span></td><td>${esc(item.location)}</td><td>${tag(item.door)}</td><td>${tag(item.online)}</td><td>${esc(item.heartbeat)}</td><td>${esc(item.lastPass)}</td><td>${item.today}</td><td>${item.abnormal ? tag(String(item.abnormal)) : "0"}</td><td>${esc(item.camera)}</td><td><button class="table-action" data-device-detail="${index}">\u67e5\u770b</button></td></tr>`).join("") || emptyRow(10);
    document.getElementById("deviceCount").textContent = list.length;
    renderPagination("devicePagination", list.length);
  }

  function renderRecords(list = data.records) {
    const body = document.getElementById("recordBody"); if (!body) return;
    body.innerHTML = list.map((item,index) => `<tr><td>${index+1}</td><td><span class="access-primary">${esc(item.name)}</span></td><td>${tag(item.personType)}</td><td>${esc(item.org.split(" / ").pop())}</td><td>${esc(item.credential)}</td><td>${esc(item.device)}</td><td>${esc(item.location)}</td><td>${esc(item.time)}</td><td>${esc(item.direction)}</td><td>${tag(item.result)}</td><td>${item.reason === "-" ? "-" : `<span class="status-danger">${esc(item.reason)}</span>`}</td><td><button class="table-action" data-record-detail="${index}">\u67e5\u770b</button></td></tr>`).join("") || emptyRow(12);
    document.getElementById("recordCount").textContent = list.length;
    renderPagination("recordPagination", list.length);
  }

  function renderAlarms(list = data.alarms) {
    const body = document.getElementById("alarmBody"); if (!body) return;
    body.innerHTML = list.map((item,index) => `<tr><td>${esc(item.id)}</td><td>${esc(item.type)}</td><td>${tag(item.level)}</td><td>${esc(item.person)}</td><td>${esc(item.device)}</td><td>${esc(item.location)}</td><td>${esc(item.time)}</td><td>${tag(item.status)}</td><td><button class="table-action" data-alarm-detail="${index}">\u8be6\u60c5</button>${item.status !== "\u5df2\u5904\u7406" ? `<button class="table-action" data-alarm-process="${index}">\u5904\u7406</button>` : ""}</td></tr>`).join("") || emptyRow(9);
    document.getElementById("alarmCount").textContent = list.length;
    const pending = document.getElementById("pendingAlarmCount"); if (pending) pending.textContent = list.filter((item)=>item.status !== "\u5df2\u5904\u7406").length;
    renderPagination("alarmPagination", list.length);
  }

  function renderPagination(id, total) {
    const target = document.getElementById(id); if (!target) return;
    target.innerHTML = `<span>\u5171 ${total} \u6761，\u6bcf\u9875 10 \u6761</span><button type="button" aria-label="\u4e0a\u4e00\u9875" disabled>‹</button><strong>1</strong><button type="button" aria-label="\u4e0b\u4e00\u9875" disabled>›</button>`;
  }

  function personForm(title, item = {}, index = -1) {
    const selected = personCredentialTypes(item);
    const values = personCredentials(item);
    const typeOptions = ["管廊运维员", "管线单位检修员", "临时访客", "其他人员"];
    const body = `<form class="access-form-grid" data-person-form data-person-index="${index}">
      <label class="form-field"><span class="form-label form-required">姓名</span><input class="form-control" name="name" value="${esc(item.name || "")}" placeholder="请输入姓名"></label>
      <label class="form-field"><span class="form-label form-required">人员类型</span><select class="form-control" name="type">${typeOptions.map((option) => `<option ${option === (item.type || "管廊运维员") ? "selected" : ""}>${option}</option>`).join("")}</select></label>
      <label class="form-field"><span class="form-label form-required">所属单位</span><input class="form-control" name="company" value="${esc(item.company || "")}" placeholder="请输入所属单位"></label>
      <label class="form-field"><span class="form-label">所属部门</span><input class="form-control" name="department" value="${esc(item.department || "")}" placeholder="请输入所属部门"></label>
      <label class="form-field"><span class="form-label form-required">联系方式</span><input class="form-control" name="phone" value="${esc(item.phone || "")}" placeholder="请输入联系方式"></label>
      <div class="form-field access-form-full"><span class="form-label form-required">凭证类型</span><div class="access-check-row">${CRED_TYPES.map((type) => `<label><input type="checkbox" data-cred-type value="${type}" ${selected.includes(type) ? "checked" : ""}> ${type}</label>`).join("")}</div></div>
      <div class="access-form-full access-cred-panels" data-cred-panels>${renderCredentialPanels(selected, values)}</div>
    </form>`;
    openDrawer(title, "门禁系统 · 人员管理", body, '<button class="btn btn-secondary" type="button" data-drawer-close>取消</button><button class="btn btn-primary" type="button" data-person-save>保存</button>');
  }

  function readPersonForm() {
    const form = document.querySelector("[data-person-form]");
    if (!form) return null;
    const selected = [...form.querySelectorAll("[data-cred-type]:checked")].map((input) => input.value);
    const credentials = {};
    selected.forEach((type) => {
      if (type === "门禁卡") credentials[type] = form.querySelector('[data-cred-value="门禁卡"]')?.value.trim() || "";
      else {
        const btn = form.querySelector(`[data-cred-upload="${type}"]`);
        credentials[type] = btn?.classList.contains("is-uploaded") ? (btn.querySelector("span:last-child")?.textContent || `已上传${type === "人脸" ? "人脸照片" : "二维码"}`) : "";
      }
    });
    return {
      index: Number(form.dataset.personIndex),
      name: form.querySelector('[name="name"]')?.value.trim() || "",
      type: form.querySelector('[name="type"]')?.value || "",
      company: form.querySelector('[name="company"]')?.value.trim() || "",
      department: form.querySelector('[name="department"]')?.value.trim() || "",
      phone: form.querySelector('[name="phone"]')?.value.trim() || "",
      credentialTypes: selected,
      credentials,
    };
  }

  function savePersonForm() {
    const values = readPersonForm();
    if (!values) return;
    if (!values.name || !values.company || !values.phone) {
      window.openAppConfirm({ title: "提示", message: "请填写姓名、所属单位和联系方式。", confirmText: "知道了", okClass: "btn-primary" });
      return;
    }
    if (!values.credentialTypes.length) {
      window.openAppConfirm({ title: "提示", message: "请至少选择一种凭证类型。", confirmText: "知道了", okClass: "btn-primary" });
      return;
    }
    for (const type of values.credentialTypes) {
      if (!values.credentials[type]) {
        window.openAppConfirm({ title: "提示", message: type === "门禁卡" ? "请输入门禁卡号。" : `请上传${type === "人脸" ? "人脸照片" : "二维码"}。`, confirmText: "知道了", okClass: "btn-primary" });
        return;
      }
    }
    const payload = {
      id: values.index >= 0 ? data.personnel[values.index].id : `P${String(Date.now()).slice(-4)}`,
      name: values.name,
      type: values.type,
      company: values.company,
      department: values.department,
      phone: values.phone,
      credentialTypes: values.credentialTypes,
      credentials: values.credentials,
      status: values.index >= 0 ? data.personnel[values.index].status : "正常",
      groups: values.index >= 0 ? data.personnel[values.index].groups : "-",
    };
    if (values.index >= 0) data.personnel[values.index] = payload;
    else data.personnel.unshift(payload);
    window.closeAppDrawer();
    renderPersonnel();
  }

  function deletePerson(index) {
    const item = data.personnel[index];
    if (!item) return;
    if (isPersonBound(item)) {
      window.openAppConfirm({ title: "无法删除", message: "该人员已绑定通行权限，不允许删除。", confirmText: "知道了", okClass: "btn-primary" });
      return;
    }
    window.openAppConfirm({
      title: "删除人员",
      message: `确认删除「${item.name}」吗？`,
      confirmText: "确认删除",
      onConfirm: () => {
        data.personnel.splice(index, 1);
        renderPersonnel();
      },
    });
  }

  function bindFilters() {
    document.querySelector('[data-action="search"]')?.addEventListener("click", () => {
      const q = (document.querySelector('[data-filter="keyword"]')?.value || "").trim().toLowerCase();
      const type = document.querySelector('[data-filter="type"]')?.value || "";
      const status = document.querySelector('[data-filter="status"]')?.value || "";
      const page = document.body.dataset.accessPage;
      if (page === "personnel") renderPersonnel(data.personnel.filter((x)=>JSON.stringify(x).toLowerCase().includes(q) && (!type || x.type===type) && (!status || x.status===status)));
      if (page === "permissions") renderPermissions(data.groups.filter((x)=>JSON.stringify(x).toLowerCase().includes(q) && (!status || x.status===status)), data.grants.filter((x)=>JSON.stringify(x).toLowerCase().includes(q) && (!status || x.status===status)), data.schedules.filter((x)=>JSON.stringify(x).toLowerCase().includes(q) && (!status || x.status===status)));
      if (page === "blacklist") renderBlacklist(data.blacklist.filter((x)=>JSON.stringify(x).toLowerCase().includes(q) && (!status || x.status===status)));
      if (page === "devices") renderDevices(data.devices.filter((x)=>JSON.stringify(x).toLowerCase().includes(q) && (!status || x.online===status)));
      if (page === "records") renderRecords(data.records.filter((x)=>JSON.stringify(x).toLowerCase().includes(q) && (!type || x.personType===type) && (!status || x.result===status)));
      if (page === "alarms") renderAlarms(data.alarms.filter((x)=>JSON.stringify(x).toLowerCase().includes(q) && (!type || x.type===type) && (!status || x.status===status)));
    });
    document.querySelector('[data-action="reset"]')?.addEventListener("click", () => { document.querySelectorAll("[data-filter]").forEach((field)=>field.value=""); init(); });
  }

  function bindActions() {
    document.addEventListener("click", (event) => {
      const tab = event.target.closest("[data-access-tab]");
      if (tab) { document.querySelectorAll("[data-access-tab]").forEach((x)=>x.classList.toggle("active",x===tab)); document.querySelectorAll("[data-access-pane]").forEach((x)=>x.hidden=x.dataset.accessPane!==tab.dataset.accessTab); }
      const personDetail = event.target.closest("[data-person-detail]");
      if (personDetail) {
        closePersonMoreMenu();
        const x = data.personnel[+personDetail.dataset.personDetail];
        openDrawer("人员档案", `人员编号 ${x.id}`, details([
          ["姓名", x.name], ["人员类型", x.type], ["单位 / 部门", `${x.company} / ${x.department}`],
          ["联系方式", x.phone], ["凭证类型", credentialTypeText(x)], ["通行凭证", credentialValueText(x)],
          ["权限组", x.groups], ["人员状态", x.status],
        ]));
        return;
      }
      const personMore = event.target.closest("[data-person-more]");
      if (personMore) {
        event.stopPropagation();
        openPersonMoreMenu(personMore, +personMore.dataset.personMore);
        return;
      }
      const personEdit = event.target.closest("[data-person-edit]");
      if (personEdit) {
        closePersonMoreMenu();
        const idx = +personEdit.dataset.personEdit;
        personForm("编辑人员", data.personnel[idx], idx);
        return;
      }
      const personDelete = event.target.closest("[data-person-delete]");
      if (personDelete) {
        closePersonMoreMenu();
        deletePerson(+personDelete.dataset.personDelete);
        return;
      }
      if (event.target.closest("[data-person-save]")) {
        savePersonForm();
        return;
      }
      if (event.target.closest(".access-check-row")) {
        window.setTimeout(syncCredentialPanels, 0);
      }
      const upload = event.target.closest("[data-cred-upload]");
      if (upload) {
        const type = upload.dataset.credUpload;
        upload.classList.add("is-uploaded");
        upload.innerHTML = `<span class="access-upload-plus">✓</span><span>已上传${type === "人脸" ? "人脸照片" : "二维码"}</span>`;
        return;
      }
      if (event.target.closest('[data-action="add-person"]')) {
        personForm("新增人员");
        return;
      }
      if (!event.target.closest(".access-more-menu") && !event.target.closest("[data-person-more],[data-schedule-more],[data-group-more],[data-grant-more]")) closePersonMoreMenu();
      const deviceDetail = event.target.closest("[data-device-detail]"); if (deviceDetail) { const x=data.devices[+deviceDetail.dataset.deviceDetail]; openDrawer("\u95e8\u7981\u8bbe\u5907\u8be6\u60c5",x.id,details([["\u95e8\u7981\u70b9",x.name],["\u6240\u5c5e\u533a\u57df",x.area],["\u5b89\u88c5\u4f4d\u7f6e",x.location],["\u95e8\u72b6\u6001",x.door],["\u8bbe\u5907\u72b6\u6001",x.online],["\u6700\u8fd1\u5fc3\u8df3",x.heartbeat],["\u6700\u540e\u901a\u884c",x.lastPass],["\u4eca\u65e5\u901a\u884c",`${x.today} \u6b21`],["\u4eca\u65e5\u5f02\u5e38",`${x.abnormal} \u6b21`],["\u5173\u8054\u6444\u50cf\u673a",x.camera]]) + '<p class="access-mini-note"><i class="fa-solid fa-lock"></i> \u672c\u5e73\u53f0\u4ec5\u67e5\u770b\u95e8\u7981\u72b6\u6001，\u4e0d\u63d0\u4f9b\u8bbe\u5907\u63a7\u5236。</p>'); }
      const recordDetail = event.target.closest("[data-record-detail]"); if (recordDetail) { const x=data.records[+recordDetail.dataset.recordDetail]; openDrawer("\u901a\u884c\u8bb0\u5f55\u8be6\u60c5",`${x.name} \u00b7 ${x.time}`,`<img class="access-photo" src="../../assets/images/access-gate.jpg" alt="\u901a\u884c\u6293\u62cd">${details([["\u59d3\u540d",x.name],["\u4eba\u5458\u7c7b\u578b",x.personType],["\u5355\u4f4d / \u90e8\u95e8",x.org],["\u51ed\u8bc1\u7c7b\u578b",x.credential],["\u51ed\u8bc1\u7f16\u53f7",x.credentialNo],["\u95e8\u7981\u70b9",x.device],["\u901a\u884c\u4f4d\u7f6e",x.location],["\u901a\u884c\u65f6\u95f4",x.time],["\u901a\u884c\u65b9\u5411",x.direction],["\u901a\u884c\u7ed3\u679c",x.result],["\u62d2\u7edd\u539f\u56e0",x.reason]])}`); }
      const alarmDetail = event.target.closest("[data-alarm-detail]"); if (alarmDetail) { const x=data.alarms[+alarmDetail.dataset.alarmDetail]; openDrawer("\u95e8\u7981\u544a\u8b66\u8be6\u60c5",x.id,`<img class="access-photo" src="../../assets/images/access-gate.jpg" alt="\u544a\u8b66\u73b0\u573a">${details([["\u544a\u8b66\u7c7b\u578b",x.type],["\u544a\u8b66\u7ea7\u522b",x.level],["\u6d89\u53ca\u4eba\u5458",x.person],["\u95e8\u7981\u70b9",x.device],["\u53d1\u751f\u4f4d\u7f6e",x.location],["\u53d1\u751f\u65f6\u95f4",x.time],["\u5904\u7406\u72b6\u6001",x.status],["\u5173\u8054\u6444\u50cf\u673a",x.camera],["\u544a\u8b66\u5185\u5bb9",x.detail]])}`); }
      const alarmProcess = event.target.closest("[data-alarm-process]"); if (alarmProcess) { const i=+alarmProcess.dataset.alarmProcess,x=data.alarms[i]; openDrawer("\u5904\u7406\u95e8\u7981\u544a\u8b66",x.id,`<div class="form-grid-2"><label class="form-field"><span class="form-label form-required">\u5904\u7406\u7ed3\u679c</span><select class="form-control" id="alarmProcessResult"><option>\u5df2\u5904\u7406</option><option>\u786e\u8ba4\u8bef\u62a5</option></select></label><label class="form-field"><span class="form-label form-required">\u5904\u7406\u4eba</span><input class="form-control" value="\u5f53\u524d\u7528\u6237"></label><label class="form-field form-span-2"><span class="form-label form-required">\u5904\u7406\u8bf4\u660e</span><textarea class="form-control textarea" placeholder="\u8bf7\u8f93\u5165\u5904\u7406\u8bf4\u660e"></textarea></label></div>`,`<button class="btn btn-secondary" data-drawer-close>\u53d6\u6d88</button><button class="btn btn-primary" data-save-alarm="${i}">\u786e\u8ba4</button>`); }
      const saveAlarm = event.target.closest("[data-save-alarm]"); if (saveAlarm) { data.alarms[+saveAlarm.dataset.saveAlarm].status="\u5df2\u5904\u7406"; window.closeAppDrawer(); renderAlarms(); }
      const blackDetail = event.target.closest("[data-black-detail]"); if (blackDetail) { const x=data.blacklist[+blackDetail.dataset.blackDetail]; openDrawer("\u9ed1\u540d\u5355\u8be6\u60c5",x.name,details([["\u4eba\u5458\u7c7b\u578b",x.type],["\u8054\u7cfb\u65b9\u5f0f",x.phone],["\u5355\u4f4d / \u90e8\u95e8",`${x.company} / ${x.department}`],["\u52a0\u5165\u539f\u56e0",x.reason],["\u751f\u6548\u65f6\u95f4",x.start],["\u5931\u6548\u65f6\u95f4",x.end],["\u5f53\u524d\u72b6\u6001",x.status],["\u521b\u5efa\u4eba",x.creator]])); }
      if (event.target.closest('[data-action="export"]')) openDrawer("导出数据", "门禁系统", "<p>已按当前筛选条件生成导出文件（Mock）。</p>", '<button class="btn btn-secondary" data-drawer-close>取消</button><button class="btn btn-primary" data-drawer-close>确认导出</button>');
      if (event.target.closest('[data-action="add-schedule"]')) { openScheduleForm("新增时间计划"); return; }
      if (event.target.closest('[data-action="add-group"]')) { openGroupForm("新增权限组"); return; }
      if (event.target.closest('[data-action="add-grant"]')) { openGrantForm("新增个人授权"); return; }
      if (event.target.closest('[data-action="sync-black"]')) {
        openDrawer(
          "同步黑名单",
          "门禁系统",
          `<label class="form-field form-item"><span class="form-label form-required">同步模式</span><select class="form-control" data-sync-mode><option value="FULL">首次全量同步</option><option value="INCREMENTAL">后续增量同步</option></select></label><label class="form-field form-item"><span class="form-label form-required">同步系统</span><select class="form-control" data-sync-system disabled><option value="门禁系统" selected>门禁系统</option></select></label>`,
          '<button class="btn btn-secondary" data-drawer-close>取消</button><button class="btn btn-primary" data-action="start-black-sync">开始同步</button>'
        );
        return;
      }
      if (event.target.closest('[data-action="start-black-sync"]')) {
        const mode = document.querySelector("[data-sync-mode]")?.value || "FULL";
        const modeLabel = mode === "FULL" ? "首次全量同步" : "后续增量同步";
        if (typeof window.closeAppDrawer === "function") window.closeAppDrawer();
        openDrawer("黑名单同步任务已提交", "门禁系统", `<p>同步模式：${modeLabel}；同步系统：门禁系统。任务已在后台执行，稍后可刷新列表查看结果。</p>`);
        return;
      }
      const scheduleDetail = event.target.closest("[data-schedule-detail]");
      if (scheduleDetail) {
        const x = data.schedules[+scheduleDetail.dataset.scheduleDetail];
        openDrawer("时间计划详情", x.name, details([
          ["计划名称", x.name], ["适用日期", x.repeat], ["通行时段", schedulePeriodText(x)],
          ["引用数", String(scheduleUsedCount(x.id))], ["状态", x.status],
        ]));
        return;
      }
      const scheduleMore = event.target.closest("[data-schedule-more]");
      if (scheduleMore) {
        event.stopPropagation();
        openPermMoreMenu(scheduleMore, "data-schedule-edit", "data-schedule-delete", +scheduleMore.dataset.scheduleMore);
        return;
      }
      const scheduleEdit = event.target.closest("[data-schedule-edit]");
      if (scheduleEdit) {
        closePersonMoreMenu();
        const idx = +scheduleEdit.dataset.scheduleEdit;
        openScheduleForm("编辑时间计划", data.schedules[idx], idx);
        return;
      }
      const scheduleDelete = event.target.closest("[data-schedule-delete]");
      if (scheduleDelete) {
        closePersonMoreMenu();
        deleteSchedule(+scheduleDelete.dataset.scheduleDelete);
        return;
      }
      if (event.target.closest("[data-schedule-save]")) { saveScheduleForm(); return; }
      const groupDetail = event.target.closest("[data-group-detail]");
      if (groupDetail) {
        const x = data.groups[+groupDetail.dataset.groupDetail];
        const members = (data.personnel || []).filter((person) => (x.memberIds || []).includes(person.id)).map((person) => person.name).join("、") || "-";
        const sch = scheduleById(x.scheduleId);
        openDrawer("权限组详情", x.name, details([
          ["权限组", x.name], ["成员", members], ["门禁点范围", doorsText(x.doorIds)],
          ["时间计划", sch?.name || "-"], ["适用日期", sch?.repeat || "-"],
          ["通行时段", sch ? schedulePeriodText(sch) : "-"], ["状态", x.status],
        ]));
        return;
      }
      const groupMore = event.target.closest("[data-group-more]");
      if (groupMore) {
        event.stopPropagation();
        openPermMoreMenu(groupMore, "data-group-edit", "data-group-delete", +groupMore.dataset.groupMore);
        return;
      }
      const groupEdit = event.target.closest("[data-group-edit]");
      if (groupEdit) {
        closePersonMoreMenu();
        const idx = +groupEdit.dataset.groupEdit;
        openGroupForm("编辑权限组", data.groups[idx], idx);
        return;
      }
      const groupDelete = event.target.closest("[data-group-delete]");
      if (groupDelete) {
        closePersonMoreMenu();
        deleteGroup(+groupDelete.dataset.groupDelete);
        return;
      }
      if (event.target.closest("[data-group-save]")) { saveGroupForm(); return; }
      if (event.target.closest("[data-group-door-select]")) { openDevicePicker("group"); return; }
      if (event.target.closest("[data-group-member-select]")) { openMemberPicker(); return; }
      const echoPage = event.target.closest("[data-echo-page]");
      if (echoPage && !echoPage.disabled) {
        const key = echoPage.dataset.echoPage;
        permDraft[key] = Number(echoPage.dataset.echoTo) || 1;
        if (key === "memberPage") renderGroupMemberTable();
        else if (document.getElementById("grantDoorBody")) renderGrantDoorTable();
        else renderGroupDoorTable();
        return;
      }
      const groupDoorRemove = event.target.closest("[data-group-door-remove]");
      if (groupDoorRemove) {
        const id = groupDoorRemove.dataset.groupDoorRemove;
        const name = deviceById(id)?.name || "该门禁点";
        window.openAppConfirm({
          title: "确认移除",
          message: `确认移除门禁点「${name}」吗？`,
          confirmText: "确认移除",
          onConfirm: () => {
            permDraft.doorIds = permDraft.doorIds.filter((item) => item !== id);
            renderGroupDoorTable();
          },
        });
        return;
      }
      const groupMemberRemove = event.target.closest("[data-group-member-remove]");
      if (groupMemberRemove) {
        const id = groupMemberRemove.dataset.groupMemberRemove;
        const name = personById(id)?.name || "该成员";
        window.openAppConfirm({
          title: "确认移除",
          message: `确认移除成员「${name}」吗？`,
          confirmText: "确认移除",
          onConfirm: () => {
            permDraft.memberIds = permDraft.memberIds.filter((item) => item !== id);
            renderGroupMemberTable();
          },
        });
        return;
      }
      const grantDetail = event.target.closest("[data-grant-detail]");
      if (grantDetail) {
        const x = data.grants[+grantDetail.dataset.grantDetail];
        openDrawer("个人授权详情", x.person, details([
          ["人员", x.person], ["门禁点", doorsText(x.doorIds)], ["生效时间", x.start],
          ["失效时间", x.end], ["授权原因", x.reason], ["状态", x.status],
        ]));
        return;
      }
      const grantMore = event.target.closest("[data-grant-more]");
      if (grantMore) {
        event.stopPropagation();
        openPermMoreMenu(grantMore, "data-grant-edit", "data-grant-delete", +grantMore.dataset.grantMore);
        return;
      }
      const grantEdit = event.target.closest("[data-grant-edit]");
      if (grantEdit) {
        closePersonMoreMenu();
        const idx = +grantEdit.dataset.grantEdit;
        openGrantForm("编辑个人授权", data.grants[idx], idx);
        return;
      }
      const grantDelete = event.target.closest("[data-grant-delete]");
      if (grantDelete) {
        closePersonMoreMenu();
        deleteGrant(+grantDelete.dataset.grantDelete);
        return;
      }
      if (event.target.closest("[data-grant-save]")) { saveGrantForm(); return; }
      if (event.target.closest("[data-grant-door-select]")) { openDevicePicker("grant"); return; }
      const grantDoorRemove = event.target.closest("[data-grant-door-remove]");
      if (grantDoorRemove) {
        const id = grantDoorRemove.dataset.grantDoorRemove;
        const name = deviceById(id)?.name || "该门禁点";
        window.openAppConfirm({
          title: "确认移除",
          message: `确认移除门禁点「${name}」吗？`,
          confirmText: "确认移除",
          onConfirm: () => {
            permDraft.doorIds = permDraft.doorIds.filter((item) => item !== id);
            renderGrantDoorTable();
          },
        });
        return;
      }
      const grantPersonPick = event.target.closest("[data-grant-person-pick]");
      if (grantPersonPick) {
        const person = personById(grantPersonPick.dataset.grantPersonPick);
        const box = document.querySelector("[data-grant-person-box]");
        if (person && box) {
          box.querySelector("[data-grant-field=\"personId\"]").value = person.id;
          box.querySelector("[data-grant-person-search]").value = `${person.name}（${person.type}）`;
          box.querySelector("[data-grant-person-panel]").hidden = true;
        }
        return;
      }
      const deviceMask = event.target.closest(".inspection-device-mask");
      if (deviceMask) {
        if (event.target.closest("[data-device-close]") || event.target.closest("[data-device-cancel]") || event.target === deviceMask) { closeDevicePicker(); return; }
        if (event.target.closest("[data-device-confirm]")) {
          permDraft.doorIds = [...devicePickerState.selected];
          permDraft.doorPage = 1;
          if (devicePickerState.target === "grant") renderGrantDoorTable();
          else renderGroupDoorTable();
          closeDevicePicker();
          return;
        }
        if (event.target.closest("[data-device-search]")) {
          devicePickerState.keyword = document.getElementById("devicePickName")?.value.trim() || "";
          devicePickerState.code = document.getElementById("devicePickCode")?.value.trim() || "";
          devicePickerState.category = document.getElementById("devicePickCategory")?.value || "";
          renderDevicePicker();
          return;
        }
        if (event.target.closest("[data-device-reset]")) {
          document.getElementById("devicePickName").value = "";
          document.getElementById("devicePickCode").value = "";
          document.getElementById("devicePickCategory").value = "";
          devicePickerState.keyword = "";
          devicePickerState.code = "";
          devicePickerState.category = "";
          renderDevicePicker();
          return;
        }
        const deviceRow = event.target.closest("[data-device-row]");
        if (deviceRow && !event.target.closest("input")) {
          const id = deviceRow.dataset.deviceRow;
          if (devicePickerState.selected.has(id)) devicePickerState.selected.delete(id);
          else devicePickerState.selected.add(id);
          renderDevicePicker();
          return;
        }
        return;
      }
      const memberMask = event.target.closest(".access-member-mask");
      if (memberMask) {
        if (event.target.closest("[data-member-close]") || event.target.closest("[data-member-cancel]") || event.target === memberMask) { closeMemberPicker(); return; }
        if (event.target.closest("[data-member-confirm]")) {
          permDraft.memberIds = [...memberPickerState.selected];
          permDraft.memberPage = 1;
          renderGroupMemberTable();
          closeMemberPicker();
          return;
        }
        if (event.target.closest("[data-member-search]")) {
          memberPickerState.name = document.getElementById("memberPickName")?.value.trim() || "";
          memberPickerState.type = document.getElementById("memberPickType")?.value || "";
          renderMemberPicker();
          return;
        }
        if (event.target.closest("[data-member-reset]")) {
          document.getElementById("memberPickName").value = "";
          document.getElementById("memberPickType").value = "";
          memberPickerState.name = "";
          memberPickerState.type = "";
          renderMemberPicker();
          return;
        }
        const memberRow = event.target.closest("[data-member-row]");
        if (memberRow && !event.target.closest("input")) {
          const id = memberRow.dataset.memberRow;
          if (memberPickerState.selected.has(id)) memberPickerState.selected.delete(id);
          else memberPickerState.selected.add(id);
          renderMemberPicker();
          return;
        }
        return;
      }
      const dropToggle = event.target.closest("[data-sch-drop-toggle]");
      if (dropToggle) {
        const drop = dropToggle.closest("[data-sch-drop]");
        const panel = drop?.querySelector(".access-multi-drop-panel");
        const open = panel?.hidden;
        document.querySelectorAll(".access-multi-drop-panel").forEach((item) => { item.hidden = true; });
        if (panel) panel.hidden = !open;
        return;
      }
      if (!event.target.closest("[data-sch-drop]")) {
        document.querySelectorAll(".access-multi-drop-panel").forEach((item) => { item.hidden = true; });
      }
      if (!event.target.closest("[data-grant-person-box]")) {
        const panel = document.querySelector("[data-grant-person-panel]");
        if (panel) panel.hidden = true;
      }
    });
    document.addEventListener("change", (event) => {
      if (event.target.matches('[data-sch-field="repeat"]')) refreshScheduleWindow();
      if (event.target.matches("[data-sch-weekday], [data-sch-monthday]")) syncScheduleDropLabel(event.target.closest("[data-sch-drop]"));
      if (event.target.matches('[data-group-field="scheduleId"]')) refreshScheduleEcho();
      if (event.target.matches("[data-device-pick]")) {
        const id = event.target.dataset.devicePick;
        if (event.target.checked) devicePickerState.selected.add(id);
        else devicePickerState.selected.delete(id);
        renderDevicePicker();
      }
      if (event.target.matches("[data-device-select-all]")) {
        devicePickerList().forEach((device) => {
          if (event.target.checked) devicePickerState.selected.add(device.id);
          else devicePickerState.selected.delete(device.id);
        });
        renderDevicePicker();
      }
      if (event.target.matches("[data-member-pick]")) {
        const id = event.target.dataset.memberPick;
        if (event.target.checked) memberPickerState.selected.add(id);
        else memberPickerState.selected.delete(id);
        renderMemberPicker();
      }
      if (event.target.matches("[data-member-select-all]")) {
        memberPickerList().forEach((person) => {
          if (event.target.checked) memberPickerState.selected.add(person.id);
          else memberPickerState.selected.delete(person.id);
        });
        renderMemberPicker();
      }
    });
    document.addEventListener("input", (event) => {
      if (event.target.matches("[data-grant-person-search]")) {
        const hidden = document.querySelector('[data-grant-field="personId"]');
        if (hidden) hidden.value = "";
        renderGrantPersonPanel(event.target.value);
      }
    });
    document.addEventListener("focusin", (event) => {
      if (event.target.matches("[data-grant-person-search]")) renderGrantPersonPanel(event.target.value);
    });
  }
  function init() { const page=document.body.dataset.accessPage; if(page==="overview")renderOverview(); if(page==="personnel")renderPersonnel(); if(page==="permissions")renderPermissions(); if(page==="blacklist")renderBlacklist(); if(page==="devices")renderDevices(); if(page==="records")renderRecords(); if(page==="alarms")renderAlarms(); }
  document.addEventListener("DOMContentLoaded",()=>{ init(); bindFilters(); bindActions(); });
})();
