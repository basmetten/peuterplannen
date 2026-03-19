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

// Newsletter form feedback
document.querySelectorAll('.newsletter-form').forEach(function (form) {
  form.addEventListener('submit', function () {
    var btn = form.querySelector('button');
    var msg = form.querySelector('.newsletter-msg');
    btn.setAttribute('aria-busy', 'true');
    btn.disabled = true;
    if (msg) msg.hidden = true;

    setTimeout(function () {
      btn.setAttribute('aria-busy', 'false');
      btn.disabled = false;
      if (msg) {
        msg.textContent = 'Bedankt voor je aanmelding!';
        msg.className = 'newsletter-msg newsletter-msg--success';
        msg.hidden = false;
      }
      form.reset();
    }, 1500);
  });
});

// Viewport-focus for guide cards — compact cards expand when scrolled into center
if ('IntersectionObserver' in window && window.innerWidth < 768 &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  var focusObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      e.target.classList.toggle('in-view', e.isIntersecting);
    });
  }, { rootMargin: '-25% 0px -25% 0px', threshold: 0.2 });

  document.querySelectorAll('.guide-card').forEach(function (card) {
    focusObs.observe(card);
  });
}

// Disclosure: show-all buttons for lists with hidden overflow
document.addEventListener('click', function (e) {
  var btn = e.target.closest('.pp-show-all');
  if (!btn) return;
  var target = btn.previousElementSibling;
  if (target) target.classList.add('expanded');
  btn.remove();
});

// Auto-generate show-all buttons for long location lists
document.querySelectorAll('.loc-list').forEach(function (list) {
  var count = list.children.length;
  if (count <= 6) return;
  var btn = document.createElement('button');
  btn.className = 'pp-show-all';
  btn.textContent = 'Toon alle ' + count + ' locaties';
  list.after(btn);
});

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
