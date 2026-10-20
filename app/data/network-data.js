(function (global) {
  const RULE_KEY = "network.alarm-rules";

  const devices = [
    { id: "RT-01", name: "核心路由器 RT-01", ip: "192.168.110.1", type: "路由器", zone: "中心机房", status: "normal", traffic: "18.6 Gbps", latencyMs: 8, loss: "0.01%", cpu: 22, updatedAt: "2026-10-15 10:21:08",
      ports: [{ name: "Gi0/0", status: "up", speed: "10G" }, { name: "Gi0/1", status: "up", speed: "10G" }] },
    { id: "SW-12", name: "汇聚交换机 SW-12", ip: "192.168.110.12", type: "交换机", zone: "中心机房", status: "normal", traffic: "9.8 Gbps", latencyMs: 12, loss: "0.03%", cpu: 31, updatedAt: "2026-10-15 10:20:55",
      ports: [{ name: "Gi1/0/1", status: "up", speed: "1G" }, { name: "Gi1/0/24", status: "down", speed: "1G" }] },
    { id: "APP-03", name: "应用服务器 APP-03", ip: "192.168.110.18", type: "服务器", zone: "中心机房", status: "warn", traffic: "6.2 Gbps", latencyMs: 24, loss: "0.18%", cpu: 78, updatedAt: "2026-10-15 10:20:41",
      ports: [{ name: "eth0", status: "up", speed: "10G" }] },
    { id: "AP-07", name: "无线接入点 AP-07", ip: "192.168.110.47", type: "无线接入点", zone: "运维值班室", status: "offline", traffic: "0 Gbps", latencyMs: 0, loss: "-", cpu: 0, updatedAt: "2026-10-15 09:58:12",
      ports: [{ name: "wlan0", status: "down", speed: "1G" }] },
    { id: "SW-21", name: "接入交换机 SW-21", ip: "192.168.110.21", type: "交换机", zone: "中心机房", status: "normal", traffic: "4.1 Gbps", latencyMs: 15, loss: "0.02%", cpu: 28, updatedAt: "2026-10-15 10:19:33",
      ports: [{ name: "Gi0/1", status: "up", speed: "1G" }] },
    { id: "SRV-DB", name: "数据库服务器 DB-01", ip: "192.168.110.30", type: "服务器", zone: "中心机房", status: "normal", traffic: "3.2 Gbps", latencyMs: 10, loss: "0.01%", cpu: 45, updatedAt: "2026-10-15 10:18:07",
      ports: [{ name: "eth0", status: "up", speed: "10G" }] },
    { id: "SRV-BK", name: "备份服务器 BK-01", ip: "192.168.110.31", type: "服务器", zone: "中心机房", status: "warn", traffic: "1.1 Gbps", latencyMs: 18, loss: "0.05%", cpu: 62, updatedAt: "2026-10-15 10:17:44",
      ports: [{ name: "eth0", status: "up", speed: "10G" }] },
    { id: "GW-01", name: "管理网关 GW-01", ip: "192.168.110.2", type: "路由器", zone: "中心机房", status: "normal", traffic: "2.4 Gbps", latencyMs: 9, loss: "0.01%", cpu: 19, updatedAt: "2026-10-15 10:16:20",
      ports: [{ name: "Gi0/0", status: "up", speed: "1G" }] },
    { id: "ST-01", name: "存储阵列 ST-01", ip: "192.168.110.40", type: "服务器", zone: "中心机房", status: "normal", traffic: "5.5 Gbps", latencyMs: 11, loss: "0.02%", cpu: 33, updatedAt: "2026-10-15 10:15:02",
      ports: [{ name: "bond0", status: "up", speed: "10G" }] },
    { id: "AP-08", name: "无线接入点 AP-08", ip: "192.168.110.48", type: "无线接入点", zone: "运维值班室", status: "normal", traffic: "0.6 Gbps", latencyMs: 14, loss: "0.04%", cpu: 21, updatedAt: "2026-10-15 10:14:18",
      ports: [{ name: "wlan0", status: "up", speed: "1G" }] },
    { id: "RT-02", name: "边界路由器 RT-02", ip: "192.168.110.3", type: "路由器", zone: "中心机房", status: "normal", traffic: "12.0 Gbps", latencyMs: 7, loss: "0.01%", cpu: 26, updatedAt: "2026-10-15 10:13:51",
      ports: [{ name: "Gi0/0", status: "up", speed: "10G" }] },
    { id: "SW-30", name: "汇聚交换机 SW-30", ip: "192.168.110.30", type: "交换机", zone: "运维值班室", status: "offline", traffic: "0 Gbps", latencyMs: 0, loss: "-", cpu: 0, updatedAt: "2026-10-15 09:40:06",
      ports: [{ name: "Gi1/0/1", status: "down", speed: "1G" }] },
  ];

  const host = {
    cpu: { cores: 20, total: 20, usage: 35, idle: 65 },
    memory: { total: "31.84GB", used: "23.71GB", free: "8.13GB", usage: 75 },
    server: { name: "SC-202507241642", ip: "192.168.110.18:29001", os: "Microsoft Windows 10.0.19045", arch: "X64" },
    app: {
      env: "Development", version: ".NET 8.0.30", startedAt: "2026-09-02 14:53:18", uptime: "00 天 01 小时 04 分 29 秒",
      installPath: "E:\\project\\kcpt\\rg.cscec4.cfibms.business.rearend\\Rg.Abp.Net8\\src\\Rg.Abp.Web",
      projectPath: "E:\\project\\kcpt\\rg.cscec4.cfibms.business.rearend\\Rg.Abp.Net8\\src\\Rg.Abp.Web\\wwwroot",
      args: "Development",
    },
    disks: [
      { path: "C:\\", type: "Fixed", total: "341 GB", free: "32 GB", used: "309 GB", usage: 91 },
      { path: "D:\\", type: "Fixed", total: "199 GB", free: "121 GB", used: "78 GB", usage: 40 },
      { path: "E:\\", type: "Fixed", total: "390 GB", free: "27 GB", used: "363 GB", usage: 94 },
    ],
    cpuTrend: [28, 30, 32, 29, 35, 33, 35],
    memTrend: [68, 70, 72, 71, 74, 75, 75],
  };

  const defaultRules = [
    { id: "R-CPU", name: "主机 CPU 过载", metric: "cpu", operator: "大于等于", threshold: "85%", level: "预警", filter: "periodic", period: 60, methods: ["站内信"], emailTo: "", departments: ["equipment"], people: ["zhao", "chen"], notify: ["站内信"], enabled: true, description: "主机 CPU 使用率超过 85% 触发预警。" },
    { id: "R-MEM", name: "主机内存过高", metric: "memory", operator: "大于等于", threshold: "80%", level: "预警", filter: "periodic", period: 60, methods: ["站内信", "邮件"], emailTo: "zhao@example.com", departments: ["equipment"], people: ["zhao"], notify: ["站内信", "邮件"], enabled: true, description: "主机内存使用率超过 80% 触发预警。" },
    { id: "R-DISK", name: "磁盘将满", metric: "disk", operator: "大于等于", threshold: "90%", level: "告警", filter: "periodic", period: 30, methods: ["邮件"], emailTo: "zhao@example.com; liu@example.com", departments: ["equipment", "safety"], people: ["zhao", "liu"], notify: ["邮件"], enabled: true, description: "任一磁盘使用率超过 90% 触发告警。" },
    { id: "R-LAT", name: "链路延迟过高", metric: "latency", operator: "大于等于", threshold: "50ms", level: "提醒", filter: "periodic", period: 60, methods: ["站内信"], emailTo: "", departments: ["project"], people: ["li"], notify: ["站内信"], enabled: true, description: "链路平均延迟超过 50ms 触发提醒。" },
    { id: "R-OFF", name: "设备离线", metric: "offline", operator: "等于", threshold: "离线", level: "告警", filter: "periodic", period: 15, methods: ["站内信", "邮件"], emailTo: "chen@example.com; sun@example.com", departments: ["equipment", "safety"], people: ["chen", "sun"], notify: ["站内信", "邮件"], enabled: true, description: "设备心跳超时 5 分钟判定离线。" },
  ];

  // 含原故障诊断事件，统一进入告警事件列表（状态仅：未处理 / 已处理）
  const alarmEvents = [
    {
      id: "A-001", time: "2026-10-12 10:21:08", object: "应用服务器 APP-03", objectCode: "APP-03", type: "性能阈值",
      metric: "延迟", value: "24 ms", threshold: "≥20 ms", level: "提醒",
      message: "链路延迟 24 ms，超过阈值 ≥20 ms", status: "未处理",
      history: [{ time: "2026-10-12 10:21:08", operator: "系统", action: "创建告警" }],
    },
    {
      id: "A-002", time: "2026-10-12 09:58:41", object: "服务主机 E:\\", objectCode: "HOST-E", type: "性能阈值",
      metric: "磁盘", value: "94%", threshold: "≥90%", level: "告警",
      message: "磁盘使用率 94%，超过阈值 ≥90%", status: "未处理",
      history: [{ time: "2026-10-12 09:58:41", operator: "系统", action: "创建告警" }],
    },
    {
      id: "A-003", time: "2026-10-12 09:12:03", object: "无线接入点 AP-07", objectCode: "AP-07", type: "设备离线",
      metric: "离线", value: "离线", threshold: "心跳超时", level: "告警",
      message: "设备心跳超时，判定离线", status: "已处理",
      processedBy: "运维乙", processedAt: "2026-10-12 09:40:18", processRemark: "现场重启接入点后恢复。",
      history: [
        { time: "2026-10-12 09:12:03", operator: "系统", action: "创建告警" },
        { time: "2026-10-12 09:40:18", operator: "运维乙", action: "现场重启接入点后恢复。" },
      ],
    },
    {
      id: "A-004", time: "2026-10-12 09:12:00", object: "无线接入点 AP-07", objectCode: "AP-07", type: "故障检测",
      metric: "设备宕机", value: "宕机", threshold: "链路中断", level: "告警",
      message: "汇聚 SW-12 Gi1/0/24 down → AP 链路中断", status: "未处理",
      rootHint: "汇聚 SW-12 Gi1/0/24 down → AP 链路中断", suggest: "检查接入交换机端口并重启端口",
      history: [{ time: "2026-10-12 09:12:00", operator: "系统", action: "创建告警" }],
    },
    {
      id: "A-005", time: "2026-10-12 09:58:00", object: "服务主机 E:\\", objectCode: "HOST-E", type: "故障检测",
      metric: "主机资源耗尽", value: "磁盘 94%", threshold: "≥90%", level: "告警",
      message: "磁盘 94% 触发阈值，应用日志目录膨胀", status: "已处理",
      closedBy: "运维甲", closedAt: "2026-10-12 10:20:00", closeReason: "日志目录已清理，磁盘使用率回落",
      rootHint: "磁盘 94% 触发阈值，应用日志目录膨胀", suggest: "清理日志或扩容磁盘",
      history: [
        { time: "2026-10-12 09:58:00", operator: "系统", action: "创建告警" },
        { time: "2026-10-12 10:20:00", operator: "运维甲", action: "关闭告警：日志目录已清理，磁盘使用率回落" },
      ],
    },
  ];

  // 星型拓扑：核心交换机居中，周围节点（对齐参考图内容，浅色页渲染）
  const topoNodes = [
    { id: "core", name: "核心交换机", role: "核心", icon: "fa-network-wired", status: "online", statusText: "在线", x: 420, y: 260 },
    { id: "app", name: "应用服务器集群", role: "主机", icon: "fa-server", status: "online", statusText: "在线", x: 420, y: 70 },
    { id: "db", name: "数据库服务器", role: "主机", icon: "fa-database", status: "online", statusText: "在线", x: 140, y: 260 },
    { id: "gw", name: "管理网关", role: "接入", icon: "fa-shield-halved", status: "warn", statusText: "在线", x: 200, y: 420 },
    { id: "bk", name: "备份服务器", role: "主机", icon: "fa-hard-drive", status: "warn", statusText: "告警", x: 420, y: 450 },
    { id: "st", name: "存储阵列", role: "主机", icon: "fa-table-cells", status: "online", statusText: "在线", x: 700, y: 260 },
  ];
  const topoLinks = [
    ["core", "app", "good"],
    ["core", "db", "good"],
    ["core", "gw", "warn"],
    ["core", "bk", "warn"],
    ["core", "st", "good"],
  ];

  const configBackups = [
    { id: "CFG-001", deviceId: "RT-01", deviceName: "核心路由器 RT-01", deviceIp: "192.168.110.1", version: "v1.2.0", backedAt: "2026-10-10 18:20", operator: "运维甲", size: "86 KB", remark: "日常自动备份", hostname: "RT-01", mgmtIp: "192.168.110.1", vlan: "VLAN10", uplink: "Gi0/0 10G", checksum: "a3f9c2" },
    { id: "CFG-002", deviceId: "SW-12", deviceName: "汇聚交换机 SW-12", deviceIp: "192.168.110.12", version: "v3.1.4", backedAt: "2026-10-09 11:05", operator: "运维乙", size: "64 KB", remark: "变更前备份", hostname: "SW-12", mgmtIp: "192.168.110.12", vlan: "VLAN20", uplink: "Gi1/0/1 1G", checksum: "b71e04" },
    { id: "CFG-003", deviceId: "APP-03", deviceName: "应用服务器 APP-03", deviceIp: "192.168.110.18", version: "v2.0.1", backedAt: "2026-10-08 16:40", operator: "运维甲", size: "120 KB", remark: "应用发布前", hostname: "APP-03", mgmtIp: "192.168.110.18", vlan: "VLAN30", uplink: "eth0 10G", checksum: "c decl8a" },
    { id: "CFG-004", deviceId: "GW-01", deviceName: "管理网关 GW-01", deviceIp: "192.168.110.2", version: "v1.0.8", backedAt: "2026-10-07 09:15", operator: "运维丙", size: "42 KB", remark: "策略调整前", hostname: "GW-01", mgmtIp: "192.168.110.2", vlan: "VLAN1", uplink: "Gi0/0 1G", checksum: "d4ab11" },
    { id: "CFG-005", deviceId: "SW-21", deviceName: "接入交换机 SW-21", deviceIp: "192.168.110.21", version: "v2.3.0", backedAt: "2026-10-06 14:22", operator: "运维乙", size: "55 KB", remark: "日常自动备份", hostname: "SW-21", mgmtIp: "192.168.110.21", vlan: "VLAN40", uplink: "Gi0/1 1G", checksum: "e902ff" },
    { id: "CFG-006", deviceId: "RT-02", deviceName: "边界路由器 RT-02", deviceIp: "192.168.110.3", version: "v1.5.2", backedAt: "2026-10-05 20:08", operator: "运维甲", size: "91 KB", remark: "路由表变更前", hostname: "RT-02", mgmtIp: "192.168.110.3", vlan: "VLAN10", uplink: "Gi0/0 10G", checksum: "f11c0d" },
    { id: "CFG-007", deviceId: "ST-01", deviceName: "存储阵列 ST-01", deviceIp: "192.168.110.40", version: "v4.0.0", backedAt: "2026-10-04 10:33", operator: "运维丙", size: "38 KB", remark: "固件升级前", hostname: "ST-01", mgmtIp: "192.168.110.40", vlan: "VLAN50", uplink: "bond0 10G", checksum: "12abef" },
    { id: "CFG-008", deviceId: "SW-12", deviceName: "汇聚交换机 SW-12", deviceIp: "192.168.110.12", version: "v3.1.3", backedAt: "2026-10-03 08:50", operator: "运维乙", size: "63 KB", remark: "历史版本", hostname: "SW-12", mgmtIp: "192.168.110.12", vlan: "VLAN20", uplink: "Gi1/0/1 1G", checksum: "3344aa" },
    { id: "CFG-009", deviceId: "RT-01", deviceName: "核心路由器 RT-01", deviceIp: "192.168.110.1", version: "v1.1.9", backedAt: "2026-10-02 19:12", operator: "运维甲", size: "85 KB", remark: "历史版本", hostname: "RT-01", mgmtIp: "192.168.110.1", vlan: "VLAN10", uplink: "Gi0/0 10G", checksum: "998877" },
    { id: "CFG-010", deviceId: "GW-01", deviceName: "管理网关 GW-01", deviceIp: "192.168.110.2", version: "v1.0.7", backedAt: "2026-10-01 11:40", operator: "运维丙", size: "41 KB", remark: "历史版本", hostname: "GW-01", mgmtIp: "192.168.110.2", vlan: "VLAN1", uplink: "Gi0/0 1G", checksum: "55ccdd" },
    { id: "CFG-011", deviceId: "APP-03", deviceName: "应用服务器 APP-03", deviceIp: "192.168.110.18", version: "v2.0.0", backedAt: "2026-09-30 15:05", operator: "运维甲", size: "118 KB", remark: "历史版本", hostname: "APP-03", mgmtIp: "192.168.110.18", vlan: "VLAN30", uplink: "eth0 10G", checksum: "77ee01" },
  ];
  // fix typo in CFG-003 checksum
  configBackups[2].checksum = "c8de8a";

  const configSyncLogs = [
    { id: "SYNC-20261010-01", type: "自动同步", scope: "全部设备", result: "成功", success: 11, failed: 0, startAt: "2026-10-10 18:00", endAt: "2026-10-10 18:08", operator: "系统" },
    { id: "SYNC-20261009-02", type: "手动同步", scope: "汇聚交换机 SW-12", result: "成功", success: 1, failed: 0, startAt: "2026-10-09 11:00", endAt: "2026-10-09 11:03", operator: "运维乙" },
    { id: "SYNC-20261008-01", type: "自动同步", scope: "全部设备", result: "部分失败", success: 10, failed: 1, startAt: "2026-10-08 18:00", endAt: "2026-10-08 18:10", operator: "系统" },
  ];

  function normalizeMethods(r) {
    const allowed = ["站内信", "邮件"];
    let methods = [];
    if (Array.isArray(r.methods) && r.methods.length) methods = r.methods;
    else if (Array.isArray(r.notify) && r.notify.length) methods = r.notify;
    else if (r.method) methods = String(r.method).split(/[、,/]/).map((s) => s.trim()).filter(Boolean);
    methods = methods.filter((m) => allowed.includes(m));
    if (!methods.length) methods = ["站内信"];
    return [...new Set(methods)];
  }

  function normalizeRule(r) {
    const levelMap = { 紧急: "告警", 重要: "预警", 一般: "提醒" };
    const ops = ["等于", "大于", "大于等于", "小于", "小于等于"];
    const methods = normalizeMethods(r);
    return {
      ...r,
      level: levelMap[r.level] || r.level || "预警",
      operator: ops.includes(r.operator) ? r.operator : "大于等于",
      filter: r.filter || "periodic",
      period: Number(r.period) > 0 ? Number(r.period) : 60,
      methods,
      method: methods.join("、"),
      emailTo: methods.includes("邮件") ? (r.emailTo || "") : "",
      departments: Array.isArray(r.departments) ? [...r.departments] : [],
      people: Array.isArray(r.people) ? [...r.people] : [],
      notify: [...methods],
      description: r.description || "",
      enabled: r.enabled !== false,
    };
  }

  function loadRules() {
    try {
      const raw = global.localStorage?.getItem(RULE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed.map(normalizeRule);
      }
    } catch (_) {}
    return defaultRules.map((r) => normalizeRule(r));
  }

  function saveRules(rules) {
    global.localStorage?.setItem(RULE_KEY, JSON.stringify(rules));
  }

  let rules = loadRules();

  const API = {
    listDevices() { return devices.map((d) => ({ ...d, ports: d.ports.map((p) => ({ ...p })) })); },
    getDevice(id) { return API.listDevices().find((d) => d.id === id) || null; },
    getHost() {
      return JSON.parse(JSON.stringify(host));
    },
    getHostSummary() {
      const diskMax = Math.max(...host.disks.map((d) => d.usage));
      return { cpuUsage: host.cpu.usage, memUsage: host.memory.usage, diskMax, serverName: host.server.name };
    },
    listAlarmRules() {
      return rules.map((r) => ({
        ...r,
        methods: [...(r.methods || [])],
        notify: [...(r.notify || r.methods || [])],
        departments: [...(r.departments || [])],
        people: [...(r.people || [])],
      }));
    },
    getAlarmRule(id) { return API.listAlarmRules().find((r) => r.id === id) || null; },
    setRuleEnabled(id, enabled) {
      rules = rules.map((r) => (r.id === id ? { ...r, enabled: !!enabled } : r));
      saveRules(rules);
      return API.listAlarmRules();
    },
    saveAlarmRule(payload) {
      const methods = normalizeMethods(payload);
      const next = {
        name: payload.name,
        metric: payload.metric,
        operator: payload.operator || "大于等于",
        threshold: payload.threshold,
        level: payload.level,
        filter: payload.filter || "periodic",
        period: Number(payload.period) > 0 ? Number(payload.period) : 60,
        methods,
        method: methods.join("、"),
        emailTo: methods.includes("邮件") ? (payload.emailTo || "") : "",
        departments: Array.isArray(payload.departments) ? [...payload.departments] : [],
        people: Array.isArray(payload.people) ? [...payload.people] : [],
        notify: [...methods],
        enabled: payload.enabled !== false,
        description: payload.description || "",
      };
      if (payload.id) {
        rules = rules.map((r) => (r.id === payload.id ? { ...r, ...next } : r));
      } else {
        rules.push({ id: `R-${Date.now()}`, ...next });
      }
      saveRules(rules);
      return API.listAlarmRules();
    },
    deleteAlarmRule(id) {
      rules = rules.filter((r) => r.id !== id);
      saveRules(rules);
      return API.listAlarmRules();
    },
    listAlarmEvents() {
      return alarmEvents.map((e) => ({
        ...e,
        history: (e.history || []).map((h) => ({ ...h })),
      }));
    },
    getAlarmEvent(id) {
      return API.listAlarmEvents().find((e) => e.id === id) || null;
    },
    processAlarm(id, payload = {}) {
      const row = alarmEvents.find((e) => e.id === id);
      if (!row || row.status !== "未处理") return API.listAlarmEvents();
      const handler = payload.handler || "当前用户";
      const handledAt = payload.handledAt || new Date().toISOString().slice(0, 19).replace("T", " ");
      const remark = payload.remark || "完成处理";
      row.status = "已处理";
      row.processedBy = handler;
      row.processedAt = handledAt;
      row.processRemark = remark;
      row.history = [...(row.history || []), { time: handledAt, operator: handler, action: remark }];
      return API.listAlarmEvents();
    },
    closeAlarm(id, payload = {}) {
      const row = alarmEvents.find((e) => e.id === id);
      if (!row || row.status !== "未处理") return API.listAlarmEvents();
      const reason = (payload.reason || "").trim();
      const closedAt = payload.closedAt || new Date().toISOString().slice(0, 19).replace("T", " ");
      const closedBy = payload.closedBy || "当前用户";
      row.status = "已处理";
      row.closeReason = reason;
      row.closedBy = closedBy;
      row.closedAt = closedAt;
      row.history = [...(row.history || []), { time: closedAt, operator: closedBy, action: `关闭告警：${reason}` }];
      return API.listAlarmEvents();
    },
    listTopologyNodes() { return topoNodes.map((n) => ({ ...n })); },
    listTopologyLinks() { return topoLinks.map((l) => [...l]); },
    getTopoMonitor() {
      return {
        cpuUsage: 3,
        memUsage: 16.88,
        diskUsage: 9,
        cpuCores: 8,
        memRemain: "26.1 GiB / 31.4 GiB",
        diskRemain: "1.0T / 45.0T",
        storages: [
          { name: "照片存储信息", count: 182, size: "2.41 TB" },
          { name: "视频存储信息", count: 96, size: "1.41 TB" },
          { name: "文件存储信息", count: 268, size: "860 GB" },
        ],
        cpuTrend: [2, 3, 4, 3, 5, 3, 2, 3, 4, 3],
        memTrend: [15, 16, 17, 16, 18, 16, 15, 17, 16, 17],
        diskTrend: [9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
      };
    },
    listConfigBackups() { return configBackups.map((c) => ({ ...c })); },
    getConfigBackup(id) { return API.listConfigBackups().find((c) => c.id === id) || null; },
    listConfigSyncLogs() { return configSyncLogs.map((s) => ({ ...s })); },
    listSecurityItems() {
      return {
        summary: { policyEnabled: 5, policyTotal: 6, openEvents: 2, passChecks: 4, failChecks: 1 },
        policies: [
          { id: "P-001", name: "管理口仅内网访问", type: "访问控制", scope: "全部网络设备", status: "已启用", owner: "运维甲", updatedAt: "2026-09-20" },
          { id: "P-002", name: "禁止 Telnet", type: "协议管控", scope: "路由器 / 交换机", status: "已启用", owner: "运维乙", updatedAt: "2026-09-18" },
          { id: "P-003", name: "SSH 强密码策略", type: "认证安全", scope: "全部网络设备", status: "已启用", owner: "运维甲", updatedAt: "2026-09-15" },
          { id: "P-004", name: "SNMP v3 强制", type: "协议管控", scope: "核心 / 汇聚设备", status: "已启用", owner: "运维丙", updatedAt: "2026-09-12" },
          { id: "P-005", name: "外网管理端口关闭", type: "访问控制", scope: "边界设备", status: "已启用", owner: "运维乙", updatedAt: "2026-09-10" },
          { id: "P-006", name: "未授权 MAC 隔离", type: "接入安全", scope: "接入交换机", status: "未启用", owner: "运维甲", updatedAt: "2026-09-08" },
        ],
        events: [
          { id: "SE-001", time: "2026-10-11 22:14", type: "异常登录尝试", level: "高", source: "10.12.8.44", target: "核心路由器 RT-01", result: "已阻断", handler: "系统" },
          { id: "SE-002", time: "2026-10-11 18:02", type: "端口扫描", level: "中", source: "10.12.9.16", target: "边界路由器 RT-02", result: "已记录", handler: "运维乙" },
          { id: "SE-003", time: "2026-10-10 09:40", type: "弱口令命中", level: "高", source: "内网巡检", target: "管理网关 GW-01", result: "待整改", handler: "运维甲" },
          { id: "SE-004", time: "2026-10-09 14:21", type: "ACL 命中告警", level: "低", source: "192.168.120.8", target: "汇聚交换机 SW-12", result: "已确认", handler: "运维丙" },
        ],
        checklist: [
          { id: "C-001", item: "默认口令已修改", category: "认证", result: "通过", checkedAt: "2026-10-10", owner: "运维甲" },
          { id: "C-002", item: "SNMP 社区串非 public", category: "协议", result: "通过", checkedAt: "2026-10-10", owner: "运维乙" },
          { id: "C-003", item: "外网管理端口关闭", category: "访问", result: "通过", checkedAt: "2026-10-10", owner: "运维丙" },
          { id: "C-004", item: "配置备份近 7 日完整", category: "运维", result: "通过", checkedAt: "2026-10-10", owner: "运维甲" },
          { id: "C-005", item: "未启用策略已评审", category: "策略", result: "待整改", checkedAt: "2026-10-10", owner: "运维乙" },
        ],
      };
    },
    listFaultEvents() {
      return [
        { id: "F-001", time: "2026-10-12 09:12", type: "设备宕机", object: "AP-07", severity: "紧急", rootHint: "汇聚 SW-12 Gi1/0/24 down → AP 链路中断", suggest: "检查接入交换机端口并重启端口" },
        { id: "F-002", time: "2026-10-12 09:58", type: "主机资源耗尽", object: "服务主机 E:\\", severity: "紧急", rootHint: "磁盘 94% 触发阈值，应用日志目录膨胀", suggest: "清理日志或扩容磁盘" },
      ];
    },
  };

  global.NETWORK_STORE = API;
})(typeof window !== "undefined" ? window : globalThis);
