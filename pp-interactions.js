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

// Scroll reveal — IntersectionObserver, fires once per element
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  var revealObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        revealObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.pp-reveal, .pp-reveal-stagger').forEach(function (el) {
    revealObs.observe(el);
  });
}

// Navbar scroll shrink (IntersectionObserver, no scroll listener)
(function () {
  var nav = document.querySelector('nav');
  if (!nav) return;
  var sentinel = document.createElement('div');
  sentinel.style.cssText = 'position:absolute;top:0;height:1px;width:1px;pointer-events:none';
  document.body.prepend(sentinel);
  new IntersectionObserver(function (entries) {
    nav.classList.toggle('scrolled', !entries[0].isIntersecting);
  }).observe(sentinel);
})();
