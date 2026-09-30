/* PDF reports built on jsPDF + autoTable (bundled in /vendor, works offline). */
(function () {
  'use strict';

  const GREEN = [22, 25, 28];
  const STRAW = [255, 194, 14];
  const SOIL = [122, 86, 58];
  const INK = [33, 37, 34];
  const MUTED = [110, 116, 110];
  const LINE = [216, 220, 224];
  const M = 40; // page margin (pt)

  const n = (v) => { const x = parseFloat(v); return Number.isFinite(x) ? x : 0; };
  const fmt = (v, d = 2) => Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: d });
  const money = (v) => Number(v || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const date = (iso, o) => (iso ? new Date(iso.length === 10 ? iso + 'T12:00:00' : iso)
    .toLocaleDateString('en-US', o || { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '');

  function doc() {
    const { jsPDF } = window.jspdf;
    return new jsPDF({ unit: 'pt', format: 'letter' });
  }

  function header(d, title, company, subtitle) {
    const W = d.internal.pageSize.getWidth();
    d.setFillColor(...GREEN);
    d.rect(0, 0, W, 78, 'F');
    // topo contour accent
    d.setDrawColor(48, 54, 60);
    d.setLineWidth(0.8);
    for (let i = 0; i < 5; i++) {
      d.lines([[70, -9], [80, 11], [90, -7], [110, 9]], W - 350, 12 + i * 14, [1, 1], 'S');
    }
    d.setFillColor(...STRAW);
    d.rect(0, 78, W, 4, 'F');
    d.setTextColor(255, 255, 255);
    d.setFont('helvetica', 'bold');
    d.setFontSize(9);
    d.text((company || 'Erosion Control').toUpperCase(), M, 30, { charSpace: 1 });
    d.setFontSize(19);
    d.text(title, M, 55);
    if (subtitle) {
      d.setFont('helvetica', 'normal');
      d.setFontSize(10);
      d.text(subtitle, W - M, 55, { align: 'right' });
    }
    d.setTextColor(...INK);
    return 104;
  }

  function footers(d, left) {
    const pages = d.getNumberOfPages();
    const W = d.internal.pageSize.getWidth();
    const H = d.internal.pageSize.getHeight();
    for (let i = 1; i <= pages; i++) {
      d.setPage(i);
      d.setDrawColor(...LINE);
      d.setLineWidth(0.5);
      d.line(M, H - 34, W - M, H - 34);
      d.setFont('helvetica', 'normal');
      d.setFontSize(8);
      d.setTextColor(...MUTED);
      d.text(left, M, H - 20);
      d.text(`Page ${i} of ${pages}`, W - M, H - 20, { align: 'right' });
    }
  }

  function ensure(d, y, need) {
    const H = d.internal.pageSize.getHeight();
    if (y + need > H - 50) { d.addPage(); return M + 10; }
    return y;
  }

  function sectionTitle(d, y, text) {
    y = ensure(d, y, 40);
    d.setFillColor(...STRAW);
    d.rect(M, y - 9, 3, 12, 'F');
    d.setFont('helvetica', 'bold');
    d.setFontSize(11);
    d.setTextColor(...GREEN);
    d.text(text.toUpperCase(), M + 9, y + 1, { charSpace: 0.6 });
    d.setTextColor(...INK);
    return y + 10;
  }

  function infoGrid(d, y, pairs) {
    const W = d.internal.pageSize.getWidth();
    const colW = (W - M * 2) / 2;
    const rows = [];
    for (let i = 0; i < pairs.length; i += 2) rows.push([pairs[i], pairs[i + 1]]);
    d.setFontSize(9);
    rows.forEach((row) => {
      let h = 0;
      row.forEach((p, ci) => {
        if (!p) return;
        const x = M + ci * colW;
        d.setFont('helvetica', 'normal'); d.setTextColor(...MUTED);
        d.text(p[0].toUpperCase(), x, y, { charSpace: 0.4 });
        d.setFont('helvetica', 'bold'); d.setTextColor(...INK); d.setFontSize(10.5);
        const lines = d.splitTextToSize(String(p[1] || '—'), colW - 14);
        d.text(lines, x, y + 13);
        d.setFontSize(9);
        h = Math.max(h, 13 + lines.length * 12);
      });
      y += h + 8;
    });
    return y;
  }

  function table(d, y, head, body, opts = {}) {
    d.autoTable({
      startY: y,
      head: [head],
      body,
      foot: opts.foot ? [opts.foot] : undefined,
      margin: { left: M, right: M },
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 5, lineColor: LINE, lineWidth: 0.5, textColor: INK },
      headStyles: { fillColor: [236, 239, 241], textColor: GREEN, fontStyle: 'bold' },
      footStyles: { fillColor: [236, 239, 241], textColor: INK, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      columnStyles: opts.columnStyles || {},
      showFoot: 'lastPage',
      didParseCell: opts.didParseCell,
    });
    return d.lastAutoTable.finalY + 18;
  }

  function paragraph(d, y, text) {
    const W = d.internal.pageSize.getWidth();
    d.setFont('helvetica', 'normal');
    d.setFontSize(10);
    const lines = d.splitTextToSize(text, W - M * 2);
    for (const line of lines) {
      y = ensure(d, y, 14);
      d.text(line, M, y);
      y += 13;
    }
    return y + 8;
  }

  const COND = { good: 'Good', maint: 'Needs maintenance', failed: 'Failed', na: 'N/A', '': 'Not rated' };

  function dailyReport({ job, log, photos, completed, opened, stillOpen, company, catalogName }) {
    const d = doc();
    const W = d.internal.pageSize.getWidth();
    let y = header(d, 'Daily Erosion Control Report', company, date(log.date, { month: 'short', day: 'numeric', year: 'numeric' }));

    const hours = (log.crew || []).reduce((a, c) => a + n(c.hours), 0);
    y = infoGrid(d, y, [
      ['Project', job.name + (job.number ? `  (#${job.number})` : '')],
      ['Date', date(log.date)],
      ['General contractor', [job.gc, job.gcContact].filter(Boolean).join(' – ')],
      ['Location', job.location],
      ['Foreman', log.foreman],
      ['Work hours', [log.start, log.end].filter(Boolean).join(' – ')],
      ['Weather', [log.weather, log.temp ? log.temp + '°F' : ''].filter(Boolean).join(', ')],
      ['Permit / SWPPP #', job.permit],
    ].filter((p) => p[1]));
    if (log.conditions) y = infoGrid(d, y, [['Site conditions', log.conditions]]);

    y = sectionTitle(d, y + 4, 'Crew & hours');
    const crew = (log.crew || []).filter((c) => c.name || n(c.hours));
    y = crew.length
      ? table(d, y, ['Crew member', 'Hours'], crew.map((c) => [c.name, fmt(c.hours)]), { foot: ['Total', fmt(hours)], columnStyles: { 1: { halign: 'right', cellWidth: 80 } } })
      : paragraph(d, y + 6, 'No crew recorded.');

    const bmps = (log.bmps || []).filter((b) => b.code || b.name);
    y = sectionTitle(d, y, 'BMPs installed');
    y = bmps.length
      ? table(d, y, ['BMP', 'Quantity', 'Unit', 'Location / station'],
        bmps.map((b) => [b.code === 'OTHER' ? b.name : catalogName(b), fmt(b.qty), b.unit || '', b.where || '']),
        { columnStyles: { 1: { halign: 'right', cellWidth: 70 }, 2: { cellWidth: 45 } } })
      : paragraph(d, y + 6, 'No new BMPs installed.');

    const maint = (log.maint || []).filter((m) => m.code || m.desc);
    y = sectionTitle(d, y, 'Repairs & maintenance');
    y = maint.length
      ? table(d, y, ['BMP', 'Work', 'Qty', 'Description'],
        maint.map((m) => [m.code ? (m.code === 'OTHER' ? m.name : catalogName(m)) : 'General', m.kind || '', m.code && n(m.qty) ? `${fmt(m.qty)} ${m.unit || ''}` : '', m.desc || '']),
        { columnStyles: { 1: { cellWidth: 70 }, 2: { cellWidth: 60, halign: 'right' } } })
      : paragraph(d, y + 6, 'No repairs or maintenance.');

    const mats = (log.materials || []).filter((m) => m.item);
    if (mats.length) {
      y = sectionTitle(d, y, 'Materials used');
      y = table(d, y, ['Material', 'Qty', 'Unit'], mats.map((m) => [m.item, fmt(m.qty), m.unit || '']), { columnStyles: { 1: { halign: 'right', cellWidth: 70 }, 2: { cellWidth: 50 } } });
    }

    if (completed.length || opened.length || stillOpen.length) {
      y = sectionTitle(d, y, 'GC / inspector requests');
      const seen = new Set();
      const rows = [];
      const add = (r, status) => {
        if (seen.has(r.id)) return;
        seen.add(r.id);
        rows.push([r.source || '', [r.title || r.desc, r.location].filter(Boolean).join(' — '), date(r.date, { month: 'short', day: 'numeric' }), status]);
      };
      completed.forEach((r) => add(r, 'Completed' + (r.completedNote ? `: ${r.completedNote}` : '')));
      opened.forEach((r) => add(r, r.status === 'done' ? 'Completed' : 'Open'));
      stillOpen.forEach((r) => add(r, 'Open' + (r.due ? ` (due ${date(r.due, { month: 'short', day: 'numeric' })})` : '')));
      y = table(d, y, ['From', 'Request', 'Received', 'Status'], rows, { columnStyles: { 0: { cellWidth: 60 }, 2: { cellWidth: 60 }, 3: { cellWidth: 130 } } });
    }

    const ins = log.inspection || {};
    if (ins.enabled && (ins.items || []).length) {
      y = sectionTitle(d, y, `BMP inspection – ${ins.type || 'Routine'}${ins.rain ? ` · Rainfall ${ins.rain}"` : ''}`);
      y = table(d, y, ['BMP / location', 'Condition', 'Deficiency / corrective action'],
        ins.items.map((i) => [i.name, COND[i.cond || ''], i.note || '']), {
          columnStyles: { 1: { cellWidth: 105 } },
          didParseCell: (h) => {
            if (h.section !== 'body' || h.column.index !== 1) return;
            const tint = { 'Good': [46, 125, 80], 'Needs maintenance': [176, 116, 20], 'Failed': [178, 52, 40] }[h.cell.raw];
            if (tint) { h.cell.styles.textColor = tint; h.cell.styles.fontStyle = 'bold'; }
          },
        });
    }

    if (log.notes) {
      y = sectionTitle(d, y, 'Notes');
      y = paragraph(d, y + 6, log.notes);
    }

    if (photos.length) {
      y = sectionTitle(d, y, `Photos (${photos.length})`);
      y += 4;
      const gap = 12;
      const colW = (W - M * 2 - gap) / 2;
      const maxH = 190;
      let col = 0;
      let rowH = 0;
      photos.forEach((p) => {
        const ratio = (p.h || 3) / (p.w || 4);
        let w = colW, h = colW * ratio;
        if (h > maxH) { h = maxH; w = h / ratio; }
        const capLines = p.caption ? d.splitTextToSize(p.caption, colW) : [];
        const block = h + 6 + capLines.length * 11;
        if (col === 0) { y = ensure(d, y, block); rowH = 0; }
        const x = M + col * (colW + gap) + (colW - w) / 2;
        try { d.addImage(p.dataUrl, 'JPEG', x, y, w, h, undefined, 'FAST'); } catch (_) { /* skip unreadable */ }
        d.setDrawColor(...LINE); d.rect(x, y, w, h);
        if (capLines.length) {
          d.setFont('helvetica', 'normal'); d.setFontSize(8.5); d.setTextColor(...MUTED);
          d.text(capLines, M + col * (colW + gap), y + h + 12);
          d.setTextColor(...INK);
        }
        rowH = Math.max(rowH, block);
        col++;
        if (col === 2) { col = 0; y += rowH + 14; }
      });
      if (col === 1) y += rowH + 14;
    }

    // signature block
    y = ensure(d, y + 10, 60);
    d.setDrawColor(...SOIL);
    d.setLineWidth(0.6);
    const half = (W - M * 2 - 30) / 2;
    d.line(M, y + 30, M + half, y + 30);
    d.line(M + half + 30, y + 30, W - M, y + 30);
    d.setFont('helvetica', 'normal'); d.setFontSize(8.5); d.setTextColor(...MUTED);
    d.text(`Foreman${log.foreman ? ' – ' + log.foreman : ''}`, M, y + 42);
    d.text('GC / Inspector acknowledgment', M + half + 30, y + 42);
    if (log.submittedAt) d.text(`Submitted ${date(log.submittedAt, { month: 'short', day: 'numeric', year: 'numeric' })} by ${log.submittedBy || ''}`, M, y + 8);

    footers(d, `${job.name} · Daily report ${log.date} · generated ${new Date().toLocaleString('en-US')}`);
    return d.output('blob');
  }

  function quantityReport({ job, totals, from, to, company, by, billRepairs }) {
    const d = doc();
    const period = from || to ? `${from ? date(from, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Start'} – ${to ? date(to, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today'}` : 'All dates';
    let y = header(d, 'Quantity Summary', company, period);
    y = infoGrid(d, y, [
      ['Project', job.name + (job.number ? `  (#${job.number})` : '')],
      ['General contractor', job.gc],
      ['Location', job.location],
      ['Permit / SWPPP #', job.permit],
      ['Work days', String(totals.days)],
      ['Crew hours', fmt(totals.hours, 1)],
    ].filter((p) => p[1]));

    y = sectionTitle(d, y + 4, 'BMP / pay item quantities');
    const priced = totals.rows.some((r) => r.rate);
    y = totals.rows.length
      ? table(d, y,
        priced ? ['Item', 'Unit', 'Installed', 'Repair / maint', 'Unit rate', 'Amount'] : ['Item', 'Unit', 'Installed', 'Repair / maint'],
        totals.rows.map((r) => {
          const base = [r.name, r.unit, fmt(r.installed), r.maint ? fmt(r.maint) : '—'];
          return priced ? [...base, r.rate ? money(r.rate) : '—', r.rate ? money(r.amount) : '—'] : base;
        }),
        {
          foot: priced ? ['Total', '', '', '', '', money(totals.amount)] : undefined,
          columnStyles: { 1: { cellWidth: 40 }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
        })
      : paragraph(d, y + 6, 'No quantities recorded in this period.');
    if (priced) {
      d.setFontSize(8.5); d.setTextColor(...MUTED);
      d.text(billRepairs ? 'Amount = (installed + repair/maintenance) × unit rate.' : 'Amount = installed quantity × unit rate. Repair/maintenance quantities shown for reference.', M, y - 6);
      d.setTextColor(...INK);
      y += 8;
    }

    if (totals.materials.length) {
      y = sectionTitle(d, y, 'Materials used');
      y = table(d, y, ['Material', 'Unit', 'Quantity'], totals.materials.map((m) => [m.item, m.unit, fmt(m.qty)]), { columnStyles: { 2: { halign: 'right' } } });
    }

    footers(d, `${job.name} · Quantity summary · ${by ? 'prepared by ' + by + ' · ' : ''}${new Date().toLocaleString('en-US')}`);
    return d.output('blob');
  }

  /* Driver Vehicle Inspection Report (pre-trip / post-trip). */
  function dvirReport({ dvir, vehicle, trailer, checklists, defects, company, job }) {
    const d = doc();
    const kind = dvir.kind === 'post' ? 'Post-trip' : 'Pre-trip';
    let y = header(d, 'Driver Vehicle Inspection Report', company, `${kind} · ${date(dvir.date, { month: 'short', day: 'numeric', year: 'numeric' })}`);
    const isEquip = vehicle && vehicle.type === 'Equipment';
    y = infoGrid(d, y, [
      ['Report type', kind],
      ['Date / time', `${date(dvir.date, { month: 'short', day: 'numeric', year: 'numeric' })}${dvir.time ? ' ' + dvir.time : ''}`],
      [isEquip ? 'Equipment' : 'Vehicle', vehicle ? `Unit ${vehicle.unit}${vehicle.desc ? ' – ' + vehicle.desc : ''}` : '—'],
      ['Plate', vehicle && vehicle.plate],
      ['Trailer', trailer ? `Unit ${trailer.unit}${trailer.desc ? ' – ' + trailer.desc : ''}${trailer.plate ? ' (' + trailer.plate + ')' : ''}` : 'None'],
      [isEquip ? 'Hour meter' : 'Odometer', dvir.odometer],
      ['Driver / operator', dvir.driver],
      ['Job', job && job.name],
    ].filter((p) => p[1]));

    checklists.forEach((g) => {
      y = sectionTitle(d, y + 2, g.title);
      const rows = g.list.map((name) => {
        const v = (dvir.items || {})[g.prefix + name];
        return [name, v === 'def' ? 'DEFECT' : v === 'ok' ? 'OK' : '—', v === 'def' ? ((dvir.notes || {})[g.prefix + name] || '') : ''];
      });
      y = table(d, y, ['Item', 'Condition', 'Defect description'], rows, {
        columnStyles: { 1: { cellWidth: 70 } },
        didParseCell: (h) => {
          if (h.section !== 'body' || h.column.index !== 1) return;
          if (h.cell.raw === 'DEFECT') { h.cell.styles.textColor = [178, 52, 40]; h.cell.styles.fontStyle = 'bold'; }
          if (h.cell.raw === 'OK') h.cell.styles.textColor = [46, 125, 80];
        },
      });
    });

    y = sectionTitle(d, y, 'Condition');
    y = paragraph(d, y + 6, defects.length
      ? `${defects.length} defect(s) reported. ${dvir.status === 'corrected' ? '' : 'Vehicle requires mechanic review before the next trip.'}`
      : 'No defects found that would affect the safe operation of this vehicle.');
    if (dvir.remarks) { y = sectionTitle(d, y, 'Remarks'); y = paragraph(d, y + 6, dvir.remarks); }

    // Driver signature
    y = ensure(d, y + 6, 90);
    d.setFont('helvetica', 'normal'); d.setFontSize(8.5); d.setTextColor(...MUTED);
    d.text('I certify that I have inspected this vehicle as indicated above.', M, y);
    if (dvir.sig) { try { d.addImage(dvir.sig, 'PNG', M, y + 4, 180, 50, undefined, 'FAST'); } catch (_) { /* ignore */ } }
    d.setDrawColor(...SOIL); d.setLineWidth(0.6);
    d.line(M, y + 58, M + 220, y + 58);
    d.text(`Driver: ${dvir.driver || ''}${dvir.signedAt ? '  ·  ' + new Date(dvir.signedAt).toLocaleString('en-US') : ''}`, M, y + 70);
    y += 104;

    if (defects.length) {
      y = sectionTitle(d, y, 'Mechanic / supervisor certification');
      const c = dvir.correction;
      y = paragraph(d, y + 6, c
        ? `${c.needNot ? '[X] Defects need not be corrected for safe operation' : '[X] Defects corrected'}${c.note ? ' — ' + c.note : ''}\nSigned: ${c.by || ''}  ·  ${new Date(c.at).toLocaleString('en-US')}`
        : '[ ] Defects corrected     [ ] Defects need not be corrected for safe operation\n\nMechanic signature: ______________________________   Date: ____________');
    }
    footers(d, `DVIR · Unit ${vehicle ? vehicle.unit : ''} · ${kind} ${dvir.date} · generated ${new Date().toLocaleString('en-US')}`);
    return d.output('blob');
  }

  window.PDF = { dailyReport, quantityReport, dvirReport };
})();
