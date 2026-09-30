/* Illustrated field scenes (inline SVG, animated with CSS, fully offline). */
(function () {
  'use strict';

  let n = 0;
  const uid = (p) => `${p}${++n}`;

  function grassTufts(x0, x1, y, color, step = 9, h = 12) {
    let d = '';
    for (let x = x0; x < x1; x += step) {
      const hh = h * (0.7 + ((x * 37) % 10) / 25);
      d += `M${x} ${y}q2 -${hh * 0.6} ${x % 2 ? 4 : -2} -${hh}M${x + 3} ${y}q1 -${hh * 0.5} 4 -${hh * 0.8}`;
    }
    return `<path class="sway" d="${d}" stroke="${color}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  }

  /* A tractor pulling a rotary mower (bush hog) through a field, mowed stripes behind it. */
  function tractor() {
    const sky = uid('sky'), clip = uid('clip');
    let stripes = '';
    for (let i = 0; i < 6; i++) stripes += `<rect x="-10" y="${150 + i * 12}" width="250" height="12" fill="${i % 2 ? '#78b04d' : '#8cc15c'}"/>`;
    return `<svg class="art" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Tractor mowing a field">
      <defs>
        <linearGradient id="${sky}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fd3ee"/><stop offset="1" stop-color="#e9f6fb"/></linearGradient>
        <clipPath id="${clip}"><path d="M0 146 Q200 130 400 146 V220 H0z"/></clipPath>
      </defs>
      <rect width="400" height="220" fill="url(#${sky})"/>
      <circle cx="338" cy="46" r="22" fill="#ffd66b"/><circle cx="338" cy="46" r="32" fill="#ffd66b" opacity=".25"/>
      <g class="drift" fill="#fff" opacity=".9"><ellipse cx="80" cy="40" rx="30" ry="10"/><ellipse cx="100" cy="34" rx="20" ry="10"/><ellipse cx="220" cy="58" rx="24" ry="7"/></g>
      <path d="M0 122 Q70 92 150 116 T300 104 T400 112 V220 H0z" fill="#a7cf83"/>
      <path d="M0 132 Q90 112 190 128 T400 124 V220 H0z" fill="#93c06c"/>
      <g opacity=".55"><rect x="40" y="104" width="3" height="18" fill="#6e4d33"/><circle cx="41" cy="100" r="11" fill="#5d9a3c"/><rect x="360" y="98" width="3" height="18" fill="#6e4d33"/><circle cx="361" cy="94" r="12" fill="#5d9a3c"/></g>
      <path d="M0 146 Q200 130 400 146 V220 H0z" fill="#5f9a39"/>
      <g clip-path="url(#${clip})">${stripes}</g>
      ${grassTufts(248, 400, 170, '#3f7a26', 8, 16)}
      ${grassTufts(262, 400, 196, '#3f7a26', 9, 18)}
      ${grassTufts(250, 400, 216, '#4a8a2c', 8, 18)}
      <g class="clippings" fill="#9ccf63">
        <rect x="96" y="170" width="5" height="2" rx="1"/><rect x="88" y="164" width="4" height="2" rx="1"/><rect x="102" y="160" width="4" height="2" rx="1"/>
        <rect x="80" y="172" width="5" height="2" rx="1"/><rect x="92" y="154" width="3" height="2" rx="1"/>
      </g>
      <g class="bounce">
        <!-- mower deck -->
        <path d="M168 180 L196 176" stroke="#333" stroke-width="3"/>
        <rect x="104" y="172" width="66" height="16" rx="5" fill="#e0662a"/>
        <rect x="104" y="172" width="66" height="5" rx="2" fill="#f28a4a"/>
        <circle cx="112" cy="190" r="5" fill="#222"/>
        <!-- tractor -->
        <path d="M232 150 h62 a6 6 0 0 1 6 6 v18 h-68z" fill="#2f8f3a"/>
        <rect x="292" y="152" width="8" height="20" rx="2" fill="#1e5f27"/>
        <path d="M296 156 h3 M296 161 h3 M296 166 h3" stroke="#9ad08f" stroke-width="1.5"/>
        <rect x="236" y="146" width="56" height="5" rx="2" fill="#ffd23f"/>
        <rect x="266" y="118" width="5" height="30" rx="1" fill="#3a3a3a"/>
        <g class="puffs" fill="#cfd4d6"><circle cx="269" cy="112" r="4"/><circle cx="273" cy="104" r="5"/><circle cx="278" cy="95" r="6"/></g>
        <path d="M196 176 v-30 h40 v30z" fill="#2f8f3a"/>
        <path d="M202 146 V98 M238 146 V98" stroke="#1f1f1f" stroke-width="4" stroke-linecap="round"/>
        <rect x="196" y="93" width="48" height="8" rx="3" fill="#ffd23f"/>
        <rect x="210" y="128" width="16" height="4" rx="2" fill="#222"/>
        <!-- operator -->
        <rect x="213" y="113" width="12" height="16" rx="4" fill="#ff7a1a"/>
        <path d="M214 118 h10 M214 123 h10" stroke="#f1f1f1" stroke-width="1.6"/>
        <circle cx="219" cy="108" r="5.5" fill="#e0b48a"/>
        <path d="M212.5 106 a6.5 6.5 0 0 1 13 0 h2 v2 h-17 v-2z" fill="#ffd23f"/>
        <path d="M225 120 l12 6" stroke="#e0b48a" stroke-width="3" stroke-linecap="round"/>
        <path d="M190 158 a28 28 0 0 1 52 0" fill="#1e5f27"/>
      </g>
      <g class="wheel" style="transform-origin:216px 172px"><circle cx="216" cy="172" r="25" fill="#1d1d1d"/><circle cx="216" cy="172" r="22.5" fill="none" stroke="#111" stroke-width="5" stroke-dasharray="5 4"/><circle cx="216" cy="172" r="13" fill="#ffd23f"/><path d="M216 160v24M204 172h24" stroke="#c9a51c" stroke-width="2"/><circle cx="216" cy="172" r="4" fill="#555"/></g>
      <g class="wheel" style="transform-origin:288px 182px"><circle cx="288" cy="182" r="14" fill="#1d1d1d"/><circle cx="288" cy="182" r="12.5" fill="none" stroke="#111" stroke-width="3" stroke-dasharray="4 3"/><circle cx="288" cy="182" r="7" fill="#ffd23f"/><path d="M288 176v12M282 182h12" stroke="#c9a51c" stroke-width="1.5"/></g>
    </svg>`;
  }

  /* Crew member driving stakes for a silt fence line on a graded site. */
  function siltFence() {
    const sky = uid('sky');
    const stakes = [48, 104, 160, 216, 272];
    const tops = stakes.map((x, i) => `${x + 2},${112 + i * 3}`).join(' ');
    const bottoms = stakes.slice().reverse().map((x, i) => `${x + 2},${156 + (stakes.length - 1 - i) * 3}`).join(' ');
    return `<svg class="art" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Installing silt fence">
      <defs><linearGradient id="${sky}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd9a3"/><stop offset=".6" stop-color="#fdeccc"/><stop offset="1" stop-color="#f7f0df"/></linearGradient></defs>
      <rect width="400" height="220" fill="url(#${sky})"/>
      <circle cx="70" cy="60" r="26" fill="#ffb347" opacity=".85"/>
      <g class="drift" fill="#fff" opacity=".8"><ellipse cx="250" cy="40" rx="34" ry="9"/><ellipse cx="275" cy="34" rx="18" ry="9"/></g>
      <path d="M0 108 Q100 84 210 100 T400 92 V220 H0z" fill="#c99464"/>
      <!-- distant dozer -->
      <g transform="translate(300 78)"><rect x="0" y="6" width="26" height="12" rx="2" fill="#f2b705"/><rect x="8" y="0" width="12" height="8" rx="1" fill="#f2b705"/><rect x="10" y="2" width="8" height="5" fill="#8fc6e0"/><rect x="-2" y="17" width="30" height="6" rx="3" fill="#333"/><path d="M-3 6 v14 h-4 v-14z" fill="#777"/></g>
      <path d="M0 134 Q120 112 240 128 T400 120 V220 H0z" fill="#b07b4f"/>
      <path d="M0 150 Q140 136 260 150 T400 146 V220 H0z" fill="#9a6a42"/>
      <!-- sediment trapped uphill -->
      <path d="M40 152 q40 -10 90 -2 t110 2 t60 4 v6 h-260z" fill="#c9955f" opacity=".9"/>
      <!-- fabric -->
      <polygon points="${tops} ${bottoms}" fill="#1c1c1c" opacity=".92"/>
      <polyline points="${tops}" fill="none" stroke="#3a3a3a" stroke-width="2"/>
      <path d="M50 158 L274 170" stroke="#5b3d25" stroke-width="5" stroke-linecap="round" opacity=".8"/>
      ${stakes.map((x, i) => `<rect x="${x}" y="${104 + i * 3}" width="5" height="${60}" rx="1" fill="#a8763f"/><rect x="${x}" y="${104 + i * 3}" width="5" height="4" fill="#8b5e2e"/>`).join('')}
      <!-- next stake being driven -->
      <rect x="317" y="140" width="6" height="36" rx="1" fill="#a8763f"/>
      <!-- fabric roll -->
      <g transform="translate(286 170)"><rect x="0" y="0" width="30" height="14" rx="7" fill="#262626"/><ellipse cx="30" cy="7" rx="4" ry="7" fill="#3d3d3d"/><ellipse cx="30" cy="7" rx="1.6" ry="3" fill="#a8763f"/></g>
      <!-- orange flags -->
      <path d="M22 180 v-26" stroke="#555" stroke-width="1.5"/><path d="M22 154 l12 4 l-12 4z" fill="#ff6a13"/>
      <!-- worker -->
      <g transform="translate(340 108)">
        <path d="M4 58 l-3 26 h8 l4 -24 M18 58 l3 26 h8 l-4 -26" fill="#2d4a6e"/>
        <path d="M0 84 h11 v5 h-13z M20 84 h12 v5 h-12z" fill="#4a3322"/>
        <path d="M2 30 q12 -6 24 0 l2 30 h-28z" fill="#ff7a1a"/>
        <path d="M2 44 h26 M2 50 h26" stroke="#e9e9e9" stroke-width="2.4"/>
        <path d="M14 30 v30" stroke="#d9601a" stroke-width="1.5"/>
        <circle cx="14" cy="20" r="8" fill="#d8a47a"/>
        <path d="M5 18 a9 9 0 0 1 18 0 h3 v3 h-24 v-3z" fill="#fff"/>
        <path d="M5 18 h21" stroke="#ddd" stroke-width="1"/>
        <g class="swing" style="transform-origin:6px 34px">
          <path d="M6 34 l-14 -6 l-8 -2" stroke="#d8a47a" stroke-width="5" stroke-linecap="round" fill="none"/>
          <rect x="-24" y="4" width="7" height="36" rx="2" fill="#4a4a4a" transform="rotate(-8 -20 22)"/>
          <rect x="-22" y="0" width="12" height="9" rx="2" fill="#2b2b2b" transform="rotate(-8 -16 4)"/>
        </g>
      </g>
      ${grassTufts(0, 40, 214, '#6c8f3a', 7, 10)}
      ${grassTufts(360, 400, 214, '#6c8f3a', 7, 10)}
    </svg>`;
  }

  /* Rain, a curb inlet with protection, and a detention pond with an outlet riser and skimmer. */
  function stormwater() {
    const sky = uid('sky'), water = uid('w');
    let rain = '';
    for (let i = 0; i < 26; i++) {
      const x = (i * 53) % 400 + 6, y = (i * 29) % 90;
      rain += `<path d="M${x} ${y} l-4 12" />`;
    }
    return `<svg class="art" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Stormwater management with rain, inlet protection and a detention pond">
      <defs>
        <linearGradient id="${sky}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7f93a6"/><stop offset="1" stop-color="#cfd9e1"/></linearGradient>
        <linearGradient id="${water}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5aa0c8"/><stop offset="1" stop-color="#2f6f99"/></linearGradient>
      </defs>
      <rect width="400" height="220" fill="url(#${sky})"/>
      <g class="drift" fill="#5d6d7c"><ellipse cx="90" cy="26" rx="60" ry="18"/><ellipse cx="140" cy="18" rx="40" ry="16"/><ellipse cx="290" cy="22" rx="70" ry="18"/><ellipse cx="350" cy="30" rx="40" ry="14"/></g>
      <g class="rain" stroke="#e3eef6" stroke-width="1.6" stroke-linecap="round" opacity=".85">${rain}</g>
      <path d="M0 110 Q120 92 240 106 T400 100 V220 H0z" fill="#7faa5e"/>
      <!-- houses -->
      <g transform="translate(40 78)" opacity=".85"><path d="M0 20 l16 -14 l16 14 v18 h-32z" fill="#efe6d6"/><path d="M-2 21 l18 -16 l18 16" stroke="#7a4b35" stroke-width="4" fill="none"/><rect x="12" y="26" width="8" height="12" fill="#7a4b35"/></g>
      <g transform="translate(92 84)" opacity=".75"><path d="M0 18 l13 -11 l13 11 v14 h-26z" fill="#e2d7c4"/><path d="M-2 19 l15 -13 l15 13" stroke="#5b6b7a" stroke-width="4" fill="none"/></g>
      <!-- pond -->
      <path d="M210 150 q60 -34 170 -14 q20 10 0 30 q-90 26 -170 6 q-20 -10 0 -22z" fill="#8a6a4b"/>
      <path d="M218 152 q60 -28 158 -12 q14 8 -2 22 q-84 22 -156 4 q-14 -8 0 -14z" fill="url(#${water})"/>
      <g class="ripple" fill="none" stroke="#cfe6f3" stroke-width="1.2"><ellipse cx="260" cy="156" rx="10" ry="3"/><ellipse cx="318" cy="150" rx="12" ry="3.5"/><ellipse cx="290" cy="164" rx="8" ry="2.5"/></g>
      <g fill="#9aa0a4"><circle cx="214" cy="160" r="4"/><circle cx="220" cy="166" r="3.5"/><circle cx="378" cy="146" r="4"/><circle cx="372" cy="160" r="3.5"/><circle cx="226" cy="170" r="3"/></g>
      <!-- outlet riser + skimmer -->
      <rect x="344" y="122" width="16" height="32" rx="1" fill="#b9bdbf"/>
      <path d="M346 128 h12 M346 134 h12 M346 140 h12" stroke="#7a7f82" stroke-width="2"/>
      <rect x="342" y="119" width="20" height="4" fill="#8e9396"/>
      <g class="bob"><rect x="292" y="140" width="18" height="6" rx="3" fill="#f2b705"/><path d="M310 144 L344 146" stroke="#555" stroke-width="2"/></g>
      <!-- cattails -->
      <g stroke="#5e7f2e" stroke-width="2" class="sway"><path d="M232 150 q-2 -18 2 -30M240 152 q2 -16 -1 -26M372 142 q-2 -16 3 -26"/></g>
      <g fill="#6b4a2b"><rect x="231" y="116" width="5" height="12" rx="2.5"/><rect x="237" y="122" width="5" height="10" rx="2.5"/><rect x="373" y="112" width="5" height="11" rx="2.5"/></g>
      <!-- curb + street -->
      <rect x="0" y="176" width="400" height="8" fill="#c9cbc8"/>
      <rect x="0" y="184" width="400" height="36" fill="#4b4f52"/>
      <path d="M0 204 h400" stroke="#d9c35a" stroke-width="2" stroke-dasharray="18 14"/>
      <!-- curb inlet with protection -->
      <rect x="120" y="176" width="46" height="8" fill="#2a2a2a"/>
      <rect x="116" y="182" width="54" height="9" rx="4.5" fill="#c9a15a"/>
      <path d="M122 182 l4 9 M130 182 l4 9 M138 182 l4 9 M146 182 l4 9 M154 182 l4 9 M162 182 l4 9" stroke="#a37e3c" stroke-width="1.2"/>
      <!-- runoff -->
      <g class="flow" stroke="#9cc9e6" stroke-width="2.4" stroke-linecap="round" fill="none" opacity=".9">
        <path d="M10 192 H108" stroke-dasharray="8 10"/><path d="M290 192 H178" stroke-dasharray="8 10"/>
      </g>
      <g class="rain" stroke="#e3eef6" stroke-width="1.6" stroke-linecap="round" opacity=".6" style="animation-delay:-.4s">${rain}</g>
    </svg>`;
  }

  /* Hydroseeded slope with wattles and an erosion control blanket (quiet empty-state scene). */
  function slope() {
    const sky = uid('sky');
    return `<svg class="art" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Stabilized slope with wattles">
      <defs><linearGradient id="${sky}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe1ef"/><stop offset="1" stop-color="#f1f8f4"/></linearGradient></defs>
      <rect width="400" height="220" fill="url(#${sky})"/>
      <circle cx="320" cy="50" r="20" fill="#ffd66b"/>
      <path d="M0 80 L260 190 L400 190 V220 H0z" fill="#8a6242"/>
      <path d="M0 80 L260 190 L0 190z" fill="#a7c96a"/>
      <path d="M0 80 L260 190" stroke="#6d9a3c" stroke-width="3"/>
      <g stroke="#cfe0a6" stroke-width="1" opacity=".7">${Array.from({ length: 12 }, (_, i) => `<path d="M${i * 20} ${88 + i * 8.5} L${i * 20} 190"/>`).join('')}</g>
      ${[0, 1, 2].map((i) => `<rect x="${20 + i * 70}" y="${104 + i * 30}" width="70" height="10" rx="5" fill="#e0a43a" transform="rotate(23 ${55 + i * 70} ${109 + i * 30})"/>`).join('')}
      ${grassTufts(0, 250, 192, '#5c8d3b', 10, 10)}
      <rect x="260" y="190" width="140" height="30" fill="#6e4d33"/>
    </svg>`;
  }

  const SCENES = { tractor, siltFence, stormwater, slope };
  const ORDER = ['siltFence', 'tractor', 'stormwater'];

  function forId(id) {
    let h = 0;
    for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return ORDER[h % ORDER.length];
  }

  window.Art = { ...SCENES, ORDER, forId, scene: (name) => (SCENES[name] || siltFence)() };
})();
