(function () {
  const $ = (id) => document.getElementById(id);
  const SYSTEM_NAME = "通信系统";
  const PRIMARY = "#135AFA";
  const charts = [];

  const broadcastTasks = [
    { name: "早间消防宣传", type: "服务器音乐", status: "播放中" },
    { name: "午间通知播报", type: "TTS文本", status: "已完成" },
    { name: "设备检修提示", type: "HTTP流媒体", status: "已停止" },
    { name: "综合舱巡检提示", type: "服务器音乐", status: "失败" },
  ];

  const broadcastLogs = [
    { type: "服务器音乐", result: "成功" },
    { type: "HTTP流媒体", result: "成功" },
    { type: "TTS文本", result: "失败" },
  ];

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function listDevices() {
    return (window.APP_DATA?.devices || []).filter((item) => (item.system || "") === SYSTEM_NAME);
  }

  function listCalls() {
    try {
      return window.EMERGENCY_STORE?.listCalls?.() || [];
    } catch {
      return [];
    }
  }

  function dayKey(value) {
    const text = String(value || "");
    if (!text) return "";
    return text.slice(0, 10);
  }

  function countBy(list, getter) {
    const map = {};
    list.forEach((item) => {
      const key = getter(item) || "其他";
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map);
  }

  function renderBars(targetId, entries, color = PRIMARY) {
    const el = $(targetId);
    if (!el) return;
    const total = entries.reduce((sum, [, n]) => sum + n, 0) || 1;
    el.innerHTML = entries.length
      ? entries.map(([label, count]) => {
        const pct = Math.round((count / total) * 100);
        return `<div class="communication-dist-row">
          <span>${escapeHtml(label)}</span>
          <div class="communication-dist-track"><i style="width:${pct}%;background:${color}"></i></div>
          <strong>${count}</strong>
        </div>`;
      }).join("")
      : `<div class="communication-empty">暂无数据</div>`;
  }

  function formatDuration(totalSeconds) {
    const seconds = Math.max(0, Number(totalSeconds) || 0);
    if (seconds >= 60) return `${Math.round(seconds / 60)}分`;
    return `${seconds}秒`;
  }

  function lastNDays(n, baseText = "2026-10-14") {
    const base = new Date(`${baseText}T12:00:00`);
    const days = [];
    for (let i = n - 1; i >= 0; i -= 1) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }
    return days;
  }

  function renderKpis(devices, calls) {
    if ($("kpiDevices")) $("kpiDevices").textContent = devices.length;
    if ($("kpiTasks")) $("kpiTasks").textContent = broadcastTasks.length;
    if ($("kpiPlaying")) $("kpiPlaying").textContent = broadcastTasks.filter((t) => t.status === "播放中").length;
    if ($("kpiBroadcastOps")) $("kpiBroadcastOps").textContent = broadcastLogs.length;
    if ($("kpiCalls")) $("kpiCalls").textContent = calls.length;
  }

  function destroyCharts() {
    while (charts.length) {
      const chart = charts.pop();
      try { chart.destroy(); } catch (_) { /* ignore */ }
    }
  }

  function renderCallAnalysis(calls) {
    const days = lastNDays(30);
    const trend = days.map((day) => calls.filter((c) => dayKey(c.startedAt) === day).length);
    const resultMap = {};
    calls.forEach((c) => {
      const key = c.result || "其他";
      resultMap[key] = (resultMap[key] || 0) + 1;
    });
    let resultEntries = Object.entries(resultMap);
    if (!resultEntries.length) resultEntries = [["暂无数据", 1]];

    const totalSeconds = calls.reduce((sum, c) => sum + Number(c.durationSeconds || 0), 0);
    const avgSeconds = calls.length ? Math.round(totalSeconds / calls.length) : 0;

    if ($("callTotal")) $("callTotal").textContent = calls.length;
    if ($("callDurationTotal")) $("callDurationTotal").textContent = formatDuration(totalSeconds);
    if ($("callDurationAvg")) $("callDurationAvg").textContent = `${avgSeconds}秒`;

    if ($("callResultLegend")) {
      const colors = [PRIMARY, "#14C9BA", "#F7BA1E", "#F53F57", "#86909C"];
      $("callResultLegend").innerHTML = resultEntries.map(([label, count], index) =>
        `<span><i style="background:${colors[index % colors.length]}"></i>${escapeHtml(label)} ${count}</span>`
      ).join("");
    }

    if (!window.Chart) return;
    destroyCharts();

    try {
      const trendCanvas = $("callTrendChart");
      if (trendCanvas) {
        charts.push(new window.Chart(trendCanvas.getContext("2d"), {
          type: "line",
          data: {
            labels: days.map((d) => d.slice(5)),
            datasets: [{
              label: "通话次数",
              data: trend,
              borderColor: PRIMARY,
              backgroundColor: "rgba(19,90,250,.12)",
              fill: true,
              tension: 0.25,
              pointRadius: 2,
              pointHoverRadius: 4,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false }, ticks: { maxTicksLimit: 8, color: "#86909C" } },
              y: { beginAtZero: true, ticks: { precision: 0, color: "#86909C" }, grid: { color: "#EDF1F7" } },
            },
          },
        }));
      }

      const pieCanvas = $("callResultChart");
      if (pieCanvas) {
        const colors = [PRIMARY, "#14C9BA", "#F7BA1E", "#F53F57", "#86909C"];
        charts.push(new window.Chart(pieCanvas.getContext("2d"), {
          type: "doughnut",
          data: {
            labels: resultEntries.map(([label]) => label),
            datasets: [{
              data: resultEntries.map(([, count]) => count),
              backgroundColor: resultEntries.map((_, index) => colors[index % colors.length]),
              borderWidth: 0,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            cutout: "58%",
            plugins: { legend: { display: false } },
          },
        }));
      }
    } catch (error) {
      console.error("[communication-stats] chart render failed", error);
    }
  }

  function init() {
    const devices = listDevices();
    const calls = listCalls();
    renderKpis(devices, calls);
    renderBars("deviceTypeDist", countBy(devices, (d) => d.category || d.type));
    renderBars("taskStatusDist", countBy(broadcastTasks, (t) => t.status), "#14C9BA");
    renderBars("taskTypeDist", countBy(broadcastTasks, (t) => t.type), "#3D7FE0");
    renderBars("broadcastResultDist", countBy(broadcastLogs, (l) => l.result), "#F7BA1E");
    // Defer chart paint until layout is stable to avoid Chart.js height blow-up.
    requestAnimationFrame(() => renderCallAnalysis(calls));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
