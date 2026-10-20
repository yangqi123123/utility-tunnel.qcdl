(function (root) {
  const PROJECTS = [
    {
      name: "光谷科学岛综合开发项目",
      corridors: [
        {
          name: "高新大道综合管廊",
          prefix: "F01",
          chambers: [
            { name: "综合舱", zones: [0, 1] },
            { name: "电力舱", zones: [2, 3] },
            { name: "燃气舱", zones: [4, 5] },
            { name: "水信舱", zones: [6, 7, 8] },
          ],
        },
        {
          name: "科学岛大道综合管廊",
          prefix: "F02",
          chambers: [
            { name: "综合舱", zones: [9, 10] },
            { name: "电力舱", zones: [11, 12] },
            { name: "燃气舱", zones: [13] },
          ],
        },
      ],
    },
    {
      name: "科学岛东区管廊延伸工程",
      corridors: [
        {
          name: "科学岛东区综合管廊",
          prefix: "F03",
          chambers: [
            { name: "燃气舱", zones: [14, 15] },
            { name: "综合舱", zones: [16, 17, 18] },
            { name: "水信舱", zones: [19, 20] },
          ],
        },
      ],
    },
  ];
  const GIS_CORRIDOR = [[30.4721, 114.4186], [30.4702, 114.4212], [30.4680, 114.4240], [30.4656, 114.4268], [30.4630, 114.4296], [30.4604, 114.4324], [30.4578, 114.4352], [30.4552, 114.4380]];
  const GIS_CENTER = [30.4636, 114.4283];
  const ZONE_TOTAL = 21;

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function posAt(t) {
    const segment = (GIS_CORRIDOR.length - 1) * Math.max(0, Math.min(1, t));
    const index = Math.min(Math.floor(segment), GIS_CORRIDOR.length - 2);
    const fraction = segment - index;
    const start = GIS_CORRIDOR[index];
    const end = GIS_CORRIDOR[index + 1];
    return [start[0] + (end[0] - start[0]) * fraction, start[1] + (end[1] - start[1]) * fraction];
  }

  function buildZoneMeta() {
    const codeMap = {};
    const infoMap = {};
    let total = 0;
    PROJECTS.forEach((project) => {
      let projectTotal = 0;
      project.corridors.forEach((corridor) => {
        let seq = 0;
        corridor.chambers.forEach((chamber) => {
          chamber.items = chamber.zones.map((zone) => {
            seq += 1;
            total += 1;
            projectTotal += 1;
            const code = `${corridor.prefix}${String(seq).padStart(2, "0")}`;
            codeMap[zone] = code;
            infoMap[zone] = {
              zone, code, chamber: chamber.name, corridor: corridor.name, project: project.name,
              shortPath: `${chamber.name} · ${corridor.name}`,
            };
            return { zone, code };
          });
        });
        corridor.count = seq;
      });
      project.total = projectTotal;
    });
    return { codeMap, infoMap, total };
  }

  const ZONE_META = buildZoneMeta();

  function openModal({ title, body, footer, className }) {
    document.querySelectorAll(".em-point-mask").forEach((node) => node.remove());
    const mask = document.createElement("div");
    mask.className = `em-point-mask${className ? ` ${className}` : ""}`;
    mask.innerHTML = `<div class="em-point-modal" role="dialog" aria-modal="true"><div class="em-point-modal-head"><h2>${esc(title)}</h2><button type="button" class="em-point-modal-close" data-modal-close aria-label="关闭">×</button></div><div class="em-point-modal-body">${body}</div><div class="em-point-modal-foot">${footer || ""}</div></div>`;
    mask.addEventListener("click", (event) => {
      if (event.target === mask || event.target.closest("[data-modal-close]")) mask.remove();
    });
    document.body.appendChild(mask);
    return mask;
  }

  function countPeersOnMap(peers) {
    return peers.filter((peer) => Number.isFinite(Number(peer.longitude)) && Number.isFinite(Number(peer.latitude))).length;
  }

  function legendMarkup(legend) {
    return `<aside class="em-point-legend">
      <div class="em-point-legend-head"><h3 class="em-point-legend-title">类型图例</h3><span class="em-point-legend-total">${legend.reduce((sum, item) => sum + item.count, 0)}</span></div>
      <div class="em-point-legend-list">${legend.map((item) => `<label class="em-point-legend-item">
        <input class="em-point-legend-check" type="checkbox" checked data-point-layer="${esc(item.label)}">
        <span class="em-point-legend-mark" style="--legend-color:${esc(item.color)}"><i class="fa-solid ${esc(item.icon || "fa-location-dot")}" aria-hidden="true"></i></span>
        <span class="em-point-legend-name">${esc(item.label)}</span>
        <span class="em-point-legend-count">${item.count}</span>
      </label>`).join("")}</div>
    </aside>`;
  }

  function markerIcon({ color, icon, current }) {
    return L.divIcon({
      className: "em-gis-marker-wrap",
      html: `<span class="em-gis-marker${current ? " current" : ""}" style="--c:${esc(color)}"><i class="fa-solid ${esc(icon || "fa-location-dot")}"></i></span>`,
      iconSize: current ? [30, 30] : [24, 24],
      iconAnchor: current ? [15, 15] : [12, 12],
    });
  }

  function renderRegionTree(selectedZone) {
    const listParts = [];
    listParts.push(`<div class="gr-row gr-all" data-zone-all style="--lv:0"><span class="gr-sign gr-sign-all"><i class="fa-solid fa-layer-group" aria-hidden="true"></i></span><span class="gr-name">全部区段</span><span class="gr-c">${ZONE_META.total}</span></div>`);
    PROJECTS.forEach((project) => {
      listParts.push(`<div class="gr-node open"><div class="gr-row gr-lv1" style="--lv:1"><span class="gr-sign">−</span><span class="gr-name">${esc(project.name)}</span><span class="gr-c">${project.total}</span></div><div class="gr-children">`);
      project.corridors.forEach((corridor) => {
        listParts.push(`<div class="gr-node open"><div class="gr-row gr-lv2" style="--lv:2"><span class="gr-sign">−</span><span class="gr-name">${esc(corridor.name)}</span><span class="gr-c">${corridor.count}</span></div><div class="gr-children">`);
        corridor.chambers.forEach((chamber) => {
          listParts.push(`<div class="gr-node"><div class="gr-row gr-lv3" style="--lv:3"><span class="gr-sign">+</span><span class="gr-name">${esc(chamber.name)}</span><span class="gr-c">${chamber.items.length}</span></div><div class="gr-children">`);
          chamber.items.forEach((item) => {
            const active = String(selectedZone) === String(item.zone) ? " is-active" : "";
            listParts.push(`<div class="gr-row gr-leaf${active}" style="--lv:4" data-zone="${item.zone}" title="${esc(ZONE_META.infoMap[item.zone].shortPath)} · ${esc(item.code)}"><span class="gr-dot"></span><span class="gr-code">${esc(item.code)}</span></div>`);
          });
          listParts.push("</div></div>");
        });
        listParts.push("</div></div>");
      });
      listParts.push("</div></div>");
    });
    return `<aside class="em-point-tree">
      <div class="gr-hd">
        <span class="gr-hd-t"><i class="fa-solid fa-sitemap" aria-hidden="true"></i>区域筛选</span>
        <span class="gr-hd-r"><span class="gr-cnt">${ZONE_META.total} 个区段</span><button class="gr-reset" type="button" data-tree-reset>重置</button></span>
      </div>
      <div class="gr-list">${listParts.join("")}</div>
    </aside>`;
  }

  /**
   * @param {object} options
   * @param {number} [options.longitude]
   * @param {number} [options.latitude]
   * @param {string} [options.label]
   * @param {string} [options.note]
   * @param {string} [options.currentIcon]
   * @param {Array<{id:string,name:string,longitude:number,latitude:number,legend:string,color?:string,icon?:string}>} [options.peers]
   * @param {Array<{label:string,color:string,icon?:string,count?:number}>} [options.legend]
   * @param {(point:{longitude:number,latitude:number,zone?:number|null})=>void} options.onConfirm
   */
  function open(options = {}) {
    if (!root.L) {
      root.EMERGENCY_UI?.showToast?.("GIS 地图组件加载失败，请刷新页面后重试", "error");
      return;
    }

    const peers = Array.isArray(options.peers) ? options.peers : [];
    const legendSource = Array.isArray(options.legend) && options.legend.length
      ? options.legend
      : [...new Set(peers.map((item) => item.legend || "其他"))].map((label, index) => ({
        label,
        color: ["#135afa", "#00a870", "#ed7b2f", "#e34d59", "#8b5cf6"][index % 5],
        icon: "fa-location-dot",
      }));
    const legend = legendSource.map((item) => ({
      ...item,
      count: peers.filter((peer) => (peer.legend || "其他") === item.label
        && Number.isFinite(Number(peer.longitude))
        && Number.isFinite(Number(peer.latitude))).length,
    }));
    const metaOf = (label) => legend.find((item) => item.label === label) || { color: "#135afa", icon: "fa-location-dot" };

    let point = Number.isFinite(Number(options.longitude)) && Number.isFinite(Number(options.latitude))
      ? { longitude: Number(options.longitude), latitude: Number(options.latitude) }
      : null;
    let selectedZone = null;
    const note = options.note || "点击管廊地图选择点位";
    const currentLabel = options.label || "当前点位";
    const currentIcon = options.currentIcon || "fa-location-dot";

    const mask = openModal({
      title: "点位选择",
      className: "em-point-wide",
      body: `<div class="em-point-picker">${renderRegionTree(selectedZone)}
        <div class="em-point-map-column">
          <div class="em-point-map-head">
            <h3 class="em-point-map-title">管廊 GIS 一张图</h3>
            <div class="em-point-map-tools">
              <button class="btn btn-secondary" type="button" data-point-map-action="in" title="放大"><i class="fa-solid fa-plus"></i></button>
              <button class="btn btn-secondary" type="button" data-point-map-action="out" title="缩小"><i class="fa-solid fa-minus"></i></button>
              <button class="btn btn-secondary" type="button" data-point-map-action="reset" title="复位"><i class="fa-solid fa-crosshairs"></i></button>
            </div>
          </div>
          <div class="em-point-map" data-point-map><span class="em-point-map-note">${esc(note)}</span></div>
          <div class="em-point-coordinate-row">
            <label class="form-field"><span class="form-label">X坐标（经度）</span><input class="form-control" data-point-x readonly placeholder="选择点位后自动回显" value="${point ? point.longitude.toFixed(6) : ""}"></label>
            <label class="form-field"><span class="form-label">Y坐标（纬度）</span><input class="form-control" data-point-y readonly placeholder="选择点位后自动回显" value="${point ? point.latitude.toFixed(6) : ""}"></label>
          </div>
        </div>
        ${legendMarkup(legend)}
      </div>`,
      footer: '<button class="btn btn-secondary" type="button" data-modal-close>取消</button><button class="btn btn-primary" type="button" data-point-confirm>确定</button>',
    });

    const host = mask.querySelector("[data-point-map]");
    const map = L.map(host, { zoomControl: false, minZoom: 11, maxZoom: 18 }).setView(
      point ? [point.latitude, point.longitude] : GIS_CENTER,
      point ? 17 : 14,
    );
    let disposed = false;
    let highlightLayer = null;
    const cleanup = () => {
      if (disposed) return;
      disposed = true;
      try { map.remove(); } catch { /* ignore */ }
    };

    const tiles = L.tileLayer("https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}", {
      subdomains: ["1", "2", "3", "4"], maxZoom: 18, attribution: "© 高德地图",
    });
    let loadedTiles = 0;
    tiles.on("tileload", () => { loadedTiles += 1; });
    tiles.on("tileerror", () => { if (!loadedTiles) host.classList.add("is-offline"); });
    tiles.addTo(map);
    window.setTimeout(() => { if (!loadedTiles) host.classList.add("is-offline"); }, 4000);

    L.polyline(GIS_CORRIDOR, { color: "#135AFA", weight: 8, opacity: 0.18 }).addTo(map);
    for (let i = 0; i < ZONE_TOTAL; i += 1) {
      L.polyline([posAt(i / ZONE_TOTAL), posAt((i + 1) / ZONE_TOTAL)], {
        color: "#135AFA", weight: 6, opacity: 0.85,
      }).addTo(map).bindTooltip(`${ZONE_META.codeMap[i] || `F01${String(i + 1).padStart(2, "0")}`} · 正常`, { sticky: true, className: "em-point-tooltip" });
    }

    const layers = new Map(legend.map((item) => [item.label, L.layerGroup().addTo(map)]));
    peers.forEach((peer) => {
      if (!Number.isFinite(Number(peer.longitude)) || !Number.isFinite(Number(peer.latitude))) return;
      const label = peer.legend || "其他";
      const layer = layers.get(label);
      if (!layer) return;
      const meta = metaOf(label);
      const marker = L.marker([peer.latitude, peer.longitude], {
        icon: markerIcon({ color: peer.color || meta.color, icon: peer.icon || meta.icon }),
        riseOnHover: true,
        keyboard: false,
      });
      marker.bindTooltip(peer.name || peer.id, {
        direction: "top", offset: [0, -14], className: "em-point-tooltip", opacity: 1,
      });
      marker.addTo(layer);
    });

    mask.querySelectorAll("[data-point-layer]").forEach((control) => {
      control.addEventListener("change", () => {
        const layer = layers.get(control.dataset.pointLayer);
        if (!layer) return;
        if (control.checked) layer.addTo(map);
        else map.removeLayer(layer);
      });
    });

    let currentMarker = point
      ? L.marker([point.latitude, point.longitude], {
        icon: markerIcon({ color: "#135afa", icon: currentIcon, current: true }),
        zIndexOffset: 1000,
      }).bindTooltip(currentLabel, { direction: "top", offset: [0, -14], className: "em-point-tooltip", opacity: 1 }).addTo(map)
      : null;

    const updatePoint = (latlng) => {
      point = { longitude: Number(latlng.lng.toFixed(6)), latitude: Number(latlng.lat.toFixed(6)) };
      if (currentMarker) currentMarker.setLatLng(latlng);
      else {
        currentMarker = L.marker(latlng, {
          icon: markerIcon({ color: "#135afa", icon: currentIcon, current: true }),
          zIndexOffset: 1000,
        }).bindTooltip(currentLabel, { direction: "top", offset: [0, -14], className: "em-point-tooltip", opacity: 1 }).addTo(map);
      }
      mask.querySelector("[data-point-x]").value = point.longitude.toFixed(6);
      mask.querySelector("[data-point-y]").value = point.latitude.toFixed(6);
    };

    const clearHighlight = () => {
      if (highlightLayer) {
        map.removeLayer(highlightLayer);
        highlightLayer = null;
      }
    };

    const pickZone = (zone) => {
      selectedZone = zone;
      mask.querySelectorAll("[data-zone]").forEach((row) => {
        row.classList.toggle("is-active", String(row.dataset.zone) === String(zone));
      });
      clearHighlight();
      const a = posAt(zone / ZONE_TOTAL);
      const b = posAt((zone + 1) / ZONE_TOTAL);
      const mid = posAt((zone + 0.5) / ZONE_TOTAL);
      highlightLayer = L.layerGroup([
        L.polyline([a, b], { color: "#135AFA", weight: 18, opacity: 0.18 }),
        L.polyline([a, b], { color: "#135AFA", weight: 7, opacity: 1 }),
        L.circleMarker(mid, { radius: 7, color: "#fff", weight: 3, fillColor: "#135AFA", fillOpacity: 1 }),
      ]).addTo(map);
      map.setView(mid, 16);
      updatePoint({ lat: mid[0], lng: mid[1] });
    };

    const resetZone = () => {
      selectedZone = null;
      mask.querySelectorAll("[data-zone]").forEach((row) => row.classList.remove("is-active"));
      clearHighlight();
      map.setView(GIS_CENTER, 14);
    };

    map.on("click", (event) => updatePoint(event.latlng));

    mask.addEventListener("click", (event) => {
      const toggleRow = event.target.closest(".gr-node > .gr-row:not(.gr-leaf)");
      if (toggleRow) {
        const node = toggleRow.parentElement;
        node.classList.toggle("open");
        const sign = toggleRow.querySelector(".gr-sign");
        if (sign && !sign.classList.contains("gr-sign-all")) sign.textContent = node.classList.contains("open") ? "−" : "+";
        return;
      }
      if (event.target.closest("[data-zone-all]") || event.target.closest("[data-tree-reset]")) {
        resetZone();
        return;
      }
      const leaf = event.target.closest("[data-zone]");
      if (leaf) {
        pickZone(Number(leaf.dataset.zone));
        return;
      }
      const action = event.target.closest("[data-point-map-action]")?.dataset.pointMapAction;
      if (action === "in") map.zoomIn();
      if (action === "out") map.zoomOut();
      if (action === "reset") resetZone();
      if (event.target.closest("[data-point-confirm]")) {
        if (!point) {
          root.EMERGENCY_UI?.showToast?.("请先在 GIS 地图中选择点位", "error");
          return;
        }
        options.onConfirm?.({ ...point, zone: selectedZone });
        cleanup();
        mask.remove();
      }
    });

    const observer = new MutationObserver(() => {
      if (!document.body.contains(mask)) {
        cleanup();
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true });
    setTimeout(() => map.invalidateSize(), 50);
  }

  root.EMERGENCY_POINT_PICKER = {
    open,
    GIS_CENTER,
    GIS_CORRIDOR,
    ZONE_META,
    countPeersOnMap,
  };
})(typeof window !== "undefined" ? window : globalThis);
