import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const file = join(dirname(fileURLToPath(import.meta.url)), "../web/pages/gis/one-map.html");
let html = readFileSync(file, "utf8");

function count(src, needle) {
  return src.split(needle).length - 1;
}

const loopOld = "    for(var i=0;i<21;i++){\r\n      var st=ZONES[i]||'';\r\n      zoneLines.push(L.polyline([posAt(i/21),posAt((i+1)/21)],{color:ZONE_COLOR[st],weight:10,opacity:.85,interactive:true})\r\n        .addTo(map).bindTooltip(zoneName(i)+' · '+ZONE_TEXT[st],{sticky:true});\r\n    }";
const loopNew = "    var zoneLines=[];\r\n    for(var i=0;i<21;i++){\r\n      var st=ZONES[i]||'';\r\n      zoneLines.push(L.polyline([posAt(i/21),posAt((i+1)/21)],{color:ZONE_COLOR[st],weight:10,opacity:.85,interactive:true})\r\n        .addTo(map).bindTooltip(zoneName(i)+' · '+ZONE_TEXT[st],{sticky:true}));\r\n    }\r\n    if(window.GIS_MAP_UX)window.GIS_MAP_UX.attachZoneClicks(map,zoneLines,ZONES);";
console.log("pretty loop", count(html, loopOld));
html = html.split(loopOld).join(loopNew);

const hookOld = "    LAYERS.forEach(function(l){groups[l.key]=L.layerGroup().addTo(map);});\r\n    renderPoints();\r\n    setBase('street');";
const hookNew = "    LAYERS.forEach(function(l){groups[l.key]=L.layerGroup().addTo(map);});\r\n    renderPoints();\r\n    map.on('zoomend',renderPoints);\r\n    setBase('street');";
console.log("pretty hook", count(html, hookOld));
html = html.split(hookOld).join(hookNew);

writeFileSync(file, html);
console.log("attachZoneClicks", count(html, "attachZoneClicks"));
console.log("zoomend", count(html, "map.on('zoomend',renderPoints)"));
console.log("unclosed push", count(html, "interactive:true})\r\n        .addTo(map).bindTooltip(zoneName(i)+' · '+ZONE_TEXT[st],{sticky:true});"));
