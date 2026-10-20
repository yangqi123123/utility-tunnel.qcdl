(function () {
  const routes = {
    dispatch: "dispatch.html",
    events: "events.html",
    plans: "plans.html",
    resources: "resources.html",
    personnel: "personnel.html",
    calls: "calls.html",
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  function statusClass(status) {
    const value = String(status || "");
    if (/在线|可用|已接通|已完成|正常|已发布/.test(value)) return "success";
    if (/低库存|忙碌|已占用|处理中|执行中|待确认|待指派|待处理|验收中|维修|草稿/.test(value)) return "warning";
    if (/离线|不可|报废|失败|拒接|超时|误报|停用|已关闭|已撤回/.test(value)) return "danger";
    return "info";
  }

  function renderStatus(status, label) {
    const text = label || status || "未知";
    return `<span class="emergency-status ${statusClass(status)}">${escapeHtml(text)}</span>`;
  }

  function renderPagination({ total = 0, page = 1, pageSize = 10, id = "emergencyPagination" } = {}) {
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const current = Math.min(Math.max(1, page), pages);
    return `<div class="emergency-pagination" id="${escapeHtml(id)}" data-page="${current}" data-pages="${pages}"><span>共 ${total} 条，每页 ${pageSize} 条</span><button type="button" data-page-prev aria-label="上一页" ${current <= 1 ? "disabled" : ""}>‹</button><strong>${current}</strong><button type="button" data-page-next aria-label="下一页" ${current >= pages ? "disabled" : ""}>›</button></div>`;
  }

  function showToast(message, type = "success") {
    document.querySelectorAll(".emergency-toast").forEach((item) => item.remove());
    const toast = document.createElement("div");
    toast.className = `emergency-toast ${escapeHtml(type)}`;
    toast.setAttribute("role", "status");
    toast.textContent = message;
    document.body.appendChild(toast);
    window.setTimeout(() => toast.remove(), 2400);
  }

  function openEntityDrawer({ title, body, footer, onOpen } = {}) {
    if (typeof window.openAppDrawer === "function") {
      window.openAppDrawer({ title: title || "详情", body: body || "", footer: footer || `<button class="btn btn-secondary" type="button" data-drawer-close>关闭</button>` });
      onOpen?.(document.getElementById("drawer"));
      return;
    }
    const mask = document.getElementById("drawerMask");
    if (mask) mask.classList.add("open");
  }

  function navigate(key, query = {}) {
    const path = routes[key] || routes.events;
    const url = new URL(path, location.href);
    Object.entries(query || {}).forEach(([name, value]) => { if (value !== undefined && value !== null && value !== "") url.searchParams.set(name, value); });
    location.href = url.href;
  }

  function nowText(date = new Date()) {
    const value = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(value.getTime())) return "-";
    const pad = (number) => String(number).padStart(2, "0");
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
  }

  function showApiError(error) {
    const message = error?.message || "操作失败，请稍后重试";
    showToast(message, "error");
  }

  function value(id) { return document.getElementById(id)?.value?.trim() || ""; }
  function setValue(id, value) { const input = document.getElementById(id); if (input) input.value = value ?? ""; }

  /* 与设备分类共用同一套图标库 */
  const CATEGORY_ICON_NAMES = ["layer-group", "building", "elevator", "camera", "video", "door-open", "shield-halved", "bolt", "fire", "fan", "water", "plug", "lightbulb", "temperature-half", "gauge-high", "gear", "server", "database", "house", "warehouse", "stairs", "bell", "circle-check", "circle-exclamation", "location-dot", "wifi", "display", "truck", "car", "box", "tools", "clipboard", "chart-line", "cube", "leaf", "sun", "key"];

  function renderCategoryIconField(selected, options = {}) {
    const required = options.required !== false;
    const iconValue = selected || "fa-layer-group";
    const attr = (value) => escapeHtml(value).replaceAll("'", "&#39;");
    const picker = `<div class="category-icon-picker" data-category-icon-picker hidden><div class="category-icon-grid">${CATEGORY_ICON_NAMES.map((name) => {
      const full = `fa-${name}`;
      return `<button class="category-icon-option${iconValue === full ? " is-selected" : ""}" type="button" data-category-icon="${full}" title="${full}"><i class="fa-solid ${full}"></i><span>${name}</span></button>`;
    }).join("")}</div></div>`;
    return `<div class="form-field category-icon-field${options.full ? " full" : ""}"><span class="form-label${required ? " form-required" : ""}">图标</span><button class="form-control category-icon-trigger" type="button" data-category-icon-trigger><i class="fa-solid ${attr(iconValue)}" data-category-icon-preview></i><span data-category-icon-label>${attr(iconValue)}</span><i class="fa-solid fa-chevron-down" aria-hidden="true" style="margin-left:auto;color:var(--text-secondary)"></i></button><input type="hidden" name="icon" value="${attr(iconValue)}" ${required ? "required" : ""}>${picker}</div>`;
  }

  document.addEventListener("click", (event) => {
    const iconTrigger = event.target.closest("[data-category-icon-trigger]");
    if (iconTrigger) {
      const picker = iconTrigger.parentElement.querySelector("[data-category-icon-picker]");
      document.querySelectorAll("[data-category-icon-picker]").forEach((item) => { if (item !== picker) item.hidden = true; });
      if (picker) picker.hidden = !picker.hidden;
      return;
    }
    const iconOption = event.target.closest("[data-category-icon]");
    if (iconOption) {
      const field = iconOption.closest(".category-icon-field");
      if (!field) return;
      const icon = iconOption.dataset.categoryIcon;
      const hidden = field.querySelector('input[name="icon"]');
      if (hidden) hidden.value = icon;
      const preview = field.querySelector("[data-category-icon-preview]");
      if (preview) preview.className = `fa-solid ${icon}`;
      const label = field.querySelector("[data-category-icon-label]");
      if (label) label.textContent = icon;
      field.querySelectorAll("[data-category-icon]").forEach((item) => item.classList.toggle("is-selected", item === iconOption));
      field.querySelector("[data-category-icon-picker]").hidden = true;
      return;
    }
    if (!event.target.closest(".category-icon-field")) {
      document.querySelectorAll("[data-category-icon-picker]").forEach((item) => { item.hidden = true; });
    }
  });

  window.EMERGENCY_UI = { escapeHtml, statusClass, renderStatus, renderPagination, showToast, openEntityDrawer, navigate, nowText, showApiError, value, setValue, renderCategoryIconField, CATEGORY_ICON_NAMES };
})();
