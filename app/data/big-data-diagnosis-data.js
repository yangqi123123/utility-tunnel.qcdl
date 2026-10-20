(function (global) {
  // 环境监测总览：对齐图一/图二区段参数表（含超限高亮口径）
  const envZones = [
    { zone: "综合舱 F0101", temp: 26.4, humidity: 58, o2: 20.6, ch4: 3, h2s: 1, water: 0.42 },
    { zone: "电力舱 F0102", temp: 27.1, humidity: 61, o2: 20.4, ch4: 8, h2s: 2, water: 0.31 },
    { zone: "电力舱 F0103", temp: 28.6, humidity: 63, o2: 19.8, ch4: 42, h2s: 2, water: 0.55 },
    { zone: "燃气舱 F0104", temp: 25.8, humidity: 55, o2: 20.1, ch4: 12, h2s: 3, water: 0.28 },
    { zone: "水信舱 F0201", temp: 26.0, humidity: 57, o2: 20.2, ch4: 4, h2s: 8, water: 0.68 },
    { zone: "综合舱 F0202", temp: 24.9, humidity: 52, o2: 20.8, ch4: 2, h2s: 1, water: 0.22 },
    { zone: "电力舱 F0203", temp: 29.2, humidity: 66, o2: 19.6, ch4: 6, h2s: 2, water: 1.20 },
    { zone: "燃气舱 F0204", temp: 25.2, humidity: 54, o2: 20.5, ch4: 18, h2s: 4, water: 0.35 },
  ];

  const envThresholds = {
    temp: { min: 5, max: 35 },
    humidity: { min: 30, max: 80 },
    o2: { min: 19.5, max: 23.5 },
    ch4: { max: 25 },
    h2s: { max: 10 },
    water: { max: 0.8 },
  };

  // 管廊状态：建设中 / 待完善 / 已完工 / 停用（来自项目管理各档案口径）
  const corridorStatus = {
    project: [
      { name: "光谷科学岛综合管廊一期", status: "建设中" },
      { name: "科学岛东区管廊延伸工程", status: "待完善" },
      { name: "环岛路管廊配套工程", status: "已完工" },
      { name: "滨海段预留项目", status: "停用" },
    ],
    corridor: [
      { name: "高新大道综合管廊", status: "已完工" },
      { name: "科学岛大道综合管廊", status: "待完善" },
      { name: "科学岛东区综合管廊", status: "建设中" },
      { name: "环岛路管廊", status: "已完工" },
      { name: "滨海预留管廊", status: "停用" },
    ],
    cabin: [
      { name: "综合舱", status: "已完工" },
      { name: "电力舱", status: "待完善" },
      { name: "燃气舱", status: "停用" },
      { name: "水信舱", status: "建设中" },
      { name: "热力舱", status: "已完工" },
      { name: "通风设备间", status: "待完善" },
    ],
    section: [
      { name: "高新大道综合舱防火一区", status: "已完工" },
      { name: "高新大道燃气舱防火一区", status: "已完工" },
      { name: "科学岛大道燃气舱防火一区", status: "已完工" },
      { name: "通风口-综合舱", status: "待完善" },
      { name: "出入口-电力舱", status: "待完善" },
      { name: "吊装口-电力舱", status: "已完工" },
      { name: "通风口-燃气舱", status: "停用" },
      { name: "出入口-科学岛大道", status: "建设中" },
      { name: "吊装口-科学岛大道", status: "已完工" },
      { name: "通风口-东区", status: "停用" },
      { name: "出入口-东区", status: "建设中" },
      { name: "吊装口-东区", status: "待完善" },
    ],
    pipeline: [
      { name: "科学岛给水管线", status: "待完善" },
      { name: "科学岛通信光缆", status: "停用" },
      { name: "科学岛电力电缆", status: "建设中" },
      { name: "科学岛燃气管道", status: "已完工" },
      { name: "东区电力电缆", status: "建设中" },
      { name: "东区通信光缆", status: "待完善" },
      { name: "环岛路给水管线", status: "已完工" },
      { name: "滨海预留管线", status: "停用" },
    ],
  };

  const STATUS_KEYS = ["建设中", "待完善", "已完工", "停用"];
  const CORRIDOR_TABS = [
    { key: "project", label: "项目" },
    { key: "corridor", label: "管廊" },
    { key: "cabin", label: "舱室" },
    { key: "section", label: "区段" },
    { key: "pipeline", label: "管线" },
  ];

  global.BIG_DATA_DIAGNOSIS_DATA = {
    envZones,
    envThresholds,
    corridorStatus,
    STATUS_KEYS,
    CORRIDOR_TABS,
  };
})(window);
