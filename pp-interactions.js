/* pp-interactions.js — Lightweight micro-interaction JS (<2KB minified)
   Defer-loaded. Progressive enhancement only. */

// Toast notification system
function ppToast(msg, type, duration) {
  type = type || 'default';
  duration = duration || 3000;
  var zone = document.querySelector('.pp-toast-zone');
  if (!zone) {
    zone = document.createElement('div');
    zone.className = 'pp-toast-zone';
    zone.setAttribute('aria-live', 'polite');
    document.body.append(zone);
  }
  var t = document.createElement('div');
  t.className = 'pp-toast pp-toast-' + type;
  t.textContent = msg;
  t.setAttribute('role', 'status');
  zone.append(t);
  setTimeout(function () {
    t.classList.add('is-hiding');
    t.addEventListener('transitionend', function () { t.remove(); }, { once: true });
    setTimeout(function () { t.remove(); }, 400);
  }, duration);
}
window.ppToast = ppToast;

// Copy-to-clipboard buttons
document.addEventListener('click', function (e) {
  var btn = e.target.closest('.pp-copy-btn');
  if (!btn || !btn.dataset.copy) return;
  navigator.clipboard.writeText(btn.dataset.copy).then(function () {
    btn.classList.add('is-copied');
    btn.setAttribute('aria-label', 'Gekopieerd');
    setTimeout(function () {
      btn.classList.remove('is-copied');
      btn.removeAttribute('aria-label');
    }, 2000);
  }).catch(function () { /* graceful fallback */ });
});
