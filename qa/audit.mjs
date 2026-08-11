/* qa/audit.mjs — turn qa/inventory.json into a review sheet you can work.
 *
 *   node qa/inventory.mjs && node qa/audit.mjs
 *   → site/audit.html
 *
 * One sheet per surface: screenshot left, what it offers right, Keep / Rework
 * / Cut against each line. Decisions save in localStorage; Export gives back
 * text to paste.
 *
 * The sheets are filed by JOB, not by where a screen happens to live in the
 * nav. Sorting by navigation scattered every family of related features
 * across four groups — the five task lists sat in three places, the four
 * retrospectives in two — and the whole point of the audit is to see those
 * families side by side. Each category can also name overlap CLUSTERS: N
 * features doing the same job, judged as a set (become one / keep apart /
 * cut all), which is the audit's sharpest question and deserves its own
 * verdict rather than being reconstructed from single votes.
 *
 * Two things borrowed from the app rather than invented:
 *
 *   the palette   paper, ink, and one red. Keep is ink, Cut is red, Rework is
 *                 an outline — no traffic lights, red has to keep meaning
 *                 "this matters".
 *   the type rule system sans for what the app says, Caveat for what a person
 *                 wrote. Your notes are in your hand; the copy is the app's.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { drawnEdge, drawnRule, drawnMark } from '../src/icons.mjs';

const inv = JSON.parse(readFileSync('qa/inventory.json', 'utf8'));

/* the two Caveat faces the app already inlines — lifted, not refetched */
const built = readFileSync('site/app.html', 'utf8');
const caveat = [...built.matchAll(/@font-face\{font-family:Caveat;[^}]*\}/g)].map((m) => m[0]).join('');

const cssUrl = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)
  .replace(/\(/g, '%28').replace(/\)/g, '%29')}")`;

const edge = (id, colour, o = {}) => cssUrl(drawnEdge(id, { size: 64, inset: 3, radius: 14, width: 0.75, colour, ...o }));
const rule = (id, colour) => cssUrl(drawnRule(id, { w: 120, h: 6, width: 0.8, colour }));
const mark = (colour) => cssUrl(drawnMark(colour));

/* Every non-ASCII character becomes a numeric reference, so the page does not
   depend on anybody declaring a charset. The app's copy is full of curly
   quotes and em-dashes, and served without `charset=utf-8` they arrive as
   mojibake. An artifact is wrapped in someone else's <head>; this is the one
   encoding decision that survives that. Entities do not work inside <style>
   or <script>, so those two blocks are kept ASCII by hand. */
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  .replace(/[-￿]/g, (c) => '&#' + c.charCodeAt(0) + ';');

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* Eight panels are keyed, not named — no room row ever spells them out, so
   the walk records them as `flare`, `sleep`, `car`. A sheet titled "sleep"
   reads like a bug; give them the names the design uses. */
const NICE = {
  'panel:guest': 'Guest mode', 'panel:flare': 'The flare', 'panel:sleep': 'Her state',
  'panel:car': 'Car mode', 'panel:stack': 'Widget stack', 'panel:loud': 'How loud',
  'panel:key': 'Your key', 'panel:unpair': 'Unpair',
};

/* ------------------------------------------------------------ the taxonomy
 *
 * Ids are inventory ids, exactly as walked. Order inside a category is the
 * order to judge in: the hub first, then its satellites. A feature may sit in
 * one category only, but may appear in any number of clusters — "Money
 * changed" files under Money and still belongs to the seasons cluster.
 */
const CATS = [
  { name: 'Getting in', desc: 'The ninety seconds before the app is yours.',
    ids: ['splash'], clusters: [] },

  { name: 'The canvas', desc: 'Home. The drawing, and the tools that only exist while you are drawing.',
    ids: ['canvas', 'dock', 'brushpop', 'writepad', 'Canvas extras'], clusters: [] },

  { name: 'Tasks & handing over', desc: 'Lists, blockers, fairness, and moving work between you.',
    ids: ['Household', 'Household:Two-minute pile', 'panel:debt', 'panel:waiting', 'panel:rsvp',
      'Household:Fair split', 'panel:load', 'Household:Handover baton', 'panel:brief', 'panel:ask',
      'panel:where', 'panel:letter'],
    clusters: [
      { t: 'Five lists of things to do',
        line: 'Left to do, the Two-minute pile, Decision debt, the Waiting room and the Yes / no board are five flavours of one list.',
        ids: ['Household', 'Household:Two-minute pile', 'panel:debt', 'panel:waiting', 'panel:rsvp'] },
      { t: 'Who carries what, three times',
        line: 'The 60% bar on Household, Fair split and Mental load all measure the same imbalance.',
        ids: ['Household', 'Household:Fair split', 'panel:load'] },
      { t: 'Four ways to hand the day over',
        line: 'The baton, the morning handoff, the brief and ask-nicely all move work from one of you to the other.',
        ids: ['Household:Handover baton', 'panel:handoff', 'panel:brief', 'panel:ask'] },
    ] },

  { name: 'Food', desc: 'One question, asked every day.',
    ids: ['Household:Groceries', 'Household:What’s for dinner', 'Household:Meal wheel'],
    clusters: [
      { t: 'Dinner, answered twice',
        line: 'What’s-for-dinner and the Meal wheel answer the same question.',
        ids: ['Household:What’s for dinner', 'Household:Meal wheel'] },
    ] },

  { name: 'Time & plans', desc: 'The calendar, and everything that feeds it.',
    ids: ['panel:week7', 'Household:Find us a time', 'Household:New event', 'Household:A clash',
      'Together:Trips', 'Memory:Anniversaries'],
    clusters: [
      { t: 'Three windows onto one calendar',
        line: 'The week, Find-us-a-time and the Clash are the same seven days, drawn three ways.',
        ids: ['panel:week7', 'Household:Find us a time', 'Household:A clash'] },
    ] },

  { name: 'Money', desc: 'Every place money shows up.',
    ids: ['panel:money', 'Settle up', 'panel:renewals', 'Money changed'],
    clusters: [
      { t: 'Money in three rooms',
        line: 'Money truth, Settle up and Money-changed carry one subject across three screens.',
        ids: ['panel:money', 'Settle up', 'Money changed'] },
    ] },

  { name: 'Together & rituals', desc: 'Promises, missions, and the small repeated things.',
    ids: ['Together', 'Together:Co-signed promise', 'Together:Bucket list', 'Together:Missions',
      'panel:weekly10', 'panel:tiny', 'panel:rituals', 'Wellbeing:Couple focus', 'panel:pocket'],
    clusters: [
      { t: 'Three shapes of a promise',
        line: 'Co-signed promise, Bucket list and Missions are one commitment mechanic in three costumes.',
        ids: ['Together:Co-signed promise', 'Together:Bucket list', 'Together:Missions'] },
      { t: 'Four standing dates',
        line: 'Weekly ten minutes, the Tiny one, Your rituals and Couple focus are four repeating appointments.',
        ids: ['panel:weekly10', 'panel:tiny', 'panel:rituals', 'Wellbeing:Couple focus'] },
    ] },

  { name: 'Memory', desc: 'What the days leave behind.',
    ids: ['Memory', 'Memory:Gratitude jar', 'panel:journal', 'panel:chapters', 'panel:legacy',
      'panel:movie', 'panel:wall', 'panel:daymap', 'Memory:The year, in marks'],
    clusters: [
      { t: 'Four retellings of the same days',
        line: 'Journal, Chapters, the Year-as-a-book and Memory movie retell the same days at four speeds.',
        ids: ['panel:journal', 'panel:chapters', 'panel:legacy', 'panel:movie'] },
      { t: 'Two walls of marks',
        line: 'The wall and the Year-in-marks hang the same marks twice.',
        ids: ['panel:wall', 'Memory:The year, in marks'] },
    ] },

  { name: 'Wellbeing', desc: 'How each of you is doing, said out loud.',
    ids: ['Wellbeing', 'panel:energy', 'panel:sleep', 'panel:handoff', 'panel:doctor', 'Household:Doses'],
    clusters: [
      { t: 'Three ways to say how today is',
        line: 'Energy match, Her state and the Morning handoff each report the same weather.',
        ids: ['panel:energy', 'panel:sleep', 'panel:handoff'] },
    ] },

  { name: 'The hard parts', desc: 'Conflict, silence, and the exits.',
    ids: ['Repair', 'The unsaid', 'The drift', 'Cover me', 'Every interruption', 'panel:flare',
      'Solo nights', 'If it ends'],
    clusters: [
      { t: 'Three doors into one conversation',
        line: 'Repair, the Unsaid and the Drift all open the talk you are not having.',
        ids: ['Repair', 'The unsaid', 'The drift'] },
    ] },

  { name: 'When life happens', desc: 'Seasons that change what the app should be.',
    ids: ['Newborn mode', 'A hard anniversary', 'Moving'],
    clusters: [
      { t: 'Four seasons, one mechanism',
        line: 'Newborn, a hard anniversary, moving and money-changed each quiet the machinery. That is one mode with four names.',
        ids: ['Newborn mode', 'A hard anniversary', 'Moving', 'Money changed'] },
    ] },

  { name: 'Other people', desc: 'Everyone who is not the two of you.',
    ids: ['Your people', 'Let one person in', 'Ageing parents', 'A visitor', 'panel:guest', 'panel:kids'],
    clusters: [
      { t: 'The same houseguest twice',
        line: 'A visitor and Guest mode host the same person.',
        ids: ['A visitor', 'panel:guest'] },
    ] },

  { name: 'Widgets & surfaces', desc: 'The app outside the app: home screen, watch, car.',
    ids: ['Your board', 'Every widget state', 'panel:stack', 'Every surface', 'panel:car',
      'Her home screen', 'The daily loop'],
    clusters: [
      { t: 'The widget, three times',
        line: 'Your board, Every-widget-state and the Widget stack describe one widget.',
        ids: ['Your board', 'Every widget state', 'panel:stack'] },
    ] },

  { name: 'Quiet & private', desc: 'What it never does, and who holds the keys.',
    ids: ['Quiet & private', 'panel:loud', 'panel:key', 'panel:unpair'],
    clusters: [
      { t: 'Volume, twice',
        line: 'Quiet-and-private and How-loud both set the volume.',
        ids: ['Quiet & private', 'panel:loud'] },
    ] },
];

/* -------------------------------------------------- resolve, and fail loud */
const byId = new Map(inv.surfaces.map((s) => [s.id, s]));
const filed = new Set();
for (const c of CATS) {
  c.slug = slug(c.name);
  c.surfaces = [];
  for (const id of c.ids) {
    const s = byId.get(id);
    if (!s) { console.error(`taxonomy names a surface the walk never found: ${id}`); process.exit(1); }
    if (filed.has(id)) { console.error(`filed twice: ${id}`); process.exit(1); }
    filed.add(id);
    c.surfaces.push(s);
  }
  for (const cl of c.clusters) {
    cl.slug = slug(cl.t);
    cl.members = cl.ids.map((id) => {
      const s = byId.get(id);
      if (!s) { console.error(`cluster "${cl.t}" names a surface the walk never found: ${id}`); process.exit(1); }
      return s;
    });
  }
}
const unfiled = inv.surfaces.filter((s) => !filed.has(s.id));
if (unfiled.length) {
  /* a new walk found surfaces the taxonomy has no opinion on — show them,
     loudly, rather than dropping them */
  CATS.push({ name: 'Unsorted', slug: 'unsorted', desc: 'Walked, but not yet filed. File them in qa/audit.mjs.',
    surfaces: unfiled, clusters: [] });
  console.error(`WARNING: ${unfiled.length} surfaces unfiled: ${unfiled.map((s) => s.id).join(', ')}`);
}

const label = (s) => NICE[s.id] || s.label;

const KIND = {
  opens: 'opens a screen', switch: 'a switch', action: 'a button',
  card: 'a card', note: 'a note', input: 'a field', row: 'sample',
};

/* A room's list of sub-rows is a table of contents, and each entry already
   has a sheet of its own. The row becomes a link; the sheet keeps the vote. */
const byLabel = new Map();
for (const s of inv.surfaces) if (!byLabel.has(s.label)) byLabel.set(s.label, s.id);
let judged = 0;

const surfaceHTML = (s, n, total) => {
  const all = s.capabilities || [];
  const caps = [];
  const links = [];
  for (const u of all) {
    const to = u.kind === 'opens' ? byLabel.get(u.name) : null;
    if (to && to !== s.id) links.push({ ...u, to }); else caps.push(u);
  }
  judged += caps.length;
  const content = s.content || [];
  const same = (a, x) => (a || '').toLowerCase() === (x || '').toLowerCase();
  const meta = [s.kicker, same(s.title, label(s)) || same(s.title, s.label) ? '' : s.title]
    .filter(Boolean).map(esc).join(' &middot; ');
  return `
<section class="sheet" id="s-${esc(s.id)}" data-surface="${esc(s.id)}" data-cat="${esc(s._cat)}">
  <div class="shot">
    ${s.image ? `<img src="${s.image}" alt="${esc(label(s))}" loading="lazy" width="${s.shotW || 390}" height="${s.shotH || 844}">`
      : `<div class="noshot">no screenshot<br><span>run without --fast</span></div>`}
  </div>
  <div class="detail">
    <header class="sh">
      <div class="num">${n}<i>/${total}</i></div>
      <div class="names">
        <h3>${esc(label(s))}</h3>
        ${meta ? `<p class="meta">${meta}</p>` : ''}
        <p class="where"><code>${esc(s.path || s.id)}</code>${s.overlay ? '<span class="tag">overlay</span>' : ''}</p>
      </div>
    </header>
    ${s.blurb ? `<p class="blurb">${esc(s.blurb)}</p>` : ''}

    <div class="verdictrow" data-scope="surface" data-key="${esc(s.id)}">
      <span class="vlabel">This whole screen</span>
      ${['keep', 'rework', 'cut'].map((v) => `<button class="v v-${v}" data-v="${v}">${v}</button>`).join('')}
      <button class="v v-clear" data-v="">clear</button>
    </div>

    ${caps.length ? `
    <div class="caps">
      <div class="capshead"><span>What it offers</span>
        <span class="bulk"><button class="mini" data-bulk="keep">keep all</button><button class="mini" data-bulk="cut">cut all</button></span>
      </div>
      <ul>
        ${caps.map((u, i) => `
        <li class="cap" data-scope="cap" data-key="${esc(s.id)}#${i}">
          <span class="k k-${u.kind}">${esc(KIND[u.kind] || u.kind)}</span>
          <span class="txt"><b>${esc(u.name)}</b>${u.sub ? `<i>${esc(u.sub)}</i>` : ''}</span>
          <span class="vs">${['keep', 'rework', 'cut'].map((v) =>
    `<button class="v v-${v}" data-v="${v}" title="${v}">${v[0].toUpperCase()}</button>`).join('')}</span>
        </li>`).join('')}
      </ul>
    </div>` : ''}

    ${links.length ? `
    <div class="links">
      <div class="capshead"><span>Leads to &mdash; judged on their own sheets</span></div>
      <ul>${links.map((u) => `<li><a href="#s-${esc(u.to)}" title="${esc(u.sub)}">${esc(u.name)}</a></li>`).join('')}</ul>
    </div>` : ''}

    ${!caps.length && !links.length ? '<p class="blurb">Nothing to judge here but the screen itself.</p>' : ''}

    ${content.length ? `
    <details class="sample">
      <summary>${content.length} rows of sample content <span>&mdash; the same decision drawn ${content.length} times</span></summary>
      <ul>${content.map((u) => `<li><b>${esc(u.name)}</b>${u.sub ? ` <i>${esc(u.sub)}</i>` : ''}</li>`).join('')}</ul>
    </details>` : ''}

    <label class="notewrap">
      <span>Your note</span>
      <textarea class="note" data-note="${esc(s.id)}" rows="1"
        placeholder="what you'd change, what's missing, what it should have been"></textarea>
    </label>
  </div>
</section>`;
};

const clusterHTML = (cl) => `
<aside class="cluster" data-ckey="${esc(cl.slug)}"
  data-ctitle="${esc(cl.t)}"
  data-members="${esc(cl.ids.join('||'))}"
  data-mlabels="${esc(cl.members.map((m) => label(m)).join(', '))}">
  <div class="clbadge">${cl.members.length} features &middot; one job</div>
  <div class="clhead">
    <h4>${esc(cl.t)}</h4>
    <p>${esc(cl.line)}</p>
  </div>
  <div class="clchips">
    ${cl.members.map((m) => `<a href="#s-${esc(m.id)}">${esc(label(m))}</a>`).join('')}
  </div>
  <div class="clverdict">
    <button class="v c-one" data-cv="one">become one</button>
    <button class="v c-apart" data-cv="apart">keep apart</button>
    <button class="mini" data-ccut="1">cut all ${cl.members.length}</button>
    <button class="v v-clear" data-cv="">clear</button>
  </div>
  <label class="notewrap">
    <span>Which one survives, and what does it absorb?</span>
    <textarea class="note" data-note="cluster:${esc(cl.slug)}" rows="1"
      placeholder="e.g. keep the wheel, fold the list into it"></textarea>
  </label>
</aside>`;

let body = '';
for (const c of CATS) {
  for (const s of c.surfaces) s._cat = c.slug;
  body += `
<div class="group" id="c-${esc(c.slug)}" data-catgroup="${esc(c.slug)}">
  <header class="cathead">
    <div class="catname"><h2>${esc(c.name)}</h2>
      <em>${c.surfaces.length} screen${c.surfaces.length === 1 ? '' : 's'}${c.clusters.length
    ? ` &middot; ${c.clusters.length} overlap${c.clusters.length === 1 ? '' : 's'}` : ''}</em></div>
    <p class="catdesc">${esc(c.desc)}</p>
  </header>
  ${c.clusters.map(clusterHTML).join('')}
  ${c.surfaces.map((s, i) => surfaceHTML(s, i + 1, c.surfaces.length)).join('')}
</div>`;
}

const totalSurfaces = inv.surfaces.length;
const totalClusters = CATS.reduce((n, c) => n + c.clusters.length, 0);

const index = CATS.map((c) => `
  <a class="ix" href="#c-${esc(c.slug)}" data-ix="${esc(c.slug)}">
    <span class="ixt">${esc(c.name)}</span>
    <span class="ixd">${esc(c.desc)}</span>
    <span class="ixrow"><span class="ixn"><b data-ixdone>0</b>/${c.surfaces.length}</span>
      ${c.clusters.length ? `<span class="ixc">${c.clusters.length} overlap${c.clusters.length === 1 ? '' : 's'}</span>` : ''}</span>
    <span class="ixbar"><i data-ixbar></i></span>
  </a>`).join('');

const html = `<title>Trace &mdash; feature audit</title>
<style>
${caveat}
:root{
  --ground:#FBF4EA; --ground-alt:#F2EADC; --surface:#FFFFFF;
  --ink:#1A1A1A; --ink-70:rgba(26,26,26,.7); --ink-3:rgba(26,26,26,.45); --ink-5:rgba(26,26,26,.28);
  --hairline:rgba(26,26,26,.1); --red:#E23343; --red-text:#B3202E;
  --red-wash:rgba(226,51,67,.1); --on-red:#FFFFFF;
  --emph:#1A1A1A; --emph-ink:#FBF4EA;
  --edge:${edge('audit-sheet', '#1A1A1A')};
  --edge-soft:${edge('audit-soft', 'rgba(26,26,26,.34)')};
  --edge-red:${edge('audit-red', '#E23343')};
  --edge-note:${edge('audit-note', 'rgba(26,26,26,.5)', { dash: 3.4, width: 0.7 })};
  --rule:${rule('audit-rule', 'rgba(26,26,26,.28)')};
  --mark:${mark('#E23343')};
  --sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  --hand:Caveat,ui-rounded,cursive;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --ground:#15120E; --ground-alt:#1B1713; --surface:#211C17;
  --ink:#F5EFE4; --ink-70:rgba(245,239,228,.78); --ink-3:rgba(245,239,228,.56); --ink-5:rgba(245,239,228,.3);
  --hairline:rgba(245,239,228,.12); --red:#F04A58; --red-text:#FF8A92;
  --red-wash:rgba(240,74,88,.14); --on-red:#15120E;
  --emph:#F5EFE4; --emph-ink:#15120E;
  --edge:${edge('audit-sheet', '#F5EFE4')};
  --edge-soft:${edge('audit-soft', 'rgba(245,239,228,.36)')};
  --edge-red:${edge('audit-red', '#F04A58')};
  --edge-note:${edge('audit-note', 'rgba(245,239,228,.5)', { dash: 3.4, width: 0.7 })};
  --rule:${rule('audit-rule', 'rgba(245,239,228,.3)')};
  --mark:${mark('#F04A58')};
}}
:root[data-theme="dark"]{
  --ground:#15120E; --ground-alt:#1B1713; --surface:#211C17;
  --ink:#F5EFE4; --ink-70:rgba(245,239,228,.78); --ink-3:rgba(245,239,228,.56); --ink-5:rgba(245,239,228,.3);
  --hairline:rgba(245,239,228,.12); --red:#F04A58; --red-text:#FF8A92;
  --red-wash:rgba(240,74,88,.14); --on-red:#15120E;
  --emph:#F5EFE4; --emph-ink:#15120E;
  --edge:${edge('audit-sheet', '#F5EFE4')};
  --edge-soft:${edge('audit-soft', 'rgba(245,239,228,.36)')};
  --edge-red:${edge('audit-red', '#F04A58')};
  --edge-note:${edge('audit-note', 'rgba(245,239,228,.5)', { dash: 3.4, width: 0.7 })};
  --rule:${rule('audit-rule', 'rgba(245,239,228,.3)')};
  --mark:${mark('#F04A58')};
}

*{box-sizing:border-box}
body{margin:0;background:var(--ground);color:var(--ink);
  font:400 15px/1.5 var(--sans);-webkit-font-smoothing:antialiased}
h1,h2,h3,h4{margin:0;text-wrap:balance}
button{font:inherit;color:inherit;cursor:pointer}
:focus-visible{outline:2.5px solid var(--red);outline-offset:2px;border-radius:4px}

/* ---------------------------------------------------------------- masthead */
.top{position:sticky;top:0;z-index:20;background:var(--ground);
  border-bottom:1px solid var(--hairline)}
.topin{max-width:1180px;margin:0 auto;padding:13px 22px 11px;
  display:flex;flex-wrap:wrap;gap:12px 20px;align-items:baseline}
.brand{display:flex;align-items:baseline;gap:10px}
.brand h1{font-size:19px;font-weight:650;letter-spacing:-.015em;
  padding-bottom:7px;background:var(--mark) no-repeat left bottom/54px 12px}
.brand em{font-family:var(--hand);font-size:23px;font-style:normal;color:var(--red-text);line-height:1}
.tally{margin-left:auto;display:flex;gap:15px;font-size:13px;color:var(--ink-70);
  font-variant-numeric:tabular-nums}
.tally b{font-weight:650;color:var(--ink)}
.tally .cutn b{color:var(--red-text)}
.bar{width:100%;height:7px;background:var(--ground-alt);border-radius:4px;overflow:hidden;display:flex}
.bar i{display:block;height:100%}
.bar .bk{background:var(--ink)}
.bar .br{background:repeating-linear-gradient(135deg,var(--ink-5) 0 4px,transparent 4px 8px),var(--ground-alt)}
.bar .bc{background:var(--red)}
.tools{width:100%;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.chip{border:1px solid var(--hairline);background:var(--surface);border-radius:999px;
  padding:7px 13px;font-size:13px;min-height:36px;color:var(--ink-70)}
.chip[aria-pressed="true"]{background:var(--emph);color:var(--emph-ink);border-color:transparent}
.chip.go{margin-left:auto;background:var(--red);color:var(--on-red);border-color:transparent;font-weight:600}

/* ------------------------------------------------------------------- intro */
main{max-width:1180px;margin:0 auto;padding:26px 22px 120px}
.intro{border-width:1px;border-style:solid;border-image:var(--edge) 22/22px stretch;
  background:var(--surface);padding:20px 22px;margin-bottom:22px}
.intro h2{font-size:17px;font-weight:650;margin-bottom:8px}
.intro p{margin:0 0 8px;color:var(--ink-70);max-width:70ch}
.intro kbd{font:600 12px/1 var(--sans);background:var(--ground-alt);border:1px solid var(--hairline);
  border-radius:5px;padding:3px 6px}
.wish{width:100%;margin-top:10px;min-height:96px;resize:vertical;background:var(--ground-alt);
  border:1px solid var(--hairline);border-radius:10px;padding:12px 14px;color:var(--ink);
  font:500 20px/1.45 var(--hand)}
.wish::placeholder{color:var(--ink-3);font-family:var(--sans);font-size:14px;font-weight:400}

/* --------------------------------------------------------------- the index */
.ixgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;
  margin:0 0 14px}
.ix{display:flex;flex-direction:column;gap:6px;padding:14px 16px 12px;text-decoration:none;
  color:var(--ink);background:var(--surface);
  border-width:1px;border-style:solid;border-image:var(--edge-soft) 22/22px stretch}
.ix:hover .ixt{color:var(--red-text)}
.ixt{font-size:15px;font-weight:650;letter-spacing:-.01em}
.ixd{font-size:12.5px;color:var(--ink-3);line-height:1.4;min-height:2.8em}
.ixrow{display:flex;align-items:baseline;gap:8px;font-size:12px;color:var(--ink-70);
  font-variant-numeric:tabular-nums}
.ixn b{font-weight:650}
.ixc{margin-left:auto;color:var(--red-text);font-size:11px;letter-spacing:.03em}
.ixbar{height:4px;background:var(--ground-alt);border-radius:3px;overflow:hidden}
.ixbar i{display:block;height:100%;width:0;background:var(--ink)}

/* -------------------------------------------------------------- categories */
.group{scroll-margin-top:196px}
.cathead{margin:44px 0 16px}
.catname{display:flex;align-items:baseline;gap:12px}
.catname h2{font-size:24px;font-weight:650;letter-spacing:-.02em}
.catname em{font-style:normal;font-size:12.5px;color:var(--ink-3);font-variant-numeric:tabular-nums}
.catname::after{content:"";flex:1 1 auto;height:6px;align-self:center;
  background-image:var(--rule);background-size:120px 6px;background-repeat:repeat-x;opacity:.7}
.catdesc{margin:4px 0 0;font-size:14.5px;color:var(--ink-70);max-width:62ch}

/* ---------------------------------------------------------------- clusters */
/* round, not stretch: a stretched dash is a smear. Repeating the middle
   slices keeps every dash the length the pen drew it, however wide the card. */
.cluster{position:relative;background:var(--ground-alt);padding:18px 20px 14px;margin:0 0 14px;
  border-width:1px;border-style:solid;border-image:var(--edge-note) 22/22px round}
.clbadge{position:absolute;top:-9px;left:18px;background:var(--red);color:var(--on-red);
  font-size:10.5px;font-weight:650;letter-spacing:.07em;text-transform:uppercase;
  border-radius:999px;padding:3px 10px}
.clhead h4{font-size:17px;font-weight:650;letter-spacing:-.01em;margin-top:2px}
.clhead p{margin:4px 0 0;font-size:14px;color:var(--ink-70);max-width:66ch}
.clchips{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.clchips a{display:inline-flex;align-items:center;min-height:34px;padding:6px 13px;font-size:13px;
  color:var(--ink);text-decoration:none;background:var(--surface);
  border:1px solid var(--hairline);border-radius:999px}
.clchips a::before{content:"\\2193";margin-right:6px;color:var(--ink-5)}
.clchips a:hover{border-color:var(--ink-5)}
.clverdict{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:14px;
  padding-top:12px;border-top:1px solid var(--hairline)}
[data-c-set="one"] .c-one{background:var(--red);color:var(--on-red);border-color:transparent}
[data-c-set="apart"] .c-apart{background:var(--emph);color:var(--emph-ink);border-color:transparent}
.cluster .notewrap{margin-top:10px}

/* ------------------------------------------------------------------ sheets */
.sheet{display:grid;grid-template-columns:214px minmax(0,1fr);gap:22px;
  background:var(--surface);padding:20px;margin-bottom:18px;
  border-width:1px;border-style:solid;border-image:var(--edge-soft) 22/22px stretch;
  scroll-margin-top:196px}
.sheet.is-cut{border-image:var(--edge-red) 22/22px stretch;background:var(--red-wash)}
.sheet.is-keep{border-image:var(--edge) 22/22px stretch}
.sheet.here{box-shadow:0 0 0 3px var(--red)}
.shot img{width:100%;height:auto;display:block;border-radius:14px;border:1px solid var(--hairline);
  background:var(--ground)}
.shot{position:sticky;top:196px;align-self:start}
.noshot{aspect-ratio:390/844;display:grid;place-content:center;text-align:center;
  border-radius:14px;background:var(--ground-alt);color:var(--ink-3);font-size:13px}
.noshot span{font-size:11px}

.sh{display:flex;gap:12px;align-items:flex-start}
.num{font-variant-numeric:tabular-nums;font-size:12px;font-weight:650;color:var(--ink-3);
  border:1px solid var(--hairline);border-radius:999px;min-width:30px;height:24px;
  padding:0 8px;display:grid;place-content:center;flex:0 0 auto;margin-top:2px}
.num i{font-style:normal;font-weight:400;color:var(--ink-5)}
.names h3{font-size:20px;font-weight:650;letter-spacing:-.015em}
.meta{margin:2px 0 0;font-size:14px;color:var(--ink-70)}
.where{margin:6px 0 0;font-size:12px;color:var(--ink-3);display:flex;gap:8px;align-items:center}
.where code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px}
.tag{border:1px solid var(--hairline);border-radius:999px;padding:1px 7px;font-size:10.5px;
  letter-spacing:.06em;text-transform:uppercase}
.blurb{margin:10px 0 0;color:var(--ink-70);font-size:14px;max-width:62ch}

.verdictrow{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:16px 0 4px;
  padding-top:14px;border-top:1px solid var(--hairline)}
.vlabel{font-size:13px;color:var(--ink-3);margin-right:4px}
.v{border:1px solid var(--hairline);background:transparent;border-radius:999px;
  padding:8px 16px;min-height:38px;font-size:13.5px;font-weight:550;color:var(--ink-70);
  transition:background .12s,color .12s,border-color .12s}
.v:hover{border-color:var(--ink-5)}
.v-clear{border-color:transparent;color:var(--ink-3);padding:8px 10px;font-weight:400}
[data-v-set="keep"] .v-keep{background:var(--emph);color:var(--emph-ink);border-color:transparent}
[data-v-set="cut"] .v-cut{background:var(--red);color:var(--on-red);border-color:transparent}
[data-v-set="rework"] .v-rework{border-color:var(--ink);color:var(--ink);
  background:repeating-linear-gradient(135deg,var(--ink-5) 0 3px,transparent 3px 7px)}

.caps{margin-top:16px}
.capshead{display:flex;align-items:center;gap:10px;font-size:12px;letter-spacing:.09em;
  text-transform:uppercase;color:var(--ink-3);margin-bottom:6px}
.bulk{margin-left:auto;display:flex;gap:6px}
.mini{border:1px solid var(--hairline);background:transparent;border-radius:999px;
  padding:5px 11px;min-height:30px;font-size:11.5px;letter-spacing:.04em;color:var(--ink-70);text-transform:none}
.caps ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.cap{display:grid;grid-template-columns:104px minmax(0,1fr) auto;gap:12px;align-items:center;
  padding:9px 4px;border-bottom:1px solid var(--hairline)}
.cap:last-child{border-bottom:0}
.cap .k{font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3);
  border:1px solid var(--hairline);border-radius:999px;padding:3px 0;text-align:center}
.cap .k-switch{color:var(--red-text);border-color:var(--red-wash);background:var(--red-wash)}
.cap .txt{min-width:0}
.cap .txt b{font-weight:600;display:block;overflow-wrap:anywhere}
.cap .txt i{font-style:normal;color:var(--ink-3);font-size:13px;display:block}
.cap .vs{display:flex;gap:5px}
.cap .vs .v{padding:0;width:34px;height:34px;min-height:34px;display:grid;place-content:center;
  font-size:12.5px;border-radius:50%}
.cap[data-v-set="cut"] .txt b{text-decoration:line-through;text-decoration-color:var(--red);
  text-decoration-thickness:1.5px;color:var(--ink-3)}
.cap[data-v-set="rework"] .txt b{text-decoration:underline;text-decoration-style:dashed;
  text-underline-offset:3px;text-decoration-color:var(--ink-5)}
.cap.here{background:var(--ground-alt);border-radius:8px}

.links{margin-top:16px}
.links ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px}
.links a{display:inline-flex;align-items:center;min-height:34px;padding:6px 13px;font-size:13px;
  color:var(--ink-70);text-decoration:none;border:1px solid var(--hairline);border-radius:999px}
.links a::before{content:"\\2193";margin-right:6px;color:var(--ink-5)}
.links a:hover{border-color:var(--ink-5);color:var(--ink)}

.sample{margin-top:14px;font-size:13px}
.sample summary{cursor:pointer;color:var(--ink-3);padding:6px 0;min-height:32px}
.sample summary span{color:var(--ink-5)}
.sample ul{list-style:none;margin:6px 0 0;padding:0 0 0 14px;
  border-left:2px solid var(--hairline);color:var(--ink-70);display:flex;flex-direction:column;gap:3px}
.sample i{font-style:normal;color:var(--ink-3)}

.notewrap{display:block;margin-top:14px}
.notewrap>span{font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-3)}
.note{display:block;width:100%;margin-top:5px;background:transparent;border:0;
  border-bottom:1px solid var(--hairline);border-radius:0;padding:6px 2px;resize:none;overflow:hidden;
  color:var(--ink);font:500 21px/1.4 var(--hand)}
.note::placeholder{font:400 13.5px/1.5 var(--sans);color:var(--ink-3)}
.note:focus{outline:0;border-bottom-color:var(--red)}

/* ------------------------------------------------------------------ export */
.sheetover{position:fixed;inset:0;z-index:40;background:rgba(26,26,26,.5);
  display:grid;place-items:center;padding:24px}
.sheetover[hidden]{display:none}
.exp{background:var(--surface);color:var(--ink);width:min(760px,100%);max-height:84vh;
  display:flex;flex-direction:column;gap:12px;padding:22px;border-radius:16px;
  border:1px solid var(--hairline)}
.exp h2{font-size:17px}
.exp textarea{flex:1 1 auto;min-height:320px;background:var(--ground-alt);color:var(--ink);
  border:1px solid var(--hairline);border-radius:10px;padding:14px;
  font:400 12.5px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;resize:none}
.exprow{display:flex;gap:8px;flex-wrap:wrap}

.hidden{display:none !important}
@media (max-width:860px){
  .sheet{grid-template-columns:1fr}
  .shot{position:static;max-width:280px}
  .cap{grid-template-columns:minmax(0,1fr) auto}
  .cap .k{display:none}
  .ixd{min-height:0}
}
@media (prefers-reduced-motion:reduce){*{transition:none !important;scroll-behavior:auto !important}}
</style>

<div class="top">
  <div class="topin">
    <div class="brand"><h1>Trace</h1><em>feature audit</em></div>
    <div class="tally">
      <span><b id="t-done">0</b> / ${totalSurfaces} screens</span>
      <span><b id="t-keep">0</b> keep</span>
      <span><b id="t-rework">0</b> rework</span>
      <span class="cutn"><b id="t-cut">0</b> cut</span>
      <span><b id="t-caps">0</b> features</span>
      <span><b id="t-cl">0</b> / ${totalClusters} overlaps</span>
    </div>
    <div class="bar"><i class="bk" id="b-keep"></i><i class="br" id="b-rework"></i><i class="bc" id="b-cut"></i></div>
    <div class="tools">
      <button class="chip" data-filter="all" aria-pressed="true">everything</button>
      <button class="chip" data-filter="todo" aria-pressed="false">not judged</button>
      <button class="chip" data-filter="keep" aria-pressed="false">keeping</button>
      <button class="chip" data-filter="rework" aria-pressed="false">reworking</button>
      <button class="chip" data-filter="cut" aria-pressed="false">cutting</button>
      <button class="chip go" id="export">Export my verdict</button>
    </div>
  </div>
</div>

<main>
  <div class="intro">
    <h2>How to work this</h2>
    <p>The app, filed by job &mdash; not by where a screen sits in the nav. ${CATS.length} categories,
      ${totalSurfaces} screens, and <b>${totalClusters} overlaps</b>: places where several features do the
      same job. Each overlap gets its own call &mdash; <b>become one</b>, <b>keep apart</b>, or cut the
      lot &mdash; and each screen gets keep / rework / cut. Nothing is sent anywhere; it saves in this
      browser, and <b>Export my verdict</b> gives you text to paste back to me.</p>
    <p><kbd>J</kbd> / <kbd>K</kbd> move &middot; <kbd>1</kbd> keep &middot; <kbd>2</kbd> rework &middot;
      <kbd>3</kbd> cut &middot; <kbd>0</kbd> clear &middot; <kbd>N</kbd> note. Skipping is fine &mdash;
      <b>not judged</b> brings you back.</p>
    <label class="notewrap" style="margin-top:14px">
      <span>What's missing &mdash; things to add</span>
      <textarea class="wish" id="wish"
        placeholder="One per line. What should exist that doesn't?"></textarea>
    </label>
  </div>

  <nav class="ixgrid" aria-label="Categories">${index}
  </nav>
  ${body}
</main>

<div class="sheetover" id="expover" hidden>
  <div class="exp">
    <h2>Your verdict</h2>
    <textarea id="exptext" readonly spellcheck="false"></textarea>
    <div class="exprow">
      <button class="chip go" id="copy">Copy</button>
      <button class="chip" id="download">Download .md</button>
      <button class="chip" id="expclose">Close</button>
      <button class="chip" id="wipe" style="margin-left:auto;color:var(--red-text)">Start over</button>
    </div>
  </div>
</div>

<script>
(() => {
  const KEY = 'trace.audit.v1';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];

  let db = { v: {}, c: {}, notes: {}, wish: '' };
  try { db = Object.assign(db, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
  db.c = db.c || {};
  let saveT;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {}
  }, 250); };

  const rows = () => $$('[data-scope]');
  const SURF = $$('.sheet');
  const CLUS = $$('.cluster');
  /* surface id -> its whole-screen verdict row, for cluster "cut all" */
  const surfRow = {};
  for (const r of $$('.verdictrow[data-scope="surface"]')) surfRow[r.dataset.key] = r;

  const paint = (el) => {
    const k = el.dataset.key;
    const v = db.v[k];
    if (v) el.setAttribute('data-v-set', v); else el.removeAttribute('data-v-set');
    if (el.dataset.scope === 'surface') {
      const sheet = el.closest('.sheet');
      sheet.classList.toggle('is-cut', v === 'cut');
      sheet.classList.toggle('is-keep', v === 'keep');
    }
  };
  const paintCluster = (el) => {
    const v = db.c[el.dataset.ckey];
    if (v) el.setAttribute('data-c-set', v); else el.removeAttribute('data-c-set');
  };

  const grow = (t) => { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; };

  const tally = () => {
    let keep = 0, rework = 0, cut = 0, caps = 0, cl = 0;
    const cat = {};
    for (const el of SURF) {
      const v = db.v[el.dataset.surface];
      const c = el.dataset.cat;
      cat[c] = cat[c] || { done: 0, total: 0 };
      cat[c].total++;
      if (v) cat[c].done++;
      if (v === 'keep') keep++; else if (v === 'rework') rework++; else if (v === 'cut') cut++;
    }
    for (const k in db.v) if (k.indexOf('#') > -1 && db.v[k]) caps++;
    for (const k in db.c) if (db.c[k]) cl++;
    const done = keep + rework + cut, tot = SURF.length || 1;
    $('#t-done').textContent = done; $('#t-keep').textContent = keep;
    $('#t-rework').textContent = rework; $('#t-cut').textContent = cut;
    $('#t-caps').textContent = caps; $('#t-cl').textContent = cl;
    $('#b-keep').style.width = (keep / tot * 100) + '%';
    $('#b-rework').style.width = (rework / tot * 100) + '%';
    $('#b-cut').style.width = (cut / tot * 100) + '%';
    for (const ix of $$('.ix')) {
      const c = cat[ix.dataset.ix] || { done: 0, total: 1 };
      ix.querySelector('[data-ixdone]').textContent = c.done;
      ix.querySelector('[data-ixbar]').style.width = (c.done / c.total * 100) + '%';
    }
  };

  const set = (el, v) => {
    const k = el.dataset.key;
    if (v) db.v[k] = v; else delete db.v[k];
    paint(el); save(); tally(); applyFilter();
  };

  document.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;

    if (b.dataset.cv !== undefined) {
      const cl = b.closest('.cluster');
      const k = cl.dataset.ckey;
      const v = db.c[k] === b.dataset.cv ? '' : b.dataset.cv;
      if (v) db.c[k] = v; else delete db.c[k];
      paintCluster(cl); save(); tally();
      return;
    }
    if (b.dataset.ccut) {
      const cl = b.closest('.cluster');
      for (const id of cl.dataset.members.split('||')) {
        const row = surfRow[id];
        if (row) set(row, 'cut');
      }
      return;
    }
    if (b.dataset.v !== undefined) {
      const row = b.closest('[data-scope]');
      here(row);
      set(row, db.v[row.dataset.key] === b.dataset.v ? '' : b.dataset.v);
      return;
    }
    if (b.dataset.bulk) {
      const sheet = b.closest('.sheet');
      for (const c of $$('.cap', sheet)) if (!db.v[c.dataset.key]) set(c, b.dataset.bulk);
      return;
    }
    if (b.dataset.filter) {
      for (const c of $$('[data-filter]')) c.setAttribute('aria-pressed', String(c === b));
      applyFilter();
      return;
    }
    if (b.id === 'export') openExport();
    if (b.id === 'expclose') $('#expover').hidden = true;
    if (b.id === 'copy') {
      const t = $('#exptext'); t.select();
      navigator.clipboard ? navigator.clipboard.writeText(t.value) : document.execCommand('copy');
      b.textContent = 'Copied'; setTimeout(() => { b.textContent = 'Copy'; }, 1400);
    }
    if (b.id === 'download') {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([$('#exptext').value], { type: 'text/markdown' }));
      a.download = 'trace-audit.md'; a.click(); URL.revokeObjectURL(a.href);
    }
    if (b.id === 'wipe') {
      if (!confirm('Clear every decision and note on this page?')) return;
      db = { v: {}, c: {}, notes: {}, wish: '' };
      try { localStorage.removeItem(KEY); } catch (e) {}
      for (const r of rows()) paint(r);
      for (const c of CLUS) paintCluster(c);
      for (const t of $$('textarea')) { t.value = ''; grow(t); }
      tally(); applyFilter(); $('#expover').hidden = true;
    }
  });

  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'wish') { db.wish = t.value; grow(t); save(); return; }
    if (t.dataset.note !== undefined) { db.notes[t.dataset.note] = t.value; grow(t); save(); }
  });

  const activeFilter = () => ($$('[data-filter]').find((c) => c.getAttribute('aria-pressed') === 'true')
    || { dataset: { filter: 'all' } }).dataset.filter;

  function applyFilter() {
    const f = activeFilter();
    for (const s of SURF) {
      const v = db.v[s.dataset.surface];
      const show = f === 'all' ? true : f === 'todo' ? !v : v === f;
      s.classList.toggle('hidden', !show);
    }
    for (const c of CLUS) c.classList.toggle('hidden', f !== 'all' && f !== 'todo');
    for (const g of $$('.group')) {
      g.classList.toggle('hidden',
        !$$('.sheet:not(.hidden)', g).length && !$$('.cluster:not(.hidden)', g).length);
    }
  }

  let cur = null;
  function here(el) {
    if (cur) cur.classList.remove('here');
    cur = el;
    if (cur) cur.classList.add('here');
  }
  const walkable = () => rows().filter((r) => {
    const sheet = r.closest('.sheet');
    return sheet && !sheet.classList.contains('hidden');
  });
  function step(d) {
    const list = walkable();
    if (!list.length) return;
    let i = cur ? list.indexOf(cur) : -1;
    i = i < 0 ? (d > 0 ? 0 : list.length - 1) : Math.min(list.length - 1, Math.max(0, i + d));
    here(list[i]);
    cur.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.tagName === 'SELECT')) {
      if (e.key === 'Escape') t.blur();
      return;
    }
    const k = e.key.toLowerCase();
    if (k === 'j') { e.preventDefault(); step(1); }
    else if (k === 'k') { e.preventDefault(); step(-1); }
    else if ('0123'.includes(e.key) && cur) {
      e.preventDefault();
      set(cur, { 1: 'keep', 2: 'rework', 3: 'cut', 0: '' }[e.key]);
      if (e.key !== '0') step(1);
    } else if (k === 'n' && cur) {
      e.preventDefault();
      const n = $('.note', cur.closest('.sheet'));
      if (n) { n.focus(); n.scrollIntoView({ block: 'center' }); }
    } else if (e.key === 'Escape') { $('#expover').hidden = true; }
  });

  function openExport() {
    const lines = ['# Trace \\u2014 feature audit', ''];
    const stamp = new Date().toISOString().slice(0, 10);
    lines.push('Judged ' + $('#t-done').textContent + ' of ' + SURF.length + ' screens and ' +
      $('#t-cl').textContent + ' of ' + CLUS.length + ' overlaps on ' + stamp + '.', '');

    if ((db.wish || '').trim()) {
      lines.push('## Add', '');
      for (const l of db.wish.split('\\n')) if (l.trim()) lines.push('- ' + l.trim());
      lines.push('');
    }

    const one = [], apart = [];
    for (const cl of CLUS) {
      const v = db.c[cl.dataset.ckey];
      const note = (db.notes['cluster:' + cl.dataset.ckey] || '').trim();
      const head = '**' + cl.dataset.ctitle + '** \\u2014 ' + cl.dataset.mlabels;
      if (v === 'one') one.push('- ' + head + (note ? '\\n  > ' + note : ''));
      else if (v === 'apart') apart.push('- ' + head + (note ? '\\n  > ' + note : ''));
      else if (note) apart.push('- (undecided) ' + head + '\\n  > ' + note);
    }
    if (one.length) lines.push('## Become one', '', one.join('\\n'), '');
    if (apart.length) lines.push('## Stay apart', '', apart.join('\\n'), '');

    const bucket = { cut: [], rework: [], keep: [] };
    for (const s of SURF) {
      const id = s.dataset.surface;
      const v = db.v[id];
      const name = $('h3', s).textContent;
      const path = $('.where code', s).textContent;
      const note = (db.notes[id] || '').trim();
      const caps = $$('.cap', s).map((c) => ({ v: db.v[c.dataset.key], name: $('b', c).textContent }));
      const inner = { cut: [], rework: [], keep: [] };
      for (const c of caps) if (c.v) inner[c.v].push(c.name);
      if (!v && !note && !inner.cut.length && !inner.rework.length && !inner.keep.length) continue;
      const entry = ['### ' + name + '  \`' + path + '\`'];
      if (v) entry.push('**' + v.toUpperCase() + '**');
      if (note) entry.push('> ' + note.replace(/\\n/g, '\\n> '));
      if (inner.cut.length) entry.push('- cut inside: ' + inner.cut.join(', '));
      if (inner.rework.length) entry.push('- rework inside: ' + inner.rework.join(', '));
      if (inner.keep.length) entry.push('- keep inside: ' + inner.keep.join(', '));
      bucket[v || 'keep'].push(entry.join('\\n'));
    }
    for (const [k, title] of [['cut', 'Cut'], ['rework', 'Rework'], ['keep', 'Keep / notes only']]) {
      if (!bucket[k].length) continue;
      lines.push('## ' + title, '', bucket[k].join('\\n\\n'), '');
    }
    const untouched = SURF.filter((s) => !db.v[s.dataset.surface] && !(db.notes[s.dataset.surface] || '').trim());
    if (untouched.length) {
      lines.push('## Not judged yet (' + untouched.length + ')', '',
        untouched.map((s) => '- ' + $('h3', s).textContent).join('\\n'), '');
    }
    $('#exptext').value = lines.join('\\n');
    $('#expover').hidden = false;
    $('#exptext').scrollTop = 0;
  }

  for (const r of rows()) paint(r);
  for (const c of CLUS) paintCluster(c);
  for (const t of $$('.note')) { t.value = db.notes[t.dataset.note] || ''; grow(t); }
  $('#wish').value = db.wish || ''; grow($('#wish'));
  tally(); applyFilter();
})();
</script>`;

/* The page has to survive being served without a charset, so nothing may
   reach the file as a raw byte above 127. `esc` handles the app's copy; this
   catches anything hand-written in the template that slipped through. */
const stray = [...new Set(html.replace(/[\x00-\x7F]/g, ''))];
if (stray.length) {
  console.error('non-ASCII left in the page:', stray.map((c) => c + ' U+' + c.charCodeAt(0).toString(16)).join(' '));
  process.exit(1);
}

writeFileSync('site/audit.html', html);
console.log(`site/audit.html - ${(html.length / 1024 / 1024).toFixed(2)} MB`);
console.log(`${totalSurfaces} sheets, ${judged} features, ${totalClusters} overlap clusters`);
console.log(CATS.map((c) => `${c.name} ${c.surfaces.length}${c.clusters.length ? '+' + c.clusters.length + 'cl' : ''}`).join(', '));
