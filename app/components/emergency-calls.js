(function () {
  const ui = window.EMERGENCY_UI;
  const store = () => window.EMERGENCY_STORE;
  if (!ui) return;

  let state = { records: [], filtered: [], page: 1, pageSize: 10 };
  const text = (value) => ui.escapeHtml(value || "-");
  const attr = (value) => text(value).replaceAll("'", "&#39;");

  function people() {
    try { return store()?.listPersonnel?.() || []; } catch { return []; }
  }

  function events() {
    try { return store()?.listEvents?.() || []; } catch { return []; }
  }

  function getRecords() {
    try { return Array.isArray(store()?.listCalls?.()) ? store().listCalls() : []; }
    catch (error) { ui.showApiError(error); return []; }
  }

  function personName(id) {
    return people().find((item) => item.personId === id)?.name || id || "-";
  }

  function eventTitle(id) {
    return events().find((item) => item.eventId === id)?.title || id || "未关联事件";
  }

  function callTime(item) {
    return item.startedAt || item.createdAt || item.connectedAt || "-";
  }

  function options() {
    const eventSelect = document.getElementById("callEventId");
    if (!eventSelect) return;
    const current = eventSelect.value || new URLSearchParams(location.search).get("eventId") || "";
    eventSelect.innerHTML = `<option value="">全部事件</option>${events().map((item) => `<option value="${attr(item.eventId)}" ${current === item.eventId ? "selected" : ""}>${text(item.eventId)} · ${text(item.title)}</option>`).join("")}`;
  }

  function filtered() {
    const eventId = ui.value("callEventId");
    const type = ui.value("callType");
    const result = ui.value("callResult");
    const keyword = ui.value("callKeyword").toLowerCase();
    state.filtered = state.records.filter((item) => {
      const caller = personName(item.callerId);
      const callees = (item.calleeIds || []).map(personName).join("、");
      const haystack = `${caller} ${callees}`.toLowerCase();
      return (!eventId || item.eventId === eventId)
        && (!type || item.type === type)
        && (!result || item.result === result)
        && (!keyword || haystack.includes(keyword));
    });
    const pages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
    state.page = Math.min(state.page, pages);
  }

  function render() {
    filtered();
    const start = (state.page - 1) * state.pageSize;
    const rows = state.filtered.slice(start, start + state.pageSize);
    document.getElementById("callBody").innerHTML = rows.length
      ? rows.map((item) => `<tr data-call-id="${attr(item.callId)}">
          <td>${text(callTime(item))}</td>
          <td>${item.eventId ? `<button class="table-action" type="button" data-call-event="${attr(item.eventId)}">${text(item.eventId)}</button>` : text("未关联")}</td>
          <td>${text(personName(item.callerId))}</td>
          <td>${text((item.calleeIds || []).map(personName).join("、") || "-")}</td>
          <td>${text(item.type || "-")}</td>
          <td>${ui.renderStatus(item.result)}</td>
          <td>${Number(item.durationSeconds || 0)}s</td>
          <td class="emergency-ledger-actions"><button class="table-action" type="button" data-call-action="detail" data-call-id="${attr(item.callId)}">详情</button></td>
        </tr>`).join("")
      : `<tr><td colspan="8"><div class="emergency-empty">暂无通话记录</div></td></tr>`;
    document.getElementById("callCount").innerHTML = ui.renderPagination({
      total: state.filtered.length, page: state.page, pageSize: state.pageSize, id: "callPagination",
    });
  }

  function refresh() {
    state.records = getRecords();
    options();
    render();
  }

  function openDetail(id) {
    const item = state.records.find((record) => record.callId === id);
    if (!item) return;
    const pairs = [
      ["通话类型", item.type || "-"],
      ["通话结果", item.result || "-"],
      ["主叫人", personName(item.callerId)],
      ["被叫人", (item.calleeIds || []).map(personName).join("、") || "-"],
      ["发起来源", item.source || "-"],
      ["通话时间", callTime(item)],
      ["通话时长", `${Number(item.durationSeconds || 0)}s`],
      ["关联事件", eventTitle(item.eventId)],
    ];
    ui.openEntityDrawer({
      title: "通话详情",
      body: `<div class="emergency-detail-grid">${pairs.map(([label, value]) => `<div class="emergency-detail-item"><span class="emergency-detail-label">${label}</span><span class="emergency-detail-value">${label === "通话结果" ? ui.renderStatus(value) : text(value)}</span></div>`).join("")}</div>
        <div class="emergency-subsection"><h3 class="emergency-subsection-title">录音</h3><div class="call-recording-mock"><button class="icon-btn" type="button" aria-label="播放录音"><i class="fa-solid fa-play"></i></button><span>录音文件 Mock · ${Number(item.durationSeconds || 0)}s</span><div class="call-recording-progress"><span style="width:36%"></span></div></div></div>`,
      footer: `<button class="btn btn-secondary" type="button" data-drawer-close>关闭</button>`,
    });
  }

  function syncCalls() {
    const sample = {
      eventId: events()[0]?.eventId || "",
      callerId: "P-001",
      calleeIds: ["P-002"],
      type: "单呼",
      source: "同步任务",
      result: "已接通",
      durationSeconds: 48,
    };
    try {
      if (!store()?.logCall) throw new Error("通话服务尚未就绪");
      store().logCall(sample);
      refresh();
      ui.showToast("通话记录已同步");
    } catch (error) { ui.showApiError(error); }
  }

  function init() {
    if (!document.getElementById("callBody")) return;
    const initialEventId = new URLSearchParams(location.search).get("eventId") || "";
    if (initialEventId) ui.setValue("callEventId", initialEventId);
    refresh();
    document.addEventListener("click", (event) => {
      const action = event.target.closest("[data-call-action]");
      if (action) {
        const type = action.dataset.callAction;
        const id = action.dataset.callId;
        if (type === "filter") { state.page = 1; render(); }
        else if (type === "reset") {
          ["callEventId", "callType", "callResult", "callKeyword"].forEach((field) => ui.setValue(field, ""));
          state.page = 1;
          render();
        }
        else if (type === "export") ui.showToast("已按当前筛选条件生成通话记录文件（Mock）");
        else if (type === "sync") syncCalls();
        else if (type === "detail") openDetail(id);
      }
      const eventLink = event.target.closest("[data-call-event]");
      if (eventLink?.dataset.callEvent) ui.navigate("events", { eventId: eventLink.dataset.callEvent });
      if (event.target.closest("[data-page-prev]")) { state.page = Math.max(1, state.page - 1); render(); }
      if (event.target.closest("[data-page-next]")) { state.page += 1; render(); }
    });
    ["callEventId", "callType", "callResult"].forEach((id) => {
      document.getElementById(id)?.addEventListener("change", () => { state.page = 1; render(); });
    });
    document.getElementById("callKeyword")?.addEventListener("input", () => { state.page = 1; render(); });
    window.addEventListener("storage", (event) => { if (!event.key || event.key.includes("emergency")) refresh(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
