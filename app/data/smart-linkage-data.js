(function (global) {
  const spatialTree = [
    {
      name: "光谷科学岛综合开发项目",
      corridors: [
        {
          name: "高新大道综合管廊",
          cabins: [
            {
              name: "综合舱",
              sections: [
                { name: "防火分区 F0103", pipelines: ["低压配电管线", "通信管线", "给水管线"] },
                { name: "出入口", pipelines: ["低压配电管线", "照明管线"] },
                { name: "通风口", pipelines: ["通风管线"] },
              ],
            },
            {
              name: "电力舱",
              sections: [
                { name: "防火分区 F0201", pipelines: ["10kV电力管线", "感温光纤回路"] },
                { name: "通风口", pipelines: ["通风管线"] },
              ],
            },
          ],
        },
        {
          name: "科学岛大道综合管廊",
          cabins: [
            {
              name: "综合舱",
              sections: [
                { name: "防火分区", pipelines: ["低压配电管线"] },
                { name: "出入口", pipelines: ["照明管线"] },
              ],
            },
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
            {
              name: "燃气舱",
              sections: [
                { name: "通风口", pipelines: ["燃气管线"] },
                { name: "吊装口", pipelines: ["燃气管线"] },
              ],
            },
          ],
        },
      ],
    },
  ];

  const deviceCatalog = [
    { id: "DEV-FAN-01", name: "综合舱排风机-01", system: "环境与设备监控", project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", cabin: "综合舱", section: "防火分区 F0103", pipeline: "低压配电管线", properties: ["甲烷浓度", "运行状态", "风速"], actions: ["启动", "停止", "复位"] },
    { id: "DEV-PUMP-01", name: "出入口排水泵-01", system: "环境与设备监控", project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", cabin: "综合舱", section: "出入口", pipeline: "给水管线", properties: ["水位高度", "运行状态", "电流"], actions: ["启动", "停止", "复位"] },
    { id: "DEV-SMOKE-FAN-01", name: "电力舱排烟风机-01", system: "环境与设备监控", project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", cabin: "电力舱", section: "防火分区 F0201", pipeline: "通风管线", properties: ["运行状态", "温度"], actions: ["启动", "停止", "复位"] },
    { id: "DEV-GAS-01", name: "甲烷探测器-01", system: "环境与设备监控", project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", cabin: "综合舱", section: "防火分区 F0103", pipeline: "通信管线", properties: ["甲烷浓度", "通信状态"], actions: ["复位"] },
    { id: "DEV-LEVEL-01", name: "集水坑液位计-01", system: "环境与设备监控", project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", cabin: "综合舱", section: "出入口", pipeline: "给水管线", properties: ["水位高度", "液位百分比"], actions: ["复位"] },
    { id: "DEV-INTRUDE-01", name: "综合舱红外对射-01", system: "入侵报警系统", project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", cabin: "综合舱", section: "防火分区 F0103", pipeline: "通信管线", properties: ["报警状态", "布防状态"], actions: ["布防", "撤防", "消音", "复位"] },
    { id: "DEV-DOOR-01", name: "综合舱出入口门禁-01", system: "门禁系统", project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", cabin: "综合舱", section: "出入口", pipeline: "低压配电管线", properties: ["门状态", "在线状态"], actions: ["远程开门", "锁定", "解锁", "复位"] },
    { id: "DEV-DOOR-02", name: "电力舱防火门门禁-01", system: "门禁系统", project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", cabin: "电力舱", section: "防火分区 F0201", pipeline: "低压配电管线", properties: ["门状态", "在线状态"], actions: ["远程开门", "锁定", "解锁"] },
    { id: "DEV-MANHOLE-01", name: "高新大道井盖监测-01", system: "智能井盖系统", project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", cabin: "综合舱", section: "出入口", pipeline: "给水管线", properties: ["开盖状态", "倾斜角度"], actions: ["清除告警", "复位"] },
    { id: "DEV-BREAKER-01", name: "非消防电源断路器", system: "电力监测系统", project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", cabin: "电力舱", section: "防火分区 F0201", pipeline: "10kV电力管线", properties: ["开关状态", "电流"], actions: ["分闸", "合闸", "切断非消防电源"] },
    { id: "DEV-BROADCAST-01", name: "紧急广播分区-综合舱", system: "通信系统", project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", cabin: "综合舱", section: "防火分区 F0103", pipeline: "通信管线", properties: ["广播状态"], actions: ["启动广播", "停止广播"] },
    { id: "DEV-FIBER-01", name: "感温光纤主机-01", system: "火灾报警系统", project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", cabin: "电力舱", section: "防火分区 F0201", pipeline: "感温光纤回路", properties: ["最高温度", "报警状态"], actions: ["消音", "复位"] },
    { id: "DEV-FIRE-01", name: "本区灭火装置", system: "智慧消防", project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", cabin: "电力舱", section: "防火分区 F0201", pipeline: "感温光纤回路", properties: ["装置状态", "压力"], actions: ["联动启动", "停止", "强制关闭防火门"] },
    { id: "DEV-CAM-01", name: "综合舱防火分区枪机 01", system: "视频监控系统", project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", cabin: "综合舱", section: "防火分区 F0103", pipeline: "通信管线", properties: ["在线状态"], actions: ["调取预置位", "开始录像", "停止录像"] },
  ];

  const planTemplates = [
    {
      id: "PLAN-FIRE-CROSS",
      name: "火灾确认跨系统处置",
      description: "感温光纤或 FAS 确认火警后，按区段执行灭火、通风排烟、切非、疏散与视频复核。",
      steps: [
        { id: "S1", order: 1, system: "智慧消防", action: "START_EXTINGUISH", name: "启动本区灭火装置", confirmLevel: "dual" },
        { id: "S2", order: 2, system: "环境与设备监控", action: "STOP_HVAC_START_SMOKE", name: "关闭通风空调并启动排烟风机", confirmLevel: "danger" },
        { id: "S3", order: 3, system: "电力监测系统", action: "CUT_NON_FIRE", name: "切断非消防电源", confirmLevel: "dual" },
        { id: "S4", order: 4, system: "智慧消防", action: "EVAC_GUIDE", name: "应急照明与疏散指示改向", confirmLevel: "normal" },
        { id: "S5", order: 5, system: "视频监控系统", action: "PULL_NEARBY_VIDEO", name: "调取报警点附近视频", confirmLevel: "normal" },
        { id: "S6", order: 6, system: "通信系统", action: "EMERGENCY_BROADCAST", name: "紧急广播提示", confirmLevel: "normal", optional: true },
      ],
    },
    {
      id: "PLAN-ENV-GAS",
      name: "有害气体超限通风处置",
      description: "环境气体超限时启动分区通风（演示用次要模板）。",
      steps: [
        { id: "G1", order: 1, system: "环境与设备监控", action: "START_FAN", name: "启动分区排风机", confirmLevel: "danger" },
        { id: "G2", order: 2, system: "视频监控系统", action: "PULL_NEARBY_VIDEO", name: "调取附近视频复核", confirmLevel: "normal" },
      ],
    },
  ];

  const cameras = [
    { name: "综合舱防火分区枪机 01", status: "在线", section: "防火分区 F0103" },
    { name: "综合舱出入口球机 02", status: "在线", section: "出入口" },
    { name: "电力舱半球 03", status: "在线", section: "防火分区 F0201" },
    { name: "通风口枪机 04", status: "在线", section: "通风口" },
  ];

  const commands = [
    {
      id: "CMD-1001",
      layer: "L3",
      system: "智慧消防",
      targetType: "planStep",
      targetId: "S1",
      targetName: "启动本区灭火装置",
      action: "START_EXTINGUISH",
      mode: "step",
      operator: "值班员甲",
      requestedAt: "2026-10-23 09:12:01",
      status: "success",
      message: "灭火装置已启动（Mock）",
      planRunId: "RUN-DEMO-01",
    },
    {
      id: "CMD-1002",
      layer: "L3",
      system: "电力监测系统",
      targetType: "planStep",
      targetId: "S3",
      targetName: "切断非消防电源",
      action: "CUT_NON_FIRE",
      mode: "step",
      operator: "值班员甲",
      requestedAt: "2026-10-23 09:12:18",
      status: "success",
      message: "非消防回路已切除（Mock）",
      planRunId: "RUN-DEMO-01",
    },
    {
      id: "CMD-0901",
      layer: "L1",
      system: "环境与设备监控",
      targetType: "device",
      targetId: "FAN-0101",
      targetName: "1# 排风机",
      action: "START_FAN",
      mode: "manual",
      operator: "运维乙",
      requestedAt: "2026-10-22 16:40:00",
      status: "failed",
      message: "设备本地手自动旋钮在手动位，拒绝远程（Mock）",
    },
  ];

  const linkageRules = [
    {
      id: "LR-001",
      name: "甲烷超标启动排风",
      scene: "气体超限",
      project: "光谷科学岛综合开发项目",
      corridor: "高新大道综合管廊",
      cabin: "综合舱",
      section: "防火分区 F0103",
      pipeline: "低压配电管线",
      area: "光谷科学岛综合开发项目 / 高新大道综合管廊 / 综合舱 / 防火分区 F0103 / 低压配电管线",
      trigger: "甲烷探测器-01：甲烷浓度 ≥ 1.0",
      triggers: [
        {
          system: "环境与设备监控",
          device: "甲烷探测器-01",
          monitorRule: "any",
          conditions: [{ property: "甲烷浓度", operator: "大于等于", threshold: "1.0" }],
        },
      ],
      system: "环境与设备监控",
      device: "综合舱排风机-01",
      action: "启动",
      execTime: "持续至触发条件解除",
      results: [
        { system: "环境与设备监控", device: "综合舱排风机-01", action: "启动", execTime: "持续至触发条件解除" },
      ],
      mode: "自动执行",
      status: "启用",
      description: "当某区域甲烷浓度超标时，自动启动该区域排风机，防止事态扩大。",
      planTemplateId: "PLAN-ENV-GAS",
    },
    {
      id: "LR-002",
      name: "集水坑高水位启泵",
      scene: "积水处置",
      project: "光谷科学岛综合开发项目",
      corridor: "高新大道综合管廊",
      cabin: "综合舱",
      section: "出入口",
      pipeline: "给水管线",
      area: "光谷科学岛综合开发项目 / 高新大道综合管廊 / 综合舱 / 出入口 / 给水管线",
      trigger: "集水坑液位计-01：水位高度 > 1.2",
      triggers: [
        {
          system: "环境与设备监控",
          device: "集水坑液位计-01",
          monitorRule: "any",
          conditions: [{ property: "水位高度", operator: "大于", threshold: "1.2" }],
        },
      ],
      system: "环境与设备监控",
      device: "出入口排水泵-01",
      action: "启动",
      execTime: "10 分钟",
      results: [
        { system: "环境与设备监控", device: "出入口排水泵-01", action: "启动", execTime: "10 分钟" },
      ],
      mode: "手动执行",
      status: "启用",
      description: "集水坑水位过高时，由值班员确认后开启排水泵。",
      planTemplateId: "PLAN-ENV-GAS",
    },
    {
      id: "LR-003",
      name: "火灾确认跨系统处置",
      scene: "火灾应急",
      project: "光谷科学岛综合开发项目",
      corridor: "高新大道综合管廊",
      cabin: "电力舱",
      section: "防火分区 F0201",
      pipeline: "感温光纤回路",
      area: "光谷科学岛综合开发项目 / 高新大道综合管廊 / 电力舱 / 防火分区 F0201 / 感温光纤回路",
      trigger: "感温光纤主机-01：最高温度 ≥ 65 或 报警状态 等于 火警",
      triggers: [
        {
          system: "火灾报警系统",
          device: "感温光纤主机-01",
          monitorRule: "any",
          conditions: [
            { property: "最高温度", operator: "大于等于", threshold: "65" },
            { property: "报警状态", operator: "等于", threshold: "火警" },
          ],
        },
      ],
      system: "智慧消防",
      device: "本区灭火装置 / 电力舱排烟风机-01 / 非消防电源断路器",
      action: "联动启动",
      execTime: "持续至触发条件解除",
      results: [
        { system: "智慧消防", device: "本区防火阀", action: "关闭", execTime: "30 秒" },
        { system: "智慧消防", device: "本区灭火装置", action: "联动启动", execTime: "持续至触发条件解除" },
        { system: "环境与设备监控", device: "电力舱排烟风机-01", action: "启动", execTime: "持续至触发条件解除" },
        { system: "电力监测系统", device: "非消防电源断路器", action: "切断非消防电源", execTime: "30 秒" },
        { system: "智慧消防", device: "应急照明与疏散指示", action: "应急改向", execTime: "持续至触发条件解除" },
        { system: "视频监控系统", device: "综合舱防火分区枪机 01", action: "调取预置位", execTime: "5 分钟" },
        { system: "通信系统", device: "紧急广播分区-综合舱", action: "启动广播", execTime: "10 分钟" },
      ],
      mode: "手动执行",
      status: "启用",
      description: "火警确认后执行灭火、排烟、切非、疏散与视频复核。",
      planTemplateId: "PLAN-FIRE-CROSS",
    },
  ];

  const capabilityMatrix = {
    "环境与设备监控": { L1: ["START_FAN", "STOP_FAN", "START_PUMP", "LIGHT_ON"], L2: ["ACK_ALARM"] },
    "入侵报警系统": { L1: ["ARM", "DISARM", "RESET_SOUNDER"], L2: ["ACK_ALARM", "FALSE_ALARM", "TRANSFER_WO"] },
    "电子巡更系统": { L1: [], L2: ["HANDLE_MISS"] },
    "门禁系统": { L1: ["REMOTE_OPEN", "LOCK_DOWN"], L2: ["ACK_ALARM"] },
    "智能井盖系统": { L1: ["CLEAR_ALARM"], L2: ["ACK_ALARM"] },
    "电力监测系统": { L1: ["BREAKER_OPEN", "BREAKER_CLOSE", "CUT_NON_FIRE"], L2: ["ACK_ALARM"] },
    "通信系统": { L1: ["START_BROADCAST", "STOP_BROADCAST"], L2: ["ACK_FAULT"] },
    "火灾报警系统": { L1: ["SILENCE", "RESET"], L2: ["ACK_FIRE", "ACK_FAULT"] },
    "智慧消防": { L1: ["START_EXTINGUISH", "EVAC_GUIDE", "FORCE_FIRE_DOOR"], L2: ["ACK_ALARM"] },
  };

  global.SMART_LINKAGE_DATA = {
    spatialTree,
    deviceCatalog,
    planTemplates,
    cameras,
    commands,
    linkageRules,
    capabilityMatrix,
  };
})(window);
