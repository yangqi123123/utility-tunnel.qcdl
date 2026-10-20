(function () {
  const toast = (message) => {
    let node = document.getElementById("interfaceToast");
    if (!node) {
      node = document.createElement("div");
      node.id = "interfaceToast";
      node.style.cssText = "position:fixed;right:26px;bottom:26px;z-index:1500;padding:10px 16px;border:1px solid #d5e2f5;border-radius:5px;background:#fff;color:#27415f;box-shadow:0 8px 24px rgba(26,55,96,.14);font-size:13px;opacity:0;transform:translateY(8px);transition:.2s ease;pointer-events:none";
      document.body.append(node);
    }
    node.textContent = message;
    node.style.opacity = "1";
    node.style.transform = "translateY(0)";
    clearTimeout(window.__interfaceToastTimer);
    window.__interfaceToastTimer = setTimeout(() => {
      node.style.opacity = "0";
      node.style.transform = "translateY(8px)";
    }, 2200);
  };
  window.interfaceToast = toast;

  const forms = {
    access: `
      <label class="form-field"><span class="form-label form-required">接入名称</span><input class="form-control" placeholder="如：墨斗物联网平台-生产"></label>
      <label class="form-field"><span class="form-label form-required">平台地址</span><input class="form-control" placeholder="https://iot.modou.example.com"></label>
      <label class="form-field"><span class="form-label form-required">认证方式</span><select class="form-control"><option>AK / SK</option><option>Token</option><option>账号密码</option></select></label>
      <label class="form-field"><span class="form-label form-required">AppKey / ClientId</span><input class="form-control" placeholder="请输入 AppKey"></label>
      <label class="form-field"><span class="form-label form-required">AppSecret / Token</span><input class="form-control" type="password" placeholder="请输入密钥"></label>
      <label class="form-field"><span class="form-label">默认租户 / 项目</span><input class="form-control" placeholder="可选，对应墨斗侧组织"></label>
      <div class="interface-form-section">安全策略（归属本接入）</div>
      <label class="form-field"><span class="form-label">传输安全</span><select class="form-control"><option>强制 HTTPS</option><option>HTTPS（可降级，不推荐）</option></select></label>
      <label class="form-field"><span class="form-label">超时时间</span><select class="form-control"><option>10 秒</option><option>30 秒</option><option>60 秒</option></select></label>
      <label class="form-field"><span class="form-label">失败重试</span><select class="form-control"><option>3 次</option><option>1 次</option><option>不重试</option></select></label>
    `,
    "south-task": `
      <label class="form-field"><span class="form-label form-required">任务名称</span><input class="form-control" placeholder="如：可燃气体实时测点"></label>
      <label class="form-field"><span class="form-label form-required">关联接入</span><select class="form-control"><option>墨斗物联网平台-生产</option></select></label>
      <label class="form-field"><span class="form-label form-required">产品 / 设备类型</span><select class="form-control"><option>可燃气体探测器</option><option>水浸传感器</option><option>温湿度传感器</option><option>液位传感器</option></select></label>
      <label class="form-field"><span class="form-label form-required">采集范围</span><select class="form-control"><option>全部设备</option><option>按设备 ID 列表</option><option>按区域</option></select></label>
      <label class="form-field"><span class="form-label form-required">采集方式</span><select class="form-control"><option>实时订阅</option><option>轮询</option></select></label>
      <label class="form-field"><span class="form-label">采集周期</span><select class="form-control"><option>实时（订阅）</option><option>5 秒</option><option>30 秒</option><option>1 分钟</option></select></label>
      <label class="form-field"><span class="form-label form-required">数据主题</span><select class="form-control" multiple size="3"><option selected>实时测点</option><option>告警</option><option>在线状态</option></select></label>
      <label class="form-field"><span class="form-label form-required">启用状态</span><select class="form-control"><option>启用</option><option>停用</option></select></label>
    `,
    north: `
      <label class="form-field"><span class="form-label form-required">对接对象</span><select class="form-control"><option>市级城市生命线平台</option><option>区域管廊运维平台</option></select></label>
      <label class="form-field"><span class="form-label form-required">接口名称</span><input class="form-control" placeholder="如：市级运行数据上报"></label>
      <label class="form-field"><span class="form-label form-required">接口地址</span><input class="form-control" placeholder="https://api.city.example.com/v1/report"></label>
      <label class="form-field"><span class="form-label form-required">协议类型</span><select class="form-control"><option>RESTful</option><option>WebService</option></select></label>
      <label class="form-field"><span class="form-label form-required">方向</span><select class="form-control"><option>仅上报</option></select></label>
      <div class="interface-form-section">安全与权限（归属本接口）</div>
      <label class="form-field"><span class="form-label form-required">认证方式</span><select class="form-control"><option>OAuth 2.0 + HTTPS</option><option>AK / SK 签名</option><option>双向 TLS 证书</option></select></label>
      <label class="form-field"><span class="form-label form-required">凭证 / 密钥</span><input class="form-control" type="password" placeholder="Client Secret / AKSK / 证书口令"></label>
      <label class="form-field"><span class="form-label">IP 白名单</span><input class="form-control" placeholder="如：10.20.0.0/24，多个用逗号分隔"></label>
      <label class="form-field"><span class="form-label">可上报主题</span><select class="form-control" multiple size="3"><option selected>告警</option><option selected>设备状态</option><option>运行指标</option></select></label>
      <div class="interface-form-section">域间策略（归属本接口）</div>
      <label class="form-field"><span class="form-label">域间网关</span><select class="form-control"><option>启用转发（仅上报）</option><option>直连（内网）</option></select></label>
    `,
    "north-task": `
      <label class="form-field"><span class="form-label form-required">任务名称</span><input class="form-control" placeholder="如：安全事件主动上报"></label>
      <label class="form-field"><span class="form-label form-required">上报接口</span><select class="form-control"><option>市级运行数据上报</option><option>区级安全事件上报</option></select></label>
      <label class="form-field"><span class="form-label form-required">触发周期</span><select class="form-control"><option>每 5 分钟</option><option>每 15 分钟</option><option>每小时</option><option>每日 00:00</option><option>实时事件</option></select></label>
      <label class="form-field"><span class="form-label form-required">上报主题</span><select class="form-control" multiple size="3"><option selected>告警</option><option>设备状态</option><option>运行指标</option></select></label>
      <label class="form-field"><span class="form-label form-required">数据范围</span><select class="form-control"><option>全部管廊</option><option>指定舱室</option><option>指定子系统</option></select></label>
      <label class="form-field"><span class="form-label form-required">启用状态</span><select class="form-control"><option>启用</option><option>停用</option></select></label>
    `
  };

  const titles = {
    access: "新增接入（墨斗平台）",
    "south-task": "新建采集任务",
    north: "新增北向接口",
    "north-task": "新建定时任务"
  };

  function openDrawer(type, title) {
    if (!window.openAppDrawer) return;
    window.openAppDrawer({
      title: title || titles[type] || "接口配置",
      body: forms[type] || forms.access,
      footer: `<button class="btn btn-secondary" type="button" data-drawer-close>取消</button><button class="btn btn-primary" type="button" data-interface-save>保存配置</button>`
    });
    document.querySelector("[data-interface-save]")?.addEventListener("click", () => {
      window.closeAppDrawer();
      toast("配置已保存，等待下一个同步周期生效");
    });
  }

  document.addEventListener("click", (event) => {
    const action = event.target.closest("[data-interface-action]");
    if (action) {
      openDrawer(action.dataset.interfaceAction);
      return;
    }

    const detail = event.target.closest("[data-interface-detail]");
    if (detail) {
      const title = detail.dataset.interfaceDetail;
      window.openAppDrawer?.({
        title,
        body: `<section class="detail-section"><h3 class="detail-title">运行概况</h3><div class="detail-grid"><div class="info-item"><span class="info-label">连接状态</span><span class="info-value"><span class="tag success">正常</span></span></div><div class="info-item"><span class="info-label">最近通信</span><span class="info-value">刚刚 · 86 ms</span></div><div class="info-item"><span class="info-label">今日消息</span><span class="info-value">12,864 条</span></div><div class="info-item"><span class="info-label">成功率</span><span class="info-value">99.6%</span></div></div></section><section class="detail-section"><h3 class="detail-title">说明</h3><p class="page-desc">接入承载认证与安全策略；采集/上报任务只配置业务范围与周期，不重复填写密钥。</p></section>`,
        footer: `<button class="btn btn-secondary" type="button" data-drawer-close>关闭</button>`
      });
      return;
    }

    const toggle = event.target.closest("[data-task-toggle]");
    if (toggle) {
      toggle.classList.toggle("on");
      toggle.setAttribute("aria-pressed", toggle.classList.contains("on"));
      toast(toggle.classList.contains("on") ? "任务已启用" : "任务已暂停");
      return;
    }

    const filter = event.target.closest("[data-log-filter]");
    if (filter) {
      document.querySelectorAll("[data-log-filter]").forEach((item) => item.classList.toggle("active", item === filter));
      const level = filter.dataset.logFilter;
      document.querySelectorAll("[data-log-row]").forEach((row) => {
        row.hidden = level !== "all" && row.dataset.logRow !== level;
      });
      return;
    }

    const toastAction = event.target.closest("[data-interface-toast]");
    if (toastAction) toast(toastAction.dataset.interfaceToast);
  });
})();
