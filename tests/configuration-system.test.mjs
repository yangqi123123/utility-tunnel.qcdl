import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const menu = fs.readFileSync('app/config/menu.js', 'utf8');
const page = fs.readFileSync('web/pages/network/configuration.html', 'utf8');
const data = fs.readFileSync('app/data/configuration-data.js', 'utf8');

test('组态系统菜单可见且路由正确', () => {
  assert.match(menu, /key: "configuration"/);
  assert.match(menu, /\.\.\/network\/configuration\.html/);
  const block = menu.slice(menu.indexOf('key: "configuration"'), menu.indexOf('key: "configuration"') + 280);
  assert.doesNotMatch(block, /hidden:\s*true/);
});

test('仅保留网关拓扑与组态图两页签', () => {
  assert.match(page, /data-tab="gateway"/);
  assert.match(page, /data-tab="hmi"/);
  assert.doesNotMatch(page, /data-tab="device"/);
  assert.doesNotMatch(page, /设备拓扑/);
  assert.match(page, /id="diagramStage"/);
  assert.match(page, /function renderGatewayDiagram/);
  assert.doesNotMatch(page, /function renderDeviceDiagram/);
  assert.match(page, /function renderPowerHmi/);
  assert.match(page, /function renderFireHmi/);
  assert.match(page, /flow-line/);
});

test('组态图仅电力与火灾且无绑点侧栏', () => {
  assert.match(data, /电力监测组态图/);
  assert.match(data, /火灾报警组态图/);
  assert.doesNotMatch(page, /配置绑定|openBindDrawer|测点详情|组态图测点状态/);
  assert.doesNotMatch(page, /表21|表24|对齐组态图风格/);
  assert.match(page, /diagram-zoom/);
  assert.match(page, /legend-card/);
});

test('拓扑含4服务器与5工作站', () => {
  assert.match(data, /通用业务服务器/);
  assert.match(data, /视频流媒体服务器/);
  assert.match(data, /IP核心调度专用服务器/);
  assert.match(data, /通用业务备机/);
  assert.match(data, /通信工作站/);
  assert.match(data, /门禁及巡更管理工作站/);
  assert.match(data, /网管工作站/);
  assert.match(data, /火灾报警工作站/);
  assert.match(data, /安防工作站/);
  assert.match(data, /gatewayTopo/);
  assert.doesNotMatch(data, /deviceTopo/);
  const wsBlock = data.slice(data.indexOf('workstations'), data.indexOf('gatewayTopo'));
  assert.equal((wsBlock.match(/id: "WS-/g) || []).length, 5);
  assert.equal((data.match(/id: "SRV-/g) || []).length, 4);
});

test('本版无远程控制文案', () => {
  assert.doesNotMatch(page, /远程控制|启停|下发/);
  assert.doesNotMatch(data, /远程控制|启停|下发/);
});
