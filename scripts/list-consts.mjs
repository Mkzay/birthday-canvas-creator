import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const t = fs.readFileSync(path.join(__dirname, "../src/pages/BirthdayPage.tsx"), "utf8").split(/\r?\n/);
const names = new Set();
for (let i = 88; i < 2310 && i < t.length; i++) {
  const m = t[i].match(/const ([A-Za-z_$][\w$]*)\s*=/);
  if (m) names.add(m[1]);
}
console.log([...names].sort().join("\n"));
console.log("COUNT", names.size);
