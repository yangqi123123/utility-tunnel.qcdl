(function () {
  "use strict";
  const store = window.EMERGENCY_STORE;
  const ui = window.EMERGENCY_UI || {};
  if (!store) return;

  const esc = ui.escapeHtml || ((value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])));
  const toast = ui.showToast || ((message) => window.alert(message));
  const PLAN_TYPES = ["燃气泄漏", "火灾", "积水", "设备故障", "入侵告警", "其他"];
  const STEP_TYPES = ["信息确认", "人员通知", "人员调度", "物资调拨", "视频联动", "广播通知", "区域隔离", "现场反馈", "事件关闭"];

  const state = {
    page: 1,
    pageSize: 10,
    filtered: [],
    wizardStep: 1,
    editId: "",
    draft: emptyDraft(),
  };

  function emptyDraft() {
    return {
      code: "", name: "", eventType: "", level: "P2", area: "全域",
      version: "V1", department: "", owner: "", triggerCondition: "", content: "",
      attachmentName: "", steps: [],
    };
  }

  function listAll() { return typeof store.listPlans === "function" ? store.listPlans() : []; }
  function byId(id) { return typeof store.getPlan === "function" ? store.getPlan(id) : listAll().find((item) => item.planId === id) || null; }
  function events() { return typeof store.listEvents === "function" ? store.listEvents() : []; }

  function versionText(value) {
    if (value == null || value === "") return "-";
    const text = String(value);
    return /^v/i.test(text) ? text : `V${text}`;
  }

  function parseVersion(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const num = Number(String(value ?? "1").replace(/^v/i, ""));
    return Number.isFinite(num) ? num : 1;
  }

  function isPlanLinked(planId) {
    return events().some((item) => String(item.planId || "") === String(planId));
  }

  function filtered() {
    const filter = Object.fromEntries([...document.querySelectorAll("[data-plan-filter]")].map((field) => [field.dataset.planFilter, field.value.trim()]));
    state.filtered = listAll().filter((item) => {
      const keyword = `${item.code || ""} ${item.name || ""} ${item.planId || ""}`;
      return (!filter.keyword || keyword.includes(filter.keyword))
        && (!filter.eventType || item.eventType === filter.eventType)
        && (!filter.level || item.level === filter.level)
        && (!filter.enabled || (item.enabled || "停用") === filter.enabled);
    });
    state.page = Math.min(state.page, Math.max(1, Math.ceil(state.filtered.length / state.pageSize) || 1));
    return state.filtered;
  }

  function renderTypeOptions() {
    const select = document.querySelector('[data-plan-filter="eventType"]');
    if (!select) return;
    const current = select.value;
    const types = [...new Set([...PLAN_TYPES, ...listAll().map((item) => item.eventType).filter(Boolean)])];
    select.innerHTML = `<option value="">全部类型</option>${types.map((type) => `<option value="${esc(type)}">${esc(type)}</option>`).join("")}`;
    select.value = current;
  }

  function closeMoreMenu() {
    document.querySelectorAll(".emergency-more-menu").forEach((node) => node.remove());
  }

  function openMoreMenu(button, item) {
    closeMoreMenu();
    const menu = document.createElement("div");
    menu.className = "emergency-more-menu";
    menu.innerHTML = `
      <button type="button" data-plan-action="edit" data-plan-id="${esc(item.planId)}">编辑</button>
      <button type="button" class="is-danger" data-plan-action="delete" data-plan-id="${esc(item.planId)}">删除</button>`;
    document.body.appendChild(menu);
    const rect = button.getBoundingClientRect();
    menu.style.top = `${Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - menu.offsetHeight - 8))}px`;
    menu.style.left = `${Math.min(Math.max(8, rect.right - menu.offsetWidth), window.innerWidth - menu.offsetWidth - 8)}px`;
  }

  function render() {
    filtered();
    const body = document.getElementById("planBody");
    if (!body) return;
    const start = (state.page - 1) * state.pageSize;
    const rows = state.filtered.slice(start, start + state.pageSize);
    body.innerHTML = rows.length
      ? rows.map((item) => `<tr data-plan-id="${esc(item.planId)}">
          <td>${esc(item.code || item.planId)}</td>
          <td><strong>${esc(item.name || "-")}</strong></td>
          <td>${esc(item.eventType || "-")}</td>
          <td>${esc(item.level || "-")}</td>
          <td>${esc(item.area || "-")}</td>
          <td>${(item.steps || []).length}</td>
          <td>${esc(versionText(item.version))}</td>
          <td>${esc(item.department || item.author || "-")}</td>
          <td>${esc(item.owner || "-")}</td>
          <td>${ui.renderStatus ? ui.renderStatus(item.enabled || "停用") : esc(item.enabled || "停用")}</td>
          <td class="emergency-ledger-actions">
            <button class="table-action" type="button" data-plan-action="detail" data-plan-id="${esc(item.planId)}">详情</button>
            <button class="table-action" type="button" data-plan-action="more" data-plan-id="${esc(item.planId)}">更多</button>
          </td>
        </tr>`).join("")
      : `<tr><td colspan="11"><div class="emergency-empty">暂无预案数据</div></td></tr>`;
    const count = document.getElementById("planCount");
    if (count) {
      count.innerHTML = ui.renderPagination
        ? ui.renderPagination({ total: state.filtered.length, page: state.page, pageSize: state.pageSize, id: "planPagination" })
        : "";
    }
  }

  function exportPlans() {
    if (!window.XLSX) { toast("Excel 组件加载失败，请刷新页面后重试", "error"); return; }
    const rows = filtered().map((item) => ({
      预案编号: item.code || item.planId || "",
      预案名称: item.name || "",
      预案类型: item.eventType || "",
      响应等级: item.level || "",
      适用区域: item.area || "",
      步骤数: (item.steps || []).length,
      版本: versionText(item.version),
      责任部门: item.department || item.author || "",
      负责人: item.owner || "",
      启用状态: item.enabled || "停用",
    }));
    const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ 预案编号: "" }]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "应急预案库");
    const content = XLSX.write(book, { bookType: "xlsx", type: "array" });
    const blob = new Blob([content], { type: "application/octet-stream" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `应急预案库_${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast("导出成功");
  }

  function detailBody(item, tab = "basic") {
    const pairs = [
      ["预案编号", item.code || item.planId],
      ["预案名称", item.name || "-"],
      ["预案类型", item.eventType || "-"],
      ["响应等级", item.level || "-"],
      ["适用区域", item.area || "-"],
      ["版本号", versionText(item.version)],
      ["责任部门", item.department || item.author || "-"],
      ["负责人", item.owner || "-"],
      ["启用状态", item.enabled || "停用"],
      ["触发条件", item.triggerCondition || "-"],
      ["附件", item.attachmentName || "未上传"],
    ];
    const steps = [...(item.steps || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
    const stepHtml = steps.length
      ? `<div class="plan-step-detail-list">${steps.map((step, index) => `<div class="plan-step-detail-card">
          <span class="plan-step-index">${index + 1}</span>
          <div class="plan-step-copy">
            <strong>${esc(step.name || `步骤${index + 1}`)}</strong>
            <small>步骤类型：${esc(step.type || "-")} · ${step.required === false ? "可跳过" : "必须完成"}</small>
            <p>步骤内容：${esc(step.content || "-")}</p>
          </div>
        </div>`).join("")}</div>`
      : `<div class="emergency-empty">暂无处置步骤</div>`;

    const basic = `<section class="emergency-detail-panel ${tab === "basic" ? "" : "hidden"}" data-plan-detail-panel="basic">
      <div class="detail-grid">${pairs.map(([label, value]) => `<div class="info-item"><span class="info-label">${label}</span><span class="info-value">${esc(value)}</span></div>`).join("")}
        <div class="info-item info-item-full"><span class="info-label">预案摘要</span><span class="info-value">${esc(item.content || "暂无摘要")}</span></div>
      </div>
    </section>`;
    const stepsPanel = `<section class="emergency-detail-panel ${tab === "steps" ? "" : "hidden"}" data-plan-detail-panel="steps">
      <div class="detail-section">${stepHtml}</div>
    </section>`;
    const tabs = `<div class="emergency-detail-tabs">
      <button type="button" class="${tab === "basic" ? "active" : ""}" data-plan-detail-tab="basic" data-plan-id="${esc(item.planId)}">基本信息</button>
      <button type="button" class="${tab === "steps" ? "active" : ""}" data-plan-detail-tab="steps" data-plan-id="${esc(item.planId)}">处置步骤</button>
    </div>`;
    return tabs + basic + stepsPanel;
  }

  /** 按事件类型匹配已发布且启用的预案（与应急预案库「预案类型」一致） */
  function matchByEventType(event) {
    if (!event?.eventType) return [];
    const linkedId = event.planId || "";
    return listAll()
      .filter((plan) => plan.status === "已发布" && plan.enabled !== "停用" && plan.eventType === event.eventType)
      .sort((a, b) => {
        if (linkedId && a.planId === linkedId) return -1;
        if (linkedId && b.planId === linkedId) return 1;
        return String(a.code || a.planId || "").localeCompare(String(b.code || b.planId || ""), "zh");
      });
  }

  /**
   * 多预案展开收起列表。收起时仅显示名称、编号、类型；默认展开 expandedId（未传则第一条）。
   * options.tabOf(planId) 返回该预案当前页签 basic|steps
   */
  function accordionListBody(plans, options = {}) {
    const list = Array.isArray(plans) ? plans : [];
    if (!list.length) {
      return `<div class="dispatch-right-empty">${esc(options.emptyText || "暂无与当前事件类型匹配的应急预案")}</div>`;
    }
    const expandedId = options.expandedId != null && options.expandedId !== ""
      ? String(options.expandedId)
      : String(list[0].planId || "");
    const tabOf = typeof options.tabOf === "function" ? options.tabOf : (() => "basic");
    return `<div class="plan-accordion">${list.map((plan) => {
      const id = String(plan.planId || "");
      const open = id === expandedId;
      const tab = tabOf(id) === "steps" ? "steps" : "basic";
      return `<article class="plan-accordion-item ${open ? "is-open" : ""}" data-plan-accordion-id="${esc(id)}">
        <button type="button" class="plan-accordion-head" data-plan-accordion-toggle="${esc(id)}" aria-expanded="${open ? "true" : "false"}">
          <i class="fa-solid ${open ? "fa-chevron-down" : "fa-chevron-right"}" aria-hidden="true"></i>
          <span class="plan-accordion-title"><strong>${esc(plan.name || "-")}</strong><small>${esc(plan.code || plan.planId || "-")}</small></span>
          <span class="tag primary">${esc(plan.eventType || "-")}</span>
        </button>
        ${open ? `<div class="plan-accordion-body">${detailBody(plan, tab)}</div>` : ""}
      </article>`;
    }).join("")}</div>`;
  }

  function openDetail(item, tab = "basic") {
    if (!item) return;
    clearWizardClass();
    window.openAppDrawer({
      title: "应急预案详情",
      body: detailBody(item, tab),
      footer: `<button class="btn btn-secondary" type="button" data-drawer-close>关闭</button>`,
    });
  }

  function clearWizardClass() {
    document.getElementById("drawer")?.classList.remove("emergency-wizard-drawer");
  }

  function draftFromPlan(item) {
    return {
      code: item.code || "",
      name: item.name || "",
      eventType: item.eventType || "",
      level: item.level || "P2",
      area: item.area || "全域",
      version: versionText(item.version || 1),
      department: item.department || item.author || "",
      owner: item.owner || "",
      triggerCondition: item.triggerCondition || "",
      content: item.content || "",
      attachmentName: item.attachmentName || "",
      steps: (item.steps || []).map((step, index) => ({
        stepId: step.stepId || `S-${index + 1}`,
        order: step.order || index + 1,
        name: step.name || "",
        type: step.type || "信息确认",
        content: step.content || "",
        required: step.required !== false,
      })),
    };
  }

  function stepCardHtml(step, index) {
    const value = step || {};
    const id = esc(value.stepId || `draft-${Date.now()}-${index}`);
    return `<div class="plan-step-editor-card" data-step-row data-step-id="${id}">
      <div class="plan-step-editor-head">
        <strong>步骤 <span data-step-order>${index + 1}</span></strong>
        <button type="button" class="table-action is-danger" data-step-remove>删除</button>
      </div>
      <div class="emergency-form-grid">
        <label class="form-field"><span class="form-label form-required">步骤名称</span><input class="form-control" data-step-field="name" value="${esc(value.name || "")}" maxlength="50" placeholder="请输入步骤名称"></label>
        <label class="form-field"><span class="form-label form-required">步骤类型</span><select class="form-control" data-step-field="type">${STEP_TYPES.map((type) => `<option value="${esc(type)}" ${type === (value.type || "信息确认") ? "selected" : ""}>${esc(type)}</option>`).join("")}</select></label>
        <label class="form-field full"><span class="form-label form-required">步骤内容</span><textarea class="form-control textarea" data-step-field="content" rows="3" maxlength="300" placeholder="请输入步骤内容">${esc(value.content || "")}</textarea></label>
        <div class="form-field full"><span class="form-label form-required">是否必须执行</span>
          <div class="emergency-radio-row">
            <label><input type="radio" name="step-required-${id}" data-step-field="required" value="1" ${value.required !== false ? "checked" : ""}> 必须完成</label>
            <label><input type="radio" name="step-required-${id}" data-step-field="required" value="0" ${value.required === false ? "checked" : ""}> 可跳过</label>
          </div>
        </div>
      </div>
    </div>`;
  }

  function wizardHtml() {
    const step = state.wizardStep;
    const d = state.draft;
    const stepsNav = `<div class="emergency-wizard-steps">
      <div class="emergency-wizard-step ${step === 1 ? "active" : ""} ${step > 1 ? "done" : ""}" data-step="1">1. 基础信息</div>
      <div class="emergency-wizard-step ${step === 2 ? "active" : ""} ${step > 2 ? "done" : ""}" data-step="2">2. 处置步骤</div>
      <div class="emergency-wizard-step ${step === 3 ? "active" : ""}" data-step="3">3. 保存预览</div>
    </div>`;

    const basic = `<section class="emergency-wizard-panel ${step === 1 ? "" : "hidden"}" data-plan-panel="1">
      <form class="emergency-form-grid" data-plan-form="basic">
        <label class="form-field"><span class="form-label">预案编号</span><input class="form-control" data-plan-field="code" value="${esc(d.code)}" placeholder="如：EM-GAS-P1"></label>
        <label class="form-field"><span class="form-label form-required">预案名称</span><input class="form-control" data-plan-field="name" value="${esc(d.name)}" maxlength="50" placeholder="请输入预案名称"></label>
        <label class="form-field"><span class="form-label form-required">预案类型</span><select class="form-control" data-plan-field="eventType"><option value="">请选择</option>${PLAN_TYPES.map((type) => `<option value="${esc(type)}" ${type === d.eventType ? "selected" : ""}>${esc(type)}</option>`).join("")}</select></label>
        <label class="form-field"><span class="form-label form-required">响应等级</span><select class="form-control" data-plan-field="level">${["P1", "P2", "P3", "P4"].map((level) => `<option value="${level}" ${level === d.level ? "selected" : ""}>${level}</option>`).join("")}</select></label>
        <label class="form-field"><span class="form-label">适用区域</span><input class="form-control" data-plan-field="area" value="${esc(d.area)}" placeholder="如：东段 / 全域"></label>
        <label class="form-field"><span class="form-label">版本号</span><input class="form-control" data-plan-field="version" value="${esc(d.version)}" placeholder="V1"></label>
        <label class="form-field"><span class="form-label">责任部门</span><input class="form-control" data-plan-field="department" value="${esc(d.department)}" placeholder="请输入责任部门"></label>
        <label class="form-field"><span class="form-label">负责人</span><input class="form-control" data-plan-field="owner" value="${esc(d.owner)}" placeholder="请输入负责人"></label>
        <label class="form-field full"><span class="form-label">触发条件</span><input class="form-control" data-plan-field="triggerCondition" value="${esc(d.triggerCondition)}" placeholder="如：可燃气体浓度超限"></label>
        <label class="form-field full"><span class="form-label">预案摘要</span><textarea class="form-control textarea" data-plan-field="content" rows="4" maxlength="500" placeholder="请输入预案摘要">${esc(d.content)}</textarea></label>
        <div class="form-field full"><span class="form-label">上传附件</span>
          <input class="form-control" type="file" data-plan-attachment>
          <div class="form-hint">仅支持上传 1 个附件${d.attachmentName ? `，当前：${esc(d.attachmentName)}` : ""}</div>
        </div>
      </form>
    </section>`;

    const stepsPanel = `<section class="emergency-wizard-panel ${step === 2 ? "" : "hidden"}" data-plan-panel="2">
      <div class="plan-step-toolbar">
        <h3>处置步骤</h3>
        <button class="btn btn-secondary btn-sm" type="button" data-step-add><i class="fa-solid fa-plus"></i> 添加步骤</button>
      </div>
      <div data-steps>${(d.steps || []).map((stepItem, index) => stepCardHtml(stepItem, index)).join("")}</div>
      ${(d.steps || []).length ? "" : `<div class="emergency-empty" data-step-empty>尚未添加处置步骤</div>`}
    </section>`;

    const previewSteps = (d.steps || []).map((stepItem, index) => `<div class="plan-step-detail-card">
      <span class="plan-step-index">${index + 1}</span>
      <div class="plan-step-copy">
        <strong>${esc(stepItem.name || `步骤${index + 1}`)}</strong>
        <small>步骤类型：${esc(stepItem.type || "-")} · ${stepItem.required === false ? "可跳过" : "必须完成"}</small>
        <p>步骤内容：${esc(stepItem.content || "-")}</p>
      </div>
    </div>`).join("");

    const preview = `<section class="emergency-wizard-panel ${step === 3 ? "" : "hidden"}" data-plan-panel="3">
      <div class="detail-grid">
        <div class="info-item"><span class="info-label">预案编号</span><span class="info-value">${esc(d.code || "-")}</span></div>
        <div class="info-item"><span class="info-label">预案名称</span><span class="info-value">${esc(d.name || "-")}</span></div>
        <div class="info-item"><span class="info-label">预案类型</span><span class="info-value">${esc(d.eventType || "-")}</span></div>
        <div class="info-item"><span class="info-label">响应等级</span><span class="info-value">${esc(d.level || "-")}</span></div>
        <div class="info-item"><span class="info-label">适用区域</span><span class="info-value">${esc(d.area || "-")}</span></div>
        <div class="info-item"><span class="info-label">版本号</span><span class="info-value">${esc(d.version || "-")}</span></div>
        <div class="info-item"><span class="info-label">责任部门</span><span class="info-value">${esc(d.department || "-")}</span></div>
        <div class="info-item"><span class="info-label">负责人</span><span class="info-value">${esc(d.owner || "-")}</span></div>
        <div class="info-item"><span class="info-label">附件</span><span class="info-value">${esc(d.attachmentName || "未上传")}</span></div>
        <div class="info-item info-item-full"><span class="info-label">触发条件</span><span class="info-value">${esc(d.triggerCondition || "-")}</span></div>
        <div class="info-item info-item-full"><span class="info-label">预案摘要</span><span class="info-value">${esc(d.content || "-")}</span></div>
      </div>
      <div class="detail-section"><h3 class="detail-title">处置步骤（${(d.steps || []).length}）</h3>
        ${previewSteps || `<div class="emergency-empty">暂无处置步骤</div>`}
      </div>
    </section>`;

    return `<div class="emergency-wizard">${stepsNav}<div class="emergency-wizard-content">${basic}${stepsPanel}${preview}</div></div>`;
  }

  function wizardFooter() {
    const step = state.wizardStep;
    return `<button class="btn btn-secondary" type="button" data-drawer-close>取消</button>
      ${step > 1 ? `<button class="btn btn-secondary" type="button" data-plan-prev>上一步</button>` : ""}
      ${step < 3 ? `<button class="btn btn-primary" type="button" data-plan-next>下一步</button>` : `<button class="btn btn-primary" type="button" data-plan-save>保存</button>`}`;
  }

  function openWizard(item) {
    state.wizardStep = 1;
    state.editId = item?.planId || "";
    state.draft = item ? draftFromPlan(item) : emptyDraft();
    window.openAppDrawer({
      title: state.editId ? "编辑应急预案" : "新增应急预案",
      body: wizardHtml(),
      footer: wizardFooter(),
    });
    document.getElementById("drawer")?.classList.add("emergency-wizard-drawer");
  }

  function refreshWizard() {
    const drawer = document.getElementById("drawer");
    const body = drawer?.querySelector(".drawer-body");
    const footer = drawer?.querySelector(".drawer-footer");
    if (!body || !footer) return;
    body.innerHTML = wizardHtml();
    footer.innerHTML = wizardFooter();
    drawer.classList.add("emergency-wizard-drawer");
  }

  function collectBasicDraft() {
    const form = document.querySelector('[data-plan-form="basic"]');
    if (!form) return false;
    const read = (key) => form.querySelector(`[data-plan-field="${key}"]`)?.value.trim() || "";
    const next = {
      code: read("code"),
      name: read("name"),
      eventType: read("eventType"),
      level: read("level") || "P2",
      area: read("area"),
      version: read("version") || "V1",
      department: read("department"),
      owner: read("owner"),
      triggerCondition: read("triggerCondition"),
      content: read("content"),
    };
    form.querySelectorAll(".form-control.error").forEach((field) => field.classList.remove("error"));
    let ok = true;
    ["name", "eventType", "level"].forEach((key) => {
      if (!next[key]) {
        form.querySelector(`[data-plan-field="${key}"]`)?.classList.add("error");
        ok = false;
      }
    });
    if (!ok) { toast("请填写必填项", "error"); return false; }
    const file = form.querySelector("[data-plan-attachment]")?.files?.[0];
    if (file) next.attachmentName = file.name;
    else next.attachmentName = state.draft.attachmentName || "";
    Object.assign(state.draft, next);
    return true;
  }

  function readStepsFromDom() {
    return [...document.querySelectorAll("[data-step-row]")].map((row, index) => {
      const read = (key) => row.querySelector(`[data-step-field="${key}"]`);
      const requiredInput = row.querySelector('[data-step-field="required"]:checked');
      return {
        stepId: row.dataset.stepId || `S-${index + 1}`,
        order: index + 1,
        name: read("name")?.value.trim() || "",
        type: read("type")?.value || "信息确认",
        content: read("content")?.value.trim() || "",
        required: requiredInput ? requiredInput.value === "1" : true,
      };
    });
  }

  function collectStepsDraft() {
    const steps = readStepsFromDom();
    if (!steps.length) { toast("请至少添加一个处置步骤", "error"); return false; }
    let invalid = "";
    steps.forEach((step, index) => {
      if (!step.name || !step.type || !step.content) invalid = `请完善第 ${index + 1} 个步骤的名称、类型与内容`;
    });
    if (invalid) { toast(invalid, "error"); return false; }
    state.draft.steps = steps;
    return true;
  }

  function savePlan() {
    if (!collectBasicDraft()) { state.wizardStep = 1; refreshWizard(); return; }
    if (!collectStepsDraft()) { state.wizardStep = 2; refreshWizard(); return; }
    const d = state.draft;
    const existing = state.editId ? byId(state.editId) : null;
    const plan = {
      ...(existing || {}),
      planId: existing?.planId,
      code: d.code || existing?.code || `EM-${Date.now().toString().slice(-6)}`,
      name: d.name,
      eventType: d.eventType,
      level: d.level,
      area: d.area || "全域",
      version: parseVersion(d.version),
      department: d.department,
      author: d.department || existing?.author || "",
      owner: d.owner,
      triggerCondition: d.triggerCondition,
      content: d.content,
      attachmentName: d.attachmentName || "",
      steps: d.steps.map((step, index) => ({ ...step, order: index + 1, linkage: "" })),
      enabled: existing?.enabled || "启用",
      status: existing?.status || "已发布",
      updatedAt: new Date().toISOString(),
    };
    try {
      store.savePlan(plan);
      window.closeAppDrawer();
      clearWizardClass();
      state.page = 1;
      toast(state.editId ? "预案已更新" : "预案已创建");
      renderTypeOptions();
      render();
    } catch (error) {
      toast(error.message || "保存失败", "error");
    }
  }

  function deletePlan(item) {
    if (!item) return;
    if (isPlanLinked(item.planId)) {
      toast("该预案已关联应急事件，不允许删除", "error");
      return;
    }
    const run = () => {
      store.removePlan(item.planId);
      toast("预案已删除");
      renderTypeOptions();
      render();
    };
    if (typeof window.openAppConfirm === "function") {
      window.openAppConfirm({
        title: "删除预案",
        message: `确认删除预案「${item.name}」吗？`,
        confirmText: "确认删除",
        onConfirm: run,
      });
    } else if (window.confirm(`确认删除预案「${item.name}」吗？`)) run();
  }

  function renumberSteps() {
    [...document.querySelectorAll("[data-step-row]")].forEach((row, index) => {
      const order = row.querySelector("[data-step-order]");
      if (order) order.textContent = index + 1;
    });
  }

  document.addEventListener("click", (event) => {
    const pageBtn = event.target.closest("#planPagination [data-page-prev], #planPagination [data-page-next]");
    if (pageBtn) {
      const root = document.getElementById("planPagination");
      const pages = Number(root?.dataset.pages || 1);
      if (pageBtn.hasAttribute("data-page-prev") && state.page > 1) state.page -= 1;
      if (pageBtn.hasAttribute("data-page-next") && state.page < pages) state.page += 1;
      render();
      return;
    }

    const detailTab = event.target.closest("[data-plan-detail-tab]");
    if (detailTab) {
      if (document.body.classList.contains("emergency-dispatch-page")) return;
      openDetail(byId(detailTab.dataset.planId), detailTab.dataset.planDetailTab);
      return;
    }

    if (event.target.closest("[data-plan-next]")) {
      if (state.wizardStep === 1) {
        if (!collectBasicDraft()) return;
        state.wizardStep = 2;
      } else if (state.wizardStep === 2) {
        if (!collectStepsDraft()) return;
        state.wizardStep = 3;
      }
      refreshWizard();
      return;
    }
    if (event.target.closest("[data-plan-prev]")) {
      if (state.wizardStep === 2) collectStepsDraft();
      if (state.wizardStep === 3) collectStepsDraft();
      state.wizardStep = Math.max(1, state.wizardStep - 1);
      refreshWizard();
      return;
    }
    if (event.target.closest("[data-plan-save]")) { savePlan(); return; }

    if (event.target.closest("[data-step-add]")) {
      state.draft.steps = [...readStepsFromDom(), { name: "", type: "信息确认", content: "", required: true }];
      document.querySelector("[data-step-empty]")?.remove();
      const root = document.querySelector("[data-steps]");
      if (root) {
        const index = root.querySelectorAll("[data-step-row]").length;
        root.insertAdjacentHTML("beforeend", stepCardHtml(state.draft.steps[state.draft.steps.length - 1], index));
      }
      return;
    }
    if (event.target.closest("[data-step-remove]")) {
      event.target.closest("[data-step-row]")?.remove();
      renumberSteps();
      const rows = document.querySelectorAll("[data-step-row]");
      if (!rows.length) {
        const root = document.querySelector("[data-steps]");
        root?.insertAdjacentHTML("afterend", `<div class="emergency-empty" data-step-empty>尚未添加处置步骤</div>`);
      }
      return;
    }

    const action = event.target.closest("[data-plan-action]");
    if (!action) {
      if (!event.target.closest(".emergency-more-menu")) closeMoreMenu();
      return;
    }
    const type = action.dataset.planAction;
    const item = byId(action.dataset.planId);
    closeMoreMenu();
    if (type === "create") openWizard();
    if (type === "export") exportPlans();
    if (type === "search") { state.page = 1; render(); }
    if (type === "reset") {
      document.querySelectorAll("[data-plan-filter]").forEach((field) => { field.value = ""; });
      state.page = 1;
      render();
    }
    if (type === "detail" && item) openDetail(item);
    if (type === "more" && item) openMoreMenu(action, item);
    if (type === "edit" && item) openWizard(item);
    if (type === "delete" && item) deletePlan(item);
  });

  window.EMERGENCY_PLAN_OPS = {
    detailBody,
    getPlan: byId,
    list: listAll,
    matchByEventType,
    accordionListBody,
  };

  if (document.getElementById("planBody")) {
    renderTypeOptions();
    render();
  }
})();
