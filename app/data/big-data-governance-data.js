(function () {
  const SOUTH_SYSTEMS = [
    "环境与设备监控",
    "入侵报警系统",
    "门禁系统",
    "智能井盖系统",
    "电力监测系统",
    "通信系统",
    "火灾报警系统",
    "消防监控系统",
    "安全防范系统",
    "电子巡更系统",
  ];

  /** 与北向对接任务「数据范围」SCOPE_OPTIONS 一致 */
  const NORTH_SCOPES = [
    "数据库管理",
    "资产管理",
    "设备监测",
    "通信系统",
    "入侵报警系统",
    "智能井盖系统",
    "门禁系统",
    "电子巡更系统",
    "工单管理",
    "环境与设备监控",
    "应急管理系统",
    "安全管理",
    "报警中心",
    "消防系统",
    "电力监测系统",
    "火灾报警系统",
    "安全防范系统",
  ];

  const ALL_SYSTEMS = [
    "视频监控系统",
    ...SOUTH_SYSTEMS,
  ];

  const PIE_COLORS = [
    "#3B82F6", "#14C9BA", "#F7BA1E", "#8B5CF6", "#F53F57",
    "#0EA5E9", "#22C55E", "#F97316", "#64748B", "#EC4899",
    "#06B6D4", "#A855F7", "#84CC16", "#F43F5E", "#38BDF8",
    "#FB923C", "#94A3B8",
  ];

  function wave(base, amp, n, phase) {
    return Array.from({ length: n }, (_, i) =>
      Math.max(0, Math.round((base + Math.sin(i * 0.55 + phase) * amp + ((i % 4) - 1.5) * amp * 0.15) * 100) / 100)
    );
  }

  const southPie = SOUTH_SYSTEMS.map((name, i) => ({
    name,
    value: [18, 14, 12, 8, 16, 11, 9, 10, 7, 5][i],
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  const northPie = NORTH_SCOPES.map((name, i) => ({
    name,
    value: [9, 8, 10, 7, 6, 5, 6, 4, 8, 9, 5, 4, 11, 7, 8, 6, 5][i],
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  const dayLabels = Array.from({ length: 19 }, (_, i) => {
    const d = new Date(2026, 9, 1 + i);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `2026-${m}-${day}`;
  });

  const southTrend = {
    labels: dayLabels,
    counts: wave(12.6, 2.2, dayLabels.length, 0.2),
    storage: wave(0.85, 0.12, dayLabels.length, 0.8),
  };

  const northTrend = {
    labels: dayLabels,
    counts: wave(8.4, 1.6, dayLabels.length, 1.1),
    storage: wave(0.42, 0.08, dayLabels.length, 1.4),
  };

  const qualityAlarms = ALL_SYSTEMS.map((system, i) => ({
    system,
    count: [186, 142, 98, 76, 54, 128, 88, 112, 95, 67, 41][i],
  }));

  const datasets = [
    { name: "设备主数据", domain: "设备", volume: 12840 },
    { name: "报警事件标准层", domain: "报警", volume: 35620 },
    { name: "能耗日汇总", domain: "能耗", volume: 4820 },
    { name: "环境监测分区快照", domain: "环境", volume: 9640 },
    { name: "巡检任务标准层", domain: "巡检", volume: 6120 },
    { name: "保养任务标准层", domain: "保养", volume: 3280 },
    { name: "工单事件标准层", domain: "工单", volume: 8940 },
    { name: "子系统运行状态日汇总", domain: "监测", volume: 2150 },
  ].map((x, i) => ({ ...x, color: PIE_COLORS[i % PIE_COLORS.length] }));

  window.BIG_DATA_GOVERNANCE_DATA = {
    SOUTH_SYSTEMS,
    NORTH_SCOPES,
    SYSTEMS: ALL_SYSTEMS,
    kpis: {
      sources: 46,
      collectWan: 12.86,
      reportWan: 8.42,
      storageTb: 18.6,
    },
    southPie,
    northPie,
    southTrend,
    northTrend,
    qualityAlarms,
    datasets,
  };
})();
