/* trace — social kit runtime
   Filters/search, motion toggle, photo slots (localStorage-persisted),
   and PNG export via SVG foreignObject rasterisation. No dependencies. */
(() => {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];

  /* ------------------------------------------------------------ toast */

  const toastEl = $('#ts-toast');
  let toastT;
  function toast(msg, hold) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastT);
    if (!hold) toastT = setTimeout(() => toastEl.classList.remove('is-on'), 2200);
  }
  const toastOff = () => { clearTimeout(toastT); toastEl.classList.remove('is-on'); };

  /* ---------------------------------------------------- filter + search */

  const chips = $$('.ts-chip');
  const q = $('#ts-q');
  const countEl = $('#ts-count');
  let activeFilter = 'all';

  function applyFilter() {
    const query = q.value.trim().toLowerCase();
    let shown = 0, total = 0;

    $$('.dv-opt').forEach((opt) => {
      const fws = $$('.ts-fw', opt);
      total += fws.length;
      const fmtOk =
        activeFilter === 'all' ||
        fws.some((f) => 'fmt:' + f.dataset.fmt === activeFilter);
      const qOk = !query || opt.textContent.toLowerCase().includes(query);
      const on = fmtOk && qOk;
      opt.classList.toggle('ts-hide', !on);
      if (on) shown += fws.length;
    });

    // collapse empty groups and turns
    $$('.dv-opts').forEach((grp) => {
      const empty = !$('.dv-opt:not(.ts-hide)', grp);
      grp.classList.toggle('ts-hide', empty);
      const sub = grp.previousElementSibling;
      if (sub && sub.classList.contains('dv-sub')) sub.classList.toggle('ts-hide', empty);
    });
    $$('.dv-turn').forEach((turn) => {
      const empty = !$('.dv-opt:not(.ts-hide)', turn);
      turn.classList.toggle('ts-hide', empty);
    });

    countEl.textContent = shown === total ? `${total} frames` : `${shown} of ${total} frames`;
  }

  chips.forEach((c) =>
    c.addEventListener('click', () => {
      chips.forEach((x) => x.classList.toggle('is-on', x === c));
      activeFilter = c.dataset.filter;
      applyFilter();
    })
  );
  q.addEventListener('input', applyFilter);
  applyFilter();

  /* ---------------------------------------------------------- motion */

  const calmBtn = $('#ts-calm');
  calmBtn.addEventListener('click', () => {
    const on = document.documentElement.classList.toggle('ts-calm');
    calmBtn.setAttribute('aria-pressed', String(on));
    toast(on ? 'animations pause until you hover a frame' : 'animations always on');
  });

  /* ------------------------------------------------------- photo slots */

  const SLOT_KEY = (id) => 'ts-slot:' + id;

  function paintSlot(slot, dataUrl) {
    if (dataUrl) {
      slot.style.backgroundImage = `url("${dataUrl}")`;
      slot.classList.add('is-filled');
    } else {
      slot.style.backgroundImage = '';
      slot.classList.remove('is-filled');
    }
  }

  $$('.ts-slot').forEach((slot) => {
    try { paintSlot(slot, localStorage.getItem(SLOT_KEY(slot.dataset.slot))); } catch {}
  });

  function fillSlot(slot, file) {
    if (!file || !file.type.startsWith('image/')) return;
    const img = new Image();
    img.onload = () => {
      // downscale so a phone photo fits the localStorage quota
      const max = 1600;
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const dataUrl = c.toDataURL('image/jpeg', 0.85);
      paintSlot(slot, dataUrl);
      try { localStorage.setItem(SLOT_KEY(slot.dataset.slot), dataUrl); }
      catch { toast('photo shown but too large to persist'); }
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  }

  const picker = document.createElement('input');
  picker.type = 'file';
  picker.accept = 'image/*';
  let pickerSlot = null;
  picker.addEventListener('change', () => {
    if (pickerSlot && picker.files[0]) fillSlot(pickerSlot, picker.files[0]);
    picker.value = '';
  });

  // overlays sit above the slot, so delegate through the frame wrapper
  $$('.ts-fw').forEach((fw) => {
    const slot = $('.ts-slot', fw);
    if (!slot) return;

    fw.addEventListener('click', (e) => {
      if (e.target.closest('.ts-fbar')) return;
      if (e.target.closest('.ts-slot-clear')) {
        paintSlot(slot, null);
        try { localStorage.removeItem(SLOT_KEY(slot.dataset.slot)); } catch {}
        return;
      }
      pickerSlot = slot;
      picker.click();
    });
    fw.addEventListener('dragover', (e) => { e.preventDefault(); slot.classList.add('is-over'); });
    fw.addEventListener('dragleave', () => slot.classList.remove('is-over'));
    fw.addEventListener('drop', (e) => {
      e.preventDefault();
      slot.classList.remove('is-over');
      fillSlot(slot, e.dataTransfer.files[0]);
    });
  });

  /* -------------------------------------------------------- PNG export */

  // every injected stylesheet: font, prototype CSS, and this build's additions
  const ALL_CSS = $$('style.ts-style').map((s) => s.textContent).join('\n');

  function frameToSvg(art) {
    const w = art.offsetWidth;
    const h = art.offsetHeight;
    const scale = parseFloat(art.dataset.scale) || 3;

    const clone = art.cloneNode(true);
    clone.classList.add('ts-export');

    // <use href="#i-*"> must resolve inside the detached export document —
    // embed the icon sprite in the clone itself
    const sprite = document.getElementById('ts-icons');
    if (sprite && clone.querySelector('use')) {
      clone.insertAdjacentHTML('afterbegin', sprite.outerHTML);
    }

    const markup = new XMLSerializer().serializeToString(clone);
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(w * scale)}" ` +
      `height="${Math.round(h * scale)}" viewBox="0 0 ${w} ${h}">` +
      `<style><![CDATA[${ALL_CSS}]]></style>` +
      `<foreignObject width="${w}" height="${h}">${markup}</foreignObject></svg>`;

    return { svg, w: Math.round(w * scale), h: Math.round(h * scale) };
  }

  function renderPng(art) {
    return document.fonts.ready.then(() => new Promise((resolve, reject) => {
      const { svg, w, h } = frameToSvg(art);
      // data: URI, not blob — a blob image taints the canvas (opaque origin
      // on file://, and this Chromium taints blob+foreignObject on http too)
      const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      const img = new Image();
      img.onload = () => {
        // give the SVG's embedded font a beat to activate inside the image
        setTimeout(() => {
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          c.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png');
        }, 60);
      };
      img.onerror = () => reject(new Error('svg render failed'));
      img.src = url;
    }));
  }

  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  /* ------------------------------------------------- zip (store, no deps) */

  const CRC = (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    return (buf) => {
      let c = -1;
      for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
      return (c ^ -1) >>> 0;
    };
  })();

  function makeZip(entries) {
    // entries: [{ name, data: Uint8Array }]
    const enc = new TextEncoder();
    const parts = [];
    const central = [];
    let offset = 0;

    const u16 = (v) => new Uint8Array([v & 255, (v >> 8) & 255]);
    const u32 = (v) => new Uint8Array([v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255]);

    for (const { name, data } of entries) {
      const n = enc.encode(name);
      const crc = CRC(data);
      const head = [u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
        u32(crc), u32(data.length), u32(data.length), u16(n.length), u16(0)];
      parts.push(...head, n, data);
      central.push([u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
        u32(crc), u32(data.length), u32(data.length), u16(n.length), u16(0), u16(0),
        u16(0), u16(0), u32(0), u32(offset), n]);
      offset += head.reduce((s, a) => s + a.length, 0) + n.length + data.length;
    }

    let cdSize = 0;
    for (const rec of central) { parts.push(...rec); cdSize += rec.reduce((s, a) => s + a.length, 0); }
    parts.push(u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
      u32(cdSize), u32(offset), u16(0));

    return new Blob(parts, { type: 'application/zip' });
  }

  /* ----------------------------------------------------- export actions */

  let exporting = false;

  async function exportBatch(arts, zipName) {
    if (exporting || !arts.length) return;
    exporting = true;
    try {
      if (arts.length === 1) {
        toast('rendering…', true);
        const blob = await renderPng(arts[0]);
        download(blob, `trace-${arts[0].dataset.name}.png`);
        toastOff();
        toast(`trace-${arts[0].dataset.name}.png`);
      } else {
        const entries = [];
        for (let i = 0; i < arts.length; i++) {
          toast(`rendering ${i + 1} / ${arts.length}…`, true);
          const blob = await renderPng(arts[i]);
          entries.push({ name: `trace-${arts[i].dataset.name}.png`, data: new Uint8Array(await blob.arrayBuffer()) });
        }
        download(makeZip(entries), zipName);
        toastOff();
        toast(`${arts.length} frames → ${zipName}`);
      }
    } catch (err) {
      toastOff();
      toast('export failed: ' + err.message);
    } finally {
      exporting = false;
    }
  }

  document.addEventListener('click', (e) => {
    const one = e.target.closest('.ts-fx');
    if (one) {
      e.stopPropagation();
      exportBatch([one.closest('.ts-fw').querySelector('.ts-art')], '');
      return;
    }
    const turn = e.target.closest('.ts-tx');
    if (turn) {
      const section = turn.closest('.dv-turn');
      exportBatch(
        $$('.dv-opt:not(.ts-hide) .ts-art', section),
        `trace-turn-${turn.dataset.turn.slice(1)}.zip`
      );
    }
  });

  $('#ts-export-all').addEventListener('click', () => {
    exportBatch($$('.dv-opt:not(.ts-hide) .ts-art'), 'trace-social-kit.zip');
  });

  /* ------------------------------------------------- fit frames to phone */
  // Frames wider than the viewport get an exact `zoom` so nothing needs
  // horizontal panning. Layout px are untouched, so export sizes hold.

  function fitFrames() {
    const avail = document.documentElement.clientWidth - 28;
    for (const fw of $$('.ts-fw')) {
      const art = $('.ts-art', fw);
      if (!art) continue;
      const w = art.offsetWidth;
      fw.style.zoom = w > avail ? String(avail / w) : '';
    }
  }
  let fitT;
  addEventListener('resize', () => { clearTimeout(fitT); fitT = setTimeout(fitFrames, 120); });
  fitFrames();
})();
