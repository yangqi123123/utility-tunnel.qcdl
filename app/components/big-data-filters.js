(function () {
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function pad(n) { return String(n).padStart(2, "0"); }

  function monthBounds(base = new Date()) {
    const y = base.getFullYear();
    const m = base.getMonth();
    const start = `${y}-${pad(m + 1)}-01`;
    const endDate = new Date(y, m + 1, 0);
    const end = `${y}-${pad(m + 1)}-${pad(endDate.getDate())}`;
    return { start, end };
  }

  function defaultMonthBounds() {
    const now = new Date();
    if (now.getFullYear() === 2026 && now.getMonth() === 9) return monthBounds(now);
    return monthBounds(new Date(2026, 9, 1));
  }

  function normalizeSections(sections) {
    return (sections || []).map((s) => {
      if (typeof s === "string") {
        return { name: s, pipelines: ["科学岛电力管线", "科学岛通信光缆"] };
      }
      return {
        name: s.name,
        pipelines: Array.isArray(s.pipelines) ? s.pipelines.slice() : [],
      };
    });
  }

  function buildLocationTree() {
    const woTree = window.WORK_ORDER_DATA?.locationTree;
    if (woTree?.length) {
      return woTree.map((p) => ({
        name: p.name,
        corridors: (p.corridors || []).map((c) => ({
          name: c.name,
          rooms: (c.rooms || []).map((r) => ({
            name: r.name,
            sections: normalizeSections(r.sections),
          })),
        })),
      }));
    }

    const spatial = window.DEVICE_MONITOR_DATA?.spatialTree || [];
    return spatial.map((p) => ({
      name: p.name,
      corridors: (p.corridors || []).map((c) => ({
        name: c.name,
        rooms: (c.cabins || []).map((cab) => ({
          name: cab.name,
          sections: normalizeSections(cab.sections),
        })),
      })),
    }));
  }

  function fillSelect(sel, options, placeholder, selected) {
    if (!sel) return;
    sel.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>` +
      (options || []).map((v) => `<option value="${escapeHtml(v)}" ${v === selected ? "selected" : ""}>${escapeHtml(v)}</option>`).join("");
  }

  function setEnabled(sel, enabled, placeholder) {
    if (!sel) return;
    sel.disabled = !enabled;
    if (!enabled) sel.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>`;
  }

  function el(prefix, key) {
    return document.getElementById(`${prefix}${key}`);
  }

  function valueOf(prefix, key) {
    return el(prefix, key)?.value || "";
  }

  function setValue(prefix, key, v) {
    const node = el(prefix, key);
    if (node) node.value = v;
  }

  /**
   * @param {{ prefix: string }} options prefix e.g. "bd" | "bw" → ids bdProject / bwProject
   * @returns {{ tree: any[], values: Function, reset: Function, defaultMonthBounds: Function }}
   */
  function mount(options) {
    const prefix = options?.prefix || "bd";
    const tree = buildLocationTree();

    const projectSel = el(prefix, "Project");
    const corridorSel = el(prefix, "Corridor");
    const roomSel = el(prefix, "Room");
    const sectionSel = el(prefix, "Section");
    const pipelineSel = el(prefix, "Pipeline");

    function clearBelowProject() {
      setEnabled(corridorSel, false, "请先选择所属项目");
      setEnabled(roomSel, false, "请先选择所属管廊");
      setEnabled(sectionSel, false, "请先选择所属舱室");
      setEnabled(pipelineSel, false, "请先选择所属区段");
    }

    function clearBelowCorridor() {
      setEnabled(roomSel, false, "请先选择所属管廊");
      setEnabled(sectionSel, false, "请先选择所属舱室");
      setEnabled(pipelineSel, false, "请先选择所属区段");
    }

    function clearBelowRoom() {
      setEnabled(sectionSel, false, "请先选择所属舱室");
      setEnabled(pipelineSel, false, "请先选择所属区段");
    }

    function clearBelowSection() {
      setEnabled(pipelineSel, false, "请先选择所属区段");
    }

    fillSelect(projectSel, tree.map((p) => p.name), "全部项目", "");
    clearBelowProject();

    projectSel?.addEventListener("change", () => {
      const project = tree.find((p) => p.name === projectSel.value);
      if (!project) {
        clearBelowProject();
        return;
      }
      setEnabled(corridorSel, true, "全部管廊");
      fillSelect(corridorSel, project.corridors.map((c) => c.name), "全部管廊", "");
      clearBelowCorridor();
    });

    corridorSel?.addEventListener("change", () => {
      const project = tree.find((p) => p.name === projectSel.value);
      const corridor = project?.corridors.find((c) => c.name === corridorSel.value);
      if (!corridor) {
        clearBelowCorridor();
        return;
      }
      setEnabled(roomSel, true, "全部舱室");
      fillSelect(roomSel, corridor.rooms.map((r) => r.name), "全部舱室", "");
      clearBelowRoom();
    });

    roomSel?.addEventListener("change", () => {
      const project = tree.find((p) => p.name === projectSel.value);
      const corridor = project?.corridors.find((c) => c.name === corridorSel.value);
      const room = corridor?.rooms.find((r) => r.name === roomSel.value);
      if (!room) {
        clearBelowRoom();
        return;
      }
      setEnabled(sectionSel, true, "全部区段");
      fillSelect(sectionSel, room.sections.map((s) => s.name), "全部区段", "");
      clearBelowSection();
    });

    sectionSel?.addEventListener("change", () => {
      const project = tree.find((p) => p.name === projectSel.value);
      const corridor = project?.corridors.find((c) => c.name === corridorSel.value);
      const room = corridor?.rooms.find((r) => r.name === roomSel.value);
      const section = room?.sections.find((s) => s.name === sectionSel.value);
      if (!section) {
        clearBelowSection();
        return;
      }
      setEnabled(pipelineSel, true, "全部管线");
      fillSelect(pipelineSel, section.pipelines, "全部管线", "");
    });

    function reset() {
      const bounds = defaultMonthBounds();
      setValue(prefix, "Project", "");
      fillSelect(projectSel, tree.map((p) => p.name), "全部项目", "");
      clearBelowProject();
      setValue(prefix, "Start", bounds.start);
      setValue(prefix, "End", bounds.end);
    }

    function values() {
      return {
        project: valueOf(prefix, "Project"),
        corridor: valueOf(prefix, "Corridor"),
        room: valueOf(prefix, "Room"),
        section: valueOf(prefix, "Section"),
        pipeline: valueOf(prefix, "Pipeline"),
        start: valueOf(prefix, "Start"),
        end: valueOf(prefix, "End"),
      };
    }

    function matchLoc(item) {
      const v = values();
      if (v.project && item.project && item.project !== v.project) return false;
      if (v.corridor && item.corridor && item.corridor !== v.corridor) return false;
      const room = item.room || item.cabin;
      if (v.room && room && room !== v.room) return false;
      if (v.section && item.section && item.section !== v.section) return false;
      if (v.pipeline && item.pipeline && item.pipeline !== v.pipeline) return false;
      return true;
    }

    reset();

    return { tree, values, reset, matchLoc, defaultMonthBounds };
  }

  window.BIG_DATA_FILTERS = {
    mount,
    buildLocationTree,
    defaultMonthBounds,
    monthBounds,
  };
})();
