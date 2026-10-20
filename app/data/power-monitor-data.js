(function (global) {
  const spatialTree = [
    {
      name: "光谷科学岛综合开发项目",
      corridors: [
        {
          name: "高新大道综合管廊",
          cabins: [
            { name: "电力舱", sections: ["防火分区", "配电间", "通风口"] },
            { name: "综合舱", sections: ["防火分区", "出入口"] },
          ],
        },
        {
          name: "科学岛大道综合管廊",
          cabins: [
            { name: "电力舱", sections: ["防火分区", "变压器室"] },
            { name: "综合舱", sections: ["防火分区"] },
          ],
        },
      ],
    },
    {
      name: "科学岛东区管廊延伸工程",
      corridors: [
        {
          name: "科学岛东区综合管廊",
          cabins: [
            { name: "电力舱", sections: ["配电间", "通风口"] },
            { name: "综合舱", sections: ["防火分区"] },
          ],
        },
      ],
    },
  ];

  function hours24Labels() {
    const labels = [];
    for (let h = 0; h <= 24; h += 2) {
      labels.push(String(h).padStart(2, "0") + ":00");
    }
    return labels;
  }

  function wave(base, amp, n, phase) {
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push(Math.round((base + Math.sin(i * 0.55 + phase) * amp + (i % 3) * 0.4) * 10) / 10);
    }
    return out;
  }

  const labels24 = hours24Labels();
  const n = labels24.length;

  const chartSeries = {
    envIndex: {
      labels: labels24,
      temperature: wave(68, 6, n, 0.2),
      humidity: wave(38, 8, n, 1.1),
    },
    upsVoltage: {
      labels: labels24,
      phaseA: wave(70, 4, n, 0.1),
      phaseB: wave(62, 5, n, 0.4),
      phaseC: wave(55, 5, n, 0.7),
    },
    upsCurrent: {
      labels: labels24,
      phaseA: wave(48, 8, n, 0.3),
      phaseB: wave(36, 9, n, 0.6),
      phaseC: wave(28, 7, n, 0.9),
    },
    alarmTrend: {
      today: { labels: ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"], values: [0, 1, 0, 2, 1, 0, 1] },
      month: { labels: ["第1周", "第2周", "第3周", "第4周"], values: [3, 5, 2, 4] },
      year: { labels: ["Q1", "Q2", "Q3", "Q4"], values: [12, 9, 15, 7] },
    },
  };

  const monitorDevices = [
    {
      id: "PWR-UPS-01",
      name: "UPS-电力舱-01",
      code: "PWR-UPS-01",
      kind: "ups",
      status: "alarm",
      statusLabel: "报警",
      project: "光谷科学岛综合开发项目",
      corridor: "高新大道综合管廊",
      room: "电力舱",
      section: "配电间",
      gatewayId: "1",
      lat: 30.4684,
      lng: 114.4165,
      lastSeen: "2026-10-14 10:28:00",
      metrics: [
        { name: "输出电压", value: "242", unit: "V", status: "danger" },
        { name: "负载率", value: "86", unit: "%", status: "warning" },
        { name: "电池电量", value: "62", unit: "%", status: "warning" },
      ],
      alarm: {
        event: "过压",
        type: "过压",
        level: "一级",
        time: "2026-10-14 10:28:00",
        message: "UPS 输出电压超阈，A 相 242V",
      },
    },
    {
      id: "PWR-CAB-01",
      name: "配电柜-防火分区-01",
      code: "PWR-CAB-01",
      kind: "cabinet",
      status: "normal",
      statusLabel: "正常",
      project: "光谷科学岛综合开发项目",
      corridor: "高新大道综合管廊",
      room: "电力舱",
      section: "防火分区",
      gatewayId: "1",
      lat: 30.4680,
      lng: 114.4178,
      lastSeen: "2026-10-14 10:27:50",
      metrics: [
        { name: "回路电流", value: "86", unit: "A", status: "normal" },
        { name: "开关状态", value: "合闸", unit: "", status: "normal" },
        { name: "负载率", value: "54", unit: "%", status: "normal" },
      ],
    },
    {
      id: "PWR-TF-01",
      name: "变压器-变压器室-01",
      code: "PWR-TF-01",
      kind: "transformer",
      status: "warn",
      statusLabel: "预警",
      project: "光谷科学岛综合开发项目",
      corridor: "科学岛大道综合管廊",
      room: "电力舱",
      section: "变压器室",
      gatewayId: "2",
      lat: 30.4658,
      lng: 114.4225,
      lastSeen: "2026-10-14 10:26:12",
      metrics: [
        { name: "油温", value: "78", unit: "℃", status: "warning" },
        { name: "负载率", value: "71", unit: "%", status: "warning" },
        { name: "绕组温", value: "82", unit: "℃", status: "warning" },
      ],
      alarm: {
        event: "温度异常",
        type: "温度异常",
        level: "二级",
        time: "2026-10-14 10:26:12",
        message: "变压器油温接近预警阈值",
      },
    },
    {
      id: "PWR-MTR-01",
      name: "电表-通风口-01",
      code: "PWR-MTR-01",
      kind: "meter",
      status: "normal",
      statusLabel: "正常",
      project: "光谷科学岛综合开发项目",
      corridor: "高新大道综合管廊",
      room: "电力舱",
      section: "通风口",
      gatewayId: "1",
      lat: 30.4669,
      lng: 114.4201,
      lastSeen: "2026-10-14 10:27:40",
      metrics: [
        { name: "有功功率", value: "128.6", unit: "kW", status: "normal" },
        { name: "累计电量", value: "18620", unit: "kWh", status: "normal" },
        { name: "功率因数", value: "0.96", unit: "", status: "normal" },
      ],
    },
    {
      id: "PWR-UPS-02",
      name: "UPS-综合舱-02",
      code: "PWR-UPS-02",
      kind: "ups",
      status: "offline",
      statusLabel: "离线",
      project: "科学岛东区管廊延伸工程",
      corridor: "科学岛东区综合管廊",
      room: "电力舱",
      section: "配电间",
      gatewayId: "3",
      lat: 30.4645,
      lng: 114.4250,
      lastSeen: "2026-10-14 08:12:00",
      metrics: [
        { name: "输出电压", value: "—", unit: "V", status: "offline" },
        { name: "负载率", value: "—", unit: "%", status: "offline" },
        { name: "电池电量", value: "—", unit: "%", status: "offline" },
      ],
      alarm: {
        event: "设备离线",
        type: "设备离线",
        level: "二级",
        time: "2026-10-14 08:12:00",
        message: "UPS 通信中断超过 60 秒",
      },
    },
    {
      id: "PWR-CAB-02",
      name: "配电柜-配电间-02",
      code: "PWR-CAB-02",
      kind: "cabinet",
      status: "fault",
      statusLabel: "故障",
      project: "光谷科学岛综合开发项目",
      corridor: "科学岛大道综合管廊",
      room: "电力舱",
      section: "防火分区",
      gatewayId: "2",
      lat: 30.4652,
      lng: 114.4238,
      lastSeen: "2026-10-14 09:58:20",
      metrics: [
        { name: "回路电流", value: "0", unit: "A", status: "danger" },
        { name: "开关状态", value: "故障跳闸", unit: "", status: "danger" },
        { name: "负载率", value: "0", unit: "%", status: "danger" },
      ],
    },
    {
      id: "PWR-TF-02",
      name: "变压器-电力舱-02",
      code: "PWR-TF-02",
      kind: "transformer",
      status: "normal",
      statusLabel: "正常",
      project: "科学岛东区管廊延伸工程",
      corridor: "科学岛东区综合管廊",
      room: "电力舱",
      section: "通风口",
      gatewayId: "3",
      lat: 30.4640,
      lng: 114.4258,
      lastSeen: "2026-10-14 10:20:05",
      metrics: [
        { name: "油温", value: "56", unit: "℃", status: "normal" },
        { name: "负载率", value: "48", unit: "%", status: "normal" },
        { name: "绕组温", value: "61", unit: "℃", status: "normal" },
      ],
    },
    {
      id: "PWR-MTR-02",
      name: "电表-出入口-02",
      code: "PWR-MTR-02",
      kind: "meter",
      status: "warn",
      statusLabel: "预警",
      project: "光谷科学岛综合开发项目",
      corridor: "高新大道综合管廊",
      room: "综合舱",
      section: "出入口",
      gatewayId: "1",
      lat: 30.4682,
      lng: 114.4168,
      lastSeen: "2026-10-14 10:25:00",
      metrics: [
        { name: "有功功率", value: "210.4", unit: "kW", status: "warning" },
        { name: "累计电量", value: "22410", unit: "kWh", status: "normal" },
        { name: "功率因数", value: "0.88", unit: "", status: "warning" },
      ],
    },
  ];

  function metricValue(d, name) {
    const m = (d.metrics || []).find((x) => x.name === name);
    return m ? (m.unit ? `${m.value}${m.unit}` : m.value) : "—";
  }

  const primaryMetricName = {
    ups: "输出电压",
    cabinet: "回路电流",
    transformer: "油温",
    meter: "有功功率",
  };

  const statusDevices = monitorDevices.map((d) => ({
    id: d.id,
    name: d.name,
    code: d.code,
    kind: d.kind,
    corridor: d.corridor,
    room: d.room,
    section: d.section,
    primaryMetric: metricValue(d, primaryMetricName[d.kind] || d.metrics?.[0]?.name),
    loadRate: metricValue(d, "负载率"),
    runStatus: d.statusLabel,
    comm: d.status === "offline" ? "离线" : "在线",
    lastSeen: d.lastSeen,
  }));

  const alarms = [
    {
      id: 1,
      device: "UPS-电力舱-01",
      deviceCode: "PWR-UPS-01",
      system: "电力监测",
      category: "电力监测",
      type: "过压",
      message: "UPS 输出电压超阈，A 相 242V",
      level: "告警",
      time: "2026-10-14 10:28:00",
      status: "未处理",
      location: "电力舱配电间",
      property: "高新大道综合管廊 / 电力舱 / 配电间",
      history: [{ time: "2026-10-14 10:28:00", operator: "系统", action: "创建报警" }],
    },
    {
      id: 2,
      device: "变压器-变压器室-01",
      deviceCode: "PWR-TF-01",
      system: "电力监测",
      category: "电力监测",
      type: "温度异常",
      message: "变压器油温接近预警阈值",
      level: "告警",
      time: "2026-10-14 10:26:12",
      status: "处理中",
      location: "电力舱变压器室",
      property: "科学岛大道综合管廊 / 电力舱 / 变压器室",
      process: {
        workOrderNo: "WO20261014021",
        workOrderName: "变压器油温核查",
        description: "现场核查变压器冷却与负载",
        type: "温度异常",
        image: "现场图片（Mock）",
        remark: "已通知值班人员复核油温。",
      },
      history: [
        { time: "2026-10-14 10:26:12", operator: "系统", action: "创建报警" },
        { time: "2026-10-14 10:30:00", operator: "张三", action: "开始处理，已通知值班人员" },
      ],
    },
    {
      id: 3,
      device: "配电柜-配电间-02",
      deviceCode: "PWR-CAB-02",
      system: "电力监测",
      category: "电力监测",
      type: "过流",
      message: "配电柜故障跳闸，回路电流归零",
      level: "预警",
      time: "2026-10-14 09:58:20",
      status: "已处理",
      location: "电力舱防火分区",
      property: "科学岛大道综合管廊 / 电力舱 / 防火分区",
      closeReason: "告警已解决",
      closeRemark: "排除短路后恢复合闸。",
      closedAt: "2026-10-14 10:15:00",
      closedBy: "李四",
      process: {
        workOrderNo: "WO20261014022",
        workOrderName: "配电柜跳闸检修",
        description: "处理过流跳闸",
        type: "过流",
        image: "现场图片（Mock）",
        remark: "完成排查并复电。",
      },
      history: [
        { time: "2026-10-14 09:58:20", operator: "系统", action: "创建报警" },
        { time: "2026-10-14 10:10:00", operator: "李四", action: "完成排查" },
        { time: "2026-10-14 10:15:00", operator: "李四", action: "告警已解决，完成处理" },
      ],
    },
    {
      id: 4,
      device: "UPS-综合舱-02",
      deviceCode: "PWR-UPS-02",
      system: "电力监测",
      category: "电力监测",
      type: "设备离线",
      message: "UPS 通信中断超过 60 秒",
      level: "预警",
      time: "2026-10-14 08:12:00",
      status: "未处理",
      location: "电力舱配电间",
      property: "科学岛东区综合管廊 / 电力舱 / 配电间",
      history: [{ time: "2026-10-14 08:12:00", operator: "系统", action: "创建报警" }],
    },
    {
      id: 5,
      device: "电表-出入口-02",
      deviceCode: "PWR-MTR-02",
      system: "电力监测",
      category: "电力监测",
      type: "欠压",
      message: "功率因数偏低，疑似电压质量波动",
      level: "提醒",
      time: "2026-10-14 10:25:00",
      status: "已处理",
      location: "综合舱出入口",
      property: "高新大道综合管廊 / 综合舱 / 出入口",
      closeReason: "误报无问题",
      closeRemark: "确认为短时负载切换波动。",
      closedAt: "2026-10-14 10:32:00",
      closedBy: "王五",
      history: [
        { time: "2026-10-14 10:25:00", operator: "系统", action: "创建报警" },
        { time: "2026-10-14 10:32:00", operator: "王五", action: "误报无问题，完成处理" },
      ],
    },
  ];

  const cameras = [
    { name: "配电间枪式摄像机 01", status: "在线", corridor: "高新大道综合管廊", cabin: "电力舱", section: "配电间" },
    { name: "变压器室球型摄像机 02", status: "在线", corridor: "科学岛大道综合管廊", cabin: "电力舱", section: "变压器室" },
    { name: "电力舱半球摄像机 03", status: "在线", corridor: "高新大道综合管廊", cabin: "电力舱", section: "通风口" },
    { name: "出入口枪式摄像机 04", status: "在线", corridor: "高新大道综合管廊", cabin: "综合舱", section: "出入口" },
  ];

  global.POWER_MONITOR_DATA = {
    spatialTree,
    monitorDevices,
    statusDevices,
    chartSeries,
    alarms,
    cameras,
  };
})(window);
