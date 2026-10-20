import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("top-level device menu label is 资产管理 while child list stays 设备管理", async () => {
  const source = await read("app/config/menu.js");
  const block = source.slice(source.indexOf('key: "device"'), source.indexOf('key: "home"'));
  assert.match(block, /label:\s*"资产管理"/);
  assert.match(block, /key:\s*"device\.list"[\s\S]*?label:\s*"设备管理"/);
  assert.doesNotMatch(block.split('children:')[0], /label:\s*"设备管理"/);
});

test("device list form exposes smart flag above name and new location fields", async () => {
  const source = await read("web/pages/device/list.html");
  assert.match(source, /longitude/);
  assert.match(source, /latitude/);
  assert.match(source, /rangeStartStake/);
  assert.match(source, /rangeEndStake/);
  assert.match(source, /drawingCabinetNo/);
  assert.match(source, /sectionCode/);
  assert.match(source, /范围起桩号\(m\)/);
  assert.match(source, /图纸控制柜编号/);
  assert.match(source, /applySmartNameMode|bindSmartNameMode/);
  assert.doesNotMatch(source, /device-third-party-code/);
  assert.doesNotMatch(source, /data-action="point-select"/);
  assert.doesNotMatch(source, /\.device-form \.device-smart-section \{ display:none/);
});

test("device import headers include new panel fields", async () => {
  const source = await read("web/pages/device/list.html");
  assert.match(source, /"经度"/);
  assert.match(source, /"纬度"/);
  assert.match(source, /"范围起桩号\(m\)"/);
  assert.match(source, /"图纸控制柜编号"/);
  assert.match(source, /"设备品牌"/);
});
