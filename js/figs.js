'use strict';
// ============================================================
//  איורים — דמויות קו (SVG) שנבנות מנקודות מפתח.
//  כל תרגיל = כמה פריימים (התחלה / אמצע / סוף). המרפקים והברכיים מחושבים לבד (IK).
//  פריים: n=צוואר, p=אגן, w=כף יד, f=כף רגל, e=מרפק (אופציונלי), w2/f2=גפה רחוקה,
//         eb/kb=כיוון כיפוף, props=SVG של ציוד, bad=טעות (באדום), raw=SVG ידני
// ============================================================
const FG = (() => {
  const AL = 12, LL = 17;
  function ik(a, b, l1, l2, s) {
    let dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy); const mx = l1 + l2 - 0.15;
    if (d > mx) { b = [a[0] + dx / d * mx, a[1] + dy / d * mx]; dx = b[0] - a[0]; dy = b[1] - a[1]; d = mx; }
    if (d < 0.5) d = 0.5;
    const aa = (l1 * l1 - l2 * l2 + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, l1 * l1 - aa * aa)), ux = dx / d, uy = dy / d;
    return [a, [a[0] + ux * aa - uy * hh * s, a[1] + uy * aa + ux * hh * s], b];
  }
  const pl = pts => pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  function limb(a, b, l1, l2, s, e) {
    if (e) return [a, e, b];
    return ik(a, b, l1, l2, s);
  }
  const HL = {};
  const hlSet = (keys, parts) => keys.split(' ').forEach(k => { HL[k] = parts; });
  hlSet('pull pullNeg pullWide pullPause archerPull chin chinNeg chinSlow scap muscleup frontlever dbRow', ['torso', 'arms']);
  hlSet('dip dipNeg dipPause dipExp dipShrug pushup diamond pushFeetUp archerPush pseudo easyPush dbPress', ['arms', 'torso']);
  hlSet('squat slowSquat jumpSquat bulgarian shrimp pistol pistolAssist lunge jumpLunge cossack wallsit goblet bridge rdl', ['legs']);
  hlSet('kneeRaise legRaise t2b wipers plank hollow lsit lsitTuck mountain', ['torso']);
  hlSet('dbCurl hangPassive armCircles handstand', ['arms']);
  hlSet('burpee', ['legs', 'torso', 'arms']);

  // ---- גוף שרירי: כל עצם היא צורה מתרחבת (פרופיל רדיוסים לאורכה) ----
  const f1 = n => n.toFixed(1);
  function bone(a, b, prof, grow = 0) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const at = t => { for (let i = 1; i < prof.length; i++) if (t <= prof[i][0]) { const [t0, r0] = prof[i - 1], [t1, r1] = prof[i]; return r0 + (r1 - r0) * ((t - t0) / (t1 - t0 || 1)); } return prof[prof.length - 1][1]; };
    const ts = [0, .12, .25, .4, .55, .7, .85, 1], l = [], r = [];
    ts.forEach(t => { const R = at(t) + grow, cx = a[0] + dx * t, cy = a[1] + dy * t; l.push(`${f1(cx + nx * R)},${f1(cy + ny * R)}`); r.push(`${f1(cx - nx * R)},${f1(cy - ny * R)}`); });
    const cap = (p, R) => `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${f1(R + grow)}"/>`;
    return { poly: `<polygon points="${l.concat(r.reverse()).join(' ')}"/>`, caps: cap(a, prof[0][1]) + cap(b, prof[prof.length - 1][1]) };
  }
  // פרופילים: [מיקום 0..1, רדיוס]
  const UPARM = [[0, 4.3], [.3, 4.9], [.55, 4.4], [1, 3.2]];   // כתף ודו-ראשי/תלת-ראשי
  const FOREARM = [[0, 3.7], [.3, 4], [1, 2.6]];
  const THIGH = [[0, 6.2], [.4, 6.4], [1, 4.2]];
  const CALF = [[0, 4.1], [.3, 4.8], [1, 2.6]];
  const TORSO = [[0, 6.2], [.25, 7.8], [.7, 6.2], [1, 5.2]];       // חזה רחב, מותן צר
  function limbShapes(pts, p1, p2, grow) {
    const u = bone(pts[0], pts[1], p1, grow), v = bone(pts[1], pts[2], p2, grow);
    return u.poly + v.poly + u.caps + v.caps;
  }
  function figure(f, hl) {
    if (f.raw) return `<svg viewBox="${f.vb || '0 0 120 100'}" class="fg raw" aria-hidden="true"><g class="fg-p">${f.props || ''}</g>${f.raw}</svg>`;
    const n = f.n, p = f.p;
    const L = Math.hypot(n[0] - p[0], n[1] - p[1]) || 1;
    const ux = (n[0] - p[0]) / L, uy = (n[1] - p[1]) / L;
    let h = f.hd;
    if (!h) { h = [n[0] + ux * 11, n[1] + uy * 11]; if (f.w && f.w[1] < n[1] - 10 && !f.f2) h = [h[0] + 6, h[1] + 1]; }
    const arm = f.w ? limb(n, f.w, AL, AL, f.eb == null ? 1 : f.eb, f.e) : null;
    const arm2 = f.w2 ? limb(n, f.w2, AL, AL, f.eb2 == null ? 1 : f.eb2, f.e2) : null;
    const leg = f.f ? limb(p, f.f, LL, LL, f.kb == null ? -1 : f.kb) : null;
    const leg2 = f.f2 ? limb(p, f.f2, LL, LL, f.kb2 == null ? -1 : f.kb2) : null;
    const parts = hl || [];
    const armS = (a, glow) => a ? limbShapes(a, UPARM, FOREARM, glow) : '';
    const legS = (a, glow) => a ? limbShapes(a, THIGH, CALF, glow) : '';
    const torsoS = glow => { const t = bone(p, n, TORSO.map(([t, r]) => [1 - t, r]).reverse(), glow); return t.poly + t.caps; };
    const layer = (shapes, cls = '') => shapes ? `<g class="fg-ol">${shapes}</g><g class="fg-fl ${cls}">${shapes}</g>` : '';
    let g = '';
    if (parts.includes('arms')) g += `<g class="fg-hl">${armS(arm, 3.4)}${armS(arm2, 3.4)}</g>`;
    if (parts.includes('legs')) g += `<g class="fg-hl">${legS(leg, 3.4)}${legS(leg2, 3.4)}</g>`;
    if (parts.includes('torso')) g += `<g class="fg-hl">${torsoS(3.4)}</g>`;
    const delt = `<circle cx="${f1(n[0])}" cy="${f1(n[1])}" r="5.2"/>`;
    let body = layer(armS(arm2, 0), 'fg-far') + layer(legS(leg2, 0), 'fg-far') + layer(torsoS(0) + delt) + layer(legS(leg, 0)) + layer(armS(arm, 0));
    // כפות
    const ends = [arm && arm[2], arm2 && arm2[2], leg && leg[2], leg2 && leg2[2]].filter(Boolean).map(e => `<circle class="fg-end" cx="${f1(e[0])}" cy="${f1(e[1])}" r="3.2"/>`).join('');
    // צוואר וראש
    const neck = `<line class="fg-neck" x1="${f1(n[0])}" y1="${f1(n[1])}" x2="${f1(h[0])}" y2="${f1(h[1])}"/>`;
    const head = `<circle class="fg-h" cx="${f1(h[0])}" cy="${f1(h[1])}" r="6.4"/><path class="fg-hair" d="M${f1(h[0] - 6.2)} ${f1(h[1] - 0.5)}a6.3 6.3 0 0 1 12.4 0c-3-2.6-9-2.6-12.4 0z"/>`;
    return `<svg viewBox="${f.vb || '0 0 120 100'}" class="fg${f.bad ? ' bad' : ''}" aria-hidden="true"><g class="fg-p">${f.props || ''}</g>${g}${body}${ends}${neck}${head}${f.extra || ''}</svg>`;
  }

  // ---- ציוד וחצים ----
  const grd = '<path d="M4 92H116"/>';
  const bar = (y, x1 = 30, x2 = 96) => `<path class="t" d="M${x1} ${y}H${x2}"/><path d="M${x1} ${y}v-5M${x2} ${y}v-5"/>`;
  const posts = (y, x1, x2) => `<path d="M${x1} ${y}V92M${x2} ${y}V92"/>`;
  const arrow = (x1, y1, x2, y2) => {
    const a = Math.atan2(y2 - y1, x2 - x1), c = 4.5, q = Math.PI / 6;
    const h = (t) => `${(x2 - c * Math.cos(a + t)).toFixed(1)} ${(y2 - c * Math.sin(a + t)).toFixed(1)}`;
    return `<path class="a" d="M${x1} ${y1}L${x2} ${y2}M${x2} ${y2}L${h(q)}M${x2} ${y2}L${h(-q)}"/>`;
  };
  const bench = (x1, x2, y) => `<path class="t" d="M${x1} ${y}H${x2}"/><path d="M${x1 + 3} ${y}V92M${x2 - 3} ${y}V92"/>`;
  const wall = x => `<path class="t" d="M${x} 6V92"/>`;
  const db = (x, y) => `<path class="t" d="M${x - 6} ${y}H${x + 6}M${x - 6} ${y - 3}v6M${x + 6} ${y - 3}v6"/>`;
  const dbx = (x, y) => `<circle class="t" cx="${x}" cy="${y}" r="4"/>`;

  // ---- פוזות משותפות ----
  const hang = { w: [64, 16], n: [63, 40], p: [61, 64], f: [52, 88], hd: [69, 31] };
  const pullTop = { w: [64, 16], n: [62, 19], p: [58, 43], f: [50, 68], hd: [67, 10] };
  const pullMid = { w: [64, 16], n: [62, 30], p: [60, 54], f: [51, 78], hd: [67, 21] };
  const B16 = bar(16);
  const stand = { n: [60, 34], p: [60, 58], f: [60, 91], w: [82, 38] };
  const sqDown = { n: [54, 51], p: [40, 74], f: [60, 91], w: [80, 56] };
  const VBP = '20 40 84 70';
  const pushUp = { w: [86, 90], n: [84, 66], p: [58, 76], f: [26, 88], vb: VBP };
  const pushDn = { w: [86, 90], n: [82, 80], p: [56, 84], f: [26, 89], vb: VBP };
  const dipTop = { w: [62, 46], n: [67, 22], p: [55, 45], f: [46, 70] };
  const dipDn = { w: [62, 46], n: [68, 34], p: [54, 54], f: [46, 78] };
  const DB = bar(46, 40, 84) + posts(46, 84, 84);
  const pl_ = { w: [12, 0] };

  const F = (o, extra) => Object.assign({}, o, extra);
  const frontHang = (g, cap) => ({ raw: `<g class="fg-b-g"><path class="fg-b" d="M${60 - g} 14L46 40M${60 + g} 14L74 40M46 40H74M60 40V68M57 68V94M63 68V94"/><circle class="fg-h" cx="60" cy="29" r="6.5"/></g>`, props: bar(14, 8, 112), cap });

  const FIGS = {
    pull: [
      F(hang, { props: B16, cap: 'תלייה: ידיים ישרות' }),
      F(pullMid, { props: B16 + arrow(100, 70, 100, 34), cap: 'מורידים שכמות ומושכים' }),
      F(pullTop, { props: B16, cap: 'סנטר מעל המוט' }),
    ],
    pullNeg: [
      F(pullTop, { props: B16 + '<path d="M30 70h30v22H30z"/>', cap: 'קופצים למעלה' }),
      F(pullMid, { props: B16 + arrow(100, 34, 100, 70), cap: 'יורדים לאט (5 שנ׳)' }),
      F(hang, { props: B16, cap: 'יישור מלא' }),
    ],
    pullWide: [
      frontHang(40, 'אחיזה רחבה (מלפנים)'),
      F(pullTop, { props: B16, cap: 'למעלה: מרפקים למטה ולאחור' }),
    ],
    pullPause: [
      F(hang, { props: B16, cap: 'תלייה' }),
      F(pullTop, { props: B16 + '<text x="86" y="12" class="tx">2 שנ׳</text>', cap: 'עוצרים למעלה' }),
    ],
    archerPull: [
      { ...frontHang(44, 'מתחילים באחיזה רחבה'), },
      { raw: `<path class="fg-b" d="M16 14L36 40M104 14L66 18M36 40H70M54 40V68M51 68V94M57 68V94"/><circle class="fg-h" cx="40" cy="26" r="6.5"/>`, props: bar(14, 8, 112) + arrow(70, 60, 28, 60), cap: 'מושכים לצד יד אחת, השנייה ישרה' },
    ],
    chin: [
      F(hang, { props: B16, cap: 'כפות הידיים אליך' }),
      F(pullMid, { props: B16 + arrow(100, 70, 100, 34), cap: 'מושכים' }),
      F(pullTop, { props: B16, cap: 'סנטר מעל המוט' }),
    ],
    chinNeg: [
      F(pullTop, { props: B16 + '<path d="M30 70h30v22H30z"/>', cap: 'קופצים למעלה' }),
      F(pullMid, { props: B16 + arrow(100, 34, 100, 70), cap: 'יורדים 5 שניות' }),
      F(hang, { props: B16, cap: 'יישור מלא' }),
    ],
    dip: [
      F(dipTop, { props: DB, cap: 'תמיכה: ידיים ישרות' }),
      F(dipDn, { props: DB + arrow(98, 30, 98, 50), cap: 'יורדים עד 90 מעלות' }),
      F(dipTop, { props: DB + arrow(98, 50, 98, 30), cap: 'דוחפים חזרה' }),
    ],
    dipNeg: [
      F(dipTop, { props: DB, cap: 'מתחילים למעלה' }),
      F(dipDn, { props: DB + arrow(98, 30, 98, 50), cap: 'יורדים 4 שניות' }),
    ],
    dipPause: [
      F(dipDn, { props: DB + '<text x="90" y="30" class="tx">2 שנ׳</text>', cap: 'עוצרים למטה' }),
      F(dipTop, { props: DB + arrow(98, 50, 98, 30), cap: 'דוחפים' }),
    ],
    pushup: [
      F(pushUp, { props: grd, cap: 'גוף ישר, ידיים ישרות' }),
      F(pushDn, { props: grd + arrow(100, 70, 100, 84), cap: 'חזה כמעט לרצפה' }),
      F({ ...pushUp, p: [58, 87], bad: true }, { props: grd, cap: 'טעות: אגן שוקע' }),
    ],
    diamond: [
      F(pushUp, { props: grd, cap: 'למעלה' }),
      F(pushDn, { props: grd, cap: 'למטה' }),
      { raw: '<path class="fg-b" d="M60 34L76 52L60 70L44 52Z"/><circle class="fg-h" cx="50" cy="38" r="6"/><circle class="fg-h" cx="70" cy="38" r="6"/>', cap: 'מלמעלה: אצבעות ואגודלים נוגעים' },
    ],
    pushFeetUp: [
      F({ w: [86, 90], n: [84, 66], p: [54, 64], f: [24, 66], vb: VBP }, { props: grd + bench(8, 30, 70), cap: 'רגליים על ספסל' }),
      F({ w: [86, 90], n: [82, 80], p: [52, 72], f: [24, 66], vb: VBP }, { props: grd + bench(8, 30, 70), cap: 'יורדים לרצפה' }),
    ],
    archerPush: [
      { raw: '<path class="fg-b" d="M60 24V84M36 40H84M36 40L10 40M84 40L96 56L84 62"/><circle class="fg-h" cx="60" cy="16" r="6"/>', cap: 'מלמעלה: יד אחת ישרה לצד' },
      { raw: '<path class="fg-b" d="M72 24L62 84M48 40H92M48 40L12 40M92 40L100 56L90 62"/><circle class="fg-h" cx="74" cy="16" r="6"/>', cap: 'נשענים לצד היד המכופפת' },
    ],
    pseudo: [
      F({ w: [64, 90], n: [88, 64], p: [58, 74], f: [26, 88], vb: VBP }, { props: grd, cap: 'ידיים ליד המותניים' }),
      F({ w: [64, 90], n: [86, 78], p: [56, 82], f: [26, 89], vb: VBP }, { props: grd, cap: 'יורדים קדימה על הכתפיים' }),
    ],
    squat: [
      F(stand, { props: grd, cap: 'עומדים' }),
      F(sqDown, { props: grd + arrow(100, 40, 100, 66), cap: 'יורדים עד ירך מקבילה' }),
      F({ ...sqDown, n: [44, 56], bad: true }, { props: grd, cap: 'טעות: גב מעוגל' }),
    ],
    jumpSquat: [
      F(sqDown, { props: grd, cap: 'כפיפה' }),
      F({ n: [60, 22], p: [60, 46], f: [60, 80], w: [62, 0] }, { props: grd + arrow(96, 70, 96, 40), cap: 'קפיצה, ידיים למעלה' }),
      F(sqDown, { props: grd, cap: 'נחיתה רכה' }),
    ],
    bulgarian: [
      F({ n: [56, 34], p: [56, 58], f: [66, 91], f2: [24, 70], kb2: -1, w: [60, 52] }, { props: grd + bench(6, 28, 72), cap: 'רגל אחורית על ספסל' }),
      F({ n: [52, 46], p: [48, 70], f: [66, 91], f2: [24, 70], kb2: -1, w: [60, 52] }, { props: grd + bench(6, 28, 72) + arrow(100, 50, 100, 72), cap: 'יורדים, ברך אחורית לרצפה' }),
    ],
    shrimp: [
      F({ n: [52, 36], p: [52, 60], f: [56, 91], f2: [30, 62], kb2: -1, w: [34, 60] }, { props: grd, cap: 'אוחזים את כף הרגל מאחור' }),
      F({ n: [50, 52], p: [46, 74], f: [56, 91], f2: [28, 76], kb2: -1, w: [30, 74] }, { props: grd, cap: 'יורדים עד שהברך נוגעת' }),
    ],
    pistolAssist: [
      F({ n: [50, 34], p: [50, 58], f: [50, 91], f2: [84, 58], w: [82, 44] }, { props: grd + '<path class="t" d="M84 20V92"/>', cap: 'מחזיקים מוט לאיזון' }),
      F({ n: [52, 56], p: [36, 78], f: [50, 91], f2: [70, 78], w: [82, 60] }, { props: grd + '<path class="t" d="M84 20V92"/>', cap: 'יורדים על רגל אחת' }),
    ],
    pistol: [
      F({ n: [50, 34], p: [50, 58], f: [50, 91], f2: [84, 58], w: [76, 40] }, { props: grd, cap: 'רגל אחת, השנייה ישרה קדימה' }),
      F({ n: [52, 56], p: [36, 78], f: [50, 91], f2: [70, 78], w: [78, 62] }, { props: grd + arrow(100, 50, 100, 74), cap: 'יורדים עד הסוף' }),
    ],
    lunge: [
      F({ n: [52, 34], p: [52, 58], f: [66, 91], f2: [40, 91], w: [56, 52] }, { props: grd, cap: 'עומדים' }),
      F({ n: [52, 46], p: [52, 74], f: [70, 91], f2: [26, 88], kb2: -1, w: [58, 60] }, { props: grd + arrow(100, 50, 100, 74), cap: 'צעד ארוך, ברך אחורית כמעט לרצפה' }),
    ],
    jumpLunge: [
      F({ n: [52, 46], p: [52, 74], f: [70, 91], f2: [26, 88], kb2: -1, w: [58, 60] }, { props: grd, cap: 'למטה' }),
      F({ n: [56, 20], p: [56, 44], f: [72, 70], f2: [38, 68], w: [74, 28] }, { props: grd + arrow(100, 70, 100, 36), cap: 'קפיצה והחלפת רגליים באוויר' }),
    ],
    cossack: [
      { raw: '<path class="fg-b" d="M60 34V58M48 34H72M60 58L34 72L28 91M60 58L96 91M48 34L54 46L62 44"/><circle class="fg-h" cx="60" cy="24" r="6.5"/>', props: grd, cap: 'יורדים לצד אחד, הרגל השנייה ישרה' },
      { raw: '<path class="fg-b" d="M60 34V58M48 34H72M60 58L86 72L92 91M60 58L24 91M48 34L54 46L62 44"/><circle class="fg-h" cx="60" cy="24" r="6.5"/>', props: grd, cap: 'עוברים לצד השני' },
    ],
    bridge: [
      F({ n: [22, 88], p: [52, 88], f: [66, 91], f2: [70, 58], w: [40, 90], vb: '0 36 84 70' }, { props: grd, cap: 'שוכבים, רגל אחת באוויר' }),
      F({ n: [30, 86], p: [50, 70], f: [62, 91], f2: [78, 48], w: [44, 90], vb: '0 36 84 70' }, { props: grd + arrow(98, 80, 98, 56), cap: 'דוחפים דרך העקב, ישבן למעלה' }),
    ],
    kneeRaise: [
      F({ w: [64, 12], n: [63, 36], p: [61, 60], f: [60, 94] }, { props: bar(12), cap: 'תלייה ישרה' }),
      F({ w: [64, 12], n: [60, 36], p: [58, 60], f: [68, 78] }, { props: bar(12) + arrow(100, 80, 100, 56), cap: 'מגלגלים אגן, ברכיים לחזה' }),
    ],
    legRaise: [
      F({ w: [64, 12], n: [63, 36], p: [61, 60], f: [60, 94] }, { props: bar(12), cap: 'תלייה ישרה' }),
      F({ w: [64, 12], n: [60, 36], p: [58, 60], f: [92, 60] }, { props: bar(12) + arrow(100, 82, 100, 62), cap: 'רגליים ישרות עד 90 מעלות' }),
    ],
    t2b: [
      F({ w: [64, 12], n: [63, 36], p: [61, 60], f: [60, 94] }, { props: bar(12), cap: 'תלייה' }),
      F({ w: [56, 12], n: [50, 24], p: [54, 48], f: [66, 18] }, { props: bar(12), cap: 'כפות הרגליים למוט' }),
    ],
    wipers: [
      { raw: '<path class="fg-b" d="M52 12L50 38M68 12L70 38M50 38H70M60 38V66M60 66L24 58"/><circle class="fg-h" cx="60" cy="28" r="6.5"/>', props: bar(12, 20, 100), cap: 'רגליים לצד אחד' },
      { raw: '<path class="fg-b" d="M52 12L50 38M68 12L70 38M50 38H70M60 38V66M62 66L62 36"/><circle class="fg-h" cx="60" cy="28" r="6.5"/>', props: bar(12, 20, 100), cap: 'למעלה במרכז' },
      { raw: '<path class="fg-b" d="M52 12L50 38M68 12L70 38M50 38H70M60 38V66M60 66L96 58"/><circle class="fg-h" cx="60" cy="28" r="6.5"/>', props: bar(12, 20, 100), cap: 'לצד השני' },
    ],
    plank: [
      F({ n: [68, 76], e: [68, 90], w: [82, 90], p: [42, 82], f: [10, 90], vb: '2 40 84 70' }, { props: grd, cap: 'מרפקים מתחת לכתפיים, גוף ישר' }),
      F({ n: [68, 76], e: [68, 90], w: [82, 90], p: [42, 89], f: [10, 91], bad: true, vb: '2 40 84 70' }, { props: grd, cap: 'טעות: הגב שוקע' }),
    ],
    hollow: [
      F({ n: [34, 88], p: [58, 89], f: [92, 90], w: [10, 89], vb: '0 30 96 80' }, { props: grd, cap: 'שוכבים, גב תחתון לרצפה' }),
      F({ n: [34, 80], p: [58, 88], f: [92, 78], w: [10, 76], vb: '0 30 96 80' }, { props: grd, cap: 'מרימים כתפיים ורגליים' }),
    ],
    lsitTuck: [
      F({ w: [60, 62], n: [60, 38], p: [56, 62], f: [66, 76] }, { props: bar(62, 44, 76) + posts(62, 46, 74), cap: 'ברכיים לחזה' }),
    ],
    lsit: [
      F({ w: [60, 62], n: [60, 38], p: [56, 60], f: [90, 60] }, { props: bar(62, 44, 76) + posts(62, 46, 74), cap: 'רגליים ישרות קדימה' }),
    ],
    mountain: [
      F({ n: [84, 64], w: [84, 90], p: [56, 74], f: [74, 82], f2: [26, 89], vb: VBP }, { props: grd, cap: 'ברך אחת לחזה' }),
      F({ n: [84, 64], w: [84, 90], p: [56, 74], f: [26, 89], f2: [74, 82], vb: VBP }, { props: grd, cap: 'מחליפים מהר' }),
    ],
    burpee: [
      F({ n: [64, 64], p: [44, 76], w: [74, 88], f: [56, 91] }, { props: grd, cap: 'כפיפה, ידיים לרצפה' }),
      F(pushDn, { props: grd, cap: 'קפיצה אחורה, שכיבה' }),
      F({ n: [60, 22], p: [60, 46], f: [60, 80], w: [62, 0] }, { props: grd, cap: 'קפיצה למעלה' }),
    ],
    wallsit: [
      F({ n: [32, 50], p: [33, 74], f: [52, 91], w: [50, 72] }, { props: grd + wall(24), cap: 'גב על הקיר, ברכיים 90 מעלות' }),
    ],
    hangPassive: [
      F({ ...hang, f: [58, 90] }, { props: B16, cap: 'תלייה רפויה, ידיים ישרות' }),
    ],
    scap: [
      F({ w: [64, 14], n: [63, 35], p: [61, 59], f: [52, 83] }, { props: bar(14), cap: 'כתפיים רפויות' }),
      F({ w: [64, 14], n: [63, 38], p: [61, 62], f: [52, 86] }, { props: bar(14) + arrow(96, 32, 96, 44), cap: 'מורידים כתפיים, ידיים ישרות' }),
    ],
    dipShrug: [
      F({ w: [62, 46], n: [62, 28], p: [57, 52], f: [47, 76] }, { props: DB, cap: 'כתפיים למעלה' }),
      F({ w: [62, 46], n: [62, 22], p: [57, 46], f: [47, 72] }, { props: DB + arrow(98, 36, 98, 24), cap: 'דוחפים את הכתפיים למטה' }),
    ],
    armCircles: [
      F({ n: [60, 34], p: [60, 58], f: [60, 91], w: [84, 34] }, { props: grd, cap: 'קדימה' }),
      F({ n: [60, 34], p: [60, 58], f: [60, 91], w: [62, 10] }, { props: grd, cap: 'למעלה' }),
      F({ n: [60, 34], p: [60, 58], f: [60, 91], w: [38, 44] }, { props: grd, cap: 'אחורה' }),
    ],
    goblet: [
      F({ n: [60, 34], p: [60, 58], f: [60, 91], w: [68, 46] }, { props: grd + dbx(68, 44), cap: 'משקולת צמודה לחזה' }),
      F({ n: [54, 51], p: [40, 74], f: [60, 91], w: [66, 62] }, { props: grd + dbx(68, 58) + arrow(100, 40, 100, 66), cap: 'יורדים עמוק' }),
    ],
    dbRow: [
      F({ n: [64, 42], p: [42, 56], f: [44, 91], w: [64, 66], w2: [80, 60] }, { props: grd + bench(70, 96, 60) + db(64, 68), cap: 'גב ישר, משקולת למטה' }),
      F({ n: [64, 42], p: [42, 56], f: [44, 91], w: [52, 54], w2: [80, 60] }, { props: grd + bench(70, 96, 60) + db(52, 58) + arrow(60, 74, 52, 62), cap: 'מושכים מרפק לכיוון המותן' }),
    ],
    dbPress: [
      F({ n: [60, 34], p: [60, 58], f: [60, 91], w: [62, 24] }, { props: grd + db(62, 22), cap: 'משקולות בגובה הכתפיים' }),
      F({ n: [60, 34], p: [60, 58], f: [60, 91], w: [62, 10] }, { props: grd + db(62, 9) + arrow(96, 36, 96, 14), cap: 'דוחפים עד יישור' }),
    ],
    dbCurl: [
      F({ n: [60, 34], p: [60, 58], f: [60, 91], e: [58, 46], w: [61, 58] }, { props: grd + dbx(61, 60), cap: 'מרפק צמוד לגוף' }),
      F({ n: [60, 34], p: [60, 58], f: [60, 91], e: [58, 46], w: [67, 36] }, { props: grd + dbx(68, 34), cap: 'מכופפים, בלי לנדנד' }),
    ],
    rdl: [
      F({ n: [60, 34], p: [58, 58], f: [58, 91], w: [60, 58] }, { props: grd + dbx(61, 60), cap: 'עומדים עם משקולות' }),
      F({ n: [62, 46], p: [38, 54], f: [42, 89], w: [64, 70] }, { props: grd + dbx(65, 72) + arrow(96, 46, 96, 64), cap: 'דוחפים אגן אחורה, גב ישר' }),
    ],
    muscleup: [
      F({ w: [64, 50], n: [60, 52], p: [56, 76], f: [48, 90] }, { props: bar(50) + '', cap: 'מושכים חזק, חזה למוט' }),
      F({ w: [64, 50], e: [54, 38], n: [66, 38], p: [54, 60], f: [46, 82] }, { props: bar(50), cap: 'מעבר: מרפקים מעל המוט' }),
      F({ w: [64, 50], n: [62, 26], p: [58, 50], f: [50, 74] }, { props: bar(50), cap: 'תמיכה מעל המוט' }),
    ],
    handstand: [
      F({ w: [38, 91], n: [52, 68], p: [66, 48], f: [91, 28] }, { props: grd + wall(94), cap: 'הליכה על הקיר' }),
      F({ w: [52, 91], n: [52, 67], p: [53, 43], f: [55, 9] }, { props: grd + wall(68), cap: 'עמידה: גוף ישר' }),
    ],
    frontlever: [
      F({ w: [52, 14], n: [51, 38], p: [75, 42], f: [62, 58] }, { props: bar(14, 28, 80), cap: 'Tuck: ברכיים לחזה' }),
      F({ w: [52, 14], n: [51, 38], p: [75, 40], f: [109, 40] }, { props: bar(14, 28, 80), cap: 'גוף ישר ואופקי' }),
    ],
  };
  FIGS.chinSlow = FIGS.chin;
  FIGS.dipExp = FIGS.dip;
  FIGS.easyPush = FIGS.pushup;
  FIGS.slowSquat = FIGS.squat;

  function frames(key) { return FIGS[key] || []; }
  const good = key => frames(key).filter(f => !f.bad);
  const strip = (key, cls = '') => `<div class="fgs ${cls}">${frames(key).map(f => `<figure class="fgf">${figure(f, HL[key])}${f.cap ? `<figcaption>${f.cap}</figcaption>` : ''}</figure>`).join('')}</div>`;
  // אנימציה: מקום שה-FG.kick ממלא ומזיז
  const anim = (key, cls = '') => frames(key).length ? `<div class="fg-anim ${cls}" data-k="${key}">${figure(frames(key)[0], HL[key])}</div>` : '';
  const mini = key => anim(key, 'mini');

  // ---- אנימציה בין פריימים (שיכון בין מפרקים) ----
  const JK = ['n', 'p', 'w', 'f', 'e', 'w2', 'f2', 'e2', 'hd'];
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  function mix(a, b, t) {
    const o = Object.assign({}, t < .5 ? a : b, { cap: '' });
    for (const k of JK) { const x = a[k] || b[k], y = b[k] || a[k]; if (x && y) o[k] = lerp(x, y, t); else delete o[k]; }
    o.vb = a.vb || b.vb; o.bad = false;
    return o;
  }
  const HOLD = 450, MOVE = 1100;
  function frameAt(key, ms) {
    const fr = good(key); if (fr.length < 2) return fr[0] || frames(key)[0];
    const order = []; for (let i = 0; i < fr.length; i++) order.push(i); for (let i = fr.length - 2; i > 0; i--) order.push(i);
    const slot = HOLD + MOVE, cyc = slot * order.length, t = ms % cyc, si = Math.floor(t / slot), r = t - si * slot;
    const a = fr[order[si]], b = fr[order[(si + 1) % order.length]];
    if (r < HOLD) return a;
    if (a.raw || b.raw) return (r - HOLD) / MOVE < .5 ? a : b;
    return mix(a, b, ease((r - HOLD) / MOVE));
  }
  let raf = 0, last = 0, t0 = 0;
  function loop(now) {
    raf = 0;
    const els = document.querySelectorAll('.fg-anim, .myp-anim');
    if (!els.length) return;
    if (!t0) t0 = now;
    if (now - last > 40) {
      last = now;
      els.forEach(el => {
        if (!el.offsetParent) return;
        if (el.classList.contains('myp-anim')) {
          const imgs = el.querySelectorAll('img'); if (imgs.length < 2) return;
          const order = []; for (let i = 0; i < imgs.length; i++) order.push(i); for (let i = imgs.length - 2; i > 0; i--) order.push(i);
          const cur = order[Math.floor((now - t0) / 1100) % order.length];
          imgs.forEach((im, i) => im.classList.toggle('on', i === cur));
          return;
        }
        el.innerHTML = figure(frameAt(el.dataset.k, now - t0), HL[el.dataset.k]);
      });
    }
    raf = requestAnimationFrame(loop);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
  const keys = () => Object.keys(FIGS);
  return { strip, mini, anim, kick, keys, figure, frames, good, HL, };
})();
