'use strict';
// ============================================================
//  מאמן כושר — לוגיקה וממשק
// ============================================================
const $ = (s, el = document) => el.querySelector(s);
const view = $('#view');
const KEY = 'pt_state_v1';

// ---------- מצב ושמירה ----------
function defaultState() {
  return {
    onboarded: false, tracks: {}, history: [], tests: [], xp: 0,
    achievements: {}, claimed: {}, gtg: {}, waist: [], photoCount: 0, photoWeeks: {}, waistWeeks: {},
    skills: { active: 'muscleup', progress: {} },
    rot: 0, blockCount: 0, current: null, tab: 'today', forceDate: null, updatedAt: 0,
  };
}
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) return Object.assign(defaultState(), s); } catch (e) {}
  return defaultState();
}
let S = load();
function ensureTracks() { for (const id in TRACKS) if (!S.tracks[id]) S.tracks[id] = { stage: 0, fails: 0 }; }
ensureTracks();
function save() { S.updatedAt = Date.now(); localStorage.setItem(KEY, JSON.stringify(S)); schedulePush(); }

// ---------- תאריכים ----------
const z = n => String(n).padStart(2, '0');
function dkey(d = new Date()) { return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; }
function parseKey(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(k, n) { const d = parseKey(k); d.setDate(d.getDate() + n); return dkey(d); }
function weekKey(k) { const d = parseKey(k); d.setDate(d.getDate() - d.getDay()); return dkey(d); }
function fmtDate(k) { const d = parseKey(k); return `${d.getDate()}/${d.getMonth() + 1}`; }
const mmss = s => `${Math.floor(s / 60)}:${z(Math.max(0, s % 60))}`;

// ---------- רמות ו-XP ----------
const xpFor = L => 75 * (L - 1) * L; // רמה 2 = 150, רמה 3 = 450, רמה 4 = 900...
function levelOf(xp) { let L = 1; while (xp >= xpFor(L + 1)) L++; return L; }
function rankOf(L) { let r = RANKS[0].name; for (const x of RANKS) if (L >= x.min) r = x.name; return r; }

// ---------- שלבי תרגילים ----------
function stageOf(id) { const t = TRACKS[id]; return t.stages[Math.min(S.tracks[id].stage, t.stages.length - 1)]; }
function fmtStage(id) { const st = stageOf(id); return `${st.v} — ${st.s} סטים של ${st.r}${TRACKS[id].unit === 'sec' ? ' שנ׳' : ''}`; }
// מיקום התחלתי: ~60% מהמקסימום בכל סט, בתוך הווריאציה הבסיסית
function place(id, max) {
  const st = TRACKS[id].stages;
  if (max <= 2 && st[0].v.includes('שלילי')) return 0;
  const target = Math.max(1, Math.round(max * 0.6));
  const baseIdx = st.findIndex(x => !x.v.includes('שלילי'));
  const baseV = st[baseIdx].v;
  let last = baseIdx;
  for (let i = baseIdx; i < st.length && st[i].v === baseV; i++) { last = i; if (st[i].r >= target) return i; }
  return Math.min(last + 1, st.length - 1);
}
function placeAll(t, onlyUp) {
  const set = (id, max) => { const p = place(id, max); if (!onlyUp || p > S.tracks[id].stage) S.tracks[id] = { stage: p, fails: 0 }; };
  set('pull', t.pull); set('chin', t.pull + 1); set('dip', t.dip); set('push', t.push);
}

// ---------- סטטיסטיקות ----------
function weekCounts() { const m = {}; for (const h of S.history) { const w = weekKey(h.date); m[w] = (m[w] || 0) + 1; } return m; }
function streaks() {
  const m = weekCounts(); const weeks = Object.keys(m).sort();
  if (!weeks.length) return { cur: 0, best: 0 };
  const end = weekKey(dkey()); let w = weeks[0], run = 0, best = 0;
  while (w <= end) {
    if ((m[w] || 0) >= 3) { run++; best = Math.max(best, run); } else if (w !== end) run = 0;
    w = addDays(w, 7);
  }
  return { cur: run, best };
}
function stats() {
  const mx = k => Math.max(0, ...S.tests.map(t => t[k] || 0));
  const st = streaks();
  const sum = k => S.history.reduce((a, h) => a + ((h.totals && h.totals[k]) || 0), 0);
  const gtgVals = Object.values(S.gtg);
  let skillStages = 0, skillsDone = 0;
  for (const id in SKILLS) { const p = S.skills.progress[id] || 0; skillStages += p; if (p >= SKILLS[id].stages.length) skillsDone++; }
  const w = S.waist;
  return {
    workouts: S.history.length,
    bosses: S.history.filter(h => h.type === 'BOSS').length,
    maxPull: mx('pull'), maxDip: mx('dip'), maxPush: mx('push'),
    bestStreak: st.best, curStreak: st.cur, level: levelOf(S.xp),
    finishers: S.history.filter(h => h.finisher).length,
    gtgDays: gtgVals.filter(g => g.sets >= 5).length,
    progressions: S.history.reduce((a, h) => a + (h.progressions ? h.progressions.length : 0), 0),
    totalPull: sum('pull') + gtgVals.reduce((a, g) => a + g.sets * g.reps, 0),
    totalPush: sum('push'), photos: S.photoCount,
    waistDrop: w.length > 1 ? Math.round((w[0].cm - w[w.length - 1].cm) * 10) / 10 : 0,
    skillStages, skillsDone,
  };
}
function weekMetrics(wk) {
  const hs = S.history.filter(h => weekKey(h.date) === wk);
  const t = k => hs.reduce((a, h) => a + ((h.totals && h.totals[k]) || 0), 0);
  let gtgReps = 0, gtgDays = 0;
  for (const [d, g] of Object.entries(S.gtg)) if (weekKey(d) === wk) { gtgReps += g.sets * g.reps; if (g.sets >= 5) gtgDays++; }
  return { workouts: hs.length, pullReps: t('pull') + gtgReps, pushReps: t('push'), legReps: t('legs'),
    coreSec: t('coreSec'), finishers: hs.filter(h => h.finisher).length, gtgDays };
}
function weekChallenges(wk) {
  const n = Math.floor(Math.round(parseKey(wk).getTime() / 864e5) / 7);
  const pool = CHALLENGE_POOL.filter(c => c.id !== 'w3');
  const a = pool[n % pool.length], b = pool[(n + 3) % pool.length];
  return [CHALLENGE_POOL.find(c => c.id === 'w3'), a, b];
}
function gtgTarget() {
  const mp = Math.max(0, ...S.tests.map(t => t.pull || 0));
  return mp <= 2 ? { reps: 2, label: 'מתח שליליים' } : { reps: Math.max(2, Math.round(mp * 0.5)), label: 'מתח' };
}

// ---------- XP, הישגים, אתגרים ----------
const celebrations = [];
function addXp(n) {
  const before = levelOf(S.xp); S.xp += n; const after = levelOf(S.xp);
  if (after > before) celebrations.push({ type: 'level', level: after });
}
function runChecks() {
  const wk = weekKey(dkey()); const m = weekMetrics(wk);
  S.claimed[wk] = S.claimed[wk] || [];
  for (const c of weekChallenges(wk)) {
    if (!S.claimed[wk].includes(c.id) && m[c.metric] >= c.target) {
      S.claimed[wk].push(c.id); addXp(100); toast(`🏁 אתגר הושלם: <b>${c.name}</b> +100 XP`);
    }
  }
  let changed = true;
  while (changed) {
    changed = false; const st = stats();
    for (const a of ACHIEVEMENTS) {
      if (!S.achievements[a.id] && a.test({ stats: st })) {
        S.achievements[a.id] = dkey(); addXp(50); changed = true;
        toast(`${a.icon} הישג חדש: <b>${a.name}</b> +50 XP`); confetti();
      }
    }
  }
  save();
}

// ---------- בניית אימון ----------
function nextType() { return S.blockCount >= BLOCK_LENGTH ? 'BOSS' : ROTATION[S.rot % ROTATION.length]; }
function emomStations() {
  const p = stageOf('pull'), d = stageOf('dip');
  const pNeg = p.v.includes('שלילי'), dNeg = d.v.includes('שלילי');
  return [
    { name: pNeg ? 'מתח שלילי' : 'מתח', reps: pNeg ? 2 : Math.max(2, Math.round(p.r * 0.6)), kind: 'pull' },
    { name: dNeg ? 'מקבילים שליליים' : 'מקבילים', reps: dNeg ? 3 : Math.max(3, Math.round(d.r * 0.6)), kind: 'push' },
    { name: 'סקוואט קפיצה', reps: 10, kind: 'legs' },
    { name: 'מטפסי הרים', reps: '30 שנ׳', kind: 'cardio' },
  ];
}
function buildWorkout(type) {
  const w = { type, date: dkey(), started: Date.now(), warmupDone: false, blocks: [], finisher: null, finisherDone: false };
  if (type === 'BOSS') { w.boss = { pull: '', dip: '', push: '' }; return w; }
  for (const b of WORKOUTS[type].blocks) {
    if (b.type === 'superset') {
      w.blocks.push({ type: 'superset', title: b.title, rest: b.rest, ex: b.tracks.map(id => {
        const st = stageOf(id);
        return { track: id, v: st.v, cue: st.cue, unit: TRACKS[id].unit,
          target: Array(st.s).fill(st.r), done: Array(st.s).fill(null), log: Array(st.s).fill(st.r) };
      }) });
    } else if (b.type === 'skill') {
      const sid = S.skills.active, p = S.skills.progress[sid] || 0, sk = SKILLS[sid];
      w.blocks.push({ type: 'skill', title: b.title, skill: sid,
        stage: p < sk.stages.length ? sk.stages[p] : 'שמירה על הסקיל — תרגול חופשי', done: false });
    } else if (b.type === 'emom') {
      w.blocks.push({ type: 'emom', title: b.title, minutes: b.minutes, stations: emomStations(), roundsDone: 0, startAt: 0 });
    }
  }
  return w;
}

// ---------- סיום אימון ----------
function completeWorkout(fb) {
  const w = S.current; const ups = [], downs = [];
  const totals = { pull: 0, push: 0, legs: 0, coreSec: 0 }; let setsHit = 0;
  for (const b of w.blocks) {
    if (b.type === 'superset') for (const e of b.ex) {
      const g = TRACKS[e.track].group; const sum = e.done.reduce((a, x) => a + (x || 0), 0);
      if (e.unit === 'sec') totals.coreSec += sum; else if (totals[g] !== undefined) totals[g] += sum;
      e.done.forEach((x, i) => { if (x != null && x >= e.target[i]) setsHit++; });
      const hit = e.done.every((x, i) => x != null && x >= e.target[i]);
      const tr = S.tracks[e.track], n = TRACKS[e.track].stages.length;
      if (hit) {
        tr.fails = 0;
        const step = fb === 'easy' ? 2 : fb === 'hard' ? 0 : 1;
        if (step > 0 && tr.stage < n - 1) { const from = fmtStage(e.track); tr.stage = Math.min(n - 1, tr.stage + step); ups.push({ name: TRACKS[e.track].name, from, to: fmtStage(e.track) }); }
      } else {
        const tgt = e.target.reduce((a, x) => a + x, 0);
        if (sum / tgt < 0.75) {
          tr.fails++;
          if (tr.fails >= 2 && tr.stage > 0) { tr.stage--; tr.fails = 0; downs.push({ name: TRACKS[e.track].name, to: fmtStage(e.track) }); }
        }
      }
    }
    if (b.type === 'emom') {
      for (let i = 0; i < b.roundsDone; i++) {
        const st = b.stations[i % b.stations.length];
        if (typeof st.reps === 'number' && totals[st.kind] !== undefined) totals[st.kind] += st.reps;
      }
      setsHit += b.roundsDone;
    }
    if (b.type === 'skill' && b.done) setsHit += 3;
  }
  const xp = 100 + setsHit * 5 + ups.length * 20 + (w.finisherDone ? 30 : 0);
  S.history.push({ date: dkey(), type: w.type, totals, finisher: w.finisherDone ? w.finisher.name : null,
    feedback: fb, xp, progressions: ups, mins: Math.round((Date.now() - w.started) / 60000) });
  S.rot = (ROTATION.indexOf(w.type) + 1) % ROTATION.length;
  S.blockCount++;
  S.current = null; keepAwake(false); stopRest();
  celebrations.unshift({ type: 'summary', xp, ups, downs, totals, mins: S.history[S.history.length - 1].mins });
  addXp(xp); runChecks(); confetti(); render(); flush();
}
function completeBoss() {
  const w = S.current; const vals = {};
  for (const k of ['pull', 'dip', 'push']) {
    const v = parseInt($(`#boss-${k}`).value, 10);
    if (isNaN(v) || v < 0) { toast('צריך למלא את שלושת המבחנים'); return; }
    vals[k] = v;
  }
  const prev = { pull: 0, dip: 0, push: 0 };
  for (const t of S.tests) for (const k in prev) prev[k] = Math.max(prev[k], t[k] || 0);
  const prs = Object.keys(vals).filter(k => vals[k] > prev[k]);
  S.tests.push({ date: dkey(), ...vals });
  placeAll(vals, true);
  const xp = 200 + prs.length * 50;
  S.history.push({ date: dkey(), type: 'BOSS', totals: { pull: vals.pull, push: vals.dip + vals.push, legs: 0, coreSec: 0 },
    xp, progressions: [], prs, mins: Math.round((Date.now() - w.started) / 60000) });
  S.blockCount = 0; S.current = null; keepAwake(false); stopRest();
  celebrations.unshift({ type: 'boss', xp, vals, prev, prs });
  addXp(xp); runChecks(); confetti(); render(); flush();
}

// ============================================================
//  רינדור
// ============================================================
function render() {
  document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('on', b.dataset.t === S.tab));
  if (!S.onboarded) { view.innerHTML = onboardingHtml(); return; }
  const r = { today: renderToday, progress: renderProgress, skills: renderSkills, ach: renderAch }[S.tab] || renderToday;
  view.innerHTML = r();
  if (S.tab === 'progress') loadPhotos();
  tick();
}

function heroCard() {
  const st = stats(); const L = st.level; const base = xpFor(L), next = xpFor(L + 1);
  const pct = Math.round(((S.xp - base) / (next - base)) * 100);
  return `<div class="card hero">
    <div class="lvl"><div class="badge">${L}</div>
      <div class="grow"><div class="rank">${rankOf(L)}</div><div class="muted">${S.xp - base} / ${next - base} XP לרמה ${L + 1}</div></div>
      <div class="streak">🔥 ${st.curStreak}<small>שבועות ברצף</small></div></div>
    <div class="bar"><i style="width:${pct}%"></i></div></div>`;
}

function renderToday() {
  let h = heroCard();
  if (S.current) return h + renderWorkout();
  const today = dkey();
  const doneToday = S.history.some(x => x.date === today);
  const yest = S.history.some(x => x.date === addDays(today, -1));
  const nt = nextType();
  if (doneToday) {
    h += `<div class="card done-card"><div class="big">✅</div><h2>האימון של היום הושלם</h2>
      <p class="muted">עכשיו אוכלים חלבון, שותים מים וישנים טוב. השריר נבנה במנוחה.</p></div>`;
  } else if (yest && S.forceDate !== today) {
    h += `<div class="card"><h2>😴 היום יום מנוחה</h2>
      <p class="muted">התאמנת אתמול. מנוחה של יום בין אימונים = התוצאות הכי מהירות. האימון הבא שלך: <b>${nt === 'BOSS' ? 'קרב בוס' : WORKOUTS[nt].name}</b>.</p>
      <button class="ghost" data-a="force">בכל זאת להתאמן היום</button></div>`;
    h += gtgCard();
  } else {
    h += nextCard(nt);
    h += gtgCard();
  }
  if (nt !== 'BOSS') h += `<div class="card slim">🐉 עוד <b>${BLOCK_LENGTH - S.blockCount}</b> אימונים לקרב הבוס הבא</div>`;
  h += challengesCard(true);
  h += `<div class="card tip"><b>💡 טיפ היום</b><p>${TIPS[Math.round(parseKey(today).getTime() / 864e5) % TIPS.length]}</p></div>`;
  return h;
}

function nextCard(t) {
  if (t === 'BOSS') {
    return `<div class="card boss"><div class="tag">קרב בוס</div><h2>🐉 הגיע הזמן לבדוק כמה התחזקת</h2>
      <p>3 מבחני מקסימום: מתח, מקבילים ושכיבות סמיכה. 3 דקות מנוחה ביניהם, רק חזרות נקיות. לפי התוצאות התוכנית מתעדכנת.</p>
      <button class="cta" data-a="start" data-t="BOSS">⚔️ להילחם</button></div>`;
  }
  const W = WORKOUTS[t];
  let list = '';
  for (const b of W.blocks) {
    if (b.type === 'superset') list += b.tracks.map(id => `<li>${fmtStage(id)}</li>`).join('');
    if (b.type === 'skill') list += `<li>סקיל: ${SKILLS[S.skills.active].name} — 6 דקות</li>`;
    if (b.type === 'emom') list += `<li>EMOM 16 דקות: ${emomStations().map(s => `${s.name} ${s.reps}`).join(' / ')}</li>`;
  }
  return `<div class="card next"><div class="tag">האימון של היום · ~30 דק׳</div><h2>${W.name}</h2>
    <p class="muted">${W.focus}</p><ul class="plan">${list}<li>🎡 פיניש מגלגל המזל</li></ul>
    <button class="cta" data-a="start" data-t="${t}">▶ התחל אימון</button>
    <div class="swap">החלף: ${ROTATION.filter(x => x !== t).map(x => `<button class="chip" data-a="start" data-t="${x}">${x}</button>`).join('')}</div></div>`;
}

function gtgCard() {
  const today = dkey(); const g = S.gtg[today] || { sets: 0, reps: gtgTarget().reps }; const tg = gtgTarget();
  const dots = Array.from({ length: 5 }, (_, i) => `<i class="${i < g.sets ? 'on' : ''}"></i>`).join('');
  return `<div class="card gtg"><h3>🛢️ משימת GTG — לשמן את החריץ</h3>
    <p class="muted">5 סטים של <b>${tg.reps} ${tg.label}</b> מפוזרים לאורך היום (כל שעה-שעתיים). אף פעם לא עד כישלון. זו השיטה הכי מהירה להעלות מתח.</p>
    <div class="dots">${dots}</div>
    ${g.sets >= 5 ? '<p class="ok-text">✓ הושלם! +30 XP</p>' : `<button class="ghost" data-a="gtg">+ עשיתי סט</button>`}
    ${g.sets > 0 && g.sets < 5 ? '<button class="link" data-a="gtg-undo">ביטול</button>' : ''}</div>`;
}

function challengesCard(mini) {
  const wk = weekKey(dkey()); const m = weekMetrics(wk); const claimed = S.claimed[wk] || [];
  const rows = weekChallenges(wk).map(c => {
    const v = Math.min(m[c.metric], c.target); const ok = claimed.includes(c.id);
    return `<div class="chal ${ok ? 'ok' : ''}"><div class="row"><b>${ok ? '✅' : '🎯'} ${c.name}</b><span>${v}/${c.target}</span></div>
      ${mini ? '' : `<div class="muted small">${c.desc} · +100 XP</div>`}<div class="bar thin"><i style="width:${(v / c.target) * 100}%"></i></div></div>`;
  }).join('');
  return `<div class="card"><h3>⚡ אתגרי השבוע</h3>${rows}</div>`;
}

// ---------- מסך אימון פעיל ----------
function renderWorkout() {
  const w = S.current;
  const title = w.type === 'BOSS' ? '🐉 קרב בוס' : WORKOUTS[w.type].name;
  let h = `<div class="wo-head"><h2>${title}</h2><span id="elapsed" class="timer-pill">0:00</span></div>`;
  h += `<div class="card ${w.warmupDone ? 'collapsed' : ''}"><div class="row"><h3>🔥 חימום — 5 דקות</h3>
    ${w.warmupDone ? '<span class="ok-text">✓</span>' : ''}</div>
    ${w.warmupDone ? '' : `<ul class="plan">${WARMUP.map(x => `<li>${x}</li>`).join('')}</ul><button class="ghost" data-a="warm">✓ סיימתי חימום</button>`}</div>`;

  if (w.type === 'BOSS') {
    const best = k => Math.max(0, ...S.tests.map(t => t[k] || 0));
    const f = (k, name) => `<label class="boss-in"><span>${name}<small>שיא: ${best(k)}</small></span>
      <input id="boss-${k}" type="number" inputmode="numeric" min="0" value="${w.boss[k]}" data-c="boss" data-k="${k}" placeholder="0"></label>`;
    h += `<div class="card boss"><h3>3 מבחנים · 3 דקות מנוחה ביניהם</h3>
      <p class="muted">סט אחד מקסימלי בכל תרגיל. רק חזרות מלאות ונקיות נספרות.</p>
      ${f('pull', 'מתח')}${f('dip', 'מקבילים')}${f('push', 'שכיבות סמיכה')}
      <button class="ghost" data-a="rest" data-s="180">⏱ מנוחה 3 דקות</button></div>
      <button class="cta" data-a="finish">🏆 סיים קרב</button>
      <button class="link danger" data-a="cancel">בטל</button>`;
    return h;
  }

  w.blocks.forEach((b, bi) => {
    if (b.type === 'superset') {
      h += `<div class="card"><h3>${b.title}</h3>
        <p class="muted small">סט מתרגיל 1, מיד סט מתרגיל 2, ואז ${b.rest} שניות מנוחה. הטיימר מופעל לבד.</p>`;
      b.ex.forEach((e, ei) => {
        const T = TRACKS[e.track]; const u = e.unit === 'sec' ? 'שנ׳' : 'חזרות';
        h += `<div class="ex"><div class="ex-name"><span class="num">${ei + 1}</span><div><b>${e.v}</b>
          <div class="muted small">${e.v === T.name ? '' : T.name + ' · '}${e.target.length} סטים של ${e.target[0]} ${u}</div></div></div>
          <details><summary>איך עושים נכון</summary><p>${e.cue}</p></details>`;
        e.target.forEach((t, si) => {
          const d = e.done[si] != null;
          h += `<div class="set ${d ? (e.done[si] >= t ? 'ok' : 'part') : ''}"><span class="sn">סט ${si + 1}</span>
            <button class="sm" data-a="minus" data-b="${bi}" data-e="${ei}" data-s="${si}" ${d ? 'disabled' : ''}>−</button>
            <span class="val"><b>${e.log[si]}</b><small>/${t}</small></span>
            <button class="sm" data-a="plus" data-b="${bi}" data-e="${ei}" data-s="${si}" ${d ? 'disabled' : ''}>+</button>
            <button class="check" data-a="ok" data-b="${bi}" data-e="${ei}" data-s="${si}">${d ? '↺' : '✓'}</button></div>`;
        });
        h += `</div>`;
      });
      h += `</div>`;
    } else if (b.type === 'skill') {
      const sk = SKILLS[b.skill];
      h += `<div class="card"><h3>${sk.icon} ${b.title}: ${sk.name}</h3>
        <p><b>היעד שלך:</b> ${b.stage}</p>
        <p class="muted small">נסיונות קצרים ואיכותיים, מנוחה מלאה (60–90 שנ׳) בין נסיון לנסיון. לא עד כישלון. אפשר להחליף סקיל בלשונית "סקילס".</p>
        <button class="ghost ${b.done ? 'on' : ''}" data-a="skill-done" data-b="${bi}">${b.done ? '✓ תורגל' : 'סמן שתרגלתי'}</button></div>`;
    } else if (b.type === 'emom') {
      const running = b.startAt && b.roundsDone < b.minutes && !b.stopped;
      h += `<div class="card emom"><h3>⏱ ${b.title}</h3>
        <p class="muted small">בתחילת כל דקה מבצעים את התחנה ונחים עד סוף הדקה. 4 תחנות × 4 סבבים. אם לא מספיק לנוח — זה בסדר, זה שורף.</p>
        <ol class="stations">${b.stations.map(s => `<li>${s.name} — <b>${s.reps}</b></li>`).join('')}</ol>
        <div id="emom-${bi}" class="emom-box">${b.stopped || b.roundsDone >= b.minutes ? `✓ ${b.roundsDone} דקות הושלמו` : running ? '' : 'מוכן?'}</div>
        ${b.stopped || b.roundsDone >= b.minutes ? '' : running
          ? `<button class="ghost" data-a="emom-stop" data-b="${bi}">⏹ עצור</button>`
          : `<button class="cta" data-a="emom-start" data-b="${bi}">▶ התחל EMOM</button>`}</div>`;
    }
  });

  // פיניש
  if (!w.finisher) {
    h += `<div class="card wheel"><h3>🎡 פיניש</h3><div id="wheel" class="wheel-box">?</div>
      <button class="cta alt" data-a="spin">סובב את הגלגל</button></div>`;
  } else {
    h += `<div class="card wheel"><h3>🎡 פיניש</h3><div class="wheel-box">${w.finisher.name}</div><p class="muted">${w.finisher.desc}</p>
      ${w.finisherDone ? '<p class="ok-text">✓ הושלם! +30 XP</p>' : '<button class="ghost" data-a="fin-done">✓ סיימתי את הפיניש</button>'}</div>`;
  }
  h += `<button class="cta" data-a="finish">🏁 סיים אימון</button><button class="link danger" data-a="cancel">בטל אימון</button>`;
  return h;
}

// ---------- התקדמות ----------
function renderProgress() {
  const st = stats();
  let h = `<h2 class="page">📊 התקדמות</h2>`;
  // תמונות מוטיבציה
  if (MOTIVATION_IMAGES.length) {
    h += `<div class="card"><h3>🖼️ תמונות מוטיבציה</h3><div class="mot-grid">${MOTIVATION_IMAGES.map(m => {
      const open = st.level >= m.level;
      return `<figure class="${open ? '' : 'locked'}"><img src="${m.src}" alt="" loading="lazy">${open ? `<figcaption>${m.caption || ''}</figcaption>` : `<span class="lock">🔒 רמה ${m.level}</span>`}</figure>`;
    }).join('')}</div></div>`;
  } else {
    h += `<div class="card slim muted">🖼️ תמונות המוטיבציה שלך ייפתחו כאן לפי רמה, אחרי שתוסיף אותן.</div>`;
  }
  h += challengesCard(false);
  // מבחנים
  const T = S.tests;
  h += `<div class="card"><h3>💪 שיאים (מבחני בוס)</h3>
    <div class="kpis"><div><b>${st.maxPull}</b><small>מתח</small></div><div><b>${st.maxDip}</b><small>מקבילים</small></div><div><b>${st.maxPush}</b><small>שכיבות</small></div></div>
    ${lineChart(T.map(t => fmtDate(t.date)), [
      { name: 'מתח', color: '#ff7a1a', vals: T.map(t => t.pull) },
      { name: 'מקבילים', color: '#4fd1c5', vals: T.map(t => t.dip) },
      { name: 'שכיבות', color: '#a3e635', vals: T.map(t => t.push) }])}</div>`;
  // מותניים
  const W = S.waist;
  const delta = W.length > 1 ? Math.round((W[W.length - 1].cm - W[0].cm) * 10) / 10 : null;
  h += `<div class="card"><h3>📏 היקף מותניים</h3>
    <p class="muted small">מודדים בגובה הטבור, בבוקר, לפני אוכל. פעם בשבוע-שבועיים. זה המדד האמיתי לכרס.</p>
    <div class="inline"><input id="waist-in" type="number" inputmode="decimal" step="0.5" placeholder="ס״מ"><button class="ghost" data-a="waist">שמור</button></div>
    ${delta != null ? `<p class="${delta <= 0 ? 'ok-text' : 'muted'}">${delta <= 0 ? '⬇' : '⬆'} ${Math.abs(delta)} ס״מ מהמדידה הראשונה</p>` : ''}
    ${lineChart(W.map(x => fmtDate(x.date)), [{ name: 'ס״מ', color: '#ff7a1a', vals: W.map(x => x.cm) }])}</div>`;
  // תמונות לפני/אחרי
  h += `<div class="card"><h3>📸 לפני / אחרי</h3>
    <p class="muted small">אותה תאורה, אותו מקום, אותה תנוחה. פעם בשבועיים. התמונות נשמרות רק בטלפון.</p>
    <button class="ghost" data-a="photo">+ הוסף תמונה</button><input id="photo-in" type="file" accept="image/*" hidden>
    <div id="photos"></div></div>`;
  // שלבים נוכחיים
  h += `<div class="card"><h3>🪜 השלבים שלך עכשיו</h3>${Object.keys(TRACKS).map(id => {
    const n = TRACKS[id].stages.length, s = S.tracks[id].stage;
    return `<div class="trk"><div class="row"><b>${TRACKS[id].name}</b><span class="muted small">שלב ${s + 1}/${n}</span></div>
      <div class="small">${fmtStage(id)}</div><div class="bar thin"><i style="width:${((s + 1) / n) * 100}%"></i></div></div>`;
  }).join('')}</div>`;
  // היסטוריה
  const hist = S.history.slice(-15).reverse();
  h += `<div class="card"><h3>🗒️ אימונים אחרונים</h3>${hist.length ? hist.map(x =>
    `<div class="hist"><span>${fmtDate(x.date)}</span><b>${x.type === 'BOSS' ? '🐉 בוס' : 'אימון ' + x.type}</b><span class="muted small">${x.mins || '-'} דק׳</span><span class="xp">+${x.xp}</span></div>`).join('')
    : '<p class="muted">עוד אין אימונים. יאללה.</p>'}</div>`;
  return h;
}

function lineChart(labels, series) {
  const all = series.flatMap(s => s.vals).filter(v => v != null);
  if (all.length < 2) return '<p class="muted small">הגרף יופיע אחרי שתי מדידות.</p>';
  const W = 320, H = 150, P = 26;
  let min = Math.min(...all), max = Math.max(...all); if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.15; min -= pad; max += pad;
  const n = labels.length;
  const x = i => n === 1 ? W / 2 : P + (i * (W - 2 * P)) / (n - 1);
  const y = v => H - P + 6 - ((v - min) / (max - min)) * (H - P - 10);
  let g = `<line x1="${P}" y1="${H - P + 6}" x2="${W - P}" y2="${H - P + 6}" class="axis"/>`;
  series.forEach(s => {
    const pts = s.vals.map((v, i) => `${x(i)},${y(v)}`).join(' ');
    g += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    s.vals.forEach((v, i) => { g += `<circle cx="${x(i)}" cy="${y(v)}" r="3.5" fill="${s.color}"/>`; });
    const lv = s.vals[s.vals.length - 1];
    g += `<text x="${x(n - 1) + 6}" y="${y(lv) + 4}" fill="${s.color}" class="lbl">${lv}</text>`;
  });
  const step = Math.ceil(n / 6);
  labels.forEach((l, i) => { if (i % step === 0 || i === n - 1) g += `<text x="${x(i)}" y="${H - 4}" text-anchor="middle" class="lbl muted">${l}</text>`; });
  const legend = series.length > 1 ? `<div class="legend">${series.map(s => `<span><i style="background:${s.color}"></i>${s.name}</span>`).join('')}</div>` : '';
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" dir="ltr">${g}</svg>${legend}`;
}

// ---------- סקילס ----------
function renderSkills() {
  let h = `<h2 class="page">🌳 עץ הסקילס</h2><p class="muted pad">הסקיל הפעיל מתורגל בכל אימון C. כשאתה מצליח בשלב — סמן אותו וקבל 75 XP.</p>`;
  for (const id in SKILLS) {
    const sk = SKILLS[id], p = S.skills.progress[id] || 0, active = S.skills.active === id;
    h += `<div class="card skill ${active ? 'active' : ''}"><div class="row"><h3>${sk.icon} ${sk.name}</h3><span class="muted small">${p}/${sk.stages.length}</span></div>
      <div class="bar thin"><i style="width:${(p / sk.stages.length) * 100}%"></i></div>
      <ol class="tree">${sk.stages.map((s, i) => `<li class="${i < p ? 'ok' : i === p ? 'cur' : ''}">${i < p ? '✓ ' : ''}${s}</li>`).join('')}</ol>
      <div class="row">${p < sk.stages.length ? `<button class="ghost" data-a="skill-up" data-k="${id}">השגתי את השלב ✓</button>` : '<span class="ok-text">🥋 הושלם!</span>'}
      ${active ? '<span class="tag">פעיל באימון C</span>' : `<button class="link" data-a="skill-active" data-k="${id}">בחר לאימון C</button>`}</div></div>`;
  }
  return h;
}

// ---------- הישגים ----------
function renderAch() {
  const n = Object.keys(S.achievements).length;
  return `<h2 class="page">🏆 הישגים <span class="muted small">${n}/${ACHIEVEMENTS.length}</span></h2>
    <div class="ach-grid">${ACHIEVEMENTS.map(a => {
      const d = S.achievements[a.id];
      return `<div class="ach ${d ? 'on' : ''}"><div class="ic">${d ? a.icon : '🔒'}</div><b>${a.name}</b><small>${a.desc}</small>${d ? `<small class="date">${fmtDate(d)}</small>` : ''}</div>`;
    }).join('')}</div>`;
}

// ---------- פתיחה ----------
function onboardingHtml() {
  return `<div class="card onboard"><div class="big">💪</div><h2>ברוך הבא למאמן שלך</h2>
    <p>3 אימונים בשבוע, 30 דקות, מתח + מקבילים + רצפה. התוכנית עולה איתך שלב אחרי שלב.</p>
    <p class="muted">כדי להתאים את נקודת ההתחלה — עשה עכשיו (או תכתוב לפי מה שאתה יודע) סט אחד מקסימלי מכל תרגיל:</p>
    <label class="boss-in"><span>מתח רצופים</span><input id="ob-pull" type="number" inputmode="numeric" min="0" placeholder="0"></label>
    <label class="boss-in"><span>מקבילים רצופים</span><input id="ob-dip" type="number" inputmode="numeric" min="0" placeholder="0"></label>
    <label class="boss-in"><span>שכיבות סמיכה רצופות</span><input id="ob-push" type="number" inputmode="numeric" min="0" placeholder="0"></label>
    <button class="cta" data-a="onboard">יאללה, מתחילים</button>
    <button class="link" data-a="settings">כבר יש לי נתונים ב-GitHub — להתחבר</button></div>`;
}

// ============================================================
//  מודאלים, טוסטים, קונפטי
// ============================================================
const modal = $('#modal');
function showModal(html) { modal.innerHTML = `<div class="sheet">${html}</div>`; modal.classList.add('open'); }
function closeModal() { modal.classList.remove('open'); modal.innerHTML = ''; setTimeout(flush, 250); }
function flush() {
  if (modal.classList.contains('open') || !celebrations.length) return;
  const c = celebrations.shift();
  if (c.type === 'summary') {
    const t = c.totals;
    showModal(`<div class="big">🏁</div><h2>אימון הושלם!</h2><div class="xp-big">+${c.xp} XP</div>
      <div class="kpis"><div><b>${t.pull}</b><small>משיכות</small></div><div><b>${t.push}</b><small>דחיפות</small></div><div><b>${c.mins}</b><small>דקות</small></div></div>
      ${c.ups.length ? `<h3>📈 עלית שלב!</h3>${c.ups.map(u => `<div class="up"><b>${u.name}</b><small>${u.to}</small></div>`).join('')}` : '<p class="muted">לא עלית שלב הפעם — בפעם הבאה סגור את כל הסטים ותעלה.</p>'}
      ${c.downs.length ? `<p class="muted small">ירדנו שלב ב: ${c.downs.map(d => d.name).join(', ')} — כדי לבנות בסיס חזק.</p>` : ''}
      <button class="cta" data-a="close">מעולה</button>`);
  } else if (c.type === 'boss') {
    const row = (k, n) => `<div class="up"><b>${n}: ${c.vals[k]}</b><small>${c.prs.includes(k) ? `🏅 שיא חדש! (קודם ${c.prev[k]})` : `שיא: ${c.prev[k]}`}</small></div>`;
    showModal(`<div class="big">🐉</div><h2>הבוס הובס!</h2><div class="xp-big">+${c.xp} XP</div>
      ${row('pull', 'מתח')}${row('dip', 'מקבילים')}${row('push', 'שכיבות')}
      <p class="muted">התוכנית עודכנה לפי התוצאות. בלוק חדש מתחיל.</p><button class="cta" data-a="close">לבלוק הבא</button>`);
  } else if (c.type === 'level') {
    const img = [...MOTIVATION_IMAGES].reverse().find(m => m.level === c.level);
    showModal(`<div class="big pop">⭐</div><h2>רמה ${c.level}!</h2><div class="rank">${rankOf(c.level)}</div>
      ${img ? `<img class="lvl-img" src="${img.src}" alt=""><p>${img.caption || ''}</p>` : ''}
      <button class="cta" data-a="close">ממשיכים</button>`);
    confetti();
  }
}
function toast(html) {
  const el = document.createElement('div'); el.className = 'toast'; el.innerHTML = html;
  $('#toasts').appendChild(el); setTimeout(() => el.classList.add('out'), 3200); setTimeout(() => el.remove(), 3700);
}
function confetti() {
  const c = $('#confetti'), x = c.getContext('2d');
  c.width = innerWidth; c.height = innerHeight;
  const cols = ['#ff7a1a', '#a3e635', '#4fd1c5', '#facc15', '#f472b6'];
  const ps = Array.from({ length: 140 }, () => ({ x: Math.random() * c.width, y: -20 - Math.random() * c.height * 0.5,
    vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4, r: 4 + Math.random() * 5, a: Math.random() * 6, c: cols[Math.floor(Math.random() * cols.length)] }));
  const t0 = performance.now();
  (function f(t) {
    x.clearRect(0, 0, c.width, c.height);
    for (const p of ps) { p.x += p.vx; p.y += p.vy; p.a += 0.1; x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; x.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6); x.restore(); }
    if (t - t0 < 2600) requestAnimationFrame(f); else x.clearRect(0, 0, c.width, c.height);
  })(t0);
}

// ============================================================
//  טיימרים, צליל, מסך דולק
// ============================================================
let actx = null;
function unlockAudio() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  if (actx && actx.state === 'suspended') actx.resume();
}
function beep(f = 880, d = 0.18, when = 0) {
  if (!actx) return;
  const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = f; o.connect(g); g.connect(actx.destination);
  const t = actx.currentTime + when;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.start(t); o.stop(t + d + 0.05);
}
const beepEnd = () => { beep(880, 0.15); beep(880, 0.15, 0.25); beep(1320, 0.35, 0.5); };

let wl = null;
async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator && !wl) { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); }
    if (!on && wl) { await wl.release(); wl = null; }
  } catch (e) {}
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.current) keepAwake(true); });

let rest = null;
const restbar = $('#restbar');
function startRest(sec, label) { rest = { end: Date.now() + sec * 1000, total: sec, label }; restbar.classList.add('open'); tick(); }
function stopRest() { rest = null; restbar.classList.remove('open'); }

let lastEmomMin = {}, lastEmomSec = {};
function tick() {
  const now = Date.now();
  if (rest) {
    const left = Math.ceil((rest.end - now) / 1000);
    if (left <= 0) { stopRest(); beepEnd(); }
    else {
      if (left <= 3 && rest.lastBeep !== left) { rest.lastBeep = left; beep(660, 0.08); }
      $('#rest-label').textContent = rest.label; $('#rest-time').textContent = mmss(left);
      $('#rest-prog').style.width = `${(left / rest.total) * 100}%`;
    }
  }
  const w = S.current;
  if (!w || S.tab !== 'today') return;
  const el = $('#elapsed'); if (el) el.textContent = mmss(Math.floor((now - w.started) / 1000));
  w.blocks.forEach((b, bi) => {
    if (b.type !== 'emom' || !b.startAt || b.stopped || b.roundsDone >= b.minutes) return;
    const e = (now - b.startAt) / 1000, m = Math.floor(e / 60);
    if (m >= b.minutes) { b.roundsDone = b.minutes; save(); beepEnd(); render(); return; }
    if (lastEmomMin[bi] !== m) { if (lastEmomMin[bi] !== undefined) beep(1320, 0.3); lastEmomMin[bi] = m; b.roundsDone = m; save(); }
    const secLeft = 60 - Math.floor(e % 60);
    if (secLeft <= 3 && lastEmomSec[bi] !== secLeft) { lastEmomSec[bi] = secLeft; beep(660, 0.08); }
    const st = b.stations[m % b.stations.length], nx = b.stations[(m + 1) % b.stations.length];
    const box = $(`#emom-${bi}`);
    if (box) box.innerHTML = `<div class="muted small">דקה ${m + 1} מתוך ${b.minutes}</div><div class="emom-now">${st.name} — ${st.reps}</div>
      <div class="emom-sec">${secLeft}</div><div class="muted small">הבא: ${nx.name} ${nx.reps}</div>`;
  });
}
setInterval(tick, 250);

// ============================================================
//  תמונות (IndexedDB — נשמרות רק במכשיר)
// ============================================================
const idb = {
  db: null,
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      const r = indexedDB.open('trainer', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
      r.onsuccess = () => { this.db = r.result; res(this.db); }; r.onerror = () => rej(r.error);
    });
  },
  async all() {
    const db = await this.open();
    return new Promise(res => { const out = []; db.transaction('photos').objectStore('photos').openCursor().onsuccess = e => { const c = e.target.result; if (c) { out.push(c.value); c.continue(); } else res(out); }; });
  },
  async op(fn) {
    const db = await this.open();
    return new Promise((res, rej) => { const tx = db.transaction('photos', 'readwrite'); fn(tx.objectStore('photos')); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  },
  add(rec) { return this.op(os => os.add(rec)); },
  update(rec) { return this.op(os => os.put(rec)); },
  del(id) { return this.op(os => os.delete(id)); },
};
function compress(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const sc = Math.min(1, 1100 / Math.max(img.width, img.height)); const c = document.createElement('canvas');
      c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src);
      c.toBlob(b => res(b), 'image/jpeg', 0.82);
    };
    img.onerror = rej; img.src = URL.createObjectURL(file);
  });
}
let photoUrls = [];
async function loadPhotos() {
  const box = $('#photos'); if (!box) return;
  let list = [];
  try { list = await idb.all(); } catch (e) { box.innerHTML = '<p class="muted small">לא ניתן לגשת לאחסון התמונות.</p>'; return; }
  photoUrls.forEach(u => URL.revokeObjectURL(u)); photoUrls = [];
  list.sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  const items = list.map(p => { const u = URL.createObjectURL(p.blob); photoUrls.push(u); return { ...p, url: u }; });
  if (!items.length) { box.innerHTML = ''; return; }
  const opts = sel => items.map((p, i) => `<option value="${i}" ${i === sel ? 'selected' : ''}>${fmtDate(p.date)}</option>`).join('');
  box.innerHTML = `${items.length > 1 ? `<div class="cmp" dir="ltr"><img id="cmp-b" src="${items[items.length - 1].url}"><div id="cmp-clip"><img id="cmp-a" src="${items[0].url}"></div><div id="cmp-line"></div></div>
    <input id="cmp-r" type="range" min="0" max="100" value="50" dir="ltr">
    <div class="row small"><label>אחרי <select id="cmp-sb">${opts(items.length - 1)}</select></label><label>לפני <select id="cmp-sa">${opts(0)}</select></label></div>` : ''}
    <div class="thumbs">${items.map(p => `<div class="th"><img src="${p.url}"><span>${fmtDate(p.date)}</span><button data-a="photo-del" data-k="${p.id}" data-r="${p.remote || ''}">✕</button></div>`).join('')}</div>`;
  const upd = () => { const v = $('#cmp-r').value; $('#cmp-clip').style.width = v + '%'; $('#cmp-line').style.left = v + '%'; };
  if (items.length > 1) {
    $('#cmp-r').addEventListener('input', upd); upd();
    $('#cmp-sa').addEventListener('change', e => { $('#cmp-a').src = items[e.target.value].url; });
    $('#cmp-sb').addEventListener('change', e => { $('#cmp-b').src = items[e.target.value].url; });
  }
}

// ============================================================
//  פעולות
// ============================================================
const ex = t => S.current.blocks[+t.dataset.b].ex[+t.dataset.e];
const A = {
  tab(t) { S.tab = t.dataset.t; save(); render(); scrollTo(0, 0); },
  onboard() {
    const v = k => Math.max(0, parseInt($(`#ob-${k}`).value, 10) || 0);
    const t = { date: dkey(), pull: v('pull'), dip: v('dip'), push: v('push') };
    S.tests.push(t); placeAll(t, false); S.onboarded = true; save(); render(); confetti();
  },
  start(t) {
    if (S.current) return;
    const type = t.dataset.t; S.current = buildWorkout(type);
    if (type !== 'BOSS') S.rot = ROTATION.indexOf(type);
    save(); keepAwake(true); render(); scrollTo(0, 0);
  },
  force() { S.forceDate = dkey(); save(); render(); },
  warm() { S.current.warmupDone = true; save(); render(); },
  minus(t) { const e = ex(t), s = +t.dataset.s; e.log[s] = Math.max(0, e.log[s] - (e.unit === 'sec' ? 5 : 1)); save(); render(); },
  plus(t) { const e = ex(t), s = +t.dataset.s; e.log[s] += e.unit === 'sec' ? 5 : 1; save(); render(); },
  ok(t) {
    const b = S.current.blocks[+t.dataset.b], ei = +t.dataset.e, e = b.ex[ei], s = +t.dataset.s;
    if (e.done[s] != null) { e.done[s] = null; save(); render(); return; }
    e.done[s] = e.log[s];
    if (ei < b.ex.length - 1) startRest(15, `מעבר ל: ${b.ex[ei + 1].v}`);
    else if (s < e.target.length - 1 || b.ex.some(x => x.done.some(d => d == null))) startRest(b.rest, 'מנוחה');
    save(); render();
  },
  rest(t) { startRest(+t.dataset.s, 'מנוחה'); },
  'rest-add'() { if (rest) { rest.end += 15000; rest.total += 15; } },
  'rest-skip'() { stopRest(); },
  'skill-done'(t) { const b = S.current.blocks[+t.dataset.b]; b.done = !b.done; save(); render(); },
  'emom-start'(t) { const b = S.current.blocks[+t.dataset.b]; b.startAt = Date.now(); b.roundsDone = 0; lastEmomMin = {}; beep(1320, 0.3); save(); render(); },
  'emom-stop'(t) { const b = S.current.blocks[+t.dataset.b]; b.roundsDone = Math.floor((Date.now() - b.startAt) / 60000); b.stopped = true; save(); render(); },
  spin() {
    const box = $('#wheel'); if (!box || box.dataset.spin) return; box.dataset.spin = 1;
    const pick = FINISHERS[Math.floor(Math.random() * FINISHERS.length)];
    let i = 0, delay = 50;
    const step = () => {
      box.textContent = FINISHERS[i++ % FINISHERS.length].name; beep(500 + (i % 5) * 80, 0.03);
      delay *= 1.12;
      if (delay < 420) setTimeout(step, delay);
      else { box.textContent = pick.name; box.classList.add('pop'); beep(1320, 0.3); setTimeout(() => { S.current.finisher = pick; save(); render(); }, 700); }
    };
    step();
  },
  'fin-done'() { S.current.finisherDone = true; save(); render(); },
  finish() {
    const w = S.current;
    if (w.type === 'BOSS') return completeBoss();
    const any = w.blocks.some(b => (b.ex && b.ex.some(e => e.done.some(d => d != null))) || b.roundsDone > 0 || b.done);
    if (!any) { toast('עוד לא סימנת אף סט 🙂'); return; }
    showModal(`<h2>איך היה?</h2><p class="muted">התשובה קובעת כמה התוכנית עולה בפעם הבאה.</p>
      <button class="fb" data-a="fb" data-v="easy">😎 קל מדי<small>קפיצה של 2 שלבים בתרגילים שסגרת</small></button>
      <button class="fb" data-a="fb" data-v="ok">💪 בדיוק<small>עלייה של שלב אחד</small></button>
      <button class="fb" data-a="fb" data-v="hard">🥵 קשה מאוד<small>נשארים באותו שלב עוד פעם</small></button>`);
  },
  fb(t) { modal.classList.remove('open'); completeWorkout(t.dataset.v); },
  cancel() { if (confirm('לבטל את האימון? ההתקדמות באימון הזה לא תישמר.')) { S.current = null; stopRest(); keepAwake(false); save(); render(); } },
  gtg() {
    const today = dkey(); const g = S.gtg[today] || { sets: 0, reps: gtgTarget().reps };
    g.sets++; S.gtg[today] = g;
    if (g.sets === 5) { addXp(30); confetti(); toast('🛢️ משימת GTG הושלמה! +30 XP'); }
    runChecks(); render(); flush();
  },
  'gtg-undo'() { const g = S.gtg[dkey()]; if (g && g.sets > 0 && g.sets < 5) { g.sets--; save(); render(); } },
  waist() {
    const v = parseFloat($('#waist-in').value);
    if (!(v > 40 && v < 200)) { toast('הזן היקף בס״מ'); return; }
    const today = dkey(); S.waist = S.waist.filter(x => x.date !== today); S.waist.push({ date: today, cm: v });
    S.waist.sort((a, b) => a.date.localeCompare(b.date));
    const wk = weekKey(today); if (!S.waistWeeks[wk]) { S.waistWeeks[wk] = 1; addXp(10); }
    runChecks(); render(); flush(); toast('📏 נשמר');
  },
  photo() { $('#photo-in').click(); },
  async 'photo-del'(t) {
    if (!confirm('למחוק את התמונה?')) return;
    try { if (t.dataset.r && syncOn()) await deleteRemote(t.dataset.r); } catch (e) { toast('לא הצלחתי למחוק מ-GitHub — נסה שוב כשיש אינטרנט'); return; }
    await idb.del(+t.dataset.k); S.photoCount = Math.max(0, S.photoCount - 1); save(); loadPhotos();
  },
  'skill-up'(t) {
    const id = t.dataset.k; const p = S.skills.progress[id] || 0;
    if (p >= SKILLS[id].stages.length) return;
    S.skills.progress[id] = p + 1; addXp(75); confetti(); toast(`${SKILLS[id].icon} שלב הושלם! +75 XP`);
    runChecks(); render(); flush();
  },
  'skill-active'(t) { S.skills.active = t.dataset.k; save(); render(); },
  settings() {
    showModal(`<h2>⚙️ הגדרות</h2>
      <details><summary><b>איך התוכנית עובדת</b></summary><div class="small">
      <p><b>עומס מתקדם:</b> כל תרגיל נמצא בשלב מסוים (סטים × חזרות). סגרת את כל הסטים? עולים שלב. כשהחזרות מגיעות לתקרה — עוברים לווריאציה קשה יותר.</p>
      <p><b>סופרסטים:</b> שני תרגילים לשרירים שונים ברצף. חוסך חצי מזמן המנוחה — ככה נכנס אימון מלא ב-30 דקות.</p>
      <p><b>אימון C (EMOM):</b> הרבה עבודה בזמן קצר = דופק גבוה ושריפת שומן, בלי לאבד שריר.</p>
      <p><b>GTG:</b> סטים קלים לאורך ימי המנוחה מלמדים את מערכת העצבים את התנועה — הדרך המוכחת להעלות מתח מהר.</p>
      <p><b>קרב בוס:</b> כל 9 אימונים (3 שבועות) מבחן מקסימום. התוכנית מתכיילת לפי התוצאות.</p>
      <p><b>הכרס:</b> יורדת בעיקר מתזונה. חלבון בכל ארוחה, גירעון קלורי קטן, שינה וצעדים.</p></div></details>
      ${syncSettingsHtml()}
      <button class="ghost" data-a="boss-now">🐉 קרב בוס עכשיו</button>
      <button class="ghost" data-a="export">⬇ גיבוי נתונים</button>
      <button class="ghost" data-a="import">⬆ שחזור מגיבוי</button><input id="import-in" type="file" accept="application/json" hidden>
      <button class="link danger" data-a="reset">איפוס מלא</button>
      <button class="cta" data-a="close">סגור</button>`);
  },
  'boss-now'() { S.blockCount = BLOCK_LENGTH; save(); closeModal(); S.tab = 'today'; render(); },
  export() {
    const blob = new Blob([JSON.stringify(S)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `training-backup-${dkey()}.json`; a.click();
  },
  import() { $('#import-in').click(); },
  reset() {
    if (!confirm('למחוק את כל ההתקדמות? אי אפשר לבטל.')) return;
    localStorage.removeItem(KEY); S = defaultState(); ensureTracks(); save(); closeModal(); render();
  },
  close() { closeModal(); },
  async 'sync-connect'() {
    const repo = $('#sy-repo').value.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '');
    const token = $('#sy-token').value.trim();
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || !token) { toast('צריך ריפו (שם/ריפו) ומפתח'); return; }
    const btn = $('[data-a="sync-connect"]'); btn.disabled = true; btn.textContent = 'מתחבר…';
    const prev = { ...SY }; SY = { repo, token };
    try {
      const info = await gh('');
      if (!info) throw Object.assign(new Error(), { status: 404 });
      if (!info.private) { SY = prev; toast('⚠️ הריפו הזה ציבורי — הנתונים שלך יהיו גלויים. צור ריפו פרטי.'); btn.disabled = false; btn.textContent = 'חבר'; return; }
      const remote = await pull();
      if (remote && (!S.onboarded || (remote.updatedAt || 0) > (S.updatedAt || 0))) applyRemote(remote);
      else if (S.onboarded) await push();
      saveSY(); await syncPhotos(); SY.last = Date.now(); saveSY(); setSync('ok');
      closeModal(); render(); toast(remote && S.onboarded ? '☁️ מחובר — הנתונים נטענו מ-GitHub' : '☁️ מחובר — מעכשיו כל שינוי נשמר ב-GitHub');
    } catch (e) {
      SY = prev; saveSY(); btn.disabled = false; btn.textContent = 'חבר';
      toast(e.status === 401 ? 'המפתח לא תקין או שפג תוקפו' : e.status === 404 ? 'הריפו לא נמצא, או שלמפתח אין גישה אליו' : e.status === 403 ? 'למפתח אין הרשאת Contents: Read and write' : 'החיבור נכשל — בדוק אינטרנט');
    }
  },
  async 'sync-now'() { await syncNow(true); closeModal(); toast(syncState === 'ok' ? '☁️ מסונכרן' : 'הסנכרון נכשל'); },
  'sync-off'() { if (!confirm('לנתק מ-GitHub? הנתונים יישארו בטלפון ובריפו.')) return; SY = {}; saveSY(); setSync('idle'); closeModal(); },
};

document.addEventListener('click', e => {
  unlockAudio();
  const t = e.target.closest('[data-a]'); if (!t) return;
  const fn = A[t.dataset.a]; if (fn) fn(t, e);
});
document.addEventListener('touchstart', unlockAudio, { passive: true });
document.addEventListener('input', e => {
  if (e.target.dataset.c === 'boss' && S.current && S.current.boss) { S.current.boss[e.target.dataset.k] = e.target.value; save(); }
});
document.addEventListener('change', async e => {
  if (e.target.id === 'photo-in' && e.target.files[0]) {
    try {
      const blob = await compress(e.target.files[0]);
      await idb.add({ date: dkey(), blob });
      S.photoCount++;
      const wk = weekKey(dkey()); if (!S.photoWeeks[wk]) { S.photoWeeks[wk] = 1; addXp(20); }
      runChecks(); render(); flush(); toast('📸 נשמר');
    } catch (err) { toast('שמירת התמונה נכשלה'); }
    e.target.value = '';
  }
  if (e.target.id === 'import-in' && e.target.files[0]) {
    try {
      const data = JSON.parse(await e.target.files[0].text());
      if (!data || !Array.isArray(data.history)) throw 0;
      S = Object.assign(defaultState(), data); ensureTracks(); save(); closeModal(); render(); toast('✅ שוחזר');
    } catch (err) { toast('קובץ גיבוי לא תקין'); }
  }
});
modal.addEventListener('click', e => { if (e.target === modal && !celebrations.length) closeModal(); });

if (S.current) keepAwake(true);
setSync('idle');
render();
if (syncOn()) syncNow();
showIntro();
flush();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
