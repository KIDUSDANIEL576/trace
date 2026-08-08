/* frame.mjs pNN — print one design frame as a readable outline. */
import { readFileSync } from 'node:fs';
const src = readFileSync('project/paper/Trace Paper.dc.html', 'utf8');
const id = process.argv[2];
const m = src.match(new RegExp(`<!-- ${id} [^>]*?-->([\\s\\S]*?)(?=<!-- p\\d+ |$)`));
if (!m) { console.log('no frame ' + id); process.exit(1); }
let depth = 0;
const out = m[1]
  .replace(/\s+/g, ' ')
  .replace(/<(\w+)([^>]*)>/g, (all, tag, attrs) => {
    const st = (attrs.match(/style="([^"]*)"/) || [, ''])[1];
    const keep = st.split(';').filter(s => /background|color|font-size|font-weight|font-family|border-radius|border:|padding|letter-spacing|min-height|height|width|flex|text-transform/.test(s)).join(';');
    return `\n<${tag} ${keep}>`;
  })
  .replace(/<\/\w+>/g, '');
console.log(out.split('\n').filter(l => l.trim()).join('\n'));
