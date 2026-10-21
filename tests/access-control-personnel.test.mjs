import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("personnel page exposes credential type and value columns", async () => {
  const page = await read("web/pages/access-control/personnel.html");
  assert.match(page, /<th>凭证类型<\/th>/);
  assert.match(page, /<th>通行凭证<\/th>/);
  assert.match(page, /data-action="sync-person"/);
  assert.match(page, /同步人员/);
  assert.match(page, /<!--[\s\S]*data-action="add-person"[\s\S]*-->/);
});

test("access-control personnel supports sync and hides edit/delete entry", async () => {
  const script = await read("app/components/access-control.js");
  assert.match(script, /data-action="sync-person"/);
  assert.match(script, /start-person-sync/);
  assert.match(script, /单向/);
  assert.match(script, /data-person-detail/);
  assert.match(script, /编辑\/删除入口暂隐藏/);
  assert.match(script, /credentialTypes/);
  assert.match(script, /CRED_TYPES/);
  assert.match(script, /门禁卡/);
  assert.match(script, /人脸/);
  assert.match(script, /二维码/);
  assert.doesNotMatch(script, /指纹/);
});

test("personnel requirement describes one-way sync", async () => {
  const req = await read("app/components/requirement.js");
  assert.match(req, /docs\["access-control\.personnel"\]/);
  assert.match(req, /同步人员/);
  assert.match(req, /单向/);
  assert.match(req, /不支持平台侧手工新增、编辑或删除人员/);
});

test("personnel mock uses new credential model", async () => {
  const data = await read("app/data/access-control-data.js");
  assert.match(data, /personnel:\s*\[[\s\S]*?credentialTypes:\s*\[/);
  assert.match(data, /credentials:\s*\{/);
  assert.doesNotMatch(data, /personnel:[\s\S]*?credential:"指纹/);
});
