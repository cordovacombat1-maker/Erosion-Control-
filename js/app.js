/* SiltLine – erosion control field log. Views, routing, and interactions. */
(function () {
  'use strict';

  const { $, $$, esc, today, fmtDate, fmtShort, fmtWhen, num, fmtNum, money, initials, toast, sheet, closeSheet, confirmSheet } = UI;

  /* ---------- App state ---------- */
  const S = { me: null, company: '', catalog: [], people: [] };
  const app = $('#app');
  const bus = 'BroadcastChannel' in window ? new BroadcastChannel('siltline') : null;
  let renderToken = 0;

  async function loadSettings() {
    S.catalog = (await DB.getKV('catalog', null)) || Catalog.DEFAULT_CATALOG.map((x) => ({ ...x }));
    // Pick up newly added default items (stormwater, mowing…) once, without re-adding ones the user removed later.
    if ((await DB.getKV('catalogVersion', 1)) < Catalog.CATALOG_VERSION) {
      const have = new Set(S.catalog.map((c) => c.code));
      Catalog.DEFAULT_CATALOG.forEach((c) => { if (!have.has(c.code)) S.catalog.push({ ...c }); });
      await DB.setKV('catalog', S.catalog);
      await DB.setKV('catalogVersion', Catalog.CATALOG_VERSION);
    }
    S.company = await DB.getKV('company', '');
    S.people = (await DB.all('people')).sort((a, b) => a.name.localeCompare(b.name));
    const meId = await DB.getKV('meId', null);
    S.me = S.people.find((p) => p.id === meId) || null;
  }

  function bmpDef(code) {
    return S.catalog.find((c) => c.code === code) || null;
  }

  function itemKey(row) {
    return row.code === 'OTHER' ? `OTHER:${(row.name || '').trim().toLowerCase()}` : row.code;
  }

  function roleClass(role) {
    return 'role-' + String(role || 'crew').toLowerCase();
  }

  function notify() {
    if (bus) bus.postMessage('changed');
    refreshBadges();
  }

  /* Post an automatic note into a channel so the whole team sees field activity. */
  async function systemMessage(channel, text) {
    await DB.put('messages', {
      channel, text, system: true,
      authorId: S.me && S.me.id, authorName: S.me ? S.me.name : 'Someone', role: S.me ? S.me.role : '',
    });
  }

  const ICON = {
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 22s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    hard: '<svg viewBox="0 0 24 24"><path d="M3 18h18M5 18v-3a7 7 0 0 1 14 0v3M10 8V5h4v3"/></svg>',
    doc: '<svg viewBox="0 0 24 24"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></svg>',
    cam: '<svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
    chat: '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    flag: '<svg viewBox="0 0 24 24"><path d="M4 22V4M4 4h13l-2 4 2 4H4"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>',
    send: '<svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    ruler: '<svg viewBox="0 0 24 24"><path d="M3 17l14-14 4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2"/></svg>',
    users: '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg>',
  };

  /* ---------- Header / nav ---------- */
  function setHeader(title, sub, backHref) {
    $('#pageTitle').textContent = title;
    $('#pageSub').textContent = sub || (S.company || 'Erosion Control Field Log');
    const back = $('#backBtn');
    back.hidden = !backHref;
    back.onclick = () => { location.hash = backHref; };
    document.title = title === 'SiltLine' ? 'SiltLine – Erosion Control Field Log' : `${title} · SiltLine`;
  }

  function renderUserChip() {
    const chip = $('#userChip');
    if (!S.me) { chip.innerHTML = '<span class="avatar">?</span>'; return; }
    chip.innerHTML = `<span class="avatar ${roleClass(S.me.role)}">${esc(initials(S.me.name))}</span>
      <span class="chip-text"><b>${esc(S.me.name.split(' ')[0])}</b><small>${esc(S.me.role)}</small></span>`;
  }

  async function refreshBadges() {
    const [reqs, msgs] = await Promise.all([DB.all('requests'), DB.all('messages')]);
    const open = reqs.filter((r) => r.status !== 'done').length;
    const rb = $('#reqBadge');
    rb.hidden = !open; rb.textContent = open;
    const unread = await unreadCounts(msgs);
    const total = Object.values(unread).reduce((a, b) => a + b, 0);
    const mb = $('#msgBadge');
    mb.hidden = !total; mb.textContent = total > 99 ? '99+' : total;
  }

  async function unreadCounts(msgs) {
    if (!S.me) return {};
    const lastRead = await DB.getKV('lastRead:' + S.me.id, {});
    const out = {};
    for (const m of msgs) {
      if (m.authorId === S.me.id) continue;
      if (m.createdAt > (lastRead[m.channel] || '')) out[m.channel] = (out[m.channel] || 0) + 1;
    }
    return out;
  }

  async function markRead(channel) {
    if (!S.me) return;
    const key = 'lastRead:' + S.me.id;
    const lr = await DB.getKV(key, {});
    lr[channel] = new Date().toISOString();
    await DB.setKV(key, lr);
    refreshBadges();
  }

  /* ---------- Router ---------- */
  const routes = [
    [/^#\/jobs$/, jobsView, 'jobs'],
    [/^#\/job\/([^/?]+)(?:\?t=(\w+))?$/, jobView, 'jobs'],
    [/^#\/log\/([^/]+)$/, logView, 'jobs'],
    [/^#\/requests$/, requestsView, 'requests'],
    [/^#\/messages$/, messagesView, 'messages'],
    [/^#\/chat\/([^/]+)$/, chatView, 'messages'],
    [/^#\/settings$/, settingsView, 'settings'],
  ];

  async function route() {
    const hash = location.hash || '#/jobs';
    closeSheet();
    for (const [re, fn, tab] of routes) {
      const m = hash.match(re);
      if (!m) continue;
      $$('#tabbar a').forEach((a) => a.classList.toggle('active', a.dataset.tab === tab));
      document.body.dataset.view = fn.name;
      app.onclick = app.oninput = app.onchange = null;
      clearInterval(heroTimer);
      const token = ++renderToken;
      try {
        await fn(...m.slice(1), token);
      } catch (err) {
        console.error(err);
        app.innerHTML = `<div class="empty"><h3>Something went wrong</h3><p class="muted">${esc(err.message)}</p></div>`;
      }
      if (!hash.startsWith('#/chat')) window.scrollTo(0, 0);
      return;
    }
    location.hash = '#/jobs';
  }

  function stale(token) { return token !== renderToken; }

  function notFound(what) {
    setHeader('Not found', '', '#/jobs');
    app.innerHTML = `<div class="empty"><h3>${esc(what)} not found</h3><a class="btn primary" href="#/jobs">Back to jobs</a></div>`;
  }

  /* ---------- Totals ---------- */
  function computeTotals(logs, from, to, billRepairs) {
    const items = new Map();
    const mats = new Map();
    let hours = 0;
    const days = new Set();
    for (const l of logs) {
      if (from && l.date < from) continue;
      if (to && l.date > to) continue;
      days.add(l.date);
      (l.crew || []).forEach((c) => { hours += num(c.hours); });
      const touch = (row) => {
        const k = itemKey(row);
        if (!items.has(k)) {
          const def = bmpDef(row.code);
          items.set(k, {
            key: k, code: row.code,
            name: def ? def.name : row.name || 'Other',
            unit: def ? def.unit : row.unit || '',
            rate: def ? num(def.rate) : 0,
            installed: 0, maint: 0,
          });
        }
        return items.get(k);
      };
      (l.bmps || []).forEach((b) => { if (num(b.qty)) touch(b).installed += num(b.qty); });
      (l.maint || []).forEach((m) => { if (m.code && num(m.qty)) touch(m).maint += num(m.qty); });
      (l.materials || []).forEach((m) => {
        if (!m.item || !num(m.qty)) return;
        const k = m.item.trim().toLowerCase() + '|' + (m.unit || '');
        const cur = mats.get(k) || { item: m.item.trim(), unit: m.unit || '', qty: 0 };
        cur.qty += num(m.qty);
        mats.set(k, cur);
      });
    }
    const rows = [...items.values()].map((r) => ({
      ...r, amount: (r.installed + (billRepairs ? r.maint : 0)) * r.rate,
    })).sort((a, b) => a.name.localeCompare(b.name));
    const amount = rows.reduce((a, r) => a + r.amount, 0);
    return { rows, materials: [...mats.values()], hours, days: days.size, amount };
  }

  /* ---------- Stormwater helpers ---------- */
  const addDays = (iso, n) => {
    const d = new Date(iso + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };

  function lastInspection(logs) {
    return logs.filter((l) => l.inspection && l.inspection.enabled && (l.inspection.items || []).length)
      .map((l) => l.date).sort().pop() || '';
  }

  /* Where a job stands on SWPPP inspections: post-rain trigger first, then the routine interval. */
  function stormStatus(job, logs, rain) {
    const trigger = num(job.rainTrigger) || 0.5;
    const freq = num(job.inspectDays) || 7;
    const last = lastInspection(logs);
    const t = today();
    const big = rain.filter((r) => num(r.inches) >= trigger && (!last || r.date > last))
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    if (big) {
      const overdue = big.date < addDays(t, -1);
      return { state: overdue ? 'overdue' : 'rain', event: big, last, trigger, freq,
        title: overdue ? 'Post-rain inspection overdue' : 'Post-rain inspection due',
        detail: `${fmtNum(big.inches)}" of rain on ${fmtShort(big.date)}. Inspect within 24 hrs.` };
    }
    const next = addDays(last || job.start || t, freq);
    if (next < t) return { state: 'overdue', last, next, trigger, freq, title: 'Routine inspection overdue', detail: `Was due ${fmtShort(next)}${last ? ` · last ${fmtShort(last)}` : ''}` };
    if (next <= addDays(t, 1)) return { state: 'soon', last, next, trigger, freq, title: 'Routine inspection due', detail: `Due ${next === t ? 'today' : 'tomorrow'}${last ? ` · last ${fmtShort(last)}` : ''}` };
    return { state: 'ok', last, next, trigger, freq, title: 'Inspections current', detail: `Next routine ${fmtShort(next)}${last ? ` · last ${fmtShort(last)}` : ''}` };
  }

  let heroTimer = null;

  /* Crossfading illustrated banner. */
  function sceneHero(inner, scenes = Art.ORDER) {
    const start = new Date().getDate() % scenes.length;
    return `<section class="scene-hero">
      <div class="scene-stage">${scenes.map((s, i) => `<div class="scene ${i === start ? 'on' : ''}">${Art.scene(s)}</div>`).join('')}</div>
      <div class="scene-shade"></div>
      <div class="scene-overlay">${inner}</div>
      ${scenes.length > 1 ? `<div class="scene-dots">${scenes.map((s, i) => `<button data-scene="${i}" class="${i === start ? 'on' : ''}" aria-label="Scene ${i + 1}"></button>`).join('')}</div>` : ''}
    </section>`;
  }

  function startSceneRotation(root) {
    clearInterval(heroTimer);
    const scenes = $$('.scene-hero .scene', root);
    const dots = $$('.scene-dots button', root);
    if (scenes.length < 2) return;
    let i = scenes.findIndex((s) => s.classList.contains('on'));
    const show = (k) => {
      i = (k + scenes.length) % scenes.length;
      scenes.forEach((s, j) => s.classList.toggle('on', j === i));
      dots.forEach((d, j) => d.classList.toggle('on', j === i));
    };
    dots.forEach((d) => { d.onclick = (e) => { e.stopPropagation(); show(+d.dataset.scene); startSceneRotation(root); }; });
    heroTimer = setInterval(() => show(i + 1), 7000);
  }

  /* Fun conversions that make the month's numbers mean something on the jobsite. */
  function funStats(logs, rain) {
    const t = today();
    const from = t.slice(0, 8) + '01';
    const tot = computeTotals(logs, from, t, false);
    const get = (...codes) => tot.rows.filter((r) => codes.includes(r.code)).reduce((a, r) => a + r.installed + r.maint, 0);
    const lfFence = get('SF', 'SSF');
    const lfWattle = get('WAT', 'CFS');
    const inlets = get('IP', 'CIP', 'INLC');
    const acres = get('MOW', 'POND_MOW');
    const rainIn = rain.filter((r) => r.date >= from).reduce((a, r) => a + num(r.inches), 0);
    return [
      { k: 'fence', big: fmtNum(lfFence, 0), unit: 'LF', label: 'Silt fence', fun: `≈ ${fmtNum(lfFence / 360, 1)} football fields long` },
      { k: 'wattle', big: fmtNum(lfWattle, 0), unit: 'LF', label: 'Wattles & socks', fun: `≈ ${fmtNum(lfWattle / 5280, 2)} miles of straw` },
      { k: 'inlet', big: fmtNum(inlets, 0), unit: 'EA', label: 'Inlets protected', fun: inlets ? 'Storm drains say thanks' : 'Protect the drains!' },
      { k: 'mow', big: fmtNum(acres, 1), unit: 'AC', label: 'Mowed', fun: `≈ ${fmtNum(acres / 1.32, 1)} football fields cut` },
      { k: 'rain', big: fmtNum(rainIn, 2), unit: 'IN', label: 'Rain logged', fun: `≈ ${fmtNum(rainIn * 27154, 0)} gal of runoff per acre` },
      { k: 'hours', big: fmtNum(tot.hours, 0), unit: 'HRS', label: 'Crew hours', fun: `≈ ${fmtNum(tot.hours / 8, 0)} crew-days in the dirt` },
    ];
  }

  const STAT_ICON = {
    fence: '<svg viewBox="0 0 24 24"><path d="M4 20V6M10 20V6M16 20V6M22 20V6M1 9h23M1 16h23"/></svg>',
    wattle: '<svg viewBox="0 0 24 24"><rect x="2" y="9" width="20" height="7" rx="3.5"/><path d="M6 9l2 7M11 9l2 7M16 9l2 7"/></svg>',
    inlet: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 7v10M11 7v10M15 7v10M19 7v10"/></svg>',
    mow: '<svg viewBox="0 0 24 24"><circle cx="7" cy="17" r="4"/><circle cx="18" cy="18" r="2.5"/><path d="M7 13V6h6l3 6h3v4M13 6v6h5"/></svg>',
    rain: '<svg viewBox="0 0 24 24"><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/></svg>',
    hours: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  };

  /* ======================================================================
     HOME / JOBS
     ====================================================================== */
  async function jobsView(token) {
    setHeader('SiltLine', S.company || 'Erosion Control Field Log');
    const [jobs, logs, reqs, rain] = await Promise.all([DB.all('jobs'), DB.all('logs'), DB.all('requests'), DB.all('rain')]);
    if (stale(token)) return;
    const filter = sessionStorage.getItem('jobFilter') || 'active';
    const lastLog = {};
    logs.forEach((l) => { if (!lastLog[l.jobId] || l.date > lastLog[l.jobId]) lastLog[l.jobId] = l.date; });
    const openReq = {};
    reqs.forEach((r) => { if (r.status !== 'done') openReq[r.jobId] = (openReq[r.jobId] || 0) + 1; });
    const active = jobs.filter((j) => j.status !== 'complete');
    const shown = (filter === 'all' ? jobs : filter === 'complete' ? jobs.filter((j) => j.status === 'complete') : active)
      .sort((a, b) => (lastLog[b.id] || b.createdAt).localeCompare(lastLog[a.id] || a.createdAt));
    const t = today();

    // Things that need the foreman's attention today.
    const alerts = [];
    const storm = {};
    active.forEach((j) => {
      const st = stormStatus(j, logs.filter((l) => l.jobId === j.id), rain.filter((r) => r.jobId === j.id));
      storm[j.id] = st;
      if (st.state !== 'ok') alerts.push({ kind: st.state === 'soon' ? 'soon' : 'rain', href: `#/job/${j.id}?t=storm`, title: st.title, detail: `${j.name} · ${st.detail}` });
    });
    const overdue = reqs.filter((r) => r.status !== 'done' && r.due && r.due < t);
    if (overdue.length) alerts.push({ kind: 'bad', href: '#/requests', title: `${overdue.length} overdue request${overdue.length > 1 ? 's' : ''}`, detail: overdue.slice(0, 2).map((r) => r.title || r.desc).join(' · ') });
    const drafts = logs.filter((l) => !l.submittedAt && l.date < t);
    if (drafts.length) alerts.push({ kind: 'draft', href: `#/log/${drafts[0].id}`, title: `${drafts.length} log${drafts.length > 1 ? 's' : ''} not submitted`, detail: 'Finish up and send to the office' });

    const hour = new Date().getHours();
    const hello = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
    const name = S.me ? S.me.name.split(' ')[0] : 'boss';
    const tagline = Catalog.TAGLINES[new Date().getDate() % Catalog.TAGLINES.length];
    const todayJob = active.length === 1 ? active[0] : null;
    const stats = funStats(logs, rain);

    app.innerHTML = `
      ${sceneHero(`
        <p class="eyebrow light">${fmtDate(t, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <h1>${hello}, ${esc(name)}</h1>
        <p class="tagline">${esc(tagline)}</p>`)}
      ${jobs.length ? `
      <button class="cta" data-act="start-log">
        <span class="cta-icon">${ICON.doc}</span>
        <span class="cta-text"><b>Start today’s log</b><small>${todayJob ? esc(todayJob.name) : active.length ? `Pick from ${active.length} active jobs` : 'No active jobs'}</small></span>
        <span class="cta-go">›</span>
      </button>
      ${alerts.length ? `<div class="alerts">${alerts.map((a) => `
        <a class="alert ${a.kind}" href="${a.href}">
          <span class="alert-icon">${a.kind === 'rain' ? STAT_ICON.rain : a.kind === 'bad' ? ICON.flag : a.kind === 'soon' ? ICON.check : ICON.doc}</span>
          <span class="grow"><b>${esc(a.title)}</b><small>${esc(a.detail)}</small></span><span class="go">›</span>
        </a>`).join('')}</div>` : `<div class="all-good">${ICON.check}<span><b>All clear.</b> No inspections due, no overdue requests.</span></div>`}
      <div class="quick-grid">
        <button class="tile t-log" data-act="start-log"><span>${ICON.doc}</span>Daily log</button>
        <button class="tile t-rain" data-act="rain"><span>${STAT_ICON.rain}</span>Rain gauge</button>
        <button class="tile t-req" data-act="req"><span>${ICON.flag}</span>Request</button>
        <a class="tile t-chat" href="#/messages"><span>${ICON.chat}</span>Crew chat</a>
      </div>
      <h2 class="section-title">This month in the dirt</h2>
      <div class="fun-stats">${stats.map((s) => `
        <div class="fun ${s.k}"><span class="fun-icon">${STAT_ICON[s.k]}</span>
          <b>${s.big}<small>${s.unit}</small></b><span class="fun-label">${s.label}</span><span class="fun-sub">${esc(s.fun)}</span></div>`).join('')}
      </div>
      <h2 class="section-title">Jobs <small>${active.length} active</small></h2>
      <div class="toolbar">
        <div class="seg" role="tablist">
          ${['active', 'complete', 'all'].map((f) => `<button data-filter="${f}" class="${f === filter ? 'on' : ''}">${f[0].toUpperCase() + f.slice(1)}</button>`).join('')}
        </div>
        ${jobs.length > 3 ? '<input class="search" type="search" placeholder="Search jobs" id="jobSearch" aria-label="Search jobs">' : ''}
      </div>` : ''}
      <div class="list" id="jobList">
        ${shown.map((j) => {
          const st = storm[j.id];
          return `
          <a class="card job-card" href="#/job/${j.id}" data-search="${esc((j.name + ' ' + (j.gc || '') + ' ' + (j.location || '') + ' ' + (j.number || '')).toLowerCase())}">
            <div class="job-thumb">${Art.scene(Art.forId(j.id))}</div>
            <div class="job-body">
              <div class="job-top">
                <h3>${esc(j.name)}</h3>
                ${openReq[j.id] ? `<span class="pill warn">${openReq[j.id]} open</span>` : j.status === 'complete' ? '<span class="pill">Complete</span>' : ''}
              </div>
              <p class="meta">${j.gc ? `<span>${ICON.hard}${esc(j.gc)}</span>` : ''}${j.number ? `<span>#${esc(j.number)}</span>` : ''}</p>
              <div class="job-foot">
                <span>${lastLog[j.id] ? 'Last log ' + fmtShort(lastLog[j.id]) : 'No logs yet'}</span>
                ${st && st.state !== 'ok' ? `<span class="storm-dot ${st.state}">${STAT_ICON.rain}${st.state === 'soon' ? 'Inspect soon' : 'Inspect'}</span>` : st ? `<span class="storm-dot ok">${ICON.check}SWPPP ok</span>` : ''}
              </div>
            </div>
          </a>`;
        }).join('')}
      </div>
      ${!jobs.length ? `
        <div class="empty">
          <h3>Let’s get your first job on the board</h3>
          <p class="muted">Add a project, then log crews, silt fence, inlet protection, mowing, rain events and photos every day.</p>
          <button class="btn primary" data-act="new-job">${ICON.plus} New job</button>
          <button class="btn ghost" data-act="demo">Load a sample job</button>
        </div>` : shown.length ? '' : '<p class="muted center pad">No jobs in this view.</p>'}
      ${jobs.length ? `<button class="btn soft block add-job" data-act="new-job">${ICON.plus} New job</button>` : ''}`;

    startSceneRotation(app);
    app.onclick = async (e) => {
      const f = e.target.closest('[data-filter]');
      if (f) { sessionStorage.setItem('jobFilter', f.dataset.filter); route(); return; }
      const a = e.target.closest('[data-act]');
      if (!a) return;
      if (a.dataset.act === 'new-job') jobForm();
      if (a.dataset.act === 'demo') { await loadDemo(); route(); }
      if (a.dataset.act === 'start-log') pickJob('Start today’s log', (j) => openTodayLog(j));
      if (a.dataset.act === 'rain') pickJob('Log rain for…', (j) => rainForm(j));
      if (a.dataset.act === 'req') requestForm({});
    };
    const search = $('#jobSearch');
    if (search) search.oninput = () => {
      const q = search.value.trim().toLowerCase();
      $$('.job-card').forEach((c) => { c.hidden = q && !c.dataset.search.includes(q); });
    };
  }

  /* Ask which job, skipping the question when only one is active. */
  async function pickJob(title, cb) {
    const jobs = (await DB.all('jobs')).filter((j) => j.status !== 'complete').sort((a, b) => a.name.localeCompare(b.name));
    if (!jobs.length) { toast('Create a job first'); jobForm(); return; }
    if (jobs.length === 1) { cb(jobs[0]); return; }
    sheet(title, `<div class="pick-list">${jobs.map((j) => `
      <button class="pick" data-jid="${j.id}"><span class="pick-thumb">${Art.scene(Art.forId(j.id))}</span>
        <span class="grow"><b>${esc(j.name)}</b><small>${esc(j.gc || j.location || '')}</small></span></button>`).join('')}</div>`,
    (s, close) => {
      s.querySelectorAll('[data-jid]').forEach((b) => {
        b.onclick = () => { close(); setTimeout(() => cb(jobs.find((j) => j.id === b.dataset.jid)), 220); };
      });
    });
  }

  async function openTodayLog(job, opts) {
    const logs = await DB.by('logs', 'jobId', job.id);
    const existing = logs.find((l) => l.date === today());
    if (existing) {
      if (opts && opts.inspection && !(existing.inspection && existing.inspection.enabled)) {
        existing.inspection = await inspectionPreset(job);
        await DB.put('logs', existing);
      }
      location.hash = '#/log/' + existing.id;
    } else {
      newLog(job, opts, true);
    }
  }

  async function inspectionPreset(job) {
    const [logs, rain] = await Promise.all([DB.by('logs', 'jobId', job.id), DB.by('rain', 'jobId', job.id)]);
    const st = stormStatus(job, logs, rain);
    return { enabled: true, type: st.event ? 'Post-rain event' : 'Weekly', rain: st.event ? String(st.event.inches) : '', items: [] };
  }

  /* Center "+" button: everything a foreman adds, one tap away. */
  function quickAdd() {
    sheet('What are we logging?', `
      <div class="qa-grid">
        <button class="qa t-log" data-q="log"><span>${ICON.doc}</span><b>Daily log</b><small>Crew, BMPs, photos</small></button>
        <button class="qa t-rain" data-q="rain"><span>${STAT_ICON.rain}</span><b>Rain event</b><small>Rain gauge reading</small></button>
        <button class="qa t-insp" data-q="insp"><span>${ICON.check}</span><b>Inspection</b><small>BMP checklist</small></button>
        <button class="qa t-req" data-q="req"><span>${ICON.flag}</span><b>Request</b><small>From GC / inspector</small></button>
        <button class="qa t-chat" data-q="chat"><span>${ICON.chat}</span><b>Message</b><small>Team chat</small></button>
        <button class="qa t-job" data-q="job"><span>${ICON.hard}</span><b>New job</b><small>Start a project</small></button>
      </div>`, (s, close) => {
      s.querySelector('.qa-grid').onclick = (e) => {
        const b = e.target.closest('[data-q]');
        if (!b) return;
        close();
        const q = b.dataset.q;
        setTimeout(() => {
          if (q === 'log') pickJob('Start today’s log', (j) => openTodayLog(j));
          if (q === 'rain') pickJob('Log rain for…', (j) => rainForm(j));
          if (q === 'insp') pickJob('Inspect which job?', (j) => openTodayLog(j, { inspection: true }));
          if (q === 'req') requestForm({});
          if (q === 'chat') location.hash = '#/messages';
          if (q === 'job') jobForm();
        }, 220);
      };
    });
  }

  function rainForm(job, after) {
    sheet(`Rain gauge · ${job.name}`, `
      <form class="form" id="rainForm">
        <div class="gauge">
          <div class="gauge-tube"><div class="gauge-fill" id="gaugeFill"></div></div>
          <div class="grow">
            <label>Rainfall (inches)<input name="inches" id="rainIn" type="number" step="0.01" min="0" inputmode="decimal" required placeholder="0.00" class="big-num"></label>
            <div class="chips-row">${['0.25', '0.5', '1', '1.5', '2'].map((v) => `<button type="button" class="chip-btn" data-v="${v}">${v}"</button>`).join('')}</div>
          </div>
        </div>
        <div class="grid2">
          <label>Date<input type="date" name="date" value="${today()}"></label>
          <label>Source<select name="source"><option>Site rain gauge</option><option>Weather service</option><option>Estimate</option></select></label>
        </div>
        <label>Notes<input name="note" placeholder="e.g. Heavy runoff at north basin"></label>
        <p class="hint" id="rainHint">Events of ${fmtNum(num(job.rainTrigger) || 0.5)}" or more trigger a post-rain inspection.</p>
        <button class="btn primary block" type="submit">${STAT_ICON.rain} Save rain event</button>
      </form>`, (s, close) => {
      const inp = s.querySelector('#rainIn');
      const fill = s.querySelector('#gaugeFill');
      const trig = num(job.rainTrigger) || 0.5;
      const upd = () => {
        const v = num(inp.value);
        fill.style.height = Math.min(100, (v / 3) * 100) + '%';
        fill.classList.toggle('over', v >= trig);
      };
      inp.oninput = upd;
      s.querySelectorAll('[data-v]').forEach((b) => { b.onclick = () => { inp.value = b.dataset.v; upd(); }; });
      s.querySelector('#rainForm').onsubmit = async (e) => {
        e.preventDefault();
        const d = Object.fromEntries(new FormData(e.target));
        const r = await DB.put('rain', { jobId: job.id, date: d.date, inches: num(d.inches), source: d.source, note: d.note, by: S.me && S.me.name });
        await systemMessage(job.id, r.inches >= trig
          ? `logged ${fmtNum(r.inches)}" of rain on ${fmtShort(r.date)} — post-rain BMP inspection due within 24 hrs`
          : `logged ${fmtNum(r.inches)}" of rain on ${fmtShort(r.date)}`);
        close(); notify();
        toast(r.inches >= trig ? 'Rain logged — inspection due!' : 'Rain logged');
        after ? after() : route();
      };
    });
  }

  function confetti() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = document.createElement('div');
    box.className = 'confetti';
    const colors = ['#e0a43a', '#5c8d3b', '#e0662a', '#1c1c1c', '#3a7ca5', '#a8763f'];
    for (let i = 0; i < 46; i++) {
      const p = document.createElement('i');
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = colors[i % colors.length];
      p.style.animationDelay = Math.random() * 0.4 + 's';
      p.style.animationDuration = 1.4 + Math.random() * 1.2 + 's';
      p.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
      p.style.setProperty('--x', (Math.random() * 120 - 60) + 'px');
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 3200);
  }

  function jobForm(job) {
    const j = job || { status: 'active', start: today() };
    sheet(job ? 'Edit job' : 'New job', `
      <form id="jobForm" class="form">
        <label>Project name *<input name="name" required value="${esc(j.name)}" placeholder="e.g. Oak Ridge Subdivision Ph. 2"></label>
        <div class="grid2">
          <label>Job #<input name="number" value="${esc(j.number)}" placeholder="24-118"></label>
          <label>Start date<input type="date" name="start" value="${esc(j.start)}"></label>
        </div>
        <label>General contractor<input name="gc" value="${esc(j.gc)}" placeholder="GC company"></label>
        <div class="grid2">
          <label>GC superintendent<input name="gcContact" value="${esc(j.gcContact)}"></label>
          <label>Super phone<input type="tel" name="gcPhone" value="${esc(j.gcPhone)}"></label>
        </div>
        <label>Location / address<input name="location" value="${esc(j.location)}" placeholder="Street, city or GPS"></label>
        <div class="grid2">
          <label>Permit / SWPPP #<input name="permit" value="${esc(j.permit)}"></label>
          <label>Status<select name="status">
            <option value="active" ${j.status !== 'complete' ? 'selected' : ''}>Active</option>
            <option value="complete" ${j.status === 'complete' ? 'selected' : ''}>Complete</option></select></label>
        </div>
        <label>Scope / notes<textarea name="notes" rows="3">${esc(j.notes)}</textarea></label>
        <button class="btn primary block" type="submit">${job ? 'Save changes' : 'Create job'}</button>
      </form>`, (s, close) => {
      s.querySelector('#jobForm').onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        const saved = await DB.put('jobs', { ...j, ...data, name: data.name.trim() });
        if (!job) await systemMessage(saved.id, `created job "${saved.name}"`);
        close();
        notify();
        toast(job ? 'Job updated' : 'Job created');
        if (job) route(); else location.hash = '#/job/' + saved.id;
      };
    });
  }

  /* ======================================================================
     JOB DETAIL
     ====================================================================== */
  async function jobView(id, tab, token) {
    if (typeof tab === 'number') { token = tab; tab = undefined; }
    tab = tab || 'logs';
    const job = await DB.get('jobs', id);
    if (!job) return notFound('Job');
    const [logs, reqs, msgs, rain] = await Promise.all([DB.by('logs', 'jobId', id), DB.by('requests', 'jobId', id), DB.by('messages', 'channel', id), DB.by('rain', 'jobId', id)]);
    if (stale(token)) return;
    setHeader(job.name, job.gc || job.location || '', '#/jobs');
    logs.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    const openCount = reqs.filter((r) => r.status !== 'done').length;
    const unread = (await unreadCounts(msgs))[id] || 0;
    const st = stormStatus(job, logs, rain);

    const tabs = [
      ['logs', 'Daily logs', logs.length],
      ['storm', 'Stormwater', st.state === 'ok' ? 0 : '!'],
      ['qty', 'Quantities'],
      ['requests', 'Requests', openCount],
      ['chat', 'Chat', unread],
      ['info', 'Info'],
    ];

    app.innerHTML = `
      <section class="job-hero">
        <div class="job-art">${Art.scene(Art.forId(job.id))}</div>
        <div class="job-hero-body">
          <div class="job-hero-meta">
            ${job.number ? `<span class="tag">#${esc(job.number)}</span>` : ''}
            ${job.status === 'complete' ? '<span class="tag">Complete</span>' : '<span class="tag live">Active</span>'}
            <a class="tag storm-tag ${st.state}" href="#/job/${id}?t=storm">${STAT_ICON.rain}${st.state === 'ok' ? 'SWPPP current' : st.state === 'soon' ? 'Inspection soon' : 'Inspection due'}</a>
          </div>
          <h1>${esc(job.name)}</h1>
          ${job.gc ? `<p class="meta">${ICON.hard}${esc(job.gc)}${job.gcContact ? ' · ' + esc(job.gcContact) : ''}</p>` : ''}
          ${job.location ? `<a class="meta loc" target="_blank" rel="noopener" href="https://maps.google.com/?q=${encodeURIComponent(job.location)}">${ICON.pin}${esc(job.location)}</a>` : ''}
          <div class="quick">
            <button class="btn primary" data-act="new-log">${ICON.doc} Daily log</button>
            <button class="btn soft" data-act="rain">${STAT_ICON.rain} Rain</button>
            <button class="btn soft" data-act="new-req">${ICON.flag} Request</button>
          </div>
        </div>
      </section>
      <nav class="tabs" role="tablist">
        ${tabs.map(([k, label, n]) => `<a href="#/job/${id}?t=${k}" class="${k === tab ? 'on' : ''} ${k === 'storm' && n ? 'alert-tab' : ''}" role="tab">${label}${n ? `<b>${n}</b>` : ''}</a>`).join('')}
      </nav>
      <div id="tabBody"></div>`;

    app.onclick = async (e) => {
      const a = e.target.closest('[data-act]');
      if (!a) return;
      if (a.dataset.act === 'new-log') openTodayLog(job);
      if (a.dataset.act === 'rain') rainForm(job);
      if (a.dataset.act === 'new-req') requestForm({ jobId: id });
    };

    const body = $('#tabBody');
    if (tab === 'logs') renderLogsTab(body, job, logs);
    if (tab === 'storm') renderStormTab(body, job, logs, rain, st);
    if (tab === 'qty') renderQtyTab(body, job, logs);
    if (tab === 'requests') renderRequestList(body, reqs, { jobs: { [id]: job }, showJob: false, emptyText: 'No repair requests logged for this job.' });
    if (tab === 'chat') { location.replace('#/chat/' + id); }
    if (tab === 'info') renderInfoTab(body, job, logs);
  }

  /* 30-day rain gauge: one series, bars from the baseline, dashed line at the inspection trigger. */
  function rainChart(rain, trigger) {
    const t = today();
    const days = Array.from({ length: 30 }, (_, i) => addDays(t, i - 29));
    const byDay = {};
    rain.forEach((r) => { byDay[r.date] = (byDay[r.date] || 0) + num(r.inches); });
    const max = Math.max(trigger * 2, ...days.map((d) => byDay[d] || 0));
    const W = 320, H = 120, L = 26, B = 100, top = 10;
    const bw = (W - L - 4) / 30;
    const y = (v) => B - (v / max) * (B - top);
    const ty = y(trigger);
    const bars = days.map((d, i) => {
      const v = byDay[d] || 0;
      const x = L + i * bw;
      const h = B - y(v);
      const tip = `${fmtShort(d)}: ${v ? fmtNum(v) + '"' : 'no rain'}`;
      return `<g class="rbar" data-tip="${esc(tip)}">
        <rect class="hit" x="${x}" y="${top}" width="${bw}" height="${B - top}" fill="transparent"/>
        ${v ? `<path d="M${x + 1.5} ${B} V${B - h + Math.min(3, h)} q0 -3 3 -3 h${bw - 6} q3 0 3 3 V${B}z" class="${v >= trigger ? 'hot' : ''}"/>` : ''}
      </g>`;
    }).join('');
    return `<div class="chart-wrap">
      <svg class="rain-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Daily rainfall, last 30 days">
        <path d="M${L} ${B}H${W - 2}" class="axis"/>
        <text x="${L - 4}" y="${top + 4}" text-anchor="end" class="tick">${fmtNum(max, 1)}"</text>
        <text x="${L - 4}" y="${B}" text-anchor="end" class="tick">0</text>
        ${bars}
        <path d="M${L} ${ty}H${W - 2}" class="trigger"/>
        <text x="${L + 4}" y="${ty - 4}" class="tick trig-label">${fmtNum(trigger)}" trigger</text>
        <text x="${L}" y="${H - 4}" class="tick">${fmtShort(days[0])}</text>
        <text x="${W - 2}" y="${H - 4}" text-anchor="end" class="tick">Today</text>
      </svg>
      <div class="chart-tip" hidden></div>
    </div>`;
  }

  function renderStormTab(body, job, logs, rain, st) {
    rain.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    const t = today();
    const month = rain.filter((r) => r.date >= addDays(t, -29));
    const total = month.reduce((a, r) => a + num(r.inches), 0);
    const biggest = month.reduce((m, r) => (num(r.inches) > num(m && m.inches) ? r : m), null);
    const inspections = logs.filter((l) => l.inspection && l.inspection.enabled && (l.inspection.items || []).length);
    const tot = computeTotals(logs, '', '', false);
    const swRows = tot.rows.filter((r) => { const d = bmpDef(r.code); return d && Catalog.STORMWATER_CATS.includes(d.cat); });
    const count = (l, c) => l.inspection.items.filter((i) => i.cond === c).length;

    body.innerHTML = `
      <div class="storm-status ${st.state}">
        <div class="storm-art">${Art.stormwater()}</div>
        <div class="storm-text">
          <b>${esc(st.title)}</b>
          <span>${esc(st.detail)}</span>
          <button class="btn ${st.state === 'ok' ? 'soft' : 'primary'} small" data-s="inspect">${ICON.check} ${st.state === 'ok' ? 'Start an inspection' : 'Inspect now'}</button>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h3>${STAT_ICON.rain}Rain gauge · 30 days</h3><button class="btn small primary" data-s="rain">${ICON.plus} Log rain</button></div>
        <div class="rain-kpis">
          <div><b>${fmtNum(total, 2)}"</b><span>Total</span></div>
          <div><b>${biggest ? fmtNum(biggest.inches) + '"' : '—'}</b><span>Biggest${biggest ? ' · ' + fmtShort(biggest.date) : ''}</span></div>
          <div><b>${month.filter((r) => num(r.inches) >= st.trigger).length}</b><span>Trigger events</span></div>
        </div>
        ${rainChart(rain, st.trigger)}
        ${rain.length ? `<ul class="rain-list">${rain.slice(0, 12).map((r) => `
          <li><span class="drop ${num(r.inches) >= st.trigger ? 'hot' : ''}">${STAT_ICON.rain}</span>
            <span class="grow"><b>${fmtNum(r.inches)}"</b> · ${fmtDate(r.date, { weekday: 'short', month: 'short', day: 'numeric' })}<small>${esc([r.source, r.note, r.by].filter(Boolean).join(' · '))}</small></span>
            <button class="icon-btn del" data-s="del-rain" data-id="${r.id}" aria-label="Delete">${ICON.x}</button></li>`).join('')}</ul>`
        : '<p class="muted pad small-text">No rain logged yet. Check the gauge after every storm.</p>'}
      </div>

      <div class="card">
        <div class="card-head"><h3>${ICON.check}Inspections</h3><span class="count">${inspections.length}</span></div>
        ${inspections.length ? `<div class="insp-list">${inspections.slice(0, 8).map((l) => `
          <a href="#/log/${l.id}" class="insp-row">
            <span class="date-block sm"><b>${new Date(l.date + 'T12:00').getDate()}</b><span>${fmtDate(l.date, { month: 'short' })}</span></span>
            <span class="grow"><b>${esc(l.inspection.type || 'Routine')}</b>${l.inspection.rain ? ` · ${esc(l.inspection.rain)}"` : ''}
              <small class="cond-counts"><i class="c-good">${count(l, 'good')} good</i><i class="c-maint">${count(l, 'maint')} maint</i><i class="c-failed">${count(l, 'failed')} failed</i></small></span>
            <span class="go">›</span></a>`).join('')}</div>`
        : '<p class="muted pad small-text">No inspections recorded yet.</p>'}
        <div class="storm-settings">
          <label class="mini">Rain trigger (in)<input type="number" step="0.05" min="0" inputmode="decimal" data-js="rainTrigger" value="${st.trigger}"></label>
          <label class="mini">Routine every (days)<input type="number" step="1" min="1" inputmode="numeric" data-js="inspectDays" value="${st.freq}"></label>
        </div>
        <p class="hint pad-x">Set these to match your permit (many require inspection every 7 days and within 24 hrs of ½" rain).</p>
      </div>

      <div class="card">
        <div class="card-head"><h3>${ICON.ruler}Stormwater BMPs on site</h3></div>
        ${swRows.length ? `<ul class="kv">${swRows.map((r) => `<li><span>${esc(r.name)}</span><b>${fmtNum(r.installed)} ${esc(r.unit)}${r.maint ? ` <small class="muted">· ${fmtNum(r.maint)} maint</small>` : ''}</b></li>`).join('')}</ul>`
        : '<p class="muted pad small-text">Inlet protection, check dams, skimmers, outlet protection and other stormwater items you install will be tallied here.</p>'}
      </div>`;

    const tip = $('.chart-tip', body);
    $$('.rbar', body).forEach((g) => {
      const show = () => {
        tip.hidden = false;
        tip.textContent = g.dataset.tip;
        const box = g.getBoundingClientRect(), wrap = g.closest('.chart-wrap').getBoundingClientRect();
        tip.style.left = Math.min(Math.max(box.left - wrap.left + box.width / 2, 40), wrap.width - 40) + 'px';
      };
      g.addEventListener('pointerenter', show);
      g.addEventListener('click', show);
      g.addEventListener('pointerleave', () => { tip.hidden = true; });
    });

    body.onchange = async (e) => {
      const k = e.target.dataset.js;
      if (!k) return;
      job[k] = num(e.target.value);
      await DB.put('jobs', job);
      toast('Saved');
      route();
    };
    body.onclick = async (e) => {
      const b = e.target.closest('[data-s]');
      if (!b) return;
      if (b.dataset.s === 'rain') rainForm(job);
      if (b.dataset.s === 'inspect') openTodayLog(job, { inspection: true });
      if (b.dataset.s === 'del-rain' && await confirmSheet('Delete rain event?', 'Remove this rain gauge reading?')) {
        await DB.del('rain', b.dataset.id);
        notify(); route();
      }
    };
  }

  function renderLogsTab(body, job, logs) {
    if (!logs.length) {
      body.innerHTML = `<div class="empty small"><div class="empty-scene">${Art.slope()}</div><h3>No daily logs</h3><p class="muted">Tap “New daily log” to record today’s crew, BMPs and photos.</p></div>`;
      return;
    }
    body.innerHTML = `<div class="list">${logs.map((l) => {
      const hrs = (l.crew || []).reduce((a, c) => a + num(c.hours), 0);
      const chips = (l.bmps || []).filter((b) => num(b.qty)).slice(0, 4)
        .map((b) => `<span class="qchip">${fmtNum(b.qty)} ${esc(b.unit)} ${esc(shortName(b))}</span>`).join('');
      return `<a class="card log-card" href="#/log/${l.id}">
        <div class="date-block"><b>${new Date(l.date + 'T12:00').getDate()}</b><span>${fmtDate(l.date, { month: 'short' })}</span></div>
        <div class="log-main">
          <div class="log-title">${fmtDate(l.date, { weekday: 'long' })}
            ${l.submittedAt ? '<span class="pill ok">Submitted</span>' : '<span class="pill">Draft</span>'}</div>
          <p class="meta">${esc(l.foreman || '—')} · ${(l.crew || []).length} crew · ${fmtNum(hrs, 1)} hrs${l.photoCount ? ` · ${l.photoCount} photo${l.photoCount > 1 ? 's' : ''}` : ''}</p>
          ${chips ? `<div class="chips">${chips}</div>` : ''}
        </div>
      </a>`;
    }).join('')}</div>`;
  }

  function shortName(row) {
    const def = bmpDef(row.code);
    return def ? def.name : row.name || '';
  }

  function renderQtyTab(body, job, logs) {
    const period = JSON.parse(sessionStorage.getItem('qtyPeriod:' + job.id) || '{}');
    const draw = () => {
      const t = computeTotals(logs, period.from, period.to, job.billRepairs);
      body.innerHTML = `
        <div class="card pad">
          <div class="grid2">
            <label class="mini">From<input type="date" id="qFrom" value="${esc(period.from || '')}"></label>
            <label class="mini">To<input type="date" id="qTo" value="${esc(period.to || '')}"></label>
          </div>
          <div class="period-quick">
            <button class="chip-btn" data-p="all">All time</button>
            <button class="chip-btn" data-p="month">This month</button>
            <button class="chip-btn" data-p="last">Last month</button>
            <button class="chip-btn" data-p="week">Last 7 days</button>
          </div>
        </div>
        <div class="kpis">
          <div class="kpi"><span>Work days</span><b>${t.days}</b></div>
          <div class="kpi"><span>Crew hours</span><b>${fmtNum(t.hours, 1)}</b></div>
          <div class="kpi accent"><span>Billable</span><b>${money(t.amount)}</b></div>
        </div>
        <div class="card">
          <div class="card-head"><h3>${ICON.ruler} BMP quantities</h3></div>
          ${t.rows.length ? `
          <div class="table-wrap"><table class="qty-table">
            <thead><tr><th>Item</th><th class="r">Installed</th><th class="r">Repair/Maint</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead>
            <tbody>${t.rows.map((r) => `<tr>
              <td><b>${esc(r.name)}</b></td>
              <td class="r">${fmtNum(r.installed)} <small>${esc(r.unit)}</small></td>
              <td class="r">${r.maint ? fmtNum(r.maint) + ' <small>' + esc(r.unit) + '</small>' : '—'}</td>
              <td class="r">${r.rate ? money(r.rate) : '<span class="muted">—</span>'}</td>
              <td class="r">${r.rate ? money(r.amount) : '—'}</td></tr>`).join('')}
            </tbody>
            <tfoot><tr><td colspan="4">Total</td><td class="r">${money(t.amount)}</td></tr></tfoot>
          </table></div>` : '<p class="muted pad">No quantities logged in this period.</p>'}
          <label class="toggle pad-x"><input type="checkbox" id="billRepairs" ${job.billRepairs ? 'checked' : ''}><span></span>Bill repair/maintenance quantities at unit rate</label>
          <p class="hint pad-x">Set unit rates in Settings → BMP catalog.</p>
        </div>
        ${t.materials.length ? `<div class="card"><div class="card-head"><h3>Materials used</h3></div>
          <ul class="kv">${t.materials.map((m) => `<li><span>${esc(m.item)}</span><b>${fmtNum(m.qty)} ${esc(m.unit)}</b></li>`).join('')}</ul></div>` : ''}
        <div class="row-actions sticky-actions">
          <button class="btn soft" id="qCsv">${ICON.down} CSV</button>
          <button class="btn primary" id="qPdf">${ICON.doc} Quantity report PDF</button>
        </div>`;

      const setPeriod = (from, to) => {
        period.from = from || ''; period.to = to || '';
        sessionStorage.setItem('qtyPeriod:' + job.id, JSON.stringify(period));
        draw();
      };
      $('#qFrom').onchange = (e) => setPeriod(e.target.value, period.to);
      $('#qTo').onchange = (e) => setPeriod(period.from, e.target.value);
      $$('[data-p]', body).forEach((b) => {
        b.onclick = () => {
          const d = new Date();
          const iso = (x) => { x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
          if (b.dataset.p === 'all') setPeriod('', '');
          if (b.dataset.p === 'month') setPeriod(iso(new Date(d.getFullYear(), d.getMonth(), 1)), today());
          if (b.dataset.p === 'last') setPeriod(iso(new Date(d.getFullYear(), d.getMonth() - 1, 1)), iso(new Date(d.getFullYear(), d.getMonth(), 0)));
          if (b.dataset.p === 'week') setPeriod(iso(new Date(Date.now() - 6 * 864e5)), today());
        };
      });
      $('#billRepairs').onchange = async (e) => { job.billRepairs = e.target.checked; await DB.put('jobs', job); draw(); };
      $('#qCsv').onclick = () => {
        const rows = [['Job', job.name], ['Period', `${period.from || 'start'} to ${period.to || 'today'}`], [],
          ['Item', 'Unit', 'Installed', 'Repair/Maint', 'Rate', 'Amount'],
          ...t.rows.map((r) => [r.name, r.unit, r.installed, r.maint, r.rate, r.amount.toFixed(2)]),
          ['Total', '', '', '', '', t.amount.toFixed(2)], [], ['Crew hours', t.hours], ['Work days', t.days]];
        if (t.materials.length) rows.push([], ['Material', 'Unit', 'Qty'], ...t.materials.map((m) => [m.item, m.unit, m.qty]));
        UI.download(`${UI.slug(job.name)}-quantities.csv`, UI.csv(rows), 'text/csv');
      };
      $('#qPdf').onclick = async () => {
        const blob = PDF.quantityReport({ job, totals: t, from: period.from, to: period.to, company: S.company, by: S.me && S.me.name, billRepairs: job.billRepairs });
        deliverPdf(blob, `${UI.slug(job.name)}-quantities-${today()}.pdf`);
      };
    };
    draw();
  }

  function renderInfoTab(body, job, logs) {
    const rows = [
      ['Project', job.name], ['Job #', job.number], ['General contractor', job.gc],
      ['Superintendent', job.gcContact], ['Super phone', job.gcPhone], ['Location', job.location],
      ['Permit / SWPPP #', job.permit], ['Start date', job.start && fmtDate(job.start)],
      ['Daily logs', String(logs.length)],
    ].filter((r) => r[1]);
    body.innerHTML = `
      <div class="card">
        <ul class="kv">${rows.map(([k, v]) => `<li><span>${esc(k)}</span><b>${k === 'Super phone' ? `<a href="tel:${esc(v)}">${esc(v)}</a>` : esc(v)}</b></li>`).join('')}</ul>
        ${job.notes ? `<div class="pad"><p class="label">Scope / notes</p><p class="prewrap">${esc(job.notes)}</p></div>` : ''}
      </div>
      <div class="row-actions">
        <button class="btn soft" data-i="edit">${ICON.edit} Edit job</button>
        <button class="btn soft" data-i="export">${ICON.share} Send job data</button>
      </div>
      <p class="hint">“Send job data” exports this job (logs, photos, requests, chat) as a file the office can import in Settings → Data.</p>
      <button class="btn danger-ghost block" data-i="delete">Delete job</button>`;
    body.onclick = async (e) => {
      const b = e.target.closest('[data-i]');
      if (!b) return;
      if (b.dataset.i === 'edit') jobForm(job);
      if (b.dataset.i === 'export') {
        const data = await DB.exportAll(job.id);
        shareFile(new Blob([JSON.stringify(data)], { type: 'application/json' }), `siltline-${UI.slug(job.name)}-${today()}.json`);
      }
      if (b.dataset.i === 'delete') {
        if (await confirmSheet('Delete job?', `This permanently removes "${job.name}" and all its logs, photos, requests and messages from this device.`)) {
          await DB.deleteJob(job.id);
          notify();
          toast('Job deleted');
          location.hash = '#/jobs';
        }
      }
    };
  }

  /* ======================================================================
     DAILY LOG
     ====================================================================== */
  async function newLog(job, opts = {}, skipCheck = false) {
    const logs = await DB.by('logs', 'jobId', job.id);
    const t = today();
    const existing = logs.find((l) => l.date === t);
    if (existing && !skipCheck && !(await confirmSheet('Log already exists', 'There is already a daily log for today on this job. Start another one anyway?', 'Create another', false))) {
      location.hash = '#/log/' + existing.id;
      return;
    }
    const log = await DB.put('logs', {
      jobId: job.id, date: t, foreman: S.me ? S.me.name : '', foremanId: S.me && S.me.id,
      weather: '', temp: '', start: '07:00', end: '15:30',
      crew: S.me ? [{ name: S.me.name, hours: '' }] : [],
      bmps: [], maint: [], materials: [], notes: '', photoCount: 0,
      inspection: opts.inspection ? await inspectionPreset(job) : { enabled: false, type: 'Routine', rain: '', items: [] },
    });
    location.hash = '#/log/' + log.id;
  }

  async function logView(id, token) {
    const log = await DB.get('logs', id);
    if (!log) return notFound('Daily log');
    const job = await DB.get('jobs', log.jobId);
    if (!job) return notFound('Job');
    const [photos, reqs, allLogs] = await Promise.all([DB.by('photos', 'logId', id), DB.by('requests', 'jobId', job.id), DB.by('logs', 'jobId', job.id)]);
    if (stale(token)) return;
    setHeader('Daily log', `${job.name} · ${fmtShort(log.date)}`, `#/job/${job.id}`);
    log.crew = log.crew || []; log.bmps = log.bmps || []; log.maint = log.maint || []; log.materials = log.materials || [];
    log.inspection = log.inspection || { enabled: false, type: 'Routine', rain: '', items: [] };
    photos.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (log.inspection.enabled && !log.inspection.items.length) log.inspection.items = onSiteItems();

    let saveTimer = null;
    const status = () => $('#saveState');
    const save = () => {
      clearTimeout(saveTimer);
      status() && (status().textContent = 'Saving…');
      saveTimer = setTimeout(async () => {
        log.photoCount = photos.length;
        await DB.put('logs', log);
        status() && (status().textContent = 'Saved');
      }, 400);
    };
    const flush = async () => { clearTimeout(saveTimer); log.photoCount = photos.length; await DB.put('logs', log); };

    const catalogOptions = (sel, withOther = true) => {
      const groups = {};
      S.catalog.forEach((c) => { (groups[c.cat || 'Other'] = groups[c.cat || 'Other'] || []).push(c); });
      return `<option value="">Select BMP…</option>` + Object.entries(groups).map(([g, list]) =>
        `<optgroup label="${esc(g)}">${list.map((c) => `<option value="${esc(c.code)}" ${c.code === sel ? 'selected' : ''}>${esc(c.name)} (${esc(c.unit)})</option>`).join('')}</optgroup>`).join('')
        + (withOther ? `<option value="OTHER" ${sel === 'OTHER' ? 'selected' : ''}>Other / custom…</option>` : '');
    };

    const peopleList = `<datalist id="peopleList">${S.people.map((p) => `<option value="${esc(p.name)}">`).join('')}</datalist>`;
    const materialsList = `<datalist id="matList">${['Silt fence fabric', 'Wood stakes', 'T-posts', 'Straw wattles', 'Staples', 'Zip ties', '#57 stone', '2" rock', '3" washed stone', 'Filter fabric', 'Straw bales', 'Seed mix', 'Fertilizer', 'Hydromulch', 'Tackifier', 'Sandbags', 'Wire mesh'].map((m) => `<option value="${m}">`).join('')}</datalist>`;

    const sections = {
      crew() {
        const total = log.crew.reduce((a, c) => a + num(c.hours), 0);
        return `${log.crew.map((c, i) => `
          <div class="line" data-list="crew" data-i="${i}">
            <input class="grow" list="peopleList" data-k="name" value="${esc(c.name)}" placeholder="Crew member" aria-label="Crew member">
            <div class="unit-input w-hrs"><input type="number" inputmode="decimal" step="0.25" min="0" data-k="hours" value="${esc(c.hours)}" placeholder="0" aria-label="Hours"><span>hrs</span></div>
            <button class="icon-btn del" data-act="rm" aria-label="Remove">${ICON.x}</button>
          </div>`).join('')}
          <div class="sec-foot">
            <button class="link-btn" data-act="add" data-list="crew">${ICON.plus} Add crew</button>
            ${allLogs.some((l) => l.id !== log.id && (l.crew || []).length) ? `<button class="link-btn" data-act="copy-crew">Same crew as last log</button>` : ''}
            <span class="total">Total <b id="hrsTotal">${fmtNum(total, 2)}</b> hrs</span>
          </div>`;
      },
      bmps() {
        return `${log.bmps.map((b, i) => `
          <div class="line wrap" data-list="bmps" data-i="${i}">
            <select class="grow" data-k="code" aria-label="BMP type">${catalogOptions(b.code)}</select>
            ${b.code === 'OTHER' ? `<input class="grow" data-k="name" value="${esc(b.name)}" placeholder="Describe item">` : ''}
            <div class="unit-input"><input type="number" inputmode="decimal" min="0" data-k="qty" value="${esc(b.qty)}" placeholder="Qty" aria-label="Quantity">
              ${b.code === 'OTHER' ? `<select data-k="unit" class="unit-sel">${Catalog.UNITS.map((u) => `<option ${u === b.unit ? 'selected' : ''}>${u}</option>`).join('')}</select>` : `<span>${esc(b.unit || '')}</span>`}</div>
            <input class="grow" data-k="where" value="${esc(b.where)}" placeholder="Location / station (optional)">
            <button class="icon-btn del" data-act="rm" aria-label="Remove">${ICON.x}</button>
          </div>`).join('')}
          <div class="sec-foot"><button class="link-btn" data-act="add" data-list="bmps">${ICON.plus} Add BMP installed</button></div>`;
      },
      maint() {
        return `${log.maint.map((m, i) => `
          <div class="line wrap" data-list="maint" data-i="${i}">
            <select class="grow" data-k="code" aria-label="BMP">${catalogOptions(m.code).replace('Select BMP…', 'General / not BMP-specific')}</select>
            ${m.code === 'OTHER' ? `<input class="grow" data-k="name" value="${esc(m.name)}" placeholder="Item">` : ''}
            <select data-k="kind" aria-label="Work type">${['Repair', 'Maintenance', 'Replace', 'Clean out', 'Remove'].map((k) => `<option ${k === m.kind ? 'selected' : ''}>${k}</option>`).join('')}</select>
            ${m.code ? `<div class="unit-input"><input type="number" inputmode="decimal" min="0" data-k="qty" value="${esc(m.qty)}" placeholder="Qty">
              ${m.code === 'OTHER' ? `<select data-k="unit" class="unit-sel">${Catalog.UNITS.map((u) => `<option ${u === m.unit ? 'selected' : ''}>${u}</option>`).join('')}</select>` : `<span>${esc(m.unit || '')}</span>`}</div>` : ''}
            <input class="full" data-k="desc" value="${esc(m.desc)}" placeholder="What was done (e.g. re-trenched 40' SF at north property line)">
            <button class="icon-btn del" data-act="rm" aria-label="Remove">${ICON.x}</button>
          </div>`).join('')}
          <div class="sec-foot"><button class="link-btn" data-act="add" data-list="maint">${ICON.plus} Add repair / maintenance</button></div>`;
      },
      materials() {
        return `${log.materials.map((m, i) => `
          <div class="line" data-list="materials" data-i="${i}">
            <input class="grow" list="matList" data-k="item" value="${esc(m.item)}" placeholder="Material" aria-label="Material">
            <div class="unit-input"><input type="number" inputmode="decimal" min="0" data-k="qty" value="${esc(m.qty)}" placeholder="Qty">
              <select data-k="unit" class="unit-sel">${Catalog.UNITS.map((u) => `<option ${u === m.unit ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
            <button class="icon-btn del" data-act="rm" aria-label="Remove">${ICON.x}</button>
          </div>`).join('')}
          <div class="sec-foot"><button class="link-btn" data-act="add" data-list="materials">${ICON.plus} Add material</button></div>`;
      },
      requests() {
        const open = reqs.filter((r) => r.status !== 'done');
        const doneHere = reqs.filter((r) => r.status === 'done' && r.logId === log.id);
        if (!open.length && !doneHere.length) return `<p class="muted small-text">No open requests on this job.</p>
          <div class="sec-foot"><button class="link-btn" data-act="new-req">${ICON.plus} Log a request from GC / inspector</button></div>`;
        return `${open.map((r) => `
          <div class="req-row">
            <div><span class="src ${esc((r.source || '').toLowerCase())}">${esc(r.source)}</span>
              <b>${esc(r.title || r.desc)}</b>
              <p class="meta">${r.location ? esc(r.location) + ' · ' : ''}Received ${fmtShort(r.date)}${r.due ? ' · Due ' + fmtShort(r.due) : ''}</p></div>
            <button class="btn small soft" data-act="done-req" data-id="${r.id}">${ICON.check} Done</button>
          </div>`).join('')}
          ${doneHere.map((r) => `
          <div class="req-row done">
            <div><span class="src">${esc(r.source)}</span><b>${esc(r.title || r.desc)}</b><p class="meta">Completed on this log</p></div>
            <button class="btn small ghost" data-act="undo-req" data-id="${r.id}">Undo</button>
          </div>`).join('')}
          <div class="sec-foot"><button class="link-btn" data-act="new-req">${ICON.plus} Log a new request</button></div>`;
      },
      inspection() {
        const ins = log.inspection;
        if (!ins.enabled) return `<p class="muted small-text">Optional. Rate the condition of each BMP on site for SWPPP records.</p>
          <button class="btn soft block" data-act="ins-on">Start inspection checklist</button>`;
        return `
          <div class="grid2">
            <label class="mini">Inspection type<select data-field="inspection.type">
              ${['Routine', 'Weekly', 'Post-rain event', 'Pre-storm', 'Final'].map((t) => `<option ${t === ins.type ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
            <label class="mini">Rainfall (in)<input type="number" step="0.01" min="0" inputmode="decimal" data-field="inspection.rain" value="${esc(ins.rain)}" placeholder="0.00"></label>
          </div>
          ${ins.items.map((it, i) => `
            <div class="ins-item cond-${esc(it.cond || 'none')}" data-list="inspection.items" data-i="${i}">
              <div class="ins-top">
                <input class="grow ins-name" data-k="name" value="${esc(it.name)}" placeholder="BMP / location">
                <button class="icon-btn del" data-act="rm" aria-label="Remove">${ICON.x}</button>
              </div>
              <div class="cond-seg">${Catalog.CONDITIONS.map((c) => `<button data-act="cond" data-c="${c.key}" class="${it.cond === c.key ? 'on c-' + c.key : ''}">${c.label}</button>`).join('')}</div>
              ${it.cond === 'maint' || it.cond === 'failed' ? `
                <div class="line"><input class="grow" data-k="note" value="${esc(it.note)}" placeholder="Deficiency / corrective action">
                <button class="btn small soft" data-act="ins-req" title="Create repair request">${ICON.flag}</button></div>` : ''}
            </div>`).join('')}
          <div class="sec-foot">
            <button class="link-btn" data-act="add" data-list="inspection.items">${ICON.plus} Add item</button>
            <button class="link-btn" data-act="ins-load">Load BMPs on site</button>
            <button class="link-btn muted" data-act="ins-off">Remove checklist</button>
          </div>`;
      },
      photos() {
        return `<div class="photo-grid">
          ${photos.map((p) => `<button class="photo" data-act="photo" data-id="${p.id}"><img src="${p.dataUrl}" alt="${esc(p.caption || 'Site photo')}" loading="lazy">${p.caption ? `<span>${esc(p.caption)}</span>` : ''}</button>`).join('')}
          <label class="photo add">${ICON.cam}<span>Add photos</span><input type="file" accept="image/*" multiple id="photoInput" hidden></label>
        </div>`;
      },
    };

    const sec = (key, title, icon, count) => `
      <section class="card sec" id="sec-${key}">
        <div class="card-head"><h3>${icon}${title}</h3>${count != null ? `<span class="count" id="cnt-${key}">${count}</span>` : ''}</div>
        <div class="sec-body" data-sec="${key}">${sections[key]()}</div>
      </section>`;

    app.innerHTML = `
      ${peopleList}${materialsList}
      <div class="log-status">
        <span id="saveState" class="save-state">Saved</span>
        ${log.submittedAt ? `<span class="pill ok">Submitted ${fmtWhen(log.submittedAt)}${log.submittedBy ? ' by ' + esc(log.submittedBy) : ''}</span>` : '<span class="pill">Draft</span>'}
      </div>
      <section class="card sec">
        <div class="card-head"><h3>${ICON.doc}Day &amp; site conditions</h3></div>
        <div class="sec-body form">
          <div class="grid2">
            <label class="mini">Date<input type="date" data-field="date" value="${esc(log.date)}"></label>
            <label class="mini">Foreman<input list="peopleList" data-field="foreman" value="${esc(log.foreman)}"></label>
          </div>
          <div class="grid3">
            <label class="mini">Start<input type="time" data-field="start" value="${esc(log.start)}"></label>
            <label class="mini">End<input type="time" data-field="end" value="${esc(log.end)}"></label>
            <label class="mini">Temp °F<input type="number" inputmode="numeric" data-field="temp" value="${esc(log.temp)}"></label>
          </div>
          <div class="weather">${Catalog.WEATHER.map((w) => `<button data-act="weather" data-w="${w}" class="${log.weather === w ? 'on' : ''}">${w}</button>`).join('')}</div>
          <label class="mini">Site conditions<input data-field="conditions" value="${esc(log.conditions)}" placeholder="e.g. Dry, grading ongoing on lots 12–18"></label>
        </div>
      </section>
      ${sec('crew', 'Crew &amp; hours', ICON.users, log.crew.length)}
      ${sec('bmps', 'BMPs installed', ICON.ruler, log.bmps.length)}
      ${sec('maint', 'Repairs &amp; maintenance', ICON.edit, log.maint.length)}
      ${sec('materials', 'Materials used', ICON.doc, log.materials.length)}
      ${sec('requests', 'GC / inspector requests', ICON.flag)}
      ${sec('inspection', 'BMP inspection', ICON.check)}
      ${sec('photos', 'Photos', ICON.cam, photos.length)}
      <section class="card sec">
        <div class="card-head"><h3>${ICON.edit}Notes</h3></div>
        <div class="sec-body"><textarea data-field="notes" rows="4" placeholder="Delays, visitors, instructions from GC, safety notes…">${esc(log.notes)}</textarea></div>
      </section>
      <div class="log-actions">
        <button class="btn soft" data-act="pdf">${ICON.doc} PDF</button>
        <button class="btn primary" data-act="submit">${ICON.send} ${log.submittedAt ? 'Resubmit' : 'Submit to office'}</button>
      </div>
      <button class="btn danger-ghost block" data-act="delete">Delete this log</button>`;

    const rerender = (key) => {
      const el = app.querySelector(`[data-sec="${key}"]`);
      if (el) el.innerHTML = sections[key]();
      const cnt = $('#cnt-' + key);
      if (cnt) cnt.textContent = key === 'photos' ? photos.length : (log[key] || []).length;
    };

    const listRef = (name) => name.split('.').reduce((o, k) => o[k], log);
    const setField = (path, value) => {
      const parts = path.split('.');
      const last = parts.pop();
      parts.reduce((o, k) => o[k], log)[last] = value;
    };

    app.oninput = (e) => {
      const t = e.target;
      if (t.dataset.field) {
        setField(t.dataset.field, t.value);
        if (t.dataset.field === 'date') setHeader('Daily log', `${job.name} · ${fmtShort(t.value)}`, `#/job/${job.id}`);
        save();
        return;
      }
      const row = t.closest('[data-list]');
      if (!row || !t.dataset.k) return;
      const list = listRef(row.dataset.list);
      const item = list[+row.dataset.i];
      item[t.dataset.k] = t.value;
      if (t.dataset.k === 'code') {
        const def = bmpDef(t.value);
        item.unit = def ? def.unit : t.value === 'OTHER' ? (item.unit || 'EA') : '';
        item.name = def ? def.name : '';
        rerender(row.dataset.list === 'bmps' ? 'bmps' : 'maint');
      }
      if (row.dataset.list === 'crew' && t.dataset.k === 'hours') {
        $('#hrsTotal').textContent = fmtNum(log.crew.reduce((a, c) => a + num(c.hours), 0), 2);
      }
      save();
    };

    app.onchange = async (e) => {
      if (e.target.id === 'photoInput') {
        const files = [...e.target.files];
        if (!files.length) return;
        toast(`Adding ${files.length} photo${files.length > 1 ? 's' : ''}…`);
        for (const f of files) {
          try {
            const img = await UI.compressImage(f);
            const p = await DB.put('photos', { jobId: job.id, logId: log.id, dataUrl: img.dataUrl, w: img.width, h: img.height, caption: '', by: S.me && S.me.name });
            photos.push(p);
          } catch (err) { toast(err.message); }
        }
        rerender('photos');
        await flush();
        toast('Photos saved');
      }
    };

    const blank = {
      crew: () => ({ name: '', hours: log.crew.length ? log.crew[log.crew.length - 1].hours : '' }),
      bmps: () => ({ code: '', name: '', unit: '', qty: '', where: '' }),
      maint: () => ({ code: '', kind: 'Repair', qty: '', unit: '', desc: '' }),
      materials: () => ({ item: '', qty: '', unit: 'EA' }),
      'inspection.items': () => ({ name: '', cond: '', note: '' }),
    };
    const secOf = (list) => (list === 'inspection.items' ? 'inspection' : list);

    app.onclick = async (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      const row = b.closest('[data-list]');

      if (act === 'add') {
        const list = b.dataset.list;
        listRef(list).push(blank[list]());
        rerender(secOf(list));
        const rows = app.querySelectorAll(`[data-list="${list}"]`);
        const lastRow = rows[rows.length - 1];
        const f = lastRow && lastRow.querySelector('input, select');
        if (f) f.focus();
        save();
      } else if (act === 'rm' && row) {
        listRef(row.dataset.list).splice(+row.dataset.i, 1);
        rerender(secOf(row.dataset.list));
        save();
      } else if (act === 'copy-crew') {
        const prev = allLogs.filter((l) => l.id !== log.id && (l.crew || []).length)
          .sort((a, c) => c.date.localeCompare(a.date))[0];
        if (prev) {
          const names = new Set(log.crew.map((c) => c.name.trim().toLowerCase()));
          prev.crew.forEach((c) => { if (!names.has(c.name.trim().toLowerCase())) log.crew.push({ name: c.name, hours: c.hours }); });
          log.crew = log.crew.filter((c) => c.name.trim() || c.hours);
          rerender('crew'); save();
          toast(`Copied crew from ${fmtShort(prev.date)}`);
        }
      } else if (act === 'weather') {
        log.weather = log.weather === b.dataset.w ? '' : b.dataset.w;
        $$('.weather button', app).forEach((x) => x.classList.toggle('on', x.dataset.w === log.weather));
        save();
      } else if (act === 'ins-on') {
        log.inspection.enabled = true;
        if (!log.inspection.items.length) log.inspection.items = onSiteItems();
        rerender('inspection'); save();
      } else if (act === 'ins-off') {
        if (await confirmSheet('Remove checklist?', 'The inspection ratings on this log will be cleared.', 'Remove')) {
          log.inspection = { enabled: false, type: 'Routine', rain: '', items: [] };
          rerender('inspection'); save();
        }
      } else if (act === 'ins-load') {
        const have = new Set(log.inspection.items.map((i) => i.name.toLowerCase()));
        onSiteItems().forEach((it) => { if (!have.has(it.name.toLowerCase())) log.inspection.items.push(it); });
        rerender('inspection'); save();
      } else if (act === 'cond' && row) {
        const item = listRef(row.dataset.list)[+row.dataset.i];
        item.cond = item.cond === b.dataset.c ? '' : b.dataset.c;
        rerender('inspection'); save();
      } else if (act === 'ins-req' && row) {
        const item = listRef(row.dataset.list)[+row.dataset.i];
        await flush();
        requestForm({ jobId: job.id, source: 'Internal', title: `${item.name}: ${item.cond === 'failed' ? 'failed' : 'needs maintenance'}`, desc: item.note || '' }, () => route());
      } else if (act === 'new-req') {
        await flush();
        requestForm({ jobId: job.id }, () => route());
      } else if (act === 'done-req') {
        const r = reqs.find((x) => x.id === b.dataset.id);
        await flush();
        completeRequest(r, { logId: log.id, date: log.date }, () => route());
      } else if (act === 'undo-req') {
        const r = reqs.find((x) => x.id === b.dataset.id);
        Object.assign(r, { status: 'open', completedAt: null, completedBy: null, completedNote: '', logId: null });
        await DB.put('requests', r);
        notify(); rerender('requests');
      } else if (act === 'photo') {
        const p = photos.find((x) => x.id === b.dataset.id);
        photoSheet(p, async (deleted) => {
          if (deleted) photos.splice(photos.indexOf(p), 1);
          rerender('photos'); await flush();
        });
      } else if (act === 'pdf') {
        await flush();
        await makeDailyPdf(log, job);
      } else if (act === 'submit') {
        await flush();
        const warnings = [];
        if (!log.crew.some((c) => c.name && num(c.hours))) warnings.push('no crew hours');
        if (!log.bmps.length && !log.maint.length && !log.notes) warnings.push('no work recorded');
        if (warnings.length && !(await confirmSheet('Submit anyway?', `This log has ${warnings.join(' and ')}.`, 'Submit', false))) return;
        const first = !log.submittedAt;
        log.submittedAt = new Date().toISOString();
        log.submittedBy = S.me ? S.me.name : log.foreman;
        await DB.put('logs', log);
        const hrs = log.crew.reduce((a, c) => a + num(c.hours), 0);
        const summary = log.bmps.filter((x) => num(x.qty)).map((x) => `${fmtNum(x.qty)} ${x.unit} ${shortName(x)}`).join(', ');
        await systemMessage(job.id, `${first ? 'submitted' : 'updated'} the daily log for ${fmtDate(log.date)} — ${log.crew.length} crew, ${fmtNum(hrs, 1)} hrs${summary ? '. Installed: ' + summary : ''}${photos.length ? `. ${photos.length} photo(s)` : ''}.`);
        notify();
        confetti();
        toast(first ? 'Log submitted. Nice work out there!' : 'Log resubmitted');
        route();
      } else if (act === 'delete') {
        if (await confirmSheet('Delete daily log?', `Remove the ${fmtDate(log.date)} log and its ${photos.length} photo(s)?`)) {
          clearTimeout(saveTimer);
          for (const p of photos) await DB.del('photos', p.id);
          for (const r of reqs.filter((x) => x.logId === log.id)) { r.logId = null; await DB.put('requests', r); }
          await DB.del('logs', log.id);
          notify();
          toast('Log deleted');
          location.hash = '#/job/' + job.id;
        }
      }
    };

    /* BMP types installed on this job so far – a starting list for the inspection. */
    function onSiteItems() {
      const seen = new Map();
      allLogs.map((l) => (l.id === log.id ? log : l)).filter((l) => l.date <= log.date)
        .forEach((l) => (l.bmps || []).forEach((b) => {
          if (!b.code) return;
          const name = b.code === 'OTHER' ? b.name : shortName(b);
          if (name && !seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), { name, cond: '', note: '' });
        }));
      if (!seen.size) ['Perimeter silt fence', 'Inlet protection', 'Construction entrance'].forEach((n) => seen.set(n, { name: n, cond: '', note: '' }));
      return [...seen.values()];
    }
  }

  function photoSheet(p, done) {
    sheet('Photo', `
      <img class="photo-full" src="${p.dataUrl}" alt="">
      <label class="mini">Caption<input id="capIn" value="${esc(p.caption)}" placeholder="e.g. Repaired SF at SE corner"></label>
      <div class="row-actions"><button class="btn danger-ghost" data-del>Delete</button><button class="btn primary" data-save>Save</button></div>`,
    (s, close) => {
      s.querySelector('[data-save]').onclick = async () => {
        p.caption = s.querySelector('#capIn').value.trim();
        await DB.put('photos', p);
        close(); done(false);
      };
      s.querySelector('[data-del]').onclick = async () => {
        await DB.del('photos', p.id);
        close(); done(true);
        toast('Photo deleted');
      };
    });
  }

  async function makeDailyPdf(log, job) {
    const [photos, reqs] = await Promise.all([DB.by('photos', 'logId', log.id), DB.by('requests', 'jobId', job.id)]);
    photos.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const completed = reqs.filter((r) => r.status === 'done' && (r.logId === log.id || (r.completedDate === log.date)));
    const opened = reqs.filter((r) => r.date === log.date);
    const stillOpen = reqs.filter((r) => r.status !== 'done');
    const blob = PDF.dailyReport({
      job, log, photos, completed, opened, stillOpen,
      company: S.company, catalogName: shortName,
    });
    deliverPdf(blob, `${UI.slug(job.name)}-daily-${log.date}.pdf`);
  }

  function deliverPdf(blob, filename) {
    const file = new File([blob], filename, { type: 'application/pdf' });
    const canShare = navigator.canShare && navigator.canShare({ files: [file] });
    sheet('Report ready', `
      <div class="pdf-ready">${ICON.doc}<div><b>${esc(filename)}</b><p class="muted">${fmtNum(blob.size / 1024, 0)} KB</p></div></div>
      <div class="row-actions">
        <button class="btn soft" data-open>Preview</button>
        <button class="btn soft" data-dl>${ICON.down} Download</button>
        ${canShare ? `<button class="btn primary" data-share>${ICON.share} Share</button>` : ''}
      </div>`, (s, close) => {
      s.querySelector('[data-open]').onclick = () => { window.open(URL.createObjectURL(blob), '_blank'); };
      s.querySelector('[data-dl]').onclick = () => { UI.download(filename, blob); close(); };
      const sh = s.querySelector('[data-share]');
      if (sh) sh.onclick = async () => { try { await navigator.share({ files: [file], title: filename }); close(); } catch (_) { /* cancelled */ } };
    });
  }

  function shareFile(blob, filename) {
    const file = new File([blob], filename, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: filename }).catch(() => UI.download(filename, blob));
    } else {
      UI.download(filename, blob);
      toast('File downloaded');
    }
  }

  /* ======================================================================
     REQUESTS
     ====================================================================== */
  async function requestsView(token) {
    setHeader('Repair requests', 'From GCs, inspectors & owners');
    const [reqs, jobs] = await Promise.all([DB.all('requests'), DB.all('jobs')]);
    if (stale(token)) return;
    const jobMap = Object.fromEntries(jobs.map((j) => [j.id, j]));
    app.innerHTML = `<div id="reqBody"></div>
      ${jobs.length ? `<button class="fab" data-act="new" aria-label="New request">${ICON.plus}<span>New request</span></button>` : ''}`;
    renderRequestList($('#reqBody'), reqs, { jobs: jobMap, showJob: true, emptyText: jobs.length ? 'No requests yet. Log punch items from the GC or inspector here.' : 'Create a job first, then log requests against it.' });
    app.onclick = (e) => { if (e.target.closest('[data-act="new"]')) requestForm({}); };
  }

  function renderRequestList(body, reqs, opts) {
    const filter = sessionStorage.getItem('reqFilter') || 'open';
    const prio = { Urgent: 0, High: 1, Normal: 2 };
    const list = reqs.filter((r) => filter === 'all' || (filter === 'open' ? r.status !== 'done' : r.status === 'done'))
      .sort((a, b) => filter === 'done'
        ? (b.completedAt || '').localeCompare(a.completedAt || '')
        : (prio[a.priority] ?? 2) - (prio[b.priority] ?? 2) || (a.due || '9').localeCompare(b.due || '9') || a.date.localeCompare(b.date));
    const counts = { open: reqs.filter((r) => r.status !== 'done').length, done: reqs.filter((r) => r.status === 'done').length, all: reqs.length };
    const t = today();
    body.innerHTML = `
      <div class="toolbar">
        <div class="seg">${[['open', 'Open'], ['done', 'Completed'], ['all', 'All']].map(([k, l]) => `<button data-rf="${k}" class="${k === filter ? 'on' : ''}">${l} <small>${counts[k]}</small></button>`).join('')}</div>
      </div>
      <div class="list">${list.map((r) => {
        const job = opts.jobs[r.jobId];
        const overdue = r.status !== 'done' && r.due && r.due < t;
        return `<div class="card req-card ${r.status === 'done' ? 'done' : ''} prio-${esc((r.priority || 'Normal').toLowerCase())}" data-id="${r.id}">
          <div class="req-head">
            <span class="src ${esc((r.source || '').toLowerCase())}">${esc(r.source || 'GC')}</span>
            ${r.priority && r.priority !== 'Normal' ? `<span class="pill ${r.priority === 'Urgent' ? 'bad' : 'warn'}">${esc(r.priority)}</span>` : ''}
            ${overdue ? '<span class="pill bad">Overdue</span>' : ''}
            ${r.status === 'done' ? `<span class="pill ok">${ICON.check}Done ${fmtShort(r.completedDate || r.completedAt)}</span>` : ''}
          </div>
          <h3>${esc(r.title || r.desc)}</h3>
          ${r.title && r.desc ? `<p class="prewrap small-text">${esc(r.desc)}</p>` : ''}
          <p class="meta">
            ${opts.showJob && job ? `<a href="#/job/${job.id}?t=requests">${esc(job.name)}</a> · ` : ''}
            ${r.location ? esc(r.location) + ' · ' : ''}${r.requestedBy ? 'From ' + esc(r.requestedBy) + ' · ' : ''}Rec’d ${fmtShort(r.date)}${r.due ? ' · Due ' + fmtShort(r.due) : ''}
          </p>
          ${r.status === 'done' && (r.completedNote || r.completedBy) ? `<p class="done-note">${ICON.check}${esc(r.completedBy || '')}${r.completedNote ? ': ' + esc(r.completedNote) : ''}</p>` : ''}
          <div class="req-actions">
            ${r.status !== 'done' ? `<button class="btn small primary" data-ra="done">${ICON.check} Mark complete</button>` : `<button class="btn small ghost" data-ra="reopen">Reopen</button>`}
            <button class="btn small ghost" data-ra="edit">Edit</button>
            ${r.logId ? `<a class="btn small ghost" href="#/log/${r.logId}">View log</a>` : ''}
          </div>
        </div>`;
      }).join('') || `<p class="muted center pad">${filter === 'open' && reqs.length ? 'All caught up — no open requests.' : esc(opts.emptyText)}</p>`}</div>`;

    body.onclick = async (e) => {
      const f = e.target.closest('[data-rf]');
      if (f) { sessionStorage.setItem('reqFilter', f.dataset.rf); renderRequestList(body, reqs, opts); return; }
      const a = e.target.closest('[data-ra]');
      if (!a) return;
      const r = reqs.find((x) => x.id === a.closest('[data-id]').dataset.id);
      if (a.dataset.ra === 'done') completeRequest(r, {}, () => route());
      if (a.dataset.ra === 'edit') requestForm(r, () => route());
      if (a.dataset.ra === 'reopen') {
        Object.assign(r, { status: 'open', completedAt: null, completedDate: null, completedBy: null, completedNote: '', logId: null });
        await DB.put('requests', r);
        await systemMessage(r.jobId, `reopened request: ${r.title || r.desc}`);
        notify(); route();
      }
    };
  }

  async function requestForm(req, after) {
    const jobs = (await DB.all('jobs')).sort((a, b) => a.name.localeCompare(b.name));
    const isNew = !req.id;
    const r = { source: 'GC', priority: 'Normal', date: today(), status: 'open', ...req };
    sheet(isNew ? 'New request' : 'Edit request', `
      <form class="form" id="reqForm">
        ${req.jobId && isNew ? `<input type="hidden" name="jobId" value="${esc(r.jobId)}">` : `
        <label>Job *<select name="jobId" required>${jobs.map((j) => `<option value="${j.id}" ${j.id === r.jobId ? 'selected' : ''}>${esc(j.name)}</option>`).join('')}</select></label>`}
        <label>Requested by</label>
        <div class="seg wide" id="srcSeg">${Catalog.REQUEST_SOURCES.map((s) => `<button type="button" data-s="${s}" class="${s === r.source ? 'on' : ''}">${s}</button>`).join('')}</div>
        <input type="hidden" name="source" value="${esc(r.source)}">
        <label>Name / company<input name="requestedBy" value="${esc(r.requestedBy)}" placeholder="e.g. J. Smith, county inspector"></label>
        <label>Request *<input name="title" required value="${esc(r.title)}" placeholder="e.g. Repair silt fence along Lot 14"></label>
        <label>Details<textarea name="desc" rows="3" placeholder="Anything the crew needs to know">${esc(r.desc)}</textarea></label>
        <label>Location on site<input name="location" value="${esc(r.location)}" placeholder="Station, lot, inlet #"></label>
        <div class="grid2">
          <label>Received<input type="date" name="date" value="${esc(r.date)}"></label>
          <label>Due<input type="date" name="due" value="${esc(r.due)}"></label>
        </div>
        <label>Priority</label>
        <div class="seg wide" id="prSeg">${['Normal', 'High', 'Urgent'].map((s) => `<button type="button" data-p="${s}" class="${s === r.priority ? 'on' : ''}">${s}</button>`).join('')}</div>
        <input type="hidden" name="priority" value="${esc(r.priority)}">
        <button class="btn primary block" type="submit">${isNew ? 'Log request' : 'Save'}</button>
        ${isNew ? '' : '<button type="button" class="btn danger-ghost block" id="reqDel">Delete request</button>'}
      </form>`, (s, close) => {
      const form = s.querySelector('#reqForm');
      const segBind = (segId, attr, name) => s.querySelector(segId).onclick = (e) => {
        const b = e.target.closest('button'); if (!b) return;
        s.querySelectorAll(segId + ' button').forEach((x) => x.classList.toggle('on', x === b));
        form.elements[name].value = b.dataset[attr];
      };
      segBind('#srcSeg', 's', 'source');
      segBind('#prSeg', 'p', 'priority');
      form.onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form));
        const saved = await DB.put('requests', { ...r, ...data, createdBy: r.createdBy || (S.me && S.me.name) });
        if (isNew) await systemMessage(saved.jobId, `logged a ${saved.priority !== 'Normal' ? saved.priority.toLowerCase() + ' ' : ''}request from ${saved.source}${saved.requestedBy ? ' (' + saved.requestedBy + ')' : ''}: ${saved.title}${saved.due ? ' — due ' + fmtShort(saved.due) : ''}`);
        close(); notify();
        toast(isNew ? 'Request logged' : 'Request saved');
        after ? after() : route();
      };
      const del = s.querySelector('#reqDel');
      if (del) del.onclick = async () => {
        await DB.del('requests', r.id);
        close(); notify(); toast('Request deleted');
        after ? after() : route();
      };
    });
  }

  function completeRequest(r, extra, after) {
    sheet('Complete request', `
      <form class="form" id="doneForm">
        <p class="req-quote">${esc(r.title || r.desc)}</p>
        <label>Completed on<input type="date" name="completedDate" value="${esc(extra.date || today())}"></label>
        <label>What was done<textarea name="completedNote" rows="3" placeholder="e.g. Replaced 60 LF of silt fence, cleaned inlet"></textarea></label>
        <button class="btn primary block" type="submit">${ICON.check} Mark complete</button>
      </form>`, (s, close) => {
      s.querySelector('#doneForm').onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        Object.assign(r, data, { status: 'done', completedAt: new Date().toISOString(), completedBy: S.me ? S.me.name : '' });
        if (extra.logId) r.logId = extra.logId;
        else if (!r.logId) {
          const logs = await DB.by('logs', 'jobId', r.jobId);
          const match = logs.find((l) => l.date === r.completedDate);
          if (match) r.logId = match.id;
        }
        await DB.put('requests', r);
        await systemMessage(r.jobId, `completed request: ${r.title || r.desc}${r.completedNote ? ' — ' + r.completedNote : ''}`);
        close(); notify(); toast('Marked complete');
        after();
      };
    });
  }

  /* ======================================================================
     MESSAGES
     ====================================================================== */
  async function messagesView(token) {
    setHeader('Messages', 'Foremen · owners · managers · office');
    const [jobs, msgs] = await Promise.all([DB.all('jobs'), DB.all('messages')]);
    if (stale(token)) return;
    const unread = await unreadCounts(msgs);
    const last = {};
    msgs.forEach((m) => { if (!last[m.channel] || m.createdAt > last[m.channel].createdAt) last[m.channel] = m; });
    const channels = [{ id: 'all', name: 'Company-wide', sub: 'Announcements & scheduling for everyone' },
      ...jobs.filter((j) => j.status !== 'complete' || last[j.id]).map((j) => ({ id: j.id, name: j.name, sub: j.gc || j.location || '' }))]
      .sort((a, b) => (a.id === 'all' ? -1 : b.id === 'all' ? 1 : (last[b.id]?.createdAt || '').localeCompare(last[a.id]?.createdAt || '')));
    app.innerHTML = `
      <div class="team-strip">
        ${S.people.map((p) => `<div class="team-person"><span class="avatar ${roleClass(p.role)}">${esc(initials(p.name))}</span><small>${esc(p.name.split(' ')[0])}</small></div>`).join('')}
        <a class="team-person add" href="#/settings"><span class="avatar">${ICON.plus}</span><small>Team</small></a>
      </div>
      <div class="list">${channels.map((c) => {
        const m = last[c.id];
        return `<a class="card chan" href="#/chat/${c.id}">
          <span class="chan-icon ${c.id === 'all' ? 'all' : ''}">${c.id === 'all' ? ICON.users : ICON.chat}</span>
          <div class="chan-main">
            <div class="chan-top"><b>${esc(c.name)}</b>${m ? `<small>${fmtWhen(m.createdAt)}</small>` : ''}</div>
            <p class="meta one-line">${m ? `${esc(m.authorName)}${m.system ? ' ' : ': '}${esc(m.text)}` : esc(c.sub || 'No messages yet')}</p>
          </div>
          ${unread[c.id] ? `<b class="badge static">${unread[c.id]}</b>` : ''}
        </a>`;
      }).join('')}</div>
      <p class="hint center">Messages are stored on this device. Use Settings → Data to share with devices in the office.</p>`;
  }

  async function chatView(channel, token) {
    const job = channel === 'all' ? null : await DB.get('jobs', channel);
    if (channel !== 'all' && !job) return notFound('Channel');
    const msgs = (await DB.by('messages', 'channel', channel)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (stale(token)) return;
    setHeader(job ? job.name : 'Company-wide', job ? 'Job chat' : 'Everyone', job ? `#/job/${job.id}` : '#/messages');
    let lastDay = '';
    app.innerHTML = `
      <div class="chat" id="chatList">
        ${msgs.length ? '' : `<div class="empty small"><h3>Start the conversation</h3><p class="muted">Post updates, schedule changes, material needs, or questions for the office. Log submissions and requests show up here automatically.</p></div>`}
        ${msgs.map((m) => {
          const day = new Date(m.createdAt).toDateString();
          const sep = day !== lastDay ? `<div class="day-sep"><span>${fmtDate(m.createdAt, { weekday: 'short', month: 'short', day: 'numeric' })}</span></div>` : '';
          lastDay = day;
          if (m.system) return `${sep}<div class="sys-msg"><b>${esc(m.authorName)}</b> ${esc(m.text)} <small>${UI.fmtTime(m.createdAt)}</small></div>`;
          const mine = S.me && m.authorId === S.me.id;
          return `${sep}<div class="msg ${mine ? 'mine' : ''} ${m.urgent ? 'urgent' : ''}">
            ${mine ? '' : `<span class="avatar sm ${roleClass(m.role)}">${esc(initials(m.authorName))}</span>`}
            <div class="bubble">
              ${mine ? '' : `<div class="who">${esc(m.authorName)} <span class="role-tag ${roleClass(m.role)}">${esc(m.role)}</span></div>`}
              ${m.urgent ? '<div class="urgent-tag">URGENT</div>' : ''}
              <div class="prewrap">${linkify(esc(m.text))}</div>
              <small>${UI.fmtTime(m.createdAt)}</small>
            </div>
          </div>`;
        }).join('')}
      </div>
      <form class="composer" id="composer">
        <button type="button" class="icon-btn urgent-btn" id="urgentBtn" aria-pressed="false" title="Mark urgent">!</button>
        <textarea id="msgIn" rows="1" placeholder="${job ? 'Message the job team…' : 'Message everyone…'}" aria-label="Message"></textarea>
        <button class="send" type="submit" aria-label="Send">${ICON.send}</button>
      </form>`;
    window.scrollTo(0, document.body.scrollHeight);
    markRead(channel);

    const input = $('#msgIn');
    const urgent = $('#urgentBtn');
    urgent.onclick = () => urgent.setAttribute('aria-pressed', urgent.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    input.oninput = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 140) + 'px'; };
    input.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) { e.preventDefault(); $('#composer').requestSubmit(); } };
    $('#composer').onsubmit = async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      if (!S.me) { profileSheet(); return; }
      await DB.put('messages', { channel, text, authorId: S.me.id, authorName: S.me.name, role: S.me.role, urgent: urgent.getAttribute('aria-pressed') === 'true' });
      notify();
      await chatView(channel, renderToken);
    };
    app.onclick = null;
  }

  function linkify(s) {
    return s.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
      .replace(/(?<![\w/=.-])(\+?\(?\d[\d\s().-]{8,}\d)/g, (m) => {
        const digits = m.replace(/[^\d+]/g, '');
        return digits.replace('+', '').length >= 10 ? `<a href="tel:${digits}">${m}</a>` : m;
      });
  }

  /* ======================================================================
     SETTINGS
     ====================================================================== */
  async function settingsView(token) {
    setHeader('Settings', 'Team, BMP catalog & data');
    const est = await DB.estimate();
    if (stale(token)) return;
    const theme = localStorage.getItem('theme') || 'auto';
    app.innerHTML = `
      <section class="card">
        <div class="card-head"><h3>You</h3></div>
        <div class="me-row pad">
          ${S.me ? `<span class="avatar lg ${roleClass(S.me.role)}">${esc(initials(S.me.name))}</span>
          <div class="grow"><b>${esc(S.me.name)}</b><p class="meta">${esc(S.me.role)}${S.me.phone ? ' · ' + esc(S.me.phone) : ''}</p></div>` : '<div class="grow muted">No profile selected</div>'}
          <button class="btn small soft" data-s="switch">Switch</button>
        </div>
      </section>

      <section class="card">
        <div class="card-head"><h3>Company</h3></div>
        <div class="pad form"><label class="mini">Company name (shown on reports)<input id="companyIn" value="${esc(S.company)}" placeholder="Your company name"></label></div>
      </section>

      <section class="card">
        <div class="card-head"><h3>${ICON.users}Team</h3><button class="btn small soft" data-s="add-person">${ICON.plus} Add</button></div>
        <ul class="people">${S.people.map((p) => `
          <li data-id="${p.id}"><span class="avatar ${roleClass(p.role)}">${esc(initials(p.name))}</span>
            <div class="grow"><b>${esc(p.name)}</b><p class="meta">${esc(p.role)}${p.phone ? ` · <a href="tel:${esc(p.phone)}">${esc(p.phone)}</a>` : ''}</p></div>
            <button class="icon-btn" data-s="edit-person" aria-label="Edit">${ICON.edit}</button></li>`).join('') || '<li class="muted">Add foremen, crew, managers and office staff.</li>'}</ul>
      </section>

      <section class="card">
        <div class="card-head"><h3>${ICON.ruler}BMP catalog &amp; unit rates</h3><button class="btn small soft" data-s="add-bmp">${ICON.plus} Add</button></div>
        <p class="hint pad-x">Rates are used for billing totals on each job’s Quantities tab.</p>
        <div class="catalog">${S.catalog.map((c, i) => `
          <div class="cat-row" data-i="${i}">
            <div class="grow"><b>${esc(c.name)}</b><small>${esc(c.cat || '')}</small></div>
            <div class="unit-input rate"><span>$</span><input type="number" step="0.01" min="0" inputmode="decimal" data-rate value="${c.rate || ''}" placeholder="0.00"><span>/${esc(c.unit)}</span></div>
            <button class="icon-btn" data-s="edit-bmp" aria-label="Edit">${ICON.edit}</button>
          </div>`).join('')}</div>
        <div class="pad"><button class="link-btn muted" data-s="reset-catalog">Reset to default catalog</button></div>
      </section>

      <section class="card">
        <div class="card-head"><h3>Appearance</h3></div>
        <div class="pad"><div class="seg wide">${['auto', 'light', 'dark'].map((t) => `<button data-theme="${t}" class="${t === theme ? 'on' : ''}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div></div>
      </section>

      <section class="card">
        <div class="card-head"><h3>Data</h3></div>
        <div class="pad">
          <p class="small-text muted">All data is saved in this browser only — no account, no cloud. ${est ? `Using ${fmtNum(est.usage / 1048576, 1)} MB.` : ''}
          Export a backup regularly, and import files from other devices to merge their logs, requests and messages.</p>
          <div class="row-actions">
            <button class="btn soft" data-s="export">${ICON.down} Export backup</button>
            <label class="btn soft">${ICON.share} Import file<input type="file" accept="application/json,.json" id="importIn" hidden></label>
          </div>
          <button class="btn danger-ghost block" data-s="wipe">Erase all data on this device</button>
        </div>
      </section>
      <p class="hint center">SiltLine · works offline once loaded</p>`;

    $('#companyIn').onchange = async (e) => { S.company = e.target.value.trim(); await DB.setKV('company', S.company); toast('Saved'); };

    app.oninput = async (e) => {
      if (e.target.matches('[data-rate]')) {
        const i = +e.target.closest('[data-i]').dataset.i;
        S.catalog[i].rate = num(e.target.value);
        await DB.setKV('catalog', S.catalog);
      }
    };
    app.onchange = async (e) => {
      if (e.target.id !== 'importIn') return;
      const f = e.target.files[0];
      if (!f) return;
      try {
        const res = await DB.importAll(JSON.parse(await f.text()));
        await loadSettings();
        notify();
        toast(`Imported: ${res.added} new, ${res.updated} updated`);
        route();
      } catch (err) { toast('Import failed: ' + err.message); }
    };
    app.onclick = async (e) => {
      const th = e.target.closest('[data-theme]');
      if (th) { localStorage.setItem('theme', th.dataset.theme); applyTheme(); route(); return; }
      const b = e.target.closest('[data-s]');
      if (!b) return;
      const s = b.dataset.s;
      if (s === 'switch') profileSheet();
      if (s === 'add-person') personForm();
      if (s === 'edit-person') personForm(S.people.find((p) => p.id === b.closest('[data-id]').dataset.id));
      if (s === 'add-bmp') bmpForm();
      if (s === 'edit-bmp') bmpForm(+b.closest('[data-i]').dataset.i);
      if (s === 'reset-catalog' && await confirmSheet('Reset catalog?', 'Restore the default BMP list. Custom items and rates will be removed.', 'Reset')) {
        S.catalog = Catalog.DEFAULT_CATALOG.map((x) => ({ ...x }));
        await DB.setKV('catalog', S.catalog); route();
      }
      if (s === 'export') {
        const data = await DB.exportAll();
        shareFile(new Blob([JSON.stringify(data)], { type: 'application/json' }), `siltline-backup-${today()}.json`);
      }
      if (s === 'wipe' && await confirmSheet('Erase everything?', 'All jobs, logs, photos, requests, messages and team members on this device will be permanently deleted. Export a backup first if you need it.', 'Erase all')) {
        await DB.wipe();
        await loadSettings();
        renderUserChip(); notify();
        location.hash = '#/jobs';
        profileSheet(true);
      }
    };
  }

  function personForm(p, onSaved) {
    const person = p || { role: 'Crew' };
    sheet(p ? 'Edit team member' : 'Add team member', `
      <form class="form" id="pForm">
        <label>Name *<input name="name" required value="${esc(person.name)}"></label>
        <label>Role</label>
        <div class="seg wide" id="roleSeg">${Catalog.ROLES.map((r) => `<button type="button" data-r="${r}" class="${r === person.role ? 'on' : ''}">${r}</button>`).join('')}</div>
        <input type="hidden" name="role" value="${esc(person.role)}">
        <label>Phone<input type="tel" name="phone" value="${esc(person.phone)}"></label>
        <button class="btn primary block" type="submit">Save</button>
        ${p && (!S.me || p.id !== S.me.id) ? '<button type="button" class="btn danger-ghost block" id="pDel">Remove from team</button>' : ''}
      </form>`, (s, close) => {
      const form = s.querySelector('#pForm');
      s.querySelector('#roleSeg').onclick = (e) => {
        const b = e.target.closest('button'); if (!b) return;
        s.querySelectorAll('#roleSeg button').forEach((x) => x.classList.toggle('on', x === b));
        form.elements.role.value = b.dataset.r;
      };
      form.onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form));
        const saved = await DB.put('people', { ...person, ...data, name: data.name.trim() });
        await loadSettings(); renderUserChip();
        close();
        if (onSaved) onSaved(saved); else route();
      };
      const del = s.querySelector('#pDel');
      if (del) del.onclick = async () => { await DB.del('people', p.id); await loadSettings(); close(); route(); };
    });
  }

  function bmpForm(i) {
    const isNew = i == null;
    const c = isNew ? { code: '', name: '', unit: 'LF', rate: 0, cat: 'Custom' } : S.catalog[i];
    sheet(isNew ? 'Add BMP / pay item' : 'Edit BMP', `
      <form class="form" id="bForm">
        <label>Name *<input name="name" required value="${esc(c.name)}"></label>
        <div class="grid2">
          <label>Unit<select name="unit">${Catalog.UNITS.map((u) => `<option ${u === c.unit ? 'selected' : ''}>${u}</option>`).join('')}</select></label>
          <label>Rate ($/unit)<input name="rate" type="number" step="0.01" min="0" inputmode="decimal" value="${c.rate || ''}"></label>
        </div>
        <label>Group<input name="cat" value="${esc(c.cat)}" placeholder="Perimeter, Inlets, Stabilization…"></label>
        <button class="btn primary block" type="submit">Save</button>
        ${isNew ? '' : '<button type="button" class="btn danger-ghost block" id="bDel">Remove from catalog</button>'}
      </form>`, (s, close) => {
      s.querySelector('#bForm').onsubmit = async (e) => {
        e.preventDefault();
        const d = Object.fromEntries(new FormData(e.target));
        const item = { ...c, name: d.name.trim(), unit: d.unit, rate: num(d.rate), cat: d.cat.trim() || 'Custom' };
        if (isNew) { item.code = 'C' + DB.uid().slice(-6).toUpperCase(); S.catalog.push(item); } else S.catalog[i] = item;
        await DB.setKV('catalog', S.catalog);
        close(); route();
      };
      const del = s.querySelector('#bDel');
      if (del) del.onclick = async () => {
        S.catalog.splice(i, 1);
        await DB.setKV('catalog', S.catalog);
        close(); route();
        toast('Removed. Existing logs keep their quantities.');
      };
    });
  }

  /* Pick who is using this device – no passwords, just attribution for logs and chat. */
  function profileSheet(firstRun) {
    sheet(firstRun ? 'Welcome to SiltLine' : 'Who’s using this device?', `
      ${firstRun ? `<div class="welcome-art">${Art.tractor()}</div><p class="muted">Daily logs, BMP quantities, stormwater inspections, rain events and team chat for erosion control crews. Everything is saved on this device — no sign-up.</p>` : ''}
      ${S.people.length ? `<div class="pick-list">${S.people.map((p) => `
        <button class="pick ${S.me && S.me.id === p.id ? 'on' : ''}" data-pid="${p.id}"><span class="avatar ${roleClass(p.role)}">${esc(initials(p.name))}</span>
        <span class="grow"><b>${esc(p.name)}</b><small>${esc(p.role)}</small></span>${S.me && S.me.id === p.id ? ICON.check : ''}</button>`).join('')}</div>
        <p class="label">Or add someone new</p>` : ''}
      <form class="form" id="newMe">
        ${firstRun ? `<label>Company name<input name="company" value="${esc(S.company)}" placeholder="e.g. Red Clay Erosion Control"></label>` : ''}
        <label>Your name *<input name="name" required placeholder="First and last name"></label>
        <label>Your role</label>
        <div class="seg wide" id="meRole">${Catalog.ROLES.map((r) => `<button type="button" data-r="${r}" class="${r === 'Foreman' ? 'on' : ''}">${r}</button>`).join('')}</div>
        <input type="hidden" name="role" value="Foreman">
        <button class="btn primary block" type="submit">Continue</button>
      </form>`, (s, close) => {
      s.querySelectorAll('[data-pid]').forEach((b) => {
        b.onclick = async () => {
          await DB.setKV('meId', b.dataset.pid);
          await loadSettings(); renderUserChip(); refreshBadges();
          close(); toast(`Hi ${S.me.name.split(' ')[0]}`); route();
        };
      });
      const form = s.querySelector('#newMe');
      s.querySelector('#meRole').onclick = (e) => {
        const b = e.target.closest('button'); if (!b) return;
        s.querySelectorAll('#meRole button').forEach((x) => x.classList.toggle('on', x === b));
        form.elements.role.value = b.dataset.r;
      };
      form.onsubmit = async (e) => {
        e.preventDefault();
        const d = Object.fromEntries(new FormData(form));
        if (d.company != null) { S.company = d.company.trim(); await DB.setKV('company', S.company); }
        const p = await DB.put('people', { name: d.name.trim(), role: d.role });
        await DB.setKV('meId', p.id);
        await loadSettings(); renderUserChip(); refreshBadges();
        close(); route();
      };
    });
  }

  /* ---------- Demo data ---------- */
  async function loadDemo() {
    const d = (n) => { const x = new Date(Date.now() - n * 864e5); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
    const me = S.me ? S.me.name : 'Marcus Reyes';
    const crew = [me, 'Luis Ortega', 'Dante Hill'];
    for (const [name, role] of [['Luis Ortega', 'Crew'], ['Dante Hill', 'Crew'], ['Karen Walsh', 'Office'], ['Tom Brandt', 'Owner']]) {
      if (!S.people.some((p) => p.name === name)) await DB.put('people', { name, role });
    }
    const set = (code, rate) => { const c = bmpDef(code); if (c && !c.rate) c.rate = rate; };
    set('SF', 2.85); set('WAT', 3.5); set('IP', 145); set('RCE', 2400); set('CD', 325); set('ECB', 2.1); set('MOW', 85); set('SKIM', 1250);
    await DB.setKV('catalog', S.catalog);
    const job = await DB.put('jobs', { name: 'Oak Ridge Subdivision – Ph. 2', number: '24-118', gc: 'Summit Builders', gcContact: 'Rick Dawson', gcPhone: '555-201-4410', location: '4200 Oak Ridge Rd, Franklin, TN', permit: 'TNR-204417', start: d(6), status: 'active', notes: 'Perimeter SF, inlet protection on all curb inlets, 2 construction entrances, wattles on slopes > 3:1.' });
    const mk = (days, extra) => DB.put('logs', {
      jobId: job.id, date: d(days), foreman: me, weather: 'Clear', temp: '72', start: '07:00', end: '15:30',
      crew: crew.map((n) => ({ name: n, hours: '8.5' })), bmps: [], maint: [], materials: [], notes: '', photoCount: 0,
      inspection: { enabled: false, type: 'Routine', rain: '', items: [] }, submittedAt: new Date(Date.now() - days * 864e5).toISOString(), submittedBy: me, ...extra,
    });
    await mk(5, { bmps: [{ code: 'SF', name: 'Silt Fence', unit: 'LF', qty: '1250', where: 'North & east property line' }, { code: 'RCE', name: 'Rock Construction Entrance', unit: 'EA', qty: '1', where: 'Oak Ridge Rd entrance' }],
      materials: [{ item: 'Silt fence fabric', qty: '13', unit: 'ROLL' }, { item: '2" rock', qty: '42', unit: 'TON' }], notes: 'Mobilized. GC wants entrance #2 once phase 2 road is cut.' });
    await mk(4, { weather: 'Partly cloudy', bmps: [{ code: 'SF', name: 'Silt Fence', unit: 'LF', qty: '980', where: 'South line' }, { code: 'IP', name: 'Inlet Protection', unit: 'EA', qty: '6', where: 'Inlets 1–6' }] });
    await mk(3, { weather: 'Clear', bmps: [{ code: 'MOW', name: 'Mowing / Bush Hogging', unit: 'AC', qty: '6.5', where: 'Phase 1 common area & pond banks' }, { code: 'SKIM', name: 'Basin Skimmer', unit: 'EA', qty: '1', where: 'Sediment basin #1' }, { code: 'CD', name: 'Rock Check Dam', unit: 'EA', qty: '3', where: 'East ditch' }],
      notes: 'Bush hogged phase 1 before the rain. Skimmer set on basin #1.' });
    await mk(2, { weather: 'Heavy rain', temp: '64', bmps: [{ code: 'WAT', name: 'Straw Wattles', unit: 'LF', qty: '400', where: 'Slope behind lots 20–26' }],
      maint: [{ code: 'SF', kind: 'Repair', qty: '60', unit: 'LF', desc: 'Re-trenched and re-staked SF undermined at SE corner' }],
      inspection: { enabled: true, type: 'Post-rain event', rain: '1.35', items: [{ name: 'Silt Fence', cond: 'maint', note: 'Sediment at 1/3 height along south line' }, { name: 'Inlet Protection', cond: 'good', note: '' }, { name: 'Rock Construction Entrance', cond: 'good', note: '' }] } });
    await DB.put('rain', { jobId: job.id, date: d(2), inches: 1.35, source: 'Site rain gauge', note: 'Runoff over south SF', by: me });
    await DB.put('rain', { jobId: job.id, date: d(9), inches: 0.3, source: 'Site rain gauge', by: me });
    await DB.put('rain', { jobId: job.id, date: d(0), inches: 0.8, source: 'Weather service', note: 'Overnight storm', by: me });
    const open = await DB.put('requests', { jobId: job.id, source: 'Inspector', requestedBy: 'County – J. Price', title: 'Clean out sediment behind south silt fence', desc: 'Sediment above 1/3 fence height from STA 3+00 to 6+50.', location: 'South line', date: d(1), due: d(-2), priority: 'High', status: 'open' });
    await DB.put('requests', { jobId: job.id, source: 'GC', requestedBy: 'Rick Dawson', title: 'Add inlet protection on new curb inlet at Lot 9', location: 'Lot 9', date: d(0), priority: 'Normal', status: 'open' });
    await systemMessage(job.id, `created job "${job.name}"`);
    await DB.put('messages', { channel: job.id, text: 'Rick says paving crew is on site Thursday, keep the entrance clear before 7.', authorName: 'Karen Walsh', role: 'Office', authorId: 'demo-office' });
    await systemMessage(job.id, `logged a high request from Inspector (County – J. Price): ${open.title}`);
    await DB.put('messages', { channel: 'all', text: 'Rain expected Wed night — foremen, plan post-rain inspections Thursday AM.', authorName: 'Tom Brandt', role: 'Owner', authorId: 'demo-owner', urgent: true });
    await loadSettings();
    notify();
    toast('Sample job loaded');
  }

  /* ---------- Theme & boot ---------- */
  function applyTheme() {
    const t = localStorage.getItem('theme') || 'auto';
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  }

  async function boot() {
    applyTheme();
    await loadSettings();
    renderUserChip();
    $('#userChip').onclick = () => profileSheet();
    $('#quickAdd').onclick = () => quickAdd();
    window.addEventListener('hashchange', route);
    if (bus) bus.onmessage = () => {
      loadSettings().then(() => { refreshBadges(); if (document.body.dataset.view === 'chatView' || document.body.dataset.view === 'messagesView') route(); });
    };
    await route();
    refreshBadges();
    if (!S.me) profileSheet(true);
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  boot();
})();
