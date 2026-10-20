(function () {
  const SYSTEMS = [
    "视频监控系统",
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

  const systemShare = [
    0.18, 0.14, 0.06, 0.08, 0.04, 0.16, 0.09, 0.07, 0.08, 0.06, 0.04,
  ];

  const yearTotalWan = 68.4;
  const monthTotalWan = 5.85;
  const monthSeries = [5.85, 5.12, 4.98, 5.4, 5.65, 6.02, 6.4, 6.18, 5.9, 5.85, 5.5, 5.55];

  const zoneBars = [
    { name: "防火分区", value: 1.82 },
    { name: "出入口", value: 0.96 },
    { name: "通风口", value: 1.24 },
    { name: "吊装口", value: 0.78 },
    { name: "配电间", value: 1.05 },
  ];

  const systemBars = SYSTEMS.map((name, i) => ({
    name,
    value: Math.round(yearTotalWan * systemShare[i] * 100) / 100,
  }));

  const regionRows = [
    { time: "2026-10-19 08:00:00", project: "光谷科学岛综合管廊一期", corridor: "高新大道综合管廊", room: "综合舱", section: "防火分区", pipeline: "科学岛电力管线", current: 18620, previous: 18410 },
    { time: "2026-10-19 08:00:00", project: "光谷科学岛综合管廊一期", corridor: "高新大道综合管廊", room: "电力舱", section: "通风口", pipeline: "科学岛电力管线", current: 22410, previous: 22180 },
    { time: "2026-10-19 08:00:00", project: "光谷科学岛综合管廊一期", corridor: "科学岛大道综合管廊", room: "燃气舱", section: "防火分区", pipeline: "科学岛燃气管线", current: 9800, previous: 9720 },
    { time: "2026-10-18 08:00:00", project: "科学岛综合管廊", corridor: "环岛路管廊", room: "综合舱", section: "吊装口", pipeline: "科学岛通信光缆", current: 6420, previous: 6388 },
    { time: "2026-10-18 08:00:00", project: "光谷科学岛综合管廊一期", corridor: "高新大道综合管廊", room: "综合舱", section: "出入口", pipeline: "科学岛给水管线", current: 4520, previous: 4490 },
    { time: "2026-10-17 08:00:00", project: "光谷科学岛综合管廊一期", corridor: "高新大道综合管廊", room: "电力舱", section: "通风口", pipeline: "科学岛电力管线", current: 22180, previous: 21950 },
    { time: "2026-10-17 08:00:00", project: "光谷科学岛综合管廊一期", corridor: "高新大道综合管廊", room: "综合舱", section: "防火分区", pipeline: "科学岛通信光缆", current: 12100, previous: 12020 },
    { time: "2026-10-16 08:00:00", project: "科学岛综合管廊", corridor: "环岛路管廊", room: "综合舱", section: "吊装口", pipeline: "科学岛通信光缆", current: 6388, previous: 6350 },
  ].map((row) => ({
    ...row,
    usage: Math.max(0, Number(row.current) - Number(row.previous)),
  }));

  const deviceRows = [
    { time: "2026-10-19 08:00:00", name: "电表-综合舱-01", code: "PWR-M-01", project: "光谷科学岛综合管廊一期", corridor: "高新大道综合管廊", room: "综合舱", section: "防火分区", pipeline: "科学岛电力管线", system: "电力监测系统", category: "电表", current: 8620, previous: 8510 },
    { time: "2026-10-19 08:00:00", name: "UPS-电力舱-01", code: "PWR-UPS-01", project: "光谷科学岛综合管廊一期", corridor: "高新大道综合管廊", room: "电力舱", section: "通风口", pipeline: "科学岛电力管线", system: "电力监测系统", category: "UPS", current: 12410, previous: 12280 },
    { time: "2026-10-19 08:00:00", name: "配电柜-燃气舱-01", code: "PWR-C-03", project: "光谷科学岛综合管廊一期", corridor: "科学岛大道综合管廊", room: "燃气舱", section: "防火分区", pipeline: "科学岛燃气管线", system: "电力监测系统", category: "配电柜", current: 5320, previous: 5280 },
    { time: "2026-10-19 08:00:00", name: "摄像机供电箱-01", code: "VID-PWR-01", project: "光谷科学岛综合管廊一期", corridor: "高新大道综合管廊", room: "综合舱", section: "防火分区", pipeline: "科学岛通信光缆", system: "视频监控系统", category: "供电箱", current: 2180, previous: 2155 },
    { time: "2026-10-18 08:00:00", name: "环控主机供电-01", code: "ENV-PWR-01", project: "光谷科学岛综合管廊一期", corridor: "高新大道综合管廊", room: "综合舱", section: "出入口", pipeline: "科学岛给水管线", system: "环境与设备监控", category: "供电箱", current: 3460, previous: 3420 },
    { time: "2026-10-18 08:00:00", name: "门禁电源-01", code: "AC-PWR-01", project: "科学岛综合管廊", corridor: "环岛路管廊", room: "综合舱", section: "吊装口", pipeline: "科学岛通信光缆", system: "门禁系统", category: "电源模块", current: 980, previous: 972 },
    { time: "2026-10-17 08:00:00", name: "消防主机供电-01", code: "FIRE-PWR-01", project: "光谷科学岛综合管廊一期", corridor: "高新大道综合管廊", room: "电力舱", section: "通风口", pipeline: "科学岛电力管线", system: "火灾报警系统", category: "供电箱", current: 1680, previous: 1662 },
    { time: "2026-10-17 08:00:00", name: "通信基站负载-01", code: "COM-L-01", project: "光谷科学岛综合管廊一期", corridor: "高新大道综合管廊", room: "综合舱", section: "防火分区", pipeline: "科学岛通信光缆", system: "通信系统", category: "负载回路", current: 4210, previous: 4175 },
    { time: "2026-10-16 08:00:00", name: "入侵主机供电-01", code: "INT-PWR-01", project: "科学岛综合管廊", corridor: "环岛路管廊", room: "综合舱", section: "吊装口", pipeline: "科学岛通信光缆", system: "入侵报警系统", category: "电源模块", current: 760, previous: 752 },
    { time: "2026-10-16 08:00:00", name: "变压器-东区-01", code: "PWR-T-01", project: "光谷科学岛综合管廊一期", corridor: "科学岛大道综合管廊", room: "燃气舱", section: "防火分区", pipeline: "科学岛燃气管线", system: "电力监测系统", category: "变压器", current: 9800, previous: 9720 },
  ].map((row) => ({
    ...row,
    usage: Math.max(0, Number(row.current) - Number(row.previous)),
  }));

  window.BIG_DATA_ENERGY_DATA = {
    SYSTEMS,
    overview: {
      monthTotalWan,
      yearTotalWan,
      monthMom: 100,
      yearMom: 12,
      monthSeries,
    },
    systemBars,
    zoneBars,
    regionRows,
    deviceRows,
  };
})();
