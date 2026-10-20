(function () {
  const PAGE_SIZE = 10;
  const state = {
    tab: "emission",
    filters: {},
    page: 1,
    rows: [],
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function config() {
    return window.CARBON_PAGE_CONFIG[state.tab];
  }

  function formatNumber(value) {
    return Number(value || 0).toFixed(2);
  }

  function renderToolbar() {
    const current = config();
    document.getElementById("carbonToolbar").innerHTML = `
      <section class="carbon-toolbar card">
        <div class="carbon-tabs" role="tablist" aria-label="碳数据类型">
          ${Object.values(window.CARBON_PAGE_CONFIG).map((item) => `<button class="carbon-tab ${item.tab === state.tab ? "active" : ""}" type="button" role="tab" aria-selected="${item.tab === state.tab}" data-carbon-tab="${item.tab}">${item.label}</button>`).join("")}
        </div>
        <div class="carbon-filter-layout" id="carbonFilterLayout">
          <div class="carbon-filter-fields">
            <label class="form-field carbon-filter-field"><span class="form-label">设备ID</span><input class="form-control" data-carbon-filter="deviceNo" value="${escapeHtml(state.filters.deviceNo || "")}" placeholder="请输入"></label>
            <label class="form-field carbon-filter-field"><span class="form-label">设备名称</span><input class="form-control" data-carbon-filter="deviceName" value="${escapeHtml(state.filters.deviceName || "")}" placeholder="请输入"></label>
            <label class="form-field carbon-filter-field"><span class="form-label">日期</span><div class="carbon-date-range"><input class="form-control" type="date" data-carbon-filter="startDate" value="${escapeHtml(state.filters.startDate || "")}"><span>至</span><input class="form-control" type="date" data-carbon-filter="endDate" value="${escapeHtml(state.filters.endDate || "")}"></div></label>
            <label class="form-field carbon-filter-field"><span class="form-label">楼栋名称</span><select class="form-control" data-carbon-filter="building"><option value="">楼栋</option>${["", ...["1号楼", "2号楼", "3号楼", "4号楼"]].slice(1).map((item) => `<option value="${item}" ${item === state.filters.building ? "selected" : ""}>${item}</option>`).join("")}</select></label>
            <label class="form-field carbon-filter-field carbon-filter-extra"><span class="form-label">能源类型</span><select class="form-control" data-carbon-filter="energyType"><option value="">请选择</option>${current.energyTypes.map((item) => `<option value="${item}" ${item === state.filters.energyType ? "selected" : ""}>${item}</option>`).join("")}</select></label>
          </div>
          <div class="carbon-filter-actions"><button class="btn btn-ghost" type="button" data-carbon-action="toggle-filters">展开 <i class="fa-solid fa-chevron-down" aria-hidden="true"></i></button><button class="btn btn-secondary" type="button" data-carbon-action="reset">重置</button><button class="btn btn-primary" type="button" data-carbon-action="search">搜索</button></div>
        </div>
      </section>`;
  }

  function collectFilters() {
    state.filters = Object.fromEntries([...document.querySelectorAll("[data-carbon-filter]")].map((input) => [input.dataset.carbonFilter, input.value.trim()]));
  }

  function matches(row) {
    const filters = state.filters;
    return (!filters.deviceNo || row.deviceNo.includes(filters.deviceNo))
      && (!filters.deviceName || row.deviceName.includes(filters.deviceName))
      && (!filters.building || row.building === filters.building)
      && (!filters.energyType || row.energyType === filters.energyType)
      && (!filters.startDate || row.date >= filters.startDate)
      && (!filters.endDate || row.date <= filters.endDate);
  }

  function renderTable() {
    const current = config();
    state.rows = current.rows.filter(matches);
    const pageRows = state.rows.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);
    const head = ["序号", "时间", "设备名称", "设备编号", "楼栋", "楼层", current.factorLabel, "能源类型", "实际值", current.valueLabel];
    document.getElementById("carbonTableHead").innerHTML = head.map((item) => `<th>${escapeHtml(item)}</th>`).join("");
    document.getElementById("carbonTableBody").innerHTML = pageRows.length ? pageRows.map((row, index) => `<tr><td>${(state.page - 1) * PAGE_SIZE + index + 1}</td><td>${escapeHtml(row.date)}</td><td>${escapeHtml(row.deviceName)}</td><td>${escapeHtml(row.deviceNo)}</td><td>${escapeHtml(row.building)}</td><td>${escapeHtml(row.floor)}</td><td>${escapeHtml(row.factor)}</td><td>${escapeHtml(row.energyType)}</td><td>${formatNumber(row.actualValue)} ${escapeHtml(row.unit)}</td><td>${formatNumber(row.carbonValue)}</td></tr>`).join("") : `<tr><td colspan="${head.length}"><div class="carbon-empty"><i class="fa-solid fa-chart-column" aria-hidden="true"></i><span>暂无数据</span></div></td></tr>`;
    renderPagination();
  }

  function renderPagination() {
    const totalPages = Math.max(1, Math.ceil(state.rows.length / PAGE_SIZE));
    state.page = Math.min(state.page, totalPages);
    document.getElementById("carbonPagination").innerHTML = `<div class="pagination carbon-pagination"><span>共 <strong>${state.rows.length}</strong> 条记录，每页 ${PAGE_SIZE} 条</span><button class="page-item" type="button" data-carbon-page="prev" ${state.page === 1 ? "disabled" : ""}>‹</button><span class="page-item active">${state.page}</span><button class="page-item" type="button" data-carbon-page="next" ${state.page === totalPages ? "disabled" : ""}>›</button></div>`;
  }

  function downloadCsv() {
    const current = config();
    const head = ["序号", "时间", "设备名称", "设备编号", "楼栋", "楼层", current.factorLabel, "能源类型", "实际值", current.valueLabel];
    const lines = [head, ...state.rows.map((row, index) => [index + 1, row.date, row.deviceName, row.deviceNo, row.building, row.floor, row.factor, row.energyType, `${formatNumber(row.actualValue)} ${row.unit}`, formatNumber(row.carbonValue)])];
    const csv = `\uFEFF${lines.map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${current.label}数据.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function render() {
    renderToolbar();
    renderTable();
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const tab = event.target.closest("[data-carbon-tab]");
      const action = event.target.closest("[data-carbon-action]");
      const page = event.target.closest("[data-carbon-page]");
      if (tab) {
        state.tab = tab.dataset.carbonTab;
        state.filters = {};
        state.page = 1;
        render();
        return;
      }
      if (action?.dataset.carbonAction === "toggle-filters") {
        const layout = document.getElementById("carbonFilterLayout");
        const expanded = layout.classList.toggle("is-expanded");
        action.innerHTML = `${expanded ? "收起" : "展开"} <i class="fa-solid fa-chevron-${expanded ? "up" : "down"}" aria-hidden="true"></i>`;
      }
      if (action?.dataset.carbonAction === "search") { collectFilters(); state.page = 1; renderTable(); }
      if (action?.dataset.carbonAction === "reset") { state.filters = {}; state.page = 1; render(); }
      if (action?.dataset.carbonAction === "export") downloadCsv();
      if (page) {
        const totalPages = Math.max(1, Math.ceil(state.rows.length / PAGE_SIZE));
        state.page = page.dataset.carbonPage === "prev" ? Math.max(1, state.page - 1) : Math.min(totalPages, state.page + 1);
        renderTable();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => { render(); bindEvents(); });
})();
