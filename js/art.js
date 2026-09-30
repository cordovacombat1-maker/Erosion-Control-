/* Topographic contour backgrounds – used wherever a job has no site photo yet. */
(function () {
  'use strict';

  const TONES = {
    steel: ['#14171a', '#262c32', 'rgba(255,194,14,.5)', 'rgba(255,255,255,.08)'],
    green: ['#1f3b2d', '#2b5139', 'rgba(224,164,58,.55)', 'rgba(255,255,255,.12)'],
    water: ['#173447', '#23506b', 'rgba(140,192,230,.6)', 'rgba(255,255,255,.12)'],
    soil:  ['#3b2a1d', '#5a3f2b', 'rgba(224,164,58,.5)', 'rgba(255,255,255,.1)'],
  };

  function hash(s) {
    let h = 2166136261;
    for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    return h;
  }

  /* Deterministic contour lines around a "hill" so each job gets its own pattern. */
  function topo(seed = 'siltline', tone = 'steel') {
    const [bg1, bg2, index, line] = TONES[tone] || TONES.steel;
    let r = hash(seed);
    const rnd = () => ((r = Math.imul(r ^ (r >>> 15), 2246822507) >>> 0) / 4294967296);
    const cx = 120 + rnd() * 160, cy = 60 + rnd() * 100;
    const wob = Array.from({ length: 6 }, () => rnd() * Math.PI * 2);
    let paths = '';
    for (let k = 1; k <= 16; k++) {
      const base = k * 17;
      let d = '';
      for (let i = 0; i <= 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        const rr = base * (1 + 0.16 * Math.sin(2 * a + wob[0]) + 0.09 * Math.sin(3 * a + wob[1] + k * 0.15) + 0.05 * Math.sin(5 * a + wob[2]));
        const x = cx + rr * 1.35 * Math.cos(a), y = cy + rr * 0.8 * Math.sin(a);
        d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
      }
      const major = k % 5 === 0;
      paths += `<path d="${d}Z" stroke="${major ? index : line}" stroke-width="${major ? 1.4 : 0.8}"/>`;
    }
    const id = 'g' + (hash(seed + tone) % 1e6);
    return `<svg class="art topo" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient></defs>
      <rect width="400" height="220" fill="url(#${id})"/>
      <g fill="none">${paths}</g>
    </svg>`;
  }

  window.Art = { topo };
})();
