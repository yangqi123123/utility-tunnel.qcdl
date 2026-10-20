(function () {
  const SYSTEM_NAME = "通信系统";
  const $ = (id) => document.getElementById(id);
  const deviceCategories = window.APP_DEVICE_CATEGORIES || [];
  const locationTree = [
    { name: "科学岛财富中心", corridors: [{ name: "1号综合管廊", rooms: [{ name: "通信舱", sections: [{ name: "A区段", pipelines: ["通信光缆管线"] }] }, { name: "综合舱", sections: [{ name: "B区段", pipelines: ["通信光缆管线"] }] }, { name: "电力舱", sections: [{ name: "通风口", pipelines: ["通信光缆管线"] }] }] }] },
    { name: "光谷科学岛综合开发项目", corridors: [{ name: "高新大道综合管廊", rooms: [{ name: "综合舱", sections: [{ name: "防火分区", pipelines: ["通信光缆管线"] }] }] }] },
  ];

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function toast(msg) {
    if (window.showToast) window.showToast(msg);
    else if (window.openAppConfirm) window.openAppConfirm({ title: "提示", message: msg, confirmText: "知道了" });
    else alert(msg);
  }

  function enrichDevices(sourceDevices) {
    return sourceDevices.map((device, index) => {
      const category = deviceCategories.find((item) => item.name === device.category) || { name: device.category || "未分类", system: device.system || SYSTEM_NAME };
      const project = locationTree[index % locationTree.length];
      const corridor = project.corridors[0];
      const room = corridor.rooms[index % corridor.rooms.length];
      const section = room.sections[0];
      return {
        ...device,
        code: device.code || `001_${String(device.model || "COM").replace(/[^A-Z0-9]/gi, "").slice(0, 8)}_${String(index + 1).padStart(4, "0")}`,
        system: device.system || category.system || SYSTEM_NAME,
        type: device.category || category.name,
        project: device.project || project.name,
        corridor: device.corridor || corridor.name,
        room: device.room || room.name,
        section: device.section || section.name,
        pipeline: device.pipeline || section.pipelines[0],
        location: device.location || `通信设备位 ${index + 1}`,
        smart: device.smart || "是",
        sourceModule: device.sourceModule || (index % 4 === 1 ? "第三方同步" : "人工台账"),
        brand: device.brand || device.vendor || "",
        model: device.model || "",
        vendor: device.vendor || "",
        supplierPhone: device.supplierPhone || "400-800-0000",
        manufacturer: device.manufacturer || device.vendor || "",
        manufactureDate: device.manufactureDate || "2026-06-20",
        deliveryDate: device.deliveryDate || "2026-07-05",
        installDate: device.installDate || "2026-07-11",
        acceptDate: device.acceptDate || "2026-07-10",
        scrapDate: device.scrapDate || "",
        factoryCode: device.factoryCode || `FC-${device.id}`,
        cadCode: device.cadCode || `CAD-${device.id}`,
        service: device.service || "通信接入、语音调度与广播联动服务",
        remark: device.remark || device.note || "暂无备注",
        thirdPartyCode: device.thirdPartyCode || `THIRD-${String(index + 1).padStart(4, "0")}`,
        coordinate: device.coordinate || "114.421000, 30.470000",
        createdAt: device.createdAt || "2026-07-11 14:01:25",
      };
    });
  }

  const allDevices = enrichDevices((window.APP_DATA?.devices || []).filter((item) => (item.system || "") === SYSTEM_NAME));
  let filteredDevices = [...allDevices];

  function filters() {
    return {
      name: ($("filterName")?.value || "").trim(),
      code: ($("filterCode")?.value || "").trim(),
      type: $("filterType")?.value || "",
      project: ($("filterProject")?.value || "").trim(),
      smart: $("filterSmart")?.value || "",
      sourceModule: $("filterSource")?.value || "",
    };
  }

  function applyFilter() {
    const f = filters();
    filteredDevices = allDevices.filter((device) => {
      if (f.name && !String(device.name).includes(f.name)) return false;
      if (f.code && !String(device.code).includes(f.code)) return false;
      if (f.type && device.type !== f.type) return false;
      if (f.project && !String(device.project).includes(f.project)) return false;
      if (f.smart && device.smart !== f.smart) return false;
      if (f.sourceModule && device.sourceModule !== f.sourceModule) return false;
      return true;
    });
    render();
  }

  function infoItem(label, text) {
    return `<div class="info-item"><span class="info-label">${escapeHtml(label)}</span><span class="info-value">${escapeHtml(text) || "-"}</span></div>`;
  }

  function openDetail(id) {
    const device = allDevices.find((item) => String(item.id) === String(id));
    if (!device) return;
    const body = `<div class="device-detail"><div class="device-detail-grid">
      ${infoItem("所属系统", device.system)}
      ${infoItem("设备分类", device.type)}
      ${infoItem("所属项目", device.project)}
      ${infoItem("所属管廊", device.corridor)}
      ${infoItem("所属舱室", device.room)}
      ${infoItem("所属区段", device.section)}
      ${infoItem("所属管线", device.pipeline)}
      ${infoItem("设备品牌", device.brand)}
      ${infoItem("设备型号", device.model)}
      ${infoItem("设备名称", device.name)}
      ${infoItem("设备编码", device.code)}
      ${infoItem("安装位置", device.location)}
      ${infoItem("供应商", device.vendor)}
      ${infoItem("供应商联系方式", device.supplierPhone)}
      ${infoItem("生产厂家", device.manufacturer)}
      ${infoItem("出厂日期", device.manufactureDate)}
      ${infoItem("到货日期", device.deliveryDate)}
      ${infoItem("安装日期", device.installDate)}
      ${infoItem("验收日期", device.acceptDate)}
      ${infoItem("报废日期", device.scrapDate)}
      ${infoItem("厂家编码", device.factoryCode)}
      ${infoItem("CAD编码", device.cadCode)}
      ${infoItem("来源模块", device.sourceModule)}
      ${infoItem("服务范围", device.service)}
      ${infoItem("备注", device.remark)}
      ${infoItem("是否智能化", device.smart)}
      ${infoItem("第三方编码", device.thirdPartyCode)}
      ${infoItem("设备坐标", device.coordinate)}
      ${infoItem("创建时间", device.createdAt)}
    </div></div>`;
    window.openAppDrawer?.({
      title: "设备详情",
      subtitle: device.name,
      body,
      footer: '<button class="btn btn-secondary" data-drawer-close>关闭</button>',
    });
  }

  function exportDevices() {
    const headers = ["所属系统", "设备分类", "设备名称", "设备编码", "所属项目", "所属管廊", "所属舱室", "所属区段", "所属管线", "安装位置", "是否智能化", "来源模块"];
    if (window.XLSX) {
      const rows = filteredDevices.map((device) => ({
        所属系统: device.system,
        设备分类: device.type,
        设备名称: device.name,
        设备编码: device.code,
        所属项目: device.project,
        所属管廊: device.corridor,
        所属舱室: device.room,
        所属区段: device.section,
        所属管线: device.pipeline,
        安装位置: device.location,
        是否智能化: device.smart,
        来源模块: device.sourceModule,
      }));
      const sheet = window.XLSX.utils.json_to_sheet(rows, { header: headers });
      const book = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(book, sheet, "通信设备");
      window.XLSX.writeFile(book, "通信设备.xlsx");
      toast("已导出当前筛选结果");
      return;
    }
    toast("已生成当前条件下的通信设备导出文件（Mock）");
  }

  function renderTypeOptions() {
    const types = [...new Set(allDevices.map((item) => item.type).filter(Boolean))];
    if (!$("filterType")) return;
    $("filterType").innerHTML = `<option value="">请选择</option>${types.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join("")}`;
  }

  function render() {
    if ($("deviceCount")) $("deviceCount").textContent = filteredDevices.length;
    if (!$("deviceBody")) return;
    $("deviceBody").innerHTML = filteredDevices.length
      ? filteredDevices.map((device) => `<tr data-id="${escapeHtml(device.id)}">
          <td><span class="device-name-cell">${escapeHtml(device.name)}</span></td>
          <td>${escapeHtml(device.code)}</td>
          <td>${escapeHtml(device.system)}</td>
          <td>${escapeHtml(device.type)}</td>
          <td>${escapeHtml(device.project)}</td>
          <td>${escapeHtml(device.corridor)}</td>
          <td>${escapeHtml(device.room)}</td>
          <td>${escapeHtml(device.section)}</td>
          <td>${escapeHtml(device.pipeline)}</td>
          <td>${escapeHtml(device.location)}</td>
          <td>${escapeHtml(device.smart)}</td>
          <td>${escapeHtml(device.sourceModule)}</td>
          <td class="device-actions"><button class="table-action" type="button" data-device-detail="${escapeHtml(device.id)}">详情</button></td>
        </tr>`).join("")
      : `<tr><td class="empty-cell" colspan="13">暂无通信系统设备</td></tr>`;
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderTypeOptions();
    render();
    $("deviceCollapse")?.addEventListener("click", () => {
      const card = $("deviceFilterCard");
      const button = $("deviceCollapse");
      if (!card || !button) return;
      const expanded = card.classList.toggle("expanded");
      const label = button.querySelector("span");
      const icon = button.querySelector("i");
      if (label) label.textContent = expanded ? "收起" : "展开";
      if (icon) icon.className = expanded ? "fa-solid fa-chevron-up" : "fa-solid fa-chevron-down";
    });
    $("deviceSearch")?.addEventListener("click", applyFilter);
    $("deviceReset")?.addEventListener("click", () => {
      ["filterName", "filterCode", "filterType", "filterProject", "filterSmart", "filterSource"].forEach((id) => {
        if ($(id)) $(id).value = "";
      });
      applyFilter();
    });
    $("deviceExport")?.addEventListener("click", exportDevices);
    document.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-device-detail]");
      if (btn) openDetail(btn.dataset.deviceDetail);
    });
  });
})();
