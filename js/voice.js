/* Voice entry: speech recognition (browser built-in, no paid service) and a
   parser that turns a foreman's spoken summary into daily log fields. */
(function (root) {
  'use strict';

  /* ---------- Spoken numbers → digits ---------- */
  const SMALL = {
    zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
    nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  };
  const SCALE = { hundred: 100, thousand: 1000 };

  function wordsToNumbers(text) {
    const toks = text.split(/(\s+)/);
    const out = [];
    let i = 0;
    const isNumWord = (w) => w in SMALL || w in SCALE;
    while (i < toks.length) {
      const w = toks[i].toLowerCase().replace(/-/g, ' ');
      // "twenty-five" arrives as one token
      const parts = w.split(' ').filter(Boolean);
      const startsNum = parts.length && parts.every(isNumWord) && !(parts.length === 1 && parts[0] === 'oh');
      const aHundred = (w === 'a' || w === 'an') && toks[i + 2] && toks[i + 2].toLowerCase() in SCALE;
      if (!startsNum && !aHundred) { out.push(toks[i]); i++; continue; }
      let total = 0, cur = 0, j = i, consumedTo = i;
      while (j < toks.length) {
        const t = toks[j].toLowerCase();
        if (/^\s+$/.test(t)) { j++; continue; }
        const ps = t.replace(/-/g, ' ').split(' ').filter(Boolean);
        if ((t === 'a' || t === 'an') && j === i) { cur = 1; consumedTo = j; j++; continue; }
        if (t === 'and' && toks[j + 2] && (toks[j + 2].toLowerCase() in SMALL) && cur >= 100) { j++; continue; }
        if (!ps.length || !ps.every(isNumWord)) break;
        for (const p of ps) {
          if (p in SMALL) cur += SMALL[p];
          else if (p === 'hundred') cur = (cur || 1) * 100;
          else if (p === 'thousand') { total += (cur || 1) * 1000; cur = 0; }
        }
        consumedTo = j;
        j++;
      }
      out.push(String(total + cur));
      i = consumedTo + 1;
    }
    return out.join('')
      .replace(/(\d+)\s+and\s+a\s+half\b/gi, (m, n) => String(+n + 0.5))
      .replace(/(\d+)\s+and\s+a\s+quarter\b/gi, (m, n) => String(+n + 0.25))
      .replace(/\b(?:a\s+)?half\s+(?:an?\s+)?(acre|inch|hour|mile)/gi, '0.5 $1')
      .replace(/(\d+)\s+point\s+(\d+)/gi, '$1.$2')
      .replace(/(\d),(\d{3})\b/g, '$1$2');
  }

  /* ---------- Vocabulary ---------- */
  const BMP_ALIASES = {
    SSF: ['super silt fence', 'wire backed silt fence', 'wire-backed silt fence', 'super silk fence'],
    SF: ['silt fence', 'silk fence', 'sill fence', 'silt fencing', 'silt fences'],
    WAT: ['straw wattles', 'straw wattle', 'wattles', 'wattle', 'waddles', 'waddle', 'straw logs', 'straw log'],
    CFS: ['compost filter socks', 'compost filter sock', 'compost socks', 'compost sock', 'filter socks', 'filter sock', 'silt socks', 'silt sock'],
    CIP: ['curb inlet protection', 'curb inlets', 'curb inlet'],
    IP: ['inlet protections', 'inlet protection', 'drop inlets', 'drop inlet', 'inlets', 'inlet', 'catch basins', 'catch basin'],
    RCE: ['construction entrances', 'construction entrance', 'rock entrances', 'rock entrance', 'gravel entrance', 'stone entrance', 'construction exit'],
    CD: ['check dams', 'check dam', 'rock check dams', 'rock check dam'],
    ECB: ['erosion control blanket', 'erosion blanket', 'blankets', 'blanket', 'matting', 'erosion mat', 'straw blanket'],
    HYD: ['hydroseed', 'hydro seed', 'hydroseeded', 'hydro seeded', 'hydromulch', 'hydro mulch'],
    SEED: ['seed and straw', 'seeded and strawed', 'seed and mulch'],
    RR: ['riprap', 'rip rap', 'rip-rap'],
    CWO: ['concrete washouts', 'concrete washout', 'washout'],
    ST: ['sediment traps', 'sediment trap', 'sediment basin', 'sed basin', 'sediment pond'],
    TB: ['turbidity curtain', 'turbidity barrier', 'floating boom'],
    TPF: ['tree protection fence', 'tree protection', 'safety fence', 'orange fence'],
    DC: ['dust control', 'water truck'],
    SWEEP: ['street sweeping', 'swept the street', 'sweeping'],
    SKIM: ['skimmers', 'skimmer', 'faircloth skimmer'],
    DWB: ['dewatering bags', 'dewatering bag', 'dirt bags', 'dirt bag'],
    POND: ['pond cleanout', 'basin cleanout', 'pond clean out', 'basin clean out'],
    OUT: ['outlet protection', 'rip rap apron', 'riprap apron', 'outlet apron'],
    INLC: ['inlet cleaning'],
    LVL: ['level spreaders', 'level spreader'],
    POND_MOW: ['pond banks', 'pond bank', 'pond bank mowing'],
    MOW: ['bush hogged', 'bush hogging', 'bush hog', 'bushhogged', 'bushhog', 'mowed', 'mowing', 'mowing'],
    TRIM: ['weed eating', 'weed eated', 'weed eater', 'string trimming', 'string trimmed', 'trimming'],
  };

  const MATERIALS = [
    { item: 'Silt fence fabric', unit: 'ROLL', words: ['silt fence fabric', 'rolls of fabric', 'fabric'] },
    { item: 'Filter fabric', unit: 'ROLL', words: ['filter fabric', 'geotextile'] },
    { item: 'Wood stakes', unit: 'EA', words: ['wood stakes', 'wooden stakes', 'stakes', 'stakes'] },
    { item: 'T-posts', unit: 'EA', words: ['t posts', 't-posts', 'tee posts', 'posts'] },
    { item: 'Staples', unit: 'EA', words: ['staples', 'sod staples', 'pins'] },
    { item: 'Zip ties', unit: 'EA', words: ['zip ties'] },
    { item: '#57 stone', unit: 'TON', words: ['57 stone', 'number 57', '#57', '57s'] },
    { item: 'Rock', unit: 'TON', words: ['washed stone', 'crusher run', 'gravel', 'stone', 'rock'] },
    { item: 'Straw bales', unit: 'EA', words: ['straw bales', 'bales of straw', 'bales'] },
    { item: 'Seed mix', unit: 'BAG', words: ['grass seed', 'seed'] },
    { item: 'Fertilizer', unit: 'BAG', words: ['fertilizer', 'lime'] },
    { item: 'Hydromulch', unit: 'BAG', words: ['mulch'] },
    { item: 'Tackifier', unit: 'GAL', words: ['tackifier', 'tack'] },
    { item: 'Sandbags', unit: 'EA', words: ['sandbags', 'sand bags'] },
    { item: 'Wire mesh', unit: 'ROLL', words: ['wire mesh', 'wire backing', 'hog wire'] },
  ];

  const UNIT_WORDS = [
    ['LF', /^(?:linear\s+(?:feet|foot|ft)|lineal\s+feet|lf|feet|foot|ft)\b/],
    ['SY', /^(?:square\s+yards?|sy)\b/],
    ['SF', /^(?:square\s+(?:feet|foot)|sf)\b/],
    ['AC', /^(?:acres?|ac)\b/],
    ['TON', /^(?:tons?)\b/],
    ['CY', /^(?:cubic\s+yards?|yards?|cy)\b/],
    ['GAL', /^(?:gallons?|gal)\b/],
    ['HR', /^(?:hours?|hrs?)\b/],
    ['EA', /^(?:each|ea|of\s+them)\b/],
  ];
  const CONTAINERS = { rolls: 'ROLL', roll: 'ROLL', bags: 'BAG', bag: 'BAG', bundles: 'EA', bundle: 'EA', boxes: 'EA', box: 'EA', pallets: 'EA', pallet: 'EA', bales: 'EA', buckets: 'EA', loads: 'EA', load: 'EA' };

  const REPAIR_VERBS = [
    ['Clean out', /\b(?:clean(?:ed)?\s*(?:out)?|clean-?out|mucked\s+out|dug\s+out|removed\s+sediment)\b/],
    ['Replace', /\b(?:replac(?:e|ed|ing)|swapped)\b/],
    ['Remove', /\b(?:remov(?:e|ed|ing)|pulled|took\s+out|tore\s+out|took\s+down)\b/],
    ['Maintenance', /\b(?:maint(?:ained|enance|ain)|adjust(?:ed)?|re-?staked|re-?trenched|tighten(?:ed)?)\b/],
    ['Repair', /\b(?:repair(?:ed|s|ing)?|fix(?:ed|ing)?|patch(?:ed)?|reset|re-?set|stood\s+(?:back\s+)?up|put\s+back\s+up)\b/],
  ];
  const INSTALL_VERB = /\b(?:install(?:ed|ing)?|put\s+(?:in|down|up|out)|set(?:\s+up)?|ran|run|laid|lay|placed|built|build|added|new)\b/;

  const WEATHER = [
    ['Heavy rain', /\b(?:heavy\s+rain|pouring|poured|downpour|storm(?:ed|ing|y)?|thunderstorm)\b/],
    ['Light rain', /\b(?:light\s+rain|drizzl\w*|sprinkl\w*|rain(?:ed|ing|y)?)\b/],
    ['Snow', /\bsnow\w*\b/],
    ['Freezing', /\b(?:freezing|froze|frozen|ice|icy)\b/],
    ['Windy', /\bwind(?:y)?\b/],
    ['Overcast', /\b(?:overcast|cloudy|gray|grey)\b/],
    ['Partly cloudy', /\bpartly\s+(?:cloudy|sunny)\b/],
    ['Clear', /\b(?:sunny|clear|nice\s+day|beautiful\s+day|dry\s+day)\b/],
  ];

  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const NUM = '(\\d+(?:\\.\\d+)?)';

  function unitAt(s) {
    const t = s.replace(/^\s+/, '');
    for (const [u, re] of UNIT_WORDS) { const m = t.match(re); if (m) return { unit: u, len: s.length - t.length + m[0].length }; }
    return null;
  }

  /* Blank out a matched span so later passes don't reuse it. */
  function blank(str, start, end) { return str.slice(0, start) + ' '.repeat(end - start) + str.slice(end); }

  function parse(text, ctx = {}) {
    const catalog = ctx.catalog || [];
    const people = (ctx.people || []).filter(Boolean);
    const me = ctx.me || '';
    const result = { crew: [], bmps: [], maint: [], materials: [], weather: '', temp: '', rain: '', start: '', end: '', transcript: text.trim() };
    if (!text.trim()) return result;

    let s = ' ' + wordsToNumbers(text).toLowerCase().replace(/[“”"]/g, '').replace(/\s+/g, ' ') + ' ';

    /* ---- times: "started at 7", "knocked off at 3:30" ---- */
    const time = (h, m, ap) => {
      let hh = +h; const mm = m ? +m : 0;
      ap = (ap || '').replace(/\./g, '');
      if (ap === 'pm' && hh < 12) hh += 12;
      if (!ap && hh >= 1 && hh <= 5) hh += 12; // "quit at 4" on a jobsite means 4 PM
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    };
    const TIME = '(\\d{1,2})(?::(\\d{2}))?\\s*(a\\.?m\\.?|p\\.?m\\.?)?';
    let m = s.match(new RegExp(`\\b(?:start(?:ed)?|got\\s+(?:there|on\\s+site|to\\s+the\\s+site)|clocked\\s+in|began)\\s+(?:work\\s+)?(?:at|around|about)\\s+${TIME}`));
    if (m) { result.start = time(m[1], m[2], m[3]); s = blank(s, m.index, m.index + m[0].length); }
    m = s.match(new RegExp(`\\b(?:quit|finish(?:ed)?|wrapped\\s+up|knocked\\s+off|left(?:\\s+the\\s+site)?|clocked\\s+out|end(?:ed)?|done|stopped)\\s+(?:work\\s+)?(?:at|around|about)\\s+${TIME}`));
    if (m) { result.end = time(m[1], m[2], m[3]); s = blank(s, m.index, m.index + m[0].length); }

    /* ---- rain gauge ---- */
    m = s.match(new RegExp(`${NUM}\\s*(?:inches|inch|in|")\\s+of\\s+rain`)) || s.match(new RegExp(`rain\\s*gauge\\s+(?:read|reads|said|showed|shows|had|was|at)\\s+${NUM}`));
    if (m) { result.rain = m[1]; s = blank(s, m.index, m.index + m[0].length); }

    /* ---- temperature ---- */
    m = s.match(/\b(\d{1,3})\s*(?:degrees|°)/);
    if (m) { result.temp = m[1]; s = blank(s, m.index, m.index + m[0].length); }

    /* ---- weather ---- */
    for (const [label, re] of WEATHER) { if (re.test(s)) { result.weather = label; break; } }

    /* ---- crew & hours ---- */
    const names = [];
    people.forEach((full) => {
      const first = full.split(/\s+/)[0];
      [full, first].forEach((n) => { if (n && n.length > 1) names.push({ key: n.toLowerCase(), full }); });
    });
    names.sort((a, b) => b.key.length - a.key.length);
    const hits = [];
    let crewScan = s;
    names.forEach(({ key, full }) => {
      const re = new RegExp(`\\b${esc(key)}\\b`, 'g');
      let mm;
      while ((mm = re.exec(crewScan))) {
        hits.push({ full, index: mm.index, end: mm.index + key.length });
        crewScan = blank(crewScan, mm.index, mm.index + key.length);
      }
    });
    if (me) {
      const reMe = /\b(?:me|myself)\b(?=\s*(?:,|and\b|worked|put\s+in|had|got|did|\d))|\bi\b(?=\s+(?:worked|put\s+in|had|got|did|was\s+there))/g;
      let mm;
      while ((mm = reMe.exec(s))) hits.push({ full: me, index: mm.index, end: mm.index + mm[0].length });
    }
    hits.sort((a, b) => a.index - b.index);
    const hoursRe = new RegExp(`^[^.;]{0,30}?${NUM}\\s*(?:hours|hour|hrs|hr)\\b`);
    const crewMap = new Map();
    const setHours = (n, h) => { if (!crewMap.has(n) || (h && !crewMap.get(n))) crewMap.set(n, h || ''); };
    let group = [];
    hits.forEach((h, idx) => {
      group.push(h.full);
      const next = hits[idx + 1];
      const gap = next ? s.slice(h.end, next.index) : '';
      if (next && /^[\s,&]*(?:and)?[\s,&]*$/.test(gap)) return; // "Luis and Dante 8 hours each"
      const after = s.slice(h.end, next ? next.index : h.end + 45);
      const hm = after.match(hoursRe);
      group.forEach((n) => setHours(n, hm ? hm[1] : ''));
      if (hm) { const a = h.end + hm.index, b = h.end + hm.index + hm[0].length; s = blank(s, a, b); }
      group = [];
    });
    m = s.match(new RegExp(`\\b(?:every(?:body|one)|all\\s+of\\s+us|whole\\s+crew|the\\s+crew|all\\s+(?:3|4|5|6|three|four|five|six)?\\s*(?:of\\s+us|guys)?|we)\\s+(?:all\\s+)?(?:worked|put\\s+in|did|had|got)\\s+${NUM}\\s*(?:hours|hrs)`));
    if (m) {
      const h = m[1];
      if (!crewMap.size && me) crewMap.set(me, '');
      crewMap.forEach((v, k) => { if (!v) crewMap.set(k, h); });
      result.allHours = h;
      s = blank(s, m.index, m.index + m[0].length);
    }
    result.crew = [...crewMap].map(([name, hours]) => ({ name, hours }));

    /* ---- materials in containers ("13 rolls of silt fence", "10 bags of seed") ---- */
    const allMatWords = MATERIALS.flatMap((mt) => mt.words.map((w) => ({ w, mt }))).sort((a, b) => b.w.length - a.w.length);
    const bmpWordList = Object.entries(BMP_ALIASES).flatMap(([code, ws]) => ws.map((w) => ({ w, code })));
    const contRe = new RegExp(`${NUM}\\s+(${Object.keys(CONTAINERS).join('|')})\\s+of\\s+([a-z#\\- ]{2,40}?)(?=[,.;]| and | then | for | on | at | to |$)`, 'g');
    let cm;
    while ((cm = contRe.exec(s))) {
      const what = cm[3].trim();
      const mat = allMatWords.find(({ w }) => what.includes(w));
      const bmpWord = bmpWordList.find(({ w }) => what.includes(w));
      let item = mat ? mat.mt.item : what.replace(/^(?:the|some)\s+/, '');
      if (bmpWord && bmpWord.code === 'SF' || bmpWord && bmpWord.code === 'SSF') item = 'Silt fence fabric';
      else if (bmpWord && !mat) item = item.replace(/\b\w/g, (c) => c.toUpperCase());
      result.materials.push({ item, qty: cm[1], unit: CONTAINERS[cm[2]] });
      s = blank(s, cm.index, cm.index + cm[0].length);
      contRe.lastIndex = 0;
    }

    /* ---- BMP items ---- */
    const aliasList = [];
    Object.entries(BMP_ALIASES).forEach(([code, ws]) => ws.forEach((w) => aliasList.push({ w, code })));
    catalog.forEach((c) => {
      if (!BMP_ALIASES[c.code]) aliasList.push({ w: c.name.toLowerCase().replace(/\s*\(.*?\)\s*/g, ' ').trim(), code: c.code });
    });
    aliasList.sort((a, b) => b.w.length - a.w.length);
    const matches = [];
    let scan = s;
    aliasList.forEach(({ w, code }) => {
      const re = new RegExp(`\\b${esc(w)}\\b`, 'g');
      let mm;
      while ((mm = re.exec(scan))) {
        matches.push({ code, index: mm.index, end: mm.index + w.length, word: w });
        scan = blank(scan, mm.index, mm.index + w.length);
      }
    });
    matches.sort((a, b) => a.index - b.index);
    const usedNums = new Set();
    const numRe = new RegExp(NUM, 'g');
    const clauseStart = (i) => Math.max(s.lastIndexOf('.', i), s.lastIndexOf(';', i), s.lastIndexOf(' then ', i), 0);

    matches.forEach((mt, idx) => {
      const prevEnd = idx ? matches[idx - 1].end : clauseStart(mt.index);
      const nextStart = matches[idx + 1] ? matches[idx + 1].index : s.length;
      let qty = '', qtyAt = -1;
      // number just before the item: "300 feet of silt fence", "4 new inlets"
      let bq = null;
      const before = s.slice(Math.max(prevEnd, mt.index - 40), mt.index);
      const bnums = [...before.matchAll(numRe)];
      if (bnums.length) {
        const last = bnums[bnums.length - 1];
        const abs = mt.index - before.length + last.index;
        const tail = before.slice(last.index + last[0].length);
        if (!usedNums.has(abs) && /^\s*(?:[a-z]+\s*){0,3}$/.test(tail) && !/\b(?:hours?|hrs?|inch(?:es)?|degrees)\b/.test(tail)) {
          // "strong" when the number is tied to the item ("300 ft of", "4 new"); weak when it's across "and the"
          const strong = !!unitAt(tail) || /^\s*(?:of\s+)?(?:\w+\s+)?$/.test(tail) && !/\b(?:and|the|then|on|at)\b/.test(tail);
          bq = { qty: last[1], at: abs, strong };
        }
      }
      // number just after: "silt fence, 300 feet", "mowed 6 acres"
      let aq = null;
      const after = s.slice(mt.end, Math.min(nextStart, mt.end + 34));
      const an = after.match(new RegExp(`^[\\s,:-]*(?:about|around|roughly|approximately|another|like)?\\s*${NUM}`));
      if (an) aq = { qty: an[1], at: mt.end + an.index + an[0].length - an[1].length };
      const pick = bq && (bq.strong || !aq) ? bq : aq;
      if (pick) { qty = pick.qty; qtyAt = pick.at; }
      if (qtyAt >= 0) usedNums.add(qtyAt);
      // what was done: nearest verb before the item within its clause
      const lead = s.slice(clauseStart(mt.index), mt.index);
      let kind = null, kindPos = -1;
      REPAIR_VERBS.forEach(([k, re]) => {
        const g = new RegExp(re.source, 'g'); let vm;
        while ((vm = g.exec(lead))) if (vm.index > kindPos) { kindPos = vm.index; kind = k; }
      });
      let instPos = -1; { const g = new RegExp(INSTALL_VERB.source, 'g'); let vm; while ((vm = g.exec(lead))) instPos = vm.index; }
      const isMaint = kind && kindPos > instPos;
      // location phrase after the item
      const tailStart = qtyAt > mt.end ? qtyAt + qty.length : mt.end;
      const tail = s.slice(tailStart, nextStart);
      const ut = unitAt(tail);
      const tail2 = ut ? tail.slice(ut.len) : tail;
      const lm = tail2.match(/^\s*(?:of\s+\w+\s+)?,?\s*((?:along|at|on|behind|around|near|by|across|in\s+front\s+of|down|up|between|below|above|at\s+the)\s+[^,.;]+?)(?=\s*(?:,|\.|;|\band\b|\bthen\b|\bplus\b|$))/);
      const where = lm ? lm[1].trim().slice(0, 70) : '';
      const def = catalog.find((c) => c.code === mt.code);
      const row = { code: mt.code, name: def ? def.name : mt.word, unit: def ? def.unit : (ut ? ut.unit : 'EA'), qty };
      if (isMaint) {
        result.maint.push({ ...row, kind, desc: [kind, qty && `${qty} ${row.unit}`, row.name.toLowerCase(), where].filter(Boolean).join(' ') });
      } else if (qty) {
        result.bmps.push({ ...row, where });
      }
    });

    /* ---- remaining plain materials ("used 120 stakes", "42 tons of rock") ---- */
    matches.forEach((mt) => { s = blank(s, mt.index, mt.end); });
    allMatWords.forEach(({ w, mt }) => {
      const re = new RegExp(`${NUM}\\s*(?:(tons?|yards?|gallons?|bags?|rolls?|pounds?|lbs)\\s+)?(?:of\\s+)?(?:\\w+\\s+)?${esc(w)}\\b`, 'g');
      let mm;
      while ((mm = re.exec(s))) {
        const u = mm[2] ? ({ ton: 'TON', tons: 'TON', yard: 'CY', yards: 'CY', gallon: 'GAL', gallons: 'GAL', bag: 'BAG', bags: 'BAG', roll: 'ROLL', rolls: 'ROLL' })[mm[2]] || mt.unit : mt.unit;
        const dup = result.materials.find((x) => x.item === mt.item && x.unit === u);
        if (dup) dup.qty = String(+dup.qty + +mm[1]); else result.materials.push({ item: mt.item, qty: mm[1], unit: u });
        s = blank(s, mm.index, mm.index + mm[0].length);
        re.lastIndex = 0;
      }
    });

    return result;
  }

  /* ---------- Speech recognition wrapper ---------- */
  const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

  function listen({ onText, onEnd, onError }) {
    if (!SR) return null;
    const rec = new SR();
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    let finalText = '';
    let stopped = false;
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript.trim() + '. ';
        else interim += r[0].transcript;
      }
      onText(finalText, interim);
    };
    rec.onerror = (e) => { if (e.error !== 'no-speech' && e.error !== 'aborted') onError && onError(e.error); };
    // Mobile browsers end sessions after a pause; keep listening until the user taps stop.
    rec.onend = () => { if (!stopped) { try { rec.start(); } catch (_) { onEnd && onEnd(finalText); } } else onEnd && onEnd(finalText); };
    rec.start();
    return {
      stop() { stopped = true; try { rec.stop(); } catch (_) { onEnd && onEnd(finalText); } },
      setText(t) { finalText = t; },
    };
  }

  const Voice = { parse, wordsToNumbers, listen, supported: !!SR };
  if (typeof module !== 'undefined' && module.exports) module.exports = Voice;
  else root.Voice = Voice;
})(typeof window !== 'undefined' ? window : globalThis);
