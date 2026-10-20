(function () {
  const STORAGE_KEY = "work-order.dispatch-config.v1";

  const ROLES = [
    { id: "role-admin", name: "管理员" },
    { id: "role-ops", name: "运维员" },
    { id: "role-dispatch", name: "调度员" },
  ];

  const USERS = [
    { id: "u-li", name: "李工", deptId: "dept-pm" },
    { id: "u-wang", name: "王工", deptId: "dept-pm" },
    { id: "u-zhao", name: "赵工", deptId: "dept-eq" },
    { id: "u-chen", name: "陈工", deptId: "dept-eq" },
    { id: "u-zhou", name: "周工", deptId: "dept-ops" },
    { id: "u-wu", name: "吴工", deptId: "dept-ops" },
  ];

  const DEPARTMENTS = [
    { id: "dept-pm", name: "项目管理部", people: ["u-li", "u-wang"] },
    { id: "dept-eq", name: "设备管理部", people: ["u-zhao", "u-chen"] },
    { id: "dept-ops", name: "运维保障部", people: ["u-zhou", "u-wu"] },
  ];

  /** 与巡检计划「选择人员」弹窗一致的组织树与人员目录 */
  const ORG_DEPARTMENTS = [
    {
      id: "D-01",
      name: "科学岛管廊监控中心",
      children: [
        {
          id: "D-02",
          name: "项目管理中心",
          children: [
            { id: "D-03", name: "项目综合管理部" },
            { id: "D-04", name: "招商运营部" },
            { id: "D-05", name: "客户服务部" },
          ],
        },
        {
          id: "D-06",
          name: "工程管理中心",
          children: [
            { id: "D-07", name: "机电工程部" },
            { id: "D-08", name: "土建工程部" },
            { id: "D-09", name: "设备运维部" },
          ],
        },
        {
          id: "D-10",
          name: "物业运营中心",
          children: [
            { id: "D-11", name: "物业服务部" },
            { id: "D-12", name: "环境管理部" },
            { id: "D-13", name: "秩序维护部" },
          ],
        },
        {
          id: "D-14",
          name: "财务管理部",
          children: [
            { id: "D-15", name: "财务核算组" },
            { id: "D-16", name: "成本管理组" },
          ],
        },
      ],
    },
  ];

  const PERSONNEL = [
    { id: "U-001", name: "彭飞龙", account: "1000011", phone: "13060993725", dept: "机电工程部" },
    { id: "U-002", name: "张晓慧", account: "1000012", phone: "13416456121", dept: "土建工程部" },
    { id: "U-003", name: "黄志深", account: "1000013", phone: "17512887806", dept: "设备运维部" },
    { id: "U-004", name: "张强", account: "1000014", phone: "15271361004", dept: "项目综合管理部" },
    { id: "U-005", name: "潘隆坤", account: "1000015", phone: "15772599167", dept: "设备运维部" },
    { id: "U-006", name: "何明红", account: "1000016", phone: "15186643109", dept: "招商运营部" },
    { id: "U-007", name: "邹丽平", account: "1000017", phone: "13728019966", dept: "客户服务部" },
    { id: "U-008", name: "李国栋", account: "1000018", phone: "13600992318", dept: "物业服务部" },
    { id: "U-009", name: "物管员", account: "1000019", phone: "13500000000", dept: "物业服务部" },
    { id: "U-010", name: "王雅琳", account: "1000020", phone: "15019462775", dept: "环境管理部" },
    { id: "U-011", name: "刘建华", account: "1000021", phone: "13922158840", dept: "秩序维护部" },
    { id: "U-012", name: "陈思远", account: "1000022", phone: "15822390067", dept: "财务核算组" },
    { id: "U-013", name: "周敏", account: "1000023", phone: "13455667788", dept: "成本管理组" },
    { id: "U-014", name: "李工", account: "1000024", phone: "13800001111", dept: "项目综合管理部" },
  ];

  function defaultConfig() {
    return {
      dispatchEnabled: true,
      dispatcherType: "user",
      dispatcherIds: ["U-014"],
      acceptor: "assignee",
      ccDispatcher: true,
      ccAssignee: true,
      otherCcIds: [],
      autoDispatchEnabled: true,
      startTime: "09:00",
      endTime: "18:00",
      departmentIds: ["dept-pm"],
      peopleIds: ["u-li"],
      remark: "",
    };
  }

  function loadAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { repair: defaultConfig(), device: defaultConfig() };
      const parsed = JSON.parse(raw);
      return {
        repair: Object.assign(defaultConfig(), parsed.repair || {}),
        device: Object.assign(defaultConfig(), parsed.device || {}),
      };
    } catch (e) {
      return { repair: defaultConfig(), device: defaultConfig() };
    }
  }

  function saveTab(tabKey, config) {
    const all = loadAll();
    all[tabKey] = config;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  function normalizeConfig(config) {
    const next = Object.assign(defaultConfig(), config || {});
    if (next.dispatcherType === "user") {
      const valid = (next.dispatcherIds || []).filter((id) => PERSONNEL.some((person) => person.id === id));
      next.dispatcherIds = valid.length ? valid : defaultConfig().dispatcherIds;
    }
    return next;
  }

  function getTab(tabKey) {
    return normalizeConfig(loadAll()[tabKey]);
  }

  function peopleOfDepartments(departmentIds) {
    const allowed = new Set(
      DEPARTMENTS.filter((d) => departmentIds.includes(d.id)).flatMap((d) => d.people)
    );
    return USERS.filter((u) => allowed.has(u.id));
  }

  window.DISPATCH_CONFIG_DATA = {
    ROLES,
    USERS,
    DEPARTMENTS,
    ORG_DEPARTMENTS,
    PERSONNEL,
    STORAGE_KEY,
    defaultConfig,
    loadAll,
    getTab,
    saveTab,
    peopleOfDepartments,
  };
})();
