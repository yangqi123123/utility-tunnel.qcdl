(function () {
  "use strict";
  const ui = window.EMERGENCY_UI || {};
  const esc = ui.escapeHtml || ((value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])));
  const toast = ui.showToast || ((message) => window.alert(message));
  const STORAGE_KEY = "safety-regulations.v2";
  const LEVELS = ["国家", "地方", "公司"];
  const DEFAULT_CATEGORIES = [
    { label: "安全生产", value: "安全生产" },
    { label: "消防安全", value: "消防安全" },
    { label: "应急管理", value: "应急管理" },
    { label: "职业健康", value: "职业健康" },
  ];

  const seed = [
    {
      id: 1, code: "REG-国家-001", name: "中华人民共和国安全生产法", level: "国家",
      publisher: "全国人民代表大会常务委员会", publishedAt: "2021-06-10", effectiveAt: "2021-09-01",
      expireAt: "", category: "安全生产", scope: "全体生产经营单位", status: "有效",
      updatedAt: "2026-01-08", summary: "确立安全生产工作方针、生产经营单位主体责任和事故应急救援制度。",
      attachments: [], photos: [],
    },
    {
      id: 2, code: "REG-地方-014", name: "湖北省城市地下管线管理办法", level: "地方",
      publisher: "湖北省人民政府", publishedAt: "2022-03-18", effectiveAt: "2022-06-01",
      expireAt: "", category: "安全生产", scope: "湖北省地下管线工程", status: "有效",
      updatedAt: "2025-12-16", summary: "规范城市地下管线规划、建设、运行维护和信息管理。",
      attachments: [], photos: [],
    },
    {
      id: 3, code: "REG-公司-006", name: "管廊有限空间作业安全管理规定", level: "公司",
      publisher: "中建科创安全管理部", publishedAt: "2024-02-01", effectiveAt: "2024-03-01",
      expireAt: "2026-10-01", category: "职业健康", scope: "管廊运营项目", status: "有效",
      updatedAt: "2026-08-22", summary: "明确有限空间辨识、审批、检测、监护和应急处置要求。",
      attachments: [], photos: [],
    },
  ];

  function todayText() {
    const date = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function loadRaw() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return Array.isArray(stored) && stored.length ? stored : seed.map((item) => ({ ...item }));
    } catch (_) {
      return seed.map((item) => ({ ...item }));
    }
  }

  let data = loadRaw();

  function categories() {
    const fromDict = window.APP_DICTIONARY?.regulationCategory;
    if (Array.isArray(fromDict) && fromDict.length) {
      return fromDict.map((item) => ({
        label: item.label || item.value || item.name || String(item),
        value: item.value || item.label || item.name || String(item),
      }));
    }
    return DEFAULT_CATEGORIES.slice();
  }

  function normalize(item) {
    if (!item) return null;
    const category = item.category || item.topic || "";
    const expireAt = item.expireAt || "";
    let status = item.status === "已失效" ? "已失效" : "有效";
    if (expireAt && expireAt <= todayText()) status = "已失效";
    return {
      ...item,
      category,
      topic: category,
      expireAt,
      status,
      attachments: Array.isArray(item.attachments) ? item.attachments : [],
      photos: Array.isArray(item.photos) ? item.photos : [],
    };
  }

  function list() {
    data = data.map(normalize).filter(Boolean);
    return data;
  }

  function byId(id) {
    return list().find((item) => String(item.id) === String(id)) || null;
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list()));
  }

  function statusTag(status) {
    const cls = status === "有效" ? "success" : "danger";
    return `<span class="tag ${cls}">${esc(status)}</span>`;
  }

  function categoryOptions(selected = "", withAll = false) {
    const options = categories();
    const head = withAll ? `<option value="">全部分类</option>` : `<option value="">请选择</option>`;
    return head + options.map((item) => `<option value="${esc(item.value)}" ${item.value === selected ? "selected" : ""}>${esc(item.label)}</option>`).join("");
  }

  function levelOptions(selected = "", withAll = false) {
    const head = withAll ? `<option value="">全部层级</option>` : `<option value="">请选择</option>`;
    return head + LEVELS.map((level) => `<option value="${esc(level)}" ${level === selected ? "selected" : ""}>${esc(level)}</option>`).join("");
  }

  function fillCategoryFilters() {
    const filter = document.getElementById("filterCategory");
    if (filter) {
      const current = filter.value;
      filter.innerHTML = categoryOptions(current, true);
    }
  }

  function filteredList() {
    const filters = Object.fromEntries([...document.querySelectorAll("[data-filter]")].map((field) => [field.dataset.filter, field.value.trim()]));
    return list().filter((item) => {
      if (filters.keyword && !(item.code + item.name).includes(filters.keyword)) return false;
      if (filters.level && item.level !== filters.level) return false;
      if (filters.category && item.category !== filters.category) return false;
      if (filters.status && item.status !== filters.status) return false;
      return true;
    });
  }

  function render(rows = filteredList()) {
    const body = document.getElementById("body");
    const count = document.getElementById("count");
    if (count) count.textContent = String(rows.length);
    if (!body) return;
    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="12" class="empty-cell">暂无法规数据</td></tr>`;
      return;
    }
    body.innerHTML = rows.map((item) => `<tr>
      <td>${esc(item.code)}</td>
      <td><strong>${esc(item.name)}</strong></td>
      <td>${esc(item.level || "-")}</td>
      <td>${esc(item.publisher || "-")}</td>
      <td>${esc(item.publishedAt || "-")}</td>
      <td>${esc(item.effectiveAt || "-")}</td>
      <td>${esc(item.expireAt || "-")}</td>
      <td>${esc(item.category || "-")}</td>
      <td>${esc(item.scope || "-")}</td>
      <td>${statusTag(item.status)}</td>
      <td>${esc(item.updatedAt || "-")}</td>
      <td class="emergency-ledger-actions">
        <button class="table-action" type="button" data-row="detail" data-id="${esc(item.id)}">详情</button>
        <button class="table-action" type="button" data-row="more" data-id="${esc(item.id)}">更多</button>
      </td>
    </tr>`).join("");
  }

  function closeMoreMenu() {
    document.querySelectorAll(".emergency-more-menu").forEach((node) => node.remove());
  }

  function openMoreMenu(button, item) {
    closeMoreMenu();
    const menu = document.createElement("div");
    menu.className = "emergency-more-menu";
    menu.innerHTML = `
      <button type="button" data-row="edit" data-id="${esc(item.id)}">编辑</button>
      <button type="button" class="is-danger" data-row="delete" data-id="${esc(item.id)}">删除</button>`;
    document.body.appendChild(menu);
    const rect = button.getBoundingClientRect();
    menu.style.top = `${Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - menu.offsetHeight - 8))}px`;
    menu.style.left = `${Math.min(Math.max(8, rect.right - menu.offsetWidth), window.innerWidth - menu.offsetWidth - 8)}px`;
  }

  function fileListHtml(files = [], emptyText = "未上传") {
    if (!files.length) return `<span class="emergency-muted">${esc(emptyText)}</span>`;
    return `<ul class="emergency-file-list">${files.map((name) => `<li>${esc(name)}</li>`).join("")}</ul>`;
  }

  function photosHtml(photos = []) {
    if (!photos.length) return `<span class="emergency-muted">未上传</span>`;
    return `<div class="emergency-photo-grid">${photos.map((src, index) => (
      typeof src === "string" && src.startsWith("data:")
        ? `<img class="emergency-thumb" src="${esc(src)}" alt="法规图片${index + 1}">`
        : `<span class="emergency-thumb emergency-thumb-empty"><i class="fa-regular fa-image"></i><small>${esc(src)}</small></span>`
    )).join("")}</div>`;
  }

  function detailBody(item) {
    const pairs = [
      ["法规编号", item.code], ["法规名称", item.name], ["法规层级", item.level || "-"],
      ["发布部门", item.publisher || "-"], ["发布日期", item.publishedAt || "-"], ["生效日期", item.effectiveAt || "-"],
      ["失效日期", item.expireAt || "-"], ["法规分类", item.category || "-"], ["适用范围", item.scope || "-"],
      ["有效状态", item.status], ["最近更新", item.updatedAt || "-"],
    ];
    return `<section class="detail-section"><h3 class="detail-title">法规基本信息</h3>
      <div class="detail-grid">${pairs.map(([label, value]) => `<div class="info-item"><span class="info-label">${label}</span><span class="info-value">${label === "有效状态" ? statusTag(value) : esc(value)}</span></div>`).join("")}</div>
    </section>
    <section class="detail-section"><h3 class="detail-title">内容摘要</h3><p class="detail-text">${esc(item.summary || "暂无摘要")}</p></section>
    <section class="detail-section"><h3 class="detail-title">附件</h3>${fileListHtml(item.attachments)}</section>
    <section class="detail-section"><h3 class="detail-title">图片</h3>${photosHtml(item.photos)}</section>`;
  }

  function formBody(item = {}, mode = "create") {
    const record = normalize(item) || {};
    const val = (key) => (mode === "create" && !item?.[key] ? "" : esc(record[key] ?? ""));
    return `<form class="emergency-form-grid" data-reg-form="${mode}" data-reg-id="${esc(record.id || "")}">
      <label class="form-field"><span class="form-label">法规编号 <b class="form-required"></b></span><input class="form-control" data-field="code" maxlength="50" placeholder="请输入法规编号" value="${val("code")}"></label>
      <label class="form-field"><span class="form-label">法规名称 <b class="form-required"></b></span><input class="form-control" data-field="name" maxlength="100" placeholder="请输入法规名称" value="${val("name")}"></label>
      <label class="form-field"><span class="form-label">法规层级 <b class="form-required"></b></span><select class="form-control" data-field="level">${levelOptions(record.level || "")}</select></label>
      <label class="form-field"><span class="form-label">法规分类 <b class="form-required"></b></span><select class="form-control" data-field="category">${categoryOptions(record.category || "")}</select></label>
      <label class="form-field"><span class="form-label">发布部门</span><input class="form-control" data-field="publisher" maxlength="100" placeholder="请输入发布部门" value="${val("publisher")}"></label>
      <label class="form-field"><span class="form-label">适用范围</span><input class="form-control" data-field="scope" maxlength="100" placeholder="请输入适用范围" value="${val("scope")}"></label>
      <label class="form-field"><span class="form-label">发布日期</span><input class="form-control" type="date" data-field="publishedAt" value="${val("publishedAt")}"></label>
      <label class="form-field"><span class="form-label">生效日期</span><input class="form-control" type="date" data-field="effectiveAt" value="${val("effectiveAt")}"></label>
      <label class="form-field"><span class="form-label">失效日期</span><input class="form-control" type="date" data-field="expireAt" value="${val("expireAt")}"></label>
      <label class="form-field full"><span class="form-label">内容摘要</span><textarea class="form-control textarea" data-field="summary" maxlength="500" rows="4" placeholder="请输入内容摘要">${val("summary")}</textarea></label>
      <div class="form-field full"><span class="form-label">上传附件</span><input class="form-control" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar" multiple data-reg-attachments><div class="form-hint">非必填，支持 pdf、doc、docx、xls、xlsx、ppt、pptx、txt、zip、rar，单文件不超过 10MB，最多 5 个${record.attachments?.length ? `；已有：${esc(record.attachments.join("、"))}` : ""}</div></div>
      <div class="form-field full"><span class="form-label">上传图片</span><input class="form-control" type="file" accept=".jpg,.jpeg,.png,.gif,.webp,image/*" multiple data-reg-photos><div class="form-hint">非必填，支持 jpg、jpeg、png、gif、webp，单张不超过 5MB，最多 6 张${record.photos?.length ? `；已上传 ${record.photos.length} 张` : ""}</div></div>
    </form>`;
  }

  function openDetail(item) {
    window.openAppDrawer({
      title: "法规详情",
      body: detailBody(item),
      footer: `<button class="btn btn-secondary" type="button" data-drawer-close>关闭</button>`,
    });
  }

  function openForm(mode, item = {}) {
    window.openAppDrawer({
      title: mode === "create" ? "新增法规" : "编辑法规",
      body: formBody(item, mode),
      footer: `<button class="btn btn-secondary" type="button" data-drawer-close>取消</button><button class="btn btn-primary" type="button" data-save-reg="${mode}" data-id="${esc(item.id || "")}">保存</button>`,
    });
  }

  async function readPhotos(input) {
    const files = [...(input?.files || [])];
    if (!files.length) return [];
    if (files.length > 6) { toast("最多上传 6 张图片", "error"); return null; }
    const result = [];
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) { toast("单张图片不能超过 5MB", "error"); return null; }
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      result.push(dataUrl);
    }
    return result;
  }

  async function saveForm(mode, id) {
    const form = document.querySelector("[data-reg-form]");
    if (!form) return;
    const read = (key) => form.querySelector(`[data-field="${key}"]`)?.value.trim() || "";
    const fields = {
      code: read("code"),
      name: read("name"),
      level: read("level"),
      category: read("category"),
      publisher: read("publisher"),
      scope: read("scope"),
      publishedAt: read("publishedAt"),
      effectiveAt: read("effectiveAt"),
      expireAt: read("expireAt"),
      summary: read("summary"),
    };
    form.querySelectorAll(".form-control.error").forEach((field) => field.classList.remove("error"));
    let ok = true;
    ["code", "name", "level", "category"].forEach((key) => {
      if (!fields[key]) {
        form.querySelector(`[data-field="${key}"]`)?.classList.add("error");
        ok = false;
      }
    });
    if (!ok) { toast("请填写必填项", "error"); return; }

    const attachmentInput = form.querySelector("[data-reg-attachments]");
    const attachmentFiles = [...(attachmentInput?.files || [])];
    if (attachmentFiles.length > 5) { toast("最多上传 5 个附件", "error"); return; }
    if (attachmentFiles.some((file) => file.size > 10 * 1024 * 1024)) { toast("单个附件不能超过 10MB", "error"); return; }

    const photos = await readPhotos(form.querySelector("[data-reg-photos]"));
    if (photos === null) return;

    const existing = mode === "edit" ? byId(id) : null;
    const stamp = todayText();
    const status = fields.expireAt && fields.expireAt <= stamp ? "已失效" : "有效";

    const next = {
      ...(existing || {}),
      id: existing?.id || Date.now(),
      ...fields,
      topic: fields.category,
      status,
      updatedAt: stamp,
      attachments: attachmentFiles.length ? attachmentFiles.map((file) => file.name) : (existing?.attachments || []),
      photos: photos.length ? photos : (existing?.photos || []),
    };

    if (mode === "create") data.unshift(next);
    else {
      const index = data.findIndex((item) => String(item.id) === String(id));
      if (index >= 0) data[index] = next;
    }
    persist();
    render();
    window.closeAppDrawer?.();
    toast(mode === "create" ? "法规已新增" : "法规已更新");
  }

  function removeItem(item) {
    const run = () => {
      data = data.filter((entry) => String(entry.id) !== String(item.id));
      persist();
      render();
      toast("法规已删除");
    };
    if (typeof window.openAppConfirm === "function") {
      window.openAppConfirm({
        title: "删除法规",
        message: `确认删除法规「${item.name}」吗？`,
        confirmText: "确认删除",
        onConfirm: run,
      });
    } else if (window.confirm(`确认删除法规「${item.name}」吗？`)) run();
  }

  document.addEventListener("click", async (event) => {
    if (!event.target.closest(".emergency-more-menu") && !event.target.closest('[data-row="more"]')) {
      closeMoreMenu();
    }

    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "create") { openForm("create"); return; }
    if (action === "reset") {
      document.querySelectorAll("[data-filter]").forEach((field) => { field.value = ""; });
      fillCategoryFilters();
      render();
      return;
    }
    if (action === "search") { render(); return; }
    if (action === "export") {
      window.openAppDrawer({
        title: "导出法规制度库",
        body: "<p>已生成当前筛选条件下的法规清单（Mock）。</p>",
        footer: `<button class="btn btn-primary" type="button" data-drawer-close>知道了</button>`,
      });
      return;
    }

    const saveBtn = event.target.closest("[data-save-reg]");
    if (saveBtn) {
      await saveForm(saveBtn.dataset.saveReg, saveBtn.dataset.id);
      return;
    }

    const row = event.target.closest("[data-row]");
    if (!row) return;
    const item = byId(row.dataset.id);
    if (!item) return;
    const type = row.dataset.row;
    if (type === "detail") { closeMoreMenu(); openDetail(item); return; }
    if (type === "more") { openMoreMenu(row, item); return; }
    if (type === "edit") { closeMoreMenu(); openForm("edit", item); return; }
    if (type === "delete") { closeMoreMenu(); removeItem(item); }
  });

  fillCategoryFilters();
  persist();
  render();
})();
