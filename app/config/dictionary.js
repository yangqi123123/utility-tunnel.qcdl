(function () {
  const defaults = {
    projectUsage: [
      { label: "办公建筑", value: "office" },
      { label: "园区", value: "park" }
    ],
    projectStatus: [
      { label: "未开工", value: "not-started" },
      { label: "在建", value: "building" },
      { label: "停工", value: "suspended" },
      { label: "竣备", value: "completed" },
      { label: "其他", value: "other" }
    ],
    regulationCategory: [
      { label: "安全生产", value: "安全生产" },
      { label: "消防安全", value: "消防安全" },
      { label: "应急管理", value: "应急管理" },
      { label: "职业健康", value: "职业健康" }
    ]
  };

  const stored = JSON.parse(localStorage.getItem("app-project-dictionary") || "null");
  const regulationStored = JSON.parse(localStorage.getItem("app-regulation-dictionary") || "null");
  window.APP_DICTIONARY = {
    ...defaults,
    ...(stored || {}),
    ...(regulationStored || {})
  };
})();
