(function (global) {
  // 基于报警中心口径扩展，补充空间归属与处理方式，供异常预警分析聚合
  const alarms = [
    { id: 1, device: "配电室网关-01", deviceCode: "PWR-GW-01", system: "电力监测平台", category: "供配电", type: "设备离线", level: "告警", time: "2026-10-07 09:42:16", status: "未处理", project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", room: "电力舱", section: "防火分区", handleMethod: "" },
    { id: 2, device: "冷水机组-01", deviceCode: "MEC-CH-01", system: "电力监测平台", category: "供配电", type: "设备属性", level: "预警", time: "2026-10-07 09:18:42", status: "处理中", project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", room: "综合舱", section: "出入口", process: { workOrderNo: "WO20261007002" }, handleMethod: "转工单" },
    { id: 3, device: "集水井排水泵-02", deviceCode: "PMP-UG-02", system: "环境监测", category: "排水泵", type: "设备属性", level: "提醒", time: "2026-10-07 08:56:30", status: "已处理", project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", room: "综合舱", section: "防火分区", process: { workOrderNo: "WO20261007003" }, closeReason: "告警已解决", handleMethod: "转工单" },
    { id: 4, device: "消防水箱液位计", deviceCode: "FIRE-LVL-01", system: "消防监控系统", category: "消防设备", type: "设备属性", level: "告警", time: "2026-10-06 22:11:08", status: "未处理", project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", room: "综合舱", section: "消防口", handleMethod: "" },
    { id: 5, device: "环网交换机-03", deviceCode: "BAS-GW-03", system: "通信系统", category: "环网交换机", type: "设备离线", level: "预警", time: "2026-10-06 18:35:27", status: "已处理", project: "光谷科学岛综合开发项目", corridor: "科学岛大道综合管廊", room: "综合舱", section: "通风口", closeReason: "误报无问题", handleMethod: "误报" },
    { id: 6, device: "排风机-01", deviceCode: "FAN-UG-01", system: "环境监测", category: "通风设备", type: "设备属性", level: "预警", time: "2026-10-08 10:16:24", status: "未处理", project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", room: "电力舱", section: "通风口", handleMethod: "" },
    { id: 7, device: "消防泵-02", deviceCode: "FIRE-PMP-02", system: "消防监控系统", category: "消防设备", type: "设备离线", level: "告警", time: "2026-10-08 09:48:11", status: "未处理", project: "光谷科学岛综合开发项目", corridor: "科学岛大道综合管廊", room: "综合舱", section: "消防口", handleMethod: "" },
    { id: 8, device: "照明控制器-05", deviceCode: "LGT-OF-05", system: "电力监测平台", category: "照明设备", type: "设备属性", level: "提醒", time: "2026-10-08 09:22:37", status: "已处理", project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", room: "综合舱", section: "出入口", closeReason: "告警已解决", handleMethod: "直接处理" },
    { id: 9, device: "甲烷探测器 03", deviceCode: "001_ENVINDOOR_0003", system: "环境监测", category: "室内环境传感器", type: "设备属性", level: "告警", time: "2026-10-12 10:18:05", status: "未处理", project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", room: "燃气舱", section: "防火分区", handleMethod: "" },
    { id: 10, device: "硫化氢传感器 04", deviceCode: "001_ENVINDOOR_0004", system: "环境监测", category: "室内环境传感器", type: "设备属性", level: "预警", time: "2026-10-12 10:05:40", status: "处理中", project: "光谷科学岛综合开发项目", corridor: "科学岛大道综合管廊", room: "综合舱", section: "防火分区", process: { workOrderNo: "WO20261012010" }, handleMethod: "转工单" },
    { id: 11, device: "集水井水位传感器 05", deviceCode: "001_ENVINDOOR_0005", system: "环境监测", category: "室内环境传感器", type: "设备属性", level: "预警", time: "2026-10-12 09:54:58", status: "已处理", project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", room: "综合舱", section: "防火分区", closeReason: "告警已解决", handleMethod: "直接处理" },
    { id: 12, device: "2# 集水井排水泵", deviceCode: "C01_ENVPUMP_0002", system: "环境监测", category: "排水泵", type: "设备属性", level: "告警", time: "2026-10-12 09:12:00", status: "未处理", project: "光谷科学岛综合开发项目", corridor: "科学岛大道综合管廊", room: "综合舱", section: "出入口", handleMethod: "" },
    { id: 13, device: "配电柜通信网关", deviceCode: "ENV-GW-01", system: "环境监测", category: "网关", type: "设备离线", level: "预警", time: "2026-10-12 08:20:00", status: "已处理", project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", room: "电力舱", section: "防火分区", closeReason: "误报无问题", handleMethod: "误报" },
    { id: 14, device: "枪式摄像机 05", deviceCode: "VIDEO-BULLET-012", system: "视频监控系统", category: "枪式摄像机", type: "设备离线", level: "提醒", time: "2026-10-13 11:20:00", status: "未处理", project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", room: "电力舱", section: "出入口", handleMethod: "" },
    { id: 15, device: "双鉴探测器-02", deviceCode: "IAS-DET-02", system: "入侵报警系统", category: "双鉴探测器", type: "设备属性", level: "告警", time: "2026-10-13 14:05:00", status: "处理中", project: "光谷科学岛综合开发项目", corridor: "科学岛大道综合管廊", room: "综合舱", section: "通风口", process: { workOrderNo: "WO20261013015" }, handleMethod: "转工单" },
    { id: 16, device: "巡检点底座 A-01", deviceCode: "EPS-BASE-001", system: "电子巡更系统", category: "巡检点底座", type: "设备离线", level: "提醒", time: "2026-10-14 08:40:00", status: "已处理", project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", room: "综合舱", section: "防火分区", closeReason: "告警已解决", handleMethod: "直接处理" },
    { id: 17, device: "球型摄像机 02", deviceCode: "VIDEO-PTZ-009", system: "视频监控系统", category: "球型摄像机", type: "设备属性", level: "预警", time: "2026-10-15 16:22:00", status: "未处理", project: "科学岛东区管廊延伸工程", corridor: "科学岛东区综合管廊", room: "综合舱", section: "吊装口", handleMethod: "" },
    { id: 18, device: "声光警报器 05", deviceCode: "FAS-SOUND-005", system: "火灾报警系统", category: "声光警报器", type: "设备属性", level: "提醒", time: "2026-10-16 09:10:00", status: "已处理", project: "科学岛东区管廊延伸工程", corridor: "科学岛东区综合管廊", room: "综合舱", section: "防火分区", closeReason: "告警已解决", handleMethod: "直接处理" },
    { id: 19, device: "UPS-电力舱-01", deviceCode: "PWR-UPS-01", system: "电力监测平台", category: "UPS", type: "设备属性", level: "告警", time: "2026-10-16 10:28:00", status: "处理中", project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", room: "电力舱", section: "配电间", process: { workOrderNo: "WO20261016019" }, handleMethod: "转工单" },
    { id: 20, device: "门禁读卡器 02", deviceCode: "ACS-READ-002", system: "门禁系统", category: "读卡器", type: "设备离线", level: "提醒", time: "2026-10-17 13:15:00", status: "已处理", project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", room: "电力舱", section: "出入口", closeReason: "误报无问题", handleMethod: "误报" },
    { id: 21, device: "振动光纤探测器-03", deviceCode: "IAS-DET-03", system: "入侵报警系统", category: "振动光纤", type: "设备属性", level: "预警", time: "2026-10-18 07:50:00", status: "未处理", project: "光谷科学岛综合开发项目", corridor: "科学岛大道综合管廊", room: "综合舱", section: "吊装口", handleMethod: "" },
    { id: 22, device: "感烟探测器 08", deviceCode: "FAS-SMOKE-008", system: "火灾报警系统", category: "感烟探测器", type: "设备属性", level: "提醒", time: "2026-10-18 19:30:00", status: "已处理", project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", room: "综合舱", section: "防火分区", closeReason: "告警已解决", handleMethod: "直接处理" },
  ];

  const SYSTEM_SHORT = {
    视频监控系统: "视频",
    消防监控系统: "消防",
    火灾报警系统: "消防",
    入侵报警系统: "入侵",
    电力监测平台: "电力",
    电力监测系统: "电力",
    环境监测: "环境",
    环境与设备监控: "环境",
    电子巡更系统: "巡更",
    通信系统: "通信",
    门禁系统: "门禁",
    智能井盖系统: "井盖",
  };

  global.BIG_DATA_WARNING_DATA = { alarms, SYSTEM_SHORT };
})(window);
