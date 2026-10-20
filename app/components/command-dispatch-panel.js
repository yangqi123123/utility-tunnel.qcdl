(function () {
  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]
    ));
  }

  function avatarText(name) {
    const text = String(name || "").trim();
    return text ? text.slice(-2) : "员";
  }

  function avatarColor(name) {
    const palette = ["#135AFA", "#14C9BA", "#9359E3", "#F7BA1E", "#F53F57"];
    let hash = 0;
    String(name || "").split("").forEach((ch) => { hash = (hash + ch.charCodeAt(0)) % palette.length; });
    return palette[hash];
  }

  /**
   * @param {HTMLElement} hostEl
   * @param {{
   *   getStore: () => any,
   *   getEventId?: () => string,
   *   source?: string,
   *   onCall?: (payload: { personIds: string[], call?: any }) => void,
   *   onConferenceChange?: () => void,
   *   toast?: (msg: string, type?: string) => void,
   * }} options
   */
  function mountCommandDispatchPanel(hostEl, options = {}) {
    if (!hostEl) return { destroy() {}, refresh() {} };
    const store = () => (typeof options.getStore === "function" ? options.getStore() : window.EMERGENCY_STORE);
    const toast = (msg, type) => {
      if (typeof options.toast === "function") options.toast(msg, type);
      else if (window.EMERGENCY_UI?.showToast) window.EMERGENCY_UI.showToast(msg, type);
      else if (window.showToast) window.showToast(msg);
      else alert(msg);
    };
    const state = {
      commandTab: "dispatch",
      multiSelect: false,
      selectedIds: [],
      conferenceIds: [],
      conferenceActiveId: "",
      conferenceMuted: {},
      keyword: "",
    };
    const headerExtra = options.headerExtra || "";

    function people() {
      try { return store()?.listPersonnel?.() || []; } catch { return []; }
    }

    function eventId() {
      try { return options.getEventId?.() || ""; } catch { return ""; }
    }

    function filteredPeople() {
      const keyword = state.keyword.trim().toLowerCase();
      return people().filter((p) => {
        if (p.onlineStatus && p.onlineStatus !== "在线") return false;
        if (!keyword) return true;
        return `${p.name} ${p.unit || ""} ${p.role || ""} ${p.mobile || ""}`.toLowerCase().includes(keyword);
      });
    }

    function groupByUnit(list) {
      const groups = {};
      list.forEach((item) => {
        const key = item.unit || "未分组单位";
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      });
      return groups;
    }

    function logCall(ids) {
      const call = store()?.logCall?.({
        eventId: eventId(),
        callerId: "P-001",
        calleeIds: ids,
        type: ids.length > 1 ? "群呼" : "单呼",
        source: options.source || "通信值班台",
        result: "已接通",
        durationSeconds: 60,
      });
      ids.forEach((id) => {
        const person = store()?.getPerson?.(id);
        if (person && store()?.savePerson) store().savePerson({ ...person, dispatchStatus: "已调度" });
      });
      options.onCall?.({ personIds: ids, call });
      return call;
    }

    function render() {
      const tabs = `<div class="dispatch-command-tabs">
        <button type="button" data-command-tab="dispatch" class="${state.commandTab === "dispatch" ? "active" : ""}">调度</button>
        <button type="button" data-command-tab="conference" class="${state.commandTab === "conference" ? "active" : ""}">会商</button>
      </div>`;

      if (state.commandTab === "conference") {
        const members = state.conferenceIds
          .map((id) => store()?.getPerson?.(id) || people().find((item) => item.personId === id))
          .filter(Boolean);
        const activeMuted = state.conferenceActiveId && state.conferenceMuted[state.conferenceActiveId];
        const muteLabel = activeMuted ? "发言" : "禁言";
        let body = "";
        if (!members.length) {
          body = `<div class="ds-conference-empty">
            <i class="fa-solid fa-comments" aria-hidden="true"></i>
            <p>暂无会商</p>
            <button class="btn btn-primary ds-conference-add-btn" type="button" data-cdp-action="open-conference-picker">
              <i class="fa-solid fa-plus" aria-hidden="true"></i><span>添加会商人员</span>
            </button>
          </div>`;
        } else {
          body = `<div class="ds-conference-ring">
            ${members.map((person) => {
              const muted = !!state.conferenceMuted[person.personId];
              const active = state.conferenceActiveId === person.personId ? "is-active" : "";
              return `<button type="button" class="ds-conference-seat filled ${active}" data-conference-select="${esc(person.personId)}">
                ${muted ? `<span class="ds-conference-mute" title="已禁言"><i class="fa-solid fa-microphone-slash"></i></span>` : ""}
                <span class="ds-conference-avatar" style="--avatar-color:${avatarColor(person.name)}">${esc(avatarText(person.name))}</span>
                <strong>${esc(person.name)}</strong>
                <small>${esc(person.type || person.role || "-")}</small>
              </button>`;
            }).join("")}
            <button type="button" class="ds-conference-seat is-add" data-cdp-action="open-conference-picker" title="添加会商人员"><i class="fa-solid fa-plus"></i></button>
          </div>
          <div class="dispatch-right-actions">
            <button class="btn btn-secondary" type="button" data-cdp-action="mute-conference">${muteLabel}</button>
            <button class="btn btn-secondary" type="button" data-cdp-action="remove-conference">移出</button>
          </div>
          <div class="dispatch-right-actions">
            <button class="btn btn-primary" type="button" data-cdp-action="end-conference">结束会商</button>
          </div>`;
        }
        hostEl.innerHTML = `<div class="ds-right-inner cdp-root">
          <div class="ds-right-head"><h3>指挥调度</h3>${headerExtra}</div>
          <div class="ds-right-scroll">${tabs}${body}</div>
        </div>`;
        return;
      }

      const groups = groupByUnit(filteredPeople());
      hostEl.innerHTML = `<div class="ds-right-inner cdp-root">
        <div class="ds-right-head"><h3>指挥调度</h3>${headerExtra}</div>
        <div class="ds-right-scroll">${tabs}
          <label class="dispatch-search" style="margin-bottom:10px;display:block">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input class="form-control" data-cdp-keyword type="search" placeholder="搜索联系人" value="${esc(state.keyword)}">
          </label>
          <div data-cdp-contact-list>${Object.entries(groups).map(([unit, members]) => `
            <details class="dispatch-contact-group" open>
              <summary>${esc(unit)}（${members.length}）</summary>
              ${members.map((person) => `<div class="dispatch-contact-row" data-contact-id="${esc(person.personId)}">
                <label><input type="checkbox" data-select-person="${esc(person.personId)}" ${state.selectedIds.includes(person.personId) ? "checked" : ""} ${state.multiSelect ? "" : "hidden"}></label>
                <div class="grow"><strong>${esc(person.name)}</strong><small>${esc(person.role || person.type || "")} · ${esc(person.mobile || "")}</small></div>
                <div class="dispatch-contact-actions">
                  <button class="icon-btn" type="button" data-call-person="${esc(person.personId)}" title="电话呼叫"><i class="fa-solid fa-phone"></i></button>
                  <button class="icon-btn" type="button" data-join-conference="${esc(person.personId)}" title="加入会商"><i class="fa-solid fa-users"></i></button>
                </div>
              </div>`).join("")}
            </details>`).join("") || `<div class="dispatch-right-empty">暂无联系人</div>`}</div>
          <div class="dispatch-right-actions">
            <button class="btn btn-secondary" type="button" data-cdp-action="toggle-multi">${state.multiSelect ? "取消多选" : "多选"}</button>
            <button class="btn btn-primary" type="button" data-cdp-action="call-selected"><i class="fa-solid fa-phone"></i> 电话呼叫</button>
            <button class="btn btn-secondary" type="button" data-cdp-action="join-selected-conference">加入会商</button>
          </div>
        </div>
      </div>`;
    }

    function openConferencePicker() {
      document.querySelector(".emergency-center-mask[data-conference-picker]")?.remove();
      const existing = new Set(state.conferenceIds);
      const candidates = people().filter((p) => !existing.has(p.personId) && (!p.onlineStatus || p.onlineStatus === "在线"));
      const mask = document.createElement("div");
      mask.className = "emergency-center-mask";
      mask.dataset.conferencePicker = "1";
      mask.innerHTML = `<div class="emergency-center-modal" role="dialog" aria-modal="true">
        <div class="emergency-center-head"><h3>添加会商人员</h3><button type="button" data-conference-picker-close aria-label="关闭">×</button></div>
        <div class="emergency-center-body">
          ${candidates.length
            ? `<div class="ds-conference-pick-list">${candidates.map((person) => `
                <label class="ds-conference-pick-item">
                  <input type="checkbox" value="${esc(person.personId)}" data-conference-pick="${esc(person.personId)}">
                  <span class="ds-conference-avatar sm" style="--avatar-color:${avatarColor(person.name)}">${esc(avatarText(person.name))}</span>
                  <span class="grow"><strong>${esc(person.name)}</strong><small>${esc(person.type || person.role || "-")} · ${esc(person.unit || "")}</small></span>
                </label>`).join("")}</div>`
            : `<div class="dispatch-right-empty">暂无可添加人员</div>`}
        </div>
        <div class="emergency-center-foot">
          <button class="btn btn-secondary" type="button" data-conference-picker-close>取消</button>
          <button class="btn btn-primary" type="button" data-conference-picker-confirm ${candidates.length ? "" : "disabled"}>确定</button>
        </div>
      </div>`;
      document.body.appendChild(mask);
    }

    function onClick(event) {
      if (event.target.closest("[data-conference-picker-close]")) {
        document.querySelector(".emergency-center-mask[data-conference-picker]")?.remove();
        return;
      }
      if (event.target.closest("[data-conference-picker-confirm]")) {
        const ids = [...document.querySelectorAll("[data-conference-pick]:checked")]
          .map((input) => input.dataset.conferencePick || input.value || "")
          .filter(Boolean);
        if (!ids.length) return toast("请选择会商人员", "warning");
        ids.forEach((id) => { if (!state.conferenceIds.includes(id)) state.conferenceIds.push(id); });
        state.conferenceActiveId = ids[0] || state.conferenceActiveId;
        document.querySelector(".emergency-center-mask[data-conference-picker]")?.remove();
        state.commandTab = "conference";
        render();
        options.onConferenceChange?.();
        toast(`已加入 ${ids.length} 人`);
        return;
      }

      const tab = event.target.closest("[data-command-tab]");
      if (tab && hostEl.contains(tab)) {
        state.commandTab = tab.dataset.commandTab || "dispatch";
        render();
        return;
      }

      const action = event.target.closest("[data-cdp-action]")?.dataset.cdpAction;
      if (action === "toggle-multi") {
        state.multiSelect = !state.multiSelect;
        if (!state.multiSelect) state.selectedIds = [];
        render();
        return;
      }
      if (action === "call-selected") {
        const ids = state.selectedIds.slice();
        if (!ids.length) return toast("请先选择联系人", "warning");
        logCall(ids);
        toast(`已发起呼叫，${ids.length} 名人员已接通`);
        return;
      }
      if (action === "join-selected-conference") {
        const ids = state.selectedIds.slice();
        if (!ids.length) return toast("请先选择联系人", "warning");
        ids.forEach((id) => { if (!state.conferenceIds.includes(id)) state.conferenceIds.push(id); });
        state.conferenceActiveId = ids[0] || state.conferenceActiveId;
        state.commandTab = "conference";
        render();
        options.onConferenceChange?.();
        return;
      }
      if (action === "open-conference-picker") {
        openConferencePicker();
        return;
      }
      if (action === "mute-conference") {
        if (!state.conferenceActiveId) return toast("请先选择会商人员", "warning");
        state.conferenceMuted[state.conferenceActiveId] = !state.conferenceMuted[state.conferenceActiveId];
        render();
        return;
      }
      if (action === "remove-conference") {
        if (!state.conferenceActiveId) return toast("请先选择会商人员", "warning");
        state.conferenceIds = state.conferenceIds.filter((id) => id !== state.conferenceActiveId);
        delete state.conferenceMuted[state.conferenceActiveId];
        state.conferenceActiveId = state.conferenceIds[0] || "";
        render();
        options.onConferenceChange?.();
        return;
      }
      if (action === "end-conference") {
        state.conferenceIds = [];
        state.conferenceMuted = {};
        state.conferenceActiveId = "";
        render();
        options.onConferenceChange?.();
        toast("会商已结束");
        return;
      }

      const callPerson = event.target.closest("[data-call-person]");
      if (callPerson && hostEl.contains(callPerson)) {
        const id = callPerson.dataset.callPerson;
        logCall([id]);
        toast("已发起电话呼叫");
        return;
      }
      const join = event.target.closest("[data-join-conference]");
      if (join && hostEl.contains(join)) {
        const id = join.dataset.joinConference;
        if (!state.conferenceIds.includes(id)) state.conferenceIds.push(id);
        state.conferenceActiveId = id;
        state.commandTab = "conference";
        render();
        options.onConferenceChange?.();
        return;
      }
      const seat = event.target.closest("[data-conference-select]");
      if (seat && hostEl.contains(seat)) {
        state.conferenceActiveId = seat.dataset.conferenceSelect;
        render();
      }
    }

    function onChange(event) {
      const box = event.target.closest("[data-select-person]");
      if (box && hostEl.contains(box)) {
        const id = box.dataset.selectPerson;
        if (box.checked) {
          if (!state.selectedIds.includes(id)) state.selectedIds.push(id);
        } else {
          state.selectedIds = state.selectedIds.filter((x) => x !== id);
        }
      }
    }

    function onInput(event) {
      if (event.target.matches("[data-cdp-keyword]") && hostEl.contains(event.target)) {
        state.keyword = event.target.value || "";
        render();
        const input = hostEl.querySelector("[data-cdp-keyword]");
        if (input) {
          input.focus();
          const len = input.value.length;
          input.setSelectionRange(len, len);
        }
      }
    }

    document.addEventListener("click", onClick);
    document.addEventListener("change", onChange);
    document.addEventListener("input", onInput);
    render();

    return {
      refresh: render,
      destroy() {
        document.removeEventListener("click", onClick);
        document.removeEventListener("change", onChange);
        document.removeEventListener("input", onInput);
        document.querySelector(".emergency-center-mask[data-conference-picker]")?.remove();
        hostEl.innerHTML = "";
      },
    };
  }

  window.mountCommandDispatchPanel = mountCommandDispatchPanel;
})();
