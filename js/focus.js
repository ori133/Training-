'use strict';
// ============================================================
//  מצב אימון — מסך מלא, דבר אחד בכל פעם, כמעט בלי לגעת בטלפון
//  סט = נגיעה אחת. מנוחה, חימום, החזקות, EMOM וסקיל רצים לבד.
// ============================================================
const FX = document.getElementById('focus');
const fxMem = { beepAt: null, said10: null, key: null };

// ---------- קול ----------
// ההקראה בקול בוטלה לבקשתך. נשארו רק הצפצופים. speak נשאר ריק כדי שלא יהיה צורך לגעת בשאר הקוד.
function speak() {}
function unlockVoice() {}
const sayName = v => v.replace(/\((לכל [^)]*)\)/, '$1').replace(/\s*\([^)]*\)/g, '').replace(/—/g, ',');

// ---------- בניית רצף הצעדים ----------
function buildFlow(w) {
  const f = [];
  WARMUP.forEach((x, i) => f.push({ k: 'warm', i, after: i < WARMUP.length - 1 ? 5 : 20 }));
  if (w.type === 'BOSS') {
    ['pull', 'dip', 'push'].forEach((key, i) => f.push({ k: 'test', key, after: i < 2 ? 180 : 0 }));
  } else {
    w.blocks.forEach((b, bi) => {
      if (b.type === 'superset') {
        const n = Math.max(...b.ex.map(e => e.target.length));
        for (let s = 0; s < n; s++) b.ex.forEach((e, ei) => { if (s < e.target.length) f.push({ k: 'set', b: bi, e: ei, s }); });
      } else if (b.type === 'skill') f.push({ k: 'skill', b: bi });
      else if (b.type === 'emom') f.push({ k: 'emom', b: bi });
    });
    f.push({ k: 'fin' });
  }
  f.push({ k: 'end' });
  // זמני מנוחה אחרי כל צעד
  for (let i = 0; i < f.length - 1; i++) {
    const a = f[i], n = f[i + 1];
    if (a.k === 'warm' || a.k === 'test') continue;
    if (n.k === 'end') { a.after = 0; continue; }
    if (a.k === 'set' && n.k === 'set' && n.b === a.b) a.after = n.s === a.s ? 15 : w.blocks[a.b].rest;
    else a.after = n.k === 'fin' ? 45 : 60;
  }
  return f;
}

// ---------- עזרים ----------
const fxStep = () => S.current.flow[S.current.pos];
const fxEx = st => S.current.blocks[st.b].ex[st.e];
const isHold = st => st.k === 'set' && fxEx(st).unit === 'sec';
function stepLabel(st) {
  const w = S.current;
  if (!st) return '';
  if (st.k === 'warm') return { title: 'חימום: ' + WARMUP[st.i].n, say: 'חימום. ' + sayName(WARMUP[st.i].n) };
  if (st.k === 'set') {
    const e = fxEx(st), u = e.unit === 'sec' ? 'שניות' : 'חזרות';
    return { title: `${e.v} — ${e.target[st.s]} ${u}`, say: `סט ${st.s + 1} מתוך ${e.target.length}. ${sayName(e.v)}. ${e.target[st.s]} ${u}` };
  }
  if (st.k === 'skill') { const sk = SKILLS[w.blocks[st.b].skill]; return { title: 'סקיל: ' + sk.name, say: `בלוק סקיל, ${sk.name}. 6 דקות.` }; }
  if (st.k === 'emom') return { title: 'EMOM — 16 דקות', say: 'אמום, 16 דקות. כל דקה תחנה חדשה.' };
  if (st.k === 'fin') return { title: 'פיניש: ' + w.finisher.name, say: 'פיניש. ' + w.finisher.name };
  if (st.k === 'test') { const nm = { pull: 'מתח', dip: 'מקבילים', push: 'שכיבות סמיכה' }[st.key]; return { title: 'מבחן: ' + nm, say: `מבחן ${nm}. סט אחד מקסימלי, רק חזרות נקיות.` }; }
  return { title: 'סוף', say: '' };
}

// ---------- מעברים ----------
function fxEnter(silent) {
  const w = S.current, st = fxStep(), now = Date.now();
  w.phase = 'go'; w.pick = null; w.t0 = now; fxMem.beepAt = null; fxMem.said10 = null;
  if (st.k === 'set' && isHold(st)) w.t0 = now + 5000; // 5 שניות להיכנס לתנוחה
  if (st.k === 'emom') { const b = w.blocks[st.b]; b.startAt = now + 5000; b.roundsDone = 0; b.stopped = false; lastEmomMin = {}; }
  if (st.k === 'test' && w.boss[st.key] === '') w.boss[st.key] = Math.max(0, ...S.tests.map(t => t[st.key] || 0));
  if (st.k === 'end') speak(w.type === 'BOSS' ? 'סיימת את הקרב. בדוק את המספרים ושמור.' : 'כל הכבוד! סיימת את האימון. איך היה?');
  else if (!silent) speak(stepLabel(st).say + (isHold(st) || st.k === 'emom' ? '. מתכוננים' : ''));
  save(); renderFocus();
}
function fxNext() {
  const w = S.current, st = fxStep();
  const after = st.after || 0;
  if (st.k === 'warm' && w.flow[w.pos + 1].k !== 'warm') w.warmupDone = true;
  w.pos = Math.min(w.pos + 1, w.flow.length - 1);
  if (after > 0 && fxStep().k !== 'end') {
    w.phase = 'rest'; w.restEnd = Date.now() + after * 1000; w.restTotal = after; w.pick = null;
    fxMem.beepAt = null; fxMem.said10 = null;
    const nx = stepLabel(fxStep());
    speak(st.k === 'warm' && fxStep().k === 'warm' ? 'הבא: ' + nx.say.replace(/^חימום\. /, '')
      : `${after >= 60 ? 'מנוחה ' + (after % 60 ? after + ' שניות' : after / 60 === 1 ? 'דקה' : after / 60 + ' דקות') : 'מנוחה קצרה'}. הבא: ${nx.say}`);
    save(); renderFocus();
  } else fxEnter();
}
function fxClear(st) {
  const w = S.current;
  if (st.k === 'set') fxEx(st).done[st.s] = null;
  if (st.k === 'fin') w.finisherDone = false;
  if (st.k === 'skill') w.blocks[st.b].done = false;
  if (st.k === 'emom') { const b = w.blocks[st.b]; b.startAt = 0; b.roundsDone = 0; b.stopped = false; }
}
function fxBack() {
  const w = S.current;
  if (w.phase !== 'rest') { if (w.pos === 0) return; w.pos--; }
  else if (w.pos > 0) w.pos--;
  fxClear(fxStep()); fxEnter();
}
function setDone(st, val) {
  const e = fxEx(st); e.done[st.s] = val; e.log[st.s] = val;
}

// ---------- טיק (נקרא 4 פעמים בשנייה) ----------
function fxTick(now) {
  const w = S.current;
  if (!w || !w.flow || w.list) return;
  const st = fxStep(), $f = id => document.getElementById(id);
  const countBeeps = left => { if (left <= 3 && left > 0 && fxMem.beepAt !== left) { fxMem.beepAt = left; beep(660, 0.08); } };
  if (w.phase === 'rest') {
    const left = Math.ceil((w.restEnd - now) / 1000);
    if (left <= 0) { beepEnd(); fxEnter(); return; }
    if (left === 10 && w.restTotal > 20 && fxMem.said10 !== w.pos) { fxMem.said10 = w.pos; speak('עוד 10 שניות'); }
    countBeeps(left);
    if ($f('fx-time')) $f('fx-time').textContent = mmss(left);
    ring(left / w.restTotal);
  } else if (st.k === 'warm') {
    const left = Math.ceil((w.t0 + WARMUP[st.i].sec * 1000 - now) / 1000);
    if (left <= 0) { beep(1320, 0.25); fxNext(); return; }
    countBeeps(left);
    if ($f('fx-time')) $f('fx-time').textContent = mmss(left);
    ring(left / WARMUP[st.i].sec);
  } else if (isHold(st)) {
    const e = fxEx(st), tgt = e.target[st.s];
    if (now < w.t0) {
      const left = Math.ceil((w.t0 - now) / 1000);
      countBeeps(left);
      if ($f('fx-time')) $f('fx-time').textContent = left;
      if ($f('fx-sub')) $f('fx-sub').textContent = 'נכנסים לתנוחה…';
      ring(1);
      return;
    }
    if (fxMem.key !== 'go' + w.pos) { fxMem.key = 'go' + w.pos; beep(1320, 0.3); if ($f('fx-sub')) $f('fx-sub').textContent = 'מחזיקים! נגיעה = נגמר הכוח'; }
    const left = Math.ceil((w.t0 + tgt * 1000 - now) / 1000);
    if (left <= 0) { setDone(st, tgt); beepEnd(); fxNext(); return; }
    countBeeps(left);
    if ($f('fx-time')) $f('fx-time').textContent = mmss(left);
    ring(left / tgt);
  } else if (st.k === 'skill') {
    const b = w.blocks[st.b], tot = (b.minutes || 6) * 60;
    const left = Math.ceil((w.t0 + tot * 1000 - now) / 1000);
    if (left <= 0) { b.done = true; beepEnd(); fxNext(); return; }
    if ($f('fx-time')) $f('fx-time').textContent = mmss(left);
    ring(left / tot);
  } else if (st.k === 'emom') {
    const b = w.blocks[st.b];
    if (now < b.startAt) {
      const left = Math.ceil((b.startAt - now) / 1000);
      countBeeps(left);
      if ($f('fx-time')) $f('fx-time').textContent = left;
      return;
    }
    if (b.stopped || b.roundsDone >= b.minutes) { fxNext(); return; }
    const e = (now - b.startAt) / 1000, m = Math.floor(e / 60);
    const s = b.stations[m % b.stations.length], nx = b.stations[(m + 1) % b.stations.length];
    if ($f('fx-time')) $f('fx-time').textContent = 60 - Math.floor(e % 60);
    if ($f('fx-big')) $f('fx-big').textContent = `${s.name} — ${s.reps}`;
    if ($f('fx-sub')) $f('fx-sub').textContent = `דקה ${Math.min(m + 1, b.minutes)} מתוך ${b.minutes} · הבא: ${nx.name} ${nx.reps}`;
    if (fxMem.key !== 'em' + m) { fxMem.key = 'em' + m; speak(`${s.name}, ${String(s.reps).replace('שנ׳', 'שניות')}`); }
    ring(1 - (e % 60) / 60);
  }
  if ($f('fx-el')) $f('fx-el').textContent = mmss(Math.floor((now - w.started) / 1000));
}
function ring(frac) {
  const r = document.getElementById('fx-ring');
  if (r) r.style.strokeDashoffset = String(Math.round(578 * (1 - Math.max(0, Math.min(1, frac)))));
}

// ---------- רינדור ----------
const ringSvg = (inner) => `<div class="fx-clock"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="92" class="trk"/>
  <circle id="fx-ring" cx="100" cy="100" r="92" class="prg" style="stroke-dashoffset:0"/></svg><div class="fx-clock-in">${inner}</div></div>`;

function renderFocus() {
  const w = S.current;
  const on = !!(w && w.flow && !w.list && S.onboarded);
  document.body.classList.toggle('fx-on', on);
  FX.classList.toggle('open', on);
  if (!on) { FX.innerHTML = ''; return; }
  const st = fxStep(), L = stepLabel(st);
  const pct = Math.round((w.pos / (w.flow.length - 1)) * 100);
  let body = '', foot = '';

  if (w.pick) {
    body = pickerHtml();
  } else if (w.phase === 'rest') {
    const nx = stepLabel(st);
    body = `<div class="fx-body rest"><div class="fx-kicker">${w.restTotal <= 20 ? 'מעבר' : 'מנוחה'}</div>
      ${ringSvg(`<div id="fx-time" class="fx-time">${mmss(Math.ceil((w.restEnd - Date.now()) / 1000))}</div>`)}
      <div class="fx-next"><span>הבא</span><b>${nx.title}</b></div></div>`;
    foot = `<button class="fx-btn" data-a="fx-back">${ic('undo')}חזרה</button>
      <button class="fx-btn" data-a="fx-add">${ic('plus')}15 שנ׳</button>
      <button class="fx-btn" data-a="fx-skip">${ic('skip')}דלג</button>`;
  } else if (st.k === 'warm') {
    const x = WARMUP[st.i];
    body = `<button class="fx-body tap" data-a="fx-done"><div class="fx-kicker">${ic('flame')} חימום ${st.i + 1}/${WARMUP.length}</div>
      <div class="fx-big">${x.n}</div>${x.cue ? `<div class="fx-cue">${x.cue}</div>` : ''}
      ${ringSvg(`<div id="fx-time" class="fx-time">${mmss(x.sec)}</div>`)}
      <div class="fx-hint">עובר לבד · נגיעה = הבא</div></button>`;
    foot = `<button class="fx-btn" data-a="fx-back" ${w.pos ? '' : 'disabled'}>${ic('undo')}חזרה</button>
      <button class="fx-btn" data-a="fx-skipwarm">${ic('skip')}דלג על החימום</button>`;
  } else if (st.k === 'set') {
    const e = fxEx(st), b = w.blocks[st.b], tgt = e.target[st.s];
    const dots = e.target.map((_, i) => `<i class="${e.done[i] != null ? 'on' : i === st.s ? 'cur' : ''}"></i>`).join('');
    const head = `<div class="fx-kicker">${b.title.replace(/ — .*/, '')} · תרגיל ${st.e + 1}</div>
      <div class="fx-big">${e.v}</div><div class="fx-dots">${dots}</div>`;
    if (e.unit === 'sec') {
      body = `<button class="fx-body tap" data-a="fx-holdstop">${head}
        ${ringSvg(`<div id="fx-time" class="fx-time">${mmss(tgt)}</div><div class="fx-unit">שניות</div>`)}
        <div id="fx-sub" class="fx-hint">נכנסים לתנוחה…</div><div class="fx-cue">${e.cue}</div></button>`;
    } else {
      body = `<button class="fx-body tap" data-a="fx-done">${head}
        <div class="fx-reps"><b>${tgt}</b><span>חזרות</span></div>
        <div class="fx-cue">${e.cue}</div>
        <div class="fx-press">${ic('check')}<span>גע כשסיימת את הסט</span></div></button>`;
      foot = `<button class="fx-btn" data-a="fx-back" ${w.pos ? '' : 'disabled'}>${ic('undo')}חזרה</button>
        <button class="fx-btn" data-a="fx-less">${ic('minus')}עשיתי פחות</button>
        <button class="fx-btn" data-a="fx-more">${ic('plus')}עשיתי יותר</button>`;
    }
    if (e.unit === 'sec') foot = `<button class="fx-btn" data-a="fx-back">${ic('undo')}חזרה</button>`;
  } else if (st.k === 'skill') {
    const b = w.blocks[st.b], sk = SKILLS[b.skill];
    body = `<button class="fx-body tap" data-a="fx-done"><div class="fx-kicker">${ic(sk.icon)} בלוק סקיל · ${sk.name}</div>
      <div class="fx-big">${b.stage}</div>
      ${ringSvg(`<div id="fx-time" class="fx-time">${mmss((b.minutes || 6) * 60)}</div>`)}
      <div class="fx-cue">נסיונות קצרים ואיכותיים, 60–90 שניות מנוחה ביניהם. לא עד כישלון.</div>
      <div class="fx-hint">נגמר לבד · נגיעה = סיימתי מוקדם</div></button>`;
    foot = `<button class="fx-btn" data-a="fx-back">${ic('undo')}חזרה</button>`;
  } else if (st.k === 'emom') {
    const b = w.blocks[st.b];
    body = `<div class="fx-body"><div class="fx-kicker">${ic('timer')} EMOM · 16 דקות</div>
      <div id="fx-big" class="fx-big">מתכוננים…</div>
      ${ringSvg(`<div id="fx-time" class="fx-time">5</div>`)}
      <div id="fx-sub" class="fx-hint">${b.stations.map(s => `${s.name} ${s.reps}`).join(' · ')}</div></div>`;
    foot = `<button class="fx-btn" data-a="fx-back">${ic('undo')}חזרה</button>
      <button class="fx-btn" data-a="fx-emomstop">${ic('stop')}עצור כאן</button>`;
  } else if (st.k === 'fin') {
    body = `<button class="fx-body tap" data-a="fx-done"><div class="fx-kicker">${ic('wheel')} פיניש</div>
      <div class="fx-big">${w.finisher.name}</div><div class="fx-cue lg">${w.finisher.desc}</div>
      <div class="fx-press">${ic('check')}<span>גע כשסיימת</span></div></button>`;
    foot = `<button class="fx-btn" data-a="fx-back">${ic('undo')}חזרה</button>
      <button class="fx-btn" data-a="fx-finskip">${ic('skip')}בלי פיניש היום</button>`;
  } else if (st.k === 'test') {
    const v = +w.boss[st.key] || 0, best = Math.max(0, ...S.tests.map(t => t[st.key] || 0));
    body = `<div class="fx-body"><div class="fx-kicker">${ic('boss')} ${L.title}</div>
      <div class="fx-cue">סט אחד מקסימלי. אחרי הסט מכוונים את המספר ושומרים. שיא קודם: ${best}</div>
      <div class="fx-stepper"><button data-a="fx-tdec">${ic('minus')}</button><b>${v}</b><button data-a="fx-tinc">${ic('plus')}</button></div>
      <button class="fx-save" data-a="fx-tsave">${ic('check')} שמור</button></div>`;
    foot = `<button class="fx-btn" data-a="fx-back" ${w.pos ? '' : 'disabled'}>${ic('undo')}חזרה</button>`;
  } else if (st.k === 'end') {
    body = endHtml();
  }

  FX.innerHTML = `<div class="fx-top">
      <button class="fx-ic" data-a="fx-list" aria-label="רשימה מלאה">${ic('list')}</button>
      <div class="fx-title">${w.type === 'BOSS' ? 'קרב בוס' : WORKOUTS[w.type].name.replace(/ — .*/, '')}<span id="fx-el">${mmss(Math.floor((Date.now() - w.started) / 1000))}</span></div>
      <span class="fx-ic ghost-ic"></span></div>
    <div class="fx-prog"><i style="width:${pct}%"></i></div>
    ${body}<div class="fx-foot">${foot}</div>`;
  fxTick(Date.now());
}

function pickerHtml() {
  const w = S.current, p = w.pick, e = w.blocks[p.b].ex[p.e], tgt = e.target[p.s];
  const sec = e.unit === 'sec';
  let vals = [];
  if (sec) for (let v = 0; v <= tgt + 30; v += 5) vals.push(v);
  else if (p.more) for (let v = tgt + 1; v <= tgt + 15; v++) vals.push(v);
  else for (let v = 0; v <= (p.fix ? tgt + 8 : tgt - 1); v++) vals.push(v);
  return `<div class="fx-body pick"><div class="fx-kicker">${e.v} · סט ${p.s + 1}</div>
    <div class="fx-big">${p.more ? 'כמה עשית?' : p.fix ? 'כמה עשית בסט הזה?' : 'כמה הספקת?'}</div>
    <div class="fx-grid">${vals.map(v => `<button class="${v === tgt ? 'tgt' : ''}" data-a="fx-pickv" data-v="${v}">${v}</button>`).join('')}</div>
    <button class="fx-btn wide" data-a="fx-pickx">ביטול</button></div>`;
}

function endHtml() {
  const w = S.current;
  if (w.type === 'BOSS') {
    const row = (k, n) => `<div class="fx-sum"><b>${n}</b><div class="fx-stepper mini"><button data-a="fx-bdec" data-k="${k}">${ic('minus')}</button><b>${+w.boss[k] || 0}</b><button data-a="fx-binc" data-k="${k}">${ic('plus')}</button></div></div>`;
    return `<div class="fx-body end"><div class="fx-kicker">${ic('flag')} הקרב נגמר</div><div class="fx-big">התוצאות שלך</div>
      ${row('pull', 'מתח')}${row('dip', 'מקבילים')}${row('push', 'שכיבות סמיכה')}
      <button class="fx-save" data-a="finish">${ic('trophy')} סיים קרב</button></div>`;
  }
  let rows = '';
  w.blocks.forEach((b, bi) => {
    if (b.type !== 'superset') return;
    b.ex.forEach((e, ei) => {
      rows += `<div class="fx-sum"><b>${e.v}</b><div class="fx-chips">${e.target.map((t, si) => {
        const d = e.done[si];
        return `<button class="${d == null ? 'no' : d >= t ? 'ok' : 'part'}" data-a="fx-fix" data-b="${bi}" data-e="${ei}" data-s="${si}">${d == null ? '–' : d}<small>/${t}</small></button>`;
      }).join('')}</div></div>`;
    });
  });
  return `<div class="fx-body end"><div class="fx-kicker">${ic('flag')} סיימת!</div><div class="fx-big">איך היה?</div>
    ${rows ? `<div class="fx-cue">טעית במספר? נוגעים בו ומתקנים.</div>${rows}` : ''}
    <div class="fx-fb">
      <button data-a="fb" data-v="easy">${ic('face-cool')}<b>קל מדי</b><small>קפיצה של 2 שלבים</small></button>
      <button data-a="fb" data-v="ok">${ic('face-ok')}<b>בדיוק</b><small>עלייה של שלב</small></button>
      <button data-a="fb" data-v="hard">${ic('face-hard')}<b>קשה מאוד</b><small>נשארים בשלב</small></button></div></div>`;
}

// ---------- פעולות ----------
Object.assign(A, {
  'fx-done'() {
    const w = S.current, st = fxStep();
    if (st.k === 'set') setDone(st, fxEx(st).target[st.s]);
    if (st.k === 'skill') w.blocks[st.b].done = true;
    if (st.k === 'fin') w.finisherDone = true;
    beep(1100, 0.12); fxNext();
  },
  'fx-holdstop'() {
    const w = S.current, st = fxStep(), now = Date.now();
    if (now < w.t0) { w.t0 = now; save(); return; } // נגיעה בזמן ההכנה = מתחילים עכשיו
    const e = fxEx(st), held = Math.min(e.target[st.s], Math.max(0, Math.round((now - w.t0) / 1000)));
    setDone(st, held); beep(1100, 0.12); fxNext();
  },
  'fx-less'() { const st = fxStep(); S.current.pick = { b: st.b, e: st.e, s: st.s }; renderFocus(); },
  'fx-more'() { const st = fxStep(); S.current.pick = { b: st.b, e: st.e, s: st.s, more: true }; renderFocus(); },
  'fx-fix'(t) { S.current.pick = { b: +t.dataset.b, e: +t.dataset.e, s: +t.dataset.s, fix: true }; renderFocus(); },
  'fx-pickx'() { S.current.pick = null; renderFocus(); },
  'fx-pickv'(t) {
    const w = S.current, p = w.pick, e = w.blocks[p.b].ex[p.e], v = +t.dataset.v;
    e.done[p.s] = v; e.log[p.s] = v; w.pick = null;
    if (p.fix) { save(); renderFocus(); return; }
    beep(1100, 0.12); fxNext();
  },
  'fx-back'() { fxBack(); },
  'fx-skip'() { fxEnter(); },
  'fx-add'() { const w = S.current; w.restEnd += 15000; w.restTotal += 15; save(); fxTick(Date.now()); },
  'fx-skipwarm'() {
    const w = S.current; w.warmupDone = true;
    while (w.flow[w.pos].k === 'warm') w.pos++;
    fxEnter();
  },
  'fx-finskip'() { S.current.finisherDone = false; fxNext(); },
  'fx-emomstop'() {
    const b = S.current.blocks[fxStep().b];
    b.roundsDone = b.startAt && Date.now() > b.startAt ? Math.floor((Date.now() - b.startAt) / 60000) : 0; b.stopped = true; fxNext();
  },
  'fx-tinc'() { const k = fxStep().key, w = S.current; w.boss[k] = (+w.boss[k] || 0) + 1; save(); renderFocus(); },
  'fx-tdec'() { const k = fxStep().key, w = S.current; w.boss[k] = Math.max(0, (+w.boss[k] || 0) - 1); save(); renderFocus(); },
  'fx-binc'(t) { const w = S.current; w.boss[t.dataset.k] = (+w.boss[t.dataset.k] || 0) + 1; save(); renderFocus(); },
  'fx-bdec'(t) { const w = S.current; w.boss[t.dataset.k] = Math.max(0, (+w.boss[t.dataset.k] || 0) - 1); save(); renderFocus(); },
  'fx-tsave'() { beep(1100, 0.12); fxNext(); },
  'fx-list'() { S.current.list = true; save(); render(); scrollTo(0, 0); },
  'fx-open'() {
    const w = S.current; w.list = false;
    if (w.type !== 'BOSS' && !w.finisher) w.finisher = FINISHERS[Math.floor(Math.random() * FINISHERS.length)];
    if (!w.flow) { w.flow = buildFlow(w); w.pos = 0; }
    // דילוג על סטים שכבר סומנו ברשימה
    while (w.flow[w.pos].k === 'set' && fxEx(w.flow[w.pos]).done[w.flow[w.pos].s] != null) w.pos++;
    if (w.flow[w.pos].k === 'warm' && w.warmupDone) while (w.flow[w.pos].k === 'warm') w.pos++;
    unlockVoice(); fxEnter();
  },
});

// חזרה לאפליקציה: אם המנוחה נגמרה בזמן שהמסך היה סגור — ממשיכים מאיפה שצריך
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && S.current && S.current.flow && !S.current.list) fxTick(Date.now());
});
