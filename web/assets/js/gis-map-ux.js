(function () {
  "use strict";
  var CORRIDOR = [[30.4721, 114.4186], [30.4702, 114.4212], [30.4680, 114.4240], [30.4656, 114.4268], [30.4630, 114.4296], [30.4604, 114.4324], [30.4578, 114.4352], [30.4552, 114.4380]];
  var ZONE_COLOR = { a: "#F53F57", w: "#F7BA1E", o: "#C9CDD4", g: "#14C9BA", "": "#135AFA" };
  var ZONE_TEXT = { a: "报警", w: "预警", o: "离线", g: "已巡", "": "正常" };
  var STATUS_TEXT = { alarm: "报警", fault: "报警", warn: "预警", offline: "离线", ok: "正常", normal: "在线", online: "在线" };
  var PROJECTS = [
    { name: "光谷科学岛综合开发项目", corridors: [
      { name: "高新大道综合管廊", prefix: "F01", chambers: [
        { name: "综合舱", zones: [0, 1] }, { name: "电力舱", zones: [2, 3] }, { name: "燃气舱", zones: [4, 5] }, { name: "水信舱", zones: [6, 7, 8] }
      ]},
      { name: "科学岛大道综合管廊", prefix: "F02", chambers: [
        { name: "综合舱", zones: [9, 10] }, { name: "电力舱", zones: [11, 12] }, { name: "燃气舱", zones: [13] }
      ]}
    ]},
    { name: "科学岛东区管廊延伸工程", corridors: [
      { name: "科学岛东区综合管廊", prefix: "F03", chambers: [
        { name: "燃气舱", zones: [14, 15] }, { name: "综合舱", zones: [16, 17, 18] }, { name: "水信舱", zones: [19, 20] }
      ]}
    ]}
  ];

  if (!window.GIS_REGION) {
    var codeMap = {}, infoMap = {};
    PROJECTS.forEach(function (pj) {
      pj.corridors.forEach(function (cr) {
        var seq = 0;
        cr.chambers.forEach(function (ch) {
          ch.zones.forEach(function (z) {
            seq += 1;
            var code = cr.prefix + String(seq).padStart(2, "0");
            codeMap[z] = code;
            infoMap[z] = { zone: z, code: code, chamber: ch.name, corridor: cr.name, project: pj.name, shortPath: ch.name + " · " + cr.name };
          });
        });
      });
    });
    window.GIS_REGION = {
      codeOf: function (i) { return codeMap[i] || ""; },
      infoOf: function (i) { return infoMap[i] || null; },
      stateText: function (s) { return ZONE_TEXT[s] || "正常"; }
    };
  }

  function esc(v) {
    return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function posAt(t) {
    var seg = (CORRIDOR.length - 1) * Math.max(0, Math.min(1, t));
    var i = Math.min(Math.floor(seg), CORRIDOR.length - 2);
    var f = seg - i, a = CORRIDOR[i], b = CORRIDOR[i + 1];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  }
  function stakeOf(t) {
    var m = Math.round(Math.max(0, Math.min(1, t)) * 2100);
    return "K" + Math.floor(m / 1000) + "+" + String(m % 1000).padStart(3, "0");
  }
  function zoneInfo(i) {
    var info = window.GIS_REGION && window.GIS_REGION.infoOf ? window.GIS_REGION.infoOf(i) : null;
    var code = (window.GIS_REGION && window.GIS_REGION.codeOf ? window.GIS_REGION.codeOf(i) : "") || ("F01" + String(i + 1).padStart(2, "0"));
    var startT = i / 21, endT = (i + 1) / 21, len = Math.round(2100 / 21);
    return {
      fireCode: code,
      fireName: (info ? info.chamber : "防火分区") + " " + code,
      fireLength: len + " m",
      fireStart: stakeOf(startT),
      fireEnd: stakeOf(endT),
      sectionCode: code,
      sectionName: (info ? info.chamber + "区段 " : "区段 ") + code,
      project: info && info.project || "光谷科学岛综合开发项目",
      corridor: info && info.corridor || "高新大道综合管廊",
      chamber: info && info.chamber || "综合舱",
      start: stakeOf(startT),
      end: stakeOf(endT),
      length: len + " m",
      status: ZONE_TEXT[""]
    };
  }
  function worstStatus(items) {
    if (items.some(function (it) { return it.status === "alarm" || it.status === "fault"; })) return "alarm";
    if (items.some(function (it) { return it.status === "warn"; })) return "warn";
    if (items.some(function (it) { return it.status === "offline"; })) return "offline";
    return "";
  }
  function markerStatus(d) {
    if (d.isAlarm || d.status === "alarm" || d.status === "fault") return "alarm";
    if (d.status === "warn") return "warn";
    if (d.status === "offline") return "offline";
    return "ok";
  }
  function clusterKey(map, latlng) {
    var p = map.latLngToLayerPoint(L.latLng(latlng[0], latlng[1]));
    var zoom = map.getZoom();
    var size = zoom >= 16 ? 28 : zoom >= 15 ? 48 : zoom >= 14 ? 72 : 96;
    return Math.floor(p.x / size) + "_" + Math.floor(p.y / size);
  }
  function coordKey(latlng) { return Number(latlng[0]).toFixed(6) + "," + Number(latlng[1]).toFixed(6); }

  function ensureUi() {
    if (!document.getElementById("gisMask")) {
      var mask = document.createElement("div");
      mask.className = "gis-mask";
      mask.id = "gisMask";
      document.body.appendChild(mask);
    }
    if (!document.getElementById("gisDrawer")) {
      var drawer = document.createElement("aside");
      drawer.className = "gis-drawer";
      drawer.id = "gisDrawer";
      drawer.innerHTML = '<div class="gis-drawer-head"><span id="gisDrawerIcon" style="width:34px;height:34px;border-radius:4px;background:#135AFA;color:#fff;display:grid;place-items:center"></span><div><h3 id="gisDrawerTitle">点位详情</h3><span style="font-size:12px;color:#86909C" id="gisDrawerSub" hidden></span></div><button class="x" type="button" id="gisDrawerClose">✕</button></div><div class="gis-drawer-body"><div class="gis-info-grid" id="gisDrawerGrid"></div><div style="margin-top:16px;font-size:12px;color:#86909C" id="gisDrawerNote"></div></div><div class="gis-drawer-foot"><button class="gis-btn" type="button" id="gisDrawerOk">关闭</button></div>';
      document.body.appendChild(drawer);
    }
    if (!document.getElementById("gisStackModal")) {
      var modal = document.createElement("div");
      modal.className = "gis-stack-modal";
      modal.id = "gisStackModal";
      modal.hidden = true;
      modal.innerHTML = '<div class="gis-stack-panel" role="dialog" aria-modal="true" aria-labelledby="gisStackTitle"><div class="gis-stack-head"><h2 id="gisStackTitle">设备信息</h2><button type="button" class="gis-stack-close" data-gis-stack-close aria-label="关闭">×</button></div><div class="gis-stack-filters"><label>设备名称<input id="gisStackNameFilter" type="search" placeholder="请输入设备名称" autocomplete="off"></label><label>设备编码<input id="gisStackCodeFilter" type="search" placeholder="请输入设备编码" autocomplete="off"></label></div><div class="gis-stack-cats" id="gisStackCats" role="tablist"></div><div class="gis-stack-body"><aside class="gis-stack-names" id="gisStackNames"></aside><section class="gis-stack-detail"><div class="gis-stack-status"><span class="gis-stack-badge" id="gisStackBadge">在线</span></div><dl class="gis-stack-fields" id="gisStackFields"></dl><div class="gis-stack-actions"><button type="button" class="gis-btn primary" id="gisStackDetailBtn">查看详情</button></div></section></div></div>';
      document.body.appendChild(modal);
    }
  }

  function closeDrawer() {
    var mask = document.getElementById("gisMask"), drawer = document.getElementById("gisDrawer");
    if (mask) mask.classList.remove("open");
    if (drawer) drawer.classList.remove("open");
  }

  function openZoneDrawer(i, status) {
    ensureUi();
    var z = zoneInfo(i);
    z.status = ZONE_TEXT[status || ""] || "正常";
    var rows = [["防火分区编号", z.fireCode], ["防火分区名称", z.fireName], ["防火分区长度", z.fireLength], ["防火分区起点桩号", z.fireStart], ["防火分区止点桩号", z.fireEnd], ["区段编码", z.sectionCode], ["区段名称", z.sectionName], ["所属项目", z.project], ["所属管廊", z.corridor], ["所属舱室", z.chamber], ["起始桩号", z.start], ["结束桩号", z.end], ["区段长度", z.length], ["区段状态", z.status]];
    var title = document.getElementById("gisDrawerTitle");
    if (title) title.textContent = z.sectionName;
    var sub = document.getElementById("gisDrawerSub");
    if (sub) { sub.hidden = true; sub.textContent = ""; }
    var icon = document.getElementById("gisDrawerIcon");
    if (icon) { icon.style.background = "#135AFA"; icon.innerHTML = '<i class="fa-solid fa-map-location-dot"></i>'; }
    var grid = document.getElementById("gisDrawerGrid");
    if (grid) grid.innerHTML = rows.map(function (r) { return '<div class="gis-info"><span class="l">' + r[0] + '</span><span class="v">' + esc(r[1]) + "</span></div>"; }).join("");
    var note = document.getElementById("gisDrawerNote");
    if (note) note.textContent = "";
    var mask = document.getElementById("gisMask"), drawer = document.getElementById("gisDrawer");
    if (mask) mask.classList.add("open");
    if (drawer) drawer.classList.add("open");
  }

  var stackState = { items: [], cat: "all", index: 0, nameQ: "", codeQ: "", onOpenDetail: null };
  function stackItems() {
    var nameQ = String(stackState.nameQ || "").trim().toLowerCase();
    var codeQ = String(stackState.codeQ || "").trim().toLowerCase();
    return stackState.items.filter(function (it) {
      if (stackState.cat !== "all" && it.layer.key !== stackState.cat) return false;
      if (nameQ && String(it.name || "").toLowerCase().indexOf(nameQ) < 0) return false;
      if (codeQ && String(it.code || "").toLowerCase().indexOf(codeQ) < 0) return false;
      return true;
    });
  }
  function renderStack() {
    ensureUi();
    var cats = document.getElementById("gisStackCats"), names = document.getElementById("gisStackNames");
    var fields = document.getElementById("gisStackFields"), badge = document.getElementById("gisStackBadge");
    if (!cats || !names || !fields) return;
    var groups = {}, order = ["all"];
    stackState.items.forEach(function (it) {
      if (!groups[it.layer.key]) { groups[it.layer.key] = it.layer; order.push(it.layer.key); }
    });
    cats.innerHTML = '<button type="button" class="' + (stackState.cat === "all" ? "is-active" : "") + '" data-gis-stack-cat="all">全部</button>' +
      order.slice(1).map(function (k) { return '<button type="button" class="' + (stackState.cat === k ? "is-active" : "") + '" data-gis-stack-cat="' + k + '">' + esc(groups[k].label) + "</button>"; }).join("");
    var list = stackItems();
    if (stackState.index >= list.length) stackState.index = 0;
    if (!list.length) {
      names.innerHTML = '<p class="gis-stack-empty">暂无匹配设备</p>';
      if (badge) badge.textContent = "";
      fields.innerHTML = "";
      return;
    }
    names.innerHTML = list.map(function (it, i) {
      return '<button type="button" class="' + (i === stackState.index ? "is-active" : "") + '" data-gis-stack-name="' + i + '">' + esc(it.name) + "</button>";
    }).join("");
    var cur = list[stackState.index];
    if (!cur) return;
    if (badge) {
      badge.textContent = cur.statusText;
      badge.className = "gis-stack-badge is-" + cur.status;
    }
    fields.innerHTML = [["设备名称", cur.name], ["设备编码", cur.code], ["所属系统", cur.system], ["空间位置", cur.location], ["安装位置", cur.install]].map(function (r) {
      return "<div><dt>" + r[0] + "</dt><dd>" + esc(r[1]) + "</dd></div>";
    }).join("");
  }
  function openStack(items, onOpenDetail) {
    ensureUi();
    stackState.items = items;
    stackState.cat = "all";
    stackState.index = 0;
    stackState.nameQ = "";
    stackState.codeQ = "";
    stackState.onOpenDetail = onOpenDetail || null;
    var nameFilter = document.getElementById("gisStackNameFilter"); if (nameFilter) nameFilter.value = "";
    var codeFilter = document.getElementById("gisStackCodeFilter"); if (codeFilter) codeFilter.value = "";
    renderStack();
    var modal = document.getElementById("gisStackModal");
    if (modal) modal.hidden = false;
  }
  function closeStack() {
    var modal = document.getElementById("gisStackModal");
    if (modal) modal.hidden = true;
  }

  if (!window._gisMapUxBound) {
    window._gisMapUxBound = true;
    document.addEventListener("click", function (e) {
      if (e.target && (e.target.id === "gisMask" || e.target.id === "gisDrawerClose" || e.target.id === "gisDrawerOk")) closeDrawer();
      var modal = document.getElementById("gisStackModal");
      if (!modal || modal.hidden) return;
      if (e.target === modal || e.target.closest("[data-gis-stack-close]")) { closeStack(); return; }
      var cat = e.target.closest("[data-gis-stack-cat]");
      if (cat) { stackState.cat = cat.getAttribute("data-gis-stack-cat"); stackState.index = 0; renderStack(); return; }
      var name = e.target.closest("[data-gis-stack-name]");
      if (name) { stackState.index = Number(name.getAttribute("data-gis-stack-name")) || 0; renderStack(); return; }
      if (e.target.closest("#gisStackDetailBtn")) {
        var it = stackItems()[stackState.index];
        if (!it) return;
        closeStack();
        if (typeof stackState.onOpenDetail === "function") stackState.onOpenDetail(it.device || it.point || it);
        else if (typeof window.openDeviceDetail === "function") window.openDeviceDetail(it.point || it.device || it);
      }
    });
    document.addEventListener("input", function (e) {
      var t = e.target; if (!t) return;
      if (t.id === "gisStackNameFilter") { stackState.nameQ = t.value; stackState.index = 0; renderStack(); }
      if (t.id === "gisStackCodeFilter") { stackState.codeQ = t.value; stackState.index = 0; renderStack(); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      closeStack();
      closeDrawer();
    });
  }

  function enrichDevice(d) {
    var status = markerStatus(d);
    var typeKey = String(d.type || d.system || "device");
    return {
      device: d,
      point: d,
      name: d.name || typeKey,
      code: d.code || d.id || "",
      system: d.system || d.type || "设备",
      location: d.location || [d.corridor, d.room, d.section].filter(Boolean).join(" / ") || "—",
      install: d.install || d.section || d.location || "—",
      status: status,
      statusText: d.statusLabel || STATUS_TEXT[status] || "在线",
      layer: { key: typeKey, label: d.type || d.system || "设备", color: d.color || "#135AFA", icon: d.icon || "fa-location-dot" },
      pos: [d.lat, d.lng]
    };
  }

  var existing = window.GIS_MAP_UX || {};
  window.GIS_MAP_UX = Object.assign({}, existing, {
    openZoneDrawer: existing.openZoneDrawer || openZoneDrawer,
    attachZoneClicks: existing.attachZoneClicks || function (map, lines, zones) {
      (lines || []).forEach(function (line, i) {
        line.on("click", function (ev) {
          if (ev && ev.originalEvent) L.DomEvent.stopPropagation(ev.originalEvent);
          openZoneDrawer(i, zones && zones[i]);
        });
      });
    },
    attachCorridor: function (map, zones) {
      if (!map || !window.L || map._gisCorridor) return;
      map._gisCorridor = true;
      ensureUi();
      zones = zones || {};
      if (!map.getPane("gis-zones")) {
        map.createPane("gis-zones");
        map.getPane("gis-zones").style.zIndex = 350;
      }
      L.polyline(CORRIDOR, { color: "#135AFA", weight: 8, opacity: 0.18, pane: "gis-zones", interactive: false }).addTo(map);
      var lines = [];
      for (var i = 0; i < 21; i += 1) {
        var st = zones[i] || "";
        var code = (window.GIS_REGION && window.GIS_REGION.codeOf ? window.GIS_REGION.codeOf(i) : "") || ("F01" + String(i + 1).padStart(2, "0"));
        var line = L.polyline([posAt(i / 21), posAt((i + 1) / 21)], {
          color: ZONE_COLOR[st] || "#135AFA", weight: 10, opacity: 0.85, interactive: true, pane: "gis-zones"
        }).addTo(map).bindTooltip(code + " · " + (ZONE_TEXT[st] || "正常"), { sticky: true, className: "gis-tip", opacity: 1 });
        lines.push(line);
      }
      window.GIS_MAP_UX.attachZoneClicks(map, lines, zones);
    },
    renderDeviceMarkers: function (ctx) {
      var map = ctx.map, layer = ctx.layer, devices = ctx.devices || [];
      var onOpenDetail = ctx.onOpenDetail;
      if (!map || !layer || !window.L) return;
      ensureUi();
      layer.clearLayers();
      var zoom = map.getZoom(), clustered = zoom < 16, buckets = {};
      devices.forEach(function (d) {
        if (d.lat == null || d.lng == null) return;
        var item = enrichDevice(d);
        var key = clustered ? clusterKey(map, item.pos) : coordKey(item.pos);
        if (!buckets[key]) buckets[key] = { items: [], pos: item.pos };
        buckets[key].items.push(item);
      });
      Object.keys(buckets).forEach(function (key) {
        var bucket = buckets[key], items = bucket.items, first = items[0], count = items.length;
        var worst = worstStatus(items);
        var html, size, anchor;
        if (clustered && count > 1) {
          html = '<span class="gis-cluster ' + worst + '">' + count + "</span>";
          size = [36, 36]; anchor = [18, 18];
        } else if (!clustered && count > 1) {
          html = '<span class="gis-marker stack ' + worst + '" style="--c:' + esc(first.layer.color) + '"><i class="fa-solid ' + esc(first.layer.icon) + '"></i><b>' + count + "</b></span>";
          size = [28, 28]; anchor = [14, 14];
        } else {
          var cls = "dm-marker";
          if (first.status === "alarm") cls += " is-fault is-alarm";
          else if (first.status === "warn") cls += " is-warn";
          else if (first.status === "offline") cls += " is-offline";
          html = '<span class="' + cls + '" style="--dm-c:' + esc(first.layer.color) + '"><i class="fa-solid ' + esc(first.layer.icon) + '"></i></span>';
          size = [24, 24]; anchor = [12, 12];
        }
        var mk = L.marker(bucket.pos, { icon: L.divIcon({ className: "dm-marker-wrap gis-marker-wrap", html: html, iconSize: size, iconAnchor: anchor }), riseOnHover: true, keyboard: false });
        if (window.BASE_MAP) window.BASE_MAP.bindTip(mk, count > 1 ? (first.layer.label + " · " + count + " 台设备") : first.name);
        mk.on("click", function (ev) {
          if (ev && ev.originalEvent) L.DomEvent.stopPropagation(ev.originalEvent);
          if (clustered && count > 1) { map.setView(bucket.pos, Math.min(18, zoom + 2)); return; }
          if (count > 1) { openStack(items, onOpenDetail); return; }
          if (typeof onOpenDetail === "function") onOpenDetail(first.device);
        });
        mk.addTo(layer);
      });
    }
  });
})();
