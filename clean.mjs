/* clean.mjs — renders `project/Trace Clean.dc.html` into a live page.
 *
 * Trace Clean is not static markup like Trace Social. It is a DCLogic
 * component: one `renderVals()` returning a bag of values + handlers, and a
 * body templated with `{{ expr }}`, `<sc-for>` and `<sc-if>`. So we don't
 * flatten it — we ship the template, the component, and a ~120-line runtime
 * that expands one against the other. The frames stay interactive, exactly
 * as the design intends ("tap through the frames, they respond").
 *
 *   node clean.mjs [sourceDcHtml] [outDir]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = process.argv[2] || 'project/Trace Clean.dc.html';
const OUT = process.argv[3] || 'site';
const at = (p) => (isAbsolute(p) ? p : join(ROOT, p));
const read = (p) => readFileSync(at(p), 'utf8');

const doc = read(SRC);

/* ----------------------------------------------------------- dissect */

const dcA = doc.indexOf('<x-dc'), dcB = doc.indexOf('</x-dc>');
if (dcA < 0) throw new Error('no <x-dc> envelope in ' + SRC);
const envelope = doc.slice(dcA, dcB);

const helmetCss = [...envelope.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
  .map((m) => m[1]).join('\n');

const body = envelope.slice(envelope.indexOf('</helmet>') + 9);

const sA = doc.indexOf('data-props=');
const logic = doc.slice(doc.indexOf('>', sA) + 1, doc.lastIndexOf('</script>'));
if (!/class Component/.test(logic)) throw new Error('no Component class found');

/* ------------------------------------------------------- inventory */

const frames = [...body.matchAll(
  />(\d{2}[a-z])<\/span><span style="font-size:14px;color:rgba\(237,239,247,\.5\)">([^<]*)</g)]
  .map((m) => ({ id: m[1], turn: 't' + m[1].slice(0, 2), caption: m[2] }));

const turnHeads = [];
{
  const re = /<span style="font-size:12px;[^"]*text-transform:uppercase;[^"]*">Turn (\d+)<\/span>[\s\S]{0,600}?<h2[^>]*>([^<]*)<\/h2>/g;
  let m; while ((m = re.exec(body))) turnHeads.push({ turn: 't' + m[1], title: m[2] });
  /* turn 19 is labelled inline ("Turn 19 — the system"), no <h2> of its own */
  const t19 = /<span style="[^"]*">Turn 19 — ([^<]*)<\/span>/.exec(body);
  if (t19) turnHeads.push({ turn: 't19', title: t19[1] });
}

/* ----------------------------------------------------------- fonts */

const b64 = (p) => readFileSync(at(p)).toString('base64');
const face = (data, range) =>
  `@font-face{font-family:Caveat;font-style:normal;font-weight:500 700;font-display:swap;` +
  `src:url(data:font/woff2;base64,${data}) format('woff2');unicode-range:${range}}`;
const caveatCss =
  face(b64('src/fonts/caveat-latin-ext.woff2'),
    'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF') +
  face(b64('src/fonts/caveat-latin.woff2'),
    'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD');

/* --------------------------------------------------------- runtime */

const runtime = String.raw`
/* Minimal DCLogic + template expander. */
class DCLogic {
  setState(patch) {
    const next = typeof patch === 'function' ? patch(this.state) : patch;
    this.state = Object.assign({}, this.state, next);
    DC.schedule();
  }
}

const DC = (() => {
  let comp = null, tpl = null, mount = null, queued = false;

  const LIT = { true: true, false: false, null: null, undefined: undefined };
  const strip = (s) => (s || '').replace(/^\s*\{\{|\}\}\s*$/g, '').trim();

  function get(path, scope) {
    const p = (path || '').trim();
    if (p in LIT) return LIT[p];
    if (/^-?\d+(\.\d+)?$/.test(p)) return +p;
    if (/^'[^']*'$/.test(p)) return p.slice(1, -1);
    let v = scope;
    for (const k of p.split('.')) { if (v == null) return undefined; v = v[k]; }
    return v;
  }
  const interp = (s, scope) =>
    s.replace(/\{\{([^}]*)\}\}/g, (_, e) => { const v = get(e, scope); return v == null ? '' : String(v); });

  function hover(el, decls) {
    const base = el.getAttribute('style') || '';
    el.addEventListener('mouseenter', () => el.setAttribute('style', base + ';' + decls));
    el.addEventListener('mouseleave', () => el.setAttribute('style', base));
  }

  /* Returns the list of nodes that replace this node in its parent. */
  function walk(node, scope) {
    if (node.nodeType === 3) {
      const t = node.nodeValue;
      if (t.indexOf('{{') < 0) return [node];
      return [document.createTextNode(interp(t, scope))];
    }
    if (node.nodeType !== 1) return [node];
    const tag = node.tagName.toLowerCase();

    if (tag === 'sc-for') {
      const list = get(strip(node.getAttribute('list')), scope) || [];
      const as = node.getAttribute('as') || 'item';
      const kids = [...node.childNodes];
      const out = [];
      [...list].forEach((item, i) => {
        const s = Object.create(scope);
        s[as] = item; s.$i = i; s.$n = i + 1;
        for (const k of kids) out.push(...walk(k.cloneNode(true), s));
      });
      return out;
    }
    if (tag === 'sc-if') {
      if (!get(strip(node.getAttribute('value')), scope)) return [];
      const out = [];
      for (const k of [...node.childNodes]) out.push(...walk(k.cloneNode(true), scope));
      return out;
    }

    for (const a of [...node.attributes]) {
      const n = a.name;
      if (n.startsWith('hint-')) { node.removeAttribute(n); continue; }
      if (n === 'onclick') {
        node.removeAttribute(n);
        const fn = get(strip(a.value), scope);
        if (typeof fn === 'function') {
          node.addEventListener('click', (e) => { e.stopPropagation(); fn(e); });
          if (!/cursor:/.test(node.getAttribute('style') || '')) node.style.cursor = 'pointer';
        }
        continue;
      }
      if (n === 'style-hover') { node.removeAttribute(n); hover(node, a.value); continue; }
      if (a.value.indexOf('{{') >= 0) node.setAttribute(n, interp(a.value, scope));
    }

    const out = [];
    for (const k of [...node.childNodes]) out.push(...walk(k, scope));
    node.replaceChildren(...out);
    return [node];
  }

  /* Turn headings carry no id of their own — derive one so the nav can
     reach them. Re-run every render, since render replaces the subtree. */
  function anchor() {
    const seen = new Set();
    for (const el of mount.querySelectorAll('span')) {
      const m = /^Turn (\d+)\b/.exec((el.textContent || '').trim());
      if (!m || seen.has(m[1])) continue;
      seen.add(m[1]);
      const host = el.closest('div');
      if (host) { host.id = 'nav-t' + m[1]; host.style.scrollMarginTop = '64px'; }
    }
    for (const f of mount.querySelectorAll('[id]'))
      if (/^\d{2}[a-z]$/.test(f.id)) f.style.scrollMarginTop = '64px';
  }

  function render() {
    queued = false;
    const scope = comp.renderVals();
    const frag = tpl.content.cloneNode(true);
    const out = [];
    for (const k of [...frag.childNodes]) out.push(...walk(k, scope));
    /* keep scroll position across re-renders */
    const y = window.scrollY;
    mount.replaceChildren(...out);
    anchor();
    window.scrollTo(0, y);
  }

  return {
    schedule() { if (!queued) { queued = true; requestAnimationFrame(render); } },
    boot(c) {
      comp = c;
      tpl = document.getElementById('dc-tpl');
      mount = document.getElementById('dc-mount');
      render();
    },
  };
})();
`;

/* ------------------------------------------------------------ nav */

const nav = turnHeads.map((t) =>
  `<a href="#nav-${t.turn}"><b>${t.turn.slice(1)}</b>${t.title}</a>`).join('');

/* ------------------------------------------------------- assemble */

const page = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>trace — clean redesign</title>
<style>${caveatCss}</style>
<style>
${helmetCss}
html{background:#0A0A0C;-webkit-font-smoothing:antialiased}
#dc-mount>div{max-width:none}
#tcn{position:fixed;z-index:50;top:0;left:0;right:0;display:flex;gap:4px;overflow-x:auto;
  padding:9px 14px;background:rgba(10,10,12,.82);backdrop-filter:blur(14px);
  border-bottom:1px solid rgba(255,255,255,.08);
  font:500 12px/1 -apple-system,'SF Pro Text','Segoe UI',system-ui,sans-serif;scrollbar-width:none}
#tcn::-webkit-scrollbar{display:none}
#tcn a{flex:none;display:flex;align-items:center;gap:6px;padding:7px 11px;border-radius:999px;
  color:rgba(237,239,247,.6);text-decoration:none;white-space:nowrap;border:1px solid transparent}
#tcn a:hover{background:rgba(255,255,255,.07);color:#EDEFF7;border-color:rgba(255,255,255,.1)}
#tcn b{color:#E23343;font-weight:700;letter-spacing:.06em}
#dc-mount{padding-top:22px}
[id^="nav-"]{scroll-margin-top:64px}
</style>
</head><body>

<nav id="tcn">${nav}</nav>

<template id="dc-tpl">${body}</template>
<div id="dc-mount"></div>

<script>
${runtime}
${logic}
DC.boot(new Component());
</script>
</body></html>
`;

mkdirSync(at(OUT), { recursive: true });
writeFileSync(join(at(OUT), 'clean.html'), page);
writeFileSync(join(at(OUT), 'clean.json'),
  JSON.stringify({ turns: turnHeads, frames }, null, 2) + '\n');

console.log(`${OUT}/clean.html    ${(page.length / 1024).toFixed(0)} KB`);
console.log(`turns              ${turnHeads.map((t) => t.turn).join(' ')}`);
console.log(`frames             ${frames.length}`);
console.log(`sc-for / sc-if     ${(body.match(/<sc-for/g) || []).length} / ${(body.match(/<sc-if/g) || []).length}`);
console.log(`handlers           ${(body.match(/onClick=/g) || []).length}`);
