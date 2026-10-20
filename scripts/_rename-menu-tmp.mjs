import fs from "node:fs";

const files = [
  "web/pages/project/house.html",
  "web/pages/project/pipeline.html",
  "web/pages/project/project-management.html",
  "web/pages/project/floor.html",
  "web/pages/project/building.html",
  ...fs.readdirSync("web/pages/gis").filter((f) => f.endsWith(".html")).map((f) => `web/pages/gis/${f}`),
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const source = fs.readFileSync(file, "utf8");
  let next = source;
  next = next.replace(/data-page-section="管廊管理"/g, 'data-page-section="数据库管理"');
  next = next.replace(/subtitle:\s*"管廊管理 ·/g, 'subtitle: "数据库管理 ·');
  next = next.replace(/subtitle:\s*`管廊管理 ·/g, "subtitle:`数据库管理 ·");
  next = next.replace(
    /(href="\.\.\/project\/project-management\.html"[^>]*>[\s\S]*?<span>)管廊管理(<\/span>)/g,
    "$1数据库管理$2",
  );
  if (next !== source) {
    fs.writeFileSync(file, next);
    console.log("updated", file);
  }
}
