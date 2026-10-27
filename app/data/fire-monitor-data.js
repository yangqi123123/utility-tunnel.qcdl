(function (global) {
  const spatialTree = [
    {
      name: "光谷科学岛综合开发项目",
      corridors: [
        {
          name: "高新大道综合管廊",
          cabins: [
            { name: "综合舱", sections: ["防火分区", "出入口", "通风口"] },
            { name: "电力舱", sections: ["防火分区", "通风口"] },
          ],
        },
        {
          name: "科学岛大道综合管廊",
          cabins: [
            { name: "综合舱", sections: ["防火分区", "出入口"] },
            { name: "电力舱", sections: ["防火分区"] },
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
            { name: "燃气舱", sections: ["通风口", "吊装口"] },
            { name: "综合舱", sections: ["防火分区"] },
          ],
        },
      ],
    },
  ];

  function device(partial) {
    return Object.assign(
      {
        project: "光谷科学岛综合开发项目",
        corridor: "高新大道综合管廊",
        room: "综合舱",
        section: "防火分区",
        lastSeen: "2026-10-16 10:00:00",
      },
      partial
    );
  }

  const monitorDevices = [
    device({
      id: "FM-SMOKE-01", name: "感烟探头-01", code: "FM-SMOKE-01", kind: "smoke",
      typeLabel: "感烟", status: "alarm", statusLabel: "报警",
      lat: 30.4684, lng: 114.4165,
      metrics: [
        { name: "烟雾浓度", value: "1.8", unit: "%/m", status: "danger" },
        { name: "报警状态", value: "火警", unit: "", status: "danger" },
      ],
      alarm: { event: "烟感报警", type: "烟雾超限", level: "一级", time: "2026-10-16 09:15:00", message: "综合舱感烟探头触发火警" },
    }),
    device({
      id: "FM-SMOKE-02", name: "感烟探头-02", code: "FM-SMOKE-02", kind: "smoke",
      typeLabel: "感烟", status: "online", statusLabel: "在线",
      section: "出入口", lat: 30.4688, lng: 114.4170,
      metrics: [
        { name: "烟雾浓度", value: "0.2", unit: "%/m", status: "normal" },
        { name: "报警状态", value: "正常", unit: "", status: "normal" },
      ],
    }),
    device({
      id: "FM-HEAT-01", name: "感温探头-01", code: "FM-HEAT-01", kind: "heat",
      typeLabel: "感温", status: "warn", statusLabel: "预警",
      room: "电力舱", lat: 30.4691, lng: 114.4172,
      metrics: [
        { name: "温度", value: "62", unit: "℃", status: "warn" },
        { name: "报警状态", value: "预警", unit: "", status: "warn" },
      ],
      alarm: { event: "温感预警", type: "温度升高", level: "二级", time: "2026-10-16 09:20:00", message: "电力舱感温探头温度偏高" },
    }),
    device({
      id: "FM-HEAT-02", name: "感温探头-02", code: "FM-HEAT-02", kind: "heat",
      typeLabel: "感温", status: "online", statusLabel: "在线",
      corridor: "科学岛大道综合管廊", lat: 30.4702, lng: 114.4188,
      metrics: [
        { name: "温度", value: "31", unit: "℃", status: "normal" },
        { name: "报警状态", value: "正常", unit: "", status: "normal" },
      ],
    }),
    device({
      id: "FM-MCP-01", name: "手动报警器-01", code: "FM-MCP-01", kind: "manual",
      typeLabel: "手动报警器", status: "alarm", statusLabel: "报警",
      section: "出入口", lat: 30.4686, lng: 114.4168,
      metrics: [{ name: "按钮状态", value: "已按下", unit: "", status: "danger" }],
      alarm: { event: "手动报警", type: "手动启动", level: "一级", time: "2026-10-16 09:22:00", message: "出入口手动报警器已按下" },
    }),
    device({
      id: "FM-MCP-02", name: "手动报警器-02", code: "FM-MCP-02", kind: "manual",
      typeLabel: "手动报警器", status: "online", statusLabel: "在线",
      lat: 30.4695, lng: 114.4178,
      metrics: [{ name: "按钮状态", value: "正常", unit: "", status: "normal" }],
    }),
    device({
      id: "FM-DOOR-01", name: "防火门-01", code: "FM-DOOR-01", kind: "door",
      typeLabel: "防火门", status: "alarm", statusLabel: "报警",
      section: "通风口", lat: 30.4689, lng: 114.4174,
      metrics: [
        { name: "开闭状态", value: "开", unit: "", status: "danger" },
        { name: "门状态", value: "常开", unit: "", status: "danger" },
      ],
      alarm: { event: "防火门常开", type: "门禁异常", level: "二级", time: "2026-10-16 09:30:00", message: "防火分区防火门处于常开" },
    }),
    device({
      id: "FM-DOOR-02", name: "防火门-02", code: "FM-DOOR-02", kind: "door",
      typeLabel: "防火门", status: "online", statusLabel: "在线",
      lat: 30.4693, lng: 114.4176,
      metrics: [
        { name: "开闭状态", value: "关", unit: "", status: "normal" },
        { name: "门状态", value: "正常", unit: "", status: "normal" },
      ],
    }),
    device({
      id: "FM-PWR-01", name: "消防水泵电源-01", code: "FM-PWR-01", kind: "power",
      typeLabel: "消防电源", status: "alarm", statusLabel: "报警",
      room: "电力舱", section: "通风口", lat: 30.4696, lng: 114.4180,
      metrics: [
        { name: "电源状态", value: "中断", unit: "", status: "danger" },
        { name: "监测对象", value: "消防水泵", unit: "", status: "danger" },
      ],
      alarm: { event: "消防电源中断", type: "电源异常", level: "一级", time: "2026-10-16 09:35:00", message: "消防水泵电源监测中断" },
    }),
    device({
      id: "FM-PWR-02", name: "排烟风机电源-01", code: "FM-PWR-02", kind: "power",
      typeLabel: "消防电源", status: "online", statusLabel: "在线",
      room: "电力舱", lat: 30.4698, lng: 114.4182,
      metrics: [
        { name: "电源状态", value: "正常", unit: "", status: "normal" },
        { name: "监测对象", value: "排烟风机", unit: "", status: "normal" },
      ],
    }),
    device({
      id: "FM-ELEC-01", name: "电气火灾探测器-01", code: "FM-ELEC-01", kind: "elec",
      typeLabel: "电气火灾", status: "warn", statusLabel: "预警",
      room: "电力舱", lat: 30.4700, lng: 114.4184,
      metrics: [
        { name: "剩余电流", value: "280", unit: "mA", status: "warn" },
        { name: "线温", value: "55", unit: "℃", status: "warn" },
      ],
      alarm: { event: "剩余电流超限", type: "电气异常", level: "二级", time: "2026-10-16 09:40:00", message: "电力舱剩余电流接近阈值" },
    }),
    device({
      id: "FM-ELEC-02", name: "电气火灾探测器-02", code: "FM-ELEC-02", kind: "elec",
      typeLabel: "电气火灾", status: "online", statusLabel: "在线",
      lat: 30.4703, lng: 114.4186,
      metrics: [
        { name: "剩余电流", value: "32", unit: "mA", status: "normal" },
        { name: "线温", value: "28", unit: "℃", status: "normal" },
      ],
    }),
    device({
      id: "FM-LIGHT-01", name: "应急照明-01", code: "FM-LIGHT-01", kind: "light",
      typeLabel: "应急照明", status: "fault", statusLabel: "故障",
      section: "出入口", lat: 30.4685, lng: 114.4167,
      metrics: [{ name: "灯具状态", value: "故障", unit: "", status: "danger" }],
      alarm: { event: "应急照明故障", type: "设备故障", level: "提醒", time: "2026-10-16 08:50:00", message: "出入口应急灯具故障" },
    }),
    device({
      id: "FM-LIGHT-02", name: "应急照明-02", code: "FM-LIGHT-02", kind: "light",
      typeLabel: "应急照明", status: "online", statusLabel: "在线",
      lat: 30.4690, lng: 114.4171,
      metrics: [{ name: "灯具状态", value: "正常", unit: "", status: "normal" }],
    }),
    device({
      id: "FM-FIBER-01", name: "感温光纤-01", code: "FM-FIBER-01", kind: "fiber",
      typeLabel: "感温光纤", status: "alarm", statusLabel: "报警",
      room: "电力舱", lat: 30.4694, lng: 114.4179,
      metrics: [
        { name: "最高温度", value: "78", unit: "℃", status: "danger" },
        { name: "监测区段", value: "K0+120~K0+180", unit: "", status: "danger" },
      ],
      alarm: { event: "感温光纤高温", type: "线缆温度超限", level: "一级", time: "2026-10-16 09:45:00", message: "电力舱电缆温度超限" },
    }),
    device({
      id: "FM-FIBER-02", name: "感温光纤-02", code: "FM-FIBER-02", kind: "fiber",
      typeLabel: "感温光纤", status: "online", statusLabel: "在线",
      corridor: "科学岛大道综合管廊", room: "电力舱", lat: 30.4706, lng: 114.4190,
      metrics: [
        { name: "最高温度", value: "33", unit: "℃", status: "normal" },
        { name: "监测区段", value: "K0+200~K0+260", unit: "", status: "normal" },
      ],
    }),
  ];

  const alarms = [
    {
      id: 1, device: "感烟探头-01", deviceCode: "FM-SMOKE-01", system: "消防监控", category: "感烟",
      type: "设备属性", message: "综合舱感烟探头触发火警", level: "告警", time: "2026-10-16 09:15:00",
      status: "未处理", location: "综合舱防火分区",
      property: "高新大道综合管廊 / 综合舱 / 防火分区",
      history: [{ time: "2026-10-16 09:15:00", operator: "系统", action: "创建报警" }],
    },
    {
      id: 2, device: "防火门-01", deviceCode: "FM-DOOR-01", system: "消防监控", category: "防火门",
      type: "设备属性", message: "防火分区防火门处于常开", level: "预警", time: "2026-10-16 09:30:00",
      status: "处理中", location: "综合舱通风口",
      property: "高新大道综合管廊 / 综合舱 / 通风口",
      history: [
        { time: "2026-10-16 09:30:00", operator: "系统", action: "创建报警" },
        { time: "2026-10-16 09:36:00", operator: "值班员甲", action: "开始处理" },
      ],
    },
    {
      id: 3, device: "消防水泵电源-01", deviceCode: "FM-PWR-01", system: "消防监控", category: "消防电源",
      type: "设备属性", message: "消防水泵电源监测中断", level: "告警", time: "2026-10-16 09:35:00",
      status: "未处理", location: "电力舱通风口",
      property: "高新大道综合管廊 / 电力舱 / 通风口",
      history: [{ time: "2026-10-16 09:35:00", operator: "系统", action: "创建报警" }],
    },
    {
      id: 4, device: "感温光纤-01", deviceCode: "FM-FIBER-01", system: "消防监控", category: "感温光纤",
      type: "设备属性", message: "电力舱电缆温度超限", level: "告警", time: "2026-10-16 09:45:00",
      status: "未处理", location: "电力舱防火分区",
      property: "高新大道综合管廊 / 电力舱 / 防火分区",
      history: [{ time: "2026-10-16 09:45:00", operator: "系统", action: "创建报警" }],
    },
    {
      id: 5, device: "应急照明-01", deviceCode: "FM-LIGHT-01", system: "消防监控", category: "应急照明",
      type: "设备属性", message: "出入口应急灯具故障", level: "提醒", time: "2026-10-16 08:50:00",
      status: "已处理", location: "综合舱出入口",
      property: "高新大道综合管廊 / 综合舱 / 出入口",
      processedBy: "值班员乙", processedAt: "2026-10-16 09:05:00", processRemark: "更换灯具后恢复",
      history: [
        { time: "2026-10-16 08:50:00", operator: "系统", action: "创建报警" },
        { time: "2026-10-16 09:05:00", operator: "值班员乙", action: "处理完成" },
      ],
    },
    {
      id: 6, device: "电气火灾探测器-01", deviceCode: "FM-ELEC-01", system: "消防监控", category: "电气火灾",
      type: "设备属性", message: "电力舱剩余电流接近阈值", level: "预警", time: "2026-10-16 09:40:00",
      status: "未处理", location: "电力舱防火分区",
      property: "高新大道综合管廊 / 电力舱 / 防火分区",
      history: [{ time: "2026-10-16 09:40:00", operator: "系统", action: "创建报警" }],
    },
  ];

  const cameras = [
    { name: "管廊枪式摄像机 01", status: "在线", corridor: "高新大道综合管廊", cabin: "综合舱", section: "出入口" },
    { name: "综合舱球型摄像机 02", status: "在线", corridor: "高新大道综合管廊", cabin: "综合舱", section: "防火分区" },
    { name: "电力舱半球摄像机 03", status: "在线", corridor: "高新大道综合管廊", cabin: "电力舱", section: "通风口" },
    { name: "投料口枪式摄像机 04", status: "在线", corridor: "科学岛大道综合管廊", cabin: "综合舱", section: "出入口" },
  ];

  const controlRecords = [
    {
      id: 1,
      operator: "值班员甲",
      time: "2026-10-23 14:20:11",
      action: "关闭防火门",
      system: "消防监控",
      category: "防火门",
      device: "防火门-01",
      deviceCode: "FM-DOOR-01",
    },
    {
      id: 2,
      operator: "值班员乙",
      time: "2026-10-23 13:05:42",
      action: "启动消防电源",
      system: "消防监控",
      category: "消防电源",
      device: "排烟风机电源-01",
      deviceCode: "FM-PWR-02",
    },
    {
      id: 3,
      operator: "管理员",
      time: "2026-10-22 18:40:03",
      action: "点亮应急照明",
      system: "消防监控",
      category: "应急照明",
      device: "应急照明-02",
      deviceCode: "FM-LIGHT-02",
    },
  ];

  global.FIRE_MONITOR_DATA = {
    spatialTree,
    monitorDevices,
    alarms,
    cameras,
    controlRecords,
  };
})(window);
