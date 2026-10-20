/* 设备详情 · 设备信息：与资产管理-设备管理详情字段保持一致 */
(function () {
  var FIELDS = [
    ["所属系统", "system"],
    ["设备分类", "type"],
    ["所属项目", "project"],
    ["所属管廊", "corridor"],
    ["所属舱室", "room"],
    ["所属区段", "section"],
    ["区段编码", "sectionCode"],
    ["所属管线", "pipeline"],
    ["设备品牌", "brand"],
    ["设备型号", "model"],
    ["是否智能化", "smart"],
    ["设备名称", "name"],
    ["设备编码", "code"],
    ["安装位置", "location"],
    ["经度", "longitude"],
    ["纬度", "latitude"],
    ["范围起桩号(m)", "rangeStartStake"],
    ["范围止桩号(m)", "rangeEndStake"],
    ["图纸控制柜编号", "drawingCabinetNo"],
    ["供应商", "vendor"],
    ["供应商联系方式", "supplierPhone"],
    ["生产厂家", "manufacturer"],
    ["出厂日期", "manufactureDate"],
    ["到货日期", "deliveryDate"],
    ["安装日期", "installDate"],
    ["验收日期", "acceptDate"],
    ["报废日期", "scrapDate"],
    ["厂家编码", "factoryCode"],
    ["CAD编码", "cadCode"],
    ["来源模块", "sourceModule"],
    ["服务范围", "service"],
    ["备注", "remark"],
    ["创建时间", "createdAt"]
  ];

  function valueOf(device, key) {
    if (!device) return "";
    if (key === "longitude") {
      if (device.longitude != null && String(device.longitude).trim() !== "") return device.longitude;
      if (device.lng != null && String(device.lng).trim() !== "") return device.lng;
      return "";
    }
    if (key === "latitude") {
      if (device.latitude != null && String(device.latitude).trim() !== "") return device.latitude;
      if (device.lat != null && String(device.lat).trim() !== "") return device.lat;
      return "";
    }
    if (key === "createdAt") return device.createdAt || device.time || device.lastSeen || "";
    var value = device[key];
    return value == null ? "" : value;
  }

  function html(device, esc) {
    var encode = typeof esc === "function" ? esc : function (value) {
      return String(value == null ? "" : value);
    };
    return '<div class="dm-info-grid">' + FIELDS.map(function (pair) {
      var text = encode(valueOf(device, pair[1]));
      return '<div class="info-item"><span class="info-label">' + encode(pair[0]) + '</span><span class="info-value">' + (text || "-") + "</span></div>";
    }).join("") + "</div>";
  }

  window.DEVICE_DETAIL_INFO = { fields: FIELDS, valueOf: valueOf, html: html };
})();
