(function (global) {
  const statusText = { normal: "正常", warning: "预警", danger: "严重超限", offline: "离线" };
  const runText = { running: "运行", stopped: "停止", fault: "故障" };
  const powerText = { on: "有电", off: "失电", unknown: "未知" };
  const modeText = { localManual: "就地手动", localAuto: "就地自动", remote: "远程" };

  /* 与设备监测页一致的空间树（项目→管廊→舱室→区段） */
  const qualitySpatialTree = [
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

  const qualityReportTime = "2026-09-30 12:00:00";

  /* 设备指标可变：不同设备监测项不同；卡片状态仅 online | offline | warn */
  const qualityDevices = [
    {
      id: "ENV-DEV-001", name: "电力舱温湿度传感器 01", code: "001_ENVINDOOR_0001",
      system: "环境与设备监控", type: "室内环境传感器", brand: "昆仑海岸", model: "ENV-SENSOR-001",
      project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", room: "电力舱", section: "防火分区",
      pipeline: "10kV电力管线", location: "设备间 1",
      vendor: "北京昆仑海岸传感技术有限公司", supplierPhone: "028-86134888", manufacturer: "—",
      manufactureDate: "2026-06-20", deliveryDate: "2026-07-05", installDate: "2026-07-11", acceptDate: "2026-07-10",
      scrapDate: "—", factoryCode: "—", cadCode: "CAD-6101", sourceModule: "人工台账",
      service: "设备运行、巡检及维保服务", online: true, status: "online", time: qualityReportTime,
      lat: 30.4684, lng: 114.4165,
      metrics: [
        { name: "温度", value: 26.4, unit: "℃", status: "normal", decimals: 1 },
        { name: "湿度", value: 78, unit: "%", status: "normal", decimals: 0 },
      ],
    },
    {
      id: "ENV-DEV-002", name: "综合舱氧气传感器 02", code: "001_ENVINDOOR_0002",
      system: "环境与设备监控", type: "室内环境传感器", brand: "昆仑海岸", model: "ENV-SENSOR-002",
      project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", room: "综合舱", section: "出入口",
      pipeline: "低压配电管线", location: "设备间 2",
      vendor: "北京昆仑海岸传感技术有限公司", supplierPhone: "028-86134888", manufacturer: "—",
      manufactureDate: "2026-06-18", deliveryDate: "2026-07-04", installDate: "2026-07-10", acceptDate: "2026-07-09",
      scrapDate: "—", factoryCode: "—", cadCode: "CAD-6102", sourceModule: "人工台账",
      service: "设备运行、巡检及维保服务", online: true, status: "online", time: qualityReportTime,
      lat: 30.4686, lng: 114.4172,
      metrics: [
        { name: "氧气", value: 20.8, unit: "%VOL", status: "normal", decimals: 1 },
      ],
    },
    {
      id: "ENV-DEV-003", name: "燃气舱甲烷探测器 03", code: "001_ENVINDOOR_0003",
      system: "环境与设备监控", type: "室内环境传感器", brand: "昆仑海岸", model: "ENV-SENSOR-003",
      project: "科学岛东区管廊延伸工程", corridor: "科学岛东区综合管廊", room: "燃气舱", section: "通风口",
      pipeline: "燃气管线", location: "设备间 3",
      vendor: "北京昆仑海岸传感技术有限公司", supplierPhone: "028-86134888", manufacturer: "—",
      manufactureDate: "2026-06-15", deliveryDate: "2026-07-02", installDate: "2026-07-08", acceptDate: "2026-07-07",
      scrapDate: "—", factoryCode: "—", cadCode: "CAD-6103", sourceModule: "人工台账",
      service: "设备运行、巡检及维保服务", online: true, status: "warn", time: qualityReportTime,
      lat: 30.4678, lng: 114.4188,
      metrics: [
        { name: "甲烷", value: 42, unit: "%LEL", status: "danger", decimals: 0 },
        { name: "氧气", value: 20.4, unit: "%VOL", status: "normal", decimals: 1 },
      ],
    },
    {
      id: "ENV-DEV-004", name: "综合舱硫化氢传感器 04", code: "001_ENVINDOOR_0004",
      system: "环境与设备监控", type: "室内环境传感器", brand: "昆仑海岸", model: "ENV-SENSOR-004",
      project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", room: "综合舱", section: "防火分区",
      pipeline: "低压配电管线", location: "设备间 5",
      vendor: "北京昆仑海岸传感技术有限公司", supplierPhone: "028-86134888", manufacturer: "—",
      manufactureDate: "2026-06-20", deliveryDate: "2026-07-05", installDate: "2026-07-11", acceptDate: "2026-07-10",
      scrapDate: "—", factoryCode: "—", cadCode: "CAD-6128", sourceModule: "人工台账",
      service: "设备运行、巡检及维保服务", online: true, status: "online", time: qualityReportTime,
      lat: 30.4669, lng: 114.4201,
      metrics: [
        { name: "硫化氢", value: 2, unit: "ppm", status: "normal", decimals: 0 },
      ],
    },
    {
      id: "ENV-DEV-005", name: "集水井水位传感器 05", code: "001_ENVINDOOR_0005",
      system: "环境与设备监控", type: "室内环境传感器", brand: "昆仑海岸", model: "ENV-SENSOR-005",
      project: "光谷科学岛综合开发项目", corridor: "科学岛大道综合管廊", room: "综合舱", section: "防火分区",
      pipeline: "低压配电管线", location: "集水井旁",
      vendor: "北京昆仑海岸传感技术有限公司", supplierPhone: "028-86134888", manufacturer: "—",
      manufactureDate: "2026-06-12", deliveryDate: "2026-07-01", installDate: "2026-07-06", acceptDate: "2026-07-05",
      scrapDate: "—", factoryCode: "—", cadCode: "CAD-6105", sourceModule: "人工台账",
      service: "设备运行、巡检及维保服务", online: true, status: "warn", time: qualityReportTime,
      lat: 30.4665, lng: 114.4210,
      metrics: [
        { name: "集水井水位", value: 0.86, unit: "m", status: "warning", decimals: 2 },
      ],
    },
    {
      id: "ENV-DEV-006", name: "电力舱综合环境监测站 06", code: "001_ENVINDOOR_0006",
      system: "环境与设备监控", type: "室内环境传感器", brand: "昆仑海岸", model: "ENV-SENSOR-006",
      project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", room: "电力舱", section: "通风口",
      pipeline: "10kV电力管线", location: "通风口旁",
      vendor: "北京昆仑海岸传感技术有限公司", supplierPhone: "028-86134888", manufacturer: "—",
      manufactureDate: "2026-06-22", deliveryDate: "2026-07-06", installDate: "2026-07-12", acceptDate: "2026-07-11",
      scrapDate: "—", factoryCode: "—", cadCode: "CAD-6106", sourceModule: "人工台账",
      service: "设备运行、巡检及维保服务", online: true, status: "warn", time: qualityReportTime,
      lat: 30.4658, lng: 114.4225,
      metrics: [
        { name: "温度", value: 26.3, unit: "℃", status: "normal", decimals: 1 },
        { name: "湿度", value: 78, unit: "%", status: "normal", decimals: 0 },
        { name: "氧气", value: 19.8, unit: "%VOL", status: "warning", decimals: 1 },
        { name: "甲烷", value: 42, unit: "%LEL", status: "danger", decimals: 0 },
        { name: "硫化氢", value: 2, unit: "ppm", status: "normal", decimals: 0 },
        { name: "集水井水位", value: 0.60, unit: "m", status: "warning", decimals: 2 },
      ],
    },
    {
      id: "ENV-DEV-007", name: "科学岛大道温湿度传感器 07", code: "001_ENVINDOOR_0007",
      system: "环境与设备监控", type: "室内环境传感器", brand: "昆仑海岸", model: "ENV-SENSOR-007",
      project: "光谷科学岛综合开发项目", corridor: "科学岛大道综合管廊", room: "电力舱", section: "防火分区",
      pipeline: "10kV电力管线", location: "设备间 7",
      vendor: "北京昆仑海岸传感技术有限公司", supplierPhone: "028-86134888", manufacturer: "—",
      manufactureDate: "2026-06-10", deliveryDate: "2026-06-28", installDate: "2026-07-03", acceptDate: "2026-07-02",
      scrapDate: "—", factoryCode: "—", cadCode: "CAD-6107", sourceModule: "人工台账",
      service: "设备运行、巡检及维保服务", online: false, status: "offline", time: "2026-09-30 11:14:00",
      lat: 30.4652, lng: 114.4238,
      metrics: [
        { name: "温度", value: 24.1, unit: "℃", status: "offline", decimals: 1 },
        { name: "湿度", value: 70, unit: "%", status: "offline", decimals: 0 },
      ],
    },
    {
      id: "ENV-DEV-008", name: "东区燃气舱硫化氢传感器 08", code: "001_ENVINDOOR_0008",
      system: "环境与设备监控", type: "室内环境传感器", brand: "昆仑海岸", model: "ENV-SENSOR-008",
      project: "科学岛东区管廊延伸工程", corridor: "科学岛东区综合管廊", room: "燃气舱", section: "吊装口",
      pipeline: "燃气管线", location: "吊装口旁",
      vendor: "北京昆仑海岸传感技术有限公司", supplierPhone: "028-86134888", manufacturer: "—",
      manufactureDate: "2026-06-25", deliveryDate: "2026-07-08", installDate: "2026-07-14", acceptDate: "2026-07-13",
      scrapDate: "—", factoryCode: "—", cadCode: "CAD-6108", sourceModule: "人工台账",
      service: "设备运行、巡检及维保服务", online: true, status: "warn", time: qualityReportTime,
      lat: 30.4645, lng: 114.4250,
      metrics: [
        { name: "硫化氢", value: 9, unit: "ppm", status: "warning", decimals: 0 },
        { name: "甲烷", value: 8, unit: "%LEL", status: "normal", decimals: 0 },
      ],
    },
    {
      id: "ENV-DEV-009", name: "综合舱备用监测点 09", code: "001_ENVINDOOR_0009",
      system: "环境与设备监控", type: "室内环境传感器", brand: "昆仑海岸", model: "ENV-SENSOR-009",
      project: "光谷科学岛综合开发项目", corridor: "科学岛大道综合管廊", room: "综合舱", section: "出入口",
      pipeline: "低压配电管线", location: "出入口旁",
      vendor: "北京昆仑海岸传感技术有限公司", supplierPhone: "028-86134888", manufacturer: "—",
      manufactureDate: "2026-06-20", deliveryDate: "2026-07-05", installDate: "2026-07-11", acceptDate: "2026-07-10",
      scrapDate: "—", factoryCode: "—", cadCode: "CAD-6109", sourceModule: "人工台账",
      service: "设备运行、巡检及维保服务", online: true, status: "online", time: qualityReportTime,
      lat: 30.4640, lng: 114.4258,
      metrics: [],
    },
    {
      id: "ENV-DEV-010", name: "投料口枪式摄像机 04", code: "001_VIDEOBULL_0019",
      system: "视频监控系统", type: "枪式摄像机", brand: "海康威视", model: "VIDEO-BULLET-011",
      project: "光谷科学岛综合开发项目", corridor: "科学岛大道综合管廊", room: "综合舱", section: "出入口",
      pipeline: "低压配电管线", location: "设备间 19",
      vendor: "杭州海康威视数字技术股份有限公司", supplierPhone: "027-86186688",
      manufacturer: "杭州海康威视数字技术股份有限公司",
      manufactureDate: "2026-06-20", deliveryDate: "2026-07-05", installDate: "2026-07-11", acceptDate: "2026-07-10",
      scrapDate: "—", factoryCode: "FC-2634", cadCode: "CAD-6226", sourceModule: "第三方同步",
      service: "设备运行、巡检及维保服务", online: true, status: "online", time: qualityReportTime,
      video: true, channel: "CH04", resolution: "1920×1080", ptz: true,
      poster: "../../assets/images/corridor-monitor.jpg",
      lat: 30.4672, lng: 114.4195,
      metrics: [],
    },
  ];

  const qualityLocationTree = qualitySpatialTree;

  const qualityMetrics = [
    { id: "ENV-AIR-001", name: "温度", device: "一号舱温湿度传感器 01", deviceCode: "TH-0101", metric: "温度", zone: "一号舱 · 东段", value: "26.4", unit: "℃", threshold: "5 ~ 35 ℃", status: "normal", time: "刚刚", icon: "fa-temperature-half", note: "温度处于舒适运行区间。" },
    { id: "ENV-AIR-002", name: "甲烷浓度", device: "一号舱可燃气体探测器 03", deviceCode: "CH4-0103", metric: "甲烷", zone: "一号舱 · 西段", value: "42", unit: "%LEL", threshold: "≤ 25 %LEL", status: "danger", time: "12 秒前", icon: "fa-cloud", note: "甲烷浓度超过预警阈值。" },
    { id: "ENV-AIR-003", name: "氧气浓度", device: "二号舱气体检测仪 02", deviceCode: "O2-0202", metric: "氧气", zone: "二号舱 · 东段", value: "19.8", unit: "%VOL", threshold: "19.5 ~ 23.5", status: "normal", time: "刚刚", icon: "fa-wind", note: "氧气浓度正常。" },
    { id: "ENV-AIR-004", name: "硫化氢", device: "二号舱有毒气体探测器 01", deviceCode: "H2S-0201", metric: "硫化氢", zone: "二号舱 · 西段", value: "8", unit: "ppm", threshold: "≤ 10 ppm", status: "warning", time: "20 秒前", icon: "fa-skull-crossbones", note: "硫化氢接近阈值上限。" },
    { id: "ENV-AIR-005", name: "湿度", device: "一号舱温湿度传感器 01", deviceCode: "TH-0101", metric: "湿度", zone: "一号舱 · 东段", value: "58", unit: "%RH", threshold: "30 ~ 80 %RH", status: "normal", time: "刚刚", icon: "fa-droplet", note: "湿度正常。" },
    { id: "ENV-WATER-001", name: "集水井水位", device: "一号舱集水井液位计 01", deviceCode: "LVL-0101", metric: "水位", zone: "一号舱 · 东段", value: "0.60", unit: "m", threshold: "≤ 0.80 m", status: "warning", time: "5 秒前", icon: "fa-water", note: "水位达到预警线。" },
  ];

  /* 附属设备状态监视：通风 / 排水 / 照明 / 供配电；power、run 为空时列表展示 "-" */
  const devices = [
    {
      id: "MEC-VENT-01", name: "管道轴流风机", code: "C01_ENVFAN00_0001",
      system: "环境监测", type: "通风设备",
      project: "科学岛财富中心", corridor: "1号综合管廊", room: "电力舱", section: "A区段",
      pipeline: "10kV电力管线", location: "设备间 1", smart: "是", sourceModule: "人工台账",
      power: "on", run: "running", controlMode: "localAuto", time: "2026-10-13 14:58:12",
      note: "综合舱主通风设备，自动模式运行中。",
    },
    {
      id: "MEC-PUMP-01", name: "自动排水泵", code: "C01_ENVPUMP_0002",
      system: "环境监测", type: "排水泵",
      project: "科学岛财富中心", corridor: "1号综合管廊", room: "给排水舱", section: "北区段",
      pipeline: "给水管线", location: "集水井旁", smart: "是", sourceModule: "人工台账",
      power: "on", run: "fault", controlMode: "localAuto", time: "2026-10-13 14:52:40",
      note: "过载保护故障。",
    },
    {
      id: "MEC-LIGHT-01", name: "舱内 LED 照明灯", code: "C01_PWRLIGHT_0003",
      system: "电力监测平台", type: "照明设备",
      project: "科学岛财富中心", corridor: "1号综合管廊", room: "综合舱", section: "A区段",
      pipeline: "照明管线", location: "设备间 3", smart: "是", sourceModule: "第三方同步",
      power: "on", run: "running", controlMode: "localManual", time: "2026-10-13 14:57:08",
      note: "管廊常规照明回路。",
    },
    {
      id: "MEC-PWR-01", name: "低压配电柜", code: "C01_PWRCAB00_0004",
      system: "电力监测平台", type: "供配电",
      project: "科学岛财富中心", corridor: "1号综合管廊", room: "电力舱", section: "B区段",
      pipeline: "低压配电管线", location: "设备间 4", smart: "是", sourceModule: "人工台账",
      power: "on", run: "running", controlMode: "remote", time: "2026-10-13 14:56:33",
      note: "电力舱低压配电设备。",
    },
    {
      id: "MEC-VENT-02", name: "2# 排风机", code: "C01_ENVFAN00_0005",
      system: "环境监测", type: "通风设备",
      project: "科学岛财富中心", corridor: "2号综合管廊", room: "综合舱", section: "东区段",
      pipeline: "低压配电管线", location: "通风口旁", smart: "是", sourceModule: "人工台账",
      power: "on", run: "stopped", controlMode: "remote", time: "2026-10-13 14:55:01",
      note: "远程模式，当前停止。",
    },
    {
      id: "MEC-LIGHT-02", name: "应急照明控制箱", code: "C01_PWRLIGHT_0006",
      system: "电力监测平台", type: "照明设备",
      project: "厦门科学岛", corridor: "滨海管廊", room: "给排水舱", section: "北区段",
      pipeline: "照明管线", location: "设备间 6", smart: "否", sourceModule: "人工台账",
      power: "off", run: "stopped", controlMode: "localAuto", time: "2026-10-13 14:40:22",
      note: "回路失电，处于停止。",
    },
    {
      id: "MEC-PWR-02", name: "高压配电柜 01", code: "C01_PWRCAB00_0007",
      system: "电力监测平台", type: "供配电",
      project: "科学岛财富中心", corridor: "1号综合管廊", room: "电力舱", section: "A区段",
      pipeline: "10kV电力管线", location: "设备间 7", smart: "是", sourceModule: "第三方同步",
      power: "", run: "", controlMode: "remote", time: "2026-10-13 14:30:00",
      note: "第三方通道暂未回传电源与运行状态。",
    },
    {
      id: "MEC-PUMP-02", name: "1# 集水井排水泵", code: "C01_ENVPUMP_0008",
      system: "环境监测", type: "排水泵",
      project: "科学岛财富中心", corridor: "1号综合管廊", room: "给排水舱", section: "A区段",
      pipeline: "雨水管线", location: "集水井旁", smart: "是", sourceModule: "人工台账",
      power: "on", run: "running", controlMode: "localAuto", time: "2026-10-13 14:59:05",
      note: "液位联动自动排水。",
    },
  ];

  const keyParams = [
    { id: "ENV-WATER-001", name: "集水井水位", device: "一号舱集水井液位计 01", zone: "一号舱 · 东段", value: "0.60", unit: "m", threshold: "≤ 0.80 m", status: "warning", time: "5 秒前" },
    { id: "ENV-WATER-002", name: "集水井水位", device: "二号舱集水井液位计 01", zone: "二号舱 · 东段", value: "0.42", unit: "m", threshold: "≤ 0.80 m", status: "normal", time: "刚刚" },
  ];

  const linkageRecords = [
    {
      id: "LNK-001",
      name: "甲烷超限强制通风",
      code: "LNK-20261012-001",
      type: "环境自动处置",
      result: "成功",
      startTime: "2026-10-12 10:18:22",
      endTime: "2026-10-12 10:19:05",
      sendTime: "2026-10-12 10:18:20",
      alarmId: "ALM-1002",
      items: [
        {
          system: "环境监测", deviceName: "1# 排风机", deviceCode: "FAN-0101",
          trigger: "一号舱 · 西段 甲烷 ≥ 25%LEL", action: "启动 1# 排风机强制通风",
          result: "成功", startTime: "2026-10-12 10:18:22", endTime: "2026-10-12 10:19:05", sendTime: "2026-10-12 10:18:20",
        },
      ],
    },
    {
      id: "LNK-002",
      name: "集水井高水位自动排水",
      code: "LNK-20261012-002",
      type: "环境自动处置",
      result: "成功",
      startTime: "2026-10-12 09:55:10",
      endTime: "2026-10-12 09:56:40",
      sendTime: "2026-10-12 09:55:08",
      alarmId: "ALM-1005",
      items: [
        {
          system: "环境监测", deviceName: "1# 集水井排水泵", deviceCode: "PMP-0101",
          trigger: "一号舱 · 东段 集水井水位 ≥ 0.55 m", action: "启动排水泵",
          result: "成功", startTime: "2026-10-12 09:55:10", endTime: "2026-10-12 09:56:40", sendTime: "2026-10-12 09:55:08",
        },
      ],
    },
    {
      id: "LNK-003",
      name: "火灾分区联锁处置",
      code: "LNK-20261012-003",
      type: "跨系统协同",
      result: "部分成功",
      startTime: "2026-10-12 08:40:03",
      endTime: "2026-10-12 08:41:18",
      sendTime: "2026-10-12 08:40:00",
      alarmId: "ALM-FIRE-01",
      items: [
        {
          system: "火灾报警系统", deviceName: "1# 排风机", deviceCode: "FAN-0101",
          trigger: "火灾报警分区 F0103", action: "关闭通风",
          result: "成功", startTime: "2026-10-12 08:40:03", endTime: "2026-10-12 08:40:28", sendTime: "2026-10-12 08:40:00",
        },
        {
          system: "电力监测平台", deviceName: "应急照明回路 02", deviceCode: "ELGT-0102",
          trigger: "火灾报警分区 F0103", action: "启动应急照明",
          result: "失败", startTime: "2026-10-12 08:40:05", endTime: "2026-10-12 08:41:18", sendTime: "2026-10-12 08:40:00",
        },
        {
          system: "视频监控系统", deviceName: "综合舱枪式摄像机 01", deviceCode: "001_VIDEOBULL_0001",
          trigger: "火灾报警分区 F0103", action: "调取分区实时视频",
          result: "成功", startTime: "2026-10-12 08:40:06", endTime: "2026-10-12 08:40:12", sendTime: "2026-10-12 08:40:00",
        },
      ],
    },
    {
      id: "LNK-004",
      name: "门禁异常区域视频复核",
      code: "LNK-20261012-004",
      type: "跨系统协同",
      result: "失败",
      startTime: "2026-10-12 07:12:40",
      endTime: "2026-10-12 07:13:02",
      sendTime: "2026-10-12 07:12:38",
      alarmId: "",
      items: [
        {
          system: "门禁系统", deviceName: "东出入口门禁控制器", deviceCode: "ACS-EAST-01",
          trigger: "非法刷卡连续 3 次", action: "锁定门禁通道",
          result: "失败", startTime: "2026-10-12 07:12:40", endTime: "2026-10-12 07:13:02", sendTime: "2026-10-12 07:12:38",
        },
        {
          system: "视频监控系统", deviceName: "东出入口球型摄像机", deviceCode: "CAM-EAST-02",
          trigger: "非法刷卡连续 3 次", action: "推送实时画面",
          result: "失败", startTime: "2026-10-12 07:12:41", endTime: "2026-10-12 07:13:00", sendTime: "2026-10-12 07:12:38",
        },
      ],
    },
  ];

  const alarmRecords = [
    { id: "ALM-1002", time: "2026-10-12 10:18:05", level: "danger", type: "超限", object: "甲烷浓度", zone: "一号舱 · 西段", value: "42 %LEL", threshold: "≤ 25 %LEL", status: "未恢复", recoveredAt: "", note: "可燃气体超限。", linkageId: "LNK-001" },
    { id: "ALM-1004", time: "2026-10-12 10:05:40", level: "warning", type: "超限", object: "硫化氢", zone: "二号舱 · 西段", value: "8 ppm", threshold: "≤ 10 ppm", status: "未恢复", recoveredAt: "", note: "接近阈值。", linkageId: "" },
    { id: "ALM-1005", time: "2026-10-12 09:54:58", level: "warning", type: "超限", object: "集水井水位", zone: "一号舱 · 东段", value: "0.60 m", threshold: "≤ 0.80 m", status: "已恢复", recoveredAt: "2026-10-12 10:02:11", note: "水位回落。", linkageId: "LNK-002" },
    { id: "ALM-2001", time: "2026-10-12 09:12:00", level: "danger", type: "故障", object: "2# 集水井排水泵", zone: "二号舱 · 东段", value: "故障", threshold: "运行 / 停止", status: "未恢复", recoveredAt: "", note: "过载保护。", linkageId: "" },
    { id: "ALM-3001", time: "2026-10-12 08:20:00", level: "warning", type: "离线", object: "配电柜通信网关", zone: "二号舱 · 西段", value: "离线", threshold: "在线", status: "未恢复", recoveredAt: "", note: "链路中断。", linkageId: "" },
  ];

  const powerSummary = {
    transformerTemp: "68.2 ℃",
    upsStatus: "市电供电 · 电池 100%",
    href: "../monitoring/power-monitoring.html?view=overview",
  };

  const zoneMatrix = [
    { zone: "一号舱 · 东段", o2: "20.6", temp: "26.4", humidity: "58", ch4: "3", h2s: "1", level: "0.60", status: "warning" },
    { zone: "一号舱 · 西段", o2: "20.4", temp: "27.1", humidity: "61", ch4: "42", h2s: "2", level: "0.31", status: "danger" },
    { zone: "二号舱 · 东段", o2: "19.8", temp: "25.8", humidity: "55", ch4: "2", h2s: "3", level: "0.42", status: "normal" },
    { zone: "二号舱 · 西段", o2: "20.1", temp: "26.0", humidity: "57", ch4: "4", h2s: "8", level: "0.28", status: "warning" },
  ];

  const controlRecords = [
    {
      id: 1,
      operator: "值班员甲",
      time: "2026-10-26 09:20:11",
      action: "启动通风设备",
      system: "环境监测",
      category: "通风设备",
      device: "管道轴流风机",
      deviceCode: "C01_ENVFAN00_0001",
    },
    {
      id: 2,
      operator: "值班员乙",
      time: "2026-10-26 08:45:22",
      action: "启动排水泵",
      system: "环境监测",
      category: "排水泵",
      device: "1# 集水井排水泵",
      deviceCode: "C01_ENVPUMP_0008",
    },
    {
      id: 3,
      operator: "管理员",
      time: "2026-10-25 18:10:03",
      action: "点亮照明设备",
      system: "电力监测平台",
      category: "照明设备",
      device: "舱内 LED 照明灯",
      deviceCode: "C01_PWRLIGHT_0003",
    },
  ];

  window.ENVIRONMENT_DATA = {
    statusText, runText, powerText, modeText,
    qualityLocationTree, qualitySpatialTree, qualityDevices, qualityMetrics, qualityReportTime,
    devices, keyParams, linkageRecords, alarmRecords, powerSummary, zoneMatrix,
    controlRecords,
  };
})(window);
