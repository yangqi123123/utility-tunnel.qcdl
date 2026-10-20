(function () {
  const $ = (id) => document.getElementById(id);
  let selectedZoneId = "";

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function renderStats() {
    const stats = window.COMMUNICATION_STORE?.zoneStats?.() || { zones: 0, terminals: 0, idle: 0, broadcasting: 0 };
    if ($("zoneStatZones")) $("zoneStatZones").textContent = stats.zones;
    if ($("zoneStatTerminals")) $("zoneStatTerminals").textContent = stats.terminals;
    if ($("zoneStatIdle")) $("zoneStatIdle").textContent = stats.idle;
    if ($("zoneStatBroadcasting")) $("zoneStatBroadcasting").textContent = stats.broadcasting;
  }

  function renderZones() {
    const list = window.COMMUNICATION_STORE?.listZones?.() || [];
    if (!selectedZoneId || !list.some((z) => z.zoneId === selectedZoneId)) selectedZoneId = list[0]?.zoneId || "";
    if (!$("zoneList")) return;
    $("zoneList").innerHTML = list.length
      ? list.map((zone) => `<button class="communication-zone-row ${zone.zoneId === selectedZoneId ? "active" : ""}" type="button" data-zone-id="${escapeHtml(zone.zoneId)}">
          <span class="communication-call-main"><strong>${escapeHtml(zone.name)}</strong><small>${escapeHtml(zone.cabin)} · ${escapeHtml(zone.section)}</small></span>
          <span class="status-badge ${zone.status === "广播中" ? "active" : "done"}">${escapeHtml(zone.status)}</span>
        </button>`).join("")
      : `<div class="communication-empty">暂无广播分区</div>`;
    renderTerminals();
  }

  function renderTerminals() {
    const zone = (window.COMMUNICATION_STORE?.listZones?.() || []).find((z) => z.zoneId === selectedZoneId);
    const terminals = window.COMMUNICATION_STORE?.listZoneTerminals?.(selectedZoneId) || [];
    if ($("zoneDetailTitle")) $("zoneDetailTitle").textContent = zone ? zone.name : "分区终端";
    if ($("zoneDetailMeta")) $("zoneDetailMeta").textContent = zone ? `终端 ${zone.terminalCount} · 最近：${zone.lastTaskSummary}` : "请选择分区";
    if (!$("zoneTerminalBody")) return;
    $("zoneTerminalBody").innerHTML = terminals.length
      ? terminals.map((item) => `<tr>
          <td>${escapeHtml(item.terminalId)}</td>
          <td>${escapeHtml(item.name)}</td>
          <td><span class="communication-online ${item.onlineStatus === "在线" ? "ok" : "warn"}">${escapeHtml(item.onlineStatus)}</span></td>
        </tr>`).join("")
      : `<tr><td colspan="3"><div class="communication-empty">该分区暂无终端</div></td></tr>`;
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderStats();
    renderZones();
    document.addEventListener("click", (event) => {
      const row = event.target.closest("[data-zone-id]");
      if (row) {
        selectedZoneId = row.dataset.zoneId;
        renderZones();
      }
      if (event.target.closest("[data-zone-broadcast]")) {
        location.href = "../emergency/dispatch.html";
      }
    });
  });
})();
