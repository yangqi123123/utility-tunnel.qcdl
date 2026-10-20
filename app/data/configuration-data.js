/**
 * 组态系统 Mock
 * 网关拓扑（合并原设备拓扑）：4 服务器 + 5 工作站
 */
(function (global) {
  /** 服务器配置（4 台） */
  const servers = [
    { id: "SRV-BIZ", name: "通用业务服务器", qty: 1, purpose: "基础平台/接口/应急/监测/巡检/安防/资产/运维/GIS/数据库/历史/入侵门禁巡更/井盖/环控/电力/组态/网管/消防", spec: "2U双路 · ≥20核 · ≥128GB", status: "online" },
    { id: "SRV-VIDEO", name: "视频流媒体服务器", qty: 1, purpose: "视频流接入、转发与实时媒体处理", spec: "2U · ≥8核 · 64GB", status: "online" },
    { id: "SRV-IP", name: "IP核心调度专用服务器", qty: 1, purpose: "500用户 · 50并发 · SIP/IAX · 录音 · 外线", spec: "软硬一体 · 录音≥30000小时", status: "online" },
    { id: "SRV-BAK", name: "通用业务备机", qty: 1, purpose: "数据备份与主备切换（建议增配）", spec: "同通用业务服务器", status: "warn" },
  ];

  /** 操作席位与工作站（5 席：清单 4 + 安防席位展示） */
  const workstations = [
    { id: "WS-COM", name: "通信工作站", short: "通信工作站", qty: 1, biz: "融合通信调度 · 紧急电话 · IP广播 · 录音", status: "online" },
    { id: "WS-ACS", name: "门禁及巡更管理工作站", short: "门禁巡更", qty: 1, biz: "门禁授权 · 黑白名单 · 电子巡更 · 入侵布撤防", status: "online" },
    { id: "WS-NMS", name: "网管工作站", short: "网管工作站", qty: 1, biz: "网络拓扑 · 性能监测 · 故障告警 · 防病毒", status: "online" },
    { id: "WS-FIRE", name: "火灾报警工作站", short: "火灾报警", qty: 1, biz: "FAS值班（消防专网侧部署）", status: "online" },
    { id: "WS-SEC", name: "安防工作站", short: "安防工作站", qty: 0, biz: "安防监视与录像调阅（业务合并至通信/大屏）", status: "online", note: "核减展示" },
  ];

  /** 合并后的网关拓扑 */
  const gatewayTopo = {
    title: "网关拓扑",
    cloud: "网络",
    router: { name: "路由", status: "online" },
    coreSwitch: { name: "核心交换机", status: "online" },
    accessSwitches: [
      { id: "SW1", name: "交换机1", status: "online", children: [
        { id: "AP1", name: "AP1", type: "ap", status: "online" },
        { id: "AP2", name: "AP2", type: "ap", status: "online" },
        { id: "AP3", name: "AP3", type: "ap", status: "warn" },
      ]},
      { id: "SW2", name: "交换机2", status: "online", children: [
        { id: "WS-COM", name: "通信工作站", type: "pc", status: "online" },
        { id: "WS-ACS", name: "门禁巡更", type: "pc", status: "online" },
      ]},
      { id: "SW3", name: "交换机3", status: "online", children: [
        { id: "WS-NMS", name: "网管工作站", type: "pc", status: "online" },
        { id: "WS-FIRE", name: "火灾报警", type: "pc", status: "online" },
        { id: "WS-SEC", name: "安防工作站", type: "pc", status: "online" },
      ]},
    ],
  };

  const hmiScreens = [
    { id: "power", name: "电力监测组态图", hint: "高压进线 · 变压器 · 低压出线" },
    { id: "fire", name: "火灾报警组态图", hint: "控制器 · 探测回路 · 联动设备" },
  ];

  const powerHmi = {
    summary: { title: "管廊配电全链路", loadKw: 486.2, pf: 0.96, status: "正常运行" },
    hvIn: { name: "10kV 高压进线", u: "10.28 kV", i: "82.6 A", p: "1.42 MW", status: "online" },
    transformers: [
      { name: "1# 变压器", ratio: "10/0.4 kV", u: "10.25 / 0.401 kV", i: "41.2 / 986 A", p: "238 kW", temp: "58 ℃", status: "online" },
      { name: "2# 变压器", ratio: "10/0.4 kV", u: "10.22 / 0.398 kV", i: "39.8 / 952 A", p: "226 kW", temp: "61 ℃", status: "warn" },
    ],
    lvBus: { name: "0.4kV 低压母线", u: "399 V", i: "1,920 A", p: "458 kW", status: "online" },
    lvOut: [
      { name: "低压出线 · 通风", u: "398 V", i: "126 A", p: "78.4 kW", status: "online" },
      { name: "低压出线 · 照明", u: "401 V", i: "86 A", p: "52.1 kW", status: "online" },
      { name: "低压出线 · 排水", u: "397 V", i: "64 A", p: "38.6 kW", status: "warn" },
      { name: "低压出线 · 消防", u: "400 V", i: "22 A", p: "12.8 kW", status: "online" },
    ],
  };

  const fireHmi = {
    summary: { title: "火灾自动报警全链路", loops: 4, devices: 168, status: "监视中" },
    controller: { name: "消防报警控制器", zone: "中控室", loopsOnline: "4 / 4", power: "主电正常", status: "online" },
    loops: [
      { name: "回路 L1 · 电力舱", devices: 42, alarm: 0, status: "online" },
      { name: "回路 L2 · 燃气舱", devices: 38, alarm: 1, status: "warn" },
      { name: "回路 L3 · 水信舱", devices: 46, alarm: 0, status: "online" },
      { name: "回路 L4 · 综合舱", devices: 42, alarm: 0, status: "online" },
    ],
    points: [
      { name: "感烟 08", zone: "F0104", value: "正常", status: "online" },
      { name: "感温 12", zone: "F0104", value: "42 ℃", status: "warn" },
      { name: "手报 03", zone: "F0103", value: "复位", status: "online" },
      { name: "声光 05", zone: "F0112", value: "待命", status: "online" },
    ],
  };

  global.ConfigurationData = {
    servers,
    workstations,
    gatewayTopo,
    hmiScreens,
    powerHmi,
    fireHmi,
  };
})(typeof window !== "undefined" ? window : globalThis);
