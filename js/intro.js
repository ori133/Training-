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
const INTRO_SOUND = 'pt_intro_sound';
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
    const blob = await r.blob();
    if (cache) await cache.put(key, new Response(blob, { headers: { 'Content-Type': 'video/mp4', 'x-sha': meta.sha } }));
    return blob;
  })().catch(() => null);
  return hit ? hit.blob() : refresh;
}

async function showIntro() {
  if (introEl || !syncOn()) return;
  const el = document.createElement('div');
  el.id = 'intro';
  el.innerHTML = `<video playsinline webkit-playsinline preload="auto"></video>
    <div class="intro-load">טוען…</div>
    <div class="intro-hint">נגיעה במסך כדי להמשיך</div>
    <button class="intro-snd" aria-label="סאונד"></button>`;
  document.body.appendChild(el);
  introEl = el;
  const v = el.querySelector('video'), btn = el.querySelector('.intro-snd');
  const upd = () => { btn.textContent = v.muted ? '🔇' : '🔊'; };
  el.addEventListener('click', e => {
    if (e.target.closest('.intro-snd')) {
      v.muted = !v.muted; localStorage.setItem(INTRO_SOUND, v.muted ? '0' : '1'); upd();
      v.play().catch(() => {});
      return;
    }
    closeIntro();
  });
  v.addEventListener('ended', closeIntro);
  v.muted = localStorage.getItem(INTRO_SOUND) !== '1'; upd();

  const blob = await introBlob();
  if (introEl !== el) return; // נסגר בזמן הטעינה
  if (!blob) { closeIntro(); return; }
  v.src = URL.createObjectURL(blob);
  el.classList.add('ready');
  // דפדפנים חוסמים ניגון אוטומטי עם סאונד, אז אם צריך מנגנים בלי סאונד
  v.play().catch(() => { v.muted = true; upd(); v.play().catch(() => {}); });
}

function closeIntro() {
  if (!introEl) return;
  const el = introEl; introEl = null;
  const v = el.querySelector('video');
  v.pause();
  el.classList.add('out');
  setTimeout(() => { if (v.src) URL.revokeObjectURL(v.src); el.remove(); }, 350);
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { introHiddenAt = Date.now(); return; }
  if (introHiddenAt && Date.now() - introHiddenAt > INTRO_AGAIN_MS) showIntro();
});
