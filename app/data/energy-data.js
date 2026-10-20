(function () {
  const commonOptions = {
    building: ["1号楼", "2号楼", "3号楼", "4号楼"],
    floor: ["1层", "2层", "3层", "4层", "5层"],
    area: ["101房源", "201房源", "301房源", "401房源", "501房源"],
    usage: ["办公照明", "空调系统", "生活用水", "设备运行"],
    powerSubitem: ["照明", "插座", "空调", "动力设备"],
  };

  const deviceNames = {
    electricity: ["备用", "办公普通电梯负荷3（主）", "生活水泵房（主）", "地下室穿楼电梯（主）", "办公普通照明1", "热交换机房2（主）"],
    water: ["生活水泵房（主）", "消防水泵房", "裙房给水泵"],
    cooling: ["冷水机组1", "冷冻水泵2", "空调末端设备"],
    photovoltaic: ["光伏逆变器1", "光伏逆变器2", "光伏汇流箱"],
  };

  const categoryMeta = {
    electricity: [
      { key: "1号楼", label: "1号楼", value: 3.8 },
      { key: "2号楼", label: "2号楼", value: 6.25 },
      { key: "3号楼", label: "3号楼", value: 4.55 },
      { key: "4号楼", label: "4号楼", value: 5.1 },
    ],
    water: [
      { key: "1号楼", label: "1号楼", value: 0.8 },
      { key: "2号楼", label: "2号楼", value: 1.42 },
      { key: "3号楼", label: "3号楼", value: 0.96 },
      { key: "4号楼", label: "4号楼", value: 0.64 },
    ],
    cooling: [
      { key: "1号楼", label: "1号楼", value: 0 },
      { key: "2号楼", label: "2号楼", value: 0 },
      { key: "3号楼", label: "3号楼", value: 0 },
      { key: "4号楼", label: "4号楼", value: 0 },
    ],
    photovoltaic: [
      { key: "1号楼", label: "1号楼", value: 2.65 },
      { key: "2号楼", label: "2号楼", value: 3.1 },
      { key: "3号楼", label: "3号楼", value: 2.38 },
      { key: "4号楼", label: "4号楼", value: 1.96 },
    ],
  };

  function createRows(type, supportsMeterHierarchy) {
    const categories = categoryMeta[type];
    const rows = [];
    for (let hour = 0; hour < 24; hour += 1) {
      const category = categories[hour % categories.length];
      const floorBuilding = `${(hour % 4) + 1}号楼`;
      const deviceBuilding = `${((hour + 1) % 4) + 1}号楼`;
      const baseValue = category.value + (hour % 5) * (type === "water" ? 0.04 : 0.22);
      const date = `2026-09-05T${String(hour).padStart(2, "0")}:00`;
      const masterMeterIndex = Math.floor(hour / 4) * 4 + 1;
      const meterLevel = supportsMeterHierarchy && hour % 4 === 0 ? "master" : supportsMeterHierarchy ? "sub" : null;
      const meterId = supportsMeterHierarchy ? `${type}-meter-${hour + 1}` : null;
      const sourceDeviceName = deviceNames[type][hour % deviceNames[type].length].replaceAll("（主）", "");
      rows.push({
        id: `${type}-floor-${hour + 1}`,
        view: "floor",
        date,
        category: floorBuilding,
        building: floorBuilding,
        floor: `${(hour % 5) + 1}层`,
        area: commonOptions.area[hour % commonOptions.area.length],
        deviceName: deviceNames[type]?.[hour % (deviceNames[type]?.length || 1)] || "",
        deviceType: type === "electricity" ? "电" : type === "water" ? "水" : type === "cooling" ? "冷量" : "光伏",
        deviceNo: `${type.slice(0, 1).toUpperCase()}204814${String(hour + 1).padStart(4, "0")}`,
        usage: type === "electricity" ? commonOptions.usage[hour % commonOptions.usage.length] : "设备运行",
        value: Number(baseValue.toFixed(2)),
      });
      const deviceValue = Number((baseValue * 0.72).toFixed(2));
      const previousReading = Number((1000 + hour * 8 + deviceValue * 6).toFixed(2));
      rows.push({
        id: `${type}-device-${hour + 1}`,
        view: "device",
        date,
        category: deviceBuilding,
        building: deviceBuilding,
        floor: `${((hour + 1) % 5) + 1}层`,
        area: commonOptions.area[(hour + 1) % commonOptions.area.length],
        deviceName: supportsMeterHierarchy ? `${sourceDeviceName}（${meterLevel === "master" ? "总表" : "分表"}）` : sourceDeviceName,
        deviceType: type === "electricity" ? "电" : type === "water" ? "水" : type === "cooling" ? "冷量" : "光伏",
        deviceNo: `${type.slice(0, 1).toUpperCase()}204814${String(hour + 25).padStart(4, "0")}`,
        usage: type === "electricity" ? commonOptions.usage[(hour + 1) % commonOptions.usage.length] : "设备运行",
        meterId,
        meterLevel,
        parentMeterId: meterLevel === "sub" ? `${type}-meter-${masterMeterIndex}` : null,
        powerSubitem: type === "electricity" && meterLevel === "sub" ? commonOptions.powerSubitem[hour % commonOptions.powerSubitem.length] : "",
        currentReading: Number((previousReading + deviceValue).toFixed(2)),
        previousReading,
        value: deviceValue,
      });
    }
    return rows;
  }

  function createConfig(type, title, unit, icon, summary, floorColumns, deviceColumns, filterFields, supportsMeterHierarchy = false) {
    return {
      type,
      title,
      unit,
      icon,
      summary,
      floorColumns,
      deviceColumns,
      subDeviceColumns: type === "electricity" ? deviceColumns.flatMap((column) => column === "房源" ? [column, "用电分项"] : [column]) : deviceColumns,
      masterDeviceColumns: supportsMeterHierarchy ? [...deviceColumns, "操作"] : deviceColumns,
      supportsMeterHierarchy,
      filterFields,
      options: commonOptions,
      rows: createRows(type, supportsMeterHierarchy),
    };
  }

  window.ENERGY_PAGE_CONFIG = {
    electricity: createConfig(
      "electricity",
      "用电量",
      "kW·h",
      "fa-bolt",
      [{ key: "total", label: "总电量" }, ...categoryMeta.electricity.map(({ key, label }) => ({ key, label: `${label}用电` }))],
      ["序号", "获取时间", "楼栋", "楼层", "房源", "用电量(kW·h)"],
      ["序号", "获取时间", "设备名称", "设备编号", "楼栋", "楼层", "房源", "当前读数(kW·h)", "上次读数(kW·h)", "用电量(kW·h)"],
      [
        { key: "building", label: "楼栋", type: "select", optionsKey: "building" },
        { key: "floor", label: "楼层", type: "select", optionsKey: "floor" },
        { key: "deviceName", label: "设备名称", type: "text", placeholder: "请输入设备名称/ID", deviceOnly: true },
        { key: "area", label: "房源", type: "text", placeholder: "请输入房源" },
        { key: "usage", label: "用途", type: "text", placeholder: "请输入用途", deviceOnly: true },
      ],
      true,
    ),
    water: createConfig(
      "water",
      "用水量",
      "m³",
      "fa-droplet",
      [{ key: "total", label: "总水量" }, ...categoryMeta.water.map(({ key, label }) => ({ key, label: `${label}用水` }))],
      ["序号", "获取时间", "楼栋", "楼层", "房源", "用水量(m³)"],
      ["序号", "获取时间", "设备名称", "设备编号", "楼栋", "楼层", "房源", "当前读数(m³)", "上次读数(m³)", "用水量(m³)"],
      [
        { key: "building", label: "楼栋", type: "select", optionsKey: "building" },
        { key: "floor", label: "楼层", type: "select", optionsKey: "floor" },
        { key: "deviceName", label: "设备名称", type: "text", placeholder: "请输入设备名称/ID", deviceOnly: true },
        { key: "area", label: "房源", type: "text", placeholder: "请输入房源" },
      ],
      true,
    ),
    cooling: createConfig(
      "cooling",
      "用冷量",
      "kW",
      "fa-snowflake",
      [{ key: "total", label: "总冷量" }, ...categoryMeta.cooling.map(({ key, label }) => ({ key, label: `${label}用冷` }))],
      ["序号", "获取时间", "楼栋", "楼层", "房源", "用冷量(kW)"],
      ["序号", "获取时间", "设备名称", "设备编号", "楼栋", "楼层", "房源", "当前读数(kW)", "上次读数(kW)", "用冷量(kW)"],
      [
        { key: "building", label: "楼栋", type: "select", optionsKey: "building" },
        { key: "floor", label: "楼层", type: "select", optionsKey: "floor" },
        { key: "deviceName", label: "设备名称", type: "text", placeholder: "请输入设备名称/ID", deviceOnly: true },
        { key: "area", label: "房源", type: "text", placeholder: "请输入房源" },
      ],
      true,
    ),
    photovoltaic: createConfig(
      "photovoltaic",
      "光伏发电量",
      "kW·h",
      "fa-solar-panel",
      [{ key: "total", label: "总发电量" }, ...categoryMeta.photovoltaic.map(({ key, label }) => ({ key, label: `${label}发电` }))],
      ["序号", "获取时间", "楼栋", "楼层", "房源", "发电量(kW·h)"],
      ["序号", "获取时间", "设备名称", "设备编号", "楼栋", "楼层", "房源", "发电量(kW·h)"],
      [
        { key: "building", label: "楼栋", type: "select", optionsKey: "building" },
        { key: "floor", label: "楼层", type: "select", optionsKey: "floor" },
        { key: "deviceName", label: "设备名称", type: "text", placeholder: "请输入设备名称/ID", deviceOnly: true },
        { key: "area", label: "房源", type: "text", placeholder: "请输入房源" },
      ],
      true,
    ),
  };
})();
