// Builds assets/log.json: when each career rank and stat tier was first reached.
// Walks the git history of assets/data.js (oldest first), counts PROJECTS,
// ACTIVITIES and CERTS at every commit, and records that commit's time the first
// time a rank or gauge tier is reached. Run from the repo root:
//   node tools/build-log.js
// Keep RANKS and STEPS in sync with assets/site.js.
const { execFileSync } = require("child_process");
const fs = require("fs");
const vm = require("vm");

const RANKS = [["Junior", 1], ["Mid Junior", 26], ["Senior", 51], ["Manager", 101], ["CEO", 201]];
const STEPS = [3, 5, 10, 15, 20, 25, 35, 50, 100, 500];
const CATS = { projects: "PROJECTS", activities: "ACTIVITIES", certificates: "CERTS" };
const FILE = "assets/data.js";

const git = (...a) => execFileSync("git", a, { encoding: "utf8", maxBuffer: 64 << 20 });
const count = src => vm.runInNewContext(src + "\n;({" +
  Object.entries(CATS).map(([k, v]) => `${k}: typeof ${v} === "undefined" ? 0 : ${v}.length`).join(",") + "})", {}, { timeout: 2000 });

const commits = git("log", "--reverse", "--format=%H %aI", "--", FILE).trim().split("\n").filter(Boolean).map(l => l.split(" "));
let bestRank = 0; const bestTier = { projects: 0, activities: 0, certificates: 0 }; const events = [];
for (const [sha, t] of commits) {
  let c;
  try { c = count(git("show", `${sha}:${FILE}`)); } catch (e) { console.warn(`skip ${sha.slice(0, 7)}: ${e.message}`); continue; }
  const lv = c.projects + c.activities + c.certificates;
  RANKS.forEach(([rank, min], i) => { if (i + 1 > bestRank && lv >= min) { events.push({ t, kind: "rank", rank, step: i + 1, lv }); bestRank = i + 1; } });
  for (const cat of Object.keys(CATS)) {
    const tier = STEPS.filter(s => c[cat] >= s).length;
    for (let k = bestTier[cat] + 1; k <= tier; k++) events.push({ t, kind: "tier", cat, tier: k, need: STEPS[k - 1], n: c[cat] });
    bestTier[cat] = Math.max(bestTier[cat], tier);
  }
}
fs.writeFileSync("assets/log.json", JSON.stringify(events, null, 1) + "\n");
console.log(`${events.length} events from ${commits.length} commits -> assets/log.json`);
