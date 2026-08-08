/* coverage.mjs — which of the 61 paper frames have a surface in the app.
 *
 * Each frame is identified by the copy printed on it. A frame counts as built
 * when enough of its distinctive lines appear somewhere in the built bundle;
 * a frame with none of them has no surface at all. This is a coarse signal by
 * design — it finds the holes, it does not grade the fidelity. */
import { readFileSync } from 'node:fs';

const design = readFileSync('project/paper/Trace Paper.dc.html', 'utf8');
const app = readFileSync('site/app.html', 'utf8').toLowerCase();

const norm = (s) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').toLowerCase().trim();
/* the chrome every frame repeats, plus pure glyphs and numbers */
const CHROME = new Set(['9:41','trace','canvas','rooms','household','together','memory','wellbeing']);

const frames = [...design.matchAll(/<!-- (p\d+) ([^>]*?)-->([\s\S]*?)(?=<!-- p\d+ |$)/g)];
const rows = [];
for (const [, id, label, body] of frames) {
  const texts = [...body.matchAll(/>([^<>{}]{6,60})</g)].map((m) => norm(m[1]))
    .filter((t) => /[a-z]{3}/.test(t) && !CHROME.has(t) && !/^p\d+$/.test(t));
  const uniq = [...new Set(texts)];
  if (!uniq.length) continue;
  const hit = uniq.filter((t) => app.includes(t));
  rows.push({ id, label: label.trim(), n: uniq.length, hit: hit.length,
    pct: Math.round((hit.length / uniq.length) * 100), missing: uniq.filter((t) => !app.includes(t)) });
}
rows.sort((a, b) => (+a.id.slice(1)) - (+b.id.slice(1)));

const bad = rows.filter((r) => r.pct < 25);
const mid = rows.filter((r) => r.pct >= 25 && r.pct < 60);
const ok  = rows.filter((r) => r.pct >= 60);
const line = (r) => `  ${r.id.padEnd(4)} ${String(r.pct).padStart(3)}%  ${r.label.slice(0, 30).padEnd(30)} ${r.hit}/${r.n}`;
console.log(`NO SURFACE (<25%)   ${bad.length}`); bad.forEach((r) => console.log(line(r)));
console.log(`\nPARTIAL (25-59%)    ${mid.length}`); mid.forEach((r) => console.log(line(r)));
console.log(`\nBUILT (>=60%)       ${ok.length}`); ok.forEach((r) => console.log(line(r)));
if (process.argv[2]) {
  const r = rows.find((x) => x.id === process.argv[2]);
  console.log(`\n${r.id} missing copy:\n` + r.missing.map((t) => '  · ' + t).join('\n'));
}
