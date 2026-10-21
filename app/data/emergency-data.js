(function (root, factory) {
  const store = factory(root);
  if (typeof module === "object" && module.exports) module.exports = store;
  if (root) root.EMERGENCY_STORE = store;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  const keys = {
    personnel: "emergency.personnel.v2",
    resources: "emergency.resources.v2",
    plans: "emergency.plans.v2",
    events: "emergency.events.v4",
    calls: "emergency.calls",
    dispatch: "emergency.dispatch",
    risks: "emergency.risks",
    resourceCategories: "emergency.resourceCategories",
    personnelCategories: "emergency.personnelCategories",
  };

  const transitions = {
    "待指派": ["待处理", "已关闭"],
    "待处理": ["处理中"],
    "处理中": ["验收中"],
    "验收中": ["已完成", "待指派"],
    "已完成": [],
    "已关闭": [],
    /* 兼容旧数据 */
    "待确认": ["待指派", "已确认", "误报关闭"],
    "已确认": ["处理中", "待处理"],
    "待复核": ["已关闭", "处理中", "验收中"],
    "已升级": ["处理中"],
    "处置失败": ["处理中"],
    "误报关闭": [],
  };

  const now = () => new Date().toISOString();
  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
  const makeId = (prefix) => {
    const random = root?.crypto?.randomUUID ? root.crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
    return `${prefix}-${Date.now().toString(36)}-${random}`.toUpperCase();
  };

  const seed = {
    personnel: [
      {
        personId: "P-001", name: "周建国", unit: "管廊运维中心", department: "应急指挥部", role: "值班长",
        type: "应急指挥员", mobile: "13800001001", phone: "0551-62001001", onlineStatus: "在线", dispatchStatus: "可调度",
        dutyTime: "08:00-20:00", longitude: 114.4240, latitude: 30.4680, section: "东段 K2+300", specialties: ["综合指挥", "现场处置"], updatedAt: "2026-09-30T08:00:00.000Z",
      },
      {
        personId: "P-002", name: "李海峰", unit: "燃气管线单位", department: "抢修班", role: "燃气工程师",
        type: "燃气值班", mobile: "13800001002", phone: "0551-62001002", onlineStatus: "在线", dispatchStatus: "可调度",
        dutyTime: "00:00-24:00", longitude: 114.4268, latitude: 30.4656, section: "东段 K2+500", specialties: ["燃气", "泄漏检测"], updatedAt: "2026-09-30T08:05:00.000Z",
      },
      {
        personId: "P-003", name: "王晓玲", unit: "消防救援支队", department: "特勤中队", role: "消防员",
        type: "消防/医疗/公安", mobile: "13800001003", phone: "119", onlineStatus: "在线", dispatchStatus: "可调度",
        dutyTime: "00:00-24:00", longitude: 114.4212, latitude: 30.4702, section: "南侧消防站", specialties: ["消防", "救援"], updatedAt: "2026-09-30T08:10:00.000Z",
      },
      {
        personId: "P-004", name: "赵明远", unit: "供电有限公司", department: "配电运维部", role: "电气工程师",
        type: "电力值班", mobile: "13800001004", phone: "0551-62001004", onlineStatus: "忙碌", dispatchStatus: "已调度",
        dutyTime: "08:00-20:00", longitude: 114.4296, latitude: 30.4630, section: "北段 K3+100", specialties: ["电气", "配电"], updatedAt: "2026-09-30T08:12:00.000Z",
      },
    ],
    resourceCategories: [
      { categoryId: "RC-001", name: "抢修工具", code: "EM-TOOL", sort: 1, icon: "fa-screwdriver-wrench", remark: "检测与抢修工具" },
      { categoryId: "RC-002", name: "防护装备", code: "EM-PROTECT", sort: 2, icon: "fa-shield-halved", remark: "个人防护用品" },
      { categoryId: "RC-003", name: "交通疏散", code: "EM-TRAFFIC", sort: 3, icon: "fa-road", remark: "警戒与疏散物资" },
      { categoryId: "RC-004", name: "消防器材", code: "EM-FIRE", sort: 4, icon: "fa-fire-extinguisher", remark: "灭火与消防辅助" },
      { categoryId: "RC-005", name: "医疗急救", code: "EM-MED", sort: 5, icon: "fa-kit-medical", remark: "急救药品与器材" },
    ],
    personnelCategories: [
      { categoryId: "PC-001", name: "应急指挥员", code: "EP-CMD", sort: 1, icon: "fa-user-tie", remark: "指挥调度人员" },
      { categoryId: "PC-002", name: "管廊运维", code: "EP-OPS", sort: 2, icon: "fa-helmet-safety", remark: "管廊运维人员" },
      { categoryId: "PC-003", name: "燃气值班", code: "EP-GAS", sort: 3, icon: "fa-fire-flame-simple", remark: "燃气管线值班" },
      { categoryId: "PC-004", name: "电力值班", code: "EP-POWER", sort: 4, icon: "fa-bolt", remark: "电力值班人员" },
      { categoryId: "PC-005", name: "消防/医疗/公安", code: "EP-EXT", sort: 5, icon: "fa-truck-medical", remark: "外部应急力量" },
    ],
    resources: [
      {
        resourceId: "R-001", name: "气体检测仪", category: "抢修工具", model: "GAS-9000", unit: "台", total: 6, available: 5, occupied: 1, safetyStock: 2,
        warehouse: "东段应急仓", location: "K2+300 物资柜 A-03", owner: "孙志强", expiryDate: "2029-09-30", status: "可用", longitude: 114.4240, latitude: 30.4680, updatedAt: "2026-09-30T08:00:00.000Z", usageRecords: [],
      },
      {
        resourceId: "R-002", name: "防毒面具", category: "防护装备", model: "MF-6", unit: "套", total: 20, available: 14, occupied: 6, safetyStock: 5,
        warehouse: "东段应急仓", location: "K2+300 物资柜 B-01", owner: "孙志强", expiryDate: "2028-06-30", status: "可用", longitude: 114.4268, latitude: 30.4656, updatedAt: "2026-09-30T08:00:00.000Z", usageRecords: [],
      },
      {
        resourceId: "R-003", name: "警戒带", category: "交通疏散", model: "警戒带 50m", unit: "卷", total: 30, available: 28, occupied: 2, safetyStock: 8,
        warehouse: "中心应急仓", location: "中心仓库 C-12", owner: "陈立", expiryDate: "2030-12-31", status: "可用", longitude: 114.4296, latitude: 30.4630, updatedAt: "2026-09-30T08:00:00.000Z", usageRecords: [],
      },
      {
        resourceId: "R-004", name: "灭火器", category: "消防器材", model: "MFZ/ABC4", unit: "具", total: 40, available: 36, occupied: 4, safetyStock: 10,
        warehouse: "东段应急仓", location: "K2+400 消防柜 D-02", owner: "王晓玲", expiryDate: "2028-12-31", status: "可用", longitude: 114.4255, latitude: 30.4675, updatedAt: "2026-09-30T08:00:00.000Z", usageRecords: [],
      },
      {
        resourceId: "R-005", name: "急救箱", category: "医疗急救", model: "急救包标准型", unit: "套", total: 12, available: 10, occupied: 2, safetyStock: 3,
        warehouse: "中心应急仓", location: "中心仓库 M-01", owner: "周建国", expiryDate: "2027-06-30", status: "可用", longitude: 114.4235, latitude: 30.4692, updatedAt: "2026-09-30T08:00:00.000Z", usageRecords: [],
      },
    ],
    plans: [
      {
        planId: "PLAN-GAS-P1", name: "燃气泄漏一级响应预案", code: "EM-GAS-P1", eventType: "燃气泄漏", level: "P1", area: "东段", triggerCondition: "可燃气体浓度超限或报警中心确认泄漏", version: 1, status: "已发布", enabled: "启用", review: "已通过", author: "应急管理部", reviewer: "值班领导", publishedAt: "2026-09-01T09:00:00.000Z", updatedAt: "2026-09-01T09:00:00.000Z",
        steps: [
          { stepId: "S1", order: 1, name: "确认事件位置", type: "信息确认", content: "核对报警点位与现场视频，确认泄漏舱室与区段", linkage: "", required: true },
          { stepId: "S2", order: 2, name: "信息通报", type: "人员通知", content: "通知应急指挥员及管线单位值班人员到岗", linkage: "广播", required: true },
          { stepId: "S3", order: 3, name: "启动事故风机", type: "区域隔离", content: "按预案启动事故段风机进行稀释排风", linkage: "通风", required: true },
          { stepId: "S4", order: 4, name: "联动防火门与消防", type: "视频联动", content: "关闭相关防火门并确认消防系统就绪", linkage: "消防", required: true },
          { stepId: "S5", order: 5, name: "门禁分区管控", type: "区域隔离", content: "对事故分区实施门禁管控，限制无关人员进入", linkage: "门禁", required: false },
          { stepId: "S6", order: 6, name: "现场反馈", type: "现场反馈", content: "现场处置人员反馈浓度变化与处置进展", linkage: "", required: true },
          { stepId: "S7", order: 7, name: "事件关闭", type: "事件关闭", content: "确认风险解除后准备关闭事件", linkage: "", required: true },
        ],
      },
      {
        planId: "PLAN-GAS-P2", name: "燃气泄漏二级响应预案", code: "EM-GAS-P2", eventType: "燃气泄漏", level: "P2", area: "全域", triggerCondition: "可燃气体浓度接近阈值或疑似泄漏待复核", version: 1, status: "已发布", enabled: "启用", review: "已通过", author: "应急管理部", reviewer: "值班领导", publishedAt: "2026-09-05T09:00:00.000Z", updatedAt: "2026-09-05T09:00:00.000Z",
        content: "适用于中低浓度疑似泄漏场景，强调复核确认与局部排风。",
        steps: [
          { stepId: "G2-1", order: 1, name: "复核报警点位", type: "信息确认", content: "调取传感器与视频复核是否存在泄漏", linkage: "", required: true },
          { stepId: "G2-2", order: 2, name: "通知值班人员", type: "人员通知", content: "通知管线单位与值班班组到场复核", linkage: "", required: true },
          { stepId: "G2-3", order: 3, name: "局部排风", type: "区域隔离", content: "对疑似舱室启动局部排风稀释", linkage: "通风", required: true },
          { stepId: "G2-4", order: 4, name: "现场反馈", type: "现场反馈", content: "反馈浓度变化与是否升级响应", linkage: "", required: true },
          { stepId: "G2-5", order: 5, name: "事件关闭", type: "事件关闭", content: "确认风险解除后关闭事件", linkage: "", required: true },
        ],
      },
      {
        planId: "PLAN-GAS-P3", name: "燃气泄漏疏散保障预案", code: "EM-GAS-P3", eventType: "燃气泄漏", level: "P3", area: "东段", triggerCondition: "需组织人员疏散或交通管控时启用", version: 1, status: "已发布", enabled: "启用", review: "已通过", author: "应急管理部", reviewer: "值班领导", publishedAt: "2026-09-12T09:00:00.000Z", updatedAt: "2026-09-12T09:00:00.000Z",
        content: "侧重疏散引导、广播通知与出入口管控，可与一级/二级响应预案并行参考。",
        steps: [
          { stepId: "G3-1", order: 1, name: "确认疏散范围", type: "信息确认", content: "确定需疏散的舱室、区段与出入口", linkage: "", required: true },
          { stepId: "G3-2", order: 2, name: "紧急广播", type: "广播通知", content: "发布疏散广播与注意事项", linkage: "广播", required: true },
          { stepId: "G3-3", order: 3, name: "出入口管控", type: "区域隔离", content: "管控相关门禁与出入口，引导疏散路径", linkage: "门禁", required: true },
          { stepId: "G3-4", order: 4, name: "人员清点反馈", type: "现场反馈", content: "反馈疏散完成情况与滞留人员", linkage: "", required: true },
          { stepId: "G3-5", order: 5, name: "解除管控", type: "事件关闭", content: "确认安全后解除管控并关闭本预案流程", linkage: "", required: true },
        ],
      },
      {
        planId: "PLAN-FIRE-P1", name: "火灾事故一级响应预案", code: "EM-FIRE-P1", eventType: "火灾", level: "P1", area: "全域", triggerCondition: "烟感或温感连续报警", version: 2, status: "已发布", enabled: "启用", review: "已通过", author: "应急管理部", reviewer: "值班领导", publishedAt: "2026-08-20T09:00:00.000Z", updatedAt: "2026-08-20T09:00:00.000Z",
        steps: [
          { stepId: "F1", order: 1, name: "确认火警点位", type: "信息确认", content: "调取烟感/温感报警点位与周边视频确认火情", linkage: "", required: true },
          { stepId: "F2", order: 2, name: "全线紧急广播", type: "广播通知", content: "发布紧急疏散与处置广播通知", linkage: "广播", required: true },
          { stepId: "F3", order: 3, name: "启动排烟风机", type: "区域隔离", content: "启动排烟风机并隔离相关舱室", linkage: "通风", required: true },
          { stepId: "F4", order: 4, name: "联动消防系统", type: "视频联动", content: "联动消防泵组与灭火装置", linkage: "消防", required: true },
          { stepId: "F5", order: 5, name: "封闭相关门禁", type: "区域隔离", content: "封闭事故区域门禁，引导疏散通道", linkage: "门禁", required: false },
          { stepId: "F6", order: 6, name: "现场处置反馈", type: "现场反馈", content: "消防力量到场后反馈处置结果", linkage: "", required: true },
          { stepId: "F7", order: 7, name: "事件关闭", type: "事件关闭", content: "确认火情扑灭后关闭事件", linkage: "", required: true },
        ],
      },
    ],
    risks: [
      {
        riskId: "RISK-FAC-001", code: "RW-FAC-001", title: "东段灭火器有效期临期", objectType: "安全设施", objectId: "FAC-MF-012", objectName: "MF-东段-012",
        level: "中", area: "东段", factors: ["有效期≤30天", "上次维保已超6个月"], source: "设施临期", status: "待评估", owner: "孙志强",
        predictedAt: "2026-10-08T09:00:00.000Z", dueAt: "2026-10-20T00:00:00.000Z", linkedEventId: "", linkedFacilityId: "FAC-MF-012",
        suggestion: "建议更换或安排维保检查", remark: "", createdAt: "2026-10-08T09:00:00.000Z", updatedAt: "2026-10-08T09:00:00.000Z", closedAt: "",
        timeline: [{ at: "2026-10-08T09:00:00.000Z", type: "生成", title: "设施临期预警", message: "灭火器有效期不足30天" }],
      },
      {
        riskId: "RISK-DEV-002", code: "RW-DEV-002", title: "北段配电柜健康度连续下降", objectType: "设备", objectId: "DEV-PD-108", objectName: "北段配电柜 PD-108",
        level: "中", area: "北段", factors: ["健康度连续3周下降", "维保超期7天"], source: "健康度下降", status: "整改中", owner: "赵明远",
        predictedAt: "2026-10-05T10:30:00.000Z", dueAt: "2026-10-18T00:00:00.000Z", linkedEventId: "", linkedFacilityId: "",
        suggestion: "建议安排巡检并开具维保工单", remark: "", createdAt: "2026-10-05T10:30:00.000Z", updatedAt: "2026-10-09T08:00:00.000Z", closedAt: "",
        timeline: [{ at: "2026-10-05T10:30:00.000Z", type: "生成", title: "健康度预警", message: "设备健康度连续下降" }],
      },
      {
        riskId: "RISK-PIPE-003", code: "RW-PIPE-003", title: "西段燃气管线老化高风险预判", objectType: "管线", objectId: "PIPE-GAS-W01", objectName: "西段燃气管线 W01",
        level: "高", area: "西段", factors: ["建设年代早于2005年", "材质风险标签:铸铁", "近30天同类泄漏报警2次"], source: "模型预判", status: "待评估", owner: "李海峰",
        predictedAt: "2026-10-10T14:00:00.000Z", dueAt: "2026-10-25T00:00:00.000Z", linkedEventId: "", linkedFacilityId: "",
        suggestion: "建议组织专项排查并评估更换方案", remark: "管线老化叠加近期报警", createdAt: "2026-10-10T14:00:00.000Z", updatedAt: "2026-10-10T14:00:00.000Z", closedAt: "",
        timeline: [{ at: "2026-10-10T14:00:00.000Z", type: "预判", title: "模型预判结论", message: "管线老化+材质风险+近期同类报警，判定为高风险" }],
      },
    ],
    events: [
      {
        eventId: "EVT-20261012-001", title: "东段 K2+340 燃气泄漏", eventType: "燃气泄漏", level: "P1", source: "报警中心",
        status: "待指派", project: "光谷科学岛综合管廊一期", corridor: "高新大道综合管廊", room: "燃气舱", section: "防火分区", pipeline: "科学岛燃气管线",
        location: "光谷科学岛综合管廊一期 / 高新大道综合管廊 / 燃气舱 / 防火分区 / 科学岛燃气管线",
        contact: "周建国", contactPhone: "13800001001", handler: "", description: "东段燃气舱可燃气体浓度超过阈值，待指派处置人员。",
        planId: "PLAN-GAS-P1", relatedPersonIds: ["P-001", "P-002"], relatedResources: [{ resourceId: "R-001", quantity: 2 }, { resourceId: "R-002", quantity: 4 }],
        photos: [], attachments: [], stepRecords: [], startedAt: "", finishedAt: "",
        longitude: 114.4240, latitude: 30.4680,
        occurrenceTime: "2026-10-12 08:18:00", discoveredAt: "2026-10-12 08:18:00",
        timeline: [{ timelineId: "TL-001", at: "2026-10-12 08:18:00", title: "创建", operator: "报警中心", message: "报警中心自动生成应急事件" }],
        updatedAt: "2026-10-12 08:18:00",
      },
      {
        eventId: "EVT-20261012-002", title: "综合舱积水告警", eventType: "积水", level: "P2", source: "人工上报",
        status: "待处理", project: "光谷科学岛综合管廊一期", corridor: "高新大道综合管廊", room: "综合舱", section: "出入口", pipeline: "科学岛给水管线",
        location: "光谷科学岛综合管廊一期 / 高新大道综合管廊 / 综合舱 / 出入口 / 科学岛给水管线",
        contact: "王晓玲", contactPhone: "13800001003", handler: "李海峰", description: "综合舱出入口发现明显积水，已指派待开始处理。",
        planId: "PLAN-GAS-P1", relatedPersonIds: ["P-002"], relatedResources: [{ resourceId: "R-003", quantity: 6 }],
        photos: [], attachments: [], stepRecords: [], startedAt: "", finishedAt: "",
        longitude: 114.4268, latitude: 30.4656,
        occurrenceTime: "2026-10-12 09:10:00", discoveredAt: "2026-10-12 09:10:00",
        timeline: [
          { timelineId: "TL-002-1", at: "2026-10-12 09:10:00", title: "创建", operator: "王晓玲", message: "新建应急事件" },
          { timelineId: "TL-002-2", at: "2026-10-12 09:25:00", title: "指派", operator: "周建国", message: "指派给李海峰" },
        ],
        updatedAt: "2026-10-12 09:25:00",
      },
      {
        eventId: "EVT-20261012-003", title: "电力舱设备故障", eventType: "设备故障", level: "P2", source: "人工上报",
        status: "处理中", project: "光谷科学岛综合管廊一期", corridor: "高新大道综合管廊", room: "电力舱", section: "通风口", pipeline: "科学岛电力管线",
        location: "光谷科学岛综合管廊一期 / 高新大道综合管廊 / 电力舱 / 通风口 / 科学岛电力管线",
        contact: "赵明远", contactPhone: "13800001004", handler: "赵明远", description: "电力舱配电柜异常告警，正在按预案处置。",
        planId: "PLAN-FIRE-P1", relatedPersonIds: ["P-004", "P-001"], relatedResources: [{ resourceId: "R-001", quantity: 1 }],
        photos: [], attachments: [],
        stepRecords: [
          { stepId: "F1", status: "已完成", process: "核对烟感点位与视频画面", result: "确认无明火，为设备误报风险", photos: [], operator: "赵明远", at: "2026-10-12 10:20:00" },
          { stepId: "F2", status: "已完成", process: "发布区域广播提醒", result: "相关人员已知晓", photos: [], operator: "赵明远", at: "2026-10-12 10:35:00" },
        ],
        startedAt: "2026-10-12 10:05:00", finishedAt: "",
        longitude: 114.4212, latitude: 30.4702,
        occurrenceTime: "2026-10-12 09:50:00", discoveredAt: "2026-10-12 09:50:00",
        timeline: [
          { timelineId: "TL-003-1", at: "2026-10-12 09:50:00", title: "创建", operator: "赵明远", message: "新建应急事件" },
          { timelineId: "TL-003-2", at: "2026-10-12 09:55:00", title: "指派", operator: "周建国", message: "指派给赵明远" },
          { timelineId: "TL-003-3", at: "2026-10-12 10:05:00", title: "开始处理", operator: "赵明远", message: "开始处理事件" },
          { timelineId: "TL-003-4", at: "2026-10-12 10:20:00", title: "完成步骤：确认火警点位", operator: "赵明远", message: "处理过程：核对烟感点位与视频画面；处理结果：确认无明火，为设备误报风险", photos: [] },
          { timelineId: "TL-003-5", at: "2026-10-12 10:35:00", title: "完成步骤：全线紧急广播", operator: "赵明远", message: "处理过程：发布区域广播提醒；处理结果：相关人员已知晓", photos: [] },
        ],
        updatedAt: "2026-10-12 10:35:00",
      },
      {
        eventId: "EVT-20261012-004", title: "环岛路入侵告警", eventType: "入侵告警", level: "P3", source: "报警中心",
        status: "验收中", project: "科学岛综合管廊", corridor: "环岛路管廊", room: "综合舱", section: "吊装口", pipeline: "科学岛通信光缆",
        location: "科学岛综合管廊 / 环岛路管廊 / 综合舱 / 吊装口 / 科学岛通信光缆",
        contact: "周建国", contactPhone: "13800001001", handler: "李海峰", description: "环岛路吊装口入侵探测触发，已完成处置待验收。",
        planId: "PLAN-GAS-P1", relatedPersonIds: ["P-002", "P-003"], relatedResources: [{ resourceId: "R-002", quantity: 3 }, { resourceId: "R-003", quantity: 10 }],
        photos: [], attachments: [],
        stepRecords: [
          { stepId: "S1", status: "已完成", process: "调取监控确认人员身份", result: "确认为施工人员未登记", photos: [], operator: "李海峰", at: "2026-10-12 11:10:00" },
          { stepId: "S2", status: "已完成", process: "通知安保到场核验", result: "已完成核验并登记", photos: [], operator: "李海峰", at: "2026-10-12 11:25:00" },
          { stepId: "S3", status: "已跳过", process: "", result: "本事件无需启动风机", photos: [], operator: "李海峰", at: "2026-10-12 11:28:00" },
          { stepId: "S4", status: "已完成", process: "恢复门禁正常策略", result: "区域已恢复受控通行", photos: [], operator: "李海峰", at: "2026-10-12 11:40:00" },
          { stepId: "S5", status: "已跳过", process: "", result: "无需额外分区管控", photos: [], operator: "李海峰", at: "2026-10-12 11:41:00" },
          { stepId: "S6", status: "已完成", process: "现场复核无异常", result: "处置完成", photos: [], operator: "李海峰", at: "2026-10-12 11:50:00" },
          { stepId: "S7", status: "已完成", process: "准备提交验收", result: "可关闭待验收", photos: [], operator: "李海峰", at: "2026-10-12 11:55:00" },
        ],
        startedAt: "2026-10-12 11:00:00", finishedAt: "",
        longitude: 114.4296, latitude: 30.4630,
        occurrenceTime: "2026-10-12 10:40:00", discoveredAt: "2026-10-12 10:40:00",
        timeline: [
          { timelineId: "TL-004-1", at: "2026-10-12 10:40:00", title: "创建", operator: "报警中心", message: "入侵报警生成应急事件" },
          { timelineId: "TL-004-2", at: "2026-10-12 10:50:00", title: "指派", operator: "周建国", message: "指派给李海峰" },
          { timelineId: "TL-004-3", at: "2026-10-12 11:00:00", title: "开始处理", operator: "李海峰", message: "开始处理事件" },
          { timelineId: "TL-004-4", at: "2026-10-12 11:55:00", title: "提交处理", operator: "李海峰", message: "全部处置步骤已完成，提交验收" },
        ],
        updatedAt: "2026-10-12 11:55:00",
      },
      {
        eventId: "EVT-20261012-005", title: "西段燃气管线老化高风险", eventType: "燃气泄漏", level: "P1", source: "风险预警",
        status: "已完成", project: "光谷科学岛综合管廊一期", corridor: "科学岛大道综合管廊", room: "燃气舱", section: "防火分区", pipeline: "科学岛燃气管线",
        location: "光谷科学岛综合管廊一期 / 科学岛大道综合管廊 / 燃气舱 / 防火分区 / 科学岛燃气管线",
        contact: "李海峰", contactPhone: "13800001002", handler: "李海峰", description: "西段燃气管线老化高风险已完成专项排查与处置。",
        planId: "PLAN-GAS-P1", relatedPersonIds: ["P-002"], relatedResources: [{ resourceId: "R-001", quantity: 2 }, { resourceId: "R-002", quantity: 5 }],
        photos: [], attachments: [], stepRecords: [],
        startedAt: "2026-10-11 14:00:00", finishedAt: "2026-10-11 17:30:00",
        longitude: 114.4275, latitude: 30.4668,
        occurrenceTime: "2026-10-11 13:20:00", discoveredAt: "2026-10-11 13:20:00",
        timeline: [
          { timelineId: "TL-005-1", at: "2026-10-11 13:20:00", title: "创建", operator: "系统", message: "风险预警转应急事件" },
          { timelineId: "TL-005-2", at: "2026-10-11 13:40:00", title: "指派", operator: "周建国", message: "指派给李海峰" },
          { timelineId: "TL-005-3", at: "2026-10-11 14:00:00", title: "开始处理", operator: "李海峰", message: "开始处理事件" },
          { timelineId: "TL-005-4", at: "2026-10-11 16:50:00", title: "提交处理", operator: "李海峰", message: "专项排查完成，提交验收" },
          { timelineId: "TL-005-5", at: "2026-10-11 17:30:00", title: "验收通过", operator: "周建国", message: "验收合格，事件关闭" },
        ],
        updatedAt: "2026-10-11 17:30:00",
      },
      {
        eventId: "EVT-20261012-006", title: "南段误报试验事件", eventType: "其他", level: "P4", source: "人工上报",
        status: "已关闭", project: "光谷科学岛综合管廊一期", corridor: "高新大道综合管廊", room: "综合舱", section: "防火分区", pipeline: "科学岛通信光缆",
        location: "光谷科学岛综合管廊一期 / 高新大道综合管廊 / 综合舱 / 防火分区 / 科学岛通信光缆",
        contact: "周建国", contactPhone: "13800001001", handler: "", description: "系统联调产生的试验事件，已关闭。",
        planId: "", relatedPersonIds: [], relatedResources: [],
        photos: [], attachments: [], stepRecords: [],
        startedAt: "", finishedAt: "", closedAt: "2026-10-12 08:05:00",
        longitude: 114.4228, latitude: 30.4690,
        occurrenceTime: "2026-10-12 08:00:00", discoveredAt: "2026-10-12 08:00:00",
        timeline: [
          { timelineId: "TL-006-1", at: "2026-10-12 08:00:00", title: "创建", operator: "周建国", message: "新建应急事件" },
          { timelineId: "TL-006-2", at: "2026-10-12 08:05:00", title: "关闭", operator: "周建国", message: "试验事件，发起人关闭" },
        ],
        updatedAt: "2026-10-12 08:05:00",
      },
    ],
    calls: [
      {
        callId: "CALL-001", eventId: "EVT-20261012-001", eventNo: "EVT-20261012-001",
        callerId: "P-001", callerName: "周建国", calleeIds: ["P-002"], calleeNames: ["李海峰"],
        type: "单呼", source: "应急调度台",
        startedAt: "2026-10-12T08:20:00.000Z", connectedAt: "2026-10-12T08:20:05.000Z",
        endedAt: "2026-10-12T08:24:00.000Z", durationSeconds: 235, result: "已接通",
        recordingStatus: "Mock", planStepId: "", operatorId: "P-001",
      },
      {
        callId: "CALL-002", eventId: "EVT-20261012-003", eventNo: "EVT-20261012-003",
        callerId: "P-001", callerName: "周建国", calleeIds: ["P-004"], calleeNames: ["赵明远"],
        type: "单呼", source: "应急调度台",
        startedAt: "2026-10-12T10:10:00.000Z", connectedAt: "2026-10-12T10:10:08.000Z",
        endedAt: "2026-10-12T10:15:20.000Z", durationSeconds: 312, result: "已接通",
        recordingStatus: "Mock", planStepId: "", operatorId: "P-001",
      },
      {
        callId: "CALL-003", eventId: "EVT-20261012-004", eventNo: "EVT-20261012-004",
        callerId: "P-002", callerName: "李海峰", calleeIds: ["P-001", "P-003"], calleeNames: ["周建国", "王晓玲"],
        type: "组呼", source: "应急调度台",
        startedAt: "2026-10-11T11:05:00.000Z", connectedAt: "2026-10-11T11:05:10.000Z",
        endedAt: "2026-10-11T11:12:00.000Z", durationSeconds: 410, result: "已接通",
        recordingStatus: "Mock", planStepId: "", operatorId: "P-002",
      },
      {
        callId: "CALL-004", eventId: "", eventNo: "",
        callerId: "P-001", callerName: "周建国", calleeIds: ["P-003"], calleeNames: ["王晓玲"],
        type: "单呼", source: "应急调度台",
        startedAt: "2026-10-10T15:30:00.000Z", connectedAt: "",
        endedAt: "2026-10-10T15:30:40.000Z", durationSeconds: 0, result: "未接通",
        recordingStatus: "Mock", planStepId: "", operatorId: "P-001",
      },
      {
        callId: "CALL-005", eventId: "EVT-20261012-005", eventNo: "EVT-20261012-005",
        callerId: "P-002", callerName: "李海峰", calleeIds: ["P-001"], calleeNames: ["周建国"],
        type: "单呼", source: "应急调度台",
        startedAt: "2026-10-11T14:00:00.000Z", connectedAt: "2026-10-11T14:00:06.000Z",
        endedAt: "2026-10-11T14:08:00.000Z", durationSeconds: 474, result: "已接通",
        recordingStatus: "Mock", planStepId: "", operatorId: "P-002",
      },
    ],
    dispatch: [{ eventId: "EVT-20261012-001", selectedPersonIds: [], selectedVehicleIds: [], lockedResources: [], activeStepId: null, updatedAt: "2026-10-12 08:18:00" }],
  };
  const memoryStorage = Object.create(null);

  function getStorage() {
    try { return root?.localStorage || null; } catch { return null; }
  }

  function readCollection(name) {
    const storage = getStorage();
    if (!storage) return Array.isArray(memoryStorage[name]) ? clone(memoryStorage[name]) : clone(seed[name]) || [];
    try {
      const value = JSON.parse(storage.getItem(keys[name]) || "null");
      return Array.isArray(value) ? value : clone(seed[name]) || [];
    } catch { return clone(seed[name]) || []; }
  }

  function writeCollection(name, value) {
    const storage = getStorage();
    const result = clone(value);
    if (storage) storage.setItem(keys[name], JSON.stringify(result));
    else memoryStorage[name] = result;
    return result;
  }

  function reset() {
    Object.keys(keys).forEach((name) => writeCollection(name, seed[name] || []));
    return snapshot();
  }

  function snapshot() {
    return Object.fromEntries(Object.keys(keys).map((name) => [name, readCollection(name)]));
  }

  function matches(item, filters) {
    if (!filters || typeof filters !== "object") return true;
    return Object.entries(filters).every(([key, value]) => {
      if (value == null || value === "" || (Array.isArray(value) && !value.length)) return true;
      const current = item[key];
      if (Array.isArray(value)) return value.includes(current);
      if (Array.isArray(current)) return current.some((entry) => String(entry).toLowerCase().includes(String(value).toLowerCase()));
      return String(current ?? "").toLowerCase().includes(String(value).toLowerCase());
    });
  }

  function list(name, filters) { return readCollection(name).filter((item) => matches(item, filters)).map(clone); }

  function save(name, idKey, value) {
    if (!value || typeof value !== "object") throw new TypeError("实体数据必须是对象");
    const collection = readCollection(name);
    const idPrefixes = { personId: "P", resourceId: "R", planId: "PLAN", eventId: "EVT", callId: "CALL", riskId: "RISK", categoryId: "CAT" };
    const id = value[idKey] || makeId(idPrefixes[idKey] || idKey.replace(/Id$/, "").slice(0, 4).toUpperCase());
    const existingIndex = collection.findIndex((item) => item[idKey] === id);
    const entity = { ...(existingIndex >= 0 ? collection[existingIndex] : {}), ...clone(value), [idKey]: id, updatedAt: value.updatedAt || now() };
    if (existingIndex >= 0) collection[existingIndex] = entity; else collection.push(entity);
    writeCollection(name, collection);
    return clone(entity);
  }

  function remove(name, idKey, id) {
    const collection = readCollection(name);
    const next = collection.filter((item) => item[idKey] !== id);
    writeCollection(name, next);
    return next.length !== collection.length;
  }

  function get(name, idKey, id) { return list(name).find((item) => item[idKey] === id) || null; }

  function appendTimeline(eventId, entry) {
    const event = get("events", "eventId", eventId);
    if (!event) throw new Error(`事件不存在: ${eventId}`);
    const timelineEntry = { timelineId: makeId("TL"), at: now(), type: "操作", title: "事件更新", message: "", ...clone(entry) };
    event.timeline = Array.isArray(event.timeline) ? event.timeline : [];
    event.timeline.push(timelineEntry);
    event.updatedAt = now();
    return save("events", "eventId", event);
  }

  function getDispatch(eventId) {
    const existing = get("dispatch", "eventId", eventId);
    if (existing) return existing;
    return save("dispatch", "eventId", { eventId, selectedPersonIds: [], selectedVehicleIds: [], lockedResources: [], activeStepId: null });
  }

  function saveDispatch(value) {
    const dispatch = { selectedPersonIds: [], selectedVehicleIds: [], lockedResources: [], activeStepId: null, ...clone(value) };
    if (!dispatch.eventId) throw new Error("调度记录缺少 eventId");
    return save("dispatch", "eventId", dispatch);
  }

  function lockResource(eventId, resourceId, quantity = 1) {
    const amount = Number(quantity);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("数量必须大于 0");
    const resource = get("resources", "resourceId", resourceId);
    if (!resource) throw new Error(`物资不存在: ${resourceId}`);
    if (amount > Number(resource.available || 0)) throw new Error("库存不足");
    resource.available = Number(resource.available || 0) - amount;
    resource.occupied = Number(resource.occupied || 0) + amount;
    resource.status = resource.available > 0 ? "可用" : "已占用";
    resource.updatedAt = now();
    const updated = save("resources", "resourceId", resource);
    const dispatch = getDispatch(eventId);
    dispatch.lockedResources = Array.isArray(dispatch.lockedResources) ? dispatch.lockedResources : [];
    const lock = dispatch.lockedResources.find((item) => item.resourceId === resourceId);
    if (lock) lock.quantity += amount; else dispatch.lockedResources.push({ resourceId, quantity: amount });
    saveDispatch(dispatch);
    const event = get("events", "eventId", eventId);
    if (event) {
      event.lockedResourceIds = Array.from(new Set([...(event.lockedResourceIds || []), resourceId]));
      save("events", "eventId", event);
      appendTimeline(eventId, { type: "物资", title: "锁定应急物资", refId: resourceId, message: `${resource.name} × ${amount}` });
    }
    return updated;
  }

  function releaseResource(eventId, resourceId, quantity) {
    const resource = get("resources", "resourceId", resourceId);
    if (!resource) throw new Error(`物资不存在: ${resourceId}`);
    const dispatch = getDispatch(eventId);
    const lock = (dispatch.lockedResources || []).find((item) => item.resourceId === resourceId);
    const amount = Math.min(Number(quantity || lock?.quantity || 0), Number(lock?.quantity || 0));
    if (amount <= 0) return resource;
    resource.available = Number(resource.available || 0) + amount;
    resource.occupied = Math.max(0, Number(resource.occupied || 0) - amount);
    resource.status = "可用";
    const updated = save("resources", "resourceId", resource);
    dispatch.lockedResources = (dispatch.lockedResources || []).map((item) => item.resourceId === resourceId ? { ...item, quantity: item.quantity - amount } : item).filter((item) => item.quantity > 0);
    saveDispatch(dispatch);
    const event = get("events", "eventId", eventId);
    if (event) {
      event.lockedResourceIds = (event.lockedResourceIds || []).filter((id) => id !== resourceId || dispatch.lockedResources.some((item) => item.resourceId === resourceId));
      save("events", "eventId", event);
      appendTimeline(eventId, { type: "物资", title: "释放应急物资", refId: resourceId, message: `${resource.name} × ${amount}` });
    }
    return updated;
  }

  function transitionEvent(eventId, status, message = "") {
    const event = get("events", "eventId", eventId);
    if (!event) throw new Error(`事件不存在: ${eventId}`);
    if (event.status !== status && !(transitions[event.status] || []).includes(status)) throw new Error(`不允许从${event.status}变更为${status}`);
    event.status = status;
    if (status === "已关闭" || status === "误报关闭" || status === "已完成") event.closedAt = event.closedAt || now();
    if (status === "处理中" && !event.startedAt) event.startedAt = now();
    if (status === "已完成") event.finishedAt = now();
    if (status === "待指派") event.handler = "";
    const updated = save("events", "eventId", event);
    const note = typeof message === "string" ? message : (message?.message || message?.operator || "");
    return appendTimeline(eventId, { type: "状态", title: `事件状态变更为${status}`, message: note, operator: message?.operator || "当前用户" });
  }

  function matchPlans(eventOrId) {
    const event = typeof eventOrId === "string" ? get("events", "eventId", eventOrId) : eventOrId;
    if (!event) return [];
    return list("plans")
      .filter((plan) => plan.status === "已发布" && plan.enabled !== "停用")
      .map((plan) => {
        let score = 0;
        if (plan.eventType && plan.eventType === event.eventType) score += 4;
        if (plan.level && plan.level === event.level) score += 2;
        if (plan.area && (plan.area === "全域" || plan.area === event.section || String(event.location || "").includes(plan.area))) score += 1;
        return { ...plan, matchScore: score };
      })
      .filter((plan) => plan.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  function saveRisk(value = {}) {
    if (!value || typeof value !== "object") throw new TypeError("实体数据必须是对象");
    const existing = value.riskId ? get("risks", "riskId", value.riskId) : null;
    return save("risks", "riskId", {
      ...(existing ? {} : { status: "待评估", factors: [] }),
      ...clone(value),
      code: value.code || existing?.code || `RW-${Date.now().toString(36).toUpperCase()}`,
      createdAt: existing?.createdAt || value.createdAt || now(),
    });
  }

  function logCall(input = {}) {
    const callerId = input.callerId || "P-001";
    const calleeIds = Array.isArray(input.calleeIds) ? input.calleeIds : input.calleeId ? [input.calleeId] : [];
    const caller = get("personnel", "personId", callerId);
    const callees = calleeIds.map((id) => get("personnel", "personId", id)).filter(Boolean);
    const call = {
      callId: input.callId || makeId("CALL"), eventId: input.eventId || "", eventNo: input.eventNo || "", callerId, calleeIds,
      callerName: input.callerName || caller?.name || callerId, calleeNames: input.calleeNames || callees.map((person) => person.name),
      callerUnit: input.callerUnit || caller?.unit || "", calleeUnits: input.calleeUnits || callees.map((person) => person.unit),
      type: input.type || "单呼", source: input.source || "应急调度台", startedAt: input.startedAt || now(), connectedAt: input.connectedAt || (input.result === "已接通" ? now() : ""), endedAt: input.endedAt || "", durationSeconds: Number(input.durationSeconds || 0), result: input.result || "已接通", recordingStatus: input.recordingStatus || "Mock", planStepId: input.planStepId || "", operatorId: input.operatorId || callerId,
    };
    const saved = save("calls", "callId", call);
    if (saved.eventId && get("events", "eventId", saved.eventId)) appendTimeline(saved.eventId, { type: "通话", title: `${saved.type}通信`, refId: saved.callId, message: `${saved.callerName} → ${saved.calleeNames.join("、") || "未指定对象"}（${saved.result}）` });
    return saved;
  }

  function isResourceBound(resourceId) {
    const resource = get("resources", "resourceId", resourceId);
    if (!resource) return false;
    if (Number(resource.occupied || 0) > 0) return true;
    return list("events").some((event) => (event.lockedResourceIds || []).includes(resourceId));
  }

  function isPersonBound(personId) {
    const person = get("personnel", "personId", personId);
    if (!person) return false;
    if (person.dispatchStatus === "已调度") return true;
    return list("events").some((event) => (event.dispatchedPersonIds || []).includes(personId));
  }

  const store = {
    keys,
    seed: clone(seed),
    reset,
    snapshot,
    listPersonnel: (filters) => list("personnel", filters),
    savePerson: (value) => save("personnel", "personId", value),
    getPerson: (id) => get("personnel", "personId", id),
    removePerson: (id) => {
      if (isPersonBound(id)) throw new Error("该人员已被调度绑定，不允许删除");
      return remove("personnel", "personId", id);
    },
    isPersonBound,
    listResources: (filters) => list("resources", filters),
    saveResource: (value) => save("resources", "resourceId", value),
    getResource: (id) => get("resources", "resourceId", id),
    removeResource: (id) => {
      if (isResourceBound(id)) throw new Error("该物资已被锁定或占用，不允许删除");
      return remove("resources", "resourceId", id);
    },
    isResourceBound,
    listResourceCategories: (filters) => list("resourceCategories", filters),
    saveResourceCategory: (value) => save("resourceCategories", "categoryId", value),
    removeResourceCategory: (id) => remove("resourceCategories", "categoryId", id),
    listPersonnelCategories: (filters) => list("personnelCategories", filters),
    savePersonnelCategory: (value) => save("personnelCategories", "categoryId", value),
    removePersonnelCategory: (id) => remove("personnelCategories", "categoryId", id),
    lockResource,
    releaseResource,
    listPlans: (filters) => list("plans", filters),
    savePlan: (value) => save("plans", "planId", value),
    getPlan: (id) => get("plans", "planId", id),
    removePlan: (id) => remove("plans", "planId", id),
    listEvents: (filters) => list("events", filters),
    saveEvent: (value) => save("events", "eventId", value),
    getEvent: (id) => get("events", "eventId", id),
    removeEvent: (id) => remove("events", "eventId", id),
    transitionEvent,
    appendTimeline,
    matchPlans,
    matchPlan: (event) => matchPlans(event)[0] || null,
    listRisks: (filters) => list("risks", filters),
    saveRisk,
    getRisk: (id) => get("risks", "riskId", id),
    removeRisk: (id) => remove("risks", "riskId", id),
    listCalls: (filters) => list("calls", filters),
    logCall,
    getDispatch,
    saveDispatch,
  };

  return store;
});
