/* qa/registry.mjs — lint the registries the modules write into.
 *
 * Nine files register screens, rows, navs, panels and directory entries into
 * shared maps, and every one of those maps is last-write-wins. A duplicate key
 * does not error — it silently shadows whatever got there first, so a screen
 * disappears and nothing says so. The same is true of `R.defaults`: two
 * modules claiming one db key with different shapes is exactly the bug that
 * made the money-shock screen read p24's numbers.
 *
 * This is a static check on purpose. It runs in milliseconds, needs no
 * browser, and catches the class before it can reach a screenshot.
 *
 *   node qa/registry.mjs        exits non-zero if anything collides
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const files = readdirSync(SRC).filter((f) => f.endsWith('.js')).sort();

/* Object literals nest, so a naive line scan would pick up inner keys. Track
   bracket depth and only take names at the top level of the literal. */
function topLevelKeys(body) {
  const out = [];
  let depth = 0;
  for (const raw of body.split('\n')) {
    const line = raw.replace(/\/\*.*?\*\//g, '').trim();
    if (depth === 0) {
      const m = line.match(/^([A-Za-z_]\w*)\s*:/);
      if (m) out.push(m[1]);
    }
    depth += (line.match(/[{[]/g) || []).length - (line.match(/[}\]]/g) || []).length;
  }
  return out;
}

const seen = {};
const note = (kind, key, file) => {
  if (!seen[kind]) seen[kind] = new Map();
  if (!seen[kind].has(key)) seen[kind].set(key, []);
  seen[kind].get(key).push(file);
};
/* declared up front so an empty category still prints its zero */
for (const k of ['db key', 'screen', 'screen id', 'nav', 'row', 'panel', 'directory row']) seen[k] = new Map();

for (const f of files) {
  const s = readFileSync(join(SRC, f), 'utf8');

  /* the base store, and every module that extends it */
  const base = s.match(/const DEFAULTS = \(\) => \(\{([\s\S]*?)\n\}\);/);
  if (base) for (const k of topLevelKeys(base[1])) note('db key', k, f);
  for (const m of s.matchAll(/R\.defaults\(\{([\s\S]*?)\n\}\);/g)) {
    for (const k of topLevelKeys(m[1])) note('db key', k, f);
  }

  for (const m of s.matchAll(/R\.addScreen\('(\w+)'/g)) note('screen', m[1], f);
  for (const m of s.matchAll(/R\.addNav\('(\w+)'/g)) note('nav', m[1], f);
  for (const m of s.matchAll(/R\.addRow\('\w+', '(\w+)'/g)) note('row', m[1], f);
  for (const m of s.matchAll(/R\.addSub\('(\w+)'/g)) note('panel', m[1], f);
  for (const m of s.matchAll(/R\.addBeyond\('([^']+)'/g)) note('directory row', m[1], f);
  /* section ids are created in a loop in each module that owns screens */
  for (const m of s.matchAll(/for \(const id of \[([^\]]+)\]\)/g)) {
    for (const k of m[1].matchAll(/'(\w+)'/g)) note('screen id', k[1], f);
  }
}

let bad = 0;
for (const [kind, map] of Object.entries(seen)) {
  const dupes = [...map].filter(([, where]) => new Set(where).size > 1);
  console.log(`${String(map.size).padStart(3)} ${kind}${map.size === 1 ? '' : 's'}` +
    (dupes.length ? `  — ${dupes.length} COLLISION${dupes.length === 1 ? '' : 'S'}` : ''));
  for (const [k, where] of dupes) { bad++; console.log(`      ${k}  claimed by ${[...new Set(where)].join(', ')}`); }
}

/* a row you can tap that goes nowhere is dead UI, and an unreachable
   destination is dead code — both are silent */
const rows = new Set(seen.row.keys());
const dests = new Set([...seen.nav.keys(), ...seen.panel.keys()]);
const dead = [...rows].filter((k) => !dests.has(k));
const unreachable = [...seen.nav.keys()].filter((k) => !rows.has(k));
if (dead.length) { bad++; console.log(`\nrows that go nowhere: ${dead.join(', ')}`); }
if (unreachable.length) { bad++; console.log(`\ndestinations with no row: ${unreachable.join(', ')}`); }

console.log(bad ? `\n${bad} problem${bad === 1 ? '' : 's'}` : '\nevery registry key is unique and every row leads somewhere');
process.exit(bad ? 1 : 0);
