(function () {
  const STORAGE_KEY = "work-order.store.v1";
  const WORK_ORDER_TYPES = ["设备异常", "环境异常", "安全事故", "消防事件"];
  const CATEGORY_WORK_TYPES = ["报事报修", "设备异常"];
  const ORDER_STATUSES = ["待指派", "待处理", "处理中", "验收中", "已完成", "已撤回"];

  const locationTree = [
    {
      name: "光谷科学岛综合管廊一期",
      corridors: [
        {
          name: "高新大道综合管廊",
          rooms: [
            {
              name: "综合舱",
              sections: [
                { name: "防火分区", pipelines: ["科学岛通信光缆", "科学岛电力管线"] },
                { name: "出入口", pipelines: ["科学岛给水管线"] },
              ],
            },
            {
              name: "电力舱",
              sections: [{ name: "通风口", pipelines: ["科学岛电力管线"] }],
            },
          ],
        },
        {
          name: "科学岛大道综合管廊",
          rooms: [
            {
              name: "燃气舱",
              sections: [{ name: "防火分区", pipelines: ["科学岛燃气管线"] }],
            },
          ],
        },
      ],
    },
    {
      name: "科学岛综合管廊",
      corridors: [
        {
          name: "环岛路管廊",
          rooms: [
            {
              name: "综合舱",
              sections: [{ name: "吊装口", pipelines: ["科学岛通信光缆"] }],
            },
          ],
        },
      ],
    },
  ];

  const seedCategories = [
    { id: "CAT-001", code: "BX2026101001", name: "工程线条", workType: "报事报修", parentId: "", level: 1, sort: 0, status: "正常", remark: "", createdAt: "2026-10-10 10:00:00" },
    { id: "CAT-002", code: "BX2026101002", name: "弱电智能化系统", workType: "报事报修", parentId: "CAT-001", level: 2, sort: 0, status: "正常", remark: "", createdAt: "2026-10-10 10:01:00" },
    { id: "CAT-003", code: "BX2026101003", name: "装饰系统", workType: "报事报修", parentId: "CAT-001", level: 2, sort: 1, status: "正常", remark: "", createdAt: "2026-10-10 10:02:00" },
    { id: "CAT-004", code: "BX2026101004", name: "设备离线", workType: "报事报修", parentId: "", level: 1, sort: 1, status: "正常", remark: "", createdAt: "2026-10-10 10:03:00" },
    { id: "CAT-005", code: "BX2026101005", name: "传感器故障", workType: "设备异常", parentId: "", level: 1, sort: 0, status: "正常", remark: "", createdAt: "2026-10-10 10:04:00" },
    { id: "CAT-007", code: "BX2026101101", name: "巡检异常上报", workType: "设备异常", parentId: "", level: 1, sort: 1, status: "正常", remark: "", createdAt: "2026-10-11 09:00:00" },
    { id: "CAT-006", code: "BX2026101006", name: "停用分类样例", workType: "报事报修", parentId: "", level: 1, sort: 9, status: "停用", remark: "不应出现在下拉", createdAt: "2026-10-10 10:05:00" },
  ];

  const seedOrders = [
    {
      id: "WO-001", code: "WO2026101001", name: "综合舱弱电检修",
      content: "弱电箱指示灯异常", photos: [],
      bizType: "报事报修",
      orderType: "设备异常", categoryId: "CAT-002", categoryName: "弱电智能化系统",
      project: "光谷科学岛综合管廊一期", corridor: "高新大道综合管廊", room: "综合舱", section: "防火分区", pipeline: "科学岛通信光缆",
      status: "待指派", handler: "", contact: "王鹏程", contactPhone: "15271361018",
      submittedAt: "2026-10-10 14:21:07", startedAt: "", finishedAt: "",
      records: [{ id: "R-001", action: "创建", operator: "王鹏程", at: "2026-10-10 14:21:07", note: "新建报事报修", photos: [] }],
    },
    {
      id: "WO-002", code: "WO2026101002", name: "出入口照明故障",
      content: "出入口应急照明不亮，需更换灯管", photos: [],
      bizType: "报事报修",
      orderType: "设备异常", categoryId: "CAT-003", categoryName: "装饰系统",
      project: "光谷科学岛综合管廊一期", corridor: "高新大道综合管廊", room: "综合舱", section: "出入口", pipeline: "科学岛给水管线",
      status: "待指派", handler: "", contact: "张强", contactPhone: "15271361004",
      submittedAt: "2026-10-10 15:02:33", startedAt: "", finishedAt: "",
      records: [{ id: "R-002", action: "创建", operator: "张强", at: "2026-10-10 15:02:33", note: "新建报事报修", photos: [] }],
    },
    {
      id: "WO-003", code: "WO2026101003", name: "燃气舱传感器离线",
      content: "可燃气体传感器连续24小时无数据上报", photos: [],
      bizType: "报事报修",
      orderType: "环境异常", categoryId: "CAT-005", categoryName: "传感器故障",
      project: "光谷科学岛综合管廊一期", corridor: "科学岛大道综合管廊", room: "燃气舱", section: "防火分区", pipeline: "科学岛燃气管线",
      status: "待处理", handler: "黄志深", contact: "潘隆坤", contactPhone: "15772599167",
      submittedAt: "2026-10-09 09:15:00", startedAt: "", finishedAt: "",
      records: [
        { id: "R-003", action: "创建", operator: "潘隆坤", at: "2026-10-09 09:15:00", note: "新建报事报修", photos: [] },
        { id: "R-004", action: "指派", operator: "张强", at: "2026-10-09 10:30:00", note: "指派给黄志深处理", photos: [] },
      ],
    },
    {
      id: "WO-004", code: "WO2026101004", name: "电力舱通风口异响",
      content: "排风机运行时有异常振动和噪音", photos: [],
      bizType: "报事报修",
      orderType: "设备异常", categoryId: "CAT-005", categoryName: "传感器故障",
      project: "光谷科学岛综合管廊一期", corridor: "高新大道综合管廊", room: "电力舱", section: "通风口", pipeline: "科学岛电力管线",
      status: "处理中", handler: "彭飞龙", contact: "何明红", contactPhone: "15186643109",
      submittedAt: "2026-10-08 11:20:00", startedAt: "2026-10-08 14:00:00", finishedAt: "",
      records: [
        { id: "R-005", action: "创建", operator: "何明红", at: "2026-10-08 11:20:00", note: "新建报事报修", photos: [] },
        { id: "R-006", action: "指派", operator: "张强", at: "2026-10-08 12:00:00", note: "指派给彭飞龙", photos: [] },
        { id: "R-007", action: "开始处理", operator: "彭飞龙", at: "2026-10-08 14:00:00", note: "已到场检查，准备更换轴承", photos: [] },
      ],
    },
    {
      id: "WO-005", code: "WO2026101005", name: "综合舱墙面渗水",
      content: "防火分区东侧墙面出现渗水痕迹", photos: [],
      bizType: "报事报修",
      orderType: "安全事故", categoryId: "CAT-001", categoryName: "工程线条",
      project: "光谷科学岛综合管廊一期", corridor: "高新大道综合管廊", room: "综合舱", section: "防火分区", pipeline: "科学岛通信光缆",
      status: "验收中", handler: "张晓慧", contact: "邹丽平", contactPhone: "13728019966",
      submittedAt: "2026-10-07 08:45:00", startedAt: "2026-10-07 10:00:00", finishedAt: "",
      records: [
        { id: "R-008", action: "创建", operator: "邹丽平", at: "2026-10-07 08:45:00", note: "新建报事报修", photos: [] },
        { id: "R-009", action: "指派", operator: "张强", at: "2026-10-07 09:00:00", note: "指派给张晓慧", photos: [] },
        { id: "R-010", action: "开始处理", operator: "张晓慧", at: "2026-10-07 10:00:00", note: "封堵渗水点并做防水处理", photos: [] },
        { id: "R-011", action: "提交验收", operator: "张晓慧", at: "2026-10-09 16:30:00", note: "处理完成，申请验收", photos: [] },
      ],
    },
    {
      id: "WO-006", code: "WO2026101006", name: "环岛路监控离线",
      content: "枪式摄像机03号连续离线超过48小时", photos: [],
      bizType: "报事报修",
      orderType: "设备异常", categoryId: "CAT-004", categoryName: "设备离线",
      project: "科学岛综合管廊", corridor: "环岛路管廊", room: "综合舱", section: "吊装口", pipeline: "科学岛通信光缆",
      status: "已完成", handler: "黄志深", contact: "李国栋", contactPhone: "13600992318",
      submittedAt: "2026-10-05 13:10:00", startedAt: "2026-10-05 15:00:00", finishedAt: "2026-10-06 11:00:00",
      records: [
        { id: "R-012", action: "创建", operator: "李国栋", at: "2026-10-05 13:10:00", note: "新建报事报修", photos: [] },
        { id: "R-013", action: "指派", operator: "张强", at: "2026-10-05 14:00:00", note: "指派给黄志深", photos: [] },
        { id: "R-014", action: "开始处理", operator: "黄志深", at: "2026-10-05 15:00:00", note: "检查网络链路", photos: [] },
        { id: "R-015", action: "提交验收", operator: "黄志深", at: "2026-10-06 10:30:00", note: "更换交换机端口，监控恢复", photos: [] },
        { id: "R-016", action: "验收通过", operator: "张强", at: "2026-10-06 11:00:00", note: "验收合格，工单关闭", photos: [] },
      ],
    },
    {
      id: "WO-007", code: "WO2026101007", name: "消防事件误报",
      content: "火灾报警主机误触发，经核实为灰尘干扰", photos: [],
      bizType: "报事报修",
      orderType: "消防事件", categoryId: "CAT-002", categoryName: "弱电智能化系统",
      project: "光谷科学岛综合管廊一期", corridor: "高新大道综合管廊", room: "综合舱", section: "出入口", pipeline: "科学岛通信光缆",
      status: "已撤回", handler: "", contact: "王雅琳", contactPhone: "15019462775",
      submittedAt: "2026-10-04 16:00:00", startedAt: "", finishedAt: "",
      records: [
        { id: "R-017", action: "创建", operator: "王雅琳", at: "2026-10-04 16:00:00", note: "新建报事报修", photos: [] },
        { id: "R-018", action: "撤回", operator: "王雅琳", at: "2026-10-04 16:45:00", note: "现场确认误报，撤回工单", photos: [] },
      ],
    },
    {
      id: "WO-008", code: "WO2026101008", name: "综合舱温湿度超标",
      content: "综合舱温湿度传感器读数持续超标，需排查通风系统", photos: [],
      bizType: "报事报修",
      orderType: "环境异常", categoryId: "CAT-005", categoryName: "传感器故障",
      project: "光谷科学岛综合管廊一期", corridor: "高新大道综合管廊", room: "综合舱", section: "防火分区", pipeline: "科学岛电力管线",
      status: "待处理", handler: "潘隆坤", contact: "刘建华", contactPhone: "13922158840",
      submittedAt: "2026-10-10 08:30:00", startedAt: "", finishedAt: "",
      records: [
        { id: "R-019", action: "创建", operator: "刘建华", at: "2026-10-10 08:30:00", note: "新建报事报修", photos: [] },
        { id: "R-020", action: "指派", operator: "张强", at: "2026-10-10 09:00:00", note: "指派给潘隆坤", photos: [] },
      ],
    },
    {
      id: "WO-D-001", code: "WO2026101101", name: "塔楼23层声光异常",
      content: "巡检发现声光报警器异常，需现场复核",
      photos: [],
      bizType: "设备异常",
      orderType: "设备异常",
      categoryId: "CAT-007", categoryName: "巡检异常上报",
      project: "光谷科学岛综合管廊一期", corridor: "高新大道综合管廊", room: "综合舱", section: "防火分区", pipeline: "科学岛通信光缆",
      status: "待指派", handler: "", contact: "王鹏程", contactPhone: "15271361018",
      submittedAt: "2026-10-11 09:10:00", startedAt: "", finishedAt: "",
      abnormalDevice: {
        source: "巡检任务",
        taskCode: "IT202610081625191385",
        taskName: "大楼巡检-202610080900",
        deviceName: "塔楼23层声光",
        deviceCode: "001_HZXFXT03BJ04_1652_0003",
      },
      records: [{ id: "R-D-001", action: "创建", operator: "王鹏程", at: "2026-10-11 09:10:00", note: "巡检异常上报生成工单", photos: [] }],
    },
    {
      id: "WO-D-002", code: "WO2026101102", name: "可燃气体传感器报警转工单",
      content: "报警信息转工单：传感器超限",
      photos: [],
      bizType: "设备异常",
      orderType: "环境异常",
      categoryId: "CAT-005", categoryName: "传感器故障",
      project: "光谷科学岛综合管廊一期", corridor: "科学岛大道综合管廊", room: "燃气舱", section: "防火分区", pipeline: "科学岛燃气管线",
      status: "待处理", handler: "黄志深", contact: "潘隆坤", contactPhone: "15772599167",
      submittedAt: "2026-10-11 08:20:00", startedAt: "", finishedAt: "",
      abnormalDevice: {
        source: "报警信息",
        taskCode: "AL202610110820001",
        taskName: "燃气舱可燃气体超限",
        deviceName: "可燃气体传感器-03",
        deviceCode: "001_HZHJXT01CG03_1201_0008",
      },
      records: [
        { id: "R-D-002", action: "创建", operator: "系统", at: "2026-10-11 08:20:00", note: "报警转工单", photos: [] },
        { id: "R-D-003", action: "指派", operator: "张强", at: "2026-10-11 08:35:00", note: "指派给黄志深", photos: [] },
      ],
    },
    {
      id: "WO-D-003", code: "WO2026101103", name: "综合舱门禁控制器异常",
      content: "门禁控制器通讯中断，需现场排查",
      photos: [],
      bizType: "设备异常",
      orderType: "设备异常",
      categoryId: "CAT-007", categoryName: "巡检异常上报",
      project: "光谷科学岛综合管廊一期", corridor: "高新大道综合管廊", room: "综合舱", section: "出入口", pipeline: "科学岛通信光缆",
      status: "处理中", handler: "彭飞龙", contact: "何明红", contactPhone: "15186643109",
      submittedAt: "2026-10-11 07:30:00", startedAt: "2026-10-11 08:00:00", finishedAt: "",
      abnormalDevice: {
        source: "巡检任务",
        taskCode: "IT202610101030221456",
        taskName: "综合舱巡检-202610100730",
        deviceName: "综合舱门禁控制器-01",
        deviceCode: "001_HZXFXT01MJ01_0801_0012",
      },
      records: [
        { id: "R-D-004", action: "创建", operator: "何明红", at: "2026-10-11 07:30:00", note: "巡检异常上报生成工单", photos: [] },
        { id: "R-D-005", action: "指派", operator: "张强", at: "2026-10-11 07:45:00", note: "指派给彭飞龙", photos: [] },
        { id: "R-D-006", action: "开始处理", operator: "彭飞龙", at: "2026-10-11 08:00:00", note: "已到场检查通讯线路", photos: [] },
      ],
    },
    {
      id: "WO-D-004", code: "WO2026101104", name: "电力舱温湿度传感器漂移",
      content: "温湿度传感器读数漂移，已完成现场校准并提交验收",
      photos: [],
      bizType: "设备异常",
      orderType: "环境异常",
      categoryId: "CAT-005", categoryName: "传感器故障",
      project: "光谷科学岛综合管廊一期", corridor: "高新大道综合管廊", room: "电力舱", section: "通风口", pipeline: "科学岛电力管线",
      status: "验收中", handler: "张晓慧", contact: "邹丽平", contactPhone: "13728019966",
      submittedAt: "2026-10-10 16:00:00", startedAt: "2026-10-10 17:00:00", finishedAt: "",
      abnormalDevice: {
        source: "报警信息",
        taskCode: "AL202610101600002",
        taskName: "电力舱温湿度超限",
        deviceName: "温湿度传感器-12",
        deviceCode: "001_HZHJXT02CG12_0902_0015",
      },
      records: [
        { id: "R-D-007", action: "创建", operator: "系统", at: "2026-10-10 16:00:00", note: "报警转工单", photos: [] },
        { id: "R-D-008", action: "指派", operator: "张强", at: "2026-10-10 16:20:00", note: "指派给张晓慧", photos: [] },
        { id: "R-D-009", action: "开始处理", operator: "张晓慧", at: "2026-10-10 17:00:00", note: "现场校准传感器", photos: [] },
        { id: "R-D-010", action: "提交验收", operator: "张晓慧", at: "2026-10-11 09:30:00", note: "校准完成，申请验收", photos: [] },
      ],
    },
    {
      id: "WO-D-005", code: "WO2026101105", name: "环岛路半球摄像机离线",
      content: "半球摄像机供电异常，已更换电源模块并验收通过",
      photos: [],
      bizType: "设备异常",
      orderType: "设备异常",
      categoryId: "CAT-007", categoryName: "巡检异常上报",
      project: "科学岛综合管廊", corridor: "环岛路管廊", room: "综合舱", section: "吊装口", pipeline: "科学岛通信光缆",
      status: "已完成", handler: "黄志深", contact: "李国栋", contactPhone: "13600992318",
      submittedAt: "2026-10-09 10:00:00", startedAt: "2026-10-09 11:00:00", finishedAt: "2026-10-09 15:30:00",
      abnormalDevice: {
        source: "巡检任务",
        taskCode: "IT202610090930112233",
        taskName: "环岛路巡检-202610090900",
        deviceName: "环岛路半球摄像机-02",
        deviceCode: "001_HZSPXT01QJ02_0701_0006",
      },
      records: [
        { id: "R-D-011", action: "创建", operator: "李国栋", at: "2026-10-09 10:00:00", note: "巡检异常上报生成工单", photos: [] },
        { id: "R-D-012", action: "指派", operator: "张强", at: "2026-10-09 10:20:00", note: "指派给黄志深", photos: [] },
        { id: "R-D-013", action: "开始处理", operator: "黄志深", at: "2026-10-09 11:00:00", note: "检查供电模块", photos: [] },
        { id: "R-D-014", action: "提交验收", operator: "黄志深", at: "2026-10-09 14:40:00", note: "更换电源模块，监控恢复", photos: [] },
        { id: "R-D-015", action: "验收通过", operator: "张强", at: "2026-10-09 15:30:00", note: "验收合格，工单关闭", photos: [] },
      ],
    },
    {
      id: "WO-D-006", code: "WO2026101106", name: "综合舱烟感误报",
      content: "烟感报警误触发，现场确认无火情后撤回工单",
      photos: [],
      bizType: "设备异常",
      orderType: "消防事件",
      categoryId: "CAT-007", categoryName: "巡检异常上报",
      project: "光谷科学岛综合管廊一期", corridor: "高新大道综合管廊", room: "综合舱", section: "防火分区", pipeline: "科学岛通信光缆",
      status: "已撤回", handler: "", contact: "王雅琳", contactPhone: "15019462775",
      submittedAt: "2026-10-08 14:00:00", startedAt: "", finishedAt: "",
      abnormalDevice: {
        source: "报警信息",
        taskCode: "AL202610081400003",
        taskName: "综合舱烟感报警",
        deviceName: "烟感探测器-08",
        deviceCode: "001_HZXFXT02YG08_0503_0009",
      },
      records: [
        { id: "R-D-016", action: "创建", operator: "系统", at: "2026-10-08 14:00:00", note: "报警转工单", photos: [] },
        { id: "R-D-017", action: "撤回", operator: "王雅琳", at: "2026-10-08 14:25:00", note: "现场确认误报，撤回工单", photos: [] },
      ],
    },
  ];

  const personnel = [
    { id: "U-001", name: "彭飞龙", phone: "13060993725", dept: "机电工程部" },
    { id: "U-002", name: "张晓慧", phone: "13416456121", dept: "土建工程部" },
    { id: "U-003", name: "黄志深", phone: "17512887806", dept: "设备运维部" },
    { id: "U-004", name: "张强", phone: "15271361004", dept: "项目综合管理部" },
    { id: "U-005", name: "潘隆坤", phone: "15772599167", dept: "设备运维部" },
    { id: "U-006", name: "何明红", phone: "15186643109", dept: "招商运营部" },
    { id: "U-007", name: "邹丽平", phone: "13728019966", dept: "客户服务部" },
    { id: "U-008", name: "李国栋", phone: "13600992318", dept: "物业服务部" },
    { id: "U-009", name: "王鹏程", phone: "15271361018", dept: "物业服务部" },
    { id: "U-010", name: "王雅琳", phone: "15019462775", dept: "环境管理部" },
    { id: "U-011", name: "刘建华", phone: "13922158840", dept: "秩序维护部" },
    { id: "U-012", name: "陈思远", phone: "15822390067", dept: "财务核算组" },
    { id: "U-013", name: "周敏", phone: "13455667788", dept: "成本管理组" },
  ];

  const departments = [
    { id: "D-01", name: "科学岛管廊监控中心", children: [
      { id: "D-02", name: "项目管理中心", children: [
        { id: "D-03", name: "项目综合管理部" },
        { id: "D-04", name: "招商运营部" },
        { id: "D-05", name: "客户服务部" },
      ] },
      { id: "D-06", name: "工程管理中心", children: [
        { id: "D-07", name: "机电工程部" },
        { id: "D-08", name: "土建工程部" },
        { id: "D-09", name: "设备运维部" },
      ] },
      { id: "D-10", name: "物业运营中心", children: [
        { id: "D-11", name: "物业服务部" },
        { id: "D-12", name: "环境管理部" },
        { id: "D-13", name: "秩序维护部" },
      ] },
      { id: "D-14", name: "财务管理部", children: [
        { id: "D-15", name: "财务核算组" },
        { id: "D-16", name: "成本管理组" },
      ] },
    ] },
  ];

  function normalizeOrder(order) {
    const next = { ...order };
    if (!next.bizType) next.bizType = "报事报修";
    if (next.abnormalDevice && typeof next.abnormalDevice === "object") {
      next.abnormalDevice = {
        source: next.abnormalDevice.source || "",
        taskCode: next.abnormalDevice.taskCode || "",
        taskName: next.abnormalDevice.taskName || "",
        deviceName: next.abnormalDevice.deviceName || "",
        deviceCode: next.abnormalDevice.deviceCode || "",
      };
    }
    return next;
  }

  function cloneSeedOrder(x) {
    return normalizeOrder({
      ...x,
      photos: [...(x.photos || [])],
      records: (x.records || []).map((r) => ({ ...r })),
      abnormalDevice: x.abnormalDevice ? { ...x.abnormalDevice } : undefined,
    });
  }

  function ensureCategorySeeds(categories) {
    const ids = new Set(categories.map((c) => c.id));
    const extras = seedCategories.filter((c) => !ids.has(c.id));
    return extras.length ? [...categories, ...extras.map((x) => ({ ...x }))] : categories;
  }

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      let categories = seedCategories.map((x) => ({ ...x }));
      if (raw) {
        const parsed = JSON.parse(raw);
        categories = ensureCategorySeeds(
          Array.isArray(parsed.categories) ? parsed.categories : categories
        );
      }
      // 工单列表每次刷新回到种子初始状态；分类仍持久化
      return {
        categories,
        orders: seedOrders.map(cloneSeedOrder),
      };
    } catch (_) {
      return {
        categories: seedCategories.map((x) => ({ ...x })),
        orders: seedOrders.map(cloneSeedOrder),
      };
    }
  }

  function saveStore(categories, orders) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ categories, orders }));
  }

  const store = loadStore();
  saveStore(store.categories, store.orders);

  window.WORK_ORDER_DATA = {
    WORK_ORDER_TYPES, CATEGORY_WORK_TYPES, ORDER_STATUSES,
    locationTree, personnel, departments,
    seedCategories, seedOrders,
  };

  window.WORK_ORDER_STORE = {
    getCategories: () => store.categories,
    getOrders: () => store.orders,
    setCategories(list) { store.categories = list; saveStore(store.categories, store.orders); },
    setOrders(list) { store.orders = list; saveStore(store.categories, store.orders); },
    persist() { saveStore(store.categories, store.orders); },
    reset() {
      store.categories = seedCategories.map((x) => ({ ...x }));
      store.orders = seedOrders.map(cloneSeedOrder);
      saveStore(store.categories, store.orders);
    },
  };
})();
