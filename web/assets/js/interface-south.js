(function () {
  const systemTypes = (window.APP_SYSTEM_TYPES || []).filter((item) => item?.name !== "视频监控系统");
  const deviceCategories = window.APP_DEVICE_CATEGORIES || [];
  const projects = ["科学岛财富中心", "厦门科学岛"];
  const corridors = ["1号综合管廊", "滨海管廊"];
  const rooms = ["电力舱", "综合舱", "通信舱"];
  const TOPIC_TIP = "指定要从墨斗采集的数据类型：实时测点=传感数值；告警=告警事件；在线状态=设备在线/离线。";
  const ACCESS_TIPS = {
    protocol: "选择与墨斗平台通信的接入协议。HTTP 为请求应答；MQTT 为长连接订阅推送。",
    https: "是否强制走 HTTPS。强制则明文 HTTP 直接拒绝，保证密钥与报文加密传输。",
    timeout: "单次请求最长等待时间；超过即判失败（如墨斗无响应）。",
    retry: "超时或临时失败后自动再试几次；仍失败才记异常，避免偶发抖动误报。",
    mqttTls: "是否启用 MQTTS（TLS）。生产环境建议开启，防止明文传输。",
    keepAlive: "客户端与 Broker 的心跳间隔；超时未心跳将触发重连。",
    cleanSession: "为「是」时断开不保留会话；为「否」时可在重连后恢复未完成消息。",
    qos: "消息投递等级：0 最多一次；1 至少一次；2 恰好一次。",
    reconnect: "连接断开后自动重连的等待间隔。",
    port: "Broker 端口。地址未带端口时使用；明文常用 1883，TLS 常用 8883。",
  };

  const esc = (text) => String(text ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const attr = (text) => esc(text).replaceAll("'", "&#39;");

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

  function formatDateTime(date = new Date()) {
    const d = date instanceof Date ? date : new Date(date);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
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

  const sourceDevices = (window.APP_DATA?.devices || []).map((device, index) => ({
    id: device.id,
    name: device.name,
    code: `001_${String(device.model || "DEV").replace(/[^A-Z0-9]/gi, "").slice(0, 8)}_${String(index + 1).padStart(4, "0")}`,
    system: device.system,
    type: device.category,
    project: projects[index % projects.length],
    corridor: corridors[index % corridors.length],
    room: rooms[index % rooms.length],
  }));

  const accessList = [
    {
      id: "ACC-MD-01",
      name: "墨斗物联网平台-生产",
      url: "https://iot.modou.example.com",
      protocol: "HTTP",
      auth: "AK / SK",
      appKey: "md_ak_prod_8f2a",
      appSecret: "******",
      tenant: "科学岛管廊项目",
      https: "强制 HTTPS",
      timeout: "10 秒",
      retry: "3 次",
      linkStatus: "正常",
      enabled: true,
      heartbeat: "2026-10-15 16:40:12",
    },
    {
      id: "ACC-MD-02",
      name: "墨斗物联网平台-MQTT",
      url: "mqtt.modou.example.com",
      protocol: "MQTT",
      auth: "用户名密码",
      port: "8883",
      clientId: "corridor-south-01",
      mqttUser: "modou_user",
      mqttPassword: "******",
      tenant: "科学岛管廊项目",
      mqttTls: "MQTTS（TLS）",
      keepAlive: "60 秒",
      cleanSession: "是",
      qos: "1",
      reconnect: "10 秒",
      linkStatus: "正常",
      enabled: true,
      heartbeat: "2026-10-15 16:41:08",
    },
  ];

  let tasks = [
    {
      id: "S-00031",
      name: "环境监测实时测点",
      accessId: "ACC-MD-01",
      accessName: "墨斗物联网平台-生产",
      systems: ["环境监测"],
      types: ["室内环境传感器", "通风设备"],
      scope: "all",
      deviceIds: [],
      mode: "实时订阅",
      period: "实时（订阅）",
      topics: ["实时测点", "在线状态"],
      enabled: true,
      lastRunAt: "2026-10-15T16:40:00",
      lastRunText: "2026-10-15 16:40:00 · 成功",
    },
    {
      id: "S-00027",
      name: "消防告警订阅",
      accessId: "ACC-MD-01",
      accessName: "墨斗物联网平台-生产",
      systems: ["消防监控系统"],
      types: ["消防设备", "燃气报警"],
      scope: "list",
      deviceIds: ["D-10025", "D-10026"],
      mode: "实时订阅",
      period: "实时（订阅）",
      topics: ["告警"],
      enabled: true,
      lastRunAt: "2026-10-15T16:39:48",
      lastRunText: "2026-10-15 16:39:48 · 成功",
    },
    {
      id: "S-00019",
      name: "电力设备轮询",
      accessId: "ACC-MD-01",
      accessName: "墨斗物联网平台-生产",
      systems: ["电力监测平台"],
      types: ["电表", "供配电"],
      scope: "list",
      deviceIds: ["D-10024", "D-10031"],
      mode: "轮询",
      period: "30 秒",
      topics: ["实时测点"],
      enabled: false,
      lastRunAt: "2026-10-15T16:38:00",
      lastRunText: "2026-10-15 16:38:00 · 超时",
    },
  ];

  const taskLogs = {
    "S-00031": [
      { startAt: "2026-10-15 16:39:55", endAt: "2026-10-15 16:40:00", result: "成功", summary: "采集测点 128 条", duration: "186 ms", systems: ["环境监测"], types: ["室内环境传感器", "通风设备"] },
      { startAt: "2026-10-15 16:34:55", endAt: "2026-10-15 16:35:00", result: "成功", summary: "采集测点 126 条", duration: "172 ms", systems: ["环境监测"], types: ["室内环境传感器", "通风设备"] },
      { startAt: "2026-10-15 16:29:55", endAt: "2026-10-15 16:30:00", result: "成功", summary: "采集测点 130 条", duration: "201 ms", systems: ["环境监测"], types: ["室内环境传感器", "通风设备"] },
    ],
    "S-00027": [
      { startAt: "2026-10-15 16:39:40", endAt: "2026-10-15 16:39:48", result: "成功", summary: "告警事件 1 条", duration: "96 ms", systems: ["消防监控系统"], types: ["消防设备", "燃气报警"] },
      { startAt: "2026-10-15 16:20:05", endAt: "2026-10-15 16:20:11", result: "成功", summary: "告警事件 0 条", duration: "88 ms", systems: ["消防监控系统"], types: ["消防设备", "燃气报警"] },
    ],
    "S-00019": [
      { startAt: "2026-10-15 16:37:50", endAt: "2026-10-15 16:38:00", result: "失败", summary: "连接超时", duration: "--", systems: ["电力监测平台"], types: ["电表", "供配电"] },
      { startAt: "2026-10-15 16:37:20", endAt: "2026-10-15 16:37:30", result: "重试", summary: "第 2 次重试", duration: "3,120 ms", systems: ["电力监测平台"], types: ["电表", "供配电"] },
      { startAt: "2026-10-15 16:36:50", endAt: "2026-10-15 16:37:00", result: "失败", summary: "鉴权失败", duration: "420 ms", systems: ["电力监测平台"], types: ["电表", "供配电"] },
    ],
  };

  let logTaskId = null;

  let filteredTasks = [...tasks];
  let draftSelectedIds = [];
  let selectedPage = 1;
  const SELECTED_PAGE_SIZE = 5;
  let pickerTempIds = new Set();
  let editingTaskId = null;
  let pickerContext = { systems: [], types: [] };
  let draftSystems = [];
  let draftTypes = [];

  function occupiedDeviceIds(excludeTaskId) {
    const set = new Set();
    tasks.forEach((task) => {
      if (task.id === excludeTaskId) return;
      (task.deviceIds || []).forEach((id) => set.add(id));
    });
    return set;
  }

  function deviceById(id) {
    return sourceDevices.find((item) => item.id === id);
  }

  function accessSecurityText(item) {
    if (item.protocol === "MQTT") {
      return `${esc(item.mqttTls || "MQTT")} · KeepAlive ${esc(item.keepAlive || "--")} · QoS ${esc(item.qos || "--")}`;
    }
    return `${esc(item.https || "--")} · 超时 ${esc(item.timeout || "--")} · 重试 ${esc(item.retry || "--")}`;
  }

  function renderAccess() {
    const body = document.getElementById("accessTableBody");
    body.innerHTML = accessList.map((item) => `
      <tr>
        <td><span class="device-name-cell">${esc(item.name)}</span></td>
        <td>${esc(item.url)}</td>
        <td>${esc(item.protocol || "HTTP")}</td>
        <td>${esc(item.auth)}</td>
        <td>${accessSecurityText(item)}</td>
        <td><span class="device-status ${item.linkStatus === "正常" ? "good" : "warn"}">${esc(item.linkStatus)}</span></td>
        <td><span class="device-status ${item.enabled ? "good" : "off"}">${item.enabled ? "启用" : "停用"}</span></td>
        <td>${esc(item.heartbeat)}</td>
        <td class="device-actions">
          <button class="table-action" type="button" data-south-action="access-test" data-id="${attr(item.id)}">测试连接</button>
          <button class="table-action" type="button" data-south-action="access-edit" data-id="${attr(item.id)}">编辑</button>
          <button class="table-action" type="button" data-south-action="access-detail" data-id="${attr(item.id)}">详情</button>
        </td>
      </tr>
    `).join("");
    document.querySelector("[data-kpi-access]").textContent = String(accessList.length).padStart(2, "0");
  }

  function renderTasks() {
    const body = document.getElementById("taskTableBody");
    body.innerHTML = filteredTasks.length ? filteredTasks.map((task) => `
      <tr>
        <td><span class="device-name-cell">${esc(task.name)}</span></td>
        <td>${esc(task.id)}</td>
        <td>${esc(task.accessName)}</td>
        <td>${esc((task.systems || []).join("、"))}</td>
        <td>${esc((task.types || []).join("、"))}</td>
        <td>${esc(task.mode)}${task.mode === "轮询" ? ` · ${esc(task.period)}` : ""}</td>
        <td>${esc((task.topics || []).join(" / "))}</td>
        <td>${esc(task.lastRunText)}</td>
        <td><button class="task-toggle ${task.enabled ? "on" : ""}" type="button" aria-pressed="${task.enabled}" data-south-action="task-toggle" data-id="${attr(task.id)}"></button></td>
        <td class="device-actions">
          <button class="table-action" type="button" data-south-action="task-logs" data-id="${attr(task.id)}">采集日志</button>
          <button class="table-action" type="button" data-south-action="task-edit" data-id="${attr(task.id)}">编辑</button>
          <button class="table-action status-danger" type="button" data-south-action="task-delete" data-id="${attr(task.id)}">删除</button>
        </td>
      </tr>
    `).join("") : '<tr><td class="empty-cell" colspan="10">暂无数据</td></tr>';
    document.getElementById("taskCount").textContent = filteredTasks.length;
    const enabled = tasks.filter((item) => item.enabled).length;
    document.querySelector("[data-kpi-task]").textContent = String(tasks.length).padStart(2, "0");
    document.querySelector("[data-kpi-task-sub]").textContent = `运行中 ${enabled} · 已停用 ${tasks.length - enabled}`;
  }

  function applyTaskFilter() {
    const name = (document.querySelector('[data-task-filter="name"]')?.value || "").trim();
    const start = document.querySelector('[data-task-filter="start"]')?.value || "";
    const end = document.querySelector('[data-task-filter="end"]')?.value || "";
    filteredTasks = tasks.filter((task) => {
      if (name && !task.name.includes(name)) return false;
      if (start && task.lastRunAt < start) return false;
      if (end && task.lastRunAt > end) return false;
      return true;
    });
    renderTasks();
  }

  function topicChecks(selected = []) {
    return ["实时测点", "告警", "在线状态"].map((topic) => `
      <label class="interface-check">
        <input type="checkbox" data-field="topics" value="${attr(topic)}" ${selected.includes(topic) ? "checked" : ""}>
        <span>${esc(topic)}</span>
      </label>
    `).join("");
  }

  function typeOptionsForSystems(systems = []) {
    if (!systems.length) return [];
    const set = new Set();
    const list = [];
    deviceCategories.forEach((item) => {
      if (systems.includes(item.system) && !set.has(item.name)) {
        set.add(item.name);
        list.push(item.name);
      }
    });
    return list;
  }

  function multiSelectMarkup(key, options, selected, placeholder, disabled = false) {
    return `
      <div class="alarm-tag-select interface-multi-select ${disabled ? "is-disabled" : ""}" data-multi-select="${attr(key)}">
        <button class="alarm-tag-control" type="button" data-multi-trigger="${attr(key)}" aria-expanded="false" ${disabled ? "disabled" : ""}>
          <span data-multi-value="${attr(key)}"></span>
          <i class="fa-solid fa-chevron-down"></i>
        </button>
        <div class="alarm-tag-dropdown" data-multi-options="${attr(key)}"></div>
      </div>
    `;
  }

  function renderMultiValue(key, selected, placeholder) {
    const wrap = document.querySelector(`[data-multi-value="${key}"]`);
    if (!wrap) return;
    if (!selected.length) {
      wrap.innerHTML = `<span class="alarm-tag-placeholder">${esc(placeholder)}</span>`;
      return;
    }
    wrap.innerHTML = selected.map((item) => `
      <span class="alarm-selection-tag">${esc(item)}<i data-tag-remove="${attr(key)}" data-value="${attr(item)}">×</i></span>
    `).join("");
  }

  function renderMultiOptions(key, options, selected) {
    const panel = document.querySelector(`[data-multi-options="${key}"]`);
    if (!panel) return;
    if (!options.length) {
      panel.innerHTML = '<span class="alarm-tag-empty">暂无选项</span>';
      return;
    }
    panel.innerHTML = options.map((item) => `
      <button class="alarm-tag-option ${selected.includes(item) ? "selected" : ""}" type="button" data-multi-option="${attr(key)}" data-value="${attr(item)}">
        <span>${esc(item)}</span>${selected.includes(item) ? '<i class="fa-solid fa-check"></i>' : ""}
      </button>
    `).join("");
  }

  function syncMultiSelects() {
    renderMultiValue("systems", draftSystems, "请选择所属系统");
    renderMultiOptions("systems", systemTypes.map((item) => item.name), draftSystems);
    const typeRoot = document.querySelector('[data-multi-select="types"]');
    const typeTrigger = typeRoot?.querySelector("[data-multi-trigger]");
    const disabled = !draftSystems.length;
    typeRoot?.classList.toggle("is-disabled", disabled);
    if (typeTrigger) typeTrigger.disabled = disabled;
    const typeOptions = typeOptionsForSystems(draftSystems);
    draftTypes = draftTypes.filter((item) => typeOptions.includes(item));
    renderMultiValue("types", draftTypes, disabled ? "请先选择所属系统" : "请选择设备类型");
    renderMultiOptions("types", typeOptions, draftTypes);
  }

  function selectedDeviceTable() {
    if (!draftSelectedIds.length) return '<div class="interface-hint">尚未选择设备</div>';
    const total = draftSelectedIds.length;
    const totalPages = Math.max(1, Math.ceil(total / SELECTED_PAGE_SIZE));
    if (selectedPage > totalPages) selectedPage = totalPages;
    if (selectedPage < 1) selectedPage = 1;
    const start = (selectedPage - 1) * SELECTED_PAGE_SIZE;
    const pageIds = draftSelectedIds.slice(start, start + SELECTED_PAGE_SIZE);
    const pageItems = [];
    for (let i = 1; i <= totalPages; i += 1) {
      pageItems.push(`<span class="page-item ${i === selectedPage ? "active" : ""}" data-south-action="selected-page" data-page="${i}">${i}</span>`);
    }
    return `
      <div class="table-wrap interface-selected-table-wrap">
        <table class="table interface-selected-table">
          <thead>
            <tr>
              <th>设备名称</th>
              <th>设备编码</th>
              <th>所属系统</th>
              <th>设备分类</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${pageIds.map((id) => {
              const device = deviceById(id) || { id, name: id, code: "-", system: "-", type: "-" };
              return `
                <tr>
                  <td>${esc(device.name)}</td>
                  <td>${esc(device.code)}</td>
                  <td>${esc(device.system)}</td>
                  <td>${esc(device.type)}</td>
                  <td><button class="table-action status-danger" type="button" data-south-action="remove-chip" data-id="${attr(id)}">移除</button></td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
      <div class="pagination interface-selected-pagination">
        <span>共 <strong>${total}</strong> 条，每页 ${SELECTED_PAGE_SIZE} 条</span>
        <span class="page-item ${selectedPage <= 1 ? "disabled" : ""}" data-south-action="selected-page" data-page="${selectedPage - 1}">‹</span>
        ${pageItems.join("")}
        <span class="page-item ${selectedPage >= totalPages ? "disabled" : ""}" data-south-action="selected-page" data-page="${selectedPage + 1}">›</span>
      </div>
    `;
  }

  function scopeBlock(scope = "all") {
    return `
      <div class="form-field">
        <span class="form-label form-required">采集范围</span>
        <div class="device-radio-row">
          <label class="device-radio"><input type="radio" name="scope" value="all" ${scope === "all" ? "checked" : ""}>全部设备</label>
          <label class="device-radio"><input type="radio" name="scope" value="list" ${scope === "list" ? "checked" : ""}>按设备 ID 列表</label>
        </div>
      </div>
      <div class="interface-scope-panel ${scope === "list" ? "" : "hidden"}" data-scope-panel>
        <div class="interface-scope-actions">
          <button class="btn btn-secondary btn-sm" type="button" data-south-action="open-picker"><i class="fa-solid fa-plus"></i> 选择设备</button>
        </div>
        <div data-selected-devices>${selectedDeviceTable()}</div>
      </div>
    `;
  }

  function accessForm(item = {}) {
    const tenants = ["科学岛管廊项目", "科学岛财富中心", "默认租户"];
    const protocol = item.protocol === "MQTT" ? "MQTT" : "HTTP";
    return `
      <div data-access-form data-protocol="${attr(protocol)}">
        <label class="form-field"><span class="form-label form-required">接入名称</span><input class="form-control" data-field="name" value="${attr(item.name || "")}" placeholder="如：墨斗物联网平台-生产"></label>
        <label class="form-field"><span class="form-label form-required">平台地址</span><input class="form-control" data-field="url" value="${attr(item.url || "")}" placeholder="${protocol === "MQTT" ? "mqtt.modou.example.com" : "https://iot.modou.example.com"}" data-url-placeholder></label>
        <label class="form-field"><span class="form-label form-required">接入协议 ${tipIcon(ACCESS_TIPS.protocol)}</span>
          <select class="form-control" data-field="protocol">
            <option value="HTTP" ${protocol === "HTTP" ? "selected" : ""}>HTTP</option>
            <option value="MQTT" ${protocol === "MQTT" ? "selected" : ""}>MQTT</option>
          </select>
        </label>
        <label class="form-field"><span class="form-label">默认租户 / 项目</span><select class="form-control" data-field="tenant"><option value="">请选择</option>${tenants.map((tenant) => `<option value="${attr(tenant)}" ${item.tenant === tenant ? "selected" : ""}>${esc(tenant)}</option>`).join("")}</select></label>
        <label class="form-field"><span class="form-label form-required">状态</span><select class="form-control" data-field="enabled"><option value="true" ${item.enabled !== false ? "selected" : ""}>启用</option><option value="false" ${item.enabled === false ? "selected" : ""}>停用</option></select></label>

        <div data-protocol-panel="HTTP" class="${protocol === "HTTP" ? "" : "hidden"}">
          <div class="interface-form-section">HTTP 认证与连接</div>
          <label class="form-field"><span class="form-label form-required">认证方式</span><select class="form-control" data-field="auth"><option ${item.auth === "AK / SK" || !item.auth || item.protocol === "MQTT" ? "selected" : ""}>AK / SK</option><option ${item.auth === "Token" ? "selected" : ""}>Token</option><option ${item.auth === "账号密码" ? "selected" : ""}>账号密码</option></select></label>
          <label class="form-field"><span class="form-label form-required">AppKey / ClientId</span><input class="form-control" data-field="appKey" value="${attr(item.protocol === "MQTT" ? "" : (item.appKey || ""))}" placeholder="请输入 AppKey"></label>
          <label class="form-field"><span class="form-label form-required">AppSecret / Token</span><input class="form-control" type="password" data-field="appSecret" value="${attr(item.protocol === "MQTT" ? "" : (item.appSecret || ""))}" placeholder="请输入密钥"></label>
          <div class="interface-form-section">安全策略（HTTP）</div>
          <label class="form-field"><span class="form-label">传输安全 ${tipIcon(ACCESS_TIPS.https)}</span><select class="form-control" data-field="https"><option ${!item.https || item.https === "强制 HTTPS" ? "selected" : ""}>强制 HTTPS</option><option ${item.https === "HTTPS（可降级，不推荐）" ? "selected" : ""}>HTTPS（可降级，不推荐）</option></select></label>
          <label class="form-field"><span class="form-label">超时时间 ${tipIcon(ACCESS_TIPS.timeout)}</span><select class="form-control" data-field="timeout"><option ${!item.timeout || item.timeout === "10 秒" ? "selected" : ""}>10 秒</option><option ${item.timeout === "30 秒" ? "selected" : ""}>30 秒</option><option ${item.timeout === "60 秒" ? "selected" : ""}>60 秒</option></select></label>
          <label class="form-field"><span class="form-label">失败重试 ${tipIcon(ACCESS_TIPS.retry)}</span><select class="form-control" data-field="retry"><option ${!item.retry || item.retry === "3 次" ? "selected" : ""}>3 次</option><option ${item.retry === "1 次" ? "selected" : ""}>1 次</option><option ${item.retry === "不重试" ? "selected" : ""}>不重试</option></select></label>
        </div>

        <div data-protocol-panel="MQTT" class="${protocol === "MQTT" ? "" : "hidden"}">
          <div class="interface-form-section">MQTT 认证与连接</div>
          <label class="form-field"><span class="form-label form-required">端口 ${tipIcon(ACCESS_TIPS.port)}</span><input class="form-control" data-field="port" value="${attr(item.port || "8883")}" placeholder="1883 或 8883"></label>
          <label class="form-field"><span class="form-label form-required">ClientId</span><input class="form-control" data-field="clientId" value="${attr(item.clientId || "")}" placeholder="如：corridor-south-01"></label>
          <label class="form-field"><span class="form-label form-required">用户名</span><input class="form-control" data-field="mqttUser" value="${attr(item.mqttUser || "")}" placeholder="请输入 MQTT 用户名"></label>
          <label class="form-field"><span class="form-label form-required">密码</span><input class="form-control" type="password" data-field="mqttPassword" value="${attr(item.mqttPassword || "")}" placeholder="请输入 MQTT 密码"></label>
          <div class="interface-form-section">安全策略（MQTT）</div>
          <label class="form-field"><span class="form-label">传输安全 ${tipIcon(ACCESS_TIPS.mqttTls)}</span><select class="form-control" data-field="mqttTls"><option ${!item.mqttTls || item.mqttTls === "MQTTS（TLS）" ? "selected" : ""}>MQTTS（TLS）</option><option ${item.mqttTls === "MQTT（明文）" ? "selected" : ""}>MQTT（明文）</option></select></label>
          <label class="form-field"><span class="form-label">Keep Alive ${tipIcon(ACCESS_TIPS.keepAlive)}</span><select class="form-control" data-field="keepAlive"><option ${!item.keepAlive || item.keepAlive === "60 秒" ? "selected" : ""}>60 秒</option><option ${item.keepAlive === "30 秒" ? "selected" : ""}>30 秒</option><option ${item.keepAlive === "120 秒" ? "selected" : ""}>120 秒</option></select></label>
          <label class="form-field"><span class="form-label">Clean Session ${tipIcon(ACCESS_TIPS.cleanSession)}</span><select class="form-control" data-field="cleanSession"><option ${!item.cleanSession || item.cleanSession === "是" ? "selected" : ""}>是</option><option ${item.cleanSession === "否" ? "selected" : ""}>否</option></select></label>
          <label class="form-field"><span class="form-label">QoS ${tipIcon(ACCESS_TIPS.qos)}</span><select class="form-control" data-field="qos"><option ${item.qos === "0" ? "selected" : ""}>0</option><option ${!item.qos || item.qos === "1" ? "selected" : ""}>1</option><option ${item.qos === "2" ? "selected" : ""}>2</option></select></label>
          <label class="form-field"><span class="form-label">重连间隔 ${tipIcon(ACCESS_TIPS.reconnect)}</span><select class="form-control" data-field="reconnect"><option ${!item.reconnect || item.reconnect === "10 秒" ? "selected" : ""}>10 秒</option><option ${item.reconnect === "5 秒" ? "selected" : ""}>5 秒</option><option ${item.reconnect === "30 秒" ? "selected" : ""}>30 秒</option></select></label>
        </div>
      </div>
    `;
  }

  function syncAccessProtocolPanel() {
    const form = document.querySelector("[data-access-form]");
    const select = form?.querySelector('[data-field="protocol"]');
    if (!form || !select) return;
    const protocol = select.value === "MQTT" ? "MQTT" : "HTTP";
    form.dataset.protocol = protocol;
    form.querySelectorAll("[data-protocol-panel]").forEach((panel) => {
      panel.classList.toggle("hidden", panel.dataset.protocolPanel !== protocol);
    });
    const urlInput = form.querySelector("[data-url-placeholder]");
    if (urlInput) {
      urlInput.placeholder = protocol === "MQTT" ? "mqtt.modou.example.com" : "https://iot.modou.example.com";
    }
  }

  function taskForm(task = {}) {
    return `
      <div class="interface-task-form" data-task-form data-edit-id="${attr(task.id || "")}">
        <label class="form-field"><span class="form-label form-required">任务名称</span><input class="form-control" data-field="name" value="${attr(task.name || "")}" placeholder="如：环境监测实时测点"></label>
        <label class="form-field"><span class="form-label form-required">关联接入</span><select class="form-control" data-field="accessId">${accessList.map((item) => `<option value="${attr(item.id)}" ${(!task.accessId && item.id === accessList[0].id) || task.accessId === item.id ? "selected" : ""}>${esc(item.name)}</option>`).join("")}</select></label>
        <div class="form-field">
          <span class="form-label form-required">所属系统</span>
          ${multiSelectMarkup("systems", systemTypes.map((item) => item.name), draftSystems, "请选择所属系统")}
        </div>
        <div class="form-field">
          <span class="form-label form-required">设备类型</span>
          ${multiSelectMarkup("types", [], draftTypes, "请先选择所属系统", !draftSystems.length)}
        </div>
        ${scopeBlock(task.scope || "all")}
        <label class="form-field"><span class="form-label form-required">采集方式</span><select class="form-control" data-field="mode"><option ${task.mode !== "轮询" ? "selected" : ""}>实时订阅</option><option ${task.mode === "轮询" ? "selected" : ""}>轮询</option></select></label>
        <label class="form-field"><span class="form-label">采集周期</span><select class="form-control" data-field="period"><option>实时（订阅）</option><option>5 秒</option><option ${task.period === "30 秒" ? "selected" : ""}>30 秒</option><option>1 分钟</option></select></label>
        <div class="form-field">
          <span class="form-label form-required">数据主题 ${tipIcon(TOPIC_TIP)}</span>
          <div class="interface-check-group">${topicChecks(task.topics || ["实时测点"])}</div>
        </div>
        <label class="form-field"><span class="form-label form-required">启用状态</span><select class="form-control" data-field="enabled"><option value="true" ${task.enabled !== false ? "selected" : ""}>启用</option><option value="false" ${task.enabled === false ? "selected" : ""}>停用</option></select></label>
      </div>
    `;
  }

  function openDrawer(title, body, onSave) {
    if (!window.openAppDrawer) return;
    window.openAppDrawer({
      title,
      body,
      footer: `<button class="btn btn-secondary" type="button" data-drawer-close>取消</button><button class="btn btn-primary" type="button" data-south-save>保存</button>`,
    });
    document.querySelector("[data-south-save]")?.addEventListener("click", onSave);
    syncAccessProtocolPanel();
  }

  function refreshSelectedDevices() {
    const panel = document.querySelector("[data-selected-devices]");
    if (panel) panel.innerHTML = selectedDeviceTable();
  }

  function openPicker() {
    if (!draftSystems.length) {
      toast("请先选择所属系统");
      return;
    }
    pickerContext = { systems: [...draftSystems], types: [...draftTypes] };
    pickerTempIds = new Set(draftSelectedIds);
    const typeSelect = document.querySelector('[data-picker-filter="type"]');
    const typeOptions = typeOptionsForSystems(draftSystems);
    typeSelect.innerHTML = `<option value="">请选择</option>${typeOptions.map((item) => `<option value="${attr(item)}" ${draftTypes.includes(item) ? "selected" : ""}>${esc(item)}</option>`).join("")}`;
    document.querySelector('[data-picker-filter="name"]').value = "";
    document.querySelector('[data-picker-filter="code"]').value = "";
    renderPicker();
    const mask = document.getElementById("devicePickerMask");
    mask.classList.remove("hidden");
    mask.setAttribute("aria-hidden", "false");
  }

  function closePicker() {
    const mask = document.getElementById("devicePickerMask");
    mask.classList.add("hidden");
    mask.setAttribute("aria-hidden", "true");
  }

  function pickerCandidates() {
    const occupied = occupiedDeviceIds(editingTaskId);
    const name = (document.querySelector('[data-picker-filter="name"]')?.value || "").trim();
    const code = (document.querySelector('[data-picker-filter="code"]')?.value || "").trim();
    const type = document.querySelector('[data-picker-filter="type"]')?.value || "";
    return sourceDevices.filter((device) => {
      if (pickerContext.systems.length && !pickerContext.systems.includes(device.system)) return false;
      if (pickerContext.types.length && !pickerContext.types.includes(device.type)) return false;
      if (type && device.type !== type) return false;
      if (name && !device.name.includes(name)) return false;
      if (code && !device.code.includes(code)) return false;
      return true;
    }).map((device) => ({ ...device, occupied: occupied.has(device.id) }));
  }

  function renderPicker() {
    const list = pickerCandidates();
    const body = document.getElementById("pickerTableBody");
    body.innerHTML = list.length ? list.map((device) => `
      <tr class="${device.occupied ? "is-disabled" : ""}">
        <td class="check-cell">
          <input type="checkbox" data-picker-check="${attr(device.id)}" ${pickerTempIds.has(device.id) ? "checked" : ""} ${device.occupied ? "disabled" : ""} aria-label="选择${attr(device.name)}">
        </td>
        <td>${esc(device.name)}${device.occupied ? '<small class="interface-occupied">已被其他任务占用</small>' : ""}</td>
        <td>${esc(device.code)}</td>
        <td>${esc(device.system)}</td>
        <td>${esc(device.type)}</td>
        <td>${esc(device.project)}</td>
        <td>${esc(device.corridor)}</td>
        <td>${esc(device.room)}</td>
      </tr>
    `).join("") : '<tr><td class="empty-cell" colspan="8">暂无符合条件的设备</td></tr>';
    const selectable = list.filter((item) => !item.occupied);
    document.querySelector("[data-picker-select-all]").checked = selectable.length > 0 && selectable.every((item) => pickerTempIds.has(item.id));
    document.querySelector("[data-picker-count]").textContent = `共 ${list.length} 条记录，已选 ${pickerTempIds.size} 条`;
  }

  function readAccessForm() {
    const root = document.querySelector(".drawer-body") || document;
    const protocol = root.querySelector('[data-field="protocol"]')?.value === "MQTT" ? "MQTT" : "HTTP";
    const base = {
      name: root.querySelector('[data-field="name"]')?.value?.trim() || "",
      url: root.querySelector('[data-field="url"]')?.value?.trim() || "",
      protocol,
      tenant: root.querySelector('[data-field="tenant"]')?.value || "",
      enabled: root.querySelector('[data-field="enabled"]')?.value !== "false",
    };
    if (protocol === "MQTT") {
      return {
        ...base,
        auth: "用户名密码",
        port: root.querySelector('[data-field="port"]')?.value?.trim() || "8883",
        clientId: root.querySelector('[data-field="clientId"]')?.value?.trim() || "",
        mqttUser: root.querySelector('[data-field="mqttUser"]')?.value?.trim() || "",
        mqttPassword: root.querySelector('[data-field="mqttPassword"]')?.value?.trim() || "",
        mqttTls: root.querySelector('[data-field="mqttTls"]')?.value || "MQTTS（TLS）",
        keepAlive: root.querySelector('[data-field="keepAlive"]')?.value || "60 秒",
        cleanSession: root.querySelector('[data-field="cleanSession"]')?.value || "是",
        qos: root.querySelector('[data-field="qos"]')?.value || "1",
        reconnect: root.querySelector('[data-field="reconnect"]')?.value || "10 秒",
        appKey: "",
        appSecret: "",
        https: "",
        timeout: "",
        retry: "",
      };
    }
    return {
      ...base,
      auth: root.querySelector('[data-field="auth"]')?.value || "AK / SK",
      appKey: root.querySelector('[data-field="appKey"]')?.value?.trim() || "",
      appSecret: root.querySelector('[data-field="appSecret"]')?.value?.trim() || "",
      https: root.querySelector('[data-field="https"]')?.value || "强制 HTTPS",
      timeout: root.querySelector('[data-field="timeout"]')?.value || "10 秒",
      retry: root.querySelector('[data-field="retry"]')?.value || "3 次",
      port: "",
      clientId: "",
      mqttUser: "",
      mqttPassword: "",
      mqttTls: "",
      keepAlive: "",
      cleanSession: "",
      qos: "",
      reconnect: "",
    };
  }

  function saveAccess(editId) {
    const data = readAccessForm();
    if (!data.name || !data.url) {
      toast("请完善接入必填项");
      return;
    }
    if (data.protocol === "MQTT") {
      if (!data.port || !data.clientId || !data.mqttUser || !data.mqttPassword) {
        toast("请完善 MQTT 必填项：端口、ClientId、用户名、密码");
        return;
      }
    } else if (!data.appKey || !data.appSecret) {
      toast("请完善 HTTP 必填项：AppKey、AppSecret");
      return;
    }
    if (editId) {
      const target = accessList.find((item) => item.id === editId);
      Object.assign(target, data);
    } else {
      accessList.unshift({
        ...data,
        id: `ACC-MD-${String(Date.now()).slice(-2)}`,
        linkStatus: "正常",
        heartbeat: formatDateTime(),
      });
    }
    renderAccess();
    window.closeAppDrawer?.();
    toast("接入配置已保存");
  }

  function saveTask() {
    const form = document.querySelector("[data-task-form]");
    if (!form) return;
    const name = form.querySelector('[data-field="name"]')?.value?.trim();
    const topics = [...form.querySelectorAll('[data-field="topics"]:checked')].map((node) => node.value);
    const scope = form.querySelector('input[name="scope"]:checked')?.value || "all";
    if (!name || !draftSystems.length || !draftTypes.length || !topics.length) {
      toast("请完善必填项：任务名称、所属系统、设备类型、数据主题");
      return;
    }
    if (scope === "list" && !draftSelectedIds.length) {
      toast("按设备 ID 列表时请至少选择一台设备");
      return;
    }
    const accessId = form.querySelector('[data-field="accessId"]')?.value;
    const access = accessList.find((item) => item.id === accessId) || accessList[0];
    const now = formatDateTime();
    const payload = {
      id: editingTaskId || `S-${String(Date.now()).slice(-5)}`,
      name,
      accessId: access.id,
      accessName: access.name,
      systems: [...draftSystems],
      types: [...draftTypes],
      scope,
      deviceIds: scope === "list" ? [...draftSelectedIds] : [],
      mode: form.querySelector('[data-field="mode"]')?.value || "实时订阅",
      period: form.querySelector('[data-field="period"]')?.value || "实时（订阅）",
      topics,
      enabled: form.querySelector('[data-field="enabled"]')?.value !== "false",
      lastRunAt: now.replace(" ", "T"),
      lastRunText: `${now} · 待执行`,
    };
    if (editingTaskId) {
      tasks = tasks.map((item) => (item.id === editingTaskId ? { ...item, ...payload, id: editingTaskId } : item));
      if (!taskLogs[editingTaskId]) taskLogs[editingTaskId] = [];
    } else {
      tasks.unshift(payload);
      taskLogs[payload.id] = [];
    }
    editingTaskId = null;
    draftSelectedIds = [];
    selectedPage = 1;
    applyTaskFilter();
    window.closeAppDrawer?.();
    toast("采集任务已保存");
  }

  function openTaskDrawer(task) {
    editingTaskId = task?.id || null;
    draftSelectedIds = [...(task?.deviceIds || [])];
    selectedPage = 1;
    draftSystems = [...(task?.systems || [])];
    draftTypes = [...(task?.types || [])];
    openDrawer(task ? "编辑采集任务" : "新建采集任务", taskForm(task || {}), saveTask);
    syncMultiSelects();
  }

  function showAccessDetail(item) {
    const isMqtt = item.protocol === "MQTT";
    const authBlock = isMqtt
      ? `
            <div class="info-item"><span class="info-label">端口</span><span class="info-value">${esc(item.port || "--")}</span></div>
            <div class="info-item"><span class="info-label">ClientId</span><span class="info-value">${esc(item.clientId || "--")}</span></div>
            <div class="info-item"><span class="info-label">用户名</span><span class="info-value">${esc(item.mqttUser || "--")}</span></div>
            <div class="info-item"><span class="info-label">密码</span><span class="info-value">${esc(item.mqttPassword || "--")}</span></div>
          `
      : `
            <div class="info-item"><span class="info-label">AppKey / ClientId</span><span class="info-value">${esc(item.appKey || "--")}</span></div>
            <div class="info-item"><span class="info-label">AppSecret / Token</span><span class="info-value">${esc(item.appSecret || "--")}</span></div>
          `;
    const securityBlock = isMqtt
      ? `
            <div class="info-item"><span class="info-label">传输安全</span><span class="info-value">${esc(item.mqttTls || "--")}</span></div>
            <div class="info-item"><span class="info-label">Keep Alive</span><span class="info-value">${esc(item.keepAlive || "--")}</span></div>
            <div class="info-item"><span class="info-label">Clean Session</span><span class="info-value">${esc(item.cleanSession || "--")}</span></div>
            <div class="info-item"><span class="info-label">QoS</span><span class="info-value">${esc(item.qos || "--")}</span></div>
            <div class="info-item"><span class="info-label">重连间隔</span><span class="info-value">${esc(item.reconnect || "--")}</span></div>
          `
      : `
            <div class="info-item"><span class="info-label">传输安全</span><span class="info-value">${esc(item.https || "--")}</span></div>
            <div class="info-item"><span class="info-label">超时时间</span><span class="info-value">${esc(item.timeout || "--")}</span></div>
            <div class="info-item"><span class="info-label">失败重试</span><span class="info-value">${esc(item.retry || "--")}</span></div>
          `;
    window.openAppDrawer?.({
      title: `${item.name} · 接入详情`,
      body: `
        <section class="detail-section">
          <h3 class="detail-title">基本信息</h3>
          <div class="detail-grid">
            <div class="info-item"><span class="info-label">接入名称</span><span class="info-value">${esc(item.name)}</span></div>
            <div class="info-item"><span class="info-label">平台地址</span><span class="info-value">${esc(item.url)}</span></div>
            <div class="info-item"><span class="info-label">接入协议</span><span class="info-value">${esc(item.protocol || "HTTP")}</span></div>
            <div class="info-item"><span class="info-label">认证方式</span><span class="info-value">${esc(item.auth)}</span></div>
            ${authBlock}
            <div class="info-item"><span class="info-label">默认租户 / 项目</span><span class="info-value">${esc(item.tenant || "--")}</span></div>
            <div class="info-item"><span class="info-label">状态</span><span class="info-value">${item.enabled ? "启用" : "停用"}</span></div>
            <div class="info-item"><span class="info-label">连通状态</span><span class="info-value">${esc(item.linkStatus)}</span></div>
            <div class="info-item"><span class="info-label">最近心跳</span><span class="info-value">${esc(item.heartbeat)}</span></div>
          </div>
        </section>
        <section class="detail-section">
          <h3 class="detail-title">安全策略</h3>
          <div class="detail-grid">${securityBlock}</div>
        </section>
      `,
      footer: `<button class="btn btn-secondary" type="button" data-drawer-close>关闭</button>`,
    });
  }

  function showTestResult(access) {
    const ok = Math.random() > 0.25;
    const now = formatDateTime();
    const isMqtt = access.protocol === "MQTT";
    const endpoint = isMqtt ? `${access.url}:${access.port || "1883"}` : access.url;
    const logs = isMqtt
      ? (ok
        ? [
            `[${now}] 开始连接 MQTT Broker ${endpoint}`,
            `[${now}] ${access.mqttTls || "MQTT"} 握手成功`,
            `[${now}] ClientId=${access.clientId || "--"} 用户名密码校验通过`,
            `[${now}] Keep Alive ${access.keepAlive || "60 秒"} · QoS ${access.qos || "1"}`,
            `[${now}] 订阅通道就绪，连接测试成功`,
          ]
        : [
            `[${now}] 开始连接 MQTT Broker ${endpoint}`,
            `[${now}] 等待 CONNACK 超时（Keep Alive ${access.keepAlive || "60 秒"}）`,
            `[${now}] 将在 ${access.reconnect || "10 秒"} 后尝试重连`,
            `[${now}] 连接测试失败：Broker 不可达或鉴权失败`,
          ])
      : (ok
        ? [
            `[${now}] 开始连接 ${endpoint}`,
            `[${now}] TLS 握手成功（${access.https}）`,
            `[${now}] 认证方式 ${access.auth} 校验通过`,
            `[${now}] 心跳延迟 86 ms`,
            `[${now}] 连接测试成功`,
          ]
        : [
            `[${now}] 开始连接 ${endpoint}`,
            `[${now}] 等待响应超时（${access.timeout}）`,
            `[${now}] 按策略重试 ${access.retry}`,
            `[${now}] 连接测试失败：无法建立安全通道`,
          ]);
    access.linkStatus = ok ? "正常" : "异常";
    access.heartbeat = now;
    renderAccess();
    window.openAppDrawer?.({
      title: `连接测试结果 · ${access.name}`,
      body: `
        <section class="detail-section">
          <h3 class="detail-title">测试结果</h3>
          <p><span class="device-status ${ok ? "good" : "warn"}">${ok ? "成功" : "失败"}</span></p>
        </section>
        <section class="detail-section">
          <h3 class="detail-title">测试日志</h3>
          <pre class="interface-log-pre">${esc(logs.join("\n"))}</pre>
        </section>
      `,
      footer: `<button class="btn btn-secondary" type="button" data-drawer-close>关闭</button>`,
    });
  }

  function normalizeDateTime(value) {
    return String(value || "").replace("T", " ").slice(0, 19);
  }

  function filterSouthLogs(rows) {
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

  function renderSouthLogRows(rows) {
    const body = document.getElementById("southLogBody");
    if (!body) return;
    const list = filterSouthLogs(rows);
    body.innerHTML = list.length ? list.map((row) => {
      const systemText = (row.systems || []).join("、");
      const typeText = (row.types || []).join("、");
      return `
        <tr>
          <td>${esc(row.startAt)}</td>
          <td>${esc(row.endAt)}</td>
          <td><span class="interface-ellipsis" title="${attr(systemText)}">${esc(systemText)}</span></td>
          <td><span class="interface-ellipsis" title="${attr(typeText)}">${esc(typeText)}</span></td>
          <td><span class="log-level ${row.result === "成功" ? "success" : row.result === "重试" ? "warn" : "error"}">${esc(row.result)}</span></td>
          <td>${esc(row.summary)}</td>
          <td>${esc(row.duration)}</td>
        </tr>
      `;
    }).join("") : '<tr><td class="empty-cell" colspan="7">暂无采集日志</td></tr>';
  }

  function showTaskLogs(task) {
    logTaskId = task.id;
    const rows = taskLogs[task.id] || [];
    window.openAppDrawer?.({
      title: `采集日志 · ${task.name}`,
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
            <button class="btn btn-secondary" type="button" data-south-action="log-reset">重置</button>
            <button class="btn btn-primary" type="button" data-south-action="log-search">搜索</button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="table interface-log-table">
            <thead>
              <tr>
                <th>执行开始时间</th>
                <th>执行结束时间</th>
                <th>所属系统</th>
                <th>设备类型</th>
                <th>结果</th>
                <th>数据摘要</th>
                <th>耗时</th>
              </tr>
            </thead>
            <tbody id="southLogBody"></tbody>
          </table>
        </div>
      `,
      footer: `<button class="btn btn-secondary" type="button" data-drawer-close>关闭</button>`,
    });
    renderSouthLogRows(rows);
  }

  document.addEventListener("mouseover", (event) => {
    const tip = event.target.closest(".interface-tip[data-tip]");
    if (tip) placeTipFloat(tip);
  });
  document.addEventListener("mouseout", (event) => {
    const tip = event.target.closest(".interface-tip[data-tip]");
    if (!tip) return;
    const related = event.relatedTarget;
    if (related && tip.contains(related)) return;
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
    if (multiOption) {
      const key = multiOption.dataset.multiOption;
      const value = multiOption.dataset.value;
      const list = key === "systems" ? draftSystems : draftTypes;
      const index = list.indexOf(value);
      if (index >= 0) list.splice(index, 1);
      else list.push(value);
      if (key === "systems") {
        draftSelectedIds = [];
        selectedPage = 1;
        refreshSelectedDevices();
      }
      syncMultiSelects();
      return;
    }

    const tagRemove = event.target.closest("[data-tag-remove]");
    if (tagRemove) {
      event.stopPropagation();
      const key = tagRemove.dataset.tagRemove;
      const value = tagRemove.dataset.value;
      if (key === "systems") {
        draftSystems = draftSystems.filter((item) => item !== value);
        draftSelectedIds = [];
        selectedPage = 1;
        refreshSelectedDevices();
      } else {
        draftTypes = draftTypes.filter((item) => item !== value);
      }
      syncMultiSelects();
      return;
    }

    if (!event.target.closest(".interface-multi-select")) {
      document.querySelectorAll(".interface-multi-select.open").forEach((node) => node.classList.remove("open"));
    }

    const actionNode = event.target.closest("[data-south-action]");
    if (!actionNode) {
      const check = event.target.closest("[data-picker-check]");
      if (check && !check.disabled) {
        if (check.checked) pickerTempIds.add(check.dataset.pickerCheck);
        else pickerTempIds.delete(check.dataset.pickerCheck);
        renderPicker();
      }
      return;
    }

    const action = actionNode.dataset.southAction;
    const id = actionNode.dataset.id;

    if (action === "access-create") {
      openDrawer("新增接入（墨斗平台）", accessForm(), () => saveAccess(null));
      return;
    }
    if (action === "access-edit") {
      const item = accessList.find((entry) => entry.id === id);
      openDrawer("编辑接入（墨斗平台）", accessForm(item), () => saveAccess(id));
      return;
    }
    if (action === "access-detail") {
      showAccessDetail(accessList.find((entry) => entry.id === id));
      return;
    }
    if (action === "access-test") {
      showTestResult(accessList.find((entry) => entry.id === id));
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
    if (action === "task-delete") {
      window.openAppConfirm?.({
        title: "删除采集任务",
        message: "确认删除该采集任务吗？删除后不可恢复。",
        confirmText: "删除",
        onConfirm: () => {
          tasks = tasks.filter((item) => item.id !== id);
          delete taskLogs[id];
          applyTaskFilter();
          toast("采集任务已删除");
        },
      });
      return;
    }
    if (action === "task-logs") {
      showTaskLogs(tasks.find((item) => item.id === id));
      return;
    }
    if (action === "log-search") {
      renderSouthLogRows(taskLogs[logTaskId] || []);
      return;
    }
    if (action === "log-reset") {
      document.querySelectorAll("[data-log-filter]").forEach((field) => { field.value = ""; });
      renderSouthLogRows(taskLogs[logTaskId] || []);
      return;
    }
    if (action === "task-toggle") {
      tasks = tasks.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item));
      applyTaskFilter();
      toast(tasks.find((item) => item.id === id)?.enabled ? "任务已启用" : "任务已停用");
      return;
    }
    if (action === "task-search") {
      applyTaskFilter();
      return;
    }
    if (action === "task-reset") {
      document.querySelectorAll("[data-task-filter]").forEach((field) => { field.value = ""; });
      filteredTasks = [...tasks];
      renderTasks();
      return;
    }
    if (action === "open-picker") {
      openPicker();
      return;
    }
    if (action === "picker-close") {
      closePicker();
      return;
    }
    if (action === "picker-search") {
      renderPicker();
      return;
    }
    if (action === "picker-reset") {
      document.querySelector('[data-picker-filter="name"]').value = "";
      document.querySelector('[data-picker-filter="code"]').value = "";
      document.querySelector('[data-picker-filter="type"]').value = "";
      renderPicker();
      return;
    }
    if (action === "picker-confirm") {
      draftSelectedIds = [...pickerTempIds];
      selectedPage = 1;
      refreshSelectedDevices();
      closePicker();
      toast(`已选择 ${draftSelectedIds.length} 台设备`);
      return;
    }
    if (action === "remove-chip") {
      draftSelectedIds = draftSelectedIds.filter((item) => item !== id);
      refreshSelectedDevices();
      return;
    }
    if (action === "selected-page") {
      if (actionNode.classList.contains("disabled")) return;
      const page = Number(actionNode.dataset.page);
      if (!page || page < 1) return;
      selectedPage = page;
      refreshSelectedDevices();
    }
  });

  document.addEventListener("change", (event) => {
    if (event.target.matches('[data-field="protocol"]')) {
      syncAccessProtocolPanel();
      return;
    }
    if (event.target.matches('input[name="scope"]')) {
      const panel = document.querySelector("[data-scope-panel]");
      if (!panel) return;
      const isList = event.target.value === "list";
      panel.classList.toggle("hidden", !isList);
      if (!isList) {
        draftSelectedIds = [];
        selectedPage = 1;
        refreshSelectedDevices();
      } else {
        openPicker();
      }
      return;
    }
    if (event.target.matches("[data-picker-select-all]")) {
      const list = pickerCandidates().filter((item) => !item.occupied);
      if (event.target.checked) list.forEach((item) => pickerTempIds.add(item.id));
      else list.forEach((item) => pickerTempIds.delete(item.id));
      renderPicker();
    }
  });

  renderAccess();
  renderTasks();
})();
