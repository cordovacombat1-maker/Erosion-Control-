/* Fleet & DVIRs: pre-trip / post-trip driver vehicle inspection reports (FMCSA §396.11 / §396.13). */
(function () {
  'use strict';

  const { $, $$, esc, today, fmtDate, fmtShort, fmtWhen, toast, sheet, confirmSheet } = UI;
  const SL = window.SL;
  const { S, ICON } = SL;

  const CHECKLISTS = {
    Truck: [
      'Service brakes', 'Parking brake', 'Air lines / brake hoses', 'Steering', 'Lights & reflectors', 'Turn signals & flashers',
      'Tires', 'Wheels, rims & lug nuts', 'Horn', 'Windshield & wipers', 'Mirrors', 'Suspension & springs',
      'Fluid levels (oil, coolant, hydraulic)', 'Leaks', 'Exhaust', 'Frame & body', 'Coupling / 5th wheel / hitch',
      'Seat belts', 'Emergency equipment (extinguisher, triangles)', 'Backup alarm', 'Load securement',
    ],
    Trailer: [
      'Brakes', 'Breakaway switch & safety chains', 'Coupling / hitch / pintle', 'Lights & reflectors', 'Tires',
      'Wheels, rims & lug nuts', 'Suspension', 'Deck & ramps', 'Tie-downs & binders', 'Frame',
    ],
    Equipment: [
      'Engine oil', 'Coolant', 'Hydraulic fluid & hoses', 'Fuel', 'Tires / tracks', 'Lights', 'Backup alarm',
      'Seat belt / ROPS', 'Controls & safety interlocks', 'Attachments / quick coupler', 'Grease points',
      'Fire extinguisher', 'Leaks', 'Glass & mirrors',
    ],
  };
  const TYPES = ['Truck', 'Trailer', 'Equipment'];
  const TRUCK = '<svg viewBox="0 0 24 24"><path d="M1 16V6h13v10M14 9h4l4 4v3h-8"/><circle cx="6" cy="17.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/></svg>';

  const vehicleLabel = (v) => (v ? `Unit ${v.unit}${v.desc ? ' · ' + v.desc : ''}` : '—');
  const kindLabel = (k) => (k === 'post' ? 'Post-trip' : 'Pre-trip');
  const defects = (d) => Object.entries(d.items || {}).filter(([, v]) => v === 'def').map(([k]) => ({ item: k.replace(/^[TV]:/, ''), note: (d.notes || {})[k] || '', trailer: k.startsWith('T:') }));

  function statusPill(d) {
    if (d.status === 'draft') return '<span class="pill">Draft</span>';
    if (d.status === 'defects') return `<span class="pill bad">${defects(d).length} defect${defects(d).length === 1 ? '' : 's'}</span>`;
    if (d.status === 'corrected') return `<span class="pill ok">${ICON.check}Corrected</span>`;
    return `<span class="pill ok">${ICON.check}No defects</span>`;
  }

  /* ---------- Fleet overview ---------- */
  async function fleetView(token) {
    SL.setHeader('Fleet & DVIRs', 'Pre-trip · post-trip · defects', '#/jobs');
    const [vehicles, dvirs] = await Promise.all([DB.all('vehicles'), DB.all('dvirs')]);
    if (SL.stale(token)) return;
    const vmap = Object.fromEntries(vehicles.map((v) => [v.id, v]));
    dvirs.sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')) || b.createdAt.localeCompare(a.createdAt));
    const open = dvirs.filter((d) => d.status === 'defects');
    const t = today();
    const mineToday = dvirs.filter((d) => d.date === t && d.status !== 'draft' && S.me && d.driverId === S.me.id);

    SL.app.innerHTML = `
      <div class="dvir-cta">
        <button class="cta" data-f="pre"><span class="cta-icon">${TRUCK}</span><span class="cta-text"><b>Pre-trip</b><small>${mineToday.some((d) => d.kind === 'pre') ? 'Done today ✓' : 'Before you roll'}</small></span></button>
        <button class="cta dark" data-f="post"><span class="cta-icon">${ICON.check}</span><span class="cta-text"><b>Post-trip</b><small>${mineToday.some((d) => d.kind === 'post') ? 'Done today ✓' : 'End of day'}</small></span></button>
      </div>

      ${open.length ? `<h2 class="section-title">Open defects <small>${open.length}</small></h2>
        <div class="alerts">${open.map((d) => `
          <a class="alert bad" href="#/dvir/${d.id}"><span class="alert-icon">${ICON.flag}</span>
            <span class="grow"><b>${esc(vehicleLabel(vmap[d.vehicleId]))}</b><small>${esc(defects(d).map((x) => x.item).join(', '))} · ${fmtShort(d.date)} · ${esc(d.driver || '')}</small></span><span class="go">›</span></a>`).join('')}</div>` : ''}

      <h2 class="section-title">Recent reports</h2>
      ${dvirs.length ? `<div class="list">${dvirs.slice(0, 30).map((d) => `
        <a class="card log-card" href="#/dvir/${d.id}">
          <div class="date-block"><b>${new Date(d.date + 'T12:00').getDate()}</b><span>${fmtDate(d.date, { month: 'short' })}</span></div>
          <div class="log-main">
            <div class="log-title">${kindLabel(d.kind)} · ${esc(vmap[d.vehicleId] ? 'Unit ' + vmap[d.vehicleId].unit : '—')}${statusPill(d)}</div>
            <p class="meta">${esc(d.driver || '—')}${d.time ? ' · ' + esc(d.time) : ''}${d.odometer ? ' · ' + esc(d.odometer) + (vmap[d.vehicleId] && vmap[d.vehicleId].type === 'Equipment' ? ' hrs' : ' mi') : ''}${d.trailerId && vmap[d.trailerId] ? ' · w/ trailer ' + esc(vmap[d.trailerId].unit) : ''}</p>
          </div></a>`).join('')}</div>`
      : '<p class="muted pad center">No inspection reports yet. Tap Pre-trip before heading out.</p>'}

      <h2 class="section-title">Vehicles &amp; equipment <small>${vehicles.length}</small></h2>
      <div class="card">
        <ul class="people">${vehicles.sort((a, b) => String(a.unit).localeCompare(String(b.unit), undefined, { numeric: true })).map((v) => `
          <li data-vid="${v.id}"><span class="avatar">${esc(String(v.unit).slice(0, 3))}</span>
            <div class="grow"><b>${esc(v.type)} · Unit ${esc(v.unit)}</b><p class="meta">${esc([v.desc, v.plate && 'Plate ' + v.plate].filter(Boolean).join(' · ') || '—')}</p></div>
            ${open.some((d) => d.vehicleId === v.id || d.trailerId === v.id) ? '<span class="pill bad">Defect</span>' : ''}
            <button class="icon-btn" data-f="edit-v" aria-label="Edit">${ICON.edit}</button></li>`).join('') || '<li class="muted">Add your trucks, trailers and equipment.</li>'}</ul>
        <div class="pad"><button class="btn soft block" data-f="add-v">${ICON.plus} Add vehicle or equipment</button></div>
      </div>`;

    SL.app.onclick = async (e) => {
      const b = e.target.closest('[data-f]');
      if (!b) return;
      const f = b.dataset.f;
      if (f === 'pre' || f === 'post') startDvir(f);
      if (f === 'add-v') vehicleForm();
      if (f === 'edit-v') vehicleForm(vehicles.find((v) => v.id === b.closest('[data-vid]').dataset.vid));
    };
  }

  function vehicleForm(v, after) {
    const veh = v || { type: 'Truck' };
    sheet(v ? 'Edit vehicle' : 'Add vehicle / equipment', `
      <form class="form" id="vForm">
        <label>Type</label>
        <div class="seg wide" id="vType">${TYPES.map((t) => `<button type="button" data-t="${t}" class="${t === veh.type ? 'on' : ''}">${t}</button>`).join('')}</div>
        <input type="hidden" name="type" value="${esc(veh.type)}">
        <div class="grid2">
          <label>Unit # *<input name="unit" required value="${esc(veh.unit)}" placeholder="12"></label>
          <label>Plate<input name="plate" value="${esc(veh.plate)}"></label>
        </div>
        <label>Description<input name="desc" value="${esc(veh.desc)}" placeholder="2019 F-550 flatbed, JD 5075E tractor…"></label>
        <button class="btn primary block" type="submit">Save</button>
        ${v ? '<button type="button" class="btn danger-ghost block" id="vDel">Remove</button>' : ''}
      </form>`, (s, close) => {
      const form = s.querySelector('#vForm');
      s.querySelector('#vType').onclick = (e) => {
        const b = e.target.closest('button'); if (!b) return;
        s.querySelectorAll('#vType button').forEach((x) => x.classList.toggle('on', x === b));
        form.elements.type.value = b.dataset.t;
      };
      form.onsubmit = async (e) => {
        e.preventDefault();
        const d = Object.fromEntries(new FormData(form));
        const saved = await DB.put('vehicles', { ...veh, ...d, unit: d.unit.trim() });
        close();
        after ? after(saved) : SL.route();
      };
      const del = s.querySelector('#vDel');
      if (del) del.onclick = async () => { await DB.del('vehicles', v.id); close(); SL.route(); };
    });
  }

  async function startDvir(kind) {
    const vehicles = await DB.all('vehicles');
    if (!vehicles.some((v) => v.type !== 'Trailer')) {
      toast('Add a truck or piece of equipment first');
      vehicleForm(null, () => startDvir(kind));
      return;
    }
    const now = new Date();
    // Default to the unit this driver used last.
    const mine = (await DB.all('dvirs')).filter((d) => S.me && d.driverId === S.me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const d = await DB.put('dvirs', {
      kind, date: today(), time: now.toTimeString().slice(0, 5), status: 'draft',
      driver: S.me ? S.me.name : '', driverId: S.me && S.me.id,
      vehicleId: mine ? mine.vehicleId : (vehicles.find((v) => v.type !== 'Trailer') || {}).id,
      trailerId: mine ? mine.trailerId || '' : '', odometer: '', items: {}, notes: {}, remarks: '',
    });
    location.hash = '#/dvir/' + d.id;
  }

  /* ---------- DVIR form / view ---------- */
  async function dvirView(id, token) {
    const d = await DB.get('dvirs', id);
    if (!d) return SL.notFound('Inspection report');
    const [vehicles, all, jobs] = await Promise.all([DB.all('vehicles'), DB.all('dvirs'), DB.all('jobs')]);
    if (SL.stale(token)) return;
    const vmap = Object.fromEntries(vehicles.map((v) => [v.id, v]));
    const editable = d.status === 'draft';
    SL.setHeader(`${kindLabel(d.kind)} DVIR`, `${vmap[d.vehicleId] ? 'Unit ' + vmap[d.vehicleId].unit : ''} · ${fmtShort(d.date)}`, '#/fleet');

    const prev = () => all.filter((x) => x.id !== d.id && x.status !== 'draft' && x.vehicleId === d.vehicleId && (x.date + x.time) <= (d.date + d.time))
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))[0];

    const itemsFor = () => {
      const v = vmap[d.vehicleId];
      const t = vmap[d.trailerId];
      const groups = [];
      if (v) groups.push({ title: `${v.type === 'Equipment' ? 'Equipment' : 'Truck / tractor'} · Unit ${v.unit}`, prefix: 'V:', list: CHECKLISTS[v.type === 'Equipment' ? 'Equipment' : 'Truck'] });
      if (t) groups.push({ title: `Trailer · Unit ${t.unit}`, prefix: 'T:', list: CHECKLISTS.Trailer });
      return groups;
    };

    const draw = () => {
      const p = prev();
      const groups = itemsFor();
      const defs = defects(d);
      const nonTrailers = vehicles.filter((v) => v.type !== 'Trailer');
      const trailers = vehicles.filter((v) => v.type === 'Trailer');
      SL.app.innerHTML = `
        <div class="log-status"><span class="save-state">${editable ? 'Draft · saves as you go' : 'Signed ' + fmtWhen(d.signedAt || d.updatedAt)}</span>${statusPill(d)}</div>

        <section class="card sec">
          <div class="card-head"><h3>${TRUCK}Trip &amp; unit</h3></div>
          <div class="sec-body form">
            <div class="seg wide" id="kindSeg">${['pre', 'post'].map((k) => `<button type="button" data-k="${k}" class="${d.kind === k ? 'on' : ''}" ${editable ? '' : 'disabled'}>${kindLabel(k)}</button>`).join('')}</div>
            <div class="grid2">
              <label class="mini">Vehicle / equipment<select data-d="vehicleId" ${editable ? '' : 'disabled'}>${nonTrailers.map((v) => `<option value="${v.id}" ${v.id === d.vehicleId ? 'selected' : ''}>${esc(vehicleLabel(v))}</option>`).join('')}</select></label>
              <label class="mini">Trailer<select data-d="trailerId" ${editable ? '' : 'disabled'}><option value="">No trailer</option>${trailers.map((v) => `<option value="${v.id}" ${v.id === d.trailerId ? 'selected' : ''}>${esc(vehicleLabel(v))}</option>`).join('')}</select></label>
            </div>
            <div class="grid3">
              <label class="mini">Date<input type="date" data-d="date" value="${esc(d.date)}" ${editable ? '' : 'disabled'}></label>
              <label class="mini">Time<input type="time" data-d="time" value="${esc(d.time)}" ${editable ? '' : 'disabled'}></label>
              <label class="mini">${vmap[d.vehicleId] && vmap[d.vehicleId].type === 'Equipment' ? 'Hour meter' : 'Odometer'}<input inputmode="numeric" data-d="odometer" value="${esc(d.odometer)}" ${editable ? '' : 'disabled'}></label>
            </div>
            <div class="grid2">
              <label class="mini">Driver / operator<input data-d="driver" value="${esc(d.driver)}" ${editable ? '' : 'disabled'}></label>
              <label class="mini">Job (optional)<select data-d="jobId" ${editable ? '' : 'disabled'}><option value="">—</option>${jobs.filter((j) => j.status !== 'complete' || j.id === d.jobId).map((j) => `<option value="${j.id}" ${j.id === d.jobId ? 'selected' : ''}>${esc(j.name)}</option>`).join('')}</select></label>
            </div>
          </div>
        </section>

        ${d.kind === 'pre' ? `<section class="card sec">
          <div class="card-head"><h3>${ICON.doc}Last report on this unit</h3></div>
          <div class="sec-body">
            ${p ? `<p class="small-text" style="margin:0 0 8px"><b>${kindLabel(p.kind)} ${fmtDate(p.date, { month: 'short', day: 'numeric' })}${p.time ? ' ' + esc(p.time) : ''}</b> by ${esc(p.driver || '—')} · ${statusPill(p)}</p>
              ${p.status === 'defects' ? `<p class="warn-box">${ICON.flag}Defects on the last report have not been certified as corrected: ${esc(defects(p).map((x) => x.item).join(', '))}</p>` : ''}
              ${p.status === 'corrected' && p.correction ? `<p class="small-text muted" style="margin:0 0 8px">${esc(p.correction.needNot ? 'Defects need not be corrected for safe operation' : 'Defects corrected')} — ${esc(p.correction.by || '')}${p.correction.note ? ': ' + esc(p.correction.note) : ''}</p>` : ''}
              <label class="toggle"><input type="checkbox" data-d="reviewedPrev" ${d.reviewedPrev ? 'checked' : ''} ${editable ? '' : 'disabled'}><span></span>I reviewed the last DVIR for this unit</label>`
            : '<p class="muted small-text" style="margin:0">No earlier report on file for this unit.</p>'}
          </div>
        </section>` : ''}

        ${groups.map((g) => `
          <section class="card sec">
            <div class="card-head"><h3>${ICON.check}${esc(g.title)}</h3>${editable ? `<button class="btn small soft" data-f="all-ok" data-p="${g.prefix}">All OK</button>` : ''}</div>
            <div class="checklist">${g.list.map((name) => {
              const key = g.prefix + name;
              const v = (d.items || {})[key];
              return `<div class="chk ${v === 'def' ? 'is-def' : v === 'ok' ? 'is-ok' : ''}" data-key="${esc(key)}">
                <span class="chk-name">${esc(name)}</span>
                <span class="chk-btns">
                  <button type="button" data-f="set" data-v="ok" class="${v === 'ok' ? 'on' : ''}" ${editable ? '' : 'disabled'} aria-label="${esc(name)} OK">OK</button>
                  <button type="button" data-f="set" data-v="def" class="def ${v === 'def' ? 'on' : ''}" ${editable ? '' : 'disabled'} aria-label="${esc(name)} defect">Defect</button>
                </span>
                ${v === 'def' ? `<input class="chk-note" data-note="${esc(key)}" value="${esc((d.notes || {})[key])}" placeholder="Describe the defect (e.g. left rear tire low tread)" ${editable ? '' : 'disabled'}>` : ''}
              </div>`;
            }).join('')}</div>
          </section>`).join('')}

        <section class="card sec">
          <div class="card-head"><h3>${ICON.edit}Remarks</h3></div>
          <div class="sec-body"><textarea data-d="remarks" rows="3" placeholder="Anything else the mechanic or next driver should know" ${editable ? '' : 'disabled'}>${esc(d.remarks)}</textarea></div>
        </section>

        <section class="card sec">
          <div class="card-head"><h3>${ICON.check}Driver certification</h3></div>
          <div class="sec-body">
            <p class="small-text" style="margin:0 0 10px">I certify that I have inspected this ${vmap[d.vehicleId] && vmap[d.vehicleId].type === 'Equipment' ? 'equipment' : 'vehicle'} and that ${defs.length ? 'the defects listed above were found' : 'no defects were found that would affect its safe operation'}.</p>
            ${editable ? `<div class="sig-wrap"><canvas id="sig" class="sig"></canvas><span class="sig-hint">Sign here</span><button class="link-btn muted sig-clear" data-f="clear-sig">Clear</button></div>`
            : d.sig ? `<img class="sig-img" src="${d.sig}" alt="Driver signature">` : ''}
            <p class="meta">${esc(d.driver || '')}${d.signedAt ? ' · ' + fmtWhen(d.signedAt) : ''}</p>
          </div>
        </section>

        ${d.status === 'defects' || d.status === 'corrected' ? `
        <section class="card sec">
          <div class="card-head"><h3>${ICON.edit}Mechanic / supervisor sign-off</h3></div>
          <div class="sec-body">
            ${d.status === 'corrected' && d.correction ? `
              <p style="margin:0"><b>${esc(d.correction.needNot ? 'Defects need not be corrected for safe operation' : 'Defects corrected')}</b></p>
              <p class="meta">${esc(d.correction.by || '')} · ${fmtWhen(d.correction.at)}</p>
              ${d.correction.note ? `<p class="prewrap small-text">${esc(d.correction.note)}</p>` : ''}`
            : `<form class="form" id="fixForm">
                <div class="seg wide" id="fixSeg"><button type="button" class="on" data-n="0">Defects corrected</button><button type="button" data-n="1">Need not be corrected</button></div>
                <label>What was done<textarea name="note" rows="2" placeholder="e.g. Replaced LR tire, tested brake lights"></textarea></label>
                <label>Mechanic / supervisor<input name="by" value="${esc(S.me ? S.me.name : '')}" required></label>
                <button class="btn primary block" type="submit">${ICON.check} Sign off</button>
              </form>`}
          </div>
        </section>` : ''}

        <div class="log-actions">
          <button class="btn soft" data-f="pdf">${ICON.doc} PDF</button>
          ${editable ? `<button class="btn primary" data-f="submit">${ICON.send} Sign &amp; submit</button>` : `<button class="btn soft" data-f="new-${d.kind === 'pre' ? 'post' : 'pre'}">${d.kind === 'pre' ? 'Start post-trip' : 'Start pre-trip'}</button>`}
        </div>
        <button class="btn danger-ghost block" data-f="delete">Delete report</button>`;
      if (editable) initSig();
      bindFix();
    };

    let saveT;
    const save = () => { clearTimeout(saveT); saveT = setTimeout(() => DB.put('dvirs', d), 300); };
    const flush = async () => { clearTimeout(saveT); await DB.put('dvirs', d); };

    let sigCanvas = null, sigDirty = !!d.sig;
    function initSig() {
      const c = $('#sig');
      sigCanvas = c;
      const ratio = window.devicePixelRatio || 1;
      const w = c.clientWidth, h = c.clientHeight;
      c.width = w * ratio; c.height = h * ratio;
      const ctx = c.getContext('2d');
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = getComputedStyle(document.body).color;
      if (d.sig) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0, w, h); img.src = d.sig; c.parentElement.classList.add('signed'); }
      let drawing = false, last = null;
      const pos = (e) => { const r = c.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
      c.onpointerdown = (e) => { drawing = true; last = pos(e); c.setPointerCapture(e.pointerId); c.parentElement.classList.add('signed'); };
      c.onpointermove = (e) => {
        if (!drawing) return;
        const p = pos(e);
        ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
        last = p; sigDirty = true;
      };
      c.onpointerup = () => { drawing = false; if (sigDirty) { d.sig = sigToPng(c); save(); } };
    }
    // Save signatures as dark ink on transparent so they print on the PDF in either theme.
    function sigToPng(c) {
      const out = document.createElement('canvas');
      out.width = c.width; out.height = c.height;
      const o = out.getContext('2d');
      o.drawImage(c, 0, 0);
      o.globalCompositeOperation = 'source-in';
      o.fillStyle = '#111417';
      o.fillRect(0, 0, out.width, out.height);
      return out.toDataURL('image/png');
    }

    function bindFix() {
      const form = $('#fixForm');
      if (!form) return;
      let needNot = false;
      $('#fixSeg').onclick = (e) => {
        const b = e.target.closest('button'); if (!b) return;
        $$('#fixSeg button').forEach((x) => x.classList.toggle('on', x === b));
        needNot = b.dataset.n === '1';
      };
      form.onsubmit = async (e) => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(form));
        d.correction = { by: f.by.trim(), note: f.note.trim(), needNot, at: new Date().toISOString() };
        d.status = 'corrected';
        await DB.put('dvirs', d);
        const v = vmap[d.vehicleId];
        await SL.systemMessage('all', `signed off defects on ${v ? 'Unit ' + v.unit : 'a vehicle'} (${needNot ? 'need not be corrected' : 'corrected'})${d.correction.note ? ': ' + d.correction.note : ''}`);
        SL.notify();
        toast('Defects signed off');
        draw();
      };
    }

    SL.app.oninput = (e) => {
      const t = e.target;
      if (t.dataset.note) { d.notes = d.notes || {}; d.notes[t.dataset.note] = t.value; save(); return; }
      if (t.dataset.d && t.type !== 'checkbox' && t.tagName !== 'SELECT') { d[t.dataset.d] = t.value; save(); }
    };
    SL.app.onchange = (e) => {
      const t = e.target;
      if (!t.dataset.d) return;
      d[t.dataset.d] = t.type === 'checkbox' ? t.checked : t.value;
      save();
      if (t.tagName === 'SELECT' && (t.dataset.d === 'vehicleId' || t.dataset.d === 'trailerId')) draw();
    };
    SL.app.onclick = async (e) => {
      const b = e.target.closest('[data-f], [data-k]');
      if (!b) return;
      if (b.dataset.k && editable) { d.kind = b.dataset.k; save(); draw(); return; }
      const f = b.dataset.f;
      if (f === 'set') {
        const key = b.closest('[data-key]').dataset.key;
        d.items = d.items || {};
        d.items[key] = d.items[key] === b.dataset.v ? undefined : b.dataset.v;
        save(); draw();
        if (d.items[key] === 'def') { const n = SL.app.querySelector(`[data-note="${CSS.escape(key)}"]`); if (n) n.focus(); }
      } else if (f === 'all-ok') {
        const g = itemsFor().find((x) => x.prefix === b.dataset.p);
        g.list.forEach((name) => { if (d.items[g.prefix + name] !== 'def') d.items[g.prefix + name] = 'ok'; });
        save(); draw();
      } else if (f === 'clear-sig') {
        const c = sigCanvas; c.getContext('2d').clearRect(0, 0, c.width, c.height);
        d.sig = ''; sigDirty = false; c.parentElement.classList.remove('signed'); save();
      } else if (f === 'submit') {
        const groups = itemsFor();
        const unchecked = groups.flatMap((g) => g.list.filter((n) => !d.items[g.prefix + n]));
        if (!d.vehicleId) return toast('Pick a vehicle');
        if (unchecked.length) {
          if (!(await confirmSheet('Items not checked', `${unchecked.length} item(s) aren’t marked. Mark them all OK and submit?`, 'Mark OK & submit', false))) return;
          groups.forEach((g) => g.list.forEach((n) => { if (!d.items[g.prefix + n]) d.items[g.prefix + n] = 'ok'; }));
        }
        const defs = defects(d);
        if (defs.some((x) => !x.note.trim())) return toast('Describe each defect before submitting');
        if (!d.sig) return toast('Sign the report first');
        const p = prev();
        if (d.kind === 'pre' && p && !d.reviewedPrev) return toast('Confirm you reviewed the last DVIR');
        d.status = defs.length ? 'defects' : 'ok';
        d.signedAt = new Date().toISOString();
        await flush();
        const v = vmap[d.vehicleId];
        if (defs.length) {
          await DB.put('messages', {
            channel: 'all', system: false, urgent: true, authorId: S.me && S.me.id, authorName: S.me ? S.me.name : d.driver, role: S.me ? S.me.role : '',
            text: `${kindLabel(d.kind)} DVIR — ${defs.length} defect${defs.length > 1 ? 's' : ''} on ${v ? 'Unit ' + v.unit + (v.desc ? ' (' + v.desc + ')' : '') : 'vehicle'}:\n${defs.map((x) => `• ${x.trailer ? 'Trailer: ' : ''}${x.item} — ${x.note}`).join('\n')}`,
          });
        }
        SL.notify();
        toast(defs.length ? 'Submitted — defects sent to the team' : 'DVIR submitted');
        SL.route();
      } else if (f === 'pdf') {
        await flush();
        const blob = PDF.dvirReport({ dvir: d, vehicle: vmap[d.vehicleId], trailer: vmap[d.trailerId], checklists: itemsFor(), defects: defects(d), company: S.company, job: jobs.find((j) => j.id === d.jobId) });
        SL.deliverPdf(blob, `dvir-${d.kind}-unit-${vmap[d.vehicleId] ? vmap[d.vehicleId].unit : 'x'}-${d.date}.pdf`);
      } else if (f === 'new-pre' || f === 'new-post') {
        startDvir(f.slice(4));
      } else if (f === 'delete') {
        if (await confirmSheet('Delete report?', 'This inspection report will be permanently removed.')) {
          await DB.del('dvirs', d.id); SL.notify(); location.hash = '#/fleet';
        }
      }
    };

    draw();
  }

  SL.addRoute(/^#\/fleet$/, fleetView, 'jobs');
  SL.addRoute(/^#\/dvir\/([^/]+)$/, dvirView, 'jobs');
  window.Fleet = { startDvir, defects, vehicleLabel, TRUCK };
})();
