'use strict';
// ============================================================
//  סנכרון לריפו פרטי ב-GitHub
//  progress.json — כל ההתקדמות | photos/ — תמונות לפני/אחרי
//  המפתח נשמר רק בטלפון (localStorage), לא בקוד ולא בריפו.
// ============================================================
const SK = 'pt_sync_v1';
let SY = (() => { try { return JSON.parse(localStorage.getItem(SK)) || {}; } catch (e) { return {}; } })();
const saveSY = () => localStorage.setItem(SK, JSON.stringify(SY));
const syncOn = () => !!(SY.token && SY.repo);
let syncState = 'idle', dirty = false, pushTimer = null, chain = Promise.resolve();

function setSync(st) {
  syncState = st;
  const el = document.getElementById('sync'); if (!el) return;
  el.textContent = !syncOn() ? '' : { ok: '☁️✓', busy: '☁️…', err: '☁️⚠️', off: '☁️✕', idle: '☁️' }[st] || '☁️';
}
const serial = fn => (chain = chain.then(fn).catch(() => {}));

async function ghFetch(path, opts = {}, accept = 'application/vnd.github+json') {
  const r = await fetch(`https://api.github.com/repos/${SY.repo}${path}`, {
    ...opts, cache: 'no-store',
    headers: { Authorization: `Bearer ${SY.token}`, Accept: accept, 'X-GitHub-Api-Version': '2022-11-28',
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}) },
  });
  if (r.status === 404) return null;
  if (!r.ok) { const e = new Error('github ' + r.status); e.status = r.status; throw e; }
  return r;
}
async function gh(path, opts) { const r = await ghFetch(path, opts); return r ? (r.status === 204 ? {} : r.json()) : null; }

const b64enc = str => {
  const b = new TextEncoder().encode(str); let bin = '';
  for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return btoa(bin);
};
const b64dec = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, '')), c => c.charCodeAt(0)));
const blobB64 = blob => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.onerror = rej; fr.readAsDataURL(blob); });

// ---------- התקדמות ----------
async function pull() {
  const f = await gh('/contents/progress.json');
  if (!f) { SY.sha = null; saveSY(); return null; }
  SY.sha = f.sha; saveSY();
  return JSON.parse(b64dec(f.content));
}
function applyRemote(r) {
  const tab = S.tab;
  S = Object.assign(defaultState(), r); S.tab = tab; ensureTracks();
  localStorage.setItem(KEY, JSON.stringify(S));
  render();
}
async function push() {
  const body = { message: `התקדמות ${dkey()}`, content: b64enc(JSON.stringify(S, null, 1)) };
  if (SY.sha) body.sha = SY.sha;
  try {
    const r = await gh('/contents/progress.json', { method: 'PUT', body: JSON.stringify(body) });
    SY.sha = r.content.sha; saveSY();
  } catch (e) {
    if (e.status !== 409 && e.status !== 422) throw e;
    // הקובץ השתנה ממכשיר אחר — לוקחים את החדש מביניהם
    const remote = await pull();
    if (remote && (remote.updatedAt || 0) > (S.updatedAt || 0)) { applyRemote(remote); return; }
    body.sha = SY.sha || undefined;
    const r = await gh('/contents/progress.json', { method: 'PUT', body: JSON.stringify(body) });
    SY.sha = r.content.sha; saveSY();
  }
}

// ---------- תמונות ----------
async function syncPhotos() {
  const list = (await gh('/contents/photos')) || [];
  const remote = new Set(list.filter(f => f.type === 'file').map(f => f.path));
  const local = await idb.all();
  const have = new Set(local.map(p => p.remote).filter(Boolean));
  for (const p of local) {
    if (p.remote && remote.has(p.remote)) continue;
    const path = p.remote || `photos/${p.date}_${Date.now()}_${p.id}.jpg`;
    await gh('/contents/' + path, { method: 'PUT', body: JSON.stringify({ message: `תמונה ${p.date}`, content: await blobB64(p.blob) }) });
    p.remote = path; await idb.update(p);
  }
  let added = 0;
  for (const path of remote) {
    if (have.has(path)) continue;
    const r = await ghFetch('/contents/' + path, {}, 'application/vnd.github.raw+json');
    if (!r) continue;
    const date = (path.match(/photos\/(\d{4}-\d{2}-\d{2})/) || [])[1] || dkey();
    await idb.add({ date, blob: await r.blob(), remote: path }); added++;
  }
  if (added && S.tab === 'progress') loadPhotos();
}
async function deleteRemote(path) {
  const f = await gh('/contents/' + path);
  if (f) await gh('/contents/' + path, { method: 'DELETE', body: JSON.stringify({ message: 'מחיקת תמונה', sha: f.sha }) });
}

// ---------- תזמון ----------
function schedulePush() {
  if (!syncOn()) return;
  dirty = true; setSync('idle');
  clearTimeout(pushTimer); pushTimer = setTimeout(pushNow, 8000);
}
function pushNow() {
  clearTimeout(pushTimer);
  return serial(async () => {
    if (!syncOn() || !dirty) return;
    if (!navigator.onLine) { setSync('off'); return; }
    setSync('busy');
    try { dirty = false; await push(); await syncPhotos(); SY.last = Date.now(); saveSY(); setSync('ok'); }
    catch (e) { dirty = true; setSync(e.status === 401 ? 'err' : navigator.onLine ? 'err' : 'off'); }
  });
}
function syncNow() {
  return serial(async () => {
    if (!syncOn()) return;
    if (!navigator.onLine) { setSync('off'); return; }
    setSync('busy');
    try {
      const remote = await pull();
      if (remote && (remote.updatedAt || 0) > (S.updatedAt || 0)) applyRemote(remote);
      else if (!remote || dirty || (S.updatedAt || 0) > (remote.updatedAt || 0)) await push();
      dirty = false;
      await syncPhotos();
      SY.last = Date.now(); saveSY(); setSync('ok');
    } catch (e) { setSync('err'); }
  });
}
window.addEventListener('online', () => (dirty ? pushNow() : syncNow()));
document.addEventListener('visibilitychange', () => {
  if (!syncOn()) return;
  if (document.visibilityState === 'hidden') pushNow(); else syncNow();
});

function syncSettingsHtml() {
  if (syncOn()) {
    return `<div class="sync-box"><h3>☁️ שמירה ב-GitHub</h3>
      <p class="ok-text">מחובר ל-${SY.repo}</p>
      <p class="muted small">כל שינוי נשמר אוטומטית תוך כמה שניות. סנכרון אחרון: ${SY.last ? new Date(SY.last).toLocaleString('he-IL') : '—'}</p>
      <button class="ghost" data-a="sync-now">סנכרן עכשיו</button><button class="link" data-a="sync-off">נתק</button></div>`;
  }
  return `<div class="sync-box"><h3>☁️ שמירה ב-GitHub</h3>
    <p class="muted small">ההתקדמות והתמונות יישמרו אוטומטית בריפו פרטי שלך.</p>
    <label>ריפו פרטי<input id="sy-repo" type="text" dir="ltr" value="ori133/training-data" autocapitalize="off" autocorrect="off"></label>
    <label>מפתח (token)<input id="sy-token" type="password" dir="ltr" placeholder="github_pat_..." autocapitalize="off" autocorrect="off"></label>
    <button class="cta" data-a="sync-connect">חבר</button></div>`;
}
