'use strict';
// ============================================================
//  אייקונים — סט SVG אחיד (קו, 24×24) במקום אימוג'י
//  שימוש: ic('flame') או ic('flame', 'big')
// ============================================================
const ICONS = {
  // לוגו — דמות תלויה על מוט
  logo: '<path d="M2.5 4h19M6 4v17M18 4v17"/><path d="M9.5 4l1.5 5M14.5 4L13 9"/><circle cx="12" cy="9.6" r="1.7"/><path d="M12 11.5v4.5M12 16l-1.3 4M12 16l1.3 4"/>',
  // ניווט
  dumbbell: '<path d="M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11"/>',
  chart: '<path d="M4 4v16h16"/><path d="M7.5 15l3.5-4 3 2.5L19 7"/>',
  tree: '<circle cx="12" cy="4.5" r="2"/><circle cx="5" cy="19.5" r="2"/><circle cx="12" cy="19.5" r="2"/><circle cx="19" cy="19.5" r="2"/><path d="M12 6.5v11M12 11c-5 0-7 1.5-7 6.5M12 11c5 0 7 1.5 7 6.5"/>',
  trophy: '<path d="M8 3.5h8v6a4 4 0 0 1-8 0z"/><path d="M8 5.5H5c0 3 1.2 4.5 3.2 5M16 5.5h3c0 3-1.2 4.5-3.2 5M12 13.5v3.5M8 20.5h8M9.5 17h5l.5 3.5H9z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5l1.6 2.6 3-.6.6 3 2.6 1.6-1.4 2.9 1.4 2.9-2.6 1.6-.6 3-3-.6L12 21.5l-1.6-2.6-3 .6-.6-3-2.6-1.6 1.4-2.9-1.4-2.9 2.6-1.6.6-3 3 .6z"/>',
  // סנכרון
  cloud: '<path d="M7 18.5h10a4 4 0 0 0 .6-8A6 6 0 0 0 6.1 12 3.3 3.3 0 0 0 7 18.5z"/>',
  'cloud-ok': '<path d="M7 18.5h10a4 4 0 0 0 .6-8A6 6 0 0 0 6.1 12 3.3 3.3 0 0 0 7 18.5z"/><path d="M9.5 14.5l1.8 1.8 3.4-3.4"/>',
  'cloud-busy': '<path d="M7 18.5h10a4 4 0 0 0 .6-8A6 6 0 0 0 6.1 12 3.3 3.3 0 0 0 7 18.5z"/><path d="M9 15h.01M12 15h.01M15 15h.01"/>',
  'cloud-err': '<path d="M7 18.5h10a4 4 0 0 0 .6-8A6 6 0 0 0 6.1 12 3.3 3.3 0 0 0 7 18.5z"/><path d="M12 12v2.5M12 16.5v.01"/>',
  'cloud-off': '<path d="M7 18.5h10a4 4 0 0 0 .6-8A6 6 0 0 0 6.1 12 3.3 3.3 0 0 0 7 18.5z"/><path d="M3 4l18 17"/>',
  // כללי
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  'check-circle': '<circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.8 2.8L16.2 9.7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  play: '<path d="M7.5 4.8v14.4L19 12z" fill="currentColor"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>',
  skip: '<path d="M5 5.5l9 6.5-9 6.5z" fill="currentColor"/><path d="M18.5 5.5v13"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.01"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  download: '<path d="M12 3.5v12M7 10.5l5 5 5-5M4 20.5h16"/>',
  upload: '<path d="M12 15.5v-12M7 8.5l5-5 5 5M4 20.5h16"/>',
  sync: '<path d="M20 12a8 8 0 1 1-2.4-5.7M20 4v4.5h-4.5"/>',
  sound: '<path d="M4 9.5h3.5L13 5v14l-5.5-4.5H4z"/><path d="M16.5 9a4.5 4.5 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11"/>',
  mute: '<path d="M4 9.5h3.5L13 5v14l-5.5-4.5H4z"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5"/>',
  arrowup: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  arrowdown: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  // אימון
  flame: '<path d="M12 21.5c4 0 7-2.8 7-6.6 0-3.4-2.3-5.4-3.8-7.4-.4 2-1.6 3.2-2.7 3.6C13 7.5 11.4 4.3 9 3c.3 3-1.6 5-3 6.7a7 7 0 0 0-1 4.2c0 3.8 3 7.6 7 7.6z"/><path d="M12 21.5c-1.7 0-3-1.2-3-2.9 0-1.8 1.5-2.7 2.3-4.1.9 1 3.7 2.3 3.7 4.1 0 1.7-1.3 2.9-3 2.9z"/>',
  moon: '<path d="M20 14.5A8.2 8.2 0 1 1 9.5 4a6.6 6.6 0 0 0 10.5 10.5z"/><path d="M16 3.5v3M14.5 5h3"/>',
  boss: '<path d="M5.5 10C3.5 8.5 3 6 3.5 3c1.5 2.5 3 3.5 4.5 4M18.5 10c2-1.5 2.5-4 2-7-1.5 2.5-3 3.5-4.5 4"/><path d="M6 11c0-2.2 2.7-4 6-4s6 1.8 6 4v3c0 4.1-2.7 7-6 7s-6-2.9-6-7z"/><path d="M8.5 12.5l2.5 1.2M15.5 12.5L13 13.7M10 17.5l1-.8 1 .8 1-.8 1 .8"/>',
  swords: '<path d="M14.5 17.5L3.5 6.5V3.5h3l11 11M13 19l6-6M16.5 16.5l4 4M19 21.5l2.5-2.5"/><path d="M14.5 7.5L17.5 3.5h3v3l-4 3M5 13l6 6M7.5 16.5l-4 4M2.5 19l2.5 2.5"/>',
  wheel: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="M12 3v7M12 14v7M3 12h7M14 12h7M5.6 5.6l5 5M13.4 13.4l5 5M18.4 5.6l-5 5M10.6 13.4l-5 5"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
  flag: '<path d="M5 21.5V3.5"/><path d="M5 4h14v9H5"/><path d="M9.7 4v9M14.3 4v9M5 8.5h14"/>',
  bolt: '<path d="M13.5 2.5L4.5 14h7l-1 7.5 9-11.5h-7z"/>',
  drop: '<path d="M12 3c3.5 4.5 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 2.5-6.5 6-11z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 10v3.5l2.5 2M9.5 2.5h5M12 2.5V6M18.5 6.5l1.5-1.5"/>',
  medal: '<path d="M7.5 2.5l3 6.5M16.5 2.5l-3 6.5"/><circle cx="12" cy="15" r="6"/><path d="M12 12l1 2 2.1.3-1.5 1.5.4 2.1L12 17l-2 .9.4-2.1-1.5-1.5L11 14z"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  'star-ring': '<circle cx="12" cy="12" r="9.5"/><path d="M12 6.5l1.7 3.4 3.8.6-2.8 2.7.7 3.8-3.4-1.8-3.4 1.8.7-3.8-2.8-2.7 3.8-.6z"/>',
  sparkle: '<path d="M11 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z"/><path d="M19 15c.3 1.8 1 2.5 2.5 2.8-1.5.3-2.2 1-2.5 2.7-.3-1.7-1-2.4-2.5-2.7 1.5-.3 2.2-1 2.5-2.8z"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 15.5l-5-5-9.5 9.5"/>',
  ruler: '<rect x="2" y="8" width="20" height="8" rx="1.5"/><path d="M6 8v3M10 8v4.5M14 8v3M18 8v4.5"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
  ladder: '<path d="M7 3v18M17 3v18M7 7.5h10M7 12h10M7 16.5h10"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  'calendar-ok': '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M9 15.5l2 2 4-4"/>',
  gem: '<path d="M6.5 3.5h11l3.5 5.5-9 12-9-12z"/><path d="M3 9h18M9.5 3.5L8 9l4 12 4-12-1.5-5.5"/>',
  crown: '<path d="M3 7.5l4.5 4L12 4.5l4.5 7 4.5-4-2 11.5H5z"/><path d="M5 19h14"/>',
  kettlebell: '<path d="M8.5 9.5V8a3.5 3.5 0 0 1 7 0v1.5"/><path d="M7.5 9.5h9a6.5 6.5 0 1 1-9 0z"/>',
  mountain: '<path d="M2.5 20.5l7-12.5 4 6.5 2.5-3.5 5.5 9.5z"/><path d="M7.5 11.5l2 1.5 2-1.5"/>',
  stone: '<path d="M7 5h10l4.5 7-4.5 7H7l-4.5-7z"/><path d="M9 9l2 2-1 3"/>',
  pillar: '<path d="M8 21V7l4-3.5L16 7v14M5.5 21h13M10.5 10.5h3M10.5 14.5h3"/>',
  trend: '<path d="M3 17.5l6-6 4 4 8-8M15 7.5h6v6"/>',
  climb: '<path d="M3 4h18"/><path d="M12 21V9M7 14l5-5 5 5"/>',
  wall: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 9.7h18M3 14.3h18M9 5v4.7M15 5v4.7M6 9.7v4.6M12 9.7v4.6M18 9.7v4.6M9 14.3V19M15 14.3V19"/>',
  buckle: '<path d="M2 9.5h20v5H2z"/><rect x="8" y="7" width="8" height="10" rx="1.5"/><path d="M12 12h4"/>',
  sprout: '<path d="M12 21v-9"/><path d="M12 12C12 8 9 6 4 6c0 4 3 6 8 6zM12 14.5c0-4 3-6 8-6 0 4-3 6-8 6z"/>',
  belt: '<path d="M2 9.5h20v4H2z"/><rect x="9.5" y="8" width="5" height="7" rx="1"/><path d="M10.5 15l-2.5 6.5M13.5 15l2.5 6.5"/>',
  // סקילס
  rocket: '<path d="M12 2.5c3 2.5 4.5 6 4.5 10L14 16.5h-4l-2.5-4c0-4 1.5-7.5 4.5-10z"/><circle cx="12" cy="9.5" r="1.5"/><path d="M7.5 12.5L5 16l3 .8M16.5 12.5L19 16l-3 .8M10.5 19.5l1.5 2.5 1.5-2.5"/>',
  lsit: '<path d="M4 11.5h8M4 11.5V21M12 11.5V21"/><circle cx="8" cy="4" r="1.8"/><path d="M8 6.5v7h12.5"/>',
  pistol: '<path d="M3 21h18"/><circle cx="9" cy="4" r="1.8"/><path d="M9 6.5l-.5 6.5 4 2.5-1.5 5.5M8.5 13H20M9 9l4 1.5"/>',
  handstand: '<path d="M3 21h18"/><circle cx="12" cy="17" r="1.8"/><path d="M12 14.5V8M12 8l-2.5-5M12 8l2.5-5M12 14.5L8.5 21M12 14.5l3.5 6.5"/>',
  lever: '<path d="M3 3.5h18"/><path d="M8 3.5V9M8 9h13"/><circle cx="5.5" cy="9.5" r="1.8"/>',
  // פידבק
  'face-cool': '<circle cx="12" cy="12" r="9"/><path d="M5.5 10h13M6.5 10c0 2.4 4 2.4 4 0M13.5 10c0 2.4 4 2.4 4 0M9 15.5c1.8 1.3 4.2 1.3 6 0"/>',
  'face-ok': '<circle cx="12" cy="12" r="9"/><path d="M9 9.5v1M15 9.5v1M8.5 14c2 2.3 5 2.3 7 0"/>',
  'face-hard': '<circle cx="12" cy="12" r="9"/><path d="M7.5 9l2.5 1.3M16.5 9L14 10.3M9 16.5c1.6-1.4 4.4-1.4 6 0"/>',
  'face-smile': '<circle cx="12" cy="12" r="9"/><path d="M9 9.5v1M15 9.5v1M8.5 14c2 2.3 5 2.3 7 0"/>',
};

function ic(name, cls = '') {
  return `<svg class="i ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
}
(function injectSprite() {
  const s = Object.entries(ICONS).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`).join('');
  const d = document.createElement('div');
  d.style.display = 'none';
  d.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
  document.body.prepend(d);
})();
