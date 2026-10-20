(function () {
  window.CARBON_SETTING_OPTIONS = ["电", "水", "冷量", "光伏发电"];
  window.CARBON_SETTING_DATA = [
    { id: 1, energyType: "电", factorName: "用电排放", category: "电", coefficient: 0.5748, unit: "kgCO₂e/kW·h", industry: "电力消耗", sourceInfo: "国家温室气体排放因子数据库", sourceYear: 2025, isDefault: true },
    { id: 2, energyType: "电", factorName: "用电碳排", category: "用电碳排", coefficient: 0.32, unit: "kgCO₂e/kW·h", industry: "用电碳排", sourceInfo: "项目能源管理参数", sourceYear: 2025, isDefault: false },
    { id: 3, energyType: "水", factorName: "用水排放", category: "水", coefficient: 0.91, unit: "kgCO₂e/m³", industry: "给排水系统", sourceInfo: "城镇供水碳排放因子", sourceYear: 2025, isDefault: true },
    { id: 4, energyType: "冷量", factorName: "用冷排放", category: "冷量", coefficient: 0.1707, unit: "kgCO₂e/kW", industry: "空调冷量", sourceInfo: "建筑运行碳排放因子", sourceYear: 2025, isDefault: true },
    { id: 5, energyType: "光伏发电", factorName: "光伏发电", category: "光伏发电", coefficient: 1, unit: "kgCO₂e/kW·h", industry: "光伏发电", sourceInfo: "项目可再生能源参数", sourceYear: 2025, isDefault: true },
  ];
})();
