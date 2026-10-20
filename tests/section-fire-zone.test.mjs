import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync("web/pages/project/house.html", "utf8");

assert.match(page, /data-action="fire-zone"/);
assert.match(page, /所属防火分区/);
assert.match(page, /fireZoneId/);
assert.match(page, /function openFireZoneLedger/);
assert.match(page, /function openFireZoneForm/);
assert.match(page, /function saveFireZone/);
assert.match(page, /已关联子区段/);
assert.match(page, /防火分区编号/);
assert.match(page, /防火分区名称/);
assert.match(page, /防火分区长度/);
assert.match(page, /防火分区起点桩号/);
assert.match(page, /防火分区止点桩号/);
assert.match(page, /data-fire-zone-select/);
assert.match(page, /importHeaders=\["防火分区编号"/);
assert.match(page, /data-action="save-house"/);
assert.match(page, /fire-zone-form-mask/);
assert.match(page, /fire-zone-drawer-open/);
assert.doesNotMatch(page, /data-fire-action="edit"/);
assert.match(page, /openHouseDrawer\("create"\)/);

console.log("section fire zone static checks passed");
