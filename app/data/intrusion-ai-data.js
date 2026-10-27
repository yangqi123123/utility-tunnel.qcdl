(function (global) {
  const AI_ALGORITHMS = [
    {
      id: "alg-1",
      code: "ALG-20261020-001",
      name: "区域入侵检测",
      apiUrl: "https://ai.example.com/v1/intrusion",
      apiKey: "sk-intrusion-demo-001",
      categories: ["person", "bicycle"],
      remark: "出入口周界区域入侵",
      status: "enabled",
      updatedAt: "2026-10-20 09:00:00",
    },
    {
      id: "alg-2",
      code: "ALG-20261018-002",
      name: "人员聚集识别",
      apiUrl: "https://ai.example.com/v1/crowd",
      apiKey: "sk-crowd-demo-002",
      categories: ["person"],
      remark: "投料口人员密度监测",
      status: "enabled",
      updatedAt: "2026-10-18 14:20:00",
    },
    {
      id: "alg-3",
      code: "ALG-20261012-003",
      name: "徘徊行为分析",
      apiUrl: "https://ai.example.com/v1/loiter",
      apiKey: "sk-loiter-demo-003",
      categories: ["person", "car", "dog"],
      remark: "防火分区长时间徘徊",
      status: "disabled",
      updatedAt: "2026-10-12 11:05:00",
    },
  ];

  /** 算法分类候选（对齐目标检测常用类别） */
  const AI_CATEGORY_PRESETS = [
    "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
    "traffic light", "fire hydrant", "stop sign", "parking meter", "bench",
    "bird", "cat", "dog", "horse", "sheep", "cow", "elephant",
  ];

  const AI_DEPLOYMENTS = [
    {
      id: "dep-1",
      code: "controla8705edc28469",
      name: "出入口周界布控",
      algorithmId: "alg-1",
      target: "person",
      cameraId: "cam-1",
      cameraName: "管廊枪式摄像机 01",
      videoInfo: "h264/25/1920x1080",
      audioInfo: "mpeg4-generic/1/8000/16",
      playUrl: "ws://192.168.110.112:9002/analyzer/controla8705edc28469",
      pushStream: true,
      alarmInterval: 180,
      region: { x: 0.18, y: 0.22, w: 0.42, h: 0.36 },
      runStatus: "running",
      videoStatus: "online",
      fps: 24.92,
      remark: "出入口主通道",
      createdAt: "2026-10-21 08:30:00",
    },
    {
      id: "dep-2",
      code: "controlcb3d45b426530",
      name: "投料口聚集监测",
      algorithmId: "alg-2",
      target: "person",
      cameraId: "cam-7",
      cameraName: "投料口枪式摄像机 04",
      videoInfo: "h264/25/1920x1080",
      audioInfo: "mpeg4-generic/1/8000/16",
      playUrl: "ws://192.168.110.112:9002/analyzer/controlcb3d45b426530",
      pushStream: false,
      alarmInterval: 180,
      region: { x: 0.25, y: 0.3, w: 0.5, h: 0.4 },
      runStatus: "cancelled",
      videoStatus: "online",
      fps: 0,
      remark: "",
      createdAt: "2026-10-19 16:10:00",
    },
  ];

  const KEYFRAME = "../../assets/images/corridor-monitor.jpg";

  const AI_ALARM_CLIPS = [
    {
      id: 1,
      device: "管廊枪式摄像机 01",
      deviceCode: "CAM-GL-01",
      system: "入侵报警",
      category: "视频监控",
      type: "设备属性",
      message: "出入口周界布控触发区域入侵",
      level: "告警",
      time: "2026-10-21 09:12:00",
      status: "未处理",
      location: "综合舱出入口",
      property: "高新大道综合管廊 / 综合舱 / 出入口",
      deploymentId: "dep-1",
      cameraName: "管廊枪式摄像机 01",
      keyframeUrl: KEYFRAME,
      clipUrl: "",
      images: [KEYFRAME],
      history: [{ time: "2026-10-21 09:12:00", operator: "系统", action: "创建报警" }],
    },
    {
      id: 2,
      device: "投料口枪式摄像机 04",
      deviceCode: "CAM-TL-04",
      system: "入侵报警",
      category: "视频监控",
      type: "设备属性",
      message: "投料口人员聚集超过阈值",
      level: "预警",
      time: "2026-10-20 15:40:00",
      status: "处理中",
      location: "综合舱出入口",
      property: "科学岛大道综合管廊 / 综合舱 / 出入口",
      deploymentId: "dep-2",
      cameraName: "投料口枪式摄像机 04",
      keyframeUrl: KEYFRAME,
      clipUrl: "",
      images: [KEYFRAME],
      history: [
        { time: "2026-10-20 15:40:00", operator: "系统", action: "创建报警" },
        { time: "2026-10-20 15:45:00", operator: "张三", action: "开始处理" },
      ],
    },
    {
      id: 3,
      device: "综合舱球型摄像机 02",
      deviceCode: "CAM-ZH-02",
      system: "入侵报警",
      category: "视频监控",
      type: "设备属性",
      message: "防火分区徘徊告警",
      level: "提醒",
      time: "2026-10-18 11:05:00",
      status: "已处理",
      location: "综合舱防火分区",
      property: "高新大道综合管廊 / 综合舱 / 防火分区",
      deploymentId: "",
      cameraName: "综合舱球型摄像机 02",
      keyframeUrl: KEYFRAME,
      clipUrl: "",
      images: [KEYFRAME],
      processedBy: "李四",
      processedAt: "2026-10-18 11:30:00",
      processRemark: "确认为检修人员",
      history: [
        { time: "2026-10-18 11:05:00", operator: "系统", action: "创建报警" },
        { time: "2026-10-18 11:30:00", operator: "李四", action: "处理完成：检修人员" },
      ],
    },
  ];

  function listCameras() {
    const fromIas = (global.INTRUSION_ALARM_DATA && global.INTRUSION_ALARM_DATA.cameras) || [];
    if (fromIas.length) {
      return fromIas.map((c, i) => ({
        id: `cam-${i + 1}`,
        name: c.name,
        status: c.status || "在线",
        corridor: c.corridor || "",
        cabin: c.cabin || "",
        section: c.section || "",
      }));
    }
    return [
      { id: "cam-1", name: "管廊枪式摄像机 01", status: "在线" },
      { id: "cam-7", name: "投料口枪式摄像机 04", status: "在线" },
    ];
  }

  window.INTRUSION_AI_DATA = {
    AI_ALGORITHMS,
    AI_DEPLOYMENTS,
    AI_ALARM_CLIPS,
    AI_CATEGORY_PRESETS,
    listCameras,
  };
  window.AI_ALGORITHMS = AI_ALGORITHMS;
  window.AI_DEPLOYMENTS = AI_DEPLOYMENTS;
  window.AI_ALARM_CLIPS = AI_ALARM_CLIPS;
  window.AI_CATEGORY_PRESETS = AI_CATEGORY_PRESETS;
})(window);
