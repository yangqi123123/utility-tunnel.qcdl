(function (global) {
  "use strict";

  var IAS = global.INTRUSION_ALARM_DATA || {};
  var ACS = global.ACCESS_CONTROL_DATA || {};
  var DEFAULT_CENTER = { lat: 30.468, lng: 114.418 };
  var STEP = 0.0004;

  var SYSTEMS = ["视频监控", "入侵报警", "门禁", "电子巡更"];

  var SYSTEM_META = {
    "视频监控": { icon: "fa-video", color: "#135AFA" },
    "入侵报警": { icon: "fa-shield-halved", color: "#9359E3" },
    "门禁": { icon: "fa-door-closed", color: "#14C9BA" },
    "电子巡更": { icon: "fa-clipboard-check", color: "#F7BA1E" },
  };

  function sameSection(a, b) {
    return a.corridor === b.corridor && a.room === b.room && a.section === b.section;
  }

  function findAnchor(corridor, room, section, intrusionPoints) {
    var exact = intrusionPoints.filter(function (p) {
      return p.corridor === corridor && p.room === room && p.section === section;
    })[0];
    if (exact) return { lat: exact.lat, lng: exact.lng, project: exact.project || "" };
    var sameCorridor = intrusionPoints.filter(function (p) {
      return p.corridor === corridor;
    })[0];
    if (sameCorridor) return { lat: sameCorridor.lat, lng: sameCorridor.lng, project: sameCorridor.project || "" };
    return { lat: DEFAULT_CENTER.lat, lng: DEFAULT_CENTER.lng, project: "" };
  }

  function mapIntrusionStatus(raw) {
    if (raw === "alarm") return { status: "alarm", statusLabel: "报警" };
    if (raw === "armed") return { status: "online", statusLabel: "布防" };
    if (raw === "online") return { status: "online", statusLabel: "在线" };
    if (raw === "disarmed") return { status: "warn", statusLabel: "撤防" };
    if (raw === "warn") return { status: "warn", statusLabel: "预警" };
    if (raw === "fault") return { status: "offline", statusLabel: "故障" };
    if (raw === "offline") return { status: "offline", statusLabel: "离线" };
    return { status: "offline", statusLabel: "离线" };
  }

  function doorLabelOf(item) {
    var metrics = item.metrics || [];
    for (var i = 0; i < metrics.length; i += 1) {
      if (metrics[i].name === "门状态") return String(metrics[i].value || "未知");
    }
    return "未知";
  }

  function mapAccessStatus(item) {
    if (item.online === false) return { status: "offline", statusLabel: "离线" };
    var door = doorLabelOf(item);
    if (door === "开启" || item.status === "warn") return { status: "warn", statusLabel: "预警" };
    if (door === "关闭") return { status: "online", statusLabel: "在线" };
    return { status: "offline", statusLabel: "离线" };
  }

  function sortByName(a, b) {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  }

  function buildIntrusionPoints() {
    return (IAS.monitorDevices || []).map(function (item) {
      var mapped = mapIntrusionStatus(item.status);
      var alarm = null;
      if (item.alarm) {
        alarm = {
          event: item.alarm.event || "",
          type: item.alarm.type || "",
          level: item.alarm.level || "",
          time: item.alarm.time || "",
          message: item.alarm.message || "",
          zone: item.zoneName || item.alarm.zone || "",
          path: [item.project, item.corridor, item.room, item.section].filter(Boolean).join(" / "),
        };
      }
      return {
        id: item.id,
        system: "入侵报警",
        name: item.name,
        code: item.code,
        status: mapped.status,
        statusLabel: item.statusLabel || mapped.statusLabel,
        project: item.project || "",
        corridor: item.corridor || "",
        room: item.room || "",
        section: item.section || "",
        lat: item.lat,
        lng: item.lng,
        alarm: alarm,
        icon: SYSTEM_META["入侵报警"].icon,
        color: SYSTEM_META["入侵报警"].color,
      };
    });
  }

  function buildVideoPoints(intrusionPoints) {
    var cams = (IAS.cameras || []).slice().sort(sortByName);
    var groups = {};
    cams.forEach(function (cam) {
      var key = [cam.corridor, cam.cabin, cam.section].join("|");
      if (!groups[key]) groups[key] = [];
      groups[key].push(cam);
    });
    var out = [];
    Object.keys(groups).forEach(function (key) {
      var list = groups[key];
      var first = list[0];
      var anchor = findAnchor(first.corridor, first.cabin, first.section, intrusionPoints);
      list.forEach(function (cam, n) {
        var status = cam.status === "在线" ? "online" : cam.status === "离线" ? "offline" : "offline";
        out.push({
          id: "CAM-" + cam.name,
          system: "视频监控",
          name: cam.name,
          code: "CAM-" + String(n + 1).padStart(2, "0") + "-" + (cam.section || "X"),
          status: status,
          statusLabel: status === "online" ? "在线" : "离线",
          project: anchor.project || "",
          corridor: cam.corridor || "",
          room: cam.cabin || "",
          section: cam.section || "",
          lat: anchor.lat + STEP * (n + 1),
          lng: anchor.lng + STEP * (n + 1),
          icon: SYSTEM_META["视频监控"].icon,
          color: SYSTEM_META["视频监控"].color,
        });
      });
    });
    return out;
  }

  function isAccessDoor(item) {
    if (!item) return false;
    if (item.video === true) return false;
    if (String(item.system || "").indexOf("视频") !== -1) return false;
    if (String(item.type || "").indexOf("摄像") !== -1) return false;
    return true;
  }

  function buildAccessPoints(intrusionPoints) {
    var doors = (ACS.monitorDevices || []).filter(isAccessDoor).slice().sort(sortByName);
    var groups = {};
    doors.forEach(function (door) {
      var key = [door.corridor, door.room, door.section].join("|");
      if (!groups[key]) groups[key] = [];
      groups[key].push(door);
    });
    var out = [];
    Object.keys(groups).forEach(function (key) {
      var list = groups[key];
      var first = list[0];
      var anchor = findAnchor(first.corridor, first.room, first.section, intrusionPoints);
      list.forEach(function (door, n) {
        var mapped = mapAccessStatus(door);
        out.push({
          id: door.id,
          system: "门禁",
          name: door.name,
          code: door.code,
          status: mapped.status,
          statusLabel: mapped.statusLabel,
          doorLabel: doorLabelOf(door),
          project: door.project || "",
          corridor: door.corridor || "",
          room: door.room || "",
          section: door.section || "",
          lat: anchor.lat + STEP * (n + 1),
          lng: anchor.lng - STEP * (n + 1),
          icon: SYSTEM_META["门禁"].icon,
          color: SYSTEM_META["门禁"].color,
        });
      });
    });
    return out;
  }

  var PATROL_POINTS = [
    {
      id: "EP-A01", name: "A-01 人员出入口", code: "EP-A01",
      project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", room: "综合舱", section: "出入口",
      status: "online", statusLabel: "正常", result: "正常", person: "李明",
      lat: 30.4690, lng: 114.4168,
    },
    {
      id: "EP-A03", name: "A-03 通风机房", code: "EP-A03",
      project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", room: "综合舱", section: "防火分区",
      status: "online", statusLabel: "正常", result: "正常", person: "王强",
      lat: 30.4674, lng: 114.4192,
    },
    {
      id: "EP-B02", name: "B-02 进风井", code: "EP-B02",
      project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", room: "电力舱", section: "通风口",
      status: "online", statusLabel: "正常", result: "正常", person: "周敏",
      lat: 30.4664, lng: 114.4204,
    },
    {
      id: "EP-C05", name: "C-05 综合舱室", code: "EP-C05",
      project: "科学岛地下管廊工程", corridor: "科学岛大道综合管廊", room: "综合舱", section: "出入口",
      status: "online", statusLabel: "正常", result: "正常", person: "赵倩",
      lat: 30.4712, lng: 114.4088,
    },
    {
      id: "EP-B12", name: "B-12 消防泵房", code: "EP-B12",
      project: "光谷科学岛综合开发项目", corridor: "高新大道综合管廊", room: "电力舱", section: "防火分区",
      status: "warn", statusLabel: "异常", result: "异常", person: "周敏",
      exception: "消防泵房门禁未闭合",
      lat: 30.4662, lng: 114.4184,
    },
  ].map(function (p) {
    return {
      id: p.id,
      system: "电子巡更",
      name: p.name,
      code: p.code,
      status: p.status,
      statusLabel: p.statusLabel,
      project: p.project,
      corridor: p.corridor,
      room: p.room,
      section: p.section,
      lat: p.lat,
      lng: p.lng,
      person: p.person,
      result: p.result,
      exception: p.exception || "",
      icon: SYSTEM_META["电子巡更"].icon,
      color: SYSTEM_META["电子巡更"].color,
    };
  });

  var intrusionPoints = buildIntrusionPoints();
  var points = intrusionPoints
    .concat(buildVideoPoints(intrusionPoints))
    .concat(buildAccessPoints(intrusionPoints))
    .concat(PATROL_POINTS);

  function linkageFor(pointId) {
    var point = points.filter(function (p) { return p.id === pointId; })[0];
    if (!point || point.system !== "入侵报警" || point.status !== "alarm") return null;
    var cameras = points.filter(function (p) {
      return p.system === "视频监控" && sameSection(p, point);
    }).sort(sortByName).slice(0, 4);
    var doors = points.filter(function (p) {
      return p.system === "门禁" && sameSection(p, point);
    }).sort(sortByName);
    return {
      alarm: point.alarm || {
        event: "",
        level: "",
        time: "",
        zone: "",
        path: [point.project, point.corridor, point.room, point.section].filter(Boolean).join(" / "),
        message: "",
      },
      cameras: cameras,
      doors: doors,
    };
  }

  var PATROL_TASKS = [
    {
      id: "SEC-PATROL-01",
      code: "IT202610140900102001",
      name: "综合舱出入口安防补充巡更-202610140900",
      planName: "综合舱出入口日巡",
      level: "中",
      inspector: "李明",
      owner: "张强",
      result: "正常",
      overdue: "未逾期",
      deviceCount: 2,
      itemCount: 6,
      abnormalCount: 0,
      plannedAt: "2026-10-14 09:00:00",
      deadline: "2026-10-14 18:00:00",
      startedAt: "2026-10-14 09:05:00",
      submittedAt: "2026-10-14 10:15:00",
      duration: "01:10:00",
      corridor: "高新大道综合管廊",
      room: "综合舱",
      section: "出入口",
    },
    {
      id: "SEC-PATROL-02",
      code: "IT202610140900102002",
      name: "电力舱防火分区夜间巡更-202610140900",
      planName: "电力舱夜间巡更",
      level: "高",
      inspector: "周敏",
      owner: "张强",
      result: "-",
      overdue: "已逾期",
      deviceCount: 1,
      itemCount: 3,
      abnormalCount: 1,
      plannedAt: "2026-10-14 20:00:00",
      deadline: "2026-10-15 06:00:00",
      startedAt: "-",
      submittedAt: "-",
      duration: "-",
      corridor: "高新大道综合管廊",
      room: "电力舱",
      section: "防火分区",
    },
    {
      id: "SEC-PATROL-03",
      code: "IT202610130900102003",
      name: "科学岛大道综合舱出入口巡更-202610130900",
      planName: "科学岛大道日巡",
      level: "中",
      inspector: "赵倩",
      owner: "王强",
      result: "正常",
      overdue: "未逾期",
      deviceCount: 1,
      itemCount: 3,
      abnormalCount: 0,
      plannedAt: "2026-10-13 09:00:00",
      deadline: "2026-10-13 18:00:00",
      startedAt: "2026-10-13 09:10:00",
      submittedAt: "2026-10-13 10:00:00",
      duration: "00:50:00",
      corridor: "科学岛大道综合管廊",
      room: "综合舱",
      section: "出入口",
    },
  ];

  function listAlarms() {
    return (IAS.alarms || []).map(function (a) {
      return Object.assign({}, a);
    });
  }

  function resolveSection(alarm) {
    var empty = { project: "", corridor: "", room: "", section: "" };
    if (!alarm) return empty;
    var parts = String(alarm.property || "")
      .split(/\s*\/\s*/)
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
    if (parts.length >= 3) {
      return {
        project: parts.length >= 4 ? parts[0] : "",
        corridor: parts[parts.length - 3],
        room: parts[parts.length - 2],
        section: parts[parts.length - 1],
      };
    }
    return empty;
  }

  function locatePoint(alarm) {
    if (!alarm) return null;
    var code = alarm.deviceCode || "";
    var byCode = points.filter(function (p) {
      return p.system === "入侵报警" && (p.id === code || p.code === code);
    })[0];
    if (byCode && byCode.lat != null) {
      return { id: byCode.id, lat: byCode.lat, lng: byCode.lng };
    }
    var sec = resolveSection(alarm);
    var same = points.filter(function (p) {
      return p.system === "入侵报警"
        && p.corridor === sec.corridor
        && p.room === sec.room
        && p.section === sec.section
        && p.lat != null;
    })[0];
    if (same) return { id: same.id, lat: same.lat, lng: same.lng };
    return null;
  }

  function enrichAlarm(alarm) {
    var transfer = alarm.transfer || {};
    var process = alarm.process || {};
    var transferred = !!(alarm.transferStatus === "已转单"
      || alarm.workOrderNo
      || process.workOrderNo
      || transfer.workOrderNo
      || alarm.status === "处理中");
    return {
      id: alarm.id,
      device: alarm.device || "",
      deviceCode: alarm.deviceCode || "",
      system: alarm.system || "入侵报警",
      category: alarm.category || "",
      property: alarm.property || "",
      location: alarm.location || "",
      type: alarm.type || "",
      level: alarm.level || "",
      status: alarm.status || "",
      time: alarm.time || "",
      message: alarm.message || "",
      transferStatus: transferred ? "已转单" : "未转单",
      workOrderNo: alarm.workOrderNo || process.workOrderNo || transfer.workOrderNo || "-",
      transferTime: alarm.transferTime || transfer.transferTime || transfer.time || process.transferredAt || "-",
      rule: alarm.rule || (alarm.type === "设备离线" ? "设备离线监测规则" : "设备属性异常规则"),
      history: Array.isArray(alarm.history) ? alarm.history.slice() : [],
      transfer: transfer,
      processedBy: alarm.processedBy || "",
      processedAt: alarm.processedAt || "",
      processRemark: alarm.processRemark || "",
      closeReason: alarm.closeReason || "",
      closeRemark: alarm.closeRemark || "",
    };
  }

  function linkageForAlarm(alarmId) {
    var alarm = (IAS.alarms || []).filter(function (a) {
      return String(a.id) === String(alarmId);
    })[0];
    if (!alarm) return null;
    var sec = resolveSection(alarm);
    var cameras = [];
    var doors = [];
    var patrolTasks = [];
    if (sec.corridor && sec.room && sec.section) {
      cameras = points.filter(function (p) {
        return p.system === "视频监控"
          && p.corridor === sec.corridor
          && p.room === sec.room
          && p.section === sec.section;
      }).sort(sortByName).slice(0, 4);
      doors = points.filter(function (p) {
        return p.system === "门禁"
          && p.corridor === sec.corridor
          && p.room === sec.room
          && p.section === sec.section;
      }).sort(sortByName);
      patrolTasks = PATROL_TASKS.filter(function (t) {
        return t.corridor === sec.corridor && t.room === sec.room && t.section === sec.section;
      }).map(function (t) { return Object.assign({}, t); });
    }
    return {
      alarm: enrichAlarm(alarm),
      cameras: cameras,
      doors: doors,
      patrolTasks: patrolTasks,
    };
  }

  global.SECURITY_PREVENTION_DATA = {
    systems: SYSTEMS,
    systemMeta: SYSTEM_META,
    spatialTree: IAS.spatialTree || [],
    mapCenter: [30.4665, 114.4205],
    points: points,
    linkageFor: linkageFor,
    patrolTasks: PATROL_TASKS.map(function (t) { return Object.assign({}, t); }),
    listAlarms: listAlarms,
    resolveSection: resolveSection,
    locatePoint: locatePoint,
    linkageForAlarm: linkageForAlarm,
  };
})(window);
