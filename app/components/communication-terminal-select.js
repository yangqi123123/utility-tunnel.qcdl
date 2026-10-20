(function () {
  const SYSTEM_NAME = "通信系统";

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function listCommunicationDevices() {
    const devices = (window.APP_DATA?.devices || []).filter((item) => (item.system || "") === SYSTEM_NAME);
    if (devices.length) {
      return devices.map((item) => ({ id: item.id, name: item.name, code: item.code || item.model || item.id }));
    }
    return [
      { id: "D-10032", name: "管廊环网交换机 01", code: "COM-SW-001" },
      { id: "D-10033", name: "应急广播终端 02", code: "COM-BC-002" },
      { id: "D-10034", name: "通信光端机 01", code: "COM-OT-001" },
      { id: "D-10035", name: "综合舱广播终端 01", code: "COM-BC-001" },
      { id: "D-10036", name: "环网交换机 02", code: "COM-SW-002" },
    ];
  }

  function render(root) {
    const keyword = (root.querySelector("[data-terminal-search]")?.value || "").trim().toLowerCase();
    const options = root._options || [];
    const selected = new Set(root._selected || []);
    const filtered = options.filter((item) => !keyword || `${item.name} ${item.code}`.toLowerCase().includes(keyword));
    const tags = root.querySelector("[data-terminal-tags]");
    const menu = root.querySelector("[data-terminal-menu-list]");
    if (tags) {
      tags.innerHTML = selected.size
        ? [...selected].map((id) => {
          const item = options.find((row) => row.id === id);
          if (!item) return "";
          return `<span class="broadcast-multi-tag">${escapeHtml(item.name)}<button type="button" data-terminal-remove="${escapeHtml(item.id)}">×</button></span>`;
        }).join("")
        : '<span class="broadcast-multi-placeholder">请选择通信设备</span>';
    }
    if (menu) {
      menu.innerHTML = filtered.length
        ? filtered.map((item) => `<label class="broadcast-multi-option ${selected.has(item.id) ? "is-selected" : ""}">
            <input type="checkbox" data-terminal-option="${escapeHtml(item.id)}" ${selected.has(item.id) ? "checked" : ""}>
            <span>${escapeHtml(item.name)}<small style="display:block;color:var(--text-secondary);font-size:11px">${escapeHtml(item.code)}</small></span>
          </label>`).join("")
        : '<div class="broadcast-multi-empty" style="padding:10px;color:var(--text-secondary);font-size:12px">暂无匹配设备</div>';
    }
  }

  function mount(selector) {
    const hosts = typeof selector === "string" ? [...document.querySelectorAll(selector)] : [selector].filter(Boolean);
    const options = listCommunicationDevices();
    hosts.forEach((host) => {
      const root = document.createElement("div");
      root.className = "broadcast-multi communication-terminal-select";
      root._options = options;
      root._selected = new Set(host.dataset.defaultSelected ? host.dataset.defaultSelected.split(",") : options.slice(0, 1).map((item) => item.id));
      root.innerHTML = `
        <button type="button" class="broadcast-multi-trigger" data-terminal-trigger>
          <span class="broadcast-multi-tags" data-terminal-tags></span>
        </button>
        <div class="broadcast-multi-menu" data-terminal-menu>
          <div style="padding:8px 10px;border-bottom:1px solid var(--border)">
            <input class="form-control" data-terminal-search placeholder="搜索设备名称 / 编码" style="height:32px">
          </div>
          <div data-terminal-menu-list></div>
        </div>`;
      host.replaceWith(root);
      render(root);
    });
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-terminal-trigger]");
    if (trigger) {
      const root = trigger.closest(".communication-terminal-select");
      document.querySelectorAll(".communication-terminal-select.open").forEach((item) => {
        if (item !== root) item.classList.remove("open");
      });
      root?.classList.toggle("open");
      return;
    }
    const remove = event.target.closest("[data-terminal-remove]");
    if (remove) {
      const root = remove.closest(".communication-terminal-select");
      root._selected.delete(remove.dataset.terminalRemove);
      render(root);
      return;
    }
    const optionRow = event.target.closest(".broadcast-multi-option");
    if (optionRow && event.target.closest(".communication-terminal-select")) {
      const root = optionRow.closest(".communication-terminal-select");
      const input = optionRow.querySelector("[data-terminal-option]");
      if (!input) return;
      const id = input.dataset.terminalOption;
      if (!event.target.matches("input")) input.checked = !input.checked;
      if (input.checked) root._selected.add(id);
      else root._selected.delete(id);
      render(root);
      event.stopPropagation();
      return;
    }
    if (!event.target.closest(".communication-terminal-select")) {
      document.querySelectorAll(".communication-terminal-select.open").forEach((item) => item.classList.remove("open"));
    }
  });

  document.addEventListener("input", (event) => {
    if (event.target.matches("[data-terminal-search]")) {
      render(event.target.closest(".communication-terminal-select"));
    }
  });

  window.COMMUNICATION_TERMINAL_SELECT = { mount, listCommunicationDevices };
  document.addEventListener("DOMContentLoaded", () => {
    mount("[data-terminal-select-host]");
  });
})();
