'use strict';
// ============================================================
//  סרטון מוטיבציה בכל פתיחה של האתר
//  הסרטון נמצא רק בריפו הפרטי (motivation/intro.mp4), לא באתר הציבורי.
//  הוא מופיע רק בטלפון שמחובר לריפו הפרטי (הגדרות ⚙️ ← שמירה ב-GitHub).
//  נגיעה במסך סוגרת אותו. הוא נשמר בטלפון כדי שייפתח מהר וגם בלי אינטרנט.
// ============================================================
const INTRO_PATH = 'motivation/intro.mp4';
const INTRO_CACHE = 'intro-video';
const INTRO_AGAIN_MS = 10 * 60 * 1000; // חזרה לאפליקציה אחרי 10 דקות ברקע = כניסה חדשה
let introEl = null, introHiddenAt = 0;

async function introBlob() {
  if (!syncOn()) return null;
  const cache = await caches.open(INTRO_CACHE).catch(() => null);
  const key = `/__intro/${SY.repo}`;
  const hit = cache ? await cache.match(key) : null;
  // בודקים ברקע אם הסרטון בריפו התעדכן, ומורידים את החדש לפעם הבאה
  const refresh = (async () => {
    if (!navigator.onLine) return null;
    const meta = await gh('/contents/' + INTRO_PATH);
    if (!meta) { if (cache) await cache.delete(key); return null; }
    if (hit && hit.headers.get('x-sha') === meta.sha) return null;
    const r = await ghFetch('/contents/' + INTRO_PATH, {}, 'application/vnd.github.raw+json');
    if (!r) return null;
    // אייפון מנגן רק אם סוג הקובץ מסומן כווידאו (GitHub מחזיר סוג כללי)
    const blob = new Blob([await r.blob()], { type: 'video/mp4' });
    if (cache) await cache.put(key, new Response(blob, { headers: { 'Content-Type': 'video/mp4', 'x-sha': meta.sha } }));
    return blob;
  })().catch(() => null);
  return hit ? new Blob([await hit.blob()], { type: 'video/mp4' }) : refresh;
}

// אלמנט וידאו אחד לכל הביקור: אחרי הנגיעה הראשונה הדפדפן מרשה לו לנגן עם סאונד בפעמים הבאות
let introVid = null, introUrl = null, introUnlocked = false;
function introVideo() {
  if (introVid) return introVid;
  introVid = document.createElement('video');
  introVid.setAttribute('playsinline', ''); introVid.setAttribute('webkit-playsinline', '');
  introVid.preload = 'auto';
  introVid.addEventListener('ended', closeIntro);
  return introVid;
}
// "פותח" את הסאונד בתוך נגיעה של המשתמש, בשקט, כדי שבכניסה הבאה הסרטון יתחיל ישר עם סאונד
function unlockIntroSound(e) {
  if (introUnlocked || !introVid || !introVid.src) return;
  if (e && e.target.closest && e.target.closest('.intro-snd')) return;
  const v = introVid, open = !!introEl, t = v.currentTime;
  if (v.duration) v.currentTime = Math.max(0, v.duration - 0.05); // סוף הסרטון שקט
  v.muted = false;
  v.play().then(() => { v.pause(); if (!open) v.currentTime = t; introUnlocked = true; }).catch(() => {});
}
document.addEventListener('pointerdown', unlockIntroSound, true);

async function showIntro() {
  if (introEl || !syncOn()) return;
  const el = document.createElement('div');
  el.id = 'intro';
  el.innerHTML = `<div class="intro-load">טוען…</div>
    <div class="intro-hint">נגיעה במסך כדי להמשיך</div>
    <button class="intro-snd" aria-label="סאונד"></button>`;
  const v = introVideo(), btn = el.querySelector('.intro-snd');
  el.prepend(v);
  document.body.appendChild(el);
  introEl = el;
  const upd = () => { btn.textContent = v.muted ? '🔇' : '🔊'; btn.style.display = v.muted ? '' : 'none'; };
  el.addEventListener('click', e => {
    if (e.target.closest('.intro-snd')) { v.muted = false; upd(); v.play().catch(() => {}); return; }
    closeIntro();
  });

  if (!introUrl) {
    const blob = await introBlob();
    if (introEl !== el) return; // נסגר בזמן הטעינה
    if (!blob) { closeIntro(); return; }
    introUrl = URL.createObjectURL(blob); v.src = introUrl;
  }
  v.currentTime = 0;
  el.classList.add('ready');
  // תמיד מנסים עם סאונד. רק אם הדפדפן חוסם, מנגנים בלי סאונד ומציגים 🔇
  v.muted = false; upd();
  v.play().then(upd).catch(() => { v.muted = true; upd(); v.play().catch(() => {}); });
}

function closeIntro() {
  if (!introEl) return;
  const el = introEl; introEl = null;
  if (introVid) introVid.pause();
  el.classList.add('out');
  setTimeout(() => el.remove(), 350);
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { introHiddenAt = Date.now(); return; }
  if (introHiddenAt && Date.now() - introHiddenAt > INTRO_AGAIN_MS) showIntro();
});
