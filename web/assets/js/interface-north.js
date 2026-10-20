(function () {
  const esc = (text) => String(text ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const attr = (text) => esc(text).replaceAll("'", "&#39;");

  const IFACE_TIPS = {
    target: "选择上报目标平台，对应市级或区级管廊运维 / 生命线系统。",
    name: "本系统内展示的接口名称，便于运维识别与任务关联。",
    url: "上级平台提供的 HTTPS 上报地址，任务执行时按此地址推送数据。",
    protocol: "与上级平台约定的通信协议。北向最小版仅支持 HTTP（生产环境请使用 HTTPS 地址）。",
    direction: "最小版仅支持单向上报；不接收上级指令下发。",
    auth: "调用上级 HTTP 接口时的身份认证方式，保障上报链路可验身份。",
    secret: "对应认证方式的密钥、Token 或证书口令，保存后不明文展示。",
    whitelist: "仅允许名单内 IP 访问本侧出口或被上级回调；多个地址用逗号分隔。",
    topics: "本接口允许上报的数据主题范围，任务勾选主题不得超过此范围。",
    gateway: "是否经域间网关转发。启用后仅允许上报方向的安全转发，降低外部网络直连风险。",
    enabled: "停用后该接口不可被新任务引用，已关联任务将无法执行上报。",
  };

  const TASK_TIPS = {
    name: "定时上报任务的业务名称，用于列表识别与日志归属。",
    iface: "选择已配置的北向接口；任务只配置报什么、何时报，认证与地址由接口承载。",
    period: "任务触发节奏。实时事件在主题数据产生时立即上报，其余按周期执行。",
    topics: "本次任务实际上报的数据内容，须属于所选接口的可上报主题。",
    scope: "选择本次上报覆盖的业务菜单 / 系统范围，可多选；仅推送所选范围内的数据。",
    enabled: "启用后按周期自动执行；停用后不再触发上报。",
  };

  const SCOPE_OPTIONS = [
    "数据库管理",
    "资产管理",
    "设备监测",
    "通信系统",
    "入侵报警系统",
    "智能井盖系统",
    "门禁系统",
    "电子巡更系统",
    "工单管理",
    "环境与设备监控",
    "应急管理系统",
    "安全管理",
    "报警中心",
    "消防系统",
    "电力监测系统",
    "火灾报警系统",
    "安全防范系统",
  ];

  let draftScopes = [];

  function tipIcon(text) {
    return `<span class="interface-tip" tabindex="0" data-tip="${attr(text)}" aria-label="字段说明"><i class="fa-solid fa-circle-question"></i></span>`;
  }

  function ensureTipFloat() {
    let node = document.getElementById("interfaceTipFloat");
    if (!node) {
      node = document.createElement("div");
      node.id = "interfaceTipFloat";
      node.className = "interface-tip-float";
      document.body.append(node);
    }
    return node;
  }

  function placeTipFloat(anchor) {
    const tip = ensureTipFloat();
    const text = anchor.dataset.tip || "";
    if (!text) return;
    tip.textContent = text;
    tip.classList.add("show");
    const rect = anchor.getBoundingClientRect();
    const gap = 8;
    const tipWidth = tip.offsetWidth || 280;
    const tipHeight = tip.offsetHeight || 60;
    let left = rect.left;
    let top = rect.bottom + gap;
    if (left + tipWidth > window.innerWidth - 12) left = window.innerWidth - tipWidth - 12;
    if (left < 12) left = 12;
    if (top + tipHeight > window.innerHeight - 12) top = rect.top - tipHeight - gap;
    if (top < 12) top = 12;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }

  function hideTipFloat() {
    document.getElementById("interfaceTipFloat")?.classList.remove("show");
  }

  function toast(message) {
    let node = document.getElementById("interfaceToast");
    if (!node) {
      node = document.createElement("div");
      node.id = "interfaceToast";
      node.className = "interface-toast";
      document.body.append(node);
    }
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(window.__interfaceToastTimer);
    window.__interfaceToastTimer = setTimeout(() => node.classList.remove("show"), 2200);
  }

  const ifaceList = [
    {
      id: "N-IF-01",
      name: "市级运行数据上报",
      target: "市级城市生命线平台",
      url: "https://api.city.example.com/v1/report",
      protocol: "HTTP",
      auth: "OAuth 2.0",
      secret: "******",
      whitelist: "10.20.0.0/24",
      topics: ["告警", "设备状态", "运行指标"],
      gateway: "启用转发（仅上报）",
      direction: "仅上报",
      enabled: true,
      status: "正常",
    },
    {
      id: "N-IF-02",
      name: "区级安全事件上报",
      target: "区域管廊运维平台",
      url: "https://api.district.example.com/v1/events",
      protocol: "HTTP",
      auth: "AK / SK 签名",
      secret: "******",
      whitelist: "10.30.0.0/24",
      topics: ["告警", "设备状态"],
      gateway: "启用转发（仅上报）",
      direction: "仅上报",
      enabled: true,
      status: "正常",
    },
  ];

  let tasks = [
    {
      id: "N-00008",
      name: "安全事件主动上报",
      ifaceId: "N-IF-02",
      ifaceName: "区级安全事件上报",
      period: "每 5 分钟",
      topics: ["告警"],
      scopes: ["报警中心", "入侵报警系统", "门禁系统"],
      enabled: true,
      lastRunText: "2026-10-15 16:42:16 · 成功",
    },
    {
      id: "N-00005",
      name: "管廊运行日报",
      ifaceId: "N-IF-01",
      ifaceName: "市级运行数据上报",
      period: "每日 00:00",
      topics: ["运行指标"],
      scopes: ["环境与设备监控", "电力监测系统", "设备监测"],
      enabled: true,
      lastRunText: "2026-10-15 00:00:00 · 成功",
    },
    {
      id: "N-00003",
      name: "设备在线状态汇总",
      ifaceId: "N-IF-01",
      ifaceName: "市级运行数据上报",
      period: "每小时",
      topics: ["设备状态"],
      scopes: ["资产管理", "设备监测", "通信系统"],
      enabled: false,
      lastRunText: "2026-10-15 16:35:12 · 重试",
    },
  ];

  const taskLogs = {
    "N-00008": [
      { startAt: "2026-10-15 16:42:10", endAt: "2026-10-15 16:42:16", result: "成功", summary: "新增告警 2 条", duration: "182 ms", scopes: ["报警中心", "入侵报警系统", "门禁系统"] },
      { startAt: "2026-10-15 16:37:10", endAt: "2026-10-15 16:37:16", result: "成功", summary: "设备离线 1 条", duration: "156 ms", scopes: ["报警中心", "入侵报警系统", "门禁系统"] },
      { startAt: "2026-10-15 16:32:10", endAt: "2026-10-15 16:32:16", result: "成功", summary: "新增告警 0 条", duration: "140 ms", scopes: ["报警中心", "入侵报警系统", "门禁系统"] },
    ],
    "N-00005": [
      { startAt: "2026-10-15 00:00:00", endAt: "2026-10-15 00:00:01", result: "成功", summary: "运行指标 86 项", duration: "1,240 ms", scopes: ["环境与设备监控", "电力监测系统", "设备监测"] },
      { startAt: "2026-10-14 00:00:00", endAt: "2026-10-14 00:00:30", result: "失败", summary: "上级接口超时", duration: "--", scopes: ["环境与设备监控", "电力监测系统", "设备监测"] },
    ],
    "N-00003": [
      { startAt: "2026-10-15 16:35:08", endAt: "2026-10-15 16:35:12", result: "重试", summary: "在线设备 49 台", duration: "3,842 ms", scopes: ["资产管理", "设备监测", "通信系统"] },
      { startAt: "2026-10-15 15:35:10", endAt: "2026-10-15 15:35:12", result: "成功", summary: "在线设备 51 台", duration: "620 ms", scopes: ["资产管理", "设备监测", "通信系统"] },
    ],
  };

  let logTaskId = null;

  function topicChecks(selected = [], name = "topics") {
    return ["告警", "设备状态", "运行指标"].map((topic) => `
      <label class="interface-check">
        <input type="checkbox" data-field="${attr(name)}" value="${attr(topic)}" ${selected.includes(topic) ? "checked" : ""}>
        <span>${esc(topic)}</span>
      </label>
    `).join("");
  }

  function scopeMultiSelectMarkup() {
    return `
      <div class="alarm-tag-select interface-multi-select" data-multi-select="scopes">
        <button class="alarm-tag-control" type="button" data-multi-trigger="scopes" aria-expanded="false">
          <span data-multi-value="scopes"></span>
          <i class="fa-solid fa-chevron-down"></i>
        </button>
        <div class="alarm-tag-dropdown" data-multi-options="scopes"></div>
      </div>
    `;
  }

  function syncScopeMultiSelect() {
    const wrap = document.querySelector('[data-multi-value="scopes"]');
    const panel = document.querySelector('[data-multi-options="scopes"]');
    if (!wrap || !panel) return;
    if (!draftScopes.length) {
      wrap.innerHTML = '<span class="alarm-tag-placeholder">请选择数据范围</span>';
    } else {
      wrap.innerHTML = draftScopes.map((item) => `
        <span class="alarm-selection-tag">${esc(item)}<i data-tag-remove="scopes" data-value="${attr(item)}">×</i></span>
      `).join("");
    }
    panel.innerHTML = SCOPE_OPTIONS.map((item) => `
      <button class="alarm-tag-option ${draftScopes.includes(item) ? "selected" : ""}" type="button" data-multi-option="scopes" data-value="${attr(item)}">
        <span>${esc(item)}</span>${draftScopes.includes(item) ? '<i class="fa-solid fa-check"></i>' : ""}
      </button>
    `).join("");
  }

  function renderIfaces() {
    document.getElementById("ifaceTableBody").innerHTML = ifaceList.map((item) => `
      <tr>
        <td><span class="device-name-cell">${esc(item.name)}</span></td>
        <td>${esc(item.target)}</td>
        <td>${esc(item.protocol)}</td>
        <td>${esc(item.auth)} · HTTPS · ${item.gateway.includes("网关") || item.gateway.includes("转发") ? "网关转发" : "白名单"}</td>
        <td>${esc(item.direction)}</td>
        <td><span class="device-status ${item.enabled ? "good" : "off"}">${item.enabled ? "启用" : "停用"}</span></td>
        <td class="device-actions">
          <button class="table-action" type="button" data-north-action="iface-detail" data-id="${attr(item.id)}">详情</button>
          <button class="table-action" type="button" data-north-action="iface-edit" data-id="${attr(item.id)}">编辑</button>
        </td>
      </tr>
    `).join("");
    document.querySelector("[data-kpi-iface]").textContent = String(ifaceList.length).padStart(2, "0");
  }

  function renderTasks() {
    document.getElementById("northTaskBody").innerHTML = tasks.length ? tasks.map((task) => `
      <tr>
        <td><span class="device-name-cell">${esc(task.name)}</span></td>
        <td>${esc(task.id)}</td>
        <td>${esc(task.ifaceName)}</td>
        <td>${esc(task.period)}</td>
        <td>${esc((task.topics || []).join(" / "))}</td>
        <td>${esc(task.lastRunText)}</td>
        <td><button class="task-toggle ${task.enabled ? "on" : ""}" type="button" aria-pressed="${task.enabled}" data-north-action="task-toggle" data-id="${attr(task.id)}"></button></td>
        <td class="device-actions">
          <button class="table-action" type="button" data-north-action="task-logs" data-id="${attr(task.id)}">同步日志</button>
          <button class="table-action" type="button" data-north-action="task-edit" data-id="${attr(task.id)}">编辑</button>
          <button class="table-action status-danger" type="button" data-north-action="task-delete" data-id="${attr(task.id)}">删除</button>
        </td>
      </tr>
    `).join("") : '<tr><td class="empty-cell" colspan="8">暂无数据</td></tr>';
    document.getElementById("northTaskCount").textContent = tasks.length;
    const enabled = tasks.filter((item) => item.enabled).length;
    document.querySelector("[data-kpi-task]").textContent = String(tasks.length).padStart(2, "0");
    document.querySelector("[data-kpi-task-sub]").textContent = `启用 ${enabled} · 停用 ${tasks.length - enabled}`;
  }

  function ifaceForm(item = {}) {
    return `
      <label class="form-field"><span class="form-label form-required">对接对象 ${tipIcon(IFACE_TIPS.target)}</span>
        <select class="form-control" data-field="target">
          <option ${item.target === "市级城市生命线平台" || !item.target ? "selected" : ""}>市级城市生命线平台</option>
          <option ${item.target === "区域管廊运维平台" ? "selected" : ""}>区域管廊运维平台</option>
        </select>
      </label>
      <label class="form-field"><span class="form-label form-required">接口名称 ${tipIcon(IFACE_TIPS.name)}</span><input class="form-control" data-field="name" value="${attr(item.name || "")}" placeholder="如：市级运行数据上报"></label>
      <label class="form-field"><span class="form-label form-required">接口地址 ${tipIcon(IFACE_TIPS.url)}</span><input class="form-control" data-field="url" value="${attr(item.url || "")}" placeholder="https://api.city.example.com/v1/report"></label>
      <label class="form-field"><span class="form-label form-required">协议类型 ${tipIcon(IFACE_TIPS.protocol)}</span>
        <select class="form-control" data-field="protocol"><option selected>HTTP</option></select>
      </label>
      <label class="form-field"><span class="form-label form-required">方向 ${tipIcon(IFACE_TIPS.direction)}</span>
        <select class="form-control" data-field="direction"><option>仅上报</option></select>
      </label>
      <div class="interface-form-section">安全与权限（归属本接口）</div>
      <label class="form-field"><span class="form-label form-required">认证方式 ${tipIcon(IFACE_TIPS.auth)}</span>
        <select class="form-control" data-field="auth">
          <option ${!item.auth || item.auth.includes("OAuth") ? "selected" : ""}>OAuth 2.0</option>
          <option ${item.auth && item.auth.includes("AK") ? "selected" : ""}>AK / SK 签名</option>
          <option ${item.auth && item.auth.includes("TLS") ? "selected" : ""}>双向 TLS 证书</option>
        </select>
      </label>
      <label class="form-field"><span class="form-label form-required">凭证 / 密钥 ${tipIcon(IFACE_TIPS.secret)}</span><input class="form-control" type="password" data-field="secret" value="${attr(item.secret || "")}" placeholder="Client Secret / AKSK / 证书口令"></label>
      <label class="form-field"><span class="form-label">IP 白名单 ${tipIcon(IFACE_TIPS.whitelist)}</span><input class="form-control" data-field="whitelist" value="${attr(item.whitelist || "")}" placeholder="如：10.20.0.0/24，多个用逗号分隔"></label>
      <div class="form-field">
        <span class="form-label">可上报主题 ${tipIcon(IFACE_TIPS.topics)}</span>
        <div class="interface-check-group">${topicChecks(item.topics || ["告警", "设备状态"])}</div>
      </div>
      <div class="interface-form-section">域间策略（归属本接口）</div>
      <label class="form-field"><span class="form-label">域间网关 ${tipIcon(IFACE_TIPS.gateway)}</span>
        <select class="form-control" data-field="gateway">
          <option ${!item.gateway || item.gateway.includes("转发") ? "selected" : ""}>启用转发（仅上报）</option>
          <option ${item.gateway === "直连（内网）" ? "selected" : ""}>直连（内网）</option>
        </select>
      </label>
      <label class="form-field"><span class="form-label form-required">状态 ${tipIcon(IFACE_TIPS.enabled)}</span>
        <select class="form-control" data-field="enabled"><option value="true" ${item.enabled !== false ? "selected" : ""}>启用</option><option value="false" ${item.enabled === false ? "selected" : ""}>停用</option></select>
      </label>
    `;
  }

  function taskForm(task = {}) {
    return `
      <div data-task-form>
        <label class="form-field"><span class="form-label form-required">任务名称 ${tipIcon(TASK_TIPS.name)}</span><input class="form-control" data-field="name" value="${attr(task.name || "")}" placeholder="如：安全事件主动上报"></label>
        <label class="form-field"><span class="form-label form-required">上报接口 ${tipIcon(TASK_TIPS.iface)}</span>
          <select class="form-control" data-field="ifaceId">${ifaceList.map((item) => `<option value="${attr(item.id)}" ${task.ifaceId === item.id || (!task.ifaceId && item.id === ifaceList[0].id) ? "selected" : ""}>${esc(item.name)}</option>`).join("")}</select>
        </label>
        <label class="form-field"><span class="form-label form-required">触发周期 ${tipIcon(TASK_TIPS.period)}</span>
          <select class="form-control" data-field="period">
            ${["每 5 分钟", "每 15 分钟", "每小时", "每日 00:00", "实时事件"].map((item) => `<option ${task.period === item ? "selected" : ""}>${item}</option>`).join("")}
          </select>
        </label>
        <div class="form-field">
          <span class="form-label form-required">上报主题 ${tipIcon(TASK_TIPS.topics)}</span>
          <div class="interface-check-group">${topicChecks(task.topics || ["告警"])}</div>
        </div>
        <div class="form-field">
          <span class="form-label form-required">数据范围 ${tipIcon(TASK_TIPS.scope)}</span>
          ${scopeMultiSelectMarkup()}
        </div>
        <label class="form-field"><span class="form-label form-required">启用状态 ${tipIcon(TASK_TIPS.enabled)}</span>
          <select class="form-control" data-field="enabled"><option value="true" ${task.enabled !== false ? "selected" : ""}>启用</option><option value="false" ${task.enabled === false ? "selected" : ""}>停用</option></select>
        </label>
      </div>
    `;
  }

  function openDrawer(title, body, onSave) {
    window.openAppDrawer?.({
      title,
      body,
      footer: `<button class="btn btn-secondary" type="button" data-drawer-close>取消</button><button class="btn btn-primary" type="button" data-north-save>保存</button>`,
    });
    document.querySelector("[data-north-save]")?.addEventListener("click", onSave);
  }

  function readTopics(root) {
    return [...root.querySelectorAll('[data-field="topics"]:checked')].map((node) => node.value);
  }

  function saveIface(editId) {
    const root = document.querySelector(".drawer-body") || document;
    const name = root.querySelector('[data-field="name"]')?.value?.trim();
    const url = root.querySelector('[data-field="url"]')?.value?.trim();
    const secret = root.querySelector('[data-field="secret"]')?.value?.trim();
    if (!name || !url || !secret) {
      toast("请完善接口必填项");
      return;
    }
    const payload = {
      name,
      target: root.querySelector('[data-field="target"]')?.value,
      url,
      protocol: root.querySelector('[data-field="protocol"]')?.value || "HTTP",
      direction: root.querySelector('[data-field="direction"]')?.value,
      auth: root.querySelector('[data-field="auth"]')?.value,
      secret,
      whitelist: root.querySelector('[data-field="whitelist"]')?.value?.trim() || "",
      topics: readTopics(root),
      gateway: root.querySelector('[data-field="gateway"]')?.value,
      enabled: root.querySelector('[data-field="enabled"]')?.value !== "false",
      status: "正常",
    };
    if (editId) {
      const target = ifaceList.find((item) => item.id === editId);
      Object.assign(target, payload);
    } else {
      ifaceList.unshift({ ...payload, id: `N-IF-${String(Date.now()).slice(-2)}` });
    }
    renderIfaces();
    window.closeAppDrawer?.();
    toast("北向接口已保存");
  }

  function saveTask(editId) {
    const root = document.querySelector("[data-task-form]") || document.querySelector(".drawer-body");
    const name = root.querySelector('[data-field="name"]')?.value?.trim();
    const topics = readTopics(root);
    if (!name || !topics.length || !draftScopes.length) {
      toast("请完善任务必填项：任务名称、上报主题、数据范围");
      return;
    }
    const ifaceId = root.querySelector('[data-field="ifaceId"]')?.value;
    const iface = ifaceList.find((item) => item.id === ifaceId) || ifaceList[0];
    const payload = {
      id: editId || `N-${String(Date.now()).slice(-5)}`,
      name,
      ifaceId: iface.id,
      ifaceName: iface.name,
      period: root.querySelector('[data-field="period"]')?.value,
      topics,
      scopes: [...draftScopes],
      enabled: root.querySelector('[data-field="enabled"]')?.value !== "false",
      lastRunText: `${new Date().toLocaleString("zh-CN", { hour12: false }).replace(/\//g, "-")} · 待执行`,
    };
    if (editId) {
      tasks = tasks.map((item) => (item.id === editId ? { ...item, ...payload, id: editId } : item));
      if (!taskLogs[editId]) taskLogs[editId] = [];
    } else {
      tasks.unshift(payload);
      taskLogs[payload.id] = [];
    }
    draftScopes = [];
    renderTasks();
    window.closeAppDrawer?.();
    toast("定时任务已保存");
  }

  function openTaskDrawer(task) {
    draftScopes = [...(task?.scopes || [])];
    openDrawer(task ? "编辑定时任务" : "新建定时任务", taskForm(task || {}), () => saveTask(task?.id || null));
    syncScopeMultiSelect();
  }

  function showIfaceDetail(item) {
    window.openAppDrawer?.({
      title: `${item.name} · 接口详情`,
      body: `
        <section class="detail-section"><h3 class="detail-title">基本信息</h3>
          <div class="detail-grid">
            <div class="info-item"><span class="info-label">对接对象</span><span class="info-value">${esc(item.target)}</span></div>
            <div class="info-item"><span class="info-label">接口名称</span><span class="info-value">${esc(item.name)}</span></div>
            <div class="info-item"><span class="info-label">接口地址</span><span class="info-value">${esc(item.url)}</span></div>
            <div class="info-item"><span class="info-label">协议类型</span><span class="info-value">${esc(item.protocol)}</span></div>
            <div class="info-item"><span class="info-label">方向</span><span class="info-value">${esc(item.direction)}</span></div>
            <div class="info-item"><span class="info-label">状态</span><span class="info-value">${item.enabled ? "启用" : "停用"}</span></div>
          </div>
        </section>
        <section class="detail-section"><h3 class="detail-title">安全与权限</h3>
          <div class="detail-grid">
            <div class="info-item"><span class="info-label">认证方式</span><span class="info-value">${esc(item.auth)}</span></div>
            <div class="info-item"><span class="info-label">凭证 / 密钥</span><span class="info-value">${esc(item.secret)}</span></div>
            <div class="info-item"><span class="info-label">IP 白名单</span><span class="info-value">${esc(item.whitelist || "--")}</span></div>
            <div class="info-item"><span class="info-label">可上报主题</span><span class="info-value">${esc((item.topics || []).join("、"))}</span></div>
          </div>
        </section>
        <section class="detail-section"><h3 class="detail-title">域间策略</h3>
          <div class="detail-grid">
            <div class="info-item"><span class="info-label">域间网关</span><span class="info-value">${esc(item.gateway)}</span></div>
          </div>
        </section>
      `,
      footer: `<button class="btn btn-secondary" type="button" data-drawer-close>关闭</button>`,
    });
  }

  function normalizeDateTime(value) {
    return String(value || "").replace("T", " ").slice(0, 19);
  }

  function filterNorthLogs(rows) {
    const start = normalizeDateTime(document.querySelector('[data-log-filter="start"]')?.value);
    const end = normalizeDateTime(document.querySelector('[data-log-filter="end"]')?.value);
    const result = document.querySelector('[data-log-filter="result"]')?.value || "";
    return rows.filter((row) => {
      if (start && row.startAt < start) return false;
      if (end && row.endAt > end) return false;
      if (result && row.result !== result) return false;
      return true;
    });
  }

  function renderNorthLogRows(rows) {
    const body = document.getElementById("northLogBody");
    if (!body) return;
    const list = filterNorthLogs(rows);
    body.innerHTML = list.length ? list.map((row) => {
      const scopeText = (row.scopes || []).join("、");
      return `
        <tr>
          <td>${esc(row.startAt)}</td>
          <td>${esc(row.endAt)}</td>
          <td><span class="interface-ellipsis" title="${attr(scopeText)}">${esc(scopeText)}</span></td>
          <td><span class="log-level ${row.result === "成功" ? "success" : row.result === "重试" ? "warn" : "error"}">${esc(row.result)}</span></td>
          <td>${esc(row.summary)}</td>
          <td>${esc(row.duration)}</td>
        </tr>
      `;
    }).join("") : '<tr><td class="empty-cell" colspan="6">暂无同步日志</td></tr>';
  }

  function showTaskLogs(task) {
    logTaskId = task.id;
    const rows = taskLogs[task.id] || [];
    window.openAppDrawer?.({
      title: `同步日志 · ${task.name}`,
      className: "interface-log-drawer",
      body: `
        <div class="interface-log-filter">
          <label class="form-field"><span class="form-label">执行开始时间</span><input class="form-control" type="datetime-local" data-log-filter="start"></label>
          <label class="form-field"><span class="form-label">执行结束时间</span><input class="form-control" type="datetime-local" data-log-filter="end"></label>
          <label class="form-field"><span class="form-label">结果</span>
            <select class="form-control" data-log-filter="result">
              <option value="">全部</option>
              <option>成功</option>
              <option>重试</option>
              <option>失败</option>
            </select>
          </label>
          <div class="device-filter-actions">
            <button class="btn btn-secondary" type="button" data-north-action="log-reset">重置</button>
            <button class="btn btn-primary" type="button" data-north-action="log-search">搜索</button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="table interface-log-table">
            <thead>
              <tr>
                <th>执行开始时间</th>
                <th>执行结束时间</th>
                <th>数据范围</th>
                <th>结果</th>
                <th>数据摘要</th>
                <th>耗时</th>
              </tr>
            </thead>
            <tbody id="northLogBody"></tbody>
          </table>
        </div>
      `,
      footer: `<button class="btn btn-secondary" type="button" data-drawer-close>关闭</button>`,
    });
    renderNorthLogRows(rows);
  }

  document.addEventListener("mouseover", (event) => {
    const tip = event.target.closest(".interface-tip[data-tip]");
    if (tip) placeTipFloat(tip);
  });
  document.addEventListener("mouseout", (event) => {
    const tip = event.target.closest(".interface-tip[data-tip]");
    if (!tip) return;
    if (event.relatedTarget && tip.contains(event.relatedTarget)) return;
    hideTipFloat();
  });
  document.addEventListener("focusin", (event) => {
    const tip = event.target.closest(".interface-tip[data-tip]");
    if (tip) placeTipFloat(tip);
  });
  document.addEventListener("focusout", (event) => {
    if (!event.target.closest(".interface-tip[data-tip]")) return;
    hideTipFloat();
  });
  document.addEventListener("scroll", hideTipFloat, true);

  document.addEventListener("click", (event) => {
    const multiTrigger = event.target.closest("[data-multi-trigger]");
    if (multiTrigger && !multiTrigger.disabled) {
      const key = multiTrigger.dataset.multiTrigger;
      const root = document.querySelector(`[data-multi-select="${key}"]`);
      document.querySelectorAll(".interface-multi-select.open").forEach((node) => {
        if (node !== root) node.classList.remove("open");
      });
      root?.classList.toggle("open");
      multiTrigger.setAttribute("aria-expanded", root?.classList.contains("open") ? "true" : "false");
      return;
    }

    const multiOption = event.target.closest("[data-multi-option]");
    if (multiOption && multiOption.dataset.multiOption === "scopes") {
      const value = multiOption.dataset.value;
      const index = draftScopes.indexOf(value);
      if (index >= 0) draftScopes.splice(index, 1);
      else draftScopes.push(value);
      syncScopeMultiSelect();
      return;
    }

    const tagRemove = event.target.closest("[data-tag-remove]");
    if (tagRemove && tagRemove.dataset.tagRemove === "scopes") {
      event.stopPropagation();
      draftScopes = draftScopes.filter((item) => item !== tagRemove.dataset.value);
      syncScopeMultiSelect();
      return;
    }

    if (!event.target.closest(".interface-multi-select")) {
      document.querySelectorAll(".interface-multi-select.open").forEach((node) => node.classList.remove("open"));
    }

    const actionNode = event.target.closest("[data-north-action]");
    if (!actionNode) return;
    const action = actionNode.dataset.northAction;
    const id = actionNode.dataset.id;

    if (action === "iface-create") {
      openDrawer("新增北向接口", ifaceForm(), () => saveIface(null));
      return;
    }
    if (action === "iface-edit") {
      openDrawer("编辑北向接口", ifaceForm(ifaceList.find((item) => item.id === id)), () => saveIface(id));
      return;
    }
    if (action === "iface-detail") {
      showIfaceDetail(ifaceList.find((item) => item.id === id));
      return;
    }
    if (action === "task-create") {
      openTaskDrawer(null);
      return;
    }
    if (action === "task-edit") {
      openTaskDrawer(tasks.find((item) => item.id === id));
      return;
    }
    if (action === "task-logs") {
      showTaskLogs(tasks.find((item) => item.id === id));
      return;
    }
    if (action === "log-search") {
      renderNorthLogRows(taskLogs[logTaskId] || []);
      return;
    }
    if (action === "log-reset") {
      document.querySelectorAll("[data-log-filter]").forEach((field) => { field.value = ""; });
      renderNorthLogRows(taskLogs[logTaskId] || []);
      return;
    }
    if (action === "task-toggle") {
      tasks = tasks.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item));
      renderTasks();
      toast(tasks.find((item) => item.id === id)?.enabled ? "任务已启用" : "任务已停用");
      return;
    }
    if (action === "task-delete") {
      window.openAppConfirm?.({
        title: "删除定时任务",
        message: "确认删除该定时上报任务吗？删除后不可恢复。",
        confirmText: "删除",
        onConfirm: () => {
          tasks = tasks.filter((item) => item.id !== id);
          delete taskLogs[id];
          renderTasks();
          toast("定时任务已删除");
        },
      });
    }
  });

  renderIfaces();
  renderTasks();
})();
