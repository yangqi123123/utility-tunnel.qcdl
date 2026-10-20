import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("personnel page exposes credential type and value columns", async () => {
  const page = await read("web/pages/access-control/personnel.html");
  assert.match(page, /<th>凭证类型<\/th>/);
  assert.match(page, /<th>通行凭证<\/th>/);
});

test("access-control personnel supports more menu and credential multi-select", async () => {
  const script = await read("app/components/access-control.js");
  assert.match(script, /data-person-more/);
  assert.match(script, /access-more-menu/);
  assert.match(script, /该人员已绑定通行权限，不允许删除/);
  assert.match(script, /credentialTypes/);
  assert.match(script, /CRED_TYPES/);
  assert.match(script, /门禁卡/);
  assert.match(script, /人脸/);
  assert.match(script, /二维码/);
  assert.match(script, /access-form-grid/);
  assert.doesNotMatch(script, /指纹/);
});

test("personnel mock uses new credential model", async () => {
  const data = await read("app/data/access-control-data.js");
  assert.match(data, /personnel:\s*\[[\s\S]*?credentialTypes:\s*\[/);
  assert.match(data, /credentials:\s*\{/);
  assert.doesNotMatch(data, /personnel:[\s\S]*?credential:"指纹/);
});
