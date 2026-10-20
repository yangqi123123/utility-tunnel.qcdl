/* 应急调度台地图：底图复用共享组件 BASE_MAP（与「工作台 / 设备监测总览」同一套
 * 高德在线底图 + 本地保底底图），本文件只负责应急业务图层（事件/人员/车辆/物资/视频）。 */
(function () {
  const DEFAULT_CONFIG = {
    center: [31.84318, 117.20342],
    zoom: 15,
    minZoom: 11,
    maxZoom: 18,
    fallbackClass: "is-fallback",
  };

  const COLORS = { event: "#F53F57", personnel: "#135AFA", vehicle: "#135AFA", resource: "#14C9BA", camera: "#9359E3" };
  const GLYPHS = { event: "!", personnel: "人", vehicle: "车", resource: "物", camera: "视" };

  function noop() {}
  function hasCoords(item) {
    if (item == null) return false;
    if (item.latitude === "" || item.longitude === "" || item.latitude == null || item.longitude == null) return false;
    const lat = Number(item.latitude);
    const lng = Number(item.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    if (Math.abs(lat) < 0.000001 && Math.abs(lng) < 0.000001) return false;
    return true;
  }

  function stub() {
    return { map: null, fallback: true, setLayers: noop, focusEvent: noop, focusPoint: noop, startCircleSelect: noop, startPolygonSelect: noop, clearSelection: noop, zoomIn: noop, zoomOut: noop, resetView: noop, destroy: noop };
  }

  function icon(color, glyph) {
    return L.divIcon({
      className: "emergency-map-marker",
      html: `<span style="--marker-color:${color}">${glyph || ""}</span>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  }

  function markerFor(item, kind, onClick) {
    const marker = L.marker([Number(item.latitude), Number(item.longitude)], {
      icon: icon(COLORS[kind] || "#135AFA", GLYPHS[kind]),
    });
    const label = item.name || item.title || item.eventId || item.cameraId || "";
    if (window.BASE_MAP) window.BASE_MAP.bindTip(marker, label);
    if (typeof onClick === "function") marker.on("click", () => onClick(item));
    return marker;
  }

  function create(element, config = {}) {
    if (!element || !window.BASE_MAP) return stub();
    const options = { ...DEFAULT_CONFIG, ...config };
    /* 无 Leaflet / 瓦片不可用时 BASE_MAP 负责给容器加保底底图类名与提示条 */
    const base = window.BASE_MAP.create(element, {
      center: options.center,
      zoom: options.zoom,
      minZoom: options.minZoom,
      maxZoom: options.maxZoom,
      fallbackClass: options.fallbackClass,
    });
    const map = base.map;
    if (!map) return stub();
    const groups = {
      event: L.layerGroup().addTo(map),
      personnel: L.layerGroup().addTo(map),
      vehicle: L.layerGroup().addTo(map),
      resource: L.layerGroup().addTo(map),
      camera: L.layerGroup().addTo(map),
    };
    let selectedLayer = null;

    function setLayers(data = {}, handlers = {}) {
      const sourceKeys = { event: "events", personnel: "personnel", vehicle: "vehicles", resource: "resources", camera: "cameras" };
      Object.keys(groups).forEach((kind) => {
        groups[kind].clearLayers();
        (data[sourceKeys[kind]] || []).forEach((item) => {
          if (!hasCoords(item)) return;
          markerFor(item, kind, handlers[kind]).addTo(groups[kind]);
        });
      });
      setTimeout(() => { try { map.invalidateSize(); } catch (_) { /* noop */ } }, 0);
    }

    function focusPoint(point, zoom) {
      if (!hasCoords(point)) return;
      map.setView([Number(point.latitude), Number(point.longitude)], zoom || Math.max(map.getZoom(), 16));
    }
    function focusEvent(event) { focusPoint(event); }
    function startSelect(shape, onComplete) {
      clearSelection();
      element.classList.add("is-selecting");
      const finish = (latlng) => {
        element.classList.remove("is-selecting");
        const handler = shape === "circle" ? new L.Circle(latlng, 160, { color: "#135AFA", fillOpacity: 0.08 }).addTo(map) : new L.Polygon([[latlng.lat + 0.001, latlng.lng - 0.001], [latlng.lat + 0.001, latlng.lng + 0.001], [latlng.lat - 0.001, latlng.lng + 0.001], [latlng.lat - 0.001, latlng.lng - 0.001]], { color: "#135AFA", fillOpacity: 0.08 }).addTo(map);
        selectedLayer = handler;
        onComplete?.({ type: shape, bounds: handler.getBounds(), center: handler.getBounds().getCenter() });
        return handler;
      };
      const onClick = (event) => { map.off("click", onClick); finish(event.latlng); };
      map.on("click", onClick);
      return { cancel: () => { map.off("click", onClick); element.classList.remove("is-selecting"); } };
    }
    function clearSelection() { if (selectedLayer) { map.removeLayer(selectedLayer); selectedLayer = null; } }
    function zoomIn() { map.zoomIn(); }
    function zoomOut() { map.zoomOut(); }
    function resetView() { map.setView(options.center, options.zoom); }
    function destroy() { base.destroy(); }

    return {
      map,
      base,
      fallback: false,
      setLayers,
      focusEvent,
      focusPoint,
      startCircleSelect: (cb) => startSelect("circle", cb),
      startPolygonSelect: (cb) => startSelect("polygon", cb),
      clearSelection,
      zoomIn,
      zoomOut,
      resetView,
      destroy,
    };
  }

  window.EMERGENCY_MAP = { create };
})();
