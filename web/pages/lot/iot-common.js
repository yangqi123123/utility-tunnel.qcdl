/* Keep the nine IoT entries inside one console shell. Each HTML file remains
   a direct entry point, while menu clicks render the selected view in place. */
(function () {
  let embedded = false;
  try { embedded = window.top !== window.self; } catch (error) { embedded = true; }
  embedded = embedded || new URLSearchParams(window.location.search).get('embedded') === '1';
  if (embedded) {
    document.documentElement.classList.add('lot-embedded');
    document.querySelector('.sidebar')?.remove();
    document.querySelector('.topbar')?.remove();
    const embeddedStyle = document.createElement('style');
    embeddedStyle.textContent = `
      html, body { min-height:100%; overflow:auto !important; background:#f5f7fc !important; }
      .app { display:block !important; min-height:100% !important; background:#f5f7fc !important; }
      .sidebar, .topbar { display:none !important; }
      .main { width:100% !important; min-height:100% !important; height:auto !important; overflow:visible !important; padding:0 !important; }
        .content { width:100% !important; max-width:none !important; margin:0 !important; padding:0 !important; }
        .page-head { justify-content:flex-end !important; min-height:0 !important; margin:0 0 16px !important; }
        .page-head > div:first-child { display:none !important; }
        .head-actions { margin-left:auto !important; }
        .stat-grid { gap:16px !important; margin-bottom:16px !important; }
        .stat, .panel { background:#fff !important; border:1px solid var(--line) !important; border-radius:4px !important; box-shadow:0 8px 24px rgba(19,90,250,.04) !important; }
        .stat { padding:24px !important; }
        .panel { margin-bottom:16px !important; }
        .panel-head { min-height:56px !important; padding:0 24px !important; }
        .table th { background:#f3f6ff !important; }
        .drawer-backdrop { z-index:1200 !important; background:rgba(26,28,31,.45) !important; }
        .drawer { width:min(560px,90vw) !important; border-left:1px solid var(--line) !important; border-radius:0 !important; box-shadow:-8px 0 24px rgba(26,28,31,.12) !important; transform:none !important; }
        .drawer-head { min-height:56px !important; padding:16px 24px !important; align-items:flex-start !important; }
        .drawer-head h2 { font-size:16px !important; font-weight:600 !important; }
        .drawer-body { padding:24px !important; overflow-y:auto !important; }
        .drawer-foot { min-height:56px !important; padding:12px 24px !important; border-top:1px solid var(--line) !important; background:#fff !important; }
    `;
    document.head.appendChild(embeddedStyle);
  }

  const routes = {
    'overview.html': 'overview',
    'integration.html': 'integration',
    'devices.html': 'devices',
    'models.html': 'models',
    'mapping.html': 'mapping',
    'tasks.html': 'tasks',
    'monitor.html': 'monitor',
    'commands.html': 'commands',
    'alarms.html': 'alarms'
  };

  const filterFields = {
    overview: [['接入系统', '接入系统'], ['设备名称', '设备'], ['运行状态', '运行状态'], ['更新时间', '更新时间']],
    integration: [['接入系统', '接入系统'], ['厂商', '厂商'], ['协议', '协议'], ['状态', '状态']],
    devices: [['设备名称', '设备'], ['产品类型', '产品类型'], ['所属接入', '所属接入'], ['状态', '状态']],
    models: [['模型名称', '模型'], ['能力类型', '能力'], ['发布状态', '状态'], ['绑定设备', '设备']],
    mapping: [['点位名称', '点位'], ['设备', '设备'], ['目标属性', '属性'], ['映射状态', '状态']],
    tasks: [['任务名称', '任务'], ['采集模式', '模式'], ['执行频率', '频率'], ['状态', '状态']],
    monitor: [['运行对象', '对象'], ['协议类型', '协议'], ['运行指标', '指标'], ['状态', '状态']],
    commands: [['设备', '设备'], ['控制服务', '服务'], ['执行结果', '结果'], ['时间', '时间']],
    alarms: [['设备/对象', '设备'], ['告警类型', '类型'], ['告警等级', '等级'], ['处理状态', '状态']]
  };

  const routeTitles = {
    overview: 'IoT 总览', integration: '接入管理', devices: '设备管理', models: '物模型',
    mapping: '点位映射', tasks: '采集任务', monitor: '运行监控', commands: '指令中心', alarms: '告警事件'
  };

  function buildFilterCard(route) {
    const fields = filterFields[route] || filterFields.overview;
    return `<section class="lot-filter-card card filters" data-lot-filter-card>
      <div class="lot-filter-fields">${fields.map(([label, placeholder]) => `<label class="form-field"><span class="form-label">${label}</span><input class="form-control" data-lot-filter placeholder="请输入${placeholder}"></label>`).join('')}</div>
      <div class="lot-filter-controls"><button class="button" type="button" data-lot-filter-reset>重置</button><button class="button primary" type="button" data-lot-filter-search>搜索</button></div>
    </section>`;
  }

  function applyLotFilters(card) {
    const overview = document.getElementById('overview');
    const values = [...card.querySelectorAll('[data-lot-filter]')].map((input) => input.value.trim().toLowerCase()).filter(Boolean);
    overview?.querySelectorAll('.table tbody tr').forEach((row) => {
      const text = row.innerText.toLowerCase();
      row.style.display = values.every((value) => text.includes(value)) ? '' : 'none';
    });
  }

  function normalizeView(route) {
    const overview = document.getElementById('overview');
    if (!overview) return;
    overview.querySelector(':scope > .lot-filter-card')?.remove();
    overview.querySelector(':scope > .lot-action-row')?.remove();
    const head = overview.querySelector(':scope > .page-head');
    const stats = overview.querySelector(':scope > .stat-grid');
    if (!stats) return;
    const filterWrap = document.createElement('div');
    filterWrap.innerHTML = buildFilterCard(route);
    const filterCard = filterWrap.firstElementChild;
    stats.insertAdjacentElement('afterend', filterCard);
    const actionSource = head?.querySelector('.head-actions');
    if (actionSource) {
      const actions = [...actionSource.children].filter((button) => !button.matches('[data-toast]'));
      const tablePanel = overview.querySelector(':scope > .panel');
      if (tablePanel && actions.length) {
        const panelHead = tablePanel.querySelector(':scope > .panel-head');
        const actionGroup = document.createElement('div');
        actionGroup.className = 'lot-action-actions';
        actionGroup.append(...actions);
        panelHead?.append(actionGroup);
      } else if (actions.length) {
        const actionRow = document.createElement('section');
        actionRow.className = 'lot-action-row card';
        actionRow.innerHTML = `<div class="lot-action-title">${routeTitles[route] || '列表'}</div><div class="lot-action-actions"></div>`;
        actionRow.querySelector('.lot-action-actions').append(...actions);
        filterCard.insertAdjacentElement('afterend', actionRow);
      }
    }
    head?.remove();
    filterCard.querySelector('[data-lot-filter-search]')?.addEventListener('click', () => applyLotFilters(filterCard));
    filterCard.querySelector('[data-lot-filter-reset]')?.addEventListener('click', () => {
      filterCard.querySelectorAll('[data-lot-filter]').forEach((input) => { input.value = ''; });
      applyLotFilters(filterCard);
    });
  }

  function installParentDrawerBridge() {
    if (!embedded || window.parent === window || typeof window.parent.openAppDrawer !== 'function') return;
    const parentDoc = window.parent.document;
    if (!parentDoc.getElementById('lot-bridge-style')) {
      const style = parentDoc.createElement('style');
      style.id = 'lot-bridge-style';
      style.textContent = `.lot-bridge-form .form-row{display:grid;grid-template-columns:1fr 1fr;gap:16px}.lot-bridge-form .field{margin-bottom:16px}.lot-bridge-form .field label{display:block;margin-bottom:8px;color:#50565d;font-size:14px}.lot-bridge-form .field input,.lot-bridge-form .field select,.lot-bridge-form .field textarea{width:100%;height:32px;padding:0 12px;border:1px solid #d8dee9;border-radius:2px;background:#fff;color:#1a1c1f}.lot-bridge-form .field textarea{height:96px;padding:8px 12px}.lot-bridge-form .panel{border:1px solid #e5eaf3;border-radius:4px;box-shadow:none;background:#fff}.lot-bridge-form .panel-head{min-height:48px;padding:0 16px;border-bottom:1px solid #edf1f7}.lot-bridge-form .panel-head h2{font-size:15px}.lot-bridge-form .table-wrap{overflow:auto}.lot-bridge-form .table{min-width:640px}`;
      parentDoc.head.appendChild(style);
    }
    const parentOpenDrawer = window.parent.openAppDrawer;
    window.openDrawer = function (type) {
      const titleMap = { connection: '新增接入', device: '注册设备', model: '创建物模型', mapping: '配置点位映射', task: '新建采集任务', command: '发起控制指令', alarm: '新增告警规则', api: '新增 HTTP 接口' };
      const body = typeof drawerForms !== 'undefined' ? drawerForms[type] || drawerForms.connection : '';
      parentOpenDrawer.call(window.parent, { title: titleMap[type] || '新增配置', subtitle: '智能物联 · ' + (routeTitles[routeFromLocation()] || '配置'), body: `<div class="lot-bridge-form">${body}</div>`, footer: '<button class="btn btn-secondary" type="button" data-drawer-close>取消</button><button class="btn btn-primary" type="button" data-drawer-close>确认</button>' });
    };
    window.closeDrawer = function () { window.parent.closeAppDrawer?.(); };
    window.openIntegrationDetail = function (name) {
      parentOpenDrawer.call(window.parent, { title: name + ' · 接入详情', subtitle: '智能物联 · 接入管理', body: `<div class="lot-bridge-form"><div class="field"><label>详情页签</label><select><option>基本信息</option><option>HTTP 基础连接</option><option>接口目录</option><option>回调配置</option><option>设备列表</option><option>运行日志</option></select></div><div class="panel"><div class="panel-head"><h2>HTTP 基础连接</h2></div><div style="padding:16px"><p><strong>Base URL：</strong>https://openapi.keytop.com</p><p><strong>认证：</strong>appId / appSecret + MD5 签名</p><p><strong>用途：</strong>所有接口共用的公共地址、认证、超时和重试配置</p></div></div></div>`, footer: '<button class="btn btn-secondary" type="button" data-drawer-close>关闭</button>' });
    };
  }

  function routeFromLocation() {
    const file = (window.location.pathname.split('/').pop() || '').toLowerCase();
    return routes[file] || null;
  }

  function setActive(route) {
    document.querySelectorAll('.nav-item').forEach((item) => {
      const key = routes[(item.getAttribute('href') || '').split('/').pop().toLowerCase()];
      item.classList.toggle('active', key === route);
    });
  }

  function render(route, updateHistory) {
    if (!route || typeof window.navigatePage !== 'function') return;
    setActive(route);
    window.navigatePage(route);
    normalizeView(route);
    if (updateHistory) {
      window.history.pushState({ lotRoute: route }, '', route + '.html');
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    const main = document.querySelector('.main');
    if (main) main.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }

  function openGenericDetail(message) {
    const name = String(message || '')
      .replace(/^已打开/, '')
      .replace(/详情.*$/, '')
      .trim() || '当前对象';
    if (embedded && window.parent !== window && typeof window.parent.openAppDrawer === 'function') {
      window.parent.openAppDrawer({
        title: name + ' · 详情',
        subtitle: '智能物联 · 详情信息',
        body: `<div class="lot-bridge-form"><div class="panel"><div class="panel-head"><h2>基本信息</h2></div><div style="padding:16px"><p><strong>对象名称：</strong>${name}</p><p><strong>数据来源：</strong>智能物联平台</p><p><strong>查看方式：</strong>当前控制台只读详情</p></div></div><div class="panel"><div class="panel-head"><h2>运行状态</h2></div><div style="padding:16px"><p><strong>最近状态：</strong><span class="status"><i class="dot"></i>正常</span></p><p><strong>更新时间：</strong>刚刚</p></div></div></div>`,
        footer: '<button class="btn btn-secondary" type="button" data-drawer-close>关闭</button>'
      });
      return;
    }
    const title = document.getElementById('drawerTitle');
    const body = document.getElementById('drawerBody');
    const foot = document.querySelector('.drawer-foot');
    const backdrop = document.getElementById('backdrop');
    if (!title || !body || !backdrop) return;
    title.textContent = name + ' · 详情';
    body.innerHTML = '<div class="panel" style="margin:0 0 14px"><div class="panel-head"><h2>基本信息</h2></div><div style="padding:16px"><p><strong>对象名称：</strong>' + name + '</p><p><strong>数据来源：</strong>智能物联平台</p><p><strong>查看方式：</strong>当前控制台只读详情</p></div></div><div class="panel" style="margin:0"><div class="panel-head"><h2>运行状态</h2></div><div style="padding:16px"><p><strong>最近状态：</strong><span class="status"><i class="dot"></i>正常</span></p><p><strong>更新时间：</strong>刚刚</p><p><strong>备注：</strong>可在对应菜单中进行配置或进一步操作。</p></div></div>';
    if (foot) foot.style.display = 'none';
    backdrop.classList.add('open');
  }

  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', (event) => {
      const route = routes[(item.getAttribute('href') || '').split('/').pop().toLowerCase()];
      if (!route) return;
      event.preventDefault();
      render(route, true);
    });
  });

  window.addEventListener('popstate', () => {
    const route = routeFromLocation();
    if (route) render(route, false);
  });

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-toast], [onclick*="showToast"]');
    const message = button && (button.dataset.toast || ((button.getAttribute('onclick') || '').match(/showToast\(['"]([^'"]*详情[^'"]*)['"]\)/) || [])[1]);
    if (!message || !/详情/.test(message)) return;
    event.preventDefault();
    event.stopPropagation();
    openGenericDetail(message);
  }, true);

  const route = routeFromLocation();
  installParentDrawerBridge();
  if (route) {
    setActive(route);
    normalizeView(route);
    const main = document.querySelector('.main');
    if (main) main.scrollTop = 0;
  }
})();
