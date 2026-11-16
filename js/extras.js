'use strict';
// ============================================================
//  הסברים ואיורים, מה נשאר, תוספות לאימון, מוזיקה, מראה בהיר/כהה, מדע
// ============================================================

// ---------- מראה בהיר / כהה ----------
function resolvedTheme() {
  const t = S.theme || 'auto';
  if (t === 'auto') return window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  return t;
}
function applyTheme() {
  const r = resolvedTheme();
  document.documentElement.dataset.theme = r;
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = r === 'light' ? '#f4f5f8' : '#0f1115';
  const b = document.getElementById('theme-btn'); if (b) b.innerHTML = ic(r === 'light' ? 'moon' : 'sun');
}
if (window.matchMedia) matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if ((S.theme || 'auto') === 'auto') applyTheme(); });

// ---------- משפט מוטיבציה ממחקר ----------
function quoteHtml(end) {
  const w = S.current; if (!w || !w.flow) return '';
  const r = w.pos / Math.max(1, w.flow.length - 1);
  const pool = end || r >= 0.65 ? QUOTES_END : QUOTES_MID;
  const q = pool[(w.pos * 5 + (w.started % 11)) % pool.length];
  return `<div class="fx-quote"><span class="q-t">${ic('info')} ${r >= 0.65 || end ? 'כמעט שם' : 'מחקר קטן'}</span><p>${q[0]}</p><cite>${q[1]}</cite></div>`;
}

// ---------- הסבר לצעד הנוכחי ----------
function stepGuide(st) {
  const w = S.current; if (!st) return { keys: [] };
  const uniq = a => [...new Set(a.filter(k => k && GUIDES[k]))];
  if (st.k === 'warm') return { keys: uniq([WARM_G[st.i]]), ctx: CTX.warm, title: 'חימום' };
  if (st.k === 'set') {
    const b = w.blocks[st.b], e = b.ex[st.e];
    const pair = b.extra ? 'extra' : b.ex.map(x => x.track).join('+');
    const u = e.unit === 'sec' ? 'שניות' : 'חזרות';
    return { keys: uniq([e.gk || guideKey(e.v)]), ctx: CTX[pair] || '', dose: DOSE[e.track] || '', title: exLabel(e),
      facts: `${e.target.length} סטים × ${e.target[0]} ${u}${b.rest ? ` · מנוחה ${b.rest} שניות בין סבבים` : ''}${e.kg ? ` · משקל נוסף ${e.kg} ק״ג` : ''}` };
  }
  if (st.k === 'skill') { const b = w.blocks[st.b]; return { keys: uniq([SKILL_G[b.skill]]), ctx: CTX.skill, title: 'סקיל: ' + SKILLS[b.skill].name }; }
  if (st.k === 'emom') return { keys: uniq(w.blocks[st.b].stations.map(s => guideKey(s.name))), ctx: CTX.emom, title: 'תחנות ה-EMOM' };
  if (st.k === 'fin') return { keys: uniq([FIN_G[w.finisher.id]]), ctx: CTX.fin, title: w.finisher.name };
  if (st.k === 'test') return { keys: uniq([{ pull: 'pull', dip: 'dip', push: 'pushup' }[st.key]]), ctx: 'מבחן מקסימום כל 9 אימונים: מטרה ברורה ומשוב מובילים לשיפור ביצועים. סט אחד, רק חזרות נקיות.', title: 'מבחן' };
  return { keys: [] };
}

const guideEl = () => document.getElementById('guide');
const MYP = {}, MYMODE = {};
const animWrap = k => {
  const imgs = (MYP[k] || []).filter(Boolean);
  return MYMODE[k] === 'me' && imgs.length >= 2 ? `<div class="myp-anim" data-k="${k}">${imgs.map(u => `<img src="${u}" alt="">`).join('')}</div>` : FG.anim(k);
};
function mypHtml(k) {
  const fr = FG.good(k), arr = MYP[k] || [], n = arr.filter(Boolean).length;
  return `<div class="myp" data-k="${k}"><h4>${ic('camera')} התמונות שלי</h4>
    <p class="small muted">צלם את עצמך בכל שלב של התרגיל. התמונות נשמרות רק בטלפון.</p>
    <div class="myp-row">${fr.map((f, i) => arr[i]
      ? `<div class="myp-slot"><img src="${arr[i]}" alt=""><button class="x" data-a="myp-del" data-k="${k}" data-i="${i}" aria-label="מחק">${ic('x')}</button><div>${f.cap || ''}</div></div>`
      : `<div class="myp-slot"><button class="ph" data-a="myp-add" data-k="${k}" data-i="${i}">${ic('plus')}</button><div>${f.cap || ''}</div></div>`).join('')}</div>
    ${n >= 2 ? `<div class="seg"><button class="${MYMODE[k] !== 'me' ? 'on' : ''}" data-a="myp-mode" data-k="${k}" data-v="ill">איור</button><button class="${MYMODE[k] === 'me' ? 'on' : ''}" data-a="myp-mode" data-k="${k}" data-v="me">אנימציה מהתמונות שלי</button></div>` : ''}</div>`;
}
function refreshMyp(k) {
  document.querySelectorAll(`.anim-wrap[data-k="${k}"]`).forEach(el => { el.innerHTML = animWrap(k); });
  document.querySelectorAll(`.myp[data-k="${k}"]`).forEach(el => { el.outerHTML = mypHtml(k); });
  FG.kick();
}
function guideSection(k, open) {
  const g = GUIDES[k];
  return `<details class="gd" ${open ? 'open' : ''}><summary><b>${g.n}</b><small>${g.m}</small></summary>
    <div class="anim-wrap" data-k="${g.fig}">${animWrap(g.fig)}</div>
    ${FG.strip(g.fig)}
    <h4>איך מבצעים</h4><ol>${g.steps.map(x => `<li>${x}</li>`).join('')}</ol>
    <h4>טעויות נפוצות</h4><ul class="bad">${g.bad.map(x => `<li>${x}</li>`).join('')}</ul>
    <div class="gd-lvl"><div><small>קשה מדי?</small>${g.easy}</div><div><small>קל מדי?</small>${g.hard}</div></div>
    ${mypHtml(g.fig)}
    <div class="why"><h4>${ic('book')} למה התרגיל הזה, לפי מחקר</h4><p>${g.why[0]}</p><cite>${g.why[1]}</cite></div></details>`;
}
function openGuide(info) {
  if (!info || !info.keys.length) { toast('אין הסבר לשלב הזה'); return; }
  const ctx = (info.facts || info.ctx || info.dose) ? `<div class="why ctx"><h4>${ic('book')} למה כאן, ככה ובזמן הזה</h4>
    ${info.facts ? `<p><b>${info.facts}</b></p>` : ''}${info.ctx ? `<p>${info.ctx}</p>` : ''}${info.dose ? `<p>${info.dose}</p>` : ''}
    <button class="link" data-a="science">כל המדע שמאחורי התוכנית</button></div>` : '';
  const el = guideEl();
  el.innerHTML = `<div class="gd-box"><div class="gd-top"><b>${info.title || GUIDES[info.keys[0]].n}</b>
    <button class="fx-ic" data-a="guide-close" aria-label="סגור">${ic('x')}</button></div>
    <div class="gd-scroll">${info.keys.map((k, i) => guideSection(k, i === 0 || info.keys.length === 1)).join('')}${ctx}</div></div>`;
  el.classList.add('open');
  FG.kick();
}
function closeGuide() { guideEl().classList.remove('open'); }

// ---------- כמה זמן נשאר ----------
function stepSecs(st, w) {
  if (st.k === 'warm') return WARMUP[st.i].sec;
  if (st.k === 'set') { const e = w.blocks[st.b].ex[st.e], t = e.target[st.s]; return e.unit === 'sec' ? 5 + t : 8 + t * 3; }
  if (st.k === 'skill') return (w.blocks[st.b].minutes || 6) * 60;
  if (st.k === 'emom') return (w.blocks[st.b].minutes || 16) * 60 + 5;
  if (st.k === 'fin') return 150;
  if (st.k === 'test') return 60;
  return 0;
}
function remainSecs(now) {
  const w = S.current; if (!w || !w.flow) return 0;
  let t = 0;
  for (let i = w.pos; i < w.flow.length; i++) {
    const st = w.flow[i]; if (st.k === 'end') break;
    let s = stepSecs(st, w);
    if (i === w.pos && w.phase === 'rest') t += Math.max(0, (w.restEnd - now) / 1000);
    else if (i === w.pos) {
      if (st.k === 'warm') s = Math.max(0, (w.t0 + WARMUP[st.i].sec * 1000 - now) / 1000);
      else if (st.k === 'skill') s = Math.max(0, (w.t0 + s * 1000 - now) / 1000);
      else if (st.k === 'emom') { const b = w.blocks[st.b]; if (b.startAt) s = Math.max(0, (b.startAt + b.minutes * 60000 - now) / 1000); }
      else if (st.k === 'set' && isHold(st)) s = Math.max(0, (w.t0 + w.blocks[st.b].ex[st.e].target[st.s] * 1000 - now) / 1000);
    }
    t += s + (st.after || 0);
  }
  return t;
}
function remainTxt(now) {
  const m = Math.round(remainSecs(now) / 60);
  return m <= 0 ? 'כמעט סיימת' : `נותרו כ-${m} דק׳`;
}
function remainHtml() {
  const w = S.current, now = Date.now();
  const rows = []; let left = 0, doneN = 0;
  w.flow.forEach((st, i) => { if (st.k === 'end') return; if (i < w.pos) doneN++; else { left++; rows.push([i, st]); } });
  const mins = Math.round(remainSecs(now) / 60);
  const total = doneN + left;
  const list = rows.map(([i, st]) => {
    const L = stepLabel(st), cur = i === w.pos;
    return `<div class="rm-row ${cur ? 'cur' : ''}"><span>${cur ? (w.phase === 'rest' ? 'הבא' : 'עכשיו') : ''}</span><b>${L.title}</b><small>${mmss(Math.round(stepSecs(st, w)))}</small></div>`;
  }).join('');
  const st = fxStep(), onSet = st && st.k === 'set';
  const e = onSet ? fxEx(st) : null;
  return `<h2>${ic('timer')} מה נשאר</h2>
    <div class="kpis"><div><b>${mins <= 0 ? '<1' : 'כ-' + mins}</b><small>דקות</small></div><div><b>${left}</b><small>צעדים נשארו</small></div><div><b>${doneN}/${total}</b><small>הושלמו</small></div></div>
    <div class="rm-list">${list || '<p class="muted">נשאר רק לסכם.</p>'}</div>
    ${w.type !== 'BOSS' ? `<button class="ghost" data-a="extra-open">${ic('plus')} הוסף תרגיל להיום</button>` : ''}
    ${e ? `<div class="kg-box"><span>משקל נוסף על ${e.v}</span><div class="fx-stepper mini"><button data-a="kg-step" data-d="-1">${ic('minus')}</button><b>${e.kg || 0}</b><button data-a="kg-step" data-d="1">${ic('plus')}</button></div><small class="muted">ק״ג (תיק, וסט או משקולת)</small></div>` : ''}
    <button class="cta" data-a="close">חזרה לאימון</button>`;
}

// ---------- תוספות ----------
const EXU = { eq: 'all', item: null, s: 3, r: 10, kg: 0, where: 'next', rest: 60 };
function extraHtml() {
  const w = S.current, st = fxStep();
  if (!EXU.item) {
    const chips = Object.entries(EXTRA_EQ).map(([k, n]) => `<button class="${EXU.eq === k ? 'on' : ''}" data-a="extra-eq" data-v="${k}">${n}</button>`).join('');
    const groups = {};
    EXTRAS.forEach((x, i) => { if (EXU.eq === 'all' || x.eq === EXU.eq) (groups[x.grp] = groups[x.grp] || []).push([x, i]); });
    const list = Object.entries(groups).map(([g, a]) => `<h4>${g}</h4><div class="ex-grid">${a.map(([x, i]) => `<button data-a="extra-pick" data-i="${i}">${x.n}</button>`).join('')}</div>`).join('');
    return `<h2>${ic('plus')} מה בא לך להוסיף היום?</h2><p class="muted small">בחר מה יש לך עכשיו, ואז תרגיל. אפשר גם משהו משלך.</p>
      <div class="seg wrap">${chips}</div>${list}
      <div class="inline" style="margin-top:12px"><input id="ex-custom" type="text" placeholder="משהו אחר, למשל: דיפס עם משקל" style="width:100%;text-align:start;font-size:16px;font-weight:500"><button class="ghost" data-a="extra-custom">הוסף</button></div>
      <button class="link" data-a="close">ביטול</button>`;
  }
  const it = EXU.item, sec = it.unit === 'sec';
  const row = (f, name, val, unit) => `<div class="cfg-row"><span>${name}</span><div class="fx-stepper mini"><button data-a="extra-step" data-f="${f}" data-d="-1">${ic('minus')}</button><b>${val}</b><button data-a="extra-step" data-f="${f}" data-d="1">${ic('plus')}</button></div><small class="muted">${unit}</small></div>`;
  const where = [['next', 'אחרי הסט הנוכחי'], ['end', 'בסוף, לפני הפיניש']].map(([k, n]) => `<button class="${EXU.where === k ? 'on' : ''}" data-a="extra-where" data-v="${k}">${n}</button>`).join('');
  return `<h2>${it.n}</h2>
    ${row('s', 'סטים', EXU.s, '')}${row('r', sec ? 'שניות' : 'חזרות', EXU.r, sec ? 'שנ׳' : '')}${row('kg', 'משקל נוסף', EXU.kg, 'ק״ג')}
    <div class="cfg-row"><span>מתי</span><div class="seg wrap">${where}</div></div>
    ${guideKey(it.n) ? `<button class="ghost" data-a="extra-guide">${ic('help')} איך עושים · איור</button>` : ''}
    <button class="cta" data-a="extra-add">${ic('check')} הוסף לאימון</button>
    <button class="link" data-a="extra-back">חזרה לרשימה</button>`;
}
function addExtra() {
  const w = S.current, it = EXU.item;
  if (!w || !w.flow) return;
  if (w.type === 'BOSS') { toast('בקרב בוס אי אפשר להוסיף תרגילים'); return; }
  if (fxStep().k === 'end') { toast('האימון כבר הסתיים'); return; }
  const gk = guideKey(it.n), g = GUIDES[gk];
  const grp = { 'דחיפה': 'push', 'משיכה': 'pull', 'רגליים': 'legs' }[it.grp];
  const kg = EXU.kg || 0;
  w.blocks.push({ type: 'superset', extra: true, title: 'תוספת', rest: kg > 0 || it.eq === 'db' ? 90 : 60, ex: [{
    track: null, group: grp, gk, v: it.n, cue: g ? g.steps[0] : 'בצע בטכניקה נקייה, לא עד כישלון.', unit: it.unit || 'reps', kg,
    target: Array(EXU.s).fill(EXU.r), done: Array(EXU.s).fill(null), log: Array(EXU.s).fill(EXU.r) }] });
  const bi = w.blocks.length - 1, steps = Array.from({ length: EXU.s }, (_, s) => ({ k: 'set', b: bi, e: 0, s }));
  let idx;
  const fin = w.flow.findIndex((x, i) => i >= w.pos && (x.k === 'fin' || x.k === 'end'));
  if (EXU.where === 'end' || w.list) idx = fin < 0 ? w.flow.length - 1 : fin;
  else idx = w.phase === 'rest' ? w.pos : w.pos + 1;
  const lastWarm = w.flow.reduce((a, x, i) => x.k === 'warm' ? i : a, -1);
  if (idx <= lastWarm) idx = lastWarm + 1;
  w.flow.splice(idx, 0, ...steps);
  fxRests(w.flow, w); save(); closeModal(); render(); toast(`${ic('check-circle')} נוסף: ${it.n}`);
}

// ---------- מוזיקה (Spotify / Apple Music) ----------
const MKEY = 'pt_music';
const musicSaved = () => { try { return JSON.parse(localStorage.getItem(MKEY)) || null; } catch (e) { return null; } };
function parseMusic(u) {
  u = (u || '').trim(); let m;
  if ((m = u.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(playlist|album|track|artist|show|episode)\/([A-Za-z0-9]+)/)) || (m = u.match(/spotify:(playlist|album|track|artist|show|episode):([A-Za-z0-9]+)/)))
    return { kind: 'Spotify', embed: `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator`, open: `https://open.spotify.com/${m[1]}/${m[2]}`, h: m[1] === 'track' || m[1] === 'episode' ? 152 : 352 };
  if (/^https:\/\/music\.apple\.com\//.test(u)) {
    try { const x = new URL(u); return { kind: 'Apple Music', embed: 'https://embed.music.apple.com' + x.pathname + x.search, open: u, h: 450 }; } catch (e) {}
  }
  return null;
}
function ensureMusic() {
  const el = document.getElementById('music');
  if (el.dataset.ready) return el;
  el.dataset.ready = 1;
  el.innerHTML = `<div class="mu-box"><div class="gd-top"><b>${ic('music')} מוזיקה</b><button class="fx-ic" data-a="music-close" aria-label="סגור">${ic('x')}</button></div>
    <div class="gd-scroll"><div id="mu-frame"></div>
    <p class="small muted">הדבק קישור לפלייליסט, אלבום או שיר מ-Spotify או מ-Apple Music. הוא יישמר, והנגן ימשיך להתנגן גם כשסוגרים את החלון.</p>
    <div class="inline"><input id="mu-in" type="text" inputmode="url" placeholder="https://open.spotify.com/playlist/..." style="text-align:left;font-size:16px;font-weight:500;width:100%"><button class="ghost" data-a="music-set">נגן</button></div>
    <div class="mu-links"><a href="https://open.spotify.com" target="_blank" rel="noopener">פתח Spotify</a><a href="https://music.apple.com" target="_blank" rel="noopener">פתח Apple Music</a></div>
    <p class="small muted">ההשמעה המלאה דורשת להתחבר לחשבון בתוך הנגן עצמו. בלי התחברות מתנגנות דוגמיות קצרות. בטלפון אפשר גם להפעיל מוזיקה באפליקציה ולחזור לכאן.</p>
    <button class="link danger" data-a="music-clear">הסר את הנגן</button></div></div>`;
  const sv = musicSaved(); if (sv) loadMusic(sv);
  return el;
}
function loadMusic(m) {
  const box = document.getElementById('mu-frame');
  box.innerHTML = `<iframe src="${m.embed}" height="${m.h}" allow="autoplay; encrypted-media; clipboard-write; fullscreen" loading="eager" title="${m.kind}"></iframe><a class="mu-open" href="${m.open}" target="_blank" rel="noopener">פתח באפליקציה של ${m.kind}</a>`;
}

// ---------- המדע שמאחורי התוכנית ----------
function scienceHtml() {
  return `<h2>${ic('book')} המדע שמאחורי התוכנית</h2><p class="muted small">סיכומים של מחקרים ומטא-אנליזות, בניסוח חופשי. לא ייעוץ רפואי. אם יש כאב, עוצרים ופונים לרופא.</p>
    ${PROGRAM_WHY.map(x => `<details class="gd"><summary><b>${x.t}</b></summary><p>${x.b}</p><cite>${x.s}</cite></details>`).join('')}
    <button class="cta" data-a="close">סגור</button>`;
}

// ---------- פעולות ----------
Object.assign(A, {
  'fx-guide'() { const w = S.current; if (!w || !w.flow) return; openGuide(stepGuide(fxStep())); },
  'guide-ex'(t) { const w = S.current, b = w.blocks[+t.dataset.b], e = b.ex[+t.dataset.e]; const k = e.gk || guideKey(e.v);
    openGuide({ keys: k && GUIDES[k] ? [k] : [], title: exLabel(e), ctx: CTX[b.extra ? 'extra' : b.ex.map(x => x.track).join('+')] || '', dose: DOSE[e.track] || '',
      facts: `${e.target.length} סטים × ${e.target[0]} ${e.unit === 'sec' ? 'שניות' : 'חזרות'} · מנוחה ${b.rest} שניות` }); },
  'guide-close'() { closeGuide(); },
  remain() { const w = S.current; if (!w || !w.flow) return; showModal(remainHtml()); },
  science() { closeGuide(); showModal(scienceHtml()); },
  'intro-sound'() { S.introSound = !S.introSound; save(); A.settings(); },
  'theme-toggle'() { S.theme = resolvedTheme() === 'light' ? 'dark' : 'light'; save(); applyTheme(); },
  'theme-set'(t) { S.theme = t.dataset.k; save(); applyTheme(); A.settings(); },
  'music-open'() { closeModal(); ensureMusic().classList.add('open'); },
  'music-close'() { document.getElementById('music').classList.remove('open'); },
  'music-set'() {
    const m = parseMusic(document.getElementById('mu-in').value);
    if (!m) { toast('הקישור לא מזוהה. אפשר Spotify (open.spotify.com) או Apple Music (music.apple.com)'); return; }
    localStorage.setItem(MKEY, JSON.stringify(m)); loadMusic(m); document.getElementById('mu-in').value = '';
  },
  'music-clear'() { localStorage.removeItem(MKEY); document.getElementById('mu-frame').innerHTML = ''; },
  'extra-open'() { if (!S.current || !S.current.flow) return; if (S.current.type === 'BOSS') { toast('בקרב בוס אי אפשר להוסיף תרגילים'); return; } EXU.item = null; showModal(extraHtml()); },
  'extra-eq'(t) { EXU.eq = t.dataset.v; showModal(extraHtml()); },
  'extra-pick'(t) { const it = EXTRAS[+t.dataset.i]; EXU.item = it; EXU.s = it.s; EXU.r = it.r; EXU.kg = it.kg || 0; showModal(extraHtml()); },
  'extra-custom'() {
    const n = (document.getElementById('ex-custom').value || '').trim(); if (!n) { toast('כתוב מה בא לך לעשות'); return; }
    EXU.item = { n, eq: 'none', grp: 'אחר', s: 3, r: 10 }; EXU.s = 3; EXU.r = 10; EXU.kg = 0; showModal(extraHtml());
  },
  'extra-step'(t) {
    const f = t.dataset.f, d = +t.dataset.d, sec = EXU.item.unit === 'sec';
    if (f === 's') EXU.s = Math.max(1, Math.min(8, EXU.s + d));
    if (f === 'r') EXU.r = Math.max(1, EXU.r + d * (sec ? 5 : 1));
    if (f === 'kg') EXU.kg = Math.max(0, Math.min(100, EXU.kg + d * 2.5));
    showModal(extraHtml());
  },
  'extra-where'(t) { EXU.where = t.dataset.v; showModal(extraHtml()); },
  'extra-back'() { EXU.item = null; showModal(extraHtml()); },
  'extra-guide'() { const k = guideKey(EXU.item.n); openGuide({ keys: k ? [k] : [], title: EXU.item.n }); },
  'extra-add'() { addExtra(); },
  'kg-step'(t) {
    const st = fxStep(); if (!st || st.k !== 'set') return;
    const e = fxEx(st); e.kg = Math.max(0, Math.min(100, (e.kg || 0) + 2.5 * +t.dataset.d)); save(); showModal(remainHtml()); renderFocus();
  },
});

// ---------- התמונות שלי: תמונת פנים על הדמות + תמונות לכל תרגיל (נשמרות רק במכשיר) ----------
FG.faceUrl = localStorage.getItem('pt_face') || null;
const exdb = {
  db: null,
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => { const r = indexedDB.open('trainer_ex', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('ex', { keyPath: 'id' });
      r.onsuccess = () => { this.db = r.result; res(r.result); }; r.onerror = () => rej(r.error); });
  },
  async all() { const db = await this.open(); return new Promise(res => { const o = []; db.transaction('ex').objectStore('ex').openCursor().onsuccess = ev => { const c = ev.target.result; if (c) { o.push(c.value); c.continue(); } else res(o); }; }); },
  async put(id, blob) { const db = await this.open(); return new Promise((res, rej) => { const tx = db.transaction('ex', 'readwrite'); tx.objectStore('ex').put({ id, blob }); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); },
  async del(id) { const db = await this.open(); return new Promise((res, rej) => { const tx = db.transaction('ex', 'readwrite'); tx.objectStore('ex').delete(id); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); },
};
async function loadMyp() {
  try { (await exdb.all()).forEach(r => { const [k, i] = r.id.split(':'); (MYP[k] = MYP[k] || [])[+i] = URL.createObjectURL(r.blob); }); } catch (e) {}
}
function cropFace(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => { const s = Math.min(img.width, img.height), c = document.createElement('canvas'); c.width = c.height = 144;
      c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) * 0.35, s, s, 0, 0, 144, 144); URL.revokeObjectURL(img.src); res(c.toDataURL('image/jpeg', 0.85)); };
    img.onerror = rej; img.src = URL.createObjectURL(file);
  });
}
const faceBox = () => `<div class="face-pick">${FG.faceUrl ? `<img src="${FG.faceUrl}" alt="">` : `<span class="ph">${ic('camera')}</span>`}
  <div class="grow"><b>התמונה שלי על הדמות</b><div class="small muted">הפנים שלך מופיעות בראש של כל האיורים. נשמר רק בטלפון.</div></div>
  <button class="ghost" data-a="face-add">${FG.faceUrl ? 'החלף' : 'הוסף'}</button>${FG.faceUrl ? `<button class="ghost" data-a="face-del" aria-label="הסר">${ic('x')}</button>` : ''}</div>`;
let mypPending = null;
const hiddenInput = id => { let i = document.getElementById(id); if (!i) { i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.id = id; i.hidden = true; document.body.appendChild(i); } return i; };
Object.assign(A, {
  'face-add'() { hiddenInput('face-in').click(); },
  'face-del'() { localStorage.removeItem('pt_face'); FG.faceUrl = null; setMeDirty('face', 'del'); A.settings(); if (S.current) renderFocus(); },
  'myp-add'(t) { mypPending = { k: t.dataset.k, i: +t.dataset.i }; hiddenInput('myp-in').click(); },
  async 'myp-del'(t) {
    const k = t.dataset.k, i = +t.dataset.i; if (!confirm('למחוק את התמונה?')) return;
    try { await exdb.del(`${k}:${i}`); } catch (e) {}
    setMeDirty(`${k}_${i}`, 'del');
    if (MYP[k] && MYP[k][i]) { URL.revokeObjectURL(MYP[k][i]); MYP[k][i] = null; }
    refreshMyp(k);
  },
  'myp-mode'(t) { MYMODE[t.dataset.k] = t.dataset.v; refreshMyp(t.dataset.k); },
});
document.addEventListener('change', async ev => {
  const f = ev.target.files && ev.target.files[0]; if (!f) return;
  if (ev.target.id === 'face-in') {
    try { FG.faceUrl = await cropFace(f); localStorage.setItem('pt_face', FG.faceUrl); setMeDirty('face', 1); A.settings(); if (S.current) renderFocus(); toast(`${ic('check-circle')} התמונה נשמרה`); }
    catch (e) { toast('לא הצלחתי לקרוא את התמונה'); }
    ev.target.value = '';
  }
  if (ev.target.id === 'myp-in' && mypPending) {
    const { k, i } = mypPending; mypPending = null;
    try {
      const blob = await compress(f); await exdb.put(`${k}:${i}`, blob); setMeDirty(`${k}_${i}`, 1);
      if (MYP[k] && MYP[k][i]) URL.revokeObjectURL(MYP[k][i]);
      (MYP[k] = MYP[k] || [])[i] = URL.createObjectURL(blob); refreshMyp(k); toast(`${ic('check-circle')} נשמר`);
    } catch (e) { toast('שמירת התמונה נכשלה'); }
    ev.target.value = '';
  }
});
// ---------- סנכרון התמונות שלי לריפו הפרטי (me/face.jpg ו-me/ex/*.jpg) ----------
const meDirty = () => { try { return JSON.parse(localStorage.getItem('pt_me_dirty')) || {}; } catch (e) { return {}; } };
function setMeDirty(id, v) { const d = meDirty(); d[id] = v; localStorage.setItem('pt_me_dirty', JSON.stringify(d)); if (typeof schedulePush === 'function') { dirty = true; schedulePush(); } }
const blobToDataUrl = blob => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(blob); });
const dataUrlToB64 = u => u.split(',')[1];
async function meUpload(path, b64, remote) {
  const body = { message: 'התמונות שלי', content: b64 }; if (remote) body.sha = remote.sha;
  await gh('/contents/' + path, { method: 'PUT', body: JSON.stringify(body) });
}
async function syncMe() {
  if (!syncOn()) return;
  const dirtyMap = meDirty();
  const root = (await gh('/contents/me')) || [];
  const exList = (await gh('/contents/me/ex')) || [];
  const rface = root.find(f => f.name === 'face.jpg');
  // פנים
  if (dirtyMap.face === 'del') { if (rface) await gh('/contents/me/face.jpg', { method: 'DELETE', body: JSON.stringify({ message: 'הסרת תמונה', sha: rface.sha }) }); }
  else if (dirtyMap.face && FG.faceUrl) await meUpload('me/face.jpg', dataUrlToB64(FG.faceUrl), rface);
  else if (rface && rface.sha !== localStorage.getItem('pt_face_sha') && !dirtyMap.face) {
    const r = await ghFetch('/contents/me/face.jpg', {}, 'application/vnd.github.raw+json');
    if (r) { FG.faceUrl = await blobToDataUrl(await r.blob()); localStorage.setItem('pt_face', FG.faceUrl); }
  }
  if (rface || dirtyMap.face) { const nr = (await gh('/contents/me')) || []; const f = nr.find(x => x.name === 'face.jpg'); if (f) localStorage.setItem('pt_face_sha', f.sha); }
  // תמונות לתרגילים
  const have = new Set();
  for (const [id, v] of Object.entries(dirtyMap)) {
    if (id === 'face') continue;
    const [k, i] = id.split('_'); const rem = exList.find(f => f.name === id + '.jpg');
    if (v === 'del') { if (rem) await gh('/contents/me/ex/' + id + '.jpg', { method: 'DELETE', body: JSON.stringify({ message: 'מחיקת תמונה', sha: rem.sha }) }); }
    else { const rec = (await exdb.all()).find(r => r.id === `${k}:${i}`); if (rec) await meUpload('me/ex/' + id + '.jpg', await blobB64(rec.blob), rem); }
    have.add(id);
  }
  let added = 0;
  const localIds = new Set((await exdb.all()).map(r => r.id.replace(':', '_')));
  for (const f of exList) {
    const id = f.name.replace(/\.jpg$/, '');
    if (have.has(id) || localIds.has(id)) continue;
    const r = await ghFetch('/contents/me/ex/' + f.name, {}, 'application/vnd.github.raw+json'); if (!r) continue;
    const [k, i] = id.split('_'), blob = await r.blob();
    await exdb.put(`${k}:${i}`, blob); (MYP[k] = MYP[k] || [])[+i] = URL.createObjectURL(blob); added++;
  }
  localStorage.removeItem('pt_me_dirty');
  if (added || FG.faceUrl) { if (S.current) renderFocus(); }
}
loadMyp();
window.addEventListener('DOMContentLoaded', () => { applyTheme(); });
applyTheme();
