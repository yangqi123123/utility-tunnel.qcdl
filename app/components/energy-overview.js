(function () {
  const GRANULARITIES = ["hour", "day", "month", "year"];
  const PAGE_SIZE = 10;
  const PERIOD_LABELS = { hour: "小时", day: "日", month: "月", year: "年" };
  const DEFAULT_START = { hour: "2026-09-05T00:00:00", day: "2026-09-01", month: "2026-01", year: "2021" };
  const DEFAULT_END = { hour: "2026-09-05T23:59:59", day: "2026-09-30", month: "2026-12", year: "2026" };

  const state = {
    config: null,
    view: "floor",
    granularity: "hour",
    start: DEFAULT_START.hour,
    end: DEFAULT_END.hour,
    filters: {},
    filteredRows: [],
    page: 1,
    pickerOpen: false,
    pickerTarget: "start",
    pickerSelecting: "start",
    pickerDraft: null,
    pickerViewDate: new Date(2026, 8, 1),
    detailMeterId: "",
    detailRows: [],
    detailPage: 1,
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function getRangeInputType(granularity) {
    if (granularity === "hour") return "datetime-local";
    if (granularity === "month") return "month";
    if (granularity === "year") return "number";
    return "date";
  }

  function getRangePlaceholder(granularity) {
    return granularity === "hour" ? "请选择时间" : granularity === "day" ? "请选择日期" : granularity === "month" ? "请选择月份" : "请输入年份";
  }

  function formatPeriodLabel(value, granularity) {
    const date = String(value || "");
    if (granularity === "hour") return `${date.slice(0, 10).replaceAll("-", "/")}-${date.slice(11, 13)}:00`;
    if (granularity === "day") return date.slice(0, 10).replaceAll("-", "/");
    if (granularity === "month") return date.slice(0, 7).replace("-", "/");
    return date.slice(0, 4);
  }

  function getPeriodKey(value, granularity) {
    if (granularity === "hour") return String(value).slice(0, 13);
    if (granularity === "day") return String(value).slice(0, 10);
    if (granularity === "month") return String(value).slice(0, 7);
    return String(value).slice(0, 4);
  }

  function formatNumber(value) {
    return Number(value || 0).toFixed(2);
  }

  function inputValue(key) {
    return state.filters[key] || "";
  }

  function isDeviceView(view = state.view) {
    return view === "device" || view === "master" || view === "sub";
  }

  function renderViewButtons() {
    const views = state.config.supportsMeterHierarchy
      ? [["floor", "按楼层"], ["master", "按设备（总表）"], ["sub", "按设备（分表）"]]
      : [["floor", "按楼层"], ["device", "按设备"]];
    return views.map(([value, label]) => `<button class="energy-switch-button ${state.view === value ? "active" : ""}" type="button" data-energy-view="${value}">${label}</button>`).join("");
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function parseDateValue(value, granularity = state.granularity) {
    const source = String(value || "");
    if (granularity === "hour") return new Date(source.length === 16 ? `${source}:00` : source);
    if (granularity === "month") return new Date(Number(source.slice(0, 4)), Number(source.slice(5, 7)) - 1, 1);
    if (granularity === "year") return new Date(Number(source.slice(0, 4)), 0, 1);
    return new Date(`${source}T00:00:00`);
  }

  function dateKey(date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }

  function monthKey(date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
  }

  function dateTimeKey(date, hour = date.getHours(), minute = date.getMinutes()) {
    return `${dateKey(date)}T${pad2(hour)}:${pad2(minute)}`;
  }

  function displayRangeValue(value, granularity, end = false) {
    if (granularity === "hour") {
      const date = parseDateValue(value, granularity);
      return `${dateKey(date)} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
    }
    return value;
  }

  function getPickerDraft() {
    return state.pickerDraft || { start: state.start, end: state.end };
  }

  function refreshPicker() {
    const picker = document.querySelector(".energy-time-picker");
    if (picker && state.pickerOpen) {
      picker.outerHTML = renderTimePicker();
      scrollSelectedTimeIntoView();
    }
  }

  function scrollSelectedTimeIntoView() {
    document.querySelectorAll(".energy-time-option.selected").forEach((option) => {
      const scroll = option.closest(".energy-time-scroll");
      if (scroll) scroll.scrollTop = Math.max(0, option.offsetTop - scroll.clientHeight / 2 + option.offsetHeight / 2);
    });
  }

  function selectPickerRange(value) {
    const draft = getPickerDraft();
    if (state.pickerSelecting === "start" || value > draft.end) {
      draft.start = value;
      state.pickerSelecting = "end";
    } else {
      draft.end = value;
      state.pickerSelecting = "start";
    }
    if (draft.start > draft.end) [draft.start, draft.end] = [draft.end, draft.start];
    state.pickerDraft = draft;
    refreshPicker();
  }

  function renderHourOptions(selected, max, part, unit) {
    return Array.from({ length: max }, (_, index) => `<button class="energy-time-option ${Number(selected) === index ? "selected" : ""}" type="button" data-picker-scroll="${part}" data-picker-time-unit="${unit}" data-picker-time-value="${index}">${pad2(index)}</button>`).join("");
  }

  function renderHourColumn(part, label) {
    const draft = getPickerDraft();
    const date = parseDateValue(draft[part], "hour");
    return `<div class="energy-hour-column"><div class="energy-picker-column-title">${label}</div><input class="energy-picker-date" type="date" data-picker-date="${part}" value="${dateKey(date)}"><div class="energy-time-scrolls"><div class="energy-time-scroll" aria-label="${label}小时">${renderHourOptions(date.getHours(), 24, part, "hour")}</div><div class="energy-time-scroll" aria-label="${label}分钟">${renderHourOptions(date.getMinutes(), 60, part, "minute")}</div><div class="energy-time-scroll" aria-label="${label}秒">${renderHourOptions(date.getSeconds(), 60, part, "second")}</div></div></div>`;
  }

  function renderHourPicker() {
    return `<div class="energy-picker-body energy-hour-picker"><div class="energy-hour-columns">${renderHourColumn("start", "开始时间")}${renderHourColumn("end", "结束时间")}</div></div>`;
  }

  function getCalendarCells(date) {
    const first = new Date(date.getFullYear(), date.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, index) => new Date(date.getFullYear(), date.getMonth(), index - offset + 1));
  }

  function renderDayMonth(date, side) {
    const draft = getPickerDraft();
    const cells = getCalendarCells(date);
    const weekday = ["一", "二", "三", "四", "五", "六", "日"];
    return `<div class="energy-calendar-panel"><div class="energy-calendar-title">${date.getFullYear()} 年 ${date.getMonth() + 1} 月</div><div class="energy-weekdays">${weekday.map((item) => `<span>${item}</span>`).join("")}</div><div class="energy-calendar-grid">${cells.map((cell) => { const value = dateKey(cell); const current = cell.getMonth() === date.getMonth(); const selected = value === draft.start || value === draft.end; const range = draft.start && draft.end && value > draft.start && value < draft.end; return `<button class="energy-calendar-day ${current ? "" : "muted"} ${selected ? "selected" : ""} ${range ? "in-range" : ""}" type="button" data-picker-day="${value}" data-picker-side="${side}">${cell.getDate()}</button>`; }).join("")}</div></div>`;
  }

  function renderDayPicker() {
    const next = new Date(state.pickerViewDate.getFullYear(), state.pickerViewDate.getMonth() + 1, 1);
    return `<div class="energy-picker-body"><div class="energy-calendar-nav"><button type="button" data-picker-nav="prev" aria-label="上一个月">‹</button><span>选择日期范围</span><button type="button" data-picker-nav="next" aria-label="下一个月">›</button></div><div class="energy-calendar-pair">${renderDayMonth(state.pickerViewDate, "left")}${renderDayMonth(next, "right")}</div></div>`;
  }

  function renderMonthPanel(year, side) {
    const draft = getPickerDraft();
    return `<div class="energy-month-panel"><div class="energy-calendar-title">${year} 年</div><div class="energy-month-grid">${Array.from({ length: 12 }, (_, index) => { const value = `${year}-${pad2(index + 1)}`; const selected = value === draft.start || value === draft.end; const range = draft.start && draft.end && value > draft.start && value < draft.end; return `<button class="energy-month-item ${selected ? "selected" : ""} ${range ? "in-range" : ""}" type="button" data-picker-month="${value}" data-picker-side="${side}">${index + 1}月</button>`; }).join("")}</div></div>`;
  }

  function renderMonthPicker() {
    return `<div class="energy-picker-body"><div class="energy-calendar-nav"><button type="button" data-picker-nav="prev" aria-label="上一年">‹</button><span>选择月份</span><button type="button" data-picker-nav="next" aria-label="下一年">›</button></div><div class="energy-month-pair">${renderMonthPanel(state.pickerViewDate.getFullYear(), "left")}${renderMonthPanel(state.pickerViewDate.getFullYear() + 1, "right")}</div></div>`;
  }

  function renderYearPanel(startYear, side) {
    const draft = getPickerDraft();
    return `<div class="energy-year-panel"><div class="energy-calendar-title">${startYear} - ${startYear + 9}</div><div class="energy-year-grid">${Array.from({ length: 10 }, (_, index) => { const year = startYear + index; const value = String(year); const selected = value === draft.start || value === draft.end; const range = draft.start && draft.end && value > draft.start && value < draft.end; return `<button class="energy-year-item ${selected ? "selected" : ""} ${range ? "in-range" : ""}" type="button" data-picker-year="${value}" data-picker-side="${side}">${year}</button>`; }).join("")}</div></div>`;
  }

  function renderYearPicker() {
    const startYear = Math.floor(state.pickerViewDate.getFullYear() / 10) * 10;
    return `<div class="energy-picker-body"><div class="energy-calendar-nav"><button type="button" data-picker-nav="prev" aria-label="上一组年份">‹</button><span>选择年份</span><button type="button" data-picker-nav="next" aria-label="下一组年份">›</button></div><div class="energy-year-pair">${renderYearPanel(startYear, "left")}${renderYearPanel(startYear + 10, "right")}</div></div>`;
  }

  function renderTimePicker() {
    const body = state.granularity === "hour" ? renderHourPicker() : state.granularity === "day" ? renderDayPicker() : state.granularity === "month" ? renderMonthPicker() : renderYearPicker();
    return `<div class="energy-time-picker" role="dialog" aria-label="${PERIOD_LABELS[state.granularity]}时间选择"><div class="energy-picker-header"><strong>${PERIOD_LABELS[state.granularity]}时间范围</strong><button type="button" data-picker-action="cancel" aria-label="关闭时间选择">×</button></div>${body}<div class="energy-picker-footer"><button class="btn btn-secondary" type="button" data-picker-action="cancel">取消</button><button class="btn btn-primary" type="button" data-picker-action="confirm">确定</button></div></div>`;
  }

  function renderToolbar() {
    const { config } = state;
    const toolbar = document.getElementById("energyToolbar");
    toolbar.innerHTML = `
      <div class="energy-toolbar">
        <div class="energy-toolbar-top">
          <div class="energy-title-wrap">
            <h1 class="energy-title">${escapeHtml(config.title)}</h1>
            <div class="energy-view-switch" role="tablist" aria-label="统计视图">
              ${renderViewButtons()}
            </div>
          </div>
          <div class="energy-range" aria-label="时间范围">
            <button class="energy-range-display" type="button" data-picker-open="true"><i class="fa-regular fa-calendar" aria-hidden="true"></i><span>${escapeHtml(displayRangeValue(state.start, state.granularity))}</span><b>~</b><span>${escapeHtml(displayRangeValue(state.end, state.granularity, true))}</span></button>
            <div class="energy-period-switch" role="tablist" aria-label="时间粒度">
              ${GRANULARITIES.map((item) => `<button class="energy-period-button ${state.granularity === item ? "active" : ""}" type="button" data-energy-granularity="${item}">${PERIOD_LABELS[item]}</button>`).join("")}
            </div>
            ${state.pickerOpen ? renderTimePicker() : ""}
          </div>
        </div>
        <div class="energy-filter-row">
          <div class="energy-filter-fields energy-filter-layout" id="energyFilterLayout">
            ${config.filterFields.filter((field) => !field.deviceOnly || isDeviceView()).map((field, index) => renderFilterField(field, index)).join("")}
          </div>
          <div class="energy-toolbar-actions">
            ${config.filterFields.filter((field) => !field.deviceOnly || isDeviceView()).length > 4 ? '<button class="btn btn-ghost" type="button" data-energy-action="toggle-filters">展开 <i class="fa-solid fa-chevron-down" aria-hidden="true"></i></button>' : ""}
            <button class="btn btn-secondary" type="button" data-energy-action="reset">重置</button>
            <button class="btn btn-primary" type="button" data-energy-action="search">搜索</button>
          </div>
        </div>
      </div>`;
    if (state.pickerOpen) scrollSelectedTimeIntoView();
  }

  function renderFilterField(field, index) {
    const hidden = index >= 4 ? " energy-filter-field-extra" : "";
    const value = inputValue(field.key);
    const control = field.type === "select"
      ? `<select class="energy-filter-control" data-energy-filter="${field.key}"><option value="">请选择${escapeHtml(field.label)}</option>${(state.config.options[field.optionsKey] || []).map((item) => `<option value="${escapeHtml(item)}" ${item === value ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}</select>`
      : `<input class="energy-filter-control" data-energy-filter="${field.key}" value="${escapeHtml(value)}" placeholder="${escapeHtml(field.placeholder || `请输入${field.label}`)}">`;
    return `<label class="energy-filter-field${hidden}"><span class="energy-filter-label">${escapeHtml(field.label)}</span>${control}</label>`;
  }

  function getRowsForView() {
    if (state.view === "master") return state.config.rows.filter((row) => row.view === "device" && row.meterLevel === "master");
    if (state.view === "sub") return state.config.rows.filter((row) => row.view === "device" && row.meterLevel === "sub");
    return state.config.rows.filter((row) => row.view === state.view);
  }

  function matchesFilters(row) {
    const rowPeriod = getPeriodKey(row.date, state.granularity);
    const startPeriod = getPeriodKey(state.start, state.granularity);
    const endPeriod = getPeriodKey(state.end, state.granularity);
    const inRange = (!startPeriod || rowPeriod >= startPeriod) && (!endPeriod || rowPeriod <= endPeriod);
    return inRange && Object.entries(state.filters).every(([key, value]) => !value || String(row[key] || "").includes(value));
  }

  function filterRows(rows, { meterLevel, parentMeterId } = {}) {
    return rows.filter((row) => matchesFilters(row)
      && (!meterLevel || row.meterLevel === meterLevel)
      && (!parentMeterId || row.parentMeterId === parentMeterId));
  }

  function aggregateRows(rows) {
    const groups = new Map();
    rows.forEach((row) => {
      const period = getPeriodKey(row.date, state.granularity);
      const dimensions = row.view === "device" ? `${row.deviceName}|${row.deviceNo}|${row.floor}|${row.area}` : `${row.building}|${row.floor}|${row.area}`;
      const key = `${period}|${dimensions}`;
      const existing = groups.get(key);
      if (existing) existing.value += row.value;
      else groups.set(key, { ...row, value: row.value, period });
    });
    return [...groups.values()].sort((a, b) => a.period.localeCompare(b.period));
  }

  function calculateSummary(rows) {
    const summary = state.config.summary.map((item) => ({ ...item, value: 0 }));
    rows.forEach((row) => {
      summary[0].value += row.value;
      const item = summary.find((entry) => entry.key === row.category);
      if (item) item.value += row.value;
    });
    return summary;
  }

  function renderSummary(rows) {
    const summary = calculateSummary(rows);
    document.getElementById("energySummary").innerHTML = `<div class="energy-summary" style="--energy-card-count:${summary.length}">${summary.map((item, index) => `
      <div class="energy-summary-card ${index === 0 ? "total" : ""}">
        <span class="energy-summary-icon"><i class="fa-solid ${state.config.icon}" aria-hidden="true"></i></span>
        <div class="energy-summary-content"><div class="energy-summary-value">${formatNumber(item.value)}</div><div class="energy-summary-label">${escapeHtml(item.label)}(${escapeHtml(state.config.unit)})</div></div>
      </div>`).join("")}</div>`;
  }

  function getColumns() {
    if (state.view === "master") return state.config.masterDeviceColumns;
    if (state.view === "sub") return state.config.subDeviceColumns;
    return isDeviceView() ? state.config.deviceColumns : state.config.floorColumns;
  }

  function getCellValue(row, column, index, rowOffset = (state.page - 1) * PAGE_SIZE) {
    if (column === "序号") return index + 1 + rowOffset;
    if (column === "时间" || column === "获取时间") return formatPeriodLabel(row.period || row.date, state.granularity);
    if (column === "楼栋") return row.building;
    if (column === "楼层") return row.floor;
    if (column === "房源") return row.area;
    if (column === "设备名称") return row.deviceName;
    if (column === "设备编号") return row.deviceNo;
    if (column === "用途") return row.usage;
    if (column === "用电分项") return row.powerSubitem;
    if (column.startsWith("当前读数")) return formatNumber(row.currentReading);
    if (column.startsWith("上次读数")) return formatNumber(row.previousReading);
    if (/量|电量|水量|冷量|发电量/.test(column)) return formatNumber(row.value);
    return "-";
  }

  function renderTable(rows) {
    const columns = getColumns();
    document.getElementById("energyTableHead").innerHTML = columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
    const body = document.getElementById("energyTableBody");
    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="${columns.length}"><div class="energy-empty"><span class="energy-empty-icon"><i class="fa-solid fa-chart-pie" aria-hidden="true"></i></span><span>暂无数据</span></div></td></tr>`;
      return;
    }
    body.innerHTML = rows.map((row, index) => `<tr>${columns.map((column) => column === "操作" ? `<td><button class="table-action" type="button" data-energy-action="meter-detail" data-meter-id="${escapeHtml(row.meterId)}">详情</button></td>` : `<td>${escapeHtml(getCellValue(row, column, index))}</td>`).join("")}</tr>`).join("");
  }

  function renderPagination(total) {
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    state.page = Math.min(state.page, totalPages);
    const pageButtons = Array.from({ length: Math.min(totalPages, 6) }, (_, index) => index + 1).map((page) => `<button class="energy-page-button ${page === state.page ? "active" : ""}" type="button" data-energy-page="${page}">${page}</button>`).join("");
    document.getElementById("energyPagination").innerHTML = `<div class="energy-pagination"><span>共 ${total} 条</span><div class="energy-pagination-controls"><button class="energy-page-button" type="button" data-energy-page-action="prev" ${state.page === 1 ? "disabled" : ""}>‹</button>${pageButtons}${totalPages > 6 ? "<span>...</span>" : ""}<button class="energy-page-button" type="button" data-energy-page-action="next" ${state.page === totalPages ? "disabled" : ""}>›</button></div></div>`;
  }

  function renderData() {
    const sourceRows = filterRows(getRowsForView());
    const aggregatedRows = aggregateRows(sourceRows);
    state.filteredRows = aggregatedRows;
    const start = (state.page - 1) * PAGE_SIZE;
    renderSummary(sourceRows);
    renderTable(aggregatedRows.slice(start, start + PAGE_SIZE));
    renderPagination(aggregatedRows.length);
  }

  function renderDetailPagination(total) {
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    state.detailPage = Math.min(state.detailPage, totalPages);
    const pageButtons = Array.from({ length: Math.min(totalPages, 6) }, (_, index) => index + 1).map((page) => `<button class="energy-page-button ${page === state.detailPage ? "active" : ""}" type="button" data-energy-detail-page="${page}">${page}</button>`).join("");
    return `<div class="energy-pagination energy-meter-detail-pagination"><span>共 ${total} 条</span><div class="energy-pagination-controls"><button class="energy-page-button" type="button" data-energy-detail-page-action="prev" ${state.detailPage === 1 ? "disabled" : ""}>‹</button>${pageButtons}${totalPages > 6 ? "<span>...</span>" : ""}<button class="energy-page-button" type="button" data-energy-detail-page-action="next" ${state.detailPage === totalPages ? "disabled" : ""}>›</button></div></div>`;
  }

  function renderMeterDetail(master, rows) {
    const columns = state.config.subDeviceColumns;
    const range = `${displayRangeValue(state.start, state.granularity)} ~ ${displayRangeValue(state.end, state.granularity, true)}`;
    const start = (state.detailPage - 1) * PAGE_SIZE;
    const visibleRows = rows.slice(start, start + PAGE_SIZE);
    const tableBody = visibleRows.length
      ? visibleRows.map((row, index) => `<tr>${columns.map((column) => `<td>${escapeHtml(getCellValue(row, column, index, start))}</td>`).join("")}</tr>`).join("")
      : `<tr><td colspan="${columns.length}"><div class="energy-meter-empty">暂无分表统计数据</div></td></tr>`;
    return `<div class="energy-meter-detail"><div class="energy-meter-meta"><div><span>总表名称</span><strong>${escapeHtml(master.deviceName)}</strong></div><div><span>设备编号</span><strong>${escapeHtml(master.deviceNo)}</strong></div><div><span>统计周期</span><strong>${PERIOD_LABELS[state.granularity]}</strong></div><div><span>时间范围</span><strong>${escapeHtml(range)}</strong></div></div><div class="energy-meter-detail-head"><h3>关联分表统计数据</h3></div><div class="energy-meter-detail-table-wrap"><table class="table energy-meter-detail-table"><thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${tableBody}</tbody></table></div>${renderDetailPagination(rows.length)}</div>`;
  }

  function refreshMeterDetail() {
    const master = state.config.rows.find((row) => row.view === "device" && row.meterLevel === "master" && row.meterId === state.detailMeterId);
    const drawerBody = document.getElementById("drawerBody");
    if (master && drawerBody) drawerBody.innerHTML = renderMeterDetail(master, state.detailRows);
  }

  function openMeterDetail(meterId) {
    const master = state.config.rows.find((row) => row.view === "device" && row.meterLevel === "master" && row.meterId === meterId);
    if (!master || !window.openAppDrawer) return;
    const relatedRows = aggregateRows(filterRows(state.config.rows.filter((row) => row.view === "device"), { meterLevel: "sub", parentMeterId: master.meterId }));
    state.detailMeterId = master.meterId;
    state.detailRows = relatedRows;
    state.detailPage = 1;
    window.openAppDrawer({ title: "关联分表详情", body: renderMeterDetail(master, relatedRows) });
  }

  function setGranularity(granularity) {
    state.granularity = granularity;
    state.start = DEFAULT_START[granularity];
    state.end = DEFAULT_END[granularity];
    state.page = 1;
    state.pickerViewDate = parseDateValue(state.start, granularity);
    state.pickerOpen = true;
    state.pickerDraft = { start: state.start, end: state.end };
    state.pickerSelecting = "start";
    renderToolbar();
    renderData();
  }

  function openTimePicker() {
    state.pickerOpen = true;
    state.pickerDraft = { start: state.start, end: state.end };
    state.pickerSelecting = "start";
    state.pickerViewDate = parseDateValue(state.start, state.granularity);
    renderToolbar();
  }

  function closeTimePicker() {
    state.pickerOpen = false;
    state.pickerDraft = null;
    renderToolbar();
  }

  function confirmTimePicker() {
    const draft = getPickerDraft();
    state.start = draft.start;
    state.end = draft.end;
    state.pickerOpen = false;
    state.pickerDraft = null;
    state.page = 1;
    renderToolbar();
    renderData();
  }

  function updatePickerHour(part, event) {
    const draft = getPickerDraft();
    const dateInput = document.querySelector(`[data-picker-date="${part}"]`);
    const date = parseDateValue(dateInput?.value || draft[part], "day");
    const current = parseDateValue(draft[part], "hour");
    const hour = document.querySelector(`[data-picker-scroll="${part}"][data-picker-time-unit="hour"].selected`)?.dataset.pickerTimeValue || pad2(current.getHours());
    const minute = document.querySelector(`[data-picker-scroll="${part}"][data-picker-time-unit="minute"].selected`)?.dataset.pickerTimeValue || pad2(current.getMinutes());
    const second = document.querySelector(`[data-picker-scroll="${part}"][data-picker-time-unit="second"].selected`)?.dataset.pickerTimeValue || pad2(current.getSeconds());
    draft[part] = `${dateTimeKey(date, hour, minute)}:${second}`;
    state.pickerDraft = draft;
    if (event?.target?.dataset?.pickerDate) refreshPicker();
  }

  function updatePickerTime(part, unit, value) {
    const draft = getPickerDraft();
    const date = parseDateValue(draft[part], "hour");
    const hour = unit === "hour" ? value : pad2(date.getHours());
    const minute = unit === "minute" ? value : pad2(date.getMinutes());
    const second = unit === "second" ? value : pad2(date.getSeconds());
    draft[part] = `${dateTimeKey(date, hour, minute)}:${second}`;
    state.pickerDraft = draft;
    refreshPicker();
  }

  function collectFilters() {
    state.filters = Object.fromEntries([...document.querySelectorAll("[data-energy-filter]")].map((input) => [input.dataset.energyFilter, input.value.trim()]));
  }

  function resetPage() {
    state.view = "floor";
    state.granularity = "hour";
    state.start = DEFAULT_START.hour;
    state.end = DEFAULT_END.hour;
    state.filters = {};
    state.page = 1;
    state.pickerOpen = false;
    state.pickerDraft = null;
    renderToolbar();
    renderData();
  }

  function downloadCsv() {
    const columns = getColumns().filter((column) => column !== "操作");
    const lines = [columns, ...state.filteredRows.map((row, index) => columns.map((column) => getCellValue(row, column, index)))];
    const csv = `\uFEFF${lines.map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${state.config.title}-${PERIOD_LABELS[state.granularity]}统计.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      if (state.pickerOpen && !event.target.closest(".energy-time-picker, [data-picker-open], [data-energy-granularity]")) {
        closeTimePicker();
        return;
      }
      const view = event.target.closest("[data-energy-view]");
      const granularity = event.target.closest("[data-energy-granularity]");
      const action = event.target.closest("[data-energy-action]");
      const page = event.target.closest("[data-energy-page]");
      const pageAction = event.target.closest("[data-energy-page-action]");
      const detailPage = event.target.closest("[data-energy-detail-page]");
      const detailPageAction = event.target.closest("[data-energy-detail-page-action]");
      const pickerOpen = event.target.closest("[data-picker-open]");
      const pickerAction = event.target.closest("[data-picker-action]");
      const pickerDay = event.target.closest("[data-picker-day]");
      const pickerMonth = event.target.closest("[data-picker-month]");
      const pickerYear = event.target.closest("[data-picker-year]");
      const pickerTime = event.target.closest("[data-picker-scroll]");
      const pickerNav = event.target.closest("[data-picker-nav]");
      if (pickerOpen) { openTimePicker(); return; }
      if (pickerAction?.dataset.pickerAction === "cancel") { closeTimePicker(); return; }
      if (pickerAction?.dataset.pickerAction === "confirm") { confirmTimePicker(); return; }
      if (pickerNav) {
        const offset = pickerNav.dataset.pickerNav === "prev" ? -1 : 1;
        if (state.granularity === "day") state.pickerViewDate = new Date(state.pickerViewDate.getFullYear(), state.pickerViewDate.getMonth() + offset, 1);
        if (state.granularity === "month") state.pickerViewDate = new Date(state.pickerViewDate.getFullYear() + offset, state.pickerViewDate.getMonth(), 1);
        if (state.granularity === "year") state.pickerViewDate = new Date(state.pickerViewDate.getFullYear() + offset * 10, state.pickerViewDate.getMonth(), 1);
        refreshPicker();
        return;
      }
      if (pickerDay) { selectPickerRange(pickerDay.dataset.pickerDay); return; }
      if (pickerMonth) { selectPickerRange(pickerMonth.dataset.pickerMonth); return; }
      if (pickerYear) { selectPickerRange(pickerYear.dataset.pickerYear); return; }
      if (pickerTime) { updatePickerTime(pickerTime.dataset.pickerScroll, pickerTime.dataset.pickerTimeUnit, pad2(pickerTime.dataset.pickerTimeValue)); return; }
      if (action?.dataset.energyAction === "meter-detail") { openMeterDetail(action.dataset.meterId); return; }
      if (detailPage) { state.detailPage = Number(detailPage.dataset.energyDetailPage); refreshMeterDetail(); return; }
      if (detailPageAction) { const totalPages = Math.max(1, Math.ceil(state.detailRows.length / PAGE_SIZE)); state.detailPage = detailPageAction.dataset.energyDetailPageAction === "prev" ? Math.max(1, state.detailPage - 1) : Math.min(totalPages, state.detailPage + 1); refreshMeterDetail(); return; }
      if (view) { state.view = view.dataset.energyView; state.page = 1; renderToolbar(); renderData(); }
      if (granularity) setGranularity(granularity.dataset.energyGranularity);
      if (action?.dataset.energyAction === "toggle-filters") {
        const layout = document.getElementById("energyFilterLayout");
        const expanded = layout.classList.toggle("is-expanded");
        action.innerHTML = `${expanded ? "收起" : "展开"} <i class="fa-solid fa-chevron-${expanded ? "up" : "down"}" aria-hidden="true"></i>`;
      }
      if (action?.dataset.energyAction === "search") { collectFilters(); state.page = 1; renderData(); }
      if (action?.dataset.energyAction === "reset") resetPage();
      if (action?.dataset.energyAction === "export") downloadCsv();
      if (page) { state.page = Number(page.dataset.energyPage); renderData(); }
      if (pageAction) { const totalPages = Math.max(1, Math.ceil(state.filteredRows.length / PAGE_SIZE)); state.page = pageAction.dataset.energyPageAction === "prev" ? Math.max(1, state.page - 1) : Math.min(totalPages, state.page + 1); renderData(); }
    });
    document.addEventListener("change", (event) => {
      if (event.target.matches("[data-picker-date]")) updatePickerHour(event.target.dataset.pickerDate, event);
      if (event.target.matches("[data-picker-time]")) updatePickerHour(event.target.dataset.pickerTime, event);
    });
  }

  function mount() {
    const type = document.body.dataset.energyType;
    state.config = window.ENERGY_PAGE_CONFIG?.[type];
    if (!state.config) return;
    renderToolbar();
    renderData();
    bindEvents();
  }

  document.addEventListener("DOMContentLoaded", mount);
})();
