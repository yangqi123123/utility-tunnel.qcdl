(function () {
  const devices = [
    { deviceId: "COM-TEL-HOST-01", code: "TEL-H-01", name: "1号光纤电话主机", type: "光纤电话主机", protocolTags: ["SIP", "API"], corridor: "1号管廊", cabin: "综合舱", section: "B2 区段", locationText: "1号管廊 / 综合舱 / 中控侧", onlineStatus: "在线", lastHeartbeatAt: "2026-10-14 10:58:00", lon: 114.42, lat: 30.47, position: { left: 35, top: 50 }, remark: "" },
    { deviceId: "COM-SOS-03", code: "SOS-03", name: "综合舱 SOS 终端-03", type: "光纤电话副机/SOS", protocolTags: ["SIP"], corridor: "1号管廊", cabin: "综合舱", section: "B2 区段", locationText: "1号管廊 / 综合舱", onlineStatus: "在线", lastHeartbeatAt: "2026-10-14 10:57:40", lon: 114.421, lat: 30.471, position: { left: 58, top: 46 }, remark: "" },
    { deviceId: "COM-SOS-01", code: "SOS-01", name: "综合舱 SOS 终端-01", type: "光纤电话副机/SOS", protocolTags: ["SIP"], corridor: "3号管廊", cabin: "综合舱", section: "W1 区段", locationText: "3号管廊 / 西段", onlineStatus: "离线", lastHeartbeatAt: "2026-10-14 09:12:00", lon: 114.418, lat: 30.468, position: { left: 22, top: 39 }, remark: "" },
    { deviceId: "COM-AP-17", code: "AP-17", name: "东段无线 AP-17", type: "无线 AP", protocolTags: ["API", "SDK"], corridor: "2号管廊", cabin: "电力舱", section: "E4 区段", locationText: "2号管廊 / 东段", onlineStatus: "在线", lastHeartbeatAt: "2026-10-14 10:58:10", lon: 114.425, lat: 30.472, position: { left: 74, top: 31 }, remark: "" },
    { deviceId: "COM-HT-17", code: "HT-17", name: "巡检手台-17", type: "VOIP 手持", protocolTags: ["SIP", "API"], corridor: "2号管廊", cabin: "电力舱", section: "E4 区段", locationText: "2号管廊 / 东段", onlineStatus: "在线", lastHeartbeatAt: "2026-10-14 10:55:00", lon: 114.425, lat: 30.472, position: { left: 74, top: 31 }, remark: "" },
    { deviceId: "COM-GW-01", code: "GW-01", name: "语音网关-01", type: "语音网关", protocolTags: ["OPC", "BACnet", "API"], corridor: "中控中心", cabin: "调度大厅", section: "A1 区段", locationText: "中控室 / 调度台", onlineStatus: "故障", lastHeartbeatAt: "2026-10-14 08:40:00", lon: 114.42, lat: 30.469, position: { left: 35, top: 62 }, remark: "链路抖动" },
  ];

  const zones = [
    { zoneId: "ZONE-01", name: "综合舱 F0101-F0102", cabin: "综合舱", section: "F0101-F0102", status: "空闲", terminalCount: 4, lastTaskSummary: "昨日 TTS 巡检播报", updatedAt: "2026-10-14 09:00:00" },
    { zoneId: "ZONE-02", name: "电力舱 F0103-F0104", cabin: "电力舱", section: "F0103-F0104", status: "广播中", terminalCount: 3, lastTaskSummary: "应急插播进行中", updatedAt: "2026-10-14 10:50:00" },
    { zoneId: "ZONE-03", name: "燃气舱 F0201-F0202", cabin: "燃气舱", section: "F0201-F0202", status: "空闲", terminalCount: 2, lastTaskSummary: "—", updatedAt: "2026-10-13 18:00:00" },
    { zoneId: "ZONE-04", name: "水信舱 F0301", cabin: "水信舱", section: "F0301", status: "空闲", terminalCount: 2, lastTaskSummary: "—", updatedAt: "2026-10-13 16:20:00" },
  ];

  const zoneTerminals = [
    { terminalId: "ZT-01", zoneId: "ZONE-01", name: "综合舱广播终端-01", deviceId: "", onlineStatus: "在线" },
    { terminalId: "ZT-02", zoneId: "ZONE-01", name: "综合舱广播终端-02", deviceId: "", onlineStatus: "在线" },
    { terminalId: "ZT-03", zoneId: "ZONE-02", name: "电力舱广播终端-01", deviceId: "", onlineStatus: "在线" },
    { terminalId: "ZT-04", zoneId: "ZONE-02", name: "电力舱广播终端-02", deviceId: "", onlineStatus: "离线" },
    { terminalId: "ZT-05", zoneId: "ZONE-03", name: "燃气舱广播终端-01", deviceId: "", onlineStatus: "在线" },
    { terminalId: "ZT-06", zoneId: "ZONE-04", name: "水信舱广播终端-01", deviceId: "", onlineStatus: "在线" },
  ];

  const inboundQueue = [
    { queueId: "Q-1024", deviceId: "COM-SOS-03", terminalName: "综合舱 SOS 终端-03", type: "紧急呼叫", priority: "高", location: "1号管廊 / 综合舱", corridor: "1号管廊", cabin: "综合舱", section: "B2 区段", coordinate: "X: 58 · Y: 46", position: { left: 58, top: 46 }, status: "pending", startedAt: "2026-10-14 10:18:42", durationText: "02:16", linkedCallId: "", linkedEventId: "EVT-20261012-001" },
    { queueId: "Q-1023", deviceId: "COM-HT-17", terminalName: "巡检手台-17", type: "日常调度", priority: "中", location: "2号管廊 / 东段", corridor: "2号管廊", cabin: "电力舱", section: "E4 区段", coordinate: "X: 74 · Y: 31", position: { left: 74, top: 31 }, status: "active", startedAt: "2026-10-14 10:06:19", durationText: "05:48", linkedCallId: "", linkedEventId: "" },
    { queueId: "Q-1022", deviceId: "COM-GW-01", terminalName: "消防值守台-01", type: "日常调度", priority: "低", location: "中控室 / 调度台", corridor: "中控中心", cabin: "调度大厅", section: "A1 区段", coordinate: "X: 35 · Y: 62", position: { left: 35, top: 62 }, status: "done", startedAt: "2026-10-14 09:54:07", durationText: "01:32", linkedCallId: "", linkedEventId: "" },
    { queueId: "Q-1021", deviceId: "COM-SOS-01", terminalName: "综合舱 SOS 终端-01", type: "紧急呼叫", priority: "高", location: "3号管廊 / 西段", corridor: "3号管廊", cabin: "综合舱", section: "W1 区段", coordinate: "X: 22 · Y: 39", position: { left: 22, top: 39 }, status: "done", startedAt: "2026-10-14 09:42:55", durationText: "08:12", linkedCallId: "", linkedEventId: "" },
  ];

  const channels = [
    { channelId: "CH-SIP", name: "SIP 语音核心", protocol: "SIP", status: "正常", latencyMs: 28, lastSyncAt: "2026-10-14 10:58:00" },
    { channelId: "CH-API", name: "厂商开放 API", protocol: "API", status: "正常", latencyMs: 45, lastSyncAt: "2026-10-14 10:57:50" },
    { channelId: "CH-OPC", name: "OPC 采集通道", protocol: "OPC", status: "延迟", latencyMs: 320, lastSyncAt: "2026-10-14 10:55:00" },
    { channelId: "CH-BAC", name: "BACnet 网关", protocol: "BACnet", status: "异常", latencyMs: 0, lastSyncAt: "2026-10-14 09:10:00" },
    { channelId: "CH-SDK", name: "无线 SDK", protocol: "SDK", status: "正常", latencyMs: 60, lastSyncAt: "2026-10-14 10:56:30" },
  ];

  function matchKeyword(row, keyword, fields) {
    if (!keyword) return true;
    const q = String(keyword).trim().toLowerCase();
    return fields.some((f) => String(row[f] || "").toLowerCase().includes(q));
  }

  function listDevices(filters = {}) {
    return devices.filter((d) => {
      if (filters.type && filters.type !== "all" && d.type !== filters.type) return false;
      if (filters.onlineStatus && filters.onlineStatus !== "all" && d.onlineStatus !== filters.onlineStatus) return false;
      if (filters.section && filters.section !== "all" && d.section !== filters.section) return false;
      return matchKeyword(d, filters.keyword, ["code", "name", "locationText", "type"]);
    });
  }

  function listZones(filters = {}) {
    return zones.filter((z) => {
      if (filters.status && filters.status !== "all" && z.status !== filters.status) return false;
      return matchKeyword(z, filters.keyword, ["name", "cabin", "section"]);
    });
  }

  function listZoneTerminals(zoneId) {
    return zoneTerminals.filter((t) => !zoneId || t.zoneId === zoneId);
  }

  function listInboundQueue(filters = {}) {
    return inboundQueue.filter((q) => {
      if (filters.status && filters.status !== "all" && q.status !== filters.status) return false;
      if (filters.type && filters.type !== "all" && q.type !== filters.type) return false;
      return matchKeyword(q, filters.keyword, ["queueId", "terminalName", "location"]);
    });
  }

  function getInbound(queueId) {
    return inboundQueue.find((q) => q.queueId === queueId) || null;
  }

  function updateInboundStatus(queueId, status, extra = {}) {
    const row = getInbound(queueId);
    if (!row) return null;
    row.status = status;
    Object.assign(row, extra);
    return row;
  }

  function listChannels() {
    return channels.slice();
  }

  function deviceStats() {
    return {
      total: devices.length,
      online: devices.filter((d) => d.onlineStatus === "在线").length,
      offline: devices.filter((d) => d.onlineStatus === "离线").length,
      fault: devices.filter((d) => d.onlineStatus === "故障").length,
    };
  }

  function zoneStats() {
    return {
      zones: zones.length,
      terminals: zoneTerminals.length,
      idle: zones.filter((z) => z.status === "空闲").length,
      broadcasting: zones.filter((z) => z.status === "广播中").length,
    };
  }

  window.COMMUNICATION_STORE = {
    listDevices,
    listZones,
    listZoneTerminals,
    listInboundQueue,
    getInbound,
    updateInboundStatus,
    listChannels,
    deviceStats,
    zoneStats,
  };
})();
