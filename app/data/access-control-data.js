(function () {
  window.ACCESS_CONTROL_DATA = {
    personnel: [
      { id:"P001", name:"张建国", type:"管廊运维员", company:"科学岛管廊运维中心", department:"运行一部", phone:"138****6201", credentialTypes:["门禁卡","人脸"], credentials:{ "门禁卡":"AC-2026-0018", "人脸":"已上传人脸照片" }, validUntil:"2027-12-31 23:59", status:"正常", groups:"日常运维组" },
      { id:"P002", name:"李娜", type:"管线单位检修员", company:"中科电力服务公司", department:"电力检修部", phone:"139****1452", credentialTypes:["门禁卡"], credentials:{ "门禁卡":"AC-2026-0041" }, validUntil:"2026-12-31 23:59", status:"正常", groups:"电力舱检修组" },
      { id:"P003", name:"王浩", type:"临时访客", company:"华东设计院", department:"项目组", phone:"186****3098", credentialTypes:["二维码"], credentials:{ "二维码":"已上传二维码" }, validUntil:"2026-10-12 18:00", status:"正常", groups:"临时访客组" },
      { id:"P004", name:"赵强", type:"其他人员", company:"润洁物业", department:"保洁班组", phone:"135****7719", credentialTypes:["门禁卡"], credentials:{ "门禁卡":"AC-2026-0066" }, validUntil:"2027-06-30 23:59", status:"正常", groups:"后勤服务组" },
      { id:"P005", name:"陈志远", type:"管线单位检修员", company:"华通通信工程", department:"通信组", phone:"137****2250", credentialTypes:["人脸"], credentials:{ "人脸":"已上传人脸照片" }, validUntil:"2026-09-30 23:59", status:"已停用", groups:"-" }
    ],
    schedules: [
      { id:"SCH001", name:"工作日全天", repeat:"每周", weekdays:["周一","周二","周三","周四","周五"], monthDays:[], startTime:"00:00", endTime:"23:59", status:"启用" },
      { id:"SCH002", name:"检修标准时段", repeat:"每周", weekdays:["周一","周二","周三","周四","周五","周六"], monthDays:[], startTime:"08:00", endTime:"18:00", status:"启用" },
      { id:"SCH003", name:"每日夜间检修", repeat:"每日", weekdays:[], monthDays:[], startTime:"18:00", endTime:"23:30", status:"启用" },
      { id:"SCH004", name:"月度巡检日", repeat:"每月", weekdays:[], monthDays:[1,15], startTime:"09:00", endTime:"17:00", status:"停用" }
    ],
    groups: [
      { id:"G001", name:"日常运维组", memberIds:["P001"], doorIds:["ACS-F0101-01","ACS-F0101-02","ACS-UG-01"], scheduleId:"SCH001", status:"启用" },
      { id:"G002", name:"电力舱检修组", memberIds:["P002"], doorIds:["ACS-F0203-02"], scheduleId:"SCH002", status:"启用" },
      { id:"G003", name:"临时访客组", memberIds:["P003"], doorIds:["ACS-F0101-01"], scheduleId:"SCH002", status:"启用" },
      { id:"G004", name:"后勤服务组", memberIds:["P004"], doorIds:["ACS-B2-05","ACS-UG-01"], scheduleId:"SCH003", status:"停用" }
    ],
    grants: [
      { id:"GR001", personId:"P002", person:"李娜", doorIds:["ACS-F0203-02"], start:"2026-10-12 08:00", end:"2026-10-15 20:00", reason:"电缆接头检修", status:"生效中" },
      { id:"GR002", personId:"P003", person:"王浩", doorIds:["ACS-F0101-01"], start:"2026-10-12 09:00", end:"2026-10-12 18:00", reason:"项目现场勘查", status:"生效中" },
      { id:"GR003", personId:"P005", person:"陈志远", doorIds:["ACS-F0302-01"], start:"2026-06-01 08:00", end:"2026-09-30 18:00", reason:"通信设备巡检", status:"已到期" }
    ],
    blacklist: [
      { name:"刘某", type:"离职人员", phone:"136****9091", company:"原管廊运维中心", department:"运行二部", reason:"离职凭证未回收", start:"2026-09-18 09:00", end:"长期", status:"生效中", creator:"管理员" },
      { name:"周某", type:"外单位人员", phone:"189****5207", company:"星联施工服务", department:"施工组", reason:"违规进入限制区域", start:"2026-10-01 00:00", end:"2026-12-31 23:59", status:"生效中", creator:"安全主管" },
      { name:"孙某", type:"临时访客", phone:"158****3316", company:"东华项目咨询", department:"项目部", reason:"证件信息核验异常", start:"2026-08-05 10:30", end:"2026-09-05 10:30", status:"已失效", creator:"值班员" }
    ],
    devices: [
      { id:"ACS-F0101-01", name:"北区主入口门禁", area:"高新大道综合管廊", location:"F0101 北区主入口", door:"关闭", online:"在线", heartbeat:"3 秒前", lastPass:"2026-10-12 15:46:42", today:126, abnormal:1, camera:"北区入口摄像机 01" },
      { id:"ACS-F0203-02", name:"电力舱检修口", area:"高新大道综合管廊", location:"F0203 电力舱", door:"开启", online:"在线", heartbeat:"5 秒前", lastPass:"2026-10-12 15:44:11", today:58, abnormal:0, camera:"电力舱摄像机 06" },
      { id:"ACS-F0302-01", name:"通信舱东侧门禁", area:"云水路综合管廊", location:"F0302 通信舱", door:"未知", online:"离线", heartbeat:"42 分钟前", lastPass:"2026-10-12 14:32:08", today:31, abnormal:2, camera:"通信舱摄像机 03" },
      { id:"ACS-B2-05", name:"B2 消防门5号", area:"科学岛地下管廊", location:"B2 生活水泵房东南侧", door:"关闭", online:"故障", heartbeat:"8 分钟前", lastPass:"2026-10-12 15:40:44", today:19, abnormal:3, camera:"B2 水泵房摄像机 02" }
    ],
    deviceSpatialTree: [
      {
        name: "光谷科学岛综合开发项目",
        corridors: [
          {
            name: "高新大道综合管廊",
            cabins: [
              { name: "综合舱", sections: ["出入口", "防火分区"] },
              { name: "电力舱", sections: ["检修口", "防火分区"] },
            ],
          },
          {
            name: "云水路综合管廊",
            cabins: [
              { name: "通信舱", sections: ["东侧", "西侧"] },
            ],
          },
        ],
      },
      {
        name: "科学岛地下管廊工程",
        corridors: [
          {
            name: "科学岛地下管廊",
            cabins: [
              { name: "给排水舱", sections: ["水泵房"] },
              { name: "综合舱", sections: ["出入口"] },
            ],
          },
        ],
      },
    ],
    monitorDevices: [
      {
        id: "ACS-F0101-01", name: "北区主入口门禁", code: "ACS-F0101-01",
        system: "门禁系统", type: "门禁控制器", brand: "中控智慧", model: "ACS-CTRL-001",
        project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", room: "综合舱", section: "出入口",
        pipeline: "—", location: "F0101 北区主入口", lat: 30.4684, lng: 114.4165,
        vendor: "中控智慧科技股份有限公司", supplierPhone: "0571-89776060", manufacturer: "中控智慧",
        manufactureDate: "2025-11-20", deliveryDate: "2025-12-08", installDate: "2026-01-15", acceptDate: "2026-01-20",
        scrapDate: "—", factoryCode: "ZK-ACS-1101", cadCode: "CAD-ACS-0101", sourceModule: "人工台账",
        service: "门禁通行与权限控制", camera: "北区入口摄像机 01", lastPass: "2026-10-12 15:46:42",
        online: true, status: "online", time: "2026-10-12 15:48:00",
        metrics: [
          { name: "门状态", value: "关闭", unit: "", status: "normal" },
          { name: "设备状态", value: "在线", unit: "", status: "normal" },
          { name: "今日通行", value: 126, unit: "次", status: "normal", decimals: 0 },
          { name: "今日异常", value: 1, unit: "次", status: "warning", decimals: 0 },
        ],
      },
      {
        id: "ACS-F0101-02", name: "南区主入口门禁", code: "ACS-F0101-02",
        system: "门禁系统", type: "门禁控制器", brand: "中控智慧", model: "ACS-CTRL-001B",
        project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", room: "综合舱", section: "出入口",
        pipeline: "—", location: "F0101 南区主入口", lat: 30.4682, lng: 114.4167,
        vendor: "中控智慧科技股份有限公司", supplierPhone: "0571-89776060", manufacturer: "中控智慧",
        manufactureDate: "2025-11-20", deliveryDate: "2025-12-08", installDate: "2026-01-15", acceptDate: "2026-01-20",
        scrapDate: "—", factoryCode: "ZK-ACS-1101B", cadCode: "CAD-ACS-0101B", sourceModule: "人工台账",
        service: "门禁通行与权限控制", camera: "南区入口摄像机 01", lastPass: "2026-10-12 15:40:18",
        online: true, status: "online", time: "2026-10-12 15:46:20",
        metrics: [
          { name: "门状态", value: "关闭", unit: "", status: "normal" },
          { name: "设备状态", value: "在线", unit: "", status: "normal" },
          { name: "今日通行", value: 98, unit: "次", status: "normal", decimals: 0 },
          { name: "今日异常", value: 0, unit: "次", status: "normal", decimals: 0 },
        ],
      },
      {
        id: "ACS-F0101-03", name: "出入口侧门门禁", code: "ACS-F0101-03",
        system: "门禁系统", type: "门禁控制器", brand: "海康威视", model: "DS-K2604",
        project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", room: "综合舱", section: "出入口",
        pipeline: "—", location: "F0101 出入口侧门", lat: 30.4681, lng: 114.4169,
        vendor: "杭州海康威视数字技术股份有限公司", supplierPhone: "400-700-5998", manufacturer: "海康威视",
        manufactureDate: "2025-10-18", deliveryDate: "2025-11-08", installDate: "2026-01-16", acceptDate: "2026-01-21",
        scrapDate: "—", factoryCode: "HK-ACS-0103", cadCode: "CAD-ACS-0103", sourceModule: "人工台账",
        service: "门禁通行与权限控制", camera: "出入口侧门摄像机 01", lastPass: "2026-10-12 15:21:06",
        online: true, status: "warn", time: "2026-10-12 15:45:10",
        metrics: [
          { name: "门状态", value: "开启", unit: "", status: "warning" },
          { name: "设备状态", value: "在线", unit: "", status: "normal" },
          { name: "今日通行", value: 42, unit: "次", status: "normal", decimals: 0 },
          { name: "今日异常", value: 2, unit: "次", status: "warning", decimals: 0 },
        ],
      },
      {
        id: "ACS-F0203-02", name: "电力舱检修口", code: "ACS-F0203-02",
        system: "门禁系统", type: "门禁控制器", brand: "中控智慧", model: "ACS-CTRL-002",
        project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", room: "电力舱", section: "检修口",
        pipeline: "—", location: "F0203 电力舱", lat: 30.4678, lng: 114.4188,
        vendor: "中控智慧科技股份有限公司", supplierPhone: "0571-89776060", manufacturer: "中控智慧",
        manufactureDate: "2025-11-18", deliveryDate: "2025-12-08", installDate: "2026-01-16", acceptDate: "2026-01-21",
        scrapDate: "—", factoryCode: "ZK-ACS-1102", cadCode: "CAD-ACS-0203", sourceModule: "人工台账",
        service: "门禁通行与权限控制", camera: "电力舱摄像机 06", lastPass: "2026-10-12 15:44:11",
        online: true, status: "warn", time: "2026-10-12 15:47:55",
        metrics: [
          { name: "门状态", value: "开启", unit: "", status: "warning" },
          { name: "设备状态", value: "在线", unit: "", status: "normal" },
          { name: "今日通行", value: 58, unit: "次", status: "normal", decimals: 0 },
          { name: "今日异常", value: 0, unit: "次", status: "normal", decimals: 0 },
        ],
      },
      {
        id: "ACS-F0302-01", name: "通信舱东侧门禁", code: "ACS-F0302-01",
        system: "门禁系统", type: "门禁控制器", brand: "海康威视", model: "DS-K2604",
        project: "光谷科学岛综合开发项目", corridor: "云水路综合管廊", room: "通信舱", section: "东侧",
        pipeline: "—", location: "F0302 通信舱", lat: 30.4669, lng: 114.4201,
        vendor: "杭州海康威视数字技术股份有限公司", supplierPhone: "400-700-5998", manufacturer: "海康威视",
        manufactureDate: "2025-10-12", deliveryDate: "2025-11-01", installDate: "2025-12-20", acceptDate: "2025-12-28",
        scrapDate: "—", factoryCode: "HK-ACS-3301", cadCode: "CAD-ACS-0302", sourceModule: "人工台账",
        service: "门禁通行与权限控制", camera: "通信舱摄像机 03", lastPass: "2026-10-12 14:32:08",
        online: false, status: "offline", time: "2026-10-12 14:35:00", lastOnline: "2026-10-12 14:35:00",
        metrics: [
          { name: "门状态", value: "未知", unit: "", status: "danger" },
          { name: "设备状态", value: "离线", unit: "", status: "danger" },
          { name: "今日通行", value: 31, unit: "次", status: "normal", decimals: 0 },
          { name: "今日异常", value: 2, unit: "次", status: "warning", decimals: 0 },
        ],
      },
      {
        id: "ACS-B2-05", name: "B2 消防门5号", code: "ACS-B2-05",
        system: "门禁系统", type: "读卡器", brand: "中控智慧", model: "ACS-READ-005",
        project: "科学岛地下管廊工程", corridor: "科学岛地下管廊", room: "给排水舱", section: "水泵房",
        pipeline: "—", location: "B2 生活水泵房东南侧", lat: 30.4658, lng: 114.4225,
        vendor: "中控智慧科技股份有限公司", supplierPhone: "0571-89776060", manufacturer: "中控智慧",
        manufactureDate: "2025-09-08", deliveryDate: "2025-10-02", installDate: "2025-11-12", acceptDate: "2025-11-18",
        scrapDate: "—", factoryCode: "ZK-ACS-2205", cadCode: "CAD-ACS-B205", sourceModule: "人工台账",
        service: "门禁通行与权限控制", camera: "B2 水泵房摄像机 02", lastPass: "2026-10-12 15:40:44",
        online: true, status: "warn", time: "2026-10-12 15:40:00",
        metrics: [
          { name: "门状态", value: "关闭", unit: "", status: "normal" },
          { name: "设备状态", value: "故障", unit: "", status: "danger" },
          { name: "今日通行", value: 19, unit: "次", status: "normal", decimals: 0 },
          { name: "今日异常", value: 3, unit: "次", status: "warning", decimals: 0 },
        ],
      },
      {
        id: "ACS-F0101-02", name: "综合舱西侧读卡器", code: "ACS-F0101-02",
        system: "门禁系统", type: "读卡器", brand: "中控智慧", model: "ACS-READ-002",
        project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", room: "综合舱", section: "防火分区",
        pipeline: "—", location: "综合舱西段防火分区", lat: 30.4680, lng: 114.4176,
        vendor: "中控智慧科技股份有限公司", supplierPhone: "0571-89776060", manufacturer: "中控智慧",
        manufactureDate: "2025-11-22", deliveryDate: "2025-12-10", installDate: "2026-01-18", acceptDate: "2026-01-22",
        scrapDate: "—", factoryCode: "ZK-ACS-1103", cadCode: "CAD-ACS-0102", sourceModule: "人工台账",
        service: "门禁通行与权限控制", camera: "综合舱西段摄像机 04", lastPass: "2026-10-12 15:20:18",
        online: true, status: "online", time: "2026-10-12 15:48:10",
        metrics: [
          { name: "门状态", value: "关闭", unit: "", status: "normal" },
          { name: "设备状态", value: "在线", unit: "", status: "normal" },
          { name: "今日通行", value: 74, unit: "次", status: "normal", decimals: 0 },
          { name: "今日异常", value: 0, unit: "次", status: "normal", decimals: 0 },
        ],
      },
      {
        id: "ACS-UG-01", name: "地下管廊主入口门禁", code: "ACS-UG-01",
        system: "门禁系统", type: "门禁控制器", brand: "海康威视", model: "DS-K2602",
        project: "科学岛地下管廊工程", corridor: "科学岛地下管廊", room: "综合舱", section: "出入口",
        pipeline: "—", location: "地下管廊主入口", lat: 30.4652, lng: 114.4238,
        vendor: "杭州海康威视数字技术股份有限公司", supplierPhone: "400-700-5998", manufacturer: "海康威视",
        manufactureDate: "2025-08-16", deliveryDate: "2025-09-01", installDate: "2025-10-08", acceptDate: "2025-10-15",
        scrapDate: "—", factoryCode: "HK-ACS-4401", cadCode: "CAD-ACS-UG01", sourceModule: "人工台账",
        service: "门禁通行与权限控制", camera: "地下主入口摄像机 01", lastPass: "2026-10-12 15:10:33",
        online: true, status: "online", time: "2026-10-12 15:47:40",
        metrics: [
          { name: "门状态", value: "关闭", unit: "", status: "normal" },
          { name: "设备状态", value: "在线", unit: "", status: "normal" },
          { name: "今日通行", value: 42, unit: "次", status: "normal", decimals: 0 },
          { name: "今日异常", value: 0, unit: "次", status: "normal", decimals: 0 },
        ],
      },
      {
        id: "ACS-CAM-NORTH-01", name: "北区入口摄像机 01", code: "ACS-CAM-NORTH-01",
        system: "视频监控系统", type: "枪式摄像机", brand: "海康威视", model: "VIDEO-BULLET-011",
        project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", room: "综合舱", section: "出入口",
        pipeline: "—", location: "F0101 北区主入口", lat: 30.4686, lng: 114.4160,
        vendor: "杭州海康威视数字技术股份有限公司", supplierPhone: "400-700-5998", manufacturer: "海康威视",
        manufactureDate: "2025-11-10", deliveryDate: "2025-12-01", installDate: "2026-01-14", acceptDate: "2026-01-20",
        scrapDate: "—", factoryCode: "HK-CAM-1101", cadCode: "CAD-ACS-CAM-01", sourceModule: "第三方同步",
        service: "门禁出入口视频复核", camera: "—", lastPass: "—",
        online: true, status: "online", time: "2026-10-12 15:48:00",
        video: true, channel: "CH01", resolution: "1920×1080", ptz: false,
        poster: "../../assets/images/corridor-monitor.jpg",
        metrics: [],
      },
    ],
    records: [
      { name:"张建国", personType:"管廊运维员", org:"运维中心 / 运行一部", credential:"人脸", credentialNo:"FACE-0018", device:"北区主入口门禁", location:"F0101 北区主入口", time:"2026-10-12 15:46:42", direction:"进门", result:"成功", reason:"-" },
      { name:"王浩", personType:"临时访客", org:"华东设计院 / 项目组", credential:"二维码", credentialNo:"VIS-1012-008", device:"北区主入口门禁", location:"F0101 北区主入口", time:"2026-10-12 15:45:16", direction:"进门", result:"成功", reason:"-" },
      { name:"刘某", personType:"管廊运维员", org:"原运维中心 / 运行二部", credential:"门禁卡", credentialNo:"AC-2025-0021", device:"北区主入口门禁", location:"F0101 北区主入口", time:"2026-10-12 15:43:31", direction:"进门", result:"失败", reason:"黑名单人员" },
      { name:"李娜", personType:"管线单位检修员", org:"中科电力 / 电力检修部", credential:"门禁卡", credentialNo:"AC-2026-0041", device:"电力舱检修口", location:"F0203 电力舱", time:"2026-10-12 15:41:08", direction:"出门", result:"成功", reason:"-" },
      { name:"未识别人员", personType:"未知", org:"-", credential:"人脸", credentialNo:"-", device:"B2 消防门5号", location:"B2 生活水泵房", time:"2026-10-12 15:39:44", direction:"进门", result:"失败", reason:"无有效授权" },
      { name:"赵强", personType:"其他人员", org:"润洁物业 / 保洁班组", credential:"门禁卡", credentialNo:"AC-2026-0066", device:"通信舱东侧门禁", location:"F0302 通信舱", time:"2026-10-12 15:36:20", direction:"进门", result:"失败", reason:"非授权时段" }
    ],
    alarms: [
      { id:"AC-A-20261012-018", type:"黑名单命中", level:"告警", person:"刘某", device:"北区主入口门禁", location:"F0101 北区主入口", time:"2026-10-12 15:43:31", status:"未处理", camera:"北区入口摄像机 01", detail:"黑名单人员使用未回收门禁卡尝试进入" },
      { id:"AC-A-20261012-017", type:"无权限通行", level:"预警", person:"未识别人员", device:"B2 消防门5号", location:"B2 生活水泵房", time:"2026-10-12 15:39:44", status:"已确认", camera:"B2 水泵房摄像机 02", detail:"未识别人脸尝试通行，系统已拒绝" },
      { id:"AC-A-20261012-016", type:"门超时未关", level:"告警", person:"-", device:"电力舱检修口", location:"F0203 电力舱", time:"2026-10-12 15:32:10", status:"处理中", camera:"电力舱摄像机 06", detail:"门状态持续开启超过 120 秒" },
      { id:"AC-A-20261012-015", type:"设备离线", level:"预警", person:"-", device:"通信舱东侧门禁", location:"F0302 通信舱", time:"2026-10-12 15:04:22", status:"已处理", camera:"通信舱摄像机 03", detail:"门禁控制器连续 3 次心跳超时" }
    ],
    controlRecords: [
      {
        id: 1,
        operator: "值班员甲",
        time: "2026-10-26 09:40:11",
        action: "远程开门",
        system: "门禁系统",
        category: "门禁控制器",
        device: "北区主入口门禁",
        deviceCode: "ACS-F0101-01",
      },
      {
        id: 2,
        operator: "值班员乙",
        time: "2026-10-26 09:12:22",
        action: "常开",
        system: "门禁系统",
        category: "门禁控制器",
        device: "电力舱检修口",
        deviceCode: "ACS-F0203-02",
      },
      {
        id: 3,
        operator: "管理员",
        time: "2026-10-25 18:05:03",
        action: "锁定",
        system: "门禁系统",
        category: "门禁控制器",
        device: "南区主入口门禁",
        deviceCode: "ACS-F0101-02",
      },
    ],
  };
})();
