/**
 * Injects shared ZIP→地名表 into safety-linebox bundle and extends scatter tooltip.
 * Prerequisite: node scripts/build-zip-names.js
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const bundlePath = path.join(root, "apps/04-safety-linebox/assets/index-Dg8BkWQj.js");
const snippetPath = path.join(root, "apps/02-population-rings/assets/__zipName-snippet.txt");

let bundle = fs.readFileSync(bundlePath, "utf8");
const snippet = fs.readFileSync(snippetPath, "utf8").trim();

const anchor = "async function xs(){";
const pos = bundle.indexOf(anchor);
if (pos === -1) throw new Error("anchor async function xs not found");
if (!bundle.includes(snippet.slice(0, 40))) {
  bundle = bundle.slice(0, pos) + snippet + ";" + bundle.slice(pos);
}

const oldTip =
  "M=[`ZIP：${_.zip}`,`所属区：${sn[_.borough]}`,`经度：${_.lon.toFixed(6)}`,`纬度：${_.lat.toFixed(6)}`,`${s}每千人案件数：${_.rate.toFixed(3)}`];";
const newTip =
  "__z2=String(_.zip),__ar2=__zipName[__z2],M=[`ZIP：${_.zip}`,`所属区：${sn[_.borough]}`,...(__ar2?[`地区：${__ar2}`]:[]),`经度：${_.lon.toFixed(6)}`,`纬度：${_.lat.toFixed(6)}`,`${s}每千人案件数：${_.rate.toFixed(3)}`];";

if (!bundle.includes(oldTip)) throw new Error("tooltip anchor not found (bundle changed?)");
bundle = bundle.replace(oldTip, newTip);

fs.writeFileSync(bundlePath, bundle, "utf8");
console.log("patched safety bundle", bundle.length);
