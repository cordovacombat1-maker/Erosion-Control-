/* Small UI helpers: escaping, formatting, toasts, bottom sheets, images, downloads. */
(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function today() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }

  function fmtDate(iso, opts) {
    if (!iso) return '';
    const d = iso.length === 10 ? new Date(iso + 'T12:00:00') : new Date(iso);
    return d.toLocaleDateString(undefined, opts || { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  function fmtShort(iso) {
    return fmtDate(iso, { month: 'short', day: 'numeric' });
  }

  function fmtTime(iso) {
    return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  function fmtWhen(iso) {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    return sameDay ? fmtTime(iso) : `${fmtShort(iso)} · ${fmtTime(iso)}`;
  }

  function num(v) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }

  function fmtNum(n, digits = 2) {
    return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: digits });
  }

  function money(n) {
    return Number(n || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  }

  function initials(name) {
    return String(name || '?').trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '?';
  }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
  }

  /* Bottom sheet dialog. `render` returns HTML; `onMount(sheetEl, close)` wires events. */
  let sheetClose = null;
  function sheet(title, html, onMount) {
    const s = $('#sheet');
    const b = $('#sheetBackdrop');
    s.innerHTML = `
      <div class="sheet-grip"></div>
      <div class="sheet-head"><h2>${esc(title)}</h2>
        <button class="icon-btn" data-close aria-label="Close"><svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
      </div>
      <div class="sheet-body">${html}</div>`;
    s.hidden = false; b.hidden = false;
    requestAnimationFrame(() => { s.classList.add('open'); b.classList.add('open'); });
    const close = () => {
      s.classList.remove('open'); b.classList.remove('open');
      setTimeout(() => { s.hidden = true; b.hidden = true; s.innerHTML = ''; }, 200);
      sheetClose = null;
    };
    sheetClose = close;
    s.querySelector('[data-close]').onclick = close;
    b.onclick = close;
    const first = s.querySelector('input, select, textarea');
    if (first && !first.matches('[type=date]') && !('ontouchstart' in window)) setTimeout(() => first.focus(), 250);
    if (onMount) onMount(s, close);
    return close;
  }
  function closeSheet() { if (sheetClose) sheetClose(); }

  function confirmSheet(title, message, okLabel = 'Delete', danger = true) {
    return new Promise((resolve) => {
      let answered = false;
      sheet(title, `<p class="muted">${esc(message)}</p>
        <div class="row-actions"><button class="btn ghost" data-no>Cancel</button>
        <button class="btn ${danger ? 'danger' : 'primary'}" data-yes>${esc(okLabel)}</button></div>`,
      (s, close) => {
        s.querySelector('[data-no]').onclick = () => { answered = true; close(); resolve(false); };
        s.querySelector('[data-yes]').onclick = () => { answered = true; close(); resolve(true); };
        $('#sheetBackdrop').addEventListener('click', () => { if (!answered) resolve(false); }, { once: true });
      });
    });
  }

  /* Downscale a photo so dozens fit comfortably in browser storage. */
  function compressImage(file, maxDim = 1600, quality = 0.78) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve({ dataUrl: c.toDataURL('image/jpeg', quality), width: w, height: h });
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')); };
      img.src = url;
    });
  }

  function download(filename, content, type) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: type || 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function slug(s) {
    return String(s || 'job').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'job';
  }

  function csv(rows) {
    return rows.map((r) => r.map((c) => {
      const s = String(c == null ? '' : c);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')).join('\n');
  }

  window.UI = {
    $, $$, esc, today, fmtDate, fmtShort, fmtTime, fmtWhen, num, fmtNum, money, initials,
    toast, sheet, closeSheet, confirmSheet, compressImage, download, slug, csv,
  };
})();
