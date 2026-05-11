/**
 * Regenerates `const __zipName={...}` in the population-rings bundle.
 * Run from repo root: node scripts/patch-rings-bundle.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.join(__dirname, "..");
execFileSync(process.execPath, [path.join("scripts", "build-zip-names.js")], {
  cwd: root,
  stdio: "inherit",
});

const bundlePath = path.join(root, "apps/02-population-rings/assets/index-BXgzSlPU.js");
const snippetPath = path.join(root, "apps/02-population-rings/assets/__zipName-snippet.txt");

let s = fs.readFileSync(bundlePath, "utf8");
const snippet = fs.readFileSync(snippetPath, "utf8").trim();
const start = s.indexOf("const __zipName=");
const end = s.indexOf("};p.forEach", start);
if (start === -1 || end === -1) throw new Error("anchor not found");
const before = s.slice(0, start);
const after = s.slice(end + 2);
s = before + snippet + ";" + after;
fs.writeFileSync(bundlePath, s, "utf8");
console.log("patched __zipName ok", s.length);
