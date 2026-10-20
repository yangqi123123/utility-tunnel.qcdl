(function () {
  const buildings = ["1号楼", "2号楼", "3号楼", "4号楼"];
  const floorOptions = ["1层", "2层", "3层", "4层", "5层"];
  const energyTypes = ["电", "水", "冷量"];
  const devices = {
    电: ["智能电表-1号楼", "智能电表-2号楼", "智能电表-3号楼", "智能电表-4号楼"],
    水: ["远传水表-1号楼", "远传水表-2号楼", "远传水表-3号楼", "远传水表-4号楼"],
    冷量: ["冷量计-1号楼", "冷量计-2号楼", "冷量计-3号楼", "冷量计-4号楼"],
    光伏发电: ["光伏逆变器-1号楼", "光伏逆变器-2号楼", "光伏逆变器-3号楼", "光伏逆变器-4号楼"],
  };
  const units = { 电: "kW·h", 水: "m³", 冷量: "kW", 光伏发电: "kW·h" };

  function createRows(tab) {
    const types = tab === "emission" ? energyTypes : ["光伏发电"];
    return Array.from({ length: 24 }, (_, index) => {
      const type = types[index % types.length];
      const buildingIndex = index % buildings.length;
      const actualValue = Number((tab === "emission" ? 5.8 + (index % 6) * 0.86 : 2.1 + (index % 5) * 0.42).toFixed(2));
      const factor = tab === "emission" ? `${type}排放` : "光伏发电";
      return {
        id: `${tab}-${index + 1}`,
        date: `2026-09-${String(5 + Math.floor(index / 8)).padStart(2, "0")}`,
        deviceName: devices[type][buildingIndex],
        deviceNo: `${tab === "emission" ? "CE" : "CR"}2048${String(index + 1).padStart(5, "0")}`,
        building: buildings[buildingIndex],
        floor: floorOptions[index % floorOptions.length],
        factor,
        energyType: type,
        unit: units[type],
        actualValue,
        carbonValue: Number((actualValue * (tab === "emission" ? (type === "电" ? 0.58 : type === "水" ? 0.31 : 0.42) : 0.06)).toFixed(2)),
      };
    });
  }

  window.CARBON_PAGE_CONFIG = {
    emission: {
      tab: "emission",
      label: "碳排放",
      energyTypes,
      rows: createRows("emission"),
      factorLabel: "因子名称",
      valueLabel: "碳排放量(tCO₂e)",
    },
    reduction: {
      tab: "reduction",
      label: "碳减排",
      energyTypes: ["光伏发电"],
      rows: createRows("reduction"),
      factorLabel: "因子名称",
      valueLabel: "碳减排量(tCO₂e)",
    },
  };
})();
